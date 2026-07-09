## 1. Readback

- [ ] 1.1 @impl DEW-015, AGQ-018, AGQ-019, AGO-003, AGO-005, WPG-014, RWE-012: Read proposal/design/tasks, the five delta specs, `_backlog/plans/delegated-attempt-timeout-and-redo-postmortem-修复计划.md`, and Change A artifacts; record the simple recovery chain before target-code edits.
- [ ] 1.2 @impl DEW-015, WPG-014, RWE-012: Confirm registry entries remain present and `SRL-005` is not part of this change.

## 2. Engine Path

- [ ] 2.1 @impl DEW-015: Add `late-submit` preparation that reuses normal submit validation while admitting only `timed_out` originals.
- [ ] 2.2 @impl DEW-015: Reject `failed`, `abandoned`, normal `submitted`, identity mismatch, invalid output/cache/receipt, submitted replacement, and ambiguous retry state without authority mutation.
- [ ] 2.3 @impl DEW-015, AGO-003, AGO-005: Append exactly one audited submitted ledger row for accepted originals and include audit fields in the ledger hash.
- [ ] 2.4 @impl DEW-015, AGQ-018, AGQ-019: Remove queued retry demand or abandon claimed retry before writing the original queue `done` row; leave exactly one queue location for the completed `queue_item_id`.
- [ ] 2.5 @impl DEW-015: Add `operate-work-unit late-submit <bundle> --work-id <id> --result <result.json> --reason <reason>`.

## 3. Gate And Coverage

- [ ] 3.1 @impl WPG-014: Count audited late-accepted rows only when normal submitted-ledger provenance checks pass and no submitted replacement exists.
- [ ] 3.2 @impl WPG-014: Reject malformed audit fields and half-audit normal rows.
- [ ] 3.3 @impl RWE-012: Update controlled coverage for normal submit after timeout rejection, explicit late-submit success, replacement-submitted rejection, retry cleanup, and gate coverage from the audited row.

## 4. Tests

- [ ] 4.1 @impl DEW-015: Add focused engine/CLI tests for success, failed/abandoned rejection, normal submitted rejection, same-result audited idempotency, identity mismatch, reason required, and no-mutation rejection.
- [ ] 4.2 @impl DEW-015, AGQ-018, AGQ-019: Add queue transaction tests for queued retry removal, claimed retry abandon, submitted replacement rejection, and durable postconditions.
- [ ] 4.3 @impl AGO-003, AGO-005, WPG-014: Add ledger/gate tests for hash-covered audit fields, malformed audit rejection, and submitted replacement conflict.
- [ ] 4.4 @impl RWE-012: Run the controlled playbook coverage and record fixture distance.

## 5. Release And Governance

- [ ] 5.1 @impl DEW-015, WPG-014, RWE-012: Update `CHANGELOG.md` for `v0.16`.
- [ ] 5.2 @impl DEW-015, WPG-014, RWE-012: Sync `DPT_FRAMEWORK/RUN.md` version banner with `v0.16`.
- [ ] 5.3 @impl DEW-015, WPG-014, RWE-012: Run focused tests and record PASS/FAIL plus residual risk in change-local evidence.
- [ ] 5.4 @impl DEW-015, WPG-014, RWE-012: Run `node openspec/governance/check-project-reqs.mjs` and require PASS.
- [ ] 5.5 @impl DEW-015, WPG-014, RWE-012: Run `node openspec/governance/check-project-specs.mjs` and require PASS.
- [ ] 5.6 @impl DEW-015, WPG-014, RWE-012: Run OpenSpec validation if available; if unavailable, record that exact outcome.
