# Agent-Authored Output Contract Feedback — Exploration Plan

> 状态：重新定性后的探索来源，**尚未 ready to propose**
> 创建：2026-07-13
> 重新校正：2026-07-20
> 历史名称：Agent Output Linter — Implementation Plan

---

## 当前结论

原计划提出的 broad `lint-agent-output` 产品形态已经不适合当前架构，**不得按旧设计直接实施**。

项目后来形成了两条正式反馈链：

```text
delegated work-unit
  actor writes result / receipt / output / cache
    -> operate-work-unit dry-submit
    -> formal submit
    -> submitted ledger authority

phase-owned artifacts
  Phase Agent writes projections / judgments / backfill
    -> inspect-waveN-output (side-effect-free)
    -> formal Wave Gate (same evaluator)
```

三个 `inspect-wave*-output` 已经是项目接受的 wave-specific structural lint。它们和正式 Gate 共用 evaluator，不是另一套近似规则。再新增一个基于 `PATH_FORMAT_MAP`、`--schema` 和独立 schema registry 的通用 linter，会制造第二个 validator universe。

目前仍值得调查的真实缺口更窄：

> **work-unit `dry-submit` 已覆盖 result、receipt、output declaration、cache 和 source-claim binding，但对若干 delegated output 文件只检查路径、角色和存在性；文件自身的正式 direct-shape contract 要到 Wave inspect 才检查。**

这份 plan 的任务，是确认这个反馈时机缺口是否应被收口、收口应落在哪个 owner seam，以及应阻塞 formal submit 还是只提供 scoped preflight。它不再预设必须建设一个 linter CLI。

---

## 为什么原计划必须重写

旧计划建立在 2026-07-13/14 的代码现实上，随后多个 change 改变了基础条件：

- `operate-work-unit dry-submit` 现在复用正式 submit 的 candidate validation，并返回结构化、可修复、无副作用的 `violations[]`。
- generated `task.md` 现在包含 Result JSON Starter、准确 identity、runtime receipt 说明、cache/output contract 和 copy-ready dry-submit 命令。
- `WorkUnitRuntimeReceiptEventSchema.detail` 已接受 object 或 string；旧计划列出的该项故障已失效。
- beacon/task guidance 已反复强调 canonical absolute `bundle_dir`，dry-submit 会检查 output path/existence；旧计划中的错误 bundle root 问题已有 owner。
- `inspect-wave0-output.mjs`、`inspect-wave1-output.mjs`、`inspect-wave2-output.mjs` 已成为正式、side-effect-free 的 pre-Gate feedback surface，并与 Gate 共用 evaluator。
- seed topic 已有 canonical topic-state owner、seed Gate 和 section-scoped Wave return-map inspect；它不是一个静态 `seed_topic_md` schema 能完整描述的文件。
- Gate hint/finding 架构已明确禁止第二套 rule-granular audit catalog；旧计划的 `audit-gate-test-coverage.mjs` 与 `assertHintQuality` 全 Gate 映射方向冲突。

旧设计内部也不自洽：

1. 一边声明“不检查 Markdown 标题/结构”，一边把 `Key Findings` 和固定 question-list sections 当作 schema。
2. 一边声明“不建统一调度层”，一边设计全局 path registry、schema registry、CLI、workflow header 和 terminal header 集成。
3. `blocking_basis` 是粗粒度举证类别，不是可投影的文件 schema；大量精确规则由 checker/helper imperative 地拥有。
4. dry-submit 中的“advisory violation”既不能保证 submit-equivalence，也不能支持“检查通过才退出”的完成语义。
5. syntax-only 严格 parser 可能与现有 tolerant Gate reader 产生不同 verdict；“复用 parser”不能只意味着调用同一个 npm 包。

---

## 问题证据

### 1. 代码层面：缺口仍然存在

`DPT_FRAMEWORK/engine/work-unit-validation.mjs` 当前 owner 分布：

- `readAndValidateResult()`：验证 result JSON schema、required fields 和 work-unit identity binding。
- `validateSubmitRuntimeReceipt()`：逐行解析 JSONL，并验证 receipt schema/lifecycle identity。
- `validateCacheTrails()`：验证 cache leaf 路径、base files、`meta.json` mapping、`page.md` 非空/非 placeholder 或 explicit degradation。
- `validateSourceClaims()`：验证 source ref、cache/degraded refs、accepted URL 和 submitted lineage。
- `validateOutputFiles()`：只验证 output role、bundle-relative path、文件存在和 reference declaration 的 `source_url`；**不读取 declared output 文件内容**。

因此，下列状态目前在代码上可发生：

```text
malformed / structurally incomplete delegated artifact
  -> result declaration valid
  -> dry-submit passes output existence/role checks
  -> formal submit creates ledger authority
  -> later Wave inspect rejects artifact direct shape
```

这不是 Gate 缺少反馈；是反馈发生在 submitted attempt 之后，而不是 candidate decision point。

### 2. 历史正式 run：曾重复造成 contract wall

这不是纯理论风险：

- `BUG-038`：`source.yaml` 格式不清楚，经历多轮 Gate 修正。
- `BUG-075`：5 个 Wave1 work units 全部 submit 成功后，evidence-summary、question-list、depth-review 等在 Gate 首次暴露 19 条技术性失败；该 bug 明确指出 result schema/dry-submit 没覆盖 output 内容格式。
- `BUG-077`：Agent 需要从 Engine 源码反推 `source.yaml`、cache、reference contract。
- `BUG-091`：旧 artifact 与新 Gate contract 的 cross-version skew；它证明格式漂移的破坏性，但**不授权建设 legacy migration 或把 version skew 混入本问题**。

当前 top-level runtime bundles 仍能找到缺少现行 Wave1 section/marker 的历史 artifacts，但这些 bundles 跨越多个 framework 版本，不能单独证明当前版本干净运行仍会复现。

### 3. 当前证据边界

截至 2026-07-20：

- active bug registry 为空；没有一条当前版本 active bug 直接要求新 linter。
- 代码能够证明 feedback timing gap。
- 历史正式 runs 能证明该 gap 曾反复造成高成本修复。
- 尚缺一个**当前版本、真实 disposable bundle、正常 generated task/role guidance** 下的复现，或一个不依赖复现频率也成立的 preventive contract decision。受OpenSpec phase gate约束，前者只能作为已批准change的apply pre-target evidence，不能为了让本计划“更确定”而提前运行。

