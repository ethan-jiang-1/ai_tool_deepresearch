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

> **work-unit `dry-submit` 已完整检查 result、receipt、output declaration、cache 和 source-claim binding，但对若干 delegated output 文件只检查路径、角色和存在性；文件自身的正式 direct-shape contract 要到 Wave inspect 才检查。**

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
- 尚缺一个**当前版本、真实 disposable bundle、正常 generated task/role guidance** 下的复现或明确的 preventive contract decision。

因此本计划有合理来源，但还不能从“有历史痛点”直接跳到“某个 implementation 已获批准”。

---

## 当前 artifact ownership map

| Artifact | 主要 writer | 当前最早 checker | 最终 authority/checker | 当前判断 |
|---|---|---|---|---|
| `_work_units/*/result.json` | selected work-unit actor | dry-submit | formal submit/schema | 已收口，不进入新 scope |
| `runtime-receipt.jsonl` | selected work-unit actor | dry-submit | formal submit/schema | 已收口，不进入新 scope |
| cache `meta.json` / `page.md` | selected work-unit actor | dry-submit cache contract | submit + Wave provenance | 已收口；`websearch.json` 当前只有 presence contract |
| `artifacts/wave0/{topic}/source.yaml` | delegated/fallback actor | dry-submit 只验 declaration/existence | Wave0 inspect/Gate 验 YAML array + `ReferenceMetadataArraySchema` | **candidate feedback gap** |
| Wave1 `evidence-summary.md` | delegated/fallback actor | dry-submit 只验 declaration/existence | Wave1 inspect/Gate 验 URL、Key Findings、return map | **candidate feedback gap** |
| Wave1 `question-list.md` | delegated/fallback actor | dry-submit 只验 declaration/existence | Wave1 inspect/Gate 验四个 semantic sections、return map | **candidate feedback gap** |
| `reference/*.md` | Wave0 可 delegated；Wave1/2 多为 Phase-owned projection | owner-dependent；通常 Wave inspect | reference format/backing/index/provenance helpers | 不能用一个统一 `reference_md` verdict |
| `depth-review.yaml` | Phase Agent after submit | Wave1 inspect | same checker in Gate | 已有正确 checkpoint；不是 work-unit candidate artifact |
| Wave2 finding index / ledger / synthesis | Phase Agent | Wave2 inspect | same evaluator in Gate | 已有正确 checkpoint |
| `seed_topics/*.md` | topic-state Engine + phase enrichment/backfill | topic-state inspect / seed Gate / Wave inspect | owner-specific checks | dynamic projection，不是单文件 schema 问题 |

---

## 更准确的问题陈述

不要再问：

> “项目是否需要一个可以 lint 任意 Agent 输出文件的工具？”

应当问：

> “当 work-unit output 已经有正式 direct-shape contract 时，candidate validation 是否应在 formal submit 前复用该 contract；如果应当，contract 如何进入 manifest、如何与 Wave evaluator single-own、如何避免把 Phase-owned/dynamic checks错误前移？”

这里有三个相互独立的问题：

1. **Fact ownership**：哪个现有 helper 是该 direct fact 的唯一实现？
2. **Contract transport**：candidate 如何知道某个 exact assigned output 应使用哪个 contract？
3. **Checkpoint semantics**：失败是否阻塞 formal submit，还是只作为不改变 submit authority 的 scoped inspect？

只有三者都回答清楚，才适合创建 change。

---

## 最可能的正确 seam

`codebase-design` 视角下，应该优先深化现有 work-unit validation module，而不是在旁边增加一个 shallow linter module。

```text
                         one direct-fact implementation
                                     |
                    +----------------+----------------+
                    |                                 |
                    v                                 v
          work-unit candidate adapter         Wave inspect/Gate adapter
          -> violations[]                     -> findings / hints
          -> dry/formal submit                -> phase completeness
```

候选 external seam 是现有 `manifest.output_contract`：

