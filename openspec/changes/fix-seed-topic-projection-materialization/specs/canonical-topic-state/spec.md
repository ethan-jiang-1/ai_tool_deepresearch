> req: CTS-004

## MODIFIED Requirements

### Requirement: Topic-state operations SHALL preserve scope and authority boundaries

Topic-state operations SHALL NOT mutate queue state/schema, work-unit attempts,
submitted ledger, status, trace, gates, handoffs, receipts, artifact/cache/
reference/final paths, artifact persistence state, profile fields or delivery
authority. New topic work SHALL require committed registry+current-seed
materialization. The CLI SHALL provide no force, generic delete, retire,
arbitrary patch, set-progress, set-status, reentry, override,
artifact/reference path move or historical-content rewrite operation.

The only layout operation SHALL be `apply` action `mutate_layout`: one complete
sanctioned-rerun target that may rename/reorder current registry coordinates,
update current seed projections and safely remove a never-worked topic.
Historical paths SHALL remain in place and previous slugs SHALL be provenance/
read compatibility only.

The existing `apply` seam SHALL additionally admit exactly one projection
operation shape: `context: wave_projection`,
`action: apply_seed_projection`, one current `topic_uid`, one closed
`wave0|wave1|wave2` value, and one or more owned slot updates. The input SHALL
be strict and SHALL NOT accept file paths, headings, token text, line numbers,
raw Markdown, arbitrary patch/append instructions, or a request to mutate any
surface other than the selected current seed document. Each entry SHALL bind to
one submitted work identity for Wave0/1 or one exact current-round W2F finding
identity for Wave2 whose accepted `affected_topics` resolution includes the
packet `topic_uid`, SHALL render the slot descriptor's stable `entry_id`, and
SHALL contain the accepted return-map fields or an explicit deferred disposition. A new
Wave0/1 `entry_id` SHALL bind its exact submitted work ID plus positive ordinal;
a new Wave2 `entry_id` SHALL equal its exact source `W2F-*` finding ID. The
writer SHALL reject a mismatch before workspace creation and SHALL NOT require
the W2F ID to be duplicated in the navigation `refs` field.

Projection apply SHALL be authorized only inside the existing route-bound,
loaded current Wave phase and its normal pre-completion window: Wave0 requires
`phases/phase-wave0.md` plus `seed_topics_ready` -> `wave0_complete`; Wave1
requires `phases/phase-wave1.md` plus `wave0_complete` -> `wave1_complete`; and
Wave2 requires `phases/phase-wave2.md` plus `wave1_complete` ->
`wave2_complete`. Each row SHALL also require its existing route-bound handoff
load witness. Projection apply SHALL verify current canonical UID/slug binding,
selected Wave-to-slot ownership, direct submitted-row/finding identity
eligibility (including current-round and target-topic binding for Wave2), one
unique recognized target for every selected slot, and entry identity before
workspace creation. Every slot selected by the packet SHALL have
exactly one recognized target: its canonical heading/card or a declared legacy
heading base under the accepted bounded suffix grammar. A partial or mixed layout
from earlier legal upgrades is valid. A valid operation SHALL stage and
atomically replace only that seed through the existing
`_diagnostics/topic-state/<operation-id>/` workspace and existing `recover`; it
SHALL NOT stage or replace `rb_plan.md`. Token consumption, identity upsert,
card preservation, any allowed targeted legacy heading/card upgrade, and a
post-write parser/readiness assertion SHALL be part of that same transaction. It
SHALL NOT create submitted coverage, reference files, source claims, findings,
receipt rows or completion trace.

C5 SHALL widen only the accepted rerun witness class consumed by topic-state
authorization. The post-final recovery helper SHALL own profile/reentry event
mutation; existing `enter-phase`/`advance-status` SHALL retain node/status
ownership; topic-state SHALL continue to own only plan/current seeds.
Historical addendum adoption, when requested after successful C5 reentry, SHALL
use existing explicit `migrate_legacy` semantics and SHALL NOT be performed by
C5 or inferred from files.

#### Scenario: Packet uses the existing atomic writer

- **WHEN** a loaded Wave1 phase submits a valid packet for mechanisms, trends
  and pending-question slots of one current topic
- **THEN** topic-state SHALL stage all three slot changes in one existing
  workspace transaction
- **AND** an invalid slot, identity or entry SHALL prevent any partial seed
  replacement

#### Scenario: Packet transaction does not rewrite plan authority

