# Admit Zero-Append Wave0 Source Contributions

## Why

A sanctioned rerun Wave0 supplementary intake whose honest outcome is "no qualifying new 2026+ source exists" currently cannot be delivered: every `wave0_source_intake` submit necessarily derives a `source_contribution` (validated array length + digest) from the target `source.yaml`, and the contribution-boundary evaluation requires ledger-ordered lengths to strictly increase per canonical topic + target. An equal-length (zero-append) submission therefore poisons the entire Wave0 convergence projection — every shared-reference backing resolution fails (303 collateral drifts in run bundle `dpt_rb_glm-5-3-deepseek-v4-domestic-chips`), the Wave0 inspect/Gate cannot pass, and no Engine-owned repair exists (`supersede` returns `semantic_boundary` for hash-valid rows; `recover-declaration` only handles schema-invalid rows; `fail`/`abandon`/`replace` require non-submitted status; hand-editing the ledger is forbidden). Hit live on 2026-09-05 (rerun 2, `wu-w0-b000-src-i0016`, Cambricon 思元690 honest zero-append after bounded search: 0 qualifying new sources across 9 web queries, 3 GitHub REST searches, 4 fetches).

## What Changes

- Modify the Wave0 submitted source-contribution boundary evaluation (`engine/work-unit-projection.mjs` `evaluateDeclaredContributionGroup`): when a later contribution's `validated_length` equals the previous contribution's length AND its `semantic_digest` is identical to the previous contribution's digest over that shared prefix, the contribution is admitted as a **zero-append no-op interval** — it contributes no new source identities, owns no ordinal range, and does not fail the monotonic evaluation.
- Zero-append admission applies only to exact prefix-identity (equal length + equal digest); any other non-increasing length (e.g., shorter, or equal length with different digest) remains the existing `submitted_source_contribution_non_monotonic` failure.
- All other boundary rules are unchanged: strictly longer arrays keep exposing only the appended interval; prefix drift, prefix shortening, and unsubmitted suffix roots behave exactly as before.
- No changes to submit-time validation, ledger schema, queue, work-unit terminal operations, or any other phase's contract.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `research/research-wave-gate-implementation` — the Wave0 convergence contribution-boundary requirement gains an explicit zero-append admission scenario (equal length + identical digest admits the row as a no-op interval instead of a non-monotonic failure); the existing strictly-longer scenario is unchanged.

## Impact

- **Code**: `DEEP_RESEARCH_HARNESS/engine/work-unit-projection.mjs` (one evaluation branch), plus mirrored test coverage under `tests/engine/`.
- **Behavior**: honest zero-append rerun intakes stop poisoning the Wave0 convergence; run bundle `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` rerun 2 can resume at the Wave0 inspect → Gate.
- **Compatibility**: strictly monotonic groups evaluate identically; no historical admitted contribution changes ownership; no ledger mutation.
