# Gate Fork Router
> req: GAF-001

Gate 检查状态值后分叉到 4 个不同 workflow 段。使用显式 Map 转换表，按优先级路由。

## ADDED Requirements

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

### Requirement: Branch router uses explicit Map
The branch router SHALL use an explicit `Map<Branch, Step>` to resolve branch identifiers to workflow segments. Adding a new branch SHALL require zero code changes to the router function.

#### Scenario: New branch added without changing router logic
- **WHEN** a new branch `fail_c` is added to the Branch enum and forkMap
- **THEN** the `forkRouter()` function needs zero code changes

#### Scenario: Router returns routing decision for caller inspection
- **WHEN** `forkRouter(state)` is called
- **THEN** it returns `{ branch, step }` — the branch identifier used AND the resolved Step, allowing callers to inspect the routing decision
