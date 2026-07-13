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
| BUG-089 | supplementary source claim 只能引用当前 output | 接受同 Topic prior compatible submitted output |

这些 BUG 还暴露了更上位的 control defect：Engine 在 gate definition、schema、checker、producer 和 checkpoint 中已经知道 contract lineage，但 formal Gate 往往只返回 pass/fail、松散 `inspect[]` 和泛化 `advice[]`。Agent 看不到内部 lineage，只能猜字段、路径和下一条命令。逐事故补错误字符串会继续扩大 Gate 与补丁数量。

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
- Gate contract lineage：`DPT_FRAMEWORK/schema/contracts/gate-definition.mjs` 的 shared Zod contract + ten active definitions + GSK-011 rule/preflight inventory；rule `target` 是 checked authority，不自动是 writable surface
- Gate observed truth：各 checker 读取的直接 authority；现有 `wave-contract-findings.mjs` finding 和 `hints[]` 只是同一次 evaluation 的 in-memory feedback projection，不是新 authority

## Goals / Non-Goals

**Goals:**

- 任意 `seed_binding:new` 都得到同一完整 seed skeleton；不按 rerun 生成另一模板。
- rerun 只分类：existing valid coverage 复用；new Topic 走 normal pipeline；supplement 走 normal supplementary demand。
- 全部十个正式 Gate CLI 的每个 independent primary failure 都返回 `rule_id/missing_fact/write_to/rerun`；pass 时 `hints: []`。
- 所有对应 Markdown Controller 都先消费 `hints[]`，在现有authority内执行机械修复并重跑同一checkpoint；不从opaque advice重新猜lineage。
- 每条 active blocking Gate rule 都有可审计的 blocking basis、producer/authority/checker/test closure 和合法 repair owner/surface。
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

### 1. Active Gate rule 必须声明 blocking basis 与 repair ownership

全部十份 active gate definition 的每条 blocking rule 保留 stable rule identity，并补齐：

```text
blocking_basis
repair.owner
repair.write_to
```

合法 blocking basis 限于 direct authority existence/parseability、identity/provenance binding、accepted structure/enum/invariant/floor、required semantic availability 或 recorded human decision。仅保护 heading 顺序、大小写、列表样式、prose 长度或偏好数量的规则删除、宽容解析或降为 advisory。

`rule.target` 只表示 checker 读取的位置。若 target 是 status、trace、ledger、index、receipt、hash 或其他 Engine-owned authority，`repair.write_to` 必须指向现有合法 Engine operation；没有合法 operation 时返回 `missing_contract`，不得把 direct file edit 伪装成修复路径。

这些definition字段由 `DPT_FRAMEWORK/schema/contracts/gate-definition.mjs` 中一个新的、非deprecated的 Zod Gate-definition contract解析。所有 production semantic readers 必须导入同一个 parser：`loadGateDefinition()`/safe loader、`consistency-validator.mjs`、`post-final-recovery.mjs` 的 rerun guard、`validate-work-unit-hygiene.mjs` 的 definition audit，以及 GSK-011 active-rule audit。Definition tests也消费同一schema；不得让runtime或维护CLI继续裸`JSON.parse`而audit维护第二套字段断言。`post-final-recovery` 可以继续对原始definition bytes计算SHA-256，但任何 `gate/rules/operator/value` 语义读取必须来自schema-parsed value。Schema只校验静态definition shape和跨字段owner/surface约束，不执行Gate rule，也不成为runtime verdict；check-specific dispatch、producer/test closure仍由GSK-011 audit拥有。

防旁路不依赖另一份永久手写reader名单。Static no-bypass check扫描production对`schema/gate_definitions`的直接读取：除shared parser内部的parse和post-final明确的raw-byte hash accessor外，任何semantic read必须导入shared parser。当前consumer names只用于迁移与focused regression，不成为第二份Source of Record。

`repair.write_to` 可以使用受控的definition-time坐标模板，例如 `{topic}`，但只允许schema登记的占位符。Checker必须用本次direct evaluation context把它解析成exact bundle-relative path/JSON pointer或现有Engine operation；resolved hint不得残留placeholder。无法解析所需坐标属于definition/config failure，不得把模糊模板交给Agent。`rerun`不在每条rule里重复存储，由formal Gate或inspect的checkpoint projector生成。

