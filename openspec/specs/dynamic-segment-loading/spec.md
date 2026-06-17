# Dynamic Segment Loading
> req: DYS-001

## Purpose

Gate 通过后动态解析下一个 workflow 段。不预编译整个 DAG，支持 Late binding。

## Requirements

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

### Requirement: Segment key maps to a pre-built MD file
The `executeMDAndRun(key)` function SHALL resolve the segment key to a corresponding MD file in `segments-gate-loop/` (key with underscores replaced by hyphens). The MD content SHALL be displayed before execution to show what the segment does, and the execute function SHALL print the before/after state change.

#### Scenario: MD speaks then segment acts
- **WHEN** `executeMDAndRun('wave0_search')` is called
- **THEN** it reads `segments-gate-loop/wave0-search.md`, displays its content, and the segment prints "🔍 开始搜索..." with state transition
