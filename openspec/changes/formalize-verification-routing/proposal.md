## Why

> **触发来源**：`_backlog/plans/tests-e2e-layer.md`。该计划正确指出确定性 Engine 与非确定性 Agent 行为不能混测，但把差异表达成新的 repo-top-level `tests_e2e/` surface，和项目当前“所有 JS-led tests 位于 `tests/`”的边界冲突。

目前缺少的不是又一个 runner，而是一条从 change 的证明主张到 `test_class`、`proof_subject`、资产边界、execution profile 和 native verdict authority 的明确路由。结果是：确定性跨 phase 场景被迫依赖代价高、低频执行的 Markdown playbook，日常 JS suite 看不到长链状态组合与异常恢复；subject-Agent 行为又可能被 fixture 假装覆盖。`seed-backfill-round-continuity` 还暴露了一个已发生故障：task 10.7 被勾选，但引用的 `agent_flow_e2e` 资产不存在；现有 round-continuity `integration` test 主要手写状态并自行过滤，也没有消费真实 CLI output。

## What Changes

- 新增 `verification-routing` capability，只定义一套 normative taxonomy：`unit`、`integration`、`deterministic_e2e`、`agent_flow_e2e` 四类 tests。前三类位于 `tests/` 并由 JS 驱动；后一类位于 `experiments_playbook/`，由 coding Agent 执行 Markdown playbook。`regression`、`controlled E2E`、cost、actor 和 bundle 类型都不再成为平行分类字段。
- 为本 change 及其后新建的 change 引入 change-owned `verification-plan.yaml`，按证明主张声明 canonical `test_class`、资产、execution profile 和 native verdict authority；四类测试均须声明为 `selected` 或 `not_applicable`。执行机制由 test class 唯一推导，不在 plan 中重复存储。
- 新增一个窄的 repo-governance checker。它使用 strict Zod contract 校验 plan shape、跨字段 route mapping、路径边界和 selected asset registration；它不运行测试或 playbook，不记录 PASS/FAIL，也不成为 execution evidence authority。
- 通过 `openspec/config.yaml` 规则和每个 change 的 apply/archive tasks 接入该 checker。该接入是 repo lifecycle discipline，不伪装成 OpenSpec CLI 原生 artifact gate；标准 `openspec status/validate` 仍只认识 schema-declared artifacts。
- 以 rerun round continuity 作为首个 route：focused helper 与 CLI checks 分别进入 `unit` 和 `integration`；新增 `tests/e2e/` 作为 `deterministic_e2e` boundary，由 JS driver 模拟 Markdown/Agent-owned 文件动作并串联真实 CLI/gate/transition/trace；subject Agent 写 direction 并恢复受控 interruption 则进入 `agent_flow_e2e`，在真实 `dpt_disp_*` disposable run bundle 上执行，PASS 后清理、FAIL 或 health issue 时保留现场。
- 明确不在本 change 内实现 backlog 场景 6 的 per-row projection-authority checker。当前没有可复用的 accepted Engine/CLI contract，而本 change 不修改 `DPT_FRAMEWORK/`；该场景需要单独的 behavior change，不能在 test 中重写一份假 checker。
- 不创建 repo 顶层 `tests_e2e/`；JS-led 长链 proof 放在现有 `tests/` authority 下的 `tests/e2e/`。不添加混跑 `node_test` 与 `markdown_playbook` 的 `test:all`，不把 README 或勾选的 task 当成 runnable proof asset。
- 统一知识面术语（VER-005）：canonical taxonomy 最终只存在于 accepted `verification-routing` main spec；其他知识面只保留各自拥有的资产边界事实和 pointer，不复制 route matrix、plan schema 或 validator behavior。

## Capabilities

### New Capabilities

- `verification-routing`: change proof claims route through one of four canonical test classes with explicit proof subject, asset provenance, execution profile, verdict authority, and selected/not-applicable semantics.

### Modified Capabilities

- `workflow-directory-contract`: update WDC-005 from its incomplete two-class JS boundary to the four canonical test classes and owned directories.

## Impact

