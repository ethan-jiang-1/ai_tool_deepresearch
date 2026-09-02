## REMOVED Requirements

### Requirement: Work-unit envelope SHALL carry binding surfaces

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

### Requirement: Submit SHALL be the only successful delegated completion transition

> req: DEW-005

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

### Requirement: Work-unit tasks SHALL expose bundle-root absolute paths and write-before-return verification

> req: DEW-009

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

> The historical scenario name is retained only as the OpenSpec delta-sync key.
> The absolute-runtime-root behavior it described is now owned solely by the
> scenario "Claimed task contains one canonical absolute runtime root"; this
> scenario no longer states an independent requirement.

- **WHEN** `operate-work-unit claim` generates task, beacon, spawn/claim output, or CLI examples naming runtime paths for a current run bundle
- **THEN** the SHALL-level behavior is governed by the scenario "Claimed task contains one canonical absolute runtime root"
- **AND** this scenario SHALL NOT be read as a second, independent absolute-path requirement

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

### Requirement: Work-unit submit SHALL canonicalize only bounded LLM-shaped submit drift before strict validation

> req: DEW-012

`operate-work-unit submit` SHALL run a narrow canonicalization step before strict result, receipt, output, cache, nonce, queue, hash, and ledger validation. Canonicalization SHALL be limited to predictable LLM-shaped drift that can be safely tied back to the claimed work-unit record. It SHALL NOT create new authority, bypass work-unit identity, accept path escapes, or relax downstream ledger/gate coverage.

Allowed canonicalization is limited to:

- unwrapping a submitted JSON object whose only top-level key is `result`;
- filling a missing receipt `schema_version` with the current receipt-event schema literal. Missing receipt binding identity fields (`work_id`, `queue_item_id`, `kind`, `receipt_nonce`) SHALL NOT be filled or reconstructed: a receipt event that omits any of them SHALL be rejected under the strict current-attempt binding boundary (DEW-004), which every current attempt passes;
- materializing `page-content.md` as canonical `page.md` inside the same declared cache leaf when the canonical page file is missing, or accepting an identical non-authority sidecar when both files exist;
- nonce correction is not canonicalization: a result/receipt `receipt_nonce` that differs from the Engine record nonce SHALL be rejected regardless of binding completeness or where the submitted result path resolves (DEW-004). The historical containment-gated nonce normalization is retired and unreachable for current attempts.

Runtime receipt `detail` is optional diagnostic presentation, not identity or completion authority. The receipt schema SHALL accept either a keyed JSON object or a human-readable string at `detail` without creating a normalization event or rewriting one form into the other. Array, number, boolean, null, malformed JSONL, conflicting identity, and conflicting schema values SHALL remain invalid. Timeout-preflight, submit, inspect and Gate consumers SHALL NOT derive progress/coverage authority from the contents or shape of `detail`.

Accepted submit transactions SHALL persist canonical authority surfaces before reporting success: assigned `result.json` SHALL contain the canonical flat result, assigned `runtime-receipt.jsonl` SHALL contain canonical receipt events, declared cache leaves SHALL contain canonical `page.md`, and ledger rows SHALL be built from canonical data. Any normalization SHALL be visible through structured diagnostics in submit output, trace, log, or an equivalent Engine diagnostic surface. Invalid submit SHALL remain non-terminal and SHALL NOT append a ledger row or complete queue demand.

This requirement SHALL NOT remove the existing ability to submit a candidate `resultPath` from a temporary or caller-provided location when all identity fields already match. Assigned-directory containment no longer gates any canonicalization step; it is validation input only. In every successful case, the Engine SHALL still persist the accepted canonical result to the assigned work-unit `result_ref`.

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
- **THEN** submit SHALL fill only a missing `schema_version` and SHALL reject any event with a missing or conflicting binding identity field under the strict current-attempt binding boundary, before ledger append
- **AND** the assigned `runtime-receipt.jsonl` SHALL be persisted in canonical JSONL form before submit reports success only when every event passed the strict binding check
- **AND** diagnostics SHALL identify the receipt line numbers and the defaulted schema version; the historical receipt binding identity autofill is retired and unreachable for current attempts (the scenario title is retained only as the OpenSpec delta-sync key)

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
- **THEN** submit SHALL still reject the nonce mismatch as non-terminal; the Engine record nonce SHALL NOT be substituted and no nonce normalization SHALL be recorded
- **AND** no assigned `result.json` or `runtime-receipt.jsonl` bytes SHALL be rewritten with a canonical record nonce
- **AND** the historical normalization diagnostics are retired; the scenario title is retained only as the OpenSpec delta-sync key

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

