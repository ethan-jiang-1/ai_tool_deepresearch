## 1. 注册 Requirement ID

- [x] 1.1 在 `openspec/governance/req-registry.yaml` 注册 WDC-001 到 WDC-008：`workflow-directory-contract` capability，缩写 WDC（Workflow Directory Contract）
  - WDC-001: Read-only framework assets boundary
  - WDC-002: Workflow node directory structure
  - WDC-003: Gate artifacts location and shape
  - WDC-004: Runtime bundle canonical structure
  - WDC-005: Test and experiment boundary
  - WDC-006: Naming conventions
  - WDC-007: Anti-mixing rules
  - WDC-008: Single canonical workflow package

## 2. 目录结构对齐

- [x] 2.1 实现 WDC-002: 确认 `DPT_FRAMEWORK/workflows/` 和 `DPT_FRAMEWORK/workflows/nodes/` 存在，创建 `nodes/phases/` 和 `nodes/shared/` 子目录（如果不存在）
- [x] 2.2 实现 WDC-003: 确认 `DPT_FRAMEWORK/schema/gate_definitions/` 目录存在
- [x] 2.3 实现 WDC-003: 确认 `DPT_FRAMEWORK/cli/gates/` 和 `DPT_FRAMEWORK/engine/gates/` 目录存在
- [x] 2.4 实现 WDC-005: 确认 `tests/engine/` 映射 `DPT_FRAMEWORK/engine/`，不存在则创建必要的 mirror 子目录

## 3. 治理文档更新

- [x] 3.1 实现 WDC-001: 检查 `guidelines/framework-runtime-boundary.md` 是否需要补充 `DPT_FRAMEWORK/workflows/`、`DPT_FRAMEWORK/schema/gate_definitions/`、`DPT_FRAMEWORK/cli/gates/` 的目录说明
- [x] 3.2 实现 WDC-001, WDC-007: 如果 guideline 缺少上述目录的说明，补充 framework-readonly 和 runtime-only 的边界规则

## 4. Review 验证

- [x] 4.1 对照 `_backlog/workflow/breakdown/00-directory-contract.md` 的 D00-A1 到 D00-A7 验收标准逐条检查
- [x] 4.2 对照 `_backlog/workflow/breakdown/90-review-checklist.md` 的 C90-7 到 C90-8c 目录检查项逐条检查
- [x] 4.3 确认 `_backlog/workflow/workflow-foundation-requirements.md` 第 7.3 节（Node Set）和第 8 节（Gate and CLI Contract）的 candidate paths 与本 contract 一致
- [x] 4.4 实现 WDC-004: 验证 spec 中 canonical bundle structure（`rb_plan.md`、`rb_profile.yaml`、`rb_status.json`、`rb_queue.json`、`rb_trace.jsonl`、`seed_topics/`、`reference/`、`artifacts/`、`final/`、`_cache/`）与 `DPT_FRAMEWORK/rb_templates/` 当前模板一致
- [x] 4.5 实现 WDC-006: 验证 6 种 artifact 命名约定（`phase-*.md`、`shared-*.md`、`gate-*.definition.json`、`check-gate-*.mjs`、`dpt_rb_*`、`exp_*`）与 breakdown、design 一致
- [x] 4.6 实现 WDC-008: 确认 `DPT_FRAMEWORK/workflows/manifest.json` 的 target location 被记录，v1 单 workflow package 决策无歧义

## 5. 收尾检查

- [x] 5.1 运行 `node openspec/governance/check-project-reqs.mjs` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）
- [x] 5.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）
