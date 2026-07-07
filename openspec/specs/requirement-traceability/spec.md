# requirement-traceability

> req: RET-001, RET-002, RET-003, RET-004, RET-005, RET-006

## Purpose

`requirement-traceability` 确保需求追踪基础设施（`req-registry.yaml`、`config.yaml`、check 脚本）在项目演进中保持清晰、自文档化、可验证。

**为什么边界清晰至关重要：** 当两个 capability 的边界模糊时，开发者倾向于把新 requirements 塞进"看起来相关"的已有 spec 而非建独立 spec。`silent-wave-execution` 起初被混入 `hitl-ux`——因为两个都被笼统归为 "UX 相关"，而 "UX" 是主题标签，不是能力边界。如果当时有 `prefixes:` 自文档化映射和边界测试，在写第一个 requirement 之前就会意识到这是两个正交的契约（用户在场 vs 用户缺席）。

本 spec 定义的六个 requirement 不依赖特定技术栈——它们约束的是人类如何组织、查阅、验证需求追踪。未来即使换工具（如迁移到其他 registry 格式），边界测试和自文档化原则仍然适用。

**自指涉合规**：`requirement-traceability` 作为一个 capability，自身遵循其定义的规则——本 spec 归档后在 `openspec/specs/requirement-traceability/spec.md`（单 capability 单目录，RET-002），前缀 RET 在 `prefixes:` 映射块注册（RET-001），ID 按数字序排列（RET-004），`check-project-reqs.mjs` 和 `check-project-specs.mjs` PASS 后归档（RET-006）。废弃规则（RET-005）当前不适用——本 capability 尚无废弃 ID。
## Requirements
### Requirement: Prefix abbreviation registry as self-documenting source of truth

`openspec/governance/req-registry.yaml` SHALL 包含 `prefixes:` 映射块，位于文件头部注释后、第一个 ID 组之前。映射块 SHALL 是缩写 → kebab-case capability 全称的唯一自文档化来源。

`prefixes:` 映射块 SHALL 满足：
- 每个活跃前缀映射到唯一的 capability 全称（kebab-case），值必须匹配 `openspec/specs/<value>/` 目录名
- sub-prefix（同一 capability 下的二级前缀，如 SOR 属于 schema-core）SHALL 在映射值中指向同一 capability 全称，并标注归属关系
- 已废弃 capability 的前缀 SHALL 在映射值中保留 capability 全称，并标注 `no spec directory`
- 新增 capability 时，SHALL 先在 `prefixes:` 注册前缀，再创建 `openspec/specs/<name>/` 目录，再添加 ID 条目

映射块的 key（如 `SCO`）不匹配 `[A-Z]{3}-\d{3}` 正则，`check-project-reqs.mjs` SHALL 自动忽略，无需脚本改动。

#### Scenario: New capability requires prefix registration first
- **WHEN** 开发者为新 capability 分配缩写前缀
- **THEN** SHALL 先在 `prefixes:` 块中注册 `NEW: new-capability-name`
- **AND** 再创建 `openspec/specs/new-capability-name/spec.md`
- **AND** 再在 registry 中添加对应的新 ID
- **AND** 注册前 SHALL 搜索现有 `prefixes:` 确认前缀未被占用

#### Scenario: Ambiguous abbreviation resolved by prefixes block
- **WHEN** 不熟悉项目的开发者看到 registry 中的 `GSK` 前缀
- **THEN** 在 `prefixes:` 块中查得 `GSK: gate-skeleton`
- **AND** 不需要通过注释头或 spec 目录名反向推导

### Requirement: One capability, one group header

`req-registry.yaml` 中的 ID 条目 SHALL 按 capability 分组。每个 capability SHALL 有且仅有一个 `# <kebab-case-capability-name>` 组头。

组头 SHALL 满足：
- 组头文本与 `openspec/specs/<capability-name>/` 目录名一致
- 不存在合成组头（将多个 capability 归入一个人造标题，如 `# wff-research-waves / research-wave-phase-content`、`# bundle-infrastructure`、`# subagent-system`）
- 不存在 delta-chronicle 组头（如 `# schema-core (delta)`、`# research-wave-gate-implementation (delta)`）——新增 ID SHALL 直接归入对应 capability 组，不另开 delta 段
- 一个 capability 的所有 ID（包括后续新增的）SHALL 连续排列在同一组头下

#### Scenario: Adding a requirement to an existing capability
- **WHEN** 开发者在后续 change 中为 `schema-core` 新增一个 ID
- **THEN** SHALL 将该 ID 直接插入 `# schema-core` 组的数字序正确位置
- **AND** SHALL NOT 创建新的 `# schema-core (delta)` 组头
- **AND** SHALL NOT 将该 ID 附加到文件末尾或其他组下

