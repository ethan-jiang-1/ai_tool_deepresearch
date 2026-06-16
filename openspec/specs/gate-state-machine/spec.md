# Gate State Machine
> req: GAS-001

JavaScript 实现 Gate 条件路由。Gate 检查状态，返回 pass/fail/needs_repair，路由到不同 workflow 段。

## ADDED Requirements

### Requirement: Gate evaluates state and returns a routing decision
The Gate SHALL inspect the current workflow state and return exactly one of `pass`, `fail`, or `needs_repair`.

#### Scenario: Gate passes
- **WHEN** state meets all gate criteria
- **THEN** the gate returns `pass` and the router loads the next workflow segment

#### Scenario: Gate fails with repairable error
- **WHEN** state has a gap that can be fixed (e.g., missing reference count below floor)
- **THEN** the gate returns `fail` and routes to the repair segment

#### Scenario: Gate needs repair
- **WHEN** state has a structural issue requiring substantive repair (e.g., invalid topic topology)
- **THEN** the gate returns `needs_repair` and routes to the repair segment

### Requirement: Gate router uses explicit transition table
The gate router SHALL use an explicit Map-based transition table, not implicit if/else chains or prose-based routing.

#### Scenario: Transition table is inspectable
- **WHEN** a developer reads the gate router code
- **THEN** the mapping from gate result to next step is visible in a single data structure