因此本计划有合理来源，但还不能从“有历史痛点”直接跳到“某个 implementation 已获批准”。

### 4. Review 后补充的现状约束

下面这些不是实现建议，而是 proposal 前必须纳入的当前代码/规格事实：

- `WorkUnitManifestSchema.output_contract` 和 beacon 中的同名字段目前只是宽泛 `JsonObject`；真正的 kind-contract consistency 主要在 envelope 生成时做 imperative validation。新增 content contract transport 不能继续依赖“任意 JSON 先进入 manifest，submit 再猜怎样解释”。
- `kindContractForQueueItem()` 目前允许 queue item 或 `payload.output_contract` **整块覆盖**默认 kind contract。若方案 A 复用这条入口，必须定义 override 是否仍合法、谁验证 unknown contract ID/重复 path/conflicting role，以及 invalid override 在 claim 写 envelope 前怎样 fail closed。
- 当前candidate validation已通过 `validateQueueBindingForSubmit()` 重算manifest内嵌queue item的snapshot hash并与index binding比较；index不保存output-contract snapshot/digest，也尚未从这份已验证snapshot重建并比较expected output contract。若submit开始以manifest中的direct contract决定acceptance，最小优先方案应是“复用现有index-bound queue snapshot校验 -> closed/versioned resolver重建expected contract -> 比较manifest/beacon”，而不是先增加一份authority。只有这条链无法绑定resolver version或其全部输入时，才论证最小的新index marker/digest/state。
- accepted `delegated-work-units` 已要求 inspect/dry-submit/formal submit用同一beacon-binding evaluator，将beacon剩余内容与index、manifest和**contract-derived expected binding**比较；当前 `readAndValidateBeacon()` 尚未比较 `output_contract`。这是既有spec debt，不是本计划可以重新包装成新需求的行为增量。
- `writes_to[]` 不是 required exact-output contract。Wave0 task card 同时包含 required `source.yaml` 与 optional/pattern-like reference 写入；Wave1 历史 spec 也曾包含 glob-like reference 目标。不能把每个 `writes_to` 字符串机械变成 required `required_outputs[]`。
- accepted `delegated-work-units` 已要求 generated checklist 投影“required path-role pairs”，但当前 task generator主要只投影 allowed roles。这是第二项**既有spec debt**；它与beacon contract-derived binding都必须和“submit新增content validation”分栏追踪，不能把三者混成一个新 requirement。
- 当前 Wave1 submit 仍会按 canonical path 把 role `other` 窄化为 `evidence_summary` / `question_list`。exact-output binding若落地，必须明确这条 compatibility normalization 是保留、限缩还是删除；不能让新 binding 与旧 path-based normalization同时成为隐藏解释者。
- submitted ledger 的 `result_hash` 绑定的是 result JSON，不绑定 declared artifact bytes。candidate direct-shape check默认只能证明“该次 authoritative evaluation 读到的当前文件满足 contract”，不能暗示提交后 artifact 内容获得了新的不可变 hash authority。

这些约束把问题进一步收窄为：**在不引入第二份规则、不把 `writes_to` 误当 required contract、也不虚构 artifact immutability 的前提下，是否能让现有 candidate decision point复用正式 direct facts。**

---

## 当前 artifact ownership map

| Artifact | 主要 writer | 当前最早 checker | 最终 authority/checker | 当前判断 |
|---|---|---|---|---|
| `_work_units/*/result.json` | selected work-unit actor | dry-submit | formal submit/schema | 已收口，不进入新 scope |
| `runtime-receipt.jsonl` | selected work-unit actor | dry-submit | formal submit/schema | 已收口，不进入新 scope |
| cache `meta.json` / `page.md` | selected work-unit actor | dry-submit cache contract | submit + Wave provenance | 已收口；`websearch.json` 当前只有 presence contract |
| `artifacts/wave0/{topic}/source.yaml` | delegated/fallback actor when explicitly assigned | dry-submit 只验 declaration/existence | Wave0 inspect/Gate 验 YAML array + `ReferenceMetadataArraySchema` | **conditional candidate gap**：仅限本attempt的Engine-bound required exact output |
| Wave1 `evidence-summary.md` | delegated/fallback actor when explicitly assigned | dry-submit 只验 declaration/existence | Wave1 inspect/Gate 验 URL、Key Findings、return map | **conditional candidate gap**：不得把prior-output复用或supplementary partial误判为required rewrite |
| Wave1 `question-list.md` | delegated/fallback actor when explicitly assigned | dry-submit 只验 declaration/existence | Wave1 inspect/Gate 验四个 semantic sections、return map | **conditional candidate gap**：仅限本attempt的Engine-bound required exact output |
| `reference/*.md` | Wave0 可 delegated；Wave1/2 多为 Phase-owned projection | owner-dependent；通常 Wave inspect | reference format/backing/index/provenance helpers | 不能用一个统一 `reference_md` verdict |
| `depth-review.yaml` | Phase Agent after submit | Wave1 inspect | same checker in Gate | 已有正确 checkpoint；不是 work-unit candidate artifact |
| Wave2 finding index / ledger / synthesis | Phase Agent | Wave2 inspect | same evaluator in Gate | 已有正确 checkpoint |
| `seed_topics/*.md` | topic-state Engine + phase enrichment/backfill | topic-state inspect / seed Gate / Wave inspect | owner-specific checks | dynamic projection，不是单文件 schema 问题 |

表中的conditional gap不是按artifact filename自动成立。只有assignment matrix和attempt-bound contract证明“这个actor在这个attempt必须交付这个exact path”后，candidate checkpoint才有权阻塞其direct shape。

---

## 更准确的问题陈述

不要再问：

> “项目是否需要一个可以 lint 任意 Agent 输出文件的工具？”

应当问：

> “当 work-unit output 已经有正式 direct-shape contract 时，candidate validation 是否应在 formal submit 前复用该 contract；如果应当，contract 如何进入 manifest、如何与 Wave evaluator single-own、如何避免把 Phase-owned/dynamic checks错误前移？”

