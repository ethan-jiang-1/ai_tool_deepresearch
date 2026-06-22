---
schema: command-experiment/v1
experiment: workflow-foundation
case: medium-wave-fault-tolerance
weight: light
case_goal: "Prove that wave gate CLIs do not crash on malformed YAML, correctly report partial dead links in inspect while passing overall, and detect status drift — all returning clear inspect/advice without silent pass or crash."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_wf_fault_*
trace: dpt_disp_wf_fault_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-medium-wave-fault-tolerance

## Expected Runtime Path

三个独立 case，各用独立 disposable bundle。不修复错误，只证明 gate 检测正确、不崩溃、返回清晰 inspect/advice。

1. **Case 1**: Malformed YAML（`source.yaml` 语法错误）→ wave0-complete gate 的 `schema_valid` fail，inspect 指向 parse error
2. **Case 2**: Partial dead links（synthesis 含 1 valid + 2 dead links）→ wave2-complete gate pass（`min_valid_refs=1` 满足），但 inspect 报告 2 条 dead links
3. **Case 3**: Status drift（`current_gate` 值错误）→ wave2-complete gate fail，inspect 指向 status mismatch
4. 从各 bundle 的 `_trace.jsonl` 分别裁决
5. Cleanup all bundles

---

## Case Goal

证明 gate CLI 的容错性：
- **不崩溃**：malformed YAML 不导致 gate crash，仍返回合法 JSON
- **不 silent pass**：status drift 被精确检测并 fail
- **inspect 完整**：partial dead links 场景 gate 整体 pass，但 inspect 仍列出 dead links 供 Agent 审查

已知未覆盖的更底层结构损伤（corrupted `rb_trace.jsonl`、bundle 目录不存在、`rb_plan.md` frontmatter 无法 parse）已在 pre-research fault-tolerance playbook 中覆盖，不重复。

---

## Case 1: Malformed YAML → wave0-complete gate fail（schema_valid）

模拟场景：Agent 错误编辑了 `source.yaml`，写入无法 parse 的 YAML。

```bash
REPO_ROOT=$(pwd)

B1=$(node experiments/shared/new-disposable-bundle.mjs wf_fault1 --force)
echo "Case 1 Bundle: $B1"

# Write 1-topic registry
cat > $B1/rb_plan.md << 'EOF'
---
{
  "plan_basename": "wf_fault1",
  "derived_topic_count": 1,
  "topic_registry": [
    { "id": "t1", "slug": "topic-a", "title": "Topic A" }
  ]
}
---
EOF

# Set wave0 status
cat > $B1/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave0_complete",
  "next_gate": "wave1_complete"
}
EOF

# Create reference directory with malformed YAML
mkdir -p $B1/reference/topic-a
cat > $B1/reference/index.md << 'EOF'
# Reference Index
EOF

# Intentionally malformed YAML (unclosed bracket on url field)
cat > $B1/reference/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ok"
  title: "Valid Entry"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
- url: [unclosed bracket makes this invalid YAML
  title: "Broken Entry"
EOF

echo "=== Malformed YAML ==="
cat $B1/reference/topic-a/source.yaml

# Record trace event
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave0_completion"}' >> $B1/rb_trace.jsonl

echo ""
echo "=== Running wave0-complete gate ==="
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B1 --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"

# Verify: gate survived (produced valid JSON)
echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('is JSON: true');console.log('passed:',j.check.passed);console.log('inspect count:',j.inspect.length);j.inspect.forEach((x,i)=>console.log('  inspect['+i+']:',x))})"

PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B1/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,expected:false,detail:'case1: gate survived malformed YAML, schema_valid fail with clear inspect'})})"
```

预期：gate 不 crash，返回合法 JSON。`check.passed: false`。inspect 指向 YAML parse error 或 schema validation failure。

---

## Case 2: Partial dead links → wave2-complete gate pass（cross_field 含 dead link 报告）

模拟场景：synthesis 有 1 条 valid link + 2 条 dead links。`min_valid_refs=1` 满足，gate 整体 pass。但 inspect 应列出死链接，供 Agent 审查。

