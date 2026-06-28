---
schema: command-experiment/v1
experiment: wff-pre-research
case: case-101-standard-pre-research-happy
weight: light
case_goal: "Prove that a disposable bundle with a fixed valid HITL1 payload passes all three pre-research gates (instantiation-complete, hitl1-recorded, setup-ready) and produces trace-backed verdict."
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-101_wff_happy_*
trace: dpt_disp_case-101_wff_happy_*/rb_trace.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 disposable experiment bundle 中执行。实验结果必须来自实际文件写入、gate CLI 调用和 trace event；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# case-101-standard-pre-research-happy

## Expected Runtime Path

1. 创建 disposable bundle
2. 验证 bundle 结构
3. 写入 fixed HITL1 payload
4. 依次运行三个 gate：instantiation-complete → hitl1-recorded → setup-ready
5. 从 `rb_trace.jsonl` 裁决
6. Cleanup

---

## Case Goal

证明：对一个结构完整、HITL1 payload 已填写合法的 bundle，三个 pre-research gate 都能 pass，trace 中记录 3 个 `check` event 且全部 `passed: true`。

---

## Step 1: 创建 disposable bundle

创建一个 disposable experiment bundle。`new-disposable-bundle.mjs` 会生成 `dpt_disp_case-101_wff_happy_<hex>` 目录，内含完整的 control files 和 scaffold。

```bash
REPO_ROOT=$(pwd)
B=$(node experiments_env/shared/new-disposable-bundle.mjs wff_happy --case case-101 --force)
echo "Bundle: $B"
```

预期：bundle 目录创建成功，`$B` 指向完整路径。

## Step 2: 验证 bundle 初始结构

实例化后先跑 validate + inspect，确认 bundle 模板正确。

```bash
node DPT_FRAMEWORK/cli/validate-bundle.mjs $B
node DPT_FRAMEWORK/cli/inspect-bundle.mjs $B
```

预期：两个命令 exit 0，所有 control files ✓，所有 scaffold dirs ✓。

## Step 3: 写入 fixed HITL1 payload

模拟用户在 HITL1 阶段的完整回答。写入 `rb_profile.yaml`。

```bash
cat > $B/rb_profile.yaml << 'EOF'
plan_basename: wff_happy
research_profile: quick_factual
root_must_answer_set:
  - "What is the current state of AI safety research?"
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-06-21T00:00:00.000Z"
  hitl2:
    status: not_started
    answerability_class: not_assessed
    user_decision: not_started
    final_report_view: not_started
EOF
echo "=== Profile written ==="
grep -E 'research_profile|root_must_answer|status:|recorded_at' $B/rb_profile.yaml
```

展示：profile 中 `research_profile: quick_factual`、`root_must_answer_set` 非空、`hitl1.status: recorded`、`hitl1.recorded_at` 已填写。

## Step 4: Gate 1 — instantiation-complete

验证 bundle 创建完整：所有 control files 和 scaffold dirs 存在，bundle name 合法，status 值正确。

```bash
GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate instantiation-complete -- node DPT_FRAMEWORK/cli/gates/check-gate-instantiation-complete.mjs --bundle $B --current-node phases/phase-instantiation.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.recordCheck('$B/rb_trace.jsonl', { gate: 'instantiation-complete', passed: $PASSED, detail: 'happy path bundle validation' });
});
"
```

gate 返回的 JSON 关键字段：
- `check.passed` — 预期 `true`
- `check.next` — 预期 `phases/phase-hitl1.md`
- `routing.kind` — 预期 `next`

## Step 5: Gate 2 — hitl1-recorded

验证 HITL1 回答已记录到 profile：schema 合法、research_profile 不是 not_selected、must-answer 非空、HITL1 marker 已写入。

