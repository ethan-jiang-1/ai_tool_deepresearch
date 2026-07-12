## Why

来源 `_backlog/plans/breakpoint-recovery-persistence-model.md` P2/P3、`_backlog/plans/human-override-and-state-mutability.md` A/B 与 `BUG-079-out-of-gate-addendum-no-canonical-footprint.md` 的共同缺口是：topic intent、identity 与当前工作事实散落在 `rb_plan.md`、`seed_topics/`、queue、work-unit、artifact 路径和 chat 中，新增/改名/重编号时没有一条 sanctioned canonical-or-blocked 路径。C1 已能检测 drift，C2 已保护 completed content staging；现在需要在内容工作开始前建立唯一 topic identity/intent owner，并让恢复进度从现有 direct facts 计算，而不是再堆一份进度台账。

## What Changes

- 将 `rb_plan.md#/topic_registry` 明确为 topic identity + minimum durable intent 的唯一 Source of Record；entry 增加 Engine-generated stable `topic_uid`、`must_answer`、`scope_role` 与 `depends_on_topic_uids`，现有序号/slug/title 保持 Agent-readable projection。
- 新增一个窄 `operate-topic-state.mjs` Agent-facing CLI，提供 `register`、`rename`、`renumber`、`inspect` 四个显式操作；所有 mutation 使用一个 Engine-owned operation workspace，失败保持旧 canonical state 或返回一个 blocked workspace，不提供 arbitrary patch/status/trace override。
- `register` 先原子物化 registry intent 与 seed skeleton，再允许 queue/content work；未注册或未物化 topic 进入 canonical-or-blocked，而不是创建平行 addendum namespace。
- `inspect` 从 canonical registry、seed projection、queue/work-unit/submitted ledger 与 wave artifacts 的直接事实计算 per-topic/per-wave `not_started|in_progress|complete|deferred|blocked` read model，不新增竞争性的 durable progress ledger，也不把 trace/chat/mtime 当 progress authority。
- `rename`/`renumber` 以 stable `topic_uid` 绑定 identity，原子更新 registry 与 accepted derived topic paths/refs；遇到未知引用或 transaction owner 外 surface 时 fail closed，不做全仓字符串替换。
- HITL1 与 HITL2 rerun 的新 scope 必须先走 topic-state registration/materialization；用户决定语义，Agent 执行普通命令，Engine 校验并提交 deterministic mutation。`human-directed` 不创造 permission，post-final reentry 与 arbitrary human override 仍留给 C5。
- 需要 version bump，目标 `v0.24`。

Net simplification：不新增 progress database、event-sourced topic ledger、watcher、background reconciler、双向同步 daemon 或第二套 topic registry；合并当前“registry 是 owner 但 seed/path/queue 各自推断 identity”的漂移，恢复闭环缩短为 `inspect direct facts → one blocked root or one next action → Agent repair/rerun inspect`。

## Capabilities

### New Capabilities
- `canonical-topic-state`: 定义 stable topic identity、minimum durable intent、canonical registration/materialization、direct-fact progress projection，以及原子 rename/renumber 的边界与结果契约。Requirement prefix 预留为 `CTS`，在 apply governance task 登记。

### Modified Capabilities
- `schema-core`: 扩展 `PlanSchema.topic_registry[]` 的 canonical identity/intent 字段，同时提供受控 legacy migration/diagnostic boundary。
- `seed-topic-materialization`: seed topic 从独立 identity 表面收敛为 canonical registry 的 materialized projection，新增 scope 必须在 research work 前完成 registration + seed materialization。
- `queue-input-validation`: topic-scoped queue demand 优先绑定 stable `topic_uid`，slug 作为人类可读 projection；unknown/unmaterialized identity fail closed。
- `rerun-incremental-node`: HITL2 rerun 的 add/remove/rename scope plan 改为调用 canonical topic-state operation，不再直接多面编辑 registry/seed paths。
- `research-styles`: topic count 与 style recomputation 只消费成功提交后的 canonical registry，不读取半完成 mutation workspace。
- `runtime-reentry-debuggability`: canonical recovery summary 消费 topic-state inspect read model，把 identity/materialization/progress drift 聚成一个最近根因，而不新增修复 authority。

## Impact

- 预计影响 `DPT_FRAMEWORK/schema/contracts/plan.mjs`、topic/plan 解析 helpers、一个新的 topic-state helper 与 CLI、seed/rerun/queue/reentry integration points、Agent-facing command/phase guidance，以及 root `tests/` 与现有 reentry/rerun controlled experiment family。
- 新增 bundle-local `_diagnostics/topic-state/<operation-id>/` 仅用于 accepted multi-file mutation recovery；不复用 C2 content workspace 去越权修改 control/identity surfaces，也不新增全局 journal。
- 不新增依赖；Node.js ESM + `zod`/`yaml` 与 built-ins。
- 不改变 work-unit submit、queue completion、gate、handoff、status、trace、artifact persistence 或 Final delivery authority；不实现 post-final reentry、state jump 或 audited human override。
