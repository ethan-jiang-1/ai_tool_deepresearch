# 备选路径：Final 内部 Sub-agent Composition Seam

> 状态：保留的设计探索，当前 scope 暂不考虑；不是 accepted spec、实现许可或 runtime contract。
>
> 当前执行决定：Final Phase Agent 直接执行完整 Report Composition Pass。
>
> 保留原因：本文记录为什么曾考虑 delegated Report Composer、它会触及哪些 contract，以及什么证据出现后值得重新打开。它不覆盖当前决定。
>
> Current-contract note：未来若重新打开 Composer，它也必须消费 accepted `composition_handoff` 派生的 bounded Final context，不得建立另一套 reader/use schema。

## 1. 最初要解决的张力

探索从四个约束出发：

1. **Graph 不变形**：Chain 到 `phase-final` 后就出报告，不增加用户可见 phase、Gate 或回跳。
2. **UX 不加复杂度**：用户不在 Final 再面对报告设计问卷；HITL2 已将 composition intent 收敛进 accepted handoff。
3. **上下文隔离**：长篇材料扫描、章节设计和写作可能挤压 Final Phase Agent context。
4. **不做大调整**：前面的 Wave 和 Chain 已经成立，Final 改进应尽量是 terminal node 内部深化。

第 3 条与第 4 条存在真实张力：当前系统中的 Sub-agent 不是随手 spawn 的写作助手，而是受 work-unit contract 约束的 production actor。

## 2. 产品方向与执行方向要分开

从用户体验和 graph 看，delegation 可以完全隐藏在 Final 内部：

```text
readiness passed
  -> phase-final
  -> consume accepted composition handoff
  -> prepare bounded Final composition context
  -> optionally delegate report drafting
  -> Phase Agent accepts/repairs draft
  -> persist-final-report
  -> deliver

no extra HITL
no extra phase
no outgoing Gate
```

用户仍只看到 Final report。

但从当前 execution contract 看，不能直接“把整份 Final 扔给 Sub-agent”：

- `phase-final.md` 是 `search_policy: no_search`，没有 delegated role keys；
- Final 当前不是 work-unit-capable；
- assignment kinds 只覆盖现有 Wave evidence work；
- required output roles 没有 report draft；
- 现有 Sub-agent role contract 偏 search/evidence production，没有 non-search composer；
- final report judgment 属于 Phase Agent 不应整体委派的 global judgment；
- non-work-unit delegated-looking artifact 只能是 diagnostic，不能成为 production success path。

所以，正式 `dpt-report-composer` 虽然不改变 Chain，却会改变执行层。它不是只改 `phase-final.md` 的小修。

## 3. 如果未来 Delegation，责任应该怎样切

应切开的不是“主 Agent/Sub-agent 谁更聪明”，而是 global semantic judgment 与 bounded drafting work：

| Responsibility | Possible future owner |
|---|---|
| 消费 accepted reader/use 与 recorded view | Final Phase Agent |
| 确认 must-answer coverage obligations | Final Phase Agent |
| 决定哪些 limitation 不能隐藏 | Final Phase Agent |
| 冻结 bounded Final composition context | Final Phase Agent |
| 扫描允许的 verified surfaces | Report Composer Sub-agent |
| 建立 inventory、设计章节、展开论证 | Report Composer Sub-agent |
| 起草 citations 与 mandatory Evidence Map | Report Composer Sub-agent |
| 判断 draft 是否遵守 brief 和事实边界 | Final Phase Agent |
| Final backing admission/persistence verdict | Engine |
| 最终交付 | Final Phase Agent |

一句话概括：

> Phase Agent 决定“这份报告必须怎样才算对题且诚实”，Composer 在这个冻结边界内完成材料处理和长篇 drafting。

这不会让 Phase Agent 变成零工作。它至少仍需确认 legal Final entry、形成 bounded context、启动并跟踪 attempt、阅读 compact summary、处理 persistence、交付 committed artifact。

## 4. Future Composer Interface

如果未来正式引入 Report Composer，Interface 不应是“读取整个 bundle，自由写一份好报告”。

### Future Composer input adapter

Adapter 从当前 accepted contract 与 existing owners 派生，不产生新 user-intent owner：

```text
Accepted final_report_view / view instructions:
Accepted reader / intended use / primary focus:
Exact root must-answer set:
Non-negotiable findings/limitations:
Allowed verified read graph:
Accepted language / length / evidence exposure / appendix posture:
Preferred spine:
Intended final target:
Staging write coordinate:
```

允许读取的 graph 可以包含：

- plan/profile/HITL2 decision brief；
- Wave2 finding index、ledger、synthesis；
- Seed Topic return maps；
- `reference/_INDEX.md`；
- 由 concrete refs 可达的 Wave1/reference backing。

Composer 获得足够材料，但不获得整个 lifecycle 或自由 filesystem discovery。

### Composer output

```text
1. retained non-final staging draft
2. must-answer coverage summary
3. selected finding IDs -> report sections
4. material contradictions/limitations -> report locations
5. omitted material candidates -> reasons
6. Evidence Map row summary
7. semantic-drift warnings
```

Summary 必须紧凑，目的是让 Phase Agent 验收，而不是再制造一份与报告等长的解释文件。

### Explicit prohibitions

Report Composer 不得：

- 搜索或获取新 evidence；
- 创建新 W2F finding；
- 改写 status、priority、confidence 或 gap；
- 决定 HITL2 semantics 或改变 `final_report_view`；
- 写 status、trace、ledger 或 Gate result；
- 把自己的 work-unit row 当成 report claim backing；
- 直接把 draft 写成 committed `final/*.md`；
- 宣称自己的 attempt success 等于 Final delivery。

