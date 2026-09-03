# Proposal: Supersede Drops Inherited Retry Lineage On Fresh Successor Demand

## Why

`operate-work-unit supersede` 对**本身就是 retry-attempt（attempt_index ≥ 2）的已提交行**失败：
`buildSupersessionSuccessorDemand` 复制终端 queue item lineage 时只剔除 supersession 五个字段
（`withoutSupersessionLineage` 删除 `WORK_UNIT_SUPERSESSION_LINEAGE_FIELDS`），却**保留**了
`retry_of_work_id`/`retry_reason`/`attempt_index`。于是新的 supersession successor queue item
仍把自己的 retry 父链指回 attempt-1 的 work_id——而该父 work unit 属于**旧 queue_item_id**，
与新 successor 的 queue_item_id（`supersession-<work_id>`）不同；
`validateSuccessorRetryContinuation` 因此把父链判为缺失并抛
`retry lineage parent <work_id> is missing for supersession-<work_id>`。

影响：hollow/placeholder 或 hash-drifted 的 submitted 行若是 attempt-2 retry，无法走
submitted-drift 唯一合法出口 `supersede`（`Submitted attempts cannot be terminalized.`，
declaration-recovery 对 hash mismatch 是 no-op）→ 该行被卡死，Wave1 gate 规则无法通过。
来源：`_backlog/bugs/retry-attempt-supersede-lineage-edge.md`（含 follow-up i0034 hash-drift 实例）。

## What Changes

- **`buildSupersessionSuccessorDemand` 在构造 fresh supersession successor 时清除继承的 retry lineage**
  （`retry_of_work_id`、`retry_reason`、`attempt_index`）：supersession successor 是一次**全新的
  deepening demand（attempt 1 语义）**，不是对旧 queue item 上 attempt-1 的 retry 延续。
- **lineage 清理语义统一成"仅保留 supersession 直接父链 + 其余非 retry/supersession lineage"**：
  新增 retry lineage 字段常量（镜像 `WORK_UNIT_SUPERSESSION_LINEAGE_FIELDS`），由
  `buildSupersessionSuccessorDemand` 一并剔除。
- **不做**：不改 `validateSuccessorRetryContinuation` 的错误分类（它不是根因）；不改 supersede 的
  其它资格边界（attempt-1 supersede、terminalized/其它 status、ledger integrity 行为全部保持）。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `agent/agentic-queue`（AGQ-026）：MODIFIED —— 该 requirement 现文要求 fresh supersession
  successor "preserve each listed immutable contract and extension field, including ... non-supersession
  `lineage`"。需在 ADDED/MODIFIED delta 中明确：timeout-retry 延续 lineage
  （`retry_of_work_id`/`retry_reason`/`attempt_index`）**不**随 supersession 复制到 fresh successor；
  该 successor 是新的 deepening demand，retry-of 只能由 successor 自身后续 timeout 产生。

## Impact

- **代码**：`DEEP_RESEARCH_HARNESS/engine/work-unit-supersession.mjs`（`buildSupersessionSuccessorDemand`
  / `withoutSupersessionLineage` 及 lineage 字段清理）、可选 `DEEP_RESEARCH_HARNESS/schema/contracts/queue.mjs`
  （retry lineage 字段常量，若复用于校验方）。
- **测试**：`tests/engine/`（supersession lineage 构造 unit）、`tests/integration/cli/operate-work-unit.test.mjs`
  （supersede attempt-2 retry 行成功 + successor 无 retry lineage）。
- **不涉及**：无新依赖；无破坏性 schema 变更；不改 run bundle 现状（修复走既有 rerun/恢复路径）。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `agent/agentic-queue` | `openspec/specs/agent/agentic-queue/spec.md` AGQ-026（:952-990）要求 successor "preserve ... non-supersession `lineage`"；`work-unit-supersession.mjs` `buildSupersessionSuccessorDemand`(:313) 只剔除 supersession 字段 | Modify | AGQ-026 的字段保全条款未排除 timeout-retry 延续字段，与 fresh-successor 语义冲突；需在 delta 中 carve-out |
| `agent/delegated-work-units` | DEW-024 supersede 资格/relation 文本（spec :2150-2273）；bug 报告的 supersede 失败路径 | Verify-only | supersede 资格本身不排除 attempt_index ≥ 2；缺的只是 successor demand lineage 构造，属 AGQ-026 管辖 |
| `engine/schema-core` | `queueItemSnapshotHash`（engine/queue-manager-core.mjs）覆盖 lineage（snapshot hash 含 lineage 字段） | Verify-only | lineage 变更会改变 snapshot hash，successor 与 expected 同源构造，校验自洽 |
| `agent/work-unit-provenance-gate` | WPG-016 从 immutable supersession relation 推导 current submitted coverage | Excluded | 只消费 relation/leaf，不构造 successor demand；无行为变化 |

<!-- Source of authority: _backlog/bugs/retry-attempt-supersede-lineage-edge.md (root + follow-up i0034). -->
