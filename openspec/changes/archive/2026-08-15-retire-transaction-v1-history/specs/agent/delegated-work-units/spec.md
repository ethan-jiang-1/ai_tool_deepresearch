## MODIFIED Requirements

### Requirement: Submit SHALL expose a bounded integrity preflight and transaction disposition

Normal submit and dry-submit SHALL evaluate one shared, read-only submit-owned integrity preflight before
candidate acceptance. It SHALL check only direct facts owned by submit: current index/ledger binding,
attempt disposition, queue in-flight or successor relation, transaction journal disposition, and current
lock contention. It SHALL not run, predict, or promise a formal phase Gate's content, coverage, floor,
reference, or cross-work-unit verdict. Formal submit SHALL rerun that same evaluator after acquiring the
global transaction lock; a prior dry-submit result SHALL not authorize commit.

Work-unit transaction acquisition contention SHALL return a structured non-mutating `busy` result rather
than a raw filesystem exception only when a schema-valid global lock-owner record names one schema-valid
non-suspect `work-unit.transaction.v2` journal with the same transaction ID, operation, journal ref, and
target work/queue coordinates. It SHALL identify the caller's requested operation/work ID separately from
the holder's transaction/operation/target coordinates, expose the holder journal disposition, state whether
a `started` holder targets the same attempt, and return one `wait` / caller-same-operation rerun coordinate.
A paired `committed`/`rolled_back` journal whose owner lock is awaiting final release remains global busy but
SHALL NOT be described as an active attempt mutation. Busy SHALL not label the candidate invalid, claim that
the actor or process is live, or recommend terminalization. A busy contender SHALL not re-claim work,
overwrite a result, write a ledger row, alter a lease, or create a blocking `started` journal.

`timeout-preflight` SHALL read the same direct transaction fact. Any valid non-suspect v2 global holder SHALL
prevent the concurrent timeout mutation and return busy/rerun. When a `started` holder's target set contains
the checked work ID, timeout-preflight SHALL classify same-attempt transaction protection; neither default
nor forced timeout may terminalize, requeue, or otherwise mutate that attempt while the fact is active. A
holder for another work ID or a settled journal awaiting final lock release SHALL not be described as the
checked attempt's owner or progress. An unpaired, unreadable, target-mismatched, proof-incomplete, unresolved
or malformed legacy, or `suspect` lock/journal SHALL return `suspect_transaction`, not `busy`, and SHALL not make a liveness
inference. Age SHALL not classify a transaction as stale or dead.

Each new journal SHALL use `schema_version: work-unit.transaction.v2`; v1 journals SHALL NOT be interpreted
as a current transaction protocol or gain v2 recovery semantics by framework-version inference. The raw
transaction-directory safety scan SHALL still identify a journal carrying the v1 marker: an uncommitted v1
journal, and any unreadable, malformed, or proof-incomplete journal, SHALL remain an explicit
`suspect_transaction` mutation blocker. A structurally complete committed v1 journal SHALL be diagnostic history only and SHALL
not establish transaction, acceptance, recovery, supersession, or provenance authority; when it is a
complete v1-shaped diagnostic record and no other transaction blocker exists, it SHALL NOT itself block a
new current v2 mutation. A v1 marker with an incomplete or malformed legacy shape SHALL be suspect rather
than treated as committed diagnostic history. Before the first
durable target mutation, each v2 journal SHALL declare a complete exact-path mutation manifest. Each entry
SHALL contain one canonical bundle-relative rollback-owned target, its before-existence, and its 256-bit
SHA-2 before-digest when present. The manifest SHALL cover every authority and canonicalization file the
operation may write; it SHALL contain no glob, implicit recursive directory, unsafe path, or post-first-write
target discovery. The current transaction's own lock/journal and append-only diagnostic trace/run-log writes
are metadata/audit surfaces rather than rollback targets; they SHALL NOT establish operational authority or
conceal an undeclared authority write. A journal may enter `started` only after its declaration and lock-owner
binding are durable.

A journal's transient `started` state is an active direct fact. A v2 journal's durable post-operation
disposition SHALL be one of `committed`, `rolled_back`, or `suspect`; only `committed` and `rolled_back` are
settled, while `suspect` remains unresolved and MAY transition only to proof-verified `rolled_back` through
the bounded recovery operation below. A failed mutation whose Engine-owned rollback has restored every
declared target to its exact before-existence/digest SHALL be recorded as `rolled_back` and SHALL not block
later submit/Gate work merely by existing on disk. A v2 journal whose effect cannot be deterministically
classified SHALL remain `suspect`. A legacy v1 journal with any non-`committed` status, or any invalid
legacy journal, SHALL remain under the raw suspect boundary; its age or current clean-looking state SHALL
not fabricate rollback, and a committed v1 journal SHALL not be promoted to a settled current fact.

The transaction helper SHALL release its owner lock only after the mutation callback has stopped and the
helper has attempted its durable post-operation disposition. Lock release SHALL be the helper's final action,
and no declared target SHALL be written afterward. This ordering is the only Engine proof that permits an
unlocked v2 `started`/`suspect` journal to be compared; it SHALL NOT be described as host/process liveness.

`operate-work-unit recover-transaction <bundle> --tx-id <id>` SHALL be the sole transaction-recovery
operation. It MAY mark exactly one orphaned v2 `started`/`suspect` journal `rolled_back` only when no global
lock is held, its complete mutation manifest is valid, and every current target equals its before-image. The
prior journal SHALL be the only operational target of a normal recovery transaction. A valid non-suspect v2
global holder SHALL return `busy`; an unpaired/malformed/unresolved-legacy/suspect held lock, incomplete or
malformed legacy proof,
unsafe target, or digest difference SHALL return `missing_contract` under the suspect root. A request for an
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
- **THEN** it SHALL report that timeout cannot terminalize the attempt while that direct transaction fact is
  active
