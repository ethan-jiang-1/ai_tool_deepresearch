## Why

> **触发来源**：`_backlog/plans/tests-e2e-layer.md`。该计划正确指出了确定性 Engine 与非确定性 Agent 行为不能混测，但把它表达成顶层 `tests_e2e/` 第四层，和项目当前已接受的三种验证手段及“所有回归测试位于 `tests/`”的边界发生冲突。

目前缺少的不是又一个测试 runner，而是一条从 change 的证明主张到测试资产、执行环境和 verdict authority 的明确路由。结果是：确定性跨 phase 场景可能被昂贵 playbook 覆盖，Agent 行为可能被 fixture 假装覆盖，真实环境 E2E 又没有被诚实地记录为 deferred。`seed-backfill-round-continuity` 还暴露了这个问题：其 task 10.7 已标记为完成，但引用的 `experiments_playbook/exp_rerun-round-continuity/` 事实上不存在；现有 round-continuity integration test 主要手写状态并自行过滤，未形成真实 CLI consumer 的证明。

## What Changes

- 新增 `verification-routing` capability，定义三条互斥的验证方法：`regression`、`controlled_e2e`、`real_environment_e2e`。Unit、integration 和跨 phase CLI scenario 是 regression 内部粒度，不是第四条方法。
- 为每个后续 change 引入 change-owned 的 `verification-plan.yaml`：按证明主张声明所选方法、允许的资产、production distance、verdict authority，以及未选或 deferred 方法的理由。
- 新增一个窄的 OpenSpec governance validator，只校验 plan 的方法/资产/claim 映射和引用路径；它不运行 Agent、不重写 playbook、不记录 PASS，也不成为测试结果 authority。
- 将验证选择接入 proposal、apply 前检查和 archive 前检查：作者先显式选择证明路径，Agent 再执行已选择的机械测试，最终结果仍分别来自 `node:test` exit、disposable bundle 的 trace JSONL 或真实 production bundle 的 runtime facts。
- 以 rerun round continuity 作为首个路由实例：确定性 direction/eligible-row/per-row-authority 断言进入 `tests/integration/cli/` 的真实 CLI scenario；Agent 写方向和崩溃恢复进入一个真实 Agent 驱动的 controlled E2E playbook；真实环境验证保留为显式 deferred 观察，不由 fixture 或 playbook 冒充。
- 纠正 backlog 的落点：不创建顶层 `tests_e2e/`，不添加把 Node tests 与 Agent playbooks 混跑的 `test:all`，也不把 `README.md` 当作 runnable playbook。已标记但不存在的 rerun playbook 必须在新 route 的实际资产落地后以真实证据重新核对。

## Capabilities

### New Capabilities

- `verification-routing`: change proof claims route to one of the three accepted verification methods, with explicit asset provenance, execution boundary, verdict authority, and deferred-state semantics.

### Modified Capabilities

- None.

## Impact

- Affected governance surfaces: `openspec/config.yaml`, `openspec/governance/`, active-change artifacts, and the requirement registry during apply.
- Affected proof assets: `tests/integration/cli/rerun-round-continuity.test.mjs`, a new case playbook under `experiments_playbook/`, and the active runner manifest/readme that exposes that case.
- `DPT_FRAMEWORK/` runtime behavior, schemas, CLI contracts, bundle state, and package dependencies do not change; no framework version bump is required.
- Direct Source of Record for route selection is the change's `verification-plan.yaml`. It is planning authority only: regression exit status, trace JSONL verdicts, and selected production bundle facts remain the direct evidence authorities.
- Shortest legal loop: claim -> explicit route -> one validator for plan shape -> chosen real test path -> its native verdict. This removes the proposed fourth top-level suite and avoids a new universal runner, derived result registry, or fixture-to-Agent equivalence layer.
- Responsibility boundary: the user only selects a real production environment or accepts its risk when that method is needed; the Agent executes legal regression and controlled-playbook steps; governance checks route shape; Engine/CLI and trace retain deterministic verdict authority. A human-directed choice never converts fixture output into Agent or production evidence.
