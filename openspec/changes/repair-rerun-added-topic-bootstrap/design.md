## Context

五个缺陷只在“正常 run 已经产生历史 topic/work-unit/provenance/reference 后，sanctioned rerun 再新增 topic”的增量路径集中出现。正常首次运行已经具备 seed-topics enrichment、Wave0/Wave1 queue fill、role-bound actor preflight、work-unit claim/submit、reference materialization 和 provenance/reference gate；本设计不能重写正常路径，也不能用 rerun mode 放宽 gate。

当前断点是一条连续链：

1. `canonical-topic-state.mjs#renderSeed()` 在没有 existing seed 时只写 title、`scope_role` 和 must-answer，rerun 新 topic 缺少可 enrich/回填的 canonical skeleton。
2. `phase-wave0.md` 没有在 rerun 决策点区分存量 historical coverage、`action:add`、supplement 与 orphan artifact，Agent 容易直接写 `source.yaml`。
3. Delegated demand 错用 `operate-queue claim` 会被正确拒绝；`operate-work-unit claim` 缺少本次 actor observation 也会正确零 claim。现有反馈与 rerun guidance 没有把两者和真正 empty queue 清楚区分。
4. 前三步走偏后，Agent 会尝试事后手工拼装 result/receipt 来追认 provenance。严格 submit binding 正确拒绝这种做法，但 generated task 目前没有 copy-ready result starter，Phase Agent fallback guidance也没有把现有 `dry-submit` 放在 formal submit 前的最近决策点，导致机械填写变成反复猜字段。同一 repair 过程中，06/07 的 generated `task.md` 已携带正确 absolute bundle root，但 `_beacon.json` 被覆盖成相对 `bundle_dir`；Agent随后从 active bundle内再次解析同名相对 `--bundle`，形成空的 `<bundle>/<bundle>/_work_units/_transactions`。`loadWorkUnitIndex(..., { createIfMissing:false })` 仍先创建目录，使错误 root 的只读/失败路径留下副作用。
5. 进入 Wave1 后，reference format helper 仍把 raw `related_topic` 当必填字段，file observability也独立扫描旧字段；与此同时，当前 `_INDEX.md` 的 prose list/count summary 不能满足 accepted eight-column table，但 row coverage仍继续制造逐文件缺行级联。UID migration、historical compatibility、index parent validation和gate/inspect/observability因此出现多份近似 truth。

Direct Source of Record：

- Topic identity/intent：`rb_plan.md#/topic_registry`
- Current seed projection：UID-bound `seed_topics/<current-slug>.md`
- Queue demand/in-flight：`rb_queue.json`
- Work-unit binding/actor/batch：`_work_units/_index.json`、manifest、beacon
- Active bundle root：Engine在CLI入口解析并规范化的 absolute root；immutable beacon拥有work-unit内的canonical root binding，task/spawn/command wording只做同值projection
- Actor-produced evidence：assigned output/cache/result/runtime receipt
- Submitted provenance：Engine-written `rb_output_declarations.jsonl`
- Reference topic binding：canonical UID/current/previous-layout resolver + one thin reference metadata adapter
- Reference navigation：accepted eight-column `reference/_INDEX.md` table；不是 topic authority
- Completion verdict：existing Wave0/Wave1 inspect/gate shared evaluator result
- Rerun semantic direction：recorded HITL2 rationale + seed `## 本轮重跑方向` Agent-facing projection；不替代 Engine authority

本设计已 paired-read `guidelines/evolution-simple-reliable-control.md` 与 `guidelines/evolution-helper-oriented-agent.md`。用户只决定新 topic 语义；Agent 负责 apply、enqueue、probe、claim、真实执行、dry-submit repair、formal submit 和 gate repair；Engine 继续拥有 mutation、binding、receipt、ledger 与 verdict。

## Goals / Non-Goals

**Goals:**

