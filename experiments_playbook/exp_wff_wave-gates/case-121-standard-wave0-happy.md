---
schema: command-experiment/v1
experiment: wff-wave-gates
case: case-121-standard-wave0-happy
weight: light
case_goal: "Prove that wave0-complete gate correctly validates ReferenceMetadata schema, enforces count_floor, detects empty registry, expands {topic} placeholder, and ANDs count_floor with schema_valid."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-121_w0_happy_*
trace: dpt_disp_case-121_w0_happy_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；

## Reality Distance Ledger

| 维度 | 声明 |
|------|------|
| **Runtime context** | disposable bundle，`new-disposable-bundle.mjs` 创建 |
| **Framework path** | gate CLI (`check-gate-wave0-complete.mjs`), `wff-playbook-utils.mjs` |
| **Fixture input** | topic_registry, reference files, status 在 playbook 内写入 — Engine-layer fixture |
| **Agent actor** | 无（fixture-backed）— 不证明 Agent source intake/写作能力 |
| **External calls** | 无 |
| **Verdict source** | `rb_trace.jsonl` `check` events |
| **不证明** | Agent 产出 reference 文件、delegated complete、ledger — 仅证明 gate rule 逻辑 |

禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-121-standard-wave0-happy

## Expected Runtime Path

1. 创建 disposable bundle + 写入 topic_registry + 设置 wave0-ready status
2. 写 schema-valid reference metadata → gate pass
3. 移除一个 topic 的 metadata → gate fail（missing per-topic source.yaml）
4. 清空 topic_registry → gate fail（inspect 指向空 registry，证明 source of truth = registry）
5. 恢复 registry 但写数量达标 schema 不合格的 reference → gate fail（count_floor pass 但 schema_valid fail → AND 交互）
6. 恢复 registry 含 3 topics 但漏 1 个 artifacts/wave0 目录 → gate fail（{topic} 展开精确指出缺失）
7. 从 `rb_trace.jsonl` 裁决（预期 5 条 check：1 pass + 4 fail）
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
B=$(node experiments_env/shared/new-disposable-bundle.mjs w0_happy --case case-121 --force)
echo "Bundle: $B"

# Validate
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Write topic_registry (3 topics) to rb_plan.md frontmatter
cat > $B/rb_plan.md << 'EOF'
---
plan_basename: w0_happy
derived_topic_count: 3
topic_registry:
  - id: t1
    slug: topic-a
    title: Topic A
  - id: t2
    slug: topic-b
    title: Topic B
  - id: t3
    slug: topic-c
    title: Topic C
---
# w0_happy Plan
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

# Create artifact directories (new convention: artifacts/wave0/ for thin YAML)
mkdir -p $B/artifacts/wave0/topic-a $B/artifacts/wave0/topic-b $B/artifacts/wave0/topic-c

echo "=== Registry ==="
head -12 $B/rb_plan.md
echo "=== Status ==="
cat $B/rb_status.json
```

预期：bundle 创建，registry 含 3 topics，status 指向 `wave0_complete`→`wave1_complete`。

## Step 2: 写 schema-valid reference metadata → gate pass

所有 3 个 topic 都有合法的 thin YAML（在 artifacts/wave0/），reference/ 有 _INDEX.md、README.md、00-shared-*.md。

```bash
# Write reference _INDEX.md (8-column table)
cat > $B/reference/_INDEX.md << 'EOF'
# Reference Index
| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 00-shared-ai-safety.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |
EOF

# Write reference README.md
cat > $B/reference/README.md << 'EOF'
# Reference Evidence
Flat reference directory. Naming: 00-shared-*.md / 0N-*.md / 00-cross-*.md.
See _INDEX.md for canonical inventory.
EOF

# Write 00-shared-*.md (rich MD with metadata + 5 sections)
cat > $B/reference/00-shared-ai-safety.md << 'EOF'
# Understanding AI Safety
- source_url: https://example.com/research/ai-safety
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 2
- evidence_role: foundation
- trust_level: practitioner
- why_it_matters: Provides foundational overview of AI safety for all topics.
- accessed_at: 2026-06-15
- related_topic: all

## Key Facts
- AI safety is an active research area with growing industry investment.
- Major AI labs have dedicated safety and alignment teams.
- Adversarial robustness remains a key technical challenge.
- Regulatory frameworks for AI are emerging across jurisdictions.
- Open-source models present unique safety and governance challenges.

## Core Content Capture
This source provides a broad overview of AI safety including technical alignment approaches, policy governance frameworks, and societal impact dimensions across multiple jurisdictions and research communities.

## Relevance To This Research
Serves as shared foundation for all 3 topics in the topic_registry.

## Quotable Terms / Concepts
- "AI safety is the study of making AI systems reliable and aligned with human values"

## Risks And Limitations
- High-level overview, lacks depth on individual topics.
EOF

# Write thin YAML for each topic in artifacts/wave0/
cat > $B/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
  notes: "Good overview of the field"
EOF

cat > $B/artifacts/wave0/topic-b/source.yaml << 'EOF'
- url: "https://example.com/ai-alignment"
  title: "AI Alignment Basics"
  retrieved_date: "2026-06-16"
  topic_tag: "topic-b"
EOF

cat > $B/artifacts/wave0/topic-c/source.yaml << 'EOF'
- url: "https://example.com/ai-society"
  title: "Societal Impact of AI"
  retrieved_date: "2026-06-17"
  topic_tag: "topic-c"
EOF

# Record trace event

