---
schema: command-experiment/v1
experiment: wff-wave-chain
case: case-128-standard-wave-review-surface
weight: light
case_goal: "Prove that the Wave0→Wave1→Wave2 review surface is visible in Markdown — reference metadata, skeleton summaries, cross-topic synthesis, and human review checklist are all readable without reading JS."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-128_w2_review_*
trace: dpt_disp_case-128_w2_review_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。所有审查内容在 Markdown 正文中；thin driver 只做 bundle 创建、fixture 写入、gate 调用、trace 记录。不依赖 live AI generation。

# case-128-standard-wave-review-surface

## Expected Runtime Path

1. 创建 disposable bundle + pre-seed 完整 Wave0/Wave1 artifacts（3 topics）
2. 展示 Wave0 Reference Metadata Table（url, title, retrieved_date, topic_tag）
3. 展示 Wave1 Skeleton Summary（per-topic key dimensions and open questions）
4. 写入 fixed cross-topic synthesis（含 valid Markdown links），展示合成全文
5. 运行 wave2-complete gate → pass，展示 inspect 输出
6. 展示 Human Review Checklist（语义维度：reference 真实性、引用准确性、placeholder 清晰度、cross-topic pattern 质量）
7. 从 trace 裁决 + cleanup

---

## Case Goal

证明 review surface 的完整性：
1. **Reference metadata 可审**：url/title/retrieved_date/topic_tag 在 Markdown 表中摊开，人类 reviewer 可判断 reference 是否真实、是否 credible
2. **Skeleton 可读**：每个 topic 的关键维度和 open questions 可见
3. **Synthesis 可追溯**：合成全文 + 引用链表，每条 claim 都能追溯到 Wave0/Wave1 artifact
4. **Human checklist 覆盖语义维度**：gate 查不到的东西（reference 真实性、citation 准确性、pattern 质量）由人类判断

所有内容在 playbook Markdown 正文中，不依赖 JS 渲染或 live AI。

---

## Step 1: 创建 bundle + pre-seed Wave0/Wave1 artifacts（3 topics）

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs w2_review --case case-128 --force)
echo "Bundle: $B"

# Validate
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# Set wave2 status
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave2_complete",
  "next_gate": "hitl2_recorded"
}
EOF

# Pre-seed Wave0: reference metadata for 3 topics
mkdir -p $B/reference/topic-a $B/reference/topic-b $B/reference/topic-c

cat > $B/reference/index.md << 'EOF'
# Reference Index
- topic-a (AI Safety): 2 refs — landscape overview + alignment taxonomy
- topic-b (AI Policy): 2 refs — EU AI Act + international governance
- topic-c (Technical Alignment): 2 refs — scalable oversight + interpretability survey
EOF

cat > $B/reference/topic-a/source.yaml << 'EOF'
- url: "https://arxiv.org/abs/2601.12345"
  title: "AI Safety Landscape: A Systematic Review of Research Directions in 2025-2026"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
  notes: "Comprehensive taxonomy: technical alignment, policy governance, societal impact"
- url: "https://www.alignmentforum.org/posts/2026/survey"
  title: "Taxonomy of Alignment Approaches: From RLHF to Constitutional AI"
  retrieved_date: "2026-06-16"
  topic_tag: "topic-a"
EOF

cat > $B/reference/topic-b/source.yaml << 'EOF'
- url: "https://eur-lex.europa.eu/eli/reg/2026/1689"
  title: "EU AI Act: Implementation Guidelines and Compliance Framework"
  retrieved_date: "2026-06-12"
  topic_tag: "topic-b"
  notes: "Covers risk categories, conformity assessments, and enforcement mechanisms"
- url: "https://www.oecd.org/digital/ai-policy-observatory-2026"
  title: "OECD AI Policy Observatory: International Governance Coordination Report"
  retrieved_date: "2026-06-14"
  topic_tag: "topic-b"
  notes: "Comparative analysis of AI governance frameworks across 38 member countries"
EOF

cat > $B/reference/topic-c/source.yaml << 'EOF'
- url: "https://arxiv.org/abs/2603.67890"
  title: "Scalable Oversight: Empirical Progress and Open Challenges"
  retrieved_date: "2026-06-17"
  topic_tag: "topic-c"
  notes: "Reviews debate, recursive reward modeling, and iterated amplification results"
- url: "https://distill.pub/2026/interpretability-mechanistic"
  title: "Mechanistic Interpretability: A Practical Survey of Tools and Methods"
  retrieved_date: "2026-06-18"
  topic_tag: "topic-c"
  notes: "Covers sparse autoencoders, probing classifiers, and activation patching"
