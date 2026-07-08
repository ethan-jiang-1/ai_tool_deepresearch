## Why

`dpt_rb_martin-fowler-ai-sdlc-retreats` 正式 run 暴露出一类基础契约问题：Agent 先看到的 work-unit `result.schema.json`、phase task-card/result 示例、generated task/prompt/output contract，与 Engine 在 queue transition、work-unit submit、ledger append 前实际执行的 schema / validator / kind output contract 不一致。结果是 Agent 诚实按文档或 generated schema 执行，仍会在 enqueue、non-delegated complete、work-unit submit，或 submit 后立即可由入口合同发现的结构前置条件上失败。

本 change 来源于 `_backlog/plans/martin-fowler-run-bugfix-change-split.md` 的第一个 change：`stabilize-agent-facing-work-unit-contracts`。原始触发 bug 是 `_backlog/bugs/BUG-066-work-unit-result-schema-contradicts-strict-validator.md` 和 `_backlog/bugs/BUG-067-phase-seed-topics-work-id-template-drift.md`，但本 change 不只逐点修这两个 bug。它要对 **入口合同（entrance contract / Agent-facing pre-submit and pre-transition contract）** 做一次全面审计并修正：凡是 Agent 在触发 Engine queue transition 或 work-unit submit 前会相信的 contract surface，都必须能让合规 Agent 不读 Engine 源码也写出可入队、可完成、可提交的结构化输入。

这里的入口合同包括：

- active phase Markdown 中指导 Agent 写入的 queue task-card JSON 示例和 non-delegated queue complete result JSON 示例；
- `operate-work-unit claim` 生成的一个完整 work-unit envelope：`manifest.json`、`task.md`、spawn prompt、`_beacon.json`、`result.schema.json`、output/cache contract；
- `operate-work-unit submit` 在 ledger append 前会立即验收的 result identity、`output_files[]`、`cache_trails[]`、`source_claims[]`、`accepted_source_urls[]`；
- static hygiene 声称会守护的 Agent-facing entrance contract surfaces。

根因不是单个字段写错，而是同一份入口合同被拆散在 Markdown 示例、generated envelope、JSON Schema、Zod schema、submit helper、hygiene scan 里，各面没有被当作一条 contract chain 审计。本 change 要把这条链收束为“Agent 看见什么、Engine 就按什么验；Engine 要验什么，Agent 入口面就必须 truthful 地投影什么”。

本 change 解决 `_backlog/bugs/BUG-069-silent-autonomous-execution-unreachable-contract-not-self-sufficient.md` 中非 gate 的 Agent-facing contract 部分。它的边界停在 deterministic queue transition 和 submitted-ledger append；Gate definition/helper/phase output 的 pass/fail 对齐仍属于第二个 change：`align-gate-contracts-and-reference-navigation`。

## What Changes

- 先做入口合同审计矩阵：系统性盘点 Agent 在 enqueue、non-delegated complete、work-unit claim/submit 前会读到的 entrance contract surfaces，并为每个 surface 标明 producer、Agent reader、Engine validator/check、source of truth、failure boundary、test/static guard；在 change-local implementation evidence 中记录发现，不能只按 BUG-066/067 的已知实例修补。
- `operate-work-unit claim` 生成的 work-unit envelope 必须是同一份 manifest/output/cache contract 的多种投影；`task.md`、spawn prompt、`_beacon.json`、`result.schema.json` 不得各自维护互相矛盾的字段列表或能力暗示。
- 生成的 `_work_units/.../result.schema.json` 必须成为 submit-time validator 和 kind output contract 的真实 Agent-facing 投影：
  - identity fields 必须 const-bind `work_id`、`queue_item_id`、`kind`、`receipt_nonce`。
  - generated schema 的 required fields 必须与 submit-time required/default 语义一致；若 `output_contract.required_result_fields` 声称字段 required，schema 和 validator 必须同向表达或修正该 contract，不得三者分裂。
  - work-unit output contract 不允许 `source_claims` 时，不再在 generated schema 中广告 `source_claims` / `accepted_source_urls`。
  - work-unit output contract 允许 `source_claims` 时，generated schema 必须暴露严格的 `source_claims[]` item 字段集合，并禁止额外字段。
  - generated schema 必须暴露真实的 `output_files[]` item shape，并用当前 work-unit output contract 的 `allowed_roles` 约束 `role`。
- `operate-work-unit submit` 必须执行入口合同里声明的 kind-level output constraints，尤其是 `output_files[].role` 必须属于 `output_contract.output_files.allowed_roles`。不能让 generated schema 广告 enum、submit 却接受 enum 外值；也不能让 output contract 自称约束但机器入口不验。
- `phase-seed-topics.md` 的 queue task-card / queue complete result 示例必须使用 queue demand identity `queue_item_id`，不得继续使用已废弃的 `work_id`。这里包括 enqueue task card 和 `operate-queue complete --result` 的 non-delegated result JSON 两类入口示例。
- 扩展 hygiene/static checks，让 active phase Markdown 中指导 Agent 写文件的 queue task-card/result JSON 示例，以及已有 hygiene 声称覆盖的 work-unit result / entrance contract examples，纳入 schema-parse、retired queue identity 和明显 contract drift 检查，避免 canonical phase 模板假阴性。
- 增加 regression tests，证明 wave0/wave1/wave2 generated result schema 与 submit validator 在字段允许/禁止、role enum、identity const、required/default 字段语义上对齐；并证明 seed-topics queue examples 与 QueueResultSchema/QueueDemandItemSchema 对齐。
- 明确不产出：不修改 gate selector 语义；不修改 Wave1 required path 的 canonical role policy；不修改 return-map reference policy；不提供已提交 ledger row 的 metadata amend；不新增依赖；不使用 Python。
- 版本：需要 version bump，target version 为 `v0.12`。implementation 阶段需要更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 版本横幅。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `subagent-node-contract`: generated work-unit `manifest.json` / `task.md` / spawn prompt / beacon / `result.schema.json` 必须 truthful 地投影同一份 submit-time result/output/source-claim/cache contract，让 Sub-agent 能只靠入口合同 surface 写出可提交结果，并让 submit 在 ledger append 前执行同一份 kind-level output contract。
- `agentic-queue`: seed-topic materialization phase templates、queue complete result examples 和静态 hygiene 必须使用并守护 `queue_item_id` queue demand identity，防止 phase Markdown 与 queue schema / QueueResultSchema 漂移。

## Impact

- 影响的未来 implementation 面预计包括 `DPT_FRAMEWORK/engine/work-unit-envelope.mjs`、`DPT_FRAMEWORK/engine/work-unit-validation.mjs`、`DPT_FRAMEWORK/schema/contracts/work-unit.mjs`、`DPT_FRAMEWORK/schema/contracts/queue.mjs`、`DPT_FRAMEWORK/workflows/nodes/phases/phase-seed-topics.md`、其他包含 queue task-card/result examples 的 active phase Markdown、`DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs` 或 `DPT_FRAMEWORK/cli/validate-phase-templates.mjs`。
- 影响的未来测试面包括 `tests/engine/` 或 `tests/schema/` 中的 generated result schema consistency / submit validator consistency 测试，queue phase template hygiene 测试，以及 seed-topics queue example schema 测试。
- `openspec/governance/req-registry.yaml` 已登记 `SNC-006` 和 `AGQ-023`；apply 阶段需保持 registry、delta specs、implementation `@impl` 标记和治理检查一致。
- 技术约束保持不变：Node.js >=20，纯 JavaScript ESM，`node:test` + `node:assert`，不新增依赖，不使用 Python。
