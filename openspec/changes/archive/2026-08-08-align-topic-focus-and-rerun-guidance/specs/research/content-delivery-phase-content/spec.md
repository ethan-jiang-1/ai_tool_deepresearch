# Content Delivery Phase Content Delta

> req: CDP-001

## MODIFIED Requirements

### Requirement: Phase HITL2 body completeness

`phase-hitl2.md` SHALL contain a complete 9-section body following the
standard phase node structure. The node SHALL declare `phase: hitl2`, `gate:
hitl2-recorded`, and `stop: "yes"`. Routing SHALL come from
`transitions.chain.json` and the HITL2 gate result rather than a second
frontmatter `next` authority.

The phase SHALL produce a decision brief that reviews what the research can
answer, open questions, limitations or disputes, and one Agent-recommended
next action with its reason and expected effect. When that action would rerun
research or otherwise materially increase effort/cost, the brief SHALL disclose
the foreseeable material impact from current direct facts without adding an
estimator or state field. User acceptance after that disclosure SHALL count as
confirmation of the disclosed impact; only an actual expansion beyond the
disclosure/current permission requires another minimum question. The
recommendation SHALL be advice for the user's semantic decision; it SHALL NOT
become a decision authority or be recorded as the user's choice without real
user input.

Before the brief presents rerun as executable or the Agent records a clear
rerun request, `phase-hitl2.md` SHALL own one repo-root read-only inline Node
ESM invocation importing existing `loadGateDefinition('rerun-ready')`, the
profile reader and one shared pure rerun-availability evaluator from the Engine
helper barrel. It SHALL output only the evaluator's closed availability facts
without writing files, trace, or state; `brief/hitl2.md` SHALL consume the
phase-derived result rather than duplicate the invocation. The Agent SHALL NOT
raw-parse the definition, interpret `failure_message`, reimplement rule/count
comparison in Markdown, or invent a wrapper/CLI. The phase SHALL pass the
loader-parsed definition and full parsed profile to the REI-003 evaluator with
`includeNextIncrement: true` and consume only its closed result. It SHALL NOT
optional-chain a count before evaluation or duplicate rule/profile/count
interpretation. HITL2 SHALL present/record rerun as executable only for
`supported: true, available: true`; a supported unavailable result exposes only
the new-bundle decision, while unsupported loader/profile/config facts expose
only their concrete contract boundary. Formal Gate authority remains unchanged,
no concrete numeric limit or persisted eligibility SHALL be added, and
post-final consumer stages remain owned by POF-001/POF-003.

The phase SHALL let the user accept or reject that recommendation, ask
questions, use an optional shortcut, or express a different desired outcome in
natural language. Only while HITL2 is the accepted current `stop: yes`
decision boundary SHALL the Agent map clear user intent to the existing
structured decision contract in `rb_profile.yaml#/human_decision_checkpoints/hitl2`.
This mapping SHALL NOT authorize an ordinary voluntary message from a non-HITL
`stop: no` phase to be persisted as a HITL2 decision, mutate run state, select
a route, or create permission.

The allowed decision enum values SHALL remain: `proceed_to_readiness`,
`request_view_revision`, `repair`, `rerun`, `stop_blocked`. A clear
natural-language or shortcut decision SHALL itself count as confirmation. The
phase SHALL NOT impose a blanket second confirmation before recording one of
the five accepted decisions. The Agent SHALL ask only the smallest question
needed to resolve substantive ambiguity, real cost/permission expansion, or
irreversible risk. After the decision is recorded, ordinary Gate, repair,
handoff, status synchronization, and continuation mechanics SHALL return to
the Agent.

When the user selects the existing legal `rerun` decision and supplies a new
or revised research focus, the existing rationale SHALL record two visibly
labelled narrative parts: the user's focus wording verbatim and the Agent's
concise current interpretation. The Agent SHALL let the user correct the
interpretation in the same HITL2 loop before it records the decision. This
free text remains existing rationale guidance only; it SHALL NOT add a focus
enum, profile field, Topic field, Gate input, source quota, separate route, or
third checkpoint. An ordinary rerun with no focus remains compatible with the
existing rationale form.