EOF

# Pre-seed Wave1: skeleton artifacts for 3 topics
mkdir -p $B/artifacts/wave1/topic-a $B/artifacts/wave1/topic-b $B/artifacts/wave1/topic-c

cat > $B/artifacts/wave1/topic-a/skeleton.md << 'ENDOFSKEL'
---
slug: topic-a
title: AI Safety Landscape Skeleton
capability: foundation-placeholder
---

# AI Safety Landscape: Foundation Skeleton

## Key Dimensions
- Technical alignment research maturity
- Policy governance landscape
- Multi-stakeholder coordination

## Open Questions
- How mature is the empirical evidence base for each alignment approach?
- What are the key points of friction between technical and policy communities?
- Which organizations are driving the most impactful safety research?

## References
- [AI Safety Landscape Review](../../reference/topic-a/source.yaml)
- [Alignment Taxonomy](../../reference/topic-a/source.yaml)
ENDOFSKEL

cat > $B/artifacts/wave1/topic-b/skeleton.md << 'ENDOFSKEL'
---
slug: topic-b
title: AI Policy Governance Skeleton
capability: foundation-placeholder
---

# AI Policy Governance: Foundation Skeleton

## Key Dimensions
- EU AI Act implementation timeline
- International governance coordination mechanisms
- Enforcement and compliance challenges

## Open Questions
- How effective are current enforcement mechanisms?
- What gaps exist between regulatory frameworks and technical capability advances?
- How do different jurisdictions coordinate on cross-border AI risks?

## References
- [EU AI Act Implementation](../../reference/topic-b/source.yaml)
- [OECD Policy Observatory](../../reference/topic-b/source.yaml)
ENDOFSKEL

cat > $B/artifacts/wave1/topic-c/skeleton.md << 'ENDOFSKEL'
---
slug: topic-c
title: Technical Alignment Methods Skeleton
capability: foundation-placeholder
---

# Technical Alignment Methods: Foundation Skeleton

## Key Dimensions
- Scalable oversight approaches
- Mechanistic interpretability tools
- Robustness and adversarial testing

## Open Questions
- Which interpretability methods scale to frontier models?
- How do we measure alignment progress quantitatively?
- What are the most promising directions for scalable oversight?

## References
- [Scalable Oversight Survey](../../reference/topic-c/source.yaml)
- [Mechanistic Interpretability Survey](../../reference/topic-c/source.yaml)
ENDOFSKEL

# Record trace events for wave0 and wave1 completion (pre-seeded)
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave0_completion"}' >> $B/rb_trace.jsonl
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave1_completion"}' >> $B/rb_trace.jsonl

echo "=== Artifact tree ==="
find $B/reference $B/artifacts -type f | sort
```

预期：bundle 创建，3 个 topic 的 Wave0 reference 和 Wave1 skeleton 全部就位。

---

## Step 2: Wave0 Reference Metadata Table

以下是从 `reference/*/source.yaml` 提取的 reference metadata，供人类 reviewer 审查 reference 的真实性和质量。

| # | Topic | URL | Title | Retrieved Date | Notes |
|---|-------|-----|-------|---------------|-------|
| 1 | topic-a (AI Safety) | `https://arxiv.org/abs/2601.12345` | AI Safety Landscape: A Systematic Review of Research Directions in 2025-2026 | 2026-06-15 | Comprehensive taxonomy: technical alignment, policy governance, societal impact |
| 2 | topic-a (AI Safety) | `https://www.alignmentforum.org/posts/2026/survey` | Taxonomy of Alignment Approaches: From RLHF to Constitutional AI | 2026-06-16 | — |
| 3 | topic-b (AI Policy) | `https://eur-lex.europa.eu/eli/reg/2026/1689` | EU AI Act: Implementation Guidelines and Compliance Framework | 2026-06-12 | Covers risk categories, conformity assessments, and enforcement mechanisms |
| 4 | topic-b (AI Policy) | `https://www.oecd.org/digital/ai-policy-observatory-2026` | OECD AI Policy Observatory: International Governance Coordination Report | 2026-06-14 | Comparative analysis of AI governance frameworks across 38 member countries |
| 5 | topic-c (Technical) | `https://arxiv.org/abs/2603.67890` | Scalable Oversight: Empirical Progress and Open Challenges | 2026-06-17 | Reviews debate, recursive reward modeling, and iterated amplification results |
| 6 | topic-c (Technical) | `https://distill.pub/2026/interpretability-mechanistic` | Mechanistic Interpretability: A Practical Survey of Tools and Methods | 2026-06-18 | Covers sparse autoencoders, probing classifiers, and activation patching |

> **Reviewer 注意**：以上 URL 均为 example/illustrative domains（`arxiv.org`, `alignmentforum.org`, `eur-lex.europa.eu`, `oecd.org`, `distill.pub`），在实际 research run 中应由 Agent 从真实搜索结果填入。当前 playbook 使用固定 URL 演示 review surface 的结构——真实运行时的 URL 应指向实际检索到的网页/论文。

---

## Step 3: Wave1 Skeleton Summary

以下是从 `artifacts/wave1/*/skeleton.md` 提取的 per-topic skeleton 摘要。

| Topic | Key Dimensions | Open Questions Count | Placeholder Marker |
|-------|---------------|---------------------|-------------------|
| topic-a (AI Safety) | Technical alignment maturity, Policy governance landscape, Multi-stakeholder coordination | 3 | `foundation-placeholder` ✓ |
| topic-b (AI Policy) | EU AI Act timeline, International coordination, Enforcement challenges | 3 | `foundation-placeholder` ✓ |
| topic-c (Technical) | Scalable oversight, Mechanistic interpretability, Robustness testing | 3 | `foundation-placeholder` ✓ |

所有 skeleton 均通过 `pattern_match` 检测（含 `capability: foundation-placeholder`），不含 false completion claims。

---

## Step 4: 写入 fixed cross-topic synthesis + 展示全文

以下是固定 synthesis（不依赖 live AI），从 3 个 topic 的 Wave0/Wave1 artifact 推导 cross-topic patterns。

```bash
mkdir -p $B/artifacts/wave2

