## Context

九个缺陷都集中在同一个条件：一份 normal run 已经有 historical topics、submitted work units、references 和 Wave gates，sanctioned rerun 再 `add_topic`。正常首次运行没有这些症状，因此本设计不建立 rerun 专用执行机制，也不放宽 rerun gate；它修复增量入口没有重新接回 normal Topic pipeline，以及历史 quality-control chain 在该入口被放大的重复 truth 和不透明反馈。

连续断点：

1. BUG-081：new seed renderer 只写 title、scope role、must-answer，缺少可 enrich/回填 skeleton。
2. BUG-082：Phase guidance 没把 rerun-added Topic 送入 normal Wave0 queue/work-unit/submit，orphan `source.yaml` 被 gate 正确拒绝。
3. BUG-083：delegated item 错用 `operate-queue claim`、actor observation缺失或unnecessary fallback时，根因藏在大段输出中，看起来像 empty queue。
4. BUG-084：generated envelope 没把 Engine 已知的 binding、role、cache/meta contract变成copy-ready helper；formal submit first-error反馈迫使 Agent反复猜字段。错误相对bundle root还会产生 `<bundle>/<bundle>` read-path副作用。
5. BUG-085：reference readers分别硬编码legacy `related_topic`，UID migration和invalid index parent被多处reader放大。
6. BUG-086：`isCountable`又检查Core Content Capture长度和Key Facts数量，与format/gate重复，并把模板/表现差异变成count失败。
7. BUG-087：`depth-review.yaml`要求重抄ledger source/cache/new-source事实，形成第二blocking authority。
8. BUG-088：bundle declaration row被删后，exact `declared_at`/audit/hash input不在剩余authority中，Agent无法合法恢复，只能猜hash。
9. BUG-089：submit假设每个accepted `source_ref`必须属于当前WU output，阻止supplementary WU引用同Topic先前submitted evidence。

本设计 paired-read 并受以下宪章伴随指导约束：

- `guidelines/evolution-simple-reliable-control.md`：direct authority、one truth path、prerequisite short-circuit、one next action、net simplification。
- `guidelines/evolution-helper-oriented-agent.md`：用户只承担新语义/风险/权限决定；Agent执行已授权机械修复；Engine裁决确定性事实。

### Direct Sources of Record

- Topic identity/intent：`rb_plan.md#/topic_registry`
- Current seed projection：UID-bound `seed_topics/<current-slug>.md`
- Queue demand/in-flight/history：`rb_queue.json`
- Work-unit identity/actor/batch：`_work_units/_index.json`、manifest、beacon、status
- Actor result/receipt/output/cache：assigned work-unit paths
- Submitted delegated provenance：Engine-written `rb_output_declarations.jsonl`
- Declaration recovery-only truth：exact work-unit-local `submitted-declaration.json`; gate不直接读取
- Reference topic binding：canonical UID/current/previous-layout resolver + one thin metadata adapter
- Reference consumer navigation：accepted eight-column `reference/_INDEX.md`; 不是topic/provenance authority
- Wave1 source/cache/novelty：reviewed hash-valid submitted rows + Wave0 source authority + profile
- Completion verdict：existing shared pure evaluator + inspect/formal wrapper

## Goals / Non-Goals

**Goals:**

- 任意 `seed_binding:new` 都得到同一完整seed skeleton；不按rerun生成另一模板。
- rerun只分类：existing valid coverage复用；new Topic走normal pipeline；supplement走normal supplementary demand。
- claim/submit/gate的in-scope rejection让Agent知道缺什么、写哪、重跑什么，不读源码、不猜字段。
- 删除count/depth/reference中的重复blocking logic和级联症状，同时保留schema/receipt/ledger/provenance fail closed。
- declaration丢行有一个Engine-owned、explicit、audited恢复动作；witness不成为第二coverage authority。
- supplementary source claims可复用同Topic prior submitted evidence，不复制/覆盖旧evidence文件。
- focused regression和真实controlled Agent observation同时证明机制与Agent可执行性。

**Non-Goals:**

