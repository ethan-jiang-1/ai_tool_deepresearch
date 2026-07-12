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

- `canonical_topic_findings[]`
- `root_findings[]`
- `masked_finding_count`
- `sanctioned_path_status`: `reachable | missing_contract | not_applicable`
- `recommended_action`: 结构化 action 或 `null`

该结构使用 Zod schema，并通过 `.refine()` 保证：`reachable` 必须有 action，`missing_contract` 不得伪造 action，`root_findings[]` 只引用已存在 finding id。

替代方案：新增独立 integrity CLI。拒绝原因：它会复制 bundle loading、exit code、file observability 与 reentry target normalization，并让后续 Agent 不知道该先跑哪个 audit。

### 2. Canonical footprint audit 只比较显式 identity，不猜 topic

当前 audit anchor 是 `rb_plan.md#/topic_registry` 的 exact `id`/`slug`。新的 pure helper 从以下明确 topic-bearing surface 提取 identity：

- `seed_topics/<slug>.md` 或现行 accepted seed naming；
- `artifacts/wave0|wave1/<slug>/...` 与其他 manifest/spec 已定义的 topic directory；
- reference bullet metadata 中的 `related_topic`；
- final/reference durable surface 中已有明确 topic metadata 或 accepted path identity；
- queue/work-unit/output declarations 中的 explicit topic slug。

只有显式 identity 才能产生 `unregistered_topic_identity` 或 `dangling_topic_reference`。实现不得从任意文件名自然语言、标题相似度或目录序号猜 topic。

`durable_parallel_namespace` 使用 expected-root policy 判断：如果 `final/`、`reference/` 或 `artifacts/` 下出现承载正式结果、但不属于 accepted canonical pattern 且不是 ledger-backed/diagnostic/temporary surface 的 durable subtree，则报告 blocker。仅有 `_cache/` scratch 不构成正式 topic authority；只有它与 registry 外 durable reference/final/artifact output 形成唯一 backing 时才作为同一 root finding 的 supporting evidence。

替代方案：专门硬编码 `addendum` 字符串。拒绝原因：只能抓到一次事故命名，无法覆盖下一次平行 namespace。

### 3. Root-cause masking 在 helper 层完成，不靠 Agent 自己去重

Finding 使用稳定字段：

```text
id, rule_id, classification, surface, topic_identity,
root_cause_id, masked_by, detail, repair_kind
```

当 registry 外 topic 同时导致 missing seed、missing wave dirs、dangling reference 与 final namespace drift 时，`unregistered_topic_identity`/`durable_parallel_namespace` 作为 root；依赖它的下游症状进入 `masked_by`，不重复生成多条 primary advice。原始 findings 仍保留用于诊断，`root_findings[]` 只投影最近可行动作所需根因。

替代方案：删除下游 findings。拒绝原因：会损失 forensic detail，无法解释修复后为什么需要 rerun audit。

### 4. Advice 由结构化 action + reachability result 渲染

本 change 不解析既有 prose advice。对本次触及的 recovery/reentry deterministic branch，helper 先构造 action descriptor：

```text
kind: rerun_gate | enter_phase | repair_surface | report_missing_contract
target_ref
preconditions[]
```

对于 `rerun_gate` / `enter_phase`，复用现有 transition、handoff/status-window helpers 做 read-only reachability assessment。只有 assessment 通过才渲染执行命令；如果 predecessor 本身会被当前 handoff preflight 拒绝，则输出 `report_missing_contract`，指出缺失 runtime capability，不再建议循环调用同一 predecessor。

该规则只适用于 Engine 能确定可达性的 action；语义 repair strategy 仍由 Agent 选择。Engine 不生成多阶段恢复计划。

替代方案：对所有 advice 文本做 regex 检查。拒绝原因：脆弱、无法证明真实 route，且会形成新的 prose validator。

### 5. Wave0 metadata block 以首个 H2 semantic section 为边界

`inspect-wave0-output.mjs` 将读取首个 `^##\s+` 之前的内容作为 metadata region，因此允许文件先有一个 H1 title。Metadata 仍只接受 bullet `- key: value`，不扩大为 YAML frontmatter 或 bare YAML keys。Section 检查继续扫描 H2 headings。

替代方案：要求 reference 文件不得有 H1。拒绝原因：H1 是无害展示，且 shared template 当前示例包含 H1。

### 6. Return-map parser只容忍字段名的 balanced bold wrapper

在逐行 field match 前，对 `**evidence_meaning**:`、`__relationship__:` 这类 balanced emphasis wrapper 做窄归一化，映射回既有五个 canonical fields。字段拼写、枚举、refs 和 entry boundary 规则不改变；不引入 Markdown parser，也不容忍任意装饰或 misspelling。

