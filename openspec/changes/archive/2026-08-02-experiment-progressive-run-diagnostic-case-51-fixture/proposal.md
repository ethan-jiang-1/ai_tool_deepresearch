## Why

`case-51-standard-happy-path` currently proves its intended AGT-010 lifecycle behavior only after two stale fixture defects force the Headless Playbook Agent to improvise. The retained 2026-08-02 run is native `PASS` but health `ISSUES`: an invalid bare Wave1 fixture attempt is silently omitted, the Agent directly appends a replacement trace event, and the rerun fixture omits the existing required style projection before its first real Gate.

The direct evidence is recorded in `_backlog/plans/experiment-progressive-run-plan.md` P2.4c and the retained report `.exp-bundles/_reports/730af6f6-2844-48a3-9e7e-b6933a244c54.json`. This blocks the case from becoming a clean, high-frequency regression observation and weakens the value of its health signal.

## What Changes

- Correct the `case-51` proceed fixture so its Wave1 predecessor is written only through the existing Engine gate-attempt writer with a valid carried-target receipt; remove the condition that leads the Agent to manually append a trace event.
- Establish the existing `quick_factual` research-style projection in the rerun fixture before its first `rerun-ready` Gate attempt, so this happy-path case does not intentionally create a repair history.
- Add focused validation that the changed playbook remains valid and, after the separate standard-health-scope correction is applied, obtain one bounded real Headless Playbook-Agent run whose native completion, health report, trace, and log demonstrate the repaired fixture boundary.

This change does not alter a Gate contract, health policy, runtime schema, or the AGT-010 requirement. It corrects one stale playbook implementation to meet the existing contract, so `.openspec.yaml` explicitly uses `skip_specs: true`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The existing `agent-testing` capability and AGT-010 already require real Gate output and forbid hand-written rerun Gate attempts; this change brings the case fixture back into conformance.

## Decision Boundary

The direct Source of Record remains the disposable bundle's Engine-written `rb_trace.jsonl`, `_logs/run.log`, real Gate output, and native completion. The shortest legal loop is: fixture setup -> existing Engine writer / style operation -> real Gate -> native completion -> post-run health. It removes the accidental manual-trace workaround and two unnecessary Gate failures rather than adding a new validator, recovery state, or controller.

No new named state, projection, command, or reader-facing view is introduced. The user has already chosen the progressive-run objective; the Agent executes the existing legal fixture commands, while the Engine remains sole writer and verifier of Gate attempts and style projection. No `DPT_FRAMEWORK/` behavior changes, so no framework version bump is required.

## Impact

- `experiments_playbook/exp_wff_validation/case-51-standard-happy-path.md`
- Focused validation assets under `tests/` only if a deterministic seam is needed by the implementation plan
- One bounded `agent_flow_e2e` requalification run over the existing disposable-bundle case, sequenced after `experiment-progressive-run-diagnostic-standard-health-scope`