这里有六个必须同时闭合的决策面：

1. **Blocker admission**：哪些direct facts有足够burden成为candidate blocker？
2. **Fact ownership**：哪个深模块拥有这些direct facts的唯一实现？
3. **Assignment and integrity**：哪些output是本attempt的required exact output，contract如何由Engine绑定并防漂移？
4. **Checkpoint and lifetime**：哪些路径做首次acceptance、replay或current-file检查，各自证明哪个时刻的事实？
5. **Repair authority**：mechanical/semantic failure分别由谁在什么provenance下修？
6. **Read boundary**：content reader允许读取什么、怎样形成有界byte snapshot、保留什么residual risk？

六者分别由后文D1-D6固化；任一项无法闭合，都不应创建behavior change。

---

## 最可能的正确 seam

`codebase-design` 视角下，不应在现有路径旁增加 shallow linter module。更准确的候选是一个深的 Engine-internal direct-artifact-contract module：它以小 interface集中 tolerant parse、required direct facts、root failure与短路语义，现有 work-unit candidate adapter和Wave inspect/Gate adapter是两个真实consumer，因此这个seam不是为测试虚构的。Agent-facing interface仍是现有dry-submit/submit/inspect/Gate，不新增公开linter interface，也不让caller自由组合parser/rule/path。

```text
                     one versioned direct-contract implementation
                                     |
                    +----------------+----------------+
                    |                                 |
                    v                                 v
          work-unit candidate adapter         Wave inspect/Gate adapter
          -> violations[]                     -> findings / hints
          -> first acceptance                 -> phase completeness/current files
```

建议的最小 evaluator interface 形状是：输入closed contract identity与一个有界artifact byte snapshot，输出neutral direct facts/root failures；UTF-8/BOM/invalid-byte policy、tolerant parse和direct facts全部藏在module内，candidate与Wave adapter不能各自解码或预处理成不同输入。每个失败至少有稳定 `code`、contract identity、fact/field/semantic-section coordinate和有界expected/observed summary；不得回显完整artifact、无界parser exception或靠解析message重建规则。parent parse/schema失败先短路依赖语义，互相独立的root可以同次返回。它不接收任意schema path，不解析manifest/queue，不生成submit-specific `write_to`或Gate-specific hint；两个adapter各自负责target resolution与反馈投影。测试穿过这个interface，而不是分别锁死内部helper。

候选 transport seam 是现有 `manifest.output_contract`，但只有在其新增部分有 strict/versioned contract，且submit能从更直接的attempt-bound authority验证它时才成立：

- claim 时由 Engine-owned kind contract + validated queue-item assignment 决定 actor 本 attempt 必须交付什么；
- index绑定claim-time queue snapshot，closed/versioned resolver可据此重建expected contract；
- manifest与beacon携带并接受同一个expected contract比较，generated task/result schema只做Agent-facing projection，不升级为acceptance authority；
- dry-submit/formal submit先完成上述binding，再解释同一manifest contract；
- Wave evaluator 复用同一个 direct-fact implementation，再叠加 phase completeness、profile、submitted lineage、cross-artifact 和 return-map 检查。

这个形状的 leverage 是：actor、dry-submit、formal submit、Wave inspect不需要分别学习一套格式规则；复杂度集中在一个owner implementation。删除该module时，同一parse/tolerance/root-failure复杂度会重新散回两个adapter，符合deletion test；若实现最终只是contract-ID switch的薄转发层，则不够深，应合并回真正拥有规则的module。

### 尚未决定：contract 怎样绑定 exact output

#### 方案 A：manifest 显式携带 Engine-resolved exact output contracts

概念形状：

```json
{
  "output_contract": {
    "required_outputs": [
      {
        "path": "artifacts/wave1/<topic>/evidence-summary.md",
        "role": "evidence_summary",
        "direct_contract": "wave1.evidence-summary.direct.v1"
      }
    ]
  }
}
```

优点：self-describing、Agent 可读、submit 不猜路径、role 不能用 `other` 逃逸。

必要限定：

- `required_outputs[]` 只接收 concrete bundle-relative regular-file path；不得含 glob、placeholder、absolute path、`..`、duplicate normalized path 或同 path conflicting role/contract。
- required/optional 必须在 assignment owner 处明确；不得把 `writes_to[]` 全量抄入。对 v1 第一候选，optional reference 不进入 direct content contract。
- `direct_contract` 必须是 strict closed enum/version，而不是 queue/Markdown 可发明的插件 ID；unknown ID 在 claim 写 manifest/envelope 前 fail closed。
- queue item 只提供 validated assignment facts（kind、canonical Topic binding，以及 required receipts/concrete writes等resolver输入候选）；它不直接 author contract ID，`required_receipts` 也不能未经审计就自动升级为output-contract authority。若保留 `queue_item.output_contract` override，必须有独立证据、strict schema 与明确 merge/replace 语义；第一版默认应考虑禁止它覆盖 direct contracts。
- 最小integrity path必须先验证manifest内嵌queue item与index的 `queue_item_snapshot_hash` 一致，再由closed/versioned resolver根据index identity、该validated snapshot和canonical Topic binding重建expected `required_outputs[]`；不得直接信任manifest自报的contract。
- 同一个expected value必须与manifest和beacon的 `output_contract` 比较；task/result schema是由已验证contract生成的guidance projection，以generation/parity verification锁定，不参与runtime acceptance投票。缺字段或drift必须fail closed，不能退回path guessing。
- design必须单独证明resolver version及其全部输入也被attempt authority绑定。特别是当前mutable `rb_plan.md` 可校验Topic identity，但不能在未绑定的情况下成为claim后重建exact path的唯一输入；需要么从已hash-bound queue snapshot取得完整canonical Topic coordinates，要么论证最小的新claim-time binding。若现有index hash + recorded schema/version不足以防version downgrade、Topic remap或default-contract drift，才增加最小index marker/digest，并说明writer、checker、迁移与retirement；不得一开始就复制完整snapshot，也不得只靠prose称其immutable。

