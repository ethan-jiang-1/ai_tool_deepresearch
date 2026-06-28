---
schema: command-experiment/v1
experiment: wff-wave-gates
case: case-125-light-dynamic-threshold
weight: light
case_goal: "证明 wave0-complete gate 的 count_floor 规则从 rb_profile.yaml#/research_style_params 读取动态阈值（threshold_source 生效），替代硬编码 threshold:1。claim_verification style 下 shared_ref 不达 12 则 gate fail，达到则 pass。inspect 输出明确标注实际阈值。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-125_w0_dynt_*
trace: dpt_disp_case-125_w0_dynt_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-125-light-dynamic-threshold

## Expected Runtime Path

1. 创建 bundle（3 topics）+ 写入 claim_verification 的 research_style_params
2. 构造 per-topic source.yaml（每 topic 12 条，满足 per_topic_count_floor 动态阈值）
3. 只建 2 个 00-shared-*.md → gate fail（shared_ref_count_floor threshold=12）
4. 补足到 12 个 shared ref → gate pass
5. 从 trace 裁决（2 条 check：1 fail + 1 pass）
6. Cleanup

---

## Case Goal

证明：
1. `shared_ref_count_floor` 规则从 `rb_profile.yaml#/research_style_params/wave0_shared_ref_total` 读取动态阈值
2. claim_verification 下 3 topics → shared_ref_total=12（base=6 + per_topic=2×3），不达则 gate fail
3. 数量达标后 gate pass
4. inspect 输出的 failure_message 中能看到 resolved threshold

---

## Step 1: 创建 bundle + 写入 claim_verification research_style_params

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs w0_dynt --case case-125 --force)
echo "Bundle: $B"
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B

# 3-topic topic_registry
cat > $B/rb_plan.md << 'PLANEOF'
---
plan_basename: w0_dynt
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
# w0_dynt Plan
PLANEOF

# claim_verification research_style_params: shared_ref_total=12 (6+2×3)
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

cat > $B/rb_status.json << 'STATEOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "wave0_complete",
  "next_gate": "wave1_complete"
}
STATEOF

mkdir -p $B/artifacts/wave0/topic-a $B/artifacts/wave0/topic-b $B/artifacts/wave0/topic-c

# reference directory with _INDEX.md and README.md (required by gate)
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
echo "=== rb_plan registry ==="
head -12 $B/rb_plan.md
```

预期：bundle 创建完成，rb_profile.yaml 含 claim_verification 的 research_style_params，shared_ref_total=12。

## Step 2: 构造 per-topic source.yaml（每 topic 12 条，满足动态阈值）

per_topic_count_floor 也用了 threshold_source（`wave0_per_topic_source_floor: 12`）。需要每 topic 12 条 source entry 才能让 per_topic 规则 pass，这样隔离 shared_ref_count_floor 的测试。

```bash
for topic in topic-a topic-b topic-c; do
  for i in $(seq 1 12); do
    echo "- url: \"https://example.com/$topic-source-$i\"" >> $B/artifacts/wave0/$topic/source.yaml
    echo "  title: \"$topic Source $i\"" >> $B/artifacts/wave0/$topic/source.yaml
    echo "  retrieved_date: \"2026-06-15\"" >> $B/artifacts/wave0/$topic/source.yaml
    echo "  topic_tag: \"$topic\"" >> $B/artifacts/wave0/$topic/source.yaml
  done
done

echo "=== Per-topic source counts ==="
for topic in topic-a topic-b topic-c; do
  count=$(grep -c 'url:' $B/artifacts/wave0/$topic/source.yaml 2>/dev/null || echo 0)
  echo "$topic: $count entries"
done

```

预期：每 topic 12 条 source entry（满足 per_topic_count_floor threshold=12）。

## Step 3: 只建 2 个 shared ref → gate fail（threshold=12，差 10）

```bash
# Write only 2 shared refs (far below threshold=12)
for i in 1 2; do
  echo "# Shared Reference $i" > $B/reference/00-shared-ref-$i.md
  echo "- source_url: https://example.com/shared-$i" >> $B/reference/00-shared-ref-$i.md
  echo "- acceptance_status: accepted" >> $B/reference/00-shared-ref-$i.md
done

echo "=== Shared refs (only 2 of 12 needed) ==="
ls $B/reference/00-shared-*.md

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "PASSED=$PASSED"

# Verify inspect mentions threshold
INSPECT=$(echo "$GATE_OUTPUT" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const o=JSON.parse(d);console.log(JSON.stringify(o.check.inspect))})")
echo "INSPECT: $INSPECT"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,expected:false,detail:'only 2 shared refs, threshold=12 from research_style_params -> gate correctly rejects'})})"
```

预期：gate 返回 `check.passed: false`。`shared_ref_count_floor` 规则从 research_style_params 读到 threshold=12，只有 2 个文件所以拒绝。inspect 内容类似 `"Count floor not met for reference/00-shared-*.md: 2 files (threshold: 12)"`——明确标出了实际阈值 12 和当前数量 2。这一步验证的是"不够时 gate 敢拒绝"。

## Step 4: 补足到 12 个 shared ref → gate pass

```bash
for i in $(seq 3 12); do
  echo "# Shared Reference $i" > $B/reference/00-shared-ref-$i.md
  echo "- source_url: https://example.com/shared-$i" >> $B/reference/00-shared-ref-$i.md
  echo "- acceptance_status: accepted" >> $B/reference/00-shared-ref-$i.md
done

# Also add them to _INDEX.md
for i in $(seq 1 12); do
  echo "| 00-shared-ref-$i.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-06-15 |" >> $B/reference/_INDEX.md
done

echo "=== Shared refs (now 12) ==="
ls $B/reference/00-shared-*.md | wc -l

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle $B --current-node phases/phase-wave0.md)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
echo "PASSED=$PASSED"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'wave0-complete',passed:$PASSED,detail:'12 shared refs meet threshold=12 from claim_verification research_style_params -> gate passes'})})"
```

预期：`check.passed: true`。12 个 shared ref 满足 threshold=12，gate 放行。

## Step 5: 从 trace 裁决

预期 2 条 check：Step 3 gate 拒绝（符合预期），Step 4 gate 放行（符合预期）。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/rb_trace.jsonl')})"
```

## Step 6: 结果解读

> 实验问了 gate 同一个问题两次——"够不够 12 个 shared ref？"
>
> 第一次：只有 2 个 ref → gate 拒绝（inspect: "2 files, threshold: 12"）—— gate 没放水，阈值确实是 12 而不是原来硬编码的 1。
> 第二次：补到 12 个 ref → gate 放行，路由到 phase-wave1。
>
> 两次 gate 行为都正确。证明 `threshold_source` 生效——gate 从 `rb_profile.yaml#/research_style_params/wave0_shared_ref_total` 读取动态阈值。

## Step 7: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
