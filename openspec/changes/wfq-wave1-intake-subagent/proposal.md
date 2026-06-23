## Why

Wave1 现在是 foundation placeholder——只写 skeleton、标记 `capability: foundation-placeholder`、不做真正的 deepening。同时，wave0 虽然 task card 写了 `target: sub-agent`，但实际执行时 main-agent 自己调 WebSearch+WebFetch——`subagent-relay.mjs`（1066 行）的并行 slot 管理能力完全闲置，sub-agent 通信契约和目录结构早已定义好但从未被 workflow phase 使用。这个 change 一次性解决三个问题：把 wave1 升级为真正的 queue-driven deepening phase；把 `target` 改为 `targets`（controller/delegates 两层模型）；建立 queue + relay 桥接架构——queue 管 work list，relay 管并行 sub-agent slot 执行，`MAX_CONCURRENT_SUBAGENTS`（默认 4，-1 不限）控制并发，wave0/wave1/wave2 的 sub-agent 共性提炼到 `shared-subagent-protocol.md`，差异用参数表表达。

## What Changes

- **BREAKING**: `target` (单个 enum: `main-agent` / `sub-agent` / `engine`) 改为 `targets: { controller: 'main-agent' | 'engine', delegates?: { to: 'sub-agent', role_key, timeout_ms? } }`——改 QueueItemSchema、queue-manager.mjs、operate-queue.mjs、所有 phase MD 的 task card JSON 模板
- 重写 `phase-wave1.md` §3：从 foundation placeholder skeleton 升级为 queue-driven 三阶段，§3.2 引用 `shared-subagent-protocol.md` 批量并行执行协议 + 声明 wave1 参数表，产出 `artifacts/wave1/{topic}/evidence-summary.md`
- Retrofit `phase-wave0.md` §3：task card 模板 `target` → `targets`，§3.2 从串行 claim/complete 改为引用 shared protocol 批量并行执行
- 新增 `shared-subagent-protocol.md`（核心交付物）：定义 sub-agent 通信契约、目录结构（`_subagents/wave_NN/slot_MM/`，复用 `subagent-relay.mjs`）、批量并行执行协议（灌料→stage→并行 spawn→collect-as-return→补位→merge）、并发控制（`MAX_CONCURRENT_SUBAGENTS`，-1 不限）、参数化接口（wave0/wave1/wave2 差异用参数表表达，不重复写执行循环）
- Queue + relay 桥接：queue 管 work list，relay 管并行 slot 执行。Task card 通过 `targets.delegates` 映射为 relay SlotConfig，`stageSubagentSlots()` 创建 slot 目录，`ingestAgentReceipt()` + `commitSlotResult()` 验证和收集结果
- 新增 producer_rule `topic_deepening`（保持现有 `source_intake_fan_in` 和 `seed_topic_materialize` 不变）
- Wave1 gate 适配新产出路径（`evidence-summary.md` + backfill token 替换检查）
- 实验验证：wave1 batch-subagent playbook（3 级）+ wave0 happy-path 重跑（验证 relay 并行 dispatch 不退化）

## Capabilities

### New Capabilities

- `wave1-intake`: Wave1 topic-specific deepening via queue-driven three-stage execution。引用 `shared-subagent-protocol.md` 批量并行执行协议 + 声明 wave1 参数表。包含 per-topic evidence extraction、工具降级链、`__BACKFILL_*__` token 替换。

### Modified Capabilities

- `agentic-queue`: **BREAKING** — `target` 字段改为 `targets`（`{controller, delegates?}`）in QueueItemSchema。新增 producer_rule `topic_deepening`。`claim()` 和 `complete()` 的 advice 输出适配 targets 模型。Queue 在 sub-agent phase 中作为 work list（灌料 + receipt check），并行执行由 relay 负责。
- `subagent-dispatch`: 从"gate pass 触发 dispatch"扩展为"queue task card `targets.delegates` 触发 dynamic dispatch via `subagent-relay.mjs`"。新增 SUD-003：task card → SlotConfig 映射，`stageSubagentSlots()` 接收 custom dispatchMap，批量并行 spawn。
- `subagent-collect`: 从"gate pass 后 collect 所有 slot"扩展为"batch sub-agent 执行中 per-slot collect + `collectAndMergeSubagentResults()`"。`ingestAgentReceipt()` + `commitSlotResult()` 验证每个 sub-agent 结果。

## Impact

- **Schema**: `DPT_FRAMEWORK/schema/contracts/queue.mjs`（QueueItemSchema — `target` → `targets`，新增 TargetSpec schema，`delegates` 中 `noise_boundary` 改为 `timeout_ms`）
- **Engine**: `DPT_FRAMEWORK/engine/queue-manager.mjs`（`makeItem()`、`claim()`、`complete()` 适配 targets 模型）+ `DPT_FRAMEWORK/engine/subagent-relay.mjs`（首次被 workflow phase 调用——`stageSubagentSlots()` 接收 queue task 派生的 custom dispatchMap，`ingestAgentReceipt()` + `commitSlotResult()` + `collectAndMergeSubagentResults()` 构成 collect 流水线）
- **CLI**: `DPT_FRAMEWORK/cli/operate-queue.mjs`（`--target` flag → `--targets` JSON）
- **Phase MD**: `phase-wave1.md`（完整重写 §3，引用 shared protocol + 参数表）、`phase-wave0.md`（§3  retrofit，引用 shared protocol + 参数表）、`phase-seed-topics.md`（task card 模板 `target` → `targets`，不涉及 sub-agent）
- **Shared MD**: 新增 `shared-subagent-protocol.md`（通信契约、目录结构、批量并行执行协议、并发控制、参数化接口、Forbidden Authority）
- **Gate**: `check-gate-wave1-complete.mjs`（产出路径 + backfill token 检查）
- **Playbook**: 新增 `experiments_playbook/exp_agentic-queue-loop/` 下 3 个 wave1 batch-subagent playbook + 重跑 wave0 happy-path（验证 relay 并行 dispatch）
- **Registry**: `req-registry.yaml` 新增 AGQ-011~014、WAI-001~007、SUD-003
- **Tests**: `tests/engine/queue-manager.test.mjs` 新增 targets schema 测试
