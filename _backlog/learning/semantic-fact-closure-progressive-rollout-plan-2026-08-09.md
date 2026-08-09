# Semantic Fact Closure 渐进落地与追踪计划

> 创建：2026-08-09  
> 最近更新：2026-08-10
> 状态：已采用的 tracking baseline；user-directed focused governance calibration、verification-only deterministic regression baseline repair 与 REF-009/REF-010/CHI-005 spec-scenario repairs 均已 governed archive；当前没有 active change；这些纯规格修复均不属于 affected-dogfood rollout
> 采用决定：2026-08-09，用户明确选择按本计划推进
> 性质：渐进落地计划，不是 accepted spec、implementation permission、runtime authority 或 Gate verdict  
> 依据：[设计理解与可靠性评估](semantic-fact-closure-design-assessment-2026-08-09.md)

## 1. 目标与当前判断

目标不是继续增加一套治理表，而是逐步做到：

```text
one bounded deterministic question
  -> one semantic decision interface
  -> Agent-facing projections and verdict consumers agree
  -> focused truth table + real cross-surface proof
  -> structural checker states only what it actually proved
```

当前建议是保留 Semantic Fact Closure v1，先在下一个真实 affected change 中用更准确的角色分类、actual symbol/bare path 与共同 scenario inventory 做 dogfood，再根据复发证据决定是否需要 focused governance change 或 `semantic-closure/v2`。不为一次记录质量问题单独建设 global runtime resolver registry、arbitrary-JS semantic linter、checker-owned test runner 或全量 family 重构。

这里的 “one semantic decision interface” 不等于一个全项目 mega-resolver，也不要求所有相关检查塞进同一个函数。它要求同一 bounded conclusion 只有一个可复用的解释入口；consumer 自己拥有的独立 downstream 检查仍然保留。

## 2. Tracking 规则

- `[x]` 只表示同一项的完成条件已有可复核证据；计划、聊天确认或 checker 的越界解释不能代替证据。
- `[ ]` 表示待做；进行中的任务仍保持未勾选，并在文字中标记“进行中”。
- 每次更新至少同步：最近更新日期、阶段计数、当前唯一 next action、证据链接或命令结果。
- `[Agent]` 表示在已有授权和合法路径内由 Agent 完成；不得把普通命令或可逆机械工作推给用户。
- `[User decision]` 只保留新语义、优先级或风险取舍；决定后，后续机械执行立即回到 Agent。
- 任何 target-code 任务只有在对应 change 完成 Propose/Explore 并明确进入 `/opsx:apply` 后才可勾选。
- 本计划覆盖的任何 OpenSpec change 在完成 Propose 后，必须立刻执行一次
  `polish-openspec-change`。Polish 至少完成两轮不同的 review pass，修正能由既有事实决定的
  planning artifact 问题，并记录 `ready for apply` 或 `not ready`；它只可修改 active change
  artifacts，不能提前 Apply、修改 target code 或勾选 implementation task。没有这一步，不得把
  proposal 当作 Phase Gate 或 Apply-ready 的证据。
- 不回写或“修正”已归档 change 来制造历史闭合；归档记录只作为历史证据，新行为通过新的 OpenSpec change 落地。

### 债务命名与 Change 对齐

- 每一条未结、需要未来工程动作的债务都必须在本文件的 **Named Debt Ledger** 有唯一的
  `debt_name`（lower kebab-case）和 `planned_change_name`。不再用“后续处理”“暂缓一下”或聊天上下文代替名称。
- `planned_change_name` 是该债务获准进入 OpenSpec 后必须使用的 change name；若合并、拆分或改名，先在
  ledger 写出 successor name 和理由，再创建/修改 change，避免 tracker、proposal、tasks 与 archive 失去对应关系。
- `state: deferred` 表示已有名称、范围和重开条件但尚未获准进入 change；它不等于已完成，也不自动成为
  Semantic Fact Closure Phase 2 的 dogfood。`state: none` 只适用于已核实没有未结工程动作的类别。
- 一个新发现若尚不能命名、不能给出 authority evidence 或不能说明最小完成条件，就先记为 discovery，不能伪装成 debt 或 change 候选。

## 3. Progress 快照

