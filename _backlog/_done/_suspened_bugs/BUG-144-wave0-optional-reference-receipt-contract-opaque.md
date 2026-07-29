---
bug_id: BUG-144
title: "Wave0 optional shared-reference outputs have an opaque assignment-receipt boundary"
severity: P2
discovered: 2026-07-29
bundle: dpt_rb_openspec-evolution-popularity-user-demands
phase: wave0
node: phases/phase-wave0.md
category: work-unit-contract-usability
---

# BUG-144: Wave0 optional shared-reference outputs have an opaque assignment-receipt boundary

## 现象

在真实 OpenSpec 研究 bundle 的 Wave0 queue 填充中，Phase Agent 为
`wave0_source_intake` 任务声明了一个必需的 `source.yaml`，同时把本任务可能产出的
`reference/00-shared-*.md` 放进了 `required_receipts`。Engine 拒绝了全部五个合法形状相同的
候选任务，错误只有：

```text
assignment contract rejected: Wave0 source intake assignment receipt shape is invalid or duplicated
```

这会在真正 claim/sub-agent/search 发生前阻断 Wave0。这里要区分两层：Engine 的
fail-closed 判断本身是正确的；问题在于 optional `reference` output、`writes_to`、
`required_receipts` 和 assignment `required_outputs` 之间没有在 Agent-facing admission
错误中形成清晰的可修复边界。一个合理的 task-card 构造误读就会让整个 wave 卡住。

## Red loop（已运行）

最小 repro 使用一个 Wave0 source-intake card，只把一个 shared reference 额外加入
`required_receipts`：

```bash
node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue \
  /Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands \
  --task /tmp/wave0-invalid-receipt-shape.json
```

稳定结果：

```text
exit code: 1
assignment contract rejected: Wave0 source intake assignment receipt shape is invalid or duplicated
```

同一 bundle 的实际运行中，五张 Wave0 task card 都得到相同失败；没有 queue item 被写入，
也没有 work unit、evidence、cache 或 ledger 被伪造。

## Green comparison（已运行）

将 `required_receipts` 收敛为 assignment contract 要求的唯一 direct output：

```json
"required_receipts": [
  "file:artifacts/wave0/01_openspec-evolution-problem/source.yaml"
]
```

并保留 shared reference 在 `writes_to` / result `output_files[]` 作为可选 producer output，
相同 enqueue 路径已接受（exit code `0`）。这证明问题不是 topic UID、网络、权限或
`dpt-source-intake` actor 不可用，而是 task-card receipt shape / diagnostic boundary。

## 预期行为

当 Wave0 task card 同时声明 source YAML 和 optional shared rich references 时，系统应该：

1. 在 task generation 或 enqueue admission 阶段明确告诉 Agent：Wave0 的
   `required_receipts` 必须精确等于一个 `file:artifacts/wave0/<slug>/source.yaml`；
2. 允许 optional `reference` producer outputs 通过 `writes_to` 和 result
   `output_files[]` 声明，而不把它们误当作 direct required outputs；
3. 如果 receipt shape 错误，错误应显示 expected set、observed set 和 exact repair coordinate，
   而不是只返回 `invalid or duplicated`；
4. 队列卡片示例、生成的 task.md、assignment contract 和 gate 对“必需输出”与“可选输出”
   使用一致术语。

## 实际行为与证据边界

- `DPT_FRAMEWORK/engine/work-unit-assignment-contract.mjs` 的 `requiredOutputsFor()` 对
  `wave0_source_intake` 调用 `exactReceiptSet(receipts, [file:.../source.yaml])`，因此额外
  shared receipt 必然被拒绝。
- `DPT_FRAMEWORK/engine/work-unit-constants.mjs` 又允许 Wave0 result 的
  `output_files[].role` 为 `reference`，且要求 `reference` 输出带 `source_url`；因此
  shared reference 在 result 层是合法可选输出，不是 assignment direct required output。
- `DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md` 的 task-card 示例同时列出
  `reference/00-shared-<slug>.md` 与 source YAML 的 `writes_to`，但只列 source YAML
  `required_receipts`。这是真实的正确形状，不过该区分没有在 admission 错误中解释，且
  容易被 Agent 在构造多输出任务时误读。