## 5. 为什么要写 Staging，而不是直接写 `final/`

Final Markdown 有一个特殊合法提交路径：`persist-final-report`。它检查 mandatory Evidence Map、path safety 和 submitted backing。

如果 Composer 直接写 committed `final/report.md`：

- work-unit output 与 Final delivery evidence 混在一起；
- 可能绕过 retained staging admission；
- draft completion 会被误认为 terminal delivery；
- Phase Agent 失去最终 semantic acceptance 点。

更清楚的 future seam 是：

```text
Composer -> non-final retained staging draft
Phase Agent -> accept or bounded repair
Engine -> persist-final-report
final/report.md -> terminal delivery evidence
```

Composer submit 只证明“actor attempt 返回了 contract-valid draft”，不证明报告内容正确，也不替代 legal Final entry、Evidence Map admission 或 final file existence。

## 6. 三条曾考虑的路径

### Path A: Final Phase Agent 直接执行 Composition Pass

改动集中在 Final guidance、view semantics 和 verification。

优点：

- 改动最小；
- 与当前 `phase-agent` contract 一致；
- 没有新 work-unit、submit、recovery 或 actor availability；
- 可以先验证 composition semantics 是否成立。

风险：

- Final Phase Agent 需要读取较多材料；
- 长报告可能挤压 context；
- 写作质量依赖单个 Phase Agent 的上下文管理。

**当前状态：已选择。**

### Path B: 正式 `dpt-report-composer` work unit

Final 对用户仍是一个 node，但内部变成 work-unit-capable。

需要同时定义：

- Final execution contract/capability inventory；
- new work-unit kind 与 actor policy；
- non-search Sub-agent role contract；
- report draft output role/direct contract；
- queue demand/claim/submit/fallback；
- staging 到 `persist-final-report` 的 ownership；
- Final 无 Gate 时的 in-flight drain/recovery；
- deterministic tests 与真实 `agent_flow_e2e`。

优点：

- 真正隔离长篇材料扫描和写作；
- Phase Agent 可只保留 brief、acceptance 和 delivery；
- future Composer implementation 可以独立深化。

风险：

- scope 明显大于 Markdown guidance change；
- current work-unit machinery 偏 evidence/search；
- Final 没有 Gate，必须定义 attempt 未完成时的 terminal behavior；
- 容易为了尚未证明的 context problem 提前增加控制复杂度。

**当前状态：暂不考虑；保留为 future evidence-triggered option。**

### Path C: 直接 spawn 不走 work unit 的写作助手

表面最轻，但会形成第二套 delegated production mechanism：

- 没有 canonical identity、result contract、submit 或 recovery；
- artifact 在当前模型里只是 diagnostic；
- 平台能力会被误当成 Harness authority；
- success 无法与 legal Final delivery 对齐。

**当前状态：暂不考虑，且不应作为“先简单做一下”的捷径。**

## 7. Fallback 的可能形状

如果未来采用 Path B，Final 不能因为 Composer unavailable 就主动询问用户或停在新 checkpoint。

一种候选形状是复用 actor-choice vocabulary：

```text
delegated_subagent available
  -> composer drafts

delegated_subagent unavailable and kind policy allows fallback
  -> one phase_agent_fallback attempt drafts
```

两者必须走同一个 work-unit Interface 和 submit authority，而不是两套 success path。但这需要新 kind 明确定义 fallback policy，不能靠 Final prose 临场决定。

当前没有采用 Path B，因此也不应预埋这个 fallback。

## 8. Future Verification Burden

如果重新打开 formal Composer，deterministic verification 至少要证明：

- Final 只有 legal Final entry 后才能 claim composer work；
- Composer 无 search capability；
- assigned draft 只能写 staging；
- submit row 不会成为 report claim backing；
- in-flight/failed/fallback attempt 不会被误认为 delivered；
- `persist-final-report` 仍是唯一 Final Markdown admission；
- Final 仍无 outgoing Gate、transition 或 user wait。

真实 Agent-flow verification 还要观察：

1. Phase Agent 形成 brief。
2. Composer 读取 bounded verified surfaces 并写 draft。
3. Phase Agent 根据 summary/draft 做 acceptance。
4. 报告通过 persistence admission。
5. 不同 view 有真实组织差异，同时保持 claim/confidence/limitations/backing invariants。

上下文隔离与报告质量必须由真实 Agent observation 证明，不能用固定 fixture 冒充。

## 9. 重新打开 Path B 的条件

当前 plan 不继续设计 Composer。只有同时满足以下条件时才值得重新打开：

1. 真实 readiness-passed runs 重复显示 Final Phase Agent 因材料扫描/长篇 drafting 发生实质性 context failure 或质量退化。
2. Bounded projections 和更清楚的 Composition Pass 仍不足以解决问题。
3. 收益足以承担 execution contract、work-unit、staging、recovery 和 verification 的跨文件 scope。
4. 新 change 能保持 Final topology、User UX、Agent judgment 和 Engine authority 不变。

届时 Path B 必须作为独立 OpenSpec change 重新提出，不能把本文当作预授权任务列表。

## 10. 当前结论

Delegated Report Composer 是一个有现实价值的备选，不是荒谬方案；但它解决的是尚待真实运行证明的 context isolation problem，同时会引入确定的 execution-layer complexity。

因此当前选择 Path A，Path B/C 暂不考虑。保留本文是为了未来不必重新发现同一组责任切分、contract 影响和验证负担，而不是让当前 implementation 同时背负多条路径。
