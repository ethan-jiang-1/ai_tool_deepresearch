# silent-wave-execution

> req: SWE-001, SWE-002, SWE-003, SWE-004, SWE-005

## Purpose

Silent Wave Execution 定义了 Agent 在用户缺席（静默自主阶段）时的行为契约——在 wave0/1/2 执行期间完全自主、不浮出水面、遇错按降级优先级链自行处理、将 escalation 改写为降级并完整 trace、到达合法浮出水面点（HITL2）时汇总报告静默期积累的降级。

## Requirements

### Requirement: Silent wave execution contract

Silent wave execution wording SHALL use canonical phase-boundary terminology when describing gate boundaries and silent degradation.

Silent degradation, `silent_gap`, and `silent_unpassable` SHALL NOT be described as broad `phase transition` authority. The wording SHALL distinguish that these markers:

- do not authorize phase handoff, next-node loading, or consuming a target phase control surface;
- do not authorize `rb_status.json` source-gate status synchronization; and
- do not prove target-phase work completion.

The existing silent behavior remains unchanged: if the current gate/checkpoint does not accept the degraded artifact state, the Phase Agent continues repair or strategy change inside the current phase, records accepted diagnostics where allowed, and holds silently when structurally unpassable. Only gate CLI `check.next` plus the accepted handoff path can authorize entering the next phase.

#### Scenario: Silent degradation cannot cross phase boundary

- **WHEN** a `stop: no` phase records `silent_degradation`, `silent_gap`, or `silent_unpassable`
- **THEN** docs SHALL say the Agent remains in the current phase unless a gate emits `check.next`
- **AND** docs SHALL NOT describe those markers as authorizing handoff, status synchronization, or target work completion

### Requirement: Fatigue resistance in silent execution contract

`shared-silent-execution.md` SHALL include fatigue resistance guidance (§5) that instructs the Agent to self-check after repeated gate failures and distinguish structural from fixable failures. The guidance SHALL be part of the behavioral contract loaded by all manifest lifecycle `stop: no` phases via the `requires` dependency mechanism.

The fatigue resistance section SHALL cover:

- **Self-Check Protocol**: specific steps to take when a gate has failed 3+ consecutive times
- **Gate CLI Fatigue Signal**: instruction to pass Agent-reported `--attempt N` to gate CLI on retries
- **Structural vs. Fixable Failure**: criteria to distinguish failures that require strategy change from failures that require degradation
- **Degradation Affirmation**: explicit statement that degradation is correct autonomous behavior, not failure

Additionally, `shared-silent-execution.md` SHALL include an absolute prohibition preamble (§0) that appears before §1 and states the core contract in the strongest possible terms: the Agent SHALL NOT surface to the user during non-terminal `stop: no` phases. Gate failure is not an emergency. User-facing surfacing is forbidden, including questions, confirmations, progress reports, idle/no-work summaries, A/B choices, and "done so far" updates. Final SHALL be explicitly named as the terminal delivery exception: delivery is allowed after final artifacts exist, but questions, confirmations, progress reports, A/B choices, and post-delivery feedback handling are still forbidden.

#### Scenario: Agent reads fatigue resistance before phase body

- **WHEN** a manifest lifecycle `stop: no` phase is loaded via `assessNode()`
- **THEN** `shared-silent-execution.md` SHALL be in the dependency closure before the phase body
- **AND** the Agent SHALL read §0 (absolute prohibition) and §5 (fatigue resistance) before executing the phase

#### Scenario: Fatigue guidance instructs pass --attempt N

- **WHEN** the Agent reads the fatigue resistance section
- **THEN** the guidance SHALL instruct passing `--attempt N` to gate CLI on retries
- **AND** the guidance SHALL explain that N is Agent-reported, not Engine-verified
- **AND** the guidance SHALL explain that the engine returns `step_back: true` when N ≥ 3 and the gate fails

### Requirement: Autonomous continuation contract and terminal delivery visibility (SWE-003)

The silent execution contract SHALL include an autonomous continuation section explaining why continuing through the autonomous pipeline is the helpful behavior.

For this requirement, "autonomous continuation" means the behavior currently encoded by a non-terminal lifecycle `stop: no` phase: the Agent does not surface to the user, does not wait for user input, does not self-declare completion, and continues through the Markdown-controlled loop until gate pass and accepted `check.next` handoff.

The section SHALL state:

- final report delivery is guaranteed at the terminal Final phase after final artifacts are written;
- every completed wave improves evidence grounding, sourcing, and synthesis quality;
- high gate friction, user waiting time, or local confidence in partial data SHALL NOT authorize premature chat synthesis;
- early chat delivery during a non-terminal autonomous continuation phase is less helpful than completing the verified pipeline;
- the correct next action after a non-terminal gate pass is to consume `check.next` through the accepted handoff path.

This requirement is guidance for Agent behavior. It SHALL NOT replace Engine-side handoff witnessing, gate preflight, or trace-backed state checks.

#### Scenario: Agent sees final delivery reassurance

- **WHEN** the Agent reads `shared-silent-execution.md`
- **THEN** it SHALL see that final report delivery occurs at `phase-final`
- **AND** it SHALL see that non-terminal early synthesis is not a substitute for final delivery

