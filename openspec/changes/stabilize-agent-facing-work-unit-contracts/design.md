## Context

`dpt_rb_martin-fowler-ai-sdlc-retreats` 暴露的是 Agent-facing contract 漂移：Agent 先读到的 generated `result.schema.json`、phase task-card 示例，与 submit validator / queue schema 后验收的真实合同不一致。结果是一个按文档或 generated schema 诚实执行的 Agent，仍可能第一次 submit 或 enqueue 就失败。

当前实现里，`DPT_FRAMEWORK/engine/work-unit-envelope.mjs` 生成的 `result.schema.json` 对 `output_files[]`、`source_claims[]` 过宽；而 `DPT_FRAMEWORK/engine/work-unit-validation.mjs` 和 `DPT_FRAMEWORK/schema/contracts/work-unit.mjs` 在 submit 时按严格 shape、kind output contract、cache/source-claim policy 验收。另一个 drift 点在 `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`：seed-topic task-card 模板仍使用 retired queue demand `work_id`，但 accepted queue contract 已将 queue demand identity 固定为 `queue_item_id`，`work_id` 只属于 Engine-allocated delegated attempt。

本 change 是 `_backlog/plans/martin-fowler-run-bugfix-change-split.md` 的第一个 OpenSpec change，只处理 Agent 提交前可见的 work-unit / queue contract surface。gate selector、return-map reference policy、submitted ledger 历史坏行修补，留给第二个 gate alignment change 或后续 change。

## Goals / Non-Goals

**Goals:**

