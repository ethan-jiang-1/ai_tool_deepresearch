---
schema: command-experiment/v1
experiment: wff-wave-gates
case: case-122-standard-wave1-boundary
weight: light
case_goal: "Prove that wave1-complete gate correctly enforces evidence-summary.md existence, question-list.md 4-section structure, and reference/{topic}-*.md count_floor."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-122_w1_boundary_*
trace: dpt_disp_case-122_w1_boundary_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-122-standard-wave1-boundary

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed Wave0 artifacts + 设置 wave1-ready status
2. 写完整合法 wave1 产出 → gate pass
3. 移除 evidence-summary.md → gate fail
4. 写残缺 question-list.md（缺 section）→ gate fail
5. 从 `rb_trace.jsonl` 裁决（预期 3 条 check：1 pass + 2 fail）
6. Cleanup

---

## Case Goal

证明：wave1-complete gate 正确检测缺失 evidence-summary、question-list 结构不完整等边界条件。

---

## Step 1: 创建 bundle + pre-seed Wave0 + 设置 wave1 status

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs w1_boundary --case case-122 --force)
echo "Bundle: $B"

# Validate
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Write topic_registry (1 topic)
cat > $B/rb_plan.md << 'EOF'
---
plan_basename: w1_boundary
derived_topic_count: 1
topic_registry:
  - id: t1
    slug: topic-a
    title: Topic A
---
# w1_boundary Plan
EOF

# Set status to wave1
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave1_complete",
  "next_gate": "wave2_complete"
}
EOF

# Pre-seed Wave0 artifacts (required for realistic state)
mkdir -p $B/artifacts/wave0/topic-a
cat > $B/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety"
  title: "Understanding AI Safety"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
EOF

# Pre-seed reference/ with 00-shared-*.md + _INDEX.md + README.md
cat > $B/reference/00-shared-foundation.md << 'EOF'
# AI Safety Foundation
- source_url: https://example.com/ai-safety
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 2
- evidence_role: foundation
- trust_level: practitioner
- why_it_matters: Foundation for topic-a deepening.
- accessed_at: 2026-06-15
- related_topic: topic-a

## Key Facts
- AI safety research is active.

## Core Content Capture
Foundation overview of AI safety.

## Relevance To This Research
Basis for topic-a investigation.

## Quotable Terms / Concepts
- "AI alignment"

## Risks And Limitations
- Single source.
EOF

cat > $B/reference/_INDEX.md << 'EOF'
# Reference Index
| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 00-shared-foundation.md | secondary | practitioner | Tier 2 | topic-a | wave0_foundation | accepted | 2026-06-15 |
EOF

cat > $B/reference/README.md << 'EOF'
# Reference Evidence
Flat reference directory.
EOF

# Pre-seed seed_topics (needed for backfill token checks)
mkdir -p $B/seed_topics
cat > $B/seed_topics/topic-a.md << 'EOF'
---
id: t1
slug: topic-a
title: Topic A
---
# Topic A

## Key Dimensions
- Technical alignment

## Known Premises
- AI safety is important.

## Open Questions
- How to measure alignment?
EOF

# Pre-seed Wave1 directory
mkdir -p $B/artifacts/wave1/topic-a

echo "=== Status ==="
cat $B/rb_status.json
echo "=== Registry ==="
head -10 $B/rb_plan.md
```

预期：bundle 创建，status 指向 `wave1_complete`→`wave2_complete`，registry 含 topic-a。

## Step 2: 写完整合法 wave1 产出 → gate pass

```bash
# evidence-summary with key findings + URL
cat > $B/artifacts/wave1/topic-a/evidence-summary.md << 'EOF'
## Key Findings
1. AI safety is an active research area [Source](https://example.com/ai-safety)
2. Multiple alignment approaches are being explored.
EOF

# question-list with all 4 sections
cat > $B/artifacts/wave1/topic-a/question-list.md << 'EOF'
## Topic Investigation Targets
1. What is the current state of AI safety research?

## Question Reconciliation
Resolved Q1 with evidence from Wave0.

## Emergent Question Protocol
None at this time.

## Exploration / Exploitation Decision
Proceed to Wave2 with current evidence.
EOF

# reference/{topic}-*.md rich MD file (count_floor requirement)
cat > $B/reference/topic-a-deepening-source.md << 'EOF'
# Deepening Source for Topic A
- source_url: https://example.com/deepening
- acceptance_status: accepted
- source_type: primary
- tier: Tier 2
- evidence_role: primary_topic_reference
- trust_level: academic
- why_it_matters: Provides empirical evidence for topic-a.
- accessed_at: 2026-06-26
- related_topic: topic-a

## Key Facts
- Empirical study shows alignment progress.

## Core Content Capture
This study provides data on alignment technique effectiveness.

## Relevance To This Research
Directly supports topic-a investigation targets.

## Quotable Terms / Concepts
- "Alignment techniques show 40% improvement"

## Risks And Limitations
- Single study, limited sample size.
EOF

# Record trace event

echo "=== Wave1 artifacts ==="
find $B/artifacts/wave1 $B/reference -type f | sort

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B --current-node phases/phase-wave1.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave1-complete',passed:$PASSED,detail:'full valid wave1 artifacts pass'})})"
```

预期：`check.passed: true`。

## Step 3: 移除 evidence-summary → gate fail

```bash
rm $B/artifacts/wave1/topic-a/evidence-summary.md

echo "=== After removing evidence-summary ==="
ls $B/artifacts/wave1/topic-a/

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B --current-node phases/phase-wave1.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave1-complete',passed:$PASSED,expected:false,detail:'missing evidence-summary should fail'})})"
```

预期：`check.passed: false`，`inspect` 指出缺失 `evidence-summary.md`。

## Step 4: 恢复 evidence-summary 但写残缺 question-list → gate fail

```bash
# Restore evidence-summary
cat > $B/artifacts/wave1/topic-a/evidence-summary.md << 'EOF'
## Key Findings
1. AI safety is an active research area [Source](https://example.com/ai-safety)
EOF

# Write question-list with missing sections (only 2 of 4 required)
cat > $B/artifacts/wave1/topic-a/question-list.md << 'EOF'
## Topic Investigation Targets
1. What is AI safety?

## Emergent Question Protocol
None.
EOF

echo "=== Incomplete question-list ==="
cat $B/artifacts/wave1/topic-a/question-list.md

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B --current-node phases/phase-wave1.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave1-complete',passed:$PASSED,expected:false,detail:'incomplete question-list sections should fail'})})"
```

预期：`check.passed: false`，`inspect` 指出 question-list 缺少必需 section。

## Step 5: 从 trace 裁决

预期 3 条 `check` event：1 pass（Step 2）+ 2 fail（Step 3, 4）。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/rb_trace.jsonl')})"
```


## Step 6: 结果解读

> 3 个 check（1 pass + 2 fail），验证 wave1 gate 边界：
>   [PASS] 所有产出完整 → gate pass
>   [FAIL ✅] 缺 evidence-summary → gate fail
>   [FAIL ✅] question-list 缺必需 section → gate fail
>   2 个 FAIL 都是正确的边界拒绝。

## Step 7: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
