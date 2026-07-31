# Apply Evidence

Date: 2026-07-31

## Scope And Disposition Rule

The focused Node tests below are deterministic-contract evidence only. They use
test-owned temporary bytes to exercise the production helper/CLI boundary and do
not prove Subject Actor behavior.

Each Heavy canary was attempted exactly once through the configured `claude`
launcher using the `deepseek_anthropic_compatible` host (`deepseek-v4-pro`). A
Supervisor `ERROR` with no `agent-experiment-completion.json` is recorded here
as `NOT_RUN` for the corresponding Agent-behavior claim: it supplies neither a
native PASS nor a native FAIL. No fixture, parent-authored result, manual submit,
or retry was used to replace an incomplete run.

## Deterministic Contract Claims

| Verification-plan claim | Disposition | Evidence |
| --- | --- | --- |
| `source-intake-helper-stops-before-unestablished-wave0-gate` | PASS | `node --test tests/integration/md/case-406-real-subagent-contract.test.mjs tests/integration/md/case-221-first-return-contract.test.mjs` passed 7/7. The case-406 test creates a temporary test-owned envelope with `writeFixtureResultForWorkUnit()`, submits it through `run-fixture-backed-case.mjs`, and asserts no `gate-wave0.json`, `gate_attempt`, or `wave0-gate-pass` check. |
| `wave1-actor-canary-contract-stops-before-phase-gate` | PASS | The same 7/7 focused run verifies case-221 frontmatter plus the matching fixture runner retain submit/inspect checks and omit `wave1_completion`, `check-gate-wave1-complete.mjs`, `case-221-gate.json`, and `wave1-gate`. |

## Real Actor Canary Attempts

| Verification-plan claim | Claim disposition | Host outcome and native-completion boundary | Preserved evidence |
| --- | --- | --- | --- |
| `case406-real-actor-boundary-verdict` | NOT_RUN | Supervisor reported `ERROR` / `case_budget_exhausted` after `$1.020947`; native completion is absent. A real Subject Actor produced a durable result and receipt, but the host stopped before the Playbook Agent could submit/finalize it, so those intermediate facts cannot close the claim. | Report: `.exp-bundles/_reports/aa09ddda-7e71-4f67-a1b8-0916052fd88f.json`; run root: `.exp-bundles/runs/aa09ddda-7e71-4f67-a1b8-0916052fd88f/001-case-406-heavy-real-subagent-boundary-5275684b-732f-4b59-92ee-25e07e989205`; log SHA-256: `e1b259425b49e8172125ba2bb4d7a874c83de19462fcdeaabc06b841f2a5221f`. |
| `case604-real-actor-checkpoint-without-unrelated-wave0-gate` | NOT_RUN | Supervisor reported `ERROR` / `agent_timeout` at 300233 ms; cost telemetry was unavailable and native completion is absent. The run root is preserved for diagnosis, but no native outcome exists. | Report: `.exp-bundles/_reports/973d7bf8-5499-431c-85a1-f73432380187.json`; run root: `.exp-bundles/runs/973d7bf8-5499-431c-85a1-f73432380187/001-case-604-heavy-real-subagent-write-before-return-b7940728-27f6-4e13-ac2e-2e66ef66365d`; log SHA-256: `4f63921ee3ca49096eb50789c6b1fa834c9fbbc03fc8aa662802add7a7e5d419`. |
| `case221-real-batch-checkpoint-without-unestablished-wave1-gate` | NOT_RUN | Supervisor reported `ERROR` / `case_budget_exhausted` after `$5.334086`; native completion is absent. Both real Actor paths left receipts, but the host ended before the required submit/inspect/finalization chain, so the batch claim remains unverified. | Report: `.exp-bundles/_reports/78239308-66bc-4087-9780-76535ca4575a.json`; run root: `.exp-bundles/runs/78239308-66bc-4087-9780-76535ca4575a/001-case-221-heavy-batch-subagent-e7749ee1-d761-4220-840d-f9493259aba6`; log SHA-256: `a382aa0f77af3326c2320f3f0c9efd544acef150ba97ffc642eae7dcbcd363fc`. |

## Boundary Result

The implementation claim is supported by deterministic regression. The three
real-Actor behavior claims remain open, host-scoped `NOT_RUN` evidence rather
than regressions against the Actor/Phase boundary. In particular, none of these
runs provides a reason to add a controller, synthesize Phase projections, or
relax a Wave Gate.