风险：需要一个真正的 Engine-owned assignment resolver；若 phase Markdown 各自手写 contract ID，或把 `writes_to` 当 required list，会把漂移移动到 queue authoring 层。该方案还必须补齐现有beacon contract-derived binding debt，不能只让manifest与自己比较。

#### 方案 B：submit 根据 `kind + assigned writes_to + canonical path/role` 推导

优点：改动较小，当前 `canonicalWave1RequiredOutputRole()` 已有先例。
风险：容易重新长出隐藏的 `PATH_FORMAT_MAP`；manifest 对 actor 不自描述；新增 artifact 需要改 submit dispatch；旧 path-based role normalization 与新推导若并存，会形成两个解释者。

#### 方案 C：不改变 submit，只给现有 Wave inspect 增加 work-id/topic scoped mode

优点：不扩大 formal submit 的 acceptance contract；继续使用同一 Wave evaluator。
风险：work-unit actor 必须理解 phase-level inspect；动态/缺失 sibling rules 需要正确 masking；如果只是把全量 inspect 过滤成另一套局部 verdict，也可能形成第二种完成语义。

当前倾向：**先验证受上述限定的 A 是否能由一个 Engine-owned assignment resolver生成；若不能，再比较 B 与 C，而不是默认创建通用 linter。** A 若成立，应替代或显式收口现有 Wave1 path-based role normalization，不是在其旁边再叠一层。

---

## 可安全前移与不可前移的事实

### 第一候选：context-light direct-shape facts

- Wave0 source YAML 是否能被现有 tolerant reader 接受、是否为顶层 array、是否满足现有 `ReferenceMetadataArraySchema`。**不把 Wave Gate 的 count floor 前移。**
- Wave1 evidence summary 是否满足当前共享 evaluator 的 non-empty Key Findings direct fact。
- Wave1 evidence summary 的 parseable URL 仅在先证明该 URL 必须存在于 Markdown 本体、而不是已提交结构化 `source_claims[]` / `accepted_source_urls[]` 的重复 presentation blocker 后，才可前移。
- Wave1 question list 是否满足当前共享 evaluator 的四个 non-empty semantic section facts；继续容忍等价顺序、heading level、大小写、空格和 list style。
- declared output 的 canonical path/role 是否与 assigned output expectation 一致。

这些检查只依赖 candidate artifact bytes、candidate result declaration、attempt-bound assignment和稳定的direct schema/semantic parser，适合在candidate checkpoint复用。

这里的“适合”还要求文件读取本身安全且有界。最低基线是：只接收concrete bundle-relative path；拒绝稳定可观察到的symlink与special file；验证realpath仍在active bundle root；通过同一个opened handle的`fstat`、有界read取得单一byte snapshot；对缺失、目录、读取失败和超限分别fail closed。不得因为从existence check升级为content read，就扩大Agent声明路径的读取权限。具体size limit必须以当前artifact规模证据提出，不能在本文拍脑袋定值；是否需要防御并发恶意path replacement必须由D6 threat model决定，本文不预先声称普通Node path checks能消除所有race。

### 默认保留在 Wave inspect 的事实

- topic/reference count floors；
- queue drained / submitted ledger presence；
- reference index、authority classification 和 backing；
- depth-review 对 submitted rows、profile floor、cache/source novelty 的动态判断；
- finding-index 的 cross-topic pair universe、receipt refs 和 synthesis eligibility；
- seed backfill、return-map current-round lineage；
- cross-artifact links、phase completeness、completion events。

这些事实需要 phase-wide 或 submitted authority context。把它们塞进单文件 linter 会让 candidate validator承担它无法拥有的语义。

### 暂不纳入

- generic JSON/YAML/JSONL syntax checker；
- 任意 Markdown fence/frontmatter 自动检测；
- `websearch.json` 新 schema：accepted contract 当前主要要求存在和保留 retrieval trail，尚无稳定 content schema；
- Phase-owned `depth-review.yaml` / finding-index / ledger / synthesis 的独立 file linter；
- legacy artifact migration、delta Gate scope、cross-version compatibility；
- Gate hint-quality 全规则审计；
- 自动修复、重试控制器、统一插件系统。
- 任意用户/queue authored contract ID、动态 import、文件路径式 schema selector；
- 为这项反馈时机改动顺带新增 artifact byte-hash authority。若 lifetime audit证明无 hash 无法满足已接受语义，必须单独扩大 proposal，说明 schema/ledger migration与旧 attempt兼容性，不能作为实现细节偷渡。

---

## 立项与 proposal/design 必须形成的六项决策

只读explore必须为每项找到一个可行答案，才能决定立项；创建change后，proposal/design必须把答案固化为六份可引用的decision record，而不是继续保留开放问题。每份都要写明chosen semantics、rejected alternative、direct authority、兼容边界与验证入口；apply证据若推翻答案，先更新change artifacts再继续，不得静默临场改设计。

### D1. 哪些 direct facts 有资格成为 candidate blocker？

每条 blocker都必须同时证明：目标是**本attempt明确required的exact delegated output**；保护accepted且下游必需的structure；没有更直接的结构化authority可替代；与现有Wave evaluator的tolerant forms完全一致。optional/pattern write、prior submitted output复用、supplementary partial与Phase-owned projection一律排除。

Wave0 YAML schema和Wave1 required semantic-section availability的burden相对清楚。evidence-summary中的URL marker必须额外证明Markdown URL本身对下游消费不可缺，不能仅因现有Gate会检查，就重复阻塞已有 `source_claims[]` / `accepted_source_urls[]` authority。每条fact最终明确选择“阻塞首次acceptance”或“只留在scoped inspect/advice”。

### D2. direct fact 由哪个深模块唯一拥有？

不能新写 `EvidenceSummaryFormatSchema` 去近似 `checkKeyFindingsContent()`。应从现有Wave evaluator提取按closed/versioned contract identity运行的neutral direct evaluator，让candidate adapter与Wave adapter调用同一实现，再分别投影 `violations[]` 和findings/hints。

提取后删除旧内联重复逻辑，不保留“submit版本”。测试surface是neutral evaluator interface及两个adapter的observable projection，不跨过interface锁死内部helper；若所谓module只是contract-ID switch薄转发，则合并回真正拥有parser/facts的module。

### D3. assignment 与 contract integrity 怎样单向绑定？

