# Semantic Fact Closure：OpenSpec 治理共同理解、执行跟踪与 proposal 路线

> 共同理解: 2026-08-09 | 最后更新: 2026-08-09
>
> Change A 已完成 Apply，并已通过受治理 finalizer 归档为
> `openspec/changes/archive/2026-08-09-establish-semantic-fact-closure-governance/`
> （commit `8d8c29747`）。Change B 已完成 Apply、spec sync 与受治理归档为
> `openspec/changes/archive/2026-08-09-close-work-unit-semantic-contract-drift/`
> （commit `ea02a29af`）；BUG-212、BUG-213、BUG-214 的三个闭合点均已完成。
>
> 本文是 plan/共同理解记录，不是 accepted spec、`semantic-closure.yaml`、
> OpenSpec proposal 或实现证据。它不授权修改 `openspec/config.yaml`、
> `openspec/governance/`、Engine 或测试。

## 要解决的事

BUG-212、BUG-213、BUG-214 不是同一个 defect，但构成同一种漂移：一个
Engine 确定性事实被多个 surface 各自解释，新增 consumer 没有迁移到已有的
authority。

| Bug | 被漂移的事实 | 具体断裂 |
|---|---|---|
| BUG-214 | supplementary assignment 是否有当前 direct-output 义务 | task/assignment 允许空 `output_files[]`，validator 仍把旧的非空要求当权威 |
| BUG-213 | `source_ref` 是否由 current 或 authorized-prior output 合法支持 | formal submit 接受 prior source，depth review 重新只认 current output |
| BUG-212 | submitted predecessor 是 current 还是 superseded historical row | normalized ledger 排除了 predecessor，bypass scanner 又从 raw declaration 重新判为非法 |

结论不是“schema 无用”或“系统应该加更多 runtime Gate”。

- Zod schema 负责结构、枚举和能局部表达的互斥关系。
- semantic resolver 负责必须读取历史、lineage、授权或多个记录才能得出的确定性结论。
- Gate、inspect、diagnostic 等 consumer 必须复用 resolver，不能从 raw reader 重做 verdict。
- OpenSpec change lifecycle 负责在**未来改动发生前**要求这个闭合关系被说明和验证。

## 已定术语

`CONTEXT.md` 已仅以 glossary 形式定义以下术语；它们不是执行机制：

- **Deterministic fact family**：有一个 semantic authority，且其真值可以独立改变合法 Submit、Gate、handoff 或 Final-admission 结果的一组 Engine 事实。
- **Semantic fact catalog**：项目级、机器可读的事实家族目录，用来分类一个 change 的语义影响。
- **Semantic resolver**：把 raw record 变成一个事实家族确定性结论的唯一 Engine-owned interface。

## 初始目录：13 个事实家族

计数单位不是字段、schema 文件、helper、标题或 hash；每一项是一个能独立改变
合法 Submit、Gate、handoff 或 Final-admission 结果的持久 authority family。这 13
项是当前 delegated-work/evidence 路径的有界初始目录，不声称是整个
framework 永远不变的总数。

| ID（建议） | 有界问题 |
|---|---|
| `research.scope-and-rerun-intent` | 当前 scope、canonical Topic 与 rerun intent 是什么？ |
| `queue.demand-lifecycle` | Queue demand、terminal history、replacement 的合法生命周期是什么？ |
| `work-unit.attempt-identity-and-actor` | Work-unit identity、assignment、actor、nonce、runtime receipt 是否一致？ |
| `work-unit.assignment-output-obligation` | 这个 work-unit assignment 声明了什么 direct-output 与 required-output 义务？ |
| `work-unit.wave0-source-output` | Wave0 是否履行 `source_yaml` direct-output contract？ |
| `work-unit.wave1-evidence-summary-output` | Wave1 是否履行 `evidence_summary` direct-output contract？ |
| `work-unit.wave1-question-list-output` | Wave1 是否履行 `question_list` direct-output contract？ |
| `work-unit.source-claim-provenance` | source claim、accepted URL、cache trail/degraded capture 是否有合法 provenance？ |
| `work-unit.submission-ledger-and-supersession` | submit、ledger/hash 与 supersession lineage 的 current/historical 结论是什么？ |
| `wave.submitted-reference-convergence` | Wave0/Wave1 submitted backing、reference materialization 与 convergence 是否一致？ |
| `wave2.finding-and-target-authority` | Wave2 finding、carried target、synthesis/cross-reference 的 authority 是什么？ |
| `lifecycle.gate-status-trace-handoff` | Gate、status、trace、handoff receipt 是否构成合法生命周期证据？ |
| `final.submitted-backing-admission` | Final Evidence Map link 是否有合法 submitted backing？ |

