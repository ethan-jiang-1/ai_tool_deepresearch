> req: STM-001

## MODIFIED Requirements

### Requirement: Seed topic materialization phase node

`phase-seed-topics.md` SHALL provide a complete 9-section body between setup
and Wave0. It SHALL declare `phase: seed-topics`, `gate: seed-topics-ready`,
and `stop: "no"`; its queue-driven stages remain fill, execution loop, then
finalize and gate.

On an empty queue, the phase SHALL read `rb_plan.md#/topic_registry`, create
one complete `seed_topic_materialize` QueueItemSchema card per current topic,
and enqueue it through the existing queue path. During execution it SHALL
resolve the claimed slug to one current UID, edit only Agent-owned body content,
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

Every new canonical seed SHALL retain its accepted two-part form: registry-
projected canonical frontmatter plus Agent-owned enrichment/body, followed by
the research-round appendix. The appendix SHALL contain, in slot-map order,
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
The renderer's small executable slot map is the
structural source; the shared template is its readable mirror. Static parity
SHALL fail on a missing, extra, reordered or renamed canonical heading/token/
owner/card descriptor, while ignoring prose bytes, YAML field order and
presentation-only whitespace.

`rb_plan.md#/topic_registry` remains Topic identity/intent authority;
frontmatter remains the structured enrichment surface; submitted work-unit and
finding facts remain projection authority. The template, renderer and initial
seed phase SHALL not create a new evidence, identity, gate or receipt authority.
Empty later-Wave slots remain legal for `seed-topics-ready`; no semantic quality
judgment is introduced.

#### Scenario: Seed phase loads the pure document template

- **WHEN** the Phase Agent enters `phase-seed-topics.md`
- **THEN** its loaded requires chain SHALL include
  `templates/seed-topic-template`
- **AND** the template SHALL answer the instantiated document-shape question
  without defining packet execution or repair semantics

#### Scenario: New seed has an aligned empty appendix

- **WHEN** topic-state materializes a new canonical seed before later Waves
  produce research facts
- **THEN** the seed SHALL contain every canonical ordered slot and its accepted
  token exactly once
- **AND** seed-topics-ready SHALL not fail merely because a later Wave has not
  projected an entry

#### Scenario: New seed renders fixed backfill cards

- **WHEN** topic-state materializes a new canonical seed
- **THEN** every canonical Appendix Slot SHALL place its exact `回填卡` directly
  below its heading and before its token
- **AND** the card SHALL survive later writer materialization without becoming
  an entry or a second source of authority

#### Scenario: Template and renderer drift fail deterministically

- **WHEN** a template edit changes a slot heading, token, owner or order without
  the corresponding executable slot-map change, or vice versa
- **THEN** static parity validation SHALL fail
- **AND** runtime code SHALL not parse guidance Markdown to discover the change

#### Scenario: Initialization remains a structured authoring loop

- **WHEN** a claimed seed-topic materialization card has insufficient upstream
  semantic detail
- **THEN** the Agent SHALL retain an explicit nonempty gap in the existing
  `enrich_seed` input and run the existing apply/queue-complete loop
- **AND** it SHALL not invent semantic facts, duplicate registry values in body
  prose, or use an appendix token as initialization authority

#### Scenario: Legacy body remains readable

- **WHEN** a pre-existing seed contains compatible legacy body prose outside
  canonical structured fields
- **THEN** the initial enrichment path SHALL preserve it as body history
- **AND** it SHALL not infer canonical identity, evidence authority or a
  projection writer path from that prose

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
