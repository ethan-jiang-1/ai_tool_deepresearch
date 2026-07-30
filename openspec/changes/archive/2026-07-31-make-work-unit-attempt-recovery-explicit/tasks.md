## 0. Apply Preconditions And Governance

- [x] 0.1 Register `DEW-022`--`DEW-024`, `AGQ-026`, `WPG-016`, and `CHI-004` in
  `openspec/governance/req-registry.yaml` with the exact entries below, then run requirement/spec governance and
  verification-routing plan mode before any target-code edit. Done when all six IDs are unique, sorted under
  their existing capability groups, and every planning check exits zero.

  ```yaml
  AGQ-026: agentic-queue — Submitted predecessors with immutable supersession relations create a fresh queue successor without reactivation
  CHI-004: check-inspect-feedback — Attempt recovery feedback exposes one ownership-safe legal action
  DEW-022: delegated-work-units — Work-unit attempts expose logical execution guidance from existing attempt bindings
  DEW-023: delegated-work-units — Submit exposes a bounded integrity preflight and transaction disposition
  DEW-024: delegated-work-units — Submitted correction uses audited supersession and one fresh successor
  WPG-016: work-unit-provenance-gate — Provenance gates derive current submitted coverage from immutable supersession relations
  ```

## 1. Closed Contracts And Attempt Projection

- [x] 1.1 Add strict schemas for the attempt-bound
  `submission_contract_version: work-unit.submission.v1`, ledger-first submitted index/status branch,
  immutable acceptance relation, the nine-field `work-unit.supersession.v1` relation, its six-code closed root
  enum, and the five-field supersession queue lineage. Preserve the markerless attempt branch and reject
  partial, unknown, or mixed marker/hash/relation representations. (DEW-024, AGQ-026)
  Done when focused schema tests cover valid marked/legacy shapes and every partial/conflicting negative case.
- [x] 1.2 Add strict schemas for the transaction lock owner, `work-unit.transaction.v2` journal/exact-path
  mutation manifest, and structured busy/suspect projection. Preserve the read-only transaction-v1 legacy
  union and reject partial, unsafe, target-mismatched, or mixed proof shapes. (DEW-023)
  Done when focused schema tests cover every valid disposition and malformed/current-vs-legacy boundary.
- [x] 1.3 Bind `work-unit.submission.v1` at claim in index, manifest, and beacon and validate parity before
  candidate acceptance. Do not infer it from current framework/bundle version or migrate historical attempts.
  (DEW-024) Done when claim/submit tests prove the marker is attempt-bound and legacy bytes remain unchanged.
- [x] 1.4 Add the non-persistent attempt-disposition projection from existing `actor_execution`, `work_id`,
  `receipt_nonce`, assigned result/receipt coordinates, transaction facts, and coverage relation. Reuse
  `repair_kind`/`write_to`/`rerun`; add neither `attempt_fence`, persistent repair plan, nor `superseded` status.
  (DEW-022, CHI-004) Done when inspect and preflight return the same identity/owner facts from one helper.
- [x] 1.5 Update generated task/result starters and Phase guidance so the selected logical actor route and
  exact attempt coordinates are explicit, including the bounded fallback route and the statement that binding
  is not physical actor authentication. (DEW-022) Done when focused Markdown projections expose one route and
  no same-binding Phase-authored delegated-content instruction.
- [x] 1.6 Enforce the selected actor discriminator plus exact `work_id`/`receipt_nonce` binding in candidate and
  runtime-receipt validation, including across a fresh successor. (DEW-022) Done when focused tests reject
  stale predecessor coordinates and incompatible actor routes before ledger or queue mutation.

## 2. Transaction Integrity And Submit Preflight

- [x] 2.1 Refactor the global work-unit transaction helper to durably pair one schema-valid lock-owner record
  with one `work-unit.transaction.v2` `started` journal and complete canonical exact-path before-existence/
  digest manifest before its first durable target write. Encode the explicit v2 transition map; exclude the
  current lock/journal and append-only audit logs from rollback targets, and prohibit globs, directories, or
  late target discovery. (DEW-023) Done when helper-level ordering tests reject incomplete/unsafe manifests and
  prove no target write can precede the paired owner/journal proof.
- [x] 2.2 Complete helper finalization so callback writes stop before `committed`, proof-verified `rolled_back`,
  or `suspect` is written and lock release occurs as the final action; retain v1 `failed` only as read-only
  suspect compatibility evidence. A caught failure may write `rolled_back` only after every declared target
  matches its before-image, and no declared target may be written after release. (DEW-023) Done when focused
  fault injection proves clean rollback is settled, partial rollback remains suspect, the settled-lock release
  window stays honestly busy, and post-release target writes are detected.
