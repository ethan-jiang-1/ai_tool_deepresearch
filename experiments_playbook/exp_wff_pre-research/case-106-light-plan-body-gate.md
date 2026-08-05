---
schema: command-experiment/v2
experiment: wff-pre-research
case: case-106-light-plan-body-gate
case_goal: "Prove that setup-ready gate validates rb_plan.md body: fails on required-fill markers, passes after markers replaced, intentionally-allowed markers never block, and Progress checkbox flips on pass."
verdict_mode: all
required_checks: [artifact-content, setup-ready]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

<!-- @impl EXA-005, EXA-006, EXA-007, PLR-003 -->

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

本 case 不依赖 Agent 语义行为——所有步骤均为确定性文件操作 + gate CLI 调用。测试的是 Engine 层的 gate body 检查 + Progress 写行为。

# case-106-light-plan-body-gate

## Expected Runtime Path

1. 创建 disposable bundle（新模板：YAML + 5 section + required-fill markers + In/Out/待定 子结构）
2. 设置 gate 前置条件（hitl1 recorded, status correct）→ gate FAIL（placeholder 残留）
3. 替换 required-fill markers → gate PASS + Progress checkbox 翻转
4. 验证 intentionally-allowed markers 不会导致 FAIL
5. 从 `rb_trace.jsonl` 裁决
6. 写出 native completion 后停止；health、audit、preservation 和 optional clean-PASS cleanup 由 Autorun Supervisor 负责

---

## Case Goal

证明：
1. `plan_body_no_unfilled_marker` rule 正确检测 required-fill markers `(待填充…)` / `(尚无话题…)` — gate FAIL
2. 替换 required-fill markers 后 gate PASS
3. `plan_body_non_empty` rule 对正常的 5-section body 恒 PASS（不误报）
4. Intentionally-allowed markers `(待 HITL1 填充 — …)` / `(由 Engine — …)` / `(待 HITL2 确认 — …)` 不会触发 FAIL
5. Gate pass 后 `## Progress` section 中 `setup-ready` 行 checkbox 翻转为 `[x]` 并带时间戳
6. `### Scope` 的 In/Out/待定 三子结构和 `## Constraints` 的 5 类 bullet list 在 plan body 替换后完整保留

---

## Step 1: 创建 disposable bundle + 验证模板结构

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs plan_gate --case case-106 --force --target-dir {{CASE_RUN_ROOT_SH}})
node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs register-bundle --context {{RUN_CONTEXT_SH}} --role verdict --path "$B"
echo "Bundle: $B"

# Validate
node DEEP_RESEARCH_HARNESS/cli/validate-bundle.mjs $B

# Verify template has 6 sections and required-fill markers
echo "=== Plan body sections ==="
grep "^## " $B/rb_plan.md
echo ""
echo "=== Required-fill markers present ==="
grep -c "(待填充" $B/rb_plan.md && echo "OK: required-fill markers found" || echo "MISSING: required-fill markers not found"
echo "=== Scope substructure (In/Out/待定) ==="
grep -c '\*\*In scope:\*\*' $B/rb_plan.md && echo "OK: **In scope:** present" || echo "MISSING"
grep -c '\*\*Out of scope:\*\*' $B/rb_plan.md && echo "OK: **Out of scope:** present" || echo "MISSING"
grep -c '\*\*待定：\*\*' $B/rb_plan.md && echo "OK: **待定：** present" || echo "MISSING"
echo ""
echo "=== Constraints 5-category bullets ==="
grep -c '\*\*语言\*\*' $B/rb_plan.md && echo "OK: 语言" || echo "MISSING"
grep -c '\*\*时间预算\*\*' $B/rb_plan.md && echo "OK: 时间预算" || echo "MISSING"
grep -c '\*\*地域\*\*' $B/rb_plan.md && echo "OK: 地域" || echo "MISSING"
grep -c '\*\*方法\*\*' $B/rb_plan.md && echo "OK: 方法" || echo "MISSING"
grep -c '\*\*来源偏好\*\*' $B/rb_plan.md && echo "OK: 来源偏好" || echo "MISSING"
echo ""
echo "=== Intentionally-allowed markers present ==="
grep -c "(待 HITL1 填充" $B/rb_plan.md && echo "OK: intentionally-allowed marker found" || echo "MISSING"
grep -c "(由 Engine" $B/rb_plan.md && echo "OK: Engine marker found" || echo "MISSING"
```

预期：5 个 `##` section 全部存在，`### Scope` 含 `**In scope:**` / `**Out of scope:**` / `**待定：**` 三个子结构，`## Constraints` 含 5 类 bullet（语言/时间预算/地域/方法/来源偏好），至少 3 个 `(待填充` marker（Goal 子节的 In/Out scope），`(待 HITL1 填充…)` 和 `(由 Engine …)` 各存在。

