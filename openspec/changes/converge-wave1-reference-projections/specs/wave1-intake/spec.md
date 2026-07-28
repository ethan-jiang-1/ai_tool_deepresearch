> req: WAI-005, WAI-008

## MODIFIED Requirements

### Requirement: Wave1 gate checks deepening artifacts

Wave1 gate SHALL check deepening artifacts through submitted work-unit ledger
coverage, cross-checks, one Phase-owned depth-review projection, and the shared
Wave1 reference-convergence result. Each Topic SHALL have submitted
`evidence-summary.md` and `question-list.md` output coverage plus
`artifacts/wave1/{topic}/depth-review.yaml` bound to the exact submitted
work-unit rows the Phase Agent reviewed.

Submitted work-unit rows remain the single direct authority for structured
`source_claims[]`, `accepted_source_urls[]`, cache/degraded-capture refs, and
actor provenance. The gate SHALL derive accepted claims, cache mapping,
exact-new URLs, and the profile-derived new-source floor from
`reviewed_work_unit_refs[]`, current Wave0 source URLs, and profile facts.
`depth-review.yaml` SHALL not copy those deterministic ledger fields into a
second blocking authority. Its blocking structure remains limited to version,
canonical Topic binding, reviewed work-unit refs, depth dimensions/profile
judgments, `decision`, and supplementary queue IDs. Legacy/Agent-helpful
source/cache/new-source projections remain readable but non-authoritative.

The reference-convergence evaluator SHALL use those submitted backing facts and
the current canonical Topic identity, committed consumer reference projections,
index table, profile reference floor, and existing supplementary queue demand
to determine the next Wave1 reference action. It SHALL short-circuit unusable
submitted authority first; then require canonical materialization/index repair
before a true positive floor deficit; and preserve the existing depth/new-source
checks as separate direct contracts. A valid depth review SHALL not prove
reference-floor closure, and a reference-floor deficit SHALL not cause copied
depth-review fields to become source authority.

For a current Topic, candidate backing SHALL be resolved only from its reviewed
hash-valid submitted `wave1_topic_deepening` rows after the manifest's embedded
queue snapshot binds the same canonical Topic UID/current slug. The shared
reader SHALL reuse accepted source-claim/URL/cache/degraded facts and normalize
URLs once; it SHALL not borrow an unbound row, infer a source from a file or
index, or use missing candidates as a deficit proof until those direct facts
are valid. A candidate must have a closed canonical projection before the
reference floor can be evaluated.

When a true reference-floor deficit remains, the existing supplementary
`wave1_topic_deepening` loop SHALL own new evidence acquisition. The Phase
Agent may persist the exact positive deficit as the queue card's optional
snapshot-bound objective and record the queue item in the existing depth-review
decision surface. The queued objective SHALL not be a result requirement,
source-acceptance assertion, or direct proof that later gate closure has
occurred.

The gate SHALL validate deterministic depth-adjacent facts only: reviewed
submitted-row binding, exact URL novelty, current submitted cache/degraded
mapping, profile parameter presence, depth-dimension/ref structure, decision
closure, supplementary loop coverage, and the convergence result. It SHALL not
judge prose quality or require the Phase Agent to reproduce ledger/cache arrays
manually.

#### Scenario: materializable backing precedes reference deficit

- **WHEN** reviewed submitted Wave1 rows have accepted backing suitable for a
  canonical consumer projection but the current Topic's canonical reference is
  absent
- **THEN** Wave1 gate SHALL report materialization as the primary reference
  action
- **AND** it SHALL not require a supplementary work unit solely because the
  current count is below the profile floor

#### Scenario: Shallow derived evidence routes to supplementary work

- **WHEN** accepted exact-new source URLs derived from reviewed submitted rows
  are below the profile's new-source floor
- **THEN** Wave1 gate SHALL report observed and required counts
- **AND** repair SHALL use the existing supplementary `wave1_topic_deepening`
  path without changing its primary/supplementary assignment contract

#### Scenario: true canonical reference deficit has one objective

- **WHEN** current canonical backed references are below the profile floor only
  after materialization/index repair is exhausted
- **THEN** the Phase Agent SHALL use one existing supplementary work-unit demand
  with the exact positive reference-floor objective when no live demand exists
- **AND** the gate SHALL recompute the count after later submit rather than
  trust the historical objective

#### Scenario: Missing reviewed row masks derived symptoms

- **WHEN** `reviewed_work_unit_refs[]` is missing, unsafe, unsubmitted, or
  otherwise unresolved
- **THEN** the checker SHALL report that binding as the parent root
- **AND** source/cache/novelty/reference-floor implications derived from the
  missing rows SHALL be masked

#### Scenario: Filesystem-only cache cannot create coverage

- **WHEN** a Phase Agent creates a structurally valid cache leaf absent from
  reviewed submitted rows
- **THEN** the cache leaf SHALL not satisfy source/cache/reference backing
  coverage
- **AND** the nearest action SHALL be legal supplementary or repaired work-unit
  submit, not copying the path into depth review

