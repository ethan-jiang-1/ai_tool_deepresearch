# C4: Drop Legacy Profile and Topic Compatibility

> 原候选 change：`drop-legacy-profile-and-topic-compatibility`
>
> 状态：must split before proposal
>
> 风险：C4a L3; C4b L4

## 为什么必须拆开

profile `research_access` 的 legacy shape 与 topic identity/migration 不是同一个 contract family。前者影响 HITL1 Gate 和 profile reader；后者影响 current bundle 的 topic identity、reference binding、rerun、Gate coverage、file observability 和 retained historical evidence。把它们放进一个 change 会让风险不可审查。

## C4a: Current-only `research_access` profile

### 已验证事实

- `ProfileSchema` 同时接受 `unprobed`、current direct-sample observation 和 `LegacyResearchAccessSchema`。
- profile 字段 `research_access` 本身可缺失，尽管 new profile template 总会写 `status: unprobed`。
- HITL1 Gate 已能识别 current `sample_observations`，但仍从字段读取 `reason`、`access_boundary` 等 legacy envelope 形状。
- profile 被 Gate、wave evaluators、rerun recovery 和 profile-mutating CLI 多处读取。

### 目标与风险

只接受 template 写出的 current profile shape；缺失/legacy shape 明确失败，绝不尝试推断 `available` 或把旧 probe 转换为 sample observations。

风险是 L3：Gate feedback、HITL1 replay 和 post-final recovery 可能读取旧 fixture/profile。它不是简单 Zod union 删除。

### Go / No-go

- [ ] 列出所有 `readBundleProfile` consumers，按“只读取”或“会写回”分类。
- [ ] 明确 `unprobed` 是否仍是 current legal state，以及 `research_access` 是否应 required；这是 product state decision。
- [ ] 让 Hitl1 CLI 对 legacy input 给出一致结构化 failure，而不是 generic YAML parse error。
- [ ] 确认 host `research-access-adapter` 中的 “legacy boundary” 是 profile format legacy，还是 current host taxonomy；不能按词删除。
- [ ] 先加 current sample-observation characterization tests，再移除 legacy schema/test fixtures。

### 可能涉及

`schema/contracts/profile.mjs`、profile template、HITL1 Gate、profile readers/mutators、research-access adapter、profile specs 和 schema/integration tests。

## C4b: Topic identity / migration / previous-layout compatibility

### 已验证事实

- `PlanSchema` 同时接受 canonical plan 与 `LegacyPlanSchema`。
- `canonical-topic-state.mjs` 实现 `migrate_legacy`，并允许 legacy inspect 给 rerun migration guidance。
- current reference binding 同时接受 `related_topic_uid` 和 legacy `related_topic`，并以 `previous_layouts` 解析历史 slug/id。
- Wave gate、reference index、provenance、reentry、file observability、post-final recovery 都消费 current-plus-previous topic identity。

### 目标与风险

若要 current-only，必须让 topic registry、reference binding 和 historical artifact policy一起变更。风险为 L4：错误删除会令已提交 evidence 不可绑定、rerun 不可恢复，或造成当前 Gate coverage false negative/false positive。

这不是 C4a 的附带清理，且与 C5a/C6 深度耦合。

### Go / No-go

- [ ] 先区分三种资料：current mutable plan、immutable historical ledger/receipt、current reader 需要看的 retained reference。
- [ ] 为每种旧 topic shape 决定：reject、human-only opaque、或 retain as current reader input。没有这个矩阵不得 Apply。
- [ ] 完整绘制 UID/slug/previous-layout -> reference -> Gate -> rerun 的调用路径。
- [ ] 对 current rerun、added-topic、existing historical evidence 写 characterization/e2e evidence。
- [ ] 用户明确决定：历史 bundle 是否仍要由 current Engine 可重入；否则 default current-only 会把范围扩大到不可逆用户体验变更。

### 可能涉及

`schema/contracts/plan.mjs`、`canonical-topic-state.mjs`、`topic-layout.mjs`、gate helpers/evaluators、reference sync/file observability、topic specs、rerun/recovery tests。

## 何时算完成

- [ ] C4a 与 C4b 有独立 OpenSpec change slug、proposal、risk review 和 verification plan。
- [ ] C4a 完成不自动授权 C4b。
- [ ] C4b 只有在 historical artifact handling 得到明确决策和 L4 coverage 后才能进入 Apply。
