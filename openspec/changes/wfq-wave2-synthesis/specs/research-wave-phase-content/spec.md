# Research Wave Phase Content (Delta)

> req: RWP-003, RWP-006, RWP-007, RWP-008

## MODIFIED Requirements

### Requirement: Wave2 phase body completeness

`phase-wave2.md` SHALL 包含完整的 9-section body，引导 Agent 通过 queue-driven 三阶段执行 cross-topic synthesis with iterative finding triage + targeted search loop。

Section 内容要求：
- **Stage Goal**: 从所有 topic 的 wave1 evidence-summary 和 question-list 派生 cross-topic synthesis，通过 finding taxonomy（三类 finding + 六种 decision）+ targeted search loop 发现和填补证据缺口，最终从 ledger/index 投影回填 seed topic 文件。Wave2 是最后一个 research phase——产出不是 final report，而是经过 triage + search 的综合判断供 HITL2 人类审查
- **Required Inputs**: Wave0 产出的 `reference/index.md` 和 `reference/<topic>/source.yaml`、Wave1 产出的 `artifacts/wave1/<topic>/evidence-summary.md` 和 `artifacts/wave1/<topic>/question-list.md`、`shared-schemas.md`、`shared-subagent-protocol.md`
- **Allowed Actions** (§3) — 三阶段 queue-driven 模式：

  **§3.1 灌料 (Filling)** — 首次进入 wave2，如果 queue 为空：
  - 读取 `rb_plan.md` frontmatter 的 `topic_registry`
  - 创建 1 个 synthesis task card JSON（`work_id: wave2-synthesis`、`targets: {controller: main-agent}`、`producer_rule: cross_topic_synthesis`、`priority_class: P2_close_open_loop`、`required_receipts: ["file:artifacts/wave2/synthesis.md", "file:artifacts/wave2/cross-topic-ledger.md", "file:artifacts/wave2/finding-index.yaml"]`、action 描述完整的 synthesis + finding triage + targeted search loop 流程）
  - 为每个 topic 创建 1 个 backfill task card JSON（`work_id: wave2-backfill-{slug}`、`targets: {controller: main-agent}`、`producer_rule: seed_topic_backfill_wave2`、`priority_class: P4_progressive_artifact_or_seed_backfill`、`required_receipts: ["file:seed_topics/{topic.slug}.md"]`、action 含 token 替换指令）
  - 使用 `operate-queue enqueue` 逐个灌入，synthesis task 优先（较低的 priority_class 数字 = 更高优先级）
  - 灌料完毕后跑 `operate-queue check` 确认

  **§3.2 Queue-driven 执行循环**：
  - **Phase 1 — Synthesis task**: claim → execute synthesis with embedded finding triage + targeted search loop（见下方 Finding Triage + Targeted Search Loop 协议）→ complete
  - **Finding Triage + Targeted Search Loop 协议**（在 synthesis task 执行过程中）：
    1. 读取所有 topic 的 `evidence-summary.md` + `question-list.md`
    2. 建立 cross-topic scan matrix（记录哪些 topic pair 被检查、检查了 shared_pattern/contradiction/resolution_opportunity/emergent_question 哪些维度）
    3. 将 findings 写入 `cross-topic-ledger.md`（三类：wave1_legacy_question / cross_topic_resolution / cross_topic_emergent_question）和 `finding-index.yaml`（每 finding 含 id/type/status/decision/refs 等 11 个 required field）
    4. 对每个 finding 做 exploration/exploitation decision（六种：use_existing_evidence / exploit_search / explore_search / defer_hitl2 / requires_internal_data / record_only）
    5. 跑 JS feedback check（L0：文件存在、YAML parse、ledger 固定 section、finding 字段完整；L1：resolution.search_required=false、emergent.affected_topics ≥ 2 等）
    6. 仅对 `decision=exploit_search|explore_search` 的 finding spawn `dpt-topic-scout` sub-agent → ingestion receipt → 更新 index receipt refs + status
    7. 跑 JS feedback check（L1：receipt 一致性、status 更新、无 orphan finding）
    8. 写 `synthesis.md` 作为 narrative projection（引用 W2F-xxx finding id）
    9. 跑 JS feedback check（L1：narrative 引用 finding id、无 unknown id、无 orphan）
    10. 无新 finding 或达上限或所有剩余 finding 均为非 searchable → complete queue task（unresolved finding 进入 HITL2 handoff 或 record_only）
  - **Phase 2 — Backfill tasks**: claim → grep token 定位 → 从 Wave2 ledger/index 投影 finding（筛选 `affected_topics` 包含该 topic 的 finding）替换 `__BACKFILL_WAVE2_JUDGMENT__` 和 `__BACKFILL_PENDING_QUESTIONS__` → complete（queue receipt 只验证支持的 `file:` 等前缀；token absence 由 gate 验证）→ 循环至 queue 空
  - 行为约束：synthesis 本体必须完成 + finding triage loop 收敛后才能开始 backfill；backfill 必须从 ledger/index 投影，不直接从 synthesis.md narrative 摘抄

  **§3.3 收尾与 gate**：
  - 检查三件套 artifact 均存在（synthesis.md + cross-topic-ledger.md + finding-index.yaml）
  - 检查 ledger 含 6 个固定 section、index 可 parse
  - 检查所有 backfill token 已被替换
  - 跑 `check-gate-wave2-complete.mjs --bundle <path> --current-node phases/phase-wave2.md`
  - gate pass → 读 `check.next`；gate fail → 按 §7 On Gate Fail 处理

