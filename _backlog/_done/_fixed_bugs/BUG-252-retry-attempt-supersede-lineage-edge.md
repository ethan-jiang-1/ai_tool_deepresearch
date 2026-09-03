# Bug: supersede fails on retry-attempt (attempt_index ≥ 2) submitted rows — mixed retry+supersession lineage

- **Bundle**: dpt_rb_glm-5-3-deepseek-v4-domestic-chips (Wave1 cleanup)
- **Date**: 2026-09-03
- **Command**: `operate-work-unit.mjs supersede <bundle> --work-id wu-w1-b000-deep-i0012 --reason <reason>`
- **Observed**: 
  ```
  retry lineage parent wu-w1-b000-deep-i0011 is missing for supersession-wu-w1-b000-deep-i0012
  ```
  (same for i0013..i0019, each referencing its timed-out attempt-1 parent i0004..i0011)
- **Root**: a row that is itself a retry successor (queue terminal item lineage carries
  `retry_of_work_id`/`retry_reason`/`attempt_index: 2`, e.g. `wave1-deep-11_mi308-baseline`
  terminal entry with work_id i0012) cannot be superseded:
  `buildSupersessionSuccessorDemand` copies the terminal item lineage minus supersession fields
  but **keeps** `retry_of_work_id`, so the new successor queue item
  (`supersession-wu-w1-b000-deep-i0012`) still points its retry parent at i0011, whose
  `queue_item_id` (`wave1-deep-11_mi308-baseline`) no longer equals the successor entry id.
  `validateSuccessorRetryContinuation` then treats the parent as missing.
- **Impact**: hollow/placeholder submitted rows that are attempt-2 retries cannot be replaced by
  the normal submitted-drift path (supersede). For attempt-1 rows (i0001..i0003) supersede works.
- **Expected**: supersede of a retry-leaf should clear the inherited `retry_of_*` lineage on the
  fresh successor demand (a supersession successor is a brand-new deepening demand, not a retry
  continuation), or supersede should reject with a structured `missing_contract`/repair root
  instead of an uncaught lineage error.
- **Workaround used in run**: repair the declared cache trails of the hollow rows with genuine
  fetched content (clears `ledger cache trail incomplete ... placeholder-only` binding), and run
  genuine supplementary `wave1_topic_deepening` rows (claims + new URLs) for the affected topics.

---

## Follow-up instance 2026-09-03 (same root, blocks wave1 gate): i0034 drift

- **Symptom**: topic 03 (huawei-ascend-910c-950) submitted row `wu-w1-b000-deep-i0034`
  (itself a retry-of `wu-w1-b000-deep-i0022`, attempt_index 2 on queue
  `supersession-wu-w1-b000-deep-i0003`) had its `result.json` **overwritten post-submit by the
  delegated agent** during an evidence-expansion pass (7 → 16 accepted claims).
- **Consequence**: disk `result.json` stable-hash no longer matches the submitted ledger
  `result_hash` → `operate-work-unit inspect` reports `submitted result hash mismatch:
  wu-w1-b000-deep-i0034` → the Wave1 gate rule `wave1_work_unit_submission_presence` fails.
- **Repair attempt that fails (same bug)**: `supersede wu-w1-b000-deep-i0034` →
  `retry lineage parent wu-w1-b000-deep-i0022 is missing for supersession-wu-w1-b000-deep-i0034`
  (attempt-2 retry, cannot be superseded; engine has no other legal exit for a submitted row).
- **Why it can't be auto-healed**: submitted rows cannot be terminalized
  (`Submitted attempts cannot be terminalized.`); the only submitted-drift exit is `supersede`,
  which this retry-lineage bug blocks; `recover-declaration` is idempotent/no-op for hash
  mismatch (ledger row itself is valid, only the on-disk `result.json` drifted); engine does not
  allow a different-content re-submit of an already-submitted work_id.
- **Postponed**: user explicitly deferred this bug (fix later, out of the current run).
- **Suggested engine fix (priority)**: when a submitted row's declared `result.json` hash drifts
  and the row is a retry-attempt, either (a) allow `supersede` to build a successor demand that
  drops the inherited `retry_of_*`/`attempt_index` lineage (a supersession successor is a new
  deepening demand, not a retry continuation), or (b) provide a dedicated audited
  re-submit/replace operation for hash-drifted submitted rows, or (c) reject post-submit
  overwrite of `_work_units/.../result.json` at the writer boundary with a clear owner message.
