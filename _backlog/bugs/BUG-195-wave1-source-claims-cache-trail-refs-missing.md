# BUG-195: dpt-evidence-extractor sub-agents omit cache_trail_refs in source_claims[]

**Status**: open
**Severity**: P0 — blocks Wave1 work-unit submit for majority of topics
**Found**: 2026-08-03 during `agentic-rd-org-delivery-systems-2026` Wave1 execution

## Symptom

`operate-work-unit dry-submit` fails with `primary_root_code: missing_cache` and `recommended_action: fail_and_replace`. The violation points to `result.json#/source_claims/N/cache_trail_refs` — the N-th source claim entry is missing the `cache_trail_refs` field.

Three of five Wave1 sub-agents (topics 01, 03, 05) hit this; only topics 02 and 04 passed.

## Root cause

The `dpt-evidence-extractor` role guidance and generated task.md do not clearly specify that every entry in `source_claims[]` MUST include a `cache_trail_refs` array linking to the corresponding cache leaf directory. The sub-agents successfully write cache files (websearch.json, page.md, meta.json) and declare `cache_trails[]` at the top level of result.json, but fail to populate the per-claim linking field.

The dry-submit validator requires `source_claims[N].cache_trail_refs` for every claim, but neither the task.md's Result JSON Starter nor the role guidance explicitly enumerate this as a required field.

## Impact

- 3/5 topics fail Wave1 submit despite producing valid research content
- Phase Agent must either fail-and-replace (expensive) or manually fix result.json (authorship violation for delegated_subagent)
- Each failed topic requires a supplementary work-unit cycle to recover

## Expected behavior

Either:
- Task.md's Result JSON Starter should include `"cache_trail_refs": []` in every source_claims template entry, OR
- Role guidance should explicitly list `cache_trail_refs` as required per-claim field, OR
- Dry-submit validator should infer cache_trail_refs from the top-level `cache_trails[]` when per-claim refs are missing but cache data exists on disk
