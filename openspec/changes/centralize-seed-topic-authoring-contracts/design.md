## Context

前置 change `restore-section-scoped-seed-projection-contract` 已让 Wave inspect 按目标 section 和 current-round authority 检查 seed projection，但 producer contract 仍有两类分散：

1. 完整 seed skeleton/appendix 同时存在于 `phase-seed-topics.md` prose 与 `canonical-topic-state.mjs` renderer；Wave、shared schema、role guidance与generated work-unit cue又分别解释token/entry fields。
2. rerun direction canonical example只在`phase-rerun.md`，shared resolver只解析`rerun_count`，topic-state apply提交plan/seed canonical intent后仍由Agent另行直写direction。`add_topic` commit与direction write之间崩溃时，没有durable affected-topic fact可让Gate知道新seed完全漏写了direction。

`rb_plan.md#/topic_registry` 继续拥有Topic identity/intent，`rb_profile.yaml`继续拥有recorded HITL2 rationale与round，submitted ledger/index/finding facts继续拥有evidence projection demand。Shared authoring Markdown与seed direction都是Agent-readable contract/projection，不成为新的topic/evidence authority。

本设计paired-read `guidelines/evolution-simple-reliable-control.md`与`guidelines/evolution-helper-oriented-agent.md`。结论是：presentation宽容、required structure严格；复用既有topic-state transaction和rerun-ready Gate；用户提供rerun语义，Agent形成candidate并执行修复，Engine只校验结构/原子发布/确定性verdict。

## Goals / Non-Goals

**Goals:**

- 用两个按消费边界加载的shared nodes分别集中seed skeleton/direction与return-map authoring，避免一个大context污染所有Wave。
- 保持JS seed renderer为纯实现，用stable structural manifest锁定appendix headings/tokens。
- 让sanctioned rerun direction candidate随既有topic-state plan+seed workspace原子发布，关闭mutation commit后direction漏写窗口。
- 支持不改变canonical intent的direction-only supplement，不伪造`update_intent`。
- 扩展一个shared direction parse/evaluate path，使canonical write唯一、legacy read宽容、current/future structure fail-closed。
- 在既有rerun-ready Gate复核plan-bound current seeds；future完整candidate仍须回到profile count owner，不能路由前进。
- 删除phase-local完整模板与Wave consumer本地action regex，实现净简化；版本提升至v0.36。

**Non-Goals:**

- 不改`RRM-007` projection authority、Wave formal Gate ownership或return-map semantic judgment。
- 不重命名seed headings，不重新注入token，不迁移历史bundle。
- 不创建Markdown template engine、format registry、通用output linter、第二renderer、生成缓存或runtime template copy。
- 不创建affected-topic persistent state，不从chat/rationale猜应受影响Topic。
- 不让Engine生成或评价search dimensions/depth/guardrails/rationale语义。
- 不新增CLI、Gate family、state transition、trace event、自动repair或用户交互点。
- 不声称rerun-ready可独立证明Agent已经把本轮rationale完整映射为topic actions；正常Agent Flow仍必须执行recorded rationale -> retained topic-state input。要机器证明该absence，需要独立durable operation-intent contract，不在本change扩张。

## Decisions

### 1. 两个focused shared nodes代替一个大模板

新增：

- `shared/shared-seed-topic-authoring.md`：完整initialization skeleton、appendix heading/token skeleton、canonical rerun-direction fragment、Source-of-Record boundary；由`phase-seed-topics`和`phase-rerun`加载。
- `shared/shared-return-map-authoring.md`：Wave-to-section ownership、token lifecycle、canonical five-field entry、ref hierarchy和same-inspect repair；由`phase-seed-topics`、`phase-wave0/1/2`及实际产出return-map的role nodes加载。

Phase body只保留decision-point-specific authority、命令顺序和简短引用。`shared-schemas.md`保留路径/schema摘要并指向authoring contract，不再维护完整generic entry示例。

Generated work-unit `task.md`与spawn prompt不走workflow `requires` loader，必须保持自包含。它们可以保留最短五字段cue与authority disclaimer；static parity test将字段集/边界与shared return-map contract对齐，但不让runtime JS解析Markdown。

选择两个nodes而非一个，是因为Wave不需要反复加载完整initialization/direction模板，rerun也不需要加载Wave evidence示例。两者仍各自只有一个complete definition。

### 2. Renderer保持纯函数，parity只比较稳定manifest