为了保持现有 Markdown 实际使用，初始 accepted wrapper 限定为 balanced `**...**`；是否支持 `__...__` 在 apply audit 中由当前 producer examples 决定，若没有真实使用则不扩张。

替代方案：文档明确禁止 bold 但 parser 仍失败。拒绝原因：纯 presentation drift 不应成为 blocking contract，且已有 bug 证明 Agent 容易自然生成 bold label。

### 7. Cache leaf contract 使用 Engine constants + Zod projection

新增或抽取一个窄 cache contract module，拥有：

- required leaf files：`websearch.json`、`page.md`、`meta.json`；
- source mapping fields：`url`、`source_url`、`final_url`、`fetched_url`、`source_slug`；
- page substantive/degraded classification 所需的 canonical meta/page signals；
- `CacheLeafMetaSchema`，允许既有额外 metadata，但 `.refine()` 要求至少一个 source mapping field；
- pure `inspectCacheLeaf()`/equivalent result，供 submit validation 与 gate/depth helpers复用。

Agent-facing docs 不能在 runtime import JS，因此使用现有 static regression 读取 exported constants/schema vocabulary，与 `shared-subagent-protocol.md`、shared anti-cheating guidance 和 cache README/template 的 required markers 比较。这样 executable contract 只有一个 owner，文档漂移会在测试中失败。

替代方案：从 Markdown 生成 runtime validator。拒绝原因：把 Agent-facing projection变成 Engine authority，违反层级边界。

### 8. Controlled proof 扩展现有 G30 family

在 `experiments_playbook/exp_reentry-debuggability/` 增加一个 incident-shaped light/standard case：创建 registry 内正常 topic 与 registry 外 durable topic output、悬空 `related_topic`、平行 final/reference namespace，以及 terminal handoff 下不可达的 HITL2 advice context；运行真实 `check-reentry`/inspect 路径，证明：

- root finding 收敛，不产生级联 primary advice；
- parallel durable output 不获得 authority；
- advice 报 missing contract 而非循环 predecessor command；
- before/after bundle snapshot 无 authority mutation。

Wave0 metadata、return-map bold 与 cache contract drift 使用 focused regression；不把所有 parser case 塞进 controlled E2E。

## Risks / Trade-offs

- [Canonical path pattern 过窄，误报合法历史 bundle] → 只对当前 active canonical patterns blocking；legacy/unknown presentation 默认 warning，并用 explicit identity/authority evidence 才升级。
- [Canonical path pattern 过宽，漏掉平行 namespace] → incident fixture 同时覆盖 registry 外 identity、durable output 和 supporting cache，不依赖 `addendum` 专名。
- [Root masking 隐藏有价值细节] → 保留完整 findings，仅 primary summary/advice 使用 root projection。
- [Reachability check 变成第二套路由器] → 只调用现有 transition/handoff helpers，返回可达/不可达事实；不选择业务 branch。
- [Cache contract refactor改变 submit semantics] → 先用 characterization tests锁定当前 accepted/rejected cases；本 change 只统一 owner，不扩大 cache authority。
- [Bold tolerance过度宽松] → 仅剥离 balanced wrapper，canonical field/enum/ref checks保持不变。
- [check-reentry additive output破坏消费者] → 保留现有字段与 exit code，`recovery` 为 additive；controlled cases复跑 G30 existing cases。
- [基础 audit 被误认为 BUG-078/079 runtime 已修] → Proposal、spec、docs 和 backlog status 明确只读；BUG-079 只能更新为 detectable/partial，BUG-078 保持 open。

## Migration Plan

1. 先补 characterization tests，锁定现有 file observability、reentry output、Wave0 inspect、return-map 与 cache validation行为。
2. 抽取 cache contract 与 pure canonical-footprint/reachability helpers，不接入 CLI。
3. 接入 file observability 与 `check-reentry` additive recovery summary，保持旧字段/exit code。
4. 修正 Wave0 metadata boundary 与 return-map presentation normalization。
5. 更新 Agent-facing cache/inspect guidance 与 static drift tests。
6. 增加 G30 incident case，复跑现有 G26/G30 与 focused regressions。
7. 更新 v0.22 changelog/banner、registry，并通过 OpenSpec/governance validation。

回滚时可移除 additive recovery summary 和新 helper wiring，恢复旧 parser/cache helper实现；本 change不迁移或写入 bundle authority state，因此不存在 runtime data rollback。

## Open Questions

- Apply audit 若发现现有 final topic identity 没有任何 accepted explicit metadata/path contract，C1 应只把 unknown final subtree分类为 warning，并把更强 identity binding留给 C3；不得在本 change 发明 future final naming authority。
- `__field__` wrapper 只有在当前 producer docs或真实 fixture存在时才纳入 accepted tolerance；默认只承诺 `**field**`。
