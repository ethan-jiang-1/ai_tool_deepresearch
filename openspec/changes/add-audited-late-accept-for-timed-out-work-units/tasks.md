## 1. Scope, Registry, And Readback

- [ ] 1.1 @impl DEW-015, WPG-014, RWE-012: Read this proposal/design/tasks, all delta specs, `_backlog/plans/delegated-attempt-timeout-and-redo-postmortem-修复计划.md`, and Change A artifacts; record scope readback before target-code edits.
- [ ] 1.2 @impl DEW-015, WPG-014, RWE-012: Confirm `DEW-015`, `WPG-014`, and `RWE-012` are registered in `openspec/governance/req-registry.yaml` in sorted capability groups.
- [ ] 1.3 @impl DEW-015, WPG-014, RWE-012: Confirm this change excludes normal submit accepting terminal attempts, failed/abandoned late accept, identity rewrite into retry work IDs, metadata-only relabel, hand-written ledger repair, gate floor changes, pause/resume lease, Engine-owned fetcher/watcher/daemon, new dependencies, environment-variable configuration, and Python usage.
- [ ] 1.4 @impl DEW-015: Audit current normal submit, dry-submit, terminal timeout retry, queue refill/preempt, ledger append, rollback, and gate reader paths; record mutation and reuse plan before implementation.
- [ ] 1.5 @impl DEW-015, WPG-014, RWE-012: Create change-local `implementation-evidence.md` before target-code edits; include late-submit validation reuse plan, retry conflict matrix, queue transaction/postcondition plan, gate counting plan, controlled coverage plan, and explicit non-goals.

## 2. Late-Submit Engine And CLI

- [ ] 2.1 @impl DEW-015: Add late-submit preparation mode that reuses normal submit validation/canonicalization while explicitly allowing only original `timed_out` records and rejecting `failed`, `abandoned`, `claimed`, ambiguous, or already submitted replacement states.
- [ ] 2.2 @impl DEW-015: Validate original attempt identity across result, runtime receipt, manifest, beacon, index, status file, queue demand snapshot, output declarations, cache trails, source claims, hashes, and nonce before any mutation.
- [ ] 2.3 @impl DEW-015: Extend work-unit ledger schema/building for audited late-accept fields: `late_accept`, `late_accept_reason`, `terminal_status_before_accept`, and `superseded_retry_work_ids`; include the audit fields in ledger hash calculation.
- [ ] 2.4 @impl DEW-015: Implement `lateSubmitWorkUnit()` with structured success/rejection payloads and durable trace/log diagnostics for accepted and rejected late-submit attempts.
- [ ] 2.5 @impl DEW-015: Add `operate-work-unit late-submit <bundle> --work-id <id> --result <result.json> --reason <reason>`; require `--reason`; return structured JSON; keep normal `operate-work-unit submit` rejection for terminal `timed_out`.
- [ ] 2.6 @impl DEW-015: Annotate touched implementation surfaces with `// @impl DEW-015` where they enforce late-submit validation, audit fields, command routing, and transaction postconditions.

## 3. Queue-Safe Retry Cleanup

- [ ] 3.1 @impl DEW-015: Implement retry conflict detection for same `queue_item_id` across submitted ledger/index rows, `active_window`, `refill_pool`, and `delegated_in_flight`, using retry lineage such as `retry_of_work_id` when present.
- [ ] 3.2 @impl DEW-015: Reject late-submit with no mutation when any later retry/replacement for the same queue item is already submitted or has an existing submitted ledger row.
- [ ] 3.3 @impl DEW-015: Remove queued retry demand from `active_window` or `refill_pool` when no replacement has submitted and the original timed-out attempt is accepted.
- [ ] 3.4 @impl DEW-015: Supersede a claimed retry attempt that has not submitted by terminalizing its work-unit record as non-covering, clearing `delegated_in_flight`, recording supersede diagnostics, and preserving its audit identity.
- [ ] 3.5 @impl DEW-015: Verify successful late-submit durable postconditions by reloading queue/index/ledger: original submitted, one late-accepted ledger row, no in-flight/queued retry demand for the queue item, no submitted replacement, terminal history done for original, and superseded retry IDs terminal/non-covering.
- [ ] 3.6 @impl DEW-015: Add rollback/suspect-state diagnostics for late-submit if transaction postconditions fail after partial writes.