`renderNewSeedBody()`继续由topic-state helper纯确定性渲染，不runtime读取shared Markdown。Focused test从shared seed authoring与renderer output抽取：

- ordered canonical appendix H2 headings；
- accepted one-time token set及owning heading；
- boundary heading presence。

不比较prose bytes、空格、YAML field order或gap wording。这样可捕获contract drift，不把Agent guidance变成脆弱template language。

### 3. Direction candidate进入既有topic-state action transaction

现有topic-state action list扩展而不新增CLI/operation：

- rerun `add_topic`：保留canonical add fields，并要求`direction` candidate，mapping必须为`add`；
- rerun `update_intent`：保留complete canonical intent fields，并要求`direction` candidate，mapping必须为`supplement`；
- new `set_rerun_direction`：`topic_uid + direction`，用于只改变search/depth guidance、不改变registry intent的existing Topic，mapping必须为`supplement`；
- HITL1 add/update不携带direction；layout-only mutation保持body/direction，不生成新direction。

Focused Zod schema定义candidate：nonnegative `rerun_count`、closed `action: add|supplement`、四个non-empty guidance strings。Cross-field `.superRefine()`校验：

- direction count等于当前accepted profile count + 1；
- action/direction mapping一致；
- ordered action list中一个existing UID最多一个target，不能update+direction-only重复；
- rerun add/update必须有candidate，HITL1不得带candidate；
- `set_rerun_direction`只在sanctioned rerun可用。

Agent从recorded rationale形成candidate；Engine不生成/补全/比较语义。结构校验发生在workspace publication前。

### 4. Existing workspace原子发布direction，不新增affected-topic state

Topic-state renderer在staged seed中replace exactly one canonical `## 本轮重跑方向` section：

- new add seed = canonical skeleton + candidate direction；
- update-intent = preserved body/enrichment + replaced direction + canonical frontmatter changes；
- direction-only = unchanged registry/other seed bytes + replaced direction；
- layout-only = preserve direction/body。

Prepared manifest仍只拥有`rb_plan.md`和explicitly touched current seeds。Direction candidate bytes、input hash和affected UID随existing manifest/workspace进入durable recovery。Plan byte-identical时仍可作为expected/unchanged replacement contract；只有plan和touched seed including direction都相同才返回`unchanged`。

这关闭了“topic mutation committed，direction尚未直写”的窗口。它不新增derived state，也不让seed direction成为topic authority。Workspace accepted后只允许existing exact recover；publication前失败由retained input fresh apply。

### 5. 一个parser result服务topic-state validation、Wave classification与Gate复核

在现有Wave contract helper ownership附近建立focused pure parser/evaluator，输出：

```text
sections[]
selected_section
fields
duplicate_fields[]
extensions
state: matching|stale|future|legacy_unbound|invalid
structural_roots[]
```

Parsing容忍heading suffix、optional bullet、balanced asterisk-bold label；收集全部section/field occurrences，不按file order选赢家；unknown non-conflicting extensions保留。No section与compatibility section without count都可分类`legacy_unbound`，但no section不提供action；present malformed/ambiguous为`invalid`。

Topic-state input可直接对structured candidate schema验证，再使用同一canonical render/parse result做round-trip assertion。Wave classification和`checkRerunAddFullSynthesis()`消费normalized fields，删除本地`action:add` regex：matching可激活；stale/future/invalid不激活；legacy section without count保留pre-v0.29 action compatibility；no section无action。

### 6. Rerun-ready只检查plan-bound current seeds并保持prerequisite masking

在现有`gate-rerun-ready.definition.json`增加一个`rerun_direction_structure` rule/check，CLI dispatch复用：

- `buildCanonicalTopicRegistryFact()`决定current seed set；不`readdir(seed_topics)`推断scope；
- `evaluateCanonicalSeedBindings()`做focused UID/slug/id/title/must_answer/scope/dependency binding；不调用full topic-state progress/workspace inspect；
- profile/rationale/plan/seed-binding prerequisite失败时先报owner root并mask direction symptoms；
- orphan seed和historical filename不进入direction authority；
- matching direction验证结构；current/future duplicate先报cardinality root；
- malformed future先报field root；complete future且count==profile+1后仍返回count-sync root；future>profile+1为invalid；
- stale/legacy-only presentation不触发migration blocker。

Finding沿用`makeContractFinding()`/`buildGateResult()`：seed field用`agent_action`和sanctioned topic-state input/seed coordinate；complete future用现有phase-rerun profile count owner和same Gate rerun；canonical seed binding保留`missing_contract` owner。Gate继续拥有attempt/trace/routing，不新增inspect CLI。

