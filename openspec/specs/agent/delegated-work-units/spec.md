# Delegated Work Units

> req: DEW-001, DEW-002, DEW-003, DEW-004, DEW-005, DEW-006, DEW-007, DEW-008, DEW-009, DEW-010, DEW-011, DEW-012, DEW-013, DEW-014, DEW-015, DEW-016, DEW-017, DEW-018, DEW-019, DEW-020, DEW-021, DEW-022, DEW-023, DEW-024, DEW-025, DEW-026

> delta-synced: strengthen-user-intent-carry-through (DEW-026)

> delta-synced: add-audited-late-accept-for-timed-out-work-units (DEW-005, DEW-006, DEW-011, DEW-015)
> delta-synced: make-delegated-work-contracts-constructible (DEW-021)
> delta-synced: make-work-unit-attempt-recovery-explicit (DEW-022, DEW-023, DEW-024)
> delta-synced: materialize-wave0-submitted-references-and-batch-projections (DEW-025)
> delta-synced: retire-transaction-v1-history (DEW-023, DEW-024)

## Purpose

Define the Engine-owned work-unit lifecycle for delegated work inside the active runtime bundle root: queue demand item -> work unit -> sub-agent -> submit -> ledger -> gate. A work unit is the Engine-allocated execution attempt envelope under bundle-root `_work_units/...`, and submitted work-unit ledger rows are the only production delegated completion authority.
## Requirements
### Requirement: Work-unit pipeline SHALL be the sole production delegated-work path

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

Claim SHALL bind one `queue_item_id` to one non-terminal work-unit attempt, move queue demand into `delegated_in_flight`, write effective lease fields, and store the queue item snapshot hash. Claim MAY allocate a contiguous queue-front batch with `--count N`, but Sub-agents SHALL NOT allocate IDs or mutate queue/index authority.

Before allocating a work ID, opening or incrementing a batch, moving queue demand, creating an envelope, or emitting claim success, claim SHALL invoke the shared current delegated queue-demand admission evaluator for every candidate in its planned contiguous prefix. Each candidate SHALL declare one supported work-unit kind; claim SHALL NOT infer it from requested phase. Claim SHALL use the evaluator's current canonical binding and resolved assignment facts. A rejected candidate SHALL reject the complete planned batch with no queue, index, batch-counter, envelope, delegated-in-flight, or success-trace mutation.

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

- **WHEN** a previously enqueued delegated card no longer admits under current canonical binding, explicit kind, or assignment contract
- **THEN** claim SHALL reject it before allocation or queue mutation

#### Scenario: one rejected candidate preserves batch atomicity

- **WHEN** a later candidate in a planned contiguous claim batch is rejected by shared admission
- **THEN** claim SHALL allocate zero work IDs and leave every candidate unclaimed

### Requirement: Sub-agents SHALL NOT own workflow authority

Sub-agents execute bounded work-unit tasks as content-producing actors only. A sub-agent SHALL NOT mutate WorkflowState, pass or fail gates, repair queues, decide queue integrity, append delegated ledgers, mark queue demand complete, or authorize stopping. Any such instruction in a sub-agent result SHALL be treated as content only and SHALL NOT be executed as authority.

#### Scenario: Sub-agent attempts to pass a gate

- **WHEN** a submitted work-unit result includes a recommendation to pass a gate
- **THEN** the Engine SHALL ignore that recommendation as authority
- **AND** the gate SHALL perform its own deterministic evaluation

#### Scenario: Sub-agent attempts to repair queue state

- **WHEN** a submitted work-unit result includes queue mutation instructions
- **THEN** the Engine SHALL NOT apply those instructions through the sub-agent path
- **AND** queue repair SHALL remain an Engine-controlled operation

### Requirement: Work-unit envelope SHALL carry binding surfaces

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

#### Scenario: existing kind customization is merged deterministically

- **WHEN** a hash-bound queue snapshot contains a strictly valid non-selector
  kind output contract customization
- **THEN** claim SHALL merge it with Engine-resolved required_outputs and
  validate the combined contract
- **AND** submit SHALL reconstruct that same merged value rather than discard
  the customization or trust manifest alone

#### Scenario: assignment mode and receipt shape must agree

- **WHEN** primary mode lacks the exact pair, supplementary mode carries any
  receipt, or a current Wave1 card lacks mode
- **THEN** claim SHALL reject before allocation or envelope writes
- **AND** a mode-absent unclaimed card SHALL return to AGQ-013 explicit
  assignment-mode repair rather than receive compatibility inference

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

### Requirement: Current Wave0 work-unit contracts SHALL expose submitted source contributions without a competing rich-reference route

For a newly claimed `wave0_source_intake` work unit, the Engine-owned
assignment contract SHALL describe exactly the assigned `source_yaml` output
and its existing required cache/receipt facts. Its generated task, spawn
projection, result-schema guidance, and current output declarations SHALL
describe that result as a submitted Wave0 source contribution after formal
submit. They SHALL NOT advertise, require, or accept a rich
`reference/00-shared-*.md` output as a second delegated completion or
shared-reference-floor route.

Formal submit remains the only transaction that creates a submitted ledger row.
A claimed, dry-submitted, filesystem-only, or chat-returned source artifact
SHALL NOT unlock a Phase-owned reference projection. Queue payload, actor
prose, and a reference filename SHALL NOT enlarge the current assignment
contract.

A rich-reference output attached to an old or markerless Wave0 attempt SHALL
return `unsupported_current_contract` before its recorded output contract,
reference role, submitted row, or historical guidance is interpreted. The
Engine SHALL NOT rewrite historical bytes, but SHALL NOT treat them as current
or historical submitted-reference authority, nor use them for a count or a
Phase-owned reference backing conclusion.

#### Scenario: new Wave0 attempt has one source contribution contract

- **WHEN** the Engine claims a new `wave0_source_intake` work unit
- **THEN** its required output contract SHALL contain the exact assigned
  `source_yaml` tuple and existing cache/receipt obligations
- **AND** its actor-facing task and result guidance SHALL not present a
  `reference` output as an assigned completion or floor-repair route

#### Scenario: current submit does not promote an extra reference output

- **WHEN** a complete current Wave0 candidate declares a
  `reference/00-shared-*.md` output that was not assigned by its bound contract
- **THEN** submit validation SHALL reject or ignore that declaration according
  to the existing strict output-contract boundary
- **AND** the file SHALL not become delegated evidence authority or
  shared-reference coverage

#### Scenario: Legacy submitted reference has no current authority

> The historical scenario name is retained only as the OpenSpec delta-sync key.
> The behavior below now rejects that row as current authority.

- **WHEN** an already submitted Wave0 row declares a rich-reference output
  under a v1/v2 or markerless attempt profile
- **THEN** every current reader SHALL return `unsupported_current_contract`
  before interpreting that output or row as a reference authority
- **AND** current claims SHALL not be retroactively changed or required to
  reproduce that output

#### Scenario: Markerless input is rejected before current defaults

- **WHEN** a Wave0 envelope lacks an assignment-contract marker
- **THEN** its reader SHALL return `unsupported_current_contract` before a
  current default, path, filename, or reference role is considered
- **AND** it SHALL not infer a missing v1 or v2 marker or preserve a
  compatibility interpretation

### Requirement: Submit SHALL be the only successful delegated completion transition

Normal `submit` and the existing audited `late-submit` remain the only
operations that convert a complete current attempt into successful completion,
complete queue demand, and create submitted coverage. `recover-declaration`
remains a non-completion operation for an already submitted complete current
attempt: it accepts no new result, allocates no work, changes no queue outcome,
and restores a missing declaration only when its existing durable current facts
prove the exact recorded row.

Before a positive submit, duplicate replay, late-submit, or declaration
recovery path reads candidate output or computes reconstruction facts, its
attempt SHALL pass the current-profile boundary. A rejected legacy attempt
SHALL not append a ledger row, complete queue demand, recover a declaration,
become a current source contribution, or obtain a replacement/supersession
decision. The rejection is an Engine-owned missing-contract boundary, not a
legal instruction to hand-edit, upgrade, or rebuild the old attempt.

For a complete current attempt, the submit owner SHALL preserve the existing
fresh direct-output evaluation, hash-bound queue snapshot, exact
manifest/beacon output-contract reconstruction, nonce/actor result and receipt
binding, transaction rollback, current Wave0 source contribution, and durable
queue postconditions. Current normal and audited late submit SHALL keep their
existing idempotence and fail-closed behavior.

#### Scenario: Markerless hash mirrors do not submit

- **WHEN** a claimed or submitted attempt lacks
  `work-unit.submission.v1` and presents matching legacy result/ledger hashes
- **THEN** submit, replay, recovery and late-submit SHALL return
  `unsupported_current_contract` before a legacy acceptance tuple is evaluated
- **AND** no ledger, queue, status, result, receipt, trace-success, or
  transaction authority mutation SHALL occur

#### Scenario: Current submission remains ledger-first

- **WHEN** a complete current attempt passes normal submit or eligible
  late-submit
- **THEN** its accepted ledger row and immutable accepted ledger fingerprint
  SHALL remain the only current acceptance representation
- **AND** index/status hash mirrors SHALL not be introduced as an alternate
  current representation

#### Scenario: Current declaration recovery remains available

- **WHEN** a complete current submitted attempt has a missing declaration row
  and its existing exact recovery prerequisites hold
- **THEN** `recover-declaration` SHALL retain its existing legal recovery path
- **AND** a rejected historical attempt SHALL not be offered as a parallel
  recovery or repair candidate

#### Scenario: Declaration recovery is not delegated completion

- **WHEN** `recover-declaration` restores a row for an already-submitted work ID
- **THEN** the original submitted attempt and terminal queue history SHALL remain unchanged
- **AND** the recovery SHALL not count as a new submit, actor execution, queue completion, or work-unit success path

#### Scenario: Unsubmitted attempt cannot use declaration recovery

- **WHEN** a claimed, timed-out, failed, abandoned, or unknown work ID has no submitted declaration row
- **THEN** `recover-declaration` SHALL reject before ledger mutation
- **AND** `write_to` SHALL name the existing legal submit/late-submit/new-attempt boundary rather than a declaration file

#### Scenario: successful submit completes one queue demand

- **WHEN** a valid result is submitted for a claimed work unit
- **THEN** the Engine SHALL complete the bound `queue_item_id`
- **AND** append exactly one work-unit ledger row for that `work_id`

#### Scenario: Wave0 submit records a contribution boundary

- **WHEN** first submit accepts a schema-valid Wave0 `source.yaml` array with
  nineteen ordered entries
- **THEN** its submitted declaration SHALL record the exact target, contract ID,
  length `19`, and the semantic digest of those nineteen entries
- **AND** neither the Agent nor its result JSON SHALL provide, choose, or alter
  that declaration

#### Scenario: Later append cannot rewrite prior contribution

- **WHEN** a later legal Wave0 submit sees the same target extended from
  nineteen to twenty entries
- **THEN** its declaration SHALL bind the twenty-entry prefix from that later
  acceptance
- **AND** the earlier nineteen-entry declaration SHALL remain hash-bound
  historical data rather than being rewritten or re-evaluated from the new file

#### Scenario: normal submit still rejects timed-out attempts

- **WHEN** a work unit is `timed_out`
- **AND** a caller invokes normal `operate-work-unit submit`
- **THEN** submit SHALL reject
- **AND** no queue completion or ledger append SHALL occur

#### Scenario: normal first submit rereads after dry-submit

- **WHEN** dry-submit passes and an assigned required output changes before normal formal submit
- **THEN** formal submit SHALL acquire a fresh snapshot and decide acceptance from that snapshot
- **AND** the earlier dry-submit PASS SHALL not authorize queue completion or ledger append

#### Scenario: current contract drift blocks first acceptance

- **WHEN** the index marker, manifest contract, beacon contract, or hash-bound queue snapshot cannot reconstruct one identical expected contract
- **THEN** normal submit SHALL reject before success mutation
- **AND** it SHALL not fall back to the legacy role normalizer or actor-declared contract data

#### Scenario: duplicate normal submit does not depend on live artifact bytes

- **WHEN** a normally submitted Wave0 work unit receives a same-result duplicate
  submit after its source file has changed
- **THEN** duplicate handling SHALL decide idempotency from recorded result and
  ledger bindings plus durable postconditions
- **AND** it SHALL retain the original `source_contribution` rather than
  evaluate current bytes as a new accepted contribution
- **AND** current artifact content SHALL remain the Wave inspect/Gate
  responsibility

#### Scenario: declaration recovery does not reaccept candidate content

- **WHEN** recover-declaration restores an exact-reconstructable complete-current
  row for an already-submitted work ID
- **THEN** it SHALL reconstruct the original hash-identical row without
  rereading live required-output content for a new verdict
- **AND** recovery SHALL not advertise a new direct-contract acceptance time or
  contribution boundary

#### Scenario: direct evaluation does not create artifact hash authority

- **WHEN** first submit accepts a required-output snapshot
- **THEN** the verdict SHALL state only that the evaluated snapshot passed at
  that invocation
- **AND** no ledger or index field other than the narrow `source_contribution`
  declaration SHALL imply that later bytes are hash-bound by this change

#### Scenario: Missing contribution witness fails closed

- **WHEN** a current Wave0 first submit recorded a hash-bound
  `source_contribution`, its declaration row is later absent, and current
  `source.yaml` has changed
- **THEN** recover-declaration SHALL return one `missing_contract` / no-legal-
  recovery boundary before ledger mutation
- **AND** it SHALL not derive a replacement contribution from current source
  bytes, result data, index/status hash values, queue history, trace, or
  transaction metadata

#### Scenario: Non-Wave0 outputs do not gain general artifact immutability

- **WHEN** first submit accepts a required output other than
  `wave0.source-metadata-array.v1`
- **THEN** no `source_contribution` declaration SHALL be created
- **AND** the ledger SHALL not imply a global immutable-content or
  artifact-versioning contract

### Requirement: Invalid submit SHALL remain non-terminal

Invalid submit SHALL leave the attempt `claimed`, record `last_submit_rejection`, emit diagnostics, and write no ledger row. Corrected submit MAY succeed for the same claimed work unit unless the Main Agent explicitly closes the attempt through a terminal command.

#### Scenario: corrected submit can reuse claimed attempt

- **WHEN** submit rejects a result because a declared output is missing
- **AND** the result bundle is corrected for the same claimed `work_id`
- **THEN** a later submit MAY succeed for that work unit

### Requirement: Terminal attempt transitions SHALL fail closed

