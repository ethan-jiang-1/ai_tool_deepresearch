## Context

九个缺陷都集中在同一个条件：一份 normal run 已经有 historical topics、submitted work units、references 和 Wave gates，sanctioned rerun 再 `add_topic`。正常首次运行没有这些症状，因此不能用 rerun 专用 gate exception 或第二套 pipeline 修补；新增 Topic 应重新进入 normal Topic producer path。

| BUG | 暴露的直接断点 | 系统性修复归属 |
|---|---|---|
| BUG-081 | new seed skeleton 过薄 | 所有 `seed_binding:new` 复用完整 renderer |
| BUG-082 | 新 Topic 没有 Wave0 work-unit provenance | direct-fact 分类后进入 normal queue/work-unit path |
| BUG-083 | delegated claim、actor preflight 与 empty window 混淆 | root-first claim diagnostic + 正确 owner operation |
| BUG-084 | submit contract 只能逐字段猜 | contract-derived starter、dry-submit roots、合法 repair surface |
| BUG-085 | UID/legacy reference reader 漂移 | one canonical topic-binding adapter + parent short-circuit |
| BUG-086 | countability 重复做内容/表现启发式 | count 只读 accepted status + parseable URL |
| BUG-087 | depth review 重抄 ledger/cache truth | Engine 从 reviewed submitted rows 直接派生 |
| BUG-088 | submitted ledger 丢行后原 row 不可恢复 | future submit 可确定重建 + 狭窄 hash-identical recovery |
| BUG-089 | supplementary source claim 只能引用当前 output | 接受same Topic/wave/kind且contract-authorized role的prior submitted output |

这些 BUG 还暴露了更上位的 control defect：Engine 在 gate definition、schema、checker、action responsibility 和 checkpoint 中已经知道 contract lineage，但 formal Gate 往往只返回 pass/fail、松散 `inspect[]` 和泛化 `advice[]`。Agent 看不到内部 lineage，只能猜字段、路径和下一条命令。逐事故补错误字符串会继续扩大 Gate 与补丁数量。

本 Change 因此把九个 rerun BUG 当作 contract-class probes，同时治理全部十个正式 Gate CLI。治理不是新增自动修复系统，而是：删除没有 blocking 正当性的规则；从 checker 的最早直接根因投影一个合法 repair hint；让 Agent 在现有 authority 内执行机械修复并重跑同一 checkpoint。

本设计 paired-read 并受以下宪章伴随指导约束：

- `guidelines/project-charter.md`：Markdown 控 Agent Flow，Engine 控确定性 checkpoint，runtime bundle 保存 truth。
- `guidelines/evolution-simple-reliable-control.md`：direct authority、one truth path、prerequisite short-circuit、one next action、net simplification。
- `guidelines/evolution-helper-oriented-agent.md`：用户只承担新语义/风险/权限决定；Agent 执行已授权机械修复；Engine 裁决确定性事实。

### Direct Sources of Record

- Topic identity/intent：`rb_plan.md#/topic_registry`
- Current seed projection：UID-bound `seed_topics/<current-slug>.md`
- Queue demand/in-flight/history：`rb_queue.json`
- Work-unit identity/actor/batch：`_work_units/_index.json`、manifest、beacon、status
- Actor result/receipt/output/cache：assigned work-unit paths
- Submitted delegated provenance：Engine-written `rb_output_declarations.jsonl`
- Reference topic binding：canonical UID/current/previous-layout resolver + one thin metadata adapter
- Reference consumer navigation：accepted eight-column `reference/_INDEX.md`；不是 topic/provenance authority
- Wave1 source/cache/novelty：reviewed hash-valid submitted rows + Wave0 source authority + profile
- Gate contract lineage：`DPT_FRAMEWORK/schema/contracts/gate-definition.mjs` 的 shared Zod contract + ten active definitions + detecting helper contracts + GSK-011 derived/no-bypass audit；rule `target` 是 checked authority，不自动是 writable surface
- Gate observed truth：各 checker 读取的直接 authority；现有 `wave-contract-findings.mjs` finding 和 `hints[]` 只是同一次 evaluation 的 in-memory feedback projection，不是新 authority

## Goals / Non-Goals

**Goals:**

- 任意 `seed_binding:new` 都得到同一完整 seed skeleton；不按 rerun 生成另一模板。
- rerun 只分类：existing valid coverage 复用；new Topic 走 normal pipeline；supplement 走 normal supplementary demand。
- 全部十个正式 Gate CLI 的每个 independent primary failure 都返回 `rule_id/repair_kind/missing_fact/write_to/rerun`；pass 时 `hints: []`。
- 所有对应 Markdown Controller 都先消费 `hints[]`，在现有authority内执行机械修复并重跑同一checkpoint；不从opaque advice重新猜lineage。
- 每条 active blocking Gate rule 都有checked-authority descriptor和明确finding source；每个实际blocking root都有closed blocking basis与合法repair kind/next-action coordinate。单一root contract由definition拥有，多root contract由detecting checker拥有，不强迫复杂rule压成一个错误的静态basis/repair。
- Gate、Wave inspect 和 submit/claim preflight 在共享事实处返回同一个最早根因，不把 parent failure 展开成 failure wall。
- 删除 count/depth/reference 中的重复 blocking logic 和 presentation blockers，同时保留 schema/receipt/ledger/provenance fail closed。
- declaration 丢行只有 Engine-owned、explicit、audited、hash-identical 恢复；不增加 ledger 副本或第二 coverage authority。
- supplementary source claims 可复用同 Topic prior submitted evidence，不复制或覆盖旧 evidence 文件。
- focused regression 和真实 controlled Agent observation 分别证明 deterministic contract 与 Agent 可执行性。

**Non-Goals:**

- 不新增 rerun controller、mode、state、gate branch、queue namespace或第二 lifecycle。
- 不新增 persistent contract-lineage graph、generic repair controller、auto-mutation、watcher、daemon、后台 retry 或 hidden fallback tree。
- `hints[]` 不创造 permission，不替 Agent 选择 semantic repair，也不成为 gate verdict/coverage authority。
- 不让 `add_topic` 跨 owner 自动 enqueue、claim、写 ledger 或创建 work unit。
- 不让 filesystem-only artifact/cache/reference 获得 submitted authority。
- 不把 semantic research/source judgment 搬进 JavaScript。
- 不把 Result Starter 预写成 `result.json`，不让 starter/diagnostic/reconstruction facts 满足 Gate。
- 不用 summary + output_files 最小 submit 绕过 actor/receipt/provenance binding。
- 不批量改写 valid historical reference，不自动迁移或清理 production bundle。
- 不把 Key Facts 数量、prose 长度、heading case/level/order/list style 恢复为 blocking quality rule。
- 不借全 Gate 审计重写 routing/state machine；只关闭 hint lineage、blocking basis 和已发现 duplicate control 所需的面。

## Decisions

### 0. Rerun 只分类，新增 Topic 回到 normal pipeline

Markdown/Agent Flow 从 direct facts 分类：

```text
existing topic + valid submitted coverage -> reuse
new topic + no submitted coverage         -> normal Topic pipeline
supplement intent                         -> normal supplementary demand
```

分类后立即复用 seed enrichment、queue/work-unit、submit、reference/depth materialization 和 Gate。JavaScript 不持久化 `rerun_topic_class`，Gate 不读取 `rerun_count` 决定放宽规则。这样 normal path 仍是唯一成功路径，rerun 只决定哪些工作还需要做。