- 不新增rerun controller、mode、state、gate branch、queue namespace或第二lifecycle。
- 不让`add_topic`跨owner自动enqueue、claim、写ledger或创建WU。
- 不让filesystem-only artifact/cache/reference获得submitted authority。
- 不把semantic research/source judgment搬进JS。
- 不建设generic lineage graph、generic repair controller、watcher、daemon、后台retry或hidden fallback tree。
- 不把Result Starter预写成`result.json`，不让starter/diagnostic/witness满足gate。
- 不用summary+output_files最小submit绕过actor/receipt/provenance binding。
- 不批量改写valid historical reference，不自动迁移production bundle，不清理用户真实bundle。
- 不把Key Facts数量、prose长度、heading样式恢复为blocking quality rule。

## Decisions

### 0. Rerun只分类，新增Topic回到正常pipeline

Markdown/Agent Flow从direct facts分类：

```text
existing topic + valid submitted coverage -> reuse
new topic + no submitted coverage         -> normal Topic pipeline
supplement intent                         -> normal supplementary demand
```

分类后立即复用seed enrichment、queue/work-unit、submit、reference/depth materialization和gate。JS不持久化`rerun_topic_class`，gate不读取`rerun_count`决定放宽规则。这样正常流程仍是唯一成功路径。

### 1. Existing topic-state renderer生成完整new-seed skeleton

`canonical-topic-state.mjs`的现有renderer在无existing body时生成：canonical UID/intent frontmatter、seed-topic enrichment headings、research-round append区，以及现行五个wave-specific backfill token。`scope_role`只保留在frontmatter，不伪装成主题定位正文。Existing seed重新渲染时registry canonical keys覆盖，非canonical enrichment和body保留。

不增加`rb_templates/seed_topic.md.tmpl`：runtime topic mutation已有单一renderer owner，额外模板只增加drift/read失败面。HITL1与rerun共享同一new-projection renderer。

### 2. Wave0/Wave1 producer guidance拥有增量分类

`phase-wave0.md`只为无current queued/in-flight/submitted Wave0 coverage的新Topic创建标准`wave0_source_intake` demand；历史合法coverage不重派；supplement使用normal supplementary demand；orphan `source.yaml`不得追认。

Phase Agent读取queue-front role，做一次bounded current actor probe，把完整observation交给`operate-work-unit claim`。Delegated demand禁止`operate-queue claim/complete`。Wave1用相同分类进入normal deepening、submit、reference/depth materialization。`phase-wave1`必须在`requires`中实际加载`shared/shared-reference-template`。

不让`add_topic`自动enqueue：topic-state owner只拥有plan+seed，later phase demand由Phase Markdown在正确decision point创建。

### 3. Claim只增强direct diagnostic，不改allocator

`operate-queue claim`遇到delegated front item继续返回`item:null`且零mutation，但root必须是`delegated_requires_work_unit_claim`，不是empty。`operate-work-unit claim`继续严格要求current role-bound observation；`phase_agent_fallback`只有matching unavailable observation且kind允许时合法。

Affected rejection返回：

```text
missing_fact: 当前front item由work-unit owner claim / 或缺current actor observation
write_to: operate-work-unit claim的actor observation与execution actor输入
rerun: exact operate-work-unit claim command
```

历史b000后b001 claim先写回归。如果现有allocator已正确，不因BUG标题修改它。

### 4. Generated envelope + dry-submit承担helper责任

Claim入口将active bundle规范化为一个canonical absolute root；beacon、task、spawn/claim output、CLI examples投影同值。Bundle-relative refs只join一次。`loadWorkUnitIndex(..., {createIfMissing:false})`及inspect/dry-submit/submit/rejection preflight在missing existing authority时零写入，避免错误nested root创建`_work_units/_transactions`、lock、trace或log。

Generated `task.md`从manifest/output contract/cache policy生成：

- copy-ready Result JSON Starter：exact schema/identity/nonce/actor fields和kind允许字段；
- concise checklist：immutable envelope、receipt actor fields、allowed/required roles、cache leaf三文件、meta URL mapping、absolute root使用。

Starter只是guidance，不预写assigned result。Phase Agent fallback或rejected candidate先跑existing dry-submit，修同一candidate，再formal submit。Dry-submit累积独立violations，前置失败短路依赖项；每个primary violation带`missing_fact/write_to/rerun`。Formal repairable rejection唯一最近动作是同candidate dry-submit。

