## Context

See [proposal.md](proposal.md) for the incident set. The current implementation has a useful immutable
submission model: first acceptance writes a hash-bound ledger row, index/status, queue terminal history,
result, receipt, and transaction evidence together. It also has three gaps at the same boundary:

- a filesystem lock is the true single-writer boundary but contention escapes as raw `EEXIST`;
- actor class is recorded, but a Phase Agent and delegated actor can still be guided toward one result path;
- submitted row/hash integrity correctly fails closed, but a damaged attempt has no auditable way to become
  non-current and create a successor without manual authority edits.

The design must preserve the submitted ledger as delegated coverage authority. It cannot make the engine
choose whether late research is semantically better, prove sub-agent liveness, or turn the Phase Gate into
a submit dry-run.

## Goals / Non-Goals

**Goals:**

- Give the Phase Agent a small, exact derived attempt disposition: logical execution guidance from existing
  `actor_execution` / `work_id` / `receipt_nonce` bindings, coverage relation, and one legal next action.
- Make lock contention and transaction state deterministic public facts.
- Provide exactly one audited correction route for direct post-submit integrity drift.
- Remove the new-attempt dual hash authority by using a ledger-first interpretation.
- Keep Phase Gate authority separate from submit-owned preflight.

**Non-Goals:**

- A generic repair controller, retry daemon, host/sub-agent scheduler, liveness detector, or automatic
  semantic merge.
- Lock stealing, PID/age-based dead-process inference, or a promise that a crashed valid lock owner can be
  recovered without a future host/fencing contract.
- Mutating submitted ledger rows, recomputing hashes, manually syncing index from ledger, or directly
  reactivating terminal queue items.
- Treating a later richer result as deterministic evidence that a valid submitted attempt was wrong.
- Predicting content, coverage, floors, or cross-work-unit Phase Gate outcomes from `dry-submit`.

## Decisions

### 1. Make attempt disposition the single reader-facing semantic layer

An **attempt disposition** answers the bounded question “what can happen to this exact work ID now?” It is
not a second state machine or persistent status. It projects existing Engine facts plus one minimal immutable
supersession relation:

| Fact | Source of record | It answers | It does not answer |
|---|---|---|---|
| logical attempt binding | claimed `actor_execution` plus `work_id` and `receipt_nonce` across index, manifest, beacon, candidate/receipt discriminators, and generated guidance | which logical execution contract owns this coordinate and whether a candidate belongs to this attempt | physical actor authentication or host/sub-agent liveness |
| direct transaction fact | the global lock-owner record paired to its schema-valid journal, or a durable journal disposition with its version-applicable proof | whether the requested mutation is globally busy, whether this exact attempt is targeted, or whether transaction authority is suspect | research completion, process death, or that a lock holder will make progress |
| submitted coverage relation | immutable submitted ledger row plus the submitted index record's immutable supersession relation | whether historical acceptance is still current coverage | whether a later result is semantically better |

`work_id` remains attempt identity and `queue_item_id` remains demand identity. The result coordinate belongs
to the attempt, while the lock is global single-writer authority for one Engine mutation transaction. A valid
global holder can therefore block a different work ID without becoming that attempt's logical owner. That preserves the
distinctions that BUG-148 and BUG-174 collapsed.

Public inspect/preflight output groups the projection without persisting it:

- `identity` names `work_id`, `queue_item_id`, `receipt_nonce`, logical execution route, and assigned
  result/receipt coordinates;
- `transaction` distinguishes `none`, `busy`, or `suspect_transaction`, names the blocking transaction and
  target coordinates when known, and states whether it targets this attempt;
- `coverage` distinguishes `not_submitted`, `current`, `historical`, or `unresolved` from ledger authority and
  the immutable supersession relation; and
- `next` reuses the existing `repair_kind` / exact `write_to` / exact `rerun` contract. It does not add a
  persisted recovery plan or let the projection authorize mutation.

No `attempt_fence` is added. The existing `work_id` + `receipt_nonce` + `actor_execution` binding already
separates a claimed attempt from its successor. The Engine validates that logical binding before acceptance;
it does not claim secrecy, authenticate a physical actor, or infer liveness. `attempt disposition` is the
reader-facing projection of those direct facts, not a new authority.

`WorkUnitStatus` also gains no `superseded` member. A submitted predecessor retains `status: submitted` and
its immutable acceptance history. A valid immutable supersession relation makes its coverage historical in
the derived disposition; without that relation, it remains a normal current submitted candidate subject to
the ledger-first checks below.

### 2. Keep one correction model: audited supersession -> fresh successor

