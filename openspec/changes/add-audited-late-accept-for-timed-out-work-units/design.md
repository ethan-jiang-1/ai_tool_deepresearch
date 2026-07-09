## Context

Change A reduced future timeout mistakes by requiring progress-aware timeout preflight. Change B handles the remaining terminal race: a work unit is already `timed_out`, but the original result/receipt/output/cache surfaces arrive complete and still bind to the original attempt.

The Source of Record remains the active bundle root:

- `_work_units/_index.json` owns work-unit attempt identity and status.
- `rb_queue.json` owns queue demand location, `delegated_in_flight`, and `terminal_history`.
- `_work_units/.../manifest.json`, `_beacon.json`, `result.json`, `runtime-receipt.jsonl`, output files, and cache leaves are submit validation surfaces.
- `rb_output_declarations.jsonl` owns submitted delegated coverage.
- gates count only Engine-written submitted ledger rows after cross-surface validation.

## Command Contract

Add a new CLI subcommand:

```bash
node DPT_FRAMEWORK/cli/operate-work-unit.mjs late-submit <bundle> --work-id <timed_out_id> --result <result.json> --reason <reason>
```

`--reason` is required so audit fields never collapse to an empty label. The command returns structured JSON for both accepted and rejected outcomes.

Normal `submit` remains unchanged for terminal attempts. It continues to reject `timed_out`, `failed`, and `abandoned` attempts through the existing late-submit rejection path. `late-submit` is the only accepted terminal recovery command, and only for `timed_out`.

## Validation Plan

Late-submit should reuse the normal submit validation pipeline as much as practical. The implementation should introduce a focused preparation mode, not duplicate all result/cache/receipt validation logic.

The late mode may differ from normal submit in exactly these ways:

- the index record status may be `timed_out` instead of `claimed`;
- queue binding may no longer be in `delegated_in_flight` for the original work unit because timeout already removed it;
- retry demand/attempt cleanup may be required before the transaction can complete.

Everything else remains strict:

- `work_id`, `queue_item_id`, `kind`, and `receipt_nonce` must match the original timed-out attempt across result, receipt, manifest, beacon, index, status, and ledger row;
- result canonicalization remains bounded to existing submit-safe normalization rules;
- output files, source claims, cache trails, path containment, result hash, receipt hash, ledger hash, and queue snapshot constraints still apply;
- failed/abandoned attempts reject before validation side effects;
- already submitted replacement coverage rejects before ledger append.

If normal submit validation currently assumes `record.status === "claimed"` inside a shared helper, split the status check from the reusable validation plan so late mode can explicitly admit only `timed_out`. Do not introduce a bypass flag that can be reused for `failed` or `abandoned`.

## Retry Conflict Model

Late-submit resolves the queue race by scanning three authority surfaces for the same `queue_item_id`:

- submitted replacement: any different work-unit record or ledger row for the same queue item that is already `submitted`;
- queued retry demand: `active_window` or `refill_pool` item whose `queue_item_id` matches the original demand and whose lineage points to the timed-out `work_id`;
- claimed retry attempt: `delegated_in_flight[queue_item_id]` points to a different work unit, and that work-unit index record is `claimed`.

The transaction behavior is:

- submitted replacement -> reject, no mutation;
- queued retry demand -> remove the retry demand before marking the original done;
- claimed retry attempt -> terminalize the retry attempt as superseded/abandoned, write an audit reason such as `superseded_by_late_accept`, clear `delegated_in_flight`, then mark the original done;
- ambiguous state -> reject, no mutation.

Ambiguous state includes missing index records, in-flight retry whose index status is not `claimed`, retry lineage that cannot be tied to the timed-out attempt, multiple competing queued retry items, or any already submitted row for the same queue item.

## Transaction Shape

`lateSubmitWorkUnit()` should run inside one `withWorkUnitTransaction()` block. A successful transaction should:

