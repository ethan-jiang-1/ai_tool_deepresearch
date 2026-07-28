> req: RWP-010, RWP-015, RWP-016, RWP-017

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
rerun the same Wave1 inspect. It SHALL not hand-edit a seed, index, ledger,
receipt, cache trail, declaration, or trace. A successful submit alone does not
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
  canonical reference, synchronize the index, refresh an affected Seed Topic
  ref through the existing packet writer, and rerun Wave1 inspect
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

### Requirement: Wave phase bodies SHALL teach batch-poll-submit loops and Phase-owned reference materialization

Wave0, Wave1, and Wave2 phase Markdown SHALL describe delegated work as a
continuous Phase Agent loop: fill queue demand, reconstruct current in-flight
work from bundle truth, claim eligible independent work units as bounded
top-up batches where applicable, spawn bounded Sub-agents, actively poll
runtime work-unit readiness, submit ready attempts, repair or terminalize
rejected/expired attempts, materialize Phase-owned projections where the Phase
owns consumer presentation after successful submit, and run the phase gate only
after queue demand and delegated in-flight work are drained.

After the existing `fail_and_replace` disposition reaches its authorized
terminal boundary, phase Markdown SHALL instruct the Agent to terminalize the
current attempt through the existing terminal operation and invoke
`operate-work-unit replace` for that terminal work ID. For a newly created or
queued successor, it SHALL then perform the existing exact-role native probe
and `operate-work-unit claim`; for an already in-flight idempotent successor,
it SHALL reconstruct and poll the disclosed existing work ID without a second
claim. It SHALL not hand-author an allegedly equivalent replacement task card,
infer a successor queue ID, discover a work ID from the filesystem, rewrite
terminal status, or bypass ordinary claim.

Wave0 and Wave1 phase bodies SHALL not present `claim --count 1` as the normal
strategy for independent Topics. Wave1's post-submit loop SHALL teach one
ordered closeout decision, supplied by convergence rather than a second
controller: canonical materialize/persist from submitted backing; then sync the
flat index; then update only affected Seed Topic navigation through the existing
packet writer; then rerun Wave1 inspect. If no projection/index repair exists,
the loop either continues a disclosed existing supplementary demand or forms
one ordinary supplementary demand for a true floor deficit before returning to
claim/poll/submit. Wave2 retains its existing backed-pure-synthesis versus
targeted-evidence materialization split.

#### Scenario: Wave1 post-submit loop follows ordered closeout

- **WHEN** a Wave1 Phase Agent completes a successful submit and receives a
  convergence materialization root
- **THEN** the phase body SHALL show materialize/persist -> index sync ->
  packet ref refresh when needed -> same inspect
- **AND** it SHALL not ask the Agent to infer filename/count/index order from
  source code or separate checkers

#### Scenario: phase gate waits for queue and in-flight drain

- **WHEN** a phase has unclaimed delegated queue demand or reconstructed
  delegated attempts still in flight
- **THEN** phase guidance SHALL instruct the Agent to keep polling, submitting,
  repairing, terminalizing, or claiming bounded top-ups as appropriate
- **AND** it SHALL not run the phase gate as if delegated work were complete

#### Scenario: Wave1 materializes references after submit

- **WHEN** a Wave1 work unit submits evidence summary, question list, and
  accepted source/cache/degraded-capture backing successfully
- **THEN** the Wave1 phase body SHALL instruct the Phase Agent to invoke the
  convergence-guided Phase-owned reference closeout before gate
- **AND** it SHALL not require a Sub-agent to be the canonical producer of
  consumer reference files

#### Scenario: Wave0 and Wave1 phase docs teach batched delegated claim

- **WHEN** independent Wave0 or Wave1 demand is eligible to claim
- **THEN** phase guidance SHALL use bounded top-up batch claims as the normal
  posture
- **AND** it SHALL not present `claim --count 1` as the default independent
  Topic strategy

#### Scenario: phase docs teach active polling after spawn

- **WHEN** delegated work has been spawned
- **THEN** phase guidance SHALL actively poll the disclosed runtime/work-unit
  state and submit ready results
- **AND** it SHALL not assume chat completion is an accepted attempt

#### Scenario: phase docs reconstruct in-flight work before claiming