目录允许增长，但不允许 `other` 或 change-local 自由命名。`work-unit.assignment-output-obligation`
是从原先 attempt identity 中拆出的第 13 类：它回答 assignment 是否要求当前 output，
而 attempt identity/actor 仍只回答 immutable binding、actor、nonce 与 receipt 是否一致。
未来需要新家族时，同一个 change 必须在 closure record 中声明精确 ID/question，先通过
plan-mode 的“尚未登记”检查，再在第一个依赖它的 target edit 前写入全局目录；assets mode
只检查已经写入的定义与该声明一致。

## 未来每个 change 的闭合记录

每个 OpenSpec change 都拥有一个小的、自定义但可验证的
`semantic-closure.yaml`。它不需要 OpenSpec upstream 原生认识；项目自己的
Node governance checker 读取它，和既有 `verification-plan.yaml` 机制一致。

所有 change 都必须二选一：

```yaml
schema_version: semantic-closure/v1
change: example-change
status: not_applicable
reason: 仅修改文案，不改变确定性事实或其 verdict consumer
```

或逐事实家族闭合：

```yaml
schema_version: semantic-closure/v1
change: example-change
status: affected
catalog_additions: []
affected:
  - family: work-unit.source-claim-provenance
    fact: prior submitted output 是否可以作为当前 source_ref 的授权 backing
    authority:
      resolver: <唯一 resolver 的代码坐标>
    established_by:
      - <建立/写入该 authority 的 surface>
    consumers:
      - <formal submit>
      - <depth review>
    overlap:
      - relation: authoritative | derived | retired | none
        detail: <新旧 field/projection 的关系>
    verification:
      truth_table: <focused test 坐标>
      cross_surface: <真实跨 surface 路径测试坐标>
```

`not_applicable` 只需要理由；`affected` 的每一项必须单独填写，不能以一段
change-level prose 代替。任何产生授权、不授权、pass/fail、blocking 等 verdict
的 consumer 必须调用本家族的 semantic resolver。raw reader 可以展示底层历史，
但不能自行建立语义结论。

## Checker 的职责与 repair loop

新 checker 的职责必须严格而诚实：

1. **plan mode**：在 target edit 前验证 YAML 结构、change identity、目录 ID、
   affected/not-applicable 分支、逐项字段、引用坐标、selected verification asset，以及
   新家族确实尚未登记且由同一 record 精确声明。
2. **assets mode**：archive 前复核目录、实际 resolver/producer/consumer/overlap/test
   坐标是 repository 内 regular file；新家族必须已写入目录且 ID/question 与 record 一致。
   它不从文件存在性推断 consumer inventory 的语义完整性。
3. **不假装懂完整代码语义**：它不能诚实地从任意 JavaScript 读取推断一个 consumer
   是否有语义意义。consumer inventory 的完整性由 change-scoped plan review 阅读真实
   diff 后判断；发现缺口必须变成 ordinary unchecked task。
4. **root-first feedback**：失败只报最近可修 root，带 fact family、missing fact、
   owner、YAML/任务坐标和 rerun command。Agent 能读 feedback、判断语义修复、执行
   合法机械修改并重跑；checker 不替 Agent 发明新语义或写 runtime state。

第一版不建全仓 raw-field linter。若某一事实家族以后仍反复被绕开，再为该家族增加
有证据的窄 guard；不为了防 BUG-212/213 建立另一台高误报机器。

## OpenSpec 在这里具体做什么

OpenSpec 不是建议文本的存放处，也不是 runtime Gate。它是项目已经接受的工程
变更生命周期；本方案借用它已有的 apply 前和 archive 前接点：

```text
proposal/design/specs/tasks
  -> /opsx:apply 读取当前 change 的计划与 operation guidance
  -> check-verification-routing --mode plan
  -> check-semantic-closure --mode plan
  -> 失败则停止在任何 target edit 前
  -> implementation + real verification
  -> archive finalizer
  -> check-semantic-closure --mode assets
  -> 失败则不能 archive
```