### 1. Active Gate rule 声明 finding source；root contract 由 definition 或 detecting checker 拥有

全部十份 active gate definition 的每条 blocking rule 保留 stable rule identity，并补齐：

```text
finding.source = definition | checker

when finding.source = definition:
  finding.blocking_basis
  repair.kind
  repair.write_to
```

所有blocking finding的`blocking_basis`只允许七个粗粒度值：`invocation_contract`、`configuration_integrity`、`authority_integrity`、`binding_integrity`、`required_structure`、`required_floor`、`recorded_human_decision`。Basis只用于blocking burden review，不承担根因诊断：identity/lifecycle/provenance的具体差异由`missing_fact`表达，semantic section availability归入`required_structure`，不保留可被滥用的`accepted_invariant` catch-all。Definition-owned contract由common schema验证basis；checker-owned contract由finding builder验证每个root basis。两者都不能自动判断规则语义是否只是presentation；本Change触碰的heading顺序、大小写、列表样式、prose长度或偏好数量由requirement review与focused regression证明应删除、宽容解析或降为advisory。

Rule checked authority descriptor来自existing `target`，或`cross_field/structural`等check-specific `targets/fields/sources`。Common schema不得强迫四条现有target-less rule伪造一个target。无论descriptor形态如何，它只表示checker读取的authority，不自动决定可写面。

Finding source使用一个小discriminated contract：

- `finding.source: definition`：只用于一个rule failure无论实例如何都具有同一种blocking basis和合法最近动作的declarative check。Definition同时声明`finding.blocking_basis`与`repair.kind/write_to`。`repair.kind`取`agent_action|engine_operation|user_decision|external_action|missing_contract`。`agent_action` singular non-glob `target`可以显式使用`write_to: $checked_target`避免重复字符串；schema只在该kind且target能为current finding instance解析成唯一exact coordinate时接受，checker展开`{topic}`等模板后再输出。Glob/pattern或多坐标descriptor不能使用该alias。
- `finding.source: checker`：用于work-unit provenance、depth review、reference/index、routing/status/handoff等可能产生多个不同root的check。Definition不复制basis、repair kind或next-action coordinate；检测具体direct fact的helper必须在每个blocking finding里返回root-specific basis、kind和coordinate。一个rule可以因此在authority、binding、floor等不同blocking依据，以及`agent_action`、`engine_operation`、`user_decision`、`external_action`、`missing_contract`之间按实际root准确区分。

这不是假设上的复杂性：当前`checkWave1DepthReviewContract()`同一rule就可能遇到missing/unparseable YAML、submitted binding drift、missing profile parameter或required floor不足；`checkWorkUnitOutputCoverage()`也会区分invalid ledger与uncovered output。把这些root压进一个definition-level basis/repair会给至少一类失败错误导航。

Status/trace/ledger/index/receipt/hash等Engine-owned authority无论走哪种finding source，都必须使用`engine_operation`并指向existing legal Engine operation；没有legal operation时使用`missing_contract`，不得把direct file edit伪装成修复路径。`$checked_target`不能用于这些surface，也不能用于`targets/fields/sources`多坐标rule。

这些definition字段由 `DPT_FRAMEWORK/schema/contracts/gate-definition.mjs` 中一个新的、非deprecated的 Zod Gate-definition contract解析。该模块同时导出blocking-basis和repair-kind的closed schema/constants；definition parser和checker-owned finding builder都复用它们，不各自维护enum Set。

所有 production semantic readers 必须导入同一个 parser：`loadGateDefinition()`/safe loader、`consistency-validator.mjs`、`post-final-recovery.mjs` 的 rerun guard、`validate-work-unit-hygiene.mjs` 的 definition audit，以及 GSK-011 active-rule audit。Positive definition-semantic tests也消费同一schema；negative tests可以raw修改JSON以构造malformed/unknown-check fixture，但validity/rejection必须由production parser/CLI裁决，不得把fixture parse变成第二truth。`post-final-recovery` 可以继续对原始definition bytes计算SHA-256，但hash和`gate/rules/operator/value`语义必须来自同一次read得到的paired raw+parsed snapshot，禁止hash一次、随后重新读取并解释另一份bytes。Schema拥有common rule shape、checked-authority descriptor alternatives、finding-source union和definition-owned root contract约束；check-specific fields保持passthrough，其支持性由active Gate pass regression、evaluator-family unknown-check/missing-root-contract negative test和changed-check/root focused test证明。Schema不执行Gate rule，也不成为runtime verdict。

防旁路不依赖另一份永久手写reader名单。Static no-bypass check扫描production对`schema/gate_definitions`的直接读取：除shared parser内部的parse和post-final明确的raw-byte hash accessor外，任何semantic read必须导入shared parser。当前consumer names只用于迁移与focused regression，不成为第二份Source of Record。

Definition-owned `repair.write_to`可以使用受控坐标模板，例如 `{topic}`，以及上述显式`$checked_target`复用。Checker-owned finding直接使用本次root context构造basis和repair coordinate。两者都必须在输出前形成closed basis与exact non-empty next-action coordinate；resolved hint不得残留placeholder。无法解析坐标，或blocking checker result没有root-specific basis/repair，属于`configuration_integrity` missing-contract failure：shared builder保留原domain symptom为masked detail，只向Agent暴露framework finding contract缺失，绝不回退到rule-level basis、target、error string或`failure_message`猜动作。Shared schema/projector不从path/command字符串判断kind或reachability；definition-owned semantic legality由changed-rule focused test锁定，checker-owned legality由detecting helper及其existing operation/decision contract锁定，不建设coordinate/operation catalog。`rerun`不在每条rule里重复存储，由formal Gate或inspect的checkpoint projector生成。

`write_to`保留兼容字段名，但规范含义是next-action coordinate，而不是一律表示“可写文件”：`agent_action`指authorized bundle path/JSON pointer，`engine_operation`指accepted Engine operation与已知exact args，`user_decision`指HITL/decision surface，`external_action`指不可代理前置条件，`missing_contract`指不可用capability或checker/definition contract boundary。尤其configuration-integrity failure必须在`missing_fact`点名gate/rule/checker缺失字段，并在`write_to`点名该contract boundary；不得把framework source path暗示为runtime Agent可直接修改的authority。

现有 `failure_message` 只保留为definition-file兼容字段，不是repair authority。Shared projector不得从它推断repair kind、next-action coordinate、rule identity、primary顺序或attempt trend，也不得把它投影成action-bearing `advice[]`。旧message无需逐条审查或重写；本Change触碰时可以澄清，但GSK-011不使用prose regex或关键词表做“语义非矛盾”裁决。这既避免旧文案误导Agent，也避免把展示 prose 重新提升为机器contract。

当前 `tests/schema/gate-rule-audit.test.mjs` 维护 `CHECK_IMPLEMENTATION_ROUTES` 和 `GATE_RULE_INVENTORY_GROUPS`，为123条active rule复制producer、authority、checker、diagnostic、classification和test guard。它比definition本身更长，也会在rule增删时要求同步第二份truth。本Change退役这份逐rule inventory，把GSK-011收敛为derived executable audit：

