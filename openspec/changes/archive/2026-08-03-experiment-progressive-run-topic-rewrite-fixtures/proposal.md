## Why

`case-181-light-hitl1-topic-rewrite-vague` was the first bounded Phase 3 calibration slice. Its retained 2026-08-03 run reached a passing final HITL1 Gate but native completion was `FAIL`: the fixture initially wrote legacy topic-registry data without the Engine-owned canonical seed bindings, then omitted the existing selected research-style projection. The Headless Playbook Agent repaired both facts during the run, leaving two expected-true `hitl1-recorded: false` checks that the case's `verdict_mode: all` correctly retained as a native failure.

The direct evidence is the preserved report `.exp-bundles/_reports/06493532-b164-453f-ba8b-72096beaf544.json`, its retained bundle trace/log, and P3.2 in `_backlog/plans/experiment-progressive-run-plan.md`. Sibling `case-182-light-hitl1-topic-rewrite-detailed` uses the same stale direct-registry/no-style setup pattern, so repairing only the selected case would leave the same known fixture drift in the companion proof.

## What Changes

- Repair both topic-rewrite fixtures so they retain their semantic rewrite content but establish topic registry and UID-bound seed identity through the existing HITL1 `operate-topic-state` Engine operation rather than direct registry/seed writes.
- Apply each fixture's selected research style through the existing CLI after the committed topic-state operation and before its first `hitl1-recorded` Gate invocation.
- Add a focused Markdown contract test covering the two fixture boundaries without treating it as proof of Headless Playbook-Agent execution.
- Run a fresh current-calibration one-case preflight and, only if it selects the repaired `case-181`, perform its bounded real requalification; retain and inspect native, health, trace, and audit evidence.
- Record the observed Phase 3 result and next selector state in the progressive-run plan.

This change does not alter any Gate, schema, lifecycle transition, research-style definition, health policy, selector, or requirement. It repairs two stale fixture implementations to conform to existing contracts, so `.openspec.yaml` explicitly uses `skip_specs: true`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Existing `agent-testing` / AGT-010, canonical-topic-state, and research-style contracts already require the Engine-owned topic-state and style writers. The fixtures will be brought back into conformance without changing those requirements.

## Decision Boundary

The direct Source of Record is the selected disposable bundle's Engine-written canonical `rb_plan.md` and seed bindings, the committed topic-state/style CLI outputs, `rb_trace.jsonl`, `_logs/run.log`, native completion, and independent Supervisor health/audit report. The shortest legal loop is: fixture-owned semantic input -> existing HITL1 status synchronization -> existing topic-state apply -> returned style handoff / existing style writer -> real HITL1 Gate -> native completion -> health. It removes the two accidental repair loops and their false verdict facts rather than adding a new state, validator, retry tree, or controller.

No named state, projection, command, module, or reader-facing view is introduced or materially changed. The useful existing distinction remains precise: Agent-authored topic semantics are distinct from Engine-owned canonical topic identity and style projection. A reader can stop at the committed Engine outputs plus the native/health evidence, or report the direct remaining unknown. The user has selected the progressive-run objective; the Agent performs existing legal fixture commands; the Engine remains the sole deterministic state, style, Gate, and verdict authority. No `DPT_FRAMEWORK/` behavior changes, so no framework version bump is required.

## Impact

- `experiments_playbook/exp_wff_topic-rewrite/case-181-light-hitl1-topic-rewrite-vague.md`
- `experiments_playbook/exp_wff_topic-rewrite/case-182-light-hitl1-topic-rewrite-detailed.md`
- `tests/integration/md/topic-rewrite-fixtures-contract.test.mjs`
- `openspec/changes/experiment-progressive-run-topic-rewrite-fixtures/verification-plan.yaml`
- `_backlog/plans/experiment-progressive-run-plan.md` Phase 3 evidence record
- One bounded `agent_flow_e2e` requalification selected by the current `calibration` profile
