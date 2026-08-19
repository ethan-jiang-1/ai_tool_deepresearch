# Wave1 Intake

> req: WAI-001, WAI-002, WAI-003, WAI-004, WAI-005, WAI-006, WAI-007, WAI-008, WAI-009, WAI-010, WAI-011, WAI-012

> delta-synced: strengthen-user-intent-carry-through (WAI-012)

## Purpose

Define wave1 topic-specific deepening via queue-driven three-stage execution. Each topic gets one deepening task card — Sub-agent executes WebSearch+WebFetch, writes `artifacts/wave1/{topic}/evidence-summary.md`, and Phase Agent immediately backfills the corresponding `seed_topics/{slug}.md` `__BACKFILL_*__` tokens. This replaces the foundation-placeholder skeleton with real evidence-backed deepening, while keeping search noise out of Phase Agent context via Sub-agent dispatch + `_cache/` isolation.
## Requirements
### Requirement: Wave1 phase uses queue-driven three-stage execution

Wave1 SHALL use queue-driven execution with delegated topic deepening represented as queue demand items claimed into work units, submitted by `work_id`, and validated by gate coverage after phase drain.

#### Scenario: Wave1 gate waits for in-flight work

- **WHEN** Wave1 has an in-flight topic deepening work unit
- **THEN** Wave1 SHALL not be considered drained

### Requirement: Sub-agent executes deepening search and writes bounded output

The Wave1 sub-agent SHALL execute bounded topic deepening according to the work-unit task/result schema and SHALL return through `operate-work-unit submit`.

The task SHALL require more than summarizing Wave0. For each assigned topic, the sub-agent SHALL search for topic-specific new evidence, fetch source content, write cache trails, and produce outputs that support mechanism analysis, trend/difficulty/limitation analysis, and profile-required counterexample or cross-verification checks. Wave0 artifacts MAY be used as starting context, but Wave0 URLs SHALL NOT satisfy the Wave1 new-source floor.

The submitted result SHALL expose enough structured fields for the Phase Agent and Engine to compare accepted source claims against Wave0 source URLs and verified cache trails. At minimum, the result SHALL expose `source_claims[]` directly in result metadata or through a machine-readable artifact declared by the result, plus output files and cache trail refs inspectable by `work_id`. Phase-owned `depth-review.yaml` MAY aggregate these claims, but SHALL NOT introduce accepted source coverage that lacks submitted `work_id` backing.

Each `source_claims[]` entry SHALL identify `url`, `source_ref`, `acceptance_status`, `is_new_vs_wave0`, `cache_trail_refs`, and optional `degraded_capture_ref`. Only structured claims with an accepted/countable status defined by the current source contract count toward coverage. Prose links in `evidence-summary.md` MAY be reported as diagnostics when absent from `source_claims[]`, but SHALL NOT be the primary authority for accepted source coverage.

#### Scenario: bounded output is submitted

- **WHEN** the Wave1 sub-agent writes bounded output
- **THEN** submit SHALL validate the output contract before ledger append

#### Scenario: Wave1 work finds new topic-specific sources

- **WHEN** a Wave1 topic deepening work unit completes
- **THEN** its submitted outputs SHALL identify source URLs that are new relative to that topic's Wave0 source URL set
- **AND** reused Wave0 URLs MAY provide context but SHALL NOT count toward the Wave1 new-source floor

#### Scenario: Wave1 work covers depth dimensions

- **WHEN** a Wave1 topic deepening work unit completes
- **THEN** `evidence-summary.md` or the submitted result SHALL cover mechanism, trend/difficulty, and limitation/dispute/failure-mode dimensions
- **AND** when `rb_profile.yaml` enables counterexample search or cross-verification, the submitted output SHALL record the attempted check and its evidence or limitation

### Requirement: Inline backfill after each task completion

Inline backfill after delegated Wave1 completion SHALL occur after successful work-unit submit and ledger append. Backfill SHALL not treat claimed or invalid-submitted attempts as completed.

