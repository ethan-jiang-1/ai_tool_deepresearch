> req: REI-003, REI-005

## MODIFIED Requirements

### Requirement: Rerun-ready gate validates legal rerun state

`phase-rerun.md` remains `stop: "no"` and the `rerun-ready` gate remains the deterministic checkpoint for legal rerun state. Gate failure SHALL NOT create a failed chain transition or allow the Agent to load another phase without `check.next`.

Rerun preparation is not a reporting checkpoint. If rerun analysis or materialization appears locally complete, the Agent SHALL run the `rerun-ready` gate, repair from inspect/advice, or record a legal silent holding event. It SHALL NOT initiate a "rerun prep is done so far" report, wait for confirmation, or route forward without `check.next`.

For fixable rerun preparation failures, such as missing derived seed topic materialization when the HITL2 rerun decision is otherwise valid, the phase body SHALL instruct the Agent to repair or take a silent degradation path without initiating a user request. In the specific case where `seed_topics/` is empty, the default silent degradation path SHALL be a full rerun seed regeneration, with the decision recorded through an accepted trace/log surface.

Hard non-repairable legality failures, such as an exhausted active max-rerun rule or missing HITL2 rerun rationale, remain gate failures. Because no failed chain edge exists, the Agent SHALL NOT route to another phase. The Agent SHALL record `silent_unpassable` through an accepted trace/log surface, keep the run in the current non-blocked/in-progress holding state, and SHALL NOT initiate a user question from mid-rerun.

The active `rerun_count` rule in `DPT_FRAMEWORK/schema/gate_definitions/gate-rerun-ready.definition.json`, as parsed by the production Gate-definition contract, SHALL be the sole numeric Source of Record for the current max-rerun boundary. One side-effect-free `evaluateRerunAvailability({ definition, profile, includeNextIncrement })` SHALL be the sole semantic interpretation used by the formal rerun-ready Gate, HITL2 advice and accepted post-final recovery. It SHALL validate the exact active gate/rule/check/target/operator/value shape, require a parsed profile object with `human_decision_checkpoints.hitl2`, normalize only an absent nested `rerun_count` to `0`, require any present count to be a nonnegative integer, and return only closed facts or one unsupported reason. It SHALL compute `evaluatedCount = currentCount + (includeNextIncrement ? 1 : 0)` and `available = evaluatedCount < exclusiveLimit` without I/O, finding construction, routing or persistence. Existing Gate-local and post-final-local comparisons SHALL be replaced rather than retained. Phase/shared Markdown, registry descriptions, tests and Agent-facing docs SHALL NOT maintain another concrete numeric limit or comparison.

HITL2 and fresh/pre-commit post-final eligibility SHALL call `includeNextIncrement: true` for the rerun phase's required next increment. The formal rerun-ready Gate SHALL call `false` over its already-incremented profile and retain verdict/trace/routing ownership. Accepted post-final lineage after its event-bound increment SHALL verify the recorded one-field `currentCount -> evaluatedCount` delta and definition binding, then defer formal availability to that same `false` Gate call; it SHALL NOT evaluate a second future increment. Consumer-specific C5 stage semantics remain owned by `post-final-recovery`.

#### Scenario: Empty seed topics defaults to full rerun silently

- **WHEN** the rerun phase finds `seed_topics/` empty while preparing rerun inputs
- **THEN** the Agent SHALL default to full rerun seed regeneration
- **AND** the Agent SHALL record `silent_degradation` through an accepted trace/log surface
- **AND** the Agent SHALL NOT ask the user to confirm full rerun

#### Scenario: Non-repairable rerun legality failure does not route forward

- **WHEN** the `rerun-ready` gate fails because the active max-rerun rule is exhausted or HITL2 rerun rationale is absent
- **THEN** `resolveNodeTransitionDetailed` SHALL return `kind: "no_transition"`
- **AND** the Agent SHALL NOT load another phase without `check.next`
- **AND** the Agent SHALL NOT initiate a user question from inside the `stop: "no"` rerun phase
- **AND** the Agent SHALL record `silent_unpassable` with the gate failure reason through an accepted trace/log surface

#### Scenario: Rerun local completion does not become progress reporting

- **WHEN** rerun preparation has no obvious local work remaining
- **THEN** the Agent SHALL run the `rerun-ready` gate or follow gate fail repair guidance
- **AND** it SHALL NOT initiate a progress summary or idle report
- **AND** it SHALL NOT load `seed-topics` without gate CLI `check.next`

#### Scenario: Boundary verification reads the active definition

- **WHEN** the rerun-ready boundary integration test determines the current max-rerun rule
- **THEN** it SHALL read the production-parsed operator/value from the active Gate definition
- **AND** it SHALL prove the value immediately below the exclusive limit passes while the limit and a value above it fail
- **AND** it SHALL NOT copy the current numeric limit into a separate test constant

#### Scenario: One evaluator owns rerun availability semantics

- **WHEN** formal rerun-ready Gate, HITL2 advice or accepted post-final recovery interprets the active rerun-count rule
- **THEN** each consumer SHALL call the same side-effect-free evaluator
- **AND** the evaluator SHALL receive the full parsed profile and reject a missing/unparseable profile or missing HITL2 parent
- **AND** formal Gate SHALL use `includeNextIncrement: false` for the already-incremented count while HITL2 and fresh/pre-commit post-final eligibility SHALL use `true` for the required next increment
- **AND** the evaluator SHALL compute `evaluatedCount = currentCount + (includeNextIncrement ? 1 : 0)` and `available = evaluatedCount < exclusiveLimit`
- **AND** only a parsed profile with the HITL2 parent present and nested count absent SHALL default to `0`
- **AND** accepted post-final replay after the bound increment SHALL verify the recorded delta and defer to the formal Gate rather than check a next-next count
- **AND** formal Gate SHALL retain verdict/trace/routing while advisory consumers persist no eligibility
- **AND** no consumer SHALL retain a separate operator/value/count comparison

### Requirement: Rerun loop protection with max iterations

Rerun loop protection remains mandatory. The distinction between framework-initiated surfacing and a user-initiated reply SHALL NOT weaken the active rerun-count Gate rule. When the active max-rerun boundary is exhausted, the Agent SHALL treat the current rerun path as unpassable rather than bypassing the Gate, resetting the counter, inventing a new route, or treating a user message as override authority.

The concrete boundary SHALL be owned only by the active `gate-rerun-ready.definition.json` rule. Specs and governance descriptions SHALL state stable max-iteration semantics without hardcoding a number or duplicating a rule count. Changing the active boundary value is outside this change and SHALL require a separate accepted behavior change.

#### Scenario: Max reruns exhausted remains unpassable

- **WHEN** `rerun_count` no longer satisfies the active max-rerun Gate rule
- **THEN** the rerun-ready gate SHALL fail
- **AND** the Agent SHALL NOT reset `rerun_count`
- **AND** the Agent SHALL NOT bypass the gate through Markdown prose or a user message

#### Scenario: This change preserves the active boundary

- **WHEN** this change is applied
- **THEN** the operator and numeric value in the active rerun-ready Gate definition SHALL remain unchanged
- **AND** only stale prose, registry descriptions and copied test expectations SHALL be aligned to that active rule
