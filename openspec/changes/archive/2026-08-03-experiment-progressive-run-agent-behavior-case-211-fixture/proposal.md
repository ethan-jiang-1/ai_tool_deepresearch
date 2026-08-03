## Why

Phase 4's first authorized discovery pilot, `case-211-heavy-wave0-happy-path`, produced real Subject-Agent evidence and completed inside its approved `$2.45` exposure (`435120` ms, `$2.13512`). Its retained native completion is nevertheless `FAIL`: the real source-intake result was submitted and work-unit inspection passed, but the Wave0 Gate lacked both a submitted `reference` output and the Phase-owned `wave0_evidence` seed projection. Independent heavy health was `ISSUES` because the fixture used trace-only setup and unmonitored Gate invocations rather than the existing observability path.

The direct sources of record are report `3c1e421b-e48f-4196-9ec6-94b19cd5b84f`, its preserved disposable bundle, and P4.3 in `_backlog/plans/experiment-progressive-run-plan.md`. Existing contracts already provide the required behavior: `research-wave-phase-content` requires a conditional shared-reference output for `shared_ref_count_floor`, dry-submit/formal-submit, and Phase-owned Projection Packet closeout; `experiment-observability` provides the gate monitor. The case fixture does not compose those existing legal actions into its claimed full Wave0 path.

## What Changes

- Repair `case-211-heavy-wave0-happy-path` so its seeded shared-reference floor becomes an explicit, actor-owned conditional output obligation: the real `dpt-source-intake` actor writes and declares the shared reference with a real `source_url` alongside its required source YAML; the Phase Agent does not fabricate either artifact.
- Make the playbook consume the existing returned-work loop in order: dry-submit, formal submit, contribution-aware Wave0 projection packet, existing `operate-topic-state apply`, Wave0 inspect, and Gate.
- Replace the helper-owned synthetic Wave0 predecessor with the existing legal fixture-bound chain: fixed setup input -> `setup-ready` -> seed-topic materialization -> `seed-topics-ready` -> Wave0 entry -> `seed_topics_ready` status advance. This deterministic setup establishes the legal Wave0 window only; it does not claim HITL1 or Seed Agent behavior.
- Replace case-owned synthetic/trace-only Gate setup and raw Gate capture with existing monitored Gate invocations, so the retained Gate artifacts, trace, and log describe the same real checks without adding a new health rule or writer.
- Add a focused Markdown contract test and verification plan that lock the legal ordering and evidence boundary while explicitly not claiming real Agent behavior.
- After static validation, record the current discovery selector. A second real requalification is conditional on a fresh selected one-case preflight and a new explicit Headless budget decision; this change does not reuse the spent P4.3 authorization.

This change does not alter the Wave0 assignment resolver, Gate rules, schemas, health policy, selector, Supervisor, or requirement semantics. `research-wave-phase-content` intentionally keeps `source.yaml` as the assignment's required output while allowing the conditional shared reference to be declared by the actor, so this is fixture conformance work and `.openspec.yaml` uses `skip_specs: true`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Existing `research-wave-experiments` / RWE-001, `research-wave-phase-content`, and `experiment-observability` contracts already own the required real Wave0 flow and monitored diagnostic behavior.

## Decision Boundary

The direct runtime truth remains the selected bundle's submitted ledger/declarations, returned result and receipt, Engine-owned projection write, monitored Gate artifact, `rb_trace.jsonl`, `_logs/run.log`, native completion, and Supervisor health/audit report. The shortest legal loop is: fixture setup -> real actor-declared reference and source output -> existing dry-submit/formal submit -> existing Phase projection writer -> monitored inspect/Gate -> native completion -> independent health. It removes an implicit optional-output expectation, an omitted Phase closeout step, and trace-only observability rather than adding a state, validator, retry tree, controller, or authority.

No named state, projection, command, module, or reader-facing view is added or materially changed. The useful existing distinction is preserved: the Subject Agent owns real search/fetch output, the Phase Agent owns semantic projection-packet content and invokes the existing legal writer, and the Engine owns submit, Gate, trace, and verdict truth. A maintainer can stop at the submitted declaration, projection result, monitored Gate artifact, and native/health report; an unavailable actor or unsuccessful Gate remains an explicit bounded result rather than a fabricated pass. The user supplied the P4.3 budget decision; the Agent executed the authorized pilot and now prepares the existing legal repair path; the Engine remains the deterministic authority. No `DPT_FRAMEWORK/` behavior changes, so no framework version bump is required.

## Impact

- `experiments_playbook/exp_wfn_wave0/case-211-heavy-wave0-happy-path.md`
- Narrow fixture support in `experiments_env/shared/` only if needed to avoid synthetic Wave0 handoff evidence while retaining current helpers for other cases
- A focused `tests/integration/md/` Markdown contract test
- `openspec/changes/experiment-progressive-run-agent-behavior-case-211-fixture/verification-plan.yaml`
- `_backlog/plans/experiment-progressive-run-plan.md` P4.3/P4.4 evidence record
- A future, newly authorized one-case `agent_flow_e2e` requalification only when the current discovery profile selects it