#### Scenario: Gate friction does not authorize premature report

- **WHEN** a non-terminal autonomous continuation phase passes a gate after many attempts
- **THEN** the silent execution contract SHALL direct the Agent to continue through `check.next`
- **AND** it SHALL NOT permit asking the user whether the partial report is enough

#### Scenario: Autonomous continuation guidance is not the load-bearing checkpoint

- **WHEN** the silent execution contract includes autonomous continuation language
- **THEN** the system SHALL still rely on Engine trace checks for deterministic handoff truth
- **AND** prose SHALL NOT be treated as a replacement for `load_complete` or `gate_attempt(passed=true)` evidence

### Requirement: Silent autonomous execution has no implicit human co-runner

Silent autonomous execution SHALL be framed as Agent-run execution with no implicit human or operator co-runner inside non-terminal lifecycle phases.

During a run, HITL1 and HITL2 SHALL be the only interactive in-run checkpoints. Terminal non-interactive Final delivery is allowed after final artifacts exist, but it is not an interactive checkpoint, progress report, confirmation loop, or post-delivery repair surface. Post-final feedback, when supported by accepted content-delivery specs, re-enters through HITL2 repair/rerun rather than through a Final-owned loop. The one-time pre-pipeline drag/paste trigger is outside the lifecycle loop and does not imply that a human remains available to run commands, answer confirmations, receive progress reports, decide whether partial output is enough, or choose the next phase during `stop: no` execution.

Agent-facing silent execution docs SHALL preserve the existing allowance for unsolicited user messages during silent phases as a single-turn interruption that does not stop the Agent. That allowance SHALL NOT be generalized into asking the user questions, requesting confirmation, or treating the user as an in-loop operator.

#### Scenario: Non-terminal stop:no phase has no human fallback

- **WHEN** the Agent is inside a non-terminal lifecycle `stop: no` phase
- **THEN** docs SHALL instruct it to continue, repair, degrade, hold silently, or run the appropriate gate
- **AND** docs SHALL NOT instruct it to ask the user whether to continue or whether partial output is sufficient

#### Scenario: User interruption is not command transfer

- **WHEN** the user sends an unsolicited message during silent execution
- **THEN** the Agent MAY handle the interruption according to the silent execution contract
- **AND** the docs SHALL still require the Agent to continue autonomous execution rather than hand command execution back to the user

### Requirement: Stop:no surfacing intent SHALL be recorded before any prohibited user-facing pause when the Agent can identify the intent

During a non-terminal lifecycle phase with `stop: no`, the Agent SHALL NOT ask the user questions, request confirmation, present progress, deliver partial findings, offer A/B choices, or pause for user input. If the Agent nevertheless detects that it is about to surface to the user during such a phase, it SHALL record a diagnostic `surfacing_intent` trace/log event naming the active node, active bundle, intended surfacing type, and reason, then abort the user-facing surfacing path and continue repair, strategy change, degradation, or silent hold according to the silent execution contract.

This requirement is an observability contract for Agent-facing control surfaces. `surfacing_intent` SHALL NOT be treated as gate pass evidence, handoff evidence, status synchronization evidence, HITL authorization, or permission to surface. It SHALL NOT claim deterministic interception of every chat message; if the model emits prohibited chat without logging intent, post-run diagnostics MAY report missing surfacing-intent evidence or illegal surfacing suspicion.

#### Scenario: Agent logs known surfacing intent and aborts prohibited pause

- **WHEN** the Agent is in a non-terminal `stop: no` phase
- **AND** it intends to ask the user whether to continue, present partial findings, or wait for input
- **THEN** it SHALL write a diagnostic `surfacing_intent` event as a would-have-surfaced record
- **AND** the event SHALL include active bundle, node, intent type, and reason
- **AND** the Agent SHALL abort the user-facing surfacing path and follow the silent execution contract instead of pausing for user input

#### Scenario: No tool access does not create permission to surface

- **WHEN** the Agent cannot write a `surfacing_intent` event because no trace/log tool is available
- **THEN** it SHALL still not surface during non-terminal `stop: no`
- **AND** it SHALL hold silently or continue through the allowed autonomous path

#### Scenario: Post-run diagnostics can flag missing intent evidence

- **WHEN** trace and status indicate the Agent surfaced or attempted to treat a non-HITL phase as interactive
- **AND** no prior `surfacing_intent` event exists
- **THEN** diagnostics MAY report illegal surfacing suspicion or missing intent evidence
- **AND** the absence of an event SHALL NOT make the surfacing valid

#### Scenario: Surfacing intent is diagnostic only

- **WHEN** a `surfacing_intent` event exists in `rb_trace.jsonl` or `_logs/run.log`
- **THEN** the event SHALL be treated as diagnostic observability
- **AND** it SHALL NOT authorize a phase handoff, HITL interaction, final delivery, or status transition

#### Scenario: HITL and Final exceptions remain narrow

- **WHEN** the current lifecycle node is HITL1 or HITL2
- **THEN** interactive user input MAY occur through that node's accepted HITL contract
- **WHEN** the current lifecycle node is Final
- **THEN** terminal delivery MAY occur after final artifacts exist
- **AND** these exceptions SHALL NOT permit progress reports or user prompts inside non-terminal `stop: no` phases