现有 `failure_message` 只保留为兼容的人类可读展示，不是repair authority。它不得与 `repair.owner/write_to` 冲突，不得建议手改status、trace、ledger、index、receipt或hash，也不得把需要Engine operation的事实描述为“改文件即可”。GSK-011 audit和逐definition review同时检查这条非矛盾约束，避免Controller虽优先读hint、却仍被legacy advice反向误导。

GSK-011 audit 扩展为 executable contract inventory，验证 active rules 以及 rule loop 之外的 formal preflight/config roots：

- ten definitions 与 ten independent CLI wrappers 双向一一对应，包含 `rerun-ready`；
- check dispatch 已知且只有一个 truth path；
- producer、authority、checker、diagnostic、test closure 完整；
- blocking basis、repair owner 与 write surface 自洽；
- removed/downgraded rule 不残留在 helper dispatch、degradation allowlist、static inventory 或 producer wording。
- production definition semantic read不存在shared parser旁路；raw-byte读取只保留已声明的hash用途。
- invalid invocation、definition/config、binding、handoff/status、topic-state prerequisite、routing 和 durable handoff trace roots 也有 stable identity、blocking basis、repair owner/write surface 与 focused test。

这是一份静态 closure audit，不是 runtime lineage database。

### 2. 泛化现有 structured finding，所有 formal Gate failure 从它投影

本Change不新建平行failure object。它泛化现有 `DPT_FRAMEWORK/engine/helpers/wave-contract-findings.mjs` 的 `makeContractFinding()`、`buildContractEvaluation()` 和 `projectInspectContract()`：在已有 `rule_id/classification/surface/expected/repair/detail/masked_rule_ids` 基础上补direct observed fact、repair owner、resolved `write_to`、missing-fact projection所需字段和checkpoint context。Formal Gate与Wave inspect都消费这个shape；compatibility adapters可以把旧checker结果一次性归一化，但不得形成第二种成功/失败解释。

Checker boundary 产生的统一 in-memory finding 至少保留：rule/root identity、direct observed fact、expected contract、checked authority、repair metadata、classification 和 masking relationship。Shared builder 从它投影：

```json
{
  "check": { "passed": false, "failed_rule_ids": ["..."] },
  "routing": { "kind": "..." },
  "inspect": ["bounded forensic detail"],
  "advice": ["compatible human-readable advice"],
  "hints": [{
    "rule_id": "...",
    "missing_fact": "earliest direct failed fact + expected/observed contract",
    "write_to": "exact authorized surface or legal Engine operation",
    "rerun": "exact same Gate checkpoint"
  }]
}
```

Pass 必须返回 `hints: []`。每个 independent primary root 返回一个 hint；parent artifact/schema/identity failure 先短路依赖规则，masked/downstream symptoms 只留作 bounded forensic detail。实现使用 local prerequisites 与现有 masking 概念，不建设 general dependency engine。

十个 wrappers 的 invalid invocation、definition parse/load、node/gate binding、handoff/status preflight、topic-state prerequisite、gate-specific prerequisite、rule evaluation、routing/config 和 durable handoff trace failure都走 shared failure/result builder。Wrapper 不再从 error string、`inspect[]`、`advice[]`、`failure_message` 或 target filename 猜 hint，也不能手工返回一个缺 `hints[]` 的 failed result。

`buildGateResult()` 的primary root/hint顺序必须来自structured finding的classification、prerequisite masking和stable rule identity。现有 `gateMessagePriority()`/`prioritizeMessages()` 不得继续用error-string regex决定root precedence；可删除，或仅作为不影响`failed_rule_ids/hints[]`的legacy prose展示。Gate attempt trend只比较stable `failed_rule_ids`；旧diagnostic没有这些IDs时不参与比较，当前结果成为第一份可比较sample，不再退回比较`inspect[]` prose。

当 bundle/current node 已解析，`rerun` 使用 canonical absolute bundle root 和 exact current node。Invocation 本身缺参数时，root 明确指出缺失 invocation fact，并保留同一 executable 与所有已知 exact args；不得编造未知 runtime path。

### 3. Wave inspect 与 formal Gate 共享 root，不共享副作用

Wave0/Wave1/Wave2 inspect 与 formal Gate 对共享 artifact/provenance rules 消费同一个 pure evaluator finding，因此 `rule_id/missing_fact/write_to` 相同；各自的 `rerun` 指向实际调用的 inspect 或 formal Gate checkpoint。

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

