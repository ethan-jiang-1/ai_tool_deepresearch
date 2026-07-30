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
one current submitted contribution/work identity for Wave0/1 or one exact
current-round W2F finding identity for Wave2 whose accepted `affected_topics`
resolution includes the packet `topic_uid`, SHALL render the slot descriptor's
stable `entry_id`, and SHALL contain the accepted return-map fields or an
explicit deferred disposition. A Wave0 entry ID SHALL equal the exact
submission-owned global source ordinal returned by the shared contribution
reader; a Wave1 entry ID SHALL bind its exact submitted work ID plus positive
ordinal; and a Wave2 entry ID SHALL equal its exact source `W2F-*` finding ID.
The writer SHALL reject a mismatch before workspace creation and SHALL NOT
require the W2F ID to be duplicated in navigation `refs`.

Projection apply SHALL be authorized only inside the existing route-bound,
loaded current Wave phase and normal pre-completion window: Wave0 requires
`phases/phase-wave0.md` plus `seed_topics_ready` -> `wave0_complete`; Wave1
requires `phases/phase-wave1.md` plus `wave0_complete` -> `wave1_complete`; and
Wave2 requires `phases/phase-wave2.md` plus `wave1_complete` ->
`wave2_complete`. Each row SHALL also require its existing route-bound handoff
load witness. Projection apply SHALL verify current canonical UID/slug binding,
selected Wave-to-slot ownership, direct submitted-contribution/row/finding
eligibility, one unique recognized target for every selected slot, entry
identity, and the shared concrete-navigation rule before workspace creation.
An evidence-bearing entry has no forward-reference success path: it SHALL name
an existing safe concrete `reference/*.md` navigation target or use the
existing explicit deferred form. A missing target SHALL return one writer-owned
root with exact near-match candidates when the active reference namespace has
them; it SHALL not write the packet and SHALL not ask the Agent to alter ledger
or source authority.

Every slot selected by a packet SHALL have exactly one recognized target: its
canonical heading/card or a declared legacy heading base under the accepted
bounded suffix grammar. A partial or mixed layout from earlier legal upgrades
is valid. A valid operation SHALL stage and atomically replace only that seed
through the existing `_diagnostics/topic-state/<operation-id>/` workspace and
existing `recover`; it SHALL NOT stage or replace `rb_plan.md`.

Before prepared publication, the staged selected slot family SHALL be read by
the same structural entry parser used by readiness evaluation. Every preserved
and newly written entry boundary in that family SHALL remain independently
parseable; every selected `entry_id` SHALL occur exactly once; cards and
unrelated entries SHALL remain present; and token consumption SHALL be exact.
The writer SHALL preserve an explicit block separator on replacement or append.
A parser/postcondition failure SHALL reject before workspace publication with
one writer root rather than return `committed` and leave a later inspect to
discover concatenated neighboring entries. Token consumption, identity upsert,
card preservation, allowed targeted legacy heading/card upgrade, navigation
validation, and this whole-slot postcondition SHALL be part of the same
transaction. Projection apply SHALL NOT create submitted coverage, reference
files, source claims, findings, receipt rows, completion trace, or profile
projection.

When a committed topic-state operation changes canonical registry length, its
result SHALL expose one structured style-projection handoff identifying the
existing `apply-research-style.mjs` owner, selected profile, committed topic
count, exact legal command, and same readiness checkpoint. The handoff is
direct feedback, not a profile write, new lifecycle state, or substitute for
the style freshness verdict. No length change SHALL report a refresh
obligation. C5 SHALL widen only the accepted rerun witness class consumed by
topic-state authorization; the post-final recovery helper owns profile/reentry
event mutation and `enter-phase`/`advance-status` retain node/status ownership;
topic-state SHALL continue to own only plan/current seeds. Historical addendum
adoption, when requested after successful C5 reentry, SHALL use existing
explicit `migrate_legacy` semantics and SHALL NOT be performed by C5 or inferred
from files.

#### Scenario: Packet uses the existing atomic writer

- **WHEN** a loaded Wave1 phase submits a valid packet for mechanisms, trends
  and pending-question slots of one current topic
- **THEN** topic-state SHALL stage all three slot changes in one existing
  workspace transaction
- **AND** an invalid slot, identity, navigation target, or entry SHALL prevent
  any partial seed replacement
#### Scenario: Packet transaction does not rewrite plan or profile authority

- **WHEN** a valid Wave packet materializes a projection for one current topic
- **THEN** its topic-state workspace manifest SHALL stage only that selected
  `seed_topics/<current-slug>.md` replacement
