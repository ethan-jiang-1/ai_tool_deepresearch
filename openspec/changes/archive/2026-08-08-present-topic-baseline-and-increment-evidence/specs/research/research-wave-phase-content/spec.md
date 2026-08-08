> req: RWP-002

## MODIFIED Requirements

### Requirement: Wave1 phase body completeness with subagent boundary

`phase-wave1.md` SHALL remain the Agent-facing controller for Wave1's
queue-driven deepening flow. It SHALL load the shared reference template through
its actual `requires` chain at the Phase-owned reference materialization
decision point. The Sub-agent owns bounded search/fetch, candidate result,
source/cache facts, runtime receipt, and its actor result. The Phase Agent owns
ordinary queue/claim/dry-submit/submit operation, Phase-owned consumer
projection, depth review, Seed Topic packet formation, and same-check repair.
The Phase Agent SHALL not fabricate Sub-agent source/cache/result/receipt
semantics or ask the user to run ordinary pipeline commands.

After a successful formal Wave1 submit with accepted backing, the Phase Agent
SHALL obtain the current Topic's one Wave1 reference-convergence result and
follow its returned legal action. For an authenticated materialization root, it
shall use the shared template and canonical locator to author a consumer
reference only from submitted backing; stage/persist that reference through the
existing artifact-persistence boundary; run `sync-reference-index`; refresh the
affected Seed Topic's concrete reference navigation only through the existing
Projection Packet / `operate-topic-state apply` writer when it changed; and
rerun the same Wave1 inspect. The synchronizer refreshes only its derived
`_INDEX.md` and README navigation projections; the Phase Agent SHALL not hand
write either projection. It SHALL not hand-edit a seed, index, ledger, receipt,
cache trail, declaration, or trace. A successful submit alone does not
authorize a broad filename choice, direct Seed mutation, or an invented source.

For an index-sync root, the Phase Agent SHALL run the narrow synchronizer and
rerun the same inspect. For an existing supplementary demand, it SHALL return
to the existing queue/work-unit loop rather than add a duplicate. For a true
positive reference-floor deficit with no live supplementary demand, it SHALL
form one existing `topic_deepening` supplementary card through the normal queue
operation, with the evaluator-returned snapshot-bound
`payload.reference_floor_deficit`; then claim, dry-submit, submit, run normal
Phase closeout, and rerun the same inspect. The field is an acquisition
objective, not a delegated output or a pass claim. The Phase Agent SHALL not
direct-search Wave1 evidence, create a new queue kind, run a background loop,
or turn a projection/index defect into a research demand.

After successful submit, `depth-review.yaml` SHALL continue to contain only
facts not already owned by submitted authority: version, canonical Topic
binding, reviewed work-unit refs, depth-dimension judgments, profile-check
judgments, decision, and supplementary queue IDs. It SHALL not copy submitted
source/cache arrays, Wave0 URL arrays, derived floor facts, or a second
reference-count authority. The reference-floor deficit may be cited as a
read-only queue objective when the existing supplementary decision records that
queue ID, but depth review shall not create, certify, or recompute it.

When the Phase Agent legally writes or updates a valid current
`focus_coverage` block in that depth review, it SHALL run the same existing
`sync-reference-index` operation before rerunning the named Wave1 inspect. The
operation only refreshes the derived reader projection from direct facts; it
does not make focus coverage a reference-file attribute, evidence authority,
or new closeout transition. A blocked synchronization remains its own
Engine-operation root: the Agent SHALL rerun the same operation from current
bytes and SHALL not hand-edit README, `_INDEX.md`, focus coverage, or a Gate
result to make the map appear current.

