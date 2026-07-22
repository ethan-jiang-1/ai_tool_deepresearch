## Context

现有 `depth-review.yaml` 是 Wave1 Phase Agent 的直接 review surface，现有 Wave2 `finding-index.yaml` 已拥有 finding、decision、gap-status 与 evidence disposition。两者之间没有可消费的、不可依赖 mutable prose 的目标交接事实。`question-list.md` 是委派 Agent 的推理输入，不应升级为第二个 parent authority。

本设计 paired-read `evolution-simple-reliable-control` 与 `evolution-helper-oriented-agent`：Agent 自主完成语义判断与普通修复；Engine 不评价证据“是否足够”，只保护显式声明的 identity、receipt、handoff 与 coverage。用户只在既有 HITL1/HITL2 语义边界作决定。

## Goals / Non-Goals

**Goals:**

- 每个当前 Wave1 review 中显式 carried 的目标，在其合法进入的 Wave2 中都有一个既有 finding disposition 或最小可修复失败。
- Gate receipt 冻结 Wave1-time 的 selected target identity；Wave2 不回读或重新解释 mutable review。
- identifier-only layout change 在 UID 与 canonical intent binding 不变时可重用 review；intent 变化必须回到新的 Wave1 Gate。
- 复用现有 Gate、trace、handoff、finding-index 和 repair loop。

**Non-Goals:**

- 不让 Engine 判断语义充分性、来源质量或探索/利用策略。
- 不为每个 `question-list.md` 句子建立任务、状态或版本。
- 不增加队列字段、work-unit result/receipt 字段、第二 finding index、second checkpoint、自动重试或新的 HITL。
- 不为旧 Wave1 handoff 追溯生成 receipt；没有 receipt contract version 的历史 handoff 保持 legacy-compatible，不能声称满足新 closure。

## Decisions

### 1. 一个 Phase-owned declaration 是唯一 parent

`depth-review.yaml` 增加明确的 `carried_targets` projection。它必须存在，允许空数组；每个条目包含 declaration-local 唯一 `target_id` 与 Agent-authored normalized target text。只有被放入该数组的目标进入 closure contract。缺字段、重复 ID、空文本或坏 shape 是 Wave1 Gate 的直接失败，不能解释成空集合。

选择它而非 `question-list.md`，因为前者已有 Phase writer 与 Gate repair coordinate。选择不把全部问题列表结构化，避免把模型推理 prose 变成第二个 parser/controller。

### 2. receipt 使用 canonical identity 与最小 revision

共享 selector 从 canonical topic-layout/registry 获取 `topic_uid`，并对 title、must-answer、scope role、dependencies 生成稳定 intent binding。每个 selected target 的 revision 仅哈希正规化的 `{target_id, target_text}`；receipt 还带 contract version 与 ordered target set digest。这个 binding 不判断 intent 是否合理，只保证 Wave2 不拿旧 slug、同名 target 或已经改意图的 review 覆盖当前目标。

identifier-only layout change 可复用单一 UID-bound review；`update_intent` 或 title 导致 binding 变化时，selector/Gate 要求刷新 Wave1 review。替代的 slug alias map 或 output-byte ledger 被拒绝：前者是第二 identity system，后者超出本闭环所需事实。

### 3. 只由 Wave1 Gate writer 投影 receipt

Wave1 evaluator 在 Gate pass 前给 result 的专用 handoff-receipt input；共享 `writeGateAttempt()` 只在 Wave1 成功 routed attempt 中验证并投影 `carried_target_receipt`。不得把泛化的 `extraCheck`、diagnostic 或 Agent prose 扩散进 trace。投影失败使这次 Wave1 pass 不可路由，并回到同一 Gate；不会写第二 trace/checkpoint authority。

Wave2 通过既有 `gate_attempt` + route-bound `load_complete` lineage 选择这一条 receipt，不能扫描“最新 trace”或重新读取 review。历史 selected handoff 无 receipt version 时走当前 legacy path；当前 writer 生成但缺失/畸形的 receipt 是 authority-integrity root cause。

### 4. finding binding 只扩展既有 disposition route

finding 可选 `wave1_target_bindings[]`。每个 binding 含 receipt digest、topic UID、intent binding、target ID 与 target revision；它不复用 `origin_refs[]`。一条 finding 可绑定多个 targets，一个 target 可有多个 findings；coverage 只要求至少一个 binding 对应既有合法 decision/gap-status route。`defer_hitl2`、`requires_internal_data`、`record_only` 仍按既有 finding 字段生效。

缺 binding 只报告 receipt 中最小未覆盖集合，并指向 `finding-index.yaml` 后重跑现有 Wave2 inspect/Gate。它不生成 target-level status、semantic score 或 hidden reconciliation branch。

### 5. 复杂度预算与 ownership

新增的持久事实只有 Gate trace receipt 和 finding binding：两者都无法从 mutable review 或 finding prose 可靠重建，并分别服务 phase handoff 与 Wave2 coverage。它们删除“从 question prose 猜 target”和“用同 topic/artifact ref 推断已处理”两条隐含路径。没有新 CLI、lifecycle state、recovery command 或 retry tree。

## Risks / Trade-offs

- [Agent 未声明一个本应 carry 的目标] -> Engine 不假装发现它；这是 Agent judgment 的边界，现有 HITL2/limitation 仍可处理。
- [intent/layout 变更后旧 review 被误用] -> UID + intent binding 在 Wave1 Gate 先失败，要求刷新 review。
- [trace receipt 丢失] -> handoff 不可消费，重跑同一 Wave1 Gate；不得手写 trace。
- [finding 只提及同 topic 或 origin artifact] -> 不计 coverage；需要显式 receipt-target binding。
- [旧 bundle] -> 只在其 routed Wave1 handoff 没有 contract version 时保留 legacy behavior；新 Gate 绝不把坏/缺 receipt 降级为 legacy。

## Migration Plan

1. 加入 pure selector/normalizer 与 Wave1 review/finding binding evaluator，先保留无 receipt 的旧 Wave1-to-Wave2 handoff。
2. 更新 Wave1/Wave2 Gate writer、definition 与 Markdown producers；当前 Wave1 pass 必须写 contract-versioned receipt。
3. 用 temporary bundle 验证 empty declaration、nonempty coverage、missing binding、intent drift、layout-only reuse 与 legacy handoff。
4. 发布 `v0.42`。回滚仅回退 framework；已写 trace/binding 是 append-only历史，旧代码不会把它们解释为新 authority。

## Open Questions

无开放语义问题。apply 前仅确认现有 Gate result 到 `writeGateAttempt()` 的最小专用 receipt input 形状，以及 finding-index current schema 的精确 field 命名；不得把这两个确认扩大为通用 trace metadata 或 artifact version 系统。