## Step 2: 设置 gate 前置条件 → gate FAIL（placeholder 残留）

setup-ready gate 除了 body 检查外还需：hitl1 recorded、status.current_gate=`setup_ready`、status.next_gate=`seed_topics_ready`、basename 一致性。先修好这些前置，故意留下 placeholder。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REPO_ROOT=$(pwd)
echo "Bundle: $B"

# Fix HITL1 status and add a synthetic research-access observation.
# This proves deterministic gate mechanics only, not real Agent capability.
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: plan_gate
research_profile: quick_factual
root_must_answer_set:
  - "What is the research question?"
research_access:
  status: available
  probed_at: "2026-07-10T00:00:00.000Z"
  result_url: "https://example.com/deterministic-hitl1-fixture"
  fetch_outcome: success
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-26T00:00:00Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
EOF

# Fix status: next_gate should be seed_topics_ready
cat > $B/rb_status.json << 'EOF'
{
  "current_mode": "execution",
  "state": "in_progress",
  "current_gate": "setup_ready",
  "next_gate": "seed_topics_ready"
}
EOF

# rb_plan.md still has required-fill markers from template → should FAIL
echo "=== Plan body (markers still present) ==="
grep "(待填充" $B/rb_plan.md | head -3

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate setup-ready -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs --bundle $B --current-node phases/phase-setup.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'setup-ready',passed:$PASSED,expected:false,detail:'required-fill markers still present — gate should FAIL'})})"
```

预期：`check.passed: false`，`inspect` 包含 `plan_body_no_unfilled_marker` 或 "Forbidden pattern in rb_plan.md"。

## Step 3: 替换 required-fill markers → gate PASS + Progress 翻转

保留 intentionally-allowed markers（`(待 HITL1 填充 — …)` 和 `(由 Engine — …)`），只替换 required-fill markers。**保留 In/Out/待定 结构和 Constraints 5 类结构**——这是 spec 要求的 section 形态，不能简化为一整段 paragraph。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REPO_ROOT=$(pwd)
echo "Bundle: $B"

# Replace only required-fill markers — keep intentionally-allowed ones intact
cat > $B/rb_plan.md << 'PLANEOF'
---
plan_basename: plan_gate
derived_topic_count: 3
topic_registry:
  - id: "topic-01"
    slug: "01-media-coverage"
    title: "Media Coverage"
  - id: "topic-02"
    slug: "02-public-sentiment"
    title: "Public Sentiment"
  - id: "topic-03"
    slug: "03-policy-response"
    title: "Policy Response"
---

# Deep Research Plan: plan_gate

## Goal

### Purpose
This project investigates China's reaction to the 2026 World Cup across media, public sentiment, and policy dimensions.

### Research Questions
1. How did Chinese state media cover the tournament?
2. What was public sentiment on Weibo and other platforms?
3. Did the government issue any policy responses?

### Scope

**In scope:**
China's media coverage of the 2026 World Cup, public sentiment on Weibo and other platforms, and government policy responses.

**Out of scope:**
Economic impact analysis and international comparisons. Exit cost/benefit modeling and diplomatic relations.

**待定：**
(待 HITL2 确认 — whether to expand to Hong Kong and Taiwan media sources)

## Topic Registry

| # | Slug | Title | Status |
|---|------|-------|--------|
| (由 Engine — 在 seed-topics materialization 后从 frontmatter topic_registry 生成) |

## Constraints

- **语言**：(待 HITL1 填充 — 仅中文源/中英混合/不限)
- **时间预算**：(待 HITL1 填充 — 默认不设硬 deadline)
- **地域**：(待 HITL1 填充 — 中国大陆/港澳台/海外)
- **方法**：open — 不预设方法限制，Agent 按需选择 search/synthesis/fetch
- **来源偏好**：(待 HITL1 填充 — 一手源优先/学术优先/无偏好)

## Progress

- [ ] instantiation-complete
- [ ] hitl1-recorded
- [ ] setup-ready
- [ ] seed-topics-ready
- [ ] wave0-complete
- [ ] wave1-complete
- [ ] wave2-complete
- [ ] hitl2-recorded
- [ ] rerun-ready
- [ ] readiness-passed

## Decisions
(append-only — 关键决策记录，最新在上)
PLANEOF

# Verify In/Out/待定 structure preserved
echo "=== Scope substructure preserved ==="
grep -c '\*\*In scope:\*\*' $B/rb_plan.md && echo "OK: **In scope:** present" || echo "MISSING"
grep -c '\*\*Out of scope:\*\*' $B/rb_plan.md && echo "OK: **Out of scope:** present" || echo "MISSING"
grep -c '\*\*待定：\*\*' $B/rb_plan.md && echo "OK: **待定：** present" || echo "MISSING"
echo ""
echo "=== Constraints 5-category preserved ==="
grep -c '\*\*语言\*\*' $B/rb_plan.md && echo "OK: 语言" || echo "MISSING"
grep -c '\*\*方法\*\*' $B/rb_plan.md && echo "OK: 方法" || echo "MISSING"
echo ""
echo "=== Intentionally-allowed markers ==="
grep -c "(待 HITL1 填充" $B/rb_plan.md && echo "OK: Constraints marker present" || echo "MISSING"
grep -c "(由 Engine" $B/rb_plan.md && echo "OK: Engine marker present" || echo "MISSING"
grep -c "(待 HITL2 确认" $B/rb_plan.md && echo "OK: HITL2 deferral marker present" || echo "MISSING"
echo ""
echo "=== Required-fill markers gone? ==="
grep "(待填充" $B/rb_plan.md && echo "STILL PRESENT — should be gone" || echo "OK: all required-fill markers replaced"

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate setup-ready -- node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs --bundle $B --current-node phases/phase-setup.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'setup-ready',passed:$PASSED,expected:true,detail:'markers replaced, intentionally-allowed markers kept — gate should PASS'})})"
```

