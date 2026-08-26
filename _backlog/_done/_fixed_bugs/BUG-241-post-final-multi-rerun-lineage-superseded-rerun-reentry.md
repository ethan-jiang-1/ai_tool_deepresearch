# BUG-241: post-final 多轮 rerun 时 `supersededBy` 误吞 hitl→rerun 回入 pass，多轮 lineage 判 discontinuous，Final 交付永久卡死

> 本文件是 BUG-241 的**勘误重写版**。旧版 `BUG-241-post-final-rerun2-lineage-discontinuous-blocks-delivery.md` 的根因分析是**错误**的（误判为「rerun#2 缺 wave2→hitl2 transition」，但该 transition 实际存在，见下方证据索引 1063）。本版以真实 trace 复现 + 源码逐行确认为准。旧版文件已被本文件取代，建议归档。

- **Severity**: blocker
- **Phase**: post-final 多轮 rerun 收敛 → readiness → Final（交付路径）
- **报告日期**: 2026-08-26（勘误更新）
- **Bundle**: `dpt_rb_chinese-ai-inference-chips-vs-nvidia`
- **直接触达的 Engine 源码**:
  - `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`
    - `supersededBy(events, candidate)` → line 180-192
    - `makeHandoff(...)` → line 681-727（在 682-689 调用 `supersededBy`，命中即返回 `ok:false` 并**丢弃**该 handoff）
    - `continuousNormalDescendant(...)` → line 382-407（遍历 post_final 之后所有 gate_attempt，逐条 `makeHandoff`，被 supersede 的直接跳过）
    - `inspectPostFinalHandoffStage(...)` → line 580-641
    - `evaluateFinalEntryAdmission(...)` → line 774-828
    - `validateSourceGateStatusSync('hitl2_recorded')` → line 893-992

## 摘要

在同一 **post_final**（一次 C5 `post_final_reentry` 事件）之下连续进行**多轮 rerun**（rerun#1 之后又在 hitl2 再次决策 rerun → rerun#2，再走 wave → hitl2 → readiness → Final）时，
`continuousNormalDescendant` 用 `supersededBy` 把 rerun#2 的**回入 pass**（`phases/phase-hitl2.md → phases/phase-rerun.md`）当成被后续 pass 覆盖而**丢弃**，
导致 descendant 链在 rerun#2 起点断链 → `normal descendant lineage is discontinuous at trace index 743`。

该错误**多路阻断**：
- `advance-status --to hitl2_recorded` → `validateSourceGateStatusSync` → `inspectPostFinalHandoffStage` → `descendant_lineage_drift`；
- `check-reentry --at hitl2_recorded` → `post-final-recovery: missing_contract`；
- 进入 phase-final → `evaluateFinalEntryAdmission` → `later Final entry requires one accepted retired C5 witness: normal descendant lineage is discontinuous at trace index 743`；
- `operate-post-final-recovery inspect` → `blocked: accepted_lineage_drift`。

readiness / Final 交付（用户要的 V3）整体卡死。**用户已指示：先报全 bug、给足上下文，由可改 Harness 的另一个 Agent 修复后，本 Agent 再继续交付。**

## 真实 trace 证据（Engine 逐行复现产物）

`continuousNormalDescendant` 对 post_final(387) 之后所有合法 gate_attempt 逐条构建 descendant chain；`supersededBy(events, candidate)` 返回首个「同 gate + 同 currentNodeRef 且（passed!==true 或 next!==candidate.next）」的后续事件。实跑结果：

