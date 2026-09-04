# Delegated Work Units

> req: DEW-001, DEW-002, DEW-003, DEW-004, DEW-009, DEW-016, DEW-018, DEW-019, DEW-020, DEW-021, DEW-022, DEW-026, DEW-027, DEW-030, DEW-032, DEW-033

> delta-synced: strengthen-user-intent-carry-through (DEW-026), scope-work-unit-transaction-attribution (DEW-023)

> delta-synced: add-audited-late-accept-for-timed-out-work-units (DEW-005, DEW-006, DEW-011, DEW-015)
> delta-synced: make-delegated-work-contracts-constructible (DEW-021)
> delta-synced: make-work-unit-attempt-recovery-explicit (DEW-022, DEW-023, DEW-024)
> delta-synced: materialize-wave0-submitted-references-and-batch-projections (DEW-025)
> delta-synced: retire-transaction-v1-history (DEW-023, DEW-024)
> delta-synced: wave1-result-authoring-contract (DEW-030, DEW-031)

## Purpose

Define the Engine-owned work-unit lifecycle for delegated work inside the active runtime bundle root: queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate. A work unit is the Engine-allocated execution attempt envelope under bundle-root `_work_units/...`, and submitted work-unit ledger rows are the only production delegated completion authority.
## Requirements
### Requirement: Work-unit pipeline SHALL be the sole production delegated-work path

> req: DEW-001

Production delegated work SHALL use the path `queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate` inside the active runtime bundle root. A work unit SHALL mean one Engine-allocated delegated execution attempt for one queue demand item. A wave, phase, queue item, runtime thread, or filesystem artifact SHALL NOT be called a work unit unless it is the Engine-allocated attempt envelope. Bare work-unit paths such as `_work_units/waveN/{work_id}/` SHALL resolve under the current run bundle root.

Current production-facing surfaces outside `openspec/changes/archive/` SHALL NOT describe retired delegated transport mechanisms, old delegated ledger rows, or invalid old queue position shapes as active delegated-work paths. This applies to active main specs, active change deltas, framework docs, runtime docs, tests, guidelines, current runner surfaces, and runnable experiment playbooks. Archived OpenSpec changes are historical record and SHALL NOT be cleaned or treated as current drift.

Old delegated-work mechanisms include retired delegated commands and modules, old helper APIs, old result fields, old channel identity fields, old event names, old dispatch files, non-work-unit delegated directory paths when used as production authority, and hand-written delegated ledger rows that bypass work-unit submit.

#### Scenario: production delegated path is singular

- **WHEN** active specs, framework docs, phase docs, tests, or playbooks describe delegated completion
- **THEN** they SHALL describe queue demand claimed into a work unit and returned through submit
- **AND** they SHALL NOT describe any alternate production delegated-work mechanism

#### Scenario: retired delegated identity is not current work identity

- **WHEN** a current surface identifies delegated work by retired channel identity, retired events, retired dispatch manifests, or non-work-unit delegated paths
- **THEN** that surface SHALL be migrated to work-unit identity or removed from current production-facing guidance
- **AND** it SHALL NOT count as current delegated-work proof

#### Scenario: old queue shape is not a delegated-work fallback

- **WHEN** a current surface uses old top-level queue position shape or queue demand `work_id` identity to bypass work-unit claim/submit for delegated work
- **THEN** that surface SHALL be migrated to queue v2 plus work-unit submit or removed from current production-facing guidance
- **AND** it SHALL NOT count as a valid non-delegated queue path

#### Scenario: archived changes are historical only

- **WHEN** stale delegated-work terms appear under `openspec/changes/archive/`
- **THEN** the terms SHALL be treated as historical OpenSpec record
- **AND** current-surface hygiene SHALL NOT require editing that archive path

### Requirement: Work-unit identity SHALL be Engine-allocated and index-backed

> req: DEW-002

The Engine SHALL allocate every `work_id` and record it in bundle-root `_work_units/_index.json`. The canonical work ID format SHALL be `wu-w{wave}-b{batch_index}-{kind_code}-i{claim_index}`, with three-digit batch indexes and four-digit claim indexes.

`kind` SHALL be the stable full work-unit kind used by queue demand, manifests, results, and ledger rows, such as `wave0_source_intake`, `wave1_topic_deepening`, or `wave2_targeted_evidence`. `kind_code` SHALL be a short Engine-registered code used only inside `work_id`. Bundle-root `_work_units/_index.json` SHALL contain the authoritative kind registry mapping each full `kind` to exactly one `kind_code`, and each `kind_code` back to exactly one full `kind`. Encoded fields SHALL match the index, directory path, manifest, result, and ledger row.

#### Scenario: malformed work ID is rejected

- **WHEN** a submitted result names a `work_id` whose encoded wave, batch, `kind_code`, or claim index disagrees with the manifest or index kind registry
- **THEN** submit SHALL fail closed
- **AND** no queue completion or ledger append SHALL occur

#### Scenario: kind registry maps long kind to short code

- **WHEN** the Engine allocates a `wave1_topic_deepening` work unit with kind code `deep`
- **THEN** the `work_id` MAY contain `deep`
- **AND** the manifest, result, and ledger row SHALL still carry the full `kind: "wave1_topic_deepening"`

### Requirement: Work-unit claim SHALL bind queue demand and lease

> req: DEW-003

Claim SHALL bind one `queue_item_id` to one non-terminal work-unit attempt, move queue demand into `delegated_in_flight`, write effective lease fields, and store the queue item snapshot hash. Claim MAY allocate a contiguous queue-front batch with `--count N`, but Sub-agents SHALL NOT allocate IDs or mutate queue/index authority.

Before allocating a work ID, opening or incrementing a batch, moving queue demand, creating an envelope, or emitting claim success, claim SHALL invoke the shared current delegated queue-demand admission evaluator for every candidate in its planned contiguous prefix. Each candidate SHALL declare one supported work-unit kind; claim SHALL NOT infer it from requested phase. Claim SHALL use the evaluator's current canonical binding and resolved assignment facts. A rejected candidate SHALL reject the complete planned batch with no queue, index, batch-counter, envelope, delegated-in-flight, or success-trace mutation.

For a planned Wave0 prefix, claim SHALL also supply the shared evaluator with fresh non-terminal target facts from existing queued demand, delegated in-flight work, and earlier candidates in that same planned prefix. Unclaimed targets SHALL come from current canonical assignment resolution; an in-flight owner's target SHALL come from its validated current-profile queue/index binding and immutable manifest output contract. If two candidates resolve through their canonical assignment contracts to the same exact `source_yaml` target, or a candidate resolves to a target already owned by delegated in-flight work, the complete requested batch SHALL be rejected before mutation. The response SHALL identify the candidate queue ID, exact target, queue-order-earliest or in-flight owner identity, `reason_code: wave0_source_target_conflict`, the existing admission `repair_kind: agent_action`, and a same-claim rerun after the Agent claims a conflict-free prefix or completes the disclosed in-flight owner's existing submit/repair/terminalization loop. It SHALL NOT reuse the attempt-recovery `wait` enum or advise changing a queue ID, task prose, cache trail, URL, ledger row, or source array to manufacture independence.

An older queue that already contains multiple same-target Wave0 demands SHALL remain drainable without migration: a claim whose planned prefix contains only the queue-order-earliest currently unowned target MAY proceed; later same-target demand remains queued and becomes eligible only after fresh admission observes no earlier queued owner and no in-flight owner. No persistent target lock, scheduler state, or queue rewrite SHALL be introduced.

Successful claim stdout SHALL include a static Agent-facing top-level `continuation` object for the immediate post-claim decision point with `next_action: inspect_and_poll_claimed_work`. Because claim validates queue/work-unit phase demand but does not read or establish the current lifecycle node's `stop` authority, its continuation SHALL omit `interaction` rather than hardcode a second interaction-placement truth. The already-loaded lifecycle phase/header/cue continues to control whether the framework may initiate user-facing output.

The cue SHALL include `work_ids` equal to the already returned `claimed_work_ids`, SHALL NOT be nested inside queue/index authority objects, SHALL NOT infer readiness, SHALL NOT complete work, and SHALL NOT add persistent work-unit, interaction, message, or pause state. Empty or failed claims SHALL NOT emit a successful continuation cue.

#### Scenario: claim creates in-flight attempt

- **WHEN** an eligible delegated queue demand item is claimed
- **THEN** the Engine SHALL create the work-unit envelope
- **AND** the queue demand SHALL be present in `delegated_in_flight` with the allocated `work_id`

