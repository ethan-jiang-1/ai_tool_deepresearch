## Principle

Keep this change small. `late-submit` is not a second delegated-work system. It is an explicit audited exception for one terminal race:

```text
targeted work unit claimed
  -> timeout creates retry possibility
  -> targeted result arrives late
  -> Engine validates targeted result
  -> Engine accepts targeted work or rejects without authority mutation
```

The existing durable surfaces are enough. The Agent can reason from the command result, submitted ledger row, work-unit index, queue state, and gate diagnostics. Trace/log diagnostics explain what happened; they do not replace submitted ledger and gate authority.

Here "targeted" means the `work_id` passed to `late-submit` and that record's own identity fields, not a new first-attempt lineage proof.

Source of Record:

- active bundle `_work_units/_index.json` owns work-unit status and identity;
- active bundle `rb_queue.json` owns queue locations;
- active bundle `rb_output_declarations.jsonl` owns submitted ledger coverage;
- work-unit manifest/result/receipt/output/cache surfaces are submit validation inputs;
- gate readers decide coverage from the submitted ledger plus cross-checks.

## State Rules

| Target status | `late-submit` behavior |
| --- | --- |
| `timed_out` | may validate and mutate to submitted |
| `submitted` with existing valid `late_accept: true` row, same result hash, and durable postconditions still true | may return idempotent success without mutation |
| normal `submitted` | reject |
| `failed` or `abandoned` | reject |
| `claimed` | reject; use normal `submit` |

## Transaction

`lateSubmitWorkUnit()` should reuse normal submit validation wherever possible. Preparation should be side-effect-free until all late-submit rejection checks have passed, so a rejected late-submit does not rewrite result, receipt, cache, queue, index, status, or ledger authority. The only planned differences from normal submit are:

- target status may be `timed_out`;
- the targeted work unit is no longer expected in `delegated_in_flight`;
- retry cleanup may be needed before queue completion.

Successful transaction:

1. Load targeted record, manifest, queue, candidate result, receipt, outputs, cache trails, index, and existing ledger rows.
2. Apply the state rules above.
3. For `timed_out`, validate targeted identity and submit surfaces using the normal submit rules without durable side effects.
4. Reject if a different work unit for the same `queue_item_id` is already submitted or already has a submitted ledger row.
5. If a retry demand for the same queue item is queued, remove it.
6. If a retry attempt for the same queue item is claimed, mark it `abandoned` with `terminal_reason: "superseded_by_late_accept"` and clear `delegated_in_flight`.
7. Mark the targeted work unit submitted, append one audited submitted ledger row, and write one queue terminal-history `done` row for the targeted work unit.
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

Audit validity is intentionally small:

- `late_accept: true` requires a trimmed non-empty reason and `terminal_status_before_accept: "timed_out"`;
- `superseded_retry_work_ids` is an array with unique IDs and cannot include the targeted `work_id`;
- rows without `late_accept: true` cannot carry late-accept companion fields.

## Postconditions

Success must prove:

- targeted index record is `submitted`;
- exactly one submitted ledger row exists for the targeted work unit;
- no submitted replacement exists for the same `queue_item_id`;
- completed `queue_item_id` is absent from `delegated_in_flight`;
- no queued retry demand remains for that `queue_item_id`;
- queue terminal history has one `done` row for the targeted `work_id`;
- any superseded retry work IDs are `abandoned` and non-covering.

## Review Matrix

| State | Outcome |
| --- | --- |
| `timed_out` targeted work unit, valid result, no retry | accept targeted work unit |
| queued retry exists, not submitted | remove retry demand, accept targeted work unit |
| claimed retry exists, not submitted | abandon retry, accept targeted work unit |
| replacement already submitted | reject |
| target is `claimed` | reject explicit `late-submit`; use normal `submit` |
| target is `failed` or `abandoned` | reject |
| target is normal `submitted` | reject explicit `late-submit` |
| existing audited late-submit with same result hash and durable postconditions | idempotent success without a second row |
| existing audited late-submit with broken durable postconditions | reject with inspect/advice; do not silently repair |
| ambiguous retry/queue state | reject |