The chosen model is an explicit `supersede` operation for **eligible directly observed post-submit integrity
drift**. Eligibility requires an intact submitted predecessor index/status binding, exactly one matching
terminal-history `done` record with the original queue snapshot, no existing conflicting successor, and no
transaction-integrity blocker. `supersede` changes no old result, receipt, ledger, status, or terminal-history
bytes. Instead, one transaction writes an immutable relation on the submitted predecessor index record and
one ordinary successor demand. The relation binds:

```text
supersession_relation:
  schema_version: work-unit.supersession.v1
  predecessor_work_id: <submitted work_id>
  predecessor_queue_item_id: <submitted queue_item_id>
  accepted_ledger_record_hash: <original accepted row hash>
  root_code: <closed supersession-eligible root>
  reason: <trimmed non-empty audit reason>
  recorded_at: <ISO 8601 timestamp>
  tx_id: <committed supersession transaction ID>
  successor_queue_item_id: <exactly one fresh identity>
```

For `work-unit.submission.v1`, `accepted_ledger_record_hash` is written once at the original formal acceptance
as a relation to the accepted ledger row. It is not a mutable current hash mirror and does not replace the
ledger as the source for content hashes or coverage. A markerless legacy attempt gains no standalone marked
fingerprint; if its full compatible acceptance tuple permits supersession, the new relation freezes the proven
original legacy ledger hash only inside that relation. The predecessor stays `status: submitted`; any existing predecessor ledger
bytes stay byte-for-byte unchanged, including when those bytes have drifted. A missing or drifted row is not
described as a preserved hash-valid row; the immutable fingerprint and other acceptance evidence establish
only historical acceptance. The relation causes Gate/inspect to derive historical non-current coverage.

The initial successor derives from the exact predecessor terminal-history `item` snapshot. It preserves its
immutable schema-accepted contract/extension fields, including `title` and non-supersession lineage, while
changing only `queue_item_id`, ordinary queued status/timestamps, transient queue-placement
`restore_priority` (reset to `normal`), and the five flat direct-parent supersession lineage fields:
`supersession_of_work_id`,
`supersession_of_queue_item_id`,
`supersession_accepted_ledger_record_hash`, `supersession_root`, and `supersession_tx_id`. If the predecessor
was itself a supersession successor, those five direct-parent fields are replaced for the new edge; earlier
edges remain auditable through predecessor terminal snapshots and index relations. The current predecessor
index relation owns each edge; queue lineage must match it exactly and cannot outvote it.

The initial successor enters an existing ordinary queue location and requires a current actor observation and
normal claim. If it later times out, fails/abandons, or submits and itself becomes superseded, only the existing
ordinary retry/replacement contract or a new audited supersession relation may extend the chain. Gate follows
the unique acyclic chain whose every edge validates under its existing owner and treats its final reachable
demand/attempt as the **current lineage leaf**. Only that leaf's hash-valid row accepted through the existing
normal submit or audited late-submit contract, with no valid relation making it historical, gains current
coverage. A branch, cycle, missing terminal snapshot, or lineage
mismatch is one integrity root. Gate never grants a supersession-specific pass.

Within one queue demand's timeout-retry attempts, "current" is not the greatest `attempt_index`. The existing
late-submit owner remains decisive: an eligible targeted timed-out attempt may become the submitted leaf only
after its audited cleanup removes queued retry demand or abandons the claimed retry, while a submitted retry
blocks that late-submit. The lineage evaluator validates that ordinary cleanup/audit evidence and the unique
terminal `done` row; it neither counts a cleaned retry as a sibling branch nor reopens the superseded
predecessor.

Once a complete relation and its exact successor commit, a later `supersede` call for that predecessor is an
idempotent lookup, including after a caller lost the original response. A newly supplied audit reason is not
relation identity and cannot amend the original `reason`, `recorded_at`, `tx_id`, root, or successor; the
operation returns the original relation and the successor's current ordinary location. A partial/malformed
relation or mismatching/missing successor is an integrity root, not an invitation to complete, replace, or fork
the relation.

Eligibility is root-specific:

| Observed root | Supersession result |
|---|---|
| hash-valid accepted row plus current result/receipt/output/cache drift attributable to the same work ID | eligible when all parent authority prerequisites remain exact |
| missing target row, or a parseable target row whose work ID is attributable but whose row hash/fingerprint drifted | first use `recover-declaration` when exact hash-identical recovery is reachable; otherwise eligible only with the durable acceptance evidence below |
| index/status/terminal-queue/supersession-relation drift, duplicate target rows, or ledger corruption that cannot be attributed to one work ID | `missing_contract`; `supersede` cannot choose or rewrite authority |
| valid current attempt with only richer/late semantic content | reject at the supplementary/semantic boundary with no mutation |