- 自动枚举parsed definitions与independent CLI wrappers，验证双向一一对应并包含`rerun-ready`，不手写Gate count；
- common schema逐rule验证stable identity、checked-authority descriptor、finding-source union，以及definition-owned closed basis、repair-kind/next-action coordinate和registered placeholder；
- active Gate pass regressions证明当前definition中的rules走真实supported execution；每个evaluator family用unknown-check与checker-owned missing-root-contract negative case证明unsupported/incomplete checker fail closed，changed/retired checker另有focused regression；不维护test-only check/root route map；
- shared finding/projector tests证明definition-owned或checker-owned blocking finding都投影stable `failed_rule_ids/hints[]`；checker-owned root缺basis/repair时fail为configuration integrity，因此classification、diagnostic surface和root lineage无需逐rule复制；
- Agent-owned producer guidance只在本Change实际修改的owner surface做focused Markdown contract test；Engine/user/external/missing-contract rule不要求逐条“non-Agent-produced exemption”catalog；
- production definition semantic read不存在shared parser旁路；raw-byte读取只保留已声明的hash用途；
- invalid invocation、definition/config、binding、handoff/status、topic-state prerequisite、routing和durable handoff trace等distinct failure-source classes各有代表性structured-finding test，不做ten Gates乘全部failure classes的笛卡尔测试；
- 本Change删除/降级的具体rule同步清理known shadow dispatch、degradation wording与fixtures，但不建设永久retired-rule inventory。

Definition外的root metadata不复制到中央`GATE_FAILURE_ROOTS`或preflight catalog。`parseGateCliArgs()`、`tryLoadGateDefinition()`、node/gate binding、handoff/status helper、routing和durable trace owner在检测direct failure时直接返回现有structured finding；wrapper只传给projector。GSK-011用failure-source-class behavior matrix证明这些root能投影统一hint，不通过source regex禁止某种变量名或object literal。这是一份derived contract audit，不是runtime lineage database、architecture linter或第二catalog。

### 2. 泛化现有 structured finding，所有 formal Gate failure 从它投影

本Change不新建平行failure object。它泛化现有 `DPT_FRAMEWORK/engine/helpers/wave-contract-findings.mjs` 的 `makeContractFinding()`、`buildContractEvaluation()` 和 `projectInspectContract()`：在已有 `rule_id/classification/surface/expected/repair/detail/masked_rule_ids` 基础上补closed `blocking_basis`、direct observed fact、`repair_kind`、resolved `write_to`、missing-fact projection所需字段和checkpoint context。Formal Gate与Wave inspect都消费这个shape；compatibility adapters可以把旧checker结果一次性归一化，但不得形成第二种成功/失败解释。

Finding `id` 可以保留某次诊断实例标识，`rule_id` 才是formal projection和attempt comparison使用的稳定identity。`buildContractEvaluation()` 必须从blocking finding的`rule_id`投影`failed_rule_ids`，不能继续用可能包含message index或临时instance suffix的`id`。多个同rule independent roots仍通过各自finding/hint的resolved coordinate区分；`failed_rule_ids`只做稳定规则集合。

现有 `findingsFromCheckResult()` 不得继续从`inspect[]`的`[id]`前缀或`advice[]`位置反推blocking root。它可以保留为advisory/diagnostic-only兼容adapter；任何会使当前inspect或formal Gate失败的return-map/check result必须直接返回structured finding，或由拥有该check contract的helper用显式fields转换，不能从prose恢复rule identity/repair lineage。

Checker boundary 产生的统一 in-memory finding 至少保留：rule/root identity、direct observed fact、expected contract、checked authority、root-specific repair-kind/write coordinate、classification 和 masking relationship。Shared builder 从它投影：

```json
{
  "check": { "passed": false, "failed_rule_ids": ["..."] },
  "routing": { "kind": "..." },
  "inspect": ["bounded forensic detail"],
  "advice": ["compatible human-readable advice"],
  "hints": [{
    "rule_id": "...",
    "repair_kind": "agent_action | engine_operation | user_decision | external_action | missing_contract",
    "missing_fact": "earliest direct failed fact + expected/observed contract",
    "write_to": "exact next-action coordinate interpreted by repair_kind",
    "rerun": "exact same Gate checkpoint"
  }]
}
```

Pass 必须返回 `hints: []`。每个 independent primary root 返回一个 hint；parent artifact/schema/identity failure 先短路依赖规则，masked/downstream symptoms 只留作 bounded forensic detail。实现使用 local prerequisites 与现有 masking 概念，不建设 general dependency engine。

十个 wrappers 的 invalid invocation、definition parse/load、node/gate binding、handoff/status preflight、topic-state prerequisite、gate-specific prerequisite、rule evaluation、routing/config 和 durable handoff trace failure都走 shared failure/result builder。Wrapper 不再从 error string、`inspect[]`、`advice[]`、`failure_message` 或 target filename 猜 hint，也不能手工返回一个缺 `hints[]` 的 failed result。

现有`writeGateAttempt()`调用位置和strict handoff durability ownership保持不变，本Change不引入finalizer。已有Gate failure diagnostic serializer必须把`hints[]`与`check/routing/inspect/advice`一并持久化，保证stdout反馈在后续context reload/post-mortem中不丢失；pass diagnostic可以保存`hints: []`。这只是扩展existing diagnostic projection，不让diagnostic成为authority。

`buildGateResult()` 的primary root/hint顺序必须来自structured finding的classification、prerequisite masking和stable rule identity。现有 `gateMessagePriority()`/`prioritizeMessages()` 不得继续用error-string regex决定root precedence；可删除，或仅作为不影响`failed_rule_ids/hints[]`的legacy prose展示。Gate attempt trend只比较stable `failed_rule_ids`；旧diagnostic没有这些IDs时不参与比较，当前结果成为第一份可比较sample，不再退回比较`inspect[]` prose。

当 bundle/current node 已解析，`rerun` 使用 canonical absolute bundle root 和 exact current node。Invocation 本身缺参数时，root 明确指出缺失 invocation fact，并保留同一 executable 与所有已知 exact args；不得编造未知 runtime path。

### 3. Wave inspect 与 formal Gate 共享 root，不共享副作用

Wave0/Wave1/Wave2 inspect 与 formal Gate 对共享 artifact/provenance rules 消费同一个 pure evaluator finding，因此 `rule_id/repair_kind/missing_fact/write_to` 相同；各自的 `rerun` 指向实际调用的 inspect 或 formal Gate checkpoint。

Formal-only lifecycle binding、handoff、routing、gate-attempt durability 和 trace checks 不复制进 inspect，但使用相同 finding shape。Inspect 保持 read-only、无 routing、exit `0/1/2` 和现有 `{check, inspect, advice}` 兼容面，并增加 `hints[]`。Missing `--bundle`、definition parse/load和其他invocation/config failures也输出统一JSON shape；pass固定`hints: []`，failure返回stable root与structured coordinate。缺少bundle时只输出包含required placeholder的command template，不伪造absolute bundle path。

Fatigue/degraded advice 不得覆盖 direct hint。存在 authorized mechanical path 时，Agent 应执行该动作并重跑同一 checkpoint；只有新语义、风险/permission、external action 或 `missing_contract` 才形成 escalation boundary。

### 4. Existing topic-state renderer 生成完整 new-seed skeleton

