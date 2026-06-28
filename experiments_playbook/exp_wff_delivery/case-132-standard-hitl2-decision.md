---
schema: command-experiment/v1
experiment: wff-delivery
case: case-132-standard-hitl2-decision
weight: light
case_goal: "Prove that the HITL2-recorded gate correctly verifies decision brief existence, profile decision fields, and trace evidence: happy pass + 3 boundary fail cases."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-132_h2_dec_*
trace: dpt_disp_case-132_h2_dec_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-132-standard-hitl2-decision

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed post-wave2 状态
2. 写入合法 decision brief + profile decision + trace event → gate hitl2-recorded pass
3. 删除 decision brief → gate fail（inspect 指向缺失文件）
4. 恢复 brief，删除 user_decision → gate fail（inspect 指向缺失字段）
5. 填入非法 user_decision → gate fail（inspect 列出合法值）
6. 从 `rb_trace.jsonl` 裁决（预期 1 pass + 3 fail）
7. Cleanup

---

## Case Goal

证明 HITL2-recorded gate 的 rule set 对 4 个关键边界正确执行：decision brief 存在性、profile YAML 可解析性、user_decision 非空且在合法枚举中、hitl2_recorded trace event 存在。

---

## Step 1: 创建 bundle + pre-seed post-wave2 状态

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs h2_dec --case case-132 --force)
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

# Create hitl2 artifact directory
mkdir -p $B/artifacts/hitl2

# Write valid profile with HITL2 decision
cat > $B/rb_profile.yaml << 'EOF'
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
    research_profile: quick_factual
    root_must_answer_set:
      - "How to measure alignment?"
    answerability_class: ready_substantive
  hitl2:
    status: recorded
    user_decision: proceed_to_readiness
    rationale: "The research is complete and ready for final delivery."
    recorded_at: "2026-06-20T10:00:00Z"
EOF

echo "=== Bundle ready ==="
ls $B/rb_status.json $B/rb_profile.yaml
```

## Step 2: Happy path — valid decision brief + profile + trace → gate pass

```bash
# Write valid decision brief
cat > $B/artifacts/hitl2/decision-brief.md << 'EOF'
# Final Review Decision Brief

## Key Findings
The research produced strong evidence across 3 topics: AI safety alignment techniques,
regulatory frameworks, and societal impact metrics. Each topic has verified source
references and structured analysis.

## Open Questions
1. How to generalize alignment findings beyond current benchmarks?
2. What regulatory coordination mechanisms exist across jurisdictions?

## Recommended Actions
Proceed to final delivery with an executive brief focused on practical recommendations.
EOF

# Write trace with hitl2_recorded event
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"hitl2_recorded"}' >> $B/rb_trace.jsonl

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "gate: hitl2-recorded | passed: $PASSED"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'hitl2-recorded',passed:$PASSED,detail:'happy path — valid decision brief + profile + trace'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-readiness.md`。

## Step 3: Missing decision brief → gate fail

```bash
# Remove decision brief
rm $B/artifacts/hitl2/decision-brief.md

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
INSPECT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs inspect.0)
echo "gate: hitl2-recorded | passed: $PASSED"
echo "inspect: $INSPECT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'hitl2-recorded',passed:$PASSED,detail:'missing decision brief — expected fail'})})"
```

预期：`check.passed: false`，inspect 指向缺失的 `decision-brief.md`。

## Step 4: Restore brief, remove user_decision → gate fail

```bash
# Restore decision brief
cat > $B/artifacts/hitl2/decision-brief.md << 'EOF'
# Final Review Decision Brief

## Key Findings
Research is complete.
EOF

# Empty user_decision
cat > $B/rb_profile.yaml << 'EOF'
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
  hitl2:
    status: recorded
    user_decision: ""
    recorded_at: "2026-06-20T10:00:00Z"
EOF

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
INSPECT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs inspect.0)
echo "gate: hitl2-recorded | passed: $PASSED"
echo "inspect: $INSPECT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'hitl2-recorded',passed:$PASSED,detail:'empty user_decision — expected fail'})})"
```

预期：`check.passed: false`，inspect 指向空 user_decision。

## Step 5: Invalid user_decision enum → gate fail

```bash
# Write invalid user_decision value
cat > $B/rb_profile.yaml << 'EOF'
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
  hitl2:
    status: recorded
    user_decision: random_choice
    recorded_at: "2026-06-20T10:00:00Z"
EOF

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
INSPECT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs inspect.0)
echo "gate: hitl2-recorded | passed: $PASSED"
echo "inspect: $INSPECT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'hitl2-recorded',passed:$PASSED,detail:'invalid enum — expected fail'})})"
```

预期：`check.passed: false`，inspect 列出合法枚举值。

## Step 6: Verdict from `rb_trace.jsonl`

```bash
echo "=== Verdict ==="
cat $B/rb_trace.jsonl | node -e "
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf-8').trim().split('\n').filter(l => l);
const checks = lines.map(l => JSON.parse(l)).filter(e => e.event === 'check');
const pass = checks.filter(c => c.passed === true).length;
const fail = checks.filter(c => c.passed === false).length;
console.log('Pass:', pass, ' | Fail:', fail);
if (pass >= 1 && fail >= 3) {
  console.log('\x1b[32mVERDICT: PASS\x1b[0m');
} else {
  console.log('\x1b[31mVERDICT: FAIL\x1b[0m (expected ≥1 pass + ≥3 fail, got ' + pass + ' pass + ' + fail + ' fail)');
}
"
```

预期：≥1 pass + ≥3 fail → VERDICT: PASS。


## Step 7: 结果解读

> 验证 HITL2 gate：
>   decision brief + user_decision + trace 完整 → gate pass
>   缺失/空/非法 → gate fail。边界 test。

## Step 8: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf $B
echo "Cleaned: $B"
```