- rerun `add_topic` 原子提交后立即存在结构完整、可由 seed-topics enrich、可由 Wave0/Wave1/Wave2 精确回填的 canonical seed skeleton。
- Wave0 rerun 只为本轮真正需要 work 的 topic 建立 demand：存量合法 coverage 复用，新 topic 走首次运行相同 delegated path，supplement 走显式 supplementary demand。
- 错误 claim 入口、missing actor observation 与真正 empty queue 给出不同根因和一个最近动作；合法 rerun demand 在历史 batch 后仍由现有 allocator 分配到下一 batch。
- Generated work-unit task、immutable beacon、spawn/claim output 与 command examples 对同一 canonical absolute bundle root达成一致；absolute paths直接使用，bundle-relative refs只join一次；错误nested root在确认existing authority前不创建目录。
- Generated work-unit task 为真实 delegated/fallback actor 提供 exact-binding result starter；Phase Agent fallback/repair 先跑 side-effect-free dry-submit，一次读取可独立评估的 violations，再 formal submit。
- Historical reference 的 UID/legacy metadata通过同一resolver绑定；invalid index parent先短路row cascade；新topic继续走正常Wave1 materialization，旧covered reference无需mass rewrite。
- 用 focused regression 和 real-Agent controlled evidence 证明五个断点关闭，同时证明正常首次运行没有退化。

**Non-Goals:**

- 不修改 Wave0 gate definition/evaluator，不新增 rerun provenance 例外。
- 不让 `add_topic` 自动写 queue、打开 batch、分配 work ID、创建 work-unit 或写 ledger。
- 不新增 rerun state、created-at、availability cache、override flag、fallback queue、retry controller 或第二 lifecycle。
- 不新增 `__FILL_*__` 或通用 `__BACKFILL_EVIDENCE__` token。
- 不让 submit 仅凭 `summary + output_files` 自动补齐所有 actor/provenance binding。
- 不允许 envelope 外完成的 artifact 事后通过手写 result/receipt 获得 provenance。
- 不迁移历史 artifact/reference/cache path，不自动修补现有 production bundle。
- 不放宽八列 `_INDEX.md`、submitted backing或Wave1 gate floor，不接受prose list作为machine inventory。
- 不自动删除当前真实bundle中的空nested目录，不通过cwd/repo扫描猜测active bundle，也不新增第二套path registry/resolver。
- 不把 Agent 的 search/source judgment 搬进 JS。

## Decisions

### 0. Rerun只分类，新增Topic走正常pipeline

Rerun不拥有独立执行语义。Phase Markdown从direct facts只做三类分类：

```text
existing topic + valid coverage -> reuse historical coverage
new topic + no coverage         -> run the normal topic pipeline
supplement                       -> create normal supplementary demand
```

分类之后立即回到现有seed enrichment、queue/work-unit、submit、reference materialization和gate checkpoint。JS/CLI不新增rerun controller、mode、persisted classification或route；classification本身不修改authority。这样修的是正常机制在增量入口的断链，而不是为五个症状再搭一条旁路。

### 1. 新 seed skeleton 由现有 topic-state renderer 生成

在 `canonical-topic-state.mjs` 内收敛现有 renderer：

- 新 projection（`add_topic` 或 `migrate_legacy seed_binding:new` 且无 existing seed）生成 canonical UID/intent frontmatter、显式 gap-valued enrichment keys、seed-topics 初始化 headings、轮次追加区与精确 wave token：
  - `__BACKFILL_WAVE0_EVIDENCE__`
  - `__BACKFILL_WAVE1_MECHANISMS__`
  - `__BACKFILL_WAVE1_TRENDS__`
  - `__BACKFILL_WAVE2_JUDGMENT__`
  - `__BACKFILL_PENDING_QUESTIONS__`
- `scope_role` 只留在 canonical frontmatter，不再伪装成主题定位正文。
- Existing projection 重渲染时，registry canonical keys覆盖对应 frontmatter keys；非 canonical enrichment keys和正文保留。

不建立 `rb_templates/seed_topic.md.tmpl`。`rb_templates/` 是 bundle instantiation surface，这里是 runtime topic mutation；额外模板文件会增加路径/读取失败面且不能替代 Agent-facing phase semantics。

不按 rerun context 渲染另一种 seed。共享 new-projection renderer 对 HITL1 是兼容性增强，避免两套 skeleton drift。

### 2. Wave0 rerun demand selection 留在 Markdown/Agent Flow

`phase-wave0.md` 增加稳定 Rerun-Aware Behavior，从直接事实分类：