actor自报role不能选择checker，全局path regex也不能成为隐藏registry。proposal必须定义一个Engine-owned assignment resolver，明确required exact path、canonical role与direct contract，排除optional/glob `writes_to`，并裁决missing/duplicate/wrong-role declaration、queue override以及现有 `other -> canonical role` normalization的退役或有限兼容。

首选integrity链是：重算manifest内嵌queue item的snapshot hash并与index binding比较 -> 用recorded resolver/contract version和全部attempt-bound输入重建expected contract -> 同时比较manifest与beacon -> 从已验证contract生成task/result-schema guidance。task与result schema只做projection，不成为额外acceptance voter。

若现有index binding不能固定resolver version或全部输入，才论证最小的新version marker/digest/state。新claim缺少应有contract必须在mutation前fail closed；unknown ID、unsafe/duplicate path、conflicting role和invalid override在最早owner入口拒绝。旧claimed/timed-out attempt只能按自身真实记录的version选择有限兼容语义，不得根据当前framework version或bundle creation stamp反推。

### D4. 各 checkpoint 证明哪个时刻的事实？

dry-submit只做瞬时预测，不产生authorization token。每次normal dry-submit、claimed timeout-preflight、normal first submit和eligible first late-submit都取得自己的fresh bounded byte snapshot并使用同一个evaluator；后一次checkpoint不能复用前一次PASS或bytes。formal submit仍是唯一首次acceptance authority。

idempotent duplicate replay、audited late-submit replay与 `recover-declaration` 不是新的candidate acceptance，必须逐项决定是否读取live artifact以及这样做会改变什么语义。默认不能让历史成功依赖可变文件的当前内容；若不重验，则只证明既有accepted hash/ledger/postcondition。Wave inspect/Gate仍检查post-submit当前文件。

当前 `result_hash` / `ledger_record_hash` 不绑定artifact bytes，因此formal submit只能证明其authoritative evaluation读到的snapshot通过，不能证明ledger append瞬间或之后的path bytes仍相同，也不创造byte immutability。若需求实际是把evaluated bytes与commit原子绑定、或事后证明提交时bytes未漂移，必须拆出或显式扩大为artifact-hash/provenance change，并承担schema、ledger和migration。

### D5. 失败后谁有权修，actor何时消费反馈？

必须区分identity/path/role、YAML序列化、等价heading presentation等mechanical root，与缺少真实findings/questions/source facts的semantic root。当前generated task暴露dry-submit，但主要由Phase Agent消费；proposal必须选择actor在 `work_done` 前运行、Phase Agent返回后运行，或两者共享predictive checkpoint，并明确每类root的合法repair owner。

Phase Agent可以执行或指挥ordinary same-candidate repair，但不能在原actor记录 `work_done` 后代写缺失研究内容，再保留误导性的原actor provenance。blocking semantic failure必须有真实且可审计的actor继续/重做、或terminal/replacement attempt路径；否则该fact只能做scoped inspect/advice，直到repair contract成立。

### D6. content reader 的权限与byte-snapshot语义是什么？

共享target resolver只接受Engine-resolved concrete bundle-relative path。D6必须先声明threat model：最低范围防稳定path escape、symlink、special file、无界读取和普通write/read错误，并明确hardlink/alias是否在scope；若还要防同机恶意并发path replacement，必须证明Node 20与目标平台能把opened object绑定回受信bundle root，不能用 `realpath -> open` 的顺序冒充race-free guarantee。

最低实现基线应做lexical safety、non-symlink/regular-file与realpath containment检查，并从同一个opened handle执行`fstat`和bounded read，取得一次evaluation的单一byte snapshot；所有direct facts都基于该snapshot。design必须记录hardlink/alias policy及检查与open之间的residual race，而不是暗示它们不存在；若风险超出当前trusted local actor model的容忍范围，则停止或单独扩大security contract。candidate与Wave adapter必须复用同一snapshot policy或证明差异不影响direct verdict，并使用同一个module完成UTF-8/BOM/invalid-byte decoding和tolerant parsing，安全加固不能制造更严格的第二种verdict。

---

## 建议的验证顺序

本计划不构成OpenSpec phase gate的例外。Explore只能做只读代码/spec审计；malformed candidate、disposable bundle、真实Agent-flow、fixture/test或任何target write都必须等到 `/opsx:apply`，并由已批准tasks覆盖。创建change时，下面的只读结论与D1-D6进入proposal/design/tasks，`verification-plan.yaml`进入change root。Apply第一项task应在target edits前创建change-local `implementation-evidence.md`（或等价apply ledger），记录第3、8、9项的命令、native artifact refs、结论边界与residual risk；不得另建旁路调查文档、把console摘要当verdict，或把conversation memory当证据。