这里的责任分配不可混淆：

| Surface | 责任 | 不负责 |
|---|---|---|
| `semantic-fact-families.yaml` | 哪些事实家族可被稳定引用 | 当前 change 的具体 code coordinate |
| change-local `semantic-closure.yaml` | 本 change 如何闭合每个受影响事实 | runtime verdict |
| Node checker | 结构、引用、生命周期前置条件与 root-first feedback | 自行判断语义正确性或自动修复 |
| plan review | 真实 diff 上的 authority/consumer completeness 判断 | 伪造 checker PASS 或测试证据 |
| semantic resolver | runtime 的唯一确定性结论 | 多阶段 Agent Flow 或修复策略 |
| Agent | 读 feedback、选择语义修复并执行已授权操作 | Engine authority |

已有项目先例是 `check-verification-routing.mjs`：它读取非 OpenSpec-native 的
`verification-plan.yaml`，在 plan/assets 两个时点执行。此方案复用该形状，而不是
修改 OpenSpec upstream schema。

## `/opsx:propose` 必须产出的清晰内容

在 user 明确启动 proposal 前，不能修改治理实现。启动后，proposal 阶段只写
`openspec/changes/<change>/` 内的 artifacts，不能先改 `openspec/config.yaml`、
`openspec/governance/`、Engine 或测试。

proposal 必须把以下内容写清：

1. **Capability Discovery**：先读 capability catalog 和候选 main specs；优先检查
   `governance/change-feedback-loop`、`verification/verification-routing`、
   `governance/requirement-traceability`。决定 semantic closure 是扩展现有
   governance capability，还是经证据建立新的 `governance/semantic-fact-closure`。
2. **Proposal scope**：已接受的初始 13 家族目录、每 change 的 closure record、Node checker、
   apply/archive 接入、bootstrap 路径，以及 BUG-212/213/214 remediation 的依赖关系。
   明确 CI、global linter、runtime Gate、新 runtime state 和一次性重构全部 13 家族都
   out of scope。
3. **Design**：catalog 与 YAML 的严格 Zod contract；`plan|assets` mode 的直接输入、
   PASS/blocked root codes、repair coordinate、no-write boundary；checker 无法证明的
   semantic completeness 如何回到 plan review；new-family 注册路径；不允许 `other`。
4. **Delta specs**：把 durable governance behavior 写成 requirement/scenario，而不是
   只写在 task prose：apply 前缺 closure 不能进入 target edit；archive 前 assets check
   失败不能 archive；不适用需可审查理由；每个 verdict consumer 复用唯一 resolver。
5. **Tasks and verification**：任务按 bootstrap、catalog、checker、apply entry、
   finalizer、tests、spec sync/closeout 排序。每项有 owner、最小 repair、observable
   done condition 和实际 command evidence。

### 推荐的两个有界 change

为避免把治理和 Engine 修复混成 mega-change，默认拆成有 blocking edge 的两个
OpenSpec change；proposal 的 Capability Discovery 可以在有明确理由时调整，但不应
静默合并。

1. **[x] Change A — `establish-semantic-fact-closure-governance`**
   - 新目录、closure YAML Zod parser/checker、supported apply entry、archive finalizer、
     `openspec/config.yaml` guidance/rules、governance tests。
   - bootstrap：先实现 checker 和 focused tests；checker 可运行后，plan mode 必须
     PASS，才允许修改其余 target。这复用 verification-routing 的诚实 bootstrap 模式。
   - 已登记全部 13 家族，但不声称已经重构或审计完每一个历史 consumer。
   - 已于 2026-08-09 归档；finalizer 的 strict validation、requirement/main-spec/
     taxonomy/discovery、verification-routing assets、semantic-closure assets 和 native
     archive 均通过。

2. **[x] Change B — `close-work-unit-semantic-contract-drift`**
   - 依赖 Change A。
   - 它自己的 `semantic-closure.yaml` 至少点名 BUG-214 的 assignment/direct-output
     义务、BUG-213 的 source-ref authority、BUG-212 的 submitted lineage/current-vs-
     historical reader；按 catalog 的最终 ID 记录。
   - 建立/收敛相应 resolver，迁移 formal submit、depth review、bypass diagnostic，
     加 truth-table 与真实跨 surface regression。
   - 不借修复之机审计/重构其余 10 家族。
   - 已于 2026-08-09 归档；v0.82、主 spec sync、19/19 tasks、selected regression、
     plan/assets checks、closeout review 和 governed finalizer 均已完成。