#### Scenario: invalid submit does not trigger backfill

- **WHEN** a Wave1 submit is rejected as invalid
- **THEN** inline backfill SHALL not run for that queue demand

### Requirement: Wave1 gate checks deepening artifacts

Wave1 gate SHALL check deepening artifacts through submitted work-unit ledger coverage, cross-checks, one Phase-owned depth-review projection, and the shared Wave1 reference-convergence result. Each Topic SHALL have submitted `evidence-summary.md` and `question-list.md` output coverage plus `artifacts/wave1/{topic}/depth-review.yaml` bound to the exact submitted work-unit rows the Phase Agent reviewed.

Submitted work-unit rows remain the single direct authority for structured `source_claims[]`, `accepted_source_urls[]`, cache/degraded-capture refs, and actor provenance. The gate SHALL derive accepted claims, cache mapping, exact-new URLs, and the profile-derived new-source floor from `reviewed_work_unit_refs[]`, current Wave0 source URLs, and profile facts. `depth-review.yaml` SHALL not copy those deterministic ledger fields into a second blocking authority. Its blocking structure remains limited to version, canonical Topic binding, reviewed work-unit refs, depth dimensions/profile judgments, `decision`, and supplementary queue IDs. Legacy/Agent-helpful source/cache/new-source projections remain readable but non-authoritative.

`evidence-summary.md` and `question-list.md` are Wave1 artifact-family documents, not Seed Topic return-map documents. Their required Source URLs, Key Findings, and question-list semantic sections SHALL be evaluated by their existing artifact contracts and submitted output coverage. A Wave1 inspect or gate SHALL NOT require `evidence_meaning`, `relationship`, `refs`, `status`, or `next_hop` inside either artifact, and a missing return-map field SHALL not be emitted for them. Their existence, content, and output coverage remain independently fail-closed under their declared owners.

The reference-convergence evaluator SHALL use those submitted backing facts and the current canonical Topic identity, committed consumer reference projections, index table, profile reference floor, and existing supplementary queue demand to determine the next Wave1 reference action. It SHALL short-circuit unusable submitted authority first; then require canonical materialization/index repair before a true positive floor deficit; and preserve the existing depth/new-source checks as separate direct contracts. A valid depth review SHALL not prove reference-floor closure, and a reference-floor deficit SHALL not cause copied depth-review fields to become source authority.

For a current Topic, candidate backing SHALL be resolved only from its reviewed hash-valid submitted `wave1_topic_deepening` rows after the manifest's embedded queue snapshot binds the same canonical Topic UID/current slug. The shared reader SHALL call the same current-or-authorized-prior source-ref resolver used by dry-submit and formal submit before it evaluates a reviewed accepted claim's cache/degraded binding. It SHALL accept a prior path only when that resolver returns one exact legal same-Topic/wave/kind/role submitted output; it SHALL not require that legal prior path to appear in the reviewed row's current `output_files[]`. The reviewed row's accepted URL and current cache/degraded trail declarations remain independently required. After authorization, the reader MAY retain its existing physical source-path availability check only as a distinct reference-projection backing root; it SHALL not use that check to recreate a current-output-only source-ref rule. The reader SHALL reuse accepted source-claim/URL/cache/degraded facts and normalize URLs once; it SHALL not borrow an unbound row, infer a source from a file or index, or use missing candidates as a deficit proof until those direct facts are valid. A candidate must have a closed canonical projection before the reference floor can be evaluated.

When a true reference-floor deficit remains, the existing supplementary `wave1_topic_deepening` loop SHALL own new evidence acquisition. The Phase Agent may persist the exact positive deficit as the queue card's optional snapshot-bound objective and record the queue item in the existing depth-review decision surface. The queued objective SHALL not be a result requirement, source-acceptance assertion, or direct proof that later gate closure has occurred.

