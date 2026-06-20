# Gate Fork Router
> req: GAF-001

## Purpose

Gate 检查状态值后返回确定性 branch identifier。Branch resolver 使用显式 Map 把 branch 映射到 deterministic handler / transform record；它不加载 Agent-facing workflow node。

## Requirements

### Requirement: Gate evaluates state and returns a branch identifier
The Gate SHALL inspect workflow state across multiple dimensions and return exactly one Branch identifier. Evaluation SHALL follow a fixed priority order to ensure deterministic routing when multiple conditions overlap.

#### Scenario: Gate routes to pass when all criteria met
- **WHEN** state has `ref_count >= ref_floor` AND `topicReadiness === 'ready'`
- **THEN** Gate returns `pass`

#### Scenario: Gate routes to fail_a when reference count below floor
- **WHEN** state has `ref_count < ref_floor` AND `topicReadiness === 'ready'`
- **THEN** Gate returns `fail_a`

#### Scenario: Gate routes to fail_b when topic readiness is not ready
- **WHEN** state has `topicReadiness === 'not_ready'` (regardless of ref_count)
- **THEN** Gate returns `fail_b`

#### Scenario: Gate routes to blocked when topic is blocked (highest priority)
- **WHEN** state has `topicReadiness === 'blocked'` (regardless of other conditions, even if `ref_count < ref_floor`)
- **THEN** Gate returns `blocked`

#### Scenario: Priority resolves overlapping fail conditions
- **WHEN** state has both `ref_count < ref_floor` AND `topicReadiness === 'not_ready'`
- **THEN** Gate returns `fail_b` (topic readiness has higher priority than reference count)
- **AND** Gate does NOT return `fail_a`

### Requirement: Branch resolver uses explicit Map
The branch resolver (`forkRouter()` in `subagent-relay.mjs`) SHALL use an explicit map from Branch identifier to deterministic branch handler or transform record. Adding a new branch SHALL require updating the branch enum/map data but SHALL NOT require embedding Agent-facing workflow node loading or Markdown execution into the resolver.

#### Scenario: New branch added without changing resolver control flow
- **WHEN** a new branch `fail_c` is added to the Branch enum and forkMap
- **THEN** the `forkRouter()` control flow needs zero code changes beyond registering the branch handler or transform record

#### Scenario: Resolver returns branch decision for caller inspection
- **WHEN** `forkRouter(state)` is called in `subagent-relay.mjs`
- **THEN** it returns the branch identifier and resolved deterministic handler or transform record
- **AND** the resolved value SHALL NOT be interpreted as an Agent-facing workflow node body
