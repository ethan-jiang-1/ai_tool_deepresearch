# Gate State Machine
> req: GAS-001

## Purpose

JavaScript Gate 是 deterministic checkpoint。Gate 检查状态并返回 check/inspect/advice 风格反馈；transition table 查询可以提供 next node reference，但 Gate 不加载 Markdown node，也不拥有 Agent Flow。
## Requirements
### Requirement: Gate evaluates state and returns checkpoint feedback

The Gate SHALL inspect the current workflow state and current node reference and return deterministic checkpoint feedback containing whether the gate passed. Gate output MAY include inspect/advice fields, a detailed `routing` result, and a `next` value supplied by detailed transition routing. The Gate SHALL NOT load workflow nodes or choose semantic repair strategy. It SHALL preserve routing diagnostics even when the router returns `no_transition`, `invalid_input`, or `config_error`.

#### Scenario: Gate passes

- **WHEN** state meets all gate criteria for the current node reference
- **THEN** the gate returns a passed check result
- **AND** any next node reference in the response SHALL come from detailed transition-table routing, not from Gate-owned flow control

#### Scenario: Gate fails with repairable error

- **WHEN** state has a gap that can be fixed, such as a missing reference count below floor
- **THEN** the gate returns a failed check result with inspect/advice feedback
- **AND** Markdown/Agent reads the feedback and decides the repair action

### Requirement: Gate transition lookup uses explicit transition table

The gate transition lookup SHALL use the detailed node-result router contract `resolveNodeTransitionDetailed(transitionsPath, currentNodeRef, outcome, context)`, not implicit if/else chains, prose-based routing, gate-key routing, or a Gate-owned workflow router.

#### Scenario: Transition table is inspectable

- **WHEN** a developer reads the detailed router and the transition table
- **THEN** the mapping from current node reference + public outcome to next node reference is visible as data or pure table lookup

#### Scenario: Route diagnostics are preserved

- **WHEN** a gate response is serialized to JSON
- **THEN** the response MUST preserve detailed routing diagnostics, not only `check.next`
- **AND** `check.next` MAY mirror the detailed routing result when a next node exists

#### Scenario: Gate does not load next node

- **WHEN** a gate response contains `check.next`
- **THEN** the value SHALL be a node reference for Markdown/Agent to consume
- **AND** the Gate itself SHALL NOT call the Markdown node loader to advance Agent Flow

#### Scenario: Gate preserves routing diagnostics on error

- **WHEN** the detailed router returns `no_transition`, `invalid_input`, or `config_error`
- **THEN** the gate response SHALL preserve the detailed `routing` object
- **AND** the Gate SHALL NOT synthesize a fake next node

