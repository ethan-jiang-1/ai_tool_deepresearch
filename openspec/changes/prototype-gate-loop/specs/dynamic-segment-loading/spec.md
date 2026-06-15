# Dynamic Segment Loading

Gate 通过后动态解析下一个 workflow 段。不预编译整个 DAG，支持 Late binding。

## ADDED Requirements

### Requirement: Segments are resolved from a registry at runtime
The workflow SHALL resolve the next segment from a runtime registry using the gate output as a key, not from a precompiled DAG.

#### Scenario: Gate passes to known segment
- **WHEN** gate returns `pass` with output key `"wave0_search"`
- **THEN** the registry resolves `"wave0_search"` to the corresponding Step instance

#### Scenario: Unknown segment key
- **WHEN** gate outputs a key not in the registry
- **THEN** the system throws an error with the unknown key name

### Requirement: Segments can be added or removed without breaking existing in-flight state
The segment registry SHALL allow adding, removing, or renaming segments as pure data changes.

#### Scenario: New segment added
- **WHEN** a new segment is registered with a new key
- **THEN** existing segments are unaffected
