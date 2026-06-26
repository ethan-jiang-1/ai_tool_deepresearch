## Why

`rb_plan.md` 名叫 plan，结构却是空的。当前 template 里只有两个中文占位符（`## Purpose` 和 `## Topic Registry`），Agent 不知道该把 HITL1 产出的 original topic 往哪放；Agent 实际写在了自创的 `## Original Topic` 和 `## Research Question` 下——header 不在 template 里，每次不一样。更根本的是：整个 body 没有任何 gate 检查——Agent 忘了写 plan 内容，JS 不知道、gate 不拦，直到 wave2 synthesis 才发现"没有 research question 可回答"。详见 `_backlog/todo-plan-hostfile-sections.md`。

## What Changes

- **Template 重写**：`rb_plan.md.tmpl` 从 2 个空占位符扩展为 6 个 section（`## Goal` / `## Topic Registry` / `## Constraints` / `## Progress` / `## Decisions`）。Section 按用途分层：Goal 是北星锚点（Agent 在 HITL1 写），Topic Registry 是人类可读的 table 视图，Constraints 给 sub-agent 读，Progress 留给 Engine 写（Phase 2），Decisions 是 append-only 决策链。Frontmatter 从 JSON 切 YAML——`parseMdFrontmatter()` 用 `parseYaml()` 实现，零代码改动（YAML 1.2 是 JSON 超集）
- **`setup-ready` gate 新增 2 条 body 检查**：`field_non_empty`（body 非空，防 Agent 忘了写）+ `pattern_match` negate（检测 `(待填充)` / `(尚无话题)` 占位符，防 Agent 没填模板）
- **不改任何现有逻辑**：`PlanSchema` frontmatter 字段不动、`readBundlePlan()` 不动、`parseMdFrontmatter()` 不动、所有其他 gate CLI 不动、`new-disposable-bundle.mjs` 不动（不走模板）、`instantiate-run-bundle.mjs` 只做 `{{name}}` 替换不动

## Capabilities

### New Capabilities

- `plan-hostfile-sections`: `rb_plan.md` body 从无结构自由文本变为有明确 ownership 的 6-section host file。Agent 知道往哪写（`## Goal`），sub-agent 知道从哪读边界（`## Constraints`），人和未来的 Agent 能追溯决策链（`## Decisions`），reground 有北星锚点。

### Modified Capabilities

- `schema-core`: `PlanSchema` frontmatter 字段不变，但 template 格式从 JSON 切 YAML。不影响 schema 验证逻辑。
- `research-wave-gate-implementation`: `gate-setup-ready` 新增 2 条 body 检查 rule（`plan_body_non_empty` + `plan_body_no_placeholder`）。不影响已有 rule。

## Impact

- `DPT_FRAMEWORK/rb_templates/rb_plan.md.tmpl` — 完整重写
- `DPT_FRAMEWORK/schema/gate_definitions/gate-setup-ready.definition.json` — 加 2 条 rule
- `DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs` — 加 file body 变体 `field_non_empty` + `pattern_match` handler
- 实验 playbook（~5 个 case）— 写 `rb_plan.md` body 时把 `## Purpose` 改为 `## Goal`（经 agent 调查，实际无 case 用 `## Purpose`，但部分 case 的 pre-seed body 需确认）
