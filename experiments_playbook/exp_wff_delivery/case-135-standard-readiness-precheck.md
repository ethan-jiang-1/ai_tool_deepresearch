---
schema: command-experiment/v1
experiment: wff-delivery
case: case-135-standard-readiness-precheck
weight: light
case_goal: "Prove that the readiness-passed gate correctly audits prior gates (from manifest topology), validates artifact reachability, and rejects malformed profile/trace: happy pass + 4 boundary fail cases."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-135_rd_pre_*
trace: dpt_disp_case-135_rd_pre_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-135-standard-readiness-precheck

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed 完整 post-hitl2 状态（所有 artifacts + 所有 prior gate_attempt + valid YAML + valid JSONL）
2. 所有条件满足 → gate readiness-passed pass
3. 删除 artifact → gate fail
4. 只保留部分 prior gate_attempt → gate fail（inspect 列出缺失 gate）
5. 破坏 YAML → gate fail
6. 破坏 JSONL → gate fail
7. 从 `rb_trace.jsonl` 裁决（预期 1 pass + 4 fail）
8. Cleanup

---

## Case Goal

证明 readiness-passed gate：
- 通过 manifest 拓扑正确推导 prior gate 集合（不硬编码阈值）
- 正确审计所有 prior gate_attempt(passed=true)
- 对缺失 artifact、损坏 YAML、损坏 JSONL 正确 fail
- Inspect 输出在 fail 时命名具体缺失的 gate

---

## Step 1: 创建 bundle + pre-seed 完整 post-hitl2 状态

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs rd_pre --case case-135 --force)
echo "Bundle: $B"

# Set status to readiness-ready
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "readiness_passed",
  "next_gate": "none"
}
EOF

# Create all required artifacts
cat > $B/seed_topics/topic-a.md << 'EOF'
---
slug: topic-a
title: AI Safety
---
# AI Safety
EOF

mkdir -p $B/artifacts/wave0/topic-a
cat > $B/reference/_INDEX.md << 'EOF'
# Reference Index
- [AI Safety](topic-a/source.yaml)
EOF
cat > $B/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "AI Safety Overview"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

mkdir -p $B/artifacts/wave2
cat > $B/artifacts/wave2/synthesis.md << 'EOF'
# Cross-Topic Synthesis
Key pattern: convergence of technical and policy approaches.
EOF

mkdir -p $B/artifacts/hitl2
cat > $B/artifacts/hitl2/decision-brief.md << 'EOF'
# Final Review Decision Brief
Research is complete. Proceed to readiness.
EOF

# Write valid profile
cat > $B/rb_profile.yaml << 'EOF'
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-15T10:00:00Z"
  hitl2:
    status: recorded
    user_decision: proceed_to_readiness
EOF

# Write trace with all 8 prior gate_attempt(passed:true) events
for g in instantiation-complete hitl1-recorded setup-ready seed-topics-ready wave0-complete wave1-complete wave2-complete hitl2-recorded; do
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"gate_attempt\",\"gate\":\"$g\",\"passed\":true}" >> $B/rb_trace.jsonl
done

echo "=== Bundle ready ==="
echo "Prior gates in trace:"
grep gate_attempt $B/rb_trace.jsonl | grep -o '"gate":"[^"]*"' | sort | uniq
```

## Step 2: Happy path — all conditions met → gate pass

```bash
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle $B --current-node phases/phase-readiness.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "gate: readiness-passed | passed: $PASSED"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'readiness-passed',passed:$PASSED,detail:'happy path — all artifacts + all prior gates passed'})})"
```

预期：`check.passed: true`，routing.kind 为 `terminal`（next_gate: none）。

## Step 3: Missing artifact → gate fail

```bash
# Remove one artifact
rm $B/artifacts/wave2/synthesis.md

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle $B --current-node phases/phase-readiness.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "gate: readiness-passed | passed: $PASSED"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'readiness-passed',passed:$PASSED,detail:'missing synthesis — expected fail'})})"

# Restore for next test
cat > $B/artifacts/wave2/synthesis.md << 'EOF'
# Cross-Topic Synthesis
Key pattern: convergence.
EOF
```

预期：`check.passed: false`，inspect 指向 `synthesis.md`。

## Step 4: Only partial prior gates → gate fail（inspect 列出缺失 gate）

```bash
# Overwrite trace with only 5 prior gates
> $B/rb_trace.jsonl
for g in instantiation-complete hitl1-recorded setup-ready seed-topics-ready wave0-complete; do
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"gate_attempt\",\"gate\":\"$g\",\"passed\":true}" >> $B/rb_trace.jsonl
done

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle $B --current-node phases/phase-readiness.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "gate: readiness-passed | passed: $PASSED"
INSPECT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs inspect.0)
echo "inspect: $INSPECT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'readiness-passed',passed:$PASSED,detail:'partial gates — inspect must name missing gates'})})"

# Restore full trace for next test
> $B/rb_trace.jsonl
for g in instantiation-complete hitl1-recorded setup-ready seed-topics-ready wave0-complete wave1-complete wave2-complete hitl2-recorded; do
  echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",\"event\":\"gate_attempt\",\"gate\":\"$g\",\"passed\":true}" >> $B/rb_trace.jsonl
done
```

预期：`check.passed: false`，inspect 列出缺失 gate 名称（wave1-complete, wave2-complete, hitl2-recorded）。

## Step 5: Unparseable YAML → gate fail

```bash
# Corrupt rb_profile.yaml
echo 'key: [bad: > yaml: {{{' > $B/rb_profile.yaml

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle $B --current-node phases/phase-readiness.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "gate: readiness-passed | passed: $PASSED"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'readiness-passed',passed:$PASSED,detail:'corrupt YAML — expected fail'})})"

# Restore valid profile
cat > $B/rb_profile.yaml << 'EOF'
human_decision_checkpoints:
  hitl1:
    status: recorded
  hitl2:
    status: recorded
    user_decision: proceed_to_readiness
EOF
```

预期：`check.passed: false`，inspect 包含 YAML parse error。

## Step 6: Corrupt JSONL → gate fail

```bash
# Append non-JSON lines to trace
echo 'this is not valid json' >> $B/rb_trace.jsonl
echo 'neither is this {{{' >> $B/rb_trace.jsonl

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-readiness-passed.mjs --bundle $B --current-node phases/phase-readiness.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "gate: readiness-passed | passed: $PASSED"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'readiness-passed',passed:$PASSED,detail:'corrupt JSONL — expected fail'})})"
```

预期：`check.passed: false`，inspect 包含 unparseable lines。

## Step 7: Verdict from `rb_trace.jsonl`

```bash
echo "=== Verdict ==="
cat $B/rb_trace.jsonl | node -e "
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf-8').trim().split('\n').filter(l => l);
const checks = lines.map(l => JSON.parse(l)).filter(e => e.event === 'check');
const pass = checks.filter(c => c.passed === true).length;
const fail = checks.filter(c => c.passed === false).length;
console.log('Pass:', pass, ' | Fail:', fail);
if (pass >= 1 && fail >= 4) {
  console.log('\x1b[32mVERDICT: PASS\x1b[0m');
} else {
  console.log('\x1b[31mVERDICT: FAIL\x1b[0m (expected ≥1 pass + ≥4 fail, got ' + pass + ' pass + ' + fail + ' fail)');
}
"
```

预期：≥1 pass + ≥4 fail → VERDICT: PASS。


## Step 8: 结果解读

> 验证 readiness gate：
>   manifest 拓扑推导 prior gate 集合 + artifact/parsability 审计 → gate pass。

## Step 9: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
rm -rf $B
echo "Cleaned: $B"
```