The gate SHALL validate deterministic depth-adjacent facts only: reviewed submitted-row binding, exact URL novelty, current submitted cache/degraded mapping, profile parameter presence, depth-dimension/ref structure, decision closure, supplementary loop coverage, and the convergence result. It SHALL not judge prose quality or require the Phase Agent to reproduce ledger/cache arrays manually.

#### Scenario: materializable backing precedes reference deficit

- **WHEN** reviewed submitted Wave1 rows have accepted backing suitable for a canonical consumer projection but the current Topic's canonical reference is absent
- **THEN** Wave1 gate SHALL report materialization as the primary reference action
- **AND** it SHALL not require a supplementary work unit solely because the current count is below the profile floor

#### Scenario: Shallow derived evidence routes to supplementary work

- **WHEN** accepted exact-new source URLs derived from reviewed submitted rows are below the profile's new-source floor
- **THEN** Wave1 gate SHALL report observed and required counts
- **AND** repair SHALL use the existing supplementary `wave1_topic_deepening` path without changing its primary/supplementary assignment contract

#### Scenario: true canonical reference deficit has one objective

- **WHEN** current canonical backed references are below the profile floor only after materialization/index repair is exhausted
- **THEN** the Phase Agent SHALL use one existing supplementary work-unit demand with the exact positive reference-floor objective when no live demand exists
- **AND** the gate SHALL recompute the count after later submit rather than trust the historical objective

#### Scenario: Missing reviewed row masks derived symptoms

- **WHEN** `reviewed_work_unit_refs[]` is missing, unsafe, unsubmitted, or otherwise unresolved
- **THEN** the checker SHALL report that binding as the parent root
- **AND** source/cache/novelty/reference-floor implications derived from the missing rows SHALL be masked

#### Scenario: Filesystem-only cache cannot create coverage

- **WHEN** a Phase Agent creates a structurally valid cache leaf absent from reviewed submitted rows
- **THEN** the cache leaf SHALL not satisfy source/cache/reference backing coverage
- **AND** the nearest action SHALL be legal supplementary or repaired work-unit submit, not copying the path into depth review

#### Scenario: Deepening artifacts require submitted rows

- **WHEN** a Wave1 evidence-summary or question-list exists without submitted work-unit output coverage
- **THEN** the gate SHALL reject that artifact as unsubmitted
- **AND** it SHALL not use filesystem presence as delegated authority

#### Scenario: Wave1 artifact does not require a return map

- **WHEN** a submitted evidence-summary and question-list satisfy their own artifact contracts but contain no return-map entry fields
- **THEN** Wave1 inspection SHALL not report return-map missing-fields, naked-evidence-list, or unsupported-prose findings for either artifact
- **AND** a malformed Seed Topic projection SHALL retain its independent return-map finding and repair coordinate

#### Scenario: Reviewed work-unit refs derive source and cache facts

- **WHEN** a valid depth review names submitted work-unit refs for one Topic
- **THEN** the gate SHALL derive its source claims, accepted URLs, and cache/degraded mapping from those rows
- **AND** it SHALL not require copied arrays in the review as a second authority

#### Scenario: Reviewed supplementary claim can use authorized prior source output

- **WHEN** a depth review names a hash-valid supplementary Wave1 row whose accepted claim names one exact contract-authorized prior `evidence_summary` for the same canonical Topic, wave, and kind
- **THEN** the shared reviewed-backing reader SHALL accept the prior source ref without duplicate current `output_files[]` declaration
- **AND** it SHALL still fail the reviewed claim when its current accepted URL, cache trail, or degraded-capture fact is absent or invalid

#### Scenario: Invalid prior source output remains a backing root

- **WHEN** a reviewed accepted claim names a filesystem-only, cross-Topic, wrong-role, wrong-wave/kind, ambiguous, or invalid prior output
- **THEN** the shared reviewed-backing reader SHALL fail the submitted-backing root
- **AND** it SHALL not relabel that path as current output or reference-floor coverage

#### Scenario: Authorized source path must still be materializable

- **WHEN** a reviewed accepted claim's source_ref is authorized by the shared
  current-or-prior resolver but the referenced physical source path is absent
