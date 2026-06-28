---
schema: command-experiment/v1
experiment: wff-wave-chain
case: case-154-standard-wave-review-surface
weight: light
case_goal: "Prove that the Wave0→Wave1→Wave2 review surface is visible in Markdown — reference metadata, evidence summaries, cross-topic synthesis, and human review checklist are all readable without reading JS."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-154_w2_review_*
trace: dpt_disp_case-154_w2_review_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。所有审查内容在 Markdown 正文中；thin driver 只做 bundle 创建、fixture 写入、gate 调用、trace 记录。

# case-154-standard-wave-review-surface

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed 完整 Wave0/Wave1 artifacts（3 topics）
2. 展示 Wave0 Reference Metadata（_INDEX.md table + 00-shared-*.md）
3. 展示 Wave1 Evidence + Question Lists
4. 写入 cross-topic synthesis（含 valid Markdown links），展示合成全文
5. 运行 wave2-complete gate → pass
6. Human Review Checklist
7. 从 trace 裁决 + cleanup

---

## Step 1: 创建 bundle + pre-seed Wave0/Wave1 artifacts（3 topics）

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs w2_review --case case-154 --force)
echo "Bundle: $B"

# Validate
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Write topic_registry (3 topics, YAML frontmatter)
cat > $B/rb_plan.md << 'EOF'
---
plan_basename: w2_review
derived_topic_count: 3
topic_registry:
  - id: t1
    slug: topic-a
    title: AI Safety Landscape
  - id: t2
    slug: topic-b
    title: AI Policy Governance
  - id: t3
    slug: topic-c
    title: Technical Alignment Methods
---
# w2_review Plan
EOF

# Set wave2 status
cat > $B/rb_status.json << 'EOF'
{"current_mode":"execution","state":"in_progress","current_gate":"wave2_complete","next_gate":"hitl2_recorded"}
EOF

# Pre-seed Wave0: artifacts/wave0/ thin YAML for 3 topics
for slug in topic-a topic-b topic-c; do
  mkdir -p $B/artifacts/wave0/$slug
done

cat > $B/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://arxiv.org/abs/2601.12345"
  title: "AI Safety Landscape: A Systematic Review of Research Directions in 2025-2026"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
- url: "https://www.alignmentforum.org/posts/2026/survey"
  title: "Taxonomy of Alignment Approaches: From RLHF to Constitutional AI"
  retrieved_date: "2026-06-16"
  topic_tag: "topic-a"
EOF

cat > $B/artifacts/wave0/topic-b/source.yaml << 'EOF'
- url: "https://eur-lex.europa.eu/eli/reg/2026/1689"
  title: "EU AI Act: Implementation Guidelines and Compliance Framework"
  retrieved_date: "2026-06-12"
  topic_tag: "topic-b"
- url: "https://www.oecd.org/digital/ai-policy-observatory-2026"
  title: "OECD AI Policy Observatory: International Governance Coordination Report"
  retrieved_date: "2026-06-14"
  topic_tag: "topic-b"
EOF

cat > $B/artifacts/wave0/topic-c/source.yaml << 'EOF'
- url: "https://arxiv.org/abs/2603.67890"
  title: "Scalable Oversight: Empirical Progress and Open Challenges"
  retrieved_date: "2026-06-17"
  topic_tag: "topic-c"
- url: "https://distill.pub/2026/interpretability-mechanistic"
  title: "Mechanistic Interpretability: A Practical Survey of Tools and Methods"
  retrieved_date: "2026-06-18"
  topic_tag: "topic-c"
EOF

# Pre-seed reference/ with _INDEX.md + README.md + 00-shared-*.md
cat > $B/reference/_INDEX.md << 'EOF'
# Reference Index
| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 00-shared-ai-safety-landscape.md | secondary | practitioner | Tier 2 | topic-a | wave0_foundation | accepted | 2026-06-15 |
| 00-shared-ai-policy.md | secondary | official | Tier 2 | topic-b | wave0_foundation | accepted | 2026-06-12 |
| 00-shared-technical-alignment.md | secondary | academic | Tier 2 | topic-c | wave0_foundation | accepted | 2026-06-17 |
EOF

cat > $B/reference/README.md << 'EOF'
# Reference Evidence
Flat reference directory with 3 shared foundation sources covering AI safety landscape, policy governance, and technical alignment.
EOF

cat > $B/reference/00-shared-ai-safety-landscape.md << 'EOF'
# AI Safety Landscape Overview
- source_url: https://arxiv.org/abs/2601.12345
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 2
- evidence_role: foundation
- trust_level: practitioner
- why_it_matters: Provides taxonomy spanning technical, policy, and societal dimensions.
- accessed_at: 2026-06-15
- related_topic: topic-a

## Key Facts
- AI safety research spans technical alignment, policy governance, and societal impact.
- Multi-stakeholder coordination is emerging as a key theme.

## Core Content Capture
Comprehensive taxonomy of AI safety research directions.

## Relevance To This Research
Foundation for topic-a investigation.

## Quotable Terms / Concepts
- "The gap between regulatory readiness and technical maturity is the central tension in AI safety"