#### Scenario: claim output directs immediate polling

- **WHEN** claim succeeds for one or more work units
- **THEN** stdout SHALL identify the claimed work ids
- **AND** continuation SHALL direct the Phase Agent to inspect/poll the claimed work without waiting for user input, acknowledgement, or task notification
- **AND** continuation SHALL omit `interaction` and SHALL NOT create chat-interception or interaction authority

#### Scenario: empty claim does not emit successful continuation

- **WHEN** claim returns `claimed_count: 0`
- **THEN** stdout SHALL NOT include a continuation cue that says claimed work should be inspected or polled
- **AND** queue/index authority SHALL remain the source of truth for why no work was claimed

#### Scenario: claim rechecks current delegated authority

- **WHEN** a previously enqueued delegated card no longer admits under current canonical binding, explicit kind, assignment contract, or Wave0 target exclusivity
- **THEN** claim SHALL reject it before allocation or queue mutation

#### Scenario: one rejected candidate preserves batch atomicity

- **WHEN** a later candidate in a planned contiguous claim batch is rejected by shared admission, including a same-target Wave0 candidate
- **THEN** claim SHALL allocate zero work IDs and leave every candidate unclaimed

#### Scenario: distinct Wave0 targets remain batchable

- **WHEN** every Wave0 candidate in a planned prefix resolves to a distinct exact source target and none is owned by delegated in-flight work
- **THEN** target exclusivity SHALL not reduce the otherwise legal requested batch
- **AND** existing actor, admission, capacity, and transaction checks SHALL retain their authority

#### Scenario: legacy duplicate target queue drains serially

- **WHEN** an existing queue contains two Wave0 demands for the same target and no attempt currently owns that target
- **THEN** a conflict-free claim of the queue-order-earliest demand MAY succeed
- **AND** the later demand SHALL remain unclaimed until the earlier attempt terminalizes and fresh claim admission passes

### Requirement: Sub-agents SHALL NOT own workflow authority

> req: DEW-027

Sub-agents execute bounded work-unit tasks as content-producing actors only. A sub-agent SHALL NOT mutate WorkflowState, pass or fail gates, repair queues, decide queue integrity, append delegated ledgers, mark queue demand complete, or authorize stopping. Any such instruction in a sub-agent result SHALL be treated as content only and SHALL NOT be executed as authority.

#### Scenario: Sub-agent attempts to pass a gate

- **WHEN** a submitted work-unit result includes a recommendation to pass a gate
- **THEN** the Engine SHALL ignore that recommendation as authority
- **AND** the gate SHALL perform its own deterministic evaluation

#### Scenario: Sub-agent attempts to repair queue state

- **WHEN** a submitted work-unit result includes queue mutation instructions
- **THEN** the Engine SHALL NOT apply those instructions through the sub-agent path
- **AND** queue repair SHALL remain an Engine-controlled operation

### Requirement: Work-unit envelopes SHALL carry Engine-owned index records and complete claim profiles

> req: DEW-004

Each work-unit envelope SHALL include the Engine-owned index record, manifest,
task, result schema, beacon, runtime receipt path, status, result surfaces and
optional diagnostic runtime refs required for current validation. The Engine
SHALL generate an opaque `receipt_nonce` and require its exact binding across
the current index, manifest, beacon, task, runtime receipt, result and ledger
surfaces. Runtime refs and `_agent.json` remain diagnostic-only and SHALL NOT
establish attempt identity, actor provenance, or a compatibility exception.

Every new claim SHALL write one complete current profile: top-level
`assignment_contract_version: "work-unit.assignment.v3"`,
`submission_contract_version: "work-unit.submission.v1"`, and
`actor_contract_version: "work-unit.actor.v1"` with its one legal
`actor_execution` object. The index is the attempt-entry Source of Record;
manifest and beacon SHALL bind exactly the same profile and assigned output
contract. A submitted current attempt SHALL additionally use the existing
ledger-first immutable acceptance fingerprint and actor/result/receipt binding.

#### Scenario: New claim writes the complete current profile
- **WHEN** the Engine claims a current queue demand
- **THEN** index, manifest and beacon SHALL carry matching v3 assignment,
  marked submission and actor-v1 bindings before the attempt becomes usable
- **AND** the generated projections SHALL not offer a v1/v2, markerless, or
  unrecorded-actor alternative

#### Scenario: Explicit old assignment is rejected before interpretation
- **WHEN** an Engine reader encounters an attempt marked
  `work-unit.assignment.v1` or `work-unit.assignment.v2`
- **THEN** it SHALL return `unsupported_current_contract` before interpreting
  its recorded output contract
- **AND** it SHALL not reinterpret that attempt as v3 or mutate historical
  envelope, result, receipt, ledger, cache, or trace bytes

#### Scenario: Partial historical profile is rejected at one boundary
- **WHEN** an attempt lacks the marked submission discriminator or its actor
  contract/execution while other historical fields appear mutually consistent
- **THEN** the reader SHALL return `unsupported_current_contract` with the
  direct missing or unsupported profile fact
- **AND** it SHALL not derive acceptance from legacy index/status hash mirrors
  or project `legacy_unrecorded`

#### Scenario: Current actor paths remain distinct
- **WHEN** a current claim records an available delegated role or an authorized
  unavailable-role fallback
- **THEN** the complete profile SHALL retain respectively
  `delegated_subagent` or `phase_agent_fallback` under the existing actor rules
- **AND** neither class SHALL be inferred for an attempt with absent actor
  provenance

#### Scenario: v1 and v2 attempts are rejected before assignment interpretation
> The historical scenario name is retained only as the OpenSpec delta-sync key.
> The behavior below now rejects the old attempt before interpretation.
- **WHEN** dry-submit or formal submit reads an already-claimed v1 or v2
  attempt whose manifest and beacon carry a hash-valid bound output contract
- **THEN** it SHALL return `unsupported_current_contract` before reconstructing
  or comparing that version-selected contract
- **AND** it SHALL neither apply v3 supplementary semantics nor rewrite the
  manifest, beacon, candidate, or queue item

#### Scenario: Wave2 empty required outputs retain its base declaration rule
- **WHEN** a v3 `wave2_targeted_evidence` snapshot has its established empty
  required-output shape and a base contract that requires `output_files[]`
- **THEN** its resolved contract SHALL retain that declaration requirement
- **AND** it SHALL not inherit supplementary Wave1 empty-output semantics

#### Scenario: objective cannot become a direct-contract selector
- **WHEN** a queue snapshot contains a valid floor objective alongside an
  unsupported direct selector, receipt shape, or Topic binding
- **THEN** claim SHALL reject before allocation or envelope writes
- **AND** the objective SHALL not bypass or change the existing closed resolver

#### Scenario: existing kind customization is merged deterministically
- **WHEN** a hash-bound queue snapshot contains a strictly valid non-selector
  kind output contract customization
- **THEN** claim SHALL merge it with Engine-resolved required_outputs and
  validate the combined contract
- **AND** submit SHALL reconstruct that same merged value rather than discard
  the customization or trust manifest alone

#### Scenario: resolver preflights the complete batch
- **WHEN** one later candidate in a planned claim batch has an invalid
  assignment or merged output contract
- **THEN** side-effect-free preflight SHALL reject before entering the claim
  transaction or allocating the first candidate
- **AND** diagnostics SHALL identify the invalid queue item without a work-unit
  lock/transaction record, envelope, index row, batch-counter change, queue
  move, delegated-in-flight binding or claim-success event

#### Scenario: expected contract binds manifest and beacon
- **WHEN** dry-submit or submit loads a current-version attempt
- **THEN** it SHALL verify the embedded queue snapshot hash, rebuild expected
  output_contract with the index-bound assignment version, and compare manifest
  and beacon exactly
- **AND** missing, unknown, or drifting contract surfaces SHALL fail closed
  without falling back to path guessing

### Requirement: Envelope readers and generated projections SHALL stay consistent with the claim profile

> req: DEW-032


Every Engine reader of a claimed, submitted, timed-out, or superseded attempt
SHALL first classify that complete profile before assignment/output
interpretation, submit, inspection, declaration recovery, late-submit,
supersession, provenance, or a derived attempt projection. An explicit
assignment v1/v2, absent submission marker, legacy hash-mirror representation,
absent actor contract/execution, partial profile, or cross-surface profile drift
SHALL return one `unsupported_current_contract` result identifying the direct
unsupported discriminator. The reader SHALL NOT infer, default, migrate,
normalize, relabel, or silently drop the attempt using a path, current default,
hash mirror, runtime ref, historical guidance, or another profile field.