### 5. Reference binding和index parent复用one evaluator

在现有topic-layout resolver上增加thin reference adapter：

- `related_topic_uid`接受exact registered UID或`all`；
- legacy `related_topic`接受`all`或唯一可解析的current/previous id/slug list；
- dual fields必须解析一致；
- ambiguous/unknown/conflict fail closed一次。

Wave0/Wave1/Wave2 inspect、formal gate和file observability消费同一binding outcome，不再维护raw-field precedence。

`reference/_INDEX.md`先验证accepted eight-column parent。Missing/no-table/missing-columns/unparseable只返回一个parent root并mask per-file row symptoms；parent valid后missing row/wrong layer继续blocking。无需general dependency engine。

### 6. Countability只做数字资格，reference_format拥有semantic structure

`isCountable()`只回答already authority-selected reference能否进入数字count：accepted status + 至少一个parseable `source_url`。它不检查Core Content Capture长度、Key Facts数量、section order/case/level、URL path depth、duplicate/Jaccard/self-reference等内容启发式。

Shared `reference_format`独立检查五个required non-empty semantic sections和metadata/topic binding，并宽容heading presentation。Core Content Capture仍是distinct narrative section；Key Facts数量和prose richness降为advisory。Wave1 gate definition删除blocking `key_facts_min_lines`，避免`count_floor`、`reference_format`、`key_facts_min_lines`三重判断同一内容。

### 7. Depth review从submitted ledger派生，不复制authority

`depth-review.yaml` blocking shape仅保留不可从direct authority推导的事实：version/topic、`reviewed_work_unit_refs[]`、depth dimensions、profile judgment、decision、supplementary IDs。

Engine从reviewed hash-valid submitted rows读取source claims/accepted URLs/cache/degraded refs，从Wave0 authority取得baseline URLs，从profile计算required floor，再派生mapping/novelty/observed count。旧`wave0_source_urls/source_claims/new_source_urls/new_source_floor`可兼容读取或advisory drift，但不决定pass/fail。

Missing/unresolved reviewed ref是parent root，mask source/cache/novelty/floor症状。Filesystem-only cache仍不能创造coverage。

### 8. Declaration recovery是唯一新增的狭窄control surface

每次normal/late submit在existing submit transaction中持久化exact hash-valid ledger row到：

```text
_work_units/waveN/<work_id>/submitted-declaration.json
```

Witness写入/校验、bundle ledger append、index/status hash和queue postcondition都通过existing transaction durability contract；任一失败不能报告success。Gate永远只读bundle `rb_output_declarations.jsonl`作coverage，witness不直接计数。

Existing `operate-work-unit.mjs`增加`recover-declaration`：

- 只接受already-submitted work ID且bundle row缺失；
- exact witness存在时，先cross-check index/status/result/manifest/beacon/receipt/output/source/cache/queue/replacement，再原样append；
- legacy pre-witness attempt只有在完整submitted surfaces + original submit trace唯一一致时，才写带hash-covered `declaration_recovery` audit的新row和witness，并只rebind必要index/status ledger hash；
- malformed ledger、conflict、missing proof、unsubmitted status均零mutation；
- idempotent exact row返回unchanged；
- 不重做研究、不接受new result、不complete queue、不生成new provenance。

Gate/inspect看到submitted index但missing row时先返回`submitted_declaration_missing`，mask output/cache/count/bypass cascades。`write_to`指向Engine recovery operation，不指向ledger JSONL。

#### Complexity Burden of Proof

1. 现有direct check无法捕获/修复什么：可以识别missing row，但exact accepted row含动态`declared_at`/audit/hash input，剩余状态不能可靠重建。
2. Source of Record：bundle ledger仍是coverage authority；witness只拥有不可推导的exact recovery bytes。
3. 为什么不能复用现有checkpoint：submit只接受claimed/timed-out candidate，会把already-submitted recovery误当新completion；gate不能写authority。
4. 删除什么旧复杂度：删除手写hash/ledger猜测、重复submit假恢复和missing-row下游failure wall。
5. 失败唯一动作：修复/恢复最早缺失witness，或创建一个new legal attempt；不手写ledger。
6. Focused proof：exact/legacy/idempotent/conflict/no-witness/no-direct-gate-authority tests。

