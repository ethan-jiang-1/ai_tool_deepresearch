# Workflow FSM Transition
> req: WFS-002

## Purpose

FSM 转移机制。MD 节点代码块通过 `transition()` 上报执行结果，Engine 通过 `resolveTransition()` 查 FSM 表裁决下一步：advance / complete / halt。

## Requirements

### Requirement: transition() SHALL be injectable into VM sandbox

The system SHALL inject a `transition(currentNode, status)` function into the `node:vm` sandbox used to execute MD code blocks. This function SHALL accept a node name and an execution status string, perform an FSM lookup, write a receipt, and return the transition result.

#### Scenario: transition function is callable from MD code block

- **WHEN** an MD code block calls `transition('wave-entry.md', 'success')`
- **THEN** the function SHALL execute without throwing and return a result object

#### Scenario: transition writes a receipt

- **WHEN** `transition(currentNode, status)` is called
- **THEN** a `transition` type receipt SHALL be appended to `runtime.receipts` containing `currentNode` and `status`

### Requirement: resolveTransition SHALL determine the next action from FSM

The system SHALL look up the FSM's `states[currentNode].on[status]` to determine the next action:

- If the target is a string node name, return `{ action: 'advance', next: '<target>' }`
- If the target is `null`, return `{ action: 'complete' }`
- If the currentNode or status has no matching entry, return `{ action: 'halt', reason: '...' }`

#### Scenario: Advance to next node on matching transition

- **WHEN** FSM defines `"wave-entry.md": { "on": { "success": "wave-audit.md" } }` and `resolveTransition(fsm, 'wave-entry.md', 'success')` is called
- **THEN** the result SHALL be `{ action: 'advance', next: 'wave-audit.md' }`

#### Scenario: Complete on null target

- **WHEN** FSM defines `"wave-final.md": { "on": { "success": null } }` and `resolveTransition(fsm, 'wave-final.md', 'success')` is called
- **THEN** the result SHALL be `{ action: 'complete' }`

#### Scenario: Halt on unknown status

- **WHEN** FSM defines `"wave-entry.md": { "on": { "success": "wave-audit.md" } }` and `resolveTransition(fsm, 'wave-entry.md', 'unknown_status')` is called
- **THEN** the result SHALL be `{ action: 'halt', reason: '<descriptive message>' }`

#### Scenario: Halt on unknown node

- **WHEN** `resolveTransition(fsm, 'nonexistent.md', 'success')` is called and `nonexistent.md` is not in FSM states
- **THEN** the result SHALL be `{ action: 'halt', reason: '<descriptive message>' }`

### Requirement: transition result SHALL be accessible to the Engine after VM execution

After the VM code block completes, the Engine SHALL be able to read the transition result (currentNode, status, action, next) to drive the workflow loop.

#### Scenario: Engine reads transition result after code block execution

- **WHEN** a code block calls `transition('node.md', 'success')` and the VM exits
- **THEN** the Engine SHALL read `{ currentNode: 'node.md', status: 'success', action: 'advance', next: '...' }` from the sandbox
