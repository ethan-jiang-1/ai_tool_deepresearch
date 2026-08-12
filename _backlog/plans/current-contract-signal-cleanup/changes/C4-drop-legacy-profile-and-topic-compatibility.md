# C4: Drop Legacy Profile and Topic Compatibility

> 原候选 change：`drop-legacy-profile-and-topic-compatibility`
>
> 状态：split discovery complete; C4a/C4b each require a separate policy decision and proposal
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

### 目标与风险

候选目标是只接受 `unprobed` 或完整 current direct-sample shape；legacy
envelope 明确失败，绝不尝试推断 `available` 或把旧 probe 转换为 sample
observations。是否把整个 `research_access` 字段从 optional 提升为 required
仍是独立 product state decision，不能在删除 union 时偷偷决定。

风险是 L3：Gate feedback、HITL1 replay 和 post-final recovery 可能读取旧 fixture/profile。它不是简单 Zod union 删除。

### Go / No-go

- [x] 主要 direct semantic consumer 已确认是 HITL1 Gate；generic profile readers 多数消费其他 profile 字段，style writer 只是 preservation path。
- [x] `unprobed`、current `available`、current `unavailable` 都是 current legal states；不要把 status 名字误删。
- [ ] 用户明确选择：旧 shape 删除后，缺少 `research_access` 是全局 profile invalid，还是仅在 HITL1 时失败；这是 product state decision。
- [ ] 让 Hitl1 CLI 对 legacy input 给出一致结构化 failure，而不是 generic YAML parse error。
- [ ] 确认 host `research-access-adapter` 中的 “legacy boundary” 是 profile format legacy，还是 current host taxonomy；不能按词删除。
- [ ] 先加 current sample-observation characterization tests，再移除 legacy schema/test fixtures。

### 可能涉及

`schema/contracts/profile.mjs`、profile template、HITL1 Gate、profile readers/mutators、research-access adapter、profile specs 和 schema/integration tests。

## C4b: Topic identity / migration / previous-layout compatibility

### 已验证事实

- `PlanSchema` 同时接受 canonical plan 与 `LegacyPlanSchema`。
- `canonical-topic-state.mjs` 实现 `migrate_legacy`，并允许 legacy inspect 给 rerun migration guidance。
- `previous_layouts[]` 不是旧 plan compatibility：current `mutate_layout` 在 rename/reorder/renumber/safe-remove 时写入它；current UID/slugs, provenance, receipt, reference resolution 和 safe-remove 依赖它。
- reference metadata 的 `related_topic` compatibility 属于 C5a，不是 C4b 的执行范围；C4b 只决定 `LegacyPlanSchema` / `migrate_legacy` 的 Engine re-entry policy。
- Wave gate、reference index、provenance、reentry、file observability、post-final recovery 都消费 current-plus-previous topic identity。

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
- [ ] 对 current rerun、added-topic、existing historical evidence 写 characterization/e2e evidence；范围仅覆盖保留的 canonical + lineage path。

### 可能涉及

`schema/contracts/plan.mjs`、`canonical-topic-state.mjs`、`topic-layout.mjs`、gate helpers/evaluators、reference sync/file observability、topic specs、rerun/recovery tests。

## 何时算完成

- [ ] C4a 与 C4b 有独立 OpenSpec change slug、proposal、risk review 和 verification plan。
- [ ] C4a 完成不自动授权 C4b。
- [ ] C4b 只有在 historical artifact handling 得到明确决策和 L4 coverage 后才能进入 Apply。
