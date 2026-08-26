# BUG-244: `supersededBy` 把「后续失败 attempt（passed:false）」当成对「先前 passed pass」的覆盖，导致合法 pass 被误吞

- **Severity**: medium（正确性；是 BUG-241 的直接促成因子，但可与 BUG-241 独立修复/回归）
- **Phase**: post-final / 任何同 gate 同 node 被多次 attempt 的 run（含 rerun 与 gate 重试）
- **报告日期**: 2026-08-26
- **Bundle**: `dpt_rb_chinese-ai-inference-chips-vs-nvidia`
- **直接触达的 Engine 源码**: `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs`，`supersededBy(events, candidate)` line 180-192

## 摘要

`supersededBy` 的判据是：找到首个「同 `gate` + 同 `currentNodeRef` 且（`passed!==true` 或 `next!==candidate.next`）」的后续事件即判覆盖。
这意味着一个**失败的后续 attempt（`passed:false`）**也会覆盖掉一个**先前已通过（`passed:true`）的合法 pass**。

语义错误：**一次失败的 gate 尝试不应“作废”同 gate 上次的通过结果**——它只是本次没通过，不代表上次通过的合法性消失。失败 attempt 与通过 attempt 是不同事件；失败 attempt 顶多说明「再试了一次又没成」，不能使先前通过的 pass 从 descendant chain 里消失。

## 真实证据

本 run 的 `continuousNormalDescendant` 复现中：
```
732  phase-hitl2 -> phase-rerun   [hitl2-recorded]  passed=true   supersededBy=1065
1065 phase-hitl2 -> (fail)        [hitl2-recorded]  passed=false
```
**index 732** 是一个 `passed=true` 的合法 `hitl2→rerun` 回入 pass，却被 **index 1065（`passed:false`）** 裁定覆盖（`supersededBy=1065`）。
这直接导致 descendant 链在 743 判 discontinuous（见 BUG-241）。

即便把 1065 排除，index 1068（hitl2→readiness，`passed:true` 但 `next` 不同）也会吞 732。所以本场景是两个叠加因素：
1.（本 BUG-244）**失败 attempt 不该作废先前通过的 pass**；
2.（BUG-241）同 gate+同 node 的**多轮合法多 pass**（不同 next / 不同轮次）被误判为覆盖。

## 复现步骤

任何 trace 中，若同一 gate+node 存在「先 `passed=true`（next=A）」与「后 `passed=false`」两个 attempt：
1. `supersededBy(events, 先passedAttempt)` 会返回 `后failedAttempt`（因为 `passed!==true`）；
2. 调用方（`makeHandoff` 682-689）得到 `{ ok:false }`，把先 passed pass 从 descendant chain / latest-handoff 候选**丢掉**。

## 期望行为

`supersededBy` **只在遇到「同 gate+同 node 且 `passed=true`」的较新 attempt 时**才考虑覆盖；且即便覆盖，也应以「同一生命周期/同一轮次」为限（见 BUG-241 修复方向）。`passed:false` 的 attempt **永远**不应作覆盖判据。

## 相关源码

`DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs` line 180-192：
```js
if (e.passed !== true || e.next !== source.next) {   // ← passed:false 也进此分支
  return item; // 被当成 superseder
}
```
建议改为先 `if (e.passed !== true) continue;`（跳过失败 attempt），再比较 `next`。

## 参考

- 下游后果：`continuousNormalDescendant` 在 `dpt_rb_chinese-ai-inference-chips-vs-nvidia` 的 trace index 743 判 discontinuous，阻断 readiness / Final 交付（见 BUG-241）。