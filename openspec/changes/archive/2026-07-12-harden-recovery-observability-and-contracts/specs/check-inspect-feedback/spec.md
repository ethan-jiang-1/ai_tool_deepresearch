> req: CHI-003

## ADDED Requirements

### Requirement: Recovery advice SHALL identify one reachable nearest legal action

When a recovery or reentry check/inspect surface recommends a deterministic gate, phase-entry, or same-surface repair action whose legality can be evaluated from current bundle state, it SHALL construct a structured action and assess the action through existing transition, handoff, status-window, or command-contract helpers before rendering Agent-facing advice. This requirement SHALL NOT create a generic repair CLI; a same-surface repair action is eligible only when an existing sanctioned contract already defines it.

For each independent root finding, if the action is reachable, primary advice SHALL name one nearest legal action. If the action is known to be rejected by the same current preflight or no sanctioned runtime capability exists, advice for that root SHALL report the missing contract or direct blocker and SHALL NOT recommend a circular predecessor/entry command. The Engine SHALL NOT choose one global semantic repair strategy across independent roots or parse arbitrary prose advice.

#### Scenario: Reachable repair action is recommended

- **WHEN** a deterministic same-check repair action satisfies its current preconditions
- **THEN** primary advice for that root finding SHALL identify the action as its nearest legal action
- **AND** it SHALL not include competing recovery routes for the same root

#### Scenario: Circular predecessor advice is suppressed

- **WHEN** a proposed predecessor gate or phase-entry command would be rejected by the current handoff/status preflight
- **THEN** advice SHALL not render that command as an available repair
- **AND** it SHALL report the direct missing runtime contract or blocking boundary

#### Scenario: Semantic repair remains Agent-owned

- **WHEN** the Engine can identify a blocker but cannot deterministically select the semantic correction
- **THEN** it SHALL report the blocker and affected surface
- **AND** it SHALL NOT invent a multi-step semantic recovery plan
