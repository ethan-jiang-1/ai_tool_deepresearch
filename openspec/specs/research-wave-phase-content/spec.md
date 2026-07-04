# Research Wave Phase Content

> req: RWP-001, RWP-002, RWP-003, RWP-004, RWP-005, RWP-006, RWP-007, RWP-008, RWP-009, RWP-010, RWP-011, RWP-012, RWP-013, RWP-014

## Purpose

定义 wave0、wave1、wave2 三个 phase node 的完整 body 内容要求。每个 phase node body 必须满足当前 workflow-node contract 的 9 个 section，严格贴合当前 accepted CLI / schema / bundle contract。Wave0 产出 foundation shared reference；Wave1 标记 placeholder capability boundary；Wave2 从 verified artifacts 派生 cross-topic synthesis。

## Requirements

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
  - Step 1 claim: `operate-queue claim <bundle> --actor main-agent` → 读取 stdout JSON 的 `item` 字段 → item 为 null 则 queue 空跳到 §3.3
  - Step 2 execute: `task.targets.delegates.to = "sub-agent"` → `drive-relay-slot stage` → spawn Sub-agent from emitted prompt → Sub-agent 使用 WebSearch → WebFetch → 提取 metadata → 写入 `artifacts/wave0/{topic}/source.yaml` + cache under `_cache/wave0/primary/{topic.slug}/sNN_{source-slug}/` → Phase Agent `drive-relay-slot commit`
  - Step 3 complete: `operate-queue complete <bundle> --result <result.json>` with `slot_result_ref` → receipt check PASS → promote + refill + render; receipt check FAIL → engine 自动生成 repair task → 读 inspect/advice → 修复 → 回到 claim
  - Step 4 读投影: `_cache/agentic-queue/current-task.md` → 确认 done-condition → 回到 step 1
  - 行为约束：不跳过 task、不伪造产出、complete 阻塞必须修复、Sub-agent 搜索输出写 _cache — Phase Agent 只读投影不读完整搜索结果

  **§3.3 收尾与 gate**：
  - 检查并更新 `reference/_INDEX.md`
  - 跑 `check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md`
  - gate pass → 读 `check.next`；gate fail → 按 §7 On Gate Fail 处理

- **Expected Artifacts**: `reference/_INDEX.md`（非空）、`artifacts/wave0/{topic}/source.yaml`（每条 reference 满足 ReferenceMetadata schema，数量 ≥ foundation floor per topic）、`reference/00-shared-*.md`（≥1）、trace 中有 `wave0_completion` event
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
- **THEN** Phase Agent SHALL 为每个 topic 创建一个 task card JSON 文件（含完整 QueueItemSchema 字段）
- **AND** Phase Agent SHALL 使用 `operate-queue enqueue <bundle> --task <task.json>` 逐个灌入
- **AND** action 字段 SHALL 含 WebSearch + WebFetch 指令、目标 schema (ReferenceMetadata) 说明、产出路径 `artifacts/wave0/{topic}/source.yaml`

#### Scenario: Sub-agent executes real search per delegated task card

- **WHEN** task card 的 `targets.delegates.to` 为 `"sub-agent"` 且 `producer_rule` 为 `source_intake_fan_in`
- **THEN** Phase Agent SHALL `drive-relay-slot stage` before spawn
- **AND** Sub-agent SHALL 使用 WebSearch + WebFetch 执行真实搜索
- **AND** Sub-agent SHALL 提取 url, title, retrieved_date, topic_tag 写入 `artifacts/wave0/{topic}/source.yaml`
- **AND** search 中间结果 SHALL 写入 `_cache/wave0/primary/{topic.slug}/sNN_{source-slug}/`
- **AND** Phase Agent SHALL `drive-relay-slot commit` before complete

#### Scenario: Execution loop processes tasks until queue empty

