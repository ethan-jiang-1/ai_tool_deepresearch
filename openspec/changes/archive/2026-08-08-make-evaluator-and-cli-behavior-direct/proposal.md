# Proposal: make-evaluator-and-cli-behavior-direct

## Why

一次完整 real-actor Deep Research run 暴露 2 个"确定性 evaluator/CLI 行为拒绝合法状态"
的摩擦点（BUG-205/209，见 `_backlog/bugs/`）：semantic-section parser 把 `###` 子节当
section 边界，导致 `## Key Findings` 下只有 `###` 子节的 evidence-summary 被 `key_findings_missing_or_empty`
拒绝；`operate-queue check` 在 queue 已完全 drain 时返回 `passed:false`，与 gate
`phase_queue_drained` 的语义矛盾。这两个不是"反馈没讲清楚"（已由 Change 1
`make-feedback-name-contract-roots` 处理），而是 evaluator/CLI 的输出语义本身错了。

## What Changes

- **BUG-205**：`markdown-semantic-sections.mjs#parseMarkdownSemanticSections` 把嵌套的
  `###` 子节并入其父 section body——`## Key Findings` 的内容组织在 `###` 子节下时不再
  被判空。评估语义节内容的 evaluator（`direct-output-contract.mjs`
  `evaluateEvidenceSummary`）据此接受合法书写。
- **BUG-209**：`operate-queue check` 在 `active_window`、`refill_pool`、
  `delegated_in_flight` 全空（queue 已 drain）时返回一个明确的 `drained` 结论，而不再
  返回 `passed:false`；空 queue 的 gate-drain 前置条件与 CLI 结论语义一致。

这些改变 evaluator/CLI 的**合法接受/拒绝集合与输出结论**，不新增控制层。**BREAKING**: 无
（`passed:false` → `drained` 是 CLI 结论语义的诚实化，不改变既有 gate 行为）。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `research/wave1-intake`: evidence-summary Key Findings 语义节包含嵌套子节内容，
  不因 `###` 子节组织而被判空（BUG-205）。
- `agent/agentic-queue`: `operate-queue check` 对已 drain queue 返回明确 `drained`
  结论（BUG-209）。

## Impact

- **代码面**（apply 阶段才改，本 change 不触碰）：
  - `DEEP_RESEARCH_HARNESS/engine/helpers/markdown-semantic-sections.mjs`
    （`parseMarkdownSemanticSections` 嵌套子节并入父 body）。
  - `DEEP_RESEARCH_HARNESS/engine/helpers/direct-output-contract.mjs`
    （`evaluateEvidenceSummary` 消费嵌套后的 Key Findings）。
  - `DEEP_RESEARCH_HARNESS/engine/.../queue` CLI（`operate-queue check` drain 结论）。
- **版本**: 修改 `DEEP_RESEARCH_HARNESS/` 行为 → 需要 version bump，目标 **v0.78**。
- **依赖**: 无新增 npm 依赖。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|----------------|---------------|----------|--------|
| `research/wave1-intake` | main spec（WAI-005 "Wave1 gate checks deepening artifacts" 提及 Key Findings/question-list 语义节评估） | Modify | evidence-summary Key Findings 语义节评估归属此契约 |
| `agent/agentic-queue` | main spec（AGQ-001..026，Queue Manager 操作与结论） | Modify | `operate-queue check` 的 drain 结论归属此契约 |
| `research/research-wave-phase-content` | main spec（phase body 内容） | Excluded | 该契约管 phase Markdown 指导，不管 semantic-section parser 行为 |
| `engine/schema-core` | main spec（schema 契约） | Excluded | parser/CLI 行为不属 schema 契约 |
| `engine/check-inspect-feedback` | main spec（CHI，反馈文本） | Excluded | 本 change 改 evaluator/CLI 结论语义，不是反馈文本 |

## 语义精度反思（semantic-precision reflection）

本 change 改变两个具名 reader-facing 面的语义：
1. **semantic section**（`parseMarkdownSemanticSections` 的 section body）：读者是
   evaluator 与写 evidence-summary 的 sub-agent。必须保留的区别：section 标题标识不变，
   嵌套标题不改变父 section 的身份；body 现在含 descendant 内容。停止点：Agent 把
   `## Key Findings` 下的发现组织进 `###` 子节即可被识别。
2. **`operate-queue check` 结论**：读者是 Phase Agent 与 gate。`drained` 是一个新的
   `check` 结论枚举值，语义是"queue 已排空、无 in-flight"——与 `passed:true`（有可用
   工作）、`passed:false`（有阻塞/缺失）区分。停止点：Agent 看到 `drained` 即知可跑
   drain 类 gate。

## 责任边界

- 用户：无新语义/风险/权限决定（均为 evaluator/CLI 结论的诚实化修正）。
- Agent：apply 阶段按 tasks 做机械修复与测试。
- Engine：parser/CLI 是确定性 verdict 载体，本 change 让结论更诚实。

## Net simplification

本 change 不新增控制层。`parseMarkdownSemanticSections` 的改动把"子节内容被丢弃"这一
隐式缺陷删除，让 Agent 的自然书写被正确识别；`operate-queue check` 的 `drained` 结论
消除了"gate 要求 drain 但 CLI 报 failed"的语义矛盾——两者都减少 Agent 的逆向工作。
