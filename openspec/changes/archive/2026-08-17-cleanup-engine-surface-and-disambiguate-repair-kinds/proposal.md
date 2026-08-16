# Proposal: cleanup-engine-surface-and-disambiguate-repair-kinds

## Why

2026-08-16 的 coding-agent 视角全仓库体检（来源：`_backlog/plans/coding-agent-friendliness-review-remediation.md`，本 change 承接其 F-03、F-09~F-11、F-20~F-23）发现引擎代码存在四类可读性/单一真相源缺陷：(a) 死代码还活着（`esm-dirname.mjs`、`advice()`、`makeItem`、`rank()`、`OutputDeclarationLedgerRecord` 等），agent 改代码会被误导；(b) 「唯一真相源」教义被违反——`QueueHealth`/`StopAuthorizationState` 在 `schema/enums.mjs` 与 `queue-manager-core.mjs` 双定义、queue 由两套 schema 校验、`submitRerun` 重复实现；(c) CLI 路径魔法字符串 29 处硬编码；(d) god modules 无导航、四个 work-unit 投影模块边界不清。另有一处**同名歧义**：`repair_kind` 全仓库三套 closed enum 撞名（gate/phase 面、work-unit 面、file-observability 面），其中 `missing_contract` 在两套里语义不同——agent 看到 `repair_kind` 必须追 emitter 才能判断归属。本 change 把 file-observability 面字段改名 `repair_directive`，并给引擎加导航注释、retire 死代码、收敛真相源，**不改变任何运行行为**（唯一例外是 file-observability 反馈字段名的可观察重命名）。

## What Changes

- retire 死代码：`DEEP_RESEARCH_HARNESS/engine/esm-dirname.mjs`（删除模块及其自测）；`queue-manager-core.mjs:226` `advice()`、`queue-manager-lifecycle.mjs:557` `makeItem`、`queue-manager-window.mjs:16` `rank()`、`queue-manager-ledger.mjs:8` `OutputDeclarationLedgerRecord` 移除导出；`work-unit-repair-vocabulary.mjs` 的 `WORK_UNIT_REPAIR_KINDS`/`REPAIR_KIND_CLI_VERB` 头注释标注为「测试锁定专用导出」。（F-09）
- 真相源收敛：`queue-manager-core.mjs` 本地 `QueueHealth`/`StopAuthorizationState` 改 import `schema/enums.mjs`；`QueueStateSchema` 与 `contracts/queue.mjs` `QueueSchema` 的差异显式注释或合一；`submitRerun` 两处重复实现合一。（F-10）
- CLI 路径常量化：29 处硬编码 `DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs`/`operate-queue.mjs` 收敛到常量表（`work-unit-constants.mjs` 或 utils 导出）。（F-11）
- 导航契约（纯注释，零行为变更）：god modules 加文件头契约注释 + section banner（`work-unit-submit.mjs` 2446 行、`work-unit-lifecycle.mjs`、`work-unit-supersession.mjs`、`consistency-validator.mjs`、`work-unit-validation.mjs`、helpers 的 `canonical-topic-state.mjs`、`gate-helpers-core.mjs`、`wave-depth-contracts.mjs`、`gate-helpers-checks.mjs`、`artifact-persistence.mjs`、`wave-contract-evaluators.mjs`、`handoff-helpers.mjs`、`return-map.mjs`、`file-observability.mjs`）；四个投影模块（`work-unit-projection` / `candidate-projection` / `current-profile` / `attempt-disposition`）与 `work-unit-assignment-contract.mjs` 各加一句「输入→输出→谁消费」头注释。（F-20/F-21）
- 消歧：`engine/helpers/file-observability.mjs` 发射的反馈字段 `repair_kind` → `repair_directive`（6 值不变），消费点 `cli/check-reentry.mjs` 同步；`bundle/file-observability` spec ADDED 命名 requirement 锁定该字段名，配 drift 测试。（F-22）
- `CONTEXT.md`：:58 work-unit 面权威指针补 `engine/work-unit-repair-vocabulary.mjs`；:59 file-observability 面枚举同步为 `repair_directive`；加 C-series（C2/C3/C5）展开小节（各自是什么 event/checkpoint、owner spec 指针）。（F-03/F-23）

