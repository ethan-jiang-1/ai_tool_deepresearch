# C4: Drop Legacy Profile and Topic Compatibility

> 原候选 change：`drop-legacy-profile-and-topic-compatibility`
>
> 状态：known-surface classification closed; C4a/C4b each require a separate policy decision and proposal
>
> 风险：C4a L3; C4b L4

## 为什么必须拆开

profile `research_access` 的 legacy shape 与 topic identity/migration 不是同一个 contract family。前者影响 HITL1 Gate 和 profile reader；后者影响 current bundle 的 topic identity、reference binding、rerun、Gate coverage、file observability 和 retained historical evidence。把它们放进一个 change 会让风险不可审查。

独立审批卡： [C4a](C4a-retire-legacy-research-access-envelope.md) 与
[C4b](C4b-retire-legacy-plan-migration.md)。它们不是已创建的 OpenSpec changes。

## C4a: Current-only `research_access` profile

### 已验证事实

- `ProfileSchema` 同时接受 `unprobed`、current direct-sample observation 和 `LegacyResearchAccessSchema`。
- current direct-sample observation 的 `available` / `unavailable` 都是合法终态；不是 legacy status。new profile template 的 `{ status: unprobed }` 是 HITL1 前的 current legal state。
- profile 字段 `research_access` 本身可缺失，尽管 new profile template 总会写 `status: unprobed`。
- HITL1 Gate 已能识别 current `sample_observations`，但仍从字段读取 `reason`、`access_boundary` 等 legacy envelope 形状。
- host `research-access-adapter` 的 legacy-boundary lookup 只从 schema-validated legacy `access_boundary` 读取；它不从 current direct samples 推断 host/provider fact。
- `apply-research-style.mjs` 会重写 YAML，但没有把 `research_access` 当 writer-owned projection；它被动保留该字段。
- 当前 writer 链只有 profile template 的 `unprobed` 初始值与 HITL1 Phase 的完整 direct-sample observation；没有 current writer 生成 URL/fetch/search/access-boundary envelope。
- `validate-bundle`、Setup Gate、rerun-ready Gate 与 post-final recovery 都通过 `ProfileSchema` 作 general validity check；它们不是旧 envelope 的语义 reader，但移除 union 后会对旧 profile 共同 fail closed。
- 旧 `access_boundary` 的唯一 semantic consumer 是 HITL1 的 specialized failure projection；它把 schema-valid legacy unavailable 记录映射到 selected adapter owner。adapter 本身是 current executor-scoped canary metadata，不是 legacy format。

### 目标与风险

候选目标是只接受 `unprobed` 或完整 current direct-sample shape；legacy
envelope 明确失败，绝不尝试推断 `available` 或把旧 probe 转换为 sample
observations。是否把整个 `research_access` 字段从 optional 提升为 required
仍是独立 product state decision，不能在删除 union 时偷偷决定。

风险是 L3：Gate feedback、HITL1 replay 和 post-final recovery 可能读取旧 fixture/profile。它不是简单 Zod union 删除。

### Go / No-go

- [x] producer/reader trace complete：current writer 不生成旧 envelope；HITL1 是唯一旧-envelope semantic consumer；`validate-bundle`、Setup/rerun Gate、post-final recovery 是 shared schema rejection consumers；style writer 只 preservation。
- [x] `unprobed`、current `available`、current `unavailable` 都是 current legal states；不要把 status 名字误删。
- [ ] 用户明确选择：旧 shape 删除后，缺少 `research_access` 是全局 profile invalid，还是仅在 HITL1 时失败；这是 product state decision。
- [ ] 选择 legacy envelope 的 rejection owner：复用 `profile_schema_valid` failure，或引入一个明确的 unsupported-current-contract result；不得让每个 generic reader 各自发明错误形状。
- [x] 确认 host adapter 的 boundary taxonomy 只消费 schema-valid legacy profile format；它随 legacy envelope positive path 一起退出，adapter 的 current canary identity和 permission protections保留。
- [x] 保留路径已有 characterization/e2e evidence：C4a focused suite 64 pass / 0 fail；proposal 仍须把 current direct-sample preservation 与 one unsupported-legacy boundary 写成 explicit tests。