#### Scenario: Synthetic group headers are dissolved
- **WHEN** registry 重组完成
- **THEN** `# wff-research-waves / *`、`# workflow-foundation — contracts`、`# dedup-experiments-framework` 等合成组头 SHALL 全部被对应 capability 的独立组头替代
- **AND** 每个 ID SHALL 落在其 capability 组头下，而非合成组下

### Requirement: Capability boundary test prevents scope confusion

新增 capability 时 SHALL 通过边界测试——满足以下任一条件则应为独立 capability，建独立 spec：

1. **约束条件不同**：行为契约的约束条件与其他 capability 正交（如 `hitl-ux` 约束 "用户在场时的对话"，`silent-wave-execution` 约束 "用户缺席时的自律"）
2. **独立 requires 链**：被不同的 phase node 以独立的 `requires` 链加载
3. **独立 gate 检查**：有独立的 gate 检查，或 gate rule 的 target 语义与现有 capability 不重叠
4. **不同 Engine 模块**：涉及不同的 schema contract、CLI、或 trace event 族

SHALL NOT 以主题标签（如 "UX 相关"、"性能相关"）作为 capability 边界——主题标签描述关注领域，不描述行为契约的约束条件。

#### Scenario: Recognizing silent-wave-execution as separate capability
- **WHEN** 静默阶段的行为契约（绝不浮出水面、遇错降级、不设 blocked state）被提出
- **THEN** 边界测试条件 1 触发——约束条件是 "用户缺席"，与 `hitl-ux` 的 "用户在场" 正交
- **AND** 条件 2 触发——静默纪律由 wave phase MD 加载，HITL 环由 hitl phase MD 加载，requires 链不同
- **AND** SHALL 创建独立的 `silent-wave-execution` spec，而非并入 `hitl-ux`

#### Scenario: Rejecting theme-tag grouping
- **WHEN** 开发者试图将 "UX 相关" 的所有要求放入同一个 capability
- **THEN** SHALL NOT 通过边界测试——"UX" 是主题标签，不是行为契约的约束条件
- **AND** SHALL 按约束条件拆分为独立 capability（如在场交互 vs 缺席自律）

### Requirement: Alphabetical ordering of groups and numeric ordering within groups

`req-registry.yaml` 中的 capability 组 SHALL 按 capability 全称（kebab-case）的字母序排列。组内 ID SHALL 按数字后缀升序排列。

SHALL 满足：
- `# agent-testing` 在 `# agentic-queue` 之前（`agent-te` < `agentic`）
- 组内 ID 按数字序连续（如 `AGT—001`、`AGT—002`、`AGT—003`…）
- 废弃 ID 留在组内数字序的正常位置，通过值中的 `[DEPRECATED]` 标记区分
- 废弃 capability 组放在文件末尾，在活跃 capability 之后，内部仍按字母序

#### Scenario: Inserting a new ID into an existing group
- **WHEN** 开发者在 `# schema-core` 组中新增一个 ID
- **THEN** SHALL 按数字序插入到 `SCO—012` 之后
- **AND** 不因插入位置而改变组内其他 ID 的顺序

#### Scenario: New capability group finds its alphabetical position
- **WHEN** 开发者新增 capability `zealous-validation`（前缀 `ZEV`）
- **THEN** `# zealous-validation` 组 SHALL 排在 `# wave2-synthesis` 之后（`z` > `w`）
- **AND** 不因 "最近新增" 而直接附加到文件末尾

### Requirement: Deprecation without deletion

Requirement ID SHALL 只增不删，永不复用。废弃的 ID SHALL 保留在原 capability 组内，值末尾标注 `[DEPRECATED]`。

整个 capability 废弃时 SHALL 满足：
- 保留其 `# <capability-name>` 组头，标注 `— all entries deprecated; no spec directory`
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

For delegated-work cleanup changes, the hard gate SHALL also include the work-unit hygiene check over current production-facing surfaces. The hygiene check SHALL scan active main specs, active deltas, framework surfaces, shared experiment infrastructure, tests, guidelines, governance metadata, top-level docs, current `_backlog` planning/bug/todo notes, `experiments_env/shared`, and `experiments_playbook`. It SHALL exclude `openspec/changes/archive/` as historical OpenSpec record and SHALL NOT read `_original_*` archives.

