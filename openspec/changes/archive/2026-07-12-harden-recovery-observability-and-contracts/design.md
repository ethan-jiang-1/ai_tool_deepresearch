## Context

v0.21 已把 `materialize-before-work`、`canonical-or-blocked` 与 helper-oriented responsibility 固定为后续 change 的设计义务，但当前 runtime 仍只有分散的观察面：

- `file-observability.mjs` 擅长按 expected path、work-unit ledger 与 provenance 分类文件；
- `check-reentry.mjs` 擅长组合 status、queue、required artifacts、ledger、checkpoint drift 与 file observability；
- wave inspect CLI 擅长在无副作用前提下检查本 wave 的 producer/output contract；
- return-map 与 cache validation helpers 分别拥有 parser 和 submit/gate validation 逻辑。

这些 surface 没有共同回答 BUG-079 的 incident question：磁盘上是否出现 registry 外 durable topic、悬空 topic identity、平行正式 namespace，以及当前 advice 是否指向一条确定会被现有 handoff/status preflight 拒绝的路径。BUG-077 的剩余 contract-opacity 则来自三个小但真实的漂移：Wave0 metadata parser 把 H1 当成首个 semantic section、return-map parser 把 Markdown bold wrapper 当成字段名的一部分、cache leaf required files/source mapping/degraded conditions 分散在多个 helper 与文档中。

本 change 是只读 observability foundation。它必须复用现有 capability owners，不能提前实现 Overall Plan 的 C2-C5，也不能把 audit finding 变成新的 authority。

## Goals / Non-Goals

**Goals:**

- 从 registry、topic-bearing canonical surfaces、reference metadata 和 durable output paths 生成结构化 canonical-footprint findings。
- 由 `check-reentry` 组合这些 findings，与现有 status/queue/checkpoint audits 一起输出 root-cause-first recovery summary。
- 对确定性 repair/reentry advice 先验证当前状态下的可达性；没有 legal path 时输出 missing contract。
- 修正 Wave0 H1/H2 metadata boundary 与 return-map bold field presentation tolerance。
- 建立一个 submit/gate/docs 共用的 Engine-owned cache-leaf contract projection。
- 保持所有新增 inspect/audit read-only，并用 before/after snapshot 回归证明零副作用。
- 使用现有 G30 reentry-debuggability experiment family 增加 incident-shaped controlled proof，不新增 runner/family。

**Non-Goals:**

- 不创建或修改 topic registry、seed、progress、status、queue、trace、ledger、checkpoint、artifact 或 cache。
- 不选择未来 canonical topic identity/progress Source of Record；本 change 只按当前 `rb_plan.md#/topic_registry` 作为 audit anchor。
- 不实现 crash-safe writes、orphan tmp sweep、atomic rename/renumber。
- 不实现 delegated actor availability probe 或 Phase Agent fallback。
- 不实现 post-final reentry、authorized repair、state-seed、human override 或正式 addendum capability。
- 不加入 prose classifier、advice text parser、后台 watcher 或第二套 bundle audit CLI。

## Decisions

### 1. `check-reentry` 继续作为 recovery composition surface

`check-reentry.mjs` 已经组合 status、queue、artifacts、ledger、checkpoint drift 与 `auditFileObservability()`，并且规范上要求不依赖 chat memory。实现将扩展现有 pure helper 与结果 schema，在 `check-reentry` 输出中增加 additive `recovery` summary，而不是新增 `audit-bundle-integrity.mjs`。

`recovery` 至少包含：

- `canonical_topic_findings[]`（每个 explicit topic identity 至多一个 primary finding，内部保留 supporting details）
- `root_findings[]`（从 blocking canonical finding 与既有 recovery blocker 的直接投影；每项自带 `sanctioned_path_status` 与可选 `recommended_action`）
- `supporting_finding_count`（由 grouped supporting details 计算的展示值，不是第二份 authority）

该结构使用 Zod schema，并对每个 root finding通过 `.refine()` 保证：`reachable` 必须有 action，`missing_contract` 不得伪造 action，blocking canonical finding 必须投影到 `root_findings[]`，而 supporting detail 不得独立生成第二个 primary action。Engine不在多个独立 root之间选择一个“全局最优修复”；它只为每个 root提供一个最近合法动作。成功加载 bundle并完成 target normalization的结果将 `schema_version` 从 `1.0.0` 升为 `1.1.0`；缺 bundle、缺 `--at`、unknown target等 exit-code 2 invocation/configuration error MAY 在无法形成 recovery context时省略 `recovery`。