| Track | 完成 | 总数 | 当前状态 |
| --- | ---: | ---: | --- |
| 计划采用 | 1 | 1 | complete |
| 已落地的 v1 基线 | 6 | 6 | complete |
| 本轮调查与文档 | 6 | 6 | complete |
| 已 propose change 的 mandatory polish | 3 | 3 | complete：`tighten-semantic-closure-review-honesty`、REF-010 repair 与 `repair-check-inspect-feedback-scenario-coverage` 均已完成至少两轮不同 review pass；CHI-005 repair 的 clean final pass 是 `ready for apply`，不等同 target-edit permission |
| Focused governance calibration Apply / Archive | 13 | 13 | complete：governed finalizer 已归档 `2026-08-09-tighten-semantic-closure-review-honesty` |
| Verification-only deterministic regression baseline repair | 10 | 10 | complete：governed finalizer 已归档 `2026-08-09-restore-deterministic-e2e-regression-baseline`；不计入 runtime dogfood |
| Named spec-scenario debt repairs（不计入 rollout） | 3 | 3 | REF-009、REF-010 与第六个已解析 requirement `CHI-005` 均已 governed archive |
| 推荐核心 rollout（Phase 2-5） | 0 | 29 | 仍未开始；没有 active change，下一步是筛选真实 outcome-changing Harness runtime change；本次 calibration 与 scenario repairs 均不计入 runtime dogfood |
| 条件性 v2 / 后续扩展 | 0 | 7 | deferred；不计入核心 rollout |

核心 rollout 的 `29` 项中，`27` 项由 Agent 执行，`2` 项是用户语义决定（`2.9`、`5.5`）。用户不承担 proposal 文件编写、polish、命令执行、测试、repair、spec sync 或 archive 操作。

**当前唯一 next action：** 执行 Phase 2 的 `2.1`：从当前 outcome-changing Harness runtime defect 或已授权需求中筛选
一个真实 affected change。当前没有 active change；若没有可验证的候选，保持等待，不能为推进计数制造 synthetic dogfood。

- [x] `A.1` `[User decision]` 已采用本文件作为后续 Semantic Fact Closure 演进的 tracking baseline；完成证据是 2026-08-09 的用户明确指示。该决定采用流程，不预先批准任何尚未触发的 OpenSpec change 或 target edit。
- [x] `A.2` `[Agent]` 已对 active change `tighten-semantic-closure-review-honesty` 执行 mandatory
  `polish-openspec-change`。完成证据：whole-change coherence pass 修正 operation-guidance proof chain、
  adapter scope 与 finalizer checkbox cycle；risk-led pass 将八个 supported adapter 的 shared-guideline
  assertion 纳入计划；final clean pass 与 strict/plan/governance checks 均通过。该 change 是用户明确启动的
  有限 governance calibration，不计作新的 affected runtime dogfood，也不预先批准 Apply。
- [x] `A.3` `[Agent]` 已完成并归档 user-directed focused change
  `tighten-semantic-closure-review-honesty` 的 Apply。已完成 change task：`0.1`、`0.2`、`1.1`、`2.1`、
  `2.2`、`2.3`、`3.1`、`3.2`、`4.1`、`4.2`、`5.1`、`5.2`、`5.3`。实际 evidence：plan review 在 archived dogfood commit
  `ea02a29af` 重现 `6` 个 fragment occurrence / `5` 个错误值与 projection/consumer 混用；三项 plan
  check 均退出 `0`（requirements: `644` registered、`53` retired、`0` orphan、`747` occurrences；routing:
  `1` claim；closure: structural plan valid）；新增 delivery assertions 先因缺少 proposal guidance 预期失败，
  再以 `node --test tests/integration/governance/change-feedback-finalizer.test.mjs` 的 `7/7` pass、`0` fail
  和约 `62s` 完成；`5.1` closeout review 对 actual diff、synced main specs、tracker 和两份 change-local
  governance record 未发现新的 in-scope repair；five final checks 均为 exit `0`（strict change、archive
  requirement registry、`85` main spec governance files、`1` verification asset claim、semantic-closure
  assets）；随后 `node openspec/governance/finalize-change-archive.mjs --change tighten-semantic-closure-review-honesty`
  返回 `outcome: archived`，通过 `11` 项 checks，并归档至
  `openspec/changes/archive/2026-08-09-tighten-semantic-closure-review-honesty`。该 test 仅证明
  instruction/guideline/entry delivery，不证明 Agent semantic compliance；finalizer 证明治理归档转换，不证明
  future Agent compliance 或 runtime semantic closure。