`canonical-topic-state.mjs` 的现有 renderer 在无 existing body 时生成 canonical UID/intent frontmatter、seed-topic enrichment headings、research-round append 区，以及现行五个 wave-specific backfill token。`scope_role` 只保留在 frontmatter，不伪装成主题定位正文。Existing seed 重新渲染时 registry canonical keys 覆盖，非canonical enrichment 和 body 保留。

不增加 `rb_templates/seed_topic.md.tmpl`：runtime topic mutation 已有单一 renderer owner，额外模板只增加 drift/read failure 面。HITL1 与 rerun 共享同一 new projection renderer。

### 5. Wave producer guidance 接回 normal path；claim/submit 提供 direct helper feedback

`phase-wave0.md` 只为无 current queued/in-flight/submitted Wave0 coverage 的新 Topic 创建标准 `wave0_source_intake` demand；历史合法 coverage 不重派；supplement 使用 normal supplementary demand；orphan `source.yaml` 不得追认。

Phase Agent 读取 queue-front role，做一次 bounded current actor probe，把完整 observation 交给 `operate-work-unit claim`。Delegated demand 禁止 `operate-queue claim/complete`。`operate-queue claim` 遇到 delegated front 继续零 mutation，但返回 `delegated_requires_work_unit_claim`，与真正 empty window 区分。`phase_agent_fallback` 只有 matching unavailable observation 且 kind 允许时合法。历史 batch allocator 先用 b000 -> b001 regression 判断；若实现已正确，不因 BUG 标题重写。

Claim 将 active bundle 规范化为一个 canonical absolute root；beacon、task、spawn/claim output 和 CLI examples 投影同值。Existing-authority read 在 missing prerequisite 时保持零写入，避免错误 `<bundle>/<bundle>` 创建 transaction、lock、trace 或 log。

Generated `task.md` 从 manifest/output contract/cache policy 生成 copy-ready Result JSON Starter 与简短 checklist，但不创建 assigned result。Agent 先做真实 work，再跑 existing dry-submit；dry-submit 累积 independent primary violations、短路 dependent checks，并为每个 root 返回 repair triplet。Formal repairable submit rejection 的唯一最近动作是修同一 candidate 后重跑 dry-submit；strict actor/receipt/provenance binding 不放宽。

BUG-084 的 focused regression 不维护逐字段runtime catalog，但必须覆盖这次事故暴露的 changed-contract root classes：

| Root class | Direct facts and expected repair boundary |
|---|---|
| Candidate schema | exact `schema_version`、required fields、rejected `actor_execution`和其他unknown keys；多个独立Zod issue按exact JSON pointer分别返回 |
| Candidate identity / actor | `work_id`、`queue_item_id`、`kind`、`receipt_nonce`、`actor_contract_version`、`execution_actor_class`与assigned record一致；candidate-side drift指向candidate JSON |
| Immutable envelope | index/manifest/beacon/topic binding与canonical absolute bundle root一致；authority-side drift指向legal Engine operation或`missing_contract`，绝不建议手改beacon/index/manifest |
| Runtime receipt | required lifecycle events、schema、identity、nonce、actor fields；repair指向exact receipt path/line/field |
| Output contract | required output、allowed role、path existence及reference URL；repair指向exact `output_files[]` entry或assigned output |
| Cache contract | declared trail、leaf directory、required leaf files、page content和`meta.json` source mapping；repair指向exact trail/file/field |
| Current source claims | claim schema、accepted URL、current output ref、cache/degraded ref和URL mapping一致；prior submitted output eligibility仍由第10节/Wave1 lineage island拥有 |
| Cross-authority binding | result/index/manifest/queue snapshot/in-flight关系一致；Engine-owned conflict不降格成Agent手改authority |

一个fixture可以同时触发多个彼此独立的root，并要求一次dry-submit全部返回；parent parse/identity/envelope/cache failure只mask依赖它的implication，不吞掉其他可独立读取的root。该矩阵验证shared candidate evaluator的行为，不复制schema、manifest、kind contract或queue binding成为第二validator。Formal submit在lock内复用同一candidate plan并重新读取mutable facts，只有这次transaction内的事实可生成最终row/hash。

### 6. Reference binding 与 index parent 复用 one evaluator

在现有 topic-layout resolver 上增加 thin reference adapter：

- `related_topic_uid` 接受 exact registered UID 或 `all`；
- legacy `related_topic` 接受 `all` 或唯一可解析的 current/previous id/slug；
- dual fields 必须解析一致；
- ambiguous/unknown/conflict fail closed 一次。

Wave0/Wave1/Wave2 inspect、formal Gate 和 file observability 消费同一 binding outcome，不再维护 raw-field precedence。

`reference/_INDEX.md` 先验证 accepted eight-column parent。Missing/no-table/missing-columns/unparseable 只返回一个 parent root并 mask per-file row symptoms；parent valid 后 missing row/wrong layer 继续 blocking。无需 general dependency engine。

### 7. Countability 只做数字资格，reference format 拥有 semantic availability

`isCountable()` 只回答已经 authority-selected 的 reference 能否进入数字 count：accepted status + 至少一个 parseable `source_url`。它不检查 Core Content Capture 长度、Key Facts 数量、section order/case/level、URL path depth、duplicate/Jaccard/self-reference 等内容或表现启发式。

Shared `reference_format` 独立检查 required non-empty semantic sections、metadata 和 topic binding；parser 宽容 heading order/case/level/spacing/list presentation。`source_url_present` 接受 parseable bare HTTP(S) URL 或 Markdown link；`key_findings_non_empty` 接受常见非空 bullet、numbered list 或 paragraph。Key Facts quantity/prose richness 只可 advisory。

Wave1 definition 删除 blocking `key_facts_min_lines`；对应 known checker branch、degradation list、producer wording 和 blocking tests 同步删除或降级，避免 shadow rule；不把retired ID转存到永久inventory。

同一纪律应用于Wave2 `cross-topic-ledger.md`：六个accepted semantic sections必须存在且non-empty，但历史`ledger_fixed_sections`的ordered regex不得继续决定pass/fail。为兼容diagnostic identity可保留该rule id，checker改为tolerant section-set evaluator，宽容order、case、heading level和spacing；缺一个section只报该semantic root，不把presentation差异升级为blocking。

### 8. Depth review 从 submitted ledger 派生，不复制 authority

`depth-review.yaml` blocking shape 只保留不可从 direct authority 推导的事实：version/topic、`reviewed_work_unit_refs[]`、depth dimensions、profile judgment、decision、supplementary IDs。

Engine 从 reviewed hash-valid submitted rows 读取 source claims/accepted URLs/cache/degraded refs，从 Wave0 authority 取得 baseline URLs，从 profile 计算 required floor，再派生 mapping/novelty/observed count。旧 `wave0_source_urls/source_claims/new_source_urls/new_source_floor` 可兼容读取或报告 advisory drift，但不决定 pass/fail。

Missing/unresolved reviewed ref 是 parent root，mask source/cache/novelty/floor symptoms。Filesystem-only cache 不能创造 coverage。

### 9. Declaration recovery 复用 direct owners，不建立 witness/shadow ledger