“第一版”指 Change A + Change B 的有序闭环，不要求单一 change 同时治理整个
framework 和所有历史 Engine consumer。

## 目标边界与实际状态

Change A 的治理目标已完成。Change B 的 proposal/specs/design/tasks 已把以下目标写成
可审查的 implementation inventory；它们仍不是 Apply 前的实现授权：

- [x] `openspec/governance/semantic-fact-families.yaml`、
  `check-semantic-closure.mjs`、lifecycle integration 与 focused governance tests。
- [x] `openspec/config.yaml`、supported `/opsx:apply` entries 和 governed archive
  finalizer 的 semantic-closure plan/assets 接点。
- [x] Change B 的 relevant Engine resolver/consumer/spec/test surfaces 已解决
  BUG-212、BUG-213、BUG-214。

CI 当前明确不在范围内。未来若项目决定建立 CI，可复用同一个 checker 在 merge
boundary 运行；不会改变本方案的 authority 分配。

## 共同约束

- 不把 `CONTEXT.md`、guideline prose 或 task marker 当作 deterministic verdict。
- 不让 Node checker 自动修复或替 Agent 选择新的语义。
- 不让 Engine 接管多阶段 Agent Flow。
- 不用 global schema registry 或通用 raw-field linter 取代小而深的 semantic resolver。
- 本文 tracker 不授权任何修改；两项 change 均已完成并归档。
- 真实 bug 是 contract-class probe：修复一个 concrete gap 时横向审计其必要 authority
  faces，但只修改关闭该 contract 所必需的 surface。

## 执行跟踪与下一步

以下 checkbox 只跟踪共同理解和 OpenSpec 生命周期位置；每一项的真实行为授权仍以相应
change 的 accepted spec 和 task list 为准。

### Change A 完成记录

- [x] 建立 13 个 bounded semantic fact families，明确 assignment output obligation 与
  attempt identity/actor 的区别。
- [x] 建立 strict `semantic-closure.yaml` parser/checker，并接入 proposal/apply/archive。
- [x] 在每个 supported apply/archive entry 交付同一条治理路径，且保留 Agent-owned
  semantic review。
- [x] 同步 accepted main specs、通过完整治理检查、关闭审查并归档 Change A。

### Change B 完成记录

- [x] **Capability Discovery 与 proposal**：已复读 BUG-212/213/214、当前
  `agent/delegated-work-units`、`agent/subagent-node-contract`、
  `agent/work-unit-provenance-gate`、`research/wave1-intake` main specs，以及候选 Engine
  consumers；已创建 `openspec/changes/close-work-unit-semantic-contract-drift/` 的 proposal。
- [x] **Affected closure record**：已写 `status: affected`、`catalog_additions: []` 的
  `semantic-closure.yaml`，恰好审查
  `work-unit.assignment-output-obligation`（BUG-214）、
  `work-unit.source-claim-provenance`（BUG-213）和
  `work-unit.submission-ledger-and-supersession`（BUG-212）；无需新增 family。
- [x] **具体修复设计**：已将 assignment resolver、current-or-prior source authorization
  resolver 和 current-versus-historical normalized ledger resolver 分别指定为唯一 verdict
  authority；formal submit、dry-submit、depth review、Gate/bypass diagnostic 的消费边界和
  保留的拒绝条件均已写入 four delta specs、design 和 verification plan。
- [x] **Apply、验证与归档**：已实现三个闭合点和 v0.82 version update，运行 focused
  truth-table 与真实 cross-surface regression，完成 plan/assets、review、spec-sync 与
  governed finalizer 路径。未在同一 change 中审计或重构其余十个事实家族，亦未引入 CI。

**本路线已结束：** Change A 建立治理闭环，Change B 使用该闭环完成 BUG-212、BUG-213、
BUG-214 的最小修复并归档。后续只有在新的 OpenSpec change 影响既有事实家族，或需要新增
一个有界事实家族时，才按已建立的 proposal/apply/archive 路径重新进入；本计划没有待办。
