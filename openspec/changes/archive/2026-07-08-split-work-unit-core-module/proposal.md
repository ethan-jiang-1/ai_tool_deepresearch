## Why

`DPT_FRAMEWORK/engine/work-unit-core.mjs` 已增长到 2311 行（来源：`wc -l DPT_FRAMEWORK/engine/work-unit-core.mjs`），是 `DPT_FRAMEWORK/engine/` 下唯一超过 1000 行的模块。该文件混合了常量定义、工具函数、索引 CRUD、ID 分配、envelope/prompt 生成、提交校验、事务管理、检查诊断、ledger 读写等至少 8 个职责域，缺乏内部边界。每次修改任意一个子系统（如 cache 校验、receipt 验证）都需要在同一个巨型文件中定位，且无法独立测试子职责。拆分为 8 个 100-470 行的子模块后，每个文件职责单一、可独立理解、依赖方向明确（单向无环）。同时将 276 行的 `tests/engine/work-unit-core.test.mjs` 按相同边界拆分为 3 个测试文件，使测试与源模块一一对应。

## What Changes

- 将 `DPT_FRAMEWORK/engine/work-unit-core.mjs`（2311 行）的内容按职责域迁移到 8 个新子模块，均在 `DPT_FRAMEWORK/engine/` 下
- 原文件变为 re-export barrel：仅保留 import + re-export 语句，对外 API 面不变
- 约 10-15 个此前 `function`（未 export）的内部函数改为 `export function`，供子模块间调用；barrel 不 re-export 这些内部函数
- 子模块间依赖形成单向无环图：`constants ← utils ← index ← envelope ← lifecycle ← submit`；`validation ← utils, index`；`inspect ← utils, index`
- `readWorkUnitLedgerRows`、`computeWorkUnitLedgerRecordHash`、`findSubmittedLedgerRow` 从 submit 模块移至 utils 模块（纯读函数，submit 和 inspect 共用），消除 inspect 对 submit 的不必要依赖
- `validateCacheTrailContent` 从 validation 模块移至 utils 模块（纯校验函数，validation 和 inspect 共用），消除 inspect 对 validation 的不必要依赖
- 将 `tests/engine/work-unit-core.test.mjs`（276 行）按 3 个 describe block 拆分为 `work-unit-index.test.mjs`、`work-unit-lifecycle.test.mjs`、`work-unit-inspect.test.mjs`，与源模块边界对齐

不产出：

- 不新增、不修改、不删除任何功能行为 — 纯代码搬迁
- 不修改 schema（`../schema/contracts/work-unit.mjs`）中的任何类型或校验
- 不修改 CLI 接口（`DPT_FRAMEWORK/cli/operate-work-unit.mjs` 的 import 路径不变）
- 不新增 npm 依赖，不使用任何 `node:` 内置模块之外的 API
- 不修改任何消费者的 import 路径（barrel 保留原路径）
- 不修改已独立的测试文件：`work-unit-claim.test.mjs`、`work-unit-submit.test.mjs`、`work-unit-terminal.test.mjs`（已按职责拆分，无需变更）

## Capabilities

### New Capabilities

（无。纯模块拆分，不引入新 capability，不需要新 requirement ID。）

### Modified Capabilities

（无。需求级行为不变，现有 `delegated-work-units` spec 中的所有 SHALL/MUST 无需修改。）

## Impact

- 新增文件（8 个子模块，均在 `DPT_FRAMEWORK/engine/` 下）：
  - `work-unit-constants.mjs` — 常量定义（~125 行）
  - `work-unit-utils.mjs` — 工具函数、trace wrapper、ledger 读函数、cache 内容校验（~330 行）
  - `work-unit-index.mjs` — 索引 CRUD、ID 分配、事务（~290 行）
  - `work-unit-envelope.mjs` — manifest/beacon/task/spawn 生成（~300 行）
  - `work-unit-validation.mjs` — 提交校验（~340 行）
  - `work-unit-lifecycle.mjs` — 创建/claim/close（~430 行）
  - `work-unit-submit.mjs` — 提交流程与 ledger 写入（~470 行）
  - `work-unit-inspect.mjs` — 检查诊断（~250 行）

- 新增测试文件（3 个，均在 `tests/engine/` 下）：
  - `work-unit-index.test.mjs` — `work_id parsing and binding` describe block（~90 行）
  - `work-unit-lifecycle.test.mjs` — `work-unit index and envelope` describe block（~90 行）
  - `work-unit-inspect.test.mjs` — `work-unit inspect` describe block（~100 行）

- 修改文件（2 个）：
  - `DPT_FRAMEWORK/engine/work-unit-core.mjs` — 从 2311 行缩减为 ~30 行 re-export barrel
  - `tests/engine/work-unit-core.test.mjs` — 删除（内容迁移至上述 3 个新测试文件）

- 零破坏消费者 — import 路径不变（21 个文件：14 JS/mjs + 7 MD playbook）：
  - **JS/mjs (14)**：`DPT_FRAMEWORK/cli/operate-work-unit.mjs`、`DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs`、`tests/engine/work-unit-claim.test.mjs`、`tests/engine/work-unit-submit.test.mjs`、`tests/engine/work-unit-terminal.test.mjs`、`tests/engine/work-unit-test-helpers.mjs`、`tests/schema/verify-bundle-health.test.mjs`、`tests/integration/cli/operate-work-unit.test.mjs`、`experiments_env/shared/verify-bundle-health.mjs`、`experiments_env/shared/work-unit-playbook-utils.mjs`、`experiments_env/shared/run-fixture-backed-case.mjs`、`tests/engine/work-unit-index.test.mjs`（新增）、`tests/engine/work-unit-lifecycle.test.mjs`（新增）、`tests/engine/work-unit-inspect.test.mjs`（新增）
  - **MD playbook (7)**：`experiments_playbook/exp_wfn_wave0/case-212-*.md`、`case-213-*.md`、`exp_wfn_wave1/case-222-*.md`、`exp_wfn_wave2/case-233-*.md`、`exp_wff_wave-chain/case-152-*.md`、`case-153-*.md`、`exp_evidence-extraction/case-163-*.md`

- 回归验证：
  - `node --test tests/engine/` — 单元测试（含拆分后的新测试文件）
  - `node --test tests/schema/` — schema 测试
  - `node --test tests/integration/` — 集成测试

- 版本：无需 bump（纯内部重构，无行为变更）
