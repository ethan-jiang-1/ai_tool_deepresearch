# Tasks — Admit Zero-Append Wave0 Source Contributions

## 1. Engine evaluation change

- [x] 1.1 In `DEEP_RESEARCH_HARNESS/engine/work-unit-projection.mjs` `evaluateDeclaredContributionGroup`, track the previous contribution's `semantic_digest` alongside `previousLength`; when a contribution has `validated_length === previousLength` and `semantic_digest === previousDigest`, admit it as a no-op (no interval, no identity, no `previousLength` update) instead of the `submitted_source_contribution_non_monotonic` root; all other non-increasing cases keep the existing root unchanged.

## 2. Tests (JS-led, `tests/engine/`)

- [x] 2.1 Unit test: group with contributions [10, 10] and identical digest evaluates without a non-monotonic root and exposes exactly the first contribution's ordinal interval (no identity for the no-op row).
- [x] 2.2 Unit test: group with contributions [10, 10] and differing digest still fails with `submitted_source_contribution_non_monotonic` and `repair_kind: missing_contract`.
- [x] 2.3 Unit test: group with contributions [10, 11] (strictly longer) keeps exposing only the appended interval for the later work unit (existing behavior regression guard).
- [x] 2.4 Unit test: zero-append row followed by a strictly longer contribution exposes the appended interval computed against the retained length (no-op row does not shift ordinal math).
- [x] 2.5 Unit test: zero-append admission does not mask prefix drift — a retained prefix whose current array digest differs still fails via the existing prefix-drift root.

## 3. Verification on the live bundle

- [x] 3.1 After apply, run `node DEEP_RESEARCH_HARNESS/cli/inspect-wave0-output.mjs --bundle dpt_rb_glm-5-3-deepseek-v4-domestic-chips` and confirm the `submitted_source_contribution_non_monotonic` root and the 303 collateral `wave0_reference_backing` drifts are gone.
- [x] 3.2 Consume any remaining materializable-backing roots through the existing Phase-owned persistence path, rerun the same inspect until it passes, then run `check-gate-wave0-complete.mjs` for `phases/phase-wave0.md` and resume the rerun 2 chain (wave1 → wave2 → readiness → final_v2).
