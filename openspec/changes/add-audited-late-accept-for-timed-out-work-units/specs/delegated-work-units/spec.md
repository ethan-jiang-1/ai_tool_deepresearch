> req: DEW-005, DEW-006, DEW-011, DEW-015

## MODIFIED Requirements

### Requirement: Submit SHALL be the only successful delegated completion transition

Successful delegated completion normally occurs only through file-based `operate-work-unit submit` against an explicit active bundle path. Normal submit SHALL continue to accept only eligible claimed attempts and SHALL reject terminal `timed_out`, `failed`, and `abandoned` attempts without queue completion or ledger append.

The only terminal completion exception is explicit audited `operate-work-unit late-submit` for eligible `timed_out` attempts.

#### Scenario: normal submit still rejects timed-out attempts

- **WHEN** a work unit is `timed_out`
- **AND** a caller invokes normal `operate-work-unit submit`
- **THEN** submit SHALL reject
- **AND** no queue completion or ledger append SHALL occur

### Requirement: Terminal attempt transitions SHALL fail closed

`fail`, `timeout`, and `abandon` SHALL close the current work-unit attempt without queue completion or ledger coverage. Retry or replacement SHALL allocate a new `work_id`.

Explicit audited `late-submit` MAY recover only a `timed_out` original attempt. It SHALL NOT recover `failed` or `abandoned` attempts.

#### Scenario: failed and abandoned are not recoverable

- **WHEN** a work unit is `failed` or `abandoned`
- **AND** a caller invokes `operate-work-unit late-submit`
- **THEN** the command SHALL reject
- **AND** no retry cleanup, queue completion, or ledger append SHALL occur

## ADDED Requirements

### Requirement: Audited late-submit SHALL recover eligible timed-out work units

The work-unit CLI SHALL provide:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs late-submit <bundle> --work-id <timed_out_id> --result <result.json> --reason <reason>
```

`late-submit` SHALL require a non-empty reason. It SHALL accept only an original work-unit record whose current status is `timed_out`. It SHALL validate the candidate result through the normal submit authority for identity, runtime receipt, output files, cache trails, source claims, hashes, manifest, beacon, status file, queue binding evidence, and nonce.

Accepted late-submit SHALL preserve the original `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`. It SHALL NOT rewrite old output into a retry work-unit identity.

Before success, late-submit SHALL reject if another work unit for the same `queue_item_id` is already submitted or already has a submitted ledger row. If retry demand for the same queue item is still queued, late-submit SHALL remove it. If a retry attempt for the same queue item is claimed but not submitted, late-submit SHALL mark that retry work unit `abandoned` with `terminal_reason: "superseded_by_late_accept"` and clear `delegated_in_flight`. If the retry/queue state cannot be understood safely, late-submit SHALL reject without authority mutation.

Accepted late-submit SHALL mark the original work unit `submitted`, append exactly one Engine-written submitted ledger row for the original `work_id`, and write exactly one queue terminal-history `done` row for the original `queue_item_id` / `work_id`. The ledger row SHALL include `late_accept: true`, `late_accept_reason`, `terminal_status_before_accept: "timed_out"`, and `superseded_retry_work_ids`; these fields SHALL be part of the ledger hash. Normal rows SHALL NOT carry half-audit metadata.

#### Scenario: eligible timed-out original is accepted

- **WHEN** a work unit is `timed_out`
- **AND** the candidate result validates against the original identity and submit surfaces
- **AND** no submitted replacement exists for the same `queue_item_id`
- **THEN** `late-submit` SHALL mark the original work unit `submitted`
- **AND** append one audited submitted ledger row for the original
- **AND** complete the queue item through durable queue postconditions

#### Scenario: submitted replacement blocks late-submit

- **WHEN** a different work unit for the same `queue_item_id` is already submitted or has a submitted ledger row
- **THEN** `late-submit` SHALL reject
- **AND** no second submitted row SHALL be created for that queue item

#### Scenario: retry is cleaned up by late-submit

- **WHEN** an eligible timed-out original has retry demand still queued or claimed
- **AND** no retry/replacement has submitted
- **THEN** accepted `late-submit` SHALL remove queued retry demand or abandon the claimed retry
- **AND** the queue SHALL contain one completed terminal-history row for the original work unit

#### Scenario: repeated audited late-submit is idempotent

- **WHEN** the original was already accepted through `late-submit`
- **AND** the candidate result hash matches the existing audited submitted row
- **THEN** the command MAY return idempotent success
- **AND** it SHALL NOT append another ledger row or queue terminal-history row