- **AND** it SHALL return the same structured wait/rerun boundary as submit contention
- **AND** neither default nor forced timeout SHALL bypass that transaction-integrity root
- **AND** it SHALL not claim that the journal owner will complete

#### Scenario: malformed or legacy contention is suspect rather than an indefinite wait

- **WHEN** a lock or journal is unpaired, unreadable, target-mismatched, proof-incomplete, unresolved or
  malformed legacy, or explicitly `suspect`
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
  on disk
- **AND** the journal SHALL remain available as diagnostic history

#### Scenario: one journal can be recovered only with declared proof

- **WHEN** `recover-transaction` receives one unlocked v2 `started`/`suspect` journal ID with a complete
  exact-path before-image manifest and every current target still matches
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

For a complete current submitted predecessor, submitted correction SHALL retain the existing immutable
`work-unit.supersession.v1` relation, one fresh successor, exact direct-parent lineage, transaction binding,
and rule that only the unique current lineage leaf with a normal current ledger row can provide current
coverage. A predecessor remains historical only after that current relation validates; it never supplies a
second current success path.

Supersession, historical-predecessor inspection, and replacement planning SHALL first require the complete
current profile. They SHALL not validate a markerless predecessor through a legacy acceptance tuple, accept
v1/v2 output interpretation, or reconstruct actor provenance for an unrecorded attempt. When an acceptance
tuple is required, its original-submit transaction evidence SHALL be one committed
`work-unit.transaction.v2` journal bound to the current trace event; a committed v1 journal SHALL not satisfy
that requirement. A complete-current-profile predecessor without that v2 proof SHALL stop at
`missing_contract` rather than creating a successor, recovering a declaration, or treating the predecessor as
historical acceptance.

#### Scenario: Complete current predecessor retains correction path

- **WHEN** a complete current submitted predecessor has one eligible direct correction root
- **THEN** Engine supersession SHALL retain its existing audited successor and rollback behavior
- **AND** the predecessor SHALL remain historical rather than current coverage after a valid relation is
  committed

#### Scenario: Historical predecessor cannot establish supersession facts

- **WHEN** a candidate predecessor uses an old assignment, markerless submission, or unrecorded actor
  representation
- **THEN** supersession SHALL return `unsupported_current_contract` before validating a predecessor acceptance
  tuple
- **AND** it SHALL not create a successor or reinterpret the predecessor as a valid historical relation

#### Scenario: readable hash drift creates one audited successor relation

- **WHEN** a submitted work unit's current result bytes no longer match its hash-valid submitted ledger row
- **AND** `supersede` verifies that direct post-submit drift
- **AND** predecessor index/status/terminal-queue authority remains exact
- **THEN** it SHALL preserve the ledger row and `status: submitted`, write one immutable supersession
  relation, and create exactly one fresh lineage-bound successor queue demand
- **AND** the successor or its unique legal current lineage leaf SHALL require ordinary claim and a
  hash-valid row through the existing normal submit or audited late-submit contract before it can produce
  current coverage

#### Scenario: lost supersession response replays the original relation

- **WHEN** supersession committed one valid relation and exact successor but the caller did not receive the
  response
- **AND** the caller repeats `supersede` for the same predecessor with a different non-empty audit reason
- **THEN** the operation SHALL return the original relation and successor's current ordinary location
- **AND** it SHALL not rewrite immutable audit fields, rerun correction as a new transaction, or create a
  sibling

#### Scenario: exact declaration recovery takes precedence

- **WHEN** a submitted work unit's target ledger row is missing and the existing declaration-recovery
  evaluator can reproduce the hash-identical accepted row
- **THEN** `supersede` SHALL reject without authority mutation and return `recover-declaration` as the sole
  nearest operation
- **AND** after recovery the same inspect/Gate checkpoint SHALL evaluate the normal current row

#### Scenario: missing ledger can be superseded only with durable acceptance evidence

- **WHEN** a `work-unit.submission.v1` work unit's ledger row is missing or attributable-but-drifted and
  exact declaration recovery is unavailable
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

- **WHEN** a historical submitted work unit's ledger row is missing or attributable-but-drifted
- **AND** its old submission-presence facts are absent, compatible, or incompatible
- **THEN** `supersede`, submit preflight, Gate, and inspect SHALL return `unsupported_current_contract`
  before evaluating an acceptance tuple
- **AND** they SHALL not infer acceptance, create a successor, or mutate the historical record

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
- **THEN** it SHALL not modify the predecessor's status, any existing ledger row, any marked accepted
  fingerprint, original result, receipt, cache declarations, or terminal-history `done` record
- **AND** Gate/inspect SHALL be able to audit both the immutable predecessor and its one successor relation

#### Scenario: legacy hash drift is not silently synchronized

- **WHEN** a historical index hash mirror disagrees with a submitted ledger row
- **THEN** submit/Gate/inspect SHALL return `unsupported_current_contract` before comparing the mirrors
- **AND** they SHALL not offer a recompute-hashes, sync-index, or supersession command for that attempt

#### Scenario: markerless and marked hash representations do not mix

- **WHEN** a new claim carries `work-unit.submission.v1`
- **THEN** formal submit SHALL write one index acceptance fingerprint and no index/status current hash mirrors
- **AND** a markerless historical attempt SHALL return `unsupported_current_contract` rather than retain a
  compatibility representation
- **AND** a partial, unknown, or conflicting marker/mirror combination SHALL fail at the same boundary rather
  than select a branch from current framework version
