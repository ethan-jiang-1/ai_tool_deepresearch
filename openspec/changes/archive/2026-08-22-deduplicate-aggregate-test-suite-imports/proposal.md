## Why

The canonical serial regression suite (`npm test -- --test-concurrency=1
--test-reporter=tap`) measured **757.0s** on 2026-08-22. Two test files
re-execute canonically discovered `.test.mjs` suites through aggregate
side-effect imports, so every owned leaf runs twice:

- `tests/integration/cli/continuation-initiation-contract.test.mjs` imports
  nine discovered suites (`advance-status`, `enter-phase`,
  `check-gate-rerun-ready`, `check-gate-seed-topics-ready`,
  `check-gate-wave0/1/2-complete`, `operate-work-unit`,
  `transition-integrity`) — measured **101.5s / 420 child-process launches**
  of pure duplication (the plan's `>3s` inventory credited only 12.433s).
- `tests/engine/work-unit-attempt-recovery.test.mjs` side-effect imports two
  discovered suites (`work-unit-attempt-disposition`,
  `work-unit-transaction`) — measured **5.5s** of duplication.

Combined ≈ **107s** (~14% of the per-file wall sum). Measurements and the
obligation ledger are in
`_backlog/plans/slow-test-suite-audit-and-remediation-research/`
(`02-duplication-ledger.md`, `08-cost-table.md`).

## What Changes

- Convert `tests/integration/cli/continuation-initiation-contract.test.mjs`
  from a pure import-aggregator into an **inventory/wiring test**: it asserts
  that the nine owned suites exist and are covered by the canonical discovery
  glob (`tests/**/*.test.mjs`), without importing any of them. The `@impl`
  requirement linkage and the file's role as the verification-plan-shaped
  asset for the continuation-initiation claim are preserved.
- Remove the two side-effect imports from
  `tests/engine/work-unit-attempt-recovery.test.mjs`; its own static
  implementation-inventory assertions (4 leaves) are unchanged.
- Verification evidence: module inventory shows each owned suite executes
  exactly once under canonical discovery; focused serial runs of both files
  pass; the full canonical serial run reports the reduced leaf/wall numbers
  with zero failures.

This is a test-harness-only change. No production Harness/Engine module,
schema, CLI, Gate, requirement, or accepted spec changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a verification-only harness repair; accepted capability
requirements and production behavior remain unchanged.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` and routing checks | Verify-only | The change records existing test classes and evidence boundaries only; no class, route, or proof permission changes. |
| `verification/integration-tests` | current `tests/integration/**` layout | Verify-only | One integration suite is converted from import-aggregation to inventory assertions; no integration contract changes. |
| `verification/test-fixtures` | current `tests/` layout | Verify-only | Test-owned suites keep their fixtures and assertions; only the aggregate wrapper changes. |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` | Excluded | Work-unit production behavior is untouched; the recovery suite's static assertions stay the same. |
| `research/research-wave-gate-implementation` | `openspec/specs/research/research-wave-gate-implementation/spec.md` | Excluded | Gate semantics are untouched; only duplicated execution is removed. |

## Impact

Target edits are limited to the two test files above and this change's
verification assets. No npm dependencies, production Harness modules,
schemas, CLI behavior, or runtime bundles are changed. The repository test
command remains `npm test`. Archived verification-plans reference the two
paths (historical records only); no active change declares them as assets, so
the file identity of the aggregate is preserved (same path, new content).
