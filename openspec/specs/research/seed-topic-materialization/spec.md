# Seed Topic Materialization

> req: STM-001, STM-002, STM-003, STM-004, STM-005, STM-006, STM-007, STM-008, STM-009

> delta-synced: strengthen-user-intent-carry-through (STM-009)

## Purpose

定义在 setup 与 wave0 之间插入的 **seed topic 物化阶段**（`phase-seed-topics.md` + `seed-topics-ready` gate）。此阶段强制 Phase Agent 把 `rb_plan.md` frontmatter 中的 `topic_registry` 物化为 `seed_topics/` 目录下的独立文件，并用 deterministic 规则检查结构合法性与数量 floor。

**存在的理由**：`wff-pre-research` 的 HITL1 只把 seed topics 写进 `rb_plan.md` 的 `topic_registry` frontmatter，从不物化到 `seed_topics/` 目录。`setup-ready` gate 只检查 `seed_topics/` 目录存在（空目录也 pass），导致 Phase Agent 可带着空 `seed_topics/` 进入 Wave0 研究。虽然 `wff-research-waves` 的 `wave0-complete` gate 已设计"topic_registry 为空时 fail"的防线，但该防线位置过晚（在 Wave0），且只检查 registry 非空，不检查物化一致性或数量 floor。本阶段把这道防线前移并加固为独立确定性 gate。

Gate 只做 deterministic 结构/数量/一致性检查；seed topic 的语义质量（topic 是否"好"、是否与研究问题对齐）由人类在 HITL1（`stop: yes`）审查，本阶段不新增 stop 点。
## Requirements
### Requirement: Seed topic materialization phase node

`phase-seed-topics.md` SHALL provide a complete 9-section body between setup
and Wave0. It SHALL declare `phase: seed-topics`, `gate: seed-topics-ready`,
and `stop: "no"`; its queue-driven stages remain fill, execution loop, then
finalize and gate.

On an empty queue, the phase SHALL read `rb_plan.md#/topic_registry`, create
one complete `seed_topic_materialize` QueueItemSchema card per current topic,
and enqueue it through the existing queue path. During execution it SHALL
resolve the claimed slug to one current UID, edit only the declared
Agent-editable initialization region,
retain a complete `enrich_seed` input, invoke existing `operate-topic-state
apply`, complete the card through existing receipt validation, and return to
claim. It SHALL not hand-author registry-owned YAML fields or use direct seed
frontmatter mutation except for the exact existing syntax-repair boundary.

`phase-seed-topics.md` SHALL load `templates/seed-topic-template` through its
actual `requires` chain. `DEEP_RESEARCH_HARNESS/workflows/nodes/templates/` is the
namespace for reusable, instantiable document templates. This Seed Topic
template defines only initialization body/frontmatter, appendix slot map,
canonical five-field Projection Entry presentation shape, token lifecycle, and
per-slot writer/timing cues. Projection Packet grammar, lifecycle authorization,
repair and rerun-direction operations belong to the existing
`command_playbook/operate-topic-state.md`; they SHALL NOT be duplicated in a
template.

Every newly rendered canonical seed SHALL have exactly two visibly distinct
body regions in this order: one `seed-initialization` region bounded by stable
start/end markers and containing the single Agent-editable initialization
headings, followed by one Engine-owned research-round appendix. The
initialization end marker SHALL occur exactly once before the appendix; no
initialization heading or template pending marker may appear below it. The
appendix SHALL contain, in slot-map order,
`## Wave0：本主题的新增来源证据`,
`## Wave1：本主题的机制理解`,
`## Wave1：本主题的趋势、难点与限制`,
`## Wave2：本主题的当前跨主题判断`, and
`## 本主题的待验证问题与后续验证路径`, with their respective one-time
tokens. Each canonical heading SHALL be immediately followed by its permanent,
read-only `回填卡（只读操作约束，不是 Projection Entry）`, then that slot's token
or entries. The card SHALL state its writer, direct authority, `entry_id` plus
five-field entry shape, backfill timing, a concise `operate-topic-state`
materialization pointer and prohibitions; it SHALL not be a Projection Entry.
The renderer's small executable slot map is the structural source; the shared
template is its readable mirror. Static parity SHALL fail on missing, extra,
reordered, or renamed region/heading/token/owner/card descriptors while
ignoring prose bytes, YAML field order, and presentation-only whitespace.