### 9. Supplementary source_ref解析current或prior same-topic submitted output

`validateSourceClaims`使用一个由hash-valid bundle ledger + canonical topic resolver派生的in-memory submitted-output index。它不是新persistent authority。

Accepted `source_ref`合法形式：

1. 当前result `output_files[]`；或
2. 同canonical Topic、compatible Wave1 evidence-output contract的prior hash-valid submitted output。

Filesystem-only、unsubmitted/invalid row、cross-topic、ambiguous text match继续拒绝。当前supplementary WU新增的cache/degraded refs仍必须由当前result声明和submit。Diagnostic给claim index、candidate、searched current/prior sets、conflicting work/topic，以及exact JSON pointer + same dry-submit rerun。

### 10. Contract-lineage feedback局部收敛，不建设全局controller

本Change触碰的queue claim、work-unit dry/formal submit、declaration recovery、Wave1 inspect/gate root都必须返回：

```text
missing_fact: earliest direct failed fact + owning contract
write_to: exact authorized mutable surface or legal Engine operation
rerun: same checkpoint command
```

实现优先复用existing violation/check metadata；缺少时在对应pure evaluator加入小型declarative repair descriptor。Inspect/formal wrapper共享同一descriptor。它不持久化lineage graph、不自动写Agent content、不选择semantic repair、不创建permission。Legacy `inspect/advice`文本可兼容保留，但不能是唯一导航。

## Helper Direction Review

1. 确实需要用户的决定：新增Topic语义、改变研究目标、风险/权限扩张，或accepted contract明确要求的HITL选择。
2. 决定后回到Agent的步骤：topic-state apply、enqueue、actor probe、claim、真实work、dry-submit repair、formal submit、reference/depth materialization、declaration recovery、inspect/gate rerun和后续normal pipeline。

## Verification

Focused regression：

- BUG-081：new add/migrate seed完整、exact tokens、existing enrichment保留、HITL1兼容。
- BUG-082/083：historical coverage + new submitted pass；orphan fail；delegated/empty/observation/fallback roots可区分；b000 -> b001不退化。
- BUG-084：absolute root一致、nested-root零写、starter/schema一致、dry-submit独立violations、每个root有triplet、strict actor/receipt/provenance仍拒绝冲突。
- BUG-085：UID-only/legacy pass、dual conflict一次、index parent short-circuit、inspect/gate/file-observability同源。
- BUG-086：short prose/few facts不影响count；missing semantic section只由format报；Key Facts quantity advisory；blocking gate rule被移除。
- BUG-087：minimal depth review不复制source/cache fields也pass；derived mapping/novelty/floor正确；filesystem-only cache fail；missing reviewed ref短路。
- BUG-088：normal/late submit写exact witness；witness不直接满足gate；exact recovery、legacy audited recovery、idempotency、malformed/conflict/no-witness fail closed；failure triplet完整。
- BUG-089：current output pass；prior same-topic compatible output pass；filesystem-only/cross-topic/unsubmitted fail；diagnostic包含exact JSON pointer和same dry-submit。

Controlled real-Agent canary：

1. 从历史normal-run fixture进入真实sanctioned rerun并add两个Topic。
2. Agent读取updated phase/controller，走normal Wave0/Wave1 enqueue/probe/claim/real actor/dry-submit/formal submit。
3. Supplementary WU引用同Topic prior submitted evidence；Phase Agent从reviewed ledger派生depth review，加载shared template并materialize tolerant-but-complete reference。
4. 在disposable bundle中对一个真实submitted row做明确fault injection删除，然后只用`recover-declaration`恢复；不手写hash/row/result/receipt。
5. 断言beacon unchanged、无same-name nested bundle、historical references无mass rewrite、witness未被gate直接计数。
6. PASS只来自真实trace/verdict；fixture只提供历史前置，NOT_RUN不算PASS；FAIL保留现场。

## Apply Target Manifest