### 7. Future不是可pass state

Direction transaction先commit，profile count后increment是既有顺序。完整future direction只证明candidate transaction已commit，不是current direction：

```text
profile = N, direction = N+1 complete
  -> rerun-ready FAIL: synchronize profile through existing phase-rerun owner
profile = N+1, direction = N+1 complete
  -> matching; direction subcheck may pass
```

Malformed future先修seed candidate，再increment。Accepted topic-state workspace先exact recover。旧matching/stale direction不能证明新rationale已materialize；phase必须重新形成retained input。这是明确的honesty boundary，不用旧direction猜本轮完成。

### 8. Apply target manifest and net simplification

预计新增：

- two focused shared authoring nodes；
- `set_rerun_direction` action及direction candidate schema/renderer integration in existing topic-state owner；
- one shared direction parse/evaluate result；
- one existing rerun-ready definition rule/dispatch branch；
- focused unit/integration/E2E assertions。

预计删除/收敛：

- phase-seed-topics完整skeleton副本；
- phase-rerun完整direction template副本与post-apply direct-write step；
- Wave/shared-schemas完整generic return-map template副本；
- `checkRerunAddFullSynthesis()` action-local regex；
- topic-state commit后Agent另行直写direction的crash gap；
- Agent跨多个文件拼装canonical shape的隐含工作。

明确避免：new state、new CLI/Gate family、template engine、linter registry、auto repair、migration tree、semantic scoring、directory-derived seed scope。

Simplicity admission：最短闭环是recorded rationale -> Agent retained topic-state input -> one existing transaction -> existing profile count owner -> one shared parser -> existing rerun-ready Gate。新增一个action variant和one rule替代direct write、local regex及多份模板，并关闭真实crash gap。

Helper direction：用户决定rationale；Agent形成candidate/执行apply/recover/count/repair；Engine验证schema、atomic bytes和Gate root。普通field/count repair不升级给用户；仅existing missing rationale/semantic decision保持user boundary。

## Risks / Trade-offs

- [Shared Markdown与renderer仍是两种表示] -> parity只锁stable manifest，避免runtime template parser。
- [Two shared nodes增加一个file] -> each node对应不同requires consumers，减少每个Phase上下文；禁止两者重复complete template。
- [Static duplicate-template test可能脆弱] ->抽取canonical markers/field set，不比较自然语言或空格。
- [Topic-state schema扩展影响HITL1] -> direction字段按context conditional；HITL1 existing inputs保持合法且不得携带rerun direction。
- [Direction-only action可能被滥用为generic seed patch] -> schema只接受closed direction object/exact UID；renderer只替换one canonical section；无arbitrary body/path input。
- [Gate扫描历史presentation误报] -> only plan-bound canonically bound current seeds；presentation tolerant；stale/legacy不迁移。
- [Gate无法证明Agent完整映射本轮rationale] ->如实不claim；atomic action保证一旦sanctioned input accepted，affected direction不会漏写。Generic intent receipt另change处理。
- [Profile count仍由现有Agent-owned step写入] -> complete future明确block并返回该owner；本change不扩成profile mutation CLI。
- [Legacy-unbound action compatibility] -> preserve section-without-count behavior；no section no longer scanswhole seed foraccidental action text。

## Migration Plan

1. Apply前跑verification plan；先加failing schema/atomicity/parser/parity/reachability/Gate tests。
2. 新增two shared nodes并接入focused requires，删除phase-localcomplete duplicates。
3. 扩展topic-state input/render/workspace，验证HITL1 compatibility与rerun atomic add/update/direction-only/recovery。
4. 扩展shared parser，迁移Wave consumers并删除local regex。
5. 接入rerun-ready rule，验证canonical prerequisite masking、future count-sync和legacy tolerance。
6. 更新v0.36 docs，运行focused/full regression、governance、strict validation后archive；不改写真实/历史bundle。

Rollback可恢复phase prose，移除new requires/action/rule/parser fields。无runtime migration或new persistent state；已产生canonical direction仍被旧reader接受。已通过new action提交的plan/seed本身仍是existing legal bytes，不需data reversal。

## Open Questions

无阻塞问题。Apply若需要new persistent affected-topic/intent receipt、new profile mutation CLI或真实Agent compliance claim，必须返回explore/proposal修订。现有workflow validator若不能表达shared reachability/duplicate-template proof，优先扩展tests下的MD integration coverage，不新增production validator CLI。
