# Apply Target Manifest

## Direct Owners

| Fact / behavior | Existing owner | Apply action |
| --- | --- | --- |
| Normal `readiness_passed -> none` status window | `DPT_FRAMEWORK/cli/advance-status.mjs#nextStatus` | Add only the conditional `state: completed` field to the existing transaction object. |
| Status durability and trace-failure restoration | `advance-status.mjs` status-write then trace-append rollback | Retain without a second writer or rollback path; prove exact restoration. |
| Accepted post-final rerun status window | existing CPT-004 exception in `advance-status.mjs` and post-final recovery consumers | Do not change production behavior; make the terminal fixture start as `completed`. |
| Terminal and rollback proof | `tests/integration/cli/advance-status.test.mjs` | Extend current production-CLI temporary-bundle cases. |
| Completed-run recovery proof | `tests/integration/cli/post-final-recovery-fixture.mjs` and `post-final-recovery.test.mjs` | Align fixture with valid terminal state and assert its retained recovery outcome. |

## Control Surface Review

Added: one existing `RunState` value in one already-owned terminal status
write. Removed/avoided: a derived completion check, new validator, writer,
state, CLI, trace event, retry branch, or recovery path. The normal terminal
transaction remains the only writer of the terminal triple; accepted recovery
continues to use its existing event/load/status sequence.
