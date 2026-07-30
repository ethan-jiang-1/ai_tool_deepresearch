> req: DEW-022, DEW-023, DEW-024

## ADDED Requirements

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
reference, or cross-work-unit verdict. Formal submit SHALL rerun that same evaluator after acquiring the
global transaction lock; a prior dry-submit result SHALL not authorize commit.

Work-unit transaction acquisition contention SHALL return a structured non-mutating `busy` result rather
than a raw filesystem exception only when a schema-valid global lock-owner record names one schema-valid
non-suspect `work-unit.transaction.v2` journal with the same transaction ID, operation, journal ref, and target
work/queue coordinates. It SHALL identify the caller's requested operation/work ID separately from the
holder's transaction/operation/target coordinates, expose the holder journal disposition, state whether a
`started` holder targets the same attempt, and return one `wait` / caller-same-operation rerun coordinate. A
paired `committed`/`rolled_back` journal whose owner lock is awaiting final release remains global busy but
SHALL NOT be described as an active attempt mutation. Busy SHALL not label the candidate invalid, claim that
the actor or process is live, or recommend terminalization. A busy contender SHALL not re-claim work,
overwrite a result, write a ledger row, alter a lease, or create a blocking `started` journal.

`timeout-preflight` SHALL read the same direct transaction fact. Any valid non-suspect v2 global holder SHALL
prevent the concurrent timeout mutation and return busy/rerun. When a `started` holder's target set contains
the checked work ID, timeout-preflight SHALL classify same-attempt transaction protection; neither default nor
forced timeout may terminalize, requeue, or otherwise mutate that attempt while the fact is active. A holder
for another work ID or a settled journal awaiting final lock release SHALL not be described as the checked
attempt's owner or progress. An unpaired, unreadable, target-mismatched, proof-incomplete, legacy, or
`suspect` lock/journal SHALL return `suspect_transaction`, not `busy`, and SHALL not make a liveness inference.
Age SHALL not classify a transaction as stale or dead.

Each new journal SHALL use `schema_version: work-unit.transaction.v2`; existing v1 journals SHALL remain an
explicit read-only legacy branch and SHALL NOT gain v2 recovery semantics by framework-version inference.
Before the first durable target mutation, each v2 journal SHALL declare a complete exact-path mutation
manifest. Each entry SHALL contain one canonical bundle-relative rollback-owned target, its before-existence,
and its 256-bit SHA-2 before-digest when present. The manifest SHALL cover every authority and canonicalization file
the operation may write; it SHALL contain no glob, implicit recursive directory, unsafe path, or
post-first-write target discovery. The current transaction's own lock/journal and append-only diagnostic
trace/run-log writes are metadata/audit surfaces rather than rollback targets; they SHALL NOT establish
operational authority or conceal an undeclared authority write. A journal may enter `started` only after its
declaration and lock-owner binding are durable.

A journal's transient `started` state is an active direct fact. Its durable post-operation disposition SHALL
be one of `committed`, `rolled_back`, or `suspect`; only `committed` and `rolled_back` are settled, while
`suspect` remains unresolved and MAY transition only to proof-verified `rolled_back` through the bounded
recovery operation below. A failed mutation whose Engine-owned rollback has restored every
declared target to its exact before-existence/digest SHALL be recorded as `rolled_back` and SHALL not block
later submit/Gate work merely by existing on disk. A journal whose effect cannot be deterministically
classified SHALL remain `suspect`. Legacy `failed` journals without the new complete proof SHALL parse only
as suspect compatibility evidence; their age or current clean-looking state SHALL not fabricate rollback.

The transaction helper SHALL release its owner lock only after the mutation callback has stopped and the
helper has attempted its durable post-operation disposition. Lock release SHALL be the helper's final action,
and no declared target SHALL be written afterward. This ordering is the only Engine proof that permits an
unlocked v2 `started`/`suspect` journal to be compared; it SHALL NOT be described as host/process liveness.

`operate-work-unit recover-transaction <bundle> --tx-id <id>` SHALL be the sole transaction-recovery
operation. It MAY mark exactly one orphaned v2 `started`/`suspect` journal `rolled_back` only when no global
lock is held, its complete mutation manifest is valid, and every current target equals its before-image. The
prior journal SHALL be the only operational target of a normal recovery transaction. A valid non-suspect v2
global holder SHALL return `busy`; an unpaired/malformed/legacy/suspect held lock, incomplete/legacy proof,
unsafe target, or digest difference SHALL return `missing_contract` under the suspect root. A request for an
already `committed` or `rolled_back` journal SHALL return that settled disposition idempotently with no
mutation. The operation SHALL change no original target authority, shall never infer or write `committed`, and
shall not steal/delete a lock. No age-based sweeper, generic repair controller, batch cleanup, deletion-by-glob,
or manual deletion advice is authorized by this requirement.

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
- **THEN** it SHALL report that timeout cannot terminalize the attempt while that direct transaction fact is
  active
