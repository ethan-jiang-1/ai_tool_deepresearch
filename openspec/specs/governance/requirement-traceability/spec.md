# requirement-traceability

> req: RET-001, RET-002, RET-003, RET-004, RET-005, RET-006

## Purpose

`requirement-traceability` 确保需求追踪基础设施（`req-registry.yaml`、`config.yaml`、check 脚本）在项目演进中保持清晰、自文档化、可验证。

**为什么边界清晰至关重要：** 当两个 capability 的边界模糊时，开发者倾向于把新 requirements 塞进"看起来相关"的已有 spec 而非建独立 spec。`workflow/silent-wave-execution` 起初被混入 `agent/hitl-ux`——因为两个都被笼统归为 "UX 相关"，而 "UX" 是主题标签，不是能力边界。如果当时有 `prefixes:` 自文档化映射和边界测试，在写第一个 requirement 之前就会意识到这是两个正交的契约（用户在场 vs 用户缺席）。

本 spec 定义的六个 requirement 不依赖特定技术栈——它们约束的是人类如何组织、查阅、验证需求追踪。未来即使换工具（如迁移到其他 registry 格式），边界测试和自文档化原则仍然适用。

**自指涉合规**：`requirement-traceability` 作为一个 capability，自身遵循其定义的规则——本 spec 位于 `openspec/specs/governance/requirement-traceability/spec.md`（两级 canonical path，RET-002），前缀 RET 在 `prefixes:` 映射块注册（RET-001），ID 按数字序排列（RET-004），项目治理 checks PASS 后归档（RET-006）。废弃规则（RET-005）当前不适用——本 capability 尚无废弃 ID。
## Requirements
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
- **AND** no `# engine/schema-core (delta)` or second group is created

#### Scenario: Group headings follow canonical identity

- **WHEN** the main spec for `agent/hitl-ux` is present
- **THEN** its live requirement-ID group heading is `# agent/hitl-ux`
- **AND** a leaf-only `# hitl-ux` heading is not accepted as the live owner

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
keywords, boundaries or neighbors, typed related entries, and explicit nonempty
`Agent/Markdown owns` and `Engine/Node owns` statements. Main specs remain the
behavior Source of Record; the catalog SHALL neither duplicate requirement
blocks nor decide semantic fit.

Typed related entries SHALL distinguish a related capability, a project-local
execution surface, a project-local workflow entry, and an optional
environment-provided operation skill. A project-local relation SHALL resolve to
its current repository coordinate, while an operation skill SHALL remain
optional guidance rather than a project dependency.

新增 capability 时 SHALL 通过边界测试——满足以下任一条件则应为独立 capability，建独立 spec：

1. **约束条件不同**：行为契约的约束条件与其他 capability 正交（如 `agent/hitl-ux` 约束 "用户在场时的对话"，`workflow/silent-wave-execution` 约束 "用户缺席时的自律"）
2. **独立 requires 链**：被不同的 phase node 以独立的 `requires` 链加载
3. **独立 gate 检查**：有独立的 gate 检查，或 gate rule 的 target 语义与现有 capability 不重叠
4. **不同 Engine 模块**：涉及不同的 schema contract、CLI、或 trace event 族

SHALL NOT 以主题标签（如 "UX 相关"、"性能相关"）作为 capability 边界——主题标签描述关注领域，不描述行为契约的约束条件。跨域 capability 只有一个 canonical path：先按其主要任务问题和语义主体选择；仍不能区分时，才按直接 contract 或 authority boundary 选择，次要关注点保留为 catalog relation，而非创建重复 capability。

#### Scenario: Recognizing workflow/silent-wave-execution as separate capability
- **WHEN** 静默阶段的行为契约（绝不浮出水面、遇错降级、不设 blocked state）被提出
- **THEN** 边界测试条件 1 触发——约束条件是 "用户缺席"，与 `agent/hitl-ux` 的 "用户在场" 正交
- **AND** 条件 2 触发——静默纪律由 wave phase MD 加载，HITL 环由 hitl phase MD 加载，requires 链不同
- **AND** SHALL 创建独立的 `workflow/silent-wave-execution` spec，而非并入 `agent/hitl-ux`

#### Scenario: Rejecting theme-tag grouping
- **WHEN** 开发者试图将 "UX 相关" 的所有要求放入同一个 capability
- **THEN** SHALL NOT 通过边界测试——"UX" 是主题标签，不是行为契约的约束条件
- **AND** SHALL 按约束条件拆分为独立 capability（如在场交互 vs 缺席自律）

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

### Requirement: Alphabetical ordering of groups and numeric ordering within groups

`req-registry.yaml` 中的 live capability 组 SHALL 按完整 `domain/capability`
path 的字母序排列。组内 ID SHALL 按数字后缀升序排列。

SHALL 满足：
- `# agent/agent-testing` 在 `# agent/agentic-queue` 之前（`agent-te` < `agentic`）
- 组内 ID 按数字序连续（如 `AGT—001`、`AGT—002`、`AGT—003`…）
- 废弃 ID 留在组内数字序的正常位置，通过值中的 `[DEPRECATED]` 标记区分
- 废弃 capability 组放在文件末尾，在活跃 capability 之后，内部仍按字母序