For the Wave0 `wave0_evidence` card specifically, its
`<work_id>/<positive ordinal>` notation SHALL define the positive ordinal as
the exact global ordinal owned by that work unit's submitted source contribution
in the current validated `artifacts/wave0/<topic>/source.yaml` array. It SHALL
state that a later legal append gets its own contribution identity and SHALL not
describe `result_hash` as a source-byte snapshot. A multi-element source
intake is backfilled with one entry or exact identity-bound deferred disposition
per contribution-owned candidate, potentially in one packet. The card SHALL NOT
embed packet JSON, lifecycle authorization, source parsing mechanics, or a
second source-authority claim.

`rb_plan.md#/topic_registry` remains Topic identity/intent authority;
frontmatter remains the structured enrichment surface; submitted work-unit and
finding facts remain projection authority. The template, renderer, and initial
seed phase SHALL not create a new evidence, identity, gate, or receipt authority.
Empty later-Wave slots remain legal for `seed-topics-ready`; no semantic quality
judgment is introduced. Legacy seeds remain readable: their body prose is not
retroactively migrated or inferred into frontmatter, but a newly rendered seed
must never contain duplicate initialization skeletons.

#### Scenario: Seed phase loads the pure document template

- **WHEN** the Phase Agent enters `phase-seed-topics.md`
- **THEN** its loaded requires chain SHALL include
  `templates/seed-topic-template`
- **AND** the template SHALL answer the instantiated document-shape question
  without defining packet execution or repair semantics

#### Scenario: New seed has an aligned empty appendix

- **WHEN** topic-state materializes a new canonical seed before later Waves
  produce research facts
- **THEN** it SHALL contain exactly one bounded initialization region followed
  by every ordered appendix slot and token exactly once
- **AND** seed-topics-ready SHALL not fail merely because a later Wave has not
  projected an entry
#### Scenario: Editing initialization cannot leave a second template ghost

- **WHEN** an Agent replaces initialization content through the declared editable
  region
- **THEN** no duplicate initialization heading or template pending marker SHALL
  remain below the initialization end marker
- **AND** the appendix cards, tokens, and future projection ownership SHALL
  remain unchanged

#### Scenario: New seed renders fixed backfill cards

- **WHEN** topic-state materializes a new canonical seed
- **THEN** every canonical Appendix Slot SHALL place its exact `回填卡` directly
  below its heading and before its token
- **AND** the card SHALL survive later writer materialization without becoming
  an entry or a second source of authority

#### Scenario: Wave0 card makes ordinal fillable without owning protocol

- **WHEN** a Phase Agent reads a newly rendered Wave0 card before closeout
- **THEN** the card SHALL explain that `<work_id>/N` uses the current source
  array ordinal owned by that submitted contribution
- **AND** it SHALL direct the Agent to the existing command playbook for packet
  formation and apply/repair mechanics
#### Scenario: One template card does not turn candidates into evidence

- **WHEN** a Wave0 card describes multiple candidates from one source intake
- **THEN** it SHALL retain submitted source output as direct authority
- **AND** it SHALL not describe a Seed Topic entry or disposition as evidence,
  reference, receipt, cache, or independent Gate authority; its only coverage
  effect remains the existing return-map evaluator

#### Scenario: Template and renderer drift fail deterministically

- **WHEN** a template edit changes a region marker, slot heading, token, owner,
  or order without the corresponding executable descriptor change, or vice versa
- **THEN** static parity validation SHALL fail
- **AND** runtime code SHALL not parse guidance Markdown to discover behavior
#### Scenario: Initialization remains a structured authoring loop

- **WHEN** a claimed seed-topic materialization card has insufficient upstream
  semantic detail
- **THEN** the Agent SHALL retain an explicit nonempty gap in the existing
  `enrich_seed` input and run the existing apply/queue-complete loop
