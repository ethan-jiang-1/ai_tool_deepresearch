# Workflow FSM Definition
> req: WFS-001

## Purpose

FSM 定义文件 (.fsm.json) 的加载与校验。定义工作流的状态节点和转移规则，由 Zod schema 校验结构合法性，是 workflow-fsm Engine 的入口。

## Requirements

### Requirement: FSM definition file SHALL be loadable and validatable

The system SHALL load a `.fsm.json` file that defines the workflow's states and transitions. The file SHALL contain a `name`, an `initial` state, and a `states` map where each key is a node name and each value specifies transition targets keyed by execution status string. The `initial` node SHALL exist in the `states` map. Transition targets SHALL be either a node name (string) or `null` (terminal state).

#### Scenario: Valid FSM definition loads successfully

- **WHEN** a valid `.fsm.json` is loaded via `loadFSM(path)`
- **THEN** the system returns a validated FSM definition object with `name`, `initial`, and `states`

#### Scenario: Missing initial state in states map is rejected

- **WHEN** a `.fsm.json` specifies an `initial` node that does not exist as a key in `states`
- **THEN** the system SHALL throw a validation error

#### Scenario: Empty states map is rejected

- **WHEN** a `.fsm.json` has an empty `states` object
- **THEN** the system SHALL throw a validation error

#### Scenario: Null transition target marks terminal state

- **WHEN** a state's `on.<status>` value is `null`
- **THEN** the system SHALL interpret this as a terminal transition (workflow complete)

### Requirement: FSM load SHALL NOT pre-read any node MD files

The `loadFSM()` function SHALL only read and validate the FSM definition file. It SHALL NOT read any of the MD files referenced as node names in the `states` map.

#### Scenario: FSM load does not touch MD files

- **WHEN** `loadFSM()` is called with a valid FSM definition
- **THEN** no MD files are read, no file_read receipts are generated