- claim 时由 kind contract + queue-item assignment 决定 actor 必须交付什么；
- generated task 把同一 contract 投影给 actor；
- dry-submit/formal submit 解释同一 manifest snapshot；
- Wave evaluator 复用同一个 direct-fact implementation，再叠加 phase completeness、profile、submitted lineage、cross-artifact 和 return-map 检查。

这个形状的 leverage 是：actor、dry-submit、formal submit、Wave inspect 不需要分别学习一套格式规则；复杂度集中在一个 owner implementation。

### 尚未决定：contract 怎样绑定 exact output

#### 方案 A：manifest 显式携带 exact output content contracts

概念形状：

```json
{
  "output_contract": {
    "expected_outputs": [
      {
        "path": "artifacts/wave1/<topic>/evidence-summary.md",
        "role": "evidence_summary",
        "content_contract": "wave1.evidence-summary.direct-shape.v1"
      }
    ]
  }
}
```

优点：self-describing、Agent 可读、submit 不猜路径、role 不能用 `other` 逃逸。
风险：queue producer/kind contract 必须可靠地产生 exact expectations；若 phase Markdown 各自手写 contract ID，会把漂移移动到 queue authoring 层。

#### 方案 B：submit 根据 `kind + assigned writes_to + canonical path/role` 推导

优点：改动较小，当前 `canonicalWave1RequiredOutputRole()` 已有先例。
风险：容易重新长出隐藏的 `PATH_FORMAT_MAP`；manifest 对 actor 不自描述；新增 artifact 需要改 submit dispatch。

#### 方案 C：不改变 submit，只给现有 Wave inspect 增加 work-id/topic scoped mode

优点：不扩大 formal submit 的 acceptance contract；继续使用同一 Wave evaluator。
风险：work-unit actor 必须理解 phase-level inspect；动态/缺失 sibling rules 需要正确 masking；如果只是把全量 inspect 过滤成另一套局部 verdict，也可能形成第二种完成语义。

当前倾向：**先验证 A 是否能由现有 kind/queue assignment 单点生成；若不能，再比较 B 与 C，而不是默认创建通用 linter。**

---

## 可安全前移与不可前移的事实

### 第一候选：context-light direct-shape facts

- Wave0 source YAML 是否能被现有 tolerant reader 接受、是否为顶层 array、是否满足现有 `ReferenceMetadataArraySchema`。
- Wave1 evidence summary 是否满足当前共享 evaluator 的 parseable URL 和 non-empty Key Findings direct facts。
- Wave1 question list 是否满足当前共享 evaluator 的四个 non-empty semantic section facts。
- declared output 的 canonical path/role 是否与 assigned output expectation 一致。

这些检查只依赖 candidate file、manifest assignment 和稳定的 direct schema/semantic parser，适合在 candidate checkpoint 复用。

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

---

## 进入 proposal 前必须回答的问题

### Q1. formal submit 应不应该阻塞 malformed delegated artifact？

如果 declared output 是 work-unit 承诺的正式交付物，而且 Wave Gate 必然以 direct-shape rule 拒绝它，那么 submit 接受后再修通常只是延迟失败。阻塞 submit 具有一致性。

但必须证明：

- supplementary work unit 不允许合法地提交 partial artifact；
- Phase Agent 不被授权在 submit 后才完成该 delegated artifact 的 direct shape；
- existing tolerant parser/compatibility 行为不会被 stricter preflight 改写；
- late-submit、duplicate replay、timeout-preflight 与 normal dry-submit 使用等价 verdict。

### Q2. contract 的唯一 owner 在哪里？

不能新写 `EvidenceSummaryFormatSchema` 去近似 `checkKeyFindingsContent()`。正确方向是把现有 evaluator 中的 direct check 提取为纯 helper，让 candidate adapter 和 Wave adapter调用同一实现。

### Q3. actor 在什么时候运行 preflight？

当前 generated task 暴露 dry-submit 命令，但指导主要描述 Phase Agent读取 violations。需要决定：