- **AND** it SHALL not invent semantic facts, duplicate registry values in body
  prose, or use an appendix token as initialization authority

#### Scenario: Legacy body remains readable

- **WHEN** a pre-existing seed contains compatible legacy body prose or
  duplicate historical headings outside canonical structured fields
- **THEN** the initial enrichment path SHALL preserve it as body history
- **AND** it SHALL not require a bulk migration or infer body prose as authority
#### Scenario: Phase Agent executes seed-topics via queue-driven loop

- **WHEN** the Phase Agent loads `phase-seed-topics.md`
- **THEN** Section 3 SHALL direct fill, body edit plus structured enrichment apply, queue completion, and finalize-plus-gate
- **AND** the body SHALL NOT regress to free-form Allowed Actions or raw canonical YAML authoring
- **AND** the loaded required context SHALL include the shared seed-topic authoring contract

#### Scenario: Seed topic file is a search-relevant decision document

- **WHEN** the Phase Agent materializes or enriches a seed topic
- **THEN** the output SHALL contain registry-projected canonical fields, all accepted structured enrichment frontmatter fields and the non-duplicating search-relevant semantic body sections
- **AND** SHALL preserve explicit gap values when upstream semantics are absent
- **AND** SHALL NOT be only UID/id/slug/title plus a generic chapter-label body

#### Scenario: Shared contract is the complete readable skeleton

- **WHEN** an Agent needs to materialize an initial or rerun-added seed topic
- **THEN** one loaded shared Markdown surface SHALL expose the complete structured input, non-duplicating initialization body and research-appendix skeleton
- **AND** the Agent SHALL NOT need to reconstruct the legal writer loop from multiple phase examples or hand-copy registry fields

#### Scenario: Seed topic contains the research-round appendix

- **WHEN** seed-topics completes
- **THEN** each seed SHALL contain the `═══ 研究轮次追加区 ═══` boundary, responsibility mapping, canonical section family, and accepted one-time tokens/placeholders
- **AND** `seed-topics-ready` SHALL NOT fail solely because the owning later Wave has not filled a section

#### Scenario: Renderer and shared appendix remain structurally aligned

- **WHEN** the deterministic topic-state renderer materializes a new canonical seed
- **THEN** its ordered research-appendix headings and accepted token set SHALL match the shared authoring contract
- **AND** a parity test SHALL fail if either representation drifts independently

#### Scenario: Missing upstream information is recorded as a gap

- **WHEN** `topic_registry` or `rb_profile.yaml` lacks enough hypothesis or search-guardrail detail
- **THEN** the Agent SHALL submit a structurally valid explicit gap through `enrich_seed`
- **AND** SHALL NOT invent information to satisfy presentation
- **AND** the existing gate MAY still pass because semantic completeness is not its authority

#### Scenario: Canonical and structured fields are not authored twice

- **WHEN** the Agent follows the current phase task card and shared authoring contract
- **THEN** `must_answer` SHALL be copied by Engine from the registry without Agent summary or body duplication
- **AND** `in_scope`, `out_of_scope`, and `evidence_route` SHALL be authored once in the structured enrichment object/frontmatter
- **AND** the Markdown body SHALL remain available for non-duplicating research judgment

#### Scenario: Legacy duplicate body sections remain read-compatible

- **WHEN** an in-flight or pre-v0.50 seed contains legacy body copies of must-answer, scope or evidence-route prose
- **THEN** `enrich_seed` SHALL preserve those body bytes and normal deterministic checks SHALL ignore them as authority
- **AND** no migration or body-to-frontmatter inference SHALL be required for completion

#### Scenario: Rerun direction is not prefilled without rationale

- **WHEN** an initial seed or layout-only mutation is materialized without a sanctioned add/refine/supplement rerun rationale
- **THEN** the skeleton SHALL NOT prefill a `## 本轮重跑方向` section or direction token
- **AND** the shared direction fragment SHALL remain an authoring reference rather than runtime state

### Requirement: Seed topics ready gate rule set

`DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-seed-topics-ready.definition.json` SHALL 定义当前 contract 下的 deterministic rules。