```bash
B2=$(node experiments/shared/new-disposable-bundle.mjs wf_fault2 --force)
echo "Case 2 Bundle: $B2"

# Set wave2 status
cat > $B2/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave2_complete",
  "next_gate": "hitl2_recorded"
}
EOF

# Pre-seed valid targets
mkdir -p $B2/reference/topic-a
cat > $B2/reference/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

mkdir -p $B2/artifacts/wave1/topic-a
cat > $B2/artifacts/wave1/topic-a/skeleton.md << 'EOF'
---
slug: topic-a
title: Topic A Skeleton
capability: foundation-placeholder
---

# Topic A: Foundation Skeleton

## Open Questions
- How to measure alignment?
EOF

mkdir -p $B2/artifacts/wave2

# Write synthesis: 1 valid link + 2 dead links
cat > $B2/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis

## Pattern: AI Safety

Based on the [valid skeleton reference](../wave1/topic-a/skeleton.md),
the key finding is that alignment measurement is an open challenge.

Additional context from [dead link A](../wave1/topic-a/nope.md) and
[dead link B](../wave1/topic-b/missing.md) would strengthen this analysis.
ENDOFSYN

echo "=== Synthesis (1 valid + 2 dead links) ==="
cat $B2/artifacts/wave2/synthesis.md

# Record trace event
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave2_completion"}' >> $B2/rb_trace.jsonl

echo ""
echo "=== Running wave2-complete gate ==="
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B2 --current-node phases/phase-wave2.md || true)
echo "$GATE_OUTPUT"

echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('inspect count:',j.inspect.length);j.inspect.forEach((x,i)=>console.log('  inspect['+i+']:',x))})"

PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B2/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,expected:true,detail:'case2: gate pass (min_valid_refs=1 met) but inspect reports 2 dead links'})})"
```

预期：`check.passed: true`（1 valid link ≥ min_valid_refs）。inspect 列出 2 条 dead links（`nope.md`, `missing.md`），供 Agent 审查但不阻止 gate pass。

---

## Case 3: Status drift → wave2-complete gate fail（status_value mismatch）

模拟场景：Agent 忘记更新 `rb_status.json`，`current_gate` 还停留在上一个 phase 的值。

```bash
B3=$(node experiments/shared/new-disposable-bundle.mjs wf_fault3 --force)
echo "Case 3 Bundle: $B3"

# Pre-seed everything correctly for wave2...
mkdir -p $B3/reference/topic-a
cat > $B3/reference/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

mkdir -p $B3/artifacts/wave1/topic-a
cat > $B3/artifacts/wave1/topic-a/skeleton.md << 'EOF'
---
slug: topic-a
title: Topic A Skeleton
capability: foundation-placeholder
---
# Skeleton
EOF

mkdir -p $B3/artifacts/wave2
cat > $B3/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Synthesis

See [skeleton](../wave1/topic-a/skeleton.md) for details.
ENDOFSYN

# BUT set current_gate to wrong value (wave1_complete instead of wave2_complete)
cat > $B3/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave1_complete",
  "next_gate": "hitl2_recorded"
}
EOF

echo "=== Status (drifted: current_gate=wave1_complete, should be wave2_complete) ==="
cat $B3/rb_status.json

# Record trace event
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave2_completion"}' >> $B3/rb_trace.jsonl

echo ""
echo "=== Running wave2-complete gate ==="
GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B3 --current-node phases/phase-wave2.md || true)
echo "$GATE_OUTPUT"

echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('inspect count:',j.inspect.length);j.inspect.forEach((x,i)=>console.log('  inspect['+i+']:',x))})"

PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B3/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,expected:false,detail:'case3: status drift detected — current_gate is wave1_complete, expected wave2_complete'})})"
```

预期：`check.passed: false`。inspect 指向 `status_value` rule fail：`current_gate` 期望 `wave2_complete`，实际为 `wave1_complete`。

---

## Step 4: 从各 bundle trace 分别裁决

```bash
echo "=== Case 1 Verdict (malformed YAML) ==="
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B1/_trace.jsonl')})"

echo ""
echo "=== Case 2 Verdict (partial dead links) ==="
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B2/_trace.jsonl')})"

echo ""
echo "=== Case 3 Verdict (status drift) ==="
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B3/_trace.jsonl')})"
```

## Step 5: Cleanup all bundles

```bash
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B1')})"
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B2')})"
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B3')})"
rm -rf dpt_disp_wf_fault_* 2>/dev/null
```