Generated task, starter, checklist and result-schema projections SHALL continue
to expose the current read-only assignment and actor bindings, but SHALL NOT
offer a legacy interpretation or an actor-selected profile. They remain
guidance projections and SHALL NOT pre-create result bytes, satisfy a receipt,
or weaken submit validation.

#### Scenario: supplementary task renders a read-only floor objective
- **WHEN** a claimed supplementary Wave1 queue snapshot carries valid
  `reference_floor_deficit: 2`
- **THEN** generated `task.md` SHALL state that two additional countable current
  canonical references are the acquisition objective for that bound Topic
- **AND** the Result JSON Starter, required outputs, receipt rules, and formal
  submit contract SHALL remain unchanged

#### Scenario: task objective is not a pass assertion
- **WHEN** a supplementary task with an objective submits valid source/cache
  facts but those facts do not yet yield the requested number of canonical
  countable projections
- **THEN** formal submit SHALL use its existing contract and SHALL not reject
  solely for missing the rendered objective
- **AND** the next Wave1 convergence evaluation SHALL report the remaining
  direct-fact result

#### Scenario: primary or general supplementary task has no invented objective
- **WHEN** a Wave1 task is primary, or it is supplementary without
  `reference_floor_deficit`
- **THEN** task generation SHALL not render a floor objective
- **AND** it SHALL not read filesystem state, Phase prose, or a profile floor to
  synthesize one

#### Scenario: claim resolves paired Wave1 direct outputs
- **WHEN** a primary `wave1_topic_deepening` snapshot contains assignment_mode
  primary plus the exact evidence-summary and question-list file receipts for
  one canonical Topic
- **THEN** the resolved contract SHALL contain exactly those two concrete
  path-role-direct-contract entries
- **AND** Phase-owned reference materialization and any explicitly authorized
  extra output SHALL not enter required_outputs

#### Scenario: v3 supplementary Wave1 has no forced paired rewrite
- **WHEN** a v3 supplementary `wave1_topic_deepening` snapshot has
  assignment_mode supplementary, no required file receipt, and the existing
  kind contract authorizes prior submitted evidence_summary lineage
- **THEN** required_outputs SHALL be empty and `output_files.required` SHALL be
  false for that attempt
- **AND** generated guidance and submit validation SHALL not require the
  candidate to redeclare or overwrite the prior evidence-summary or
  question-list

#### Scenario: nonce mismatch blocks submit
- **WHEN** a result or runtime receipt carries a nonce that differs from the
  work-unit beacon
- **THEN** submit SHALL reject the result as non-terminal
- **AND** no ledger row SHALL be written

#### Scenario: Actor-aware envelope provides exact result starter
- **WHEN** a new actor-aware work unit is claimed
- **THEN** generated `task.md` SHALL contain a result starter with the exact
  schema version, work ID, queue item ID, kind, receipt nonce, actor contract
  version and execution actor class
- **AND** the starter SHALL expose only fields accepted by the generated result
  schema

#### Scenario: Envelope explains submit-sensitive output and cache bindings
- **WHEN** a work-unit kind requires specific output roles, cache leaf files or
  source URL mappings
- **THEN** the generated pre-submit checklist SHALL name those requirements
  from the active output contract and cache policy
- **AND** it SHALL tell the actor not to overwrite manifest, beacon, result
  schema or status authority files

#### Scenario: Result starter is not completion authority
- **WHEN** the Engine generates a copy-ready result starter in task guidance
- **THEN** no assigned result, runtime receipt, output file, cache trail, ledger
  row or queue completion SHALL be created by that projection
- **AND** formal submit SHALL still require real actor-produced surfaces

#### Scenario: Receipt and diagnostic log are not interchangeable
- **WHEN** a work-unit actor records lifecycle progress
- **THEN** Agent-facing guidance SHALL require JSONL receipt events at the
  assigned runtime receipt path
- **AND** any `log-event.mjs` call SHALL be described as optional diagnostic
  mirroring only
- **AND** diagnostic logs without runtime receipt evidence SHALL NOT pass
  dry-submit or formal submit

#### Scenario: Phase Agent owns ordinary submit repair execution
- **WHEN** dry-submit returns an authorized candidate or receipt repair
  coordinate
- **THEN** the Phase Agent SHALL perform or direct the same-candidate
  mechanical repair and rerun dry-submit
- **AND** it SHALL NOT ask the user to operate the pipeline unless a separate
  semantic, permission, or external-action boundary exists

#### Scenario: claim resolves Wave0 direct output before mutation
- **WHEN** a UID-bound wave0_source_intake queue snapshot contains the
  canonical source.yaml file receipt for its recorded Topic slug
- **THEN** claim SHALL resolve one source_yaml required output with direct
  contract `wave0.source-metadata-array.v1`
- **AND** index, manifest and beacon SHALL bind `work-unit.assignment.v3`
  before the actor receives the envelope

#### Scenario: unsupported assignment fails before claim mutation
- **WHEN** required receipts are partial, duplicated, unsafe, cross-Topic, or
  unsupported for the registered kind
- **THEN** claim SHALL reject before allocating a work ID, opening a batch,
  moving queue demand, or writing an envelope
- **AND** diagnostics SHALL name the invalid assignment fact rather than infer
  a contract from writes_to or prose

#### Scenario: queue-authored direct selector is rejected
- **WHEN** a new queue item contains any closed reserved selector key at its
  root or recursively under payload/output_contract
- **THEN** claim SHALL reject the selector before mutation
- **AND** the Engine-owned closed resolver SHALL remain the only contract
  selector

#### Scenario: assignment mode and receipt shape must agree
- **WHEN** primary mode lacks the exact pair, supplementary mode carries any
  receipt, or a current Wave1 card lacks mode
- **THEN** claim SHALL reject before allocation or envelope writes
- **AND** a mode-absent unclaimed card SHALL return to AGQ-013 explicit
  assignment-mode repair rather than receive compatibility inference



### Requirement: Work-unit tasks SHALL carry absolute bundle-root paths and the read-only beacon

> req: DEW-009

Generated work-unit task Markdown and any Agent-facing claim/spawn output SHALL include the current run bundle root normalized by the Engine as one canonical absolute `bundle_dir`, the exact work-unit identity fields, bundle-relative canonical refs, and absolute paths for files the sub-agent must read or write. The immutable Engine-owned `_beacon.json`, generated task, spawn/claim output, and generated work-unit CLI examples SHALL agree on that same absolute root. `bundle_dir` SHALL NOT be repo-relative, current-working-directory-relative, or only the bundle basename.

The task SHALL instruct the actor to use supplied absolute paths directly and to resolve each bundle-relative runtime ref under canonical `bundle_dir` exactly once. The actor SHALL NOT prefix a ref with the bundle basename before resolution, reinterpret an absolute path as bundle-relative, or treat a nested `<bundle>/<bundle>/...` path as a compatible runtime root. Every generated work-unit CLI command SHALL pass the canonical absolute root rather than depend on the actor's current working directory.

The beacon SHALL remain a read-only binding surface for the actor. The actor SHALL NOT overwrite, supplement, or manually repair it. Inspect, dry-submit, and formal submit SHALL reuse one beacon-binding evaluator that compares `bundle_dir` with the current Engine-resolved bundle root and compares the remaining beacon content with the index, manifest, and contract-derived expected binding. Relative `bundle_dir`, root mismatch, or other beacon drift SHALL fail closed before ledger, queue, assigned result, receipt, cache, trace, log, or transaction success writes.

For a current actor-bound production claim, the Engine SHALL derive one canonical role-guidance ref from the existing registered kind's closed delegated_role_key. It SHALL pass the existing claim-resolved kind and actor policy into the projection and require that policy's delegated role key to match, rather than reconstructing a second kind lookup from queue payload. It SHALL parse that canonical role's direct requires[] exactly one level, resolve each direct shared dependency as a contained regular shipped file, and project only dependencies whose own frontmatter declares actor_delivery: required; exactly one SHALL be the canonical page-fetch node with its closed id/scope identity. Role requires[] SHALL remain the dependency fact and shared-node frontmatter SHALL remain the delivery classification/identity fact rather than a role-to-shared allowlist in the projection helper. These refs SHALL be ephemeral task/spawn projections: they SHALL NOT be supplied by queue payload, Phase Agent or actor, persisted in index/manifest/beacon/result, discovered by directory scan or recursive loading, or added to the workflow manifest's always-loaded shared set. Generated task/spawn SHALL expose the same repo-relative refs plus resolved absolute read paths and require the actor to read them before search, fetch or output authoring.