- **WHEN** queue active_window 中有 task card
- **THEN** Phase Agent SHALL claim → execute → complete 循环
- **AND** 当 claim 返回 `item: null` 时循环终止
### Requirement: Wave1 phase body completeness with subagent boundary

`phase-wave1.md` SHALL describe relay-driven topic-specific deepening, not a foundation-placeholder skeleton phase.

The Wave1 lifecycle node SHALL guide the Phase Agent to create one `topic_deepening` task card per topic in `rb_plan.md` `topic_registry`, using accepted TargetSpec wire shape:

- `targets.controller: "main-agent"`
- `targets.delegates.to: "sub-agent"`
- `targets.delegates.role_key: "dpt-evidence-extractor"`

Wave1 primary deepening SHALL produce, for each topic, paired artifacts plus rich reference files:

- `artifacts/wave1/{topic.slug}/evidence-summary.md`
- `artifacts/wave1/{topic.slug}/question-list.md`
- one or more `reference/{topic.slug}-<source-slug>.md` files when fetched sources are accepted

The phase body SHALL state that Wave1 WebSearch/WebFetch work MUST be delegated through the relay pipeline (`drive-relay-slot stage/commit`). Direct Phase Agent search followed by hand-written artifacts is not a legal Wave1 completion path.

#### Scenario: Wave1 lifecycle creates delegated deepening tasks

- **WHEN** Phase Agent loads `phase-wave1.md`
- **THEN** the body SHALL instruct it to enqueue `topic_deepening` task cards for topic registry entries
- **AND** each search-capable task card SHALL delegate to `dpt-evidence-extractor` through `targets.delegates`
- **AND** the Phase Agent SHALL complete task cards through `drive-relay-slot commit` before running `wave1-complete`

#### Scenario: Wave1 no longer writes placeholder skeletons

- **WHEN** Wave1 completes
- **THEN** `artifacts/wave1/{topic}/skeleton.md` with `capability: foundation-placeholder` SHALL NOT be the expected completion artifact
- **AND** `wave1-complete` SHALL be evaluated against relay-produced evidence summaries, question lists, declared references, and accepted quality/countability rules

### Requirement: Wave2 phase body completeness

`phase-wave2.md` SHALL 包含完整的 9-section body，引导 Phase Agent 通过 queue-driven 三阶段执行 cross-topic synthesis：**单轮** synthesis task（§3.2）+ §3.3.2 Quality Re-Fill Loop 处理质量/收敛缺口。

Section 内容要求：
- **Stage Goal**: 从所有 topic 的 wave1 evidence-summary 和 question-list 派生 cross-topic synthesis，通过 finding taxonomy（三类 finding + 六种 decision）+ 单轮 targeted search 发现和填补证据缺口，最终从 ledger/index 投影回填 seed topic 文件
- **Required Inputs**: Wave0 产出的 `reference/_INDEX.md` 和 `artifacts/wave0/{topic}/source.yaml`、Wave1 产出的 `artifacts/wave1/<topic>/evidence-summary.md` 和 `artifacts/wave1/<topic>/question-list.md`、`shared-schemas.md`、`shared-subagent-protocol.md`
- **Allowed Actions** (§3) — 三阶段 queue-driven 模式：

  **§3.1 灌料 (Filling)** — synthesis task + per-topic backfill task cards（逻辑不变；synthesis action 描述单轮 triage + search，非 multi-round 内部循环）
  **§3.2 Queue-driven 执行循环** — Phase 1 synthesis task: 单轮 finding triage + 对 `exploit_search|explore_search` 经 `drive-relay-slot` spawn gap-fill → complete；Phase 2 backfill tasks
  **§3.3 收尾与 gate** — 含 §3.3.2 Quality Re-Fill Loop（gate/self-check gap 时 enqueue supplementary tasks）

- **Expected Artifacts**: 三件套 + backfill token 替换 + `wave2_completion` trace event（与 gate JSON 一致）
- **Gate Command**: `node DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs --bundle <path> --current-node phases/phase-wave2.md`