替代方案：新增独立 integrity CLI。拒绝原因：它会复制 bundle loading、exit code、file observability 与 reentry target normalization，并让后续 Agent 不知道该先跑哪个 audit。

### 2. Canonical footprint audit 只比较显式 identity，不猜 topic

当前 audit anchor 是 `rb_plan.md#/topic_registry` 的 exact `id`/`slug`。Registry alias set只包含显式 `id` 与 `slug`；不得仅凭 slug 数字前缀推导或改写 id。Reference `related_topic` 按现有 contract解析：`all` 是合法 sentinel，逗号分隔值逐项 trim后必须 exact匹配 registry id或slug。新的 pure helper 从以下明确 topic-bearing surface 提取 identity：

- `seed_topics/<slug>.md` 或现行 accepted seed naming；
- `artifacts/wave0|wave1/<slug>/...` 与其他 manifest/spec 已定义的 topic directory；
- reference bullet metadata 中的 `related_topic`；
- final/reference durable surface 中已有明确 topic metadata 或 accepted path identity；
- queue/work-unit/output declarations 中的 explicit topic slug。

只有显式 identity 才能产生 `unregistered_topic_identity` 或 `dangling_topic_reference`。实现不得从任意文件名自然语言、标题相似度或目录序号猜 topic。

Registered topic 的 missing-surface audit必须相对调用者提供的 `targetPhase`/normalized reentry target计算，并复用 manifest/gate accepted path truth。早期 target不得因为未来 wave/final 尚未生成而失败；无 target的 standalone file observability只报告显式 identity drift和 durable parallel output，不推断 lifecycle completeness。

`durable_parallel_namespace` 使用 expected-root policy 判断：如果 `final/`、`reference/` 或 `artifacts/` 下出现承载正式结果、但不属于 accepted canonical pattern 且不是 ledger-backed/diagnostic/temporary surface 的 durable subtree，则报告 blocker。仅有 `_cache/` scratch 不构成正式 topic authority；只有它与 registry 外 durable reference/final/artifact output 形成唯一 backing 时才作为同一 root finding 的 supporting evidence。

替代方案：专门硬编码 `addendum` 字符串。拒绝原因：只能抓到一次事故命名，无法覆盖下一次平行 namespace。

### 3. Root-cause grouping 使用有界 precedence，不建立通用 finding graph

新增 pure `auditCanonicalTopicFootprint()` 返回按 explicit topic identity 分组的 finding。每个 finding 使用稳定字段：

```text
id, rule_id, classification, topic_identity,
primary_surface, supporting_details[], repair_kind
```

Grouping 只使用以下有界 precedence：

| 同一 identity 的事实 | Primary finding | Supporting details |
|---|---|---|
| identity 不在 registry，且存在 durable reference/artifact/final output | `unregistered_durable_topic` | dangling metadata、parallel namespace、supporting cache/work-unit refs |
| identity 在 registry，但 accepted canonical surface 缺失 | `registered_topic_surface_gap` | 各缺失 surface |
| durable subtree 不暴露 explicit topic identity且不匹配 accepted pattern | `unknown_durable_namespace`（默认 warning） | contained paths；不得猜 topic |

这不是通用依赖图，不引入 `root_cause_id`/`masked_by` 跨 finding引用。既有 per-file findings继续保留在 `findings[]`；canonical grouped findings进入新的 additive `canonical_findings[]`。`check-reentry` 从 grouped finding投影 primary blockers/advice，避免 Agent自己去重。

替代方案：为所有 inspect finding建立通用 root/masked graph。拒绝原因：控制复杂度过高，且本 change只需要按 topic identity收敛 BUG-079 形状。

### 4. Advice 由结构化 action + reachability result 渲染

本 change 不解析既有 prose advice。只对本次触及的 recovery/reentry deterministic branch，helper 先构造可执行 action descriptor：

```text
kind: rerun_gate | enter_phase | repair_surface
target_ref
preconditions[]
```

