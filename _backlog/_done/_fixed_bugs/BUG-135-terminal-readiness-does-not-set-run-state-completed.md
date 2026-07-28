---
bug_id: BUG-135
title: "Terminal readiness pass leaves rb_status.json state as not_started"
severity: P2
discovered: 2026-07-27
bundle: dpt_rb_openspec-derivative-frameworks
phase: final
node: phases/phase-final.md
gate: readiness-passed
status: fixed
---

# BUG-135: terminal readiness pass 后 run state 仍为 not_started

## 现象

本次 bundle 已完成 Wave0、Wave1、Wave2、HITL2 和 Readiness Gate，最终报告
已经交付，runtime status 却是：

```json
{
  "current_gate": "readiness_passed",
  "next_gate": "none",
  "current_node": "phases/phase-final.md",
  "state": "not_started"
}
```

这意味着同一个 runtime truth 同时表达“终态已通过”和“运行尚未开始”。

## 证据

`RunState` 的允许值包含 `not_started`、`in_progress`、`blocked`、
`completed`。但 `DPT_FRAMEWORK/cli/advance-status.mjs` 在写入状态时只更新
`current_gate` 与 `next_gate`：

```js
const nextStatus = {
  ...status,
  current_gate: targetGateEnum,
  next_gate: nextGateEnum,
};
```

当目标 gate 是终态 `readiness_passed`、`next_gate` 为 `none` 时，没有相应的
`state: completed` transition。

## 影响

1. 已交付 bundle 在 dashboard、审计或恢复/重入逻辑中可能被识别为未启动。
2. 下游消费者需要自行推断 `current_gate + next_gate` 才能判断是否完成，破坏
   `rb_status.json` 作为 runtime truth 的一致性。
3. 终态检查和后续自动化可能错误地尝试继续运行或重新初始化该 bundle。

## 根因假设

状态字段的 gate transition 已覆盖 terminal gate，但 run lifecycle `state`
没有和 terminal transition 绑定；`advance-status` 把 gate progression 当作
独立字段更新，遗漏了终态 state transition。

## 建议方向

1. 当 `targetGateEnum === "readiness_passed"` 且 `nextGateEnum === "none"`
   时，将 `state` 原子更新为 `completed`。
2. 为非终态 transition 明确保留 `in_progress`/`blocked` 的既有语义，并避免
   仅凭 gate 字段在调用方重复推断 lifecycle state。
3. 增加 deterministic regression：完整 bundle 到 readiness pass 后，状态必须
   是 `current_gate: readiness_passed`、`next_gate: none`、`state: completed`。

## 接手信息

### 已确认的代码路径

- `DPT_FRAMEWORK/schema/enums.mjs` 定义 `RunState`：`not_started`、
  `in_progress`、`blocked`、`completed`。
- `phase-readiness.md` 要求经过 final handoff 后执行
  `advance-status --to readiness_passed`。
- `DPT_FRAMEWORK/cli/advance-status.mjs` 计算 terminal `next_gate: none` 后构造
  `nextStatus` 时只覆盖 `current_gate` 和 `next_gate`，保留原 `state`。

因此这是单一 terminal transition 的确定性缺口，不是 report 内容或 readiness
判断的 bug。最小红灯是一个合法 final-handoff bundle：调用
`advance-status --to readiness_passed` 后断言 status 的三元组；当前得到
`readiness_passed / none / not_started`。

### 修复边界

- terminal transition 应原子写入 `state: completed`，并与 trace append 的 rollback
  语义一起处理；不能先写状态、后失败而留下半个 terminal truth。
- 不要顺手重定义所有中间 phase 的 `state` 语义。该卡先只要求终态一致性。
- post-final recovery/reentry 必须保留为已完成 run 的受控恢复路径；不要因为它重新
  加载 phase 就把 `completed` 误降为 `not_started` 或 `in_progress`。

### 完成判据

1. terminal ready path 的 CLI/integration regression 断言三字段一致。
2. trace append 失败时 status rollback 仍保留原 state。
3. existing post-final recovery test 继续区分 recovery handoff 与首次 terminal
   completion，不产生第二套 lifecycle state。

## 结案依据

`complete-terminal-readiness-status` 已归档（v0.57）。正常 witnessed
`readiness_passed -> none` transaction 现在同一原子 status/trace write 中写入
`state: completed`；trace append 失败仍恢复完整旧 status bytes。focused proof 为
21 tests / 2 suites，routing assets、requirements/spec governance 与 strict
OpenSpec validation 均通过；accepted post-final rerun recovery 保持既有路径。