Iteration limits and quality thresholds SHALL be read from `rb_profile.yaml#/research_style_params`, not phase frontmatter.

#### Scenario: Phase Agent executes wave2 phase via queue-driven loop

- **WHEN** Phase Agent 加载 `phase-wave2.md`
- **THEN** §3 body SHALL 引导 Phase Agent 进入 queue-driven 三阶段：灌料 → 单轮 synthesis + backfill → 收尾+gate（含 §3.3.2 补料循环）
- **AND** body SHALL 明确要求使用 `operate-queue` CLI 进行 claim/complete 循环

#### Scenario: Synthesis task completes in one pass

- **WHEN** synthesis task 执行中
- **THEN** Phase Agent SHALL build scan matrix → classify findings → make decisions → JS feedback check → spawn sub-agents only for exploit/explore_search via driver → project synthesis → complete queue task
- **AND** synthesis task SHALL NOT re-enter an internal multi-round convergence loop

#### Scenario: Quality gap triggers §3.3.2 re-fill

- **WHEN** gate fail 或 §3.3 Quality Self-Check 标记 gap
- **THEN** Phase Agent SHALL enqueue supplementary task cards per §3.3.2 and drain queue before final gate pass

#### Scenario: Backfill tasks execute after synthesis task completes

- **WHEN** synthesis task complete
- **THEN** Phase Agent SHALL claim backfill tasks sequentially
- **AND** backfill content SHALL be projected from ledger/index, not directly from narrative

#### Scenario: Wave2 produces three artifacts, not one

- **WHEN** Phase Agent completes wave2 synthesis phase
- **THEN** `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml` SHALL all exist under `artifacts/wave2/`

### Requirement: Wave1 foundation placeholder boundary enforcement

Wave1 SHALL treat the old prohibition on claiming "topic-specific deepening completed" as a foundation-stage placeholder boundary superseded by this change. Under this change, Wave1 is allowed to claim topic-specific deepening only when the topic's evidence-producing outputs are covered by Engine-written output declarations and current-wave successful relay slot provenance.

Wave1 SHALL continue to forbid fake completion claims. The forbidden set shifts from "do not claim deepening at all" to "do not claim deepening without relay-backed evidence, declared references, cache trail handling, and gate pass."

#### Scenario: Deepening claim requires current-wave relay provenance

- **WHEN** a Wave1 artifact claims topic-specific deepening completed
- **AND** the corresponding reference/evidence outputs are not covered by current-wave output declaration coverage and successful slot binding
- **THEN** `wave1-complete` SHALL fail provenance checks or emit bypass diagnostics according to this change

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

`phase-wave2.md` body SHALL 指示 Phase Agent 在 synthesis 中使用 Markdown link `[label](relative/path.md)` 引用经过 prior-wave 验证的 artifacts。引用 SHALL 使用相对于 `artifacts/wave2/` 的路径（如 `../wave1/<topic>/evidence-summary.md`、`../../artifacts/wave0/<topic>/source.yaml`）。

Synthesis narrative SHALL 至少引用 1 个 wave1 `evidence-summary.md` 或 `question-list.md`，并 SHALL 引用 finding id（W2F-xxx）以保持从 narrative 到 ledger/index 的可追溯性。Synthesis MAY 同时引用 wave0 thin YAML under `artifacts/wave0/{topic}/source.yaml`，但不强制。

#### Scenario: Synthesis reference format is Markdown links

- **WHEN** `check-gate-wave2-complete.mjs` 执行 `cross_field` check
- **THEN** synthesis 中的 Markdown links SHALL 被解析并验证目标存在
- **AND** 至少 1 条 link 指向 wave1 evidence-summary 或 question-list 时 gate 继续；0 条时 gate SHALL fail

#### Scenario: Synthesis references both wave0 and wave1 artifacts