规则 SHALL 覆盖（全部 deterministic，无语义判断）：
- `seed_topics/` 目录非空（至少 1 个 `.md` 文件）
- 每个 `seed_topics/<slug>.md` 的 frontmatter `title` 非空（`field_non_empty` check type）；frontmatter `slug` 与文件名 stem 一致由 `cross_field(slug_consistency)` 的 per-file 校验覆盖
- `seed_topics/` 下文件 slug 集合 = `rb_plan.md#/topic_registry` 的 slug 集合（双向一致，无多余、无缺失）
- trace 中有 `seed_topics_completion` event（`trace_event_present` check type）
- `rb_status.json#/current_gate == seed_topics_ready`
- `rb_status.json#/next_gate == wave0_complete`

Topic 集合的 source of truth SHALL 为 `rb_plan.md` frontmatter 的 `topic_registry`（与 `wave0-complete` gate D5 一致）。Gate SHALL 枚举 registry 的 slug，SHALL NOT 扫描磁盘推断 topic 集合。`topic_registry` 为空时 gate SHALL return `passed: false`。

For a seed rendered with the current canonical initialization markers, the Gate
SHALL additionally verify exactly one ordered initialization region, exactly one
initialization end marker before the appendix, and absence of renderer-owned
initialization headings or pending markers below that boundary. A legacy seed
without current markers remains read-compatible and is not failed solely for
historical duplicate body prose. The Gate SHALL not judge the Agent's research
prose or treat the body as a second canonical registry.

#### Scenario: Current canonical seed rejects a template ghost

- **WHEN** a current-marker seed retains a duplicated renderer-owned
  initialization heading or pending marker below its initialization end marker
- **THEN** `seed-topics-ready` SHALL return one structural seed-body root
- **AND** feedback SHALL identify the bounded initialization edit surface and
  the same Gate rerun

#### Scenario: Legacy duplicate does not create new authority failure

- **WHEN** a legacy seed lacks current initialization markers but contains old
  duplicate prose
- **THEN** the Gate SHALL preserve existing compatibility behavior
- **AND** it SHALL not infer a second topic registry, evidence fact, or raw
  Metadata repair path

#### Scenario: All seed topics rules pass

- **WHEN** registry 含 3 个 topic，`seed_topics/` 下有 3 个对应 `.md` 文件，slug 双向一致，frontmatter 合法，trace 有 `seed_topics_completion`
- **THEN** gate SHALL return `passed: true`，`check.next` 指向 `phases/phase-wave0.md`

#### Scenario: Slug mismatch fails

- **WHEN** `seed_topics/` 下文件 slug 集合与 registry slug 集合不一致（多余、缺失或拼写不同）
- **THEN** gate SHALL return `passed: false`，`inspect` SHALL 列出不一致的 slug

#### Scenario: Count below registry fails

- **WHEN** `seed_topics/*.md` 文件数 < registry topic 数
- **THEN** gate SHALL return `passed: false`，`inspect` 指向缺失的 topic 物化文件

#### Scenario: Malformed frontmatter fails

- **WHEN** 某 `seed_topics/<slug>.md` 缺少 `slug` 或 `title`，或 slug 与文件名不一致
- **THEN** gate SHALL return `passed: false`

### Requirement: Seed topics gate CLI implementation

`DEEP_RESEARCH_HARNESS/cli/gates/check-gate-seed-topics-ready.mjs` SHALL 使用 `gate-helpers.mjs` standard pipeline（`parseGateCliArgs` → `loadGateDefinition` → `validateNodeGateBinding` → iterate rules → `resolveRouting` → `buildGateResult` → `emitGateResult`），延续 `wff-pre-research` / `wff-research-waves` 的 gate CLI 模式。

CLI SHALL 支持 `trace_event_present`（由 `wff-research-waves` 引入的 `readTraceEvents` helper）。

