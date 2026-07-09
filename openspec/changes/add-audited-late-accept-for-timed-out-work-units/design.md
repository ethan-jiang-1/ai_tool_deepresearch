## Principle

Keep this change small. `late-submit` is not a second delegated-work system. It is an explicit audited exception for one terminal race:

```text
original claimed
  -> timeout creates retry possibility
  -> original result arrives late
  -> Engine validates original result
  -> Engine accepts original or rejects without authority mutation
```

The durable trace is enough. The Agent can reason from the command result, submitted ledger row, work-unit index, queue state, and gate diagnostics.

## Transaction

`lateSubmitWorkUnit()` should reuse normal submit validation wherever possible. The only planned differences from normal submit are:

- target status may be `timed_out`;
- the original work unit is no longer expected in `delegated_in_flight`;
- retry cleanup may be needed before queue completion.

Successful transaction:

1. Load original record, manifest, queue, candidate result, receipt, outputs, cache trails, index, and existing ledger rows.
2. Reject unless original status is `timed_out`.
3. Validate original identity and submit surfaces using the normal submit rules.
4. Reject if a different work unit for the same `queue_item_id` is already submitted or already has a submitted ledger row.
5. If a retry demand for the same queue item is queued, remove it.
6. If a retry attempt for the same queue item is claimed, mark it `abandoned` with `terminal_reason: "superseded_by_late_accept"` and clear `delegated_in_flight`.
7. Mark the original submitted, append one audited submitted ledger row, and write one queue terminal-history `done` row for the original.
8. Reload queue/index/ledger and verify postconditions before reporting success.

If retry state is ambiguous, reject and leave authority files unchanged except for diagnostic trace/log.

## Audit Fields

The submitted ledger row adds only:

```json
{
  "late_accept": true,
  "late_accept_reason": "...",
  "terminal_status_before_accept": "timed_out",
  "superseded_retry_work_ids": []
}
```

These fields are included in the ledger hash. Normal submitted rows must not carry half-audit metadata.

## Postconditions

Success must prove:

- original index record is `submitted`;
- exactly one submitted ledger row exists for the original work unit;
- no submitted replacement exists for the same `queue_item_id`;
- completed `queue_item_id` is absent from `delegated_in_flight`;
- no queued retry demand remains for that `queue_item_id`;
- queue terminal history has one `done` row for the original `work_id`;
- any superseded retry work IDs are `abandoned` and non-covering.

## Review Matrix

| State | Outcome |
| --- | --- |
| `timed_out` original, valid result, no retry | accept original |
| queued retry exists, not submitted | remove retry demand, accept original |
| claimed retry exists, not submitted | abandon retry, accept original |
| replacement already submitted | reject |
| target is `failed` or `abandoned` | reject |
| target is normal `submitted` | reject explicit `late-submit` |
| existing audited late-submit with same result hash | idempotent success without a second row |
| ambiguous retry/queue state | reject |