> req: DEW-013

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

> req: DEW-014

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

### Requirement: Submit SHALL expose a bounded integrity preflight and transaction disposition

> req: DEW-023

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
operational authority or conceal an undeclared authority write. The undeclared-mutation attribution
surface SHALL be the transaction's own target work-unit directories (`_work_units/<wave>/<own-work-id>/`
for each work-id named in the transaction's target work ids) plus the root output declaration ledger,
within the work-unit root (`_work_units/`, excluding the global lock and the current transaction's own
journal). Every other work-unit directory (`_work_units/<wave>/<work-id>/` for a work-id not named in
the transaction's target work ids) is owned by that work unit's concurrent actor lifecycle; writes there
during the transaction window — including runtime-receipt appends and result/status writes by another
claimed actor — are not mutations made by this transaction. Bundle writes outside the transaction's
attributed surface during the transaction window — including delegated cache, run-scoped script,
diagnostics, reference, or artifact writes, and any write inside another work unit's directory, all
owned by other concurrent processes — SHALL NOT be attributed to the transaction as undeclared
mutations, SHALL NOT mark the journal `suspect`, and SHALL NOT make the rollback proof incomplete. A
callback write to a path inside the transaction's attributed surface (its own target work-unit
directories or the root output declaration ledger) outside the declared manifest SHALL remain a
fail-closed undeclared mutation. A journal may enter `started` only after its
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

#### Scenario: concurrent other-work-unit writes do not mark a transaction suspect

- **WHEN** another claimed work unit's actor writes inside its own work-unit directory (for example
  appending its `runtime-receipt.jsonl` or writing its result/status) during the transaction window of a
  submit for a different work unit
- **THEN** the submitting transaction SHALL commit normally and its journal SHALL NOT be marked `suspect`
- **AND** those concurrent writes SHALL NOT appear as undeclared targets of the transaction
- **AND** the other work unit's directory bytes SHALL remain untouched by the submit transaction and its
  rollback

#### Scenario: authority-surface undeclared writes remain fail-closed

- **WHEN** a transaction callback writes a path inside its own attributed surface (its own target
  work-unit directory state, the work-unit index, queue, or the root output declaration ledger) outside
  its declared mutation manifest
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

## ADDED Requirements

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

### Requirement: Submit SHALL remain the only successful delegated completion authority

> req: DEW-005

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

#### Scenario: normal submit still rejects timed-out attempts
- **WHEN** a work unit is `timed_out`
- **AND** a caller invokes normal `operate-work-unit submit`
- **THEN** submit SHALL reject
- **AND** no queue completion or ledger append SHALL occur

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

### Requirement: Successful submit SHALL complete queue demand and record contribution boundaries

For a complete current attempt, the submit owner SHALL preserve the existing
fresh direct-output evaluation, hash-bound queue snapshot, exact
manifest/beacon output-contract reconstruction, nonce/actor result and receipt
binding, transaction rollback, current Wave0 source contribution, and durable
queue postconditions. Current normal and audited late submit SHALL keep their
existing idempotence and fail-closed behavior.

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

#### Scenario: normal first submit rereads after dry-submit
- **WHEN** dry-submit passes and an assigned required output changes before normal formal submit
- **THEN** formal submit SHALL acquire a fresh snapshot and decide acceptance from that snapshot
- **AND** the earlier dry-submit PASS SHALL not authorize queue completion or ledger append

#### Scenario: current contract drift blocks first acceptance
- **WHEN** the index marker, manifest contract, beacon contract, or hash-bound queue snapshot cannot reconstruct one identical expected contract
- **THEN** normal submit SHALL reject before success mutation
- **AND** it SHALL not fall back to the legacy role normalizer or actor-declared contract data

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

### Requirement: Submit canonicalization SHALL stay a narrow bounded stage

> req: DEW-012

`operate-work-unit submit` SHALL run a narrow canonicalization step before strict result, receipt, output, cache, nonce, queue, hash, and ledger validation. Canonicalization SHALL be limited to predictable LLM-shaped drift that can be safely tied back to the claimed work-unit record. It SHALL NOT create new authority, bypass work-unit identity, accept path escapes, or relax downstream ledger/gate coverage.

