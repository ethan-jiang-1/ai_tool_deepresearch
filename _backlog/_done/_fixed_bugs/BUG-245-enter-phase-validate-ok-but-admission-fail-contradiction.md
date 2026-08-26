# BUG-245: `enter-phase phase-final` 先 `validateEnterPhaseTarget` 报 ok，同一次调用又 `evaluateFinalEntryAdmission` 失败，反馈自相矛盾

- **Severity**: low（诊断/可用性；放大了 BUG-241 的困惑，使人误以为修好了 lineage 即可进，实则连 entry 校验都过不了）
- **Phase**: final 交付（`enter-phase --node phases/phase-final.md`）
- **报告日期**: 2026-08-26
- **Bundle**: `dpt_rb_chinese-ai-inference-chips-vs-nvidia`
- **直接触达的 Engine 源码**: `DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs`
  - line 97-98 `validateEnterPhaseTarget(bundlePath, targetNode)`
  - line 113-118 `evaluateFinalEntryAdmission(bundlePath, handoff)`

## 摘要

`enter-phase` 在同一调用内**依次跑两个校验**：
1. `validateEnterPhaseTarget`（选 latest handoff 并验证目标节点授权）——在本 bundle **返回 `ok:true`**（它命中的是 latest legal handoff `1092 readiness→final`）；
2. `evaluateFinalEntryAdmission`（做最终 inventory/C5-lineage 门禁）——在**同一 bundle** 返回 `ok:false`（`later Final entry requires one accepted retired C5 witness: ... discontinuous at 743`）。

于是输出是先说「Authorized: phases/phase-final.md（来自 readiness-passed）」，然后立刻硬 fail「Resolve the stated Final inventory or lineage boundary」。两个结论基于**同一份 trace** 却互相矛盾，向 Agent/用户传达「修复 inventory 就能过」，实际把 Agent 指向错误又偏袒 root cause（lineage 断链）。对于非 Harness 维护者（Phase Agent），这极难分清到底是「授权有问题」还是「admission 有问题」。

## 复现

在本 bundle 用 `validateEnterPhaseTarget(bundle,'phases/phase-final.md')` → `{ok:true, handoff:1092}`；
紧接着 `evaluateFinalEntryAdmission(bundle, handoff1092)` → `{ok:false, reason:'later Final entry requires one accepted retired C5 witness: normal descendant lineage is discontinuous at trace index 743'}`。
两个函数同一时刻同一 bundle，结论相反。

## 根因

`validateEnterPhaseTarget` 的「latest legal handoff」用 `latestLegalPassedHandoff`/`edgeForAttempt` 找的是**最晚的非破坏性通过**（1092），而 `evaluateFinalEntryAdmission` 进一步要求「post-final C5 链得有一条已接受的 retired C5 witness」。两者判据不同，但 `enter-phase` 把前者名为 Authorized、把后者名为硬校验，且**不解释二者为何不吻合**，也不说明「Authorized ≠ 可最终进入」（因为 final 还有 inventory/lineage 门禁）。

## 期望行为

- `enter-phase` 对 final node 应**先跑并合并两个校验**：若 admission 失败，输出应直接说明「lineage/inventory 门禁未过」，而不是先给一个看似成功的 `Authorized`。
- 或：`validateEnterPhaseTarget` 对 final target 也应把 admission 门禁纳入，使 `ok:false` 一次给出真实原因。
- 至少应消除「Authorized succeeded」与「admission failed」并存的自相矛盾表述。

## 相关源码

- `DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs` line 97-118
- `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs` `validateEnterPhaseTarget`（843-891）、`evaluateFinalEntryAdmission`（774-828）

## 参考

- 触发它的是 BUG-241（C5 lineage 断链）。本 bug 修复后仍依赖 BUG-241 修复才能让 final 真正可进。