- `action:add` 且没有 current queued/in-flight/submitted Wave0 coverage：创建标准 `wave0-source-{topic.slug}` demand，kind/producer/role/cache contract 与首次运行一致。
- 存量 topic 有合法 current/previous-layout submitted coverage 且无 supplement intent：不重复 enqueue。
- `action:supplement`：使用现有 supplementary demand ID 与同一 work-unit path。
- 已存在但未声明的 `source.yaml`：不得当作 coverage；必须通过新 claimed attempt 真实重做并 submit，或按现有 artifact owner反馈处理。不得追认旧文件。

Agent 在 claim 前读取 queue-front role、做一次 bounded native probe并把完整 observation传给 `operate-work-unit claim`。Delegated demand禁止用 `operate-queue claim/complete`。

不采用 `add_topic` 自动 enqueue：topic-state workspace当前只拥有 plan+seed，跨写未来 phase queue会把 semantic mutation与 later demand混成一个 owner。

不采用 rerun-aware Wave0 gate：现有 gate已正确接受历史 submitted coverage并拒绝新 topic orphan output，缺口在 producer guidance。

### 3. Claim 只增强诊断 projection；batch allocator保持不变

`operate-queue claim` 遇到 delegated front item时继续 fail closed、`item:null`、queue bytes不变，但增加：

- `reason_code: delegated_requires_work_unit_claim`
- `blocked_by_queue_item_id`
- 一个 `recommended_action`：做本次 role probe后运行 `operate-work-unit claim`
- 保留现有 check/inspect/advice

真正 empty active window返回不同 reason。这些只是直接 queue-front fact的只读 projection。

`operate-work-unit claim` actor-preflight保持现行 contract：missing/unknown observation零 claim、零 authority mutation、一个 probe-then-rerun动作。历史 b000/b001 batch分配保持 `_work_units/_index.json` owner；仅增加 rerun regression。如果回归在未改 allocator时已通过，不重写 allocator。

### 4. Work-unit envelope提供 canonical root与result starter，不放宽 submit binding

Work-unit claim入口把active bundle解析为canonical absolute root；generated `_beacon.json`、`task.md`、spawn prompt、claim continuation与task内CLI examples必须投影同一个值。`_beacon.json#bundle_dir`不得是repo-relative、cwd-relative或仅bundle basename。Task里的absolute runtime paths直接用于I/O和CLI `--bundle`；manifest/result/ledger里的bundle-relative refs只相对canonical root解析一次，不得先拼接bundle basename再join，也不得把`<bundle>/<bundle>/...`当兼容成功路径。

Beacon继续是Engine-owned binding surface。Actor只读beacon，不得覆盖、补字段或手工“修复”；dry-submit、formal submit与inspect复用同一beacon evaluator，将`bundle_dir`与当前Engine-resolved root比较，并将其余字段与index/manifest/contract-derived expected value比较。相对root、root mismatch或其它beacon drift必须在ledger/queue/result canonical write前fail closed；最近动作是使用task中absolute root重跑同一check，若beacon本身已损坏则通过现有legal terminal/reclaim路径获得新envelope或报告缺失repair contract，而不是手写beacon。

Existing-authority读取也要遵守prerequisites-before-side-effects：`loadWorkUnitIndex(..., { createIfMissing:false })`以及inspect/dry-submit/submit/rejection preflight在确认canonical existing work-unit root/index前不得创建`_work_units`、`_transactions`、lock、trace或log。只有显式create/claim path在已验证active bundle后可以初始化work-unit目录。这样从bundle内误传同名相对bundle参数时会返回root/index缺失及一个absolute-root动作，而不会留下空nested bundle。

`work-unit-envelope.mjs` 在 generated `task.md` 中新增 `Result JSON Starter` code block。Starter从 manifest/output contract纯投影，包含：

- exact `schema_version: work-unit.result.v1`
- exact `work_id`、`queue_item_id`、`kind`、`receipt_nonce`
- actor-aware claim的 exact `actor_contract_version`、`execution_actor_class`
- `summary` 与当前 kind允许/要求的 `output_files`、`source_claims`、`accepted_source_urls`、`cache_trails` 空骨架

Starter明确禁止 `actor_execution` 等不属于 result schema的字段。它不是 result authority、receipt或完成证据；真实 actor必须复制/填写到 assigned `result.json`，写真实 outputs/cache/runtime receipt。