- [x] `A.4` `[Agent]` 已完成归档后推进核对：`openspec list --changes --json` 返回空 `changes`，`git status --short`
  无输出。当前没有可合法计入 Phase 2 的 active runtime change；因此保持 `2.1`–`6.7` 未勾选，下一步等待真实
  outcome-changing boundary，而不以 tracker 进度制造 synthetic dogfood。
- [x] `A.5` `[Agent]` 已完成并归档 `restore-deterministic-e2e-regression-baseline`：它把单个 production-finalizer
  proof 正确归类为 integration，补齐隔离 fixture 的 current governance closure，并让两项 Harness lifecycle
  assertions 对齐现有 release/style contracts。`npm test` 退出 `0`；closeout 后 governed finalizer 返回
  `outcome: archived` 并通过 `11` 项 checks，归档至
  `openspec/changes/archive/2026-08-09-restore-deterministic-e2e-regression-baseline`，提交为 `59192f0e5`。
  该 change 未修改 Harness runtime resolver、authority-establishing surface、verdict consumer、family catalog 或
  semantic-closure mechanics，故其 record 合法地保持 `not_applicable`，不计作 `2.1`–`6.7` 的新增 affected runtime
  dogfood。归档后 `openspec list --json` 仍返回空 `changes`，因此保持 Phase 2 未开始。
- [x] `A.6` `[Agent]` 已完成并归档 `repair-reference-flat-format-scenario-coverage`：只移除了 REF-009
  Wave0 requirement 标题的一个前导 `+`，其完整 requirement 与四个既有 Scenario 同 approved delta 精确同步。定向
  validation 不再报告 `requirements.8.scenarios`；它如实暴露了下一条 REF-010 的
  `requirements.9.scenarios` root，已在 ledger 命名为独立 successor debt。governed finalizer 返回
  `outcome: archived` 并通过 `11` 项 checks，归档至
  `openspec/changes/archive/2026-08-09-repair-reference-flat-format-scenario-coverage`。该 change 不修改 Harness
  runtime resolver、authority-establishing surface、verdict consumer、family catalog 或 semantic-closure mechanics，故
  其 record 合法地保持 `not_applicable`，不计作 `2.1`–`6.7` 的新增 affected runtime dogfood。
- [x] `A.7` `[Agent]` 已为 `repair-reference-flat-format-requirement-9-scenario-coverage` 完成完整 proposal、REF-010
  delta、design、11 项可追踪 Apply tasks、`verification-plan.yaml`、`semantic-closure.yaml` 与 mandatory
  `polish-openspec-change`。planning evidence：strict change、requirements plan、main-spec governance、verification
  routing plan、semantic-closure plan 与 `git diff --check` 均退出 `0`；active delta 与 archived recovery block
  精确匹配且有两个 Scenario，focused Engine regression `3/3` 通过。`polish.md` 的三轮审查没有发现可由既有事实
  修复的 scope/coherence 问题；其诚实 outcome 是 `not ready` for an all-specs-green baseline，因为当前 target
  仍是 REF-010 root，且第六个已解析 requirement `CHI-005` 是独立全局 root。没有 target edit、Harness/runtime edit 或 task checkbox 被提前
  执行；这项离开 planning 的唯一入口是用户明确 Apply。
- [x] `A.8` `[Agent]` 已在用户明确 Apply 后完成并归档 `repair-reference-flat-format-requirement-9-scenario-coverage`：plan
  review、四项 plan gate、main-spec restoration、delta/main exact comparison 与 target validation 均完成。target command
  返回 `bundle/reference-flat-format` valid（`1/1`，`0` failed）；global `openspec validate --specs --json` 从 `83/85`
  收敛为 `84/85`，唯一失败是已命名的 `engine/check-inspect-feedback` `requirements.6.scenarios`（第六个已解析 requirement，`CHI-005`）。closeout 发现并修复
  2.3/3.3 的 tracker/finalizer completion-order 矛盾；随后
  `node openspec/governance/finalize-change-archive.mjs --change repair-reference-flat-format-requirement-9-scenario-coverage`
  返回 `outcome: archived`，通过 `11` 项 checks，归档至
  `openspec/changes/archive/2026-08-09-repair-reference-flat-format-requirement-9-scenario-coverage`。该 evidence 只证明
  OpenSpec grammar repair、tracker lifecycle 与 archive transition，不证明 Harness runtime behavior，也不计入 affected
  Semantic Fact Closure dogfood。