| # | Phase | Investigation / artifact | 通过条件 |
|---|---|---|---|
| 1 | Explore read-only -> design | Accepted contract/debt ledger，分为`implemented`、`existing_spec_debt`、`new_or_modified_behavior` | 每项有accepted requirement定位、当前implementation owner与验证入口；required path-role checklist和beacon contract-derived binding留在debt栏，不伪装成新需求 |
| 2 | Explore read-only -> design | Wave0/Wave1 primary与supplementary assignment matrix：kind、producer、required exact output、optional/pattern write、receipt、canonical role、prior-output reuse、owner | 每个拟阻塞output都能从direct authority唯一判定；歧义标为`missing_contract`并排除，不用path regex或actor自报补猜 |
| 3 | Apply pre-target evidence gate | 当前production CLI在fresh disposable bundle上的candidate parity proof，保留真实dry-submit JSON与Wave inspect/Gate artifact refs | 至少一个candidate稳定呈现“existence/role通过、同一direct fact在Wave checkpoint失败”；只证明`deterministic_contract` timing gap，不外推Agent频率。失败则暂停target edits并回写change |
| 4 | Explore read-only -> delta/design | 每条候选fact的blocker admission table：accepted requirement、下游必要性、tolerant forms、直接结构化authority、chosen checkpoint | 只有满足D1 burden的fact进入候选集合；evidence-summary URL marker得到明确保留/降级/删除结论 |
| 5 | Explore paper design -> design | Contract/integrity spike：resolver inputs/outputs、strict schema、authority flow、override policy、producer/consumer map、Wave1 role normalization处置、新状态必要性 | expected contract可从attempt-bound inputs闭合重建，resolver version与Topic coordinates不受claim后mutable plan/default漂移影响；manifest/beacon drift fail closed；queue/Markdown不能author contract ID；新增状态已证明不可替代且最小 |
| 6 | Propose design | Compatibility与lifetime matrices：new claim、pre-apply claimed、timed-out/first late-submit、legacy/invalid contract；dry-submit、first submit、timeout、replay、`recover-declaration`、Wave checkpoint | 每格明确读取面、live-artifact policy、evaluator/projection、mutation、证明时点、fail-closed point与retirement；不靠framework/bundle version猜attempt contract |
| 7 | Propose design/tasks | Repair-authority matrix：root的`mechanical`/`semantic`分类、actor `work_done`时点、repair owner和continue/replacement path | 每个拟blocking root都有真实可审计闭环；Phase Agent不会代写缺失语义后伪装原actor provenance |
| 8 | Apply pre-target evidence gate | threat model、合法artifact尺寸/类型样本、读取上限依据、path/file/error/encoding case与portable Node 20 reader spike | 最低基线覆盖lexical safety、stable symlink/realpath escape、regular-file/read/oversize/special-file rejection及同一handle的single bounded snapshot；明确hardlink/alias policy、UTF-8/BOM/invalid-byte policy、可覆盖race与residual risk，不声称未经证明的TOCTOU safety；candidate/Wave读取差异不改变direct verdict。失败则先改design，不碰target code |
| 9 | Apply pre-target evidence gate（仅在plan选择时） | Current-version real-Subject Agent-flow baseline；保留Subject output、receipt、dry-submit、submit与Wave inspect时序，或native `NOT_RUN`/能力边界 | 如实分类current Agent failure或`frequency_unknown`；不把旧PASS/NOT_RUN改写成新claim。`case-163-heavy-rerun-add-real-cache-trail.md`仅是候选；若baseline不复现且preventive invariant也不成立，停止implementation |
| 10 | Propose | Change-root `verification-plan.yaml`和对应tasks | neutral evaluator/schema走`unit`；production CLI、projection、安全读取和checkpoint parity走`integration`；仅有独立跨checkpoint obligation才走`deterministic_e2e`；真实actor理解/semantic repair走registered `agent_flow_e2e`。plan validity不冒充执行PASS |

第1、2、4、5项给出可行方向且没有命中停止条件，才可进入proposal。Proposal必须完成第6、7、10项并把第3、8、9项排在target edits之前。任何pre-target evidence gate失败，都先暂停apply、更新delta/design/tasks或停止change；不能因为已经进入apply就继续实现。

---

## 可能形成的 change（尚非决定）

如果调查支持前移，change 应围绕类似目标展开：

> **Reuse formal direct-shape artifact contracts at the work-unit candidate decision point, without creating a second validator or moving phase-wide authority into submit.**

可能名称：

- `reuse-delegated-output-contracts-at-submit`
- `harden-work-unit-output-content-preflight`

最小合理 scope 可能包括：

1. 提取一个 closed/versioned neutral direct-contract evaluator，覆盖获准前移的 Wave0 source YAML、Wave1 evidence summary和Wave1 question list facts，并让现有 Wave adapters删除内联重复逻辑后复用它。
2. 定义 strict assignment/output-contract schema和一个 Engine-owned resolver，明确 required exact path、canonical role与direct contract；排除 optional/glob writes与actor自报dispatch。
3. 在claim mutation前验证contract；让index-bound queue snapshot与recorded resolver/contract version可重建expected contract，manifest/beacon接受同值比较，generated task/result schema只做projection；明确旧in-flight manifest兼容/退役策略。
4. 让 normal dry-submit、normal first submit、timeout candidate与eligible first late-submit按checkpoint matrix复用同一个 candidate artifact verdict；duplicate/recovery路径只按明确的lifetime语义处理，不做笼统全路径重验。
5. 将 direct failures 投影为现有 `violations[]` repair coordinates；Wave inspect继续把同一 neutral result投影为 shared findings/hints，并拥有 phase-wide/current-file verdict。
6. 增加与D6 threat model匹配的有界candidate artifact reader，以lexical/realpath/non-symlink/regular-file检查和同一handle的bounded read取得single byte snapshot；记录residual race，不扩大任意路径读取面或过度声称security guarantee。
7. 更新 generated task，使 actor看见 manifest-resolved required path-role-direct-contract事实；Phase Agent仍负责消费predictive dry-submit并执行authoritative formal-submit闭环，除非后续实验另行批准actor执行职责变化。
8. 保持 Phase-owned artifacts、return map和phase-wide facts在 Wave inspect/Gate；不新增 artifact hash authority、generic linter CLI或plugin registry。

这不是对 change 的预先批准。proposal 必须引用验证结果，明确选择 A/B/C 中的 seam，并完成以下治理：

- 指明修改哪些现有 capability（至少审 `delegated-work-units`、`subagent-node-contract`、`research-wave-gate-implementation`），哪些是 MODIFIED requirement，哪些确需新 requirement/ID；不得为同一行为另建主题式 capability。
- 回答 `Simplicity Admission Test`：direct Source of Record/最短闭环是什么，删除或避免了哪份重复逻辑与Agent隐含记忆。
- 回答 `Helper Direction Review`：这条修复闭环通常不需要用户决定；actor/Phase Agent/Engine各自负责什么，repair后谁运行同一checkpoint。
- 这项方案若改变submit acceptance或Agent-facing framework contract，就是`DPT_FRAMEWORK/` behavior change；proposal应声明version bump与target version，tasks按`version-management`更新repo-root `CHANGELOG.md`并同步`DPT_FRAMEWORK/RUN.md` banner。只有最终change纯属调查/spec且不改framework behavior时，才可说明不bump。
- 创建并先验证 change-root `verification-plan.yaml`；tasks包含 requirement registry/spec checks和verification assets检查。

---

## Markdown 修改控制清单

这部分是未来 proposal/tasks/apply 的**功能性 production Markdown约束**，目的不是提醒模型“记得更新文档”，而是限制 Agent-facing behavior prose只能修改已经证明需要同步的 owner文件。

