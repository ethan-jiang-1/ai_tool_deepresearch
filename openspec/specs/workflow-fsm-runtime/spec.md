> req: WFS-003

## Purpose

FSM 运行时核心：`Machine` 类提供声明式状态机实例，`resolveTransition` 做纯查表路由，`createMachine` 工厂从 `.fsm.json` 文件创建实例。`workflow-fsm.mjs` 只负责确定性状态推进，不负责 VM sandbox 或 MD 执行。

## Requirements

### Requirement: Machine SHALL hold current state and advance via transition table lookup

The `Machine` class SHALL maintain a `current` property tracking the active node name. `advance(status)` SHALL call `resolveTransition()` to look up the next node from the FSM transition table and update `current` only when a non-null next node is found. On unmatched status it SHALL halt instead of throwing.

The Machine SHALL expose:

- `outcome` - `running`, `complete`, or `halted`
- `haltReason` - descriptive reason when halted
- `receipts` - transition receipts
- `iterations` - transition attempts
- `lastTransition` - most recent `{ next, found }` result
- `canAdvance`, `isComplete`, `isHalted`

#### Scenario: Machine advances to next node on valid transition

- **WHEN** `machine.advance('success')` is called and the FSM maps current node + `success` to `'next_node.md'`
- **THEN** `machine.current` SHALL be updated to `'next_node.md'`
- **AND** `machine.advance()` SHALL return `'running'`

#### Scenario: Machine completes on terminal transition

- **WHEN** `machine.advance('success')` is called and the FSM maps current node + `success` to `null`
- **THEN** `machine.outcome` SHALL become `'complete'`
- **AND** `machine.isComplete` SHALL be `true`

#### Scenario: Machine halts on unmatched status

- **WHEN** `machine.advance('unknown_status')` is called and the FSM has no entry for current node + that status
- **THEN** the Machine SHALL set `outcome` to `'halted'`
- **AND** set `haltReason` to a descriptive message

#### Scenario: Machine stops advancing after completion

- **WHEN** `machine.advance()` is called after `outcome` is already `'complete'`
- **THEN** the Machine SHALL return `'complete'` and leave `iterations` unchanged

### Requirement: resolveTransition SHALL perform pure table lookup

`resolveTransition(fsm, currentNode, status)` SHALL return `{ next, found }` by exact lookup in the FSM transition table. It SHALL NOT execute any code, read MD files, or mutate state. It is a pure function.

#### Scenario: Exact match returns next node

- **WHEN** `resolveTransition(fsm, 'entry.md', 'success')` is called and the table has `["entry.md", "success"] -> "wave0.md"`
- **THEN** it returns `{ next: 'wave0.md', found: true }`

#### Scenario: No match returns found=false

- **WHEN** no transition is defined for the given node + status pair
- **THEN** `resolveTransition()` returns `{ next: null, found: false }`

### Requirement: FSMDefinition SHALL validate the FSM JSON schema

`FSMDefinition` is a Zod schema that validates `.fsm.json` files. It SHALL require `name` (string), `initial` (string), and `states` (record of node-name keys to `{ on: { ... } }` mappings). The `initial` node SHALL exist in the `states` map.

#### Scenario: Valid FSM JSON passes validation

- **WHEN** a `.fsm.json` file has valid `name`, `initial`, and `states` fields
- **THEN** `FSMDefinition.safeParse()` succeeds

#### Scenario: Invalid FSM JSON is rejected

- **WHEN** a `.fsm.json` file is missing `initial` or has malformed `states`
- **THEN** `FSMDefinition.safeParse()` fails with a Zod error

### Requirement: loadFSM SHALL read and validate an FSM definition from disk

`loadFSM(fsmPath)` SHALL read a `.fsm.json` file, parse it, validate against `FSMDefinition`, and return the validated definition. On parse or validation failure it SHALL throw.

#### Scenario: Valid FSM file loads successfully

- **WHEN** `loadFSM('path/to/definition.fsm.json')` is called on a valid file
- **THEN** it returns the validated FSM definition object

#### Scenario: Invalid FSM file throws

- **WHEN** the file content fails `FSMDefinition` validation
- **THEN** `loadFSM()` throws an error with the validation details

### Requirement: createMachine SHALL be the declarative factory for Machine instances

`createMachine(fsmPathOrDef, trace?)` SHALL accept either a path string (delegating to `loadFSM`) or a pre-loaded FSM definition. An optional `trace` instance MAY be stored for lifecycle event logging. It SHALL return a `Machine` instance with `current` set to `fsm.initial`.

#### Scenario: createMachine from path

- **WHEN** `createMachine('path/to/definition.fsm.json')` is called
- **THEN** it returns a Machine with `current === fsm.initial`

#### Scenario: createMachine with trace instance

- **WHEN** `createMachine(fsmPath, trace)` is called with a trace from `createTrace()`
- **THEN** the Machine stores the trace and MAY emit lifecycle events through it