- [x] `A.9` `[Agent]` 已为 `repair-check-inspect-feedback-scenario-coverage` 完成完整 proposal、CHI-005
  `MODIFIED` delta、design、12 项可追踪 Apply/closeout tasks、`verification-plan.yaml`、`semantic-closure.yaml` 与 mandatory
  `polish-openspec-change`。planning evidence：strict change、requirements plan、main-spec governance、verification
  routing plan、semantic-closure plan 与 `git diff --check` 均退出 `0`；active delta 和 archived recovery block
  精确匹配，双方均有三个 Scenario。`polish.md` 的 whole-change coherence、risk-led recovery/proof-boundary 与 final
  readiness passes 修正了 proposal 的中文规则偏差，未发现其余 fact-settled planning defect，并得出 `ready for apply`。
  该结论仅证明 planning artifacts。随后在用户明确 Apply 后，`0.1`–`2.3` 已完成：只恢复了 CHI-005
  main-spec tail 和三个 Scenario；active delta/main exact comparison 通过；target validation 为 `1/1`、`0`
  failed，global inventory 为 `85/85`。首次 finalizer 如实暴露 proposal Capability Discovery 表头与当前 checker
  contract 不符；Agent 将该 root 记为 task `3.1a`，只修复稳定表头、重新 closeout 并重跑 checks。最终
  `node openspec/governance/finalize-change-archive.mjs --change repair-check-inspect-feedback-scenario-coverage`
  返回 `outcome: archived`、11 项 checks passed，归档至
  `openspec/changes/archive/2026-08-10-repair-check-inspect-feedback-scenario-coverage`。这些是 OpenSpec grammar、
  governance 与 archive-transition evidence，不证明 Harness runtime behavior 或 Semantic Fact Closure dogfood。

### Named Debt Ledger

| debt_name | planned_change_name | state | authority evidence | completion / reactivation boundary |
| --- | --- | --- | --- | --- |
| `reference-flat-format-requirement-8-scenario` | `repair-reference-flat-format-scenario-coverage` | archived 2026-08-09; outside Semantic Fact Closure rollout | The REF-009 heading changed only from `+###` to `###`; targeted validation no longer reports `requirements.8.scenarios`, and the governed finalizer returned `outcome: archived` with 11 passed checks | Closed by `openspec/changes/archive/2026-08-09-repair-reference-flat-format-scenario-coverage/`; its newly exposed REF-010 root is independently tracked and does not reopen this debt. |
| `reference-flat-format-requirement-9-scenario` | `repair-reference-flat-format-requirement-9-scenario-coverage` | archived 2026-08-09; outside Semantic Fact Closure rollout | Apply restored the accepted REF-010 block from exact archived recovery evidence; target validation is `1/1` passed, global inventory is `84/85` with only the sixth parsed requirement, `CHI-005`, remaining, and the governed finalizer returned `outcome: archived` with 11 passed checks. | Closed by `openspec/changes/archive/2026-08-09-repair-reference-flat-format-requirement-9-scenario-coverage/`; the sixth parsed requirement, `CHI-005`, remains independently tracked and does not reopen this debt. |
| `check-inspect-feedback-requirement-6-scenario` | `repair-check-inspect-feedback-scenario-coverage` | archived 2026-08-10; outside Semantic Fact Closure rollout | Apply restored only the truncated CHI-005 tail from exact archived recovery evidence. Delta/main comparison is exact with three Scenarios; target validation is `1/1` passed, global inventory is `85/85`, and the governed finalizer returned `outcome: archived` with 11 passed checks. | Closed by `openspec/changes/archive/2026-08-10-repair-check-inspect-feedback-scenario-coverage/`; it does not establish a Harness runtime fact family or reopen Phase 2. |

These debts are named independently of Phase 2. They do not alter a Harness runtime deterministic fact family and therefore cannot be counted as affected-runtime dogfood unless a later scoped change independently changes that boundary.

### Focused Calibration Boundary

这次 change 只收紧 semantic-closure 的 author/reviewer guidance、生成的 operation guidance、两个 accepted
governance requirement 与 selected integration proof。它不修改 Harness runtime resolver、verdict consumer、
v1 parser/checker、finalizer、family catalog 或任何 archived record，因此 closure record 合法地保持
`not_applicable`。八个 current `SUPPORTED_ENTRY_SURFACES` 已逐条检查为能取得 current operation guidance 并到达
共享 `guidelines/change-feedback-loop.md`；没有复制 full rubric，也没有 adapter repair。

