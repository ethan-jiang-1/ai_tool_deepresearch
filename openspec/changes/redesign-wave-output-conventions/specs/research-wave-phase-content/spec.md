# Research Wave Phase Content (delta)

> req: RWP-001, RWP-002, RWP-003, RWP-004, RWP-005, RWP-006, RWP-009, RWP-010, RWP-011

注：RWP-009/010/011 为 delta 新增 ID，内容分别嵌入 RWP-001/002/003 的 MODIFIED body 中。`phase-wave2-subagent.md` 的 editorial cleanup（task 2.4）不构成 requirement 级修改，不纳入 delta header。

## MODIFIED Requirements

### Requirement: Wave0 phase body completeness

`phase-wave0.md` SHALL 包含完整的 9-section body，引导 Phase Agent 产出 shared foundation reference evidence + thin YAML source lists。§3 Allowed Actions SHALL 采用 queue-driven 三阶段模式。

Section 内容要求：

- **Stage Goal**: 搜集共享基础 evidence，创建 `reference/00-shared-<slug>.md`（rich MD，一个 source 一个文件）和 `artifacts/wave0/<topic>/source.yaml`（thin YAML per topic），创建 `reference/_INDEX.md` + `reference/README.md`，更新 trace
- **Required Inputs**: 已通过 `seed-topics-ready` gate 的 active bundle（`seed_topics/` 已物化）、`shared-profile.md`、`shared-schemas.md`、`shared-reference-template.md`、`rb_plan.md` 中的 `topic_registry`
- **Allowed Actions** (§3) — 三阶段 queue-driven 模式：

  **§3.1 灌料 (Filling)** — 首次进入 wave0，如果 queue 为空（`operate-queue check <bundle>` 返回空）：
  - 读取 `rb_plan.md` frontmatter 的 `topic_registry`
  - 为每个 topic 创建 task card JSON 文件（含 work_id, title, `targets`（`controller: "main-agent"` + `delegates.to: "sub-agent"` wire values）, action（含 WebSearch + WebFetch 指令）, producer_rule: source_intake_fan_in, priority_class: P5_new_reference_intake, required_receipts, done_condition, completion_receipt 等完整 QueueItemSchema 字段）
  - 使用 `operate-queue enqueue <bundle> --task <task.json>` 逐个灌入
  - 灌料完毕后跑 `operate-queue check <bundle>` 确认 queue_health: ready 且 active_window 已填充

  **§3.2 Queue-driven 执行循环**：
  - Step 1 claim: `operate-queue claim <bundle> --actor main-agent` → 读取 stdout JSON 的 `item` 字段 → item 为 null 则 queue 空跳到 §3.3
  - Step 2 execute: Sub-agent 使用 WebSearch → WebFetch → 提取 evidence → 写入 `reference/00-shared-<slug>.md`（rich MD）+ `artifacts/wave0/<topic>/source.yaml`（thin YAML）+ `_cache/search-results/`
  - Step 3 complete: 创建 result JSON ({ work_id, receipt, summary, writes }) → `operate-queue complete <bundle> --result <result.json>` → receipt check PASS → promote + refill + render; receipt check FAIL → engine 自动生成 repair task → 读 inspect/advice → 修复 → 回到 claim
  - Step 4 读投影: `_cache/agentic-queue/current-task.md` → 确认 done-condition → 回到 step 1
  - 行为约束：不跳过 task、不伪造产出、complete 阻塞必须修复、Sub-agent 搜索输出写 _cache — Phase Agent 只读投影不读完整搜索结果

  **§3.3 收尾与 gate**：
  - 检查并更新 `reference/_INDEX.md`
  - **Pre-gate structural lint**：跑 `node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --bundle <path>` → 读 inspect/advice → 修复结构问题（命名、section、metadata、目录形状）→ 重跑到 clean
  - 跑 `check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md`
  - gate pass → 读 `check.next`；gate fail → 按 §7 On Gate Fail 处理