- Gate 对 shared reference 的要求是 submitted work-unit 的 `output_files[]` role/reference
  与 `source_url`，不是直接手写 reference 文件；本次没有绕过该 provenance 边界。

## 诊断结论

确认的最小直接根因是：Wave0 assignment contract 使用严格的 exact receipt set，但
Agent-facing 错误没有暴露 expected receipt set；同时 phase card 的 `writes_to` 可包含
optional shared reference，而 direct receipt 只能包含 source YAML。于是一次 task-card
构造层面的混淆会表现为整个 Wave0 “不可入队”。

当前尚不能把它定性为 Engine 语义错误：fail-closed exact set 与现有 direct-output
contract 一致。它是一个 P2 work-unit contract usability / diagnostics bug；若后续证明
文档和生成 task 已足够明确，则应降级为 Agent 自身构造错误并关闭本卡，而不是放宽
`required_outputs` 或让 optional reference 获得错误 authority。

## 与既有 bug 的关系

- BUG-105/107/108/111/112 处理 producer contract、submit 和 Phase-owned closeout 的
  更广义问题；BUG-144 是一次 fresh current-head run 暴露的 Wave0 admission error
  可修复性/多输出边界问题。
- BUG-124 处理 shared-reference guidance 与合法 producer 路径；本卡不要求新增
  reference writer 或第二套 authority，只要求把现有 optional output path 讲清楚。
- BUG-143 是 HITL1 host search/fetch adapter 缺口；本卡发生在 research access 已通过、
  进入 Wave0 后，不是网络或 capability gate 问题。

## 建议方向（需走 OpenSpec propose/explore/apply）

- 为 `exactReceiptSet()` 返回结构化 expected/observed repair detail，并在
  `operate-queue enqueue` 的 admission error 中投影 `write_to` 与 exact rerun；
- 在 Wave0 phase 和 generated task.md 中明确标注：`required_receipts` 是 direct
  assignment outputs，optional `reference` 只能通过 result `output_files[]` 声明；
- 为这一最小形状增加 deterministic enqueue/admission regression，覆盖“source-only
  receipt + optional reference output”通过以及“optional reference 误列 receipt”给出
  明确错误；
- 保持当前安全边界：不把 optional reference 直接变成 required output，不允许未 submit
  的文件满足 Gate，不手写 ledger/receipt，也不降低 Wave0 source/shared floors。

## Non-goals

- 不放宽 Wave0 exact direct-output receipt contract。
- 不把 filesystem-only shared reference 当作 Gate evidence。
- 不让 Phase Agent 代替 Sub-agent 伪造 source.yaml、cache、result 或 ledger。
- 不把本卡并入 BUG-143 的 HITL1 research access adapter change。

## 接手信息

- Active bundle: `dpt_rb_openspec-evolution-popularity-user-demands`
- Repro card: `/tmp/wave0-invalid-receipt-shape.json`（当前会话临时 repro）
- Corrected card examples: `/tmp/wave0-source-01_openspec-evolution-problem.json` 等
- Owner boundary: `work-unit-assignment-contract` + Wave0 task-card/guidance diagnostics
- Current workaround: `required_receipts` 只保留 exact source YAML；shared references 作为
  optional result outputs，并由 submitted work-unit ledger 覆盖

## 模型与归因备注（2026-07-29）

- 本次主 Coding Agent：Codex；运行时可见模型族为 GPT-5，精确 deployment/model ID
  未暴露。Wave0 delegated actor 的具体模型未写入 work-unit receipt/ledger，不能做型号级
  归因。
- 归因应标为“混合”：把 optional reference 误放入 `required_receipts` 可能是弱模型/Agent
  构造 task card 时的理解失误；但错误没有给出 expected/observed receipt 边界，是框架的
  diagnostics/usability 缺口。
- 调整方向：把“`required_receipts` 只能有一个 exact source YAML；reference 仅进
  `writes_to`/result `output_files[]`”前置到 task 模板和 admission feedback；不放宽
  receipt contract。