- selected work-unit actor 在 `work_done` 前运行 read-only dry-submit；或
- Phase Agent在 actor 返回后运行并机械修复；或
- 两者都允许，但 formal submit 前只有同一个 authoritative candidate verdict。

若修复需要重新理解研究内容，仅靠 Phase Agent事后改标题未必是正确闭环。

### Q4. 如何防止 role/path 逃逸？

只按 actor 自报 `output_files[].role` 选 checker，会允许错误 role 绕过内容 contract。只按全局 path regex 推断，又会回到旧计划的 path registry。必须从 assigned expectation、canonical normalization 或 manifest explicit binding 中找到单一解释。

### Q5. 当前版本是否仍真实复现？

历史证据足以说明风险，不足以证明当前 generated task/role guidance 仍高频失败。需要一次真实 disposable bundle 的 Agent-flow experiment，不能用手写 happy fixture冒充 Agent 行为证据。

---

## 建议的验证顺序

在创建 OpenSpec change 前，先完成以下 read-only/throwaway investigation：

1. **Candidate parity proof**：用当前 work-unit owner 建立三个 malformed candidate，证明 `source.yaml`、evidence summary、question list 是否呈现“dry-submit pass、Wave inspect direct-shape fail”。这证明代码缺口，不证明 Agent频率。
2. **Current-version Agent-flow reproduction**：通过 `experiments_playbook/` 的真实 disposable bundle 和 generated task，让 selected actor正常执行；记录是否会产出上述 malformed shape、是否自行运行 dry-submit、Phase Agent何时发现。
3. **Submit-semantics audit**：检查 normal submit、late-submit、duplicate submit、timeout-preflight 的共享 validation path，确认任何前移都不会出现 dry/formal/late verdict 分裂。
4. **Contract-generation spike on paper**：从现有 queue `writes_to`、kind contract、queue override 和 manifest snapshot 推导一个 exact-output contract，列出所有 producer 改动点；不写 production code。
5. **Verification routing**：
   - pure helper/direct-shape：`tests/` unit；
   - dry/formal parity 与无副作用：`tests/` integration；
   - Agent是否正确消费 contract 和 preflight：`experiments_playbook/` agent_flow_e2e。

只有第 1、3、4 项闭合，才足以设计 change；第 2 项决定它是修复当前真实故障还是 preventive contract hardening。

---

## 可能形成的 change（尚非决定）

如果调查支持前移，change 应围绕类似目标展开：

> **Reuse formal direct-shape artifact contracts at the work-unit candidate decision point, without creating a second validator or moving phase-wide authority into submit.**

可能名称：

- `reuse-delegated-output-contracts-at-submit`
- `harden-work-unit-output-content-preflight`

最小合理 scope 可能包括：

1. 提取 Wave0 source YAML、Wave1 evidence summary、Wave1 question list 的现有 direct-fact pure helpers。
2. 明确 manifest/assignment 中 exact path、canonical role 与 content contract 的绑定方式。
3. 让 dry-submit、normal submit、late/timeout candidate paths复用相同 artifact verdict。
4. 将 direct failures 投影为现有 `violations[]` repair coordinates；Wave inspect继续投影为 shared findings/hints。
5. 更新 generated task，使 selected actor知道 candidate output content 也属于 dry-submit contract。
6. 保持 Phase-owned artifacts和 phase-wide facts在 Wave inspect/Gate。

这不是对 change 的预先批准。proposal 必须引用验证结果，并明确选择 A/B/C 中的 seam。

---

## Markdown 修改控制清单

这部分是未来 proposal/tasks/apply 的**硬约束**，目的不是提醒模型“记得更新文档”，而是限制模型只能修改已经证明需要同步的 Markdown。

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

这三个文件构成 base whitelist。**Apply 默认不得修改任何其他 production Markdown。**

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
| `DPT_FRAMEWORK/RUN.md`、terminal/final/HITL docs | run入口、interaction placement和terminal delivery均不受影响。 |

