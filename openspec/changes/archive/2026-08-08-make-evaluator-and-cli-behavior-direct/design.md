# Design: make-evaluator-and-cli-behavior-direct

## Context

见 proposal.md — Why。本 change 修正两个确定性 evaluator/CLI 的结论语义：
`markdown-semantic-sections.mjs#parseMarkdownSemanticSections`（BUG-205）与
`operate-queue check`（BUG-209）。两者都是"拒绝合法状态/结论与 gate 语义矛盾"，
不涉及反馈文本（已由 Change 1 处理）。

## Goals / Non-Goals

**Goals:**
- `## Key Findings` 下组织在 `###` 子节的证据内容能被语义节评估识别（不再判空）。
- `operate-queue check` 对已 drain queue 返回明确 `drained` 结论。
- 两个行为有 unit/integration 测试锚点，且不回归既有语义节/queue 测试。

**Non-Goals:**
- 不改反馈文本/指引（Change 1 范围）。
- 不新增 queue 状态、生命周期或 gate 行为。
- 不把 `drained` 变成新 gate 结论（只改 CLI `check` 结论）。

## Decisions

### D1 — parseMarkdownSemanticSections 把嵌套子节并入父 body

`markdownSemanticSectionEntries` 当前按"任何 heading 级别都是边界"切分 section。
改为：section body 从自身 heading 起，直到**同级或更高级**的下一个 heading；低级别的
`###` 子节内容并入父 `##` section 的 body。用 heading level（`#{1,6}` 的 `#` 数量）做
层级比较，而不是把每个 heading 都当独立 section。
- 替代 A（evaluator 端 special-case Key Findings）：只修 evidence-summary，不改 parser
  通用语义，未来其他 section 还会踩。否决。
- 替代 B（要求 sub-agent 在 Key Findings 下加摘要段）：把工作推给 actor，且不诚实
  （内容明明存在）。否决。

### D2 — `operate-queue check` 增加 `drained` 结论

在 queue `check` 的结论判定中，当 `active_window` 空、`refill_pool` 空、
`delegated_in_flight` 空时，返回 `{ passed: false, check: false, drained: true,
inspect: [...], advice: 'Queue is drained; no in-flight work.' }`（或类似显式字段），
不再让 advice 说"refill queue 或 record blocker"。`drained: true` 与 `passed` 并存，
让调用方既能区分"有工作/健康"（passed:true）、"阻塞"（passed:false, drained:false）、
"已排空"（passed:false, drained:true）。
- 替代（让 passed:true 表示 drained）：改变 passed 语义，破坏既有"passed:true = 有
  健康工作"的读者预期。否决。
- 替代（gate 也改）：gate `phase_queue_drained` 行为已正确；只改 CLI 结论。否决。

## Risks / Trade-offs

- **[parser 层级比较回归] →** 用现有 semantic-section 测试 + reference-format 测试
  锁住；`###` 并入父 body 不影响 `##` 之间的顶级 section 切分。
- **[drained 与既有调用方兼容] →** 保留 `passed:false` + 新增 `drained: true` 字段，
  既有读 `passed` 的调用方行为不变，读 `drained` 的新调用方可区分。
- **[`###` 无父 section 的孤立子节] →** 仍按顶级 section 处理（level 最小为边界），
  不产生歧义。

## Migration Plan

- apply 阶段直接改 parser 与 queue check；无持久化格式变化，无需兼容层。
- rollback：单 commit 可逆。

## Open Questions

无。