两份 delta requirement 已同步进 main specs，并与 delta 完整 block 精确一致；各目标 spec 单独通过 OpenSpec
validation。全库 `openspec validate --specs` 同时报告两个未触及的既有 spec defect：
`bundle/reference-flat-format` 的 requirement `8` 缺 scenario，以及 `engine/check-inspect-feedback` 的
requirement `6` 缺 scenario。它们不属于本 focused change，未被标记为本 change 的完成或修复证据。

## 4. Phase 0：确认现有 v1 基线

进入条件：已有 Semantic Fact Closure accepted capability 和至少一次真实 dogfood。

- [x] `0.1` `[Historical]` 已建立 13-family global catalog；catalog 只保存 family ID 与 bounded question。
- [x] `0.2` `[Historical]` 已建立 change-local `semantic-closure.yaml` 的 closed `not_applicable|affected` contract。
- [x] `0.3` `[Historical]` 已建立只做 structural/referential validation 的 `plan|assets` checker。
- [x] `0.4` `[Historical]` supported apply/archive entry 与 governed finalizer 已接入 semantic-closure checks。
- [x] `0.5` `[Historical]` `close-work-unit-semantic-contract-drift` 已对三个 runtime fact family 完成第一次真实 dogfood。
- [x] `0.6` `[Agent]` 已复跑当前 selected deterministic boundary：`200` tests、`13` suites、`200` pass、`0` fail，约 `69s`。

Phase 0 Gate：已通过。它证明现有 mechanics 与选定 runtime paths 当前通过，不证明 consumer inventory 完整，也不证明长期不漂移。

## 5. Phase 1：二次调查与问题定界

进入条件：Phase 0 已通过；本阶段只修改 learning 文档，不修改 accepted artifacts 或 target code。

- [x] `1.1` `[Agent]` 读取 Project Charter、`CONTEXT.md` 与三份演进指导，确认 authority、semantic level、simplicity 与 action-responsibility 边界。
- [x] `1.2` `[Agent]` 审计 current accepted spec、catalog、contract、checker、finalizer、dogfood record 与 selected tests。
- [x] `1.3` `[Agent]` 在 current tree 和 dogfood archive commit 复核 fragment false precision：共有 `6` 处 occurrence、`5` 个 distinct fragment 不对应实际 symbol（`claimWorkUnit`、`buildWorkUnitEnvelope`、`evaluateCandidate`、`evaluateDirectOutput`、`supersedeWorkUnit`）。
- [x] `1.4` `[Agent]` 已用外部一手资料校准核心设计、checker proof boundary 与建议强度，并直接修订 assessment 正文。
- [x] `1.5` `[Agent]` 复跑完整 selected test set，并把真实计数和 proof boundary 写入调查证据。
- [x] `1.6` `[Agent]` 建立本 progressive tracking plan，含 owner、依赖、checkbox、Gate 与更新协议。

Phase 1 Gate：已通过。Assessment 中的事实、引用、建议优先级与本计划的 dogfood-first 路线一致。

## 6. Phase 2：在下一个真实 change 中完成 Propose / Explore

进入条件：Phase 1 Gate 通过，并出现真实影响 Harness deterministic fact family 的 defect/change。没有真实需求时保持等待，不创建 standalone governance hardening change。本阶段只在 `openspec/changes/` 工作。

2026-08-09 的 user-directed `tighten-semantic-closure-review-honesty` 是一个有实际 dogfood friction 支撑的
窄 governance calibration：它只校准现有 v1 的 author/review delivery，不替代本 Phase 的真实 runtime entry
condition，不计为 `2.1`–`2.9` 或第一份新增 affected runtime dogfood。