`fail`, `timeout`, and `abandon` SHALL close the current work-unit attempt without queue completion or ledger coverage. Retry or replacement SHALL allocate a new `work_id` only through the existing role-bound `claim` operation.

Explicit audited `late-submit` MAY recover only a command-targeted `timed_out` attempt. It SHALL NOT recover `failed` or `abandoned` attempts.

The work-unit CLI SHALL provide:

```bash
node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs replace <bundle> --work-id <failed_or_abandoned_id>
```

`replace` SHALL create at most one ordinary replacement queue demand from one terminal parent attempt. It SHALL accept only a `failed` or `abandoned` index record with one matching queue `terminal_history` row and an exact matching immutable queue-item snapshot across the record, manifest, and terminal row. It SHALL derive a fresh queue-demand identity from the parent `work_id`, preserve the recorded assignment facts, and add only auditable parent-attempt lineage plus ordinary queue timestamps/status. It SHALL admit that demand through the existing queue admission path.

`replace` SHALL allocate no work ID, envelope, receipt, result, cache trail, source claim, ledger row, Gate result, or queue completion. Its successful result SHALL name the replacement `queue_item_id`, its queue location, and the parent terminal fact. For a newly created or queued idempotent successor, it SHALL name the existing role-bound `claim` checkpoint; a current actor observation remains required before claim can allocate a fresh work ID. For an idempotent successor already in `delegated_in_flight`, it SHALL disclose only that already-allocated successor `work_id` and direct the Phase to reconstruct and poll it rather than claim again. It SHALL append exactly one `work_unit_replacement_created` trace event when it creates a demand; idempotent and no-path results SHALL append no replacement-created event.

`replace` on a `timed_out` attempt SHALL refuse and identify the existing timed-out retry path. It SHALL refuse submitted or claimed attempts, missing/mismatched terminal snapshot authority, an existing successor with conflicting lineage/snapshot, or an already terminal successor, without mutation. A repeated call while the exact derived successor is queued or delegated in flight SHALL return that same successor idempotently; it SHALL NOT create a sibling demand. A child that terminalized is itself the only legal parent for a further replacement.

#### Scenario: timeout retry allocates replacement ID

- **WHEN** a claimed work unit is timed out and the queue demand remains valid
- **THEN** the Engine SHALL close the timed-out attempt
- **AND** a later retry SHALL use a different `work_id`

#### Scenario: failed and abandoned are not recoverable

- **WHEN** a work unit is `failed` or `abandoned`
- **AND** a caller invokes `operate-work-unit late-submit`
- **THEN** the command SHALL reject
- **AND** no retry cleanup, queue completion, or ledger append SHALL occur

#### Scenario: terminal attempt derives one replacement demand

- **WHEN** a failed or abandoned work unit has matching terminal record, manifest, and terminal-history snapshot authority
- **AND** no successor has been derived from that parent work ID
- **THEN** `operate-work-unit replace` SHALL enqueue one fresh lineage-bound queue demand
- **AND** it SHALL return that demand's `queue_item_id` and the existing role-bound claim action without allocating a work ID

#### Scenario: timed-out attempt keeps its existing retry path

- **WHEN** a caller invokes `operate-work-unit replace` for a timed-out work unit
- **THEN** the command SHALL reject without queue or index mutation
- **AND** its feedback SHALL identify the existing timed-out retry-demand path rather than reclassifying the attempt

#### Scenario: queued replacement is idempotent at the normal claim boundary

- **WHEN** the exact replacement demand for a terminal parent is already queued
- **THEN** another `replace` call SHALL return that same queue-item identity without creating another demand
- **AND** it SHALL return the ordinary role-bound claim checkpoint without allocating a work ID

#### Scenario: in-flight replacement is idempotent at the existing work boundary

- **WHEN** the exact replacement demand for a terminal parent is already delegated in flight
- **THEN** another `replace` call SHALL return that same queue-item identity and its already-allocated work ID without creating another demand
- **AND** it SHALL direct the Phase to reconstruct and poll that work rather than claim again

#### Scenario: terminal successor does not reopen its earlier parent

- **WHEN** the exact replacement demand for a terminal parent has terminal history
- **THEN** another `replace` call SHALL refuse without queue or index mutation
- **AND** the earlier parent SHALL not create another successor

### Requirement: Audited late-submit SHALL recover eligible timed-out work units

The existing audited late-submit operation SHALL remain available only to a
complete current timed-out attempt that satisfies its existing nonce, queue,
receipt, direct-output, transaction, and replacement-lineage prerequisites.
It SHALL retain the current reason requirement, one-time acceptance semantics,
rollback behavior, and protection against an already submitted replacement.

A timed-out attempt with explicit assignment v1/v2, markerless submission
representation, absent actor provenance, or another incomplete current profile
SHALL return `unsupported_current_contract` before late-submit reconstructs
output obligations, legacy timestamps/context, hash mirrors, or supersession
facts. It SHALL not become current by current-default inference.

#### Scenario: Complete current timed-out attempt may late-submit

- **WHEN** a complete current timed-out attempt satisfies the existing audited
  late-submit prerequisites
- **THEN** the Engine SHALL retain the existing eligible late acceptance path
- **AND** it SHALL preserve the normal current ledger-first and queue cleanup
  postconditions

#### Scenario: Historical timed-out attempt cannot enter late-submit

- **WHEN** a timed-out attempt lacks any required current discriminator
- **THEN** late-submit SHALL return `unsupported_current_contract` before
  evaluating historical recovery evidence
- **AND** it SHALL not repair or mutate the historical attempt into a current
  shape

#### Scenario: eligible timed-out targeted work unit is accepted

- **WHEN** a work unit is `timed_out`
- **AND** the candidate result validates against the targeted identity and submit surfaces
- **AND** no submitted replacement exists for the same `queue_item_id`
- **THEN** `late-submit` SHALL mark the targeted work unit `submitted`
- **AND** append one audited submitted ledger row for the targeted work unit
- **AND** complete the queue item through durable queue postconditions

#### Scenario: submitted replacement blocks late-submit

- **WHEN** a different work unit for the same `queue_item_id` is already submitted or has a submitted ledger row
- **THEN** `late-submit` SHALL reject
- **AND** no second submitted row SHALL be created for that queue item

#### Scenario: retry is cleaned up by late-submit

- **WHEN** an eligible timed-out targeted work unit has retry demand still queued or claimed
- **AND** no retry/replacement has submitted
- **THEN** accepted `late-submit` SHALL remove queued retry demand or abandon the claimed retry
- **AND** the queue SHALL contain one completed terminal-history row for the targeted work unit

#### Scenario: repeated audited late-submit is idempotent

- **WHEN** the targeted work unit was already accepted through `late-submit`
- **AND** the candidate result hash matches the existing audited submitted row
- **AND** durable late-submit postconditions still hold
- **THEN** the command MAY return idempotent success
- **AND** it SHALL NOT append another ledger row or queue terminal-history row

#### Scenario: normal submitted work rejects explicit late-submit

- **WHEN** a work unit is already `submitted` through normal submit
- **AND** a caller invokes `late-submit`
- **THEN** the command SHALL reject
- **AND** normal submit duplicate handling SHALL remain the only idempotent path for normal submitted work

#### Scenario: first late-submit reads a fresh direct-output snapshot

- **WHEN** a current-version timed-out attempt is otherwise eligible for audited late acceptance
- **THEN** late-submit SHALL rebuild its expected contract and evaluate fresh required-output snapshots before authority mutation
- **AND** an earlier dry-submit or timeout-preflight PASS SHALL not be reused

#### Scenario: Pre-contract timed-out attempt is rejected

> The historical scenario name is retained only as the OpenSpec delta-sync key.
> The behavior below now rejects the old attempt before timeout or submit work.

- **WHEN** a timed-out attempt was claimed before assignment_contract_version
  existed and all other historical late-submit facts appear valid
- **THEN** first late-submit SHALL return `unsupported_current_contract` before
  evaluating those facts
- **AND** it SHALL not infer, migrate, or mutate a current contract from
  framework version, bundle metadata, or path shape

#### Scenario: repeated late-submit does not reread current output content

- **WHEN** an audited late-submit is replayed after its original successful acceptance
- **THEN** replay SHALL validate recorded result/ledger hashes and durable late-accept postconditions
- **AND** current required-output bytes SHALL not retroactively change historical acceptance

### Requirement: Gates SHALL read submitted work-unit ledger coverage

Delegated gate coverage SHALL come only from Engine-written work-unit rows in bundle-root `rb_output_declarations.jsonl`. Bundle-root `_work_units/_index.json`, manifest, result, receipt, beacon, cache, and output files SHALL be cross-check surfaces, not independent pass coverage.

Current specs, docs, tests, and playbooks SHALL NOT present retired delegated files, old result references, retired commit/merge events, or old delegated queue completion as alternate gate coverage.

#### Scenario: filesystem-only delegated output cannot pass

- **WHEN** a delegated output file exists without submitted work-unit ledger coverage
- **THEN** the gate SHALL fail delegated coverage
- **AND** the file MAY be reported as cleanup or bypass diagnostic evidence only

#### Scenario: old delegated surface is rejected or removed

- **WHEN** a current diagnostic names a retired delegated artifact outside `openspec/changes/archive/`
- **THEN** the diagnostic SHALL frame it as rejected, removed, deprecated, or non-authoritative evidence
- **AND** it SHALL NOT describe that artifact as a production success path

### Requirement: Work-unit tasks SHALL expose bundle-root absolute paths and write-before-return verification

Generated work-unit task Markdown and any Agent-facing claim/spawn output SHALL include the current run bundle root normalized by the Engine as one canonical absolute `bundle_dir`, the exact work-unit identity fields, bundle-relative canonical refs, and absolute paths for files the sub-agent must read or write. The immutable Engine-owned `_beacon.json`, generated task, spawn/claim output, and generated work-unit CLI examples SHALL agree on that same absolute root. `bundle_dir` SHALL NOT be repo-relative, current-working-directory-relative, or only the bundle basename.

The task SHALL instruct the actor to use supplied absolute paths directly and to resolve each bundle-relative runtime ref under canonical `bundle_dir` exactly once. The actor SHALL NOT prefix a ref with the bundle basename before resolution, reinterpret an absolute path as bundle-relative, or treat a nested `<bundle>/<bundle>/...` path as a compatible runtime root. Every generated work-unit CLI command SHALL pass the canonical absolute root rather than depend on the actor's current working directory.

The beacon SHALL remain a read-only binding surface for the actor. The actor SHALL NOT overwrite, supplement, or manually repair it. Inspect, dry-submit, and formal submit SHALL reuse one beacon-binding evaluator that compares `bundle_dir` with the current Engine-resolved bundle root and compares the remaining beacon content with the index, manifest, and contract-derived expected binding. Relative `bundle_dir`, root mismatch, or other beacon drift SHALL fail closed before ledger, queue, assigned result, receipt, cache, trace, log, or transaction success writes.

Existing-authority reads SHALL validate their prerequisite before creating work-unit directories. A work-unit index load with `createIfMissing: false`, and inspect/dry-submit/submit or rejection handling built on that read, SHALL NOT create `_work_units`, `_work_units/_transactions`, a lock, trace, log, or other runtime surface when the resolved bundle root has no existing work-unit authority. Explicit create/claim paths MAY initialize work-unit directories only after the current run bundle root itself has been validated.

The required verification SHALL cover declared `writes_to` outputs, `result.json`, `runtime-receipt.jsonl`, cache leaf files required by the work-unit cache policy, unchanged beacon binding, and absence of a same-name nested bundle root created by the actor. A sub-agent that cannot write or verify the files SHALL report work-unit failure rather than returning only research text.

For a current-version work unit, index, manifest and beacon SHALL carry top-level assignment_contract_version. Generated task, spawn prompt and checklist SHALL display that marker plus every resolved required output's exact absolute and bundle-relative path, canonical role, and closed direct_contract identity. Generated result schema SHALL constrain required output declarations and MAY describe the marker as read-only annotation, but SHALL NOT add assignment_contract_version or direct_contract as actor-fillable result fields.

For a current actor-bound production claim, the Engine SHALL derive one canonical role-guidance ref from the existing registered kind's closed delegated_role_key. It SHALL pass the existing claim-resolved kind and actor policy into the projection and require that policy's delegated role key to match, rather than reconstructing a second kind lookup from queue payload. It SHALL parse that canonical role's direct requires[] exactly one level, resolve each direct shared dependency as a contained regular shipped file, and project only dependencies whose own frontmatter declares actor_delivery: required; exactly one SHALL be the canonical page-fetch node with its closed id/scope identity. Role requires[] SHALL remain the dependency fact and shared-node frontmatter SHALL remain the delivery classification/identity fact rather than a role-to-shared allowlist in the projection helper. These refs SHALL be ephemeral task/spawn projections: they SHALL NOT be supplied by queue payload, Phase Agent or actor, persisted in index/manifest/beacon/result, discovered by directory scan or recursive loading, or added to the workflow manifest's always-loaded shared set. Generated task/spawn SHALL expose the same repo-relative refs plus resolved absolute read paths and require the actor to read them before search, fetch or output authoring.

For each non-empty required_outputs[] entry, generated task and spawn guidance SHALL display a bounded minimum authoring projection obtained from the same direct-output contract definition that dispatches fresh-byte evaluation. The projection SHALL name required structural or semantic content without returning raw validator code, regexes or an actor-fillable selector. Formal production claim SHALL preserve the existing actor-decision order: queue/assignment/actor-policy preview and actor decision occur first; a no-claim/invalid decision SHALL return through its existing repair without requiring delivery assets. Only an allow_claim decision SHALL resolve role/shared refs and every required descriptor during read-only delivery preflight before entering the write transaction, removing queue demand, allocating a work ID or publishing an envelope. Unknown role, missing/escaping guidance, invalid actor-delivery classification, unknown contract identity or missing projection SHALL therefore leave queue, index and envelope unchanged; kind/role mismatch remains the existing actor-decision root. The internal/test envelope constructor SHALL require the same complete current profile and reject an absent actor binding as `unsupported_current_contract` before publishing an envelope or fabricating a role. This preflight guarantee SHALL NOT be described as generic filesystem rollback for an I/O failure after mutation begins. All projections SHALL be generated from the validated assignment/manifest contract and SHALL not maintain a second artifact-field or heading inventory; shared evaluator remains verdict authority and existing role guidance remains the rich Agent-facing explanation.