Wave1 definition 删除 blocking `key_facts_min_lines`；对应 checker dispatch、rule inventory、degradation list、producer wording 和 blocking tests 同步删除或降级，避免 shadow rule。

### 8. Depth review 从 submitted ledger 派生，不复制 authority

`depth-review.yaml` blocking shape 只保留不可从 direct authority 推导的事实：version/topic、`reviewed_work_unit_refs[]`、depth dimensions、profile judgment、decision、supplementary IDs。

Engine 从 reviewed hash-valid submitted rows 读取 source claims/accepted URLs/cache/degraded refs，从 Wave0 authority 取得 baseline URLs，从 profile 计算 required floor，再派生 mapping/novelty/observed count。旧 `wave0_source_urls/source_claims/new_source_urls/new_source_floor` 可兼容读取或报告 advisory drift，但不决定 pass/fail。

Missing/unresolved reviewed ref 是 parent root，mask source/cache/novelty/floor symptoms。Filesystem-only cache 不能创造 coverage。

### 9. Declaration recovery 复用 direct owners，不建立 witness/shadow ledger

Normal 与 late submit 在 existing transaction 内先生成一个 submission timestamp，再用它构造 ledger row 和 `ledger_record_hash`，并一致写入 ledger `declared_at`、index `terminal_at`、status `updated_at` 和 queue `completed_at`。Dry-submit只验证可在提交前确定的候选事实，不固定最终timestamp/hash。Normal ledger row 因此可由现有 manifest/beacon/result/receipt/output/source/cache/index/status/queue owners 确定重建，不增加 recovery file 或 row copy。

Late-submit 只在 existing work-unit index 保存无法从其他 owner 推导的最小 accepted context：late accept reason、prior terminal status `timed_out`、superseded retry IDs。它不复制 result/output/cache/receipt/actor 或完整 ledger row，也不被 Gate 当作 coverage。

Existing `operate-work-unit.mjs` 增加狭窄 `recover-declaration` operation：

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

`validateSourceClaims` 使用一个由 hash-valid bundle ledger + canonical topic resolver 派生的 in-memory submitted-output index。它不是新 persistent authority。

Accepted `source_ref` 合法形式：

1. 当前 result `output_files[]`；或
2. 同 canonical Topic、compatible Wave1 evidence-output contract 的 prior hash-valid submitted output。

Filesystem-only、unsubmitted/invalid row、cross-topic、ambiguous text match 继续拒绝。当前 supplementary work unit 新增的 cache/degraded refs 仍由当前 result 声明。Diagnostic 给出 claim index、candidate、searched current/prior sets、conflicting work/topic，以及 exact JSON pointer + same dry-submit rerun。

## Helper Direction Review

1. 确实需要用户的决定：新增 Topic 语义、改变研究目标、风险/权限扩张，或 accepted contract 明确要求的 HITL 选择。
2. 决定后回到 Agent 的步骤：topic-state apply、enqueue、actor probe、claim、真实 work、dry-submit repair、formal submit、reference/depth materialization、declaration recovery、inspect/Gate rerun 和后续 normal pipeline。

Gate hint 不把命令推给用户；它把 Engine 已知的合法路径交给 Agent。若 `repair.owner` 是 user/external/missing_contract，Agent 只升级最小决策或不可代理边界，不能把 `human-directed` 当 permission token。

## Verification

### All-Gate contract matrix

- 自动枚举 ten definition/CLI pairs，不在 test 中维护第二份手写 Gate count。
- 每个 Gate pass 都有 `hints: []`；每个代表性 active rule failure 都有完整 `rule_id/missing_fact/write_to/rerun`。
- invalid invocation、definition/config、node binding、handoff/status、topic-state/gate prerequisite、rule evaluation、routing 和 durable trace failure均不漏 shared finding/output shape。
- Runtime loader、consistency validator、post-final recovery、hygiene validator和GSK-011 audit对同一definition bytes给出同一schema verdict；post-final raw-byte hash保持不变。
- Dynamic `write_to` template全部解析成exact coordinate；unknown placeholder/config context fail closed且不泄漏模板给Agent。
- `failure_message`与repair metadata不矛盾，不建议手改Engine authority；structured roots而非string regex决定primary顺序与attempt trend。
- Engine-owned authority 的 `write_to` 只指 legal operation 或 `missing_contract`，从不建议手改 status/trace/ledger/index/receipt/hash。
- Parent root mask dependent hints；fatigue/degraded wording不替代 direct hint。
- Wave inspect/formal Gate 对 shared rules 的 root coordinates 同源，inspect保持 no-write/no-routing。
- GSK-011 audit 验证 blocking basis/repair closure、ten-pair bijection 和 removed-rule no-shadow；registry GSK-002/003/004 stale counts 同步修正。