Normal 与 late submit 的pre-transaction prepare/dry-submit只产生side-effect-free candidate validation plan，不生成或携带final ledger row/hash，也不通过`loadQueue()`写trace/log、不落盘result/receipt/cache canonicalization、不创建transaction artifact。最终rejection boundary仍可用existing trace/log记录失败。Existing transaction取得lock并重新读取/验证mutable index、queue和replacement facts后，才应用canonicalization writes、生成唯一submission timestamp、构造ledger row和`ledger_record_hash`，并一致写入ledger `declared_at`、index `terminal_at`、status `updated_at`和queue `completed_at`。Commit不得复用transaction外预计算的ledger hash。Normal ledger row因此可由existing manifest/beacon/result/receipt/output/source/cache/index/status/queue owners确定重建，不增加recovery file或row copy。

Late-submit 只在 existing work-unit index 保存无法从其他 owner 推导的最小 accepted context：late accept reason、prior terminal status `timed_out`、superseded retry IDs。它不复制 result/output/cache/receipt/actor 或完整 ledger row，也不被 Gate 当作 coverage。

Existing `operate-work-unit.mjs` 增加狭窄 `node DPT_FRAMEWORK/cli/operate-work-unit.mjs recover-declaration <bundle> --work-id <id>` operation：

- 只接受 already-submitted work ID 且 bundle ledger row 缺失；
- 从 current hash-valid direct owners 与 bounded late context 重建原 row；
- recomputed ledger hash 必须与现有 index/status recorded hash 完全一致；
- exact row 已存在时 idempotent unchanged；
- malformed ledger、conflicting facts、unsubmitted status 或 hash mismatch 均零 mutation；
- recovery audit 进入 existing transaction/trace/log，不改变 restored row schema/hash；
- 不 rebind index/status 到新构造 hash，不重做 research、不接受 new result、不 complete queue、不生成 new provenance。

Legacy pre-unified-timestamp/pre-context attempt 只有在 original submit/transaction evidence 与所有 remaining direct facts 能唯一复现 recorded hash 时才恢复。对一个确实already-submitted但无法复现原row的attempt，当前accepted system没有合法replacement/rebind操作；必须返回唯一的`missing_contract`边界，不同时建议外部备份、手写row或new attempt，不 best-effort 猜 row。

Gate/inspect 看到 submitted index 但 missing row 时先返回 `submitted_declaration_missing`，mask output/cache/count/bypass cascades。`write_to` 指向 Engine recovery operation，不指向 ledger JSONL。

#### Complexity Burden of Proof

1. 现有 direct check 无法处理什么：Gate 能识别 missing row，但 Gate 不能合法写 provenance；历史 timestamp/context drift 使原 row 无法稳定重建。
2. Source of Record：bundle ledger仍是 coverage authority；reconstruction inputs 继续由现有 direct owners 持有，只有 late-submit 保存不可推导的最小 context。
3. 为什么需要一个 operation：already-submitted recovery 不是新 submit，Gate 也不能 mutation；work-unit owner 需要一个显式、可审计动作。
4. 删除什么旧复杂度：不新增 exact witness、shadow ledger、manual hash/rebind 或 missing-row downstream failure wall。
5. 失败唯一动作：运行 `recover-declaration`；若一个确实already-submitted的legacy attempt无法复现 original hash，则报告唯一的 `missing_contract` boundary，不编造 replacement path。
6. Focused proof：normal/late reconstruction、hash identity、idempotency、legacy evidence、conflict/no-write 和 no-direct-gate-authority tests。

### 10. Supplementary source_ref 解析 current 或 prior same-topic submitted output

`validateSourceClaims` 使用一个由 hash-valid bundle ledger row绑定到existing work-unit index/manifest/queue-item topic payload，再经canonical topic resolver派生的 in-memory submitted-output index。它不是新 persistent authority。Topic UID不能从output filename或queue id猜；任一prior row无法通过existing binding解析唯一canonical Topic时不进入候选集。

Accepted `source_ref` 合法形式：

1. 当前 result `output_files[]`；或
2. prior hash-valid submitted row中的exact output path，且该row通过bound index/manifest/queue item解析出的canonical Topic UID、wave和kind与current attempt相同，output role位于current kind contract显式声明的`source_claims.prior_submitted_output_roles[]`。该role list必须unique且为`output_files.allowed_roles[]`子集；`wave1_topic_deepening`默认只允许prior `evidence_summary`，不允许`question_list`、`reference`、`other`或仅filesystem存在的文件冒充source evidence。

Filesystem-only、unsubmitted/invalid row、cross-topic、ambiguous text match 继续拒绝。当前 supplementary work unit 新增的 cache/degraded refs 仍由当前 result 声明。Diagnostic 给出 claim index、candidate、searched current/prior sets、conflicting work/topic，以及 exact JSON pointer + same dry-submit rerun。

## Simplicity Admission And Control Budget

最短合法闭环是：recorded rerun intent -> canonical topic-state 写完整new seed -> direct facts把new Topic送入normal queue/work-unit path -> shared submit/gate checker返回最早root与一个动作 -> Agent修复authorized surface -> 重跑同一checkpoint。Direct authority仍是plan/seed、queue、work-unit index+envelope+actor surfaces、Engine-written ledger、reference/profile/source authority和active Gate definitions；finding、hint、starter、diagnostic与in-memory index都只是projection。

本Change的净简化是：删除或合并presentation/count heuristics、depth copied authority、raw topic/reference readers、current-output-only source assumption、逐rule Gate inventory、wrapper prose/path inference、precomputed submit row/hash和missing-row cascade；不新增rerun pipeline、repair controller、persistent lineage graph、shadow ledger、second verdict或hidden retry。

| New or changed control | Existing direct fault it covers | Source of Record / reused checkpoint | Complexity removed or avoided | Sole nearest action on failure | Focused proof |
|---|---|---|---|---|---|
| Gate finding-source metadata + shared parser/projector | Engine knows a blocking root but wrapper cannot expose legal repair lineage, or a checker omits its root contract | active definitions + detecting helper facts；复用existing Gate evaluator、`wave-contract-findings`和same Gate checkpoint | 退役123-rule test inventory、hand-built wrapper failures、target/message/path guessing和string-priority roots | repair authorized surface/operation and rerun same Gate；missing metadata只报`missing_contract` | synthetic schema/finding tests、no-bypass reader parity、all-Gate matrix、masking/prose-independence |
| Contract-derived Result Starter + shared candidate plan | Phase Agent必须猜result/receipt/output/cache contract，prepare/dry/formal又可能各自漂移 | manifest、result schema、kind/output/cache contract、index/queue binding；复用dry-submit/formal submit | 避免scaffold CLI、second validator、repeated formal-submit guessing和transaction外row/hash | repair exact candidate/assigned surface and rerun same dry-submit | starter/schema agreement、BUG-084 root matrix、read-only snapshot、locked revalidation/rollback |
| `prior_submitted_output_roles[]` + in-memory submitted-output index | legitimate supplementary claim被current-WU-only假设拒绝 | hash-valid bundle ledger + bound index/manifest/queue topic payload + canonical resolver；复用`validateSourceClaims` | 删除implicit role compatibility、file-path topic guessing、duplicate evidence rewrite和persistent lineage index | repair exact source-claim pointer and rerun same dry-submit | same-topic/wave/kind/role positive；wrong-role/kind/wave、filesystem-only、unsubmitted、cross-topic negative |
| Minimal late-accept context | late row的reason/prior status/superseded retry IDs无法从其他owners重建 | existing work-unit index；其余facts继续由result/receipt/output/cache/queue owners持有 | 避免复制完整ledger row、result/actor/receipt facts或另建witness/shadow ledger | persist transaction-owned minimal context or fail submit；legacy missing proof报`missing_contract` | static no-copy assertions、normal/late transaction tests、reconstruction hash tests |
| `recover-declaration` | already-submitted attempt丢失唯一bundle ledger row，Gate不能合法mutation | current direct owners + recorded index/status hash；复用existing work-unit transaction/trace/log | 避免manual row/hash、rebind、backup success path和downstream failure wall | run exact recovery operation；不可复现则唯一`missing_contract` | hash identity、idempotency、legacy evidence、conflict/no-write、Gate no-direct-coverage |