#### Scenario: Inserting a new ID into an existing group
- **WHEN** 开发者在 `# engine/schema-core` 组中新增一个 ID
- **THEN** SHALL 按数字序插入到 `SCO—012` 之后
- **AND** 不因插入位置而改变组内其他 ID 的顺序

#### Scenario: New capability group finds its alphabetical position
- **WHEN** 开发者新增 capability `verification/zealous-validation`（前缀 `ZEV`）
- **THEN** `# verification/zealous-validation` 组 SHALL 排在 `# verification/verification-routing` 之后（`z` > `v`）
- **AND** 不因 "最近新增" 而直接附加到文件末尾

### Requirement: Deprecation without deletion

Requirement ID SHALL 只增不删，永不复用。废弃的 ID SHALL 保留在原 capability 组内，值末尾标注 `[DEPRECATED]`。

整个 capability 废弃时 SHALL 满足：
- 保留其 `# <historical-capability-label>` 组头，标注 `— all entries deprecated; no spec directory`
- 组内所有 ID 均标注 `[DEPRECATED]`
- 组头保留在文件末尾（与其他废弃 capability 一起按字母序）
- `prefixes:` 映射块中对应条目 SHALL 保留 capability 全称，标注 `no spec directory`

SHALL NOT 将废弃 ID 移到单独的 "deprecated" 合成组——废弃是 ID 的状态，不是 ID 的归属。

#### Scenario: Single requirement deprecated within active capability
- **WHEN** 一个 requirement ID 被后续 change 废弃
- **THEN** SHALL 保留在原 capability 组内
- **AND** 值末尾标注 `[DEPRECATED]`
- **AND** 该 ID 永不分配给其他 requirement

#### Scenario: Entire capability deprecated
- **WHEN** `workflow-dynamic-md-load` 的 8 个 ID 全部废弃，spec 目录已删除
- **THEN** 组头 SHALL 为 `# workflow-dynamic-md-load — all entries deprecated; no spec directory`
- **AND** 组 SHALL 放在文件末尾废弃区
- **AND** `prefixes:` 中 `WDM: workflow-dynamic-md-load` SHALL 标注 `no spec directory`

### Requirement: Check script compliance as hard gate

Every change SHALL run the project governance checks before archive:

1. `node openspec/governance/check-project-reqs.mjs` -- 0 duplicate, 0 unregistered, 0 orphan, 0 reusedRetired
2. `node openspec/governance/check-project-specs.mjs` -- 0 deltaHeaderInMain, 0 missingPurpose, 0 missingRequirements, 0 missingReqHeader
3. `node openspec/governance/check-capability-taxonomy.mjs` -- no invalid live path, catalog inventory, project-local relation, or control-boundary result
4. `node openspec/governance/check-capability-discovery.mjs --change <change>` -- a structurally valid discovery record for the selected active change

For delegated-work cleanup changes, the hard gate SHALL also include the work-unit hygiene check over current production-facing surfaces. The hygiene check SHALL scan active main specs, active deltas, framework surfaces, shared experiment infrastructure, tests, guidelines, governance metadata, top-level docs, current `_backlog` planning/bug/todo notes, `experiments_env/shared`, and `experiments_playbook`. It SHALL exclude `openspec/changes/archive/` as historical OpenSpec record and SHALL NOT read `_original_*` archives.

The hygiene check SHALL fail stale positive production wording for retired delegated transport mechanisms, old delegated ledger fixtures, and old queue position shapes unless the occurrence is explicitly negative, deprecated, checker/test self-reference, cleanup-control for an active cleanup change, current work-unit context for context-sensitive tokens, past-failure-history for current backlog/bug/planning notes, or minimized release-history wording that cannot be interpreted as command guidance. Allowed contexts SHALL NOT be interpreted as production authority. A legacy/backlog table or label SHALL NOT be an archive-ready allowlist context.

The hygiene check SHALL distinguish retired-only tokens from context-sensitive work-unit fields. Retired-only tokens include old delegated commands, modules, helper APIs, identity fields, event names, provenance check names, dispatch surfaces, old delegated ledger fields, and old queue position fields. Stale queue wording also includes fixed small active-window prose or task-card examples that use `work_id` as queue demand identity. Current queue v2 may describe an ordered `active_window` array, `QUEUE_ACTIVE_WINDOW_LIMIT`, capacity of 20, or a case that stages at least five items, but it SHALL NOT imply named positions, fixed small state shape, or `work_id` demand identity. Context-sensitive fields such as `runtime_receipt_ref`, `receipt_nonce`, `_beacon.json`, lifecycle event wording, and code-local `receiptNonce` SHALL remain allowed in current work-unit contexts, but SHALL fail when paired with old delegated examples, old trace/log identity, old delegated ledger fixtures, old queue position shape, or production instructions for retired paths.

