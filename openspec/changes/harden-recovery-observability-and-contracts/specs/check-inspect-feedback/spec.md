> req: CHI-003

## ADDED Requirements

### Requirement: Deterministic advice SHALL identify one reachable nearest legal action

When an Engine check or inspect surface recommends a deterministic gate, phase-entry, or repair command whose legality can be evaluated from current bundle state, it SHALL construct a structured action and assess the action through existing transition, handoff, status-window, or command-contract helpers before rendering Agent-facing advice.

If the action is reachable, primary advice SHALL name one nearest legal action. If the action is known to be rejected by the same current preflight or no sanctioned runtime capability exists, advice SHALL report the missing contract or direct blocker and SHALL NOT recommend a circular predecessor/entry command. This requirement SHALL NOT make the Engine choose semantic repair strategy or parse arbitrary prose advice.

#### Scenario: Reachable repair is recommended

- **WHEN** a deterministic same-check repair command satisfies its current preconditions
- **THEN** primary advice SHALL identify that command as the nearest legal action
- **AND** it SHALL not include competing recovery routes

#### Scenario: Circular predecessor advice is suppressed

- **WHEN** a proposed predecessor gate or phase-entry command would be rejected by the current handoff/status preflight
- **THEN** advice SHALL not render that command as an available repair
- **AND** it SHALL report the direct missing runtime contract or blocking boundary

#### Scenario: Semantic repair remains Agent-owned

- **WHEN** the Engine can identify a blocker but cannot deterministically select the semantic correction
- **THEN** it SHALL report the blocker and affected surface
- **AND** it SHALL NOT invent a multi-step semantic recovery plan