## Helper Direction Review

1. 确实需要用户的决定：新增 Topic 语义、改变研究目标、风险/权限扩张，或 accepted contract 明确要求的 HITL 选择。
2. 决定后回到 Agent 的步骤：topic-state apply、enqueue、actor probe、claim、真实 work、dry-submit repair、formal submit、reference/depth materialization、declaration recovery、inspect/Gate rerun 和后续 normal pipeline。

Gate hint 不把命令推给用户；它把 Engine 已知的合法路径和`repair_kind`交给 Agent。`agent_action|engine_operation`表示Agent执行对应写入或合法Engine operation；`user_decision|external_action|missing_contract`只升级最小决策、不可代理动作或缺失能力边界。该字段不创造permission，不能把`human-directed`当permission token。

## Verification

### Apply verification islands

`tasks.md` 的顺序是可执行依赖，不是按领域归档。Apply SHALL 以六个 green island 推进：

```text
current baseline
  -> Gate feedback vertical slice
  -> quality/reference/depth simplification
  -> normal Topic Wave0 producer
  -> Wave1 supplementary lineage
  -> declaration recovery
  -> full deterministic + controlled real-Agent evidence
```

每个 island 同时包含本地 regression、implementation、该行为存在Agent-facing surface时的owning Markdown demand-side wiring和exit checkpoint。新test可以在当前 island 内先RED后GREEN，但不得把未解释失败带入下一 island，也不得把全部未来行为测试堆在implementation之前造成tasks顺序死锁。Deterministic fixture只证明Engine contract；controlled canary单独证明真实Agent/search/fetch行为。

Gate island 特别避免全系统flag day：先用synthetic fixtures实现schema、finding和result projector；再把finding metadata作为旧JSON loader可忽略的additive fields写入全部十份definition。Metadata admission若遇到无可辩护blocking basis的现役规则，必须在该definition slice用focused regression就地退役，不能临时赋予人工basis。所有remaining definition通过新schema后才切production readers；随后迁移detecting helpers、non-Wave wrappers、Wave inspect/formal wrappers，并在同一island更新十个Markdown Controller消费`hints[]`。旧wrapper不会在definition半迁移时被迫读取不完整contract，也不会出现新hint capability已上线但Controller仍长期只读opaque prose的中间终态。

每个 island 的失败必须停在该island：先判断是新regression暴露预期旧缺陷、implementation regression、还是unrelated pre-existing failure；记录exact command/output，不用后续slice的fallback或兼容分支掩盖。Exit checkpoint转绿后，后续slice可以复用其helper/result，但不得复制validator、fixture authority或success path。该顺序不新增runtime phase、persistent apply state、umbrella controller或第二test runner，只把现有OpenSpec task/checkpoint纪律写清楚。

| Island | Owning scope / BUG | Exit evidence | Forbidden compensation |
|---|---|---|---|
| Baseline | current normal first-run与现有runtime truth | existing suites + exact known failures | 不把BUG行为固化成永久PASS，不改production behavior |
| Gate feedback | 十Gate/三inspect的schema、finding、wrapper、Controller；metadata admission时就地退役无blocking basis的现役规则 | all-Gate matrix + parity + failure-source tests | 不改count/depth/queue/submit业务语义来“让hint通过”，不为presentation-only rule伪造basis |
| Quality/reference/depth | BUG-085/086/087与presentation simplification | focused + normal compatibility checkpoint | 不靠rerun exception、copied ledger truth或第二parser |
| Wave0 producer/work-unit | BUG-081/082/083/084与normal submitted provenance | topic/queue/work-unit/Wave0 deterministic checkpoint | 不引入rerun pipeline、post-hoc provenance或temporary second submit validator |
| Wave1 lineage | BUG-089及supplementary/depth/reference combined path | source lineage + Wave1 deterministic checkpoint | 不放宽cross-topic/wrong-role/unsubmitted authority |
| Declaration recovery | BUG-088 missing-row recovery | hash-identical fault checkpoint | 不rebind hash、不手写row、不让reconstruction facts直接coverage |
| Full/controlled evidence | 全部九BUG的组合行为 | full deterministic green + real trace-backed canary | 不用fixture/mock代替Agent/search/fetch proof，不用canary掩盖focused failure |

### All-Gate contract matrix

- 自动枚举 ten definition/CLI pairs，不在 test 中维护第二份手写 Gate count。
- 每个 Gate pass 都有 `hints: []`；每个代表性 active rule failure 都有完整 `rule_id/repair_kind/missing_fact/write_to/rerun`。
- invalid invocation、definition/config、node binding、handoff/status、topic-state/gate prerequisite、rule evaluation、routing 和 durable trace failure均不漏 shared finding/output shape。
- Runtime loader、consistency validator、post-final recovery、hygiene validator和GSK-011 audit对同一definition bytes给出同一schema verdict；post-final raw-byte hash保持不变。
- Post-final raw hash与rerun-count semantic facts来自一次paired raw+parsed snapshot；positive semantic tests共用parser，negative raw fixtures只用于证明production rejection。
- Definition-owned dynamic `write_to`/`$checked_target`与checker-owned root coordinate全部解析成exact coordinate；unknown placeholder、invalid alias或missing checker basis/repair fail closed且不泄漏模板/猜测给Agent。
- `failure_message`改写不影响repair、action-bearing advice、primary顺序、failed-rule identity或attempt trend；Agent action只来自structured metadata/finding，不要求逐条legacy message cleanup。
- `failed_rule_ids`来自finding `rule_id`而非diagnostic instance `id`；实例坐标仍保留在finding/hint。
- blocking return-map/check result直接提供structured finding；`findingsFromCheckResult()`不再从prose制造blocking authority。
- Engine-owned authority 的 `write_to` 只指 legal operation 或 `missing_contract`，从不建议手改 status/trace/ledger/index/receipt/hash。
- Parent root mask dependent hints；fatigue/degraded wording不替代 direct hint。
- Wave inspect/formal Gate 对 shared rules 的 root coordinates 同源，inspect保持 no-write/no-routing。
- Existing durable Gate diagnostic保留同一次result的`hints[]`；wrapper write ownership、trace authority和verdict不变。
- GSK-011 derived audit 验证finding-source schema、ten-pair bijection、active execution/unknown-check/missing-root-contract fail-closed和本Change removed-rule targeted cleanup；不保留逐rule producer/checker/root/test inventory。Registry GSK-002/003/004/011 stale摘要同步修正。

### Nine-BUG regression matrix