`root_code` is a closed v1 enum: `submitted_declaration_missing`, `submitted_declaration_drift`,
`submitted_result_drift`, `submitted_runtime_receipt_drift`, `submitted_output_drift`, or
`submitted_cache_drift`. The normalized evaluator reports every observed eligible drift surface but selects the
relation's one primary root in that order. Declaration missing/drift always runs exact declaration recovery
first and can enter the relation only when that nearest operation is unavailable and the applicable durable
acceptance tuple remains complete. The ordering stabilizes audit identity and idempotency; it does not hide
additional diagnostics or turn an ineligible authority conflict into supersession.

For a `work-unit.submission.v1` record, the immutable `accepted_ledger_record_hash`, exact submitted
index/status/terminal-queue binding, and committed original submit transaction/trace establish the durable
acceptance tuple when the target row is missing or attributable-but-drifted. For legacy records,
`supersede` reuses the existing submission-presence/recovery evaluator's compatible index, status, manifest,
receipt, queue terminal, submit transaction, and trace facts; a single old hash mirror or trace event is not
sufficient. If exact declaration recovery is legal, feedback names only `recover-declaration` and the same
checkpoint. If neither exact recovery nor the full acceptance tuple is available, the answer is
`missing_contract`. No case permits index sync, hash recomputation, or a guessed replacement.

This is preferable to:

- **in-place replace**: it would rewrite the very immutable hash/provenance fact gates rely on;
- **queue reactivate**: it would erase the semantic difference between historical done and fresh rework;
- **late-result merge**: it requires content judgment and creates a hidden second success path;
- **generic repair service**: it would guess a recovery strategy where only direct Engine facts are known.

A richer late result with no drift remains a semantic/supplementary-work matter. C4 returns that boundary
instead of pretending a correction is mechanically justified.

### 3. Make submit-owned preflight small and shared

`dry-submit` and formal submit share a read-only **submit-integrity preflight** after candidate validation
can load the attempt. It inspects only direct submit authority: index/ledger relation, queue binding,
attempt disposition, transaction disposition, and lock contention. A structured `busy` result exists only
when the Engine can pair the global lock-owner record with one schema-valid non-suspect
`work-unit.transaction.v2` journal. It names both the caller's requested coordinates and the holder's
transaction/target coordinates plus journal disposition. A paired `committed`/`rolled_back` journal whose
owner lock has not yet completed its final release is still global contention, but it is not an active attempt
mutation. Formal submit reruns the preflight after it acquires the lock; the outer dry-run never authorizes
commit.

`timeout-preflight` reads that same direct transaction fact. Any valid non-suspect v2 global holder prevents a
concurrent timeout mutation and returns busy/rerun; only a `started` journal whose target set contains the
checked work ID is reported as same-attempt transaction protection. Default and forced timeout cannot bypass
that same-attempt integrity root. An unpaired, unreadable, mismatched, proof-incomplete, legacy, or `suspect`
lock/journal is instead `suspect_transaction`: it cannot justify wait, force-timeout, recovery, or a liveness
inference. Age alone never changes either classification.

The Phase Gate remains the sole owner of content completeness, coverage, count, reference and
cross-work-unit verdicts. This prevents BUG-186 from being “fixed” by creating a second gate evaluator.

### 4. Make journal recovery explicit and fail closed

The global lock contains a schema-valid owner record binding one `tx_id`, operation, journal ref, and bounded
target work/queue coordinates. New journals use `schema_version: work-unit.transaction.v2`; existing
`work-unit.transaction.v1` records remain a read-only legacy branch and cannot acquire v2 recovery semantics
from their current bytes. The matching v2 journal must be durably established before the first durable target
mutation and contains a complete, exact-path mutation manifest. Each entry records canonical bundle-relative
path, before-existence, and 256-bit SHA-2 before-digest when the path existed. Globs, directories as implicit
recursive targets, and targets discovered only after the first write are invalid. An operation may enter
`started` only after it can declare every rollback-owned authority and canonicalization file it may mutate.

The current transaction's lock-owner record and journal are transaction metadata, not their own before-image
targets. Append-only diagnostic trace/run-log writes are audit surfaces and may retain failure evidence; they
are not rolled back and cannot establish operational authority or conceal an authority/canonicalization write.
For `recover-transaction`, the prior journal being reconciled is an explicit target of the new recovery
transaction even though that recovery transaction's own lock/journal remain metadata.