### Conditional Markdown：当前暂时放弃

以下修改存在合理可能，但现在没有足够把握，**不得进入第一版 change/apply**：

1. **让 native Sub-agent在 `work_done` 前亲自运行 dry-submit**：这会要求修改两个 role specs和 shared protocol actor rules。当前 owner guidance主要由 Phase Agent运行 dry-submit，尚未证明把 command execution交给并行 native actor不会产生职责/运行环境问题；暂不改。
2. **在 phase-wave0/phase-wave1 queue task card中写 `output_contract.expected_outputs[]`**：只有方案 A 被证明能由单一 producer稳定生成后才可加入。当前直接编辑 task card会把 contract ID复制到 Markdown，存在新漂移源；暂不改。
3. **为 reference Markdown增加 candidate content contract wording**：Wave0 delegated reference、Wave1/2 Phase-owned projection的正式性不同；没有单一安全语义，暂不改。

若后续调查证明其中一项必要，必须先把它从 conditional 区移入 base whitelist，并逐文件写明 exact section/reason/edit/forbidden，才能进入 proposal。

### Generated `task.md` 的特殊说明

`_work_units/*/task.md` 是 runtime generated projection，不是直接编辑目标。若 change选择 manifest-assigned direct-shape contract，apply 可修改生成它的 JavaScript owner `DPT_FRAMEWORK/engine/work-unit-envelope.mjs`，但不得手改任何 bundle内 `task.md`，也不得把 runtime task加入上述 Markdown whitelist。

生成文本只允许增加一个 contract-derived事实：

> dry-submit会检查 manifest为本 attempt分配的 delegated output direct-shape；按每条 `violations[].write_to` 修同一 assigned output/candidate，并重跑同一命令。

不得在 generator中维护 source/evidence/question的第二份字段或 heading inventory；这些内容必须来自 manifest contract或现有 role guidance。

### Apply 阶段的文档 review gate

Apply tasks必须逐项列出并执行：

1. 修改前确认 `git diff -- <whitelisted-file>` 只包含本 change edits；不覆盖用户已有修改。
2. 每个文件独立 review：实际 diff必须逐句映射到上表的“允许怎样改”，无法映射的句子删除。
3. 运行现有 workflow Markdown structure/parity tests；若 contract projection新增 focused parity test，只覆盖这次新增的一条语义，不建全文件 prose catalog。
4. `rg` 检查 production Markdown中没有新增 `lint-agent-output`、`--schema`、`PATH_FORMAT_MAP`、“all Agent outputs”或“all Markdown”措辞。
5. 最终 `git diff --name-only`：production Markdown集合必须是 base whitelist的子集；出现额外 `.md` 即 apply未完成，必须回退额外修改或回到 design审批。
6. Review必须确认每个新增 dry-submit表述同时保留两条边界：formal submit仍是唯一 delegated success/ledger owner；Wave inspect/Gate仍拥有 phase-wide verdict。

---

## 激活与停止条件

### 可以进入 `/opsx:propose`

必须同时满足：

1. 当前代码下至少一个 direct-shape parity gap 已被可重复证明；
2. 已确认该 artifact 是 delegated work-unit output，而不是 Phase-owned projection；
3. 已决定 blocking submit 还是 scoped inspect，并解释 submit-equivalence；
4. 已确定 single-owner helper 与 contract transport seam；
5. scope 不包含 generic linter、全局 path registry 或第二套 Gate audit。

### 应停止，不创建 change

出现任一情况即停止或重新定性：

- 当前版本 Agent-flow 不复现，且没有 preventive invariant 值得增加；
- 失败只来自旧 bundle/version skew；
- 合法 workflow 要求 Phase Agent在 submit 后完成 direct shape；
- 唯一可行方案必须复制 Wave evaluator；
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

下一步仍是 explore：先做 parity、submit-semantics 和 manifest contract transport 的调查，再决定是否以及如何生成 OpenSpec change。