Allowed canonicalization is limited to:
- unwrapping a submitted JSON object whose only top-level key is `result`;
- filling a missing receipt `schema_version` with the current receipt-event schema literal. Missing receipt binding identity fields (`work_id`, `queue_item_id`, `kind`, `receipt_nonce`) SHALL NOT be filled or reconstructed: a receipt event that omits any of them SHALL be rejected under the strict current-attempt binding boundary (DEW-004), which every current attempt passes;
- materializing `page-content.md` as canonical `page.md` inside the same declared cache leaf when the canonical page file is missing, or accepting an identical non-authority sidecar when both files exist;
- nonce correction is not canonicalization: a result/receipt `receipt_nonce` that differs from the Engine record nonce SHALL be rejected regardless of binding completeness or where the submitted result path resolves (DEW-004). The historical containment-gated nonce normalization is retired and unreachable for current attempts.

Runtime receipt `detail` is optional diagnostic presentation, not identity or completion authority. The receipt schema SHALL accept either a keyed JSON object or a human-readable string at `detail` without creating a normalization event or rewriting one form into the other. Array, number, boolean, null, malformed JSONL, conflicting identity, and conflicting schema values SHALL remain invalid. Timeout-preflight, submit, inspect and Gate consumers SHALL NOT derive progress/coverage authority from the contents or shape of `detail`.

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
- **THEN** submit SHALL fill only a missing `schema_version` and SHALL reject any event with a missing or conflicting binding identity field under the strict current-attempt binding boundary, before ledger append
- **AND** the assigned `runtime-receipt.jsonl` SHALL be persisted in canonical JSONL form before submit reports success only when every event passed the strict binding check
- **AND** diagnostics SHALL identify the receipt line numbers and the defaulted schema version; the historical receipt binding identity autofill is retired and unreachable for current attempts (the scenario title is retained only as the OpenSpec delta-sync key)

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

### Requirement: Accepted submits SHALL persist canonical authority without widening the boundary

Accepted submit transactions SHALL persist canonical authority surfaces before reporting success: assigned `result.json` SHALL contain the canonical flat result, assigned `runtime-receipt.jsonl` SHALL contain canonical receipt events, declared cache leaves SHALL contain canonical `page.md`, and ledger rows SHALL be built from canonical data. Any normalization SHALL be visible through structured diagnostics in submit output, trace, log, or an equivalent Engine diagnostic surface. Invalid submit SHALL remain non-terminal and SHALL NOT append a ledger row or complete queue demand.

This requirement SHALL NOT remove the existing ability to submit a candidate `resultPath` from a temporary or caller-provided location when all identity fields already match. Assigned-directory containment no longer gates any canonicalization step; it is validation input only. In every successful case, the Engine SHALL still persist the accepted canonical result to the assigned work-unit `result_ref`.

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
- **THEN** submit SHALL still reject the nonce mismatch as non-terminal; the Engine record nonce SHALL NOT be substituted and no nonce normalization SHALL be recorded
- **AND** no assigned `result.json` or `runtime-receipt.jsonl` bytes SHALL be rewritten with a canonical record nonce
- **AND** the historical normalization diagnostics are retired; the scenario title is retained only as the OpenSpec delta-sync key

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

### Requirement: Dry-submit SHALL be a read-only structured preflight mirroring submit semantics

> req: DEW-013

The work-unit CLI SHALL provide a dry-submit preflight for claimed work units. Dry-submit SHALL read a candidate result and evaluate the same deterministic submit contract used by formal `operate-work-unit submit` wherever possible, including work-unit identity, queue binding, manifest/index consistency, result schema, runtime receipt, nonce, output files, source claims, cache trails, and kind output contract constraints.

Dry-submit and formal submit SHALL obtain `output_files` requiredness from the immutable current assignment output contract, together with its `required_outputs[]`, rather than retain an independent generic non-empty-output rule. A snapshot-bound `work-unit.assignment.v3` supplementary `wave1_topic_deepening` assignment with empty required_outputs SHALL accept `output_files: []`; it SHALL still validate all applicable result schema, identity, receipt, source-claim, accepted-URL, cache/degraded-capture, queue and provenance facts. A v3 assignment with one or more required outputs SHALL continue to require and validate those exact path/role declarations. Empty required_outputs alone SHALL not select supplementary semantics or weaken another kind's existing output contract. An attempt with v1/v2 assignment, a missing marker, markerless submission, or missing actor binding SHALL return `unsupported_current_contract` before dry-submit derives an output contract, validates a candidate, or reports a repair action.

