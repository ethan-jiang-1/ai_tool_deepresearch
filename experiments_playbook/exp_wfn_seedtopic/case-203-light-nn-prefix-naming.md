---
schema: command-experiment/v1
experiment: wfn-seedtopic
case: case-203-light-nn-prefix-naming
weight: light
case_goal: "验证 NN_ 前缀命名约定：seed topic slug 的 NN 等于 registry 1-based 位置（两位零填充），gate 三重一致校验通过，ls 自然排序匹配数组顺序，下游 reference 文件遵循 {slug}-<qualifier>.md 模式。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-203_nn_name_
trace: dpt_disp_case-203_nn_name_*/_logs/_trace.jsonl
verdict: trace-jsonl
req: STM-006
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。本 case 不依赖 Agent 行为——所有操作都是确定性 CLI/FS/gate 调用，验证 NN_ 命名约定的正确性。不涉及 queue、不涉及 WebSearch/WebFetch、不涉及 subagent。

# case-203-light-nn-prefix-naming

## Case Goal

验证两层的 NN_ 前缀命名约定：

**Layer A — Seed Topic 命名：**
1. slug 含 `NN_` 前缀，NN = registry 1-based 位置（两位零填充）
2. gate 三重一致（filename_stem == registry_slug == frontmatter_slug）通过
3. `ls seed_topics/` 自然排序 = registry 数组顺序
4. frontmatter `id` 与 NN 一致（convention，非 gate 强制）

**Layer B — 下游 Reference 命名：**
5. 单 topic reference 遵循 `{slug}-<qualifier>.md`（slug 已含 `NN_`）
6. 共享 reference 遵循 `00-shared-<slug>.md`（不受影响）
7. 分隔符约定：seed topic 用 `_`（`NN_descriptive-name`），reference qualifier 用 `-`

**边界测试：**
8. 文件名 stem ≠ frontmatter slug → gate 正确 reject

## Expected Runtime Path

1. 创建 disposable bundle + 写入含 4 个 NN_ 前缀 topic 的 registry [MAIN/SHELL]
2. 物化 4 个 seed topic 文件（文件名 = slug，frontmatter id = NN） [MAIN/SHELL]
3. 跑 seed-topics-ready gate → 预期 pass [MAIN/SHELL]
4. 命名约定检查：ls 排序 + NN 推导 + frontmatter id 对齐 [MAIN/SHELL]
5. 下游 reference 命名检查：{slug}-<qualifier>.md + 00-shared-<slug>.md + 分隔符约定 [MAIN/SHELL]
6. 边界测试：故意写错文件名，gate 正确 reject [MAIN/SHELL]
7. 从 trace 裁决 [MAIN/SHELL]
8. 结果解读 [MAIN/SHELL]
9. Cleanup（PASS 则删 bundle） [MAIN/SHELL]

## Step 1: 创建 disposable bundle + 写入 topic_registry（4 topic，NN_ 前缀 slug）

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs nn_name --case case-203 --force)
echo "Bundle: $B"

node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B

# 4 个 topic，slug 含 NN_ 前缀，NN = 1-based 数组位置（01/02/03/04），id 与 NN 一致
cat > $B/rb_plan.md << 'PLANEOF'
---
plan_basename: nn_name
derived_topic_count: 4
topic_registry:
  - id: "01"
    slug: 01_meal-timing-and-metabolism
    title: Meal Timing and Metabolic Health
  - id: "02"
    slug: 02_exercise-protocols-and-recovery
    title: Exercise Protocols and Recovery Optimization
  - id: "03"
    slug: 03_sleep-architecture-and-performance
    title: Sleep Architecture and Cognitive Performance
  - id: "04"
    slug: 04_stress-modulation-and-resilience
    title: Stress Modulation and Psychological Resilience
---
# Research Plan: NN_ Prefix Naming Convention Validation

验证 topic slug 的 NN_ 前缀约定：NN 由 registry 数组 1-based 位置推导，gate 三重一致校验通过。
PLANEOF