The generated task SHALL require the actor to write and verify every assigned required output before returning work_done. The Phase Agent SHALL run the predictive dry-submit after the actor returns and before formal submit. It MAY repair only a mechanical parseable-candidate declaration: an absent/defaultable identity/schema field with one unambiguous value from the verified envelope, or an omitted/misdeclared required path/role when the exact assigned target passes its direct contract. It SHALL NOT overwrite a conflicting supplied identity or edit artifact, receipt, source or cache facts under that scope. A missing/unparseable candidate, missing target, YAML parse/top-level/schema failure, missing receipt/source/cache/finding/question/enum/semantic fact, or any repair requiring actor-owned fact changes SHALL be semantic_content. Before work_done, the selected actor owns semantic repair. After work_done, the Phase Agent SHALL run `operate-work-unit fail` with normalized reason `semantic_contract:<primary_root_code>` using the Engine-derived field, explicitly enqueue replacement demand under a fresh queue ID preserving the same canonical Topic and assignment_mode/receipt obligation, and obtain a replacement work ID for real actor execution. The reason SHALL NOT use `actor_spawn_unavailable:` or another accepted automatic-retry trigger. The Phase Agent SHALL NOT weaken a failed primary pair into supplementary mode or offer abandon as a competing normal semantic-replacement route.

Generated guidance SHALL distinguish a current supplementary attempt with no required_outputs from a primary paired assignment. It SHALL expose contract-authorized prior submitted paths without instructing the actor to overwrite them. The user SHALL not be asked to run ordinary search/fetch, dry-submit, fail/replacement, claim, or submit commands already permitted to the Agent.

Canonical role/shared guidance SHALL describe capabilities and rich authoring behavior but SHALL not expand the current assignment. Generated kind-specific guidance and role execution steps SHALL condition paired-output instructions on current required_outputs[]: a primary Wave1 pair SHALL write and verify both assigned targets; a supplementary empty-required-output attempt SHALL not recreate or redeclare prior evidence-summary/question-list files and SHALL write only current contract-authorized output/cache/source/result/receipt facts.

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

#### Scenario: Claimed task contains absolute runtime paths

- **WHEN** `operate-work-unit claim` creates a work unit for current run bundle `/repo/dpt_rb_aidlc-investigation`
- **THEN** the generated task SHALL include `bundle_dir: /repo/dpt_rb_aidlc-investigation`
- **AND** it SHALL include absolute paths for `_beacon.json`, `result.json`, `runtime-receipt.jsonl`, declared output files, and required cache leaf directories
- **AND** bundle-relative paths SHALL remain clearly labeled as refs relative to `bundle_dir`

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

#### Scenario: no-claim actor decision does not require delivery assets

- **WHEN** the existing actor decision returns no-claim or invalid, including kind/role mismatch, before allocation
- **THEN** claim SHALL return its existing actor-policy repair without reading role/shared delivery files or direct actor descriptors
- **AND** missing delivery assets SHALL not replace the nearer actor decision root for an attempt that was never authorized

#### Scenario: Incomplete actor profile cannot construct an envelope

- **WHEN** an attempted envelope lacks the current actor-v1 contract or its legal `actor_execution` binding
- **THEN** the Engine SHALL reject it as `unsupported_current_contract` before publishing manifest, beacon, task, result schema, or actor guidance
- **AND** it SHALL not infer, fabricate, or project a delegated role from a legacy envelope
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


### Requirement: Submitted result and ledger hashes SHALL detect post-submit drift before gate pass

Submitted result and ledger hashes SHALL remain fail-closed binding authority.
Normal and late submit SHALL create one Engine submission timestamp inside the
commit transaction, build the final ledger row/hash from it, and use it
consistently across ledger `declared_at`, index `terminal_at`, status
`updated_at`, and queue `completed_at`. Pre-transaction validation and
dry-submit SHALL return only side-effect-free candidate validation facts, SHALL
NOT produce a final ledger row/hash, SHALL NOT pass a precomputed declaration
hash into commit, and SHALL NOT write queue-load trace/log, normalized
result/receipt, canonical cache pages, transaction artifacts or authority
state. The final rejection recorder MAY retain its existing diagnostic trace/log
ownership. The locked transaction SHALL reload/revalidate mutable index, queue,
replacement and terminal facts, then apply canonicalization writes before final
row construction. Normal rows SHALL require no additional recovery state.
Late-submit SHALL preserve only irreducible late-accept context on the existing
index record: reason, prior terminal status, and superseded retry IDs. Gates
SHALL never count reconstructable index/result/queue facts directly. A recovery
evaluator SHALL rebuild from current canonical result hash, index/status,
manifest, beacon, runtime receipt, output/source/cache declarations, terminal
queue facts and bounded late-accept context before any append.

Before reconstruction, declaration recovery SHALL require the complete current
profile. An assignment v1/v2, markerless submission/hash-mirror, absent actor
binding, or profile drift SHALL return `unsupported_current_contract` before it
reads historical submit/transaction evidence, reconstructs a row, or mutates
the ledger. The rejection SHALL not offer a hand edit, migration, adapter, or
alternate recovery path.

#### Scenario: Reconstructable facts restore the same hash-valid row

- **WHEN** a complete-current already-submitted work unit loses only its bundle
  ledger row and retains all required direct reconstruction facts
- **THEN** Engine recovery SHALL restore the hash-identical row without changing
  result, receipt, output/cache, actor, queue, or original hashes
- **AND** the next gate SHALL consume it through the normal ledger path

#### Scenario: Historical attempt cannot use declaration reconstruction

- **WHEN** an already-submitted-looking attempt has an old assignment,
  markerless submission representation, absent actor binding, or profile drift
- **THEN** declaration recovery SHALL return `unsupported_current_contract`
  before row reconstruction or ledger mutation
- **AND** it SHALL not interpret legacy submit or transaction evidence as an
  acceptance authority

#### Scenario: Reconstruction cannot hide drift

- **WHEN** current result, receipt, beacon, output/cache, index/status, queue
  history, or late-accept context conflicts
- **THEN** recovery SHALL fail before ledger mutation
- **AND** primary feedback SHALL identify the earliest conflicting fact and one
  legal next checkpoint

#### Scenario: Post-submit result mutation fails gate coverage

- **WHEN** a work unit has a submitted ledger row with `result_hash`
- **AND** the current `result.json` content no longer matches the submitted
  `result_hash`
- **THEN** delegated gate coverage for that work unit SHALL fail
- **AND** diagnostics SHALL name the affected `work_id` and hash drift surface

#### Scenario: Ledger row remains the delegated authority

- **WHEN** a work-unit output file exists but the submitted ledger row is
  missing or fails binding cross-check
- **THEN** the output SHALL NOT count as delegated gate coverage
- **AND** diagnostics MAY report the file as cleanup, bypass, or drift evidence
  only

#### Scenario: Hash drift repair avoids hand-written ledger mutation

- **WHEN** a gate reports submitted result hash mismatch
- **THEN** advice SHALL direct repair through a valid work-unit retry,
  replacement submit, or explicit terminal/retry operation
- **AND** advice SHALL NOT tell the Agent to edit `rb_output_declarations.jsonl`
  by hand

### Requirement: Successful work-unit submit SHALL verify durable queue postconditions

Before normal or late submit reports success, its durable postcondition SHALL prove the submitted index/status binding, shared submission timestamp, terminal queue history, bundle ledger row, and any required late-accept context agree. These writes SHALL participate in the existing submit transaction and rollback/suspect-state handling. This adds no new completion authority: the bundle ledger remains the only delegated coverage source.

#### Scenario: Submit success includes durable reconstruction facts

- **WHEN** a work-unit submit reports success
- **THEN** the bundle ledger row, shared timestamp, direct owner facts, and any minimal late-accept context SHALL be durable and reproduce the submitted index/status hashes
- **AND** durable queue postconditions SHALL still bind the same `queue_item_id` and `work_id`

#### Scenario: Reconstruction-context persistence failure cannot overclaim success

- **WHEN** submit cannot persist or verify the shared timestamp or required late-accept context
- **THEN** it SHALL fail or roll back through the existing transaction durability contract
- **AND** it SHALL not report successful delegated completion with an unrecoverable declaration

#### Scenario: Submit proves in-flight binding was cleared

- **WHEN** `operate-work-unit submit` succeeds for work unit `wu-w0-b000-src-i0001`
- **THEN** reloaded `rb_queue.json.delegated_in_flight` SHALL NOT contain the submitted `queue_item_id`
- **AND** `rb_queue.json.terminal_history` SHALL contain a terminal record binding that `queue_item_id` to `wu-w0-b000-src-i0001`

#### Scenario: Submit fails if queue postcondition is missing

- **WHEN** submit cannot verify that the queue item left `delegated_in_flight`
- **THEN** the submit command SHALL return a structured failure
- **AND** diagnostics SHALL instruct the Agent to repair through Engine queue/work-unit tooling rather than editing `rb_queue.json` by hand

#### Scenario: Submit rollback failure is diagnosed

- **WHEN** submit detects a missing queue postcondition after partially writing work-unit or ledger state
- **AND** the prior durable state cannot be fully restored
- **THEN** submit SHALL return a structured failure that marks work-unit/queue state as suspect
- **AND** it SHALL NOT print a successful submit result

### Requirement: Work-unit submit SHALL canonicalize only bounded LLM-shaped submit drift before strict validation

`operate-work-unit submit` SHALL run a narrow canonicalization step before strict result, receipt, output, cache, nonce, queue, hash, and ledger validation. Canonicalization SHALL be limited to predictable LLM-shaped drift that can be safely tied back to the claimed work-unit record. It SHALL NOT create new authority, bypass work-unit identity, accept path escapes, or relax downstream ledger/gate coverage.

Allowed canonicalization is limited to:

- unwrapping a submitted JSON object whose only top-level key is `result`;
- filling missing receipt schema version with the current receipt-event schema literal, and filling missing receipt binding identity fields from the claimed work-unit record when the receipt event is otherwise valid JSON and has no conflicting identity values;
- materializing `page-content.md` as canonical `page.md` inside the same declared cache leaf when the canonical page file is missing, or accepting an identical non-authority sidecar when both files exist;
- replacing a stale result/receipt `receipt_nonce` with the Engine record nonce only when `work_id`, `queue_item_id`, and `kind` all match the claimed record and the submitted result path resolves inside that work unit's assigned directory.

Runtime receipt `detail` is optional diagnostic presentation, not identity or completion authority. The receipt schema SHALL accept either a keyed JSON object or a human-readable string at `detail` without creating a normalization event or rewriting one form into the other. Array, number, boolean, null, malformed JSONL, conflicting identity, and conflicting schema values SHALL remain invalid. Timeout-preflight, submit, inspect and Gate consumers SHALL NOT derive progress/coverage authority from the contents or shape of `detail`.

Accepted submit transactions SHALL persist canonical authority surfaces before reporting success: assigned `result.json` SHALL contain the canonical flat result, assigned `runtime-receipt.jsonl` SHALL contain canonical receipt events, declared cache leaves SHALL contain canonical `page.md`, and ledger rows SHALL be built from canonical data. Any normalization SHALL be visible through structured diagnostics in submit output, trace, log, or an equivalent Engine diagnostic surface. Invalid submit SHALL remain non-terminal and SHALL NOT append a ledger row or complete queue demand.

This requirement SHALL NOT remove the existing ability to submit a candidate `resultPath` from a temporary or caller-provided location when all identity fields already match. The stricter assigned-directory containment check applies only to nonce correction. In every successful case, the Engine SHALL still persist the accepted canonical result to the assigned work-unit `result_ref`.

#### Scenario: single result wrapper is unwrapped

- **WHEN** a claimed work unit submits `result.json` whose top-level object is exactly `{ "result": { ... } }`
- **AND** the inner object satisfies the normal work-unit result contract after canonicalization
- **THEN** submit SHALL validate the inner object as the canonical result
- **AND** the submitted ledger row SHALL store the flat canonical result binding, not the wrapper
- **AND** diagnostics SHALL record that a result wrapper was unwrapped

#### Scenario: result wrapper with siblings is rejected

- **WHEN** a submitted result object contains top-level `result` plus any sibling key
- **THEN** submit SHALL reject the result before ledger append
- **AND** diagnostics SHALL identify the unsafe wrapper shape

#### Scenario: missing receipt schema or binding identity is canonicalized

- **WHEN** `runtime-receipt.jsonl` contains parseable JSON events that omit the current receipt-event `schema_version` or one or more binding identity fields: `work_id`, `queue_item_id`, `kind`, or `receipt_nonce`
- **AND** the missing binding identity fields can be filled from the claimed work-unit record
- **AND** no present identity field conflicts with that record
- **THEN** submit SHALL validate the canonical receipt events with the filled schema version and binding identity fields
- **AND** the assigned `runtime-receipt.jsonl` SHALL be persisted in canonical JSONL form before submit reports success
- **AND** diagnostics SHALL identify the receipt line numbers and autofilled schema or identity fields

#### Scenario: diagnostic receipt detail accepts object or string

- **WHEN** a receipt event has valid required identity/schema/event fields
- **AND** optional `detail` is either a JSON object or string
- **THEN** dry-submit and formal submit SHALL accept the diagnostic shape without rewriting it
- **AND** object/string choice SHALL NOT change progress, coverage, or Gate authority

#### Scenario: non-message receipt detail shapes remain invalid

- **WHEN** optional receipt `detail` is an array, number, boolean, or null
- **THEN** dry-submit SHALL reject the exact receipt line through the existing receipt repair boundary
- **AND** the Agent SHALL repair the same receipt and rerun dry-submit without a user decision

#### Scenario: conflicting receipt schema version is rejected

- **WHEN** a receipt event contains a `schema_version` that is not the current receipt-event schema literal
- **THEN** submit SHALL reject the receipt through normal schema validation
- **AND** schema version autofill SHALL NOT be used to rewrite a conflicting version

#### Scenario: conflicting receipt binding identity is rejected

- **WHEN** a receipt event contains a `work_id`, `queue_item_id`, `kind`, or `receipt_nonce` that conflicts with the claimed work-unit record
- **THEN** submit SHALL reject the receipt
- **AND** no queue completion or ledger append SHALL occur

#### Scenario: invalid or empty receipt remains invalid

- **WHEN** `runtime-receipt.jsonl` is empty or contains invalid JSONL
- **THEN** submit SHALL reject the receipt
- **AND** receipt canonicalization SHALL NOT be used to synthesize missing events or repair malformed JSON

#### Scenario: page-content cache leaf is canonicalized

