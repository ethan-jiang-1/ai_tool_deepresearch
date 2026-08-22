## Why

`tests/integration/cli/wave1-focus-coverage-contract.test.mjs` builds **five
full Wave1-ready bundles per run** — one per variant (noFocus, covered,
partial, blocked, invalid) — through `prepareWave1Bundle` (~24 production
CLIs each ≈ 120 launches, measured file 21.1s / 149 launches in
`08-cost-table.md`). All five variants are byte-identical before their single
independent mutation: the Phase-owned `artifacts/wave1/topic-a/depth-review.yaml`
`focus_coverage` declaration. The plan's P1.1 "share immutable setup" applies
(plan §P1 item 1-2; ledger D confirms this cluster is the cleanest fit).

## What Changes

- Build the Wave1-ready baseline **once per test run** in a `before()` hook
  (`prepareWave1Bundle`), byte-snapshot it with the existing
  `snapshotBundle` helper, and `restoreBundle` it to its **original path**
  before each variant's independent mutation.
- Each of the four test cases and the `partial`/`blocked` loop iteration
  keeps its **own assertions verbatim** (no test-case merging — implementation
  guardrail, research notes §07); only the bundle preparation changes from
  5× fresh builds to 1 build + per-variant restore.
- Restore-to-original-path is required: production `check-gate-setup-ready.mjs`
  (:455-477) enforces normalized bundle basename == `rb_plan.md#/plan_basename`
  == `rb_profile.yaml#/plan_basename`; a relocated copy would break bundle
  identity. The snapshot restores the same path, so identity is preserved and
  the wave1 gate (which does not check `plan_basename`) evaluates the variant
  facts as today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a test-harness-only change; Gate/Engine production behavior is
untouched.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` | Verify-only | Existing test classes and proof boundaries only; no route change. |
| `verification/integration-tests` | current `tests/integration/cli/wave1-focus-coverage-contract.test.mjs` | Verify-only | One integration cluster's setup becomes shared; all asserted facts stay identical. |
| `research/research-wave-gate-implementation` | `openspec/specs/research/research-wave-gate-implementation/spec.md` | Excluded | Wave1 Gate verdict semantics are the fact being tested, not modified. |

## Impact

Target edits are limited to `tests/integration/cli/wave1-focus-coverage-contract.test.mjs`
and this change's verification assets. No npm dependencies, production
Harness modules, schemas, CLI behavior, or runtime bundles are changed. The
repository test command remains `npm test`.