cat > $B/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis: AI Safety Research Landscape

## Pattern 1: Technical-Policy Convergence

The [AI Safety Landscape skeleton](../wave1/topic-a/skeleton.md) identifies
multi-stakeholder coordination as a key dimension. The [EU AI Act implementation
guide](../../reference/topic-b/source.yaml) provides the regulatory framework,
while the [OECD Policy Observatory report](../../reference/topic-b/source.yaml)
documents how 38 countries are coordinating. Meanwhile, the [scalable oversight
survey](../../reference/topic-c/source.yaml) shows that technical methods
(debate, RRM, iterated amplification) are maturing but not yet deployment-ready.

**Synthesis claim**: The gap between regulatory readiness (Wave0/Wave1 topic-b)
and technical maturity (Wave0/Wave1 topic-c) is the central tension in AI safety
governance. Policies assume oversight capabilities that don't yet exist at scale.

## Pattern 2: Measurement as Cross-Cutting Challenge

All three topics converge on measurement:
- [topic-a skeleton](../wave1/topic-a/skeleton.md) asks "How mature is the
  empirical evidence base?"
- [topic-b skeleton](../wave1/topic-b/skeleton.md) asks "How effective are
  current enforcement mechanisms?"
- [topic-c skeleton](../wave1/topic-c/skeleton.md) asks "How do we measure
  alignment progress quantitatively?"

The [mechanistic interpretability survey](../../reference/topic-c/source.yaml)
offers tools (SAEs, probing, activation patching) that could serve as the
measurement substrate, but their scalability to frontier models remains an
[open question identified in the Wave1 skeleton](../wave1/topic-c/skeleton.md).

## Pattern 3: Coordination Gap

The [AI Safety Landscape review](../../reference/topic-a/source.yaml) taxonomy
(technical/policy/societal) maps cleanly onto the three topics, but the
skeletons reveal a gap: no existing coordination mechanism bridges all three.
The [OECD report](../../reference/topic-b/source.yaml) focuses on
government-to-government coordination; the [alignment taxonomy](
../../reference/topic-a/source.yaml) focuses on technical communities. Neither
addresses the industry-academia-policy triangle directly.

## Gaps and Future Work

Foundation phase has identified three cross-cutting patterns but has not:
- Quantified the technical-policy gap with empirical data
- Assessed specific measurement proposals against frontier model requirements
- Evaluated existing coordination mechanisms for multi-stakeholder effectiveness

These gaps are expected to be addressed in future expansion waves.
ENDOFSYN

