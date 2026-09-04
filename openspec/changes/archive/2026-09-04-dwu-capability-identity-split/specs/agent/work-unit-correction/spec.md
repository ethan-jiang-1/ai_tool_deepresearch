## Purpose

Correction of failed or drifted delegated work: fail-closed terminal attempt transitions, audited late-submit recovery, forced timeout terminalization, audited supersession with fresh successors, and transaction journal recovery. Split from `agent/delegated-work-units` (2026-09 capability identity migration); engine modules do not move.


## ADDED Requirements

### Requirement: Timeout terminalization SHALL run the same guard with explicit audit

> req: WUC-001

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

> req: WUC-002

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

> req: WUC-003

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

> req: WUC-004

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

### Requirement: Invalid submit SHALL remain non-terminal

> req: WUC-005

Invalid submit SHALL leave the attempt `claimed`, record `last_submit_rejection`, emit diagnostics, and write no ledger row. Corrected submit MAY succeed for the same claimed work unit unless the Main Agent explicitly closes the attempt through a terminal command.

#### Scenario: corrected submit can reuse claimed attempt

- **WHEN** submit rejects a result because a declared output is missing
- **AND** the result bundle is corrected for the same claimed `work_id`
- **THEN** a later submit MAY succeed for that work unit

### Requirement: Terminal attempt transitions SHALL fail closed

> req: WUC-006

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

> req: WUC-007

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

### Requirement: Phase Agent fallback SHALL remain inside the work-unit transaction

> req: WUC-008

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

### Requirement: Submitted correction SHALL use audited supersession and one fresh successor

> req: WUC-009

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
