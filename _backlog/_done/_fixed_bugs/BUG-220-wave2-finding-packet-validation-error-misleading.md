# BUG-220: Wave2 finding 投影包 source_identity 字段错误时，Zod union 回退产生误导性验证信息

> 状态: 活跃 | 优先级: P2 | 严重度: P2 | 更新: 2026-08-12 | source: 真实 run 执行（enterprise-safe-ai-harness wave2）

## Why

Wave2 `wave_projection/apply_seed_projection` 包中，finding 的 `source_identity`
字段名应为 `finding_id`（schema: `ProjectionSourceIdentitySchema`，`kind: 'finding'`
分支严格要求 `finding_id`，正则 `/^W2F-[0-9]{3,}$/`）。当 Agent 错误地写成
`{ kind: 'finding', work_id: 'W2F-001' }` 时，`ProjectionEntrySchema` 的
`source_identity` 校验失败，`ProjectionPacketUpdateSchema` 的
`z.union([ProjectionUpdateSchema, Wave0DeferredProjectionUpdateSchema])`
回退到第二个分支——`Wave0DeferredProjectionUpdateSchema` 要求
`slot_id: literal('wave0_evidence')` 且 `deferred_contribution: object`。

结果：`operate-topic-state apply` 返回的三条 validation_errors 全部指向无关字段：
- `updates[0].slot_id: Value must match the required literal: wave0_evidence`
- `updates[0].deferred_contribution: Expected object; received undefined`
- `updates[0]: Object contains unsupported fields`

真实根因（`source_identity` 应含 `finding_id` 而非 `work_id`）完全没有浮出。
Agent 看到"wave0_evidence"会误以为 wave 字段错误或窗口错误，而非 finding 身份字段
名错误。这是确定性反馈质量缺陷：强模型按 phase 文档（§3.2.3 "entry_id 等于其
exact current-round W2F-* source identity"）构造包时，字段名用 `work_id` 即可稳定触发。

## 复现

1. 构造 Wave2 投影包，`source_identity: {kind: 'finding', work_id: 'W2F-001'}`，
   `entry_id: 'W2F-001'`，`wave: 'wave2'`。
2. `node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle <bundle> --input <packet.json>`
3. 返回 `verdict: blocked`, `reason_code: input_invalid`, `coordinate: updates[0].slot_id`，
   validation_errors 指向 `wave0_evidence` literal。
4. 修正为 `source_identity: {kind: 'finding', finding_id: 'W2F-001'}` 后 apply 才通过。

实测：enterprise-safe-ai-harness 四个 topic 的 wave2_judgment apply 全部命中此
误导错误，首次 apply 失败后才从 schema source 读得 `finding_id` 约定。

## Owner / 最小修复

- Owner: `DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs` 的
  `ProjectionPacketSchema` 校验（或 `operate-topic-state.mjs` 的错误投影层）
- 最小修复方向：让 `apply` 在 entry source_identity 校验失败时，优先报告
  `source_identity` 的判别分支错误（如 finding 缺 `finding_id` / submitted_work
  缺合法 `work_id`），而不是让 union 回退到 wave0 deferred 分支的 slot_id 错误。
  可考虑给 `ProjectionPacketUpdateSchema` 的 union 增加自定义错误选择逻辑，或把
  `slot_id`/`deferred_contribution` 的 fallback 错误抑制为 secondary。
