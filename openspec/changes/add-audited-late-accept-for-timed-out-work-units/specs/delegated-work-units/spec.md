> req: DEW-015

## MODIFIED Requirements

### Requirement: Submit SHALL be the only successful delegated completion transition

Successful delegated completion SHALL occur only through Engine-owned work-unit completion commands against an explicit active bundle path. The normal path remains file-based `operate-work-unit submit` for `claimed` attempts, with the existing same-content duplicate behavior for already submitted attempts. Normal submit SHALL validate the result, runtime receipt, nonce, output files, cache trails, queue binding, snapshot hash, index state, and idempotency fingerprint before it completes queue demand or appends the bundle-root output declaration ledger.

Normal `operate-work-unit submit` SHALL NOT accept terminal `timed_out`, `failed`, or `abandoned` attempts. The only terminal recovery exception is explicit audited `operate-work-unit late-submit` for eligible `timed_out` attempts. Late-submit SHALL use the same validation authority as normal submit and SHALL produce an audited Engine-written submitted ledger row if accepted.

#### Scenario: normal submit still rejects timed-out attempt

- **WHEN** a work unit has terminal status `timed_out`
- **AND** a caller invokes normal `operate-work-unit submit`
- **THEN** submit SHALL reject with a late-submit rejection diagnostic
- **AND** no queue completion, status change to submitted, or ledger append SHALL occur

### Requirement: Terminal attempt transitions SHALL fail closed

`fail`, `timeout`, and `abandon` SHALL close the current work-unit attempt without queue completion or ledger coverage. Retry or replacement SHALL allocate a new `work_id`. Normal late submit against a terminal attempt SHALL fail closed.

The sole exception is explicit audited `late-submit` for a terminal `timed_out` attempt. `late-submit` SHALL NOT apply to `failed` or `abandoned` attempts. A late-accepted timed-out attempt SHALL be accepted only through the audited queue-safe transaction defined for late-submit, and only when no replacement attempt has already submitted.

#### Scenario: failed and abandoned attempts remain fail-closed

- **WHEN** a work unit has terminal status `failed` or `abandoned`
- **AND** a caller invokes `operate-work-unit late-submit`
- **THEN** the command SHALL reject fail-closed
- **AND** no ledger row, queue completion, retry cleanup, or gate coverage SHALL be produced

## ADDED Requirements

### Requirement: Audited late-submit SHALL recover eligible timed-out work units without identity rewrite

The work-unit CLI SHALL provide explicit audited late acceptance for already timed-out work units:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs late-submit <bundle> --work-id <timed_out_id> --result <result.json> --reason <reason>
```

`late-submit` SHALL require a non-empty reason and SHALL accept only a work-unit index record whose status is `timed_out`. It SHALL validate the candidate result, runtime receipt, declared output files, cache trails, source claims, manifest, beacon, status file, hashes, queue lineage, and receipt nonce before any success mutation. The submitted result SHALL match the original timed-out attempt's `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`. The Engine SHALL NOT rewrite old outputs into a retry attempt identity.

Late-submit SHALL be a single queue-safe work-unit transaction. If the same `queue_item_id` has a later retry/replacement that is already submitted or already has a submitted ledger row, late-submit SHALL reject with no mutation. If retry demand for the same queue item remains queued in `active_window` or `refill_pool`, late-submit MAY remove that retry demand while accepting the original attempt. If a retry attempt for the same queue item is claimed but not submitted, late-submit MAY terminalize that retry attempt as superseded/abandoned, clear `delegated_in_flight`, and accept the original attempt.

An accepted late-submit SHALL append exactly one Engine-written submitted ledger row for the original `work_id`. That row SHALL include audited late-accept fields:

- `late_accept: true`
- `late_accept_reason`
- `terminal_status_before_accept: "timed_out"`
- `superseded_retry_work_ids`

The audit fields SHALL be part of the ledger row hash. Successful late-submit SHALL verify durable postconditions before reporting success: original index record is `submitted`; `rb_output_declarations.jsonl` contains exactly one submitted row for the original `work_id`; `delegated_in_flight` has no entry for the completed queue item; no queued retry demand for that queue item remains; no different submitted replacement exists for that queue item; `terminal_history` contains a done record for the original `queue_item_id` and `work_id`; and every superseded retry work ID is terminal and non-covering.

#### Scenario: eligible timed-out attempt is late accepted

- **WHEN** a work unit is `timed_out`
- **AND** its original result, receipt, output files, cache trails, source claims, manifest, beacon, hashes, and nonce validate for the original `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`
- **AND** no later retry/replacement for the same queue item has submitted
- **THEN** `operate-work-unit late-submit` SHALL mark the original work unit `submitted`
- **AND** append one audited late-accepted ledger row for the original `work_id`
- **AND** complete the bound queue item through durable queue postconditions

#### Scenario: replacement already submitted rejects late-submit

- **WHEN** a timed-out work unit has a later replacement for the same `queue_item_id`
- **AND** that replacement is already submitted or has a submitted ledger row
- **THEN** `late-submit` SHALL reject
- **AND** the command SHALL NOT append a second ledger row or modify queue/index authority

#### Scenario: queued retry demand is removed by late-submit

- **WHEN** a timed-out work unit has matching valid original outputs
- **AND** retry demand for the same queue item remains in `active_window` or `refill_pool`
- **AND** no replacement has submitted
- **THEN** `late-submit` MAY remove the queued retry demand in the same transaction
- **AND** the original queue item SHALL be completed by the late-accepted original `work_id`

#### Scenario: claimed retry attempt is superseded by late-submit

- **WHEN** a timed-out work unit has matching valid original outputs
- **AND** a retry attempt for the same queue item is claimed but not submitted
- **THEN** `late-submit` MAY terminalize the retry attempt as superseded/abandoned
- **AND** SHALL clear the retry attempt from `delegated_in_flight`
- **AND** SHALL record the superseded retry work ID in the audited late-accepted ledger row

#### Scenario: identity rewrite is rejected

- **WHEN** a caller submits a result whose content was produced by the timed-out original attempt
- **BUT** the result has been rewritten to use a retry `work_id` or retry `receipt_nonce`
- **THEN** `late-submit` SHALL reject identity mismatch
- **AND** advice SHALL direct repair through original-attempt identity or a fresh replacement submit, not by editing historical identity

#### Scenario: late-submit validates output authority

- **WHEN** a timed-out attempt has a plausible result file
- **BUT** required output files, cache trails, source claims, runtime receipt, nonce, or hashes fail validation
- **THEN** `late-submit` SHALL reject before ledger append
- **AND** diagnostics SHALL identify repairable validation surfaces without completing queue demand