For each non-empty required_outputs[] entry, generated task and spawn guidance SHALL display a bounded minimum authoring projection obtained from the same direct-output contract definition that dispatches fresh-byte evaluation. The projection SHALL name required structural or semantic content without returning raw validator code, regexes or an actor-fillable selector. Formal production claim SHALL preserve the existing actor-decision order: queue/assignment/actor-policy preview and actor decision occur first; a no-claim/invalid decision SHALL return through its existing repair without requiring delivery assets. Only an allow_claim decision SHALL resolve role/shared refs and every required descriptor during read-only delivery preflight before entering the write transaction, removing queue demand, allocating a work ID or publishing an envelope. Unknown role, missing/escaping guidance, invalid actor-delivery classification, unknown contract identity or missing projection SHALL therefore leave queue, index and envelope unchanged; kind/role mismatch remains the existing actor-decision root. The internal/test envelope constructor SHALL require the same complete current profile and reject an absent actor binding as `unsupported_current_contract` before publishing an envelope or fabricating a role. This preflight guarantee SHALL NOT be described as generic filesystem rollback for an I/O failure after mutation begins. All projections SHALL be generated from the validated assignment/manifest contract and SHALL not maintain a second artifact-field or heading inventory; shared evaluator remains verdict authority and existing role guidance remains the rich Agent-facing explanation.

#### Scenario: Claimed task contains one canonical absolute runtime root
- **WHEN** `operate-work-unit claim` creates a work unit for current run bundle `/repo/dpt_rb_aidlc-investigation`
- **THEN** the generated beacon, task, spawn/claim output, and CLI examples SHALL use `bundle_dir: /repo/dpt_rb_aidlc-investigation`
- **AND** the task SHALL include absolute paths for `_beacon.json`, `result.json`, `runtime-receipt.jsonl`, declared output files, and required cache leaf directories
- **AND** bundle-relative paths SHALL remain clearly labeled as refs relative to `bundle_dir`

#### Scenario: Bundle-relative refs are resolved exactly once
- **WHEN** a task declares canonical ref `_work_units/wave0/wu-w0-b001-src-i0001/result.json`
- **THEN** the actor-facing absolute path SHALL be `/repo/dpt_rb_aidlc-investigation/_work_units/wave0/wu-w0-b001-src-i0001/result.json`
- **AND** no guidance or Engine normalization SHALL produce `/repo/dpt_rb_aidlc-investigation/dpt_rb_aidlc-investigation/...`

#### Scenario: Beacon root drift blocks submit
- **WHEN** an actor overwrites the assigned beacon so `bundle_dir` is relative or differs from the current Engine-resolved current run bundle root
- **THEN** inspect, dry-submit, and formal submit SHALL report beacon binding failure from the shared evaluator
- **AND** no ledger row, queue completion, assigned result normalization, transaction success, or provenance SHALL be written
- **AND** guidance SHALL NOT tell the actor to hand-write a replacement beacon

#### Scenario: Wrong nested bundle invocation has no filesystem side effect
- **WHEN** an Agent is already inside `/repo/dpt_rb_aidlc-investigation` and invokes an existing-authority work-unit command with relative bundle argument `dpt_rb_aidlc-investigation`
- **AND** that argument resolves to nonexistent `/repo/dpt_rb_aidlc-investigation/dpt_rb_aidlc-investigation`
- **THEN** the command SHALL fail on the missing existing bundle/work-unit authority
- **AND** it SHALL NOT create the nested bundle directory, `_work_units`, `_work_units/_transactions`, a lock, trace, log, or rejection state
- **AND** the nearest action SHALL be to rerun with the canonical absolute `bundle_dir` from the generated task/beacon

#### Scenario: Claimed task contains absolute runtime paths
> The historical scenario name is retained only as the OpenSpec delta-sync key.
> The absolute-runtime-root behavior it described is now owned solely by the
> scenario "Claimed task contains one canonical absolute runtime root"; this
> scenario no longer states an independent requirement.
- **WHEN** `operate-work-unit claim` generates task, beacon, spawn/claim output, or CLI examples naming runtime paths for a current run bundle
- **THEN** the SHALL-level behavior is governed by the scenario "Claimed task contains one canonical absolute runtime root"
- **AND** this scenario SHALL NOT be read as a second, independent absolute-path requirement

#### Scenario: no-claim actor decision does not require delivery assets
- **WHEN** the existing actor decision returns no-claim or invalid, including kind/role mismatch, before allocation
- **THEN** claim SHALL return its existing actor-policy repair without reading role/shared delivery files or direct actor descriptors
- **AND** missing delivery assets SHALL not replace the nearer actor decision root for an attempt that was never authorized

#### Scenario: Incomplete actor profile cannot construct an envelope
- **WHEN** an attempted envelope lacks the current actor-v1 contract or its legal `actor_execution` binding
- **THEN** the Engine SHALL reject it as `unsupported_current_contract` before publishing manifest, beacon, task, result schema, or actor guidance
- **AND** it SHALL not infer, fabricate, or project a delegated role from a legacy envelope

### Requirement: Task verification and generated guidance SHALL bind required outputs and role contracts

> req: DEW-033


Existing-authority reads SHALL validate their prerequisite before creating work-unit directories. A work-unit index load with `createIfMissing: false`, and inspect/dry-submit/submit or rejection handling built on that read, SHALL NOT create `_work_units`, `_work_units/_transactions`, a lock, trace, log, or other runtime surface when the resolved bundle root has no existing work-unit authority. Explicit create/claim paths MAY initialize work-unit directories only after the current run bundle root itself has been validated.

The required verification SHALL cover declared `writes_to` outputs, `result.json`, `runtime-receipt.jsonl`, cache leaf files required by the work-unit cache policy, unchanged beacon binding, and absence of a same-name nested bundle root created by the actor. A sub-agent that cannot write or verify the files SHALL report work-unit failure rather than returning only research text.

For a current-version work unit, index, manifest and beacon SHALL carry top-level assignment_contract_version. Generated task, spawn prompt and checklist SHALL display that marker plus every resolved required output's exact absolute and bundle-relative path, canonical role, and closed direct_contract identity. Generated result schema SHALL constrain required output declarations and MAY describe the marker as read-only annotation, but SHALL NOT add assignment_contract_version or direct_contract as actor-fillable result fields.

The generated task SHALL require the actor to write and verify every assigned required output before returning work_done. The Phase Agent SHALL run the predictive dry-submit after the actor returns and before formal submit. It MAY repair only a mechanical parseable-candidate declaration: an absent/defaultable identity/schema field with one unambiguous value from the verified envelope, or an omitted/misdeclared required path/role when the exact assigned target passes its direct contract. It SHALL NOT overwrite a conflicting supplied identity or edit artifact, receipt, source or cache facts under that scope. A missing/unparseable candidate, missing target, YAML parse/top-level/schema failure, missing receipt/source/cache/finding/question/enum/semantic fact, or any repair requiring actor-owned fact changes SHALL be semantic_content. Before work_done, the selected actor owns semantic repair. After work_done, the Phase Agent SHALL run `operate-work-unit fail` with normalized reason `semantic_contract:<primary_root_code>` using the Engine-derived field, explicitly enqueue replacement demand under a fresh queue ID preserving the same canonical Topic and assignment_mode/receipt obligation, and obtain a replacement work ID for real actor execution. The reason SHALL NOT use `actor_spawn_unavailable:` or another accepted automatic-retry trigger. The Phase Agent SHALL NOT weaken a failed primary pair into supplementary mode or offer abandon as a competing normal semantic-replacement route.

Generated guidance SHALL distinguish a current supplementary attempt with no required_outputs from a primary paired assignment. It SHALL expose contract-authorized prior submitted paths without instructing the actor to overwrite them. The user SHALL not be asked to run ordinary search/fetch, dry-submit, fail/replacement, claim, or submit commands already permitted to the Agent.

Canonical role/shared guidance SHALL describe capabilities and rich authoring behavior but SHALL not expand the current assignment. Generated kind-specific guidance and role execution steps SHALL condition paired-output instructions on current required_outputs[]: a primary Wave1 pair SHALL write and verify both assigned targets; a supplementary empty-required-output attempt SHALL not recreate or redeclare prior evidence-summary/question-list files and SHALL write only current contract-authorized output/cache/source/result/receipt facts.