CLI SHALL 实现 slug 一致性检查（`cross_field` 新增 `mode: "slug_consistency"`）：读取 `seed_topics/` 下所有 `.md` 的 frontmatter slug + 文件名 stem 组成磁盘 slug 集合，与 `rb_plan.md#/topic_registry` 的 slug 集合比较，双向一致才 pass。此 mode 与 `basename_consistency` 和 `markdown_link_resolution` 并列，由 gate definition JSON 的 `mode` 字段区分。

CLI SHALL 延续 double trace 约定：gate attempt 写入 `rb_trace.jsonl`。

#### Scenario: Empty seed_topics directory detected

- **WHEN** `seed_topics/` 存在但为空目录
- **THEN** `dir_non_empty` rule SHALL fail，gate SHALL return `passed: false`，`inspect` 指向空目录

#### Scenario: Slug consistency bi-directional

- **WHEN** registry 有 slug A/B/C 但磁盘只有 A/B
- **THEN** cross_field(slug_consistency) SHALL fail，inspect 报告缺失 C
- **WHEN** 磁盘有 A/B/C/D 但 registry 只有 A/B/C
- **THEN** cross_field(slug_consistency) SHALL fail，inspect 报告多余 D

### Requirement: Workflow registration of seed-topics phase

Workflow registration surface SHALL 同步插入 seed-topics 阶段，保持 transition 一致性：
- `DEEP_RESEARCH_HARNESS/workflows/manifest.json`：phases 数组在 setup 与 wave0 之间插入 `{ "key": "seed-topics", "node": "phases/phase-seed-topics.md", "gate": "seed-topics-ready" }`
- `DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json`：`phase-setup.md` 的 `passed` 改指向 `phase-seed-topics.md`；新增 `phase-seed-topics.md` → `passed` → `phase-wave0.md`
- `DEEP_RESEARCH_HARNESS/schema/enums.mjs` 的 `CurrentGate`：新增 `seed_topics_ready`（位于 `setup_ready` 与 `wave0_complete` 之间）

`rb_status.json` 模板（`rb_templates/`）的 `current_gate`/`next_gate` 初始值 SHALL 直接反映新阶段：`current_gate` SHALL 为 `setup_ready`，`next_gate` SHALL 为 `seed_topics_ready`。

#### Scenario: Transition chain routes through seed-topics

- **WHEN** setup gate pass 后查询 next node
- **THEN** routing SHALL 返回 `phases/phase-seed-topics.md`，而非直接 `phases/phase-wave0.md`
- **AND** seed-topics gate pass 后 routing SHALL 返回 `phases/phase-wave0.md`

### Requirement: Seed topics boundary enforcement playbook

The current manifest-registered `case-124-standard-seed-topics-boundary` role SHALL verify the seed-topics gate materialization path and boundary enforcement in a fresh contained disposable bundle. It SHALL pre-seed post-setup topic registry state, materialize all seed topics for a real pass, and exercise empty-directory, missing-slug and extra-file failures with inspect identifying the applicable `dir_non_empty` or bidirectional `slug_consistency` boundary. Its Markdown body SHALL expose slug-consistency DO/DON'T guidance.

Every verdict-affecting boundary SHALL be recorded as a stable strict playbook-owned check in bundle-root `rb_trace.jsonl`; V2 required checks and native completion SHALL replace the removed legacy `test-simple-*` path and any console-only verdict. The Playbook Agent SHALL stop before Supervisor health/cleanup.

#### Scenario: Seed topics pass and fail are trace-backed

- **WHEN** registry and seed files are complete and bidirectionally slug-consistent
- **THEN** the real seed-topics gate SHALL pass
- **AND WHEN** the directory is empty or slugs are missing/extra
- **THEN** the real gate SHALL fail with the applicable inspect
- **AND** native completion SHALL require the case-owned pass and three negative-boundary check IDs

#### Scenario: Seed topics pass and fail both trace-backed

- **WHEN** registry entries and `seed_topics/` files are bidirectionally slug-consistent
- **THEN** the real seed-topics gate passes
- **AND WHEN** the directory is empty or a slug is missing or extra
- **THEN** the real gate fails with applicable inspect
- **AND** native completion derives the verdict from the required one pass and three negative-boundary root-trace checks

