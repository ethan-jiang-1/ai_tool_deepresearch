> req: RET-001, RET-002, RET-003, RET-006

## MODIFIED Requirements

### Requirement: Prefix abbreviation registry as self-documenting source of truth

`openspec/governance/req-registry.yaml` SHALL contain a `prefixes:` mapping
after the file header comments and before the first requirement-ID group. The
mapping is the unique self-documenting source from a prefix to a full canonical
capability path.

The `prefixes:` mapping SHALL satisfy all of the following:

- Every live prefix maps to one unique `domain/capability` path whose segments
  are kebab-case and whose value resolves to
  `openspec/specs/<domain>/<capability>/spec.md`.
- A sub-prefix for the same capability SHALL map to the same complete path and
  identify its ownership relationship.
- A retired capability prefix SHALL retain its historical label and an explicit
  `no spec directory` explanation; it SHALL NOT be invented as a live path.
- When a new capability is created, its prefix SHALL be registered against the
  complete path before the main-spec directory and requirement-ID entries are
  created.

`check-project-reqs.mjs` SHALL ignore registry keys that are not requirement
IDs for ID consistency, and SHALL separately report a live prefix whose target
does not resolve to its complete main-spec path.

#### Scenario: New capability registers a full path first

- **WHEN** an author assigns a prefix to a new capability
- **THEN** the author registers `NEW: domain/new-capability` in `prefixes:`
- **AND** then creates `openspec/specs/domain/new-capability/spec.md`
- **AND** then adds the new requirement-ID entry after checking that the prefix
  is unused

#### Scenario: A sub-prefix does not create a second capability

- **WHEN** a reader encounters a documented sub-prefix of a live capability
- **THEN** its registry value resolves to the same full capability path as the
  owning prefix
- **AND** the registry does not require a second main-spec directory

#### Scenario: A broken live prefix is visible

- **WHEN** a live prefix maps to a flat, malformed, or missing spec path
- **THEN** `check-project-reqs.mjs` exits non-zero and identifies that prefix
- **AND** archive remains unavailable until the path or registry entry is
  repaired

### Requirement: One capability, one group header

Requirement-ID entries in `req-registry.yaml` SHALL be grouped by capability.
Every live capability SHALL have exactly one `# <domain>/<capability>` group
heading, and every retired capability group SHALL retain its historical label
with the explicit no-directory marker.

Live group headings SHALL satisfy all of the following:

- The heading equals the main spec's complete canonical path relative to
  `openspec/specs/`.
- There are no synthetic group headings that combine capabilities.
- There are no delta-chronicle group headings; new IDs go into the existing
  capability group in numeric order.
- All IDs for one capability remain contiguous under its one group heading.

#### Scenario: Adding a requirement to a nested capability

- **WHEN** a later change adds a requirement to `engine/schema-core`
- **THEN** its ID is inserted in numeric order under `# engine/schema-core`
- **AND** no `# schema-core (delta)` or second group is created

#### Scenario: Group headings follow canonical identity

- **WHEN** the main spec for `agent/hitl-ux` is present
- **THEN** its live requirement-ID group heading is `# agent/hitl-ux`
- **AND** a leaf-only `# hitl-ux` heading is not accepted as the live owner

### Requirement: Check script compliance as hard gate

Every change SHALL run the project governance checks before archive:

1. `node openspec/governance/check-project-reqs.mjs` with no duplicate,
   unregistered, orphan, reused-retired, or unresolved live-prefix result.
2. `node openspec/governance/check-project-specs.mjs` with no delta header in a
   main spec and no missing Purpose, Requirements, or requirement-trace header.
3. `node openspec/governance/check-capability-taxonomy.mjs` with no invalid
   live path, catalog inventory, project-local relation, or control-boundary
   result.
4. `node openspec/governance/check-capability-discovery.mjs --change <change>`
   with a structurally valid discovery record for the selected active change.

These checks are hard gates. Any failure SHALL block archive until its direct
source is repaired. The taxonomy and discovery checks SHALL validate only
declared structural facts; they SHALL NOT claim that semantic candidate choice
or optional environment skill availability has been decided by the Engine.

#### Scenario: A change is ready for archive

- **WHEN** an active change has completed its tasks and required semantic sync
- **THEN** all four project governance checks pass
- **AND** an unresolved registry path, catalog row, or discovery-record field
  prevents archive

#### Scenario: Discovery structure is not semantic approval

- **WHEN** a proposal has a syntactically valid capability-discovery record
- **THEN** its structural checker reports only the record's direct facts
- **AND** the result does not claim that the Agent's reuse or New decision is
  semantically correct