- [x] 2.3 Migrate direct `createWorkUnit` and batch-open callers to declare their complete index/envelope/
  batch-counter authority and canonicalization targets through the helper before mutation. (DEW-023) Done when
  per-caller fault injection restores exact before-images or records one suspect disposition.
- [x] 2.4 Migrate claim and submit-rejection recording callers to declare their complete index/queue/envelope/
  rejection authority and canonicalization targets through the helper before mutation. (DEW-023) Done when a
  focused caller inventory and fault injection show no partial claim or rejection authority.
- [x] 2.5 Migrate replacement and failed/timed-out/abandoned terminalization callers to the manifest helper,
  including their queue/index/status/canonicalization targets. (DEW-023) Done when focused fault injection
  restores exact before-images or leaves one suspect transaction without partial lifecycle authority.
- [x] 2.6 Migrate normal submit to the manifest helper, covering every result/receipt/cache/ledger/index/status/
  queue/canonicalization target. (DEW-023) Done when submit fault injection proves exact rollback or one
  suspect disposition and preserves append-only audit evidence as non-authority.
- [x] 2.7 Migrate audited late-submit and its retry cleanup to the manifest helper, including targeted and
  superseded-retry status plus queue/ledger/canonicalization targets. (DEW-023) Done when fault injection at
  each cleanup boundary restores every authority before-image or leaves one suspect disposition.
- [x] 2.8 Migrate declaration recovery to the manifest helper with the declaration ledger and any canonicalized
  source as exact targets. (DEW-023) Done when recovery fault injection proves no partial row or undeclared
  authority mutation.
- [x] 2.9 Add one shared read-only submit-integrity evaluator to dry-submit and rerun it after formal submit
  acquires the lock. Limit it to submit-owned index/ledger/queue/attempt/transaction facts and keep all
  content, count, coverage, floor, reference, and cross-work-unit Phase Gate rules out. (DEW-023)
  Done when no-side-effect tests compare dry/formal roots and a Gate-spy regression proves no Gate evaluator
  is invoked.
- [x] 2.10 Map a valid lock plus matching non-suspect v2 journal, including different-work-ID submit contention
  and the settled-journal final-release window, to structured `busy` with separate caller/holder coordinates,
  holder disposition, and the caller's same-operation rerun. Map unpaired, unreadable, legacy, `suspect`,
  target-mismatched, or proof-incomplete pairs to `suspect_transaction`; never use age as dead-process proof.
  (DEW-023, CHI-004) Done when actual local concurrent CLI processes produce JSON outcomes with no raw
  `EEXIST`, contender mutation, blocking loser journal, re-claim, or lease mutation.
- [x] 2.11 Add `operate-work-unit recover-transaction <bundle> --tx-id <id>` for one unlocked orphaned v2
  `started`/`suspect` journal. Mark only that prior journal `rolled_back` through a normal recovery transaction
  when its complete before-image still matches; return busy for any valid non-suspect global holder and
  `missing_contract` for legacy/incomplete/drifted/suspect-holder proof. Return existing `committed` or
  `rolled_back` disposition idempotently. Never steal/delete a lock or alter original target authority.
  (DEW-023, CHI-004) Done when CLI snapshots prove the prior-journal-only operational diff, settled no-op, and
  zero original-target diff on every path.
- [x] 2.12 Make timeout-preflight expose global contention separately from same-attempt target protection.
  Default and forced timeout must not bypass an active v2 `started` journal targeting the checked work ID; an
  unrelated holder must not become actor/progress evidence. (DEW-023, CHI-004) Done when integration tests cover
  same-target default/force refusal, different-target busy/rerun, suspect no-wait/no-force advice, and no
  terminal/retry side effects.

## 3. Ledger-First Supersession And Queue Successor

- [x] 3.1 Change marked formal acceptance so the ledger row owns current `result_hash`, `ledger_record_hash`,
  and coverage; index stores only immutable `accepted_ledger_record_hash`, and status stores no current hash
  mirrors. (DEW-024) Done when first normal/late acceptance tests assert the marked writer shape and legacy
  acceptance bytes remain unchanged.
- [x] 3.2 Introduce the normalized submitted-ledger evaluator's strict current marked/legacy branches, including
  schema/hash/cardinality results and explicit fail-closed parse roots. (DEW-024) Done when focused evaluator
  tests cover valid marked/legacy rows and partial/mixed/duplicate/unparseable inputs.
- [x] 3.3 Migrate submit duplicate/replay/postcondition readers to resolve marked current hashes through that
  evaluator while retaining explicit markerless mirror compatibility. (DEW-024) Done when a consumer inventory
  finds no marked submission reader/writer of legacy mirrors and legacy fixtures remain fail-closed compatible.