对于 `rerun_gate` / `enter_phase`，复用现有 transition、handoff/status-window helpers 做 read-only reachability assessment。`repair_surface` 只表示现有 contract 已允许且 Engine 能机械定位的同一 surface 修复，不创建通用 repair CLI。只有 assessment 返回 `reachable` 才把 descriptor 渲染成 recommended action；如果 predecessor 本身会被当前 handoff preflight 拒绝，则返回 `missing_contract` assessment 和 direct blocker，不伪造可执行 action，也不再建议循环调用同一 predecessor。`not_applicable` 用于没有确定性机械动作、只能报告受影响 surface 的语义修复 root。

该规则只适用于 Engine 能确定可达性的 action；语义 repair strategy 仍由 Agent 选择。Engine 不生成多阶段恢复计划。

替代方案：对所有 advice 文本做 regex 检查。拒绝原因：脆弱、无法证明真实 route，且会形成新的 prose validator。

### 5. Wave0 metadata block 以首个 H2 semantic section 为边界

`inspect-wave0-output.mjs` 将读取首个 `^##\s+` 之前的内容作为 metadata region，因此允许文件先有一个 H1 title。Metadata 仍只接受 bullet `- key: value`，不扩大为 YAML frontmatter 或 bare YAML keys。Section 检查继续扫描 H2 headings。

替代方案：要求 reference 文件不得有 H1。拒绝原因：H1 是无害展示，且 shared template 当前示例包含 H1。

### 6. Return-map parser只容忍字段名的 balanced bold wrapper

在逐行 field match 前，对 `**evidence_meaning**:`、`**relationship**:` 这类 balanced asterisk-bold wrapper 做窄归一化，映射回既有五个 canonical fields。字段拼写、枚举、refs 和 entry boundary 规则不改变；不引入 Markdown parser，也不容忍任意装饰或 misspelling。

为了保持范围确定，accepted wrapper 只包含 balanced `**...**`。`__field__`、inline code wrapper或其他 Markdown presentation不在 C1 中支持；若未来出现真实需求，另以 producer evidence决定是否扩展。

替代方案：文档明确禁止 bold 但 parser 仍失败。拒绝原因：纯 presentation drift 不应成为 blocking contract，且已有 bug 证明 Agent 容易自然生成 bold label。

### 7. Cache leaf contract 使用 Engine constants + Zod projection

新增或抽取一个窄 cache contract module，拥有：

- required leaf files：`websearch.json`、`page.md`、`meta.json`；
- source mapping fields：`url`、`source_url`、`final_url`、`fetched_url`、`source_slug`；
- page substantive/degraded classification 所需的 canonical meta/page signals；
- `CacheLeafMetaSchema`，允许既有额外 metadata，但 `.refine()` 要求至少一个 source mapping field；
- pure `inspectCacheLeaf()`/equivalent result，供 submit validation 与 gate/depth helpers复用。

Per-work-unit `manifest.cache_policy.leaf_files` 继续作为 assigned policy input，但不替换 canonical base files。`resolveCacheLeafContract(cachePolicy)` 以 base three-file set 与显式 policy additions做稳定去重并集；因此 custom policy可以增加 required sidecar，不能通过省略 base names改变 page/meta/websearch基础契约。本 change不改变谁有权提供 queue/work-unit cache policy，也不新增 policy mutation path。

`work-unit-utils.mjs`、`work-unit-validation.mjs`、`wave-depth-contracts.mjs`、`gate-helpers-checks.mjs` 与 file-observability cache-gap diagnostics 中重复的 required-files、mapping-fields 和 degraded detection 均改为消费该 projection/pure result。Agent-facing docs 不能在 runtime import JS，因此使用现有 static regression 读取 exported base constants/schema vocabulary，与 `shared-subagent-protocol.md`、shared anti-cheating guidance 和 cache README/template 的 required markers 比较；生成的 work-unit task/manifest继续展示该 attempt 的 effective policy additions。这样 executable contract 只有一个 owner，文档漂移会在测试中失败。

替代方案：从 Markdown 生成 runtime validator。拒绝原因：把 Agent-facing projection变成 Engine authority，违反层级边界。

### 8. Controlled proof 扩展现有 G30 family

在 `experiments_playbook/exp_reentry-debuggability/` 增加 `case-313-light-canonical-recovery-incident.md`：创建 registry 内正常 topic 与 registry 外 durable topic output、悬空 `related_topic`、平行 final/reference namespace，以及 terminal `current_gate: readiness_passed` / `current_node: phases/phase-final.md` 下不可达的 HITL2 advice context；运行真实 `check-reentry --at readiness_passed`/inspect 路径，证明：