#### Scenario: Deepening artifacts require submitted rows

- **WHEN** a Wave1 evidence-summary or question-list exists without submitted
  work-unit output coverage
- **THEN** the gate SHALL reject that artifact as unsubmitted
- **AND** it SHALL not use filesystem presence as delegated authority

#### Scenario: Reviewed work-unit refs derive source and cache facts

- **WHEN** a valid depth review names submitted work-unit refs for one Topic
- **THEN** the gate SHALL derive its source claims, accepted URLs, and
  cache/degraded mapping from those rows
- **AND** it SHALL not require copied arrays in the review as a second authority

#### Scenario: Missing profile parameter remains blocking

- **WHEN** a required Wave1 profile parameter cannot be resolved
- **THEN** the direct profile root SHALL remain blocking
- **AND** reference convergence SHALL not invent a replacement floor

#### Scenario: Legacy duplicated fields do not become authority

- **WHEN** a historical depth review contains copied source/cache/new-source
  fields in addition to its accepted judgment fields
- **THEN** those copied fields MAY remain readable diagnostic context
- **AND** they SHALL not override reviewed submitted rows or produce a second
  blocking source/floor verdict

#### Scenario: deepening artifact requires ledger row

- **WHEN** a Topic's deepening artifact is inspected for Wave1 coverage
- **THEN** the checker SHALL bind it to a hash-valid submitted ledger row
- **AND** an index/status or hand-written declaration alone SHALL not pass

#### Scenario: shallow depth review fails

- **WHEN** a depth review lacks required depth-dimension or decision closure
  facts
- **THEN** Wave1 gate SHALL report the review root
- **AND** it SHALL not convert that review failure into reference-floor success

#### Scenario: missing profile parameter blocks hidden floor

- **WHEN** a profile-derived Wave1 floor parameter is absent or invalid
- **THEN** the gate SHALL report `missing_profile_parameter`
- **AND** it SHALL not substitute a hidden default threshold

#### Scenario: missing cache trail for claimed source fails

- **WHEN** a reviewed accepted source claim lacks its required verified cache or
  explicit degraded-capture binding
- **THEN** the direct cache/source mapping contract SHALL fail
- **AND** neither a reference file nor an index row SHALL repair that authority

### Requirement: Wave1 topic references SHALL be Phase-owned materializations after successful submit

Wave1 Topic-specific references SHALL be materialized by the Phase Agent only
after successful `wave1_topic_deepening` submit. The Sub-agent SHALL provide
`evidence-summary.md`, `question-list.md`, structured submitted source claims,
accepted URLs when available, verified cache/degraded refs, runtime receipt,
and result JSON. The Phase Agent SHALL use that submitted substrate to author
consumer-facing canonical references at
`reference/{current-topic.slug}-{deterministic-source-qualifier}.md` and to
close navigation through the accepted index synchronizer.

The Wave1 Phase Agent SHALL receive `shared/shared-reference-template` through
the phase node's actual `requires` chain at the materialization decision point,
rather than being told to discover it indirectly. The template SHALL make
clear which reference structure is fixed, which fields/body content are filled
from submitted backing, the current locator versus legacy/misnamed distinction,
and the timing after formal submit. Each reference shall expose accepted
metadata/Topic binding and five semantic sections; harmless heading case,
level, spacing, and order remain tolerated. Fixed prose character counts and
fixed Key Facts bullet counts shall not be blocking reference-quality
authority.

Every Phase-owned Topic reference SHALL remain backed by at least one reviewed
submitted Wave1 source claim, accepted source URL, verified cache trail for the
same source, or explicit degraded-capture record. A Phase-owned reference SHALL
not introduce accepted source coverage absent from submitted rows. The Phase
Agent SHALL use the shared convergence result, not a generic filename glob, to
decide whether it must materialize a canonical reference, synchronize an index,
continue an existing supplementary demand, or form a true reference-floor
deficit demand. A legacy `NN-wave1-*` or current misnamed reference remains
readable/indexable but does not satisfy current coverage; it is never a license
to invent source backing or blind-rename history.

When convergence returns a materialization action, its exact canonical
target/backing list is the sole current Phase materialization input. The Phase
Agent SHALL not add an arbitrary submitted URL, use a legacy filename as an
alternate target, or turn a format/backing root into a supplementary demand.
Before treating that target as closed, it SHALL bind the reference's normalized
metadata URL and scannable source/cache/work-unit body refs to the exact
returned candidate rather than to generic submitted backing.

When a materialized reference changes concrete Seed Topic navigation, the
Phase Agent SHALL refresh that entry only through the existing Projection Packet
and `operate-topic-state apply` writer, then rerun the same Wave1 inspect. It
SHALL not raw-edit the seed or use `_INDEX.md` as a writer for evidence,
receipt, ledger, cache, or queue authority. If a needed source is absent from
submitted backing, the Agent SHALL use supplementary work-unit execution or
record the direct limitation; it SHALL not direct-search, invent a reference,
or ask the user to perform ordinary repair.

