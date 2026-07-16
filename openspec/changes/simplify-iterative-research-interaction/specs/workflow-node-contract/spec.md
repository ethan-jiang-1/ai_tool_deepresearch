> req: WNC-008

## MODIFIED Requirements

### Requirement: Autonomous contract header injection for lifecycle stop:no phases

Autonomous contract header injection SHALL apply only to manifest lifecycle phases with `stop: "no"`. Work-unit sub-agent task guidance and other non-lifecycle task surfaces SHALL NOT receive lifecycle autonomous or terminal-delivery headers solely because their frontmatter resembles a phase node.

For non-terminal lifecycle `stop: no` phases, the injected header SHALL express the accepted silent-execution semantics at the immediate Agent control surface:

- the Agent/framework SHALL NOT initiate user-facing questions, confirmations, progress reports, partial delivery, acknowledgements, idle reports, or continuation requests;
- the Agent SHALL continue node work, repair, strategy change, legal handoff consumption, or silent holding from direct runtime facts;
- a user-initiated message already received through the normal conversation boundary SHALL be answered, but the answer SHALL NOT create a third HITL, permission, mutation/reentry authority, pause/interrupt lifecycle, or durable mid-run intent;
- the header SHALL NOT state that the user is unavailable, prohibit every possible reply, or make Engine header injection responsible for reading/classifying chat state.

Terminal Final SHALL continue to receive its separate terminal-delivery header rather than the non-terminal autonomous header. The terminal header SHALL preserve `terminal_delivery` / `deliver_final_artifacts`, prohibit framework-initiated question/wait/progress/confirmation/repair loops, and align with CDP-004 by not treating a factual answer to an already-current user-initiated turn as a new Final loop or authority. Header injection SHALL remain an Agent-facing guidance projection, not lifecycle, interaction, routing, or permission authority.

#### Scenario: work-unit sub-agent guidance does not receive lifecycle header

- **WHEN** `assessNode()` loads work-unit sub-agent task guidance
- **THEN** it SHALL NOT inject the lifecycle autonomous header unless the file is a manifest lifecycle phase

#### Scenario: autonomous header prohibits initiation rather than every reply

- **WHEN** `assessNode()` loads a non-terminal manifest lifecycle phase with `stop: "no"`
- **THEN** the injected header SHALL prohibit framework-initiated user-facing surfacing and direct autonomous continuation
- **AND** it SHALL allow a normal response to an already received user-initiated conversation turn without changing lifecycle authority
- **AND** it SHALL NOT claim that the user is unavailable or create chat-interception state

#### Scenario: Final keeps terminal delivery header

- **WHEN** `assessNode()` loads terminal Final with `stop: "no"` and `gate: null`
- **THEN** it SHALL inject the terminal-delivery header rather than the non-terminal autonomous header
- **AND** Final SHALL remain delivery, not a third decision interaction point
- **AND** the header SHALL NOT forbid a verified-fact answer to an already-current user turn or change the terminal continuation cue