在逐BUG cases之上，增加一条bounded normal-path parity invariant：用同一canonical Topic intent分别驱动fresh first-run topic和historical bundle中的rerun-added topic，比较它们进入的queue/work-unit kind、actor/output/cache contract、Result Starter/result schema、submit evaluator、reference/depth semantic contract与Wave Gate rule/evaluator outcome。`work_id`、queue item ID、batch、timestamp、historical reuse集合和bundle path等run identity允许不同；任何`rerun_count`、rerun-only output contract、alternate submit validator、reference namespace或Gate exception都应使parity regression失败。该比较只读取测试执行产物的bounded contract-bearing fields，不持久化runtime signature，也不维护全字段catalog。

- BUG-081：new add/migrate seed完整、exact tokens、existing enrichment保留、HITL1兼容。
- BUG-082/083：historical coverage + new submitted pass；orphan fail；delegated/empty/observation/fallback roots可区分；b000 -> b001不退化。
- BUG-084：absolute root一致、nested-root零写、starter/schema一致；dry-submit一次覆盖candidate schema/version/unknown key、candidate identity/actor、immutable envelope、runtime receipt、output role/path、cache leaf/`meta.json` mapping、current source claims和result/index/manifest/queue binding的independent roots，按local prerequisite短路dependent roots；candidate-side repair给exact JSON/file coordinate，Engine-owned drift不建议手改authority；strict actor/receipt/provenance仍拒绝冲突。Prior submitted source-ref eligibility只在BUG-089 matrix验证。
- BUG-085：UID-only/legacy pass、dual conflict一次、index parent short-circuit、inspect/Gate/file-observability同源。
- BUG-086：short prose/few facts/harmless presentation不影响 count；missing semantic section只由 format 报；blocking Key Facts quantity 退役。
- All-Gate simplification：Wave2 ledger六个semantic sections可重排/等价heading展示；missing section仍block一次。
- BUG-087：minimal depth review不复制 source/cache fields也pass；derived mapping/novelty/floor正确；filesystem-only cache fail；missing reviewed ref短路。
- BUG-088：normal/late submit direct facts 可重建；reconstruction facts不直接满足 Gate；exact-hash recovery、idempotency、legacy evidence和conflict/no-write覆盖。
- BUG-089：current output pass；prior same-topic/same-wave/same-kind/allowed-role output pass；wrong-role/kind/wave、filesystem-only/cross-topic/unsubmitted fail；diagnostic包含 exact pointer 和 same dry-submit。

### Controlled real-Agent canary

Controlled owner固定为existing `experiments_playbook/exp_evidence-extraction/case-163-heavy-rerun-add-real-cache-trail.md`，在原case上扩展，不新建第二份rerun-add canary。若case goal/coverage文字扩展到Wave1/recovery，同步其现有README与`experiments_playbook/RUN_EXPS.md` registry row。Historical fixture只建立已完成normal-run前置事实；new Topic的research、result、receipt、cache、reference/depth materialization与repair必须来自真实Agent/sub-agent执行。

1. 从 historical normal-run fixture 进入真实 sanctioned rerun并 add 两个 Topic。
2. Agent 读取 updated Markdown controller，走 normal Wave0/Wave1 enqueue/probe/claim/real actor/dry-submit/formal submit。
3. Supplementary work unit 引用同 Topic prior submitted evidence；Phase Agent 从 reviewed ledger 派生 depth review，加载 shared template 并 materialize tolerant-but-complete reference。
4. 在 disposable bundle 对一个真实 submitted row 做明确 fault injection 删除，只用 `recover-declaration` 恢复；不手写 hash/row/result/receipt。
5. 至少对 canary 中遇到的 Gate failure 断言 hint 足以让 Agent 定位 authorized surface、执行 repair 并重跑同一 checkpoint。
6. 断言 beacon unchanged、无 same-name nested bundle、historical references 无 mass rewrite、reconstruction facts 未被 Gate 直接计数。
7. PASS 只来自真实 trace/verdict；fixture只提供 historical prerequisite，NOT_RUN 不算 PASS，FAIL 保留现场。

## Apply Target Manifest

| Surface | Apply action | Net control impact |
|---|---|---|
| Gate-definition Zod contract + all ten definitions | one parser供loader/consistency/post-final/hygiene/audit共用；definition/checker finding source；删除无依据 blocker | 简单rule静态basis/repair，多root rule由detecting helper拥有；无root catalog |
| `wave-contract-findings`、`gate-helpers-core`、shared evaluators | 泛化existing finding -> check/inspect/advice/hints；structured root排序 | 删除平行failure shape、wrapper/string-priority inference和inspect-prose trend fallback |
| all ten `check-gate-*.mjs` wrappers | 所有 failure exit 走 shared builder | 保持 one-gate-per-CLI |
| existing Gate diagnostic serializer | 原样保存result `hints[]` | 不重构write ownership，不新增authority |
| GSK-011 derived/no-bypass audit | ten-pair bijection + finding-source schema + active execution/unknown-check/missing-root-contract fail-closed + failure-source-class finding tests；删除123-rule static inventory | 防止audit本身成为比Gate更复杂的第二truth |
| Wave inspect CLIs/evaluators | shared root coordinates + inspect-specific rerun | read-only，无 second validator |
| `canonical-topic-state.mjs` | full shared new-seed renderer/merge | 删除 thin skeleton drift；无新 owner |
| all ten Gate phase/controllers + producer Markdown | 统一hint consumption、normal rerun classification、template requires、minimal depth review | 无新controller、rerun phase或gate |
| queue/work-unit claim helpers/CLI | distinct root + repair coordinates | read-only feedback；allocator按测试最小修改 |
| `work-unit-envelope.mjs` | absolute root、starter、checklist | 复用 manifest/schema；无 scaffold CLI |
| work-unit existing reads | prerequisite-before-create | 删除 wrong-root mkdir 副作用 |
| kind output contract + work-unit validation | `prior_submitted_output_roles[]` + exact current/prior submitted source-ref index | 删除 single-WU/implicit compatibility 假设；无 persistent index |
| submit/index/status/queue transaction + CLI | candidate plan不产final hash；locked unified timestamp、minimal late context、recover-declaration | 一个 explicit recovery；无 precomputed commit hash/shadow ledger |
| `ref-count.mjs` | narrow countability | 删除 content heuristics |
| reference/gate helpers | tolerant semantic parser、UID adapter、index parent guard | one resolver/evaluator |
| `wave-depth-contracts.mjs` | derive facts from reviewed ledger rows | 删除 depth-review duplicate authority |
| shared subagent/reference guidance | helper loop和actual template load | Agent 执行机械修复 |
| root `tests/` + controlled playbook | focused deterministic proof + real evidence | 不新增 production checker |
| registry/CHANGELOG/RUN | GSK/EEX摘要与v0.28同步 | governance/release only |

泛化：现有 in-memory finding/hint projection和detecting helpers。新增：rule finding-source metadata、`$checked_target`显式alias、kind-contract prior-role字段、minimal late-accept context 和一个 explicit recovery operation。删除/合并：opaque wrapper failures、123-rule static artifact-contract inventory、复杂rule单一静态basis/repair假设、central basis/repair/root-catalog risk、target-string guessing、failure-message semantic regex、string-priority roots、inspect-prose trend fallback、stale Gate inventory counts、count content heuristics、blocking Key Facts quantity、fixed question-list/Wave2 ledger order presentation、depth-review copied authority、raw topic-field readers、index/declaration cascades和current-output-only/implicit-compatible source-ref。新增 0 root registry、0 平行failure shape、0 Gate、0 persistent lineage graph、0 ledger副本、0 lifecycle、0 controller、0 retry tree、0 success authority。