- **WHEN** a declared cache leaf contains `websearch.json`, `meta.json`, and `page-content.md`
- **AND** `page.md` is absent in that same leaf directory
- **THEN** submit SHALL materialize canonical `page.md` with the `page-content.md` content before cache validation reports success
- **AND** cache validation SHALL continue against `page.md`
- **AND** diagnostics SHALL identify the cache leaf canonicalization

#### Scenario: identical page sidecar is accepted as non-authority

- **WHEN** a declared cache leaf contains both `page.md` and `page-content.md`
- **AND** their content is identical
- **THEN** submit SHALL validate `page.md` as the canonical authority file
- **AND** `page-content.md` SHALL NOT be treated as an additional fetched-source authority surface

#### Scenario: divergent page files are rejected

- **WHEN** a declared cache leaf contains both `page.md` and `page-content.md`
- **AND** their content differs
- **THEN** submit SHALL reject the cache trail
- **AND** diagnostics SHALL identify the divergent files

#### Scenario: cache authority files remain required

- **WHEN** a declared cache leaf is missing `websearch.json`, missing `meta.json`, or has neither `page.md` nor canonicalizable `page-content.md`
- **THEN** submit SHALL reject the cache trail
- **AND** no fetched-source output SHALL gain ledger coverage from that leaf

#### Scenario: nonce is normalized only under complete binding

- **WHEN** a result or receipt carries a stale `receipt_nonce`
- **AND** `work_id`, `queue_item_id`, and `kind` match the claimed work-unit record
- **AND** the submitted result path resolves inside that work unit's assigned directory
- **THEN** submit MAY normalize the nonce to the Engine record nonce before strict validation
- **AND** assigned `result.json` and `runtime-receipt.jsonl` SHALL persist the canonical record nonce before submit reports success
- **AND** diagnostics SHALL record the nonce normalization

#### Scenario: nonce mismatch with unsafe binding is rejected

- **WHEN** a result or receipt nonce differs from the claimed record
- **AND** any other identity field differs or the result path resolves outside the assigned work-unit directory
- **THEN** submit SHALL reject the submission
- **AND** no ledger row SHALL be written

#### Scenario: exact-identity candidate result may come from temporary path

- **WHEN** a submitted candidate result path is outside the assigned work-unit directory
- **AND** `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` already match the claimed work-unit record
- **AND** all other result, receipt, output, cache, queue, hash, and ledger validations pass
- **THEN** submit MAY accept the candidate result using the existing submit path semantics
- **AND** the Engine SHALL persist the canonical accepted result to the assigned work-unit `result_ref`

### Requirement: Work-unit dry-submit SHALL preflight submit validation without side effects

The work-unit CLI SHALL provide a dry-submit preflight for claimed work units. Dry-submit SHALL read a candidate result and evaluate the same deterministic submit contract used by formal `operate-work-unit submit` wherever possible, including work-unit identity, queue binding, manifest/index consistency, result schema, runtime receipt, nonce, output files, source claims, cache trails, and kind output contract constraints.

Dry-submit and formal submit SHALL obtain `output_files` requiredness from the immutable current assignment output contract, together with its `required_outputs[]`, rather than retain an independent generic non-empty-output rule. A snapshot-bound `work-unit.assignment.v3` supplementary `wave1_topic_deepening` assignment with empty required_outputs SHALL accept `output_files: []`; it SHALL still validate all applicable result schema, identity, receipt, source-claim, accepted-URL, cache/degraded-capture, queue and provenance facts. A v3 assignment with one or more required outputs SHALL continue to require and validate those exact path/role declarations. Empty required_outputs alone SHALL not select supplementary semantics or weaken another kind's existing output contract. An attempt with v1/v2 assignment, a missing marker, markerless submission, or missing actor binding SHALL return `unsupported_current_contract` before dry-submit derives an output contract, validates a candidate, or reports a repair action.

Dry-submit SHALL be read-only. It SHALL NOT append `rb_output_declarations.jsonl`, complete queue demand, mutate `rb_queue.json`, change work-unit terminal/claimed status, write canonical result/receipt/cache files, record `last_submit_rejection`, create `_work_units/_transactions/` entries, write submit trace/log side effects, or emit success authority that gates may consume. Formal submit remains the only successful delegated completion transition.

Dry-submit output SHALL be structured enough for Agent repair. It SHALL report whether formal submit is expected to pass, the checked `work_id`, reason codes or violation codes, repair-targeted diagnostics, and any narrow normalizations formal submit would perform. Every primary independently evaluable violation SHALL include `repair_kind`, `missing_fact`, `write_to`, and `rerun`; dependent checks blocked by an earlier prerequisite SHALL be masked or marked dependent instead of being presented as additional repair tasks. Failed dry-submit SHALL still return structured preflight JSON rather than only throwing a stderr error. Normalization reporting SHALL NOT persist those normalizations during dry-submit.

Dry-submit SHALL mirror formal submit candidate path semantics. A candidate result path MAY be temporary or caller-provided when formal submit would allow it. The assigned work-unit directory containment rule SHALL remain limited to nonce normalization eligibility and SHALL NOT become a new dry-submit-only path restriction.

Dry-submit SHALL avoid validation branches that write as part of canonicalization. When formal submit would canonicalize cache `page-content.md` into `page.md`, canonical receipt JSONL, or assigned result JSON, dry-submit SHALL report the planned normalization without writing those files. Dry-submit SHALL validate the in-memory virtual canonical view that formal submit would validate, so read-only preflight does not reject a candidate solely because the canonical file has not been persisted yet.

Dry-submit SHALL accumulate independently evaluable violations so the Agent can repair multiple issues in one pass. If one failed check prevents dependent checks from running, dry-submit SHALL report that dependency rather than inventing validation results.

For the changed submit contract, independent-root coverage SHALL include candidate JSON/schema issues; candidate-side work ID, queue item, kind, nonce and actor binding; immutable manifest/beacon/index binding; runtime-receipt schema, lifecycle, nonce and actor fields; output-role/path requirements; cache-trail path and leaf schema; `meta.json` source URL mapping; current-attempt source-claim/cache/accepted-URL relations; and queue snapshot/in-flight binding. Schema validation that yields multiple independent issues SHALL project each issue with its exact JSON pointer rather than collapse the whole Zod error into one opaque violation. A candidate-side mismatch SHALL point to the assigned candidate/receipt/output/cache surface the Agent may repair. A conflict among Engine-owned index, manifest, beacon, status, queue, receipt hash or submitted authority SHALL point to an existing Engine operation or `missing_contract`, never to hand-editing immutable authority. This is a focused regression matrix for the changed contract, not a second runtime field catalog or validator.

Prerequisite short-circuiting SHALL be local. An unreadable candidate SHALL mask actor/output/cache/source implications that require parsed candidate data; an invalid manifest/index envelope SHALL mask contract checks that require that envelope; and an invalid cache leaf SHALL mask URL/source-claim implications that require that leaf. Independently readable surfaces, such as a runtime-receipt root and a separately resolvable output/cache root, MAY still be returned together. Prior-submitted-output eligibility for supplementary source claims SHALL remain the source-lineage contract and SHALL NOT be guessed by this core preflight slice.

Agent-facing fallback and submit-repair guidance SHALL place dry-submit immediately before formal submit for Phase Agent-authored candidates. It SHALL instruct the Agent to use the generated result starter, read all returned `violations[]` and `repair_target` values, repair the same assigned result/receipt/output/cache surfaces, and rerun the same dry-submit checkpoint. A repairable formal-submit rejection SHALL recommend dry-submit for the same candidate rather than inviting repeated formal-submit guessing. These ordinary authorized repairs SHALL remain Agent execution. New semantic/risk/permission decisions, external non-delegable actions, and missing accepted contracts SHALL be identified only as the smallest Agent-facing boundary; user-facing initiation SHALL obey the current lifecycle interaction contract and SHALL NOT be inferred from the dry-submit classification itself.

Generated `task.md` guidance SHALL use the same placement-neutral boundary wording. It SHALL NOT tell the Phase Agent or work-unit actor to "involve the user" merely because a dry-submit finding is `user_decision`, `external_action`, or `missing_contract`; the current lifecycle owner decides whether a request may be initiated, and `missing_contract` is stated rather than requested. This wording change SHALL NOT give a Sub-agent lifecycle or user-interaction authority.

Dry-submit SHALL keep provenance strict. It SHALL NOT authorize a result or receipt written after the fact to claim work that was performed outside the claimed envelope, and it SHALL NOT treat a filesystem-only artifact as actor-produced merely because a later candidate names it.

For a current assignment_contract_version, dry-submit SHALL reconstruct the expected output contract from the hash-bound queue snapshot and recorded Topic coordinates, require exact manifest/beacon parity, and evaluate only current result declarations matching required_outputs. The neutral target-level module SHALL own the same tolerant direct facts consumed by the Wave adapters:

- wave0.source-metadata-array.v1 requires parseable YAML whose top-level value is an array and whose entries pass ReferenceMetadataArraySchema; it SHALL NOT enforce a count floor;
- wave1.evidence-summary.v1 requires a non-empty Key Findings semantic section;
- wave1.question-list.v1 requires non-empty Topic Investigation Targets, Question Reconciliation, Emergent Question Protocol, and Exploration / Exploitation Decision semantic sections.

Heading level, case, surrounding whitespace, order, and list presentation SHALL remain tolerated exactly as in the shared Wave evaluator. source_url_present SHALL remain outside candidate blocking because structured source_claims[] and accepted_source_urls[] are the more direct submit authority. Count floors, submitted provenance, reference backing/index, cross-artifact links, depth review, return maps, queue drain, phase completeness, and completion events SHALL remain Wave inspect/Gate facts.

Each dry-submit invocation SHALL acquire a fresh single byte snapshot for every required output. Before per-target calls, reconstructed-contract validation SHALL reject duplicate normalized required-output paths. The target-level module SHALL accept only one Engine-resolved concrete bundle-relative path per call and reject absolute, empty, dot, traversal, backslash or non-canonical paths, glob/placeholder paths, stable symlinks, realpath escape, directories and non-regular files, read errors, and raw content larger than 4 MiB. It SHALL open the target, use fstat and a `4 MiB + 1 byte` bounded read on that same handle, accept a shorter EOF snapshot if the opened file shrinks, reject initial or observed growth beyond the cap, decode UTF-8 with fatal invalid-byte rejection, tolerate and strip one leading UTF-8 BOM for parsing, and evaluate all direct facts internally from that one decoded snapshot. Each missing, unsafe, unreadable, oversized, or invalidly encoded target SHALL yield one prerequisite root that masks its dependent direct facts.

The reader contract protects the trusted local actor model against stable path escape, stable symlink/special-file substitution, and unbounded reads. It SHALL NOT claim to eliminate hardlink aliasing or every same-host malicious concurrent replacement race. Those remain explicit residual risks; any stronger threat model requires a separate security change rather than an unsupported race-free claim.

The neutral target module SHALL return only semantic_content or contract_integrity root_class and SHALL not inspect result declarations or receipts. It SHALL classify target missing plus YAML parse/top-level/schema and required semantic-field/section failures as semantic_content, while unsafe/non-regular/escaping target, bounded-read/oversize failure and invalid UTF-8 are contract_integrity. The candidate adapter SHALL combine those roots with every independently evaluated candidate/result, runtime-receipt, output, source/cache and Engine-binding root, retain the existing repair_kind/missing_fact/write_to/rerun coordinates, and add a non-authoritative closed repair_scope projection: mechanical, semantic_content, or contract_integrity.

Mechanical SHALL apply only to a parseable candidate's absent/defaultable immutable-envelope projection with one unambiguous expected value, or an omitted/misdeclared required path/role after the exact target passes its direct contract. A conflicting supplied work/queue/kind/nonce/actor identity, unknown marker/contract, manifest/beacon/snapshot/index/queue/ledger/hash disagreement, unsafe target, bounded-read/invalid-UTF8 failure or ambiguous prior authority SHALL be contract_integrity. Missing/unparseable candidate or receipt, absent lifecycle fact, and any invalid/missing actor-owned output, source claim, accepted URL, cache trail/content/meta or research semantic SHALL be semantic_content. The Phase Agent SHALL NOT manufacture or edit receipt/source/cache facts under mechanical scope. This projection assigns legal repair ownership; it does not create a lifecycle state, permission, automatic repair, or acceptance override.

Dry-submit SHALL combine the complete independent root set with the Engine-validated runtime-receipt lifecycle and emit exactly one non-persistent `recommended_action` from the closed set `submit|repair_same_candidate|return_to_actor|fail_and_replace|inspect_contract` plus `primary_root_code`. One work-unit contract schema SHALL define and validate this candidate projection, and one pure Engine helper SHALL own derivation plus timeout mapping; formal-submit rejection and timeout SHALL import those owners rather than maintain independent string sets. Dry-submit SHALL select `submit` only with no roots and set primary_root_code null. Otherwise precedence SHALL be contract_integrity -> semantic_content -> mechanical. Violation order SHALL be deterministic by a closed validation-phase ordinal, then required-output manifest order for direct targets or normalized JSON pointer/coordinate within a phase, then local issue order; primary_root_code SHALL be the first code in the winning scope under that order. Semantic content SHALL map to `fail_and_replace` when work_done is observed and `return_to_actor` otherwise. Mechanical-only roots SHALL map to `repair_same_candidate`. The projection SHALL NOT mutate state, persist a decision including inside `last_submit_rejection`, infer actor availability, or authorize a different acceptance path. Formal submit rejection SHALL use the same derivation and preserve dry-submit as the candidate re-evaluation checkpoint where applicable.

Generated actor guidance SHALL expose the exact direct contract and require the actor to verify assigned writes before recording work_done, but v1 SHALL NOT require native work-unit actors to invoke the Engine CLI. The Phase Agent SHALL run predictive dry-submit after actor return and execute the Engine-derived recommended_action: only repair_same_candidate permits result declaration repair; return_to_actor preserves selected-actor ownership; fail_and_replace uses the explicit same-obligation path; inspect_contract stays at the Engine/maintenance owner. This command-ownership choice SHALL not authorize Phase Agent semantic authorship or prevent a future separately accepted actor-side checkpoint.

#### Scenario: valid dry-submit has no ledger side effect

