# Gate State Machine
> req: GAS-001

## Purpose

JavaScript Gate 是 deterministic checkpoint。Gate 检查状态并返回 check/inspect/advice 风格反馈；transition table 查询可以提供 next node reference，但 Gate 不加载 Markdown node，也不拥有 Agent Flow。

## Requirements

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