### Requirement: Topic slug SHALL include zero-padded numeric prefix

`topic_registry` 中每个 entry 的 `slug` 字段 MUST 使用 `NN_descriptive-name` 格式，其中 `NN` 为零填充的 1-based 序号（`01`、`02`、... `0N`），按该 entry 在 `topic_registry` 数组中的位置确定。`descriptive-name` SHALL 为 kebab-case 描述性短名。

本 requirement 不强制 `id` 字段的格式——`id` SHOULD 与 `NN` 一致（如 `"01"`）以保持一致性，但 gate 不校验 `id` 格式。`NN` 的 source of truth SHALL 为 `topic_registry` 数组顺序，NOT `id` 字段。

Gate 的 `per_file_slug_stem_consistency` rule（byte-for-byte `file_stem == frontmatter_slug`）和 `slug_consistency` rule（bidirectional `disk_slug_set == registry_slug_set`）均 SHALL 自然兼容此前缀约定——因为前缀是 slug 本身的一部分，不需 gate 改动。

#### Scenario: Topic registry entries have NN-prefixed slugs

- **WHEN** `topic_registry` 包含 3 个 topic
- **THEN** 第 1 个 entry 的 `slug` SHALL 以 `01_` 开头
- **AND** 第 2 个 entry 的 `slug` SHALL 以 `02_` 开头
- **AND** 第 3 个 entry 的 `slug` SHALL 以 `03_` 开头

#### Scenario: ls seed_topics shows files in numeric order

- **WHEN** `seed_topics/` 下有 5 个物化文件，slug 分别为 `01_meal-timing-...`、`02_front-vs-back-...`、`03_late-eating-...`、`04_early-vs-late-...`、`05_timing-causation-...`
- **THEN** `ls seed_topics/` SHALL 按 `01_`, `02_`, `03_`, `04_`, `05_` 字母序（即 registry 数组顺序）排列
- **AND** 用户 SHALL 无需打开 frontmatter 即可从文件名看出 topic 顺序

#### Scenario: Gate triple consistency passes with NN_ prefix slug

- **WHEN** registry slug = `"01_meal-timing-blood-glucose-insulin"`
- **AND** seed topic 文件名为 `01_meal-timing-blood-glucose-insulin.md`
- **AND** frontmatter `slug: 01_meal-timing-blood-glucose-insulin`
- **THEN** `per_file_slug_stem_consistency` rule SHALL pass（`file_stem` == `frontmatter_slug` == `"01_meal-timing-blood-glucose-insulin"`）
- **AND** `slug_consistency` rule SHALL pass（disk slug set == registry slug set）

#### Scenario: Downstream paths inherit NN_ prefix from slug

- **WHEN** topic slug = `"01_meal-timing-..."`
- **THEN** `artifacts/wave0/01_meal-timing-.../source.yaml` SHALL be the artifact path
- **AND** `artifacts/wave1/01_meal-timing-.../evidence-summary.md` SHALL be the artifact path
- **AND** `seed_topics/01_meal-timing-....md` SHALL be the seed topic file
- **AND** all paths SHALL be constructed from `{topic.slug}` without additional prefix decoration

### Requirement: Seed topics SHALL be UID-bound canonical projections

Every canonical registry entry SHALL have exactly one `seed_topics/<slug>.md` projection carrying matching topic UID, id, slug, title, must-answer set, scope role and dependency UIDs. Current add/update apply and any required explicit recover SHALL finish registry and touched seed replacements before topic-scoped queue/content work. Seed presence or filename SHALL NOT create topic identity independently.

HITL1 topic-state apply SHALL create the initial UID-bound seed skeleton after user approval. The seed phase SHALL verify and enrich that projection; it SHALL NOT remain the first durable writer of approved topic intent.

Seed readiness SHALL validate exact UID/slug/intent binding for a schema-valid canonical plan. A plan that does not meet the current canonical plan contract SHALL fail through its existing plan/topic-state prerequisite before seed compatibility is evaluated. Seed readiness SHALL NOT retain a slug-only legacy success path, synthesize UIDs, create canonical topics, authorize mutation, migrate a plan, or upgrade historical seed bytes.

