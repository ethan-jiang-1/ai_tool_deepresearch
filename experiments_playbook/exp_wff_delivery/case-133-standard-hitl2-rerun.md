---
schema: command-experiment/v1
experiment: wff-delivery
case: case-133-standard-hitl2-rerun
weight: light
case_goal: "Prove that HITL2 gate PASSES with rerun, but chain always returns normal next (readiness). The Agent restart decision is NOT encoded in the transition table — it's Agent-level routing authority."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-133_h2_rerun_*
trace: dpt_disp_case-133_h2_rerun_*/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-133-standard-hitl2-rerun

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed HITL2 状态（user_decision: rerun）
2. Run hitl2-recorded gate → pass（所有 rule 满足）
3. Verify routing still returns `next: phases/phase-readiness.md`（chain 只管 normal next）
4. Verify chain 只有 `passed: phases/phase-readiness.md` 一条 entry
5. Verify profile 中 user_decision 为 rerun（Agent 应据此 restart）
6. 从 `_logs/_trace.jsonl` 裁决
7. Cleanup

---

## Case Goal

证明 HITL2 的 authority boundary：gate pass ≠ advance。

- Gate 完全 pass（所有 rule 满足），`check.next` 指向 readiness
- Chain 对 HITL2 只有一条 entry：`passed → readiness`——没有 `rerun` 分支
- `rerun` 不编码进 chain——Agent 读取 profile 中的 user_decision 做 routing decision

---

## Step 1: 创建 bundle + pre-seed HITL2 状态（user_decision: rerun）

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs h2_rerun --case case-133 --force)
echo "Bundle: $B"

# Set status to hitl2-ready
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "hitl2_recorded",
  "next_gate": "readiness_passed"
}
EOF

# Create artifacts
mkdir -p $B/artifacts/hitl2
cat > $B/artifacts/hitl2/decision-brief.md << 'EOF'
# Final Review Decision Brief

## Key Findings
Research produced evidence across 3 topics. Several open questions remain.

## Recommended Actions
Restart the lifecycle with refined research questions — the current findings
suggest the scope needs adjustment before final delivery.
EOF

# Write profile with rerun decision
cat > $B/rb_profile.yaml << 'EOF'
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
    research_profile: quick_factual
    root_must_answer_set:
      - "Test question?"
  hitl2:
    status: recorded
    user_decision: rerun
    rationale: "The scope needs adjustment — go back to seed-topics with refined questions."
    recorded_at: "2026-06-20T10:00:00Z"
EOF

# Write trace with hitl2_recorded event
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"hitl2_recorded\"}" >> $B/rb_trace.jsonl

echo "=== Bundle ready ==="
echo "user_decision: $(grep user_decision $B/rb_profile.yaml)"
```

## Step 2: Run hitl2-recorded gate → pass（rerun 仍然让 gate pass）

```bash
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "gate: hitl2-recorded | passed: $PASSED | next: $NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'hitl2-recorded',passed:$PASSED,detail:'rerun — gate passes but Agent should restart'})})"
```

预期：`check.passed: true`（所有 rule 满足），`check.next: phases/phase-readiness.md`（chain 返回 normal next）。

## Step 3: Verify chain does NOT encode the rerun branch

```bash
echo "=== Chain Entry for phase-hitl2 ==="

# Extract the hitl2 entry from chain
node -e "
const chain = require('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json');
console.log(JSON.stringify(chain['phases/phase-hitl2.md'], null, 2));
"

# Verify: only 'passed' key exists, no 'rerun' or other decision keys
CHAIN_ENTRY=$(node -e "
const chain = require('$REPO_ROOT/DPT_FRAMEWORK/workflows/transitions.chain.json');
const entry = chain['phases/phase-hitl2.md'];
console.log(Object.keys(entry).join(','));
")
echo "Chain keys for hitl2: $CHAIN_ENTRY"

if [ "$CHAIN_ENTRY" = "passed" ]; then
  echo "OK: Chain has only 'passed' key — no rerun branch encoded"
else
  echo "FAIL: Chain has unexpected keys: $CHAIN_ENTRY"
fi

# Verify user_decision is rerun (Agent should restart from this)
USER_DECISION=$(node -e "
const yaml = require('yaml');
const fs = require('fs');
const p = yaml.parse(fs.readFileSync('$B/rb_profile.yaml', 'utf-8'));
console.log(p.human_decision_checkpoints.hitl2.user_decision);
")
echo "user_decision in profile: $USER_DECISION"

if [ "$USER_DECISION" = "rerun" ]; then
  echo "OK: Agent should go back to seed-topics and re-run"
else
  echo "FAIL: Expected rerun, got $USER_DECISION"
fi
```

## Step 4: Verdict from `_logs/_trace.jsonl`

```bash
echo "=== Verdict ==="
cat $B/_logs/_trace.jsonl | node -e "
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf-8').trim().split('\n').filter(l => l);
const checks = lines.map(l => JSON.parse(l)).filter(e => e.event === 'check');
const pass = checks.filter(c => c.passed === true).length;
console.log('Pass:', pass, ' | Total:', checks.length);
if (pass >= 1) {
  console.log('\x1b[32mVERDICT: PASS\x1b[0m');
} else {
  console.log('\x1b[31mVERDICT: FAIL\x1b[0m (expected ≥1 pass, got ' + pass + ')');
}
"
```

预期：≥1 pass + chain 验证通过 → VERDICT: PASS。


## Step 5: 结果解读

> 验证 HITL2 rerun 语义：
>   gate pass 但 chain 不编码 rerun 分支 → next 始终指向 readiness。
>   Agent 层 routing。

## Step 6: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf $B
echo "Cleaned: $B"
```