它**不覆盖** OpenSpec change artifacts、`verification-plan.yaml`、测试/experiment assets、requirement registry、implementation evidence，也不覆盖 accepted version-management强制要求的repo-root `CHANGELOG.md`与条件性 `DPT_FRAMEWORK/RUN.md` version banner。后两者只能做release metadata同步，不得借机扩写功能说明。

### 生效前提

下面的 base whitelist 只在最终 change 选择以下语义时生效：

- existing `operate-work-unit dry-submit` / formal submit candidate validation 增加 delegated output direct-shape contract；
- Wave inspect/Gate 继续拥有 phase-wide verdict；
- 不新增通用 lint CLI。

如果最终选择 scoped Wave inspect（方案 C），或 manifest contract transport 与这里假设不同，**不得在 apply 时临时扩张清单**。必须先回到 explore/design，重写本节，再批准 apply。

### Base whitelist：有把握需要修改的 Markdown

| # | 文件 | 为什么必须改 | 允许怎样改 | 明确禁止 |
|---|---|---|---|---|
| 1 | `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md` | 这是 work-unit envelope、actor/Phase Agent职责、dry-submit/formal submit 顺序的共享 owner。若 submit 开始检查 delegated artifact direct shape，现有“validates result, receipt, output files...”描述不够精确。 | 只改四个现有位置：① §1 Authority Boundary 的 `operate-work-unit submit` 行，补充“manifest-assigned delegated output direct-shape”；② §2 `result.json` 行，说明 dry-submit verdict包含 manifest-declared candidate output content；③ §3 step 9，明确 direct-shape violation仍修同一 candidate/assigned output并重跑同一 dry-submit；④ §6 最后一段，把“declared outputs exist”改为“exist and satisfy only their assigned direct-shape contracts”。每处同时写明 phase-wide completeness/provenance仍由 Wave inspect/Gate拥有。 | 不复制 source/evidence/question 的字段或 heading 清单；不加入 retry loop、用户交互、Gate命令；不改变 actor authority、submit/ledger authority或 Phase-owned projection边界。 |
| 2 | `DPT_FRAMEWORK/workflows/nodes/shared/shared-schemas.md` | 这是 active workflow 加载的 schema/artifact canonical summary。Wave0 source YAML 与 Wave1 paired artifact 已在此定义；checker timing改变后必须说明同一 direct-shape owner在 candidate和Wave checkpoint复用，避免读者误以为只有 Gate检查或存在两套 schema。 | 只改三个现有位置：① `contracts/reference.mjs -> source.yaml` 段增加一句 candidate direct-shape由 manifest-assigned work unit dry-submit复用同一 reader/schema；② Wave1 artifacts 导语增加一句 evidence-summary/question-list的 direct-shape可在 delegated candidate checkpoint验证，完整 provenance/phase completeness仍在 Wave inspect；③ `_work_units/` 描述补充 manifest output contract是 candidate内容契约的 transport。 | 不增加新 schema字段表；不改 accepted heading tolerance、reference authority、depth-review、Wave2、seed、final定义；不把 Markdown称为 Zod schema。 |
| 3 | `DPT_FRAMEWORK/COMMANDS.md` | 这是 Agent-facing command inventory。当前 `operate-work-unit.mjs` 行没有列出 `dry-submit`，而未来 change若扩大 dry-submit的确定性职责，命令索引必须准确描述它的 read-only candidate checkpoint语义。 | 只改 `Subagent 环境` 表中 `operate-work-unit.mjs` 一行：把 `dry-submit` 纳入 subcommand清单，并用一句话区分“dry-submit预测 candidate acceptance、零 authority mutation”与“formal submit持久化 queue/ledger/result/receipt/cache authority”。若 direct-shape纳入，只写“manifest-assigned direct-shape”，不列 artifact-specific规则。 | 不新增独立 command章节，不描述 generic linter，不改 recovery/late-submit语义，不顺手重写整张命令表。 |

这三个文件构成功能性 production Markdown base whitelist。**Apply 默认不得修改任何其他 Agent-facing behavior Markdown。** 若实际 code seam证明其中某文件无需修改，应取白名单子集，不为满足清单制造 prose churn。

### 明确不改的 Markdown

| 文件 | 不改理由 |
|---|---|
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` | 已明确 queue -> claim -> dry-submit repair -> formal submit -> inspect -> Gate；也已明确 `source.yaml` writer和产物。只要 exact content contract由 manifest/generated task携带，再复制一次会增加 drift。 |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md` | 已明确 evidence-summary/question-list exact paths、roles、四个 question sections、dry-submit/formal-submit loop和 Phase-owned depth/reference边界；本 change不应重写这些语义。 |
| `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-source-intake.md` | 已给出 `source.yaml` 顶层数组、字段、序列化方式和执行步骤。缺口在 Engine何时验证，不在 role spec缺少格式说明。 |
| `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-evidence-extractor.md` | 已给出 evidence-summary/question-list canonical authoring contract、tolerant presentation边界、roles和 source backing。不得把 evaluator细节再抄进 role prose。 |
| `DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-topic-scout.md` | 第一候选 scope不包含 Wave2 targeted artifact content contract。 |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md` | finding-index/ledger/synthesis仍为 Phase-owned，并由现有 Wave2 inspect检查。 |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`、`phase-rerun.md`、shared seed/return-map authoring docs | seed/topic-state与return-map不是本 candidate contract scope。 |
| `DPT_FRAMEWORK/RUN.md` 的功能说明、terminal/final/HITL docs | run入口、interaction placement和terminal delivery均不受影响。若proposal声明version bump，RUN仅按version-management同步version banner/current-release摘要，不视为功能Markdown扩张。 |

### Conditional Markdown：当前暂时放弃

以下修改存在合理可能，但现在没有足够把握，**不得进入第一版 change/apply**：