## Risks / Trade-offs

- [未来测试前置导致apply死锁] -> regression跟随owning implementation island，允许slice内RED->GREEN；baseline只锁定当前truth，不要求未来contract提前PASS。
- [Gate metadata/parser形成flag day] -> schema/finding先用synthetic fixture；metadata先以old-loader可忽略字段覆盖十份definition；全部合法后才切production parser，再分组迁移wrapper/inspect。
- [Engine hint上线但Markdown仍无消费方] -> 十个Controller consumption与Gate feedback放在同一island exit条件内，不把supply-only状态带入下一island。
- [Prior-role contract先上线但validator仍不消费] -> `prior_submitted_output_roles[]`、submitted-output index/validator和supplementary guidance都由Wave1 lineage island拥有；Wave0 island只生成当前submit contract的通用starter。
- [后续domain改动掩盖Gate core regression] -> Gate island必须独立全绿；quality、Wave0、Wave1、recovery各有focused exit checkpoint，后续slice不承担前一slice修复。
- [Definition/checker root contract 漂移] -> active Gate pass matrix + evaluator-family unknown-check/missing-root-contract negative test + changed-root focused regression；不以逐rule mapping换取表面完整性。
- [共享schema迁移遗漏production reader] -> no-bypass dependency/source check发现direct semantic reads；测试不维护consumer名单，post-final raw-byte hash accessor明确隔离。
- [Definition metadata改变post-final raw hash] -> fresh inspect按current bytes建立新operation binding；已accepted的in-flight operation继续在raw drift时fail closed；semantic parser只负责rule读取，不把hash改成忽略metadata的normalized digest。
- [Post-final hash与semantic rule来自两次读取] -> shared reader提供同一read的paired raw bytes + parsed value；hash与limit绑定同一snapshot，禁止read-twice TOCTOU窗口。
- [要求所有tests都先parse导致无法构造invalid fixture] -> positive semantic readers必须用shared parser；negative tests可raw修改fixture，但只通过production parser/CLI证明拒绝，不赋予raw object有效contract地位。
- [Checked target 被误当 writable surface] -> 只有definition-owned `agent_action` singular non-glob target且current finding可唯一解析时才可显式使用`$checked_target`；wildcard/multi-coordinate/Engine-owned negative tests禁止alias和manual edit advice。
- [复杂rule静态basis/repair掩盖真实root] -> provenance/depth/reference/status等多root check使用checker-owned finding；missing checker root contract转configuration-integrity，不退回definition fallback。
- [动态坐标模板泄漏或解析错Topic] -> placeholder allowlist + checker-context exact resolution；未解析模板作为config failure，不作为Agent hint。
- [legacy failure_message误导] -> projector不从message生成action-bearing advice或排序，Controller只从hint取行动；无需全量改写，也不用prose regex制造blocking audit。
- [Root projection 变成 generic controller] -> 只保留单次 evaluation 的 in-memory object；无 persisted graph、auto-write、semantic selection或permission。
- [多个 independent roots 仍造成噪声] -> prerequisite short-circuit + smallest independent root set；完整细节留 bounded diagnostic。
- [全 Gate 审计扩大 scope] -> 只统一 feedback/metadata/basis，不重写各 Gate 的 accepted routing或无关业务逻辑。
- [Presentation tolerance吞掉missing semantics] -> tolerant 的是 case/level/spacing/order/list style；required semantic availability、metadata、URL、authority仍strict。
- [Recovery reconstruction 误造原 row] -> recomputed hash必须等于 existing index/status hash；绝不 rebind hash；legacy proof不完整即 block。
- [Minimal late context 变成 shadow row] -> 只保存不可推导 fields；schema/static tests禁止复制 result/output/cache/receipt/actor/ledger row。
- [Prior source_ref 跨 Topic/contract 泄漏] -> canonical UID + same wave/kind + contract-declared prior role + hash-valid submitted row exact match；不做 string similarity或implicit compatibility。
- [Starter 被当 result] -> task-only code block，不预写 file，submit/Gate 不读取 starter。
- [Normal first-run退化] -> shared renderer/parser/evaluator与 all-Gate matrix 都覆盖 normal cases；不加 rerun branch。
- [点状BUG tests全绿但rerun仍悄悄走不同contract] -> bounded first-run vs rerun-added parity比较producer/work-unit/submit/reference/depth/Gate contract-bearing facts，只忽略合法run identity差异；不建设runtime signature或test-only全字段inventory。
- [Heavy canary依赖 actor/search] -> NOT_RUN不算PASS；deterministic regression与real behavior evidence分开报告。
- [另起新canary或把case-163 fixture当真实Agent证明] -> 只扩展existing case-163及其registry wording；historical scripted state仅是前置条件，new Topic actor/search/fetch与产物必须是真实执行。

## Migration Plan

1. 运行现有tests锁定normal first-run与current runtime基线；九个BUG regression不作为“当前PASS”提前堆叠。
2. Gate island：synthetic schema/finding/result core -> additive metadata覆盖十definitions -> production parser/no-bypass cutover -> detecting helpers -> non-Wave wrappers -> Wave inspect/formal wrappers -> Controller hint consumption -> all-Gate checkpoint。
3. Quality island：删除/降级无blocking basis的count/presentation/duplicate rules，统一reference binding/index parent与depth direct derivation，清理changed-rule shadow dispatch/wording/fixtures。
4. Wave0 producer island：完整seed renderer、claim roots、canonical work-unit root、starter，以及candidate validation + locked final row/hash construction的单一submit transaction boundary；再接normal phase/protocol wiring，用deterministic integration证明new Topic进入normal submitted provenance。
5. Wave1 lineage island：prior submitted output index、supplementary guidance、shared template和minimal depth input；运行combined Wave1 checkpoint。
6. Recovery island：复用Wave0 island已稳定的transaction-bound row construction，只增加minimal late context、hash-identical `recover-declaration`和missing-row parent diagnostic；先用real CLI生成valid row再做deterministic fault injection。
7. 全量deterministic suites转绿后，才更新并执行controlled real-Agent rerun canary through Wave1、hint repair和declaration fault/recovery。
8. 最后更新registry、CHANGELOG、RUN与v0.28，并运行OpenSpec/governance/diff checks。

无需自动迁移已有 bundle。Legacy submitted rows 继续正常使用；只有 ledger 真实丢行时才进入 recovery，且必须能复现 existing recorded hash。旧 depth-review copied fields 兼容读取但不再 blocking。Valid historical references 不批量改写。Rollback 可还原 framework/Markdown 变更；已生成的完整 seed、valid submitted rows 和 hash-identical recovered rows仍符合single-authority contract。

## Open Questions

- 无阻塞问题。第七轮 apply-readiness 审查已把 Gate parser/wrapper cutover、submit/recovery direct owners、Wave1 lineage、normal-path parity和controlled case-163逐项对照现有实现；本 Change 的planning artifacts现在标记为 **apply-ready**。这只表示设计与任务顺序具备实施条件，不自动授权修改target code；进入实现仍需用户明确启动 `/opsx:apply`。
- Apply 若证明 batch allocator、normalized result hash 或其他被怀疑 surface 本来正确，保留 regression 并缩小实现；不得为了 BUG 描述强行改动正确逻辑。
