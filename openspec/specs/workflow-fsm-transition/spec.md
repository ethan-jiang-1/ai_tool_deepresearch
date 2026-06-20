> req: WFS-002

## Purpose

FSM transition layer。这里定义 `.fsm.json` 的加载、纯查表路由，以及低层 `FSM` tracker 的当前语义。它不负责 VM sandbox 注入，也不负责 Agent Flow 编排。

## Requirements

### Requirement: FSM definition SHALL be loadable and validatable

The system SHALL load a `.fsm.json` file that defines the workflow's states and transitions. The file SHALL contain a `name`, an `initial` state, and a `states` map where each key is a node name and each value specifies transition targets keyed by execution status string. The `initial` node SHALL exist in the `states` map. Transition targets SHALL be either a node name (string) or `null` (terminal state).

#### Scenario: Valid FSM definition loads successfully

- **WHEN** a valid `.fsm.json` is loaded via `loadFSM(path)`
- **THEN** the system returns a validated FSM definition object with `name`, `initial`, and `states`

#### Scenario: Missing initial state in states map is rejected

- **WHEN** a `.fsm.json` specifies an `initial` node that does not exist as a key in `states`
- **THEN** the system SHALL throw a validation error

#### Scenario: Null transition target marks terminal state

- **WHEN** a state's `on.<status>` value is `null`
- **THEN** the system SHALL interpret this as a terminal transition

### Requirement: resolveTransition SHALL return `{ next, found }`

The system SHALL look up `states[currentNode].on[status]` and return `{ next, found }`.

- If the target is a string node name, return `{ next: '<target>', found: true }`
- If the target is `null`, return `{ next: null, found: true }`
- If the currentNode or status has no matching entry, return `{ next: null, found: false }`

#### Scenario: Advance to next node on matching transition

- **WHEN** FSM defines `"wave-entry.md": { "on": { "success": "wave-audit.md" } }` and `resolveTransition(fsm, 'wave-entry.md', 'success')` is called
- **THEN** the result SHALL be `{ next: 'wave-audit.md', found: true }`

#### Scenario: Complete on null target

- **WHEN** FSM defines `"wave-final.md": { "on": { "success": null } }` and `resolveTransition(fsm, 'wave-final.md', 'success')` is called
- **THEN** the result SHALL be `{ next: null, found: true }`

#### Scenario: Halt on unknown status

- **WHEN** FSM defines `"wave-entry.md": { "on": { "success": "wave-audit.md" } }` and `resolveTransition(fsm, 'wave-entry.md', 'unknown_status')` is called
- **THEN** the result SHALL be `{ next: null, found: false }`

#### Scenario: Halt on unknown node

- **WHEN** `resolveTransition(fsm, 'nonexistent.md', 'success')` is called and `nonexistent.md` is not in FSM states
- **THEN** the result SHALL be `{ next: null, found: false }`

### Requirement: createFSM SHALL provide a low-level transition tracker

`createFSM(fsmPathOrDef, trace?)` SHALL accept either a path string (delegating to `loadFSM`) or a pre-loaded FSM definition. It SHALL return an `FSM` tracker with:

- `current` set to `fsm.initial`
- `next` tracking the most recent resolved next node
- `outcome` starting at `running`
- `receipts` and `iterations`
- `isComplete`
- `askNext(state)` to resolve the current node + status and record a transition receipt

`askNext(state)` SHALL:
- update `current` when the result has a non-null `next`
- set `outcome` to `complete` when `next === null`
- set `outcome` to `halted` when `found === false`

#### Scenario: Tracker advances through valid transitions

- **WHEN** `const f = createFSM(fsmDef); f.askNext('success')`
- **THEN** `f.current` SHALL update to the next node
- **AND** `f.receipts` SHALL append a transition receipt

#### Scenario: Tracker becomes complete on terminal transition

- **WHEN** `askNext(state)` resolves to `{ next: null, found: true }`
- **THEN** `outcome` SHALL become `complete`

#### Scenario: Tracker halts on unmatched transition

- **WHEN** `askNext(state)` resolves to `{ next: null, found: false }`
- **THEN** `outcome` SHALL become `halted`
