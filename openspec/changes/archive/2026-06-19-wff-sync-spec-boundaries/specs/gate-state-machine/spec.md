## RENAMED Requirements

- FROM: `### Requirement: Gate evaluates state and returns a routing decision`
- TO: `### Requirement: Gate evaluates state and returns checkpoint feedback`

- FROM: `### Requirement: Gate router uses explicit transition table`
- TO: `### Requirement: Gate transition lookup uses explicit transition table`

## MODIFIED Requirements

### Requirement: Gate evaluates state and returns checkpoint feedback

The Gate SHALL inspect the current workflow state and return deterministic checkpoint feedback containing whether the gate passed. Gate output MAY include inspect/advice fields and a `next` value supplied by a transition table lookup. The Gate SHALL NOT load workflow nodes or choose semantic repair strategy.

#### Scenario: Gate passes

- **WHEN** state meets all gate criteria
- **THEN** the gate returns a passed check result
- **AND** any next node reference in the response SHALL come from transition-table lookup, not from Gate-owned flow control

#### Scenario: Gate fails with repairable error

- **WHEN** state has a gap that can be fixed, such as missing reference count below floor
- **THEN** the gate returns a failed check result with inspect/advice feedback
- **AND** Markdown/Agent reads the feedback and decides the repair action

### Requirement: Gate transition lookup uses explicit transition table

The gate transition lookup SHALL use an explicit transition table through the accepted `askNext(path, gate, state)` interface, not implicit if/else chains, prose-based routing, or a Gate-owned workflow router.

#### Scenario: Transition table is inspectable

- **WHEN** a developer reads the transition table and `askNext()` implementation
- **THEN** the mapping from gate result state to next node reference is visible as data or pure table lookup

#### Scenario: Gate does not load next node

- **WHEN** a gate response contains `check.next`
- **THEN** the value SHALL be a node reference for Markdown/Agent to consume
- **AND** the Gate itself SHALL NOT call the Markdown node loader to advance Agent Flow
