---
schema: command-experiment/v1
experiment: wff-wave-gates
case: case-126-light-style-switch
weight: light
case_goal: "证明同一批 shared ref 数据（6 个文件），quick_factual style 下 gate pass（threshold=6），切换到 claim_verification style 后 gate fail（threshold=12）。research_style_params 真正驱动了 gate 行为变化，不是换了个常量。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-126_w0_switch_*
trace: dpt_disp_case-126_w0_switch_*/_logs/_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-126-light-style-switch

## Expected Runtime Path

1. 创建 bundle（3 topics）+ 写入 quick_factual 的 research_style_params（threshold=6）
2. 构造 6 个 shared ref + 每 topic 6 条 source entry → gate pass
3. 覆盖 rb_profile.yaml 为 claim_verification 的 params（threshold=12）
4. 相同数据（还是 6 个 shared ref）→ gate fail
5. 从 trace 裁决（2 条 check：1 pass + 1 fail）
6. Cleanup

---

## Case Goal

证明：
1. 不同的 research_style_params 导致同一个 count_floor 规则使用不同的阈值
2. quick_factual（threshold=6）+ 3 topics → gate pass on 6 refs
3. 切到 claim_verification（threshold=12）→ 同样的 6 refs → gate fail
4. Gate 行为由 profile 参数驱动，不是换常量

---

## Step 1: 创建 bundle + 写入 quick_factual research_style_params

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs w0_switch --case case-126 --force)
echo "Bundle: $B"
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

cat > $B/rb_plan.md << 'PLANEOF'
---
plan_basename: w0_switch
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
# w0_switch Plan
PLANEOF

# quick_factual research_style_params: shared_ref_total=6 (3+1×3)
cat > $B/rb_profile.yaml << 'PROFEOF'
research_profile: quick_factual
research_style_params:
  user_visible: true
  wave0_per_topic_source_floor: 6
  wave0_shared_ref_total: 6
  wave1_per_topic_ref_floor: 5
  topic_unique_ratio: 0.3
  counterexample_search: false
  cross_verification: false
  p0p1_independent_backing: 1
  quality_min_tier: tier_3
  quality_min_substance: thin
  wave2_cross_topic_depth: 0
  wave2_emergent_search_rounds: 0
PROFEOF

cat > $B/rb_status.json << 'STATEOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave0_complete",
  "next_gate": "wave1_complete"
}
STATEOF

mkdir -p $B/artifacts/wave0/topic-a $B/artifacts/wave0/topic-b $B/artifacts/wave0/topic-c

cat > $B/reference/_INDEX.md << 'IDXEOF'
# Reference Index
| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |
| --- | --- | --- | --- | --- | --- | --- | --- |
IDXEOF

cat > $B/reference/README.md << 'READEOF'
# Reference Evidence
Flat reference directory for shared foundation sources.
READEOF

echo "=== rb_profile.yaml ==="
cat $B/rb_profile.yaml
```

预期：bundle 创建完成，rb_profile.yaml 含 quick_factual 的 research_style_params，shared_ref_total=6。

## Step 2: 构造数据 + gate pass（threshold=6，恰好够）

每 topic 6 条 source entry（满足 per_topic_count_floor=6）+ 6 个 shared ref（恰好满足 threshold=6）。

```bash
# Per-topic source.yamls (6 entries each, meet quick_factual per_topic=6)
for topic in topic-a topic-b topic-c; do
  for i in $(seq 1 6); do
    echo "- url: \"https://example.com/$topic-source-$i\"" >> $B/artifacts/wave0/$topic/source.yaml
    echo "  title: \"$topic Source $i\"" >> $B/artifacts/wave0/$topic/source.yaml
    echo "  retrieved_date: \"2026-06-15\"" >> $B/artifacts/wave0/$topic/source.yaml
    echo "  topic_tag: \"$topic\"" >> $B/artifacts/wave0/$topic/source.yaml
  done
done