The journal's transient `started` state paired to the lock is an active direct transaction fact, not a
post-operation disposition or liveness assertion. Durable post-operation dispositions are `committed`,
`rolled_back`, or `suspect`; only the first two are settled, while `suspect` remains unresolved and may move
only to proof-verified `rolled_back` through the bounded recovery operation below.

The implementation SHALL encode the v2 journal transitions in one explicit transition map/object:

| From | Deterministic condition / operation | To | Mutation boundary |
|---|---|---|---|
| no v2 journal | helper durably binds owner plus complete manifest before target mutation | `started` | create current transaction metadata |
| `started` | callback and owned postconditions complete | `committed` | write disposition, then release lock last |
| `started` | callback stops after failure and every target matches its before-image | `rolled_back` | write disposition, then release lock last |
| `started` | callback stops after failure but exact rollback cannot be proven | `suspect` | best-effort disposition, then release lock last |
| unlocked `started` or `suspect` | named recovery transaction proves every target still matches before-image | `rolled_back` | change only the prior journal as declared operational target |
| `committed` or `rolled_back` | lookup or repeated recovery request | unchanged | no operational mutation |

An attempted disposition write that cannot complete may leave an unlocked `started` journal after the final
release; it gains no new meaning and can move only through the same proof-limited recovery row above. A locked
journal, failed before-image comparison, or invalid proof causes no transition. There is no transition from
`suspect` to `committed`, from either settled disposition back to `started`, or from transaction-v1 `failed`
into the v2 map.

The helper may release its owner lock only after the mutation callback has stopped and it has attempted the
durable post-operation disposition; lock release is its final action and it performs no declared-target write
after release. This Engine ordering, not an inference about a PID or host, is the proof boundary that permits an
unlocked v2 `started`/`suspect` journal to be compared with its before-images. A process crash before release
retains the lock and therefore remains global contention.

- `committed` is durable mutation history.
- `rolled_back` is durable proof that every declared target again has its exact before-existence/digest; the
  journal remains auditable and does not block later work.
- `suspect` means neither state is provable. A caught failure that restores every declared target is written
  directly as `rolled_back`; a failed comparison is written as `suspect`, replacing the ambiguous `failed`
  terminal value for new journals.

`operate-work-unit recover-transaction <bundle> --tx-id <id>` can reconcile exactly one orphaned v2
`started`/`suspect` journal only when no global lock is held, the mutation manifest is complete and
schema-valid, and every current target matches its before-image. The operation then changes only that prior
journal to `rolled_back` under a normal recovery transaction. A valid non-suspect v2 global holder returns
`busy`; an unpaired/malformed/legacy/suspect held lock, legacy `failed` journal without a complete manifest,
digest drift, or undeclared/unsafe target returns `missing_contract` under the suspect root. A request for an
already `committed` or `rolled_back` journal returns that settled disposition idempotently without mutation.
Recovery never steals or deletes a lock and never marks a transaction committed from guessed postconditions.

There is no time-based sweep, batch cleanup, or manual deletion. The operation owns only that transaction's
metadata and declared snapshot comparison; it cannot regenerate hashes, edit ledger rows, alter a queue
item, or use age as proof. A crash that leaves a valid matching lock/journal pair is therefore honestly busy,
not provably dead; resolving physical lock-holder liveness would require a separate host/fencing contract and
is outside C4. Malformed pairs fail as one suspect root rather than receiving fictional wait or cleanup advice.

### 5. Use ledger-first hashes for new current-version attempts

Every new claim binds `submission_contract_version: work-unit.submission.v1` in index, manifest, and beacon
before actor work begins. Submit and readers select the representation from that attempt-bound marker, never
from current framework/bundle version. A markerless historical attempt remains on the explicit legacy branch;
an unknown, partial, or conflicting marker fails closed.

For `work-unit.submission.v1`, the ledger row is the sole source for current `result_hash`,
`ledger_record_hash`, and delegated coverage. Formal acceptance writes one immutable
`accepted_ledger_record_hash` on the index record as historical acceptance fingerprint; it does not retain
the legacy `result_hash` / `ledger_record_hash` current mirrors on index or status. The optional immutable
supersession relation also lives on index. Neither relation is an independently mutable current hash
authority. Current readers resolve hashes and coverage from the ledger first, then verify the acceptance
relation and index/status/queue binding.

Legacy records retain their duplicated fields as compatibility evidence and their existing exact
`recover-declaration` path. Disagreement remains a direct fail-closed fact. The supersession evaluator may
reuse a compatible full legacy acceptance tuple as described above, but it cannot rewrite the mirrors or
treat a lone mirror as acceptance. C4 does not introduce `sync-index` or
`recompute-ledger-record-hashes` because either would silently choose a winner after authority drift.

