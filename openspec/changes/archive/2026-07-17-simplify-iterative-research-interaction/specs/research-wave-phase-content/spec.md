> req: RWP-002, RWP-018, RWP-019

## MODIFIED Requirements

### Requirement: Wave1 phase body completeness with subagent boundary

Wave1 phase body SHALL keep topic deepening in the normal `wave1_topic_deepening` work-unit path and SHALL load `shared/shared-reference-template` through its actual `requires` chain before the Phase Agent materializes consumer references. Merely mentioning the template filename in prose or asking the Agent to discover it indirectly SHALL NOT satisfy this producer contract.

After successful submit, the Phase Agent SHALL write `depth-review.yaml` from facts that are not already owned by submitted authority. The blocking review shape SHALL contain `version`, canonical topic binding, `reviewed_work_unit_refs[]`, depth-dimension judgments, profile-check judgments, `decision`, and `supplementary_queue_item_ids[]`. It SHALL NOT require the Agent to copy submitted `source_claims[]`, accepted URLs, cache refs, Wave0 URL arrays, new-source URL arrays, or derived floors into a second blocking authority. The Engine SHALL derive those facts from the reviewed submitted rows, Wave0 source authority, and profile.

At each affected inspect/gate/submit failure, phase guidance SHALL consume the Engine-provided direct repair coordinates: `repair_kind`, `missing_fact`, `write_to`, and `rerun`. When `repair_kind` is `agent_action|engine_operation`, `write_to` is an already authorized mutable surface or legal operation, and no new semantic/risk decision is needed, the Agent SHALL perform the mechanical repair and rerun the named checkpoint without asking the user to execute ordinary commands. `user_decision|external_action|missing_contract` SHALL identify only the smallest Agent-facing boundary. Because Wave1 is `stop: no`, those classifications SHALL NOT by themselves authorize the Phase Agent to initiate user-facing interaction or wait for acknowledgement. If a relevant user-initiated normal conversation turn is already current, the Agent SHALL answer from direct facts and, if the requested action reaches an unavailable path, state only the smallest boundary without persisting a decision or changing lifecycle authority. Guidance SHALL NOT infer repair kind from a path or invite hand-written ledger, receipt, trace, hash, or provenance repair.

When a valid `research_profile` decision is already recorded but `research_style_params` or one of its derived Wave floors is missing, the existing `apply-research-style.mjs` operation SHALL be the mechanical owner. Wave1/Wave2 findings SHALL use `repair_kind: engine_operation`, name the exact existing operation, and return to the same inspect/Gate checkpoint. Only absence or invalidity of the underlying recorded profile semantics MAY remain a `user_decision` boundary. This correction SHALL NOT add a style resolver, copy style values into Wave code, or change Wave verdict/routing.

#### Scenario: Wave1 loads the shared reference template

- **WHEN** `phase-wave1` is entered for normal or rerun-added topics
- **THEN** its loaded required context SHALL include `shared/shared-reference-template`
- **AND** the Phase Agent SHALL materialize references from that loaded contract after successful submit

#### Scenario: Depth review records judgment instead of ledger copies

- **WHEN** the Phase Agent reviews submitted Wave1 work units
- **THEN** `depth-review.yaml` SHALL identify the reviewed work-unit refs and record non-derivable depth/profile/decision judgments
- **AND** it SHALL NOT be required to reproduce submitted source/cache arrays or profile-derived numeric facts

#### Scenario: Agent performs authorized same-check repair

- **WHEN** an affected checkpoint returns `repair_kind: agent_action|engine_operation`, `missing_fact`, the corresponding authorized `write_to` coordinate, and `rerun`
- **THEN** the Phase Agent SHALL perform that action and rerun the named checkpoint
- **AND** it SHALL treat `user_decision`, `external_action`, or `missing_contract` only as the smallest Agent-facing boundary and obey the current node interaction contract rather than automatically escalating

#### Scenario: Recorded profile makes missing style parameters mechanical

- **WHEN** Wave1 or Wave2 cannot derive a required floor because `research_style_params` is missing but a valid `research_profile` is already recorded
- **THEN** the finding SHALL identify the existing `apply-research-style.mjs` operation with `repair_kind: engine_operation`
- **AND** the Agent SHALL execute it and rerun the same Wave inspect/Gate checkpoint without contacting the user
- **AND** a true missing profile decision SHALL remain a distinct `user_decision` boundary