- **THEN** the reader SHALL fail its distinct projection/backing root
- **AND** it SHALL not report the failure as a missing current output or an
  unauthorized prior source ref

#### Scenario: Missing profile parameter remains blocking

- **WHEN** a required Wave1 profile parameter cannot be resolved
- **THEN** the direct profile root SHALL remain blocking
- **AND** reference convergence SHALL not invent a replacement floor

#### Scenario: Legacy duplicated fields do not become authority

- **WHEN** a historical depth review contains copied source/cache/new-source fields in addition to its accepted judgment fields
- **THEN** those copied fields MAY remain readable diagnostic context
- **AND** they SHALL not override reviewed submitted rows or produce a second blocking source/floor verdict

#### Scenario: deepening artifact requires ledger row

- **WHEN** a Topic's deepening artifact is inspected for Wave1 coverage
- **THEN** the checker SHALL bind it to a hash-valid submitted ledger row
- **AND** an index/status or hand-written declaration alone SHALL not pass

#### Scenario: shallow depth review fails

- **WHEN** a depth review lacks required depth-dimension or decision closure facts
- **THEN** Wave1 gate SHALL report the review root
- **AND** it SHALL not convert that review failure into reference-floor success

#### Scenario: missing profile parameter blocks hidden floor

- **WHEN** a profile-derived Wave1 floor parameter is absent or invalid
- **THEN** the gate SHALL report `missing_profile_parameter`
- **AND** it SHALL not substitute a hidden default threshold

#### Scenario: missing cache trail for claimed source fails

- **WHEN** a reviewed accepted source claim lacks its required verified cache or explicit degraded-capture binding
- **THEN** the direct cache/source mapping contract SHALL fail
- **AND** neither a reference file nor an index row SHALL repair that authority

A depth review SHALL permit one optional `focus_coverage` process-evidence block. Its presence is the Phase Agent's declaration that a bounded focus commitment is being claimed for this Topic and current round; absence SHALL remain the no-focus path and SHALL NOT be interpreted as a missing user request. The block SHALL contain exactly `topic_uid`, `rerun_count`, `outcome`, and `commitments`; bind the current canonical Topic and current `rerun_count`; and contain a non-empty unique commitment set. A `covered` commitment SHALL contain exactly `id`, `statement`, `state`, and non-empty `submitted_work_unit_refs`; a `limited` commitment SHALL contain exactly `id`, `statement`, `state`, non-empty `limitation`, and `boundary_kind` of `external_action`, `user_decision`, or `missing_contract`, while omitting `submitted_work_unit_refs`. It SHALL distinguish `covered`, `partial`, and `blocked` without creating a semantic-quality score.

For a `covered` commitment, every listed ref SHALL resolve through the same reviewed, hash-valid, Topic-bound submitted Wave1 authority already used by the depth contract. Its paired work-unit index record SHALL carry an explicit `rerun_count` equal to the depth-review block and current profile count; a row from another count or a legacy row without that field SHALL NOT satisfy the current commitment, including when the current count is `0`. A limited commitment SHALL retain a non-empty limitation and an explicit existing-boundary kind; it SHALL NOT carry invented submitted refs. `partial` SHALL retain at least one covered commitment and at least one limited commitment; `blocked` SHALL retain no covered commitment and at least one limited commitment; `covered` SHALL retain only covered commitments. The block SHALL not copy source claims, URLs, cache trails, receipts, profile floors, queue state, or a parsed user-focus field into a second authority.

#### Scenario: Current submitted backing covers a declared commitment

- **WHEN** one current Topic's focus coverage declares a covered commitment with reviewed submitted Wave1 refs bound to the same Topic and current rerun count
- **THEN** the depth-review contract SHALL accept that commitment's binding
- **AND** it SHALL not require copied source/cache facts or infer coverage from historical artifacts

#### Scenario: Historical backing cannot satisfy a current focus commitment

