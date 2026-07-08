## Context

`dpt_rb_martin-fowler-ai-sdlc-retreats` 暴露的是一类 Agent-facing contract 漂移：Agent 先读到的 generated `result.schema.json`、phase task-card 示例、generated task/prompt/output contract，与 Engine 在 queue transition、work-unit submit、ledger append 前后验收的真实合同不一致。结果是一个按文档或 generated schema 诚实执行的 Agent，仍可能第一次 enqueue、non-delegated complete 或 submit 就失败。

本 design 把这类 surface 统称为 **入口合同（entrance contract / Agent-facing pre-submit and pre-transition contract）**。它不是 gate 判断层；它覆盖的是 Agent 产生结构化输入之前能看到、也必须能信任的 contract surface，以及 Engine 在 queue transition / ledger append 前执行的对应 validator。

当前实现里，`DPT_FRAMEWORK/engine/work-unit-envelope.mjs` 生成的 `result.schema.json` 对 `output_files[]`、`source_claims[]` 过宽；而 `DPT_FRAMEWORK/engine/work-unit-validation.mjs` 和 `DPT_FRAMEWORK/schema/contracts/work-unit.mjs` 在 submit 时按严格 shape、kind output contract、cache/source-claim policy 验收。另一个 drift 点在 `DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`：seed-topic task-card 模板和 complete result 示例仍使用 retired queue demand `work_id`，但 accepted queue contract 和 `QueueResultSchema` 已将 queue demand identity 固定为 `queue_item_id`，`work_id` 只属于 Engine-allocated delegated attempt。

入口合同审计还暴露出两个更根的同族风险：

- `output_contract.output_files.allowed_roles` 已经作为 kind contract 展示给 Agent，但 submit validator 当前没有把 role enum 当作 ledger append 前的硬约束执行。这样会产生 schema/contract 广告了限制、submit 放过不匹配输入、gate 后续再失败的错位。
- `output_contract.required_result_fields`、generated JSON Schema required list、`WorkUnitResultSchema` 默认值语义之间没有一个显式一致性检查。比如 contract 声称 `summary` required，但 Zod result parser 会默认它；这种分裂会让 Agent 不知道该信 output contract、generated schema 还是 submit 行为。

本 change 是 `_backlog/plans/martin-fowler-run-bugfix-change-split.md` 的第一个 OpenSpec change，只处理 Agent 提交或 queue transition 前可见的 work-unit / queue contract surface，以及 ledger append 前的 submit enforcement。gate selector、Wave1 required path 的 canonical role policy、return-map reference policy、submitted ledger 历史坏行修补，留给第二个 gate alignment change 或后续 change。

## Goals / Non-Goals

**Goals:**

1. 对入口合同做一次有边界的全面审计：phase queue examples、generated work-unit task/prompt/beacon/schema、kind output/cache contract、submit validator、static hygiene。
2. 让 generated work-unit `result.schema.json` 成为 submit-time validation 的 truthful Agent-facing projection。
3. 让 unsupported fields 从 generated schema 中消失，而不是以 optional 字段误导 Agent。
4. 让 `source_claims[]` 和 `output_files[]` 的 JSON Schema shape 与 Zod / submit helper 的可接受字段保持一致。
5. 让 `output_files[].role` 由当前 work-unit `output_contract.output_files.allowed_roles` 约束。
6. 让 submit validator 执行入口 contract 中广告的 `allowed_roles`，避免非法 role 被 ledger append 后才由 gate 拒绝。
7. 让 `required_result_fields`、generated schema required list、submit default/required 行为同向表达。
8. 修正 seed-topic phase task-card/result 示例中的 queue demand identity，使用 `queue_item_id`。
9. 扩展 static hygiene，使 phase Markdown task-card/result examples 也能被扫描到 queue identity drift。
10. 增加回归测试证明 wave0/wave1/wave2 generated schema 与 submit validator 对允许/禁止字段、extra keys、role enum、identity const、required/default 字段语义的判断一致。
10. 在 implementation 阶段发布为 framework `v0.12`，更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md`。

**Non-Goals:**

- 不修改 gate selector 语义。
- 不修改 Wave1 required output path 到 canonical role 的 gate policy。
- 不修改 seed-topic return-map reference policy。
- 不修改 depth-review reference navigation。
- 不为旧的 bad submitted ledger rows 做 in-place amend。
- 不新增 npm dependency，不使用 Python。
- 不把 Agent 的语义判断搬进 JS；这里只修 Engine-owned schema / static checks 和 Agent-facing Markdown contract。

## Decisions

### Decision 0: 把入口合同链条作为本 change 的审计边界

本 change 的审计边界不是 “BUG-066/067 已知行号”，而是 Agent 在 Engine queue transition 或 work-unit submit 前会相信的所有 entrance contract surface：

```text
phase Markdown queue examples
  -> operate-queue enqueue/claim/complete schemas
  -> operate-work-unit claim generated task/prompt/beacon/schema
  -> work-unit result/output/cache/source-claim submit validators
  -> submitted ledger append preconditions
