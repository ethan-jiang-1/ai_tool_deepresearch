---
schema: command-experiment/v1
experiment: workflow-foundation
case: simple-wave0-happy-path
weight: light
case_goal: "Prove that wave0-complete gate correctly validates ReferenceMetadata schema, enforces count_floor, detects empty registry, expands {topic} placeholder, and ANDs count_floor with schema_valid."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_w0_happy_*
trace: dpt_disp_w0_happy_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-simple-wave0-happy-path

## Expected Runtime Path

1. 创建 disposable bundle + 写入 topic_registry + 设置 wave0-ready status
2. 写 schema-valid reference metadata → gate pass
3. 移除一个 topic 的 metadata → gate fail（missing per-topic source.yaml）
4. 清空 topic_registry → gate fail（inspect 指向空 registry，证明 source of truth = registry）
5. 恢复 registry 但写数量达标 schema 不合格的 reference → gate fail（count_floor pass 但 schema_valid fail → AND 交互）
6. 恢复 registry 含 3 topics 但漏 1 个 reference 目录 → gate fail（{topic} 展开精确指出缺失）
7. 从 `_trace.jsonl` 裁决（预期 5 条 check：1 pass + 4 fail）
8. Cleanup

---

## Case Goal

证明：
1. wave0-complete gate 对 schema-valid reference metadata 正常 pass
2. Topic 集合 source of truth = `rb_plan.md#/topic_registry`（空 registry → gate fail，而非回退到磁盘扫描）
3. `count_floor` 和 `schema_valid` 是 AND 关系（数量达标但 schema 不合格 → gate 整体 fail）
4. `{topic}` 占位符展开后能精确指出缺失 topic

---

## Step 1: 创建 bundle + 写入 topic_registry + 设置 status

```bash
REPO_ROOT=$(pwd)
B=$(node experiments/shared/new-disposable-bundle.mjs w0_happy --force)
echo "Bundle: $B"

# Validate
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Write topic_registry (3 topics)
cat > $B/rb_plan.md << 'EOF'
---
{
  "plan_basename": "w0_happy",
  "derived_topic_count": 3,
  "topic_registry": [
    { "id": "t1", "slug": "topic-a", "title": "Topic A" },
    { "id": "t2", "slug": "topic-b", "title": "Topic B" },
    { "id": "t3", "slug": "topic-c", "title": "Topic C" }
  ]
}
---
EOF

# Set status to wave0
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave0_complete",
  "next_gate": "wave1_complete"
}
EOF

# Create reference directory scaffold
mkdir -p $B/reference/topic-a $B/reference/topic-b $B/reference/topic-c

echo "=== Registry ==="
head -12 $B/rb_plan.md
echo "=== Status ==="
cat $B/rb_status.json
```

预期：bundle 创建，registry 含 3 topics，status 指向 `wave0_complete`→`wave1_complete`。

## Step 2: 写 schema-valid reference metadata → gate pass

所有 3 个 topic 都有合法的 reference metadata，trace event 存在。

```bash
# Write reference index
cat > $B/reference/index.md << 'EOF'
# Reference Index
- topic-a: 1 ref (Understanding AI Safety)
- topic-b: 1 ref (AI Alignment Basics)
- topic-c: 1 ref (Societal Impact of AI)
EOF

# Write valid metadata for each topic
cat > $B/reference/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
  notes: "Good overview of the field"
EOF

cat > $B/reference/topic-b/source.yaml << 'EOF'
- url: "https://example.com/ai-alignment"
  title: "AI Alignment Basics"
  retrieved_date: "2026-06-16"
  topic_tag: "topic-b"
EOF

cat > $B/reference/topic-c/source.yaml << 'EOF'
- url: "https://example.com/ai-society"
  title: "Societal Impact of AI"
  retrieved_date: "2026-06-17"
  topic_tag: "topic-c"
EOF

# Record trace event
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave0_completion"}' >> $B/rb_trace.jsonl

echo "=== Reference artifacts ==="
find $B/reference -type f | sort

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,detail:'all 3 topics with schema-valid metadata pass'})})"
```

预期：`check.passed: true`。