Dry-submit SHALL be read-only. It SHALL NOT append `rb_output_declarations.jsonl`, complete queue demand, mutate `rb_queue.json`, change work-unit terminal/claimed status, write canonical result/receipt/cache files, record `last_submit_rejection`, create `_work_units/_transactions/` entries, write submit trace/log side effects, or emit success authority that gates may consume. Formal submit remains the only successful delegated completion transition.

Dry-submit output SHALL be structured enough for Agent repair. It SHALL report whether formal submit is expected to pass, the checked `work_id`, reason codes or violation codes, repair-targeted diagnostics, and any narrow normalizations formal submit would perform. Every primary independently evaluable violation SHALL include `repair_kind`, `missing_fact`, `write_to`, and `rerun`; dependent checks blocked by an earlier prerequisite SHALL be masked or marked dependent instead of being presented as additional repair tasks. Failed dry-submit SHALL still return structured preflight JSON rather than only throwing a stderr error. Normalization reporting SHALL NOT persist those normalizations during dry-submit.

Dry-submit SHALL mirror formal submit candidate path semantics. A candidate result path MAY be temporary or caller-provided when formal submit would allow it. The assigned work-unit directory containment rule SHALL remain limited to nonce normalization eligibility and SHALL NOT become a new dry-submit-only path restriction.

Dry-submit SHALL avoid validation branches that write as part of canonicalization. When formal submit would canonicalize cache `page-content.md` into `page.md`, canonical receipt JSONL, or assigned result JSON, dry-submit SHALL report the planned normalization without writing those files. Dry-submit SHALL validate the in-memory virtual canonical view that formal submit would validate, so read-only preflight does not reject a candidate solely because the canonical file has not been persisted yet.

Dry-submit SHALL accumulate independently evaluable violations so the Agent can repair multiple issues in one pass. If one failed check prevents dependent checks from running, dry-submit SHALL report that dependency rather than inventing validation results.

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

### Requirement: Dry-submit SHALL keep provenance strict through one neutral target module

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

### Requirement: Timeout preflight SHALL be a progress-aware read-only recommendation

> req: DEW-014

The work-unit CLI SHALL provide a timeout preflight for claimed work units. Timeout preflight SHALL determine whether it is safe to terminalize a claimed work-unit attempt as `timed_out` by evaluating Engine-observed progress, candidate result state, dry-submit-equivalent diagnostics, queue binding, and effective idle lease state.

Timeout preflight SHALL accept an explicit current run bundle path, `work_id`, and optional candidate `result` path. When no candidate result path is supplied, preflight SHALL inspect the assigned result path from the work-unit record. When a candidate result path is supplied, preflight SHALL evaluate it under submit/dry-submit-equivalent candidate path rules. A supplied candidate result path outside the assigned work-unit directory SHALL be a validation input only: its mtime SHALL NOT extend the work-unit idle lease by itself, though dry-submit-equivalent validation MAY still recommend `submit` or `repair`. It SHALL fail closed for missing or invalid work-unit index records, non-claimed attempts, missing manifests, missing queue in-flight binding, or binding drift. It SHALL return structured JSON for both timeout-eligible and timeout-ineligible cases. The output SHALL include the checked `work_id`, `queue_item_id`, current status, `timeout_eligible`, `check`, `recommended_action`, nullable `candidate_projection`, progress summary, `initial_deadline_at`, `lease_anchor_at`, `idle_timeout_ms`, `effective_timeout_at`, `inspect[]`, and repair-oriented `advice[]`.

`recommended_action` SHALL be a closed value: `submit`, `repair`, `wait`, `timeout`, `inspect`, or `block`. Timeout-preflight CLI exit status SHALL follow `timeout_eligible`: exit success only when timeout is currently safe, and exit non-zero when timeout is unsafe or the work-unit state is invalid. When the work-unit context can be loaded, non-zero preflight outcomes SHALL still emit structured JSON for Agent feedback.

Timeout-preflight output SHALL be validated by an Engine-owned schema before it is emitted. The schema SHALL make `timeout_eligible` and `check` consistent, SHALL constrain `recommended_action` to the closed action set, SHALL reuse the shared candidate-projection schema when `candidate_projection` is non-null, and SHALL keep progress details structured enough for tests and Phase Agent guidance to distinguish result, receipt, output/cache, idle lease, and binding diagnostics. Candidate projection SHALL be null when no candidate was evaluated; preflight SHALL NOT synthesize a candidate action or primary root code from timeout state alone.