1. load original timed-out record, manifest, queue, index, candidate result, receipt, outputs, cache leaves, and existing ledger rows;
2. validate result/receipt/output/cache/source/nonce/hash under late-submit mode;
3. detect retry conflict state;
4. write canonical result and receipt back to the original work-unit assigned refs;
5. update the original record and status file to `submitted`;
6. remove queued retry demand or supersede claimed retry attempt when applicable;
7. remove `delegated_in_flight[queue_item_id]` when the retry attempt was in flight;
8. append one audited submitted ledger row for the original `work_id`;
9. push a queue `terminal_history` done record for the original work unit;
10. write trace/log audit events;
11. reload durable queue/index/ledger and verify postconditions before reporting success.

Postconditions must prove:

- original index record is `submitted`;
- original ledger row exists exactly once and has `late_accept: true`;
- no different submitted work unit exists for the same `queue_item_id`;
- `delegated_in_flight` has no entry for the completed queue item;
- no queued retry demand remains in `active_window` or `refill_pool`;
- `terminal_history` contains a `done` record for the original `queue_item_id` / `work_id`;
- every superseded retry work ID is terminal and non-covering.

Rollback behavior should mirror normal submit: if any postcondition fails after partial writes, restore the captured snapshot where practical and return structured suspect-state diagnostics if rollback cannot be proven.

## Ledger And Audit Fields

The submitted ledger schema should accept these fields on audited late-accepted rows:

```json
{
  "late_accept": true,
  "late_accept_reason": "...",
  "terminal_status_before_accept": "timed_out",
  "superseded_retry_work_ids": []
}
```

The audit fields are part of the ledger row hash. Gate readers must not strip or ignore them before hash verification. Normal submitted rows should either omit `late_accept` or carry `late_accept: false` consistently with the schema chosen in implementation.

Recommended trace/log events:

- `work_unit_late_submit_accepted`
- `work_unit_late_submit_rejected`
- `work_unit_retry_superseded_by_late_accept`

The accepted event should include `tx_id`, original `work_id`, `queue_item_id`, `kind`, `receipt_nonce`, `late_accept_reason`, `terminal_status_before_accept`, `ledger_record_hash`, and `superseded_retry_work_ids`.

## Gate Integration

Gate helpers already read submitted work-unit declarations and cross-check index status, result hashes, ledger hashes, output files, cache trails, and nonce surfaces. Change B should extend those readers so audited late-accepted rows count as submitted coverage only when:

- the row is Engine-written and hash-valid;
- `_work_units/_index.json` marks the original work unit `submitted`;
- audit fields are schema-valid;
- the row binds to the original timed-out identity;
- no submitted replacement row exists for the same queue item.

Diagnostics should surface late-accept context when useful, but late acceptance is not a weaker coverage tier. It is either a valid submitted work-unit row or a failing provenance row.

## Experiments And Reality Distance

Controlled E2E coverage may use fixture-backed result/receipt/cache surfaces after a real claim/timeout transition, but it must label fixture distance. Verdicts must come from CLI JSON, bundle authority files, gate output, and trace/check entries, not console-only summaries.

The fault-tolerance story should now distinguish:

- normal submit after timeout rejects;
- explicit late-submit can accept an eligible timed-out original attempt;
- late-submit rejects if a replacement is already submitted;
- queued retry demand can be removed by late-submit;
- claimed retry can be superseded by late-submit;
- failed/abandoned attempts remain fail-closed.

## Alternatives Considered

Allow normal submit on `timed_out`: rejected because it hides the terminal exception and weakens existing fail-closed diagnostics.

Rewrite old result identity to retry work ID: rejected because it lies about provenance and nonce origin.

Hand-edit ledger/status/queue after inspection: rejected because it bypasses Engine transaction authority.

Accept late outputs whenever no gate has passed yet: rejected because the queue and ledger authority problem is per queue item / work unit, not per gate timing.