- root finding 收敛，不产生级联 primary advice；
- parallel durable output 不获得 authority；
- advice 报 missing contract 而非循环 predecessor command；
- before/after bundle snapshot 无 authority mutation。

Wave0 metadata、return-map bold 与 cache contract drift 使用 focused regression；不把所有 parser case 塞进 controlled E2E。

### 9. Blocking canonical findings 必须进入现有 reentry verdict

当前 `check-reentry` 只把 status/queue/artifact/ledger blockers计入 `allBlockers`，`file-observability` findings只进入展示数组。实现增加一个窄 adapter：仅把 `canonical_findings[]` 中 `classification: blocking` 的 primary finding投影为 reentry blocker；warning/info 和既有普通 per-file finding仍保持原分类。

因此 incident-shaped unregistered durable topic会使 `check.passed: false`、exit code `1`，而 unknown presentation warning不会阻断。Adapter复用同一个 finding id/detail，不复制第二份独立判定逻辑。

### 10. Requirement ownership 与 apply target manifest

| Requirement | Owner | Primary implementation | Focused proof |
|---|---|---|---|
| FIO-006 | file observability | canonical footprint pure helper + `auditFileObservability()` additive output | file-observability unit/integration + G30 incident |
| RRD-008 | reentry composition | recovery Zod schema + `check-reentry` 1.1.0 blocker/summary projection | reentry CLI regression + G30 incident |
| CHI-003 | recovery feedback | structured action/reachability helper | reachable/missing-contract integration |
| IOC-001 | Wave0 inspect | H2 metadata boundary | inspect-wave0 regression |
| RRM-005 | return-map parser | narrow bold-label normalization | return-map unit/integration |
| CRC-008 | cache contract | shared cache contract module + all current consumers | cache/work-unit/gate/static-doc regression |

| Band | Writable apply targets | Explicit read-only/excluded anchors |
|---|---|---|
| Engine/schema | cache contract/schema, canonical footprint helper, recovery output schema, reachability adapter, existing cache/file/reentry/return-map helpers | status/queue/profile/topic-progress schemas, transition table semantics, handoff mutation logic |
| CLI | `check-reentry.mjs`, `inspect-wave0-output.mjs` | no new CLI; no enter-phase/gate command behavior changes |
| Agent-facing docs/governance | direct cache, return-map, inspect/reentry guidance and templates；删除旧 simplicity notice；OpenSpec config paired evolution review | no addendum/reentry/override instructions；不创建第三份 guidance |
| Tests/experiments | focused repo-root tests, existing G30 case/manifest, affected G26/G30 execution | no new runner/family; no production bundle mutation |
| Governance/release/backlog | five new registry IDs, IOC description, v0.22 files, source status bookkeeping | do not close BUG-077/079 or source plans |

### 11. 删除旧 simplicity notice，而不是长期维护第三个入口

`guidelines/simple-reliable-control.md` 当前只有 compatibility notice，active guidance/navigation 已全部指向 `guidelines/evolution-simple-reliable-control.md`。Apply 将：

1. 删除 notice 文件；
2. 不修改 `_backlog/_done/_closed_plans/` 或 `openspec/changes/archive/`；这些位置中的旧路径、旧链接和 notice决策保持为历史记录，通过 Git history定位当时文件；
3. 增加静态 audit，要求 active guidelines、active backlog、其他 active OpenSpec changes、framework docs与 tests中不存在非 `evolution-` old-path reference；本 change 中明确描述 deletion/migration contract 的文字是唯一 active allowlist，但不得作为 Markdown link、reading route、sibling或 design-principle target；closed/archive历史目录明确排除在 current-navigation检查之外。

这明确 supersede v0.21 的 compatibility decision：历史可通过 Git 与 archived change理解，不再为了历史链接继续可点击而让当前 repo保留一个容易被误认为第三份 guidance 的文件。

替代方案：继续保留 notice。拒绝原因：用户已明确要求 current surface只保留两条 Evolution Directions；notice虽无 authority，仍增加搜索和入口歧义。

### 12. OpenSpec config 强制 paired evolution review

`openspec/config.yaml` 的 `context` 增加简短 `Evolution Directions` 段，不复制两份 guideline全文，只固定加载路径和两条 admission obligation：

