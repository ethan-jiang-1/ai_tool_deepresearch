## Why

Change A already made timeout harder to trigger too early. This Change B covers the smaller remaining race: a work unit is already `timed_out`, but the original result later appears and still validates against the original work-unit identity.

Without a narrow Engine path, the Agent is tempted to hand-edit state, rewrite the result as a retry, or keep redoing work. We only need one simple recovery command that leaves enough durable trace for gates and future Agents to understand what happened.

## What Changes

- Add explicit audited recovery:
  - `node DPT_FRAMEWORK/cli/operate-work-unit.mjs late-submit <bundle> --work-id <timed_out_id> --result <result.json> --reason <reason>`
- Normal `operate-work-unit submit` still rejects terminal attempts.
- `late-submit` applies only to `timed_out` work units.
- The candidate result must validate with the original `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, outputs, cache trails, and receipt.
- If the same `queue_item_id` already has submitted replacement coverage, reject.
- If retry demand exists but has not submitted, remove queued retry demand or abandon the claimed retry, then complete the original.
- Append one submitted ledger row for the original work unit with small audit fields:
  - `late_accept: true`
  - `late_accept_reason`
  - `terminal_status_before_accept: "timed_out"`
  - `superseded_retry_work_ids`
- Gates count the row only if the normal submitted-ledger checks still pass.
- Add focused controlled coverage for normal submit rejection, explicit late-submit success, replacement-submitted rejection, and gate coverage from the audited row.

## Non-Goals

- Do not let normal `submit` accept `timed_out`, `failed`, or `abandoned`.
- Do not rescue `failed` or `abandoned`.
- Do not rewrite original output into retry identity.
- Do not add a new work-unit status.
- Do not introduce watchers, daemons, queue-complete bypasses, manual ledger repair, or environment-variable configuration.
- Do not add dependencies or Python.

## Modified Capabilities

- `delegated-work-units`: add the explicit audited late-submit exception.
- `agentic-queue`: keep one queue location after late-submit success.
- `agent-output-declaration`: allow the audited row as the same submitted ledger authority class.
- `work-unit-provenance-gate`: count audited late-accepted rows only when normal provenance checks pass.
- `research-wave-experiments`: update controlled fault-tolerance coverage for the new explicit path.

## Impact

- Target implementation is expected around `operate-work-unit`, work-unit submit/terminal transaction helpers, work-unit ledger schema/hash, queue cleanup, and provenance gate readers.
- Target tests are focused engine/CLI/queue/ledger/gate tests plus one controlled playbook update.
- Version bump: target framework version `v0.16`.