- **Expected Artifacts**: `reference/00-shared-<slug>.md`（rich MD，count_floor ≥ 1 per run）、`reference/_INDEX.md`（非空 table）、`reference/README.md`、`artifacts/wave0/<topic>/source.yaml`（每条满足 ReferenceMetadata schema，count_floor ≥ 1 per topic）、trace 中有 `wave0_completion` event
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，补充缺失的 reference、修复 schema violation 或补写 trace 后 rerun
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 沿用 shared-anti-cheating-rules.md；禁止声称 wave0 产出 topic-specific rich MD（那是 wave1 的职责）；禁止跳过 `_INDEX.md` 更新；禁止使用 fake URL 或伪造 source metadata

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
- **AND** action 字段 SHALL 含 WebSearch + WebFetch 指令、目标 schema 说明、产出路径

#### Scenario: Sub-agent executes real search per delegated task card

- **WHEN** task card 的 `targets.delegates.to` 为 `"sub-agent"` 且 `producer_rule` 为 `source_intake_fan_in`
- **THEN** Sub-agent SHALL 使用 WebSearch + WebFetch 执行真实搜索
- **AND** Sub-agent SHALL 写入 `reference/00-shared-<slug>.md`（rich MD）和 `artifacts/wave0/<topic>/source.yaml`（thin YAML）
- **AND** search 中间结果 SHALL 写入 `_cache/search-results/`
- **AND** Phase Agent SHALL 在 complete 后只读 `_cache/agentic-queue/current-task.md` 投影确认 done-condition
- **AND** Phase Agent SHALL NOT 把完整搜索结果读回对话上下文

#### Scenario: Execution loop processes tasks until queue empty

- **WHEN** queue active_window 中有 task card
- **THEN** Phase Agent SHALL claim → execute → complete 循环
- **AND** Phase Agent SHALL NOT 跳过 task 或无故中间停机
- **AND** 当 claim 返回 `item: null` 时循环终止

#### Scenario: Wave0 produces 00-shared rich MD files

- **WHEN** wave 0 完成共享基础 evidence 检索
- **THEN** `reference/` 包含至少 1 个 `00-shared-<slug>.md` 文件
- **AND** 每个文件遵循 `shared-reference-template.md` 的格式

#### Scenario: Wave0 produces _INDEX.md and README.md

- **WHEN** wave 0 完成
- **THEN** `reference/_INDEX.md` 存在且包含 header 行和至少 1 行 reference 数据
- **AND** `reference/README.md` 存在且描述 naming convention

### Requirement: Wave1 phase body completeness with subagent boundary

`phase-wave1.md` SHALL 包含完整的 9-section body，引导 Phase Agent 为每个 topic 做深挖：为每条找到的 topic 专属 source 创建 `reference/0N-<slug>.md`（rich MD），并产出 `artifacts/wave1/<topic>/evidence-summary.md` 和 `artifacts/wave1/<topic>/question-list.md` 作为 topic 级合成。

Section 内容要求：

- **Stage Goal**: 深挖每個 topic 的 evidence，为每条 topic 专属 source 创建独立的 `reference/0N-<slug>.md`，并基于 source 集合做 topic 级合成
- **Required Inputs**: Wave0 产出的 `reference/00-shared-*.md`、`reference/_INDEX.md`、`artifacts/wave0/<topic>/source.yaml`、`shared-profile.md`、`shared-reference-template.md`
- **Allowed Actions** (§3):
  - 读取 Wave0 的 rich MD reference 和 thin YAML metadata
  - 为每个 topic 生成深挖任务卡片，通过 queue-driven 或 sub-agent 执行
  - Sub-agent 使用 WebSearch → WebFetch → 为每条 topic 专属 source 创建 `reference/0N-<slug>.md`（rich MD，前缀编号与 topic_registry id 一致）
  - 基于 topic 的所有 reference 文件合成 `artifacts/wave1/<topic>/evidence-summary.md` 和 `artifacts/wave1/<topic>/question-list.md`
  - 更新 `reference/_INDEX.md`，新增条目 `source_layer` 标为 `wave1_topic`
  - 更新 `rb_status.json` 与 `rb_trace.jsonl`，trace 中记录 `wave1_completion` event