- **Simple Reliable Control**：先找 direct Source of Record和最短合法闭环；新增 state/check/validator/fallback/retry/recovery path必须说明删除、合并或避免了什么旧复杂度，不能以“更可靠”为由只往上堆。
- **Helper-Oriented Agent**：用户拥有新语义、风险和权限决定；Agent拥有已授权机械执行与可逆 repair；Engine拥有确定性 verdict；human-directed只说明决定来源，不创造权限、override或缺失 runtime capability。

`rules.proposal` 增加两项短要求：说明 net simplification impact；说明 decision/execution responsibility。`rules.design` 要求 architecture、recovery、mutation、Agent/user responsibility 变更 paired-read 两份 direction，并在 apply target manifest 中标出新增/删除的 control surface。

新增 focused static regression 只检查 canonical paths与少量稳定 obligation markers，不把两份 guideline prose复制成庞大 substring taxonomy。

替代方案：仅在 Project Charter保留链接。拒绝原因：OpenSpec artifact instructions直接消费 `openspec/config.yaml`；若 config不携带该方向，后续 proposal容易再次只按局部功能堆叠机制。

## Risks / Trade-offs

- [Canonical path pattern 过窄，误报合法历史 bundle] → 只对当前 active canonical patterns blocking；legacy/unknown presentation 默认 warning，并用 explicit identity/authority evidence 才升级。
- [Canonical path pattern 过宽，漏掉平行 namespace] → incident fixture 同时覆盖 registry 外 identity、durable output 和 supporting cache，不依赖 `addendum` 专名。
- [Topic grouping 隐藏有价值细节] → 每个 grouped finding保留 supporting details与原 per-file findings；只有 primary advice按有界 precedence收敛。
- [Reachability check 变成第二套路由器] → 只调用现有 transition/handoff helpers，返回可达/不可达事实；不选择业务 branch。
- [Cache contract refactor意外扩大 submit semantics] → 先用 characterization tests锁定 default-policy 与既有 degraded/content cases；有意行为修复仅限于 base files不可被 assigned additions移除，以及五个既有 mapping fields统一被各 consumer识别，不扩大 cache authority或 policy assignment authority。
- [Bold tolerance过度宽松] → 仅剥离 balanced wrapper，canonical field/enum/ref checks保持不变。
- [check-reentry additive output破坏消费者] → 保留现有字段与 exit code，`recovery` 为 additive；controlled cases复跑 G30 existing cases。
- [基础 audit 被误认为 BUG-078/079 runtime 已修] → Proposal、spec、docs 和 backlog status 明确只读；BUG-079 只能更新为 detectable/partial，BUG-078 保持 open。
- [删除 notice 使历史链接不再可点击] → closed/archive保持不可变历史并明确从 current-navigation audit排除；archived change与 Git history继续解释旧路径和被删文件。
- [Config 规则变成长篇重复 guidance] → 只保留 canonical links、两条 admission obligation和稳定 marker regression，详细判断仍回到两份 evolution guideline。

## Migration Plan

1. 先补 characterization tests，锁定现有 file observability、reentry output、Wave0 inspect、return-map 与 cache validation行为。
2. 抽取 cache contract 与 pure canonical-footprint/reachability helpers，不接入 CLI；先验证 bounded grouping与blocking adapter。
3. 接入 file observability 与 `check-reentry` additive recovery summary，保持旧字段/exit code。
4. 修正 Wave0 metadata boundary 与 return-map presentation normalization。
5. 更新 Agent-facing cache/inspect guidance 与 static drift tests。
6. 删除旧 simplicity notice、确认 active navigation无旧路径、更新 OpenSpec config paired review，并运行 focused static audit；closed/archive保持不变。
7. 增加 G30 incident case，复跑现有 G26/G30 与 focused regressions。
8. 更新 v0.22 changelog/banner、registry，并通过 OpenSpec/governance validation。

回滚时可移除 additive recovery summary 和新 helper wiring，恢复旧 parser/cache helper实现；本 change不迁移或写入 bundle authority state，因此不存在 runtime data rollback。

## Open Questions

无阻塞性开放问题。Apply 必须遵守已确定边界：没有 explicit topic identity 的 unknown final subtree 默认 warning，更强 final identity binding 留给 C3；return-map presentation tolerance 只接受 balanced `**field**`。
