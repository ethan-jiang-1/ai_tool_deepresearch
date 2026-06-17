# Workflow FSM Runtime
> req: WFS-003

## Purpose

FSM 运行时：节点加载、依赖解析、VM 沙箱执行、runFSM 循环、Machine 声明式 API。是 workflow-fsm 的核心执行引擎。

## Requirements

### Requirement: loadAndExecuteNode SHALL load dependencies and execute a node atomically

The system SHALL provide a `loadAndExecuteNode(nodeRef, state, runtime)` function that serves as the single entry point for loading and executing an FSM node. It SHALL resolve the node's dependency closure via `resolveDependencyClosure()`, execute all dependency MD files first in dependency-priority order, then execute the target node. Only the target node's `transition()` result SHALL be captured and returned; dependency nodes' transition calls SHALL be silently ignored. On success it SHALL return `{ state, status }` where status is the execution status string from the target node's `transition()` call. On dependency resolution or execution failure it SHALL return `{ state, status: null, error }`.

#### Scenario: Target node's transition status is captured

- **WHEN** `loadAndExecuteNode('entry.md', state, runtime)` is called and `entry.md`'s code block calls `transition('entry.md', 'success')`
- **THEN** the return value SHALL be `{ state: <new state>, status: 'success' }`

#### Scenario: Dependency transition calls are ignored

- **WHEN** `entry.md` requires `context.md`, and `context.md`'s code block calls `transition('context.md', 'success')`
- **THEN** `context.md`'s transition SHALL be silently discarded, and only `entry.md`'s transition status SHALL be returned

#### Scenario: Dependency resolution failure returns error

- **WHEN** `loadAndExecuteNode('entry.md', state, runtime)` is called and `entry.md` requires a nonexistent file
- **THEN** the return value SHALL be `{ state, status: null, error: '<descriptive error>' }`

#### Scenario: Receipts record node lifecycle

- **WHEN** `loadAndExecuteNode` is called
- **THEN** a `node_start` receipt SHALL be written before dependency resolution, a `dependency_resolved` receipt after plan generation, and a `node_complete` receipt after execution with the reported status

### Requirement: runFSM SHALL execute the complete workflow from initial state

The system SHALL provide a `runFSM(fsm, state, runtime, maxIterations = 100)` function that executes the workflow from `fsm.initial` through a loop of node execution and transition resolution until a terminal condition is reached. An optional `maxIterations` parameter SHALL guard against infinite self-loop cycles, defaulting to 100.

#### Scenario: Simple linear chain completes successfully

- **WHEN** a 3-node linear FSM (A→B→C→null) is run via `runFSM()`
- **THEN** all three nodes SHALL be executed in order and the outcome SHALL be `complete`

#### Scenario: Self-loop retry on error then success

- **WHEN** an FSM node has `"error": "<self>"` and returns `error` on the first execution but `success` on retry
- **THEN** the node SHALL execute twice, and the workflow SHALL advance to the next node after the successful retry

#### Scenario: Halt on unmatched status

- **WHEN** a node calls `transition(currentNode, status)` with a status not defined in the FSM for that node
- **THEN** `runFSM()` SHALL return `{ outcome: 'halted', reason: '...' }`

#### Scenario: Halt when maxIterations exceeded

- **WHEN** a node's self-loop causes the iteration count to reach `maxIterations`
- **THEN** `runFSM()` SHALL return `{ outcome: 'halted', reason: '<exceeded message>', iterations: <maxIterations> }`

### Requirement: runtime.currentState SHALL track the current FSM state

The runtime object SHALL maintain a `currentState` field that starts at `fsm.initial` and is updated on each successful advance.

#### Scenario: currentState advances after successful transition

- **WHEN** node A completes with `success` and FSM maps to node B
- **THEN** `runtime.currentState` SHALL be updated to `'B.md'`

#### Scenario: currentState unchanged after error with retry

- **WHEN** node A completes with `error` and FSM maps back to node A
- **THEN** `runtime.currentState` SHALL remain `'A.md'`

### Requirement: Node execution SHALL resolve dependencies before executing the node

Before executing a node's code block, the system SHALL resolve its dependency closure via `resolveDependencyClosure()` and execute all dependency MD files first, in dependency-priority order. This behavior SHALL be identical to workflow-next.

#### Scenario: Dependencies execute before the requested node

- **WHEN** node `entry.md` requires `context.md` which requires `policy.md`
- **THEN** execution order SHALL be `policy.md, context.md, entry.md`

#### Scenario: Missing dependency halts the workflow

- **WHEN** a node requires a dependency that does not exist on disk
- **THEN** the system SHALL return an error and `runFSM()` SHALL halt

#### Scenario: Circular dependency halts the workflow

- **WHEN** node A requires B and B requires A
- **THEN** the system SHALL detect the cycle and `runFSM()` SHALL halt

### Requirement: Content cache and execution SHALL be separated

The system SHALL cache MD content and frontmatter on first read (recording `file_read` receipt) and return cached content on subsequent reads (recording `cache_hit` receipt). However, each reference to a node SHALL trigger a fresh execution of its code block (recording a new `file_executed` receipt).

#### Scenario: Second reference to same MD hits cache but re-executes

- **WHEN** node A depends on `shared.md` and node B also depends on `shared.md` in the same or subsequent advance
- **THEN** the first reference SHALL produce `file_read` + `file_executed` for `shared.md`, and the second reference SHALL produce `cache_hit` + `file_executed` for `shared.md`
