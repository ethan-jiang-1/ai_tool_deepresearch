---
schema: command-experiment/v1
experiment: wff-wave-chain
case: case-151-standard-waves-full-chain
weight: light
case_goal: "Prove that the full seed-topics→wave0→wave1→wave2 chain can be serialized: 4 gates pass sequentially on a single topic bundle with correct artifacts and status transitions."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-151_wf_chain_*
trace: dpt_disp_case-151_wf_chain_*/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-151-standard-waves-full-chain

## Expected Runtime Path

1. 创建 disposable bundle + 写入 1-topic registry + 设置 seed-topics status
2. 物化 seed_topics → gate seed-topics-ready pass
3. 推进到 wave0 status + 写 reference artifacts → gate wave0-complete pass
4. 推进到 wave1 status + 写 deepening artifacts → gate wave1-complete pass
5. 推进到 wave2 status + 写 synthesis artifacts → gate wave2-complete pass
6. 从 `_logs/_trace.jsonl` 裁决（预期 4 条 check 全部 pass）
7. Cleanup

---

## Case Goal

证明 seed-topics → wave0 → wave1 → wave2 全链路可顺序串联：4 个 gate 在同一个 bundle 上依次 pass，每个 gate 的 `check.next` 指向下一 phase，status 推进正确，trace 完整。

---

## Step 1: 创建 bundle + 写入 topic_registry + 设置 seed-topics status

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wf_chain --case case-151 --force)
echo "Bundle: $B"

# Validate initial structure
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Write topic_registry (1 topic, YAML frontmatter)
cat > $B/rb_plan.md << 'EOF'
---
plan_basename: wf_chain
derived_topic_count: 1
topic_registry:
  - id: t1
    slug: topic-a
    title: AI Safety Landscape
---
# wf_chain Plan
EOF

# Set status to seed-topics
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "seed_topics_ready",
  "next_gate": "wave0_complete"
}
EOF

echo "=== Plan ==="
head -12 $B/rb_plan.md
echo "=== Status ==="
cat $B/rb_status.json
```

预期：bundle 创建成功，registry 含 1 topic，status 指向 `seed_topics_ready`→`wave0_complete`。

## Step 2: 物化 seed_topics → gate seed-topics-ready pass

```bash
mkdir -p $B/seed_topics

cat > $B/seed_topics/topic-a.md << 'EOF'
---
id: t1
slug: topic-a
title: AI Safety Landscape
---

# AI Safety Landscape

## 关键维度
- 技术对齐（Technical Alignment）
- 政策治理（Policy Governance）
- 社会影响（Societal Impact）

## 已知前提
- AI safety 是活跃的研究领域
- 多方利益相关者参与（政府、产业、学术界）

## Open Questions
- 各维度之间的权衡是什么？
- 新兴治理框架的效果如何评估？
EOF

# Record trace event

echo "=== seed_topics/ ==="
ls -la $B/seed_topics/

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "gate: seed-topics-ready | passed: $PASSED | next: $NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'seed-topics-ready',passed:$PASSED,detail:'seed topics materialized — advancing to wave0'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-wave0.md`。

## Step 3: 推进到 wave0 + 写 reference artifacts → gate wave0-complete pass

