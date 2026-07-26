# BUG-117: wave0 gate unpassable without work-unit provenance — no degraded path

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-117 |
| **Severity** | P1 |
| **Phase** | wave0 |
| **Found** | 2026-07-24 |
| **Repro bundle** | `dpt_rb_openspec-adoption-landscape` |

## Symptom

After the Agent fixes all content-level issues (schema-valid source.yaml, count floors met, queue drained, shared refs with correct metadata), the wave0 gate still fails because ALL remaining rules are provenance-related: work-unit ledger, output coverage, submission presence, delegated bypass suspicion. The gate has NO mechanism to certify content quality without work-unit submission records.

`check.next` returns `None` — not even a handoff to repair/rerun.

## Gate Evolution Across 8 Fix Iterations

### Iteration 1 (initial): 8 rules failed
```
phase_queue_drained, shared_ref_count_floor, per_topic_reference_schema_valid,
per_topic_count_floor, wave0_work_unit_ledger_exists, wave0_work_unit_output_coverage,
wave0_work_unit_submission_presence, wave0_delegated_bypass_suspected
```

### Iteration 2 (fix source.yaml schema): 8 → 8
Source schema fixed (YAML array, correct fields) but no change — all failures are provenance.

### Iteration 3 (fix count floors): 8 → 7
`per_topic_count_floor` and `per_topic_reference_schema_valid` fixed.

### Iteration 4 (submit wu-w0-b000-src-i0002): 7 → 5
`phase_queue_drained` and `wave0_work_unit_ledger_exists` fixed.

### Iteration 5 (submit 3 more work-units): 5 → 5
Still: shared_ref_count_floor, output_coverage (topic 01), submission_presence, bypass_suspected, trace_event

### Iteration 6 (fix abandoned receipt + trace event): 5 → 3
shared_ref_count_floor, submission_presence, trace_event

### Iteration 7 (fix shared refs to metadata block format): 3 → 0 → **GATE PASSED**
All rules cleared after fixing `reference/00-shared-*.md` from YAML frontmatter to `- key: value` metadata block format.

The key insight: the gate passed ONLY after EVERY rule was individually satisfied. At no point did the gate offer a degraded pass — each iteration required fixing ALL remaining issues.

## The Structural Problem

The wave0 gate at `DPT_FRAMEWORK/schema/gate_definitions/wave0-complete.json` (or equivalent engine code) has no `degraded: true` path. Compare to seed-topics gate which offers `degraded` handoff. The wave0 gate is all-or-nothing.

When BUG-115 blocks work-unit submission (result schema unconstructable), the Agent cannot create Engine provenance. Without provenance, the gate is permanently failed — even though the actual research content (source.yaml files, reference files) is complete and schema-valid.

## What Should Happen

1. Gate should offer a degraded pass when content is schema-valid and count floors are met, even if provenance is incomplete
2. Or: `inspect-wave0-output.mjs` should be able to certify content quality independently of work-unit provenance
3. Or: the gate should distinguish "content missing" (real failure) from "provenance missing" (administrative failure) and offer degraded pass for the latter

## Concrete Fix Suggestion

In the wave0 gate definition, add a degraded classification:
- If `per_topic_reference_schema_valid` passes AND `per_topic_count_floor` passes → content is valid
- If remaining failures are all provenance-related → offer degraded pass with `check.degraded: true` and `check.next: phases/phase-wave1.md`
- Record `silent_degradation` event with gap_impact: partial