The phase SHALL record the existing `hitl2_recorded` trace event. This event
is diagnostic/audit evidence of the Phase Agent's recording action; it SHALL
NOT become a second blocking substitute for the profile decision fields or the
gate CLI's own `gate_attempt` event.

After gate pass, the Agent SHALL read `user_decision` from `rb_profile.yaml`
and act accordingly:

- `proceed_to_readiness`: the gate CLI SHALL use the deterministic `passed`
  outcome; the Agent SHALL consume `check.next` for `phases/phase-readiness.md`
  through the accepted handoff path.
- `rerun`: the gate CLI SHALL use the deterministic `rerun` outcome; the
  Agent SHALL consume `check.next` for `phases/phase-rerun.md` through the
  accepted handoff path.
- `request_view_revision`: the Agent SHALL use the recorded rationale and
  current bundle state to determine the affected phase when an existing legal
  path supports it; this context-dependent action SHALL NOT default to
  readiness or gain a fixed chain entry.
- `repair`: when an existing legal repair path supports the requested
  correction, the Agent SHALL use the recorded rationale to repair the current
  run and rerun the HITL2 gate; it SHALL NOT restart from instantiation merely
  because the user chose repair.
- `stop_blocked`: when existing accepted stop behavior is legal at the current
  position, the Agent SHALL use it to terminate the lifecycle and preserve the
  reason.

For any context-dependent action without a legal path at the current position,
the Agent SHALL preserve the user's stated semantics where the existing owner
permits, report the smallest missing capability/path boundary, and SHALL NOT
claim success, recommend the action as immediately executable, invent a route,
default to readiness, or hand-write deterministic status.

`Human-directed` in this phase SHALL identify the source of the semantic
decision. It SHALL NOT transfer ordinary command execution to the user or
create permission by itself: after the decision is recorded, the Agent executes
the remaining mechanical actions allowed by current host permission and
accepted Engine paths. The Agent SHALL NOT invent a route, mutate deterministic
authority by hand, or claim that the decision itself creates an unavailable
override/reentry capability. `transitions.chain.json` SHALL encode only the
existing fixed outcomes: `passed` to `phases/phase-readiness.md` and `rerun` to
`phases/phase-rerun.md`; `request_view_revision`, `repair`, and `stop_blocked`
remain Agent-level decisions without fixed chain entries.

#### Scenario: HITL2 frontmatter contract
- **WHEN** `phase-hitl2.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-hitl2`, `phase: hitl2`, `gate: hitl2-recorded`, `stop: "yes"`
- **AND** `requires` SHALL include at least `shared/shared-profile`
- **AND** the phase SHALL NOT establish a competing frontmatter routing authority

#### Scenario: HITL2 decision brief production
- **WHEN** Agent executes the HITL2 phase
- **THEN** Agent SHALL produce `artifacts/hitl2/decision-brief.md` with a research review, exactly one current recommendation, its reason, and expected effect
- **AND** if the recommendation materially increases effort/cost, the brief SHALL disclose that foreseeable impact
- **AND** the brief SHALL present the five accepted actions as optional user-facing affordances rather than requiring internal enum knowledge

#### Scenario: HITL2 rerun records labelled focus rationale
- **WHEN** the user clearly asks to continue research for a stated Topic and
  provides a new or revised focus while rerun availability is supported and available
- **THEN** Agent SHALL record the existing `rerun` decision and a rationale
  containing the user's wording verbatim plus separately labelled current interpretation
- **AND** the Agent SHALL allow correction before recording and SHALL NOT ask a blanket second confirmation
- **AND** the existing Gate/handoff uses `check.next: phases/phase-rerun.md`

#### Scenario: HITL2 user decision recorded to profile
- **WHEN** the user provides a clear natural-language or shortcut decision while HITL2 is the accepted current decision boundary
- **THEN** Agent SHALL map the intent and write the decision to `rb_profile.yaml` under `human_decision_checkpoints.hitl2`
- **AND** the `status` field SHALL be set to `recorded`
- **AND** the `user_decision` field SHALL be one of the five accepted enum values
- **AND** the decision SHALL NOT remain only in chat memory
- **AND** the Agent SHALL NOT ask for a second confirmation of the same clear decision

