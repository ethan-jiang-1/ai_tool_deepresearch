> req: REI-003, REI-005, REI-006

## MODIFIED Requirements

### Requirement: Rerun-ready gate validates legal rerun state

`phase-rerun.md` remains `stop: "no"` and the `rerun-ready` gate remains the deterministic checkpoint for legal rerun state. Gate failure SHALL NOT create a failed chain transition or allow the Agent to load another phase without `check.next`.

Rerun preparation is not a reporting checkpoint. If rerun analysis or materialization appears locally complete, the Agent SHALL run the `rerun-ready` gate, repair from inspect/advice, or record a legal silent holding event. It SHALL NOT initiate a "rerun prep is done so far" report, wait for confirmation, or route forward without `check.next`.

For fixable rerun preparation failures, such as missing derived seed topic materialization when the HITL2 rerun decision is otherwise valid, the phase body SHALL instruct the Agent to repair or take a silent degradation path without initiating a user request. In the specific case where `seed_topics/` is empty, the default silent degradation path SHALL be a full rerun seed regeneration, with the decision recorded through an accepted trace/log surface.

Hard non-repairable legality failures, such as an exhausted active max-rerun rule or missing HITL2 rerun rationale, remain gate failures. Because no failed chain edge exists, the Agent SHALL NOT route to another phase. The Agent SHALL record `silent_unpassable` through an accepted trace/log surface, keep the run in the current non-blocked/in-progress holding state, and SHALL NOT initiate a user question from mid-rerun.

The active `rerun_count` rule in `DPT_FRAMEWORK/schema/gate_definitions/gate-rerun-ready.definition.json`, as parsed by the production Gate-definition contract, SHALL be the sole numeric Source of Record for the current max-rerun boundary. One side-effect-free `evaluateRerunAvailability({ definition, profile, includeNextIncrement })` SHALL be the sole semantic interpretation used by the formal rerun-ready Gate, HITL2 advice and accepted post-final recovery. It SHALL validate the exact active gate/rule/check/target/operator/value shape; require `profile`, `human_decision_checkpoints` and `hitl2` to be non-array objects; normalize only an absent nested `rerun_count` to `0`; require any present count to be a nonnegative integer; and require `includeNextIncrement` to be an explicitly supplied boolean. Missing or non-boolean mode, `null`, string, negative, fractional or non-finite count, or a missing/malformed parent SHALL return one unsupported reason rather than select a mode through JavaScript truthiness. It SHALL compute `evaluatedCount = currentCount + (includeNextIncrement ? 1 : 0)` and `available = evaluatedCount < exclusiveLimit` without I/O, finding construction, routing or persistence. Existing Gate-local and post-final-local comparisons SHALL be replaced rather than retained. Phase/shared Markdown, registry descriptions, tests and Agent-facing docs SHALL NOT maintain another concrete numeric limit or comparison.

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
- **AND** `includeNextIncrement` SHALL be an explicit boolean, and omission or any non-boolean value SHALL fail closed rather than silently select current-count mode
- **AND** formal Gate SHALL use `includeNextIncrement: false` for the already-incremented count while HITL2 and fresh/pre-commit post-final eligibility SHALL use `true` for the required next increment
- **AND** the evaluator SHALL compute `evaluatedCount = currentCount + (includeNextIncrement ? 1 : 0)` and `available = evaluatedCount < exclusiveLimit`
- **AND** only a parsed profile with object-shaped checkpoint/HITL2 parents present and nested count absent SHALL default to `0`; null, string, negative, fractional or non-finite counts SHALL be unsupported
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

### Requirement: Rerun node analyzes rationale vs seed_topics and produces topic adjustment plan

`phase-rerun.md` body SHALL instruct the Agent to:

1. Read `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale`, canonical `rb_plan.md#/topic_registry`, current `seed_topics/`, and `operate-topic-state inspect` including its copy-ready layout baseline.
2. Produce a semantic adjustment plan that distinguishes topics to keep, existing topics whose intent needs refinement, new topics to add, explicit current-layout rename/reorder/renumber, and requested remove operations.
3. Prepare exactly one explicit topic-state apply form:
   - add/refine uses `add_topic` and `update_intent` with existing C3A fields;
   - layout mutation uses one complete `mutate_layout` target with `expected_plan_sha256`, ordered retained UID/title/slug-stem entries and explicit remove UIDs;
   - migrate-legacy remains its own complete reconciliation and SHALL NOT mix with either form.