- **WHEN** a Phase resumes with delegated attempts already in flight
- **THEN** it SHALL reconstruct those attempts from bundle truth before a new
  claim
- **AND** it SHALL not create a duplicate claim for the same demand

#### Scenario: terminal replacement returns to the location-correct existing boundary

- **WHEN** an authorized `fail_and_replace` path reaches a terminal attempt
- **THEN** phase guidance SHALL terminalize it through the existing operation,
  use `operate-work-unit replace`, and then claim or reconstruct the disclosed
  successor as its location requires
- **AND** it SHALL not hand-author a replacement card or infer a work ID

#### Scenario: Wave2 pure synthesis materializes existing-backed cross references

- **WHEN** accepted prior evidence supports a Wave2 pure-synthesis reference
- **THEN** Wave2 guidance SHALL preserve its existing Phase-owned
  existing-backed `00-cross-*` materialization path
- **AND** newly fetched evidence SHALL still use targeted-evidence submission

### Requirement: Wave phase docs SHALL teach canonical gate-consumable refs and roles

Wave phase docs SHALL teach the same direct artifact shapes that gate/inspect
helpers consume without reproducing large validator implementations. Wave0,
Wave1, and Wave2 SHALL load `templates/seed-topic-template` through their
actual requires chain as the pure Seed Topic document-shape contract; the
existing `command_playbook/operate-topic-state.md` remains the sole complete
Projection Packet execution contract. Phase bodies shall retain only
Wave-local authority, queue/submit sequence, concrete artifact guidance, and
the command checkpoint. They SHALL not instruct Agents to discover headings,
replace tokens by hand, edit a seed directly, or build a local return-map
validator.

Wave1 docs SHALL separately load `shared/shared-reference-template` as the
pure reference document-shape contract. That template shall teach the accepted
metadata/body shape, canonical locator input/output, current versus legacy
path distinction, candidate-exact metadata/body submitted-backing boundary, and
materialization timing. It SHALL not become a Projection Packet, index writer, evidence authority,
counting algorithm, queue controller, or gate parser. The Wave1 phase body
shall point to the one `sync-reference-index` operation and existing
`operate-topic-state` packet writer at their respective legal decision points.

After successful submitted work or accepted finding materialization, each Wave
phase SHALL teach its existing closeout loop: read direct authority; form a
retained Projection Packet where the Wave owns Seed Topic navigation; invoke
the legal writer in its route-bound window; run the corresponding
side-effect-free non-routing inspect; and repair the smallest named
packet/authority root before completion evidence or formal gate. For Wave1,
the reference convergence result provides the root-first materialize/index/
supplementary distinction. Evidence-bearing refs continue to use concrete
existing `reference/*.md` navigation first, with artifact/cache/work-unit paths
as secondary provenance only.

#### Scenario: Wave1 docs expose one locator and one index operation

- **WHEN** a Phase Agent reads Wave1 reference closeout guidance
- **THEN** it SHALL see the current canonical locator, submitted-backing
  boundary, index synchronization operation, Seed packet writer, and same
  inspect rerun
- **AND** it SHALL not see a competing `0N-*`/`NN-wave1-*` naming rule, a
  manual index-edit protocol, or an instruction to derive a glob count

#### Scenario: reference template remains a document-shape owner

- **WHEN** an Agent reads the shared reference template
- **THEN** it SHALL learn which reference parts are fixed structure and which
  fields/body content the Phase Agent fills from submitted backing
- **AND** it SHALL not be told that template completion creates submitted
  evidence, queue demand, gate pass, or a Seed Topic packet

#### Scenario: phase docs keep artifact authority separate from projection

- **WHEN** a Phase Agent reads Wave1 artifact/reference guidance
- **THEN** it SHALL see that submitted work, index, and ledger remain authority
  while references and Seed entries are navigation projections
- **AND** it SHALL not treat a packet, reference file, or index row as evidence
  coverage by itself

#### Scenario: Wave closeout uses the one legal writer

- **WHEN** a Wave-owned Seed Topic navigation projection must change
- **THEN** phase guidance SHALL form the accepted Projection Packet and invoke
  the route-bound `operate-topic-state` writer
- **AND** it SHALL not direct raw seed edits or invent another writer