1. 让 generated work-unit `result.schema.json` 成为 submit-time validation 的 truthful Agent-facing projection。
2. 让 unsupported fields 从 generated schema 中消失，而不是以 optional 字段误导 Agent。
3. 让 `source_claims[]` 和 `output_files[]` 的 JSON Schema shape 与 Zod / submit helper 的可接受字段保持一致。
4. 让 `output_files[].role` 由当前 work-unit `output_contract.output_files.allowed_roles` 约束。
5. 修正 seed-topic phase task-card/result 示例中的 queue demand identity，使用 `queue_item_id`。
6. 扩展 static hygiene，使 phase Markdown task-card/result examples 也能被扫描到 queue identity drift。
7. 增加回归测试证明 wave0/wave1 generated schema 与 submit validator 对允许/禁止字段、extra keys、role enum 的判断一致。
8. 在 implementation 阶段发布为 framework `v0.12`，更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md`。

**Non-Goals:**

- 不修改 gate selector 语义。
- 不修改 seed-topic return-map reference policy。
- 不修改 depth-review reference navigation。
- 不为旧的 bad submitted ledger rows 做 in-place amend。
- 不新增 npm dependency，不使用 Python。
- 不把 Agent 的语义判断搬进 JS；这里只修 Engine-owned schema / static checks 和 Agent-facing Markdown contract。

## Decisions

### Decision 1: 在本地 JS 中手写窄 JSON Schema emitter

实现阶段 SHALL 在 framework 内添加或整理小型本地 helper，从 work-unit manifest / kind output contract 生成 JSON Schema 片段。不得引入 `zod-to-json-schema` 或其他依赖。

理由：项目依赖边界固定，且这里需要的是一个非常小的 projection，不是通用 schema 转换器。手写 emitter 更容易把 unsupported fields omit 掉，并清楚表达 submit contract 中真正需要 Agent 看见的 shape。

Alternative considered: 继续从宽泛 object schema 出发，靠 task prose 解释字段。拒绝，因为这正是 BUG-066 的失败模式：Agent 看到机器可读 schema 后会合理地信任它。

### Decision 2: Generated result schema 跟随 `manifest.output_contract`

`result.schema.json` 的基础 identity fields SHALL const-bind `work_id`、`queue_item_id`、`kind`、`receipt_nonce`。`output_files[]`、`source_claims[]`、`accepted_source_urls[]` 是否出现，以及 roles 是否可用，均 SHALL 来自当前 work-unit `output_contract`。

当 `source_claims.allowed !== true` 时，generated schema SHALL omit `source_claims` 和 `accepted_source_urls`。这两个字段不应作为 optional 出现，因为 submit validator 会在非允许 contract 下拒绝非空 source claims / accepted URLs。

Alternative considered: 保留字段但加 prose 说明“仅部分 kind 可用”。拒绝，因为 JSON Schema 是 Agent 面前更强的结构信号；字段存在会鼓励填入。

### Decision 3: Source claim item schema 手工镜像 submit-accepted shape

允许 source claims 的 work unit SHALL 生成严格 item schema：

- `url`
- `source_ref`
- `acceptance_status`
- `is_new_vs_wave0`
- `cache_trail_refs`
- nullable optional `degraded_capture_ref`

item schema SHALL set `additionalProperties: false`。`accepted_source_urls[]` SHALL only appear when `source_claims` are allowed.

理由：`WorkUnitSourceClaimSchema` 已经是 strict Zod object；generated schema 不能比它更宽，否则 extra field 会在 Agent 侧看似合法、submit 侧失败。

### Decision 4: Output file item schema 约束 role enum

`output_files[]` item schema SHALL expose exact submit-visible fields:

- `path`
- `role`
- optional `source_url`
- optional `source_slug`

item schema SHALL set `additionalProperties: false`。`role` SHALL use enum from `output_contract.output_files.allowed_roles` for the current work-unit kind. 如果 contract 没有提供 roles，implementation SHALL fail closed or use the existing validator-safe fallback explicitly covered by tests; it SHALL NOT silently emit unconstrained object items.

Alternative considered: 只检查 `path` exists，让 role 留给 submit validator。拒绝，因为 BUG-069 的非 gate 部分就是 Agent 无法仅靠 contract surface 写出第一版可提交结果。

### Decision 5: Phase Markdown hygiene 覆盖 queue task-card/result examples

Implementation SHALL update existing static hygiene surface, currently `validate-work-unit-hygiene.mjs` or the closest active template validator, to scan phase Markdown examples that define queue demand task cards or queue result examples. The check SHALL fail when a queue demand task-card uses `work_id` instead of `queue_item_id`.

The check SHALL still allow `work_id` in work-unit-specific contexts: generated work-unit task/result docs, `operate-work-unit submit` examples, delegated attempt receipts, and prose explicitly describing Engine-allocated attempts.

Alternative considered: 修正 `phase-seed-topics.md` 文本但不加 hygiene。拒绝，因为这个项目已经多次遭遇 terminology / contract patch drift；没有 static guard 会再次回归。

### Decision 6: Regression tests compare both sides of the contract

Tests SHALL cover generated schema and submit validator behavior together. At minimum:

- wave0 source-intake schema omits `source_claims` / `accepted_source_urls` and submit rejects non-empty source claims for that contract.
- wave1 topic-deepening schema includes strict source claim items and submit rejects extra source-claim keys.
- output file roles in generated schema match the kind output contract allowed roles.
- phase template hygiene catches retired queue demand `work_id` in task-card/result examples.

These tests belong under root `tests/`, not under `DPT_FRAMEWORK/`.

## Risks / Trade-offs

- Manual JSON Schema helper can drift from Zod again -> Mitigation: add focused tests that exercise both generated schema and submit validator expectations for the same work-unit kind contracts.
- Hygiene scan can produce false positives around legitimate work-unit `work_id` examples -> Mitigation: scope the queue identity check to phase Markdown queue task-card/result examples and known producer-rule examples, while explicitly allowing work-unit submit/receipt contexts.
- Some JSON Schema validators may not be available in repo tests -> Mitigation: tests can inspect generated schema shape directly and pair it with submit validator acceptance/rejection tests; no new dependency is required.
- Omitted unsupported fields may surprise Agents that previously copied the broad schema -> Mitigation: generated task prose already names kind-specific output contract; schema omission is the correct machine-readable signal.

## Migration Plan

1. Implement the schema emitter helper around the current work-unit manifest/output contract surfaces.
2. Update `result.schema.json` generation for wave0, wave1, and wave2 work-unit kinds.
3. Update `phase-seed-topics.md` task-card/result examples from `work_id` to `queue_item_id`.
4. Extend static hygiene to scan phase Markdown queue examples for retired queue identity fields.
5. Add focused regression tests under `tests/`.
6. Update root `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` version banner for `v0.12`.
7. Run focused tests, governance checks, and OpenSpec validation before archive/apply completion.

Rollback is code-level revert of the implementation change before archive. No runtime bundle migration is required.

## Open Questions

None for this change. If implementation discovers a gate pass/fail mismatch, it SHALL be recorded under the second planned change `align-gate-contracts-and-reference-navigation` unless the mismatch directly blocks the Agent-facing work-unit submit contract covered here.