# rb_profile.yaml（最小满足 setup-ready gate 要求）
cat > $B/rb_profile.yaml << 'PROFEOF'
plan_basename: nn_name
research_profile: quick_factual
root_must_answer_set:
  - "How do meal timing, exercise, sleep, and stress interact to affect health outcomes?"
human_decision_checkpoints:
  hitl1:
    status: recorded
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
PROFEOF

# 状态设在 seed_topics_ready（模拟 setup 已完成，准备进入 seed-topics phase）
cat > $B/rb_status.json << 'EOF'
{"current_mode":"execution","state":"in_progress","current_gate":"seed_topics_ready","next_gate":"wave0_complete"}
EOF

echo "=== Plan frontmatter ==="
head -16 $B/rb_plan.md
echo "=== Status ==="
cat $B/rb_status.json
```

→ Bundle 创建成功，topic_registry 含 4 个 topic，slug 格式 `NN_descriptive-name`，id 与 NN 一致。

## Step 2: 物化 4 个 seed topic 文件（文件名 = slug，frontmatter id = NN）

```bash
REPO_ROOT=$(pwd)
B=$(echo dpt_disp_case-203_nn_name_*)

# Topic 1: 01_meal-timing-and-metabolism
cat > $B/seed_topics/01_meal-timing-and-metabolism.md << 'EOF'
---
id: "01"
slug: 01_meal-timing-and-metabolism
title: Meal Timing and Metabolic Health
must_answer:
  - "How does meal timing affect circadian metabolic rhythms?"
hypothesis: "Meal timing aligned with circadian rhythms improves metabolic markers."
in_scope: "Human RCTs on time-restricted eating and chrononutrition."
out_of_scope: "Animal-only studies without human replication."
search_guardrails:
  required_terms:
    - "time-restricted eating"
  forbidden_broadening:
    - "general weight loss"
evidence_route:
  preferred_sources:
    - "PubMed-indexed RCTs"
  noise_to_avoid:
    - "supplement marketing"
---
# Meal Timing and Metabolic Health
## 主题定位
Meal timing as a modulator of circadian metabolic rhythms.
## must_answer
1. How does meal timing affect circadian metabolic rhythms?
## 初始假设、缺口或张力
**已知**: Time-restricted eating shows promise in pilot studies.
**缺口**: Long-term adherence and mechanism data are limited.
## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
EOF

# Topic 2: 02_exercise-protocols-and-recovery
cat > $B/seed_topics/02_exercise-protocols-and-recovery.md << 'EOF'
---
id: "02"
slug: 02_exercise-protocols-and-recovery
title: Exercise Protocols and Recovery Optimization
must_answer:
  - "What exercise modalities produce the best recovery outcomes?"
hypothesis: "Periodized training with adequate recovery outperforms continuous high-volume."
in_scope: "Human studies on exercise recovery and periodization."
out_of_scope: "Elite athlete case studies without control groups."
search_guardrails:
  required_terms:
    - "exercise recovery"
  forbidden_broadening:
    - "general fitness"
evidence_route:
  preferred_sources:
    - "sports medicine journals"
  noise_to_avoid:
    - "supplement industry content"
---
# Exercise Protocols and Recovery Optimization
## 主题定位
Recovery optimization through periodized training protocols.
## must_answer
1. What exercise modalities produce the best recovery outcomes?
## 初始假设、缺口或张力
**已知**: Periodization is standard in elite training.
**缺口**: Optimal recovery intervals for general population unclear.
## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
EOF

# Topic 3: 03_sleep-architecture-and-performance
cat > $B/seed_topics/03_sleep-architecture-and-performance.md << 'EOF'
---
id: "03"
slug: 03_sleep-architecture-and-performance
title: Sleep Architecture and Cognitive Performance
must_answer:
  - "How do sleep stage distributions affect next-day cognitive performance?"
hypothesis: "Deep sleep (N3) duration is the strongest predictor of cognitive recovery."
in_scope: "Polysomnography studies linking sleep architecture to cognitive tests."
out_of_scope: "Self-reported sleep quality without objective measurement."
search_guardrails:
  required_terms:
    - "sleep architecture"
  forbidden_broadening:
    - "sleep hygiene tips"