# Write output declaration ledger — gate count_floor + content_dedup now read from ledger
cat > $B/rb_output_declarations.jsonl << 'EOF'
{"declared_at":"2026-06-15T00:00:00.000Z","work_id":"wave0-shared","producer_rule":"source_intake_fan_in","slot_result_ref":"_subagents/wave_01/slot_00/result.json","runtime_receipt_ref":"_subagents/wave_01/slot_00/runtime-receipt.jsonl","output_files":[{"path":"reference/00-shared-ai-safety.md","role":"reference","source_url":"https://example.com/research/ai-safety"}],"cache_trails":[],"creation_reason":"Fixture-backed reference declaration for gate rule testing"}
EOF

echo "=== Reference artifacts ==="
find $B/reference $B/artifacts -type f | sort

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate wave0-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,detail:'all 3 topics with schema-valid metadata pass'})})"
```

预期：`check.passed: true`。

## Step 3: 移除一个 topic 的 metadata → gate fail

```bash
rm $B/artifacts/wave0/topic-a/source.yaml

echo "=== After removing topic-a ==="
find $B/artifacts/wave0 -type f

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate wave0-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,expected:false,detail:'missing topic-a source.yaml should fail with inspect pointing to topic-a'})})"
```

预期：`check.passed: false`，`inspect` 指向缺失 `artifacts/wave0/topic-a/source.yaml`。

## Step 4: 清空 topic_registry → gate fail

Source of truth 是 registry，不是磁盘扫描。清空 registry 后 gate 必须 fail。

```bash
# Empty the registry
cat > $B/rb_plan.md << 'EOF'
---
plan_basename: w0_happy
derived_topic_count: 0
topic_registry: []
---
# Empty Plan
EOF

echo "=== Empty registry ==="
head -10 $B/rb_plan.md

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate wave0-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,expected:false,detail:'empty registry should fail with inspect pointing to registry (not disk scan)'})})"
```

预期：`check.passed: false`，`inspect` 指向空 registry（不是扫描磁盘），gate 不 crash。

## Step 5: 恢复 registry + 写数量达标但 schema 不合格的 reference → gate fail

AND 交互：`count_floor` pass（2 条 entries 达到 threshold 1）但 `schema_valid` fail（其中一条 entry 的 url 为空）。

```bash
# Restore registry with 1 topic
cat > $B/rb_plan.md << 'EOF'
---
plan_basename: w0_happy
derived_topic_count: 1
topic_registry:
  - id: t1
    slug: topic-a
    title: Topic A
---
# w0_happy Plan
EOF

# Re-create topic-a directory and write mixed metadata (1 valid + 1 invalid)
mkdir -p $B/artifacts/wave0/topic-a
cat > $B/artifacts/wave0/topic-a/source.yaml << 'EOF'
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
cat $B/artifacts/wave0/topic-a/source.yaml

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate wave0-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,expected:false,detail:'count_floor pass but schema_valid fail = gate fail (AND interaction)'})})"
```

预期：`check.passed: false`。`count_floor` rule 看到 2 条 entries → pass。`schema_valid` rule 检测到第二条 entry 的 url 为空 → fail。Gate 整体 fail（AND）。

## Step 6: 恢复 3-topic registry 但漏建 1 个 artifacts/wave0 目录 → gate fail

验证 `{topic}` 占位符展开后精确指出缺失 topic。

```bash
# Restore full 3-topic registry
cat > $B/rb_plan.md << 'EOF'
---
plan_basename: w0_happy
derived_topic_count: 3
topic_registry:
  - id: t1
    slug: topic-a
    title: Topic A
  - id: t2
    slug: topic-b
    title: Topic B
  - id: t3
    slug: topic-c
    title: Topic C
---
# w0_happy Plan
EOF

# Clean all per-topic source.yamls, then only create topic-a and topic-b.
# Intentionally omit topic-c to test {topic} expansion.
rm -f $B/artifacts/wave0/topic-a/source.yaml $B/artifacts/wave0/topic-b/source.yaml $B/artifacts/wave0/topic-c/source.yaml

cat > $B/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

mkdir -p $B/artifacts/wave0/topic-b
cat > $B/artifacts/wave0/topic-b/source.yaml << 'EOF'
- url: "https://example.com/alignment"
  title: "AI Alignment"
  retrieved_date: "2026-06-16"
  topic_tag: "topic-b"
EOF

echo "=== artifacts/wave0 dirs (topic-c missing) ==="
ls -la $B/artifacts/wave0/

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate wave0-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,expected:false,detail:'topic-c missing reference should be detected via {topic} expansion'})})"
```

预期：`check.passed: false`，`inspect` 精确指出 `artifacts/wave0/topic-c/source.yaml` 缺失（不是笼统地"某 topic 缺 reference"）。

## Step 7: 从 trace 裁决

预期 5 条 `check` event：1 pass（Step 2）+ 4 fail（Steps 3, 4, 5, 6）。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/rb_trace.jsonl')})"
```

## Step 8: 结果解读

> 5 个 check（1 pass + 4 fail），验证 wave0 gate 边界行为：
>   [PASS] 3 topics 全部合法 → gate pass
>   [FAIL ✅] 缺 topic-a source.yaml → gate 正确拒绝，inspect 指出 topic-a
>   [FAIL ✅] 空 registry → gate 正确拒绝（source of truth=registry）
>   [FAIL ✅] count_floor OK + schema fail → gate 正确拒绝（AND 关系）
>   [FAIL ✅] 3 topics 缺 topic-c → gate 正确拒绝（{topic} 展开指出 topic-c）
>   4 个 FAIL 都是正确的边界拒绝。

## Step 9: Post-Execution Health

Standard profile — 检查 trace, legacy_trace, bundle_schema, gate_attempts, timeline.

```bash
node experiments_env/shared/verify-bundle-health.mjs --bundle $B --profile standard
```

> 健康检查不改变 verdict。health status 由 runner report 记录。

## Step 10: Cleanup

> PASS + CLEAN 才执行。FAIL 或 HEALTH ISSUES 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
