---
schema: command-experiment/v1
experiment: wff-delivery
case: case-131-standard-delivery-full-chain
weight: light
case_goal: "Prove that the complete delivery tail works end-to-end: hitl2 gate pass → readiness gate pass → final node terminal semantics."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-131_dlv_chain_*
trace: dpt_disp_case-131_dlv_chain_*/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-131-standard-delivery-full-chain

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed post-wave2 状态（所有 prior gates passed + hitl2 ready）
2. Run hitl2-recorded gate → pass
3. Run readiness-passed gate → pass（从 manifest 推导 prior gate 集合）
4. Verify final phase terminal semantics（gate=none, chain 无 final transition）
5. 从 `_logs/_trace.jsonl` 裁决（预期 2 pass）
6. Cleanup

---

## Case Goal

证明 hitl2 → readiness → final 完整 delivery 链：
- 两个 gate 在同一个 bundle 上依次 pass
- readiness gate 从 manifest 拓扑正确推导 prior gate 集合
- final phase frontmatter 正确声明 terminal node
- chain 不包含 final phase 的 transition

---

## Step 1: 创建 bundle + pre-seed post-wave2 完整状态

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs dlv_chain --case case-131 --force)
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

# Create all required artifacts for readiness
cat > $B/seed_topics/topic-a.md << 'EOF'
---
slug: topic-a
title: Test Topic
---
# Test Topic
EOF

mkdir -p $B/artifacts/wave0/topic-a
cat > $B/reference/_INDEX.md << 'EOF'
# Reference Index
- [Topic A](topic-a/source.yaml)
EOF
cat > $B/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com/test"
  title: "Test Reference"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

mkdir -p $B/artifacts/wave2
cat > $B/artifacts/wave2/synthesis.md << 'EOF'
# Cross-Topic Synthesis
Convergence pattern identified.
EOF

mkdir -p $B/artifacts/hitl2
cat > $B/artifacts/hitl2/decision-brief.md << 'EOF'
# Final Review Decision Brief
Research complete. Proceed to readiness.
EOF

# Write profile with hitl2 decision
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
    rationale: "Ready for delivery."
    recorded_at: "2026-06-20T10:00:00Z"
EOF

# Write trace with all 8 prior gates passed + hitl2_recorded
for g in instantiation-complete hitl1-recorded setup-ready seed-topics-ready wave0-complete wave1-complete wave2-complete; do
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"gate_attempt\",\"gate\":\"$g\",\"passed\":true}" >> $B/rb_trace.jsonl
done
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"hitl2_recorded\"}" >> $B/rb_trace.jsonl

echo "=== Bundle ready ==="
ls $B/rb_status.json $B/artifacts/hitl2/decision-brief.md $B/artifacts/wave2/synthesis.md
```

## Step 2: Run hitl2-recorded gate → pass

```bash
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs --bundle $B --current-node phases/phase-hitl2.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "gate: hitl2-recorded | passed: $PASSED | next: $NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'hitl2-recorded',passed:$PASSED,detail:'hitl2 gate pass — advance to readiness'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-readiness.md`。

## Step 3: Advance status + run readiness-passed gate → pass

```bash
# Advance status to readiness-ready
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "readiness_passed",
  "next_gate": "none"
}
EOF

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle $B --current-node phases/phase-readiness.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
ROUTING=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs routing.kind)
echo "gate: readiness-passed | passed: $PASSED | next: $NEXT | routing: $ROUTING"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'readiness-passed',passed:$PASSED,detail:'readiness gate pass — advance to final'})})"
```

预期：`check.passed: true`，`check.next: null`（final 是 terminal），`routing.kind: terminal`。

## Step 4: Verify final phase terminal semantics

```bash
echo "=== Final Phase Terminal Semantics ==="

# Verify phase-final.md has gate: null
FINAL_FM=$(head -15 DPT_FRAMEWORK/workflows/nodes/phases/phase-final.md)
echo "$FINAL_FM" | grep 'gate:'
echo "$FINAL_FM" | grep 'gate:' | grep -q 'null' && echo "OK: gate is null" || echo "FAIL: gate is not null"

# Verify chain does NOT have a transition from final
grep 'phase-final.md' DPT_FRAMEWORK/workflows/transitions.chain.json && echo "FAIL: chain has final transition" || echo "OK: chain has no final transition (terminal)"

# Verify manifest has final phase with gate=null
grep 'phase-final.md' DPT_FRAMEWORK/workflows/manifest.json | grep -q 'null' && echo "OK: manifest declares final gate=null" || echo "FAIL: manifest does not declare final gate=null"

echo "=== Terminal semantics verified ==="
```

## Step 5: Verdict from `_logs/_trace.jsonl`

```bash
echo "=== Verdict ==="
cat $B/_logs/_trace.jsonl | node -e "
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf-8').trim().split('\n').filter(l => l);
const checks = lines.map(l => JSON.parse(l)).filter(e => e.event === 'check');
const pass = checks.filter(c => c.passed === true).length;
console.log('Pass:', pass, ' | Total:', checks.length);
if (pass >= 2) {
  console.log('\x1b[32mVERDICT: PASS\x1b[0m');
} else {
  console.log('\x1b[31mVERDICT: FAIL\x1b[0m (expected ≥2 pass, got ' + pass + ')');
}
"
```

预期：≥2 pass → VERDICT: PASS。


## Step 6: 结果解读

> 验证 delivery 完整链：
>   hitl2-recorded → readiness-passed → final terminal。
>   全部 gate pass → lifecycle 终止。

## Step 7: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf $B
echo "Cleaned: $B"
```