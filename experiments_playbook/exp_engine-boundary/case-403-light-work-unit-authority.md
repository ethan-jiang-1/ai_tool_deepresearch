---
schema: command-experiment/v1
experiment: engine-boundary
case: case-403-light-work-unit-authority
weight: light
case_goal: "验证 Wave0 gate 的 delegated reference authority 来自 submitted work-unit ledger、cache trail coverage、provenance/hash checks，而不是内容启发式。"
runner: coding-agent
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_disp_case-403_eb_authority_work_unit
trace: dpt_disp_case-403_eb_authority_work_unit/rb_trace.jsonl
verdict: trace-jsonl
---

# case-403-light-work-unit-authority

## Execution Contract

Fixture-backed, no Agent actor, no external calls. Positive coverage must be accepted through real `operate-work-unit submit`. Boundary cases must fail through deterministic authority surfaces only: submitted ledger absence, cache trail drift, provenance/hash mismatch, or route-bound gate feedback.

## Reality Distance Ledger

| Dimension | Statement |
| --- | --- |
| Runtime context | Real disposable bundle from `experiments_env/shared/new-disposable-bundle.mjs` |
| Framework path | Real `operate-work-unit submit` and Wave0 gate CLI |
| Fixture input | Controlled reference/source/cache files for authority-boundary scenarios |
| Agent actor | None; fixture-backed only |
| External calls | None |
| Gate input | Submitted work-unit rows, cache trail leaves, provenance/hash checks |
| Orphan handling | Files without submitted work-unit coverage are diagnostics only |
| Verdict source | Gate JSON, trace JSONL `check` events, and runner report |
| Does not prove | Agent source selection or semantic content-quality judgment |

## Expected Runtime Path

1. Create a disposable bundle and Wave0 scaffold.
2. Reset per-scenario runtime state before each gate scenario.
3. Submit fixture outputs through `operate-work-unit submit` for positive coverage.
4. Intentionally omit submit for missing-ledger boundary.
5. Intentionally mutate a submitted cache trail for cache-drift boundary.
6. Run Wave0 gate and record trace `check` rows.
7. PASS only when clean/root-URL submitted coverage passes and deterministic missing-ledger/cache-drift cases fail.

## Optional Runner

```bash
node experiments_env/shared/run-fixture-backed-case.mjs --case case-403 --target-dir tests/.test-bundles --cleanup-pass
```

Expected checks:

- `missing-ledger-fails`: Wave0 gate fails because no submitted work-unit ledger rows exist.
- `clean-pass`: submitted reference/source/cache coverage passes.
- `root-url-passes`: a parseable root-looking URL does not fail by URL shape when ledger/cache/provenance pass.
- `cache-drift-fails`: submitted cache trail drift fails through `cache_coverage` diagnostics.