One normalized submitted-ledger evaluator owns this split for submit, inspect, and Gate consumers; callers do
not grow separate tolerant JSONL parsers. It remains strict for every current row and every
unattributable/duplicate/unparseable line. It may isolate an exact missing or work-ID-attributable predecessor
row only after a complete immutable supersession relation, unique acyclic successor chain, and acceptance tuple
validate; that row is historical audit context and never coverage. This bounded historical branch prevents one
known superseded predecessor from becoming current without turning JSONL parse tolerance into a second ledger
authority.

All new persisted and public structured records use closed Zod schemas. Intra-record parity and conditional
field rules use `.superRefine()`/`.refine()`; cross-file owner/journal, marker, hash, queue, and lineage equality
stays in the shared deterministic evaluators rather than ad hoc parsing. The implementation adds no dependency:
it uses the existing `zod` package and Node.js built-ins such as `node:fs`, `node:path`, and `node:crypto` (plus
the already-approved `yaml` only where an existing loader requires it).

### 6. Control and responsibility review

The shortest legal loop is:

```text
direct attempt fact -> existing owner or one named Engine operation -> same checkpoint
```

Net simplification comes from replacing raw lock exceptions, manual multi-file repair, a proposed fence
state, status mutation, ambiguous transaction files, and parallel correction ideas with one derived
disposition projection and one immutable correction relation. It adds no watcher, retries, derived Gate,
second ledger, generic controller, or parallel current-hash authority.

The Engine detects/fences deterministic facts and writes audited transitions. The Agent reads the feedback,
performs an already-authorized mechanical operation, and decides any semantic supplementary research. The
user decides only a new semantic/risk question. A `human-directed` request never creates supersession,
mutation authority, or host capability.

## Risks / Trade-offs

- [Logical ownership is mistaken for authentication] -> Document and test existing binding as guidance only;
  do not claim it identifies a physical actor or proves liveness. Deterministic tests prove delivery and
  cross-attempt rejection, not that a Phase Agent cannot impersonate the same logical binding.
- [Supersession relation becomes a second ledger or status] -> Keep one immutable relation on the submitted
  index record per edge, retain `status: submitted`, follow only one validated acyclic lineage, and let Gate
  count only the current leaf's existing normal-submit/audited-late-submit ledger row as coverage.
- [A missing ledger creates a guessed history] -> Prefer exact `recover-declaration`; otherwise require the
  immutable new-record fingerprint plus intact parent authority, or the existing full legacy
  submission-presence tuple. Reject unattributable ledger corruption and lone hash/trace evidence.
- [Transaction reconciliation is too broad] -> Require a complete pre-mutation exact-path manifest and permit
  only `recover-transaction` for one unlocked named v2 journal whose before-image still matches; reject
  recovery while any global lock is held, plus age, batch, glob, and lock-deletion cleanup.
- [Late content is lost] -> State the supplementary-work boundary explicitly. Content quality is not a
  deterministic post-submit correction criterion.

## Migration Plan

1. Add closed schemas for `work-unit.submission.v1`, the lock owner and `work-unit.transaction.v2` proof,
   immutable acceptance/supersession relations, and successor lineage; retain explicit markerless-attempt and
   transaction-v1 legacy parsing and fail closed on partial/mixed contracts.
2. Add the derived attempt-disposition projection and wire claim/task/result/receipt validation from existing
   `work_id` + `receipt_nonce` + `actor_execution`; prove guidance delivery and stale-binding rejection before
   changing submit behavior.
3. Refactor every work-unit mutation to publish a complete rollback-owned before-image manifest before its
   first target write and make lock release its final action; add
   shared submit-integrity preflight, global structured contention, same-attempt timeout/force protection, and
   proof-limited `recover-transaction`. Verify no formal Gate rule is invoked from this path.
4. Land one shared ledger-first current/historical evaluator and exact `recover-declaration` precedence, then
   add atomic supersession -> terminal-snapshot-derived successor creation without changing predecessor
   `status: submitted` or historical bytes.
5. Make provenance Gate isolate only a validated attributable historical predecessor, reject branched/cyclic
   lineage, and derive current coverage only from the unique current leaf's existing submit/late-submit row.
6. Update Agent-facing guidance, `v0.64` release notes, all eight BUG dispositions, verification routing, and
   governance.

Rollback is code/version rollback for newly created attempts. Existing immutable ledger rows and audit
relations are never rewritten. A rollback reader must continue to fail closed on an unknown immutable
supersession relation rather than treating its predecessor as current coverage.