预期：`check.passed: true`，In/Out/待定 结构保留、Constraints 5 类结构保留，intentionally-allowed markers（`(待 HITL1 填充 — …)`、`(由 Engine — …)`、`(待 HITL2 确认 — …)`）全部保留且不触发 gate FAIL，required-fill markers 全部替换。

## Step 4: 验证 Progress checkbox 翻转

Gate pass 后 `## Progress` 中 `setup-ready` 行应从 `- [ ]` 翻转为 `- [x]` 且带 ISO8601 时间戳。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
REPO_ROOT=$(pwd)

echo "=== Progress section after gate pass ==="
grep -A1 "^## Progress" $B/rb_plan.md
grep "setup-ready" $B/rb_plan.md

# Check: setup-ready checkbox is flipped
SETUP_LINE=$(grep "setup-ready" $B/rb_plan.md)
PROGRESS_OK=false
if echo "$SETUP_LINE" | grep -q '\[x\]'; then
  if echo "$SETUP_LINE" | grep -qE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}'; then
    PROGRESS_OK=true
    echo "OK: Progress checkbox flipped with timestamp: $SETUP_LINE"
  else
    echo "FAIL: checkbox flipped but no timestamp"
  fi
else
  echo "FAIL: setup-ready checkbox NOT flipped — line: $SETUP_LINE"
fi

node -e "import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m=>{m.recordCheck('$B/rb_trace.jsonl',{gate:'artifact-content',passed:$PROGRESS_OK,detail:'Progress setup-ready checkbox flipped to [x] with ISO8601 timestamp'})})"
```

预期：`- [x] setup-ready (2026-06-26T…)` 行存在。

## Step 5: 从 trace 裁决

预期 3 条 `check` event：1 fail（required-fill marker 残留 → 正确拒绝）+ 2 pass（替换后 gate pass，In/Out/待定 + Constraints 5 类结构保留且 intentionally-allowed markers 不误拦 + Progress 翻转）。

```bash
B=$(node DEEP_RESEARCH_HARNESS/host_tools/agent-experiment-state.mjs get-bundle --context {{RUN_CONTEXT_SH}} --role verdict)
node DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}} --bundle "verdict=$B"
```

## Step 6: 结果解读

> 3 个 check（1 fail + 2 pass），验证 setup-ready gate 的 plan body 检查：
>   [FAIL ✅] required-fill markers `(待填充…)` 未替换 → gate 正确拒绝，`plan_body_no_unfilled_marker` 触发
>   [PASS]   markers 替换、In/Out/待定 结构保留、Constraints 5 类结构保留、intentionally-allowed markers（`(待 HITL1 填充 — …)` / `(由 Engine — …)` / `(待 HITL2 确认 — …)`）全部不触发 FAIL → gate 通过
>   [PASS]   `## Progress` 中 `setup-ready` checkbox 翻转为 `[x]` 且带时间戳
>
> 证明 gate 能区分 required-fill vs intentionally-allowed markers，不会误拦合法延迟标记；In/Out/待定 和 Constraints 5 类结构在 plan body 替换后完整保留。
> 且 Progress 写行为幂等可靠。


Stop after native completion. The Autorun Supervisor owns Light health, audit, preservation, and optional clean-PASS cleanup.
