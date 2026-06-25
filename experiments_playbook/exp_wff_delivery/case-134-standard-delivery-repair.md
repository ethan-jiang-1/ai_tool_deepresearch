---
schema: command-experiment/v1
experiment: wff-delivery
case: case-134-standard-delivery-repair
weight: light
case_goal: "Prove the PDCA repair cycle works for delivery phases: gate fail → read inspect/advice → Agent repairs → rerun gate → pass. Two cycles: HITL2 repair and readiness repair."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-134_dlv_repair_*
trace: dpt_disp_case-134_dlv_repair_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-134-standard-delivery-repair

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed 状态（故意缺失部分文件）
2. **HITL2 repair cycle**: gate fail (missing brief) → read inspect → Agent creates brief → rerun → gate pass
3. 推进到 readiness 状态（补齐所有 readiness artifacts）
4. **Readiness repair cycle**: gate fail (missing synthesis) → read inspect → Agent creates synthesis → rerun → gate pass
5. 从 `_trace.jsonl` 裁决（预期 2 个 cycle 各有 1 fail + 1 pass = 4 checks）
6. Cleanup

---

## Case Goal

证明 delivery phase 的 PDCA repair 回路：
- Gate fail 时 inspect 给出具体缺失信息，advice 给出修复方向
- Agent 根据 inspect/advice 修复后 rerun gate
- 第一次 fail + 第二次 pass 的 gate_attempt 都记录在 trace

---

## Step 1: 创建 bundle + pre-seed 状态（缺失 decision brief）

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs dlv_repair --case case-134 --force)
echo "Bundle: $B"

# Set status to hitl2
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "hitl2_recorded",
  "next_gate": "readiness_passed"
}
EOF

# Create dir but NOT decision brief (will fail)
mkdir -p $B/artifacts/hitl2

# Write valid profile
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
    user_decision: proceed_to_readiness
    rationale: "Ready after repair."
    recorded_at: "2026-06-20T10:00:00Z"
EOF

# Write trace with hitl2_recorded
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"hitl2_recorded\"}" >> $B/rb_trace.jsonl

echo "=== Bundle ready (missing decision brief) ==="
```

## Step 2: HITL2 repair cycle — fail → repair → pass

```bash
echo "=== HITL2 — First Attempt (fail) ==="
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "gate: hitl2-recorded | passed: $PASSED"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl2-recorded',passed:$PASSED,detail:'attempt 1 — missing brief, expected fail'})})"

# Read inspect output → Agent creates the missing file
INSPECT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs inspect.0)
ADVICE=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs advice.0)
echo "--- Agent reads inspect ---"
echo "inspect: $INSPECT"
echo "advice: $ADVICE"
echo "--- Agent repairs ---"

# Agent creates decision brief based on inspect/advice
cat > $B/artifacts/hitl2/decision-brief.md << 'EOF'
# Final Review Decision Brief

## Key Findings
The research produced evidence across multiple topics. Key patterns include
convergence of technical and policy approaches to AI safety.

## Open Questions
1. How to generalize findings?
2. What metrics exist for measuring impact?

## Recommended Actions
Proceed to readiness for final delivery.
EOF

echo "=== HITL2 — Second Attempt (pass) ==="
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "gate: hitl2-recorded | passed: $PASSED"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'hitl2-recorded',passed:$PASSED,detail:'attempt 2 — brief created, expected pass'})})"
```

预期：第一次 `passed: false`，inspect 指向缺失 brief。第二次 `passed: true`。

## Step 3: 推进到 readiness + pre-seed（缺失 synthesis）

```bash
# Create readiness artifacts (except synthesis — will fail)
cat > $B/seed_topics/topic-a.md << 'EOF'
---
slug: topic-a
title: Test Topic
---
# Test Topic
EOF

mkdir -p $B/reference/topic-a
cat > $B/reference/index.md << 'EOF'
# Reference Index
- [Topic A](topic-a/source.yaml)
EOF
cat > $B/reference/topic-a/source.yaml << 'EOF'
- url: "https://example.com/test"
  title: "Test Reference"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

mkdir -p $B/artifacts/wave2
# Intentionally leave synthesis.md missing

# Write prior gate_attempt events for trace
for g in instantiation-complete hitl1-recorded setup-ready seed-topics-ready wave0-complete wave1-complete wave2-complete hitl2-recorded; do
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"gate_attempt\",\"gate\":\"$g\",\"passed\":true}" >> $B/rb_trace.jsonl
done

# Advance status to readiness
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "readiness_passed",
  "next_gate": "none"
}
EOF

echo "=== Bundle ready for readiness (missing synthesis) ==="
```

## Step 4: Readiness repair cycle — fail → repair → pass

```bash
echo "=== Readiness — First Attempt (fail) ==="
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle $B --current-node phases/phase-readiness.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "gate: readiness-passed | passed: $PASSED"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'readiness-passed',passed:$PASSED,detail:'attempt 1 — missing synthesis, expected fail'})})"

# Read inspect → Agent creates synthesis
INSPECT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs inspect.0)
echo "--- Agent reads inspect ---"
echo "inspect: $INSPECT"
echo "--- Agent repairs ---"

# Agent creates synthesis
cat > $B/artifacts/wave2/synthesis.md << 'EOF'
# Cross-Topic Synthesis

## Pattern 1: Convergence
Technical and policy approaches show increasing alignment.

## Gaps and Future Work
Further research needed on cross-domain metrics.
EOF

echo "=== Readiness — Second Attempt (pass) ==="
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle $B --current-node phases/phase-readiness.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "gate: readiness-passed | passed: $PASSED"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'readiness-passed',passed:$PASSED,detail:'attempt 2 — synthesis created, expected pass'})})"
```

预期：第一次 `passed: false`，inspect 指向缺失 synthesis。第二次 `passed: true`。

## Step 5: Verdict from `_trace.jsonl`

```bash
echo "=== Verdict ==="
cat $B/_trace.jsonl | node -e "
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf-8').trim().split('\n').filter(l => l);
const checks = lines.map(l => JSON.parse(l)).filter(e => e.event === 'check');
const pass = checks.filter(c => c.passed === true).length;
const fail = checks.filter(c => c.passed === false).length;
console.log('Pass:', pass, ' | Fail:', fail);
if (pass >= 2 && fail >= 2) {
  console.log('\x1b[32mVERDICT: PASS\x1b[0m');
} else {
  console.log('\x1b[31mVERDICT: FAIL\x1b[0m (expected ≥2 pass + ≥2 fail, got ' + pass + ' pass + ' + fail + ' fail)');
}
"
```

预期：≥2 pass + ≥2 fail → VERDICT: PASS（两个 cycle 各有 1 fail + 1 pass）。


## Step 6: 结果解读

> 验证 delivery PDCA 回路：
>   HITL2 + readiness gate fail → inspect/advice → repair → rerun → pass。

## Step 7: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf $B
echo "Cleaned: $B"
```