```
398  phases/phase-rerun.md      -> phases/phase-seed-topics.md   [rerun-ready]        supersededBy=null
536  phases/phase-seed-topics.md -> phases/phase-wave0.md        [seed-topics-ready]  supersededBy=null
616  phases/phase-wave0.md      -> phases/phase-wave1.md         [wave0-complete]     supersededBy=null
696  phases/phase-wave1.md      -> phases/phase-wave2.md         [wave1-complete]     supersededBy=null
719  phases/phase-wave2.md      -> phases/phase-hitl2.md         [wave2-complete]     supersededBy=null
732  phases/phase-hitl2.md      -> phases/phase-rerun.md         [hitl2-recorded]     supersededBy=1065  <== 回入 pass 被吞
743  phases/phase-rerun.md      -> phases/phase-seed-topics.md   [rerun-ready]        supersededBy=null  <== 起点 source=phase-rerun，与 719 target=hitl2 不连续
869  phases/phase-seed-topics.md -> phases/phase-wave0.md        [seed-topics-ready]  supersededBy=null
949  phases/phase-wave0.md       -> phases/phase-wave1.md        [wave0-complete]     supersededBy=null
1031 phases/phase-wave1.md       -> phases/phase-wave2.md        [wave1-complete]     supersededBy=null
1051 phases/phase-wave2.md       -> phases/phase-hitl2.md        [wave2-complete]     supersededBy=null
1068 phases/phase-hitl2.md       -> phases/phase-readiness.md    [hitl2-recorded]     supersededBy=null
1092 phases/phase-readiness.md   -> phases/phase-final.md        [readiness-passed]   supersededBy=null
```
```

- **index 732** 是 rerun#1 结束时 `hitl2` 的合法决定「再次 rerun」（`next=phases/phase-rerun.md`，`passed=true`）。
- 它被 `supersededBy` 判为被 **index 1065（一个 `passed:false` 的失败 hitl2 attempt）** 吞掉；即使没有 1065，**index 1068（`hitl2→phase-readiness`，next 不同）也会吞它**。
- 于是 descendant 链变成 `719(→phases/phase-hitl2.md)` 直接跳到 `743(→phases/phase-rerun.md)`；743 的 sourceNode=`phases/phase-rerun.md` ≠ 719 的 targetNode=`phases/phase-hitl2.md` → 判 discontinuous **at index 743**。

**旧版误判澄清**：旧版说「rerun#2 缺 wave2→hitl2 transition」——这是**错误**的。真实 trace 中 transition **index 1063** 存在：
`{"event":"phase_transition","from":"wave1_complete","to":"wave2_complete","next":"hitl2_recorded", ...}`。
真实断点是 **732 被误吞**，不是 transition 缺失。

## 根因（逐行）

1. `makeHandoff`（681-727）在 682-689 先调 `supersededBy`；若命中，返回 `{ ok:false, superseder }`。`continuousNormalDescendant`（388-390）对每个 candidate 调 `makeHandoff`，`!made.ok` 的**直接 continue 丢弃**，不保留到链里。
2. `supersededBy`（180-192）以 `gate + currentNodeRef` 为唯一 key，把**任何**后续「同 gate 同 node 但不同 next / 失败」的 attempt 判为覆盖。这在「同一 gate 在同一点只被反复重跑」的意图下是对的；但**在多轮 rerun 下，同一个 `hitl2-recorded` gate 会在不同轮被不同 next 合法使用**（本轮 → phase-rerun，最后一轮 → phase-readiness），它们在语义上是**不同的生命周期事件**，不是「同一 pass 被重新决定」。

→ `superseded` 无法区分「同 gate 同 node、但属于不同 rerun 轮次的合法多 pass」与「同 pass 被覆盖」。

3. 后果在 `continuousNormalDescendant` 的连续性检查（396-399）暴露：`sourceNode` 必须是上一 `targetNode`；732 被吞后 719→hitl2 与 743→rerun 无法衔接 → 判不连续。

## 期望行为

多轮 post-final rerun（rerun#1 经 C5 reentry、之后经 hitl2→rerun 正常链再 rerun）完成后：
1. `advance-status --to hitl2_recorded` 应能正确写 `wave2_complete/hitl2` 的 transition、推进 current_gate，允许后续 readiness / Final 交付；
2. 至少应放行 rerun#2 起点（732）为一个**保留在 descendant 链中的合法回入 pass**，使 719→732→743 连续；
3. 至少应有 sanctioned recovery path（而非 `missing_contract` / `accepted_lineage_drift`），让 Agent 能重建被吞掉的 pass 或重置 lineage 检查。

## 修复方向（供 Harness-fixing Agent）

- `supersededBy` 的「同 gate + 同 node 即覆盖」判据对多轮 post-final rerun 太激进。建议：
  - 只有当后续 pass 与 candidate **属于同一个 rerun 轮次 / 同一次 gate 生命周期**时才覆盖；跨轮次的（中间隔着完整的 rerun-ready→...→wave→hitl2 子链）应视为不同事件，不进覆盖；
  - 或：`continuousNormalDescendant` 在构建链时，**以路由可达为准**（允许 `phase-hitl2 → phase-rerun` 作为合法桥两次出现），而不是依赖 `supersededBy` 在踩链中的「吞掉」语义。
- 修复后应回归覆盖真实场景：post_final → rerun#1 → hitl2(再次 rerun) → rerun#2 → waves → hitl2(readiness) → readiness → final，全链 `continuousNormalDescendant` 返回连续且 `latest` 正确。

## 最小可复现 / 验证

在真实 bundle 上：
1. `node -e` 复现上述 chain 打印（见「真实 trace 证据」）；确认 732 `supersedBy=1065`，743 断点。
2. 修复后同一脚本应打印 732 `supersededBy=null`（或进入链）、743 不再断。

## 相关上下文

- 源头源码：
  - `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs` — `supersededBy`/`makeHandoff`/`continuousNormalDescendant`/`inspectPostFinalHandoffStage`/`evaluateFinalEntryAdmission`/`validateSourceGateStatusSync`。
  - `DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs` line 97-118（先 `validateEnterPhaseTarget` 后 `evaluateFinalEntryAdmission`，后者在此场景 pop 失败）。
- 相关既有 bug：BUG-236（C5 事件改绑 primary-series digest，"第二次 rerun 不再被 non-primary 漂移阻塞"）——本 bug 是**另一类**多轮 rerun 阻塞（lineage 断链），不是 inventory drift。
- README 活跃表中 BUG-241 行本体旧版描述已失实，随本勘误一并更新。