- **WHEN** Phase Agent writes synthesis.md
- **THEN** synthesis MAY contain links to both `../../artifacts/wave0/<topic>/source.yaml` and `../wave1/<topic>/evidence-summary.md`
- **AND** at least 1 link SHALL point to a wave1 artifact

### Requirement: Anti-cheating rules in wave phase bodies

每个 wave phase node body 的 Anti-Cheating Rules section SHALL 包含该 phase 特有禁令，并 reference `shared-anti-cheating-rules.md`。

Wave2 phase-specific 禁令 SHALL 至少包含：
- 禁止只有 `synthesis.md` 而没有 ledger/index 就声称完成 Wave2 emergence handling
- 禁止把所有 finding 都叫 gap（必须区分为 legacy_question / resolution / emergent_question）
- 禁止对 `cross_topic_resolution` spawn Sub-agent 搜索（resolution 是 existing evidence integration）
- 禁止把 `cross_topic_emergent_question` 埋进某个 topic 的 pending questions 而不标注 `source_layer: wave2_cross_topic`
- 禁止 `decision=explore_search` 或 `decision=exploit_search` 但没有 relay/runtime receipt
- 禁止达到 max iteration 后静默丢弃 unresolved finding（必须进入 HITL2 handoff 或 record_only）
- 禁止 `synthesis.md` 写出没有 finding id（W2F-xxx）支撑的关键 cross-topic claim
- 禁止让 Sub-agent 做 cross-topic judgment（Sub-agent 只返回 bounded search/extraction result）
- 禁止 backfill 内容不从 ledger/index 投影（直接从 synthesis.md narrative 摘抄或丢失 source_layer/finding id）
- 禁止跳过 finding triage loop 直接 complete synthesis task
- 禁止凭空总结（不引用任何 Wave0/Wave1 artifact）
- 禁止伪造引用路径
- 禁止声称 synthesis 是完整的 research conclusion

#### Scenario: Wave2 phase has phase-specific anti-cheating rules

- **WHEN** Phase Agent 读取 wave2 的 Anti-Cheating Rules section
- **THEN** section SHALL 至少列出 10 条 phase-specific 禁令
- **AND** 每条禁令 SHALL 指向正确替代动作

### Requirement: Relay role spec files are Phase-Agent-loaded guidance

`subagent-dpt-source-intake.md`, `subagent-dpt-evidence-extractor.md`, and `subagent-dpt-topic-scout.md` SHALL be treated as relay subagent role specification files loaded by the Phase Agent. They are not manifest lifecycle phase nodes. They SHALL NOT appear in `manifest.phases[]` or receive lifecycle header injection.

Each role spec SHALL state that the Phase Agent reads it to construct bounded relay slot instructions, and the Sub-agent receives only the generated slot `task.md`, `result.schema.json`, runtime receipt, and slot-local/cache paths.

The role mapping SHALL be:

| Role spec | Role key | Primary consuming phase |
|-----------|----------|-------------------------|
| `subagent-dpt-source-intake.md` | `dpt-source-intake` | Wave0 |
| `subagent-dpt-evidence-extractor.md` | `dpt-evidence-extractor` | Wave1 and Wave2 backing supplementary tasks |
| `subagent-dpt-topic-scout.md` | `dpt-topic-scout` | Wave2 gap-fill/search |

#### Scenario: Role spec is not in manifest lifecycle

- **WHEN** workflow package validation examines manifest phases
- **THEN** no `subagent-dpt-*` role spec SHALL appear in `manifest.phases[]`
- **AND** lifecycle header injection SHALL NOT be applied to those role spec files

### Requirement: Wave2 rerun full re-synthesis on topic addition

The `phase-wave2.md` Rerun-Aware Behavior section SHALL include a scenario table distinguishing `action: add` (full re-synthesis) and `action: supplement` (delta/append).

`action: add` behavior SHALL align with wave0 (`phase-wave0.md` L266) and wave1 (`phase-wave1.md` L404) `action: add` semantics: full execution, same as first run.

