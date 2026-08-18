# Rerun 反馈的 carry-through：现状、弱点与改进设计

> 2026-08-19 | 来源：`dpt_rb_enterprise-ai-transformation-six-cases` rerun_count 1（org-roles 补充）实战观察
> 这是分析稿（scratch），不是 bug 卡，也不是 OpenSpec change。供设计讨论用。

## 问题

用户在看完 Final 后发起 rerun，把新的研究要求告诉 Agent。问题：这个"用户反馈/要求"到底落在哪个 durable 表面？第二轮 wave0/wave1/wave2 的每个 node 是否都能清楚看到"为什么要做这轮"？是只在 chat 上下文里，还是有结构性支持？

## 现状：反馈落在哪（已验证）

| 表面 | 内容 | 谁读 |
|---|---|---|
| `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale` | rerun 决定本身（`post_final_rerun` apply 写入的 reason + requested_scope；`user_decision: rerun`；`rerun_count: 1`） | HITL2/rerun 节点、决策审计 |
| `seed_topics/{slug}.md## 本轮重跑方向` | 每个受影响 topic 的方向段：`rerun_count` / `action: supplement` / `new_search_dimensions` / `adjusted_depth` / `search_guardrails` / `rationale_excerpt`（含"用户要求：…"） | wave0/wave1/wave2 的 §3.0 direction resolver 会读（比对 rerun_count 与 profile 当前值才激活 supplement intent） |
| queue task card `action` | Agent 把方向转写成 delegated 任务指令（本次 wave0 source-intake card 带 org-roles scope） | 被 claim 的 sub-agent 读 task.md |

结论：**不是只在 chat 上下文**。seed 的 `## 本轮重跑方向` 是主要"为什么"载体，wave0/1/2 节点按设计会读。本次实际验证：kavak seed 方向段含 `rationale_excerpt: 用户要求：对每家公司，CEO/HR/CTO/员工等组织多角色对 AI 采用的观点，分部门越多越好`。

## 弱点（用户直觉对）

1. **保真链依赖 Agent 逐环转写，非结构性强制。** 用户原话 → profile rationale（Agent 转述）→ seed direction（Agent 转述）→ task card action（Agent 再转述）。没有一处强制引用用户**逐字原话**。`phase-rerun.md` 设计上允许"用户重点原话（逐字保留）"，但 `post_final_rerun` request schema 没有结构化的 verbatim-quote 字段；Agent 的 reason 是转述，不是原话。
2. **Wave2 re-echo 最弱。** wave0/wave1 读 seed 方向；wave2 synthesis 主要读 evidence-summary/question-list/finding-index，"为什么这轮 org-roles"到 wave2 时容易淡化。除非 Phase Agent 主动重读受影响 seed 的方向段，并把它显式写进 finding-index / cross-topic-ledger / synthesis（本轮我需要在 wave2 主动做这件事）。
3. **无单一"用户需求"表面。** 分散在 profile + N 个 seed + 各 task card；node 是否读到取决于阶段节点是否引用 + Agent 是否执行。没有"每个 node 强制回显 why"的机制。
4. **跨 topic 一致性。** 同一用户意图被 6 个 seed 各写一份 direction，内容靠 Agent 保持同步；若某 seed 漏写/写偏，该 topic 的 supplement 意图就丢。

## 改进建议（供设计讨论，未实现）

### A. 让 seed 方向段成为强制"why"回显点
- wave0/wave1/wave2 的 Execution Brief / task brief 显式要求：claim 前重读受影响 seed 的 `## 本轮重跑方向`，把 `rationale_excerpt` 逐字带进 task card `action`（"本轮 rerun 方向（用户要求）：<excerpt>"），并写入 sub-agent 的 task.md。
- 好处：保真链最后一段（task card）也强制携带用户原话，不依赖 Agent 记忆。

### B. Wave2 显式消费方向
- phase-wave2 增加要求：synthesis 前读受影响 topic 的 seed `## 本轮重跑方向`；`finding-index.yaml` 的 `created_in_rerun_count` 已绑定轮次，但还应让 synthesis_eligibility / ledger 回显"本轮用户要求"（例如一个 `rerun_focus` 摘要字段或在 ledger 记 `Rationale Excerpt` 行）。
- 好处：wave2 不会淡化"为什么"。

### C. post_final_rerun request 增加 verbatim-quote 结构
- `operate-post-final-recovery` 的 `reason` 允许/要求结构化 `{ user_verbatim: "<用户原话>", agent_understanding: "<Agent 理解>" }`，apply 时写入 profile rationale；seed direction 的 `rationale_excerpt` 从 `user_verbatim` 派生。
- 好处：用户原话从头到尾逐字保留，不再靠 Agent 转述。

### D. 单一来源 + 派生
- 让 seed 方向段从 profile rationale 派生（`set_rerun_direction` 的 `rationale_excerpt` 校验必须非空且与 profile rationale 一致），避免 6 份 seed 各自写偏。
- 好处：跨 topic 一致性。

### E. 测试
- 确定性测试：给定一个带 verbatim 原话的 `post_final_rerun` request → apply → set_rerun_direction → 断言每个受影响 seed 的 `rationale_excerpt` 含原话 → wave1 task card `action` 含原话 → wave2 finding-index/ledger 含 rerun_focus。

## 关联

- `phase-rerun.md`（`## 本轮重跑方向` 写入、rerun_count 语义）
- `phase-wave1.md` / `phase-wave2.md` §3.0（direction resolver 消费）
- `operate-post-final-recovery.mjs`（post_final_rerun reason schema）
- `operate-topic-state.mjs`（`set_rerun_direction` writer，rationale_excerpt 字段）
- 本 run 实账：`dpt_rb_enterprise-ai-transformation-six-cases`（rerun_count 1，org-roles supplement）