同一 `task.md` 还从 manifest 的 output contract 与 cache policy 生成一份简短 pre-submit checklist，明确：canonical absolute `bundle_dir`必须用于所有I/O和work-unit CLI command；absolute path直接使用，bundle-relative ref只join一次；manifest/beacon/schema/status 不可被 actor 覆盖；actor-aware runtime receipt 必须携带 `actor_contract_version` 与 exact `execution_actor_class`；`output_files[].role` 必须来自当前 kind 的 allowed roles 并满足 required path-role binding；`cache_trails[]` 只声明 leaf directory；每个 leaf 的 `websearch.json` / `page.md` / `meta.json` 形状，以及 `meta.json.url` 与 declared `source_url` / source claim 的映射必须一致。这里不复制一套 validator 逻辑，文本由现有 executable contract 投影。

不新增 `scaffold-result` CLI，也不预写 assigned `result.json`。前者增加命令面，后者会让 timeout/progress检查把空模板误认作 candidate progress。把 starter放入现有 `task.md` 是最短 helper surface。

不采用 submit最小化自动补齐所有 binding。Manifest/index是 actor authority，但 accepted result/receipt contract仍要求 actor class/nonce显式一致；冲突必须 fail closed。

### 5. Phase Agent fallback/repair使用 dry-submit作为同一 checkpoint

更新 `shared-subagent-protocol.md`、Wave0 guidance和 existing actor decision playbook：

- Phase Agent fallback从 generated task/beacon/schema/starter开始，不能凭聊天记忆手写。
- 所有work-unit CLI调用直接使用generated absolute `bundle_dir`；不得依赖当前cwd、bundle basename或再次拼接同名bundle目录。
- 完成真实 work后先运行 `operate-work-unit dry-submit`。
- 读取 `violations[]` 与 `repair_target`；修复同一 assigned result/receipt/output/cache，重跑同一个 dry-submit。
- dry-submit pass后立即 formal submit。
- formal submit若因 candidate validation拒绝，最近动作是对同一 candidate跑 dry-submit，而不是连续 formal-submit猜字段。
- native Sub-agent正常结果可直接 formal submit；一旦 reject，repair也回到 dry-submit。
- dry-submit不写 ledger、不完成 queue、不满足 gate；formal submit仍是唯一成功 transition。

`dry-submit` 已累积可独立评估的 violations；前置 result schema错误导致的依赖短路继续诚实报告，不伪造下游诊断。

### 6. Reference binding与index validation复用正常Wave1契约

在现有 `topic-layout.mjs` pure resolver上增加一个thin reference adapter，不建立第二identity map：

- `related_topic_uid`接受一个exact registered UID或`all`。
- legacy `related_topic`继续接受`all`、comma-separated exact current/previous id或slug；unpadded ordinal仅在能唯一归一为canonical id时兼容。
- 两个字段同时存在时必须解析为同一UID set或同一`all` sentinel；否则返回一个binding conflict。
- historical covered reference保持原bytes/path，不因rerun要求mass rewrite；new topic使用current layout和正常Wave1 producer/materialization。

`checkReferenceFormatFiles`、Wave1 inspect/gate、Wave0/Wave2 reference advisory与file observability都消费adapter result，不再各自硬编码required raw field或regex identity list。Reference format仍要求八个common metadata fields、五个semantic sections和一个resolvable topic binding；这是tolerant compatibility input，不是放宽authority。

`readReferenceIndexRows`先验证accepted eight-column table parent。Missing file、无table、缺required columns或unparseable table返回一个`reference_index_table_invalid` root与`reference/_INDEX.md` repair target；同轮不继续为每个reference生成`missing_index_row`。父表修复后，missing row和wrong `source_layer`继续blocking。这个短路用existing evaluator内的local guard实现，不新增dependency engine或gate rule。

Formal Wave1 gate与side-effect-free inspect复用同一reference format/index evaluator result；formal wrapper保留existing gate-attempt/trace side effect owner。File observability只复用binding adapter，不把index或reference metadata升级成provenance authority。

### 7. Verification与 apply target manifest

Focused regression：