- **AND** it SHALL return the same structured wait/rerun boundary as submit contention
- **AND** neither default nor forced timeout SHALL bypass that transaction-integrity root
- **AND** it SHALL not claim that the journal owner will complete

#### Scenario: malformed or legacy contention is suspect rather than an indefinite wait

- **WHEN** a lock or journal is unpaired, unreadable, target-mismatched, proof-incomplete, legacy, or
  explicitly `suspect`
- **THEN** submit preflight, inspect, and timeout-preflight SHALL return one `suspect_transaction` root
- **AND** they SHALL not suggest waiting indefinitely, force-timeout terminalization, or manual deletion

#### Scenario: proven rollback journal is not a permanent blocker

- **WHEN** a prior transaction has durable evidence that every declared mutable target matches its exact
  before-existence/digest
- **THEN** its disposition SHALL be `rolled_back`
- **AND** submit integrity and Gate presence checks SHALL not fail solely because that audit journal remains
- **AND** the journal SHALL remain available as diagnostic history

#### Scenario: one journal can be recovered only with declared proof

- **WHEN** `recover-transaction` receives one unlocked v2 `started`/`suspect` journal ID with a complete
  exact-path before-image manifest and every declared target still matches
- **THEN** it MAY record that journal as `rolled_back`
- **AND** it SHALL not change any ledger row, result, queue item, lease, or unrelated journal
- **AND** when the proof is absent or inconsistent, it SHALL return `missing_contract`

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

An Engine operation `operate-work-unit supersede <bundle> --work-id <submitted_id> --reason <reason>`
SHALL be the sole correction/rework path for a current submitted attempt whose post-submit integrity check
finds an eligible attributable result/receipt/output/cache or ledger-row drift. Eligibility SHALL require an
exact submitted predecessor index/status binding, exactly one matching terminal-history `done` record with
the original queue snapshot, no existing conflicting successor, and no transaction-integrity root.
Index/status/terminal-queue drift, duplicate target rows, a malformed existing supersession relation, or
ledger corruption that cannot be attributed to the targeted work ID SHALL return `missing_contract` rather
than authorize supersession. `supersede` SHALL rerun the direct check itself; a caller-supplied reason is
audit context and SHALL not convert a merely better, late, or semantically preferred candidate into
correction eligibility.

Every new claim SHALL bind `submission_contract_version: work-unit.submission.v1` in index, manifest, and
beacon before actor work. Submit/readers SHALL select ledger-first behavior from that attempt-bound marker,
not current framework or bundle version; partial, unknown, or conflicting markers SHALL fail closed. At
original formal acceptance, a marked submitted index record SHALL retain exactly one immutable
`accepted_ledger_record_hash` relation to its accepted ledger row and its status file SHALL retain no current
`result_hash` or `ledger_record_hash` mirror. The accepted fingerprint is historical acceptance evidence, not
a second mutable current hash authority.

For a readable hash-valid current ledger row, that row remains the source used to verify direct drift. If the
target row is missing or is parseable/attributable to the work ID but fails row-hash/fingerprint integrity,
the existing declaration-recovery evaluator SHALL run first. When it can reproduce one exact hash-identical
row, `recover-declaration` SHALL be the sole nearest operation and `supersede` SHALL not mutate. Otherwise a
marked record MAY rely on its immutable fingerprint only together with exact submitted index/status,
terminal-queue, committed original submit transaction, and submit-trace binding. A legacy record MAY rely
only on the existing submission-presence evaluator's mutually compatible index, status, manifest, receipt,
terminal-queue, original submit transaction, and trace evidence; a lone legacy hash mirror, result file,
terminal row, trace event, or caller hash SHALL be insufficient. All other missing/drifted-ledger cases SHALL
return `missing_contract`.

