# work-unit-submission Specification

> req: WSU-001, WSU-002, WSU-003, WSU-004, WSU-005, WSU-006, WSU-007, WSU-008

## Purpose

Authoritative recording of delegated work completion: submit as the sole successful completion path, canonicalization, durable postconditions, ledger coverage, and fail-closed hash drift detection. Split from `agent/delegated-work-units` (2026-09 capability identity migration); engine modules do not move.


## Requirements

### Requirement: Submit SHALL remain the only successful delegated completion authority

> req: WSU-001

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

> req: WSU-002

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

### Requirement: Submit canonicalization SHALL stay a narrow bounded stage

> req: WSU-003

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

> req: WSU-004

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

### Requirement: Current Wave0 work-unit contracts SHALL expose submitted source contributions without a competing rich-reference route

> req: WSU-005

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

### Requirement: Gates SHALL read submitted work-unit ledger coverage

> req: WSU-006

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

### Requirement: Submitted result and ledger hashes SHALL detect post-submit drift before gate pass

> req: WSU-007

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

> req: WSU-008

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
