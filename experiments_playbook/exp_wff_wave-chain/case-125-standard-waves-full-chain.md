---
schema: command-experiment/v1
experiment: wff-wave-chain
case: case-125-standard-waves-full-chain
weight: light
case_goal: "Prove that the full seed-topics→wave0→wave1→wave2 chain can be serialized: 4 gates pass sequentially on a single topic bundle with correct artifacts and status transitions."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-125_wf_chain_*
trace: dpt_disp_case-125_wf_chain_*/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-125-standard-waves-full-chain

## Expected Runtime Path

1. 创建 disposable bundle + 写入 1-topic registry + 设置 seed-topics status
2. 物化 seed_topics → gate seed-topics-ready pass
3. 推进到 wave0 status + 写 reference metadata → gate wave0-complete pass
4. 推进到 wave1 status + 写 skeleton → gate wave1-complete pass
5. 推进到 wave2 status + 写 synthesis → gate wave2-complete pass
6. 从 `_trace.jsonl` 裁决（预期 4 条 check 全部 pass）
7. Cleanup

---

## Case Goal

证明 seed-topics → wave0 → wave1 → wave2 全链路可顺序串联：4 个 gate 在同一个 bundle 上依次 pass，每个 gate 的 `check.next` 指向下一 phase，status 推进正确，trace 完整。

---

## Step 1: 创建 bundle + 写入 topic_registry + 设置 seed-topics status

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wf_chain --case case-125 --force)
echo "Bundle: $B"

# Validate initial structure
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B

# Write topic_registry (1 topic — full chain on simplest case)
cat > $B/rb_plan.md << 'EOF'
---
{
  "plan_basename": "wf_chain",
  "derived_topic_count": 1,
  "topic_registry": [
    { "id": "t1", "slug": "topic-a", "title": "AI Safety Landscape" }
  ]
}
---
EOF

# Set status to seed-topics (simulating setup gate already passed)
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
{"id": "t1", "slug": "topic-a", "title": "AI Safety Landscape"}
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
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"seed_topics_completion"}' >> $B/rb_trace.jsonl

echo "=== seed_topics/ ==="
ls -la $B/seed_topics/

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "gate: seed-topics-ready | passed: $PASSED | next: $NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'seed-topics-ready',passed:$PASSED,detail:'seed topics materialized — advancing to wave0'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-wave0.md`。

## Step 3: 推进到 wave0 + 写 reference metadata → gate wave0-complete pass

```bash
# Advance status to wave0 (read from gate output in Step 2)
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave0_complete",
  "next_gate": "wave1_complete"
}
EOF

# Create reference directory + write schema-valid metadata
mkdir -p $B/reference/topic-a

cat > $B/reference/index.md << 'EOF'
# Reference Index
- topic-a: 2 refs covering AI safety landscape
EOF

cat > $B/reference/topic-a/source.yaml << 'EOF'
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
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave0_completion"}' >> $B/rb_trace.jsonl

echo "=== Reference artifacts ==="
find $B/reference -type f | sort

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "gate: wave0-complete | passed: $PASSED | next: $NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,detail:'reference metadata collected — advancing to wave1'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-wave1.md`。

## Step 4: 推进到 wave1 + 写 skeleton → gate wave1-complete pass

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

# Create wave1 directory + write skeleton with placeholder marker
mkdir -p $B/artifacts/wave1/topic-a

cat > $B/artifacts/wave1/topic-a/skeleton.md << 'ENDOFSKEL'
---
slug: topic-a
title: AI Safety Landscape Skeleton
capability: foundation-placeholder
---

# AI Safety Landscape: Foundation Skeleton

## Known Premises
- AI safety research spans technical, policy, and societal dimensions.
- The 2026 landscape shows growing convergence between alignment research and governance frameworks.

## Key Dimensions
- **Technical Alignment**: scalable oversight, interpretability, robustness
- **Policy Governance**: EU AI Act implementation, US executive orders, international coordination
- **Societal Impact**: labor displacement, misinformation, concentration of power

## Open Questions
- Which alignment approaches show the most empirical progress in 2025-2026?
- How are regulatory frameworks adapting to rapid capability advances?
- What metrics exist for measuring societal impact?

## References
- [AI Safety Landscape Overview](../../reference/topic-a/source.yaml)
ENDOFSKEL

# Record trace event
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave1_completion"}' >> $B/rb_trace.jsonl

echo "=== Skeleton ==="
head -8 $B/artifacts/wave1/topic-a/skeleton.md

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle $B --current-node phases/phase-wave1.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "gate: wave1-complete | passed: $PASSED | next: $NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave1-complete',passed:$PASSED,detail:'skeleton with placeholder marker — advancing to wave2'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-wave2.md`。

## Step 5: 推进到 wave2 + 写 synthesis → gate wave2-complete pass

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

# Create wave2 directory + write synthesis with valid cross-artifact Markdown links
mkdir -p $B/artifacts/wave2

cat > $B/artifacts/wave2/synthesis.md << 'ENDOFSYN'
# Cross-Topic Synthesis: AI Safety Landscape

## Pattern 1: Technical-Policy Convergence

The [AI Safety Landscape skeleton](../wave1/topic-a/skeleton.md) identifies a key
trend: technical alignment research and policy governance are increasingly converging.
The [reference metadata](../../reference/topic-a/source.yaml) from Wave0 confirms
that "Alignment and Governance: Bridging the Gap" is a recognized research area.

## Pattern 2: Multi-Stakeholder Dynamics

Wave0 reference notes multiple stakeholder groups (government, industry, academia).
The Wave1 skeleton expands this into three dimensions (technical, policy, societal),
suggesting that effective AI safety requires coordinated action across all three.

## Gaps and Future Work

The foundation phase has identified these dimensions but has not yet:
- Quantified the relative impact of each dimension
- Assessed the effectiveness of specific interventions
- Evaluated cross-dimension trade-offs

These gaps are expected to be addressed in future expansion waves
(subagent-based deepening, candidate intake, fan-in review).
ENDOFSYN

# Record trace event
echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave2_completion"}' >> $B/rb_trace.jsonl

echo "=== Synthesis ==="
cat $B/artifacts/wave2/synthesis.md

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle $B --current-node phases/phase-wave2.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "gate: wave2-complete | passed: $PASSED | next: $NEXT"
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_trace.jsonl',{gate:'wave2-complete',passed:$PASSED,detail:'cross-topic synthesis with valid links — advancing to hitl2'})})"
```

预期：`check.passed: true`，`check.next: phases/phase-hitl2.md`。全链路 4 gate 全部 pass。

## Step 6: 从 trace 裁决

预期 4 条 `check` event 全部 `passed: true`（seed-topics-ready + wave0-complete + wave1-complete + wave2-complete）。

```bash
echo "=== Trace events ==="
cat $B/_trace.jsonl | while read line; do
  echo "$line" | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);const icon=j.passed?'\x1b[32mPASS\x1b[0m':'\x1b[31mFAIL\x1b[0m';console.log(icon,j.gate,'|',j.detail)})"
done

echo ""
echo "=== Verdict ==="
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_trace.jsonl')})"
```


## Step 7: 结果解读

> 4 个 check，验证 seed-topics→wave0→wave1→wave2 四 gate 顺序 pass。
>   全部 expected:true → 4/4 PASS 即通过。

## Step 8: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```