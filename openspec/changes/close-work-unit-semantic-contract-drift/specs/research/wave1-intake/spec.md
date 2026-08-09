> req: WAI-005

## MODIFIED Requirements

### Requirement: Wave1 gate checks deepening artifacts

Wave1 gate SHALL check deepening artifacts through submitted work-unit ledger coverage, cross-checks, one Phase-owned depth-review projection, and the shared Wave1 reference-convergence result. Each Topic SHALL have submitted `evidence-summary.md` and `question-list.md` output coverage plus `artifacts/wave1/{topic}/depth-review.yaml` bound to the exact submitted work-unit rows the Phase Agent reviewed.

Submitted work-unit rows remain the single direct authority for structured `source_claims[]`, `accepted_source_urls[]`, cache/degraded-capture refs, and actor provenance. The gate SHALL derive accepted claims, cache mapping, exact-new URLs, and the profile-derived new-source floor from `reviewed_work_unit_refs[]`, current Wave0 source URLs, and profile facts. `depth-review.yaml` SHALL not copy those deterministic ledger fields into a second blocking authority. Its blocking structure remains limited to version, canonical Topic binding, reviewed work-unit refs, depth dimensions/profile judgments, `decision`, and supplementary queue IDs. Legacy/Agent-helpful source/cache/new-source projections remain readable but non-authoritative.

`evidence-summary.md` and `question-list.md` are Wave1 artifact-family documents, not Seed Topic return-map documents. Their required Source URLs, Key Findings, and question-list semantic sections SHALL be evaluated by their existing artifact contracts and submitted output coverage. A Wave1 inspect or gate SHALL NOT require `evidence_meaning`, `relationship`, `refs`, `status`, or `next_hop` inside either artifact, and a missing return-map field SHALL not be emitted for them. Their existence, content, and output coverage remain independently fail-closed under their declared owners.

The reference-convergence evaluator SHALL use those submitted backing facts and the current canonical Topic identity, committed consumer reference projections, index table, profile reference floor, and existing supplementary queue demand to determine the next Wave1 reference action. It SHALL short-circuit unusable submitted authority first; then require canonical materialization/index repair before a true positive floor deficit; and preserve the existing depth/new-source checks as separate direct contracts. A valid depth review SHALL not prove reference-floor closure, and a reference-floor deficit SHALL not cause copied depth-review fields to become source authority.

For a current Topic, candidate backing SHALL be resolved only from its reviewed hash-valid submitted `wave1_topic_deepening` rows after the manifest's embedded queue snapshot binds the same canonical Topic UID/current slug. The shared reader SHALL call the same current-or-authorized-prior source-ref resolver used by dry-submit and formal submit before it evaluates a reviewed accepted claim's cache/degraded binding. It SHALL accept a prior path only when that resolver returns one exact legal same-Topic/wave/kind/role submitted output; it SHALL not require that legal prior path to appear in the reviewed row's current `output_files[]`. The reviewed row's accepted URL and current cache/degraded trail declarations remain independently required. The reader SHALL reuse accepted source-claim/URL/cache/degraded facts and normalize URLs once; it SHALL not borrow an unbound row, infer a source from a file or index, or use missing candidates as a deficit proof until those direct facts are valid. A candidate must have a closed canonical projection before the reference floor can be evaluated.

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