At each affected inspect/gate/submit failure, Phase guidance SHALL consume the
Engine-provided `repair_kind`, `missing_fact`, `write_to`, and `rerun` fields.
When `repair_kind` is `agent_action|engine_operation`, `write_to` is an already
authorized mutable surface/legal operation, and no new semantic/risk decision
is needed, the Agent SHALL perform the mechanical repair and rerun the named
checkpoint. `user_decision|external_action|missing_contract` identifies only
the smallest Agent-facing boundary. Because Wave1 is `stop: no`, those
classifications shall not themselves authorize a user-facing wait or escalation.

#### Scenario: Wave1 materializes canonical closeout after submitted backing

- **WHEN** a Wave1 work unit formally submits accepted backing that lacks its
  current canonical consumer projection
- **THEN** phase guidance SHALL direct the Phase Agent to materialize the
  canonical reference, synchronize the navigation projection, refresh an
  affected Seed Topic ref through the existing packet writer, and rerun Wave1
  inspect
- **AND** it SHALL not require the Sub-agent to write a consumer reference or
  the user to run a persistence/index/packet command

#### Scenario: stale index takes the narrow repair path

- **WHEN** current canonical backed references exist but the index table or row
  coverage is stale
- **THEN** phase guidance SHALL direct `sync-reference-index` and the same
  Wave1 inspect
- **AND** it SHALL not direct manual row edits, new source research, or a new
  controller

#### Scenario: true deficit uses the existing supplementary path

- **WHEN** convergence has exhausted materialization and index repair, reports
  a positive deficit, and no same-Topic supplementary demand is live
- **THEN** phase guidance SHALL direct one ordinary supplementary
  `wave1_topic_deepening` card with the returned positive floor objective
- **AND** claim/submit and later closure SHALL remain the existing work-unit
  transaction and same Wave1 inspect loop

#### Scenario: materialization root does not become a research demand

- **WHEN** a legacy/misnamed reference or submitted backing can be repaired by
  canonical Phase-owned materialization
- **THEN** the Phase Agent SHALL perform that legal projection repair first
- **AND** it SHALL not enqueue supplementary search work merely because the
  count is presently low

#### Scenario: Wave1 loads the shared reference template

- **WHEN** the Phase Agent reaches a Wave1 materialization decision
- **THEN** `phase-wave1.md` SHALL load the shared reference template through
  its actual requires chain
- **AND** it SHALL not require the Agent to discover that template indirectly

#### Scenario: Wave1 uses dry-submit before formal submit

- **WHEN** a Wave1 actor returns a candidate result
- **THEN** the Phase Agent SHALL run the existing same-candidate dry-submit
  check before formal submit and after mechanical candidate repair
- **AND** it SHALL not treat chat confirmation or a template as submit authority

#### Scenario: Wave1 materializes closeout after submitted backing

- **WHEN** submitted Wave1 backing is accepted and a consumer projection is
  required
- **THEN** Phase guidance SHALL materialize only through the convergence-guided
  Phase-owned closeout path
- **AND** it SHALL not make reference authoring a Sub-agent required output

#### Scenario: Depth review records judgment instead of ledger copies

- **WHEN** the Phase Agent records `depth-review.yaml` after successful submit
- **THEN** it SHALL record reviewed work-unit refs and Phase-owned judgments
- **AND** it SHALL not make copied source/cache/URL or derived-floor arrays a
  second deterministic authority

#### Scenario: valid focus update refreshes only the derived reader map

- **WHEN** the Phase Agent legally writes or updates valid current focus
  coverage for one Topic
- **THEN** guidance SHALL direct the existing `sync-reference-index` operation
  before the same Wave1 inspect
- **AND** it SHALL not make the focus declaration a reference-file label, Gate
  route, or manual README/index editing task

#### Scenario: Agent performs authorized same-check repair

- **WHEN** Engine feedback names an authorized same-check repair coordinate
- **THEN** the Phase Agent SHALL perform the ordinary mechanical repair and
  rerun that named checkpoint
- **AND** it SHALL not ask the user to run ordinary pipeline commands

#### Scenario: Recorded profile makes missing style parameters mechanical