4. Run topic-state apply before queueing new work. Consume structured blockers and rerun the same operation after repair. Active queue/work-unit blockers are ordinary Agent-owned mechanical work.
5. For each successfully added/refined topic, write or update the UID-bound seed `## 本轮重跑方向` section with the existing Agent-facing content: `action`, new search dimensions, adjusted depth, search guardrails and rationale excerpt. These labels remain guidance content, not a second machine state. Layout-only mutation SHALL preserve existing seed body guidance while updating current seed metadata/path.
6. Increment `rb_profile.yaml#/human_decision_checkpoints/hitl2/rerun_count` through the existing profile path. If registry length changed through add or safe remove, run the existing `apply-research-style.mjs` owner before the rerun-ready gate.
7. Preserve the incoming accepted rerun status window until `check-gate-rerun-ready.mjs` passes. After pass, consume `check.next` through `enter-phase`, then run source-gate `advance-status --to rerun_ready`.

Rename/reorder/renumber SHALL use only canonical topic-state apply; it SHALL NOT fall back to direct multi-file edits. Historical artifact/reference/output paths SHALL remain untouched and continue to resolve through previous layout. Remove SHALL proceed only when Engine proves the UID has no dependency or historical work/content facts; otherwise the Agent SHALL report the single provenance-preserving boundary rather than delete history or invent retirement state.

If update-intent or mutate-layout is blocked by queued, delegated-in-flight or nonterminal work, the Agent SHALL use the existing queue/work-unit inspect, submit, repair or terminalization path and rerun topic-state apply. This mechanical blocker SHALL NOT be pushed to the user unless a new semantic conflict remains after the direct owner is resolved.

Topic-state apply in rerun SHALL be authorized only when `rb_status.json#/current_node` is `phases/phase-rerun.md`, the incoming `current_gate: hitl2_recorded` / `next_gate: rerun_ready` window remains intact, and one of two route-bound witness classes is valid and non-superseded:

- the existing HITL2 gate->rerun handoff plus load; or
- an accepted `post_final_reentry` event whose after-profile still matches current HITL2 semantics/hash, plus its route-bound rerun load and existing `advance-status` phase transition under `POF-003`.

The post-final witness SHALL not be added as a fake chain/gate outcome; it is an explicit exceptional entry into the same rerun node. A caller-declared rerun context, HITL2 rationale or human-directed prose alone SHALL NOT authorize mutation. `migrate_legacy` and `mutate_layout` SHALL be unavailable outside this sanctioned rerun context. The phase SHALL preserve existing loop protection and increment `rerun_count`; it SHALL NOT treat post-final origin as permission to reset or skip the count.

The exact event-bound after-profile requirement applies to the initial reentry/topic-state authorization window. After topic-state preparation succeeds, the existing rerun phase remains the sole owner of the sanctioned `rerun_count` increment from the event-bound `current_count` to `next_count`. When committed add or safe-remove changes canonical registry length, the already-required `apply-research-style.mjs` step SHALL remain the sole profile-style writer and SHALL call the RES-001 pure computation using the event-bound `research_profile` definition and current committed registry length before the count increment and rerun-ready Gate. If execution stops after that exact style write but before count increment, the shared C5 result SHALL keep the existing `synchronized_initial_profile` stage and return phase-rerun's existing count step as the nearest owner; it SHALL NOT repeat topic mutation or add a crash-recovery stage.

The shared C5 ownership/stage evaluator SHALL recognize at event-bound current count either the exact event-bound style parameters or that complete exact deterministic style projection, and at event-bound next count either of the same style shapes alongside the recorded count delta. It SHALL require current `research_profile` and every other profile field to match the event-bound after-profile. A style value matching neither allowed shape, different style name, or unrelated profile change SHALL remain unexplained drift. The updated count SHALL remain subject to the same active rule digest and normal profile/gate validation. Rerun/reentry consumers SHALL reuse this stage/owner result rather than keep separate count-only comparators.

#### Scenario: Rerun preserves incoming HITL2 status window before gate pass
- **WHEN** normal HITL2 or accepted post-final recovery has selected and loaded `phase-rerun.md`
- **THEN** the Agent SHALL keep `current_gate: hitl2_recorded` and `next_gate: rerun_ready` while preparing/applying topic intent or layout
- **AND** it SHALL NOT advance status before the rerun-ready gate passes

#### Scenario: Rerun status sync happens only after rerun-ready pass
- **WHEN** rerun-ready passes with `check.next: phases/phase-seed-topics.md`
- **THEN** the Agent SHALL enter that node first and then run `advance-status --to rerun_ready`

#### Scenario: Route-bound rerun entry authorizes topic apply
- **WHEN** HITL2 emitted the rerun target, `enter-phase` recorded the matching route-bound load witness, and the incoming rerun status window is current
- **THEN** rerun topic-state apply MAY migrate legacy state, add/refine canonical intent or apply one complete layout target