### 可能涉及

`schema/contracts/profile.mjs`、profile template、HITL1 Gate、profile readers/mutators、research-access adapter、profile specs 和 schema/integration tests。

## C4b: Topic identity / migration / previous-layout compatibility

### 已验证事实

- `PlanSchema` 同时接受 canonical plan 与 `LegacyPlanSchema`。
- `canonical-topic-state.mjs` 实现 `migrate_legacy`，并允许 legacy inspect 给 rerun migration guidance。
- `previous_layouts[]` 不是旧 plan compatibility：current `mutate_layout` 在 rename/reorder/renumber/safe-remove 时写入它；current UID/slugs, provenance, receipt, reference resolution 和 safe-remove 依赖它。
- reference metadata 的 `related_topic` compatibility 属于 C5a，不是 C4b 的执行范围；C4b 只决定 `LegacyPlanSchema` / `migrate_legacy` 的 Engine re-entry policy。
- Wave gate、reference index、provenance、reentry、file observability、post-final recovery 都消费 current-plus-previous topic identity。
- new-bundle template 已只写 canonical `topic_registry_version: "2"`；没有 current writer 创建 `LegacyPlanSchema` plan。
- `validate-bundle` 与 Setup Gate 使用 compatibility `PlanSchema`，所以旧 plan 仍可通过 general validity；queue admission、work-unit validation、canonical registry fact 和 active topic-state mutation 已要求 canonical plan，不能把 legacy plan 当 current execution input。
- `check-reentry` 仅在 Final state 把 legacy topic state 加为 blocker；其它 inspect/reentry contexts 仍可暴露 migration advice，所以将来移除时必须统一旧 plan 的 inspect/reentry/apply rejection owner。

### 目标与风险

若要停止 legacy plan migration，目标只能是拒绝 legacy mutable plan 的 Engine
re-entry；它不授权删除 current `previous_layouts` 或 C5a 的 reference binding
reader。风险为 L4：错误扩大范围会令已提交 evidence 不可绑定、rerun 不可恢复，
或造成当前 Gate coverage false negative/false positive。

这不是 C4a 的附带清理，且与 C5a/C6 深度耦合。

### Go / No-go

- [x] 已区分：legacy mutable plan migration 是 C4b；current `previous_layouts` lineage 保留；historical reference reader 是 C5a。
- [x] 已绘制 `LegacyPlanSchema -> inspect legacy -> sanctioned rerun migrate_legacy` 的 migration path，及 `previous_layouts -> reference/provenance/Gate/rerun` 的 current lineage path。
- [ ] 用户明确决定：历史 bundle 的 legacy mutable plan 是否仍由 current Engine 可重入；若否，旧 plan 仅可人工查看，Engine inspect/apply 明确 unsupported-current-contract。
- [x] 保留路径已验证：Plan/C4b focused suite 103 pass / 0 fail，覆盖 canonical mutation、added-topic、previous-layout evidence、reentry checks 和 full rerun continuity；proposal 仍须固定其中与改动有关的 regression set，并加 one explicit legacy rejection test。

### 可能涉及

`schema/contracts/plan.mjs`、`canonical-topic-state.mjs`、`topic-layout.mjs`、gate helpers/evaluators、reference sync/file observability、topic specs、rerun/recovery tests。

## 何时算完成

- [ ] C4a 与 C4b 有独立 OpenSpec change slug、proposal、risk review 和 verification plan。
- [ ] C4a 完成不自动授权 C4b。
- [ ] C4b 只有在 historical artifact handling 得到明确决策和 L4 coverage 后才能进入 Apply。