- **Expected Artifacts**: `reference/0N-<slug>.md`（rich MD，每个 topic 至少 1 个，前缀编号与 topic_registry id 一致）、`artifacts/wave1/<topic>/evidence-summary.md` + `question-list.md`（每个 topic 各 1 对）、更新 `reference/_INDEX.md`、trace 中有 `wave1_completion` event
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs --bundle <path> --current-node phases/phase-wave1.md`
- **Pre-gate structural lint**: Agent SHALL 在跑 gate 之前先跑 `node DPT_FRAMEWORK/cli/inspect-wave1-output.mjs --bundle <path>` → 读 inspect/advice → 修复结构问题 → 重跑到 clean → 再跑 gate
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，修复缺失 artifact 或补写 trace 后 rerun
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 沿用 shared-anti-cheating-rules.md；禁止声称 wave1 产出 `00-shared-*` 或 `00-cross-*` 前缀的文件；禁止写 fake evidence 内容冒充真实 artifact

#### Scenario: Wave1 produces topic-prefixed rich MD files

- **WHEN** wave 1 为 topic 03 深挖完成
- **THEN** `reference/03-<slug>.md` 存在（前缀 03 与 topic_registry 一致）
- **AND** 文件遵循 `shared-reference-template.md` 格式

#### Scenario: Wave1 updates _INDEX.md with new entries

- **WHEN** wave 1 创建了 topic 专属 reference 文件
- **THEN** `reference/_INDEX.md` 的 table 包含新增的 `0N-*` 条目
- **AND** 条目的 `source_layer` 列为 `wave1_topic`

### Requirement: Wave2 phase body completeness

`phase-wave2.md` SHALL 包含完整的 9-section body，引导 Phase Agent 通过 queue-driven 三阶段执行 cross-topic synthesis with iterative finding triage + targeted search loop。Synthesis 产出全部留在 `artifacts/wave2/`。若 cross-topic scan 发现新共享 source，以 `reference/00-cross-<slug>.md` 追加。

Section 内容要求：
- **Stage Goal**: 从所有 topic 的 wave1 evidence-summary 和 question-list 派生 cross-topic synthesis，通过 finding taxonomy（三类 finding + 六种 decision）+ targeted search loop 发现和填补证据缺口，最终从 ledger/index 投影回填 seed topic 文件。Wave2 是最后一个 research phase——产出不是 final report，而是经过 triage + search 的综合判断供 HITL2 人类审查
- **Required Inputs**: Wave0 产出的 `reference/00-shared-*.md`、`reference/_INDEX.md`、`artifacts/wave0/<topic>/source.yaml`、Wave1 产出的 `reference/0N-<slug>.md`、`artifacts/wave1/<topic>/evidence-summary.md` 和 `artifacts/wave1/<topic>/question-list.md`、`shared-schemas.md`、`shared-subagent-protocol.md`
- **Allowed Actions** (§3) — 三阶段 queue-driven 模式：

  **§3.1 灌料 (Filling)** — 首次进入 wave2，如果 queue 为空：
  - 读取 `rb_plan.md` frontmatter 的 `topic_registry`
  - 创建 1 个 synthesis task card JSON（`work_id: wave2-synthesis`、`targets: { controller: "main-agent" }`、`producer_rule: cross_topic_synthesis`、`priority_class: P2_close_open_loop`、`required_receipts: ["file:artifacts/wave2/synthesis.md", "file:artifacts/wave2/cross-topic-ledger.md", "file:artifacts/wave2/finding-index.yaml"]`、action 描述完整的 synthesis + finding triage + targeted search loop 流程）
  - 为每个 topic 创建 1 个 backfill task card JSON（`work_id: wave2-backfill-{slug}`、`targets: { controller: "main-agent" }`、`producer_rule: seed_topic_backfill_wave2`、`priority_class: P4_progressive_artifact_or_seed_backfill`、`required_receipts: ["file:seed_topics/{topic.slug}.md"]`、action 含 token 替换指令）
  - 使用 `operate-queue enqueue` 逐个灌入，synthesis task 优先（较低的 priority_class 数字 = 更高优先级）
  - 灌料完毕后跑 `operate-queue check` 确认

  **§3.2 Queue-driven 执行循环**：
  - **Phase 1 — Synthesis task**: claim → execute synthesis with embedded finding triage + targeted search loop → complete
  - **Finding Triage + Targeted Search Loop 协议**（在 synthesis task 执行过程中）：
    1. 读取所有 topic 的 `evidence-summary.md` + `question-list.md`
    2. 建立 cross-topic scan matrix（所有 topic pair，检查 shared_pattern/contradiction/resolution_opportunity/emergent_question 维度）
    3. 将 findings 写入 `cross-topic-ledger.md`（三类：wave1_legacy_question / cross_topic_resolution / cross_topic_emergent_question）和 `finding-index.yaml`
    4. 对每个 finding 做 exploration/exploitation decision（六种：use_existing_evidence / exploit_search / explore_search / defer_hitl2 / requires_internal_data / record_only）
    5. 跑 JS feedback check（L0/L1: 文件存在、finding 字段完整、consistency rules）
    6. 仅对 `decision=exploit_search|explore_search` 的 finding spawn `dpt-topic-scout` Sub-agent → ingestion receipt → 若发现 ≥2 topic 共享的新 source，创建 `reference/00-cross-<slug>.md`（rich MD）+ 更新 `reference/_INDEX.md`（`source_layer: wave2_cross`）；更新 index receipt refs + status
    7. 跑 JS feedback check（L1：receipt 一致性、status 更新、无 orphan finding）
    8. 写 `synthesis.md` 作为 narrative projection（引用 W2F-xxx finding id + Markdown links 到 `reference/00-shared-*.md`、`reference/0N-*.md`、`artifacts/wave1/`）
    9. 跑 JS feedback check（L1：narrative 引用 finding id、无 unknown id、无 orphan）
    10. 无新 finding 或达上限或所有剩余 finding 均为非 searchable → complete queue task（unresolved finding 进入 HITL2 handoff 或 record_only）
  - **Phase 2 — Backfill tasks**: claim → grep token 定位 → 从 Wave2 ledger/index 投影 finding（筛选 `affected_topics` 包含该 topic 的 finding）替换 `__BACKFILL_WAVE2_JUDGMENT__` 和 `__BACKFILL_PENDING_QUESTIONS__` → complete（queue receipt 只验证支持的 `file:` 等前缀；token absence 由 gate 验证）→ 循环至 queue 空
  - 行为约束：synthesis 本体必须完成 + finding triage loop 收敛后才能开始 backfill；backfill 必须从 ledger/index 投影，不直接从 synthesis.md narrative 摘抄；backfill SHALL 保留 source_layer/finding id/decision/status

  **§3.3 收尾与 gate**：
  - 检查三件套 artifact 均存在（synthesis.md + cross-topic-ledger.md + finding-index.yaml）
  - 检查 ledger 含 6 个固定 section、index 可 parse
  - 检查所有 backfill token 已被替换
  - **Pre-gate structural lint**：跑 `node DPT_FRAMEWORK/cli/inspect-wave2-output.mjs --bundle <path>` → 读 inspect/advice → 修复结构问题（00_shared/ 子目录、00-cross-* 格式、三件套存在性、残留 token）→ 重跑到 clean
  - 跑 `check-gate-wave2-complete.mjs --bundle <path> --current-node phases/phase-wave2.md`
  - gate pass → 读 `check.next`；gate fail → 按 §7 On Gate Fail 处理

- **Expected Artifacts**:
  - `artifacts/wave2/synthesis.md`（narrative projection，非空、含 Markdown links 引用 Wave0/Wave1 artifact、含至少 1 个 wave1 evidence-summary 或 question-list 引用、含 W2F-xxx finding id 引用）
  - `artifacts/wave2/cross-topic-ledger.md`（Agent-readable dynamic ledger，含 6 个固定 section：Cross-Topic Scan Matrix / Wave1 Legacy Questions / Cross-Topic Resolutions / Emergent Cross-Topic Questions / Exploration Decisions / HITL2 Handoff）
  - `artifacts/wave2/finding-index.yaml`（JS-readable shadow index，每 finding 含 required fields：id/type/status/decision/affected_topics/origin_refs/trigger_refs/search_required/subagent_receipt_refs/appears_in_synthesis/hitl2_handoff，top-level 含 scan 对象）
  - `reference/00-cross-<slug>.md`（可选——仅当 cross-topic scan scout 发现 ≥2 topic 共享的新 source 时创建，非 gate pass 硬条件）
  - 所有 seed topic 文件中 `__BACKFILL_WAVE2_JUDGMENT__` 和 `__BACKFILL_PENDING_QUESTIONS__` token 已被替换（替换内容从 ledger/index 投影，保留 source_layer/finding id/decision/status）
  - 更新 `reference/_INDEX.md`（如有新增 `00-cross-*` 文件）
  - trace 中有 `wave2_completion` event
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle <path> --current-node phases/phase-wave2.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，修复缺失的三件套 artifact、补写 ledger section、修正 index YAML、补写 Markdown link + finding id 引用、替换残留 token 或补写 trace 后 rerun
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 沿用 shared-anti-cheating-rules.md。Wave2 phase-specific 禁令：禁止只有 synthesis 没有 ledger/index 就声称完成；禁止把所有 finding 叫 gap（必须区分类型）；禁止对 cross_topic_resolution spawn Sub-agent 搜索；禁止 cross_topic_emergent_question 不标注 `source_layer: wave2_cross`；禁止 decision=explore_search|exploit_search 但没有 relay/runtime receipt；禁止达 max iteration 后静默丢弃 unresolved finding；禁止 synthesis 写出没有 W2F-xxx 支撑的关键 claim；禁止 Sub-agent 做 cross-topic judgment；禁止 backfill 不从 ledger/index 投影；禁止跳过 finding triage loop 直接 complete synthesis task；禁止凭空总结；禁止伪造引用路径；禁止写入 `reference/00_shared/` 子目录或 `reference/00_shared/source.yaml`

Phase node SHALL NOT 指示 Agent 写入 `reference/00_shared/` 子目录或 `reference/00_shared/source.yaml`。

#### Scenario: Phase Agent executes wave2 phase via queue-driven loop

- **WHEN** Phase Agent 加载 `phase-wave2.md`
- **THEN** §3 body SHALL 引导 Phase Agent 进入 queue-driven 三阶段：灌料 → synthesis with finding triage + search → backfill → 收尾+gate
- **AND** body SHALL 明确要求使用 `operate-queue` CLI 进行 claim/complete 循环
- **AND** body SHALL NOT 使用自由文本 "Allowed Actions" 模式

#### Scenario: Finding triage loop iterates within synthesis task

- **WHEN** synthesis task 执行中
- **THEN** Phase Agent SHALL build scan matrix → classify findings into ledger/index → make decisions → JS feedback check → spawn sub-agents only for exploit/explore_search → JS feedback check → project synthesis → JS feedback check → backfill
- **AND** loop SHALL terminate on convergence or max iterations
- **AND** synthesis task SHALL NOT be completed until finding triage loop terminates

#### Scenario: Backfill tasks execute after synthesis convergence

- **WHEN** synthesis task complete 且 finding triage loop 已终止
- **THEN** Phase Agent SHALL claim backfill tasks sequentially
- **AND** each backfill SHALL replace `__BACKFILL_WAVE2_JUDGMENT__` and `__BACKFILL_PENDING_QUESTIONS__` tokens
- **AND** backfill content SHALL be projected from ledger/index, not directly from narrative
- **AND** backfill SHALL preserve `source_layer: wave2_cross`, finding id, decision, and status

#### Scenario: Wave2 produces three artifacts, not one

- **WHEN** Phase Agent completes wave2 synthesis phase
- **THEN** `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml` SHALL all exist under `artifacts/wave2/`
- **AND** ledger SHALL contain all 6 fixed sections with non-empty content
- **AND** index SHALL parse as valid YAML with at minimum `version`, `source_layer`, `ledger`, `synthesis`, `scan`, and `findings` top-level keys
- **AND** gate SHALL verify all three artifacts before passing

#### Scenario: Wave2 synthesis stays in artifacts/wave2/

- **WHEN** wave 2 完成 cross-topic synthesis
- **THEN** `artifacts/wave2/synthesis.md`、`cross-topic-ledger.md`、`finding-index.yaml` 存在
- **AND** 不存在 `reference/00_shared/source.yaml`（非 wave2 产出物位置）

#### Scenario: Wave2 optionally adds 00-cross reference files

- **WHEN** cross-topic scan scout 发现 ≥2 topic 共享的新 source
- **THEN** Agent 创建 `reference/00-cross-<slug>.md`
- **AND** 更新 `reference/_INDEX.md`（`source_layer: wave2_cross`）

### Requirement: Wave2 synthesis artifact references verified artifacts

`phase-wave2.md` body SHALL 指示 Phase Agent 在 synthesis 中使用 Markdown link `[label](relative/path.md)` 引用经过 `wave1-complete` 验证的 artifacts。引用 SHALL 使用相对于 `artifacts/wave2/` 的路径（如 `../wave1/<topic>/evidence-summary.md` 指向 Wave1 evidence、`../wave1/<topic>/question-list.md` 指向 Wave1 questions、`../../../reference/01-<slug>.md` 指向 flat reference rich MD、`../../../reference/00-shared-<slug>.md` 指向 wave0 共享 foundation rich MD、`../../../reference/00-cross-<slug>.md` 指向 wave2 cross-topic 发现 rich MD）。

Synthesis narrative SHALL 至少引用 1 个 wave1 `evidence-summary.md` 或 `question-list.md`，并 SHALL 引用 finding id（W2F-xxx）以保持从 narrative 到 ledger/index 的可追溯性。Synthesis MAY 同时引用 `reference/` 中的 rich MD 文件和 `artifacts/wave0/<topic>/source.yaml`，但不强制。

#### Scenario: Synthesis reference format is Markdown links

- **WHEN** `check-gate-wave2-complete.mjs` 执行 `cross_field` check
- **THEN** synthesis 中的 Markdown links SHALL 被解析并验证目标存在
- **AND** 至少 1 条 link 指向 wave1 evidence-summary 或 question-list 时 gate 继续；0 条时 gate SHALL fail

#### Scenario: Synthesis references both wave0 and wave1 artifacts

- **WHEN** Phase Agent writes synthesis.md
- **THEN** synthesis MAY contain links to `../../../reference/00-shared-<slug>.md`（wave0 shared rich MD）、`../../../reference/0N-<slug>.md`（wave1 topic rich MD）、and `../wave1/<topic>/evidence-summary.md`
- **AND** at least 1 link SHALL point to a wave1 artifact

## REMOVED Requirements

### Requirement: Wave1 foundation placeholder boundary enforcement

**Reason**: Wave1 从 foundation placeholder 阶段升级为完整 deepening 阶段——现在产出 `reference/0N-<slug>.md`（rich MD）+ `artifacts/wave1/<topic>/evidence-summary.md` + `question-list.md`。禁止声称 full subagent coverage / deepening completed 的禁令不再适用，因为 wave1 的职责就是做这些。

**Migration**: 移除 `phase-wave1.md` 的 §5 Expected Artifacts 中的 `skeleton.md` + `capability: foundation-placeholder` marker。移除 Anti-Cheating Rules 中针对 foundation placeholder boundary 的禁令。`gate-wave1-complete` 的 rule set 同步移除 skeleton 和 placeholder marker 检查。

#### Scenario: Wave1 no longer writes skeleton with placeholder

- **WHEN** Phase Agent executes wave1 under the new conventions
- **THEN** the agent SHALL NOT create `artifacts/wave1/<topic>/skeleton.md` with `capability: foundation-placeholder`
- **AND** the agent SHALL instead produce `reference/0N-<slug>.md` (rich MD) + `artifacts/wave1/<topic>/evidence-summary.md` + `question-list.md`

### Requirement: Wave1 future expansion tracks documentation

**Reason**: Future Expansion Guidance section 列出 6 个 expansion tracks（topic-specific deepening, subagent dispatch 等）为"只读参考"。Wave1 现在实际执行这些 tracks（queue-driven deepening + sub-agent dispatch），future expansion 不再适用。

**Migration**: 移除 `phase-wave1.md` 的 Future Expansion Guidance section。如果某些能力仍然标记为 future（如 topic artifact quality gates），它们应作为正常 Allowed Actions 或独立的 Future Work 节点存在，而非 wave1 body 内的 expansion tracks。

#### Scenario: Wave1 body no longer contains Future Expansion Guidance

- **WHEN** Phase Agent loads `phase-wave1.md` after the removal
- **THEN** the body SHALL NOT contain a "Future Expansion Guidance" section
- **AND** the 6 expansion tracks SHALL NOT appear as read-only reference content in the wave1 phase body
