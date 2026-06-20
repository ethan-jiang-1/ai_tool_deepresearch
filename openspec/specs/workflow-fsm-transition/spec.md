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

### Requirement: createFSM SHALL provide a low-level transition tracker

`createFSM(fsmDef, trace?)` SHALL accept a pre-loaded validated FSM definition object. It SHALL return an `FSM` tracker with:

- `current` set to `fsm.initial`
- `next` tracking the most recent resolved next node
- `outcome` starting at `running`
- `receipts` and `iterations`
- `isComplete`
- `advance(outcome)` to resolve the current node + public outcome and record a transition receipt

`advance(outcome)` SHALL:
- update `current` when the result has a non-null `next`
- set `outcome` to `complete` when `next === null`
- set `outcome` to `halted` when `found === false`

#### Scenario: Tracker advances through valid transitions

- **WHEN** `const f = createFSM(fsmDef); f.advance('passed')`
- **THEN** `f.current` SHALL update to the next node
- **AND** `f.receipts` SHALL append a transition receipt

#### Scenario: Tracker becomes complete on terminal transition

- **WHEN** `advance(outcome)` resolves to `{ next: null, found: true }`
- **THEN** `outcome` SHALL become `complete`

#### Scenario: Tracker halts on unmatched transition

- **WHEN** `advance(outcome)` resolves to `{ next: null, found: false }`
- **THEN** `outcome` SHALL become `halted`

### Requirement: Node-keyed FSM transition lookup

The system SHALL look up `states[currentNodeRef].on[outcome]` and return `{ next, found }` by exact lookup in the FSM transition table.

- If the target is a string node file reference, return `{ next: '<target>', found: true }`
- If the target is `null`, return `{ next: null, found: true }`
- If the current node or outcome has no matching entry, return `{ next: null, found: false }`

#### Scenario: Advance to next node on matching transition

- **WHEN** FSM defines `"phases/phase-wave0.md": { "on": { "passed": "phases/phase-wave1.md" } }` and `resolveTransition(fsm, 'phases/phase-wave0.md', 'passed')` is called
- **THEN** the result SHALL be `{ next: 'phases/phase-wave1.md', found: true }`

#### Scenario: Complete on null target

- **WHEN** FSM defines `"phases/phase-final.md": { "on": { "passed": null } }` and `resolveTransition(fsm, 'phases/phase-final.md', 'passed')` is called
- **THEN** the result SHALL be `{ next: null, found: true }`

#### Scenario: Halt on unknown outcome

- **WHEN** FSM defines `"phases/phase-wave0.md": { "on": { "passed": "phases/phase-wave1.md" } }` and `resolveTransition(fsm, 'phases/phase-wave0.md', 'failed')` is called
- **THEN** the result SHALL be `{ next: null, found: false }`

#### Scenario: Halt on unknown node

- **WHEN** `resolveTransition(fsm, 'nonexistent.md', 'passed')` is called and `nonexistent.md` is not in FSM states
- **THEN** the result SHALL be `{ next: null, found: false }`