- New governance assets: `openspec/governance/verification-routing-contract.mjs`, `openspec/governance/check-verification-routing.mjs`, a focused parser unit test under `tests/governance/`, and checker CLI/asset integration coverage under `tests/integration/governance/` during apply.
- Existing test convergence: move the governance-check, gate-monitor, and bundle-health subprocess suites under `tests/integration/`; split production-CLI scenarios out of the mixed queue-manager and research-style unit files; and add a narrow knowledge-surface contract so current repository assets and future guidance obey the same behavior-first classification.
- Change-planning assets: change-owned `verification-plan.yaml`, apply evidence, canonical VER summaries in `openspec/governance/req-registry.yaml`, and lifecycle rules in `openspec/config.yaml`.
- Rerun proof assets: focused `tests/integration/cli/rerun-round-continuity.test.mjs`, deterministic long-chain `tests/e2e/rerun-round-continuity.test.mjs`, `tests/e2e/README.md`, and real-Agent `experiments_playbook/exp_wfn_rerun/case-318-heavy-rerun-direction-recovery.md` with exact active `RUN_EXPS.md` registration.
- Knowledge surfaces: `AGENTS.md`, `CLAUDE.md`, root/test/experiment README files, the runner's cost summary, `guidelines/project-charter.md`, and the nearest command-experiment navigation guidance. These retain only owned boundary facts plus a pointer; experiment entry surfaces also converge on the existing cost definition so a real-Agent case can be `heavy` without external calls.
- Accepted-spec convergence: the WDC-005 delta aligns the structurally incomplete test-boundary requirement found by the `openspec/specs/` terminology audit. AGT-010 remains unchanged: its optional heavy canary rule is capability-specific, while this change independently selects case-318 as an acceptance-critical `agent_behavior` claim. Ordinary end-to-end prose and controlled-E2E descriptions remain compatible aliases rather than rewritten identifiers.
- Historical/source reconciliation: annotate `_backlog/plans/tests-e2e-layer.md` only after replacement proof executes; reconcile `seed-backfill-round-continuity` task 10.7 only from the new case's native trace evidence.
- `DPT_FRAMEWORK/` behavior, schema, CLI, bundle state, dependencies, and version do not change. No framework version bump is required.
- Direct Source of Record for route selection is the change's `verification-plan.yaml`; native evidence remains `node_test_exit` for JS-led classes and `trace_jsonl` for `agent_flow_e2e`.
- Shortest legal loop: claim -> plan route -> one read-only route checker -> selected real execution path -> native verdict. No universal runner, result registry, parallel taxonomy, or fixture-to-subject-Agent equivalence layer is added.
- Responsibility boundary: the coding Agent writes the plan and executes the selected assets; repo governance checks route shape; Engine/CLI/`node_test_exit`/`trace_jsonl` retain deterministic verdict authority; `subject_execution` and `verdict_judge` preserve actor/judge provenance. A future live-production observation is separately scoped execution distance, not another test class.

## Simplicity Admission Test（evolution-simple-reliable-control）

1. **最短合法闭环和直接 Source of Record 是什么？**
   claim -> `verification-plan.yaml` -> static route check -> selected test/playbook path -> native verdict。Plan 只拥有 route intent；它不保存 execution result。
2. **删除、合并或避免了哪份复杂度？**
   避免 repo 顶层 `tests_e2e/`、平行 taxonomy、混合 runner、PASS 聚合层和 fixture-as-subject-Agent 等价层；将 `deterministic_e2e` 收入现有 `tests/` authority；将散落的 taxonomy prose 收敛为一处 authority + 短 pointer；将“记得核对资产是否存在/注册”替换为一个只读 checker。不新增 runtime state 或 Agent Flow controller。

## Helper Direction Review（evolution-helper-oriented-agent）

1. **哪个决定确实需要用户？**
   当前 acceptance 没有额外用户决定；Route 编写、静态检查、JS-led classes 和 disposable-bundle `agent_flow_e2e` 执行由 coding Agent 完成。未来若另行要求 live-production observation，再单独确认对象、成本与风险。
2. **用户决定后哪些步骤立即回到 Agent？**
   coding Agent 仅在新 scope 明确授权后读取相应 runtime 事实；该授权不改变本 change 的四类 `test_class` taxonomy，也不允许 fixture 或 disposable bundle 被扩大解释为 live-production evidence。