- Topic-state helper/CLI：完整新 seed、精确 token、无 scope-role伪正文、existing enrichment保留、normal HITL1不退化。
- Queue/work-unit：delegated queue-claim与empty可区分；missing observation无写；历史 batch后合法 claim分配b001。
- Envelope/path/submit：beacon/task/spawn/CLI examples共享exact absolute root；relative/root-mismatched beacon fail closed；错误nested bundle的inspect/dry-submit/submit不创建任何目录；actor-aware fallback task含 exact starter；starter填入真实 minimal fixture后 dry-submit可通过；错误 starter字段一次返回结构化 violations；formal rejection建议 dry-submit；actor冲突仍拒绝。
- Markdown：Wave0 rerun demand分类、正确 claim命令/actor flags、fallback starter/dry-submit、禁止 post-hoc provenance。
- Wave0 gate：rule set不变；旧合法 coverage + 新 submitted coverage pass，旧 coverage + 新 orphan output fail。
- Wave1 reference：normal legacy + valid table pass；UID-only + valid table pass；conflicting dual fields只fail一次；prose-list index只返回parent root；valid table缺一row只报该row；inspect/gate结果同源。
- Wave0/Wave2 inspect：UID-only shared/cross reference不再收到“缺related_topic”的false advisory；unknown/conflict仍返回shared adapter reason。
- File observability：UID-only reference不误报dangling/unregistered；legacy/UID与Wave1 gate共享binding outcome；dual conflict只有一个root finding。

Controlled evidence：

- 收敛现有 rerun `action:add` heavy real-Agent canary，从历史 normal-run fixture出发。
- 通过真实 sanctioned topic-state add创建新 seed；coding Agent读取更新后的 controller完成 enqueue/probe/claim。
- 新 topic actor使用 generated absolute root与task/starter，保持beacon bytes/semantic binding不变，写真实 result/receipt/output/cache，经 dry-submit和formal submit进入 ledger并通过Wave0；随后按normal Wave1 demand/materialization产出UID-bound reference和valid index row，再跑shared inspect/gate；结束时断言不存在same-name nested bundle。
- Historical covered references保持原path/metadata bytes即可被resolver读取；controlled run不得为通过rerun而批量改写旧references。
- Fixture只负责历史前置事实，不冒充新增 topic产出。
- PASS从 trace check裁决并清理；无真实 actor为NOT_RUN，不能当PASS。

| Surface | Apply action | Control impact |
|---|---|---|
| `canonical-topic-state.mjs` | 修改 renderer/merge | 无新 owner；删除薄 skeleton drift |
| `topic-layout.mjs` | 增加thin reference binding adapter | 复用CTS-007 resolver，无第二identity map |
| `phase-seed-topics.md` | 对齐 verify/enrich wording | 无新 phase/gate |
| `phase-wave0.md` | 新增 rerun decision-point instructions | 复用 queue/work-unit loop |
| `phase-wave1.md` | 对齐new-topic normal materialization与index repair wording | 无rerun Wave1 branch |
| `queue-manager-lifecycle.mjs` | 增加 claim reason projection | 只读，无 state/route |
| `work-unit-envelope.mjs` | 统一absolute root并在task内生成 result starter | 复用beacon authority，无新CLI/path owner |
| `work-unit-index.mjs` | existing-index读取先验证、后创建 | 删除read/failure mkdir副作用 |
| `work-unit-validation.mjs` | beacon root/full binding复用同一evaluator | 补齐existing authority校验，不建第二validator |
| `work-unit-submit.mjs` | rejection advice指向 dry-submit | 无 validator/submit authority变化 |
| `gate-helpers-checks.mjs` / `wave-contract-evaluators.mjs` | reference adapter + index parent short-circuit | 复用existing checks，无新gate rule |
| `inspect-wave0-output.mjs` / `inspect-wave2-output.mjs` | 删除local raw-field binding check | 保留existing advisory classification |
| `file-observability.mjs` | consume same reference adapter | 删除raw-field regex identity truth |
| `shared-subagent-protocol.md` | fallback/repair闭环 | 复用现有 dry-submit |
| tests/playbook | focused + real proof | 不新增 production checker |
| Wave0 gate/schema/state machine | 无修改 | 保持 direct authority |

