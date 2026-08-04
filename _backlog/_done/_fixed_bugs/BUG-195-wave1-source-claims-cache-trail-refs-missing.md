# BUG-195: dpt-evidence-extractor sub-agents omit cache_trail_refs in source_claims[]

**Status**: closed — current-head no-reproduction; reopen only with a retained current failing candidate
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

## Current-head requalification (2026-08-05)

The bounded real `case-164-heavy-direct-output-candidate-contract` replay did not
reproduce a current deterministic submit defect. Its generated replacement
`task.md` exposes the authoritative result schema and states that
`source_claims[]` binds accepted URLs to declared cache trails; the generated
`result.schema.json` contains the per-claim `cache_trail_refs` property. The
second distinct real child returned one source claim with
`cache_trail_refs: ["_cache/wave1/primary/01_candidate-contract/s02_ci_validation"]`,
and its native dry-submit followed by formal submit passed.

This is evidence that the current contract can be followed and that one real
Actor path succeeds. It is not evidence of universal Actor compliance, and the
empty starter array leaves a possible guidance-legibility concern. No validator
inference or schema change is admitted from this replay.

## Closure (2026-08-05)

The retained native `PASS` is now locatable at
`.exp-bundles/_reports/d2e8115d-8b97-4ccd-8cdb-3dc2ea101236.json`
(`sha256: fe6f9f62a709e872759d4d94a762856c0f31c504df9a5189041b11d48d9f2390`)
with completion
`.exp-bundles/runs/d2e8115d-8b97-4ccd-8cdb-3dc2ea101236/001-case-164-heavy-direct-output-candidate-contract-84c19212-e049-4fb3-8644-87b7a4a3cdda/agent-experiment-completion.json`
(`sha256: 9dfd25089683cab80524fb39e26c4551d2874bff5c84ef0f326c358603ee22dc`).
The completion's source-playbook hash equals the current playbook hash
`6f0b840aa31241f84e83bd19fa2c02e2a9bd4c925ccb40f2152d99fcf73df3c7`.
Its submitted ledger row has an accepted source claim with the declared
`cache_trail_refs` path. Focused current regressions passed 76/76. This closes
the historical report without claiming universal Actor compliance; reopen only
on retained current evidence of the missing per-claim field.