```bash
# Advance status to wave0
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave0_complete",
  "next_gate": "wave1_complete"
}
EOF

# Create wave0 thin YAML directory
mkdir -p $B/artifacts/wave0/topic-a

# Write _INDEX.md (8-column canonical inventory)
cat > $B/reference/_INDEX.md << 'EOF'
# Reference Index
| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 00-shared-ai-safety-landscape.md | secondary | practitioner | Tier 2 | topic-a | wave0_foundation | accepted | 2026-06-15 |
EOF

# Write README.md
cat > $B/reference/README.md << 'EOF'
# Reference Evidence
Flat reference directory. Naming: 00-shared-*.md / 0N-*.md / 00-cross-*.md.
See _INDEX.md for canonical inventory.
EOF

# Write 00-shared-*.md (rich MD with metadata + 5 sections)
cat > $B/reference/00-shared-ai-safety-landscape.md << 'EOF'
# AI Safety Landscape: 2026 Overview
- source_url: https://example.com/ai-safety-landscape-2026
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 2
- evidence_role: foundation
- trust_level: practitioner
- why_it_matters: Comprehensive overview of major AI safety research directions.
- accessed_at: 2026-06-15
- related_topic: topic-a

## Key Facts
- AI safety research spans technical, policy, and societal dimensions.
- Multiple stakeholder groups are involved: government, industry, academia.

## Core Content Capture
Comprehensive overview of the AI safety landscape covering technical alignment, policy governance, and societal impact.

## Relevance To This Research
Provides the shared foundation for AI safety landscape investigation.

## Quotable Terms / Concepts
- "AI safety requires coordinated action across technical, policy, and societal dimensions"

## Risks And Limitations
- Overview level; lacks depth on individual dimensions.
EOF

# Write thin YAML per topic
cat > $B/artifacts/wave0/topic-a/source.yaml << 'EOF'
- url: "https://example.com/ai-safety-landscape-2026"
  title: "AI Safety Landscape: 2026 Overview"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
  notes: "Comprehensive overview of major AI safety research directions"
- url: "https://example.com/alignment-governance"
  title: "Alignment and Governance: Bridging the Gap"
  retrieved_date: "2026-06-16"
  topic_tag: "topic-a"
  notes: "Covers the intersection of technical alignment and policy governance"
EOF

# Record trace event

echo "=== Reference artifacts ==="
find $B/reference $B/artifacts/wave0 -type f | sort

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "gate: wave0-complete | passed: $PASSED | next: $NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,detail:'reference metadata collected — advancing to wave1'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-wave1.md`。

## Step 4: 推进到 wave1 + 写 deepening artifacts → gate wave1-complete pass

```bash
# Advance status to wave1
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave1_complete",
  "next_gate": "wave2_complete"
}
EOF

# Create wave1 directory
mkdir -p $B/artifacts/wave1/topic-a

# Write evidence-summary.md
cat > $B/artifacts/wave1/topic-a/evidence-summary.md << 'EOF'
## Key Findings
1. Technical alignment research shows growing convergence with policy governance [Source](https://example.com/alignment-governance)
2. The 2026 landscape indicates increased regulatory activity across jurisdictions.
3. Multi-stakeholder coordination is emerging as a key success factor.
EOF

# Write question-list.md with all 4 sections
cat > $B/artifacts/wave1/topic-a/question-list.md << 'EOF'
## Topic Investigation Targets
1. Which alignment approaches show the most empirical progress in 2025-2026?
2. How are regulatory frameworks adapting to rapid capability advances?

## Question Reconciliation
Q1 resolved: Technical alignment and policy governance are converging per Wave0 evidence.

## Emergent Question Protocol
None at foundation stage.

## Exploration / Exploitation Decision
Proceed to Wave2 — foundation evidence is sufficient for cross-topic synthesis.
EOF

# Write reference/{topic}-*.md (topic-prefixed rich MD, count_floor requirement)
cat > $B/reference/topic-a-deepening-source.md << 'EOF'
# Deepening Source: Alignment and Governance
- source_url: https://example.com/alignment-governance
- acceptance_status: accepted
- source_type: primary
- tier: Tier 2
- evidence_role: primary_topic_reference
- trust_level: academic
- why_it_matters: Provides empirical evidence on technical-policy convergence.
- accessed_at: 2026-06-26
- related_topic: topic-a

## Key Facts
- Study shows 40% increase in cross-disciplinary AI safety papers in 2025-2026.
- Regulatory frameworks are adapting but lag behind capability advances.

## Core Content Capture
Empirical analysis of the intersection between technical alignment research and policy governance.

## Relevance To This Research
Directly supports the key investigation target about alignment-governance convergence.

## Quotable Terms / Concepts
- "The alignment-governance gap is narrowing but remains significant"

## Risks And Limitations
- Single study; limited jurisdictional scope (EU/US focused).
EOF

# Record trace event

echo "=== Wave1 artifacts ==="
find $B/artifacts/wave1 $B/reference/topic-a-* -type f | sort

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B --current-node phases/phase-wave1.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "gate: wave1-complete | passed: $PASSED | next: $NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'wave1-complete',passed:$PASSED,detail:'deepening artifacts complete — advancing to wave2'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-wave2.md`。

