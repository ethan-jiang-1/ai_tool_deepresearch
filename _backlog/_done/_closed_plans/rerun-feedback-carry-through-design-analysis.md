# Rerun 反馈的 carry-through：现状观察与设计复核

> 2026-08-19 | 来源：`dpt_rb_enterprise-ai-transformation-six-cases` rerun_count 1（org-roles 补充）实战观察
> 状态：历史分析参考；落地决策与 progress 以 `user-intent-carry-through-implementation-plan.md` 为准。

## 问题与有效观察

用户在 Final 后发起 rerun，系统需要让后续 Wave 知道本轮为什么继续研究，而不能只靠 chat memory。

已验证的 durable 链并非空白：

| 表面 | 角色 |
|---|---|
| `rb_plan.md## Decisions` | 已存在的 append-only、最新在上多轮 revision history；当前尚未被 rerun 流程正式使用 |
| `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale` | 当前 rerun 的 route-bound Agent input；Engine 只判断既有结构/决定，不解释 prose，后续轮次可能覆盖 |
| UID-bound seed `## 本轮重跑方向` | 受影响 Topic 的 round-bound increment projection |
| queue-owned `task_brief` -> work-unit `task.md` | delegated actor 的 attempt-local execution context |
| Wave1 `focus_coverage` | current-round commitment 的 covered/limited process evidence |
| `artifacts/wave2/synthesis.md` | cross-topic、非权威的 reader-facing synthesis projection |

本次实账证明 direction 能保存 topic-local why；真正的缺口是若干消费边仍是 MAY/自觉读取，尤其 Wave0 delegated task 和 Wave2 pure synthesis。

## 对初稿的事实修正

1. Wave0 没有本地 direction resolver；它在自己的 queue filling 中读取 canonical seed/current direction 并创建 `wave0_source_intake` demand。不能把责任归给 seed-topics，也不能假设 seed-topics 已替未来 Wave0 work unit 写好 brief。
2. Sub-agent 最终在 `task.md` 顶部读取的是 work-unit manifest 的 `task_brief`。queue `action` 是 demand 描述，不是最合适的 carry-through interface。
3. post-Final request 虽无结构化 `focus` 字段，但现有 `reason` 已接受 multiline free-form 文本，C5 会将它确定性写入 profile rationale，并在 event 中保留 reason/scope。因此没有新增 verbatim schema 的必要。
4. 多个 Topic 的 direction 应共享同一 source rationale 与 target round，但它们的 topic-local explanation 本来就可能不同；文本逐字相等不是正确的一致性定义。
5. `rb_plan.md` 已经是 run 的 narrative host file，且 `## Decisions` 已明确为 append-only、最新在上；不需要创建新的 intention/feedback 文档。真正缺的是让 rerun 使用这个现成 section。

## 复核后的机制

```text
post-Final reason（既有两段式原话 + 理解）
  -> hitl2.rationale（现有 C5 serializer）
  -> rb_plan.md / Decisions 顶部 revision
       = 本轮 delta + 相对 HITL1 baseline 的累计有效 amendments
  -> affected seed directions（同一 retained atomic apply，round-bound）
  -> Wave0/Wave1 task_brief（source coordinates + bounded local objective）
  -> Wave1 current-round focus_coverage
  -> Wave2 synthesis 的 visible intent coverage
```

- 每个 accepted rerun 在既有 `rb_plan.md## Decisions` 顶部增加一个 immutable revision；旧条目形成多轮打磨痕迹，未接受的对话草稿不记录。
- 正常执行只读 HITL1 controls baseline + Decisions 顶部 revision；旧 entries 仅用于审计。除这个单一 host-file history 外，不向 N 个 seed/task/finding 扇出完整原话。
- `rationale_excerpt` 保留为 topic-local why，不要求逐字复制 rationale。
- delegated work 使用现有 `task_brief`，指向 assigned seed、可选 controls 原坐标并给出 bounded task objective。
- Wave2 必须消费 matching direction 与 current focus coverage，但不新增 `rerun_focus`、ledger 固定行或 Gate rule。
- Engine 继续只判断 schema、round binding、transaction、submitted backing；Agent 继续判断语义映射。

## 明确撤回的建议

- 撤回 post-final `{ user_verbatim, agent_understanding }` 新 schema。
- 撤回把 user verbatim 逐字复制到每个 task-card `action`。
- 撤回 direction 与 rationale 的 Engine substring/equality check。
- 撤回 `finding-index.yaml.rerun_focus`、新的 synthesis eligibility 字段或 blocking ledger 格式。
- 撤回新建 `user-intent.md` / feedback-log runtime 文档；复用既有 `rb_plan.md## Decisions`。
- 撤回用 deterministic test 证明 Agent 理解/语义保真；这类 claim 必须走真实 `agent_flow_e2e`。

## 落地

一个 OpenSpec change `strengthen-user-intent-carry-through` 足够。完整 capability impact、verification routing 与 checkbox progress plan 见 `user-intent-carry-through-implementation-plan.md`。