When `action: add`:
- Phase Agent SHALL re-read evidence-summary.md for all topics (including the new topic)
- Phase Agent SHALL rebuild the cross-topic scan matrix covering all topic pairs
- Phase Agent SHALL generate synthesis.md, cross-topic-ledger.md, finding-index.yaml from scratch
- Old synthesis may be preserved as backup (`*.prev-rerun-N.md`) but SHALL NOT serve as baseline

When `action: supplement`, maintain current delta/append behavior (`phase-wave2.md` L351-376 existing text).

The wave2-complete gate SHALL include a rerun add coverage check: when any seed topic declares `action: add`, `synthesis.md` SHALL NOT use `## Delta Synthesis` as the main processing path, and `cross-topic-ledger.md` or `finding-index.yaml` SHALL cover all topic slugs from `rb_plan.md` topic_registry.

For `action:add`, slug-name coverage alone SHALL NOT be sufficient when the added topic can be identified. The gate SHALL also verify that the added topic participates in cross-topic scan coverage with every pre-existing topic, either through explicit topic-pair rows in `cross-topic-ledger.md` or equivalent structured entries in `finding-index.yaml`.

#### Scenario: Wave2 rerun action:add triggers full synthesis

- **WHEN** a seed topic file contains `action: add` (new topic)
- **THEN** Phase Agent SHALL perform full re-synthesis, not append a delta section
- **AND** synthesis.md SHALL NOT contain `## Delta Synthesis (Rerun N)` header
- **AND** gate SHALL fail if scan/index coverage omits any topic slug
- **AND** gate SHALL fail if the added topic has no scan coverage with any pre-existing topic

#### Scenario: Slug-only coverage is insufficient for added topic

- **WHEN** a seed topic file contains `action: add`
- **AND** `finding-index.yaml` lists all topic slugs but no topic-pair or scan evidence involving the added topic
- **THEN** wave2 gate SHALL fail with inspect/advice requesting full cross-topic scan coverage

#### Scenario: Wave2 rerun action:supplement keeps delta mode

- **WHEN** a seed topic file contains `action: supplement`
- **THEN** Phase Agent SHALL retain existing synthesis as baseline
- **AND** new analysis SHALL be appended with `## Delta Synthesis (Rerun N)` header

### Requirement: Rerun action:add SHALL include full cache trail

`phase-wave0.md` 和 `phase-wave1.md` 的 Rerun-Aware Behavior SHALL 明确要求：当 rerun 触发 `action: add`（新增 topic）时，该 topic 的 source intake 流程 SHALL 与首次运行一致——Sub-agent MUST 写入 `_cache/` 目录（含 `websearch.json`/`page.md`/`meta.json`），Phase Agent MUST 在 spawn 前创建 cache 目录，queue task card 的 `action` 字段 MUST 包含 cache 路径指令。

Rerun 场景表的 `action: add` 行 SHALL 新增一行说明：`_cache/ 写入：与首次运行一致——每个 source 在 sNN_<slug>/ 下保存 3 文件`。

#### Scenario: Rerun adds a topic with full cache trail
- **WHEN** HITL2 rerun 触发 `action: add` 新增 topic 06
- **AND** Wave1 deepening Sub-agent 为 topic 06 搜索 3 个 source
- **THEN** `_cache/wave1/primary/06_topic-slug/` 目录 SHALL 含 3 个 source 子目录
- **AND** 每个 source 子目录 SHALL 含 `websearch.json`/`page.md`/`meta.json`

#### Scenario: Rerun action:supplement respects existing cache
- **WHEN** HITL2 rerun 触发 `action: supplement` 补充已有 topic
- **AND** 该 topic 已有 cache 目录
- **THEN** 补充的 source SHALL 追加到已有 cache 目录（不覆盖）
- **AND** 文件名 SHALL 不与已有 source 冲突（继续递增 NN）