- **WHEN** a claimed work unit has a candidate result that formal submit would accept
- **AND** the Agent runs `operate-work-unit dry-submit`
- **THEN** dry-submit SHALL return `ok: true` or equivalent pass status
- **AND** `rb_output_declarations.jsonl`, `rb_queue.json`, work-unit status, assigned `result.json`, runtime receipt files, `_work_units/_transactions/`, trace/log files, and existing cache leaf files SHALL remain unchanged

#### Scenario: supplementary empty-output preflight matches its assignment

- **WHEN** a snapshot-bound supplementary `wave1_topic_deepening` attempt has empty required_outputs and a result with `output_files: []` plus valid required source/cache/receipt facts
- **THEN** dry-submit and formal submit SHALL not return `output_files[] is required`
- **AND** its generated task/result starter and submit verdict SHALL expose the same empty-output obligation

#### Scenario: primary direct-output obligation remains required

- **WHEN** a primary Wave1 assignment has its canonical required evidence-summary and question-list outputs but the candidate omits their declarations
- **THEN** dry-submit SHALL reject the omitted required path/role declarations
- **AND** it SHALL not reinterpret the primary assignment as supplementary

#### Scenario: empty direct outputs do not relax a different kind

- **WHEN** a current `wave2_targeted_evidence` assignment has its established
  empty required-output set but its bound base output contract requires an
  `output_files` declaration
- **THEN** dry-submit and formal submit SHALL preserve that existing
  declaration requirement
- **AND** they SHALL not infer supplementary Wave1 behavior from the empty set

#### Scenario: dry-submit reports multiple repairable violations

- **WHEN** a candidate result has an invalid output role and a missing cache trail file
- **THEN** dry-submit SHALL report both violations when both can be evaluated independently
- **AND** the diagnostic SHALL identify the output role problem and the cache trail repair target
- **AND** each violation SHALL carry its own `repair_kind`, `missing_fact`, exact `write_to` JSON/file surface, and the same dry-submit command in `rerun`
- **AND** no ledger row or queue completion SHALL occur

#### Scenario: candidate schema issues expose exact repair coordinates

- **WHEN** one candidate uses the wrong result `schema_version`, omits `actor_contract_version`, has a conflicting `execution_actor_class`, and includes rejected field `actor_execution`
- **THEN** dry-submit SHALL return each independently repairable schema/binding issue in the same preflight result
- **AND** each issue SHALL name the exact candidate JSON pointer and expected value or removal action
- **AND** the Agent SHALL not need to discover those fields through repeated formal-submit attempts

#### Scenario: Engine-owned binding drift is not presented as an Agent file edit

- **WHEN** candidate identity is valid but index, manifest, immutable beacon, or queue binding conflicts
- **THEN** dry-submit SHALL identify the earliest authority-side root and mask only checks that depend on that root
- **AND** its nearest action SHALL be an existing Engine operation or `missing_contract`, not direct editing of index, manifest, beacon, status, queue, ledger, receipt hash, or provenance

#### Scenario: dry-submit reports normalizations without persisting them

- **WHEN** a candidate result uses a shape that formal submit would narrow-canonicalize
- **THEN** dry-submit MAY report the planned normalization
- **AND** it SHALL NOT write the canonicalized result, receipt, trace/log record, or cache surface
- **AND** formal submit SHALL still be required to persist any accepted canonical authority surface

#### Scenario: dry-submit does not materialize cache page aliases

- **WHEN** a cache trail has `page-content.md` that formal submit would canonicalize to `page.md`
- **AND** the Agent runs `operate-work-unit dry-submit`
- **THEN** dry-submit SHALL report the planned cache normalization when relevant
- **AND** it SHALL validate the virtual `page.md` content that formal submit would materialize
- **AND** it SHALL NOT create or overwrite `page.md`
- **AND** a later formal submit SHALL still be required to persist the canonical cache leaf

#### Scenario: failed dry-submit does not mark submit rejection

- **WHEN** dry-submit finds a candidate result invalid
- **THEN** the work-unit attempt SHALL remain repairable without a submit rejection state change caused by dry-submit
- **AND** a later corrected dry-submit or formal submit MAY be attempted for the same claimed `work_id`

#### Scenario: dry-submit cannot satisfy gate coverage

- **WHEN** a work unit has only a successful dry-submit and no formal submit ledger row
- **THEN** wave gates SHALL NOT count that work unit as delegated coverage
- **AND** diagnostics MAY mention that formal submit is still required

#### Scenario: dry-submit accepts caller-provided candidate path under submit-equivalent rules

- **WHEN** a candidate result path is outside the assigned work-unit directory
- **AND** all identity fields already match the claimed work-unit record
- **THEN** dry-submit SHALL evaluate it under the same path semantics as formal submit
- **AND** it SHALL NOT require the candidate to be copied into the assigned work-unit directory before preflight

#### Scenario: Phase Agent candidate repairs through one dry-submit loop

- **WHEN** a Phase Agent fallback candidate has independently evaluable receipt actor-field, output-role and cache metadata violations
- **THEN** dry-submit SHALL return all violations that can be evaluated without the failed prerequisite
- **AND** guidance SHALL direct repair of the same assigned surfaces followed by the same dry-submit command
- **AND** formal submit SHALL run only after dry-submit predicts pass
- **AND** the Agent SHALL execute the repair without asking the user to run ordinary pipeline commands

#### Scenario: dry-submit derives one closed nearest action

- **WHEN** dry-submit has collected its complete independent root set and validated lifecycle receipt state
- **THEN** it SHALL emit exactly one recommended_action using integrity-over-semantic-over-mechanical precedence
- **AND** it SHALL emit null primary_root_code for submit or the first root code in the winning scope under the shared phase/coordinate ordering for rejection
- **AND** the field SHALL remain a non-persistent projection that performs no repair, fail, enqueue, claim, or submit mutation

#### Scenario: every dry-submit root receives one provenance-based scope

- **WHEN** dry-submit collects candidate schema/identity, receipt lifecycle, output, source/cache and Engine-binding roots in one invocation
- **THEN** each root SHALL receive exactly one mechanical, semantic_content or contract_integrity repair_scope from the shared ownership matrix
- **AND** a missing envelope-const candidate field MAY be mechanical, a conflicting identity SHALL be integrity, and missing actor receipt/source/cache facts SHALL be semantic rather than Phase-Agent fabrication

#### Scenario: Dry-submit boundary obeys lifecycle interaction contract

- **WHEN** dry-submit returns `repair_kind: user_decision`, `external_action`, or `missing_contract` during a non-terminal `stop: no` phase
- **THEN** guidance SHALL retain the smallest Agent-facing boundary without initiating a user question, status output, approval request, or acknowledgement wait from that classification alone
- **AND** the same candidate identity and current lifecycle checkpoint SHALL remain unchanged

#### Scenario: Generated task does not create a user-escalation rule

- **WHEN** the Engine generates `task.md` dry-submit guidance for a normal delegated or Phase Agent fallback work unit
- **THEN** the guidance SHALL assign ordinary repair to the Agent and describe non-mechanical findings as placement-neutral boundaries
- **AND** it SHALL NOT instruct the actor or Controller to involve the user from classification alone

#### Scenario: Formal rejection points back to dry-submit

- **WHEN** formal submit rejects a claimed candidate for a repairable result, receipt, output, cache or source-claim validation issue
- **THEN** the nearest action SHALL be to run dry-submit for the same work ID and candidate path
- **AND** the rejection SHALL include `repair_kind`, `missing_fact`, `write_to`, and `rerun` rather than only opaque mismatch prose
- **AND** the response SHALL NOT present multiple competing recovery routes

#### Scenario: Dry-submit cannot retroactively create provenance

- **WHEN** an artifact was produced outside a claimed work-unit envelope and a later hand-written candidate merely names that file
- **THEN** dry-submit or formal submit SHALL NOT treat that fact alone as valid actor execution or submitted provenance
- **AND** the Agent SHALL execute new real work through a legal claimed attempt or report the missing contract

#### Scenario: malformed Wave0 source YAML fails at candidate checkpoint

- **WHEN** a current assigned source.yaml is declared with role source_yaml but its snapshot is unparseable, not a top-level array, or violates ReferenceMetadataArraySchema
- **THEN** dry-submit SHALL reject with the shared direct root and same dry-submit rerun
- **AND** it SHALL not append ledger coverage or additionally report the Wave0 count floor

#### Scenario: empty Wave0 source array is not rejected by the direct-shape contract alone

- **WHEN** source.yaml is a parseable top-level empty array accepted by ReferenceMetadataArraySchema
- **THEN** the candidate direct-shape evaluator SHALL pass that contract
- **AND** Wave0 count-floor and source-sufficiency checks SHALL remain at Wave inspect/Gate

#### Scenario: missing Key Findings is a semantic content root

- **WHEN** a current assigned evidence-summary snapshot lacks a non-empty Key Findings semantic section
- **THEN** dry-submit SHALL reject with repair_scope semantic_content, the exact output path, and recommended_action return_to_actor or fail_and_replace according to work_done receipt state
- **AND** it SHALL not add source_url_present as a second candidate blocker

#### Scenario: tolerant Key Findings presentation passes both adapters

- **WHEN** an evidence summary contains a non-empty semantically equivalent Key Findings heading with a tolerated heading level, case, spacing, order, or list form
- **THEN** candidate evaluation SHALL accept it
- **AND** Wave inspect/Gate SHALL consume the same neutral fact rather than a stricter parser

#### Scenario: question list reports missing semantic sections once

- **WHEN** a required question-list snapshot lacks one or more of the four non-empty semantic sections
- **THEN** dry-submit SHALL return one root naming the missing sections, exact path, repair_scope semantic_content, lifecycle-derived recommended_action, and same rerun
- **AND** it SHALL not expand the prerequisite into phase-wide or return-map failures

#### Scenario: every candidate checkpoint reads fresh bytes

- **WHEN** one dry-submit invocation passes and the required output changes before a second dry-submit invocation
- **THEN** the second invocation SHALL open and evaluate a new bounded snapshot
- **AND** it SHALL not reuse the first PASS, bytes, mtime, or parsed result

#### Scenario: reader rejects unsafe or unbounded target

- **WHEN** a resolved required target is a stable symlink, escapes by realpath, is a directory or special file, exceeds 4 MiB, fails bounded read, or contains invalid UTF-8
- **THEN** dry-submit SHALL fail closed with one authority-integrity prerequisite root
- **AND** dependent YAML or semantic-section failures SHALL be masked

#### Scenario: UTF-8 BOM is presentation tolerance

- **WHEN** a required output contains one leading UTF-8 BOM followed by otherwise valid contract content
- **THEN** the target-level module SHALL strip the BOM for parsing and return the same direct verdict as the BOM-free bytes
- **AND** it SHALL not rewrite the file during dry-submit

#### Scenario: actor sees direct contract without owning the CLI

- **WHEN** a native actor receives a current generated task
- **THEN** it SHALL see and self-verify the assigned direct output contract before recording work_done
- **AND** v1 SHALL leave dry-submit command execution with the Phase Agent after actor return

#### Scenario: Phase Agent cannot inherit semantic authorship

- **WHEN** post-return dry-submit reports repair_scope semantic_content and the receipt records work_done
- **THEN** recommended_action and Phase Agent guidance SHALL direct `operate-work-unit fail` with reason `semantic_contract:<primary_root_code>` using the Engine-derived field, explicit same-obligation enqueue under a fresh queue ID, and a replacement work-unit claim with a new work ID
- **AND** it SHALL not direct the Phase Agent to author the missing research content under the returned actor provenance
### Requirement: Timeout terminalization SHALL be guarded by progress-aware preflight

The work-unit CLI SHALL provide a timeout preflight for claimed work units. Timeout preflight SHALL determine whether it is safe to terminalize a claimed work-unit attempt as `timed_out` by evaluating Engine-observed progress, candidate result state, dry-submit-equivalent diagnostics, queue binding, and effective idle lease state.

Timeout preflight SHALL accept an explicit current run bundle path, `work_id`, and optional candidate `result` path. When no candidate result path is supplied, preflight SHALL inspect the assigned result path from the work-unit record. When a candidate result path is supplied, preflight SHALL evaluate it under submit/dry-submit-equivalent candidate path rules. A supplied candidate result path outside the assigned work-unit directory SHALL be a validation input only: its mtime SHALL NOT extend the work-unit idle lease by itself, though dry-submit-equivalent validation MAY still recommend `submit` or `repair`. It SHALL fail closed for missing or invalid work-unit index records, non-claimed attempts, missing manifests, missing queue in-flight binding, or binding drift. It SHALL return structured JSON for both timeout-eligible and timeout-ineligible cases. The output SHALL include the checked `work_id`, `queue_item_id`, current status, `timeout_eligible`, `check`, `recommended_action`, nullable `candidate_projection`, progress summary, `initial_deadline_at`, `lease_anchor_at`, `idle_timeout_ms`, `effective_timeout_at`, `inspect[]`, and repair-oriented `advice[]`.

`recommended_action` SHALL be a closed value: `submit`, `repair`, `wait`, `timeout`, `inspect`, or `block`. Timeout-preflight CLI exit status SHALL follow `timeout_eligible`: exit success only when timeout is currently safe, and exit non-zero when timeout is unsafe or the work-unit state is invalid. When the work-unit context can be loaded, non-zero preflight outcomes SHALL still emit structured JSON for Agent feedback.

Timeout-preflight output SHALL be validated by an Engine-owned schema before it is emitted. The schema SHALL make `timeout_eligible` and `check` consistent, SHALL constrain `recommended_action` to the closed action set, SHALL reuse the shared candidate-projection schema when `candidate_projection` is non-null, and SHALL keep progress details structured enough for tests and Phase Agent guidance to distinguish result, receipt, output/cache, idle lease, and binding diagnostics. Candidate projection SHALL be null when no candidate was evaluated; preflight SHALL NOT synthesize a candidate action or primary root code from timeout state alone.

The timeout-preflight helper/API SHALL accept an injectable clock for tests, while CLI invocations SHALL use the real current time. Tests SHALL NOT depend on sleeping to cross timeout boundaries. Filesystem mtime comparisons SHALL be made against the injected or real current time and the work-unit `claimed_at`. File mtimes in the future relative to the chosen current time SHALL be diagnosed as suspicious and SHALL NOT extend the effective lease beyond the chosen current time plus the idle timeout window.