- [ ] `2.1` `[Agent]` 选择真实 outcome-changing change，确认它不是为满足 tracking 而制造的 synthetic work。
- [ ] `2.2` `[Agent]` 完成 Capability Discovery，复用已有 capability；不因 semantic closure review 再造重复 capability。
- [ ] `2.3` `[Agent]` 对每个候选 family 做 granularity admission：明确 reader、bounded question、会改变答案的区别与 reasoning stop point。
- [ ] `2.4` `[Agent]` 创建诚实的 v1 `semantic-closure.yaml`：使用归档时实际存在的 symbol；无法稳定命名时使用 bare file path，并在已有的相邻 prose surface（如 `fact`、适用时的 `overlap[].detail`，或 design/closeout review）说明。
- [ ] `2.5` `[Agent]` 用现有字段正确分类：resolver、authority-establishing surface、verdict consumer、`overlap: derived|authoritative|retired|none`；不把 Agent-facing projection 塞成 verdict consumer。
- [ ] `2.6` `[Agent]` 建立 scenario inventory 与 verification plan，至少覆盖 legal positive、adjacent negative、legacy/version、raw-only/filesystem-only 和 unknown/ambiguous case。
- [ ] `2.7` `[Agent]` 完成 Simplicity Admission Test 与 Helper Direction Review：说明要删除/避免的 duplicate predicate，并把用户边界缩到新语义决定。
- [ ] `2.8` `[Agent]` 在 proposal artifacts 完成后立即运行 `polish-openspec-change`，至少执行 whole-change coherence 与一个不同的 risk-led pass；修正由 current source/spec/test 决定的问题，并记录 ready/not-ready 及其证据。不得把 polish 视为 Apply 或 target-code permission。
- [ ] `2.9` `[User decision]` 审定该真实 runtime change 的语义、范围或风险取舍；不要求用户运行 proposal/check/test 命令。

Phase 2 Gate：proposal、delta specs、design、tasks、verification plan 与 closure record 相互一致，required plan checks 通过，mandatory polish 得出明确 readiness verdict，且尚未 target edit。

## 7. Phase 3：Apply 第一个新增 v1 dogfood

进入条件：Phase 2 Gate 通过，且用户明确进入 `/opsx:apply`。最终任务顺序以 approved `tasks.md` 为准。

- [ ] `3.1` `[Agent]` 在 first target edit 前运行 required verification-routing 与 semantic-closure plan checks，先修最近 structural root。
- [ ] `3.2` `[Agent]` 对每个 affected family 执行 one-resolver admission；若一个 coherent conclusion/一张 truth table 无法回答 bounded question，则在同一 change 中拆 family，不造 mega-resolver。
- [ ] `3.3` `[Agent]` 实现 shared semantic decision interface，并让 projection 与 verdict consumer 消费同一 conclusion；consumer 自有的独立 downstream check 保留。
- [ ] `3.4` `[Agent]` 删除、合并或降级至少一份 duplicate predicate/implicit rule；若只增加逻辑，按 approved design 证明其不可避免。
- [ ] `3.5` `[Agent]` 让 focused truth-table test 与真实 cross-surface test 复用同一 scenario inventory，而不是形成两个 shallow oracle。
- [ ] `3.6` `[Agent]` 运行 selected native tests；test exit 拥有 deterministic test verdict，semantic checker 只拥有 structure/reference verdict。
- [ ] `3.7` `[Agent]` 按 actual diff 重做 closeout inventory，记录 plan 漏项、closeout 新发现、fragment false precision、角色误分类、删除的 duplicate predicate、误阻塞与验证耗时。
- [ ] `3.8` `[Agent]` 完成 governance checks、delta/main spec sync、closeout repair 与 governed archive，并同步本计划计数和 evidence ledger。

Phase 3 Gate：第一份新增真实 affected record 已归档，且没有新增 runtime governance layer、checker-owned test runner 或第二套 authority。

## 8. Phase 4：第二个新增 v1 dogfood

进入条件：Phase 3 Gate 通过，并出现第二个真实 affected change。

- [ ] `4.1` `[Agent]` 对第二个真实 change 重复 Phase 2 的 family admission、role classification、actual-symbol/bare-path 与 proof planning。
- [ ] `4.2` `[Agent]` 在 Apply 中复用 shared conclusion 并删除 duplicate interpretation；不为了对齐表格扩大 unrelated refactor。
- [ ] `4.3` `[Agent]` 执行 shared scenario inventory 对应的 focused 与 cross-surface native tests，并保留 proof-scope 说明。
- [ ] `4.4` `[Agent]` closeout 时重新枚举 actual consumers/projections，修复遗漏后再 governed archive。
- [ ] `4.5` `[Agent]` 汇总至少三份真实 affected records（含现有 dogfood）的摩擦数据，而不是把 archive record 当 current topology authority。
- [ ] `4.6` `[Agent]` 形成一页 trigger brief：哪些问题复发、哪些只发生一次、现有 v1 review vocabulary 是否足以让 reviewer 正常停下。

Phase 4 Gate：至少三份真实 affected records 可比较，且有两次采用校准后 v1 review protocol 的新增样本。

## 9. Phase 5：按触发条件决定是否扩机制