# 6 shared refs (exactly threshold=6 for quick_factual 3-topic)
for i in $(seq 1 6); do
  echo "# Shared Reference $i" > $B/reference/00-shared-ref-$i.md
  echo "- source_url: https://example.com/shared-$i" >> $B/reference/00-shared-ref-$i.md
  echo "- acceptance_status: accepted" >> $B/reference/00-shared-ref-$i.md
  echo "| 00-shared-ref-$i.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |" >> $B/reference/_INDEX.md
done

echo "=== Per-topic source counts ==="
for topic in topic-a topic-b topic-c; do
  count=$(grep -c 'url:' $B/artifacts/wave0/$topic/source.yaml 2>/dev/null || echo 0)
  echo "$topic: $count entries"
done
echo "=== Shared refs ==="
ls $B/reference/00-shared-*.md | wc -l

echo '{"ts":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","event":"wave0_completion"}' >> $B/rb_trace.jsonl

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "PASSED=$PASSED"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,detail:'quick_factual: 6 shared refs meet threshold=6 -> gate passes'})})"
```

预期：`check.passed: true`。6 shared refs + 6 per-topic entries = 满足 quick_factual 的所有 count_floor 规则。

## Step 3: 覆盖 profile 为 claim_verification params（threshold=12）→ gate fail

rb_profile.yaml 换为 claim_verification 的 research_style_params（shared_ref_total 从 6 升到 12），数据不动（还是 6 个 shared ref）。per_topic_source_floor 从 6 升到 12，所以 per_topic 也需要补足到 12 条——但这里我们只关注 shared_ref 的行为变化。

```bash
# 先补足 per_topic source entries 到 12 条（避免 per_topic_count_floor 干扰 shared_ref 测试）
for topic in topic-a topic-b topic-c; do
  for i in $(seq 7 12); do
    echo "- url: \"https://example.com/$topic-source-$i\"" >> $B/artifacts/wave0/$topic/source.yaml
    echo "  title: \"$topic Source $i\"" >> $B/artifacts/wave0/$topic/source.yaml
    echo "  retrieved_date: \"2026-06-15\"" >> $B/artifacts/wave0/$topic/source.yaml
    echo "  topic_tag: \"$topic\"" >> $B/artifacts/wave0/$topic/source.yaml
  done
done

# 覆盖 profile 为 claim_verification（shared_ref_total: 6→12）
cat > $B/rb_profile.yaml << 'PROFEOF'
research_profile: claim_verification
research_style_params:
  user_visible: true
  wave0_per_topic_source_floor: 12
  wave0_shared_ref_total: 12
  wave1_per_topic_ref_floor: 10
  topic_unique_ratio: 0.5
  counterexample_search: true
  cross_verification: true
  p0p1_independent_backing: 2
  quality_min_tier: tier_2
  quality_min_substance: substantive
  wave2_cross_topic_depth: 2
  wave2_emergent_search_rounds: 2
PROFEOF

echo "=== Updated rb_profile.yaml ==="
cat $B/rb_profile.yaml

echo "=== Shared refs (still 6, but threshold now 12) ==="
ls $B/reference/00-shared-*.md | wc -l

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "PASSED=$PASSED"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,expected:false,detail:'same 6 shared refs, now claim_verification threshold=12 -> gate correctly rejects (style switch changed behavior)'})})"
```

预期：`check.passed: false`。同样的 6 个 shared ref，quick_factual 下 gate 放行（threshold=6 达标），切到 claim_verification 后 gate 拒绝（threshold=12 不达标）。per_topic_count_floor 已补足不干扰。

## Step 4: 从 trace 裁决

预期 2 条 check：quick_factual 下 gate 放行 + claim_verification 下 gate 拒绝。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_logs/_trace.jsonl')})"
```

## Step 5: 结果解读

> 同一批数据（6 个 shared ref），在两个 style 下问了 gate 同一个问题——"够不够？"
>
> quick_factual（threshold=6）：6 ≥ 6 → gate 放行
> claim_verification（threshold=12）：6 < 12 → gate 拒绝
>
> 数据没变，style 变了 → 阈值变了 → gate 结果变了。证明 gate 行为由 `research_style_params` 驱动，不是换了个常量。

## Step 6: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