## Risks And Limitations
- Survey-level overview; individual dimensions not deeply analyzed.
EOF

cat > $B/reference/00-shared-ai-policy.md << 'EOF'
# AI Policy Governance
- source_url: https://eur-lex.europa.eu/eli/reg/2026/1689
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 2
- evidence_role: foundation
- trust_level: official
- why_it_matters: Documents regulatory frameworks shaping AI safety.
- accessed_at: 2026-06-12
- related_topic: topic-b

## Key Facts
- EU AI Act creates risk-based compliance framework.
- OECD covers 38 member countries' governance approaches.

## Core Content Capture
Overview of international AI governance frameworks.

## Relevance To This Research
Foundation for topic-b investigation.

## Quotable Terms / Concepts
- "Policies assume oversight capabilities that don't yet exist at scale"

## Risks And Limitations
- Rapidly evolving regulatory landscape; documents may become outdated.
EOF

cat > $B/reference/00-shared-technical-alignment.md << 'EOF'
# Technical Alignment Methods
- source_url: https://arxiv.org/abs/2603.67890
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 2
- evidence_role: foundation
- trust_level: academic
- why_it_matters: Surveys empirical progress in alignment techniques.
- accessed_at: 2026-06-17
- related_topic: topic-c

## Key Facts
- Scalable oversight approaches include debate, RRM, and iterated amplification.
- Mechanistic interpretability tools include SAEs, probing, and activation patching.

## Core Content Capture
Survey of technical alignment methods and their empirical progress.

## Relevance To This Research
Foundation for topic-c investigation.

## Quotable Terms / Concepts
- "Scalability to frontier models remains an open challenge"

## Risks And Limitations
- Field is rapidly evolving; empirical results may be superseded.
EOF

# Pre-seed Wave1: evidence-summary + question-list for 3 topics
for slug in topic-a topic-b topic-c; do
  mkdir -p $B/artifacts/wave1/$slug
  cat > $B/artifacts/wave1/$slug/evidence-summary.md << EVIDEOF