Timeout eligibility SHALL be progress-aware. The existing `deadline_at` SHALL remain an initial lease hint, but terminal timeout eligibility SHALL use an effective idle lease derived from `lease_anchor_at + idle_timeout_ms`. `latest_engine_observed_progress_at` SHALL mean actual Engine-observed progress and SHALL NOT be populated from `claimed_at` merely to support timeout arithmetic. `lease_anchor_at` SHALL be the latest Engine-observed progress time when progress exists, or `claimed_at` when no progress exists. The default idle timeout window SHALL be the work-unit `timeout_ms` unless an accepted explicit runtime/profile surface provides a narrower value. If there is no observed progress after claim, effective timeout eligibility SHALL fall back to `claimed_at + idle_timeout_ms`, which matches the existing `claimed_at + timeout_ms` behavior when the default idle timeout is used.

Engine-observed progress SHALL come from deterministic bundle-root surfaces such as assigned candidate result files, runtime receipt/log content and mtime tied to the same identity, declared output/cache files under current run bundle root, assigned work-unit refs, and Engine trace/log events tied to the same `work_id`. Undeclared random files, path-escape refs, and identity-mismatched surfaces SHALL NOT extend the idle lease. Agent-authored receipt timestamps SHALL NOT be the sole authority for progress freshness. Progress diagnostics SHALL identify the source type, observed timestamp when available, path or event ref when available, whether work-unit identity was verified, whether the source extended the idle lease, and whether a suspicious timestamp was detected.

Timeout preflight SHALL be read-only by default. It SHALL NOT update work-unit index records, queue state, work-unit status files, submitted ledger rows, terminal history, retry demand, transaction directories, trace/log files, candidate result files, runtime receipts, cache aliases, or gate-consumable outputs. Any future persisted observation surface such as `last_observed_at` SHALL require explicit design/spec update and no-authority side-effect proof before implementation relies on it.

If a candidate result exists, timeout preflight SHALL run dry-submit-equivalent validation before recommending timeout. If dry-submit would pass, preflight SHALL recommend formal `submit` and SHALL return `timeout_eligible: false`. If dry-submit fails with repair diagnostics for the same claimed `work_id`, preflight SHALL recommend repair and SHALL return `timeout_eligible: false`. Wrong identity, missing binding, terminal status, and ambiguous authority diagnostics SHALL route to `inspect` or `block`, not same-attempt repair. If recent progress exists but no candidate result is ready, preflight SHALL recommend wait or inspect and SHALL return `timeout_eligible: false` while the effective idle lease has not expired.

`operate-work-unit timeout` SHALL run the same preflight guard by default. Default timeout SHALL refuse progress-positive, submit-ready, repairable, or not-yet-idle attempts without changing work-unit status, queue state, ledger rows, terminal history, retry demand, trace/log terminalization records, transaction directories, or gate coverage. Timeout SHALL proceed by default only when preflight returns timeout-eligible.

Any Engine-owned timeout terminalization path SHALL run the same preflight guard by default, including exported lifecycle/API helpers used by the CLI or tests. The implementation SHALL NOT leave an unguarded exported path that can set a claimed attempt to `timed_out`. `failed` and `abandoned` terminalization are not governed by timeout-preflight unless a separate accepted change says otherwise.

The timeout command and Engine/API timeout path SHALL expose explicit force terminalization. Forced timeout SHALL still run preflight for audit, but MAY bypass a false timeout eligibility check. Forced timeout SHALL require a reason and SHALL produce durable diagnostics that include `forced_timeout: true`, the reason, `preflight_timeout_eligible`, `preflight_recommended_action`, nullable `preflight_candidate_projection`, `default_timeout_would_refuse`, `effective_timeout_at`, `latest_engine_observed_progress_at`, `lease_anchor_at`, and structured `progress_sources[]`. Each `progress_sources[]` item SHALL include source type, observed timestamp when available, path or event ref when available, identity verification, lease-extension status, and suspicious timestamp flag. A non-null preflight_candidate_projection SHALL validate through the shared candidate schema and preserve the exact evaluated action/root code; null SHALL mean no candidate projection was available. The preferred trace event name for a forced bypass is `work_unit_forced_timeout`; if implementation extends the existing timeout event instead, it SHALL include the same required fields. Forced timeout SHALL still be terminal fail-closed: it SHALL NOT append a submitted ledger row, SHALL NOT count as delegated gate coverage, and normal late submit against the terminal attempt SHALL remain rejected.

When timeout-preflight evaluates a present candidate for a current-version attempt, it SHALL reconstruct the same assignment contract and acquire its own fresh bounded required-output snapshots through dry-submit-equivalent validation. It SHALL not reuse an earlier dry-submit verdict or byte snapshot. It SHALL return that invocation's exact recommended_action/primary_root_code pair in candidate_projection and map candidate recommended_action into its existing coarser action set: submit -> submit; repair_same_candidate -> repair; return_to_actor -> repair with actor-owned advice; fail_and_replace -> block with the explicit fail/replacement boundary and `semantic_contract:<primary_root_code>` guidance; inspect_contract -> inspect. An independent timeout prerequisite/integrity root MAY make the outer timeout action block without changing the candidate projection or this mapping. It SHALL not label post-work_done semantic content as Phase Agent same-candidate repair or treat a candidate action alone as timeout eligibility. Observed output/receipt progress continues to prevent default timeout until the normal progress-aware lease or explicit legal fail action permits closure.

Unsafe reader roots, contract drift, unknown assignment version, wrong identity, and ambiguous authority SHALL remain inspect/block rather than timeout eligibility. Timeout-preflight SHALL remain read-only and SHALL not cache the direct-output verdict, persist repair_scope, rewrite the artifact, or create replacement demand.

Every emitted timeout preflight result SHALL also include a bounded
`recommendation_basis` projection for its already selected
`recommended_action`. The projection SHALL identify one existing direct branch
source (`candidate`, `progress`, `lease`, or `integrity`) and the small set of
direct observed facts that caused that branch to win, such as a dry-submit
candidate root, most recent identity-bound progress, effective lease time, or
binding/contract blocker. It SHALL be derived from the same preflight result;
it SHALL not run a second candidate evaluator, create a new timeout rule,
extend a lease, authorize a forced timeout, or turn diagnostic detail into
attempt authority. A caller can therefore distinguish why `submit`, `repair`,
`wait`, `timeout`, `inspect`, or `block` was selected without inferring policy
from a long array of unrelated diagnostics.

#### Scenario: no-progress claimed attempt is timeout eligible

- **WHEN** a claimed work unit has no candidate result, an empty or missing runtime receipt, no observed output/cache progress, and its effective idle lease has expired
- **THEN** `operate-work-unit timeout-preflight` SHALL return `timeout_eligible: true`
- **AND** `recommended_action` SHALL be `timeout`
- **AND** default `operate-work-unit timeout`, when invoked for that eligible attempt, SHALL be allowed to terminalize the attempt through the existing timeout retry path

#### Scenario: timeout preflight is read-only

- **WHEN** `operate-work-unit timeout-preflight` is run for a claimed work unit
- **THEN** it SHALL NOT mutate work-unit index, queue, status, ledger, transaction, trace/log, receipt, result, cache, or gate-consumable output surfaces
- **AND** any later formal submit or terminal command SHALL see the same authority state that existed before preflight

#### Scenario: injected clock makes timeout deterministic

- **WHEN** timeout-preflight is called through the helper/API with an injected current time
- **THEN** effective timeout calculations SHALL use that injected time
- **AND** tests SHALL be able to prove eligible and non-eligible outcomes without sleeping or relying on wall-clock delays

#### Scenario: no-progress lease anchor is not reported as observed progress

- **WHEN** a claimed work unit has no Engine-observed progress after claim
- **THEN** timeout-preflight SHALL compute `lease_anchor_at` from `claimed_at`
- **AND** it SHALL NOT report `claimed_at` as `latest_engine_observed_progress_at`
- **AND** diagnostics SHALL still expose the effective timeout calculation anchor

#### Scenario: future mtime does not overextend lease

- **WHEN** a progress source has filesystem mtime later than the chosen current time
- **THEN** timeout-preflight SHALL diagnose the timestamp as suspicious
- **AND** it SHALL NOT extend the effective lease beyond the chosen current time plus the idle timeout window

#### Scenario: external candidate result does not extend lease by mtime alone

- **WHEN** timeout-preflight is called with `--result <candidate>` outside the assigned work-unit directory
- **THEN** the candidate SHALL be evaluated for submit or repair advice under dry-submit-equivalent rules
- **AND** the candidate file mtime alone SHALL NOT extend the work-unit idle lease

#### Scenario: recent receipt progress blocks default timeout

- **WHEN** a claimed work unit has a non-empty runtime receipt tied to the same work-unit identity
- **AND** Engine-observed receipt progress is within the effective idle lease
- **THEN** timeout preflight SHALL return `timeout_eligible: false`
- **AND** default timeout SHALL refuse terminalization
- **AND** no retry demand or terminal history row SHALL be created by the refused timeout

#### Scenario: output or cache progress blocks default timeout

- **WHEN** a claimed work unit has observed output or cache files under the assigned work-unit contract
- **AND** the latest Engine-observed progress is within the effective idle lease
- **THEN** timeout preflight SHALL return `timeout_eligible: false`
- **AND** advice SHALL direct the Agent to wait, inspect, repair, or submit rather than timeout

#### Scenario: submit-ready result is recommended for submit

- **WHEN** a claimed work unit has a candidate result that dry-submit would accept
- **THEN** timeout preflight SHALL return `timeout_eligible: false`
- **AND** `recommended_action` SHALL be `submit`
- **AND** advice SHALL instruct formal `operate-work-unit submit` for the same `work_id`
- **AND** no timeout retry SHALL be created by default timeout

#### Scenario: repairable result is recommended for same-attempt repair

- **WHEN** a claimed work unit has a candidate result whose candidate action is repair_same_candidate
- **THEN** timeout preflight SHALL return `timeout_eligible: false`
- **AND** `recommended_action` SHALL be `repair`
- **AND** advice SHALL target repair of the same claimed `work_id`
- **AND** the attempt SHALL remain claimed unless the Agent later explicitly terminalizes it

#### Scenario: pre-work_done semantics return to actor through timeout advice

- **WHEN** a claimed work unit has candidate action return_to_actor
- **THEN** timeout preflight SHALL return timeout_eligible false and recommended_action repair
- **AND** advice SHALL direct the selected actor to complete the assigned semantics rather than authorize Phase Agent artifact editing

#### Scenario: invalid candidate identity is not treated as same-attempt repair

- **WHEN** a claimed work unit has a candidate result whose dry-submit diagnostics show wrong `work_id`, missing queue binding, terminal status, or ambiguous authority rather than same-attempt repair
- **THEN** timeout preflight SHALL return `timeout_eligible: false`
- **AND** `recommended_action` SHALL be `inspect` or `block`
- **AND** default timeout SHALL NOT terminalize the attempt

#### Scenario: stale progress may become timeout eligible

- **WHEN** a claimed work unit has prior observed progress
- **AND** no candidate result is submit-ready or repairable
- **AND** the effective idle lease from the latest Engine-observed progress has expired
- **THEN** timeout preflight SHALL return `timeout_eligible: true` unless another fail-closed invalid-binding or ambiguous-state diagnostic applies
- **AND** diagnostics SHALL include the latest observed progress time and effective timeout time

#### Scenario: default timeout refusal has no terminal side effect

- **WHEN** default `operate-work-unit timeout` is invoked for a progress-positive timeout-ineligible work unit
- **THEN** the command SHALL return structured failure
- **AND** work-unit index/status, queue delegated in-flight binding, queue terminal history, retry demand, submitted ledger rows, transaction directory entries, trace/log terminalization records, and gate coverage SHALL remain unchanged

#### Scenario: exported timeout API uses the same guard

- **WHEN** an Engine caller invokes an exported lifecycle/API timeout path for a progress-positive timeout-ineligible work unit
- **THEN** the same preflight guard SHALL refuse terminalization
- **AND** there SHALL be no unguarded exported helper that can set the attempt to `timed_out`
- **AND** `failed` and `abandoned` terminalization behavior SHALL remain unchanged

#### Scenario: timeout bypass audit covers Engine-owned terminalization paths

- **WHEN** implementation exposes or retains any Engine-owned helper that can terminalize a work unit as `timed_out`
- **THEN** regression or hygiene coverage SHALL prove that helper routes through guarded timeout or explicit forced timeout
- **AND** direct `timed_out` mutation paths SHALL NOT remain available as exported lifecycle/API shortcuts

#### Scenario: forced timeout is auditable

- **WHEN** `operate-work-unit timeout --force` terminalizes a progress-positive claimed work unit
- **THEN** the command SHALL require a reason
- **AND** durable trace/log or equivalent diagnostics SHALL record `forced_timeout: true`, the reason, `preflight_timeout_eligible`, `preflight_recommended_action`, nullable `preflight_candidate_projection`, `default_timeout_would_refuse`, `effective_timeout_at`, `latest_engine_observed_progress_at`, `lease_anchor_at`, and structured `progress_sources[]`
- **AND** a forced bypass SHOULD be visible as `work_unit_forced_timeout` or an equivalent existing timeout event carrying the same required fields
- **AND** the resulting terminal attempt SHALL still reject normal late submit

#### Scenario: invalid binding fails closed

- **WHEN** timeout preflight finds missing manifest, missing queue in-flight binding, mismatched `queue_item_id`, or non-claimed status
- **THEN** it SHALL return `timeout_eligible: false`
- **AND** advice SHALL direct inspection or Engine repair
- **AND** default timeout SHALL NOT terminalize the attempt

#### Scenario: timeout preflight rereads changed candidate content

- **WHEN** an earlier dry-submit passed but required-output bytes change before timeout-preflight
- **THEN** timeout-preflight SHALL evaluate a fresh bounded snapshot
- **AND** recommended_action SHALL reflect the current direct-output result rather than the earlier PASS

#### Scenario: semantic failure after work_done is not Phase Agent repair

- **WHEN** timeout-preflight observes work_done and a current candidate missing required semantic content
- **THEN** it SHALL return block with the fail-and-replacement owner
- **AND** it SHALL not recommend that the Phase Agent add the missing findings/questions to the same actor provenance

#### Scenario: mechanical direct failure remains repairable

- **WHEN** timeout-preflight finds candidate action repair_same_candidate because the target content passes and only result path/role declaration is wrong
- **THEN** it SHALL recommend repair for the same work ID and same dry-submit checkpoint
- **AND** default timeout SHALL not terminalize the progress-positive attempt

#### Scenario: contract or reader integrity failure blocks timeout

- **WHEN** timeout-preflight finds unknown assignment version, manifest/beacon contract drift, unsafe required path, or unreadable bounded snapshot
- **THEN** recommended_action SHALL be inspect or block
- **AND** default timeout SHALL not use the failure as evidence that the attempt is safely idle

