# Research Wave Phase Content

> req: RWP-001, RWP-002, RWP-003, RWP-004, RWP-005, RWP-006, RWP-007

## Purpose

定义 wave0、wave1、wave2 三个 phase node 的完整 body 内容要求。每个 phase node body 必须满足当前 workflow-node contract 的 9 个 section，严格贴合当前 accepted CLI / schema / bundle contract。Wave0 产出 foundation shared reference；Wave1 标记 placeholder capability boundary；Wave2 从 verified artifacts 派生 cross-topic synthesis。

## Requirements

### Requirement: Wave0 phase body completeness

`phase-wave0.md` SHALL 包含完整的 9-section body，引导 Agent 产出 foundation shared reference evidence。§3 Allowed Actions SHALL 采用 queue-driven 三阶段模式。

Section 内容要求：

- **Stage Goal**: 搜集少量真实 shared reference，创建结构化 metadata 并更新 index/status/trace。单个 topic 内至少达到 foundation floor 的 reference 数量
- **Required Inputs**: 已通过 `seed-topics-ready` gate 的 active bundle（`seed_topics/` 已物化）、`shared-profile.md`、`shared-schemas.md`、`rb_plan.md` 中的 `topic_registry`
- **Allowed Actions** (§3) — 三阶段 queue-driven 模式：

  **§3.1 灌料 (Filling)** — 首次进入 wave0，如果 queue 为空（`operate-queue check <bundle>` 返回空）：
  - 读取 `rb_plan.md` frontmatter 的 `topic_registry`
  - 为每个 topic 创建 task card JSON 文件（含 work_id, title, target: sub-agent, action（含 WebSearch + WebFetch 指令）, producer_rule: source_intake_fan_in, priority_class: P5_new_reference_intake, required_receipts, done_condition, completion_receipt 等完整字段）
  - 使用 `operate-queue enqueue <bundle> --task <task.json>` 逐个灌入
  - 灌料完毕后跑 `operate-queue check <bundle>` 确认 queue_health: ready 且 active_window 已填充

  **§3.2 Queue-driven 执行循环**：
  - Step 1 claim: `operate-queue claim <bundle> --actor main-agent` → 读取 stdout JSON 的 `item` 字段 → item 为 null 则 queue 空跳到 §3.3
  - Step 2 execute: task.target = sub-agent → 启动 sub-agent，传入 task.action 指令 + bundle 路径 → sub-agent 使用 WebSearch → WebFetch → 提取 metadata → 写入 `reference/<topic>/source.yaml` + `_cache/search-results/`
  - Step 3 complete: 创建 result JSON ({ work_id, receipt, summary, writes }) → `operate-queue complete <bundle> --result <result.json>` → receipt check PASS → promote + refill + render; receipt check FAIL → engine 自动生成 repair task → 读 inspect/advice → 修复 → 回到 claim
  - Step 4 读投影: `_cache/agentic-queue/current-task.md` → 确认 done-condition → 回到 step 1
  - 行为约束：不跳过 task、不伪造产出、complete 阻塞必须修复、sub-agent 搜索输出写 _cache — main-agent 只读投影不读完整搜索结果

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

#### Scenario: Agent executes wave0 phase via queue-driven loop

- **WHEN** Agent 加载 `phase-wave0.md`
- **THEN** §3 body SHALL 引导 Agent 进入 queue-driven 三阶段：灌料 → 执行循环 → 收尾+gate
- **AND** body SHALL 明确要求使用 `operate-queue` CLI 进行 claim/complete 循环
- **AND** body SHALL NOT 使用自由文本 "Allowed Actions" 模式

#### Scenario: Filling generates one task card JSON per topic

- **WHEN** `topic_registry` 含 N 个 topic，queue 为空
- **THEN** Agent SHALL 为每个 topic 创建一个 task card JSON 文件（含完整 QueueItemSchema 字段：work_id, title, target, action, producer_rule, lineage, priority_class, required_receipts, done_condition, verification, writes_to, status_sync, completion_receipt, failure_route, payload）
- **AND** Agent SHALL 使用 `operate-queue enqueue <bundle> --task <task.json>` 逐个灌入
- **AND** 全部 topic 的 task card SHALL 在进入执行循环前一次性灌入
- **AND** action 字段 SHALL 含 WebSearch + WebFetch 指令、目标 schema (ReferenceMetadata) 说明、产出路径

