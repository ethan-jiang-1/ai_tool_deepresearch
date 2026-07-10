## 1. Readback

- [x] 1.1 @impl DEW-015, AGQ-018, AGQ-019, AGO-003, AGO-005, WPG-014, RWE-012: Read proposal/design/tasks, the five delta specs, `_backlog/plans/delegated-attempt-timeout-and-redo-postmortem-修复计划.md`, and Change A artifacts; done when implementation evidence records the simple recovery chain and non-goals before target-code edits.
- [x] 1.2 @impl DEW-015, WPG-014, RWE-012: Confirm registry entries for `DEW-015`, `WPG-014`, and `RWE-012` remain present; done when no logging/file/subagent/observability delta is listed for this change.

## 2. Engine Path

- [x] 2.1 @impl DEW-015: Add side-effect-free `late-submit` preparation that reuses normal submit validation while admitting only `timed_out` targeted records.
- [x] 2.2 @impl DEW-015: Reject `failed`, `abandoned`, normal `submitted`, identity mismatch, invalid output/cache/receipt, submitted replacement, and ambiguous retry state without queue/index/status/result/receipt/cache/ledger authority mutation.
- [x] 2.3 @impl DEW-015, AGO-003, AGO-005: Append exactly one audited submitted ledger row for accepted targeted work units and include audit fields in the ledger hash.
- [x] 2.4 @impl DEW-015, AGQ-018, AGQ-019: Remove queued retry demand or abandon claimed retry before writing the targeted queue `done` row; leave exactly one queue location for the completed `queue_item_id`.
- [x] 2.5 @impl DEW-015: Add `operate-work-unit late-submit <bundle> --work-id <id> --result <result.json> --reason <reason>`.
- [x] 2.6 @impl DEW-015: Update work-unit command guidance; done when Agent-facing docs name `late-submit` as the explicit timeout recovery command and keep normal `submit` fail-closed for terminal attempts.

## 3. Gate And Coverage

- [x] 3.1 @impl WPG-014: Count audited late-accepted rows only when normal submitted-ledger provenance checks pass and no submitted replacement exists.
- [x] 3.2 @impl WPG-014: Reject malformed audit fields and half-audit normal rows.
- [x] 3.3 @impl RWE-012: Update controlled coverage for normal submit after timeout rejection, explicit late-submit success, replacement-submitted rejection, retry cleanup, and gate coverage from the audited row.

## 4. Tests

- [x] 4.1 @impl DEW-015: Add focused engine/CLI tests for success, failed/abandoned rejection, normal submitted rejection, same-result audited idempotency with durable postconditions, broken-postcondition idempotency rejection, identity mismatch, reason required, and no-mutation rejection.
- [x] 4.2 @impl DEW-015, AGQ-018, AGQ-019: Add queue transaction tests for queued retry removal, claimed retry abandon, submitted replacement rejection, and durable postconditions.
- [x] 4.3 @impl AGO-003, AGO-005, WPG-014: Add ledger/gate tests for hash-covered audit fields, malformed audit rejection, and submitted replacement conflict.
- [x] 4.4 @impl RWE-012: Run the controlled playbook coverage and record fixture distance.

## 5. Release And Governance

- [x] 5.1 @impl DEW-015, WPG-014, RWE-012: Update `CHANGELOG.md` for `v0.16`.
- [x] 5.2 @impl DEW-015, WPG-014, RWE-012: Sync `DPT_FRAMEWORK/RUN.md` version banner with `v0.16`.
- [x] 5.3 @impl DEW-015, WPG-014, RWE-012: Run focused tests and record PASS/FAIL plus residual risk in change-local evidence.
- [x] 5.4 @impl DEW-015, WPG-014, RWE-012: Run `node openspec/governance/check-project-reqs.mjs` and require PASS.
- [x] 5.5 @impl DEW-015, WPG-014, RWE-012: Run `node openspec/governance/check-project-specs.mjs` and require PASS.
- [x] 5.6 @impl DEW-015, WPG-014, RWE-012: Run OpenSpec validation if available; if unavailable, record that exact outcome.