### Nine-BUG regression matrix

- BUG-081：new add/migrate seed完整、exact tokens、existing enrichment保留、HITL1兼容。
- BUG-082/083：historical coverage + new submitted pass；orphan fail；delegated/empty/observation/fallback roots可区分；b000 -> b001不退化。
- BUG-084：absolute root一致、nested-root零写、starter/schema一致、dry-submit independent roots；strict actor/receipt/provenance仍拒绝冲突。
- BUG-085：UID-only/legacy pass、dual conflict一次、index parent short-circuit、inspect/Gate/file-observability同源。
- BUG-086：short prose/few facts/harmless presentation不影响 count；missing semantic section只由 format 报；blocking Key Facts quantity 退役。
- BUG-087：minimal depth review不复制 source/cache fields也pass；derived mapping/novelty/floor正确；filesystem-only cache fail；missing reviewed ref短路。
- BUG-088：normal/late submit direct facts 可重建；reconstruction facts不直接满足 Gate；exact-hash recovery、idempotency、legacy evidence和conflict/no-write覆盖。
- BUG-089：current output pass；prior same-topic compatible output pass；filesystem-only/cross-topic/unsubmitted fail；diagnostic包含 exact pointer 和 same dry-submit。

### Controlled real-Agent canary

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
| Gate-definition Zod contract + all ten definitions | one parser供loader/consistency/post-final/hygiene/audit共用；blocking basis + repair owner/write surface；删除无依据 blocker | 静态 lineage，不增加 runtime state或第二validator |
| `wave-contract-findings`、`gate-helpers-core`、shared evaluators | 泛化existing finding -> check/inspect/advice/hints；structured root排序 | 删除平行failure shape、wrapper/string-priority inference和inspect-prose trend fallback |
| all ten `check-gate-*.mjs` wrappers | 所有 failure exit 走 shared builder | 保持 one-gate-per-CLI |
| GSK-011 rule/preflight inventory/static audit | ten-pair bijection + repair closure + no-shadow guard | 防止未来继续堆 opaque Gate |
| Wave inspect CLIs/evaluators | shared root coordinates + inspect-specific rerun | read-only，无 second validator |
| `canonical-topic-state.mjs` | full shared new-seed renderer/merge | 删除 thin skeleton drift；无新 owner |
| all ten Gate phase/controllers + producer Markdown | 统一hint consumption、normal rerun classification、template requires、minimal depth review | 无新controller、rerun phase或gate |
| queue/work-unit claim helpers/CLI | distinct root + repair coordinates | read-only feedback；allocator按测试最小修改 |
| `work-unit-envelope.mjs` | absolute root、starter、checklist | 复用 manifest/schema；无 scaffold CLI |
| work-unit existing reads | prerequisite-before-create | 删除 wrong-root mkdir 副作用 |
| work-unit validation | current/prior submitted source-ref index | 删除 single-WU 假设；无 persistent index |
| submit/index/status/queue transaction + CLI | unified timestamp、minimal late context、recover-declaration | 一个 explicit recovery；无 shadow ledger |
| `ref-count.mjs` | narrow countability | 删除 content heuristics |
| reference/gate helpers | tolerant semantic parser、UID adapter、index parent guard | one resolver/evaluator |
| `wave-depth-contracts.mjs` | derive facts from reviewed ledger rows | 删除 depth-review duplicate authority |
| shared subagent/reference guidance | helper loop和actual template load | Agent 执行机械修复 |
| root `tests/` + controlled playbook | focused deterministic proof + real evidence | 不新增 production checker |
| registry/CHANGELOG/RUN | GSK/EEX摘要与v0.28同步 | governance/release only |