- **WHEN** a focus-coverage commitment for rerun count 2 names a submitted row from rerun count 1
- **THEN** the depth-review contract SHALL reject that commitment binding
- **AND** it SHALL not relabel the historical row as current coverage

#### Scenario: Explicit initial-round binding is required

- **WHEN** the profile and focus-coverage block both have rerun count 0
- **THEN** only a covered ref whose paired submitted index row explicitly has `rerun_count: 0` SHALL satisfy the commitment
- **AND** an otherwise valid legacy submitted row without that field SHALL remain historical context, not current focus backing

#### Scenario: Visible limitation remains distinct from covered backing

- **WHEN** a declared commitment has no acceptable current submitted backing but has an explicit limitation and existing-boundary kind
- **THEN** the depth-review contract SHALL retain it only as a limited commitment
- **AND** it SHALL not report that commitment as covered or create a new repair route

#### Scenario: No focus declaration preserves the common baseline path

- **WHEN** a valid depth review has no focus-coverage block
- **THEN** existing Wave1 baseline checks SHALL continue unchanged
- **AND** the Engine SHALL not infer an omitted focus from HITL prose, filenames, or source counts

### Requirement: Wave1 queue-loop playbook verifies deepening end-to-end

Wave1 playbook SHALL verify deepening end to end through work-unit claim, sub-agent execution, submit, ledger, Phase Agent depth review, supplementary refill when shallow, backfill, and gate.

The playbook SHALL include negative coverage where a structurally valid Wave1 output is shallow: it reuses Wave0 sources, omits depth dimensions, or declares structured accepted source claims without cache trails. That fixture-backed negative case SHALL prove Engine/phase contract rejection only; it SHALL NOT claim to prove real Agent research quality.

#### Scenario: Wave1 playbook covers out-of-order submit

- **WHEN** multiple Wave1 deepening work units are in flight
- **THEN** the playbook SHALL allow submits to arrive out of order

#### Scenario: Wave1 playbook rejects shallow output

- **WHEN** a Wave1 fixture submits evidence-summary and question-list files that mostly summarize Wave0 and lack enough new source URLs
- **THEN** the playbook SHALL observe a failed depth-review or gate check
- **AND** repair SHALL proceed through supplementary work-unit demand rather than force-advance

### Requirement: Wave1 deepening queue items SHALL claim work units

Wave1 deepening queue items SHALL become eligible for `operate-work-unit claim` rather than non-work-unit delegated dispatch. The queue demand SHALL include the registered `wave1_topic_deepening` kind, canonical Topic UID/current slug, closed `payload.assignment_mode`, canonical required receipts, and any strictly valid non-selector kind-contract customization needed for the Engine to create the work unit.

Current primary demand SHALL use `payload.assignment_mode: "primary"` with exactly the canonical evidence-summary/question-list `file:` receipt pair for the bound Topic. Current supplementary demand SHALL use `payload.assignment_mode: "supplementary"` with empty required receipts and shall acquire new source/cache facts without rewriting the prior pair. Mode and receipt shape SHALL agree at enqueue and claim. Empty receipts alone, a queue-item suffix, title/action prose, `writes_to`, actor role, or current filesystem state SHALL NOT select supplementary behavior.

Supplementary Wave1 deepening queue items SHALL use the same work-unit path. Their `queue_item_id` MAY include a suffix such as `-v2` or `-suppl-rN`, but identity SHALL come from explicit `payload.topic_uid` plus current `payload.topic_slug`, and assignment intent SHALL come only from `payload.assignment_mode`. Queue item ID parsing SHALL NOT supply either fact for current cards.

An unclaimed Wave1 card missing assignment_mode SHALL return to AGQ-013 `repair --queue-item-id --set-assignment-mode` and SHALL NOT be claimed through compatibility inference. A work-unit attempt already claimed before assignment_contract_version existed MAY retain the bounded legacy submit semantics defined by delegated-work-units; queue-card repair SHALL NOT retrofit or reinterpret that attempt.