- **WHEN** a valid Wave packet materializes a projection for one current topic
- **THEN** its topic-state workspace manifest SHALL stage only that selected
  `seed_topics/<current-slug>.md` replacement
- **AND** it SHALL NOT stage or replace `rb_plan.md`

#### Scenario: Packet cannot select another Wave's slot

- **WHEN** a Wave0 packet selects `wave1_mechanisms` or `pending_questions`
- **THEN** apply SHALL reject before workspace creation with the exact
  Wave-to-slot ownership coordinate
- **AND** it SHALL NOT write a token, entry or generic status prose

#### Scenario: Current authority identity is required

- **WHEN** a Wave0/1 packet names a non-current or unsubmitted work ID, or a
  Wave2 packet names an absent, legacy-round, unusable, or other-topic W2F
  finding
- **THEN** apply SHALL reject before workspace creation with that direct
  identity/authority root
- **AND** it SHALL NOT treat a seed entry as evidence authority

#### Scenario: Projection authorization does not create a new lifecycle

- **WHEN** a caller invokes a valid-looking projection packet outside the
  loaded corresponding Wave window, after Final without accepted reentry, or
  for an orphan/historical seed
- **THEN** apply SHALL reject before workspace creation with the existing
  lifecycle or canonical-binding owner boundary
- **AND** user direction, generic inspect, or existing result files SHALL NOT
  create permission

#### Scenario: Rerun is idempotent and Wave2 preserves Wave1 questions

- **WHEN** the same accepted packet is replayed, or Wave2 upserts a W2F entry
  in `pending_questions` after Wave1 entries exist
- **THEN** replay SHALL leave the seed unchanged without duplicating entries or
  re-injecting a consumed token
- **AND** Wave2 SHALL preserve Wave1 entries and modify only the matching W2F
  identity

#### Scenario: Legal packet atomically upgrades its declared legacy heading

- **WHEN** an otherwise legal packet targets one or more owned slots represented
  by their declared legacy heading bases under the accepted bounded suffix
  grammar
- **THEN** the same topic-state transaction SHALL replace only those targeted
  heading bases with their canonical bases, preserve any accepted suffix, insert
  their immutable `回填卡` blocks, and materialize the entries
- **AND** ordinary read/inspect, unrelated legacy headings, and a rejected
  packet SHALL leave legacy bytes unchanged

#### Scenario: Repeated readable headings are not a writable target

- **WHEN** a packet's target slot has multiple canonical/legacy heading matches
  under the accepted suffix grammar
- **THEN** apply SHALL reject with one `seed_projection_layout_ambiguous` root
  before workspace creation
- **AND** it SHALL not choose, rename or insert a card into any occurrence

#### Scenario: Unrecognized layout remains read-compatible but is not guessed

- **WHEN** a packet selects a slot with no recognized canonical/card or
  declared legacy-heading target
- **THEN** projection apply SHALL reject with one
  `seed_projection_layout_missing` root before workspace creation
- **AND** it SHALL NOT infer headings, directly migrate bytes, or create a
  parallel success path

#### Scenario: Bounded layout mutation uses the existing authority path

- **WHEN** a sanctioned normal or post-final rerun submits a valid complete
  mutate-layout target
- **THEN** the existing topic-state apply/recover path SHALL own
  registry/current-seed mutation
- **AND** it SHALL NOT create a second CLI, workspace, filesystem migration
  service or direct multi-file Agent edit path

#### Scenario: Layout mutation reports missing C3B capability

- **WHEN** apply input uses an imperative remove, rename or renumber action
  instead of one complete target
- **THEN** the command SHALL reject that shape before workspace creation and
  point to the sanctioned `inspect` -> `mutate_layout` path
- **AND** path-move requests SHALL remain outside C3B without claiming that
  bounded layout mutation itself is missing

#### Scenario: Historical topic removal remains blocked

- **WHEN** remove targets a UID with dependency, queue, work-unit, ledger,
  artifact or reference history
- **THEN** apply SHALL reject before workspace creation
- **AND** SHALL NOT invent retired state, delete history or reinterpret user
  insistence as permission

#### Scenario: Human-directed request does not bypass reentry

- **WHEN** a user requests new scope, layout mutation, or projection mutation
  from a lifecycle position without an accepted normal or post-final entry
  witness
- **THEN** topic-state mutation SHALL remain unavailable without changing
  topic/status/trace state
- **AND** `human-directed` SHALL NOT create permission or handoff authority