#### Scenario: Sub-agent must verify writes before returning
- **WHEN** a sub-agent completes a work-unit task
- **THEN** the task contract SHALL require it to verify every declared output file exists under the exact current run bundle root
- **AND** it SHALL require `result.json` and `runtime-receipt.jsonl` to contain the exact `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`
- **AND** it SHALL require cache trail leaves to contain required files before the sub-agent returns success
- **AND** it SHALL verify that beacon binding is unchanged and no same-name nested bundle root was created

#### Scenario: Chat-only completion is not successful delegated completion
- **WHEN** a sub-agent returns research findings in conversation text but does not write the required result, receipt, output, and cache files
- **THEN** the work unit SHALL remain unsubmitted or submit SHALL reject it
- **AND** the Phase Agent SHALL treat the return as work-unit failure or repair input, not delegated completion

#### Scenario: task projects exact required output bindings
- **WHEN** claim creates a current primary Wave1 work unit
- **THEN** generated task SHALL name the top-level assignment version plus exact evidence-summary and question-list paths, canonical roles and direct contract IDs, while result-schema guidance constrains the exact path-role declarations without an actor-fillable contract field
- **AND** no generated projection SHALL let the actor choose another contract ID

#### Scenario: canonical role and authoring contracts reach the actor
- **WHEN** claim creates a current primary Wave1 work unit for registered role `dpt-evidence-extractor`
- **THEN** generated task and spawn prompt SHALL expose the same canonical role-guidance ref and absolute read path derived by the Engine
- **AND** the paired required outputs SHALL display contract-owned `Key Findings`, `Topic Investigation Targets`, `Question Reconciliation`, `Emergent Question Protocol`, and `Exploration / Exploitation Decision` minimum semantics before actor work begins
- **AND** dry-submit SHALL still obtain its verdict only from the shared direct-output evaluator over fresh target bytes

#### Scenario: unknown role or authoring contract fails before publication
- **WHEN** an actor-authorized registered role resolves to an unknown role key, missing shipped role/dependency file, invalid actor-delivery classification, unknown direct contract or missing contract projection during formal claim generation
- **THEN** read-only claim preflight SHALL fail before queue removal, work-ID allocation, index mutation or envelope publication
- **AND** no persisted role/shared ref or generic transaction-rollback claim SHALL be introduced
- **AND** the nearest action SHALL be to repair the existing kind/role/direct-contract owner rather than ask the actor or user to choose a replacement

#### Scenario: accepted Phase Agent fallback receives the same authoring guidance
- **WHEN** the existing actor decision authorizes one `phase_agent_fallback` claim for a registered kind
- **THEN** its generated task/spawn surface SHALL receive the same Engine-derived canonical role/shared refs and required-output descriptors as delegated execution of that kind
- **AND** the fallback SHALL retain its existing single-work-unit, dry-submit, formal-submit and provenance boundaries without gaining role or contract selection authority

#### Scenario: supplementary task projects no paired rewrite
- **WHEN** a current supplementary Wave1 assignment has no required_outputs and one eligible prior submitted evidence_summary
- **THEN** generated guidance SHALL expose that prior path as source-ref lineage
- **AND** generated task, spawn and canonical role guidance SHALL not list the prior evidence-summary or question-list as current required writes or unconditional role outputs

#### Scenario: Phase Agent repairs mechanical candidate drift
- **WHEN** post-return dry-submit proves the exact assigned target passes its direct contract but reports only an omitted/wrong result declaration path or role
- **THEN** recommended_action SHALL be repair_same_candidate and the Phase Agent MAY repair result.json without changing artifact bytes, then rerun the same dry-submit
- **AND** it SHALL preserve the recorded actor provenance and avoid user pipeline work

#### Scenario: semantic failure requires replacement execution
- **WHEN** post-return dry-submit finds missing real source facts, Key Findings content, or required question semantics after the actor recorded work_done
- **THEN** the Phase Agent SHALL not write the missing research content under that actor's provenance
- **AND** recommended_action SHALL be fail_and_replace, followed by `operate-work-unit fail` reason `semantic_contract:<primary_root_code>` using the Engine-derived field, explicit same-obligation enqueue under a fresh `queue_item_id` absent from every durable queue location, and a replacement attempt with a new work ID for real actor execution

#### Scenario: task projection is not an acceptance voter
- **WHEN** generated Markdown or result-schema guidance drifts from the reconstructed manifest/beacon contract
- **THEN** claim parity tests or submit contract checks SHALL fail
- **AND** runtime acceptance SHALL not use the projection to outvote the Engine-resolved contract

















### Requirement: Work-unit claim SHALL evaluate one explicit actor observation before allocation

> req: DEW-016

When eligible delegated demand exists, every new work-unit claim SHALL build a read-only candidate plan before mutation and SHALL receive an explicit decision-point actor observation bound to that plan's delegated `role_key`. The observation SHALL contain `outcome: available|unavailable|unknown`, `source: native_probe|not_observed`, the exact role key, and a normalized reason code. The role key itself is the actor surface identifier; this contract SHALL NOT add a second arbitrary actor-surface string or an undefined host-report authority. A normal delegated candidate plan SHALL contain only the contiguous eligible queue-front prefix, up to the requested count, whose delegated role key and kind actor policy are valid. A fallback candidate plan SHALL contain only the single eligible queue-front item because fallback effective count is one. Claim SHALL evaluate the plan and observation before allocating a work ID, opening or incrementing a batch, moving queue demand into delegated in-flight state, or creating a work-unit directory.

The accepted source/outcome/reason combinations SHALL be closed:

- `available + native_probe + probe_succeeded`;
- `unavailable + native_probe + probe_access_denied|probe_model_unavailable|probe_host_policy_blocked|probe_capacity_unavailable`;
- `unknown + not_observed + observation_required`;
- `unknown + native_probe + probe_inconclusive`.

An inconclusive tool error SHALL NOT be normalized to unavailable or authorize fallback. `unknown` SHALL produce no claim with one recommended action to perform or repeat one bounded native actor probe for the planned role and rerun the same claim checkpoint. A missing observation for eligible demand SHALL normalize to `unknown/not_observed/observation_required`, not to available. `available` with requested `phase_agent_fallback` SHALL be rejected as an unnecessary fallback. The Engine SHALL NOT infer actor availability from prior failures, timeout, chat history, account balance text, filesystem mtime, or earlier trace events.

The existing Engine-owned work-unit kind contract SHALL declare an actor policy for each supported kind. The accepted mappings SHALL be `wave0_source_intake → dpt-source-intake`, `wave1_topic_deepening → dpt-evidence-extractor`, and `wave2_targeted_evidence → dpt-topic-scout`; all three SHALL allow single-attempt `phase_agent_fallback`. Candidate kind/role mismatch SHALL fail before mutation. Missing/unknown kind policy SHALL fail closed. If delegated execution is unavailable and the queue-front candidate permits fallback, a delegated no-claim verdict SHALL recommend one explicit fallback claim. If the queue-front policy prohibits fallback, the one recommended action SHALL be to resolve the external actor blocker and rerun normal claim.

Actor preflight SHALL reuse the existing work-unit claim trace/log event family rather than create a new actor-preflight event family. Successful claim events SHALL include the normalized role key, outcome, source, reason code, actor class, and policy decision. A valid no-claim SHALL use the existing claim-rejected event with the same normalized fields and verdict. Invalid CLI/schema input SHALL fail before trace mutation. These diagnostic fields SHALL NOT become a reusable availability token, lifecycle mode, or future claim authority.

For a supplied actor observation that is incomplete, enum-invalid, or
contradictory, public claim output SHALL project the existing validation result
at the top level as `actor_observation_feedback`. It SHALL contain the planned
role key, one primary field conflict, bounded field-level conflicts, the full
closed vocabulary of legal `{ outcome, source, reason_code }` tuples for that
role, and the one same-claim rerun coordinate. Existing nested `input_issues`
MAY remain as durable diagnostic detail, but callers SHALL not need to search it
to discover the conflicting field or legal tuple. This projection SHALL reuse
the existing actor policy/validator and SHALL not relax role proof, infer
availability, allocate a work unit, or write claim/queue/index/batch/envelope
state.

#### Scenario: Available delegated actor permits normal claim

- **WHEN** claim plans eligible demand for role `dpt-source-intake`, receives a matching current `available/native_probe/probe_succeeded` observation, and requests `delegated_subagent`
- **THEN** the Engine SHALL allocate eligible work units through the existing claim transaction
- **AND** each allocated record SHALL bind the normalized observation and `execution_actor_class: delegated_subagent`

#### Scenario: Unknown actor availability creates no doomed attempt

