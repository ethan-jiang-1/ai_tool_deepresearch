# Apply Evidence

## Pre-Edit Baseline (2026-08-07)

- `node openspec/governance/check-verification-routing.mjs --change remove-recursive-queue-failure-repair --mode plan`: PASS (5 deterministic claims).
- `openspec validate remove-recursive-queue-failure-repair --strict`: PASS.
- The focused current-surface command below exited `0` before target edits:

  ```sh
  node --test \
    tests/schema/contracts/queue.test.mjs \
    tests/engine/queue-manager-window-lifecycle.test.mjs \
    tests/engine/helpers/phase-queue-drain.test.mjs \
    tests/integration/cli/operate-queue-validation.test.mjs \
    tests/integration/cli/check-gate-wave-queue-drain.test.mjs
  ```

## Direct BUG-203 Observation

A disposable temporary bundle was created through the real Queue Manager API:
`createQueue` -> `enqueue` -> `fail` -> `fail`. No queue JSON, trace, receipt,
or result authority was hand-authored. The second `fail` terminalized the first
generated repair and returned an active item with a `repair-repair-*` identity.
The temporary bundle was removed after observation.

```json
{
  "terminal_history": [
    { "queue_item_id": "baseline-source", "terminal_status": "failed", "reason": "first failure" },
    { "queue_item_id": "repair-baseline-source-<timestamp>", "terminal_status": "failed", "reason": "second failure" }
  ],
  "active_window": ["repair-repair-baseline-source-<timestamp>-<timestamp>"]
}
```

This is deterministic Engine-path evidence for bounded-recovery work only. It
does not establish an Agent-flow claim.

## Post-Edit Deterministic Verification (2026-08-07)

The selected verification assets were rerun after implementation:

```sh
node --test \
  tests/schema/contracts/queue.test.mjs \
  tests/engine/queue-manager-window-lifecycle.test.mjs \
  tests/engine/helpers/phase-queue-drain.test.mjs \
  tests/engine/queue-manager-receipts-cli-render.test.mjs \
  tests/integration/cli/operate-queue-validation.test.mjs \
  tests/integration/cli/check-gate-wave-queue-drain.test.mjs
```

Result: `85` passed, `0` failed. This is deterministic-contract evidence for
the selected unit and integration claims only; it does not claim a real Agent
flow or runtime recovery observation.

## Archive-Readiness Governance (2026-08-07)

- `node openspec/governance/check-verification-routing.mjs --change remove-recursive-queue-failure-repair --mode assets`: PASS (`6` claims).
- `openspec validate remove-recursive-queue-failure-repair --strict`: PASS.
- `node openspec/governance/check-project-reqs.mjs`: PASS (`630` registered,
  `53` retired, `0` orphan; `739` occurrences across main specs and active
  deltas).
- `node openspec/governance/check-project-specs.mjs`: PASS (`84` main specs,
  `0` violations).

## Closeout Regression Rerun (2026-08-07)

Closeout review added the missing public stale-front admission case. The same
selected verification command then passed with `86` tests and `0` failures.
The new integration assertion submits an otherwise legal non-front demand to
`operate-queue fail`, receives the current-front rejection, and compares the
raw `rb_queue.json` bytes before and after the invocation.

## Closeout Review (2026-08-07)

The scoped review covered the Queue schema/lifecycle/helper/render changes,
their selected test assets, the synchronized `AGQ-019` and `GSK-008` main
requirements, and the `v0.75` release notes. The sole actionable finding was
the missing stale-front public regression; it is closed above. No open
change-scoped finding remains. Change B planning artifacts were excluded from
this implementation review and remain planning-only until this archive
transition completes.
