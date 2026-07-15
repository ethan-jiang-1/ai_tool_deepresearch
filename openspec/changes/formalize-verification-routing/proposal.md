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
- 统一知识面与术语（VER-005）：三方法 taxonomy 的 canonical 定义唯一存在于 `verification-routing` main spec。`openspec/config.yaml` 测试分层节、`AGENTS.md`/`CLAUDE.md` 的 Test layering 规则、`guidelines/project-charter.md` 的目录职责行，在 apply 时改写为「资产归属事实 + 指向 verification-routing 的引用」，删除各自的完整三层复述；「第一/二/三层」序数命名退役，不再作为方法标识符。这是净简化：四处平行复述收敛为一处 authority + 三处 pointer。

## Capabilities

### New Capabilities

- `verification-routing`: change proof claims route to one of the three accepted verification methods, with explicit asset provenance, execution boundary, verdict authority, and deferred-state semantics.

### Modified Capabilities

- None.

## Impact

- Affected governance surfaces: `openspec/config.yaml`, `openspec/governance/`, active-change artifacts, and the requirement registry during apply.
- Affected knowledge surfaces (VER-005, apply-time rewording, no behavior change): `AGENTS.md` 与 `CLAUDE.md` 的 Test layering hard rule、`openspec/config.yaml` 测试分层节、`guidelines/project-charter.md` 目录职责表中的 tests/experiments 行——统一改为 canonical method identifiers + 指向 `verification-routing` 的引用。若不更新这些面，路由机制只存在于 governance 而未来 Agent 读到的仍是旧三层 prose，机制即失效——知识面传播是本 change 的一等目标，不是附带清理。
- Affected proof assets: `tests/integration/cli/rerun-round-continuity.test.mjs`, a new case playbook under `experiments_playbook/`, and the active runner manifest/readme that exposes that case.
- `DPT_FRAMEWORK/` runtime behavior, schemas, CLI contracts, bundle state, and package dependencies do not change; no framework version bump is required.
- Direct Source of Record for route selection is the change's `verification-plan.yaml`. It is planning authority only: regression exit status, trace JSONL verdicts, and selected production bundle facts remain the direct evidence authorities.
- Shortest legal loop: claim -> explicit route -> one validator for plan shape -> chosen real test path -> its native verdict. This removes the proposed fourth top-level suite and avoids a new universal runner, derived result registry, or fixture-to-Agent equivalence layer.
- Responsibility boundary: the user only selects a real production environment or accepts its risk when that method is needed; the Agent executes legal regression and controlled-playbook steps; governance checks route shape; Engine/CLI and trace retain deterministic verdict authority. A human-directed choice never converts fixture output into Agent or production evidence.

## Simplicity Admission Test（evolution-simple-reliable-control）

1. **最短合法闭环和直接 Source of Record 是什么？**
   闭环：claim → `verification-plan.yaml` 显式路由 → 一个只读 shape validator → 所选方法的真实测试路径 → 该路径的 native verdict。路由选择的 Source of Record 是 change-owned `verification-plan.yaml`（唯一新增 authority，owner 是 change 作者，reader 是 validator 与 apply/archive checks，随 change 归档失效）；证据 authority 不变——`node:test` exit、bundle trace JSONL、production bundle runtime facts。
2. **删除、合并或避免了哪份复杂度？**
   避免：顶层 `tests_e2e/` 第四层套件、混跑 Node tests 与 Agent playbooks 的 `test:all`、新 test runner、PASS/FAIL 聚合层、fixture 冒充 Agent 证据的等价层。删除/合并：四处平行的三层 prose 复述收敛为一处 canonical 定义 + 三处 pointer（VER-005）；「已勾选 task ≠ 资产存在」这条隐性记忆规则由 `--mode assets` 的确定性检查替代。净额：新增一个 plan 文件格式 + 一个只读 validator，换来一个第四层套件的永久避免和四处 drift 面的收敛。

## Helper Direction Review（evolution-helper-oriented-agent）

1. **哪个决定确实需要用户？**
   仅两类：为 `real_environment_e2e` 选定某个生产 bundle（`dpt_rb_*`）并接受在其上观察的风险；以及批准 proposal 中的路由选择本身（propose→apply 的既有 HITL 边界）。方法 taxonomy 判断、plan 文件编写、资产落点都是 Agent 在 accepted contract 内的机械/半机械工作，不推给用户。
2. **用户决定后哪些步骤立即回到 Agent？**
   写 plan、跑 `check-verification-routing.mjs` 两个 mode、编写 regression tests 与 playbook、登记 runner manifest、修复 validator 报出的路由错误并重跑同一 validator（same-check repair）。Validator 失败输出遵循 contract-lineage-aware 反馈形状：缺哪个 claim 字段/资产、写到哪个文件、重跑哪个命令——一个根因一个最近动作，不输出竞争性恢复路线。Validator 是只读 verdict，不是 permission：它不执行 playbook、不改 bundle、不把用户的路由批准转化为任何 mutation capability。