#### Scenario: Sub-agent executes real search per task card

- **WHEN** task card 的 `target` 为 `sub-agent` 且 `producer_rule` 为 `source_intake_fan_in`
- **THEN** sub-agent SHALL 使用 WebSearch + WebFetch 执行真实搜索
- **AND** sub-agent SHALL 提取 url, title, retrieved_date, topic_tag 写入 `reference/<topic>/source.yaml`
- **AND** search 中间结果 SHALL 写入 `_cache/search-results/`
- **AND** main-agent SHALL 在 complete 后只读 `_cache/agentic-queue/current-task.md` 投影确认 done-condition
- **AND** main-agent SHALL NOT 把完整搜索结果读回对话上下文

#### Scenario: Execution loop processes tasks until queue empty

- **WHEN** queue active_window 中有 task card
- **THEN** Agent SHALL claim → execute → complete 循环
- **AND** Agent SHALL NOT 跳过 task 或无故中间停机
- **AND** 当 claim 返回 `item: null` 时循环终止
### Requirement: Wave1 phase body completeness with subagent boundary

`phase-wave1.md` SHALL 包含完整的 9-section body，并在 body 中明确区分 Current Phase Actions 与 Future Expansion Guidance。

Section 内容要求：
- **Stage Goal**: 为 topic registry 中的每个 topic 写入 topic-scoped skeleton artifact，明确标记 foundation placeholder capability boundary
- **Required Inputs**: Wave0 产出的 `reference/index.md` 和 `reference/<topic>/source.yaml`、`shared-profile.md`
- **Allowed Actions**:
  - 读取 Wave0 的 reference index 和 metadata
  - 为每个 topic 创建 topic-scoped skeleton artifact（`artifacts/wave1/<topic>/skeleton.md`）
  - 在 skeleton 中显式标注 `capability: foundation-placeholder`
  - 在 body 末尾提供 Future Expansion Guidance section（只读参考，不作为 gate pass 条件）
  - 更新 `rb_status.json` 与 `rb_trace.jsonl`
  - trace 中记录 `wave1_completion` event
- **Expected Artifacts**: `artifacts/wave1/<topic>/skeleton.md`（每个 topic 至少 1 个，标记 `capability: foundation-placeholder`）、trace 中有 `wave1_completion` event
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle <path> --current-node phases/phase-wave1.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，补充缺失的 skeleton 或补加 placeholder marker 后 rerun
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止声称 full subagent coverage / deepening / candidate intake / fan-in review 已完成；禁止移除或弱化 placeholder marker 以通过 gate；禁止写 fake skeleton 内容冒充真实 artifact

#### Scenario: Wave1 phase stays within foundation boundary

- **WHEN** Agent 加载 `phase-wave1.md`
- **THEN** body SHALL 包含 Current Phase Actions section（描述 Agent 必须做的事）和 Future Expansion Guidance section（只读参考）
- **AND** Future Expansion Guidance SHALL NOT 成为 `wave1-complete` gate 的 pass 条件

### Requirement: Wave2 phase body completeness

`phase-wave2.md` SHALL 包含完整的 9-section body，引导 Agent 从 verified wave artifacts 派生 minimum cross-topic synthesis。

Section 内容要求：
- **Stage Goal**: 从已验证的 Wave0 reference 和 Wave1 skeleton 派生一个 cross-topic synthesis artifact
- **Required Inputs**: Wave0 `reference/index.md`、Wave1 `artifacts/wave1/<topic>/skeleton.md`、`shared-schemas.md`
- **Allowed Actions**:
  - 读取 Wave0 的 reference index 和所有 topic metadata
  - 读取 Wave1 的所有 topic skeleton
  - 派生 synthesis artifact `artifacts/wave2/synthesis.md`
  - synthesis 必须使用标准 Markdown link `[label](relative/path.md)` 格式显式引用 Wave0/Wave1 artifacts
  - 更新 `rb_status.json` 与 `rb_trace.jsonl`
  - trace 中记录 `wave2_completion` event
