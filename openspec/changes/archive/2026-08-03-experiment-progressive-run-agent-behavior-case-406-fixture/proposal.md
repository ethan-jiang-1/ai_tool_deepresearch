## Why

The bounded discovery run for `case-406-heavy-real-subagent-boundary` produced native `PASS` but Heavy health `ISSUES` solely because the bundle had no `_observability/gates/` directory. That case expressly stops at the submitted real Sub-agent checkpoint and must not run or claim a Wave0 Gate. Its fixture runner also currently writes synthetic Wave0 handoff/completion trace events, which make the early-boundary claim less precise.

The direct sources of record are report `642f2e58-60be-40b7-b4ef-377d585284d2`, its preserved bundle, the deterministic temporary reproduction, `experiment-ref-integrity` EXR-006, and `experiment-observability`'s early-boundary health scenario. The existing contracts already permit a Heavy-cost real-Agent case to select `health_profile: light` when it stops before phase readiness; no health-engine behavior is missing.

## What Changes

- Set case-406's explicit health policy to `light`, retaining its filename cost while avoiding a monitor obligation for a Gate the case deliberately does not execute.
- Make the case-406 fixture request the existing `writeWave0Scaffold` synthetic-trace opt-out, so fixture setup does not write `seed-topics-ready`, `load_complete`, or `wave0_completion` facts.
- Extend the focused integration regression to validate the case policy, absence of fixture-authored Wave0 facts, its native submit boundary, and clean Light health for a deterministic test-owned envelope.
- Record the direct `PASS + ISSUES` observation, diagnosis, static repair evidence, and any subsequent bounded requalification separately in the progressive-run plan.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. `experiment-ref-integrity` already requires case-406 to stop before Wave0 readiness, and `experiment-observability` already defines Light health for a Heavy-cost early-boundary real-Agent playbook. This is fixture/playbook conformance, so `.openspec.yaml` declares `skip_specs: true`.

## Decision Boundary

The reader-facing question is bounded: did the real Sub-agent write and submit its assigned work-unit evidence, without implying that Wave0 became ready? The maintained distinctions are native verdict versus independent health, filename cost versus declared health scope, and fixture setup versus real phase/actor facts. The normal reasoning stop is the submitted work-unit ledger, receipt/result/output evidence, Engine submit trace, and the selected Light health report; a Wave0 projection or Gate remains explicitly outside this case.

The shortest legal control loop is case fixture setup without synthetic phase facts -> real Subject result -> Engine submit/checks -> Light health. It removes an impossible Gate-monitor requirement and synthetic completion evidence instead of adding a new state, monitor, validator, retry path, or authority. The user authorized continued bounded execution; the Agent performs the repair and any profile-selected requalification; the Engine remains the authority for submit, trace, completion, and health verdicts. No `DPT_FRAMEWORK/` behavior changes, so no framework version bump is required.

## Impact

- `experiments_playbook/exp_engine-boundary/case-406-heavy-real-subagent-boundary.md`
- `experiments_env/shared/run-fixture-backed-case.mjs`
- `tests/integration/md/case-406-real-subagent-contract.test.mjs`
- `openspec/changes/experiment-progressive-run-agent-behavior-case-406-fixture/verification-plan.yaml`
- `_backlog/plans/experiment-progressive-run-plan.md`