- [x] 3.4 Extend that evaluator with declaration-recovery precedence and supersession eligibility for one
  missing or work-ID-attributable drifted predecessor. Require the complete marked or legacy acceptance tuple;
  reject duplicate, unparseable, unattributable, index/status/terminal-queue, or relation drift as
  `missing_contract`. Normalize eligible primary roots in declaration-missing, declaration-drift, result,
  runtime-receipt, output, then cache order, while retaining all observed surfaces; declaration roots must run
  exact recovery first. (DEW-024, WPG-016, CHI-004) Done when root-precedence tests prove stable selection, no
  parallel recovery advice, and no tolerant bypass of unrelated ledger corruption.
- [x] 3.5 Implement atomic `operate-work-unit supersede` with direct eligibility recheck, one immutable strict
  predecessor relation containing schema version, predecessor work/queue IDs, accepted ledger hash, normalized
  root, audit reason/time, transaction ID, and successor queue ID; make that relation the predecessor's only
  authority diff, and create one terminal-snapshot-derived successor demand. Preserve immutable contract/
  extension fields while regenerating identity/status/timestamps and direct-parent lineage and resetting
  transient `restore_priority` to `normal`; allocate no work ID or completion. (DEW-024, AGQ-026) Done when
  fault injection proves relation and successor commit together or both roll back, exact field values bind the
  transaction and verified acceptance, and replay after a lost response returns the original immutable
  relation/successor even when the new caller reason differs, without a sibling or audit-field rewrite.
- [x] 3.6 Update queue validation/projection for supersession lineage and all ordinary successor locations. A
  successor queue ID and its five direct-parent fields must map exactly to the relation's named successor,
  predecessor IDs, accepted hash, root, and transaction ID; relation-only schema/reason/time stay out of queue
  lineage. A terminal successor must be the only later parent under its own submitted/failed/abandoned/timed-out
  contract; resolve one acyclic current lineage leaf and never reopen the earlier predecessor. (AGQ-026) Done
  when queued/in-flight/terminal/nested relations, every field mismatch, ordinary replacement/retry,
  branch/cycle/conflict, parent reactivation, queued/claimed late-submit cleanup, submitted-retry conflict, and
  non-maximal-attempt late-accept tests pass.
- [x] 3.7 Add deterministic multi-step bundle coverage for result/receipt drift -> supersede -> actor-observed
  current-leaf claim -> existing normal submit/audited late-submit, including repeat lookup and later legal
  replacement/retry/supersession edges. (DEW-024, AGQ-026) Done when only the validated current leaf's existing
  submit path restores coverage and the predecessor's only authority diff is its new immutable relation.
- [x] 3.8 Add deterministic multi-step bundle coverage for attributable ledger drift, exact declaration-recovery
  precedence, marked/legacy acceptance evidence, no-drift richer-output rejection, and duplicate/unparseable/
  unattributable corruption. (DEW-024, AGQ-026) Done when each independent root yields its specified sole action
  or fail-closed boundary with zero unintended authority diff.

## 4. Provenance Gate And Root-First Feedback

- [x] 4.1 Extend the normalized ledger evaluator with the bounded historical-predecessor branch. Isolate only a
  work-ID-attributable predecessor whose exact relation, unique acyclic one-leaf lineage, cardinality,
  transaction reference, and version-applicable acceptance tuple agree; never isolate duplicate, unparseable,
  or unattributable JSONL corruption. (WPG-001, WPG-002, WPG-016) Done when focused evaluator tests keep current
  rows strict and classify every historical/invalid branch deterministically.
- [x] 4.2 Migrate Gate and inspect consumers to that evaluator and derive coverage only from the unique current
  leaf's hash-valid existing normal-submit/audited-late-submit row. Preserve the Phase Gate's content/count/
  cross-work-unit ownership and root-first mask dependent symptoms. (WPG-001, WPG-002, WPG-016) Done when Gate
  counts only the current leaf's existing normal-submit/audited-late-submit row and rejects relation/branch/
  cycle drift without a special pass.
- [x] 4.3 Project logical-owner mismatch, stale attempt binding, global busy, same-attempt transaction
  protection, suspect transaction, declaration recovery, supersession eligibility, historical coverage, and
  semantic/no-path boundaries with one exact legal action and same checkpoint. (CHI-004) Done when every
  independent root has validated `repair_kind`/`missing_fact`/`write_to`/`rerun` and no manual
  index/status/ledger/queue/lock/hash edit appears in primary advice.
- [x] 4.4 Add Gate/inspect regressions proving forced timeout cannot bypass same-attempt transaction integrity,
  old ledger/result/receipt bytes are never rewritten by supersession, a successor has no special pass, and a
  malformed relation masks dependent output/cache/bypass symptoms. (WPG-016, CHI-004) Done when focused
  negative cases produce the expected root and zero unintended authority diff.