#### Scenario: successful submit triggers canonical reference closeout

- **WHEN** a `wave1_topic_deepening` work unit successfully submits accepted
  source/cache/degraded backing suitable for navigation
- **THEN** the Phase Agent SHALL use the template and canonical locator to
  materialize the consumer reference, synchronize `_INDEX.md`, update affected
  Seed navigation through the packet writer, and rerun Wave1 inspect
- **AND** the Sub-agent's omission of a rich reference file alone SHALL not
  make its otherwise valid submit fail

#### Scenario: legacy reference is navigation history, not a pass path

- **WHEN** a current Topic has only a legacy `NN-wave1-*` reference with
  equivalent submitted backing
- **THEN** convergence SHALL direct canonical Phase-owned materialization from
  that backing
- **AND** the legacy reference may remain indexed but SHALL not satisfy the
  current Topic's floor before the canonical projection exists

#### Scenario: no materializable submitted source is explicit

- **WHEN** a Wave1 Topic has no accepted submitted source suitable for a
  consumer reference after direct authority repair is exhausted
- **THEN** the Phase Agent SHALL record the limitation or returned repair state
  explicitly in the accepted Phase surface
- **AND** Wave1 gate SHALL diagnose missing Topic reference backing rather than
  silently treating absence as successful materialization

#### Scenario: unsubmitted source cannot become topic reference authority

- **WHEN** the Phase Agent wants to create a Topic reference for a source URL
  absent from submitted source claims, accepted source URLs, verified cache
  trails, and explicit degraded-capture records
- **THEN** it SHALL not materialize that URL as accepted Wave1 evidence
- **AND** it SHALL repair through supplementary `wave1_topic_deepening` or
  record a limitation

#### Scenario: Depth review cannot expand delegated coverage

- **WHEN** `depth-review.yaml` or Seed Topic backfill names a Phase-owned Topic
  reference
- **THEN** that reference SHALL bind back to submitted work-unit rows, source
  claims, cache trails, or explicit degraded-capture records
- **AND** it SHALL not expand delegated coverage beyond the submitted source
  substrate

#### Scenario: depth review cannot create new delegated coverage

- **WHEN** `depth-review.yaml` or seed-topic backfill names a Phase-owned topic
  reference
- **THEN** that reference SHALL bind back to submitted work-unit rows, source
  claims, cache trails, or explicit degraded-capture records
- **AND** it SHALL NOT expand delegated coverage beyond the submitted source
  substrate

#### Scenario: Successful submit triggers complete reference materialization

- **WHEN** a `wave1_topic_deepening` submit supplies accepted backing suitable
  for navigation
- **THEN** the Phase Agent SHALL perform the convergence-guided canonical
  reference, index, and affected Seed navigation closeout
- **AND** it SHALL rerun the same Wave1 inspect before claiming completion

#### Scenario: Key Facts does not substitute for narrative capture

- **WHEN** a Wave1 reference has Key Facts but lacks the required Core Content
  Capture semantic section
- **THEN** the shared reference-format evaluator SHALL report that missing
  narrative root
- **AND** the numeric count shall not invent a substitute prose-quality rule

#### Scenario: Harmless Markdown presentation is tolerated

- **WHEN** a submitted-backed Wave1 reference exposes all required semantic
  sections with equivalent heading case, level, spacing, or order
- **THEN** reference-format evaluation SHALL accept the equivalent structure or
  emit advisory feedback
- **AND** presentation alone SHALL not remove otherwise eligible coverage

#### Scenario: Unsubmitted source cannot become reference authority

- **WHEN** a reference's source URL is absent from submitted source claims,
  accepted URLs, cache trails, and explicit degraded capture
- **THEN** it SHALL not become accepted Topic reference authority
- **AND** the nearest action SHALL be legal supplementary work, direct backing
  repair, or an explicit limitation

#### Scenario: Missing reviewed authority returns one repair coordinate

- **WHEN** a Phase-owned Topic reference cannot resolve its reviewed submitted
  backing for the current Topic
- **THEN** Wave1 feedback SHALL return one direct submitted-backing or
  reviewed-row root and repair coordinate
- **AND** it SHALL mask derived canonical-count/index success claims

#### Scenario: successful submit triggers Phase-owned topic reference materialization

- **WHEN** a successful Wave1 submit leaves an authenticated canonical
  projection missing
- **THEN** the Phase Agent, not the Sub-agent, SHALL materialize the consumer
  reference through the accepted Phase path
- **AND** formal submit itself SHALL remain the evidence-acceptance boundary

#### Scenario: Sub-agent omission of rich reference file is not submit failure by itself

- **WHEN** a Sub-agent submits valid required outputs, source claims, cache
  facts, result, and receipt but no rich reference file
- **THEN** formal submit SHALL evaluate its existing delegated contract
- **AND** the Phase-owned convergence/materialization loop SHALL own any later
  consumer-reference closeout