#### Scenario: Wave0 closeout enumerates one result-declared source array

- **WHEN** Wave0 closes a submitted source-intake result
- **THEN** Phase guidance SHALL enumerate its one submitted declared source
  array through the existing authority path
- **AND** it SHALL not reconstruct an alternate candidate source list

#### Scenario: Wave0 closeout preserves the one legal writer

- **WHEN** Wave0 needs to refresh a Seed Topic projection
- **THEN** it SHALL retain the existing packet/writer sequence
- **AND** it SHALL not write Seed Topic state directly from a reference/index
  surface

#### Scenario: Later Waves do not inherit Wave0 candidate rules

- **WHEN** Wave1 or Wave2 guidance consumes a prior Wave0 projection
- **THEN** it SHALL use the relevant submitted/projection authority for that
  Wave
- **AND** it SHALL not treat Wave0 candidate authoring rules as a general
  evidence-acceptance path

#### Scenario: Heading card gives the backfiller one constrained action

- **WHEN** a phase handoff/backfill card is shown to an Agent
- **THEN** it SHALL name one bounded legal action and its authoritative input
- **AND** it SHALL not make the Agent discover headings, tokens, or a writer
  from unrelated prose

#### Scenario: Wave1 atomically handles its multiple owned slots

- **WHEN** Wave1 changes multiple Phase-owned navigation slots for one Topic
- **THEN** it SHALL use the existing packet/writer transaction for those slots
- **AND** it SHALL not leave direct partial Seed Topic edits as an alternate
  success path

#### Scenario: Inspect precedes completion evidence

- **WHEN** a Wave Phase believes its materialization/backfill work is complete
- **THEN** it SHALL run the side-effect-free corresponding inspect before
  recording completion evidence or invoking the formal gate
- **AND** it SHALL repair the named root through the same loop first

#### Scenario: Missing writer is an honest boundary

- **WHEN** feedback identifies a surface with no accepted legal writer
- **THEN** phase guidance SHALL expose the owner or missing-contract boundary
- **AND** it SHALL not instruct a raw edit, fake receipt, or user-operated
  workaround

#### Scenario: Phase docs keep artifact authority separate from projection

- **WHEN** Phase guidance describes an artifact alongside its reader-facing
  projection
- **THEN** it SHALL identify the submitted/runtime authority separately from
  the navigation/document view
- **AND** it SHALL not make the projection a competing acceptance authority

#### Scenario: Wave1 docs bind required paths to roles

- **WHEN** Wave1 guidance describes delegated outputs
- **THEN** it SHALL use the Engine-projected path/role contract and result
  schema
- **AND** it SHALL not infer required outputs from reference filenames or prose

#### Scenario: Depth-review example uses canonical ref spelling

- **WHEN** Wave1 docs show a concrete reference in depth-review/closeout
  context
- **THEN** it SHALL use the current canonical full-slug locator spelling
- **AND** it SHALL not teach a legacy `NN-wave1-*` file as current coverage

#### Scenario: Return-map docs prioritize reference navigation

- **WHEN** Phase guidance names return-map or navigation references
- **THEN** it SHALL use concrete existing `reference/*.md` navigation first
- **AND** artifact/cache/work-unit refs SHALL remain secondary provenance

#### Scenario: Wave2 docs preserve cross-reference authority split

- **WHEN** Wave2 guidance describes a `00-cross-*` reference
- **THEN** it SHALL distinguish existing-backed Phase projection from newly
  fetched targeted evidence
- **AND** it SHALL not make an index/source-layer label sufficient backing

#### Scenario: Phase docs expose deterministic repair shape

- **WHEN** a Phase document presents a deterministic inspect/gate failure
- **THEN** it SHALL consume the Engine-provided missing fact, write coordinate,
  repair kind, and rerun checkpoint
- **AND** it SHALL not duplicate evaluator logic in Markdown

#### Scenario: Phase Agent runs inspect before completion evidence

- **WHEN** the Phase Agent completes a Wave-local repair
- **THEN** it SHALL rerun the same inspect before adding completion evidence
- **AND** it SHALL not use a prior green result after changed direct facts

#### Scenario: Phase Agent repairs from one inspect root cause

