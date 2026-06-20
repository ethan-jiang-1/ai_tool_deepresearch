> req: WFS-003, TRT-005

## Purpose

FSM 运行时核心：`Machine` 类提供声明式状态机实例，`createMachine` 工厂从已验证的 FSM 定义或 `.fsm.json` 文件创建实例。`workflow-fsm.mjs` 只负责确定性状态推进，不负责 schema 载入、VM sandbox 或 MD 执行。`loadFSM` 属于 `workflow-fsm-definition`，`resolveTransition` 属于 `workflow-fsm-transition`.

## Requirements

### Requirement: Machine SHALL hold current state and advance via transition table lookup

The `Machine` class SHALL maintain a `current` property tracking the active node file reference. `advance(outcome)` SHALL call `resolveTransition()` to look up the next node from the FSM transition table and update `current` only when a non-null next node is found. On unmatched outcome it SHALL halt instead of throwing.

The Machine SHALL expose:

- `outcome` - `running`, `complete`, or `halted`
- `haltReason` - descriptive reason when halted
- `receipts` - transition receipts
- `iterations` - transition attempts
- `lastTransition` - most recent `{ next, found }` result
- `canAdvance`, `isComplete`, `isHalted`

#### Scenario: Machine advances to next node on valid transition

- **WHEN** `machine.advance('passed')` is called and the FSM maps current node + `passed` to `'next_node.md'`
- **THEN** `machine.current` SHALL be updated to `'next_node.md'`
- **AND** `machine.advance()` SHALL return `'running'`

#### Scenario: Machine completes on terminal transition

- **WHEN** `machine.advance('passed')` is called and the FSM maps current node + `passed` to `null`
- **THEN** `machine.outcome` SHALL become `'complete'`
- **AND** `machine.isComplete` SHALL be `true`

#### Scenario: Machine halts on unmatched outcome

- **WHEN** `machine.advance('failed')` is called and the FSM has no entry for current node + that outcome
- **THEN** the Machine SHALL set `outcome` to `'halted'`
- **AND** set `haltReason` to a descriptive message

#### Scenario: Machine stops advancing after completion

- **WHEN** `machine.advance()` is called after `outcome` is already `'complete'`
- **THEN** the Machine SHALL return `'complete'` and leave `iterations` unchanged

### Requirement: createMachine SHALL be the declarative factory for Machine instances

`createMachine(fsmPathOrDef, trace?)` SHALL accept either a path string (delegating to `loadFSM` from `workflow-fsm-definition`) or a pre-loaded validated FSM definition. An optional `trace` instance MAY be stored for lifecycle event logging. It SHALL return a `Machine` instance with `current` set to `fsm.initial`.

#### Scenario: createMachine from path

- **WHEN** `createMachine('path/to/definition.fsm.json')` is called
- **THEN** it returns a Machine with `current === fsm.initial`

#### Scenario: createMachine with trace instance

- **WHEN** `createMachine(fsmPath, trace)` is called with a trace from `createTrace()`
- **THEN** the Machine stores the trace and MAY emit lifecycle events through it