1. **让 native Sub-agent在 `work_done` 前亲自运行 dry-submit**：这会要求修改两个 role specs和 shared protocol actor rules。当前 owner guidance主要由 Phase Agent运行 dry-submit，尚未证明把 command execution交给并行 native actor不会产生职责/运行环境问题；暂不改。
2. **在 phase-wave0/phase-wave1 queue task card中写 `output_contract.required_outputs[]`**：即使方案 A 成立，contract ID也应由Engine-owned resolver生成，不应复制到 phase Markdown。只有调查证明queue task必须携带新的assignment fact且无法从现有required receipt/concrete write推导时，才回到design审批；不得让Markdown author contract ID。
3. **为 reference Markdown增加 candidate content contract wording**：Wave0 delegated reference、Wave1/2 Phase-owned projection的正式性不同；没有单一安全语义，暂不改。

若后续调查证明其中一项必要，必须先把它从 conditional 区移入 base whitelist，并逐文件写明 exact section/reason/edit/forbidden，才能进入 proposal。

### Generated `task.md` 的特殊说明

`_work_units/*/task.md` 是 runtime generated projection，不是直接编辑目标。若 change选择 manifest-assigned direct-shape contract，apply 可修改生成它的 JavaScript owner `DPT_FRAMEWORK/engine/work-unit-envelope.mjs`，但不得手改任何 bundle内 `task.md`，也不得把 runtime task加入上述 Markdown whitelist。

生成文本必须投影已通过expected-contract binding的manifest中required exact path、canonical role与direct contract identity，使actor不需要猜；prose只允许增加一个闭环说明：

> dry-submit会检查 manifest为本 attempt分配的 delegated output direct-shape；按每条 `violations[].write_to` 修同一 assigned output/candidate，并重跑同一命令。

不得在 generator中维护 source/evidence/question的第二份字段或 heading inventory；具体字段/semantic section解释仍来自现有role guidance，blocking verdict来自共享direct evaluator。task中的contract identity是Engine-resolved事实，不是让actor选择的参数。

### Apply 阶段的文档 review gate

Apply tasks必须逐项列出并执行：

1. 修改前确认 `git diff -- <whitelisted-file>` 只包含本 change edits；不覆盖用户已有修改。
2. 每个文件独立 review：实际 diff必须逐句映射到上表的“允许怎样改”，无法映射的句子删除。
3. 运行现有 workflow Markdown structure/parity tests；若 contract projection新增 focused parity test，只覆盖这次新增的一条语义，不建全文件 prose catalog。
4. `rg` 检查 production Markdown中没有新增 `lint-agent-output`、`--schema`、`PATH_FORMAT_MAP`、“all Agent outputs”或“all Markdown”措辞。
5. 最终 `git diff --name-only`：Agent-facing behavior Markdown集合必须是 base whitelist的子集。额外的 OpenSpec artifacts、测试playbook、repo-root `CHANGELOG.md`与条件性RUN version metadata按各自治理检查，不得被误报为白名单违规；其他额外production behavior `.md` 必须回退或回到design审批。
6. Review必须确认每个新增 dry-submit表述同时保留两条边界：formal submit仍是唯一 delegated success/ledger owner；Wave inspect/Gate仍拥有 phase-wide verdict。
7. 若proposal声明version bump，检查`CHANGELOG.md`最新version与`DPT_FRAMEWORK/RUN.md` banner/current-release一致；若声明不bump，tasks仍需记录该决定依据。

---

## 激活与停止条件

### 可以进入 `/opsx:propose`

必须同时满足：

1. Explore第1、2、4、5项给出D1-D6的可行答案，且没有命中停止条件；
2. 能写出preventive invariant，解释为什么即使apply baseline不复现Agent failure，candidate acceptance也不应接受必被正式direct contract拒绝的required exact output；否则不立项；
3. 能把apply第3、8项以及按verification plan选择的第9项放在所有target edits之前，并约定失败就暂停、回写或停止change；
4. 能把existing spec debt、new/modified behavior和明确out-of-scope分开，并映射到现有capability/requirement、version与verification治理；
5. scope仍排除generic linter、全局path registry、开放contract插件、隐式artifact hash authority和第二套Gate audit。

### 应停止立项或暂停 apply

出现任一情况即停止或重新定性：

- 只读explore无法提出独立preventive invariant；或apply baseline不复现后，该invariant经真实证据被推翻；
- 失败只来自旧 bundle/version skew；
- 合法 workflow 要求 Phase Agent在 submit 后完成 direct shape；
- assignment authority无法区分required exact output与optional/pattern/prior-reused output；
- 唯一可行transport要求phase Markdown或queue author自由填写contract ID；
- 唯一可行方案必须复制 Wave evaluator；
- proposed blocker只是结构化source claims已有authority的Markdown presentation重复；
- blocking semantic failure在actor `work_done`后只能靠Phase Agent代写，且没有真实actor继续或replacement-attempt contract；
- 安全读取需要允许bundle外realpath、特殊文件或无界内容；
- 兼容旧in-flight attempt只能靠当前framework/bundle version猜测contract；
- 目标其实要求post-submit artifact byte immutability，但change不愿显式承担hash/schema/ledger migration；
- 所谓 contract 依赖 phase-wide authority，无法在 candidate decision point独立判断。

---

## 历史设计的处置

以下旧方案视为明确撤回，不再是未来实现清单：

- `DPT_FRAMEWORK/cli/lint-agent-output.mjs`
- `DPT_FRAMEWORK/engine/lint-agent-output.mjs`
- 全局 `PATH_FORMAT_MAP`
- `output-format.mjs` 收纳所有 Agent 输出 schema
- `--schema` / `--syntax-only` 通用 CLI
- workflow/terminal global lint headers
- `audit-gate-test-coverage.mjs`
- per-Gate `assertHintQuality` inventory
- 对 result/receipt/cache/seed/Wave2 全 surface 的一次性 linter rollout

如果未来出现独立的 syntax-only 工具需求，必须以自己的问题证据和 owner contract重新提出，不能从本文恢复旧实现。

---

## 当前建议

保留这项工作，但把它看成 **“delegated artifact contract 在 candidate decision point 的复用调查”**，不再看成“Agent Output Linter 项目”。

下一步仍是explore：只读完成第1、2、4、5项，为D1-D6找到可行答案并判断preventive invariant是否值得立项。满足激活条件后才 `/opsx:propose`；第3、8、9项由change tasks锁在 `/opsx:apply` 的target edits之前。