### Requirement: Capability boundary test prevents scope confusion

An Agent proposing a New or Modified capability SHALL first read the
non-authoritative Capability Catalog at `openspec/specs/README.md`, or the
current main-spec list when the catalog is not yet available, and inspect each
relevant candidate main spec. The proposal SHALL include a `## Capability
Discovery` table with `Candidate path`, `Evidence read`, `Decision`, and
`Reason`. The only dispositions are `Modify`, `Verify-only`, `Excluded`, and
`New`. A `New` decision SHALL explain why no inspected existing capability owns
the requested observable behavior.

A change that declares `skip_specs: true` SHALL still include the heading and
state explicitly why discovery yields no delta-spec applicability; it may retain
candidate rows as evidence.

The Capability Catalog SHALL contain exactly one row for every live
`domain/capability` main-spec path and no row for a missing or flat main spec.
Each row SHALL provide a purpose grounded in the main spec, task-language
keywords, boundaries or neighbors, typed related entries, and explicit
nonempty `Agent/Markdown owns` and `Engine/Node owns` statements. Main specs
remain the behavior Source of Record; the catalog SHALL neither duplicate
requirement blocks nor decide semantic fit.

Typed related entries SHALL distinguish a related capability, a project-local
execution surface, a project-local workflow entry, and an optional
environment-provided operation skill. A project-local relation SHALL resolve to
its current repository coordinate, while an operation skill SHALL remain
optional guidance rather than a project dependency.

新增 capability 时 SHALL 通过边界测试——满足以下任一条件则应为独立 capability，建独立 spec：

1. **约束条件不同**：行为契约的约束条件与其他 capability 正交（如 `hitl-ux` 约束 "用户在场时的对话"，`silent-wave-execution` 约束 "用户缺席时的自律"）
2. **独立 requires 链**：被不同的 phase node 以独立的 `requires` 链加载
3. **独立 gate 检查**：有独立的 gate 检查，或 gate rule 的 target 语义与现有 capability 不重叠
4. **不同 Engine 模块**：涉及不同的 schema contract、CLI、或 trace event 族

SHALL NOT 以主题标签（如 "UX 相关"、"性能相关"）作为 capability 边界——主题标签描述关注领域，不描述行为契约的约束条件。跨域 capability 只有一个 canonical path：先按其主要任务问题和语义主体选择；仍不能区分时，才按直接 contract 或 authority boundary 选择，次要关注点保留为 catalog relation，而非创建重复 capability。

#### Scenario: An existing capability is reused before a new one is declared

- **WHEN** a request concerns queue admission behavior
- **THEN** the Agent can find `agent/agentic-queue` from the catalog and reads
  its main spec before selecting a disposition
- **AND** the proposal records the inspected path and its reuse or modification
  decision rather than creating a name-neighbor capability by default

#### Scenario: A cross-domain concern has one canonical identity

- **WHEN** a request concerns delegated work provenance and a Gate enforcement
  surface
- **THEN** the catalog identifies `agent/work-unit-provenance-gate` as the
  canonical behavior capability
- **AND** any Engine/Gate surface is represented as a related entry rather than
  a duplicate `engine` capability

#### Scenario: An unknown candidate remains honest

- **WHEN** catalog lookup does not identify an applicable behavior contract
- **THEN** the Agent records the inspected candidates and why they were
  excluded before declaring `New`
- **AND** the catalog does not manufacture a behavior verdict

#### Scenario: An unavailable operation skill does not invalidate a catalog row

- **WHEN** a catalog row names an environment-provided operation skill that is
  unavailable in a particular Agent environment
- **THEN** project validation still evaluates the row's project-local facts
- **AND** the unavailable skill is not reported as a missing product dependency

#### Scenario: Recognizing silent-wave-execution as separate capability

- **WHEN** 静默阶段的行为契约（绝不浮出水面、遇错降级、不设 blocked state）被提出
- **THEN** 边界测试条件 1 触发——约束条件是 "用户缺席"，与 `hitl-ux` 的 "用户在场" 正交
- **AND** 条件 2 触发——静默纪律由 wave phase MD 加载，HITL 环由 hitl phase MD 加载，requires 链不同
- **AND** SHALL 创建独立的 `silent-wave-execution` spec，而非并入 `hitl-ux`

#### Scenario: Rejecting theme-tag grouping

- **WHEN** 开发者试图将 "UX 相关" 的所有要求放入同一个 capability
- **THEN** SHALL NOT 通过边界测试——"UX" 是主题标签，不是行为契约的约束条件
- **AND** SHALL 按约束条件拆分为独立 capability（如在场交互 vs 缺席自律）