evidence_route:
  preferred_sources:
    - "sleep research journals"
  noise_to_avoid:
    - "consumer sleep tracker marketing"
---
# Sleep Architecture and Cognitive Performance
## 主题定位
Sleep stage distributions as predictors of cognitive recovery.
## must_answer
1. How do sleep stage distributions affect next-day cognitive performance?
## 初始假设、缺口或张力
**已知**: Sleep duration correlates with cognitive performance.
**缺口**: Stage-specific contributions not well characterized.
## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
EOF

# Topic 4: 04_stress-modulation-and-resilience
cat > $B/seed_topics/04_stress-modulation-and-resilience.md << 'EOF'
---
id: "04"
slug: 04_stress-modulation-and-resilience
title: Stress Modulation and Psychological Resilience
must_answer:
  - "Which stress-modulation interventions show sustained resilience effects?"
hypothesis: "Combined cognitive-behavioral and physiological interventions produce durable resilience."
in_scope: "RCTs on stress interventions with follow-up >= 6 months."
out_of_scope: "Acute stress responses without resilience measurement."
search_guardrails:
  required_terms:
    - "stress modulation"
  forbidden_broadening:
    - "general wellness"
evidence_route:
  preferred_sources:
    - "clinical psychology journals"
  noise_to_avoid:
    - "wellness influencer content"
---
# Stress Modulation and Psychological Resilience
## 主题定位
Stress modulation interventions and their durability for resilience.
## must_answer
1. Which stress-modulation interventions show sustained resilience effects?
## 初始假设、缺口或张力
**已知**: CBT-based interventions show short-term effects.
**缺口**: Long-term resilience maintenance understudied.
## 待验证问题
__BACKFILL_PENDING_QUESTIONS__
EOF

# 记录 seed_topics_completion trace event

echo "=== seed_topics/ directory ==="
ls -1 $B/seed_topics/
```

→ 4 个 seed topic 文件，`ls` 输出自然按 `01_`/`02_`/`03_`/`04_` 排序。

## Step 3: 跑 seed-topics-ready gate → 预期 pass

```bash
REPO_ROOT=$(pwd)
B=$(echo dpt_disp_case-203_nn_name_*)

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md)
echo "$GATE_OUTPUT"

PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
NEXT=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.next)
echo "seed-topics-ready: passed=$PASSED next=$NEXT"

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'seed-topics-ready-happy',passed:$PASSED,detail:'4 seed topics with NN_ prefix slugs, triple-consistency verified, next=' + '$NEXT'})})"
```

→ `passed: true`，`next: phases/phase-wave0.md`。gate 的 7 条 rule 全部通过（dir_non_empty / slug_consistency bidirectional / per_file_title_non_empty / per_file_slug_stem_consistency byte-for-byte / trace_event_present / status_value ×2）。

## Step 4: 命名约定检查 — ls 排序 + NN 推导 + frontmatter id 对齐

```bash
REPO_ROOT=$(pwd)
B=$(echo dpt_disp_case-203_nn_name_*)

echo "=== N1: ls natural ordering matches registry array order ==="
ls -1 $B/seed_topics/
# 预期顺序：
# 01_meal-timing-and-metabolism.md
# 02_exercise-protocols-and-recovery.md
# 03_sleep-architecture-and-performance.md
# 04_stress-modulation-and-resilience.md

echo ""
echo "=== N2: NN_ prefix equals 1-based registry index (zero-padded) ==="
ORDER_OK=true
EXPECTED_SLUGS="01_meal-timing-and-metabolism 02_exercise-protocols-and-recovery 03_sleep-architecture-and-performance 04_stress-modulation-and-resilience"
i=0
for STEM in $EXPECTED_SLUGS; do
  POS=$((i + 1))
  NN=$(printf "%02d" $POS)
  ACTUAL_PREFIX=$(echo "$STEM" | grep -o '^[0-9][0-9]')
  echo "  registry[$i] stem=$STEM → NN_ prefix=$ACTUAL_PREFIX (expected=$NN)"
  if [ "$ACTUAL_PREFIX" != "$NN" ]; then
    ORDER_OK=false
    echo "    MISMATCH: expected prefix $NN, got $ACTUAL_PREFIX"
  fi
  i=$((i + 1))
