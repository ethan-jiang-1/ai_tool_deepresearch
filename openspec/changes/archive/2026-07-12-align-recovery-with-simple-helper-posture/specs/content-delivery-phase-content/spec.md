> req: CDP-001

## MODIFIED Requirements

### Requirement: Phase HITL2 body completeness

`phase-hitl2.md` SHALL contain a complete 9-section body following the standard phase node structure. The node SHALL declare `phase: hitl2`, `gate: hitl2-recorded`, and `stop: "yes"`. Routing SHALL come from `transitions.chain.json` and the HITL2 gate result rather than a second frontmatter `next` authority.

The phase SHALL produce a decision brief summarizing research findings, open questions, and recommended actions. It SHALL present structured decision options to the user and record the user's structured decision to `rb_profile.yaml` under `human_decision_checkpoints.hitl2` before acting on that decision.

The allowed decision enum values SHALL be: `proceed_to_readiness`, `request_view_revision`, `repair`, `rerun`, `stop_blocked`.

The phase SHALL record a `hitl2_recorded` trace event. This event is diagnostic/audit evidence of the Phase Agent's recording action; it SHALL NOT become a second blocking substitute for the profile decision fields or the gate CLI's own `gate_attempt` event.

After gate pass, the Agent SHALL read `user_decision` from `rb_profile.yaml` and act accordingly:

- `proceed_to_readiness`: the gate CLI SHALL use the deterministic `passed` outcome; the Agent SHALL consume `check.next` for `phases/phase-readiness.md` through the accepted handoff path.
- `rerun`: the gate CLI SHALL use the deterministic `rerun` outcome; the Agent SHALL consume `check.next` for `phases/phase-rerun.md` through the accepted handoff path.
- `request_view_revision`: the Agent SHALL use the recorded rationale and current bundle state to determine the affected phase; this context-dependent action SHALL NOT default to readiness or gain a fixed chain entry.
- `repair`: the Agent SHALL use the recorded rationale to repair the current run through existing legal paths and rerun the HITL2 gate; it SHALL NOT restart from instantiation merely because the user chose repair.
- `stop_blocked`: the Agent SHALL terminate the lifecycle through the existing accepted stop behavior and preserve the reason.

`Human-directed` in this phase SHALL identify the source of the semantic decision. It SHALL NOT transfer ordinary command execution to the user or create permission by itself: after the decision is recorded, the Agent executes the remaining mechanical actions allowed by current host permission and accepted Engine paths. The Agent SHALL NOT invent a route, mutate deterministic authority by hand, or claim that the decision itself creates an unavailable override/reentry capability.

`transitions.chain.json` SHALL encode only HITL2 outcomes with fixed, context-independent next nodes: `passed` to `phases/phase-readiness.md` and `rerun` to `phases/phase-rerun.md`. `request_view_revision`, `repair`, and `stop_blocked` remain Agent-level decisions without fixed chain entries.

#### Scenario: HITL2 frontmatter contract

- **WHEN** `phase-hitl2.md` is loaded
- **THEN** its frontmatter SHALL contain `node_type: phase`, `id: phase-hitl2`, `phase: hitl2`, `gate: hitl2-recorded`, `stop: "yes"`
- **AND** `requires` SHALL include at least `shared/shared-profile`
- **AND** the phase SHALL NOT establish a competing frontmatter routing authority

#### Scenario: HITL2 decision brief production

- **WHEN** Agent executes the HITL2 phase
- **THEN** Agent SHALL produce a decision brief artifact at `artifacts/hitl2/decision-brief.md`
- **AND** the brief SHALL summarize research findings from wave artifacts
- **AND** the brief SHALL present structured decision options to the user

#### Scenario: HITL2 user decision recorded to profile

- **WHEN** user provides a structured decision
- **THEN** Agent SHALL write the decision to `rb_profile.yaml` under `human_decision_checkpoints.hitl2`
- **AND** the `status` field SHALL be set to `recorded`
- **AND** the `user_decision` field SHALL be one of the five accepted enum values
- **AND** the decision SHALL NOT remain only in chat memory

#### Scenario: HITL2 stop behavior

- **WHEN** Agent reaches the stop point after producing the decision brief
- **THEN** Agent SHALL pause and wait for user input
- **AND** Agent SHALL NOT advance past the gate without the user providing a structured decision

#### Scenario: Human repair decision returns execution to the Agent

- **WHEN** the user chooses `repair` and the decision is recorded
- **THEN** the Agent SHALL perform the remaining legal repair actions described by the rationale
- **AND** it SHALL rerun the HITL2 gate after repair
- **AND** it SHALL NOT instruct the user to become the ordinary command runner
- **AND** it SHALL NOT restart the lifecycle from instantiation solely because repair was selected

#### Scenario: HITL2 rerun follows deterministic rerun handoff

- **WHEN** the user chooses `rerun`, the decision is recorded, and the HITL2 gate passes
- **THEN** the gate result SHALL use the `rerun` outcome
- **AND** `check.next` SHALL be `phases/phase-rerun.md`
- **AND** the Agent SHALL consume that target through the accepted handoff path
- **AND** it SHALL NOT default the decision to readiness

#### Scenario: HITL2 proceed_to_readiness follows chain

- **WHEN** user chooses `proceed_to_readiness` and the HITL2 gate passes
- **THEN** the gate result SHALL use the `passed` outcome
- **AND** `check.next` SHALL be `phases/phase-readiness.md`
- **AND** the Agent SHALL advance through the accepted handoff path

#### Scenario: Context-dependent decisions do not gain fixed handoffs

- **WHEN** the recorded decision is `request_view_revision`, `repair`, or `stop_blocked`
- **THEN** the HITL2 gate SHALL NOT default `check.next` to readiness
- **AND** the Agent SHALL follow the decision-specific accepted behavior without inventing a chain edge