无 **BREAKING** 变更（唯一可观察变更是 file-observability 反馈字段名，由其 spec 与 drift 测试锁定；gate/phase 面与 work-unit 面的 `repair_kind` 保持不变）。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `bundle/file-observability`: ADDED 一条 requirement——file-observability 反馈字段名 SHALL 为 `repair_directive`（6 值封闭枚举不变），与 gate/phase 面、work-unit 面的 `repair_kind` 显式区分。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `bundle/file-observability` | `openspec/specs/bundle/file-observability/spec.md:192`（「不得发射两个竞争 repair action」语义未命名字段）、`engine/helpers/file-observability.mjs:559,599,619,635,692,714`（发射 `repair_kind`）、`cli/check-reentry.mjs`（唯一消费点） | Modify | 字段名需 spec 锁定以实现三套枚举消歧 |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` | Verify-only | F-09/F-10/F-11 是引擎内部实现细节，work-unit 面 `repair_kind`（10 值）不变 |
| `agent/agentic-queue` | `openspec/specs/agent/agentic-queue/spec.md` | Verify-only | queue-manager enum 收敛是内部实现，queue 行为不变 |
| `agent/agent-context-routing` | `openspec/specs/agent/agent-context-routing/spec.md` | Verify-only | CONTEXT.md 只改术语指针与 C-series 展开，路由不变 |
| `engine/check-inspect-feedback` | `openspec/specs/engine/check-inspect-feedback/spec.md` | Verify-only | gate/phase 面 `repair_kind`（5 值）不变，只做导航注释 |
| `engine/transition-table` | `openspec/specs/engine/transition-table/spec.md` | Verify-only | 不涉及 chain 行为 |
| `research/canonical-topic-state` | `openspec/specs/research/canonical-topic-state/spec.md` | Verify-only | `canonical-topic-state.mjs` 只加头注释 |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | 新增静态断言测试属既有 integration 类 |

## Impact

- 修改：`engine/` 多个模块（retire/收敛/注释）、`engine/helpers/file-observability.mjs` + `cli/check-reentry.mjs`（字段改名）、`CONTEXT.md`、`bundle/file-observability` 主 spec（delta sync）。
- 删除：`engine/esm-dirname.mjs`、`tests/engine/esm-dirname.test.mjs`。
- 新增：drift 测试（`tests/integration/md/`、`tests/engine/`）：死导出零引用、file-observability 字段名、CONTEXT 指针。
- 无依赖、API、CLI 行为、schema、gate 变更（`repair_directive` 是 file-observability 诊断字段的重命名）。

## 简化与责任边界

- **Direct Source of Record**：枚举以 `schema/enums.mjs` 为唯一真相源（engine import 之）；CLI 路径以常量表为唯一真相源；file-observability 字段名以 `bundle/file-observability` spec 为 owner；`repair_kind` 三套枚举以各自 owner 为准（CONTEXT.md 显式区分）。
- **Net simplification**：删 6 处死导出、删 1 个死模块、删 1 处重复 helper、删 29 处魔法字符串、消 1 处同名歧义；新增仅导航注释与 3 个只读 drift 测试。
- **Semantic-precision reflection**：唯一新具名符号是 `repair_directive`——读者是有界问题「这个反馈属于 file-observability 面还是 work-unit 面」；必须保留的区别：file-observability 面的 6 值枚举语义不变，仅字段名与另两面区分；正常推理停止点：看到 `repair_kind` 即 work-unit/gate 面，看到 `repair_directive` 即 file-observability 面，不引入新状态。
- **责任边界**：不改变任何 Engine/CLI 行为或 authority；file-observability 改名是诊断字段名，不触碰 gate/phase 与 work-unit 面的 `repair_kind`。
