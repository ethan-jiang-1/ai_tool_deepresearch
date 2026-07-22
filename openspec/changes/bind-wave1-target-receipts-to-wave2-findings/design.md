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

每个 `depth-review.yaml` 增加明确的 `carried_targets` projection。它必须存在，允许空数组；每个条目严格为 `{ target_id, target_text }`，其中 `target_id` 匹配 `^[A-Za-z0-9][A-Za-z0-9._-]*$` 且 declaration-local 唯一，`target_text` 是经 NFC/LF/trim 后非空的 YAML string scalar。只有被放入该数组的目标进入 closure contract。缺字段、重复 ID、空文本或坏 shape 是 Wave1 Gate 的直接失败，不能解释成空集合。

`carried_targets` 是语义交接，不改变既有 `decision: accept` 对 submitted evidence、source floor、cache mapping、depth dimensions 与 profile checks 的结构完成含义。一个 topic 可以在这些直接事实已满足时把跨 topic、部分开放或受限目标交给 Wave2；它不能用 carry-forward 降低 Wave1 Gate 的原有门槛。

选择它而非 `question-list.md`，因为前者已有 Phase writer 与 Gate repair coordinate。选择不把全部问题列表结构化，避免把模型推理 prose 变成第二个 parser/controller。

### 2. receipt 使用 canonical identity 与最小 revision

共享 selector 从 canonical topic-layout/registry 获取 `topic_uid`，并对按 registry 保存顺序的 title、must-answer、scope role、dependencies 生成 `intent_sha256`。每个 selected target 的 revision 是经 NFC、LF 和 trim 正规化的 `{target_id, target_text}` 的 `sha256`。Wave1 Gate 对每个 canonical Topic 只选一个 review，将所有 selected targets 按 `(topic_uid, target_id)` 严格排序，生成唯一 `carried_target_receipt: { contract_version: "wave1-carried-targets/v1", receipt_sha256, targets[] }`；每个 `(topic_uid, target_id)` 只能出现一次。所有 hash 都是 64 位小写 hex，canonical JSON 的 object key 顺序即此处列出顺序，数组保持上述 registry/target 的既定顺序；`receipt_sha256` 是不含自身字段的 canonical JSON `{contract_version,targets}` 的 `sha256`。每个 receipt target 含 `topic_uid`、`intent_sha256`、`target_id`、`target_revision`。任一 review 不可选或声明不合法都会阻断整个 Gate，不产生 partial receipt。

identifier-only layout change 可复用单一 UID-bound review；`update_intent` 或 title 导致 binding 变化时，selector/Gate 要求刷新 Wave1 review。替代的 slug alias map 或 output-byte ledger 被拒绝：前者是第二 identity system，后者超出本闭环所需事实。

### 3. 只由 Wave1 Gate writer 投影 receipt

Wave1 evaluator 将已验证 receipt 作为 `writeGateAttempt(bundlePath, result, { strictTrace: true, carriedTargetReceipt })` 的专用 options input 交给 shared writer；writer 只在 Wave1 成功 routed attempt 中验证并投影 `carried_target_receipt`。不得把泛化的 `extraCheck`、diagnostic 或 Agent prose 扩散进 trace。投影失败使这次 Wave1 pass 不可路由，并回到同一 Gate；不会写第二 trace/checkpoint authority。

Wave1 CLI 的 strict persistence wrapper 必须将该 failure 转换为一次 failed Gate envelope，并阻止外层继续 emit 原始 passed result。它可保留既有共享失败 audit 路径，但不允许在同一 invocation 产生矛盾 stdout 或可消费 passed handoff。

Wave2 通过既有 `gate_attempt` + route-bound `load_complete` lineage 选择这一条 receipt，不能扫描“最新 trace”或重新读取 review。对于 versioned receipt，它先将每个 `(topic_uid, intent_sha256)` 与当前 canonical registry 的同一派生 binding 对照；UID 缺失或 intent 不等是上游 parent-integrity root cause，必须通过既有合法 Wave1 handoff path 刷新，不能用 Wave2 finding binding 覆盖旧 intent。receipt 内的正向 contract version 是唯一兼容判别：历史 selected handoff 完全没有 receipt 时走当前 legacy path；trace 已声明该 version 但 receipt 缺失、畸形或不匹配时才是 authority-integrity root cause。系统不以部署时间、文件 mtime 或第二状态猜测“current”。

### 4. finding binding 只扩展既有 disposition route

finding 可选 `wave1_target_bindings[]`。每个 binding 严格为 `{ receipt_sha256, topic_uid, intent_sha256, target_id, target_revision }`，不复用 `origin_refs[]`。一条 finding 可绑定多个 targets，一个 target 可有多个 findings；coverage 只要求至少一个 binding 对应既有合法 decision/gap-status route。`defer_hitl2`、`requires_internal_data`、`record_only` 仍按既有 finding 字段生效。

缺 binding 只报告 receipt 中最小未覆盖集合，并指向 `finding-index.yaml` 后重跑现有 Wave2 inspect/Gate。它不生成 target-level status、semantic score 或 hidden reconciliation branch。

### 5. 复杂度预算与 ownership

新增的持久事实只有 Gate trace receipt 和 finding binding：两者都无法从 mutable review 或 finding prose 可靠重建，并分别服务 phase handoff 与 Wave2 coverage。它们删除“从 question prose 猜 target”和“用同 topic/artifact ref 推断已处理”两条隐含路径。没有新 CLI、lifecycle state、recovery command 或 retry tree。

## Risks / Trade-offs

- [Agent 未声明一个本应 carry 的目标] -> Engine 不假装发现它；这是 Agent judgment 的边界，现有 HITL2/limitation 仍可处理。
- [intent/layout 变更后旧 review 被误用] -> UID + intent binding 在 Wave1 Gate 先失败，要求刷新 review。
- [Wave1 handoff 后 canonical intent 漂移] -> Wave2 先报告 receipt/current-registry parent mismatch，要求通过既有合法 Wave1 handoff 刷新；不得将旧 target 绑定到新的 finding。
- [trace receipt 丢失] -> handoff 不可消费，重跑同一 Wave1 Gate；不得手写 trace。
- [finding 只提及同 topic 或 origin artifact] -> 不计 coverage；需要显式 receipt-target binding。
- [旧 bundle] -> 只在其 routed Wave1 handoff 没有 contract version 时保留 legacy behavior；新 Gate 绝不把坏/缺 receipt 降级为 legacy。

## Migration Plan

1. 加入 pure selector/normalizer 与 Wave1 review/finding binding evaluator，先保留无 receipt 的旧 Wave1-to-Wave2 handoff。
2. 更新 Wave1/Wave2 Gate writer、definition 与 Markdown producers；当前 Wave1 pass 必须写 contract-versioned receipt。
3. 用 temporary bundle 验证 empty declaration、nonempty coverage、missing binding、intent drift、layout-only reuse 与 legacy handoff。
4. 发布 `v0.42`。回滚仅回退 framework；已写 trace/binding 是 append-only历史，旧代码不会把它们解释为新 authority。

## Open Questions

无开放语义问题。apply 直接实现已确定的 `writeGateAttempt(..., { carriedTargetReceipt })` seam 和 finding-index fields；不得把它们扩大为通用 trace metadata 或 artifact version 系统。