The timeout-preflight helper/API SHALL accept an injectable clock for tests, while CLI invocations SHALL use the real current time. Tests SHALL NOT depend on sleeping to cross timeout boundaries. Filesystem mtime comparisons SHALL be made against the injected or real current time and the work-unit `claimed_at`. File mtimes in the future relative to the chosen current time SHALL be diagnosed as suspicious and SHALL NOT extend the effective lease beyond the chosen current time plus the idle timeout window.

Timeout eligibility SHALL be progress-aware. The existing `deadline_at` SHALL remain an initial lease hint, but terminal timeout eligibility SHALL use an effective idle lease derived from `lease_anchor_at + idle_timeout_ms`. `latest_engine_observed_progress_at` SHALL mean actual Engine-observed progress and SHALL NOT be populated from `claimed_at` merely to support timeout arithmetic. `lease_anchor_at` SHALL be the latest Engine-observed progress time when progress exists, or `claimed_at` when no progress exists. The default idle timeout window SHALL be the work-unit `timeout_ms` unless an accepted explicit runtime/profile surface provides a narrower value. If there is no observed progress after claim, effective timeout eligibility SHALL fall back to `claimed_at + idle_timeout_ms`, which matches the existing `claimed_at + timeout_ms` behavior when the default idle timeout is used.

Engine-observed progress SHALL come from deterministic bundle-root surfaces such as assigned candidate result files, runtime receipt/log content and mtime tied to the same identity, declared output/cache files under current run bundle root, assigned work-unit refs, and Engine trace/log events tied to the same `work_id`. Undeclared random files, path-escape refs, and identity-mismatched surfaces SHALL NOT extend the idle lease. Agent-authored receipt timestamps SHALL NOT be the sole authority for progress freshness. Progress diagnostics SHALL identify the source type, observed timestamp when available, path or event ref when available, whether work-unit identity was verified, whether the source extended the idle lease, and whether a suspicious timestamp was detected.

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

### Requirement: Timeout terminalization SHALL run the same guard with explicit audit

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

### Requirement: Submit integrity SHALL share one read-only transaction fact

> req: DEW-023

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

### Requirement: Journal disposition SHALL be a closed enum with declared recovery boundaries

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
operational authority or conceal an undeclared authority write. The undeclared-mutation attribution
surface SHALL be the transaction's own target work-unit directories (`_work_units/<wave>/<own-work-id>/`
for each work-id named in the transaction's target work ids) plus the root output declaration ledger,
within the work-unit root (`_work_units/`, excluding the global lock and the current transaction's own
journal). Every other work-unit directory (`_work_units/<wave>/<work-id>/` for a work-id not named in
the transaction's target work ids) is owned by that work unit's concurrent actor lifecycle; writes there
during the transaction window — including runtime-receipt appends and result/status writes by another
claimed actor — are not mutations made by this transaction. Bundle writes outside the transaction's
attributed surface during the transaction window — including delegated cache, run-scoped script,
diagnostics, reference, or artifact writes, and any write inside another work unit's directory, all
owned by other concurrent processes — SHALL NOT be attributed to the transaction as undeclared
mutations, SHALL NOT mark the journal `suspect`, and SHALL NOT make the rollback proof incomplete. A
callback write to a path inside the transaction's attributed surface (its own target work-unit
directories or the root output declaration ledger) outside the declared manifest SHALL remain a
fail-closed undeclared mutation. A journal may enter `started` only after its
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

#### Scenario: concurrent other-work-unit writes do not mark a transaction suspect
- **WHEN** another claimed work unit's actor writes inside its own work-unit directory (for example
  appending its `runtime-receipt.jsonl` or writing its result/status) during the transaction window of a
  submit for a different work unit
- **THEN** the submitting transaction SHALL commit normally and its journal SHALL NOT be marked `suspect`
- **AND** those concurrent writes SHALL NOT appear as undeclared targets of the transaction
- **AND** the other work unit's directory bytes SHALL remain untouched by the submit transaction and its
  rollback

#### Scenario: authority-surface undeclared writes remain fail-closed
- **WHEN** a transaction callback writes a path inside its own attributed surface (its own target
  work-unit directory state, the work-unit index, queue, or the root output declaration ledger) outside
  its declared mutation manifest
- **THEN** the transaction SHALL stop and the journal SHALL be recorded `suspect` with the undeclared
  authority paths named
- **AND** the fail-closed boundary SHALL not depend on writes to non-authority bundle paths

### Requirement: Transaction recovery SHALL settle journals without stealing locks

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

