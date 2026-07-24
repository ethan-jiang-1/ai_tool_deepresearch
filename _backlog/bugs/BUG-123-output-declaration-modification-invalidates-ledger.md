# BUG-123: Modifying output declarations invalidates work-unit ledger — no incremental update path

| Field | Value |
|-------|-------|
| **Bug ID** | BUG-123 |
| **Severity** | P2 |
| **Phase** | wave1 |
| **Found** | 2026-07-25 |
| **Repro bundle** | `dpt_rb_openspec-adoption-landscape` |

## Symptom

`rb_output_declarations.jsonl` contains `ledger_record_hash` and `result_hash` fields that form an integrity chain. Adding `source_claims` to a declaration invalidates `ledger_record_hash`, which cascades into 7+ gate rule failures (`wave1_work_unit_ledger_exists`, `wave1_work_unit_output_coverage`, `wave1_work_unit_submission_presence`, `ledger_coverage`, `cache_coverage`, `per_topic_ref_md_count_floor`, `wave1_delegated_bypass_suspected`).

The only way to add `source_claims` to satisfy `source_novelty_floor` is through the work-unit submit path. Once submitted, declarations are immutable. There is no `operate-work-unit.mjs amend` or `operate-work-unit.mjs supplement` command to add source claims to an existing submitted work-unit.

## Impact

The `source_novelty_floor` requirement (4 new accepted source URLs per topic) creates a hard dependency on supplementary work-unit submissions. When the queue is blocked (BUG-119/122), supplementary work-units cannot be created, and the novelty requirement cannot be satisfied through any other legal path. Modifying declarations to add source URLs invalidates the ledger chain and makes the gate fail harder.

## Suggested Fix

1. Add `operate-work-unit.mjs supplement --work-id <id> --add-source-urls <urls.json>` that appends to `source_claims` and recomputes hashes
2. Or: allow Phase Agent-owned source URL declarations (separate from work-unit provenance) to satisfy `source_novelty_floor`
3. Or: make `source_novelty_floor` a soft/advisory requirement when primary work-units are submitted and content is complete