## Step 5: 推进到 wave2 + 写 synthesis artifacts → gate wave2-complete pass

```bash
# Advance status to wave2
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave2_complete",
  "next_gate": "hitl2_recorded"
}
EOF

# Create wave2 directory
mkdir -p $B/artifacts/wave2

# Write synthesis.md with W2F-xxx refs + valid cross-artifact links
cat > $B/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis: AI Safety Landscape

W2F-001 identifies a key convergence pattern between technical alignment and policy governance.

## Pattern 1: Technical-Policy Convergence

Based on the [evidence summary](../wave1/topic-a/evidence-summary.md), technical alignment
research and policy governance are increasingly converging. The [thin YAML](../wave0/topic-a/source.yaml)
from Wave0 confirms this with two foundational sources.

## Pattern 2: Multi-Stakeholder Dynamics

The [question list](../wave1/topic-a/question-list.md) identifies regulatory adaptation as
a key investigation target. W2F-002 notes that multi-stakeholder coordination is emerging
as a critical success factor.

## Gaps and Future Work

W2F-003: Quantifying the relative impact of each dimension requires deeper investigation
beyond foundation phase scope.
ENDOFSYN

# Write cross-topic-ledger.md with all 6 sections
cat > $B/artifacts/wave2/cross-topic-ledger.md << 'EOF'
## Cross-Topic Scan Matrix
| Dimension | Wave0 Source | Wave1 Finding | Cross Signal |
|-----------|-------------|---------------|--------------|
| Technical-Policy | 2 sources | Convergence confirmed | Strong |

## Wave1 Legacy Questions
- Which alignment approaches show most empirical progress? (partially resolved)

## Cross-Topic Resolutions
W2F-001: Technical-policy convergence is confirmed across Wave0 and Wave1 evidence.
W2F-002: Multi-stakeholder coordination is a recurring pattern.

## Emergent Cross-Topic Questions
W2F-003: How to quantify relative impact of each dimension?

## Exploration Decisions
W2F-003 → defer to post-foundation exploration.

## HITL2 Handoff
Foundation phase complete. W2F-003 flagged for human review at HITL2.
EOF

# Write finding-index.yaml
cat > $B/artifacts/wave2/finding-index.yaml << 'EOF'
- finding_id: W2F-001
  category: cross_topic_resolution
  statement: "Technical-policy convergence is confirmed across Wave0 and Wave1 evidence."
  sources: ["../wave0/topic-a/source.yaml", "../wave1/topic-a/evidence-summary.md"]
  confidence: high
  decision: use_existing_evidence
- finding_id: W2F-002
  category: cross_topic_resolution
  statement: "Multi-stakeholder coordination is a recurring pattern."
  sources: ["../wave0/topic-a/source.yaml"]
  confidence: medium
  decision: use_existing_evidence
- finding_id: W2F-003
  category: emergent
  statement: "How to quantify relative impact of each dimension?"
  sources: []
  confidence: low
  decision: defer_to_hitl2
EOF

# Record trace event

echo "=== Wave2 artifacts ==="
find $B/artifacts/wave2 -type f | sort

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "gate: wave2-complete | passed: $PASSED | next: $NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,detail:'cross-topic synthesis complete — advancing to hitl2'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-hitl2.md`。全链路 4 gate 全部 pass。

## Step 6: 从 trace 裁决

预期 4 条 `check` event 全部 `passed: true`。

```bash
echo "=== Trace events ==="
cat $B/_logs/_trace.jsonl | while read line; do
  echo "$line" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);const icon=j.passed?'\x1b[32mPASS\x1b[0m':'\x1b[31mFAIL\x1b[0m';console.log(icon,j.gate,'|',j.detail)})"
done

echo ""
echo "=== Verdict ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_logs/_trace.jsonl')})"
```


## Step 7: 结果解读

> 4 个 check，验证 seed-topics→wave0→wave1→wave2 四 gate 顺序 pass。
>   全部 expected:true → 4/4 PASS 即通过。

## Step 8: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
