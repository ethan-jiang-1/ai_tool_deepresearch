## Why

The repository regression suite currently reports 2713 passing and 33 failing
tests because a set of deterministic fixtures and assertions still encode
superseded work-unit, style-projection, topic-projection, documentation, and
rule-count expectations. The failures obscure the real signal: current
contract-aligned production-path tests already pass, while the affected
fixtures do not represent valid current inputs.

## What Changes

- Update stale work-unit fixtures and generated-guidance assertions to use the
  current `work-unit.assignment.v3` contract and canonical output roles.
- Complete Gate, post-final, and Wave1 fixtures with the current style,
  canonical Topic, Projection Entry, depth-review, submitted-ledger, and
  handoff facts required before dependent verdicts are evaluated.
- Align CLI exit-code assertions, documentation snapshots, Markdown guidance
  markers, verification-routing references, and active Gate rule counts with
  accepted sources of record.
- Add focused verification evidence that current-contract production-path
  tests remain green; do not add exceptions, fake runtime evidence, or change
  Engine/Harness behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a verification-only fixture/assertion repair; accepted
capability requirements and production behavior remain unchanged.

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `verification/test-fixtures` | `openspec/specs/verification/test-fixtures/spec.md` and current `tests/` layout | Verify-only | Test-only fixture inputs are being repaired; no fixture capability behavior changes. |
| `verification/integration-tests` | `openspec/specs/verification/integration-tests/spec.md` and failing `tests/integration/**` suites | Verify-only | Assertions are brought back to accepted contracts; no production contract is changed. |
| `verification/verification-routing` | `openspec/specs/verification/verification-routing/spec.md` and routing checks | Verify-only | The change records the existing test classes and evidence boundaries only. |
| `agent/delegated-work-units` | `openspec/specs/agent/delegated-work-units/spec.md` | Excluded | This accepted production contract is the source of truth being consumed by fixtures, not modified. |
| `research/pre-research-gate-implementation` | `openspec/specs/research/pre-research-gate-implementation/spec.md` | Excluded | Current style freshness behavior is preserved; only stale fixtures are completed. |
| `research/research-wave-gate-implementation` | `openspec/specs/research/research-wave-gate-implementation/spec.md` | Excluded | Gate verdict semantics remain unchanged. |

## Impact

Target edits are limited to `tests/`, `experiments_env/shared/`, selected
Agent-facing Markdown/docs assertions, and this change's verification assets.
No npm dependencies, production Harness modules, schemas, CLI behavior, or
runtime bundles are changed. The repository test command remains `npm test`.