Persisted historical queue/terminal items MAY remain readable without assignment_mode. Current operation admission, rather than historical storage parsing, SHALL enforce the field before new enqueue/claim success. A planned Wave1 claim batch SHALL validate every candidate's mode/receipt/Topic obligation before any member is allocated.

When post-work_done candidate validation rejects missing research semantics, replacement demand SHALL preserve the failed attempt's canonical Topic and assignment obligation. A failed primary pair SHALL be closed through `operate-work-unit fail` with normalized reason `semantic_contract:<primary_root_code>` using the Engine-derived field, followed by an explicitly enqueued new primary paired demand under a fresh globally unused queue ID, not weakened into supplementary empty-output work. The semantic reason SHALL NOT use `actor_spawn_unavailable:` or another accepted automatic-retry trigger. This requirement SHALL NOT create automatic requeue, contract IDs in queue payloads, or a second success path.

#### Scenario: Wave1 claim creates deepening work unit

- **WHEN** a current Wave1 primary queue item is enqueued and claimed
- **THEN** it SHALL carry assignment_mode primary and the exact Topic-bound paired receipts
- **AND** the allocated work unit SHALL have kind `wave1_topic_deepening` with current assignment contract binding

#### Scenario: Supplementary Wave1 task keeps topic identity

- **WHEN** shallow Wave1 output requires a second task for canonical topic A
- **AND** the Agent enqueues a new queue item with topic A's UID/current slug, assignment_mode supplementary, and empty required receipts
- **THEN** `operate-work-unit claim` SHALL preserve the Topic binding and supplementary intent through manifest, result guidance, submitted ledger row, and depth-review repair refs
- **AND** the queue ID suffix SHALL remain non-authoritative

#### Scenario: Missing mode cannot be inferred from receipt shape

- **WHEN** an unclaimed Wave1 queue item lacks assignment_mode
- **THEN** enqueue or claim SHALL fail before work-unit allocation and direct AGQ-013 explicit unclaimed assignment-mode repair
- **AND** neither an exact pair nor empty receipts SHALL cause implicit primary/supplementary selection

#### Scenario: historical missing mode is readable but not claimable

- **WHEN** an existing queue contains a terminal-history item or live pre-change Wave1 card without assignment_mode
- **THEN** queue inspection/repair SHALL still load the persisted state
- **AND** new claim SHALL reject a live mode-absent card until the queue owner selects explicit mode and the Engine-derived repaired card passes current admission

#### Scenario: Semantic replacement preserves primary obligation

- **WHEN** a current primary attempt reaches work_done and dry-submit reports missing required research semantics
- **THEN** the Phase Agent SHALL fail that attempt and explicitly enqueue a new primary item with a fresh globally unused `queue_item_id`, the same canonical Topic, and paired receipts
- **AND** it SHALL NOT change assignment_mode to supplementary to avoid the failed direct-output obligation
- **AND** it SHALL NOT reuse the failed ID now retained in terminal_history

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

### Requirement: Reference-floor-deficit feedback SHALL name the depth-review sync for supplementary work units

When a Wave1 supplementary `wave1_topic_deepening` work unit is submitted and the
topic's reference floor is still below target, the reference-floor-deficit
feedback SHALL check whether the submitted supplementary work unit is missing
from `depth-review.yaml#reviewed_work_unit_refs` and, when it is, name that
update as the first repair action. The supplementary evidence SHALL NOT appear
to have no effect because the depth review was not updated.

#### Scenario: supplementary work unit missing from depth review is named

- **WHEN** a submitted supplementary Wave1 work unit is not listed in the
  topic's `depth-review.yaml#reviewed_work_unit_refs` and the reference floor is
  still below target
- **THEN** the feedback names the depth-review update and the exact work-unit
  ref to add
- **AND** the feedback directs the Agent to rerun the same Wave1 inspect after
  the update

#### Scenario: depth review already includes the supplementary work unit