- **WHEN** inspect returns one nearest direct root with an existing legal
  repair path
- **THEN** the Phase Agent SHALL repair that root and rerun the same checkpoint
- **AND** it SHALL not begin competing speculative repair branches

#### Scenario: Wave2 docs expose current finding contract

- **WHEN** Wave2 guidance describes a finding/index repair
- **THEN** it SHALL point to the current accepted finding contract and its
  authoritative evidence boundary
- **AND** it SHALL not treat stale prose/return-map text as a second contract

### Requirement: Wave0 and Wave1 fetch targets SHALL follow profile floors plus conservative margin

Wave0 and Wave1 phase guidance SHALL derive delegated fetch/source candidate
targets from explicit profile/runtime floors plus a conservative small margin.
The margin absorbs duplicates, inaccessible pages, and non-countable sources;
it SHALL not change gate thresholds, reduce required coverage, or become a
hidden quality override.

Wave0 guidance SHALL bind source-intake target planning to explicit
`rb_profile.yaml#/research_style_params` Wave0 floors. Wave1 guidance SHALL
bind initial Topic-deepening target planning to explicit Wave1 floors and
new-source floor semantics, including `wave1_per_topic_ref_floor` and
`topic_unique_ratio` where the depth-review contract uses them. A plan target
is not proof that the reference floor lacks an already submitted backing
projection: after submit, convergence must first distinguish canonical
materialization and index repair from a true need for more evidence.

Active Wave0/Wave1 phase docs SHALL not instruct Agents to use fixed hard-coded
fetch aims unless the number is explicitly derived from active profile/runtime
floor plus a named margin. The margin SHALL remain a planning heuristic, not a
new profile field, gate parameter, quality threshold, or hidden over-fetch
policy. When feedback reaches a true post-projection Wave1 floor deficit,
repair SHALL use the existing supplementary work-unit path with its optional
snapshot-bound objective rather than relying on hidden over-fetching.

#### Scenario: Wave1 target reads profile and convergence preserves repair order

- **WHEN** the Phase Agent prepares Wave1 topic deepening or receives a low
  current reference count after submit
- **THEN** guidance SHALL use profile-bound floor-plus-margin planning for
  initial acquisition and convergence for post-submit repair classification
- **AND** it SHALL not turn a materializable reference/index defect directly
  into another search target

#### Scenario: hard-coded over-fetch aim is rejected

- **WHEN** active Wave0/Wave1 phase or Sub-agent guidance says to fetch a fixed
  number of URLs not tied to an explicit profile/runtime floor plus margin
- **THEN** static tests or hygiene SHALL fail
- **AND** diagnostics SHALL require profile-bound floor-plus-margin wording

#### Scenario: true gate repair still uses supplementary work units

- **WHEN** formal gate or inspect reports a true reference-floor shortfall
  after current projection and index repair are exhausted
- **THEN** phase guidance SHALL route repair through supplementary work-unit
  queue demand
- **AND** it SHALL not silently lower floors or treat the margin as pass
  authority

#### Scenario: Wave0 target reads profile floor

- **WHEN** the Phase Agent plans Wave0 source intake
- **THEN** guidance SHALL derive its target from explicit active Wave0
  profile/runtime floor plus a named conservative margin
- **AND** it SHALL not use a fixed hidden fetch count

#### Scenario: Wave1 target reads profile and novelty floor semantics

- **WHEN** the Phase Agent plans initial Wave1 topic deepening
- **THEN** guidance SHALL read explicit Wave1 reference and new-source floor
  semantics from the active profile/runtime facts plus margin
- **AND** it SHALL keep planning targets distinct from post-submit convergence
  verdicts

#### Scenario: margin is not promoted into a new threshold

- **WHEN** a conservative acquisition margin is used for Wave0 or Wave1
- **THEN** it SHALL remain planning guidance only
- **AND** it SHALL not become a profile field, gate threshold, hidden override,
  or pass condition

#### Scenario: gate repair still uses supplementary work units

- **WHEN** a direct Wave0/Wave1 floor or submitted-backing repair remains after
  the relevant direct checks
- **THEN** phase guidance SHALL use the accepted supplementary work-unit path
  where that contract requires additional evidence
- **AND** it SHALL not silently reduce an accepted floor