#### Scenario: HITL2 stop behavior
- **WHEN** Agent reaches the stop point after producing the decision brief
- **THEN** Agent SHALL pause and wait for the user's semantic decision
- **AND** Agent SHALL NOT advance past the gate without a real user decision
- **AND** once a clear decision is recorded, Agent SHALL resume the legal mechanical path without another blanket wait

#### Scenario: Ambiguous HITL2 intent gets one minimum clarification
- **WHEN** the user says “再处理一下” and current context cannot distinguish `repair` from `rerun`
- **THEN** the Agent SHALL ask only the minimum question needed to distinguish the two semantics
- **AND** after clarification the Agent SHALL record the decision and execute the remaining legal path itself
- **AND** the clarification SHALL NOT become a general second-confirmation rule

#### Scenario: Human repair decision returns execution to the Agent
- **WHEN** the user clearly requests correction of a current research problem, the Agent maps it to `repair`, the decision is recorded, and an existing legal repair path supports the request
- **THEN** the Agent SHALL perform the remaining legal repair actions described by the rationale and rerun the HITL2 gate
- **AND** it SHALL NOT instruct the user to become the ordinary command runner or restart from instantiation solely because repair was selected

#### Scenario: HITL2 rerun follows deterministic rerun handoff
- **WHEN** the user clearly asks to continue researching a stated direction,
  the Agent maps it to `rerun`, the decision is recorded, and the HITL2 gate passes
- **AND** the shared `includeNextIncrement: true` rerun-availability result is supported and available
- **THEN** the gate result SHALL use the `rerun` outcome
- **AND** `check.next` SHALL be `phases/phase-rerun.md`
- **AND** the Agent SHALL consume that target through the accepted handoff path
- **AND** it SHALL NOT default the decision to readiness or require a second confirmation unless the concrete operation crosses a new real cost, permission, or irreversible-risk boundary

#### Scenario: HITL2 does not accept a known-impossible rerun
- **WHEN** the shared availability result is supported but the required next increment is unavailable
- **THEN** the decision brief SHALL NOT recommend or first record rerun as a current-bundle action
- **AND** HITL2 SHALL ask only whether to start a new bundle for the requested scope
- **AND** unsupported input SHALL expose its direct contract boundary without a new-bundle guess or copied numeric limit

#### Scenario: HITL2 proceed_to_readiness follows chain
- **WHEN** user clearly says the research is sufficient or accepts the proceed recommendation, the Agent records `proceed_to_readiness`, and the HITL2 gate passes
- **THEN** the gate result SHALL use the `passed` outcome and `check.next: phases/phase-readiness.md`
- **AND** the Agent SHALL advance through the accepted handoff path without asking the user to approve ordinary readiness/Final commands

#### Scenario: Context-dependent decisions do not gain fixed handoffs
- **WHEN** the recorded decision is `request_view_revision`, `repair`, or `stop_blocked`
- **THEN** the HITL2 gate SHALL NOT default `check.next` to readiness
- **AND** the Agent SHALL follow the decision-specific accepted behavior without inventing a chain edge

#### Scenario: Context-dependent decision without a path stays honest
- **WHEN** `request_view_revision`, `repair`, or `stop_blocked` is recorded but current direct facts expose no legal path for the requested action
- **THEN** while the accepted HITL2 interaction is current, the Agent SHALL report the smallest missing capability/path boundary
- **AND** it SHALL NOT claim completion, default to readiness, invent a chain edge, or hand-write status authority
- **AND** the decision brief SHALL NOT recommend that known-unavailable action as immediately executable

#### Scenario: Recommendation never substitutes for the user decision
- **WHEN** the decision brief recommends one action but the user chooses another accepted action
- **THEN** the Agent SHALL record the user's action rather than the recommendation
- **AND** Engine verdict and route SHALL derive from the recorded accepted decision and existing contracts

#### Scenario: Non-HITL message is not persisted as a HITL2 decision
- **WHEN** the user voluntarily sends a message while the accepted current node is a non-HITL `stop: no` phase
- **THEN** CDP-001 SHALL NOT authorize writing `human_decision_checkpoints.hitl2`, changing deterministic state, or selecting a HITL2 route from that message alone
- **AND** the message SHALL NOT create a third HITL checkpoint, pause state, permission, or mutation authority