- **WHEN** eligible delegated demand exists and claim receives no observation or `outcome: unknown`
- **THEN** it SHALL allocate no work ID and SHALL leave queue demand and work-unit index allocation unchanged
- **AND** it SHALL return one action to perform one bounded native actor probe and rerun claim

#### Scenario: Inconclusive probe does not authorize fallback

- **WHEN** the native probe fails without a normalized access, model, policy, or capacity-unavailable fact
- **THEN** the observation SHALL be `unknown/native_probe/probe_inconclusive`
- **AND** claim SHALL allocate neither normal nor fallback work

#### Scenario: Unavailable delegated actor creates no doomed batch

- **WHEN** claim receives a matching `outcome: unavailable` observation and requests `delegated_subagent`
- **THEN** it SHALL allocate zero work units before any native spawn is attempted
- **AND** when the queue-front candidate kind permits fallback it SHALL return one action to rerun the same claim with `phase_agent_fallback`

#### Scenario: Observation role mismatch blocks before allocation

- **WHEN** queue-front candidate demand delegates to `dpt-evidence-extractor` but the observation is bound to `dpt-source-intake`
- **THEN** claim SHALL reject before trace, queue, index, batch, or work-unit mutation

#### Scenario: Unknown kind policy fails closed

- **WHEN** a candidate item resolves to a work-unit kind with no Engine-owned actor policy
- **AND** delegated execution is unavailable
- **THEN** claim SHALL allocate no fallback work unit
- **AND** it SHALL return one action to resolve the external actor blocker and rerun normal claim

#### Scenario: Historical claim trace does not authorize a later claim

- **WHEN** a prior successful claim trace says the actor was available but the current claim supplies no current explicit observation
- **THEN** the current claim SHALL fail closed without using the historical trace as authority

#### Scenario: Zero-progress spawn unavailability uses one recovery path

- **WHEN** a normally claimed delegated attempt fails to spawn with a classified unavailable reason before any work-started receipt or Engine-observed output/cache progress
- **THEN** the Agent-facing contract SHALL direct `operate-work-unit fail` with normalized reason `actor_spawn_unavailable:<reason_code>`
- **AND** the next action SHALL be a fresh native probe followed by a new legal claim

#### Scenario: Progress-positive attempt does not use spawn-failure shortcut

- **WHEN** a claimed attempt has a work-started receipt or Engine-observed output/cache progress
- **THEN** later actor/runtime trouble SHALL remain under existing inspect, repair, and timeout-preflight contracts
- **AND** it SHALL NOT be automatically failed or converted to fallback

#### Scenario: Claim exposes invalid actor vocabulary at the decision point

- **WHEN** a claim supplies an unsupported `actor_reason` or a contradictory
  actor observation for the planned role
- **THEN** top-level `actor_observation_feedback` SHALL name the primary field
  conflict and the complete legal tuple vocabulary for that role
- **AND** the command SHALL retain the existing no-mutation, same-claim repair
  boundary without turning historical actor observations into proof


### Requirement: Work-unit provenance SHALL bind execution actor class

> req: DEW-018

New claims SHALL use the existing explicit actor sub-contract
`actor_contract_version: "work-unit.actor.v1"`. The transaction-bound index
record, matching manifest and beacon, current result/receipt bindings, and
submitted ledger SHALL retain one legal `actor_execution` snapshot. Inspect and
submit diagnostics SHALL derive the same actor class from those direct
surfaces; diagnostic runtime refs, `_agent.json`, host text, and guidance SHALL
not be actor authority.

The only legal current execution classes remain `delegated_subagent` after an
available role observation and `phase_agent_fallback` after the existing
authorized unavailable-role decision. An attempt lacking the actor contract or
execution SHALL be rejected as `unsupported_current_contract` before ledger-row
construction, inspect projection, recovery, supersession, or Gate provenance.
It SHALL not create a `legacy_unrecorded` projection, a legacy schema-union
value, or an inferred real actor class.

#### Scenario: Current actor provenance is durable

- **WHEN** a complete current attempt is formally submitted
- **THEN** its ledger and inspect projection SHALL retain the exact current
  delegated or authorized fallback actor class
- **AND** conflicting candidate result or receipt actor binding SHALL continue
  to fail before authority mutation

#### Scenario: Unrecorded actor is not a provenance projection

- **WHEN** an otherwise historical-looking attempt lacks actor contract or
  actor execution fields
- **THEN** every current Engine computation SHALL return
  `unsupported_current_contract`
- **AND** it SHALL neither project `legacy_unrecorded` nor default an actor
  identity

#### Scenario: Normal submit records delegated actor provenance

- **WHEN** a `delegated_subagent` work unit submits successfully
- **THEN** the normalized result and submitted ledger row SHALL record `execution_actor_class: delegated_subagent`
- **AND** the actor observation SHALL match the claimed Engine record

#### Scenario: Fallback submit is distinguishable in audit

- **WHEN** a `phase_agent_fallback` work unit submits successfully
- **THEN** its result, receipt validation, inspect projection, and ledger row SHALL identify `phase_agent_fallback`
- **AND** no surface SHALL describe it as a native delegated subagent execution

#### Scenario: Diagnostic runtime refs do not decide actor class

- **WHEN** `_agent.json` or runtime refs are empty, present, stale, or oddly shaped while manifest/index/result/receipt actor binding is exact
- **THEN** actor validation SHALL use the actor authority and SHALL NOT fail or reclassify submit from diagnostic metadata alone

#### Scenario: Conflicting actor class is rejected

- **WHEN** result or runtime receipt claims an execution actor class different from the claimed work-unit record
- **THEN** dry-submit and formal submit SHALL reject without queue completion, ledger append, or work-unit terminal mutation

#### Scenario: Historical ledger does not fabricate actor provenance

- **WHEN** a pre-v0.25 submitted ledger row has no actor field
- **THEN** readers and inspect SHALL return `unsupported_current_contract`
  before actor projection or provenance computation
- **AND** they SHALL neither project `legacy_unrecorded` nor label it
  `delegated_subagent` based on work-unit identity or runtime refs

#### Scenario: New claim writes the actor sub-contract

- **WHEN** a new normal or fallback claim succeeds
- **THEN** its index record, manifest, and beacon SHALL carry the full `work-unit.actor.v1` actor execution object
- **AND** generated result/receipt contracts SHALL require the same actor contract version and exact actor class without duplicating the observation

#### Scenario: No-claim does not rewrite legacy index

- **WHEN** a bundle has legacy index records and actor preflight returns no-claim
- **THEN** the index bytes SHALL remain unchanged

### Requirement: Work-unit provenance SHALL inherit UID-bound queue identity without duplicate fields

> req: DEW-019

When topic-scoped demand is claimed, the existing immutable `manifest.queue_item` snapshot SHALL preserve canonical payload UID and the current slug observed at enqueue. Submit/provenance readers SHALL resolve topic identity from that snapshot and the ledger's existing `work_unit_ref`; WorkUnitResultSchema and WorkUnitLedgerRecordSchema SHALL NOT gain duplicate topic fields. Historical slug-only queue snapshots MAY resolve through unique registry layout history. Layout mutation SHALL never edit receipt, actor, result, work-unit or ledger facts.

#### Scenario: Claim snapshot carries existing queue binding
- **WHEN** a topic-scoped demand is claimed after TopicTreeEvolution activation
- **THEN** its existing manifest queue-item snapshot SHALL carry the same canonical payload UID and current slug
- **AND** result and ledger schemas SHALL remain free of duplicate topic identity fields

#### Scenario: Historical record remains byte-stable
- **WHEN** its topic is later renamed or renumbered
- **THEN** the submitted work-unit and ledger bytes SHALL remain unchanged
- **AND** shared inspection SHALL resolve the snapshot's previous slug to the current UID while preserving its recorded output paths

### Requirement: Existing task brief may expose a read-only user-controls coordinate

> req: DEW-020

When user research controls are present, Phase guidance SHALL permit the Phase Agent to add one instruction to its existing queue-item `task_brief` before claim, directing the actor to read `rb_plan.md## Constraints > User Research Controls` through the work unit's existing beacon-rooted bundle coordinate. The Engine SHALL carry that already-authored `task_brief` unchanged through the existing manifest/task rendering path; it SHALL NOT infer, generate, parse, or copy user controls itself. The instruction SHALL be bundle-relative and read-only, and SHALL only guide source selection, evidence treatment, analysis, and presentation.