```bash
node DPT_FRAMEWORK/cli/advance-status.mjs --bundle $B --to hitl1_recorded
GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate hitl1-recorded -- node DPT_FRAMEWORK/cli/gates/check-gate-hitl1-recorded.mjs --bundle $B --current-node phases/phase-hitl1.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.recordCheck('$B/rb_trace.jsonl', { gate: 'hitl1-recorded', passed: $PASSED, detail: 'fixed HITL1 payload validation' });
});
"
```

gate 返回的 JSON 关键字段：
- `check.passed` — 预期 `true`
- `check.next` — 预期 `phases/phase-setup.md`

## Step 6: Gate 3 — setup-ready

验证 bundle 在进入 wave0 前的 structural consistency：control files 可解析、scaffold 存在、HITL1 已记录、basename 一致。

```bash
# setup-ready gate expects current_gate=setup_ready, next_gate=seed_topics_ready
cat > $B/rb_status.json << 'EOF'
{"current_mode":"execution","state":"in_progress","current_gate":"setup_ready","next_gate":"seed_topics_ready"}
EOF

# Write a clean rb_plan.md body — the setup-ready gate checks for required-fill markers.
# The template from new-disposable-bundle.mjs includes (待填充…) markers that must be replaced.
cat > $B/rb_plan.md << 'PLANEOF'
---
plan_basename: wff_happy
derived_topic_count: 1
topic_registry:
  - id: "topic-01"
    slug: "ai-safety"
    title: "AI Safety"
---

# Deep Research Plan: wff_happy

## Goal

### Purpose
Investigate the current state of AI safety research, including alignment techniques, regulatory frameworks, and frontier model risks.

### Research Questions
1. What are the most effective AI alignment techniques?

### Scope

**In scope:**
AI safety technical and regulatory dimensions.

**Out of scope:**
Science fiction scenarios, non-technical social impacts.

**待定：**
(待 HITL2 确认 — whether to expand to military AI safety)

## Topic Registry

| # | Slug | Title | Status |
|---|------|-------|--------|
| (由 Engine — 在 seed-topics materialization 后从 frontmatter topic_registry 生成) |

## Constraints

- **语言**：(待 HITL1 填充 — 仅中文源/中英混合/不限)
- **时间预算**：(待 HITL1 填充 — 默认不设硬 deadline)
- **地域**：(待 HITL1 填充 — 中国大陆/港澳台/海外)
- **方法**：open
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

GATE_OUTPUT=$(node experiments_env/shared/run-gate-with-monitor.mjs --bundle $B --gate setup-ready -- node DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs --bundle $B --current-node phases/phase-setup.md || true)
echo "$GATE_OUTPUT"
PASSED=$(echo "$GATE_OUTPUT" | node experiments_env/shared/extract-field.mjs check.passed)
node -e "
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.recordCheck('$B/rb_trace.jsonl', { gate: 'setup-ready', passed: $PASSED, detail: 'pre-wave0 structural consistency' });
});
"
```

gate 返回的 JSON 关键字段：
- `check.passed` — 预期 `true`
- `check.next` — 预期 `phases/phase-wave0.md`

## Step 7: 从 trace 裁决

所有 gate 已运行，trace 中应有 3 个 `check` event，全部 `passed: true`。

```bash
node -e "
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.verdict('$B/rb_trace.jsonl');
});
"
```


## Step 8: 结果解读

> 3 个 check，验证三个 pre-research gate 顺序 pass：
>   instantiation-complete → hitl1-recorded → setup-ready。全部 gate pass。


## Step HH: Post-Execution Health

Standard profile — gate diagnostics, timeline consistency.

```bash
node experiments_env/shared/verify-bundle-health.mjs --bundle $B --profile standard
```

> 健康检查不改变 verdict。health status 由 runner report 记录。

## Step 9: Cleanup

> PASS 才执行。FAIL 时保留 bundle 现场供排查。

```bash
node -e "
import('$REPO_ROOT/experiments_env/shared/wff-playbook-utils.mjs').then(m => {
  m.cleanup('$B');
});
"
```