#### Scenario: Wave1 deepening uses work-unit kind

- **WHEN** Wave1 deepening is delegated
- **THEN** the phase doc SHALL identify `wave1_topic_deepening` work units

#### Scenario: Wave1 requires depth review before topic completion

- **WHEN** a Wave1 work unit submits `evidence-summary.md` and `question-list.md`
- **THEN** the Phase Agent SHALL produce `artifacts/wave1/{topic}/depth-review.yaml`
- **AND** the topic SHALL NOT be considered complete until the depth review records `decision: accept`
- **AND** `supplement_required` or `blocked_contract` SHALL keep the topic incomplete for normal Wave1 pass

#### Scenario: Shallow Wave1 output routes to supplementary work unit

- **WHEN** Wave1 depth review finds too few genuinely new source URLs, missing depth dimensions, or unmet profile-required checks
- **THEN** the phase doc SHALL instruct the Agent to enqueue a supplementary `wave1_topic_deepening` queue item with explicit `payload.topic_slug`
- **AND** the Agent SHALL drain that supplementary item through `operate-work-unit claim` and `operate-work-unit submit`

### Requirement: Wave delegated drain loops SHALL route timeout through progress-aware preflight

Wave0, Wave1, and Wave2 phase Markdown SHALL instruct the Phase Agent to run progress-aware timeout preflight before terminalizing a delegated claimed work unit as timed out. Phase guidance SHALL not tell the Agent to close a claimed delegated attempt with `operate-work-unit timeout` solely because the initial wall-clock `deadline_at` has elapsed.

The delegated drain loop SHALL reconstruct in-flight work from bundle truth, actively poll or inspect work-unit readiness, submit ready attempts, repair rejected or repairable attempts, and use `timeout-preflight` for expired or stale attempts before terminal timeout. The Phase Agent SHALL follow preflight advice: submit submit-ready results, repair repairable same-`work_id` candidates, wait or continue polling recent-progress attempts, inspect/block invalid bindings, and call timeout only when preflight reports timeout-eligible or an explicit audited force timeout is chosen. Because false timeout eligibility exits non-zero by design, phase guidance SHALL tell the Agent to parse structured `timeout-preflight` stdout before deciding the next action.

Force timeout SHALL be documented as exceptional. Phase guidance SHALL NOT present `timeout --force` as the normal response to progress-positive work. If preflight recommends `block` or reports invalid binding, phase guidance SHALL direct the Phase Agent to inspect/repair through Engine tooling or preserve the smallest deterministic blocker in Agent-facing feedback rather than forcing timeout to make the phase drain. Because every Wave is `stop: no`, `block` and blocker feedback SHALL NOT by themselves authorize a user-facing question, status output, partial delivery, approval request, or acknowledgement wait; the Phase Agent SHALL continue other eligible work or hold silently with the attempt undrained.

This timeout-preflight path SHALL preserve the existing phase boundaries: bounded top-up claim remains an Agent strategy, Sub-agents remain bounded high-I/O actors, formal submit remains the only delegated success boundary, and gates run only after queue demand and delegated in-flight attempts are drained. The guidance SHALL NOT add Engine-owned waiting, daemon polling, user-notification dependency, direct Phase-Agent search for delegated evidence, or an alternate delegated completion path.

#### Scenario: Wave0 timeout uses preflight first

- **WHEN** a Wave0 source-intake work unit appears expired or stale
- **THEN** `phase-wave0.md` SHALL instruct the Phase Agent to run `operate-work-unit timeout-preflight`
- **AND** it SHALL direct the Agent to submit, repair, wait, inspect, block, or timeout according to structured preflight advice

#### Scenario: Wave1 timeout uses preflight first

- **WHEN** a Wave1 topic-deepening work unit appears expired or stale
- **THEN** `phase-wave1.md` SHALL instruct timeout-preflight before terminal timeout
- **AND** submit/repair advice SHALL preserve same-`work_id` repair, depth review, supplementary queue demand, and Phase-owned reference materialization boundaries

#### Scenario: Wave2 timeout uses preflight first

- **WHEN** a Wave2 targeted-evidence work unit appears expired or stale
- **THEN** `phase-wave2.md` SHALL instruct timeout-preflight before terminal timeout
- **AND** the guidance SHALL preserve pure-synthesis versus targeted-evidence authority boundaries