The instruction SHALL NOT add queue, manifest, result, receipt, allocation, lifecycle, assignment, or write authority; controls SHALL NOT be copied into work-unit machine fields. When controls are absent, generated task briefs SHALL retain their existing behavior without an empty control payload or added read obligation.

#### Scenario: delegated task receives Phase-authored coordinate but no new authority
- **WHEN** a control-bearing Phase Agent creates a queue item whose existing task brief names the bounded read-only host-file coordinate
- **THEN** the claimed delegated task renders that existing brief unchanged
- **AND** the work-unit manifest/result/receipt schemas and submit authority remain unchanged

### Requirement: Delegated work contract entry SHALL be constructible from one generated projection

> req: DEW-021

For eligible delegated demand, the Engine SHALL expose the same closed contract lineage at each Agent decision point without creating a second acceptance authority.

Before allocation, after eligible queue-front demand identifies a planned delegated `role_key`, claim SHALL expose an output-only `actor_observation_contract`. It SHALL contain that role and every exact legal `{ outcome, source, reason_code }` tuple with its semantic continuation category: four case shapes expanding to seven tuples. A supplied observation object that is incomplete, enum-invalid, or contradictory SHALL return structured claim feedback naming its supplied field/value conflict, the planned role, this vocabulary, and one same-check action; it SHALL allocate no work ID and write no claim trace, queue, index, batch, or envelope state. At the CLI boundary, an observation is supplied when any `--actor-outcome`, `--actor-source`, `--actor-role-key`, or `--actor-reason` option is present, including an empty string value; it is omitted only when all four options are absent. An omitted observation argument SHALL retain the existing `unknown/not_observed/observation_required` no-claim normalization and its existing audit behavior. The projection SHALL NOT treat generic HITL1 research access, historical trace, chat context, or an unobserved capability as a role-bound native observation, and SHALL NOT choose a probe outcome for the Agent.

After a claim succeeds, the Engine SHALL render one `## Completion Contract` section as the first authoring entry of the existing generated `task.md`; spawn prompt SHALL direct the actor to that same task entry rather than a second contract file or a duplicate attempt-bound instruction set. The section SHALL be regenerated only from the existing attempt authority: manifest/beacon identity and paths, generated result-schema constraints, resolved required outputs and the same direct-output evaluator definitions that validate them, the resolved cache policy and same cache-leaf evaluator definition that validates it, current source policy/lineage, and runtime-receipt event contract. It SHALL state the exact result/receipt bindings, required output path-role-contract tuples, complete validator-owned authoring facts for each required direct output and cache leaf, and the existing dry-submit rerun command. `task.md` and spawn prompt SHALL not retain independently normative-looking duplicate completion fragments for those same facts.

The Completion Contract section is Agent-facing guidance only. It SHALL NOT be a manifest/beacon/result/receipt/ledger field, an acceptance voter, a validator, a recovery operation, a new file/path, or a new persistent state authority. Generation SHALL NOT pre-create `result.json`, runtime receipt event lines, cache leaves, source claims, output content, evidence, or a ledger row. Existing claimed envelopes remain governed by the generated surfaces already bound to their attempt; no backfill or migration is required.

Claimed normal dry-submit and normal formal-submit rejection SHALL use the existing shared candidate root selection. When a candidate has a primary root, the selection SHALL expose one selected member of normalized `violations[]`; every public primary detail on those two candidate checkpoints (`primary_root_code`, `repair_kind`, `missing_fact`, `write_to`, `rerun`, and recommended action) SHALL derive from that same selected root, rather than an unrelated earliest array entry. Timeout-preflight SHALL retain its existing minimal candidate projection from that same selection (`recommended_action` and `primary_root_code`) for timeout advice, SHALL NOT independently select a violation or copy candidate repair detail, and SHALL preserve its own lease/terminal authority. Late-submit SHALL retain its separate historical acceptance semantics. The Engine SHALL evaluate prerequisites before dependent checks and suppress only derived symptoms; independently evaluable roots remain available as structured diagnostic detail with their own repair coordinates. The selected candidate result SHALL expose one nearest legal action and the same dry-submit checkpoint for legal repair, or the existing owner/terminal/missing-contract boundary when no caller repair exists.

This requirement SHALL reuse the existing actor decision, envelope renderer, direct-output evaluator, submit validation, candidate projection, timeout, and formal submit paths. It SHALL NOT add a generic controller, retry branch, actor selector, mutable provenance, ledger amendment, queue recovery operation, Gate/degradation rule, or a general HITL1-to-role proof conversion.

The generated Completion Contract and public claim feedback SHALL consume the
same validator-owned actor-observation vocabulary. Timeout preflight's
`recommendation_basis` SHALL consume the already selected candidate/progress/
lease/integrity branch rather than copy a task-only candidate validator. These
are reader projections of existing contracts, not a second task protocol,
cache-trail mapping, role proof, or recovery path.

#### Scenario: Invalid observation is discoverable without weakening role proof

- **WHEN** an eligible Wave0 claim for `dpt-source-intake` supplies `available/not_observed/probe_succeeded`
- **THEN** claim SHALL return a structured no-mutation rejection that names the conflicting supplied fields and the complete closed actor-observation vocabulary for `dpt-source-intake`
- **AND** its one next action SHALL be the existing role-bound native-probe claim boundary, not use generic HITL1 access or silently normalize the tuple to available

#### Scenario: Omitted observation remains a truthful no-claim fact

- **WHEN** eligible delegated demand is claimed without an observation argument
- **THEN** claim SHALL retain its existing `unknown/not_observed/observation_required` no-claim normalization and existing audit behavior
- **AND** a supplied partial or malformed observation object SHALL instead take the structured pre-trace rejection path without pretending it is that normalized observation

#### Scenario: Empty CLI observation value is not an omission

- **WHEN** an eligible delegated claim supplies `--actor-outcome=` and no other actor-observation option
- **THEN** it SHALL take the structured pre-trace malformed-input rejection path with no allocation, claim trace, queue, index, batch, or envelope mutation
- **AND** it SHALL NOT normalize to `unknown/not_observed/observation_required` or write that omitted-observation audit event

#### Scenario: Claimed actor receives one constructible completion entry

- **WHEN** a current Wave0 or primary Wave1 delegated work unit is claimed
- **THEN** its generated task SHALL present `## Completion Contract` as the first authoring entry and spawn prompt SHALL direct the actor to that same task
- **AND** that section SHALL agree with the existing manifest, beacon, result schema, required output validator-owned authoring facts, cache-leaf validator-owned authoring facts, source policy, and receipt contract without creating result content, receipt event, cache leaf, output, or ledger authority bytes

#### Scenario: Completion entry exposes Wave0 direct-output and cache construction facts

- **WHEN** a current Wave0 source-intake work unit is claimed
- **THEN** its Completion Contract SHALL expose the validator-owned top-level array and required/optional metadata-field facts for the assigned `source.yaml`, plus the resolved cache leaves, non-placeholder/degraded page rule, and allowed `meta.json` source-mapping fields
- **AND** those facts SHALL be rendered from the same definitions used by direct-output and cache-leaf validation, not a second task-only validator or hand-maintained field list

#### Scenario: Primary feedback matches the recommended action root

- **WHEN** dry-submit can independently observe a mechanical result declaration issue and an actor-owned semantic direct-output issue
- **THEN** the returned recommended action and all public primary repair details SHALL name the same selected primary root
- **AND** the mechanical issue SHALL remain available only as a structured independent diagnostic with its own same-check coordinate

#### Scenario: A failed prerequisite does not manufacture dependent repairs

- **WHEN** a claimed candidate lacks a parseable result or an authoritative manifest/beacon prerequisite
- **THEN** dry-submit SHALL report that direct prerequisite root and SHALL not report output declaration, cache, source-claim, or direct-output symptoms whose evaluation requires the missing prerequisite
- **AND** it SHALL retain any separately evaluable receipt, queue, or identity root without calling it a consequence of the missing candidate surface

#### Scenario: Historical attempt does not need a Completion Contract migration

- **WHEN** an already-claimed work unit predates this generated Completion Contract task section
- **THEN** dry-submit, formal submit, timeout-preflight, terminal handling, and historical ledger reading SHALL continue through their existing attempt-bound contract surfaces
- **AND** no claim, index, manifest, beacon, result, receipt, cache, queue, or ledger byte SHALL be rewritten to retrofit the projection

#### Scenario: Generated and public feedback stay on one contract lineage

- **WHEN** a planned claim is rejected for an invalid actor observation or a
  claimed attempt receives timeout preflight advice
