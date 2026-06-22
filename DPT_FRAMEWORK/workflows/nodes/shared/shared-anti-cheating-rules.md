---
node_type: shared
id: shared-anti-cheating-rules
shared_scope: rules
authority: guidance-only
requires: []
suggested_context: []
---

# Shared: Anti-Cheating Rules

## Purpose

定义 Workflow Foundation 运行中 Agent 绝对不能做的事。这些规则是跨 phase 共享的底线约束。违反这些规则的具体后果由 gate CLI、schema validation 和 trace audit 强制执行。

## Prohibitions

### 1. 禁止伪造 trace event、receipt、或 gate result

**正确替代**：运行真实的 Engine/Agent 路径来产生这些 artifact。`rb_trace.jsonl` 只能由 gate CLI 的真实执行写入，`_trace.jsonl` 只能由 playbook thin driver 基于真实 CLI result 写入。

### 2. 禁止在 gate 未 pass 时修改 control files 冒充 pass

**正确替代**：gate fail → 读取 inspect/advice → repair → rerun gate。绝对不要直接改 `rb_status.json` 的 `current_gate` 来跳过某个 gate，也不要手写 `rb_trace.jsonl` 的 pass entry。

### 3. 禁止跳过 retry limit 或 escalation

**正确替代**：遵守 3 次 retry limit；no-progress 或超限后 escalation→block。不能无限循环 repair，也不能在 escalation 条件触发后继续假装一切正常。

### 4. 禁止把 chat memory 当 runtime state

**正确替代**：需要当前 run 状态时，从 active bundle 的 control files（`rb_status.json`、`rb_profile.yaml`、`rb_trace.jsonl` 等）reload。不要依赖"上次对话里说过"作为状态依据。

### 5. 禁止在 pre-research 阶段声称 evidence coverage 或 synthesis quality

**正确替代**：instantiation、HITL1、setup 三个 phase 只做 bundle 创建、用户输入收集、结构一致性检查。不要在这个阶段讨论"已经覆盖了多少 evidence"或"综合质量如何"——那属于 wave0/1/2。

### 6. 禁止在 `stop: yes` phase 不等用户输入就继续

**正确替代**：`phase-hitl1.md` 的 `stop: yes` 意味着 Agent MUST 等待用户回答后再运行 gate。不要在用户未回答时填入 placeholder 数据然后继续。

### 7. 禁止伪造用户 HITL 答案

**正确替代**：HITL1 回答必须来自用户。不要编造 `research_profile`、`root_must_answer_set` 等内容来让 gate pass。

### 8. 禁止在 final phase 从 chat memory 生成报告

**正确替代**：final report MUST 从 verified bundle state 生成——读取 Wave0/1/2 artifacts、`rb_profile.yaml`、`rb_status.json`、`rb_trace.jsonl` 等持久化文件。不能重新凭聊天记忆或 LLM 内部知识编造内容。报告中的声明必须引用 bundle 中真实存在的 source artifact。

### 9. 禁止在 final phase 暗藏 hidden next、hidden gate 或隐式循环

**正确替代**：final 是 terminal node（`gate: null`，`transitions.chain.json` 无 final 条目）。Post-delivery 用户反馈走 HITL2 `rerun` 路径——Agent 从 `seed-topics` 重新跑，profile 已有新反馈。不能在 final node 里塞 hidden loop 让 Agent 原地转圈。

### 10. 禁止 readiness gate 做语义质量判断

**正确替代**：readiness gate 的 rule set 仅限于 deterministic structural check——`file_exists`、`dir_non_empty`、`yaml_parse`、`jsonl_parse`、`trace_has_events`、`status_value`。不能因为"synthesis 写得不够好"、"evidence 不够强"、"argument 不够严密"而 fail readiness。这些语义质量判断属于 HITL2 人类审查范畴。

### 11. 禁止 Agent 替用户填写 HITL2 decision

**正确替代**：`user_decision` 和 `rationale` 必须来自真实用户输入。Agent 可以产出 decision brief 帮助用户做决策，但不能在用户未回答时填入 placeholder decision（如选 `proceed_to_readiness` 作为默认值）。

### 12. 禁止把 setup pass 当成 readiness pass

**正确替代**：`setup-ready` gate pass 只确认 structural consistency（文件存在、schema 合法、basename 一致）。它不意味着研究质量过关或可以交付最终报告。`readiness-passed` 是另一个 gate，在 wave0/1/2 + HITL2 之后。

## Authority Boundary

- **此 shared node 是 guidance**。违反这些规则的具体后果由 gate CLI、schema validation 和 trace audit 强制执行。
- **Phase node 的 Anti-Cheating Rules section** 应包含 phase-specific 禁令并 reference 此 shared node。
- **如果某 phase node 的 anti-cheating 规则与此 shared node 冲突**，以此 shared node 为准（它是跨 phase 的底线）。
