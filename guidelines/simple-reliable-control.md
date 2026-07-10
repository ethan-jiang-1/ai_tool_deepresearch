---
guideline_id: simple-reliable-control
suite: deep-research-guidelines
title: Simple Reliable Control
status: effective
created: 2026-07-10
role: design guidance for short Agent decision chains and reliable quality-control checkpoints
scope: openspec/changes/, DPT_FRAMEWORK/workflows/, DPT_FRAMEWORK/cli/, DPT_FRAMEWORK/engine/, tests/, experiments_playbook/
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
siblings:
  - guidelines/project-charter.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/logging-conventions.md
  - guidelines/command-experiments.md
  - guidelines/agentic-execution-model.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-subagent-mechanism.md
---

# Simple Reliable Control

> 状态: 生效 | 创建: 2026-07-10 | 用途: 控制 Agent Flow 与质量检查的复杂度

## Purpose

本项目不是纯传统程序。LLM Agent 会理解、修复和重试简单问题；Markdown controller 会把任务和反馈带回 conversation；Engine 负责不可含糊的确定性 checkpoint。

因此，可靠性不来自把所有可能性都编码成一条很长的精确逻辑链，而来自：

```text
直接事实 -> 简单检查 -> 最小根因反馈 -> 一个明确下一动作
```

当控制链过长时，Agent 容易忘记前置语义，Engine 实现容易兼顾不了两端，质量控制本身也会成为新的故障源。项目默认选择短、直、可解释、可重复的闭环。

本 guideline 只定义设计姿态和评审标准。具体 schema、CLI、gate rule、状态字段和 trace contract 仍必须通过 OpenSpec 与 executable contracts 定义。

## Core Principle

**Prefer the shortest correct control loop.**

一个 checkpoint 默认只回答三个问题：

1. 当前直接事实是否满足契约？
2. 若不满足，最小根因是什么？
3. Agent 下一步只需做什么？

不要让 Agent 为了修一个简单问题，先理解多层派生状态、多个互相重复的 validator、隐藏 fallback 或跨文件格式暗号。

## Quality Control Is Safety-Critical

Engine 的质量控制代码比普通业务代码更需要简单。质量检查一旦误判、级联或反馈不清，会阻断整条 Agent Flow，并诱发手改 authority、跳 gate、重复重试或错误降级。

质量控制 SHALL 遵循：

- **Direct facts first**：直接读取 Source of Record，不通过 projection 的 projection 推断真相。
- **Strict authority, tolerant presentation**：对 JSON/YAML/schema/receipt/ledger/status 等 authority surface 严格；对 Markdown 空格、展示格式和等价写法宽容。表现层偏好默认是 inspect/advisory，不应轻易成为 blocking rule。
- **Short-circuit cascades**：前置结构缺失时，先报前置根因，不继续制造几十条依赖它的下游 symptom。
- **Smallest actionable root set**：一次返回足以修复的最小根因集；完整细节可留在 durable diagnostic artifact，不把全部级联噪声塞给 Agent。
- **One rule source**：preflight、inspect 和 final gate 应复用同一确定性检查，避免维护多份近似逻辑。
- **Fail clearly**：无法可靠判断时明确失败或标记 unknown，不用长链路猜测出一个看似完整的结论。

每增加一条 blocking rule，都应回答：

> 这条规则保护的是确定性 authority / provenance / required structure，还是仅仅保护一种理想展示格式？

如果只是展示偏好，优先降为 advice、宽容解析或人工语义判断。

## Agent-Friendly Feedback

MD controller 不怕简单问题，怕的是长判断链和模糊反馈。Engine/CLI 输出应让 Agent 不读源码也能继续。

推荐反馈形状：

```text
check: failed
root_cause: finding-index 缺少 required field `hitl2_handoff`
next_action: 补字段后重跑同一个 inspect/gate
```

不推荐：

```text
55 failures
  -> missing field
  -> enum mismatch
  -> synthesis ineligible
  -> handoff mismatch
  -> backing mismatch
  -> downstream count mismatch
```

后者可能都“逻辑正确”，但对 Agent Flow 不可靠。前置根因未修前，下游判断没有行动价值。

## Complexity Budget

新增机制前先尝试以下顺序：

1. 删除不必要的 blocking rule。
2. 把表现层规则降为 advisory 或宽容解析。
3. 复用已有 validator / gate rule。
4. 把反馈移动到 Agent 实际做决定的 checkpoint。
5. 只有前四步都不足时，才新增状态、CLI、schema 或恢复路径。

新增一层逻辑应至少删除一份重复逻辑、一个历史特例或一条 Agent 必须记忆的隐含规则。只增加层、不减少复杂度的方案默认不通过设计评审。

## Anti-Patterns

- 为一个具体故障建设通用 controller、watcher、daemon 或自动修复框架。
- 同一契约在 phase MD、inspect CLI、gate、helper 中各写一份近似 validator。
- 为了“首过完美”叠加多层 auto-normalize、fallback、retry 和推断状态。
- 用精确 regex 阻塞语义正确的 Markdown，只因为空格、编号或等价展示不同。
- 一个前置字段缺失，却继续运行所有依赖该字段的规则并返回级联失败墙。
- Engine 给出“哪里都可能有问题”的长报告，却不给一个直接下一动作。
- 用 mock、手写结果或 make-believe playbook 证明 Agent/检索/外部能力可用。

## Design Review Checklist

OpenSpec proposal/design/tasks 在进入 apply 前应回答：

1. 这个 checkpoint 最简单的问题是什么？
2. 它读取哪个直接 Source of Record？
3. 是否已有 validator 可以复用？
4. 哪些规则是真 blocker，哪些只是 presentation preference？
5. 一个前置失败会不会制造大量下游 symptom？
6. Agent 能否只看一次输出就知道下一步？
7. 新方案增加了多少状态、分支、surface 和恢复路径？删掉了什么？
8. 测试是否走真实 Engine/Agent path，而不是伪造结果？

如果这些问题无法用短句回答，先缩小 change、删除规则或拆掉派生链，再考虑实现。

## Boundary

简单不等于放松确定性底线：

- schema、状态转换、receipt、ledger、trace 和 provenance 仍然 fail closed；
- Agent 语义判断仍由 Agent 负责；
- Markdown 仍控制 Agent Flow；
- Engine 仍只控制确定性 checkpoint。

本原则要求的是减少不必要的控制复杂度，不是把 authority 交回 Agent，也不是跳过真实验证。