- **Expected Artifacts**: 
  - `artifacts/wave2/synthesis.md`（narrative projection，非空、含 Markdown links 引用 Wave0/Wave1 artifact、含至少 1 个 wave1 evidence-summary 或 question-list 引用、含 W2F-xxx finding id 引用）
  - `artifacts/wave2/cross-topic-ledger.md`（Agent-readable dynamic ledger，含 6 个固定 section：Cross-Topic Scan Matrix / Wave1 Legacy Questions / Cross-Topic Resolutions / Emergent Cross-Topic Questions / Exploration Decisions / HITL2 Handoff）
  - `artifacts/wave2/finding-index.yaml`（JS-readable shadow index，每 finding 含 11 个 required field：id/type/status/decision/affected_topics/origin_refs/trigger_refs/search_required/subagent_receipt_refs/appears_in_synthesis/hitl2_handoff，top-level 含 scan 对象）
  - 所有 seed topic 文件中 `__BACKFILL_WAVE2_JUDGMENT__` 和 `__BACKFILL_PENDING_QUESTIONS__` token 已被替换（替换内容从 ledger/index 投影，保留 source_layer/finding id/decision/status）
  - trace 中有 `wave2_completion` event
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle <path> --current-node phases/phase-wave2.md`
- **On Gate Pass**: 读取 `check.next`，advance to `hitl2`
- **On Gate Fail**: 读取 `inspect` / `advice`，修复缺失的三件套 artifact、补写 ledger section、修正 index YAML、补写 Markdown link + finding id 引用、替换残留 token 或补写 trace 后 rerun
- **Stop Behavior**: `stop: no` — Agent 自主执行 synthesis + finding triage + search，不做 stop-and-wait
- **Anti-Cheating Rules**: 见下方 §9 完整列表（≥10 条 phase-specific 禁令，涵盖三件套、finding taxonomy、decision/receipt/orphan/backfill 规则）

#### Scenario: Agent executes wave2 phase via queue-driven loop

- **WHEN** Agent 加载 `phase-wave2.md`
- **THEN** §3 body SHALL 引导 Agent 进入 queue-driven 三阶段：灌料 → synthesis with finding triage + search → backfill → 收尾+gate
- **AND** body SHALL 明确要求使用 `operate-queue` CLI 进行 claim/complete 循环
- **AND** body SHALL NOT 使用自由文本 "Allowed Actions" 模式

#### Scenario: Finding triage loop iterates within synthesis task

- **WHEN** synthesis task 执行中
- **THEN** Agent SHALL build scan matrix → classify findings into ledger/index → make decisions → JS feedback check → spawn sub-agents only for exploit/explore_search → JS feedback check → project synthesis → JS feedback check → backfill
- **AND** loop SHALL terminate on convergence or max iterations
- **AND** synthesis task SHALL NOT be completed until finding triage loop terminates

#### Scenario: Backfill tasks execute after synthesis convergence

- **WHEN** synthesis task complete 且 finding triage loop 已终止
- **THEN** Agent SHALL claim backfill tasks sequentially
- **AND** each backfill SHALL replace `__BACKFILL_WAVE2_JUDGMENT__` and `__BACKFILL_PENDING_QUESTIONS__` tokens
- **AND** backfill content SHALL be projected from ledger/index, not directly from narrative
- **AND** backfill SHALL preserve `source_layer: wave2_cross_topic`, finding id, decision, and status

#### Scenario: Wave2 produces three artifacts, not one

- **WHEN** Agent completes wave2 synthesis phase
- **THEN** `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml` SHALL all exist under `artifacts/wave2/`
- **AND** ledger SHALL contain all 6 fixed sections with non-empty content
- **AND** index SHALL parse as valid YAML with at minimum `version`, `source_layer`, `ledger`, `synthesis`, `scan`, and `findings` top-level keys
- **AND** gate SHALL verify all three artifacts before passing

### Requirement: Wave2 synthesis artifact references verified artifacts

`phase-wave2.md` body SHALL 指示 Agent 在 synthesis 中使用 Markdown link `[label](relative/path.md)` 引用经过 `wave1-complete` 验证的 artifacts。引用 SHALL 使用相对于 `artifacts/wave2/` 的路径（如 `../wave1/<topic>/evidence-summary.md` 指向 Wave1 evidence、`../wave1/<topic>/question-list.md` 指向 Wave1 questions）。

Synthesis narrative SHALL 至少引用 1 个 wave1 `evidence-summary.md` 或 `question-list.md`，并 SHALL 引用 finding id（W2F-xxx）以保持从 narrative 到 ledger/index 的可追溯性。Synthesis MAY 同时引用 wave0 `source.yaml`，但不强制。

#### Scenario: Synthesis reference format is Markdown links

- **WHEN** `check-gate-wave2-complete.mjs` 执行 `cross_field` check
- **THEN** synthesis 中的 Markdown links SHALL 被解析并验证目标存在
- **AND** 至少 1 条 link 指向 wave1 evidence-summary 或 question-list 时 gate 继续；0 条时 gate SHALL fail

#### Scenario: Synthesis references both wave0 and wave1 artifacts

- **WHEN** Agent writes synthesis.md
- **THEN** synthesis MAY contain links to both `../../reference/<topic>/source.yaml` and `../wave1/<topic>/evidence-summary.md`
- **AND** at least 1 link SHALL point to a wave1 artifact

### Requirement: Anti-cheating rules in wave phase bodies

每个 wave phase node body 的 Anti-Cheating Rules section SHALL 包含该 phase 特有禁令，并 reference `shared-anti-cheating-rules.md`。

Wave2 phase-specific 禁令 SHALL 至少包含：
- 禁止只有 `synthesis.md` 而没有 ledger/index 就声称完成 Wave2 emergence handling
- 禁止把所有 finding 都叫 gap（必须区分为 legacy_question / resolution / emergent_question）
- 禁止对 `cross_topic_resolution` spawn sub-agent 搜索（resolution 是 existing evidence integration）
- 禁止把 `cross_topic_emergent_question` 埋进某个 topic 的 pending questions 而不标注 `source_layer: wave2_cross_topic`
- 禁止 `decision=explore_search` 或 `decision=exploit_search` 但没有 relay/runtime receipt
- 禁止达到 max iteration 后静默丢弃 unresolved finding（必须进入 HITL2 handoff 或 record_only）
- 禁止 `synthesis.md` 写出没有 finding id（W2F-xxx）支撑的关键 cross-topic claim
- 禁止让 sub-agent 做 cross-topic judgment（sub-agent 只返回 bounded search/extraction result）
- 禁止 backfill 内容不从 ledger/index 投影（直接从 synthesis.md narrative 摘抄或丢失 source_layer/finding id）
- 禁止跳过 finding triage loop 直接 complete synthesis task
- 禁止凭空总结（不引用任何 Wave0/Wave1 artifact）
- 禁止伪造引用路径
- 禁止声称 synthesis 是完整的 research conclusion

#### Scenario: Wave2 phase has phase-specific anti-cheating rules

- **WHEN** Agent 读取 wave2 的 Anti-Cheating Rules section
- **THEN** section SHALL 至少列出 10 条 phase-specific 禁令
- **AND** 每条禁令 SHALL 指向正确替代动作

## ADDED Requirements

### Requirement: Wave2 gap-fill sub-agent phase file

> req: RWP-008

`phase-wave2-subagent.md` SHALL 定义 gap-fill sub-agent (`dpt-topic-scout`) 的完整行为指令，遵循 relay slot 通信契约（`shared-subagent-protocol.md`）。

Sub-agent phase file SHALL 包含：
- **Role**: `dpt-topic-scout` — targeted gap-fill search
- **Receives**: Bounded gap description + search keywords + target output schema from main-agent
- **Produces**: Structured JSON matching result schema (found_evidence, source_urls, fills_gap, confidence)
- **Writes**: Intermediate products to `_cache/wave2/slot_MM/`, runtime receipt to slot directory
- **Forbidden**: Writing to WorkflowState, modifying queue, passing/failing gate, making cross-topic claims
- **Required**: Tool degradation chain (WebFetch → curl → node → python3), honest failure recording, no fabrication

#### Scenario: Wave2 sub-agent file exists with complete behavior specification

- **WHEN** a gap-fill sub-agent is spawned during wave2 synthesis
- **THEN** sub-agent SHALL receive instructions from `phase-wave2-subagent.md`
- **AND** instructions SHALL cover all required behavior dimensions (role, input, output, directories, forbidden actions, fetch chain)