新增 control surface：0 persistent state、0 gate rule、0 independent validator、0 queue/lifecycle/path/reference owner、0 retry/recovery command、0 submit success path。删除/避免：competing relative/absolute roots、read-path mkdir副作用、rerun gate分支、自动跨-owner enqueue、第二 token、blind formal-submit loop、post-hoc provenance、submit-minimal旁路、隐式 batch修复、Wave0/Wave1/Wave2 hard-coded legacy reference field readers、file-observability raw regex truth和index row cascade。

## Risks / Trade-offs

- [Seed skeleton与phase Markdown漂移] → regression断言同一 canonical headings/token set；renderer拥有初始bytes，phase拥有semantic enrichment。
- [Existing frontmatter merge保留旧 canonical值] → registry keys永远覆盖；仅保留非 canonical enrichment并测试update/layout。
- [Wave0重复 enqueue] → controller先读queue/in-flight/submitted direct facts；现有queue identity validation继续fail closed。
- [Orphan artifact占目标] →真实 claimed attempt按artifact persistence/submit feedback处理；不把orphan认作coverage。
- [Claim additive fields影响调用方] →保留`item:null`与existing feedback，字段只增不删。
- [Starter被误当完成结果] →只嵌入task.md，不预写result.json；gate/submit完全不读取starter作authority。
- [Starter与result schema漂移] →同一 envelope函数从manifest/output contract生成，两者用focused test比较required keys/constants。
- [Agent从bundle内重复拼接bundle basename] →task/beacon/spawn/CLI example只给同一absolute root；wrong-root invocation在existing-index prerequisite失败前零写入，focused negative test断言不存在`<bundle>/<bundle>`。
- [Actor覆盖beacon后继续猜修复] →beacon full binding由shared evaluator从current root/index/manifest重建并fail closed；guidance禁止手写authority，只允许same-check重跑或existing terminal/reclaim路径。
- [Formal submit仍只报一个根因] →fallback/repair规范先用dry-submit；formal rejection只给一个最近动作返回dry-submit，不复制validator。
- [UID/legacy兼容变成两套authority] →thin adapter只返回canonical UID set/reason code；dual fields必须一致，所有consumer复用结果。
- [Index parent短路隐藏真实缺行] →只在parent无效时mask；parent有效后逐row/source-layer检查恢复blocking，并有focused negative test。
- [Historical compatibility诱发mass rewrite] →covered reference保持bytes/path；只有真实binding conflict或invalid index projection需要same-check repair。
- [Heavy canary依赖外部Agent/Search] →无actor显式NOT_RUN并保留现场；fixture smoke不算Agent PASS。
- [共享renderer影响HITL1] →不加context分支；normal测试证明atomicity/lifecycle不变。

## Migration Plan

1. 先落delta specs与focused tests，锁定normal路径和五个rerun失败形状。
2. 修改seed renderer/merge、claim feedback、canonical absolute bundle projection、existing-index no-write preflight、generated task starter和submit advice。
3. 在现有topic-layout resolver上增加reference adapter，收敛Wave1 format/index evaluator与file observability，并加入index parent local short-circuit。
4. 修改seed-topics/Wave0/Wave1/shared protocol/actor playbook wording。
5. 运行targeted regression、相关完整test suite、两项OpenSpec governance checks。
6. 从干净repo逐step执行更新后的heavy real-Agent canary through Wave1；检查beacon unchanged、无same-name nested bundle、historical references无mass rewrite，PASS才清理，FAIL/NOT_RUN保留现场。
7. 更新`CHANGELOG.md`与`DPT_FRAMEWORK/RUN.md`到v0.28。

无需自动迁移已有 bundle。旧thin seed仍可读但不会自动升级；已存在orphan artifact也不会被追认；valid historical reference不批量改写；invalid prose-list `_INDEX.md` 由Agent按正常Wave1 materialization/repair更新；当前空nested bundle不由本change自动删除。Rollback可还原framework/MD变更；已生成完整seed、UID/legacy reference binding和valid table仍符合single-authority contract。

## Open Questions

- 无阻塞问题。Apply中若rerun batch regression在未改allocator前已通过，只保留测试与diagnostic/guidance修复；不得为了BUG标题改写正确的batch逻辑。