```

如果一个 mismatch 会让 Agent 写出不能 enqueue、不能 non-delegated complete、不能 submit，或 submit 后立刻携带一个入口合同已能发现的结构错误，它属于本 change。Gate-specific artifact semantics、Wave1 required path-role coverage, reference navigation、depth-review exact-match policy、return-map concrete-reference policy 留给 `align-gate-contracts-and-reference-navigation`。

Alternative considered: 只修 BUG-066/067 的具体文本。拒绝，因为 BUG-069 的根因是入口 contract surfaces 漂移；只修两个症状会继续让下一次 run 踩到同族问题。

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

### Decision 5: Submit validator 必须执行 advertised kind output contract

`output_contract.output_files.allowed_roles` SHALL not be documentation-only. If generated schema advertises a role enum from the kind output contract, submit validation SHALL reject an `output_files[].role` outside that enum before ledger append.

This does not solve gate-specific role/path coverage policy. For example, whether a required Wave1 path must be `evidence_summary` rather than a still-allowed extra `other` remains gate alignment. The entrance fix is narrower: submit must enforce the enum it advertises, and it must not silently accept roles outside the assigned kind output contract.

Alternative considered: leave role enum only in generated schema and trust Agent compliance. Rejected because the Engine is the deterministic checkpoint; an advertised contract that is not enforced is another drift surface.

### Decision 6: Required/default result-field semantics must be reconciled

Implementation SHALL compare the assigned `output_contract.required_result_fields`, generated JSON Schema required list, and `WorkUnitResultSchema` / submit parser behavior. For every field listed as required by the output contract, one of two things must be true:

1. generated schema marks it required and submit rejects its absence; or
2. the output contract no longer labels it required because submit supplies a default.

The change SHALL NOT leave a field required in one Agent-facing surface and silently defaulted in another without an explicit test capturing the intended semantics.

Alternative considered: treat `required_result_fields` as loose prose metadata. Rejected because it is serialized inside the generated work-unit task/beacon contract and read by Agent actors as machine-facing instruction.

### Decision 7: Phase Markdown hygiene 覆盖 queue task-card/result examples

Implementation SHALL update existing static hygiene surface, currently `validate-work-unit-hygiene.mjs` or the closest active template validator, to scan phase Markdown examples that define queue demand task cards or queue result examples. The check SHALL fail when a queue demand task-card or non-delegated queue result example uses `work_id` instead of `queue_item_id`.

The check SHALL still allow `work_id` in work-unit-specific contexts: generated work-unit task/result docs, `operate-work-unit submit` examples, delegated attempt receipts, and prose explicitly describing Engine-allocated attempts.

Alternative considered: 修正 `phase-seed-topics.md` 文本但不加 hygiene。拒绝，因为这个项目已经多次遭遇 terminology / contract patch drift；没有 static guard 会再次回归。

### Decision 8: Regression tests compare both sides of the contract

Tests SHALL cover generated schema and submit validator behavior together. At minimum:

- wave0 source-intake schema omits `source_claims` / `accepted_source_urls` and submit rejects non-empty source claims for that contract.
- wave1 topic-deepening schema includes strict source claim items and submit rejects extra source-claim keys.
- output file roles in generated schema match the kind output contract allowed roles.
- submit rejects an `output_files[].role` outside the kind output contract allowed roles.
- `required_result_fields` and schema/submit required/default behavior are asserted for registered work-unit kinds.
- phase template hygiene catches retired queue demand `work_id` in task-card/result examples.

These tests belong under root `tests/`, not under `DPT_FRAMEWORK/`.

## Risks / Trade-offs

- Manual JSON Schema helper can drift from Zod again -> Mitigation: add focused tests that exercise both generated schema and submit validator expectations for the same work-unit kind contracts.
- Hygiene scan can produce false positives around legitimate work-unit `work_id` examples -> Mitigation: scope the queue identity check to phase Markdown queue task-card/result examples and known producer-rule examples, while explicitly allowing work-unit submit/receipt contexts.
- Some JSON Schema validators may not be available in repo tests -> Mitigation: tests can inspect generated schema shape directly and pair it with submit validator acceptance/rejection tests; no new dependency is required.
- Omitted unsupported fields may surprise Agents that previously copied the broad schema -> Mitigation: generated task prose already names kind-specific output contract; schema omission is the correct machine-readable signal.
- Enforcing allowed role enum in submit can reveal existing fixture drift -> Mitigation: update fixtures to use the same roles the kind contract already advertised; do not broaden submit to preserve invalid historical rows.
- Reconciling `required_result_fields` may require choosing between stricter submit and corrected output contract metadata -> Mitigation: prefer the existing submit behavior only when tests prove the default is intentional and Agent-facing contract text no longer calls the field required.
- Scope can slide into the second gate-alignment change -> Mitigation: record gate-only findings separately and only fix mismatches that affect enqueue, non-delegated complete, submit, or ledger append preconditions.

## Migration Plan

1. Perform the entrance-contract audit and record any extra entrance drift found during apply in the task evidence.
2. Implement the schema emitter helper around the current work-unit manifest/output contract surfaces.
3. Update `result.schema.json` generation for wave0, wave1, and wave2 work-unit kinds.
4. Enforce `output_contract.output_files.allowed_roles` during submit before ledger append.
5. Reconcile `required_result_fields` against generated schema required list and submit default/required behavior.
6. Update `phase-seed-topics.md` task-card/result examples from `work_id` to `queue_item_id`.
7. Extend static hygiene to scan phase Markdown queue examples for retired queue identity fields.
8. Add focused regression tests under `tests/`.
9. Update root `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` version banner for `v0.12`.
10. Run focused tests, governance checks, and OpenSpec validation before archive/apply completion.

Rollback is code-level revert of the implementation change before archive. No runtime bundle migration is required.

## Open Questions

None for this change. If implementation discovers a gate pass/fail mismatch, it SHALL be recorded under the second planned change `align-gate-contracts-and-reference-navigation` unless the mismatch directly blocks the Agent-facing work-unit submit contract covered here.