The hygiene check SHALL fail stale positive production wording for retired relay/slot mechanisms, old delegated ledger fixtures, and old queue slot shapes unless the occurrence is explicitly negative, deprecated, checker/test self-reference, cleanup-control for this active cleanup change, current work-unit context for context-sensitive tokens, past-failure-history for current backlog/bug/planning notes, or minimized release-history wording that cannot be interpreted as command guidance. Allowed contexts SHALL NOT be interpreted as production authority. A legacy/backlog table or label SHALL NOT be an archive-ready allowlist context.

The hygiene check SHALL distinguish retired-only tokens from context-sensitive work-unit fields. Retired-only tokens include old relay commands, modules, helper APIs, slot identity fields, relay event names, old provenance check names, old relay directory or dispatch surfaces, old delegated ledger fields, and old queue slot control fields such as `slot_1_current`, `slot_2_next`, `slot_5_tail`, and `slot_*_pending`. Stale queue wording also includes fixed five-slot active-window prose or task-card examples that use `work_id` as queue demand identity. Current queue v2 may describe an ordered `active_window` array, `QUEUE_ACTIVE_WINDOW_LIMIT`, capacity of 20, or a case that stages at least five items, but it SHALL NOT imply named slots, fixed five-slot state shape, or `work_id` demand identity. Context-sensitive fields such as `runtime_receipt_ref`, `receipt_nonce`, `_beacon.json`, lifecycle event wording, and code-local `receiptNonce` SHALL remain allowed in current work-unit contexts, but SHALL fail when paired with old relay/slot examples, old relay trace/log identity, old delegated ledger fixtures, old queue slot shape, or production instructions for retired paths.

Cleanup-control allowance is narrow. It MAY apply to active change artifacts whose purpose is to define the retired-token vocabulary, inventory current hits, or state negative delta requirements for this cleanup. It SHALL NOT apply to active main specs, framework docs, current runner tables, runnable playbooks, production command guidance, or tests that present the old surface as success behavior.

Historical/planning wording outside `openspec/changes/archive/` SHALL be treated by readability risk, not folder name. A current backlog, bug, TODO, or planning note may keep old relay/slot terms only when the note clearly frames them as past failure analysis, removed design, or non-authoritative history; it SHALL NOT present retired commands, slot paths, old queue shape, or old ledger fields as actionable current implementation guidance. If that distinction cannot be made clear cheaply, the note SHALL be removed from current surfaces or moved under an excluded archive path by an OpenSpec-governed cleanup.

Checks SHALL be hard gates. Any failure SHALL block archive until resolved.

`check-project-reqs.mjs` SHALL remain compatible with registry organization rules. It SHALL filter YAML keys through the `[A-Z]{3}-\d{3}` requirement ID pattern so `prefixes:` keys and group-header comments do not affect consistency checks.

#### Scenario: Change ready for archive

- **WHEN** change tasks are complete
- **THEN** `check-project-reqs.mjs` SHALL pass
- **AND** `check-project-specs.mjs` SHALL pass
- **AND** delegated-work hygiene SHALL pass when the change touches delegated production surfaces

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
- **AND** it SHALL still fail the occurrence if it is paired with retired relay/slot paths, fields, helpers, or events

#### Scenario: Old queue slot shape is not valid current queue proof

- **WHEN** a current runner, playbook, framework surface, or fixture presents `slot_1_current`, `slot_2_next`, `slot_*_pending`, fixed five-slot active-window wording, or top-level queue `work_id` demand identity as a runnable queue path
- **THEN** delegated-work hygiene SHALL fail or the surface SHALL be removed from current runner guidance
- **AND** negative schema tests MAY name the shape only to prove rejection

#### Scenario: Queue v2 capacity wording is allowed

- **WHEN** a current queue spec, implementation, test, or playbook describes `active_window` as an ordered array with a current capacity limit or stages five or more items to exercise refill/preemption
- **THEN** delegated-work hygiene SHALL NOT fail solely because the case mentions `active_window` capacity, `QUEUE_ACTIVE_WINDOW_LIMIT`, a maximum of 20 entries, or at least five items
- **AND** it SHALL still fail if the same surface presents named slot fields, fixed five-slot state shape, or queue demand `work_id` as current proof

#### Scenario: Active cleanup-control artifacts can name retired terms

- **WHEN** this active cleanup change names retired relay, slot, ledger, or old queue terms in its proposal, design, task list, inventory, or negative delta requirements
- **THEN** delegated-work hygiene MAY classify those occurrences as cleanup-control
- **AND** that allowance SHALL NOT permit the same wording in current production guidance, current runner surfaces, or runnable playbooks