| Surface | Apply action | Net control impact |
|---|---|---|
| `canonical-topic-state.mjs` | full shared new-seed renderer/merge | 删除thin skeleton drift；无新owner |
| `phase-seed-topics.md`, `phase-wave0.md`, `phase-wave1.md` | normal rerun classification、template requires、minimal depth review | 无rerun phase/gate |
| queue/work-unit claim helpers/CLI | distinct root + repair coordinates | read-only feedback；allocator按测试最小修改 |
| `work-unit-envelope.mjs` | absolute root、starter、checklist | 复用manifest/schema；无scaffold CLI |
| `work-unit-index.mjs` / existing reads | prerequisite-before-create | 删除wrong-root mkdir副作用 |
| `work-unit-validation.mjs` | current/prior submitted source-ref index | 删除single-WU assumption；无persistent index |
| `work-unit-submit.mjs`, work-unit schema/CLI | triplet diagnostics、exact witness、recover-declaration | 1个explicit recovery；无new completion path |
| `ref-count.mjs` | narrow countability | 删除content heuristics |
| Wave1 gate definition | 删除blocking `key_facts_min_lines` | 减少duplicate rule |
| reference/gate helpers | tolerant semantic parser、UID adapter、index parent guard | one resolver/evaluator |
| `wave-depth-contracts.mjs` | derive facts from reviewed ledger rows | 删除depth-review duplicate authority |
| provenance readers/evaluators | missing-declaration parent short-circuit | 删除cascade |
| Wave inspect/file observability | consume shared outcomes + triplet | 无second validator；read-only |
| shared subagent/reference guidance | helper loop和actual template load | Agent执行机械修复 |
| `tests/`, controlled playbook | focused + real evidence | 不新增production checker |
| registry/CHANGELOG/RUN | EEX摘要与v0.28同步 | governance/release only |

除declaration witness/recovery外：0 persistent state、0 gate rule、0 lifecycle、0 owner、0 retry/fallback tree、0 submit success path。净删除：count content heuristics、blocking Key Facts count、depth-review copied authority、raw topic-field readers、index/declaration cascades、current-output-only source-ref和opaque guessing。

## Risks / Trade-offs

- [Recovery witness看似第二ledger] -> gate/schema明确不读取它作coverage；only work-unit recovery owner可消费；focused negative test锁定。
- [Legacy recovery过度推断] -> complete witness set + original trace + unique submission；任一缺失block，不提供best-effort。
- [Triplet演变成generic controller] -> local declarative descriptor only；无persisted graph、auto-write、semantic selection或permission。
- [Presentation tolerance吞掉missing semantics] -> tolerant的是case/level/spacing/order/length；五个semantic sections、metadata、source URL、authority仍strict。
- [Depth derivation误把projection当authority] -> only reviewed hash-valid ledger rows + Wave0/profile direct facts；legacy copied fields不能override。
- [Prior source_ref跨Topic泄漏] -> canonical UID + compatible contract + hash-valid submitted row exact match；no string similarity。
- [Starter被当result] -> task-only code block；不预写file；submit/gate不读取starter。
- [Normal first-run退化] -> shared renderer/parser/evaluator focused normal cases；不加rerun branch。
- [Heavy canary依赖actor/search] -> NOT_RUN不算PASS；mechanism regression与real behavior evidence分开报告。

## Migration Plan

1. 先落focused regression，锁定normal behavior与九个failure shapes。
2. 删除/合并count、depth、reference duplicate checks；加入parent short-circuit和local repair descriptors。
3. 更新seed renderer、phase requires/guidance、claim/envelope/dry-submit helper。
4. 实现source-ref prior submitted resolution。
5. 在existing submit transaction内实现exact witness，再实现narrow recover-declaration与missing-row gate diagnostic。
6. 运行targeted/full regressions、OpenSpec/governance checks。
7. 执行controlled real-Agent rerun canary through Wave1和declaration fault/recovery。
8. 更新EEX-001 registry摘要、CHANGELOG和RUN到v0.28。

无需自动迁移已有bundle。Pre-witness submitted rows继续可用；只有真实丢行且full legacy witness set存在时可audited recovery。旧depth-review复制字段兼容读取但不再blocking。Valid historical reference不批量改写。Rollback可还原framework/MD变更；已生成的完整seed、exact witness和valid recovered ledger仍符合single-authority contract。

## Open Questions

- 无阻塞问题。Apply若证明batch allocator、normalized result hash或其他被怀疑surface本来正确，保留回归并缩小实现；不得为了BUG描述强行改动正确逻辑。
