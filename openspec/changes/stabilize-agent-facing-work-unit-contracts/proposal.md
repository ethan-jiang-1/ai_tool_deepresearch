## Why

`dpt_rb_martin-fowler-ai-sdlc-retreats` 正式 run 暴露出一个基础契约问题：Agent 看到的 work-unit `result.schema.json`、phase task-card/result 示例、generated task/prompt/output contract，与 Engine 入口验收（queue schema、work-unit submit validator、kind output contract）不一致，导致诚实按文档或 generated schema 执行的 Agent 首次提交、enqueue、complete 或 submit 后置 gate 前置条件时失败。

本 change 来源于 `_backlog/plans/martin-fowler-run-bugfix-change-split.md` 的第一个 change：`stabilize-agent-facing-work-unit-contracts`。原始触发 bug 是 `_backlog/bugs/BUG-066-work-unit-result-schema-contradicts-strict-validator.md` 和 `_backlog/bugs/BUG-067-phase-seed-topics-work-id-template-drift.md`，但本 change 不只逐点修这两个 bug。它要对 **入口合同** 做一次全面审计并修正：凡是 Agent 在进入 Engine 入口前会相信的 contract surface，都必须能让合规 Agent 不读 Engine 源码也写出可提交、可入队、可完成的结构化输入。

这里的入口合同包括：

- queue task-card JSON 示例和 non-delegated queue complete result JSON 示例；
- `operate-work-unit claim` 生成的 `task.md`、spawn prompt、`_beacon.json`、`result.schema.json`、output/cache contract；
- work-unit submit validator 会立即验收的 result identity、`output_files[]`、`cache_trails[]`、`source_claims[]`、`accepted_source_urls[]`；
- static hygiene 声称会守护的 Agent-facing contract surfaces。

本 change 解决 `_backlog/bugs/BUG-069-silent-autonomous-execution-unreachable-contract-not-self-sufficient.md` 中非 gate 的 Agent-facing contract 部分。Gate definition/helper/phase output 的 pass/fail 对齐仍属于第二个 change：`align-gate-contracts-and-reference-navigation`。

## What Changes

- 先做入口合同审计：系统性盘点 Agent 提交/入队前会读到的入口 contract surfaces，并把发现写进 implementation 任务，不能只按 BUG-066/067 的已知实例修补。
- 生成的 `_work_units/.../result.schema.json` 必须成为 submit-time validator 和 kind output contract 的真实 Agent-facing 投影：
  - identity fields 必须 const-bind `work_id`、`queue_item_id`、`kind`、`receipt_nonce`。
  - generated schema 的 required fields 必须与 submit-time required/default 语义一致；若 `output_contract.required_result_fields` 声称字段 required，schema 和 validator 必须同向表达或修正该 contract，不得三者分裂。
  - work-unit output contract 不允许 `source_claims` 时，不再在 generated schema 中广告 `source_claims` / `accepted_source_urls`。
  - work-unit output contract 允许 `source_claims` 时，generated schema 必须暴露严格的 `source_claims[]` item 字段集合，并禁止额外字段。
  - generated schema 必须暴露真实的 `output_files[]` item shape，并用当前 work-unit output contract 的 `allowed_roles` 约束 `role`。
- `operate-work-unit submit` 必须执行入口合同里声明的 kind output constraints，尤其是 `output_files[].role` 必须属于 `output_contract.output_files.allowed_roles`。不能让 generated schema 广告 enum、submit 却接受 enum 外值；也不能让 output contract 自称约束但机器入口不验。
- `phase-seed-topics.md` 的 queue task-card / queue complete result 示例必须使用 queue demand identity `queue_item_id`，不得继续使用已废弃的 `work_id`。这里包括 enqueue task card 和 `operate-queue complete --result` 的 non-delegated result JSON 两类入口示例。
- 扩展 hygiene/static checks，让 phase Markdown 中的 queue task-card/result JSON 示例、work-unit result examples、入口 contract examples 纳入 retired queue identity 和明显 contract drift 检查，避免 `validate-work-unit-hygiene` 对 canonical phase 模板假阴性。
- 增加 regression tests，证明 wave0/wave1/wave2 generated result schema 与 submit validator 在字段允许/禁止、role enum、identity const、required/default 字段语义上对齐；并证明 seed-topics queue examples 与 QueueResultSchema/QueueDemandItemSchema 对齐。
- 明确不产出：不修改 gate selector 语义；不修改 return-map reference policy；不提供已提交 ledger row 的 metadata amend；不新增依赖；不使用 Python。
- 版本：需要 version bump，target version 为 `v0.12`。implementation 阶段需要更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 版本横幅。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `subagent-node-contract`: generated work-unit `task.md` / spawn prompt / beacon / `result.schema.json` 必须 truthful 地投影 submit-time result/output/source-claim/cache contract，让 Sub-agent 能只靠入口合同 surface 写出可提交结果。
- `agentic-queue`: seed-topic materialization phase templates、queue complete result examples 和静态 hygiene 必须使用并守护 `queue_item_id` queue demand identity，防止 phase Markdown 与 queue schema / QueueResultSchema 漂移。

## Impact

- 影响的未来代码面包括 `DPT_FRAMEWORK/engine/work-unit-envelope.mjs`、`DPT_FRAMEWORK/engine/work-unit-validation.mjs`、`DPT_FRAMEWORK/schema/contracts/work-unit.mjs`、`DPT_FRAMEWORK/schema/contracts/queue.mjs`、`DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`、`DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs` 或 `DPT_FRAMEWORK/cli/validate-phase-templates.mjs`。
- 影响的未来测试面包括 `tests/engine/` 或 `tests/schema/` 中的 generated result schema consistency / submit validator consistency 测试，queue phase template hygiene 测试，以及 seed-topics queue example schema 测试。
- 需要更新 `openspec/governance/req-registry.yaml`，为 `subagent-node-contract` 和 `agentic-queue` 各登记新的 requirement ID。
- 技术约束保持不变：Node.js >=20，纯 JavaScript ESM，`node:test` + `node:assert`，不新增依赖，不使用 Python。