## Key Findings
1. $slug research shows growing convergence between technical and policy dimensions [Source](https://example.com/${slug})
2. Multi-stakeholder coordination is critical for effective governance.
EVIDEOF
  cat > $B/artifacts/wave1/$slug/question-list.md << QLEOF
## Topic Investigation Targets
1. What is the current state of ${slug}?
## Question Reconciliation
Resolved Q1 with Wave0 evidence.
## Emergent Question Protocol
None.
## Exploration / Exploitation Decision
Proceed to Wave2.
QLEOF
done

# Write reference/{topic}-*.md for each topic (wave1 gate count_floor)
for slug in topic-a topic-b topic-c; do
  cat > $B/reference/${slug}-deepening.md << REFFILE
# Deepening: $slug
- source_url: https://example.com/${slug}-deep
- acceptance_status: accepted
- source_type: primary
- tier: Tier 2
- evidence_role: primary_topic_reference
- trust_level: academic
- why_it_matters: Deepening evidence for ${slug}.
- accessed_at: 2026-06-26
- related_topic: ${slug}

## Key Facts
- Key finding for ${slug}.
## Core Content Capture
Deepening analysis for ${slug}.
## Relevance To This Research
Directly supports ${slug} investigation.
## Quotable Terms / Concepts
- "Key insight"
## Risks And Limitations
- Single source.
REFFILE
done

# Pre-seed seed_topics for 3 topics
mkdir -p $B/seed_topics
for slug in topic-a topic-b topic-c; do
  id=$(echo $slug | sed 's/topic-/t/')
  num=$(echo $slug | sed 's/topic-//' | cut -c1)
  cat > $B/seed_topics/$slug.md << SEEDEOF
---
id: $id
slug: $slug
title: Topic $num
---
# Topic $num
## Key Dimensions
- Dimension 1
## Known Premises
- Premise 1
## Open Questions
- Question 1
SEEDEOF
done

# Pre-seed cross-topic-ledger.md + finding-index.yaml
mkdir -p $B/artifacts/wave2
cat > $B/artifacts/wave2/cross-topic-ledger.md << 'EOF'
## Cross-Topic Scan Matrix
| Topic Pair | Signal | Strength |
|-----------|--------|----------|
| a↔b | Technical-policy convergence | Strong |
| a↔c | Measurement as cross-cutting challenge | Strong |
| b↔c | Regulatory-technical gap | Moderate |
## Wave1 Legacy Questions
- How mature is empirical evidence?
- How effective are enforcement mechanisms?
## Cross-Topic Resolutions
W2F-001: Technical-policy convergence confirmed across all three topics.
W2F-002: Measurement is the central cross-cutting challenge.
## Emergent Cross-Topic Questions
W2F-003: Coordination gap between industry, academia, and policy.
## Exploration Decisions
W2F-003 → defer to post-foundation exploration.
## HITL2 Handoff
Foundation phase complete. W2F-003 flagged for human review.
EOF

cat > $B/artifacts/wave2/finding-index.yaml << 'EOF'
- finding_id: W2F-001
  category: cross_topic_resolution
  statement: "Technical-policy convergence confirmed across all three topics."
  sources: ["../wave0/topic-a/source.yaml", "../wave0/topic-b/source.yaml"]
  confidence: high
  decision: use_existing_evidence
- finding_id: W2F-002
  category: cross_topic_resolution
  statement: "Measurement is the central cross-cutting challenge."
  sources: ["../wave0/topic-c/source.yaml"]
  confidence: high
  decision: use_existing_evidence
- finding_id: W2F-003
  category: emergent
  statement: "Coordination gap between industry, academia, and policy."
  sources: []
  confidence: medium
  decision: defer_to_hitl2
EOF


echo "=== Artifact tree ==="
find $B/reference $B/artifacts -type f | sort
```

预期：bundle 创建，3 个 topic 的 Wave0/Wave1 全部就位。

---

## Step 2: Wave0 Reference Metadata Table

以下是从 `reference/_INDEX.md` 和 `artifacts/wave0/*/source.yaml` 提取的 reference metadata：

| # | Topic | URL | Title | Retrieved Date |
|---|-------|-----|-------|---------------|
| 1 | topic-a | arxiv.org/abs/2601.12345 | AI Safety Landscape Review | 2026-06-15 |
| 2 | topic-a | alignmentforum.org | Taxonomy of Alignment Approaches | 2026-06-16 |
| 3 | topic-b | eur-lex.europa.eu | EU AI Act Implementation | 2026-06-12 |
| 4 | topic-b | oecd.org | OECD AI Policy Observatory | 2026-06-14 |
| 5 | topic-c | arxiv.org/abs/2603.67890 | Scalable Oversight Survey | 2026-06-17 |
| 6 | topic-c | distill.pub | Mechanistic Interpretability Survey | 2026-06-18 |

---

## Step 3: Wave1 Evidence Summary

每个 topic 有 evidence-summary.md + question-list.md（4-section），在 `artifacts/wave1/<topic>/`。

```bash
echo "=== Wave1 per-topic artifacts ==="
for slug in topic-a topic-b topic-c; do
  echo "--- $slug ---"
  echo "  evidence-summary.md: $(head -1 $B/artifacts/wave1/$slug/evidence-summary.md 2>/dev/null || echo missing)"
  echo "  question-list.md: $(grep -c '##' $B/artifacts/wave1/$slug/question-list.md 2>/dev/null || echo 0) sections"
done
```

---

## Step 4: 写入 cross-topic synthesis + 展示全文

```bash
cat > $B/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis: AI Safety Research Landscape

W2F-001 identifies technical-policy convergence as the dominant pattern.
W2F-002 confirms measurement is the central cross-cutting challenge.
W2F-003 flags the coordination gap for HITL2 review.

## Pattern 1: Technical-Policy Convergence

Based on the [topic-a evidence](../wave1/topic-a/evidence-summary.md) and
[topic-b sources](../wave0/topic-b/source.yaml), regulatory frameworks
are evolving faster than technical oversight capabilities.

The [topic-c evidence](../wave1/topic-c/evidence-summary.md) confirms that
scalable oversight methods are maturing but not yet deployment-ready.

## Pattern 2: Measurement as Cross-Cutting Challenge

All three topics converge on measurement, as documented in:
- [topic-a question list](../wave1/topic-a/question-list.md)
- [topic-b question list](../wave1/topic-b/question-list.md)
- [topic-c question list](../wave1/topic-c/question-list.md)

## Pattern 3: Coordination Gap

The [topic-a source YAML](../wave0/topic-a/source.yaml) taxonomy maps
cleanly across dimensions, but evidence reveals a gap: no existing
mechanism bridges all three stakeholder groups simultaneously.

## Gaps and Future Work

Foundation phase has identified cross-cutting patterns but has not quantified
the technical-policy gap or evaluated coordination mechanisms. These are
deferred to post-foundation exploration.
ENDOFSYN

echo "=== Synthesis Content ==="
cat $B/artifacts/wave2/synthesis.md
```

---

## Step 5: 运行 wave2-complete gate → pass

```bash

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md)
echo "$GATE_OUTPUT"

PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "gate: wave2-complete | passed: $PASSED"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,detail:'review surface: 3-topic synthesis with valid references'})})"
```

预期：`check.passed: true`。

---

## Step 6: Human Review Checklist

- [ ] Reference URLs point to real, credible sources?
- [ ] Reference titles accurately describe content?
- [ ] Retrieved dates consistent with research timeline?
- [ ] All Markdown links in synthesis point to correct artifact files?
- [ ] Synthesis claims follow logically from cited Wave0/Wave1 artifacts?
- [ ] "Gaps and Future Work" section honest about what foundation phase did NOT cover?

---

## Step 7: 从 trace 裁决

```bash
echo "=== Trace ==="
cat $B/rb_trace.jsonl | while read line; do
  echo "$line" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);if(j.gate){const icon=j.passed?'\x1b[32mPASS\x1b[0m':'\x1b[31mFAIL\x1b[0m';console.log(icon,j.gate,'|',j.detail)}})"
done

echo ""
echo "=== Verdict ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/rb_trace.jsonl')})"
```


## Step 8: Cleanup

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
