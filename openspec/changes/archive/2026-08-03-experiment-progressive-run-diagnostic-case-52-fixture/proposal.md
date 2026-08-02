## Why

`case-52-standard-fail-repair` is intended to prove a real same-checkpoint fail -> repair -> rerun path, but its retained 2026-08-02 diagnostic execution ends native `FAIL`. The case fixture silently omits its successful routed `wave1-complete` attempt because it uses the existing Engine writer without the carried-target receipt now required by that established contract; a later Markdown block also relies on the prior block's shell-local `$N` value.

The direct evidence is the preserved report `.exp-bundles/_reports/a518f873-8e5a-42f0-9b31-3c71bc535fd9.json`, its retained run root, and `_backlog/plans/experiment-progressive-run-plan.md` P2.10. The health replay reproduces the missing passed `wave1-complete` attempt, so merely creating the intended Wave2 synthesis cannot make the readiness repair pass.

## What Changes

- Correct the case-52 Wave1 predecessor fixture to select the existing carried-target receipt and pass it to the existing Engine gate-attempt writer with strict trace durability.
- Remove the cross-block shell-state dependency by using the case's explicit accepted readiness entry target in the later `enter-phase` command.
- Add a focused Markdown contract test that locks the receipt-bound writer and independent-block handoff boundary.
- Requalify the repaired case through the current diagnostic profile using a freshly computed one-case bounded envelope, and preserve the resulting native and health evidence.

This change does not alter a Gate contract, health policy, runtime schema, status transition, or `AGT-010`. It repairs one stale fixture so it conforms to those existing contracts; `.openspec.yaml` therefore explicitly uses `skip_specs: true`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The existing `agent-testing` capability and `AGT-010` already require real framework Gate output and trace-backed verdicts. This change brings the case fixture into conformance without changing those requirements.

## Decision Boundary

The direct Source of Record remains the disposable bundle's Engine-written `rb_trace.jsonl`, `_logs/run.log`, gate diagnostics, native completion, and post-run health report. The shortest legal loop is: fixture selects existing receipt -> Engine writes the routed Wave1 attempt durably -> real gates run -> explicit `enter-phase` target is witnessed -> native completion -> health. It removes a silently omitted prerequisite and an Agent-side duplicate handoff workaround without adding a validator, state, retry path, or controller.

No named state, projection, command, or reader-facing view is introduced or materially changed. The relevant existing distinction is retained: a routed successful Wave1 gate attempt needs its valid carried-target receipt, and one Markdown shell block cannot grant another block an environment value. A reader can stop at paired Engine trace/log evidence and the bounded native/health result. The user chose the progressive-run objective; the Agent executes existing legal fixture commands; the Engine remains sole writer and verifier of gate attempts. No `DPT_FRAMEWORK/` behavior changes, so no framework version bump is required.

## Impact

- `experiments_playbook/exp_wff_validation/case-52-standard-fail-repair.md`
- `tests/integration/md/case-52-fixture-contract.test.mjs`
- `openspec/changes/experiment-progressive-run-diagnostic-case-52-fixture/verification-plan.yaml`
- `_backlog/plans/experiment-progressive-run-plan.md` P2.10 evidence record
- One bounded `agent_flow_e2e` requalification run selected by the current `diagnostic` profile