Cleanup-control allowance is narrow. It MAY apply to active change artifacts whose purpose is to define the retired-token vocabulary, inventory current hits, or state negative delta requirements for this cleanup. It SHALL NOT apply to active main specs, framework docs, current runner tables, runnable playbooks, production command guidance, or tests that present the old surface as success behavior.

Historical/planning wording outside `openspec/changes/archive/` SHALL be treated by readability risk, not folder name. A current backlog, bug, TODO, or planning note may keep old delegated-transport terms only when the note clearly frames them as past failure analysis, removed design, or non-authoritative history; it SHALL NOT present retired commands, non-work-unit paths, old queue shape, or old ledger fields as actionable current implementation guidance. If that distinction cannot be made clear cheaply, the note SHALL be removed from current surfaces or moved under an excluded archive path by an OpenSpec-governed cleanup.

These checks are hard gates. Any failure SHALL block archive until its direct
source is repaired. The taxonomy and discovery checks SHALL validate only
declared structural facts; they SHALL NOT claim that semantic candidate choice
or optional environment skill availability has been decided by the Engine.

`check-project-reqs.mjs` SHALL remain compatible with registry organization rules. It SHALL filter YAML keys through the `[A-Z]{3}-\d{3}` requirement ID pattern so `prefixes:` keys and group-header comments do not affect consistency checks.

#### Scenario: Change ready for archive

- **WHEN** change tasks are complete
- **THEN** `check-project-reqs.mjs` SHALL pass
- **AND** `check-project-specs.mjs` SHALL pass
- **AND** `check-capability-taxonomy.mjs` SHALL pass
- **AND** `check-capability-discovery.mjs --change <change>` SHALL pass
- **AND** delegated-work hygiene SHALL pass when the change touches delegated production surfaces

#### Scenario: Discovery structure is not semantic approval

- **WHEN** a proposal has a syntactically valid capability-discovery record
- **THEN** its structural checker reports only the record's direct facts
- **AND** the result does not claim that the Agent's reuse or New decision is
  semantically correct

#### Scenario: Check script fails on registry inconsistency

- **WHEN** a developer references an unregistered ID in an active delta spec
- **THEN** `check-project-reqs.mjs` SHALL report `unregistered: <ID>`
- **AND** SHALL exit non-zero
- **AND** the change SHALL NOT archive until registration is corrected

#### Scenario: Archived OpenSpec changes are excluded from stale-token hygiene

- **WHEN** stale relay/slot production terms appear under `openspec/changes/archive/`
- **THEN** delegated-work hygiene SHALL ignore those occurrences
- **AND** it SHALL continue scanning current surfaces outside the archive directory

#### Scenario: Original archives are not read

- **WHEN** stale relay/slot terms appear under an `_original_*` archive path
- **THEN** delegated-work hygiene SHALL not read or scan that path
- **AND** this exclusion SHALL NOT exempt any copied current-surface wording outside `_original_*`

#### Scenario: Current backlog cannot teach old production paths

- **WHEN** a current backlog, bug, TODO, or planning note outside excluded archives describes retired relay/slot production behavior
- **THEN** hygiene SHALL allow it only if the wording is explicit past-tense failure analysis or removed-design context
- **AND** it SHALL fail or require cleanup if the note can be read as current implementation guidance for delegated work

#### Scenario: Current work-unit field is not falsely rejected

- **WHEN** current work-unit guidance names `runtime_receipt_ref` or `receipt_nonce` in a work-unit manifest, beacon, result, or ledger context
- **THEN** delegated-work hygiene SHALL NOT fail that occurrence solely because the token also appeared in old relay examples
- **AND** it SHALL still fail the occurrence if it is paired with retired delegated paths, fields, helpers, or events

#### Scenario: Old queue position shape is not valid current queue proof

- **WHEN** a current runner, playbook, framework surface, or fixture presents legacy named queue-position fields, fixed small active-window wording, or top-level queue `work_id` demand identity as a runnable queue path
- **THEN** delegated-work hygiene SHALL fail or the surface SHALL be removed from current runner guidance
- **AND** negative schema tests MAY name the shape only to prove rejection

#### Scenario: Queue v2 capacity wording is allowed

- **WHEN** a current queue spec, implementation, test, or playbook describes `active_window` as an ordered array with a current capacity limit or stages five or more items to exercise refill/preemption
- **THEN** delegated-work hygiene SHALL NOT fail solely because the case mentions `active_window` capacity, `QUEUE_ACTIVE_WINDOW_LIMIT`, a maximum of 20 entries, or at least five items
- **AND** it SHALL still fail if the same surface presents named queue-position fields, fixed small state shape, or queue demand `work_id` as current proof

#### Scenario: Active cleanup-control artifacts can name retired terms

- **WHEN** an active cleanup change names retired delegated, ledger, or old queue terms in its proposal, design, task list, inventory, or negative delta requirements
- **THEN** delegated-work hygiene MAY classify those occurrences as cleanup-control
- **AND** that allowance SHALL NOT permit the same wording in current production guidance, current runner surfaces, or runnable playbooks
