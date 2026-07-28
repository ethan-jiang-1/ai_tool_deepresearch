> req: STM-001

## MODIFIED Requirements

### Requirement: Seed topic materialization phase node

`phase-seed-topics.md` SHALL provide the existing complete Seed Topic
materialization loop and load `templates/seed-topic-template` through its
actual `requires` chain. The template SHALL remain a pure document-shape
surface: initialization body/frontmatter, ordered appendix slots, canonical
five-field Projection Entry presentation, token lifecycle, and per-slot
writer/timing cues. Projection Packet grammar, lifecycle authorization, repair
and rerun-direction operations SHALL remain only in the existing
`command_playbook/operate-topic-state.md` protocol.

Every canonical seed SHALL retain registry-projected canonical frontmatter,
Agent-owned enrichment/body, and the research-round appendix. Each canonical
heading SHALL be immediately followed by its permanent read-only
`回填卡（只读操作约束，不是 Projection Entry）`, then that slot's token or
entries. The card SHALL state the writer, direct authority, `entry_id` plus
five-field entry shape, timing, concise materialization pointer, and direct-edit
prohibitions; renderer/template parity remains structural rather than a runtime
Markdown parser.

For the Wave0 `wave0_evidence` card specifically, its existing
`<work_id>/<positive ordinal>` notation SHALL define the positive ordinal as the
1-based position in that current work unit's result-declared, schema-valid
`artifacts/wave0/<topic>/source.yaml` array. It SHALL state that this is a
current projection coordinate rather than a permanent `result_hash` snapshot;
a multi-element source intake is backfilled with one entry or exact
identity-bound deferred disposition per current array candidate, potentially in
one packet. The card SHALL NOT embed packet JSON, lifecycle authorization,
source parsing mechanics, or a second source-authority claim.

`rb_plan.md#/topic_registry` remains topic identity/intent authority; submitted
work-unit and source-output facts remain projection authority. Template,
renderer, initial seed phase and card SHALL not create a new evidence, identity,
gate or receipt authority. Empty later-Wave slots remain legal for
`seed-topics-ready`.

#### Scenario: Wave0 card makes ordinal fillable without owning protocol

- **WHEN** a Phase Agent reads a newly rendered Wave0 card before closeout
- **THEN** the card SHALL explain that `<work_id>/N` uses the current
  result-declared `source.yaml` array's 1-based `N`
- **AND** it SHALL direct the Agent to the existing command playbook for packet
  formation and apply/repair mechanics

#### Scenario: One template card does not turn candidates into evidence

- **WHEN** a Wave0 card describes multiple candidates from one source intake
- **THEN** it SHALL retain submitted source output as direct authority
- **AND** it SHALL not describe a Seed Topic entry or disposition as evidence,
  reference, receipt, cache, or independent Gate authority; its only coverage
  effect remains the existing return-map evaluator