#### Scenario: Route-bound post-final recovery entry authorizes the same topic apply
- **WHEN** a valid C5 event is bound to the latest Final lineage, current profile matches its bound after-profile, `enter-phase` recorded the matching rerun load witness, existing `advance-status` wrote the matching phase transition, and the incoming rerun status window is current
- **THEN** rerun SHALL use the same topic-state actions, count increment and gate as a normal HITL2 rerun
- **AND** SHALL NOT create a post-final-specific topic or chain path

#### Scenario: Missing or superseded rerun witness blocks apply
- **WHEN** current-node/context claims rerun but neither accepted normal nor post-final route-bound witness is valid and current
- **THEN** apply SHALL reject before workspace creation and point to the existing lifecycle/recovery owner
- **AND** the Agent SHALL NOT ask the user to approve a mechanical bypass

#### Scenario: New rerun topic materializes before work
- **WHEN** the rationale requires a new topic
- **THEN** the Agent SHALL commit add-topic registry+seed intent before enqueueing Wave0/Wave1 work

#### Scenario: Existing topic intent update preserves layout
- **WHEN** the rationale refines an existing topic without requesting layout change
- **THEN** update-intent SHALL preserve its UID/id/slug and existing artifacts

#### Scenario: Complete layout target preserves historical outputs
- **WHEN** rationale clearly requests rename or reorder/renumber
- **THEN** the Agent SHALL edit inspect's complete layout baseline and run mutate-layout
- **AND** historical artifact/reference/output files SHALL remain at recorded paths while new work uses current slug

#### Scenario: Safe remove is Engine-proven
- **WHEN** rationale requests removal of a never-worked UID with no inbound dependency
- **THEN** mutate-layout MAY remove its registry/current-seed projection and renumber retained topics
- **AND** a UID with any historical fact SHALL remain blocked without partial layout edits

#### Scenario: First rerun increments count and writes guidance
- **WHEN** rerun_count is absent or 0 and topic-state preparation succeeds
- **THEN** the Agent SHALL write rerun_count 1 through the existing profile path
- **AND** affected add/refine UID-bound seeds SHALL contain updated rerun direction guidance

#### Scenario: Second rerun preserves existing loop protection
- **WHEN** rerun_count is 1 and another sanctioned normal or post-final rerun preparation succeeds
- **THEN** the Agent SHALL write rerun_count 2 and update affected add/refine direction guidance

#### Scenario: Existing rerun count mutation does not invalidate entry lineage

- **WHEN** the initial C5 profile/event/load/phase-transition window authorized topic-state preparation, canonical topic count optionally changed through accepted topic-state, the existing style owner recomputed its exact projection when required, and the rerun phase increments `rerun_count` through its existing owner
- **THEN** the C5 event SHALL remain the historical entry witness for that rerun attempt
- **AND** downstream rerun-ready validation SHALL accept the event-bound `current_count -> next_count` delta plus only the complete RES-001 projection from event-bound style and current canonical registry, then evaluate the count through the existing gate rule rather than require the pre-increment profile hash

#### Scenario: Style projection crash before count increment resumes existing owner

- **WHEN** sanctioned topic preparation and exact style recomputation have committed but profile count remains the event-bound current count
- **THEN** C5, handoff and reentry SHALL retain `synchronized_initial_profile` and expose the existing phase-rerun count increment owner
- **AND** they SHALL NOT repeat topic mutation, add a stage or write the count themselves

#### Scenario: Style projection cannot hide profile drift

- **WHEN** rerun-time profile contains a different `research_profile`, a `research_style_params` object matching neither the unchanged event-bound params nor exact current projection, or another changed profile field
- **THEN** C5, handoff and reentry consumers SHALL reject the profile as unexplained lineage drift
- **AND** they SHALL NOT recompute-and-write, choose another style or ask the user to approve a mechanical bypass

#### Scenario: Existing artifacts remain preserved
- **WHEN** rerun add/refine or layout preparation executes
- **THEN** existing `reference/`, `artifacts/`, submitted ledger and work-unit history SHALL NOT be deleted, renamed or rewritten by topic-state operations

#### Scenario: Remove or layout mutation remains blocked
> **@deprecated** - Direct multi-file or imperative layout mutation remains blocked; C3B now provides one complete sanctioned `mutate_layout` target.

- **WHEN** the rationale requests remove, rename or renumber
- **THEN** the Agent SHALL use the complete topic-state layout target rather than direct edits or a parallel namespace
- **AND** if Engine history, dependency, quiescence or lifecycle checks reject that target, the layout SHALL remain unchanged and the Agent SHALL follow the single returned owner/boundary action
