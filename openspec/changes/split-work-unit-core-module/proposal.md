## Why

`DPT_FRAMEWORK/engine/work-unit-core.mjs` 已增长到 2311 行（来源：`wc -l DPT_FRAMEWORK/engine/work-unit-core.mjs`），是 `DPT_FRAMEWORK/engine/` 下唯一超过 1000 行的模块。该文件混合了常量定义、工具函数、索引 CRUD、ID 分配、envelope/prompt 生成、提交校验、事务管理、检查诊断等至少 8 个职责域，缺乏内部边界。每次修改任意一个子系统（如 cache 校验、receipt 验证）都需要在同一个巨型文件中定位，且无法独立测试子职责。拆分为 7 个 125-530 行的子模块后，每个文件职责单一、可独立理解、依赖方向明确（单向无环）。

## What Changes

- 将 `DPT_FRAMEWORK/engine/work-unit-core.mjs`（2311 行）的内容按职责域迁移到 7 个新子模块，均在 `DPT_FRAMEWORK/engine/` 下
- 原文件变为 re-export barrel：仅保留 import + re-export 语句，对外 API 面不变
- 约 10-15 个此前 `function`（未 export）的内部函数改为 `export function`，供子模块间调用；barrel 不 re-export 这些内部函数
- 子模块间依赖形成单向无环图：`constants ← utils ← index ← envelope ← {validation, lifecycle} ← submit`；`inspect ← index`

不产出：

- 不新增、不修改、不删除任何功能行为 — 纯代码搬迁
- 不修改 schema（`../schema/contracts/work-unit.mjs`）中的任何类型或校验
- 不修改 CLI 接口（`DPT_FRAMEWORK/cli/operate-work-unit.mjs` 的 import 路径不变）
- 不新增 npm 依赖，不使用任何 `node:` 内置模块之外的 API
- 不修改 `tests/` 下任何测试文件的 import 路径
- 不修改 `experiments_env/` 下任何文件的 import 路径

## Capabilities

### New Capabilities

（无。纯模块拆分，不引入新 capability，不需要新 requirement ID。）

### Modified Capabilities

（无。需求级行为不变，现有 `delegated-work-units` spec 中的所有 SHALL/MUST 无需修改。）

## Impact

- 新增文件（7 个子模块，均在 `DPT_FRAMEWORK/engine/` 下）：
  - `work-unit-constants.mjs` — 常量定义（~125 行）
  - `work-unit-utils.mjs` — 工具函数与 trace wrapper（~270 行）
  - `work-unit-index.mjs` — 索引 CRUD、ID 分配、事务（~290 行）
  - `work-unit-envelope.mjs` — manifest/beacon/task/spawn 生成（~300 行）
  - `work-unit-validation.mjs` — 提交校验（~360 行）
  - `work-unit-lifecycle.mjs` — 创建/claim/close（~430 行）
  - `work-unit-submit.mjs` — 提交流程与 ledger（~530 行）
  - `work-unit-inspect.mjs` — 检查诊断（~250 行）

- 修改文件（1 个）：
  - `DPT_FRAMEWORK/engine/work-unit-core.mjs` — 从 2311 行缩减为 ~30 行 re-export barrel

- 零破坏消费者（12 个，import 路径不变）：
  - `DPT_FRAMEWORK/cli/operate-work-unit.mjs`
  - `DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs`
  - `tests/engine/work-unit-core.test.mjs`
  - `tests/engine/work-unit-submit.test.mjs`
  - `tests/engine/work-unit-claim.test.mjs`
  - `tests/engine/work-unit-terminal.test.mjs`
  - `tests/engine/work-unit-test-helpers.mjs`
  - `tests/schema/verify-bundle-health.test.mjs`
  - `tests/integration/cli/operate-work-unit.test.mjs`
  - `experiments_env/shared/verify-bundle-health.mjs`
  - `experiments_env/shared/work-unit-playbook-utils.mjs`
  - `experiments_env/shared/run-fixture-backed-case.mjs`

- 回归验证：
  - `node --test tests/engine/` — 单元测试
  - `node --test tests/schema/` — schema 测试
  - `node --test tests/integration/` — 集成测试

- 版本：无需 bump（纯内部重构，无行为变更）