泛化：现有 in-memory finding/hint projection。新增：rule repair metadata、minimal late-accept context 和一个 explicit recovery operation。删除/合并：opaque wrapper failures、target-string guessing、string-priority roots、inspect-prose trend fallback、stale Gate inventory counts、count content heuristics、blocking Key Facts quantity、fixed question-list presentation、depth-review copied authority、raw topic-field readers、index/declaration cascades和current-output-only source-ref。新增 0 平行failure shape、0 Gate、0 persistent lineage graph、0 ledger副本、0 lifecycle、0 controller、0 retry tree、0 success authority。

## Risks / Trade-offs

- [Hint metadata 与 checker 漂移] -> GSK-011 对 producer/authority/checker/diagnostic/test 做静态 closure；rule change必须同轮更新 metadata/test。
- [共享schema迁移遗漏production reader] -> reader inventory测试锁定loader、consistency、post-final、hygiene和audit；semantic read不允许raw parse旁路。
- [Checked target 被误当 writable surface] -> repair owner/write_to 独立声明；Engine-owned authority negative tests 禁止 manual edit advice。
- [动态坐标模板泄漏或解析错Topic] -> placeholder allowlist + checker-context exact resolution；未解析模板作为config failure，不作为Agent hint。
- [legacy failure_message与hint冲突] -> definition audit同时验证compatibility message不得建议非法write或与owner/surface相反。
- [Root projection 变成 generic controller] -> 只保留单次 evaluation 的 in-memory object；无 persisted graph、auto-write、semantic selection或permission。
- [多个 independent roots 仍造成噪声] -> prerequisite short-circuit + smallest independent root set；完整细节留 bounded diagnostic。
- [全 Gate 审计扩大 scope] -> 只统一 feedback/metadata/basis，不重写各 Gate 的 accepted routing或无关业务逻辑。
- [Presentation tolerance吞掉missing semantics] -> tolerant 的是 case/level/spacing/order/list style；required semantic availability、metadata、URL、authority仍strict。
- [Recovery reconstruction 误造原 row] -> recomputed hash必须等于 existing index/status hash；绝不 rebind hash；legacy proof不完整即 block。
- [Minimal late context 变成 shadow row] -> 只保存不可推导 fields；schema/static tests禁止复制 result/output/cache/receipt/actor/ledger row。
- [Prior source_ref 跨 Topic 泄漏] -> canonical UID + compatible contract + hash-valid submitted row exact match；不做 string similarity。
- [Starter 被当 result] -> task-only code block，不预写 file，submit/Gate 不读取 starter。
- [Normal first-run退化] -> shared renderer/parser/evaluator与 all-Gate matrix 都覆盖 normal cases；不加 rerun branch。
- [Heavy canary依赖 actor/search] -> NOT_RUN不算PASS；deterministic regression与real behavior evidence分开报告。

## Migration Plan

1. 先锁定 ten Gate inventory、all-failure hint matrix、九个 BUG 与 normal compatibility regressions。
2. 扩展 definition metadata、GSK-011 rule/preflight-root audit、shared root/failure builder，再迁移十个 wrappers 和 Wave inspect。
3. 删除/降级无 blocking basis 的 presentation/duplicate rules，并清理 active shadow dispatch/inventory。
4. 更新 seed renderer、phase guidance、claim/envelope/dry-submit helper和source-ref resolution。
5. 统一 submit timestamps、保存 minimal late context，实现 hash-identical `recover-declaration` 与 missing-row parent diagnostic。
6. 运行 targeted/full regressions、OpenSpec/governance checks。
7. 执行 controlled real-Agent rerun canary through Wave1和declaration fault/recovery。
8. 更新 GSK-002/003/004、EEX-001 registry摘要、CHANGELOG 和 RUN 到 v0.28。

无需自动迁移已有 bundle。Legacy submitted rows 继续正常使用；只有 ledger 真实丢行时才进入 recovery，且必须能复现 existing recorded hash。旧 depth-review copied fields 兼容读取但不再 blocking。Valid historical references 不批量改写。Rollback 可还原 framework/Markdown 变更；已生成的完整 seed、valid submitted rows 和 hash-identical recovered rows仍符合single-authority contract。

## Open Questions

- 无阻塞问题。Apply 前仍应继续多轮复读；本轮 strict validation 只证明 Change artifacts 结构合法，不等于设计已经获得 apply approval。
- Apply 若证明 batch allocator、normalized result hash 或其他被怀疑 surface 本来正确，保留 regression 并缩小实现；不得为了 BUG 描述强行改动正确逻辑。