Accepted supersession SHALL preserve every existing predecessor ledger byte, its `status: submitted`, any
marked index acceptance fingerprint, result/receipt/output/cache bytes, and terminal history. If the row is missing or
drifted, the operation SHALL not describe or reconstruct it as hash-valid history. It SHALL write exactly one
strict relation on that submitted index record containing exactly `schema_version:
work-unit.supersession.v1`, `predecessor_work_id`, `predecessor_queue_item_id`,
`accepted_ledger_record_hash`, `root_code`, `reason`, `recorded_at`, `tx_id`, and
`successor_queue_item_id`. The identity/hash fields SHALL bind the verified predecessor acceptance and the one
fresh successor, `reason` SHALL be trimmed and non-empty, `recorded_at` SHALL be an ISO 8601 timestamp, and
`tx_id` SHALL bind the committing supersession transaction. In the same transaction it SHALL create
one terminal-snapshot-derived ordinary successor demand whose direct-parent supersession lineage exactly
cross-checks that index relation. Gate/inspect SHALL derive historical non-current coverage only after both
sides match. The operation SHALL
create no new result, receipt, cache, ledger row, Gate pass, actor provenance, work ID, or queue completion;
its successor SHALL proceed only through current actor observation, ordinary claim, and the existing normal
submit or audited late-submit contract. Any
later timeout/replacement/supersession SHALL use only its existing ordinary owner and form one validated
acyclic lineage; only the unique current leaf's hash-valid existing submit/late-submit row SHALL establish
current coverage. Within a timeout-retry chain, the existing audited late-submit cleanup contract SHALL select
an eligible late-accepted timed-out attempt rather than greatest `attempt_index`; removed queued retry or an
abandoned claimed retry SHALL not become a sibling leaf, while a submitted retry SHALL block late-submit.

For a markerless legacy predecessor, the relation's `accepted_ledger_record_hash` SHALL be the original hash
established by the complete mutually compatible legacy acceptance tuple. Supersession SHALL NOT add the
standalone marked fingerprint, remove or rewrite legacy mirrors, or derive the relation field from one mirror,
one trace event, or caller input.

The v1 `root_code` SHALL be one of `submitted_declaration_missing`, `submitted_declaration_drift`,
`submitted_result_drift`, `submitted_runtime_receipt_drift`, `submitted_output_drift`, or
`submitted_cache_drift`. When more than one eligible surface is observed, the evaluator SHALL select the first
code in that order for the immutable relation while retaining all observed surfaces as diagnostics.
`submitted_declaration_missing` and `submitted_declaration_drift` SHALL first run the exact declaration-recovery
check described above; an ineligible authority conflict SHALL not be made eligible by root ordering.

After a complete relation and exact successor commit, every later `supersede` request for that predecessor
SHALL return the original relation and the successor's current ordinary location without mutation. A newly
supplied audit reason SHALL neither change the immutable `reason`, `recorded_at`, `tx_id`, root, or successor
nor create a conflicting relation. A partial/malformed relation or mismatching/missing successor SHALL fail on
relation integrity rather than complete, replace, or fork it. The operation itself SHALL perform no direct
reactivation of the parent queue item, rewrite of
terminal history, late-submit transition, index-from-ledger sync, ledger hash recomputation, or in-place result
replacement. When no direct
post-submit integrity drift exists, the operation SHALL reject with the existing semantic/supplementary
work boundary rather than treating richer late-arriving content as authority to replace a valid attempt.

For new current-version attempts, submitted hashes and delegated coverage SHALL be ledger-first: the
submitted ledger row is the only source for current `result_hash`, `ledger_record_hash`, and coverage. The
marked index retains the immutable `accepted_ledger_record_hash` relation and, when applicable, the immutable
supersession relation; marked index/status records SHALL not retain legacy current hash mirrors. Neither
relation is a current hash source. Markerless legacy duplicated hash fields remain fail-closed compatibility
evidence and SHALL not be rewritten by a general sync or recompute operation.

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

- **WHEN** a legacy submitted work unit's ledger row is missing or attributable-but-drifted
- **AND** its existing submission-presence index/status/manifest/receipt/terminal-queue/transaction/trace
  evidence is absent or incompatible
- **THEN** `supersede`, submit preflight, Gate, and inspect SHALL return `missing_contract`
- **AND** they SHALL not infer acceptance from one result file, hash mirror, terminal row, trace event, or a
  caller-supplied hash

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

- **WHEN** a legacy index hash mirror disagrees with a submitted ledger row
- **THEN** submit/Gate/inspect SHALL fail closed on the direct mismatch
- **AND** they SHALL not offer a recompute-hashes or sync-index command
- **AND** the incompatible mirrors SHALL prevent the full legacy acceptance tuple, so `supersede` SHALL return
  `missing_contract` rather than select either hash as the original acceptance

#### Scenario: markerless and marked hash representations do not mix

- **WHEN** a new claim carries `work-unit.submission.v1`
- **THEN** formal submit SHALL write one index acceptance fingerprint and no index/status current hash mirrors
- **AND** a markerless legacy attempt SHALL retain its existing compatibility representation
- **AND** a partial, unknown, or conflicting marker/mirror combination SHALL fail closed rather than select a
  branch from current framework version