- **Expected Artifacts**: `artifacts/wave2/synthesis.md`（非空、含至少 1 个 Markdown link 指向 Wave0/Wave1 artifact）、trace 中有 `wave2_completion` event
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle <path> --current-node phases/phase-wave2.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，补写 Markdown link 或修复引用路径后 rerun
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止凭空总结（不引用任何 Wave0/Wave1 artifact）；禁止伪造引用路径；禁止声称 synthesis 是完整的 research conclusion；禁止在引用链不完整时声称 synthesis 已验证

#### Scenario: Wave2 synthesis references verified artifacts via Markdown links

- **WHEN** Agent 生成 `artifacts/wave2/synthesis.md`
- **THEN** synthesis SHALL 用 Markdown link 格式显式引用 Wave0 和 Wave1 artifacts
- **AND** body SHALL NOT 允许无 Markdown link 的 synthesis

### Requirement: Wave1 foundation placeholder boundary enforcement

`phase-wave1.md` body SHALL 显式声明 foundation 阶段的 capability boundary：

禁止声称的内容（Anti-Cheating Rules 中显式列出）：
- full subagent coverage completed
- topic-specific deepening completed
- candidate intake/backfill completed
- fan-in review completed
- native subagent fan-out/fan-in completed

`subagent: true` frontmatter SHALL 只在 node metadata 中表示 future capability direction，foundation 阶段 SHALL NOT dispatch subagent。

#### Scenario: Wave1 placeholder marker is unmissable

- **WHEN** Agent 写入 `artifacts/wave1/<topic>/skeleton.md`
- **THEN** artifact SHALL 显式包含 `capability: foundation-placeholder`
- **AND** `wave1-complete` gate SHALL 检查该 marker 存在

### Requirement: Wave1 future expansion tracks documentation

`phase-wave1.md` body 的 Future Expansion Guidance section SHALL 至少列出以下 expansion tracks：
- topic-specific deepening
- subagent dispatch
- candidate intake
- repair/backfill
- fan-in review
- topic artifact quality gates

Future expansion guidance SHALL 标注为只读参考，SHALL NOT 成为 `wave1-complete` gate pass 条件。

#### Scenario: Future expansion tracks do not gate foundation pass

- **WHEN** `check-gate-wave1-complete.mjs` 被调用
- **THEN** gate SHALL NOT 检查 future expansion guidance 的任何条件
- **AND** future tracks 的存在 SHALL NOT 影响 `passed` 判定

### Requirement: Wave2 synthesis artifact references verified artifacts

`phase-wave2.md` body SHALL 指示 Agent 在 synthesis 中使用 Markdown link `[label](relative/path.md)` 引用经过 `wave1-complete` 验证的 artifacts。引用 SHALL 使用相对于 `artifacts/wave2/` 的路径（如 `../wave1/topic-a/skeleton.md`）。

#### Scenario: Synthesis reference format is Markdown links

- **WHEN** `check-gate-wave2-complete.mjs` 执行 `cross_field` check
- **THEN** synthesis 中的 Markdown links SHALL 被解析并验证目标存在
- **AND** 至少 1 条 link 目标存在时 gate 继续；0 条时 gate SHALL fail

### Requirement: Anti-cheating rules in wave phase bodies

每个 wave phase node body 的 Anti-Cheating Rules section SHALL 包含该 phase 特有禁令，并 reference `shared-anti-cheating-rules.md`。

#### Scenario: Each wave phase has phase-specific anti-cheating rules

- **WHEN** Agent 读取任一 wave phase 的 Anti-Cheating Rules section
- **THEN** section SHALL 至少列出 2 条 phase-specific 禁令
- **AND** 每条禁令 SHALL 指向正确替代动作