echo "=== Synthesis Content ==="
cat $B/artifacts/wave2/synthesis.md
```

### Reference Chain Table

以下是从 synthesis 中解析出的所有 Markdown links 及其解析状态：

| Link Text | Target Path | Resolved To | Exists |
|-----------|-------------|-------------|--------|
| AI Safety Landscape skeleton | `../wave1/topic-a/skeleton.md` | `artifacts/wave1/topic-a/skeleton.md` | ✓ |
| EU AI Act implementation guide | `../../reference/topic-b/source.yaml` | `reference/topic-b/source.yaml` | ✓ |
| OECD Policy Observatory report | `../../reference/topic-b/source.yaml` | `reference/topic-b/source.yaml` | ✓ |
| scalable oversight survey | `../../reference/topic-c/source.yaml` | `reference/topic-c/source.yaml` | ✓ |
| topic-a skeleton | `../wave1/topic-a/skeleton.md` | `artifacts/wave1/topic-a/skeleton.md` | ✓ |
| topic-b skeleton | `../wave1/topic-b/skeleton.md` | `artifacts/wave1/topic-b/skeleton.md` | ✓ |
| topic-c skeleton | `../wave1/topic-c/skeleton.md` | `artifacts/wave1/topic-c/skeleton.md` | ✓ |
| mechanistic interpretability survey | `../../reference/topic-c/source.yaml` | `reference/topic-c/source.yaml` | ✓ |
| open question identified in the Wave1 skeleton | `../wave1/topic-c/skeleton.md` | `artifacts/wave1/topic-c/skeleton.md` | ✓ |
| AI Safety Landscape review | `../../reference/topic-a/source.yaml` | `reference/topic-a/source.yaml` | ✓ |
| OECD report | `../../reference/topic-b/source.yaml` | `reference/topic-b/source.yaml` | ✓ |
| alignment taxonomy | `../../reference/topic-a/source.yaml` | `reference/topic-a/source.yaml` | ✓ |

> All 12 Markdown links resolve to existing files. `cross_field(markdown_link_resolution)` 应返回 `valid: 12`。

---

## Step 5: 运行 wave2-complete gate → pass

```bash
# Record trace event
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave2_completion"}' >> $B/rb_trace.jsonl

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md)
echo "$GATE_OUTPUT"

echo "=== Inspect (cross_field result) ==="
echo "$GATE_OUTPUT" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log('passed:',j.check.passed);console.log('next:',j.check.next);console.log('inspect:');j.inspect.forEach((x,i)=>console.log('  ['+i+']',x))})"

PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "gate: wave2-complete | passed: $PASSED | next: $NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,detail:'review surface: 3-topic cross-topic synthesis with 12 valid references'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-hitl2.md`。`cross_field` inspect 报告 `valid: 12`，`dead: 0`。

---

## Step 6: Human Review Checklist

> Reviewer 对照以上 Step 2-5 的内容，逐项判断。**这是 Wave2 synthesis 完成后、进入 HITL2 前的关键审查点。**

### Reference Authenticity

- [ ] Do reference URLs point to real, credible sources? (In a real run, not this playbook's example URLs)
- [ ] Do reference titles accurately describe the content at those URLs?
- [ ] Are retrieved dates consistent with the research timeline?
- [ ] Is there adequate coverage across topics? (≥1 reference per topic; 2 is better)

### Citation Accuracy

- [ ] Do all Markdown links in the synthesis point to the correct artifact files?
- [ ] Do the synthesis claims follow logically from the cited Wave0/Wave1 artifacts?
- [ ] Are there any claims that seem unsupported by the cited references?

### Placeholder Clarity

- [ ] Do all Wave1 skeletons clearly mark `capability: foundation-placeholder`?
- [ ] Are the "Gaps and Future Work" sections honest about what the foundation phase did NOT cover?
- [ ] Would a future expansion agent understand what work remains from reading these gaps?

### Cross-Topic Pattern Quality

- [ ] Are the identified cross-topic patterns genuine (supported by evidence from ≥2 topics)?
- [ ] Are any patterns forced or superficial ("A mentions X, B mentions X, therefore pattern")?
- [ ] Do the synthesis claims add value beyond restating individual topic findings?

### Gate-Detectable Issues (for cross-check)

- [ ] Are all 12 Markdown link targets confirmed to exist in the bundle?
- [ ] Does `rb_status.json` show `current_gate: wave2_complete` and `next_gate: hitl2_recorded`?

---

## Step 7: 从 trace 裁决

预期 1 条 `check` event，`passed: true`。

```bash
echo "=== Trace evidence ==="
cat $B/_trace.jsonl | while read line; do
  echo "$line" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);if(j.gate){const icon=j.passed?'\x1b[32mPASS\x1b[0m':'\x1b[31mFAIL\x1b[0m';console.log(icon,j.gate,'|',j.detail)}})"
done

echo ""
echo "=== Verdict ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_trace.jsonl')})"
```


## Step 8: 结果解读

> 验证 3-topic Wave0→Wave2 review surface：
>   每个 wave 的 artifact 在 Markdown 中可见 → human checklist 可用。

## Step 9: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```