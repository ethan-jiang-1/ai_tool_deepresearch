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

`phase-seed-topics.md` SHALL load `shared/shared-seed-topic-template` through
its actual `requires` chain. This is the one complete human/Agent-facing Seed
Topic Document contract for initialization body/frontmatter, appendix slot map,
canonical five-field Projection Entry shape, token/merge lifecycle, legal
writer loop, repair map, and sanctioned rerun-direction fragment. It SHALL NOT
require an Agent to reconstruct the document from multiple shared files.

Every new canonical seed SHALL retain its accepted two-part form: registry-
projected canonical frontmatter plus Agent-owned enrichment/body, followed by
the research-round appendix. The appendix SHALL contain, in slot-map order,
`## Wave0：本主题的新增来源证据`,
`## Wave1：本主题的机制理解`,
`## Wave1：本主题的趋势、难点与限制`,
`## Wave2：本主题的当前跨主题判断`, and
`## 本主题的待验证问题与后续验证路径`, with their respective one-time
tokens. Each canonical heading SHALL be immediately followed by its permanent,
read-only `回填卡`, then that slot's token or entries. The card SHALL state its
writer, direct authority, `entry_id` plus five-field entry shape, legal
`wave_projection/apply_seed_projection` action and prohibitions; it SHALL not
be a Projection Entry. The renderer's small executable slot map is the
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

#### Scenario: Seed phase loads one complete template

- **WHEN** the Phase Agent enters `phase-seed-topics.md`
- **THEN** its loaded requires chain SHALL include
  `shared/shared-seed-topic-template`
- **AND** it SHALL not need a second complete shared authoring document to
  materialize a canonical seed

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