#### Scenario: progress-positive attempts are not treated as drained

- **WHEN** timeout-preflight recommends submit, repair, wait, inspect, or block for an in-flight work unit
- **THEN** the phase guidance SHALL treat the phase as not drained
- **AND** the wave gate SHALL NOT be run as if delegated work were complete

#### Scenario: force timeout is exceptional

- **WHEN** timeout-preflight reports a progress-positive or invalid-binding attempt as not timeout-eligible
- **THEN** phase guidance SHALL NOT present `timeout --force` as the default drain action
- **AND** it SHALL instruct the Phase Agent to prefer submit, repair, wait, inspect, or Agent-facing blocker retention according to preflight advice without initiating user interaction from a `stop: no` Wave

#### Scenario: no-progress timeout still returns to REDO

- **WHEN** timeout-preflight reports a no-progress attempt as timeout-eligible
- **THEN** phase guidance SHALL allow normal `operate-work-unit timeout`
- **AND** the retry path SHALL continue through queue demand, new work-unit claim, Sub-agent execution, submit, ledger, and gate

### Requirement: Wave delegated execution SHALL use one visible actor decision loop

Wave0, Wave1, and Wave2 phase guidance and the shared work-unit protocol SHALL instruct the Phase Agent to use this order at each delegated claim decision: inspect the queue-front planned delegated role, make one small real host/native observation for that exact role, invoke the existing claim checkpoint with the normalized observation and chosen execution actor class, then either spawn a normal delegated batch, execute one explicitly allowed `phase_agent_fallback`, or stop that claim attempt on the returned no-claim blocker. Guidance SHALL NOT tell the Agent to claim a batch first and discover availability by spawning every attempt, and SHALL NOT reuse one role observation for different delegated roles.

When fallback is accepted by claim, the Phase Agent SHALL execute the single claimed work unit itself without asking the user to run work-unit commands, then submit or terminalize it before claiming another fallback. When the kind policy prohibits fallback or the blocker is an external account, host policy, or permission that the Agent cannot change, guidance SHALL identify only the smallest external-action boundary in Agent-facing feedback and preserve the same claim checkpoint. Because Wave0, Wave1, and Wave2 are `stop: no`, that blocker SHALL NOT by itself authorize a framework-initiated question, status output, or acknowledgement wait; the Agent SHALL continue other eligible work or hold silently. A relevant user-initiated normal conversation turn SHALL receive an answer from direct facts and, if it reaches that blocker, only the smallest external-action boundary without changing authority. After the external prerequisite is satisfied through an accepted surface, the Agent SHALL rerun the same claim checkpoint. `human-directed` SHALL NOT be presented as availability evidence, actor-policy override, or fallback permission.

#### Scenario: Wave0 probes before bounded source-intake claim

- **WHEN** Wave0 has independent source-intake demand and no current actor observation
- **THEN** phase guidance SHALL direct one bounded native observation before `operate-work-unit claim`
- **AND** it SHALL not create multiple claimed attempts merely to test availability

#### Scenario: Wave2 targeted evidence uses the same role-bound decision loop

- **WHEN** Wave2 has `wave2_targeted_evidence` demand
- **THEN** phase guidance SHALL observe the planned `dpt-topic-scout` actor before claim
- **AND** any accepted fallback SHALL remain a single work-unit attempt under the kind actor policy

#### Scenario: Phase Agent executes accepted fallback mechanically

- **WHEN** claim returns work units bound to `phase_agent_fallback`
- **THEN** the Phase Agent SHALL read each generated task/beacon, perform the bounded work, emit actor-bound receipts, and run dry-submit/formal submit
- **AND** it SHALL submit or terminalize that attempt before claiming another fallback
- **AND** it SHALL not ask the user to execute those ordinary commands

#### Scenario: External host blocker escalates minimally

- **WHEN** the delegated actor is unavailable, fallback is not selected, and resolution requires a non-delegable host/account action
- **THEN** guidance SHALL identify only that external action or decision as the Agent-facing escalation boundary
- **AND** in a `stop: no` Wave the classification alone SHALL NOT authorize a user question, status output, or acknowledgement wait
- **AND** after the prerequisite is satisfied through an accepted surface, the Agent SHALL rerun the same claim checkpoint itself
