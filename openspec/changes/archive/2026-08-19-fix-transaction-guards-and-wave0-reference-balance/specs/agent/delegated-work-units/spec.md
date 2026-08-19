## MODIFIED Requirements

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