进入条件：Phase 4 Gate 通过，或此前出现一项足以独立触发的真实 incident。

- [ ] `5.1` `[Agent]` 检查 coordinate/role trigger：校准后的新增 record 是否再次出现 fragment false precision 或 projection/verdict 角色挤压。
- [ ] `5.2` `[Agent]` 检查 catalog trigger：是否正在合法加入第 14 个 family；只有此时才处理 exact `INITIAL_*` bootstrap oracle 的 extensibility friction。
- [ ] `5.3` `[Agent]` 检查 verification trigger：是否有 missed-run incident，或明确要求 archive/CI 持有 durable native-execution proof；没有则不新增 receipt/runner。
- [ ] `5.4` `[Agent]` 检查 navigation trigger：同一 family 是否已有多份 archive records 且造成可观察的 current-topology 查找成本。
- [ ] `5.5` `[User decision]` 只选择触发证据支持的 focused change，或明确保持 v1；不一次批准所有条件性机制。
- [ ] `5.6` `[Agent]` 更新 Working Decision Log、progress 计数与唯一 next action；未触发项继续 deferred，不伪装成 backlog debt 已获批准。

Phase 5 Gate：保持 v1，或只为已触发问题进入一个 focused OpenSpec proposal；没有“先实现再找理由”的中间状态。

## 10. Phase 6：条件性 governance / v2 change

进入条件：`5.1` 真实复发且 `5.5` 选择处理。若未触发，本阶段保持 deferred，不是失败。

- [ ] `6.1` `[Agent]` 提出独立 focused OpenSpec change，先说明现有 v1 review/`overlap` 为什么不足，以及新层删除哪份实际歧义。
- [ ] `6.2` `[Agent]` 在“强化 review vocabulary”“调整 relation”“引入最小 v2 role field”中选择最小可验证方案，不默认扩成完整 topology schema。
- [ ] `6.3` `[Agent]` 明确 coordinate proof boundary：file path ownership 与 human hint 分开；不实现 comment/callsite 可误命中的 generic token regex。
- [ ] `6.4` `[Agent]` 若引入 v2，为每个角色规定能证明和不能证明什么，并保持 projection 非 authority、diagnostic reader 非 verdict owner。
- [ ] `6.5` `[Agent]` 设计 v1 archive compatibility；不批量改写历史 record，不把历史 false precision 伪装修复为当时已验证事实。
- [ ] `6.6` `[Agent]` 用 focused negative tests 和一个真实 affected dogfood 证明新层减少已观察到的摩擦；parser PASS 本身不算收益。
- [ ] `6.7` `[Agent]` 完成 native verification、actual-diff closeout、spec sync、governed archive，并更新本 tracking plan。

## 11. 独立且暂缓的工作流

以下问题可能有价值，但不应塞进 Semantic Fact Closure 的近期 change：

- **Verification execution evidence**：`verification-plan.yaml` 只拥有 route selection；是否需要 CI/receipt/commit-bound native execution evidence，应先找到真实漏跑或误报事件，再进入独立 verification capability。semantic checker 和 finalizer 不变成通用 test runner。
- **Read-only family inspect view**：只有同一 family 积累多份 archive records 且当前导航成本被实际观察到时再提案。它必须明确非权威，不能把“最新 archive”升级为 current topology truth。
- **Global resolver/consumer registry**：默认不做。current code/spec 仍决定 current topology，change-local records 只声明各自 change 的 closure claim。
- **Generic semantic/static linter**：默认不做。无法可靠区分 display、diagnostic 与 outcome-changing verdict 的 scanner 会成为第二套 interpretation engine。
- **一次性重分全部 13 families**：默认不做。只在 family 首次真实使用且 one-resolver admission 失败时局部拆分。

## 12. Working Decision Log

这些是 backlog 层的当前推荐，不是 accepted behavior：

