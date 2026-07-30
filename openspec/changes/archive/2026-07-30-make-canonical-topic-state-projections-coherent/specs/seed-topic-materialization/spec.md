> req: STM-001, STM-002

## MODIFIED Requirements

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
actual `requires` chain. `DPT_FRAMEWORK/workflows/nodes/templates/` is the
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

`DPT_FRAMEWORK/schema/gate_definitions/gate-seed-topics-ready.definition.json` SHALL 定义当前 contract 下的 deterministic rules。

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