- **WHEN** the depth review already lists the submitted supplementary work unit
- **THEN** the reference-floor-deficit feedback does not repeat the depth-review
  sync and proceeds to the materiali

### Requirement: Wave1 reference-floor inspect SHALL surface canonical reference targets

The Wave1 reference-floor inspect SHALL surface, for each materializable
submitted backing candidate whose canonical consumer projection is missing, the
exact canonical `reference/{topic.slug}-{token}-{digest}.md` target and the
submitted source/cache/work-unit refs needed to close it. The Phase Agent SHALL
be able to materialize the closing projection from inspect feedback alone.

#### Scenario: candidate target path is emitted in feedback

- **WHEN** a Wave1 submitted backing candidate lacks its canonical consumer
  projection
- **THEN** the inspect feedback emits the exact canonical target path and the
  candidate's submitted source/cache/work-unit refs

### Requirement: Evidence-summary Key Findings semantic section SHALL include nested descendant subsection content

When an evidence-summary's `## Key Findings` (or equivalent semantic heading)
organizes its content under descendant headings such as `### 1. 核心机制理解`, the
semantic section body evaluated for `key_findings_missing_or_empty` SHALL include
that descendant subsection content. A `## Key Findings` whose findings are written
under `###` subsections SHALL NOT be judged empty solely because the direct body
between the heading and the first descendant heading is blank.

#### Scenario: Key Findings content under descendant headings is recognized

- **WHEN** an `evidence-summary.md` has `## Key Findings` followed by only
  `### 1. ...`, `### 2. ...` subsections that contain the findings
- **THEN** the semantic `key findings` section SHALL be non-empty
- **AND** the work-unit dry-submit SHALL NOT reject it with
  `key_findings_missing_or_empty`

#### Scenario: an actually empty Key Findings section still fails

- **WHEN** an `evidence-summary.md` has a `## Key Findings` heading with no
  content in the direct body or any descendant subsection
- **THEN** the semantic `key findings` section SHALL be empty
- **AND** the evaluator SHALL still report `key_findings_missing_or_empty`

### Requirement: Focus coverage SHALL derive from current accepted intent and current-round backing

When accepted current intent creates a material Wave1 commitment for a Topic,
the Phase Agent SHALL derive the smallest readable commitment set for the
existing optional `focus_coverage` block. In round 0, the positive intent
sources are the applicable User Research Controls baseline and current
canonical Seed projection. In rerun N, they are that baseline, the newest
complete Decisions revision for N, and the Topic's matching direction for N.
Profile prose, filenames, older revisions, stale/future/invalid directions,
and historical submitted work SHALL NOT independently create a current
commitment.

The declaration SHALL preserve the existing Topic UID, rerun count, outcome,
commitment, and submitted-ref contract. `covered` SHALL use only reviewed,
hash-valid submitted Wave1 refs for the current round. A commitment may remain
`limited` only after existing authorized Wave1 repair is exhausted and the
current boundary is `external_action`, `user_decision`, or
`missing_contract`; it SHALL not use limitation as a shortcut around available
supplementary work. This projection records requirement coverage, not user
wording, semantic quality, or permission.

#### Scenario: Initial focus uses baseline and Seed projection

- **WHEN** an HITL1 control creates a material round-0 commitment for one Topic
- **THEN** its focus coverage SHALL be derived from the baseline and current Seed interpretation
- **AND** covered status SHALL require explicit round-0 submitted backing under the existing contract

#### Scenario: Second rerun excludes withdrawn first-round commitment

- **WHEN** the newest round-2 revision withdraws a round-1 commitment
- **THEN** the round-2 focus coverage set SHALL not recreate that commitment from the older revision or historical work
- **AND** the older coverage remains historical rather than current proof

#### Scenario: Available supplementary work prevents false limitation

- **WHEN** an uncovered current commitment has an existing legal supplementary Wave1 repair
- **THEN** the Phase Agent SHALL execute that queue/work-unit path and rerun the same inspect
- **AND** it SHALL not mark the commitment limited merely to close the round
