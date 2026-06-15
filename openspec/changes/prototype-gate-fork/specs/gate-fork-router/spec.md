# Gate Fork Router

Gate 检查状态值后分叉到 3+ 个不同 workflow 段。

## ADDED Requirements

### Requirement: Gate evaluates state and returns a branch identifier
The Gate SHALL inspect workflow state and return one of N branch identifiers (minimum 3 branches in the experiment: pass, fail_a, fail_b).

#### Scenario: Gate routes to different branches based on state values
- **WHEN** state has `referenceCount >= floor`, Gate returns `pass`
- **WHEN** state has `referenceCount < floor`, Gate returns `fail_a`
- **WHEN** state has `topicReadiness !== 'ready'`, Gate returns `fail_b`

### Requirement: Branch router uses explicit Map
The branch router SHALL use an explicit `Map<Branch, Step>` to resolve branch identifiers to workflow segments.

#### Scenario: New branch added without changing router logic
- **WHEN** a new branch `fail_c` is added to the Branch enum and Map
- **THEN** the router function needs zero code changes
