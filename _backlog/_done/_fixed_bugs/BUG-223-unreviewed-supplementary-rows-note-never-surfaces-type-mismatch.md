# BUG-223: Wave1 `reference_floor_deficit` 的 unreviewed-supplementary 提示永不浮出——`unreviewedSubmittedSupplementaryRows` 收到 topic 对象而非 slug 字符串

> 状态: 活跃 | 优先级: P2 | 严重度: P2 | 更新: 2026-08-12 | source: 真实 run 执行（enterprise-safe-ai-harness wave1）

## Why

Wave1 提交了 supplementary `wave1_topic_deepening` work unit 后，若
`artifacts/wave1/<topic>/depth-review.yaml#reviewed_work_unit_refs[]` 没有把这些
supplementary work unit 加进去，reference floor 会停在旧 deficit。Engine **有**一个
专门机制想在此时提醒 Agent（WAI-009：`unreviewedSubmittedSupplementaryRows` +
`result.unreviewed_rows` + `wave1ReferenceConvergenceFinding` 的 `unreviewedNote`），
但由于**类型不匹配**，这个提示实际永不浮出，Agent 只能看到裸的
`reference floor deficit 5/8; deficit 3` 并被迫读源码才找到 depth-review 同步步骤。

**代码路径（已核实）：**

1. `evaluateWave1ReferenceTopic`（`wave1-reference-convergence.mjs:361-364`）：
   ```js
   if (result.outcome === 'reference_floor_deficit' && submittedBacking.ok) {
     const unreviewed = unreviewedSubmittedSupplementaryRows(bundlePath, submittedBacking.topic, topicRegistryFact);
     if (unreviewed.ok && unreviewed.rows.length > 0) result.unreviewed_rows = unreviewed.rows;
   }
   ```
   `submittedBacking.topic` 是 **解析后的对象** `{ topic_uid, topic_slug }`（:257 返回）。
2. `unreviewedSubmittedSupplementaryRows`（:381-383）把该 `topic` 参数**当作 slug 字符串**用：
   ```js
   const topicBinding = resolveTopicLayout(layouts, { topic_slug: topic }, { currentOnly: true });
   ```
   `resolveTopicLayout`（`topic-layout.mjs:166`）解构 `{ topic_uid, topic_slug }` 并把
   `topic_slug` 当作字符串去 `layouts.uidByAnySlug.get(topicSlug)` 查找（:169）。传入的
   是对象 → Map 查找返回 `undefined` → 命中 `topic_slug_unknown`（:170）→ 返回 not-ok。
3. 于是 `unreviewed.ok` 为 false → `result.unreviewed_rows` 从不设置 →
   `wave1ReferenceConvergenceFinding`（`wave-contract-evaluators.mjs:228-231`）的
   `unreviewedNote`（"Submitted supplementary work unit(s) ... are missing from
   <topic>/depth-review.yaml#reviewed_work_unit_refs; add them to the depth review and
   rerun this checkpoint before treating the floor as a true deficit."）永不出现。

**为什么是真缺陷：** WAI-009 的意图（把"补充 work unit 未纳入 depth-review"作为
floor deficit 的首要解释）被一个实参/形参类型不匹配完全架空。Agent 实测看到
`reference_floor_deficit` 而不见 unreviewed note，把时间花在"是否缺新来源/是否需再
enqueue"上，而非正确动作（更新 depth-review `reviewed_work_unit_refs`）。

## 复现

1. 完成 primary Wave1 deepening submit，写 depth-review.yaml，`reviewed_work_unit_refs`
   只含 primary work unit。
2. 提交一个 supplementary `wave1_topic_deepening` work unit（同样 topic），
   **不更新** depth-review.yaml。
3. `node DEEP_RESEARCH_HARNESS/cli/inspect-wave1-output.mjs --bundle <bundle>`
4. inspect 输出 `reference_floor_deficit`（如 `5/8; deficit 3`），**不包含**
   "Submitted supplementary work unit(s) ... are missing from .../depth-review.yaml" 提示。
5. 把 supplementary work unit 手动加入 `depth-review.yaml#reviewed_work_unit_refs[]`
   后，同一 inspect 才把 supplementary candidates 计入 materialize/floor。

实测：enterprise-safe-ai-harness 三个 topic（01/02/04）补充提交后全部命中此缺陷。

## Owner / 最小修复

- Owner: `DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs` 的
  `evaluateWave1ReferenceTopic`（调用处）或 `unreviewedSubmittedSupplementaryRows`
  （入参处理）。
- 最小修复方向（二选一）：
  1. 调用处传 `submittedBacking.topic.topic_slug`（slug 字符串）给
     `unreviewedSubmittedSupplementaryRows(bundlePath, submittedBacking.topic.topic_slug, ...)`。
  2. 或让 `unreviewedSubmittedSupplementaryRows` 接受 `{ topic_uid, topic_slug }` 对象，
     在 `resolveTopicLayout` 调用时解构 `{ topic_uid: topic.topic_uid, topic_slug: topic.topic_slug }`。
- 验收：supplementary 已提交但未入 depth-review 时，`reference_floor_deficit` 的
  detail 必须包含 "Submitted supplementary work unit(s) <refs> are missing from
  <topic>/depth-review.yaml#reviewed_work_unit_refs; add them ..." 提示。
