## Why

BUG-114 与 BUG-115（`_backlog/bugs/BUG-114-work-unit-claim-enum-combinatorics.md`、`BUG-115-work-unit-result-schema-unconstructable.md`）暴露的共同问题不是缺少更多 schema 或 retry，而是 Engine 已知的静态 contract lineage 没有在 Agent 实际作决定的位置作为一个可构造、可复查的入口交付。结果是 Agent 对 claim observation 的封闭组合只能从 Zod 的无路径错误里猜；对 returned work 则可能在 task、schema、beacon、cache policy 与 submit feedback 之间来回拼接，直到试错碰巧完成。

当前系统已完成一部分正确工作：`task.md` 已有 result starter、write-before-return checklist、output/cache projection 与 receipt example；`dry-submit` 也会返回完整 violations。因而不应再新增 starter、第二 schema、预写 `result.json` 或通用 repair controller。剩余设计债是这些投影仍是多个并列段落，claim 输入的合法 vocabulary 也未被结构化交付；同时 candidate 的 `recommended_action` 依据 repair scope 选出，formal rejection 的 `repair_kind` 等字段却仍取排序后的 `violations[0]`，使“唯一下一动作”可能对应另一个 violation。

BUG-114 的两个建议修法不成立：通用 HITL1 `research_access` 不能冒充某一 delegated role 的当前 native observation，`available + not_observed` 也不能成为合法 provenance。它们应保持 fail-closed；要修的是可发现性和同一检查的反馈，不是放宽事实门槛。BUG-115 也不应以预填 receipt/cache/evidence 解决，因为那会制造未执行的 authority。

本 Change 修改 `DPT_FRAMEWORK/` behavior，需要 version bump，目标版本为 `v0.48`；apply 时同步根目录 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` 的 banner/current-release summary。

## What Changes

- 从现有 closed actor-observation contract 生成一个 role-bound claim input projection：列出四种合法 tuple、字段语义、当前 planned role、no-claim/fallback 的既有边界与一个最近动作。无效 tuple 必须以 structured claim rejection 返回冲突的字段和值、合法组合和同一 claim checkpoint；不分配 work ID、不写 trace，也不让 Engine 选择或伪造 observation。
- 把现有 manifest、beacon、result schema、direct-output descriptor、cache/source policy 与 receipt event contract 收敛为每个 claimed work unit 的一个生成式 completion-contract projection。`task.md` 与 spawn prompt 以它作为唯一 authoring entry，并删除/合并 task 中重复、互相并列的 completion fragments。它只复用既有 authority、给出 exact identity/path/role/receipt/result/cache facts 和 dry-submit checkpoint；不成为 acceptance authority，不新增持久 schema/state，不预创建 result、receipt、cache 或研究内容。
- 让 dry-submit、formal-submit rejection 与 timeout-preflight 重用同一个 candidate root selection，并使对外 primary feedback 指向实际决定 `recommended_action` 的 primary violation，而不是偶然排序第一条。保留可独立评估的完整诊断，但按 prerequisite short-circuit 屏蔽依赖症状；每个独立 root 保留其 own repair coordinate，primary result 只给一个最近合法动作及同一 dry-submit rerun。
- 增加 contract-parity、claim invalid-tuple、primary-root/rejection consistency 与 prerequisite-masking 的 focused verification；用真实 Agent-flow 只验证“actor 从 generated completion entry 进入并提交”的行为。没有获准的真实 actor runtime 时，该层必须如实记录 `NOT_RUN`，不得用 fixture、手写 output 或 receipt 冒充。
- 明确 BUG disposition：本 Change 只解决 BUG-114 的 discoverability/feedback 与 BUG-115 的 constructible entry；BUG-120 仅验证现有 reference guidance 是否被该 entry 实际加载。queue recovery、terminal replacement、Gate freshness/degradation、ledger mutation、generic HITL1-to-role proof 均不在范围内。

直接 Source of Record 保持不变：actor fact 来自本次 role-bound native observation；attempt identity/assignment 来自 hash-bound queue snapshot、index、manifest 与 beacon；candidate truth 来自既有 submit evaluator；历史 delegated success 来自 submit/ledger。新的 claim/completion/feedback surfaces 都是同一事实链的临时或可再生 projection，不能 outvote Engine。

最短合法闭环是：`current role probe -> claim projection -> claimed completion contract -> actor writes real outputs/receipt/cache -> dry-submit primary root -> same-candidate repair and rerun，或 accepted terminal/new-attempt boundary`。它不增加状态、validator、retry branch、controller 或 success path；净简化是移除 Agent 对 enum/opaque field/分散说明的猜测，收拢 task 内重复 completion guidance，并消除 primary action 与 primary detail 的两条选择路径。

责任边界不变：用户只决定新语义、风险、host permission 或不可代理外部动作；Agent/actor 执行已授权的 probe、research、写入和机械同一检查修复；Phase Agent 执行 claim、dry-submit、submit 及已接受的 replacement；Engine 只验证 deterministic contract、输出根因与最近合法动作。human-directed 不产生 role proof、写权限或 acceptance override。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `delegated-work-units`: 修改 work-unit envelope/completion projection、explicit actor-observation claim feedback，以及 dry-submit/formal rejection/timeout 的 primary-root consistency；不改变 claim/submit/ledger 的 authority 或成功路径。

## Impact

- Apply 预计修改 `DPT_FRAMEWORK/schema/contracts/work-unit.mjs`、`engine/work-unit-actor.mjs`、`engine/work-unit-lifecycle.mjs`、`engine/work-unit-envelope.mjs`、`engine/work-unit-candidate-projection.mjs`、`engine/work-unit-submit.mjs`、相关 CLI presentation 与根目录 `tests/`。`DPT_FRAMEWORK/` 在 `/opsx:apply` 前保持只读。
- 不新增 dependency、TypeScript 或 Python；不改 queue payload/health、assignment contract version、ledger/hash/provenance、Gate/transition、actor selection 或 retry/recovery lifecycle。
- verification plan 将选择 unit、integration 与 agent_flow_e2e；deterministic_e2e 不适用，因为本 Change 不引入持久状态、Gate、transition 或新的多阶段 deterministic chain。