#### Scenario: Recommendation basis distinguishes otherwise similar stalled attempts

- **WHEN** two claimed work units are both past their initial deadline but one
  has a dry-submit-ready candidate and the other has recent identity-bound
  receipt progress
- **THEN** their timeout preflight results SHALL expose different direct
  `recommendation_basis` branches for `submit` and `wait`
- **AND** neither result SHALL alter timeout eligibility, lease state, or the
  legal terminalization path merely to explain the recommendation

### Requirement: Work-unit claim SHALL evaluate one explicit actor observation before allocation

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

### Requirement: Phase Agent fallback SHALL remain inside the work-unit transaction

`phase_agent_fallback` SHALL be an accepted work-unit execution actor class only when the same claim receives a matching normalized `unavailable` delegated actor observation and the single queue-front candidate kind explicitly permits fallback. The fallback effective claim count SHALL be exactly one even when a larger count is requested, because one Phase Agent actor cannot execute a delegated parallel batch. The fallback SHALL receive the same Engine-allocated work ID, manifest, task, beacon, result schema, receipt nonce, assigned output/cache paths, timeout contract, dry-submit validation, formal submit transaction, and ledger coverage as a normal delegated subagent attempt.

The queue demand SHALL keep its existing intended target `targets.delegates.to: sub-agent` and role key; fallback SHALL NOT rewrite the queue task into a main-agent task. The work-unit attempt SHALL record the actual execution actor class and `fallback_from: delegated_subagent`, so inspect and ledger can distinguish intended delegated demand from the accepted actual fallback actor.

The Phase Agent SHALL perform the assigned bounded work as the work-unit actor and SHALL NOT directly complete queue demand, append a submitted ledger row, fabricate a delegated-subagent runtime reference, or bypass result/receipt validation. Fallback SHALL be one explicit branch, not an automatic chain through multiple roles/models/actors.

The generated fallback task SHALL make the mechanical submit path self-contained: the Phase Agent SHALL read the beacon and result schema, start from the generated exact-binding result starter, preserve immutable envelope files, write actor-bound runtime receipt events and contract-valid output/cache surfaces, run dry-submit, repair the same candidate until preflight passes, and then run formal submit before another fallback claim.

Fallback SHALL begin before the bounded evidence work it claims. It SHALL NOT be used after direct Phase-Agent research to manufacture result, receipt or ledger provenance for pre-existing orphan artifacts. Repeating Engine-known binding fields in the result remains a deliberate cross-check; the helper improvement is generated guidance and preflight, not removal of actor/provenance binding.

#### Scenario: Unavailable observation permits explicit Phase Agent fallback

- **WHEN** claim receives `outcome: unavailable` and requests `phase_agent_fallback`
- **AND** the queue-front candidate kind explicitly permits fallback
- **THEN** the Engine SHALL allocate exactly one eligible work unit with `execution_actor_class: phase_agent_fallback`
- **AND** generated Agent-facing output SHALL instruct the Phase Agent to execute the exact work-unit task and return through formal submit

#### Scenario: Available actor rejects unnecessary fallback

- **WHEN** claim receives `outcome: available` and requests `phase_agent_fallback`
- **THEN** claim SHALL reject before queue/index/work-unit mutation
- **AND** the nearest action SHALL be normal `delegated_subagent` claim

#### Scenario: Fallback-prohibited kind remains unclaimed

- **WHEN** delegated execution is unavailable and the candidate kind actor policy prohibits Phase Agent fallback
- **THEN** claim SHALL allocate no work unit and SHALL preserve the queue demand
- **AND** it SHALL return one action to resolve the external actor blocker and rerun normal claim

#### Scenario: Fallback preserves queue intent and records actual actor

- **WHEN** a delegated queue item is claimed through accepted Phase Agent fallback
- **THEN** its queue item snapshot SHALL retain `targets.delegates.to: sub-agent` and the original role key
- **AND** the work-unit actor authority SHALL record `execution_actor_class: phase_agent_fallback` and `fallback_from: delegated_subagent`

#### Scenario: Fallback cannot directly declare success

- **WHEN** a Phase Agent fallback writes assigned output files but does not produce a valid result and actor-bound runtime receipt
- **THEN** formal submit SHALL reject and SHALL append no submitted ledger row

#### Scenario: Fallback task is mechanically submit-ready

- **WHEN** an accepted `phase_agent_fallback` work unit is generated
- **THEN** its task SHALL include the exact result starter and pre-submit checklist for that claimed attempt
- **AND** the Phase Agent SHALL be able to fill semantic/output fields without guessing schema version, actor binding, receipt nonce or allowed result keys

#### Scenario: Fallback uses dry-submit before formal submit

- **WHEN** the Phase Agent finishes the assigned fallback output, cache, receipt and result files
- **THEN** it SHALL run dry-submit and repair the same attempt until preflight passes
- **AND** it SHALL run formal submit before claiming another fallback demand

#### Scenario: Post-hoc fallback provenance is prohibited

- **WHEN** direct research or an orphan artifact predates the fallback claim
- **THEN** the Phase Agent SHALL NOT write retrospective receipt/result data and describe that old work as the claimed attempt
- **AND** no submitted ledger row SHALL be created without new real execution inside the claimed envelope

### Requirement: Work-unit provenance SHALL bind execution actor class

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

When topic-scoped demand is claimed, the existing immutable `manifest.queue_item` snapshot SHALL preserve canonical payload UID and the current slug observed at enqueue. Submit/provenance readers SHALL resolve topic identity from that snapshot and the ledger's existing `work_unit_ref`; WorkUnitResultSchema and WorkUnitLedgerRecordSchema SHALL NOT gain duplicate topic fields. Historical slug-only queue snapshots MAY resolve through unique registry layout history. Layout mutation SHALL never edit receipt, actor, result, work-unit or ledger facts.

#### Scenario: Claim snapshot carries existing queue binding
- **WHEN** a topic-scoped demand is claimed after C3B activation
- **THEN** its existing manifest queue-item snapshot SHALL carry the same canonical payload UID and current slug
- **AND** result and ledger schemas SHALL remain free of duplicate topic identity fields

#### Scenario: Historical record remains byte-stable
- **WHEN** its topic is later renamed or renumbered
- **THEN** the submitted work-unit and ledger bytes SHALL remain unchanged
- **AND** shared inspection SHALL resolve the snapshot's previous slug to the current UID while preserving its recorded output paths

### Requirement: Existing task brief may expose a read-only user-controls coordinate

When user research controls are present, Phase guidance SHALL permit the Phase Agent to add one instruction to its existing queue-item `task_brief` before claim, directing the actor to read `rb_plan.md## Constraints > User Research Controls` through the work unit's existing beacon-rooted bundle coordinate. The Engine SHALL carry that already-authored `task_brief` unchanged through the existing manifest/task rendering path; it SHALL NOT infer, generate, parse, or copy user controls itself. The instruction SHALL be bundle-relative and read-only, and SHALL only guide source selection, evidence treatment, analysis, and presentation.

The instruction SHALL NOT add queue, manifest, result, receipt, allocation, lifecycle, assignment, or write authority; controls SHALL NOT be copied into work-unit machine fields. When controls are absent, generated task briefs SHALL retain their existing behavior without an empty control payload or added read obligation.

#### Scenario: delegated task receives Phase-authored coordinate but no new authority
- **WHEN** a control-bearing Phase Agent creates a queue item whose existing task brief names the bounded read-only host-file coordinate
- **THEN** the claimed delegated task renders that existing brief unchanged
- **AND** the work-unit manifest/result/receipt schemas and submit authority remain unchanged

### Requirement: Delegated work contract entry SHALL be constructible from one generated projection

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

### Requirement: Submit SHALL expose a bounded integrity preflight and transaction disposition

Normal submit and dry-submit SHALL evaluate one shared, read-only submit-owned integrity preflight before
candidate acceptance. It SHALL check only direct facts owned by submit: current index/ledger binding,
attempt disposition, queue in-flight or successor relation, transaction journal disposition, and current
lock contention. It SHALL not run, predict, or promise a formal phase Gate's content, coverage, floor,
reference, or cross-work-unit verdict. Formal submit SHALL rerun that same evaluator after acquiring
the global transaction lock; a prior dry-submit result SHALL not authorize commit.

Work-unit transaction acquisition contention SHALL return a structured non-mutating `busy` result rather
than a raw filesystem exception only when a schema-valid global lock-owner record names one schema-valid
non-suspect `work-unit.transaction.v2` journal with the same transaction ID, operation, journal ref, and target
work/queue coordinates. It SHALL identify the caller's requested operation/work ID separately from the
holder's transaction/operation/target coordinates, expose the holder journal disposition, state whether a
`started` holder targets the same attempt, and return one `wait` / caller-same-operation rerun coordinate. A
paired `committed`/`rolled_back` journal whose owner lock is awaiting final release remains global busy but
SHALL NOT be described as an active attempt mutation. Busy SHALL not label the candidate invalid, claim
that the actor or process is live, or recommend terminalization. A busy contender SHALL not re-claim work,
overwrite a result, write a ledger row, alter a lease, or create a blocking `started` journal.

`timeout-preflight` SHALL read the same direct transaction fact. Any valid non-suspect v2 global holder SHALL
prevent the concurrent timeout mutation and return busy/rerun. When a `started` holder's target set contains
the checked work ID, timeout-preflight SHALL classify same-attempt transaction protection; neither default nor
forced timeout may terminalize, requeue, or otherwise mutate that attempt while the fact is active. A holder
for another work ID or a settled journal awaiting final lock release SHALL not be described as the checked
attempt's owner or progress. An unpaired, unreadable, target-mismatched, proof-incomplete, unresolved or
malformed legacy, or `suspect` lock/journal SHALL return `suspect_transaction`, not `busy`, and SHALL not make a liveness
inference. Age SHALL not classify a transaction as stale or dead.

