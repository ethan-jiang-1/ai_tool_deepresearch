# Proposal: deepen-work-unit-submit-seams

来源：`_backlog/plans/drift-resync-locks-hygiene-and-work-unit-deepening.md`（C4，T1–T5；T6 可选缓期）。施工地图（函数级 carving map + 12 个不变量场景）见 design.md——它是本 change 的单一执行真相，全部函数名与行号区间经只读深挖逐行核verified（行号为 C2 前基线，执行期以函数名定位）。

## Why

`work-unit-submit.mjs`（2440 行）与 `work-unit-transaction.mjs`（838 行）外部接口已是深模块（6 个/5 个导出），但内部四条流（submit/late-submit/declaration-recovery/dry-submit 计划校验）共用 snapshot-durability 机制并互相穿插，且 transaction 内部存在机制↔inspect 的真实调用环。这是回归最易发的深水区，且外部 seam 缺崩溃注入级不变量测试（transaction 仅 5 个注入场景、submit 侧最危险的"queue save 后 commit 写入前"窗口无测试）。

## What Changes

- **T1（先行，零生产改动）**：新增 `tests/engine/work-unit-submit-invariants.test.mjs`，实现 S1–S12 十二个崩溃注入/幂等/争用不变量场景（利用既有 6 类注入点，见 design §S）。
- **T2**：提取 `engine/work-unit-submit-snapshot.mjs`（Module A，14 函数 + 4 个共享 durable-state 查询，~300 行）——共享查询必须同迁以保持无环。
- **T3**：提取 `engine/work-unit-submit-late-retry.mjs`（Module B，~610 行）；barrel `work-unit-core.mjs` 改从新模块导入（不得由 submit re-export，避免 submit↔late 循环）。
- **T4**：提取 `engine/work-unit-submit-declaration-recovery.mjs`（Module C，~470 行）；`work-unit-supersession.mjs` 的导入同步更新；recovery 对 trace/journal payload 的哈希绑定逐字节保留（S11 钉死）。
- **T5**：`work-unit-transaction.mjs` 拆三层——`work-unit-transaction-primitives.mjs`（~180）、`work-unit-transaction-projection.mjs`（~250）、主文件保留原名（~410：`withWorkUnitTransaction`/`recoverWorkUnitTransaction` + compat re-exports）；顺带 `sha256Bytes` 并入 `work-unit-utils.sha256`、`transactionRoot` 与 `work-unit-index.transactionDir` 统一（注意 path.resolve 语义差）。
- **T6（缓期）**：submit-plan 切分与 validateSubmitPlan/recovery 管线共享——行为敏感（recovery 零规范化严格性），需单独批准；本 change 不做。
- **不产出**：任何公开导出面变化（`work-unit-core`/`work-unit-index`/各模块对外导出逐一不变）；任何行为语义变化；`work-unit-lifecycle.mjs` 不动。

## Capabilities

### New Capabilities

（无。）

### Modified Capabilities

（无——公开接口与行为零变化，`skip_specs: true`。模块布局不是 requirement。）

## Capability Discovery

Evidence read：`engine/framework-engine` 与 `agent/delegated-work-units` 相关 main spec（C1 后版本）+ work-unit 模块全量 import/export 盘点（codemod 前后 grep 对照）。全部为 Excluded——纯内部布局搬动，无 requirement 变化、无新 capability。

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/delegated-work-units` | DEW-005/006/007/008/011/014/015/023 现行文本 + S1-S12 | Excluded | 行为不变：S1-S12 不变量网锁定 durable 语义，requirement 零变化 |
| `engine/framework-engine` | work-unit 模块导出面 grep 前后对照 | Excluded | 公开接口零变化；新模块为内部 seam |
| `engine/check-inspect-feedback` | CHI-004 现行文本 | Excluded | 五反馈面 shape 与恢复词汇不变 |

## Impact

- 新文件：4 个 engine 模块 + 1 个测试文件；修改：`work-unit-submit.mjs`（2440→~1030 行）、`work-unit-transaction.mjs`（838→~410）、`work-unit-core.mjs`、`work-unit-supersession.mjs`（1 行 import）、`work-unit-utils.mjs`（+sha256）、`work-unit-index.mjs`（路径 owner 统一）。
- 全量 `npm test`（2906）+ 新增 S1–S12 必须全绿；`git diff` 对每个生产文件显示纯搬动。
