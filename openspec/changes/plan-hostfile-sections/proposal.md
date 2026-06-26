## Why

`rb_plan.md` 名叫 plan，结构却是空的。当前 template 里只有两个中文占位符（`## Purpose` 和 `## Topic Registry`），Agent 不知道该把 HITL1 产出的 original topic 往哪放；Agent 实际写在了自创的 `## Original Topic` 和 `## Research Question` 下——header 不在 template 里，每次不一样。更根本的是：整个 body 没有任何 gate 检查——Agent 忘了写 plan 内容，JS 不知道、gate 不拦，直到 wave2 synthesis 才发现"没有 research question 可回答"。详见 `_backlog/todo-plan-hostfile-sections.md`。

> **Scope note：** 相对 `_backlog/todo-plan-hostfile-sections.md` 的 Phase 1 范围有所扩张——backlog 把 gate/engine/schema 改动划在 Phase 1 之外，本 change 基于 template 改写后的自然配套需求将它们拉入 Phase 1。详见 design.md Scope note。

## What Changes

- **提取 `stripMdFrontmatter()` 到 gate-helpers.mjs**：已在 wave2-complete 和 hitl2-recorded 中重复，setup-ready 是第 3 个 caller。同步更新 wave2 和 hitl2 使用新 helper。**一并统一 `pattern_match`**：所有 gate 对 `.md` 文件先 strip frontmatter 再匹配，去掉 `'g'` flag。
- **新增 `writePlanProgress()` 到 gate-helpers.mjs**：Engine 在 gate pass 后翻转 `## Progress` 的对应 checkbox（`- [ ]` → `- [x] <gate> (<ts>)`）。幂等。Phase 1 仅 `check-gate-setup-ready.mjs` 接入。保持 plan file 在长程 Agent 运行中的上下文"心跳"。
- **Template 重写**：`rb_plan.md.tmpl` 从 2 个空占位符扩展为 6 个 section（`## Goal` / `## Topic Registry` / `## Constraints` / `## Progress` / `## Decisions`），含 marker 约定（required-fill vs intentionally-allowed）。Frontmatter 从 JSON 切 YAML。
- **`phase-hitl1.md` §3a 指令更新**：指定 Agent 写入 `## Goal` section（含 `### Purpose`、`### Research Questions`、`### Scope`）。
- **`setup-ready` gate 新增 2 条 body 检查**：`plan_body_non_empty`（`field_non_empty`，body 非空）+ `plan_body_no_unfilled_marker`（`pattern_match` negate，检测 required-fill marker 前缀 `(待填充` 和 `(尚无话题`）。
- **更新 `new-disposable-bundle.mjs`**：从 `rb_plan.md.tmpl` 生成 plan body（YAML + 6 section），不再内联 JSON + 1 行 body。消除 disposable vs production 的模板分裂，让 placeholder FAIL 路径在 controlled E2E 可测。
- **`PlanSchema` frontmatter 字段、`readBundlePlan()`、`parseMdFrontmatter()` 均不改动**。

## Capabilities

### New Capabilities

- `plan-hostfile-sections`: `rb_plan.md` body 从无结构自由文本变为有明确 ownership 的 6-section host file。Agent 知道往哪写（`## Goal`），sub-agent 知道从哪读边界（`## Constraints`），人和未来的 Agent 能追溯决策链（`## Decisions`），reground 有北星锚点。

### Modified Capabilities

- `schema-core`: template 格式从 JSON 切 YAML，新增 `stripMdFrontmatter()` 函数（`parseMdFrontmatter()` 的逆操作）。`PlanSchema` frontmatter 字段不变。
- `research-wave-gate-implementation`: `gate-setup-ready` 新增 2 条 body 检查 rule（`plan_body_non_empty` + `plan_body_no_unfilled_marker`）。不影响已有 rule。

## Impact

| 文件 | 改动 |
|------|------|
| `DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` | 新增 `stripMdFrontmatter()` + `writePlanProgress()` |
| `DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs` | 用 helper 替换内联 strip；`pattern_match` 统一先 strip frontmatter |
| `DPT_FRAMEWORK/cli/gates/check-gate-hitl2-recorded.mjs` | 用 helper 替换内联 strip |
| `DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs` | 加 file body `field_non_empty` + `pattern_match` handler（含 negate）；gate pass 后调 `writePlanProgress()` |
| `DPT_FRAMEWORK/rb_templates/rb_plan.md.tmpl` | 完整重写（YAML + 6 section + marker 约定 + Progress checkboxes） |
| `DPT_FRAMEWORK/schema/gate_definitions/gate-setup-ready.definition.json` | 加 2 条 rule（`plan_body_non_empty` + `plan_body_no_unfilled_marker`） |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md` | §3a step 2 指令更新：指定写入 `## Goal` section |
| `DPT_FRAMEWORK/command_playbook/start-research.md` | Step 3 更新：`## Research Question` → `## Goal > ### Research Questions` |
| `experiments_env/shared/new-disposable-bundle.mjs` | `rb_plan.md` 从 template 生成（不再内联 JSON + 1 行 body） |