## 4. Gate And Inspection Surfaces

- [ ] 4.1 @impl WPG-014: Update submitted-ledger readers and provenance gate helpers so schema-valid audited late-accepted rows count exactly like submitted work-unit rows after the same hash/nonce/result/cache/output cross-checks.
- [ ] 4.2 @impl WPG-014: Ensure gates reject late-accepted rows when audit fields are malformed, the index is not `submitted`, the row does not bind to the original timed-out identity, or a submitted replacement exists for the same queue item.
- [ ] 4.3 @impl WPG-014: Add diagnostics that preserve `late_accept`, `terminal_status_before_accept`, `late_accept_reason`, and `superseded_retry_work_ids` context without treating late accept as a weaker or alternate authority tier.
- [ ] 4.4 @impl DEW-015, WPG-014: Update work-unit inspect/health projection if needed so late-accepted rows and superseded retries are visible as audit diagnostics, not hidden success magic.

## 5. Regression And Controlled Coverage

- [ ] 5.1 @impl DEW-015: Add unit tests for normal submit after timeout rejection, eligible timed-out late-submit success, failed/abandoned late-submit rejection, identity/nonce mismatch rejection, cache/source/receipt/output validation rejection, and reason-required CLI/API behavior.
- [ ] 5.2 @impl DEW-015: Add transaction tests for queued retry removal, claimed retry supersede, replacement-already-submitted rejection, no double ledger, durable queue postconditions, and rollback/suspect diagnostics.
- [ ] 5.3 @impl DEW-015: Add CLI integration tests for `operate-work-unit late-submit` structured JSON success/rejection output and for unchanged normal `submit` terminal rejection.
- [ ] 5.4 @impl WPG-014: Add gate/provenance reader tests proving audited late-accepted rows count only when hash-valid and identity-valid, and malformed audit fields or submitted replacements fail closed.
- [ ] 5.5 @impl RWE-012: Add or update controlled fault-tolerance / late-accept playbook coverage using approved disposable-bundle infrastructure and production `operate-work-unit` CLI/API boundaries after fixture setup.
- [ ] 5.6 @impl RWE-012: Cover normal submit after timeout rejection, explicit late-submit success, replacement-submitted rejection, queued retry removal, claimed retry supersede, failed/abandoned rejection, and gate coverage from the audited row; record fixture distance and trace-backed verdict assertions.

## 6. Release And Governance

- [ ] 6.1 @impl DEW-015, WPG-014, RWE-012: Update `CHANGELOG.md` with framework `v0.16` and a concise audited late-accept summary.
- [ ] 6.2 @impl DEW-015, WPG-014, RWE-012: Sync `DPT_FRAMEWORK/RUN.md` version banner with the `v0.16` changelog entry.
- [ ] 6.3 @impl DEW-015, WPG-014, RWE-012: Run focused engine, CLI, gate/provenance, and controlled playbook tests; record PASS/FAIL and residual risk in change-local implementation evidence.
- [ ] 6.4 @impl DEW-015, WPG-014, RWE-012: Run `node openspec/governance/check-project-reqs.mjs` and require PASS.
- [ ] 6.5 @impl DEW-015, WPG-014, RWE-012: Run `node openspec/governance/check-project-specs.mjs` and require PASS.
- [ ] 6.6 @impl DEW-015, WPG-014, RWE-012: Run OpenSpec validation for `add-audited-late-accept-for-timed-out-work-units` if available; if CLI is unavailable, record the exact unavailable outcome and rely on Node governance checks plus artifact review.
