# research-wave-phase-content

> req: RWP-001

## MODIFIED Requirements

### Requirement: Wave0 phase body completeness

`phase-wave0.md` SHALL 包含完整的 9-section body，引导 Phase Agent 产出 foundation shared reference evidence。§3 Allowed Actions SHALL 采用 queue-driven 三阶段模式。

Section 内容要求：

- **Stage Goal**: 搜集少量真实 shared reference，创建结构化 metadata 并更新 index/status/trace。单个 topic 内至少达到 foundation floor 的 reference 数量
- **Required Inputs**: 已通过 `seed-topics-ready` gate 的 active bundle（`seed_topics/` 已物化）、`shared-profile.md`、`shared-schemas.md`、`rb_plan.md` 中的 `topic_registry`
- **Allowed Actions** (§3) — 三阶段 queue-driven 模式：

  **§3.1 灌料 (Filling)** — 首次进入 wave0，如果 queue 为空（`operate-queue check <bundle>` 返回空）：
  - 读取 `rb_plan.md` frontmatter 的 `topic_registry`
  - 为每个 topic 创建 task card JSON 文件（含 work_id, title, `targets`（`controller: "main-agent"` + `delegates.to: "sub-agent"` wire values）, action（含 WebSearch + WebFetch 指令）, producer_rule: source_intake_fan_in, priority_class: P5_new_reference_intake, required_receipts, done_condition, completion_receipt 等完整字段）
  - 使用 `operate-queue enqueue <bundle> --task <task.json>` 逐个灌入
  - 灌料完毕后跑 `operate-queue check <bundle>` 确认 queue_health: ready 且 active_window 已填充

  **§3.2 Queue-driven 执行循环**：
  - Step 1 claim: `operate-queue claim <bundle> --actor main-agent` → 读取 stdout JSON 的 `item` 字段 → item 为 null 则 queue 空跳到 §3.3（`main-agent` 是当前 CLI actor wire value）
  - Step 2 execute: `task.targets.delegates.to = "sub-agent"` → 启动 Sub-agent，传入 task.action 指令 + bundle 路径 → Sub-agent 使用 WebSearch → WebFetch → 提取 metadata → 写入 `reference/<topic>/source.yaml` + `_cache/search-results/`
  - Step 3 complete: 创建 result JSON ({ work_id, receipt, summary, writes }) → `operate-queue complete <bundle> --result <result.json>` → receipt check PASS → promote + refill + render; receipt check FAIL → engine 自动生成 repair task → 读 inspect/advice → 修复 → 回到 claim
  - Step 4 读投影: `_cache/agentic-queue/current-task.md` → 确认 done-condition → 回到 step 1
  - 行为约束：不跳过 task、不伪造产出、complete 阻塞必须修复、Sub-agent 搜索输出写 _cache — Phase Agent 只读投影不读完整搜索结果

  **§3.3 收尾与 gate**：
  - 检查并更新 `reference/index.md`
  - 跑 `check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md`
  - gate pass → 读 `check.next`；gate fail → 按 §7 On Gate Fail 处理

- **Expected Artifacts**: `reference/index.md`（非空）、`reference/<topic>/source.yaml`（每条 reference 满足 ReferenceMetadata schema，数量 ≥ 1 per topic）、trace 中有 `wave0_completion` event
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，补充缺失的 reference、修复 schema violation 或补写 trace 后 rerun
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止使用 fake URL 或伪造 source metadata；禁止声称 evidence coverage 或 research depth completeness；禁止跳过实际搜索直接编造 reference；禁止在不跑 queue claim/complete 的情况下直接跑 gate

#### Scenario: Phase Agent executes wave0 phase via queue-driven loop

- **WHEN** Phase Agent 加载 `phase-wave0.md`
- **THEN** §3 body SHALL 引导 Phase Agent 进入 queue-driven 三阶段：灌料 → 执行循环 → 收尾+gate
- **AND** body SHALL 明确要求使用 `operate-queue` CLI 进行 claim/complete 循环
- **AND** body SHALL NOT 使用自由文本 "Allowed Actions" 模式

#### Scenario: Filling generates one task card JSON per topic

- **WHEN** `topic_registry` 含 N 个 topic，queue 为空
- **THEN** Phase Agent SHALL 为每个 topic 创建一个 task card JSON 文件（含完整 QueueItemSchema 字段：work_id, title, targets, action, producer_rule, lineage, priority_class, required_receipts, done_condition, verification, writes_to, status_sync, completion_receipt, failure_route, payload）
- **AND** Phase Agent SHALL 使用 `operate-queue enqueue <bundle> --task <task.json>` 逐个灌入
- **AND** 全部 topic 的 task card SHALL 在进入执行循环前一次性灌入
- **AND** action 字段 SHALL 含 WebSearch + WebFetch 指令、目标 schema (ReferenceMetadata) 说明、产出路径

#### Scenario: Sub-agent executes real search per delegated task card

- **WHEN** task card 的 `targets.delegates.to` 为 `"sub-agent"` 且 `producer_rule` 为 `source_intake_fan_in`
- **THEN** Sub-agent SHALL 使用 WebSearch + WebFetch 执行真实搜索
- **AND** Sub-agent SHALL 提取 url, title, retrieved_date, topic_tag 写入 `reference/<topic>/source.yaml`
- **AND** search 中间结果 SHALL 写入 `_cache/search-results/`
- **AND** Phase Agent SHALL 在 complete 后只读 `_cache/agentic-queue/current-task.md` 投影确认 done-condition
- **AND** Phase Agent SHALL NOT 把完整搜索结果读回对话上下文

#### Scenario: Execution loop processes tasks until queue empty

- **WHEN** queue active_window 中有 task card
- **THEN** Phase Agent SHALL claim → execute → complete 循环
- **AND** Phase Agent SHALL NOT 跳过 task 或无故中间停机
- **AND** 当 claim 返回 `item: null` 时循环终止
