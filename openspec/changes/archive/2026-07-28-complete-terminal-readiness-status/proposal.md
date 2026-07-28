## Why

BUG-135 records a terminal contradiction: after the witnessed final handoff,
`rb_status.json` can report `current_gate: readiness_passed` and
`next_gate: none` while retaining `state: not_started`. The existing terminal
status transaction already determines the gate pair and rolls back if trace
append fails, but it omits the lifecycle state from its next-status object.

The bounded reader question is: what lifecycle state is true once the normal
readiness-to-Final handoff commits? `rb_status.json` is the direct source of
record, and a reader can stop at its terminal triple rather than infer
completion from gate fields. The change preserves the distinction between a
normal terminal handoff and accepted post-final rerun recovery: only the former
commits the terminal triple; recovery retains its existing derived rerun window.

## What Changes

- Modify the existing normal terminal `advance-status --to readiness_passed`
  transaction so the written status triple is `readiness_passed / none /
  completed`.
- Keep status-write then trace-append rollback atomic: a trace append failure
  restores the complete prior status bytes, including its prior lifecycle state.
- Keep all non-terminal status-state behavior and accepted post-final reentry
  unchanged; no new lifecycle state, completion checker, recovery operation,
  validator, or CLI is introduced.
- Add focused temporary-bundle integration regressions for terminal completion,
  rollback, and completed-run post-final recovery compatibility.
- Release the scoped lifecycle correction as v0.57, updating `CHANGELOG.md`
  and the `DPT_FRAMEWORK/RUN.md` banner during apply.

The shortest legal loop remains witnessed handoff -> existing `advance-status`
transaction -> one authoritative status triple -> existing Final delivery or
accepted recovery. This is net simplification: downstream consumers no longer
need a second derived completion predicate over `current_gate` and `next_gate`.

The user has authorized the ordinary proposal/apply lifecycle. The Agent will
perform allowed mechanical execution; the Engine writes and verifies the
deterministic status/trace facts. No human decision creates an override or new
mutation authority.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-phase-transition`: the existing terminal readiness status
  synchronization writes the authoritative `completed` lifecycle state in the
  same rollback-protected transaction.

## Impact

- Code: `DPT_FRAMEWORK/cli/advance-status.mjs` only, unless focused regression
  evidence demonstrates an existing direct status consumer needs a compatible
  assertion update.
- Specs: delta for `cli-phase-transition` using existing CPT-001 and CPT-004;
  no new requirement registry entry.
- Tests: focused `tests/integration/cli/advance-status.test.mjs` and existing
  post-final recovery integration coverage with disposable bundles.
- Dependencies: none added.