| ID | 当前推荐 | 重新打开条件 |
| --- | --- | --- |
| D0 | 本文件是已采用的 tracking baseline；按 Gate 和 trigger 顺序推进 | 用户明确改变路线，或 accepted contract 使本计划失效 |
| D1 | 保留 one semantic decision interface，不要求 one giant function | 一个 family 确实需要多个互不从属的 verdict |
| D2 | file path 是当前 machine-checked identity；fragment 只作 human hint | 有可稳定验证的 typed/exported anchor contract |
| D3 | 2026-08-09 先前建议：不开 standalone hygiene change，先用现有 v1 角色做两次新增真实 runtime dogfood；该默认由 D8 针对用户明确的窄 calibration 例外补充 | 校准后的真实 change 再次因角色挤压漏掉 projection/consumer |
| D4 | native test exit 拥有 test verdict；semantic checker 不执行测试 | 独立 verification change 定义了更强且真实的 evidence contract |
| D5 | YAML 是 current family vocabulary；13-family exact JS oracle 暂不单独改 | 第 14 个 family 合法加入时，在同一 change 处理 extensibility friction |
| D6 | 不建立 authoritative current topology projection | 多份历史记录造成可量化导航故障，且非权威 view 可解决 |
| D7 | 本计划中的 every proposed change 必须在 Propose 后立即进行 `polish-openspec-change`；polish 是 planning-quality gate，不是 implementation 或 runtime proof | OpenSpec lifecycle 形成更强、已接受的等价 planning review gate，且能保留至少两轮独立风险审查与 artifact-level repair |
| D8 | 用户明确启动 `tighten-semantic-closure-review-honesty`，以已观察的 fragment false precision 与 projection/consumer 混用校准现有 v1 author/review guidance；不新增 checker、runtime authority 或 v2，且不计作新增 affected runtime dogfood | Apply closeout 发现现有 v1 vocabulary 无法诚实表达本次问题，或后续真实 runtime sample 触发 D3 的复审条件 |

## 13. Evidence Ledger

| Evidence | 当前事实 | 证明边界 |
| --- | --- | --- |
| `openspec/specs/governance/semantic-fact-closure/spec.md` | accepted capability 明确 structural checker 与 Agent semantic review 的分工 | accepted behavior，不证明实现无 bug |
| `openspec/governance/check-semantic-closure.mjs` | assets mode 检查 file path/realpath/regular-file，不检查 fragment identifier | current executable contract |
| archived dogfood `semantic-closure.yaml` + commit `ea02a29af` | `6` 处 occurrence、`5` 个 distinct human-facing fragments 与实际 symbol 不符 | 证明 coordinate false precision 已真实发生 |
| selected 10-file `node --test` run | 200/200 tests 通过，约 69s | 只证明 selected deterministic cases 当前通过 |
| linked assessment 的 primary-source section | 校准 abstraction、module boundary、schema/test/checker proof limits | 支持设计推论，不替代 repo authority |
| active change polish：`tighten-semantic-closure-review-honesty` | two distinct review passes 加 final clean pass；planning artifact scope、verification route、task/finalizer ordering 已收敛 | 只证明 Apply-ready planning artifacts；不证明 implementation、native selected test 或 future Agent semantic review 已通过 |
| focused change Apply / Archive：`tighten-semantic-closure-review-honesty` | plan review + three plan checks passed；delivery test 的 intended red 与 final `7/7` green；eight adapters route through central guidance；two delta blocks synced exactly；finalizer `11` checks passed，归档为 `2026-08-09-tighten-semantic-closure-review-honesty` | deterministic guidance/entry delivery、scoped governance evidence 与归档转换；不证明 runtime semantic closure 或 future Agent compliance |
| verification-only baseline repair：`restore-deterministic-e2e-regression-baseline`，commit `59192f0e5` | `npm test` exit `0`；finalizer `11` checks passed，归档为 `2026-08-09-restore-deterministic-e2e-regression-baseline` | deterministic regression proof/fixture alignment 与 archive transition；不证明 Harness runtime semantic closure，不能作为新增 affected dogfood |
| 2026-08-09 归档后推进核对 | `openspec list --changes --json` 返回 `changes: []`；`git status --short` 无输出 | 证明当前没有 active OpenSpec change 或未提交工作；不证明没有未来 runtime defect，亦不构成 Phase 2 entry |
| archived REF-009/REF-010/CHI-005 scenario repairs | REF-009, REF-010 and CHI-005 repairs are governedly archived; CHI-005 target validation is `1/1`, `openspec validate --specs` is `85/85`, and its finalizer returned `outcome: archived` with 11 passed checks. | scoped grammar restoration, validation, and archive transition only; none is Semantic Fact Closure dogfood |

## 14. 下一次更新模板

```text
最近更新：YYYY-MM-DD
完成：<task IDs>
证据：<paths / commands / exit / review finding>
当前进度：Phase X, done/total
当前唯一 next action：<one action>
阻塞边界：<none | user semantic decision | permission | missing contract>
Working Decision Log 变化：<none | IDs + reason>
```