## Step 3: 移除一个 topic 的 metadata → gate fail

```bash
rm $B/reference/topic-a/source.yaml

echo "=== After removing topic-a ==="
find $B/reference -type f

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,expected:false,detail:'missing topic-a source.yaml should fail with inspect pointing to topic-a'})})"
```

预期：`check.passed: false`，`inspect` 指向缺失 `reference/topic-a/source.yaml`。

## Step 4: 清空 topic_registry → gate fail

Source of truth 是 registry，不是磁盘扫描。清空 registry 后 gate 必须 fail。

```bash
# Empty the registry
cat > $B/rb_plan.md << 'EOF'
---
{
  "plan_basename": "w0_happy",
  "derived_topic_count": 0,
  "topic_registry": []
}
---
EOF

echo "=== Empty registry ==="
head -10 $B/rb_plan.md

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,expected:false,detail:'empty registry should fail with inspect pointing to registry (not disk scan)'})})"
```

预期：`check.passed: false`，`inspect` 指向空 registry（不是扫描磁盘），gate 不 crash。

## Step 5: 恢复 registry + 写数量达标但 schema 不合格的 reference → gate fail

AND 交互：`count_floor` pass（2 条 entries 达到 threshold 1）但 `schema_valid` fail（其中一条 entry 的 url 为空）。

```bash
# Restore registry with topics
cat > $B/rb_plan.md << 'EOF'
---
{
  "plan_basename": "w0_happy",
  "derived_topic_count": 1,
  "topic_registry": [
    { "id": "t1", "slug": "topic-a", "title": "Topic A" }
  ]
}
---
EOF

# Re-create topic-a directory and write mixed metadata (1 valid + 1 invalid)
mkdir -p $B/reference/topic-a
cat > $B/reference/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ok"
  title: "Valid Entry"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
- url: ""
  title: "Missing URL"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

echo "=== Reference (mixed valid + invalid) ==="
cat $B/reference/topic-a/source.yaml

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,expected:false,detail:'count_floor pass but schema_valid fail = gate fail (AND interaction)'})})"
```

预期：`check.passed: false`。`count_floor` rule 看到 2 条 entries → pass。`schema_valid` rule 检测到第二条 entry 的 url 为空 → fail。Gate 整体 fail（AND）。

## Step 6: 恢复 3-topic registry 但漏建 1 个 reference 目录 → gate fail

验证 `{topic}` 占位符展开后精确指出缺失 topic。

```bash
# Restore full 3-topic registry
cat > $B/rb_plan.md << 'EOF'
---
{
  "plan_basename": "w0_happy",
  "derived_topic_count": 3,
  "topic_registry": [
    { "id": "t1", "slug": "topic-a", "title": "Topic A" },
    { "id": "t2", "slug": "topic-b", "title": "Topic B" },
    { "id": "t3", "slug": "topic-c", "title": "Topic C" }
  ]
}
---
EOF

# Clean all per-topic source.yamls, then only create topic-a and topic-b.
# Intentionally omit topic-c to test {topic} expansion.
rm -f $B/reference/topic-a/source.yaml $B/reference/topic-b/source.yaml $B/reference/topic-c/source.yaml

cat > $B/reference/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

mkdir -p $B/reference/topic-b
cat > $B/reference/topic-b/source.yaml << 'EOF'
- url: "https://example.com/alignment"
  title: "AI Alignment"
  retrieved_date: "2026-06-16"
  topic_tag: "topic-b"
EOF

echo "=== Reference dirs (topic-c missing) ==="
ls -la $B/reference/

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,expected:false,detail:'topic-c missing reference should be detected via {topic} expansion'})})"
```

预期：`check.passed: false`，`inspect` 精确指出 `reference/topic-c/source.yaml` 缺失（不是笼统地"某 topic 缺 reference"）。

## Step 7: 从 trace 裁决

预期 5 条 `check` event：1 pass（Step 2）+ 4 fail（Steps 3, 4, 5, 6）。

```bash
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_trace.jsonl')})"
```

## Step 8: Cleanup

```bash
node -e "import('$REPO_ROOT/experiments/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
