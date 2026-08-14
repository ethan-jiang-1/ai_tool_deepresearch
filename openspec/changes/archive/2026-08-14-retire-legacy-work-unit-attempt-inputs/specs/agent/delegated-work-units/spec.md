## MODIFIED Requirements

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
interpretation, or reconstruct actor provenance for an unrecorded attempt. The
Engine SHALL return `unsupported_current_contract` rather than creating a
successor, recovering a declaration, or treating such an attempt as historical
acceptance.

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
- **AND** its immutable acceptance fingerprint plus exact index/status/terminal-queue/original-submit
  transaction/trace facts establish the accepted predecessor
- **THEN** `supersede` MAY create its one audited successor relation after all other direct eligibility facts
  are verified
- **AND** it SHALL not reconstruct, sync, or recompute the missing ledger row or its hashes

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