- **AND** it SHALL NOT stage or replace `rb_plan.md` or `rb_profile.yaml`
#### Scenario: Wave0 entry uses its contribution-owned ordinal

- **WHEN** an earlier accepted Wave0 source contribution owns global ordinals
  `1..19` and a later accepted append contribution owns ordinal `20`
- **THEN** a Wave0 packet SHALL accept `earlier-work-id/1..19` and
  `later-work-id/20` only at their exact source identities
- **AND** it SHALL reject a packet that assigns ordinal `20` to the earlier
  work ID

#### Scenario: Packet cannot select another Wave's slot

- **WHEN** a Wave0 packet selects `wave1_mechanisms` or `pending_questions`
- **THEN** apply SHALL reject before workspace creation with the exact
  Wave-to-slot ownership coordinate
- **AND** it SHALL NOT write a token, entry or generic status prose

#### Scenario: Current authority identity is required

- **WHEN** a Wave0/1 packet names a non-current or unsubmitted identity, or a
  Wave2 packet names an absent, legacy-round, unusable, or other-topic W2F
  finding
- **THEN** apply SHALL reject before workspace creation with that direct
  identity/authority root
- **AND** it SHALL NOT treat a seed entry as evidence authority
#### Scenario: Missing reference reports one actionable writer root

- **WHEN** an evidence-bearing packet entry names
  `reference/01-topic-source-01.md` that is absent while
  `reference/01-topic-source-1.md` exists
- **THEN** apply SHALL reject before workspace publication with the missing path
  and the near-match candidate
- **AND** it SHALL direct the Agent to the existing reference
  materialization/selection surface and the same apply checkpoint

#### Scenario: Existing malformed neighbor blocks publication

- **WHEN** a selected slot contains an entry whose boundary cannot be
  independently parsed after the proposed replacement
- **THEN** apply SHALL reject before workspace publication with one writer
  postcondition root
- **AND** it SHALL not claim a committed packet or require an unrelated Wave
  slot to be repaired

#### Scenario: Projection authorization does not create a new lifecycle

- **WHEN** a caller invokes a valid-looking projection packet outside the
  loaded corresponding Wave window, after Final without accepted reentry, or
  for an orphan/historical seed
- **THEN** apply SHALL reject before workspace creation with the existing
  lifecycle or canonical-binding owner boundary
- **AND** user direction, generic inspect, or existing result files SHALL NOT
  create permission

#### Scenario: Rerun preserves entry boundaries

- **WHEN** the same accepted packet is replayed, or Wave2 upserts a W2F entry
  in `pending_questions` after Wave1 entries exist
- **THEN** replay SHALL leave the seed unchanged without duplicating entries,
  concatenating the next entry, or re-injecting a consumed token
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

#### Scenario: Structured style handoff retains the existing writer

- **WHEN** a committed topic-state mutation changes canonical registry length
  in a legal HITL1 or rerun window
- **THEN** its result SHALL expose the existing style CLI as the next owner with
  the committed topic count and exact rerun checkpoint
- **AND** topic-state SHALL not write, normalize, or infer
  `research_style_params`

#### Scenario: No length change does not invent style work

- **WHEN** a projection packet, enrichment write, rename, or reorder leaves
  registry length unchanged
- **THEN** topic-state SHALL not emit a style refresh obligation
- **AND** it SHALL not create a second lifecycle state or profile mutation

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

#### Scenario: Post-final apply requires committed C5 reentry

- **WHEN** topic-state apply is invoked after terminal Final without an
  accepted C5 event plus route-bound rerun load witness
- **THEN** it SHALL reject before workspace creation and identify the exact
  post-final recovery boundary
- **AND** it SHALL NOT treat user insistence, declared context or existing
  legacy data as permission

#### Scenario: Post-final apply remains unavailable

> **@deprecated** - The pre-C5 wording is retained for archive compatibility.
> Fresh topic apply remains unavailable from terminal Final alone; only a
> committed C5 event plus route-bound rerun load opens the existing C3 window.

- **WHEN** apply is invoked after terminal Final without an accepted topic-state
  workspace and without the complete C5 rerun witness
- **THEN** it SHALL reject before workspace creation and identify the exact C5
  reentry boundary
- **AND** it SHALL NOT treat user insistence, declared context or existing
  legacy data as permission

#### Scenario: Post-final reentry does not adopt topics by itself

- **WHEN** C5 establishes the sanctioned rerun window for a bundle with
  registry-external historical content
- **THEN** topic identity SHALL remain unchanged until an explicit existing
  `migrate_legacy` apply succeeds
- **AND** no addendum file SHALL gain authority from reentry alone