The transaction helper SHALL expose `journal_disposition` as a bounded Zod enum with exactly the values
`started` | `committed` | `rolled_back` | `suspect` | `legacy_failed` | `unknown`; a bare
unvalidated string SHALL NOT be projected as a structured disposition. Formal submit rejection,
late-submit rejection, and transaction-blocking feedback SHALL emit the unified `attempt_disposition` +
`next` shape defined by `engine/check-inspect-feedback` (CHI-004) — same closed disposition vocabulary,
owner surface, exact operation or `missing_contract`, and same-checkpoint rerun — instead of bespoke
fields.
Each new journal SHALL use `schema_version: work-unit.transaction.v2`; v1 journals SHALL NOT be interpreted
as a current transaction protocol or gain v2 recovery semantics by framework-version inference. The raw
transaction-directory safety scan SHALL still identify a journal carrying the v1 marker: an uncommitted v1
journal, and any unreadable, malformed, or proof-incomplete journal, SHALL remain an explicit
`suspect_transaction` mutation blocker. A structurally complete committed v1 journal SHALL be diagnostic history only and SHALL
not establish transaction, acceptance, recovery, supersession, or provenance authority; when it is a
complete v1-shaped diagnostic record and no other transaction blocker exists, it SHALL NOT itself block a
new current v2 mutation. A v1 marker with an incomplete or malformed legacy shape SHALL be suspect rather
than treated as committed diagnostic history. Before the
first durable target mutation, each v2 journal SHALL declare a complete exact-path mutation
manifest. Each entry SHALL contain one canonical bundle-relative rollback-owned target, its before-existence,
and its 256-bit SHA-2 before-digest when present. The manifest SHALL cover every authority and canonicalization file
the operation may write; it SHALL contain no glob, implicit recursive directory, unsafe path, or
post-first-write target discovery. The current transaction's own lock/journal and append-only diagnostic
trace/run-log writes are metadata/audit surfaces rather than rollback targets; they SHALL NOT establish
operational authority or conceal an undeclared authority write. The undeclared-mutation comparison
surface SHALL be exactly the work-unit authority surface: the work-unit root (`_work_units/`, excluding
the global lock and the current transaction's own journal) plus the root output declaration ledger.
Bundle writes outside that surface during the transaction window — including delegated cache,
run-scoped script, diagnostics, reference, or artifact writes owned by other concurrent processes —
SHALL NOT be attributed to the transaction as undeclared mutations, SHALL NOT mark the journal
`suspect`, and SHALL NOT make the rollback proof incomplete. A callback write to an authority-surface
path outside the declared manifest SHALL remain a fail-closed undeclared mutation. A journal may enter `started` only after its
declaration and lock-owner binding are durable.

A journal's transient `started` state is an active direct fact. A v2 journal's durable post-operation
disposition SHALL be one of `committed`, `rolled_back`, or `suspect`; only `committed` and `rolled_back` are
settled, while `suspect` remains unresolved and MAY transition only to proof-verified `rolled_back` through
the bounded recovery operation below. A failed mutation whose Engine-owned rollback has restored every
declared target to its exact before-existence/digest SHALL be recorded as `rolled_back` — concurrent
writes outside the work-unit authority surface SHALL NOT make that rollback proof incomplete — and SHALL not block
later submit/Gate work merely by existing on disk. A v2 journal whose effect cannot be
deterministically classified SHALL remain `suspect`. A legacy v1 journal with any non-`committed` status, or any invalid
legacy journal, SHALL remain under the raw suspect boundary; its age or current clean-looking state SHALL
not fabricate rollback, and a committed v1 journal SHALL not be promoted to a settled current fact.

The transaction helper SHALL release its owner lock only after the mutation callback has stopped and the
helper has attempted its durable post-operation disposition. Lock release SHALL be the helper's final action,
and no declared target SHALL be written afterward. This ordering is the only Engine proof that permits an
unlocked v2 `started`/`suspect` journal to be compared; it SHALL NOT be described as host/process liveness.

`operate-work-unit recover-transaction <bundle> --tx-id <id>` SHALL be the sole transaction-recovery
operation. It MAY mark one named orphaned v2 `started`/`suspect` journal `rolled_back` only when no global
lock is held, its complete mutation manifest is valid, and every current target equals its before-image.
The named prior journal SHALL be the only operational target of a normal recovery transaction, and the
presence of other unresolved orphan journals SHALL NOT by itself block that recovery transaction: while a
recovery transaction settles its named target, the transaction guard SHALL exempt every unresolved orphan
journal from mutation blocking instead of only the named one. When the named journal's own journal file is
a declared mutation target of another unresolved orphan journal (a failed recovery wrapper), recovery
SHALL settle that wrapper first and its feedback SHALL name that deterministic order; when several
unresolved orphan journals coexist, inspect and blocked-operation feedback SHALL expose one deterministic
first-recoverable journal coordinate with the exact `recover-transaction` rerun, never a mutual rerun loop
between journals. A valid non-suspect v2
global holder SHALL return `busy`; an unpaired/malformed/unresolved-legacy/suspect held lock, incomplete or
malformed legacy proof, unsafe target, or digest difference SHALL return `missing_contract` under the suspect root. A request for an
already `committed` or `rolled_back` v2 journal SHALL return that settled disposition idempotently with no
mutation. A v1 journal SHALL never be recovered, marked committed, or rewritten by this operation. The
operation SHALL change no original target authority, shall never infer or write `committed`, and shall not
steal/delete a lock. No age-based sweeper, generic repair controller, batch cleanup, deletion-by-glob, or
manual deletion advice is authorized by this requirement.

#### Scenario: concurrent formal submits receive structured contention feedback

- **WHEN** one formal submit owns the global work-unit transaction lock with a readable matching active
  `started` journal and another formal submit for a different or identical work ID begins
- **THEN** the second command SHALL return structured `busy` feedback before candidate or authority mutation
- **AND** the first command MAY complete normally
- **AND** the second result SHALL name one wait-and-rerun action for its original work ID
- **AND** it SHALL name holder and caller coordinates separately rather than treating the holder as the
  caller attempt's logical actor

#### Scenario: dry-submit checks submit-owned integrity but not a Gate

- **WHEN** dry-submit evaluates a claimed candidate whose result, receipt, and direct outputs are valid
- **THEN** it SHALL also report whether submit-owned ledger/index/queue/journal facts permit formal submit
- **AND** it SHALL not report that a Wave Gate will pass or evaluate Gate-owned content and coverage facts

#### Scenario: active transaction prevents timeout terminalization

- **WHEN** `timeout-preflight` observes a matching readable active `started` journal whose target set contains
  the claimed attempt
- **THEN** it SHALL report that timeout cannot terminalize the attempt while that direct transaction fact
  is active
- **AND** it SHALL return the same structured wait/rerun boundary as submit contention
- **AND** neither default nor forced timeout SHALL bypass that transaction-integrity root
- **AND** it SHALL not claim that the journal owner will complete

#### Scenario: malformed or legacy contention is suspect rather than an indefinite wait

- **WHEN** a lock or journal is unpaired, unreadable, target-mismatched, proof-incomplete, legacy, or
  explicitly `suspect`
- **THEN** submit preflight, inspect, and timeout-preflight SHALL return one `suspect_transaction` root
- **AND** they SHALL not suggest waiting indefinitely, force-timeout terminalization, or manual deletion

#### Scenario: unresolved v1 journal remains a mutation blocker

- **WHEN** the transaction directory contains a v1 journal whose status is `started` or `failed`, or a
  malformed journal carrying an unresolved legacy shape
- **THEN** submit preflight, inspect, and timeout-preflight SHALL return `suspect_transaction` before any
  authority mutation
- **AND** they SHALL not infer rollback from age, clean-looking targets, or the absence of a current lock

#### Scenario: committed v1 journal is not current transaction evidence

- **WHEN** a submitted predecessor can establish its original acceptance only from a committed v1 journal
- **THEN** declaration recovery and supersession SHALL stop at the existing `missing_contract` proof boundary
  before acceptance interpretation
- **AND** inspect and Gate-derived ledger readers SHALL not derive a current acceptance or historical lineage
  conclusion from those bytes
- **AND** they SHALL not treat the v1 bytes as a committed current transaction or rewrite the journal

#### Scenario: complete committed v1 history does not block current mutation

- **WHEN** the transaction directory contains one structurally complete committed v1 journal and no other
  transaction blocker
- **THEN** it SHALL not independently return `busy` or `suspect_transaction` for a new current v2 mutation
- **AND** it SHALL not establish any current transaction, acceptance, recovery, supersession, or provenance
  authority

#### Scenario: malformed committed-looking v1 history remains suspect

- **WHEN** a transaction file carries the v1 marker and `status: committed` but omits or violates a required
  legacy journal fact
- **THEN** submit preflight, inspect, and timeout-preflight SHALL return `suspect_transaction` before any
  authority mutation
- **AND** they SHALL not treat the bare status marker as a settled transaction or diagnostic-safe file

#### Scenario: proven rollback journal is not a permanent blocker

- **WHEN** a prior v2 transaction has durable evidence that every declared mutable target matches its exact
  before-existence/digest
- **THEN** its disposition SHALL be `rolled_back`
- **AND** submit integrity and Gate presence checks SHALL not fail solely because that audit journal remains
- **AND** the journal SHALL remain available as diagnostic history

#### Scenario: concurrent non-authority writes do not mark a transaction suspect

- **WHEN** a transaction callback writes only its declared mutation targets while another process writes
  unrelated bundle paths outside the work-unit authority surface (for example delegated `_cache/` fetch
  outputs or run-scoped `_scripts/` files) during the transaction window
- **THEN** the transaction SHALL commit normally and its journal SHALL NOT be marked `suspect`
- **AND** those concurrent writes SHALL NOT appear as undeclared targets of the transaction
- **AND** a later rollback SHALL remain proof-complete when every declared target is restored, independent
  of those concurrent writes

#### Scenario: authority-surface undeclared writes remain fail-closed

- **WHEN** a transaction callback writes a work-unit authority-surface path (work-unit state, index, queue,
  or the root output declaration ledger) outside its declared mutation manifest
- **THEN** the transaction SHALL stop and the journal SHALL be recorded `suspect` with the undeclared
  authority paths named
- **AND** the fail-closed boundary SHALL not depend on writes to non-authority bundle paths

#### Scenario: one journal can be recovered only with declared proof

- **WHEN** `recover-transaction` receives one unlocked v2 `started`/`suspect` journal ID with a complete
  exact-path before-image manifest and every declared target still matches
- **THEN** it MAY record that journal as `rolled_back`
- **AND** it SHALL not change any ledger row, result, queue item, lease, or unrelated journal
- **AND** when the proof is absent or inconsistent, it SHALL return `missing_contract`

#### Scenario: two orphan journals are settled in dependency order without deadlock

- **WHEN** the transaction directory holds two unresolved orphan v2 journals and one of them declares the
  other's journal file as a mutation target (a failed recovery wrapper)
- **THEN** `recover-transaction` for the wrapped journal SHALL first settle the wrapper or name that exact
  dependency order in its feedback
- **AND** a legal sequence of `recover-transaction` calls SHALL settle both journals without hand-editing
  journal bytes
- **AND** blocked work-unit operations during the multi-orphan state SHALL expose one deterministic
  first-recoverable journal coordinate with the exact `recover-transaction` rerun

#### Scenario: recovery stays available while other orphans exist

- **WHEN** `recover-transaction` targets one unlocked v2 `started`/`suspect` journal whose proof is complete
  while a different unresolved orphan journal remains in the transaction directory
- **THEN** the recovery transaction SHALL NOT be blocked solely by that other orphan journal
- **AND** it SHALL settle only its named target and leave the other orphan to its own recovery call

#### Scenario: active transaction recovery does not steal a lock

- **WHEN** `recover-transaction` targets a non-suspect v2 journal still referenced by a valid matching global
  lock owner
- **THEN** it SHALL return structured `busy` and the same recovery-operation rerun
- **AND** it SHALL not mark the journal rolled back, remove the lock, infer process death, or mutate any target

#### Scenario: settled transaction recovery is idempotent

- **WHEN** `recover-transaction` targets an already `committed` or `rolled_back` v2 journal and no global
  transaction blocks the command
- **THEN** it SHALL return the existing settled disposition without mutation
- **AND** it SHALL not create recovery authority, rewrite audit history, or reinterpret `committed` as rollback

### Requirement: Submitted correction SHALL use audited supersession and one fresh successor

For a complete current submitted predecessor, submitted correction SHALL retain
the existing immutable `work-unit.supersession.v1` relation, one fresh
successor, exact direct-parent lineage, transaction binding, and rule that only
the unique current lineage leaf with a normal current ledger row can provide
current coverage. A predecessor remains historical only after that current
relation validates; it never supplies a second current success path.

Supersession, historical-predecessor inspection, and replacement planning SHALL
first require the complete current profile. They SHALL not validate a
markerless predecessor through a legacy acceptance tuple, accept v1/v2 output
interpretation, or reconstruct actor provenance for an unrecorded attempt. When an acceptance
tuple is required, its original-submit transaction evidence SHALL be one committed
`work-unit.transaction.v2` journal bound to the current trace event; a committed v1 journal SHALL not satisfy
that requirement. A complete-current-profile predecessor without that v2 proof SHALL stop at
`missing_contract` rather than creating a successor, recovering a declaration, or treating the predecessor as
historical acceptance.

#### Scenario: Complete current predecessor retains correction path

- **WHEN** a complete current submitted predecessor has one eligible direct
  correction root
- **THEN** Engine supersession SHALL retain its existing audited successor and
  rollback behavior
- **AND** the predecessor SHALL remain historical rather than current coverage
  after a valid relation is committed

#### Scenario: Historical predecessor cannot establish supersession facts

- **WHEN** a candidate predecessor uses an old assignment, markerless
  submission, or unrecorded actor representation
- **THEN** supersession SHALL return `unsupported_current_contract` before
  validating a predecessor acceptance tuple
- **AND** it SHALL not create a successor or reinterpret the predecessor as a
  valid historical relation

#### Scenario: readable hash drift creates one audited successor relation

- **WHEN** a submitted work unit's current result bytes no longer match its hash-valid submitted ledger row
- **AND** `supersede` verifies that direct post-submit drift
- **AND** predecessor index/status/terminal-queue authority remains exact
- **THEN** it SHALL preserve the ledger row and `status: submitted`, write one immutable
  supersession relation, and create exactly one fresh lineage-bound successor queue demand
- **AND** the successor or its unique legal current lineage leaf SHALL require ordinary claim and a hash-valid
  row through the existing normal submit or audited late-submit contract before it can produce current coverage

#### Scenario: lost supersession response replays the original relation

- **WHEN** supersession committed one valid relation and exact successor but the caller did not receive the
  response
- **AND** the caller repeats `supersede` for the same predecessor with a different non-empty audit reason
- **THEN** the operation SHALL return the original relation and successor's current ordinary location
- **AND** it SHALL not rewrite immutable audit fields, rerun correction as a new transaction, or create a sibling

#### Scenario: exact declaration recovery takes precedence

- **WHEN** a submitted work unit's target ledger row is missing and the existing declaration-recovery
  evaluator can reproduce the hash-identical accepted row
- **THEN** `supersede` SHALL reject without authority mutation and return `recover-declaration` as the sole
  nearest operation
- **AND** after recovery the same inspect/Gate checkpoint SHALL evaluate the normal current row

#### Scenario: missing ledger can be superseded only with durable acceptance evidence

- **WHEN** a `work-unit.submission.v1` work unit's ledger row is missing or attributable-but-drifted and exact
  declaration recovery is unavailable
- **AND** its immutable acceptance fingerprint plus exact index/status/terminal-queue facts and a committed
  current `work-unit.transaction.v2` original-submit trace binding establish the accepted predecessor
- **THEN** `supersede` MAY create its one audited successor relation after all other direct eligibility facts
  are verified
- **AND** it SHALL not reconstruct, sync, or recompute the missing ledger row or its hashes

#### Scenario: committed v1 evidence cannot authorize correction

- **WHEN** a submitted predecessor's only original-submit transaction proof is a committed
  `work-unit.transaction.v1` journal
- **THEN** `supersede` and declaration recovery SHALL return `missing_contract` before evaluating acceptance
- **AND** Gate and inspect SHALL not derive a current acceptance or historical lineage conclusion from the
  v1 bytes
- **AND** they SHALL not create a successor, restore a declaration, or classify the predecessor as current
  historical acceptance

#### Scenario: legacy missing ledger without the full acceptance tuple fails closed

- **WHEN** a historical submitted work unit's ledger row is missing or
  attributable-but-drifted
- **AND** its old submission-presence facts are absent, compatible, or
  incompatible
- **THEN** `supersede`, submit preflight, Gate, and inspect SHALL return
  `unsupported_current_contract` before evaluating an acceptance tuple
- **AND** they SHALL not infer acceptance, create a successor, or mutate the
  historical record

#### Scenario: unattributable ledger corruption cannot be isolated as historical

- **WHEN** the declaration JSONL contains an unparseable, duplicate, or otherwise corrupt row that cannot be
  uniquely attributed to the targeted predecessor work ID
- **THEN** `supersede`, submit preflight, Gate, and inspect SHALL fail on one ledger-integrity root
- **AND** they SHALL not ignore the row, create a successor, or treat unrelated current rows as trustworthy

#### Scenario: valid historical result is not replaced because a late actor returned more content

- **WHEN** a late delegated actor returns a richer candidate after a valid current submitted attempt exists
- **AND** no direct post-submit integrity drift is present
- **THEN** `supersede` SHALL reject without authority mutation
- **AND** feedback SHALL identify the existing supplementary-work or semantic decision boundary instead of
  replacing the submitted attempt

#### Scenario: supersession preserves pre-existing submitted authority

- **WHEN** supersession is accepted for a submitted attempt
- **THEN** it SHALL not modify the predecessor's status, any existing ledger row, any marked accepted fingerprint,
  original result, receipt, cache declarations, or terminal-history `done` record
- **AND** Gate/inspect SHALL be able to audit both the immutable predecessor and its one successor relation

#### Scenario: legacy hash drift is not silently synchronized

- **WHEN** a historical index hash mirror disagrees with a submitted ledger row
- **THEN** submit/Gate/inspect SHALL return `unsupported_current_contract`
  before comparing the mirrors
- **AND** they SHALL not offer a recompute-hashes, sync-index, or supersession
  command for that attempt

#### Scenario: markerless and marked hash representations do not mix

- **WHEN** a new claim carries `work-unit.submission.v1`
- **THEN** formal submit SHALL write one index acceptance fingerprint and no index/status current hash mirrors
- **AND** a markerless historical attempt SHALL return
  `unsupported_current_contract` rather than retain a compatibility
  representation
- **AND** a partial, unknown, or conflicting marker/mirror combination SHALL
  fail at the same boundary rather than select a branch from current framework
  version

### Requirement: Affected delegated work SHALL receive current intent through the existing task brief

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
