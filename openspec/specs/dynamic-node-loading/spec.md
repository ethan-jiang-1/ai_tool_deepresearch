# Dynamic Node Loading
> req: DYS-001

## Purpose

Gate 通过后动态解析下一个 workflow 节点。不预编译整个 DAG，支持 Late binding。

## Requirements

### Requirement: Nodes are resolved from a registry at runtime
The workflow SHALL resolve the next node from a runtime registry using the gate output as a key, not from a precompiled DAG.

#### Scenario: Gate passes to known node
- **WHEN** gate returns `pass` with output key `"wave0_search"`
- **THEN** the registry resolves `"wave0_search"` to the corresponding Step instance

#### Scenario: Unknown node key
- **WHEN** gate outputs a key not in the registry
- **THEN** the system throws an error with the unknown key name

### Requirement: Nodes can be added or removed without breaking existing in-flight state
The node registry SHALL allow adding, removing, or renaming nodes as pure data changes.

#### Scenario: New node added
- **WHEN** a new node is registered with a new key
- **THEN** existing nodes are unaffected

### Requirement: Node key maps to a pre-built MD file
The runtime SHALL resolve a node key to a corresponding MD file under the configured `NODES_DIR` (e.g., `experiments/prototype-gate-loop/nodes-gate-loop/`), using the key with underscores replaced by hyphens. In `workflow-chain.mjs`, `assessNode()` is the entry point that loads and evaluates a node. The MD content SHALL be displayed before execution to show what the node does, and the execute function SHALL print the before/after state change.

#### Scenario: MD speaks then node acts
- **WHEN** `assessNode(fileRef, state, runtime)` is called with a node key
- **THEN** it reads the corresponding MD file (resolved relative to the configured `NODES_DIR`), displays its content, and the node prints its state transition