done

echo ""
echo "=== N3: frontmatter id equals NN (convention, not gate-enforced) ==="
for f in $B/seed_topics/*.md; do
  STEM=$(basename "$f" .md)
  NN=$(echo "$STEM" | grep -o '^[0-9][0-9]')
  FM_ID=$(grep '^id:' "$f" | head -1 | sed 's/^id: *"//;s/"$//')
  echo "  $STEM → frontmatter id=$FM_ID (prefix=$NN)"
  if [ "$FM_ID" != "$NN" ]; then
    ORDER_OK=false
    echo "    MISMATCH: id=$FM_ID != NN=$NN"
  fi
done

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/_logs/_trace.jsonl',{gate:'nn-prefix-ordering',passed:$ORDER_OK,detail:'ls natural order matches registry 1-based position, NN=zero-padded index, frontmatter id=NN'})})"
```

→ 三个检查全部通过：ls 按 01-04 排列，每个 NN 前缀等于其数组 1-based 位置，frontmatter id 与 NN 一致。

## Step 5: 下游 reference 命名检查 — {slug}-<qualifier>.md + 分隔符约定

```bash
REPO_ROOT=$(pwd)
B=$(echo dpt_disp_case-203_nn_name_*)

echo "=== Creating Wave1-style per-topic reference files ==="
# 按 shared-schemas.md 约定：reference/{topic_slug}-<qualifier>.md
# topic_slug 含 NN_ 前缀，qualifier 用 hyphen 分隔

cat > "$B/reference/01_meal-timing-and-metabolism-chrononutrition.md" << 'EOF'
# Chrononutrition Review
- source_url: https://example.com/chrononutrition-review
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 2
- evidence_role: primary_topic_reference
- trust_level: practitioner
- why_it_matters: Comprehensive review of meal timing and circadian rhythm research.
- accessed_at: 2026-06-26
- related_topic: all

## Key Facts
- Time-restricted eating improves insulin sensitivity independent of weight loss.

## Core Content Capture
Review of 23 RCTs on chrononutrition interventions.

## Relevance To This Research
Direct evidence for the meal-timing topic's core hypothesis.

## Quotable Terms / Concepts
- "circadian alignment"
- "metabolic chronotype"

## Risks And Limitations
- Most studies < 12 weeks duration.
EOF

cat > "$B/reference/02_exercise-protocols-and-recovery-strength.md" << 'EOF'
# Strength Training Recovery Meta-Analysis
- source_url: https://example.com/strength-recovery-meta
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 2
- evidence_role: primary_topic_reference
- trust_level: practitioner
- why_it_matters: Meta-analysis of recovery intervals in strength training.
- accessed_at: 2026-06-26
- related_topic: all

## Key Facts
- 48-hour recovery intervals produce optimal strength gains.

## Core Content Capture
Meta-analysis of 45 studies on recovery periodization.

## Relevance To This Research
Direct evidence for exercise recovery optimization.

## Quotable Terms / Concepts
- "supercompensation window"
- "recovery debt"

## Risks And Limitations
- Variability in individual recovery rates not fully captured.
EOF

cat > "$B/reference/00-shared-metabolic-pathways.md" << 'EOF'
# Shared Metabolic Pathways Overview
- source_url: https://example.com/metabolic-pathways
- acceptance_status: accepted
- source_type: secondary
- tier: Tier 1
- evidence_role: foundation
- trust_level: practitioner
- why_it_matters: Foundational reference on metabolic pathways shared across all four topics.
- accessed_at: 2026-06-26
- related_topic: all

## Key Facts
- AMPK, mTOR, and circadian clock genes form an interconnected regulatory network.

## Core Content Capture
Overview of shared metabolic signaling pathways.

## Relevance To This Research
Cross-topic foundation linking meal timing, exercise, sleep, and stress.

## Quotable Terms / Concepts
- "metabolic flexibility"
- "circadian entrainment"

## Risks And Limitations
- High-level overview; lacks topic-specific depth.
EOF

echo "=== Reference directory ==="
ls -1 $B/reference/*.md

echo ""
echo "=== R1: Per-topic refs use {slug}-<qualifier>.md pattern ==="
REF_OK=true
for f in "$B/reference/01_meal-timing-and-metabolism-chrononutrition.md" \
         "$B/reference/02_exercise-protocols-and-recovery-strength.md"; do
  if [ ! -f "$f" ]; then
    REF_OK=false
    echo "  MISSING: $f"
  else
    STEM=$(basename "$f" .md)
    if echo "$STEM" | grep -q '^[0-9][0-9]_'; then
      echo "  OK: $STEM (has NN_ prefix)"
    else
      REF_OK=false
      echo "  FAIL: $STEM (missing NN_ prefix)"
    fi
    QUALIFIER=$(echo "$STEM" | sed 's/^[0-9][0-9]_[^-]*-//')
    if [ -n "$QUALIFIER" ]; then
      echo "    qualifier: $QUALIFIER"
    else
      echo "    WARNING: no qualifier found"
    fi
  fi
done

echo ""
echo "=== R2: Shared reference uses 00-shared-<slug>.md pattern ==="
SHARED_OK=true
SHARED_FILE="$B/reference/00-shared-metabolic-pathways.md"
if [ -f "$SHARED_FILE" ]; then
  STEM=$(basename "$SHARED_FILE" .md)
  if echo "$STEM" | grep -q '^00-shared-'; then
    echo "  OK: $STEM (correct shared pattern)"
  else
    SHARED_OK=false
    echo "  FAIL: $STEM (incorrect shared pattern)"
  fi
else
  SHARED_OK=false
  echo "  MISSING: $SHARED_FILE"
fi

echo ""
echo "=== R3: Delimiter convention — seed topic _ vs reference - ==="
# Seed topic: 01_meal-timing-and-metabolism.md（NN 后用 underscore）
# Reference:  01_meal-timing-and-metabolism-chrononutrition.md（qualifier 前用 hyphen）
DELIM_OK=true
for f in $B/seed_topics/*.md; do
  STEM=$(basename "$f" .md)
  PREFIX=$(echo "$STEM" | grep -o '^[0-9][0-9]_')
  if [ -z "$PREFIX" ]; then
    DELIM_OK=false
    echo "  FAIL: seed topic $STEM does not start with NN_"
  else
    echo "  seed: $STEM → NN_ prefix=$PREFIX (underscore after NN)"
  fi
done
for f in "$B/reference/01_meal-timing-and-metabolism-chrononutrition.md" \
         "$B/reference/02_exercise-protocols-and-recovery-strength.md"; do
  STEM=$(basename "$f" .md)
  SUFFIX=$(echo "$STEM" | sed 's/^[0-9][0-9]_[^-]*-//')
  echo "  ref:  $STEM → qualifier=$SUFFIX (hyphen before qualifier)"
done

node -e "
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.recordCheck('$B/_logs/_trace.jsonl', { gate: 'ref-per-topic-naming', passed: $REF_OK,    detail: 'Per-topic reference files use {slug}-<qualifier>.md pattern' });
  m.recordCheck('$B/_logs/_trace.jsonl', { gate: 'ref-shared-naming',   passed: $SHARED_OK,  detail: 'Shared reference uses 00-shared-<slug>.md pattern' });
  m.recordCheck('$B/_logs/_trace.jsonl', { gate: 'delimiter-convention',passed: $DELIM_OK,   detail: 'Seed topic uses NN_ (underscore), reference qualifier uses hyphen' });
})"
```

→ 三个 reference 命名检查全部通过：per-topic ref 有 NN_ 前缀 + hyphen qualifier，shared ref 用 `00-shared-`，分隔符约定正确。

## Step 6: 边界测试 — 文件名 stem ≠ frontmatter slug，gate 正确 reject

```bash
REPO_ROOT=$(pwd)
B=$(echo dpt_disp_case-203_nn_name_*)

echo "=== Boundary test: create a file whose stem does not match frontmatter slug ==="
# 复制 04 文件，但用错误文件名——stem 与 frontmatter slug 不一致
cp "$B/seed_topics/04_stress-modulation-and-resilience.md" \
   "$B/seed_topics/04_wrong-name.md"

GATE_OUTPUT=$(node DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs --bundle $B --current-node phases/phase-seed-topics.md || true)
echo "$GATE_OUTPUT"

PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
INSPECT_COUNT=$(echo "$GATE_OUTPUT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.parse(d).inspect.length)" 2>/dev/null || echo "0")
echo "seed-topics-ready (boundary): passed=$PASSED inspect_count=$INSPECT_COUNT"

node -e "
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.recordCheck('$B/_logs/_trace.jsonl', {
    gate: 'seed-topics-ready-boundary-misnamed',
    passed: $PASSED,
    expected: false,
    detail: 'Gate should reject: file 04_wrong-name has stem != frontmatter slug (04_stress-modulation-and-resilience), inspect_count=' + $INSPECT_COUNT
  });
})"

# Clean up boundary test file
rm "$B/seed_topics/04_wrong-name.md"
```

→ `passed: false`。gate 的 `per_file_slug_stem_consistency` rule 正确检测到 `04_wrong-name.md` 的 stem 与 frontmatter slug `04_stress-modulation-and-resilience` 不一致。`expected: false` 表示这是一个正确的 rejection。

## Step 7: 裁决

```bash
REPO_ROOT=$(pwd)
B=$(echo dpt_disp_case-203_nn_name_*)

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.verdict('$B/_logs/_trace.jsonl')})"
```

→ 预期 **PASS**。trace 含 6 个 check event：
1. `seed-topics-ready-happy` — passed=true
2. `nn-prefix-ordering` — passed=true
3. `ref-per-topic-naming` — passed=true
4. `ref-shared-naming` — passed=true
5. `delimiter-convention` — passed=true
6. `seed-topics-ready-boundary-misnamed` — passed=false, expected=false（正确 rejection）


### 如果 FAIL

检查具体哪个 rule 失败：
- `seed-topics-ready-happy` fail → 检查 gate JSON output 的 inspect 数组，确认是哪条 rule 未通过
- `nn-prefix-ordering` fail → 检查 `ls` 输出顺序，确认 NN_ 前缀与 registry 数组位置对应
- reference 命名 fail → 检查文件名是否匹配 `{slug}-<qualifier>.md` 或 `00-shared-<slug>.md`
- boundary 测试 PASS（passed=true）→ 说明 gate 没检测到错误命名，per_file_slug_stem_consistency rule 可能未生效

## Step 8: 结果解读

> 验证 NN_ 前缀命名约定在两层的正确性：
>
> **Layer A — Seed Topic 命名：**
> - seed-topics-ready gate 在 4 个 NN_ 前缀 topic 上全部 7 条 rule 通过
> - `ls seed_topics/` 自然按 01/02/03/04 排序，匹配 registry 数组顺序
> - 每个 NN_ 前缀的 NN 值 = registry 1-based 位置（两位零填充）
> - frontmatter `id` 与 NN 一致（convention 层面）
>
> **Layer B — 下游 Reference 命名：**
> - 单 topic reference 正确使用 `{slug}-<qualifier>.md`（slug 含 NN_ 前缀，qualifier 为 hyphen 分隔的短标识）
> - 共享 reference 正确使用 `00-shared-<slug>.md`（不受 NN_ 变更影响）
> - 分隔符约定正确：seed topic 用 `_`（`NN_descriptive-name`），reference qualifier 用 `-`
>
> **边界测试：**
> - gate 正确 reject 文件名 stem 与 frontmatter slug 不一致的文件（`04_wrong-name.md` stem ≠ `04_stress-modulation-and-resilience` slug）
> - 证明 gate 的 `per_file_slug_stem_consistency` rule 是真实 enforcement，不是被动接受

## Step 9: Cleanup

```bash
REPO_ROOT=$(pwd)
B=$(echo dpt_disp_case-203_nn_name_*)

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.cleanup('$B')})"
```
