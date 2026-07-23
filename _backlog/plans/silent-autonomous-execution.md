---
title: Silent autonomous execution
status: research_backlog_with_no_fixed_openspec_change
created: 2026-07-24
revised: 2026-07-24
source_bugs: BUG-099, BUG-103, BUG-104, BUG-106
evidence_bundle: dpt_rb_openspec-large-project-maintenance-patterns
---

# Silent Autonomous Execution

## 1. Decision

`stop: no` 的“静默自主”不能再被表述为一个已收敛、单一的 OpenSpec change。它横跨两个不同的事实层：DPT 可确定性修复的 phase-entry correctness，以及一般 coding-agent/host 是否发起下一 turn 的 actor liveness。两者必须分开研究、分开证明。

本计划是独立的 research backlog，不预先承诺 Change 数量、proposal 名称或 `/opsx:apply` 顺序。它不阻塞 [Wave execution and gate remediation](wave-execution-and-gate-remediation.md) 的三个已收敛 producer/Gate changes。

```text
DPT deterministic means
  legal handoff -> status sync -> bounded truthful entry -> first legal action

host / Agent liveness
  model decision or host-native continuation -> later turn, or terminal stop
```

前者是 DPT 可拥有的 action-readiness contract；后者不是 DPT 可移植 authority。任何未来 proposal 必须先说明自己只修改前者，还是在 host/operator scope 中记录后者，不能把“希望 Agent 不停”伪装成 Engine guarantee。

## 2. Current Facts

### Proven DPT defects

1. `enter-phase` 的 final continuation 曾在 source-gate status synchronization 前宣称 `execute_loaded_node`；正常 Agent-facing interface 因此暴露了错误的动作顺序。
2. 正常 phase entry 反复渲染完整 `requires` closure；被重复注入的控制面过大是可测事实，但不是特定 Agent 停止的充分因果证明。
3. `enter-phase` 的 route-bound `load_complete` 与 `advance-status` 的 `phase_transition` 各有合理的 durable responsibility；问题在 public handoff interface，不是中间 gate window 自身。

### Proven platform boundary

Codex 的 plan update 和 Claude Code 的 task list 都是 tracking surface，不会调度新的 turn。两种平台的 host-native continuation mechanism 也都受 surface、版本、feature 或 operator configuration 约束；它们是 host evidence，不是 DPT state，也不能成为 portable bundle contract。

### Still unproven

- 哪一项 entry-surface 因素、模型状态或上下文压力导致某次 Agent stop。
- 完成 direct handoff 后，一般 Agent 是否会在同一 turn 或后续 host turn 可靠执行首个目标动作。
- 是否存在不越过 Agent/Markdown/Engine boundary 的额外 DPT 帮助，而非重复 prompt、session cache 或 host controller。

## 3. Research Tracks

### A. Candidate deterministic handoff improvement

候选设计是 `make-phase-handoff-entry-direct`：normal caller 只提供 bundle；模块从现有 trace/status authority 推导合法 edge、完成或恢复既有 load/status chain，并只在同步持久化后交付 bounded entry core。

这是候选，不是已批准 change。它必须独立通过 deletion test，且不得引入 workflow walker、chat observer、session registry、goal state、hidden retry tree 或“已读”记忆。

### B. Real-Agent actor evidence

`BUG-099` 与 `BUG-106` 的 closure 只能来自重复、独立的 `agent_flow_e2e` observation：完成合法 handoff 后，Agent 是否实际执行 entry core 的首个目标动作。记录 host/version/mode 与是否开启 host-native continuation，但 host 额外开启一轮本身不是 DPT closure evidence。

### C. Host-means boundary

继续维护 Codex/Claude Code 的一手证据，目的仅是排除错误设计与准确标注实验环境。不得把 `/goal`、`/loop`、Stop hooks、token-budget continuation 或 Codex active goals 复制进 DPT。

## 4. Decision Gates Before A Proposal

只有同时满足以下条件，才为 Track A 创建 OpenSpec proposal：

1. public interface 的 deterministic contract、partial recovery 和 fresh-session entry-core contract 已明确；
2. proposal 的 Done 不承诺 host 发起下一 turn；
3. real-Agent verification 的断言与 deterministic test 的断言明确分层；
4. scope 未吸收 host controller、平台 adapter、chat observation 或其他 Wave/Gate remediation。

若实验只表明 host liveness 不可移植，则保留 BUG-099/106 为 residual actor observations，而不是用 DPT code 制造假的 closure。

## 5. Evidence Index

- [Candidate direct phase-entry root cause](silent-autonomous-execution/candidate-direct-phase-entry-root-cause.md)
- [Coding-agent loop analysis](silent-autonomous-execution/analysis-coding-agent-loop-platform.md)
- [DPT-means boundary](silent-autonomous-execution/analysis-dpt-means-boundary.md)
- [Codex source reference](silent-autonomous-execution/ref_codex-agent-loop-research.md)
- [Claude Code source reference](silent-autonomous-execution/ref_claude-code-agent-loop-research.md)

## 6. Non-Goals

- 以 slash command、goal feature 或 task list 代替 DPT lifecycle contract。
- 为 bundle 添加 idle watcher、host session registry、chat/tool-call observer 或第二 state machine。
- 以静态 Markdown、fixture、console output 或 host-resumed turn 声称 actor compliance。
- 因为研究线暂未收敛而阻塞其余 Wave producer/Gate remediation。