- [x] 4.5 Complete one static/dynamic inventory of every work-unit mutation caller, including supersession and
  transaction recovery, against the v2 manifest helper and final-lock-release rule. (DEW-023) Done when the
  inventory test fails for any missing exact-path manifest, undeclared target, or post-release target write.

## 5. Agent-Facing Demand, Release, And Ticket Disposition

- [x] 5.1 Add `supersede` and `recover-transaction` to public CLI help/argument validation and structured exit
  behavior; keep invocation faults on stderr and runtime outcomes as one JSON document. (DEW-023, DEW-024)
  Done when CLI integration covers help, missing/invalid arguments, success, busy, suspect, no-path, and
  idempotent outcomes.
- [x] 5.2 Add the new operations and busy/suspect/recovery outcomes to `DPT_FRAMEWORK/RUN.md` and command docs
  with exact bundle/work/transaction/successor coordinates and same-checkpoint reruns. (DEW-023, DEW-024,
  CHI-004) Done when every public Engine operation has one accurate command-level caller and no authority-edit,
  physical-actor, or liveness claim.
- [x] 5.3 Update the shared sub-agent protocol, Phase work-unit loops, generated task guidance, and provenance
  forensics for logical actor binding plus the new operation outcomes. Never advise same-binding Phase-authored
  delegated content or authority edits. (DEW-022, CHI-004) Done when each Agent Flow surface names its bounded
  owner/action/checkpoint and no Engine-side workflow orchestration is added.
- [x] 5.4 Add the deterministic Markdown validator selected in `verification-plan.yaml` for the new operations,
  busy/suspect/recovery branches, actor-binding guidance, and forbidden manual edits. (DEW-022, CHI-004) Done
  when the production Markdown surfaces pass and a missing caller, coordinate, rerun, or safety boundary fails.
- [x] 5.5 Add the concise `v0.64` entry to `CHANGELOG.md` describing attempt disposition, transaction recovery,
  and audited supersession without overstating physical actor or host-liveness proof. (DEW-022, DEW-023,
  DEW-024, AGQ-026, WPG-016, CHI-004) Done when the latest changelog entry is complete and evidence-bounded.
- [x] 5.6 Synchronize the `DPT_FRAMEWORK/RUN.md` version banner to `v0.64` and the latest CHANGELOG entry.
  (DEW-022, DEW-023, DEW-024, AGQ-026, WPG-016, CHI-004) Done when banner/version assertions agree exactly.
- [x] 5.7 Append bounded C4 dispositions to BUG-148, BUG-174, BUG-179, BUG-180, BUG-181, BUG-182, BUG-185, and
  BUG-186. Distinguish deterministic contract proof from unresolved host/physical-writer liveness. (DEW-022,
  DEW-023, DEW-024, AGQ-026, WPG-016, CHI-004) Done when every ticket names its implemented path or explicit
  residual boundary.

## 6. Verification And Archive Readiness

- [x] 6.1 Audit every selected asset in `verification-plan.yaml` after implementation and run verification
  routing in assets mode. Done when every claim maps to a real selected asset with a permitted proof boundary
  and the assets-mode checker exits zero. (DEW-022, DEW-023, DEW-024, AGQ-026, WPG-001, WPG-002, WPG-016,
  CHI-004)
- [x] 6.2 Run the focused schema/engine/CLI/Markdown suites and deterministic multi-step filesystem
  interleaving evidence. Done when all selected tests pass with real temporary bundle files/processes and no
  hand-written result, receipt, trace, ledger, or verdict evidence. (DEW-022, DEW-023, DEW-024, AGQ-026,
  WPG-001, WPG-002, WPG-016, CHI-004)
- [x] 6.3 Run strict OpenSpec validation and `git diff --check`, then compare the applied behavior and selected
  evidence with the approved design/deltas. Done when both commands exit zero and no implementation or proof
  claim exceeds the approved change. (DEW-022, DEW-023, DEW-024, AGQ-026, WPG-001, WPG-002, WPG-016, CHI-004)
- [x] 6.4 Run `node openspec/governance/check-project-reqs.mjs`. Done when it exits zero with 0 duplicate,
  0 orphan, 0 unregistered, and 0 reusedRetired requirement IDs. (DEW-022, DEW-023, DEW-024, AGQ-026,
  WPG-016, CHI-004)
- [x] 6.5 Run `node openspec/governance/check-project-specs.mjs`. Done when it exits zero with
  0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, and 0 missingReqHeader findings. Actual spec
  sync, archive, and the post-archive commit remain owned by the later `/opsx:archive` phase. (DEW-022,
  DEW-023, DEW-024, AGQ-026, WPG-001, WPG-002, WPG-016, CHI-004)
