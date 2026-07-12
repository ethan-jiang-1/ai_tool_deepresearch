## Why

来源 `_backlog/plans/breakpoint-recovery-persistence-model.md` P2/P3、`_backlog/plans/human-override-and-state-mutability.md` A 与 `BUG-079-out-of-gate-addendum-no-canonical-footprint.md` 的共同缺口是：新增 topic 的 identity、minimum intent 与当前 wave work fact 不能只凭 disk truth稳定恢复。C1 已能检测 registry-external drift，C2 已保护 completed content staging；现在需要在内容工作前建立唯一 canonical topic owner，而不是让 registry、seed、queue、artifact 与 chat 各自暗示 topic 真相。

首次 proposal 将 add、remove、rename、renumber、全路径迁移和 crash transaction 全塞进一个 change，形成第二套通用 filesystem recovery controller。Explore 后按 overall roadmap 的 split trigger 收敛为 **C3A canonical identity / intent / direct-fact progress**：本 change 只处理 legacy migration、new-topic registration、existing intent update 与 read-only inspect；remove/rename/renumber/layout mutation 留给后续 C3B。

## What Changes

- `rb_plan.md` 增加 `topic_registry_version: "2"` 作为 canonical/legacy discriminator；`topic_registry` 继续作为唯一 topic Source of Record，entry 增加 Engine-generated immutable `topic_uid` 与 minimum durable intent：`must_answer[]`、`scope_role`、`depends_on_topic_uids[]`。现有 `id/slug/title` 保持当前 layout coordinate，本 change 不修改既有 id/slug/path。
- 新增一个窄 `operate-topic-state.mjs`，只提供 `inspect`、`apply`、`recover`：
  - `apply` 接受 `migrate_legacy`、`add_topic`、`update_intent`；legacy reconciliation由Agent明确提供，可显式adopt C1检测出的external slug，不从artifact/seed prose/chat猜语义；new topic分配下一个ordinal/slug并物化registry+seed；
  - `recover` 只恢复一个inspect明确报告的accepted operation id，确定性完成exact staged plan/seed或blocked；
  - `inspect` 从registry/seed、slug-bound queue/work-unit/submitted ledger与accepted artifact facts计算read model，并给出唯一最近命令。
- 新 scope 必须先 commit canonical registry + seed projection，才可进入 topic-scoped queue/content work。Registry-external/seed-only/parallel addendum identity 一律 canonical-or-blocked。
- progress 仅 side-effect-free 投影为 `not_started|in_progress|complete|blocked`，返回 direct fact refs、一个原因和最多一个最近动作；不新增 progress 文件、event store、cache 或 reconciliation loop。
- HITL1/HITL2 rerun 的 add/refine 先走 topic-state apply；用户决定语义，Agent执行普通命令，Engine验证并提交。remove/rename/renumber、post-final reentry与arbitrary override明确保持 missing capability/boundary，不以 direct multi-file edit 冒充支持。
- `apply` 不信任调用者自报的 `human-directed` 或 context flag：new-run HITL1复用现有`current_node`+bootstrap-compatible status window，rerun复用`current_node`+route-bound HITL2 handoff/status window。Legacy migration/adoption仅能在 sanctioned rerun提交；post-final legacy incident继续等待C5。`recover`只完成已记录authorized context的prepared manifest，可在崩溃重入时执行。
- Agent 在用户批准后先写 caller-owned retained apply-input file，再立即调用 apply；prepared manifest 是 Engine accepted recovery boundary。prepared 前崩溃不被过度描述为已接受，但 retained input 可用于fresh retry，不建设 chat interceptor。
- 需要 version bump，目标 `v0.24`。

最短闭环：`inspect direct facts → recover <operation-id> 或 apply <plan> → existing style follow-up if needed → inspect`。Agent执行普通恢复命令；只有缺失/冲突的语义或权限才回到用户。Net simplification 是用 stable UID + registry owner消除 seed/path自发成为 identity 的歧义，同时避免第二 registry、持久 progress truth、隐藏 recovery、全路径 transaction、watcher、daemon 或 background reconciler。

## Capabilities

### New Capabilities
- `canonical-topic-state`: stable identity、minimum durable intent、explicit legacy migration/adoption、add/update apply、explicit recover、seed projection与direct-fact progress inspection。Requirement prefix 预留 `CTS`，apply时登记。

### Modified Capabilities
- `schema-core`: 保留 legacy-compatible `PlanSchema` read path，新增 strict `CanonicalPlanSchema`/canonical topic entry invariants；新run HITL1与topic mutation要求canonical，legacy bundle在未进入sanctioned rerun前继续旧read/gate兼容路径。
- `pre-research-phase-content`: HITL1 在用户批准 topic semantics 后由Agent调用topic-state apply原子写registry+seed，再调用existing style owner；不再直接写frontmatter registry并把intent materialization推迟到seed phase。
- `seed-topic-materialization`: seed file成为 UID-bound registry projection；register/migrate成功前不得开始topic work。
- `queue-input-validation`: 不改变queue schema；topic-scoped enqueue在topic-state workspace存在、seed缺失或UID binding不一致时no-write reject。
- `rerun-incremental-node`: sanctioned rerun add/refine 使用 canonical topic-state plan；remove/rename/renumber不再由direct edits假装支持。
- `research-styles`: topic-state add commit后复用既有 profile owner按 committed registry length recompute。
- `runtime-reentry-debuggability`: 消费 topic-state inspect，将同一 UID 的 identity/materialization/progress drift聚成一个root，不新增mutation authority。

## Impact

- 预计影响 PlanSchema/readers、HITL1、一个 topic-state helper + CLI、seed materialization/gate、queue preflight、rerun guidance、research-style follow-up、reentry adapter、Agent command guidance及 root tests/controlled experiment。
- 新增 `_diagnostics/topic-state/<operation-id>/` 只绑定 `rb_plan.md` 与本次 migrate/add/update 明确触及的 `seed_topics/*.md`；不迁移artifact/cache/reference/final paths，不成为通用 transaction framework。
- 不新增依赖；queue只增加direct eligibility preflight，不改变schema/contents owner；不改变work-unit submit、status、trace、handoff、C2 artifact persistence或Final delivery authority。
- 后续 C3B（建议 `mutate-canonical-topic-layout`）单独处理 remove/rename/renumber/path/reference migration；C5继续处理post-final reentry与audited override。
