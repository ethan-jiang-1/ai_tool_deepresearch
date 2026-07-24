## MODIFIED Requirements

### Requirement: Terminal attempt transitions SHALL fail closed

`fail`, `timeout`, and `abandon` SHALL close the current work-unit attempt without queue completion or ledger coverage. Retry or replacement SHALL allocate a new `work_id` only through the existing role-bound `claim` operation.

Explicit audited `late-submit` MAY recover only a command-targeted `timed_out` attempt. It SHALL NOT recover `failed` or `abandoned` attempts.

The work-unit CLI SHALL provide:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs replace <bundle> --work-id <failed_or_abandoned_id>
```

`replace` SHALL create at most one ordinary replacement queue demand from one terminal parent attempt. It SHALL accept only a `failed` or `abandoned` index record with one matching queue `terminal_history` row and an exact matching immutable queue-item snapshot across the record, manifest, and terminal row. It SHALL derive a fresh queue-demand identity from the parent `work_id`, preserve the recorded assignment facts, and add only auditable parent-attempt lineage plus ordinary queue timestamps/status. It SHALL admit that demand through the existing queue admission path.

`replace` SHALL allocate no work ID, envelope, receipt, result, cache trail, source claim, ledger row, Gate result, or queue completion. Its successful result SHALL name the replacement `queue_item_id`, its queue location, and the parent terminal fact. For a newly created or queued idempotent successor, it SHALL name the existing role-bound `claim` checkpoint; a current actor observation remains required before claim can allocate a fresh work ID. For an idempotent successor already in `delegated_in_flight`, it SHALL disclose only that already-allocated successor `work_id` and direct the Phase to reconstruct and poll it rather than claim again. It SHALL append exactly one `work_unit_replacement_created` trace event when it creates a demand; idempotent and no-path results SHALL append no replacement-created event.

`replace` on a `timed_out` attempt SHALL refuse and identify the existing timed-out retry path. It SHALL refuse submitted or claimed attempts, missing/mismatched terminal snapshot authority, an existing successor with conflicting lineage/snapshot, or an already terminal successor, without mutation. A repeated call while the exact derived successor is queued or delegated in flight SHALL return that same successor idempotently; it SHALL NOT create a sibling demand. A child that terminalized is itself the only legal parent for a further replacement.

#### Scenario: timeout retry allocates replacement ID

- **WHEN** a claimed work unit is timed out and the queue demand remains valid
- **THEN** the Engine SHALL close the timed-out attempt
- **AND** a later retry SHALL use a different `work_id`

#### Scenario: failed and abandoned are not recoverable

- **WHEN** a work unit is `failed` or `abandoned`
- **AND** a caller invokes `operate-work-unit late-submit`
- **THEN** the command SHALL reject
- **AND** no retry cleanup, queue completion, or ledger append SHALL occur

#### Scenario: terminal attempt derives one replacement demand

- **WHEN** a failed or abandoned work unit has matching terminal record, manifest, and terminal-history snapshot authority
- **AND** no successor has been derived from that parent work ID
- **THEN** `operate-work-unit replace` SHALL enqueue one fresh lineage-bound queue demand
- **AND** it SHALL return that demand's `queue_item_id` and the existing role-bound claim action without allocating a work ID

#### Scenario: timed-out attempt keeps its existing retry path

- **WHEN** a caller invokes `operate-work-unit replace` for a timed-out work unit
- **THEN** the command SHALL reject without queue or index mutation
- **AND** its feedback SHALL identify the existing timed-out retry-demand path rather than reclassifying the attempt

#### Scenario: queued replacement is idempotent at the normal claim boundary

- **WHEN** the exact replacement demand for a terminal parent is already queued
- **THEN** another `replace` call SHALL return that same queue-item identity without creating another demand
- **AND** it SHALL return the ordinary role-bound claim checkpoint without allocating a work ID

#### Scenario: in-flight replacement is idempotent at the existing work boundary

- **WHEN** the exact replacement demand for a terminal parent is already delegated in flight
- **THEN** another `replace` call SHALL return that same queue-item identity and its already-allocated work ID without creating another demand
- **AND** it SHALL direct the Phase to reconstruct and poll that work rather than claim again

#### Scenario: terminal successor does not reopen its earlier parent

- **WHEN** the exact replacement demand for a terminal parent has terminal history
- **THEN** another `replace` call SHALL refuse without queue or index mutation
- **AND** the earlier parent SHALL not create another successor