- **THEN** its visible tuple vocabulary or recommendation basis SHALL derive
  from the same existing actor or preflight contract used by the corresponding
  checkpoint
- **AND** task guidance SHALL not add a duplicate cache-trail, actor-proof, or
  timeout validator to explain that result

### Requirement: Work-unit attempts SHALL expose logical execution guidance from existing attempt bindings

> req: DEW-022

Each current-version claimed work unit SHALL expose a derived attempt-ownership projection from the
Engine-written `actor_execution` and the existing `work_id` + `receipt_nonce` binding across its index
record, manifest, beacon, task, result starter, candidate/receipt actor discriminators, and runtime receipt
contract. The projection SHALL identify
the claimed logical execution route, the assigned result/receipt coordinates, and the exact attempt identity.
It SHALL NOT add an `attempt_fence`, a second actor identity, or a cryptographic access-control boundary.

The Engine SHALL accept a candidate result and completion receipt only when their existing attempt identity
and published actor-execution discriminator agree with the claimed `actor_execution` contract. That binding
distinguishes the delegated actor that performs the attempt, a Phase Agent that controls the surrounding
queue loop, the global filesystem transaction lock holder, and the attempt-scoped result path. It SHALL NOT claim
to authenticate a physical actor or prove host/sub-agent liveness.

The actor route selected at claim is the only logical route permitted to author a candidate for that attempt.
The Phase Agent SHALL remain able to inspect, dry-submit, formally submit a valid returned candidate,
terminalize through an existing legal command, and create a successor through the audited supersession path,
but SHALL NOT substitute its own content into a delegated-subagent attempt's assigned result coordinate.
A late result from a terminal attempt or a submitted predecessor with an immutable supersession relation
SHALL not be accepted for a successor attempt.

An attempt-binding failure SHALL fail closed before submit and return a structured ownership root, one
owner-safe next action, and the same dry-submit or inspect checkpoint. Logical ownership feedback is
guidance for the current Agent Flow; it is not evidence of who physically wrote a file.

#### Scenario: delegated actor owns a claimed result coordinate

- **WHEN** a delegated-subagent work unit is claimed with its existing `work_id`, `receipt_nonce`, and
  `actor_execution` binding
- **THEN** its task and result starter SHALL identify the delegated actor route and the exact attempt-bound
  result/receipt coordinates
- **AND** Phase Agent guidance SHALL direct the controller to wait, inspect, submit a returned candidate,
  or use an existing terminal path rather than authoring a replacement result in that coordinate

#### Scenario: Phase Agent fallback owns only its own claimed attempt

- **WHEN** a work unit is claimed through the accepted `phase_agent_fallback` branch
- **THEN** its attempt ownership projection SHALL identify that existing `actor_execution` route
- **AND** the Phase Agent MAY author the candidate only for that exact fallback attempt
- **AND** it SHALL not gain a write authority for a separately claimed delegated-subagent attempt

#### Scenario: late candidate cannot cross an attempt boundary

- **WHEN** a prior attempt is terminal or has an immutable supersession relation and a fresh successor is
  later claimed
- **THEN** a result or receipt carrying the prior `work_id`, `receipt_nonce`, or incompatible
  actor-execution binding SHALL be rejected for the successor before ledger or queue mutation
- **AND** feedback SHALL identify the stale attempt binding rather than suggesting a ledger, index, or queue
  edit


### Requirement: Affected delegated work SHALL receive current intent through the existing task brief

> req: DEW-026

Before claim, the Phase Agent that creates an intent-affected delegated demand
SHALL author the existing queue-owned `task_brief` with a bounded task-local
objective and the read-only coordinates needed to derive it. The brief SHALL
name relevant canonical seed coordinates; the User Research Controls coordinate
when controls are present; for a current rerun, the newest complete matching
Decisions revision coordinate and the assigned Topic's matching direction
coordinate; and a rule that stale, future, invalid, or legacy-unbound direction
does not become a current instruction.

The Engine SHALL carry that already-authored task brief unchanged through the
existing queue snapshot, manifest, generated task, and actor prompt path. The
brief SHALL use the work unit's existing beacon-rooted bundle coordinate and
SHALL NOT copy full user wording into every task. It SHALL NOT add machine
fields, result obligations, receipt authority, queue actions, permission, or a
second intent source. When none of these sources materially affects the demand,
the existing task-brief behavior remains unchanged.

#### Scenario: Rerun delegated task can locate current intent

- **WHEN** a current-round Wave1 or Wave2 delegated demand is affected by an accepted rerun amendment
- **THEN** its rendered task SHALL carry the Phase-authored seed, baseline, current revision, matching direction, and bounded-objective instructions unchanged
- **AND** the actor SHALL not need chat history or a copied transcript to identify the assignment

#### Scenario: Stale direction is explicitly non-current

- **WHEN** a bundle retains an older direction next to the assigned Topic's matching current direction
- **THEN** the task brief SHALL tell the actor to use only the matching current direction
- **AND** the older direction SHALL remain historical context rather than another assignment

#### Scenario: Task brief does not widen work-unit authority

- **WHEN** an intent-aware task brief is rendered into a claimed work unit
- **THEN** manifest, result, receipt, submit, ledger, and queue authority SHALL remain governed by their existing schemas and transactions
- **AND** user prose SHALL NOT authorize an output, lifecycle transition, or Gate pass



### Requirement: Generated source-claim authoring guidance SHALL state exact cache/degraded-ref and source_ref value domains with an accepted-and-degraded example

> req: DEW-030

When a work-unit assignment's output contract declares `source_claims.allowed === true`, the Engine-generated
`task.md` Completion Contract authoring guidance SHALL state, for the actor, the exact legal value domains
of the result's source-claim fields:

- `cache_trail_refs[]` entries and `degraded_capture_ref` SHALL be described as requiring cache **leaf
  directory** paths drawn from the result's declared `cache_trails[]` set (the leaf directories that carry
  `websearch.json`/`page.md`/`meta.json`). Guidance SHALL explicitly forbid file paths inside a leaf such as
  `<leaf>/page.md`.
- `source_ref` SHALL be described as requiring either a current assigned output path from the assignment's
  `output_files` (an exact bundle-relative path declared in the result) or an authorized prior submitted
  output path exposed by claim-time source lineage. Guidance SHALL explicitly forbid leaf slugs or other
  free-form identifiers.
- claim `url` SHALL be described as requiring the URL recorded by the referenced cache leaf `meta.json`
  mapping (leaf is authoritative for the fetch), so claim url and leaf mapping stay consistent.

The guidance SHALL include one compact positive example containing exactly two accepted source claims — one
backed by a cache leaf directory through `cache_trail_refs`, one backed by an explicit degraded capture
through `degraded_capture_ref` — with `source_ref` values drawn from assigned output paths, so the actor sees
both legal outlet shapes before authoring. Cache/degraded refs in the example SHALL be leaf-directory-shaped
paths consistent with the assignment's cache policy root, and the guidance SHALL state that each such ref
must be declared in the result's `cache_trails[]` at submit (the actor authors those declarations; claim-time
envelope guidance cannot know them in advance). The example SHALL be derived from the assignment's own
declared cache policy and output paths, not from unrelated static prose.

#### Scenario: generated task names leaf-directory refs for a source-claims assignment

- **WHEN** a `wave1_topic_deepening` assignment whose output contract allows `source_claims` is claimed
- **THEN** its generated `task.md` SHALL state that `cache_trail_refs[]`/`degraded_capture_ref` require
  declared cache leaf directory paths
- **AND** it SHALL state that `<leaf>/page.md` file paths are not valid refs
- **AND** it SHALL name the assignment's cache policy root (e.g. `_cache/`) and at least one assigned output
  path inside the value-domain statement or the positive example

#### Scenario: generated task forbids slug source_ref

- **WHEN** a source-claims assignment's generated task guidance describes `source_ref`
- **THEN** it SHALL state the legal values are current assigned output paths or authorized prior submitted
  output paths
- **AND** it SHALL forbid leaf slugs and other free-form identifiers

#### Scenario: positive example shows both accepted and degraded outlets

- **WHEN** a source-claims assignment's generated task includes the accepted-and-degraded example
- **THEN** exactly one example claim SHALL use `cache_trail_refs` holding a cache leaf directory path
- **AND** exactly one example claim SHALL use `degraded_capture_ref` holding a cache leaf directory path
  recorded as the degraded capture
- **AND** the guidance SHALL state that each example cache/degraded ref must be declared in the result's
  `cache_trails[]` at submit
- **AND** each example `source_ref` SHALL equal an assigned output path exposed to the assignment

