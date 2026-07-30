> req: REI-003

## MODIFIED Requirements

### Requirement: Rerun-ready gate validates legal rerun state

`phase-rerun.md` remains `stop: "no"` and the `rerun-ready` gate remains the deterministic checkpoint for legal rerun state. Gate failure SHALL NOT create a failed chain transition or allow the Agent to load another phase without `check.next`. After the existing legal rerun/profile/topic-state prerequisites are usable, the Gate SHALL call the shared side-effect-free style-projection freshness evaluator over `research_style_params`, the current selected profile, and committed canonical registry length. Absent, partial, wrong-profile, or stale parameters SHALL produce one direct `style_projection_freshness` root that names the existing `apply-research-style.mjs` command and rerun of this same Gate. An earlier rerun legality, profile, or canonical topic-state root SHALL mask this dependent freshness result. The Gate SHALL not select a style, write profile fields, change `rerun_count`, mutate topic state, or introduce a second rerun controller.

After a committed rerun topic-state operation changes canonical registry length,
the phase body SHALL consume the returned `style_projection` handoff before the
existing rerun-count increment and `rerun-ready` Gate. It SHALL invoke the
handoff's exact existing style CLI command; it SHALL not reread/parse the
profile to construct a second command, compute style parameters locally, or run
the style writer when the operation reports no length change. If a prior handoff
was not completed, the same Gate's direct freshness root remains the sole
feedback path to that existing writer and same-Gate rerun.

Rerun preparation is not a reporting checkpoint. If rerun analysis or materialization appears locally complete, the Agent SHALL run the `rerun-ready` gate, repair from inspect/advice, or record a legal silent holding event. It SHALL NOT initiate a "rerun prep is done so far" report, wait for confirmation, or route forward without `check.next`.

For fixable rerun preparation failures, such as missing derived seed topic materialization when the HITL2 rerun decision is otherwise valid, the phase body SHALL instruct the Agent to repair or take a silent degradation path without initiating a user request. In the specific case where `seed_topics/` is empty, the default silent degradation path SHALL be a full rerun seed regeneration, with the decision recorded through an accepted trace/log surface.

Hard non-repairable legality failures, such as an exhausted active max-rerun rule or missing HITL2 rerun rationale, remain gate failures. Because no failed chain edge exists, the Agent SHALL NOT route to another phase. The Agent SHALL record `silent_unpassable` through an accepted trace/log surface, keep the run in the current non-blocked/in-progress holding state, and SHALL NOT initiate a user question from mid-rerun.

The active `rerun_count` rule in `DPT_FRAMEWORK/schema/gate_definitions/gate-rerun-ready.definition.json`, as parsed by the production Gate-definition contract, SHALL be the sole numeric Source of Record for the current max-rerun boundary. One side-effect-free `evaluateRerunAvailability({ definition, profile, includeNextIncrement })` SHALL be the sole semantic interpretation used by the formal rerun-ready Gate, HITL2 advice and accepted post-final recovery. It SHALL validate the exact active gate/rule/check/target/operator/value shape; require `profile`, `human_decision_checkpoints` and `hitl2` to be non-array objects; normalize only an absent nested `rerun_count` to `0`; require any present count to be a nonnegative integer; and require `includeNextIncrement` to be an explicitly supplied boolean. Missing or non-boolean mode, `null`, string, negative, fractional or non-finite count, or a missing/malformed parent SHALL return one unsupported reason rather than select a mode through JavaScript truthiness. It SHALL compute `evaluatedCount = currentCount + (includeNextIncrement ? 1 : 0)` and `available = evaluatedCount < exclusiveLimit` without I/O, finding construction, routing or persistence. Existing Gate-local and post-final-local comparisons SHALL be replaced rather than retained. Phase/shared Markdown, registry descriptions, tests and Agent-facing docs SHALL NOT maintain another concrete numeric limit or comparison.

HITL2 and fresh/pre-commit post-final eligibility SHALL call `includeNextIncrement: true` for the rerun phase's required next increment. The formal rerun-ready Gate SHALL call `false` over its already-incremented profile and retain verdict/trace/routing ownership. Accepted post-final lineage after its event-bound increment SHALL verify the recorded one-field `currentCount -> evaluatedCount` delta and definition binding, then defer formal availability to that same `false` Gate call; it SHALL NOT evaluate a second future increment. Consumer-specific C5 stage semantics remain owned by `post-final-recovery`.

#### Scenario: Rerun-ready reports stale style projection through the existing writer

- **WHEN** legal rerun preparation changes the committed registry length but the recorded style parameters still reflect the prior count
- **THEN** `check-gate-rerun-ready.mjs` SHALL report one `style_projection_freshness` root
- **AND** feedback SHALL name the selected profile, current count, existing style CLI command, and rerun of that same Gate

#### Scenario: Rerun consumes the committed style handoff before its gate

- **WHEN** a legal rerun topic-state commit changes registry length and returns
  `style_projection`
- **THEN** phase-rerun SHALL invoke that handoff's exact style command before
  incrementing `rerun_count` and running `rerun-ready`
- **AND** a no-length-change result SHALL not trigger a profile parse or
  unconditional style command

#### Scenario: Rerun topic-state prerequisite masks freshness

- **WHEN** rerun legality, profile, or canonical topic-state preparation is
  unusable and style parameters are also stale or absent
- **THEN** rerun-ready SHALL return the earlier prerequisite root and mask
  `style_projection_freshness`
- **AND** feedback SHALL not direct an out-of-order profile write

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
- **AND** `includeNextIncrement` SHALL be an explicit boolean, and omission or any non-boolean value SHALL fail closed rather than silently select current-count mode
- **AND** formal Gate SHALL use `includeNextIncrement: false` for the already-incremented count while HITL2 and fresh/pre-commit post-final eligibility SHALL use `true` for the required next increment
- **AND** the evaluator SHALL compute `evaluatedCount = currentCount + (includeNextIncrement ? 1 : 0)` and `available = evaluatedCount < exclusiveLimit`
- **AND** only a parsed profile with object-shaped checkpoint/HITL2 parents present and nested count absent SHALL default to `0`; null, string, negative, fractional or non-finite counts SHALL be unsupported
- **AND** accepted post-final replay after the bound increment SHALL verify the recorded delta and defer to the formal Gate rather than check a next-next count
- **AND** formal Gate SHALL retain verdict/trace/routing while advisory consumers persist no eligibility
- **AND** no consumer SHALL retain a separate operator/value/count comparison