- **WHEN** Wave1 requires an explicit profile-derived floor or style parameter
- **THEN** Phase guidance SHALL read the recorded profile fact and report a
  missing parameter as a direct mechanical blocker
- **AND** it SHALL not invent a hidden default

#### Scenario: Wave1 deepening uses work-unit kind

- **WHEN** Wave1 needs delegated topic-specific source acquisition
- **THEN** phase guidance SHALL use `wave1_topic_deepening` through the
  existing queue/work-unit path
- **AND** it SHALL not substitute a direct-search or ad hoc task path

#### Scenario: Wave1 requires depth review before topic completion

- **WHEN** a Topic's Wave1 outputs have submitted evidence but no valid depth
  review
- **THEN** Phase guidance SHALL repair or complete the existing depth-review
  projection before Wave1 completion
- **AND** it SHALL not treat reference/index navigation as a substitute

#### Scenario: Shallow Wave1 output routes to supplementary work unit

- **WHEN** direct submitted source/cache/new-source checks remain below their
  accepted floor
- **THEN** Phase guidance SHALL use the existing supplementary
  `wave1_topic_deepening` loop
- **AND** it SHALL not lower the floor or fabricate depth closure

When accepted current focus context calls for additional work, the Phase Agent
SHALL derive the smallest readable commitment set and record it only in the
optional focus-coverage block of the existing depth review. It SHALL bind the
declaration to the current canonical Topic and current rerun count; record a
covered commitment with non-empty submitted-work refs, or a limited commitment
with one visible limitation and an `external_action`, `user_decision`, or
`missing_contract` boundary kind while omitting submitted refs; use existing
`wave1_topic_deepening` demand, claim, dry-submit, submit, and depth-review
update paths for evidence work; and read the same Wave1 inspect after each
legal repair. The Agent SHALL preserve a commitment as a visible limitation
only when the existing feedback exposes an external, decision, or
missing-contract boundary with no currently authorized Wave1 repair; it SHALL
not declare `partial` or `blocked` merely to bypass available supplementary
work.

The Phase Agent SHALL treat user focus wording and its interpretation as
semantic context, not as a command for the Engine. It SHALL not invent a new
focus queue kind, direct-search path, retry controller, Gate command, user
checkpoint, profile field, canonical Topic identity, or historical evidence
label. For an initial run, the coverage declaration binds round 0; for a
rerun, it binds the current accepted rerun count and leaves earlier direction
and submitted evidence as history.

#### Scenario: Phase Agent turns current focus context into bounded commitments

- **WHEN** accepted current focus context calls for additional Wave1 work for
  one Topic
- **THEN** the Phase Agent SHALL record the smallest readable commitment set in
  that Topic's depth review and bind it to the current Topic and round
- **AND** it SHALL not ask the user to choose a source quota, queue kind, or
  coverage enum

#### Scenario: Repairable commitment uses existing supplementary work

- **WHEN** Wave1 inspect returns an existing legal supplementary repair for an
  uncovered commitment
- **THEN** the Phase Agent SHALL use the existing queue/work-unit path and
  rerun the same inspect
- **AND** it SHALL not record partial or blocked as a bypass

#### Scenario: No legal repair records an honest limitation

- **WHEN** current Wave1 feedback identifies an external, user-decision, or
  missing-contract boundary and no authorized Wave1 repair remains
- **THEN** the Phase Agent SHALL retain the explicit limitation in focus
  coverage and consume only the existing degraded/no-path behavior
- **AND** it SHALL not auto-rerun, create a new route, or claim the focus is
  semantically satisfied

#### Scenario: Rerun coverage does not consume historical work as current

- **WHEN** a rerun writes focus coverage for its current round
- **THEN** the Phase Agent SHALL bind covered commitments only to current-round
  submitted work
- **AND** it SHALL preserve earlier submitted evidence and direction as history
  rather than current focus coverage