#### Scenario: Add commits seed before work eligibility
- **WHEN** topic-state apply adds a topic
- **THEN** canonical registry and matching complete UID-bound seed SHALL commit before the topic is eligible for work

#### Scenario: Orphan seed does not become authority
- **WHEN** a seed has no matching canonical UID
- **THEN** inspect/gate SHALL report an orphan projection and SHALL NOT infer a new topic

#### Scenario: Legacy seed compatibility does not become canonical authority
- **WHEN** a selected bundle uses a mutable plan that fails the current canonical plan contract
- **THEN** seed readiness SHALL stop at the existing plan/topic-state prerequisite
- **AND** it SHALL not accept slug-only seed compatibility or infer a UID, topic addition, intent mutation, migration, or upgrade from filename or prose

### Requirement: Seed projection SHALL follow committed current topic layout

After successful layout mutation, every remaining canonical topic SHALL have exactly one UID-bound `seed_topics/<current-slug>.md` projection with current id/slug/title and unchanged semantic intent unless the explicit layout target changed title. Previous seed filenames SHALL not remain as aliases. Safe remove MAY delete only the seed of a topic already proven to have no durable history or dependency.

A generated new current seed path SHALL be created only when absent or when it is the same UID's existing current seed path being replaced. An unexplained existing target SHALL block rather than be adopted or overwritten.

#### Scenario: Renumber replaces and rebinds seed
- **WHEN** a topic keeps its UID but receives a new ordinal slug
- **THEN** recovery SHALL leave one seed at the current path with matching current metadata
- **AND** no old-path seed alias SHALL remain

#### Scenario: Seed replacement crash exposes exact recovery
- **WHEN** the process stops after the new current seed is written but before registry replacement or old-seed cleanup
- **THEN** topic-state inspect SHALL report the accepted workspace and exact recover command
- **AND** seed/gate checks SHALL short-circuit downstream mismatch noise

#### Scenario: Orphan target seed is not overwritten
- **WHEN** the target current seed filename already exists without binding to the same UID's current projection
- **THEN** layout apply SHALL reject before prepared publication and preserve that file

### Requirement: Seed materialization SHALL project applicable baseline intent into existing topic-local surfaces

When the HITL1 controls baseline materially affects a canonical Topic, the
Seed Topics Agent SHALL express the smallest topic-local operational
interpretation through the existing `enrich_seed` input and initialization
body. It SHALL use `search_guardrails` and `evidence_route`, add or refine
`hypothesis` and `in_scope` only when needed, and explain the Topic's research
or delivery relevance in the existing non-duplicating body. The complete
controls snapshot SHALL remain only at its host-file coordinate.

When a control does not apply to a Topic, the Agent SHALL not create an empty
or decorative projection. When upstream meaning is insufficient, it SHALL use
the existing explicit non-empty gap form rather than invent intent. The
projection SHALL NOT change canonical Topic identity, add frontmatter fields,
copy full user wording, pre-author future Wave task briefs, or become a Gate or
Engine semantic verdict. Deterministic checks may prove this structural
boundary, but only native completion from a real Agent-flow run may evidence
the Agent's semantic projection behavior.

#### Scenario: Source restriction reaches an affected Topic

- **WHEN** the controls baseline requires a source policy that materially affects one canonical Topic
- **THEN** the Topic's existing search guardrails and evidence route SHALL contain a bounded topic-local interpretation
- **AND** the full controls snapshot SHALL remain at the original plan coordinate

#### Scenario: Unaffected Topic receives no copied control brief

- **WHEN** a baseline control has no material effect on another Topic
- **THEN** Seed materialization SHALL retain the normal enrichment path for that Topic
- **AND** it SHALL not copy the control, create an empty intent field, or alter Topic identity

#### Scenario: Missing semantic detail remains an explicit gap

- **WHEN** the baseline does not provide enough detail for a required enrichment value
- **THEN** the Agent SHALL write the existing structurally valid explicit gap
- **AND** neither Agent nor Engine SHALL fabricate a more specific interpretation
