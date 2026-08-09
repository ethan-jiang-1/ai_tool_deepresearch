## Why

The repository-wide deterministic test command currently reports three stale deterministic-test failures even
though their production paths agree with the current accepted contracts: a copied finalizer
fixture omits new governance dependencies, a migration test pins an obsolete release banner, and
a post-final rerun test skips the required style-projection handoff. This leaves the regression
baseline red and weakens confidence in subsequent Harness changes.

## What Changes

- Move the isolated finalizer proof to `tests/integration/governance/` and refresh its fixture so
  it carries the complete current governance dependency graph needed by the production finalizer
  and proves the finalizer's complete check sequence.
- Make the Harness migration E2E assert the current declared release identity without pinning an
  obsolete historical version.
- Correct the post-final rerun E2E flow to consume the existing style handoff before its formal
  `rerun-ready` Gate, while retaining coverage of C5's event-bound compatibility boundary.
- Keep production Harness behavior, accepted requirements, release version, and Semantic Fact
  Closure mechanics unchanged.

## Capability Discovery

| Candidate | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/test-fixtures` | `openspec/specs/verification/test-fixtures/spec.md` | Verify-only | The temporary finalizer fixture is test-only and this change alters no stated fixture capability behavior. |
| `verification/integration-tests` | `openspec/specs/verification/integration-tests/spec.md` | Verify-only | The test repairs restore executable coverage but do not change the contract for bundle validation or inspection. |
| `governance/change-feedback-loop` | `tests/e2e/change-feedback-loop-archive.test.mjs`; production finalizer dependency calls | Verify-only | The finalizer already passes in the repository; only its isolated test fixture omitted required files. |
| `bundle/run-entry` | `tests/e2e/deep-research-harness-migration.test.mjs`; `DEEP_RESEARCH_HARNESS/RUN.md` | Verify-only | The current `v0.82` entry banner is correct; the test's `v0.74` expectation is stale. |
| `research/research-styles` | `openspec/specs/research/research-styles/spec.md` | Verify-only | The accepted contract already requires recomputation after a registry-length change. |
| `research/post-final-recovery` | `openspec/specs/research/post-final-recovery/spec.md` | Verify-only | C5 accepts event-bound compatibility during lineage inspection, but the formal rerun Gate still owns current projection freshness. |
| `workflow/rerun-incremental-node` | `openspec/specs/workflow/rerun-incremental-node/spec.md` | Verify-only | The phase already requires consuming the returned style handoff before count increment and Gate execution. |

No new or modified capability is declared: these repairs align test setup and expectations with
existing accepted behavior rather than changing an externally observable requirement.

`skip_specs: true` - no delta specification applies because this change neither adds nor modifies
accepted behavior; it only restores native proof assets to their existing Sources of Record.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- None.

## Impact

- Tests only: `tests/integration/governance/change-feedback-loop-archive.test.mjs`,
  `tests/e2e/deep-research-harness-migration.test.mjs`, and
  `tests/e2e/post-final-rerun-lineage-continuity.test.mjs`.
- No production Harness files, runtime bundle state, external API, dependency, or release version
  changes.
