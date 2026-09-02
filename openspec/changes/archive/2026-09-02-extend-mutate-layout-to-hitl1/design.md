# Design: extend-mutate-layout-to-hitl1

## Context

布局变更的完整安全机器已经存在并被 sanctioned rerun 使用：`buildTopicLayoutTarget`（`DEEP_RESEARCH_HARNESS/engine/helpers/topic-layout.mjs`，完整 target 的 rename/reorder/renumber/safe-remove、UID 全覆盖、入边依赖、slug 碰撞、`previous_layouts` 血统）、`safeRemoveBlocker`（`engine/helpers/topic-state-inspect.mjs`，queue/work-unit/ledger/artifact/reference 历史任一存在即拒绝）、`expected_plan_sha256` CAS、prepared manifest 原子提交与 exact recover、`registry_length_changed → style_projection` handoff。HITL1 无法删除/重排/改 slug 的原因只剩一层 schema 字面量与规格措辞（动机见 proposal.md Why；需求 delta 见 specs/）。apply 的 `lifecycleAuthorization` 已有现成的 hitl1 分支（`current_node: phases/phase-hitl1.md` + `hitl1_recorded → setup_ready`），与 add/update 使用的 window 完全相同——本 change 不引入任何新 window、新 action 形状或新 CLI 面。

## Goals / Non-Goals

**Goals**
- `mutate_layout` 在 legal HITL1 pre-gate window 获得与 sanctioned rerun 逐规则一致的授权；target 形状、护栏、原子性零分叉。
- `inspect` 的 copy-ready `layout_baseline.context` 反映调用方当前合法 window，消除「模板 context 与实际 window 不符」的手改步骤。
- 指引面（phase-hitl1.md、operate-topic-state.md、COMMANDS.md）把结构再调整路由到该合法路径并显式封禁 direct-edit。

**Non-Goals**
- 不改 seed_topics phase 的任何能力（确认 out of scope，见 proposal）。
- 不改 rerun/post-final 的 witness、direction、quiescence 语义。
- 不新增 remove/retire 状态、path move、第二 CLI 或第二 workspace。
- 不改 `CanonicalPlanSchema`、queue/work-unit/gate 行为。

## Decisions

### D1. 扩展 `LayoutPlanSchema.context` 为 `z.enum(['hitl1','rerun'])`，而不是新增 action 或字段

被否决的替代：hitl1 专属 `remove_topic` action（第二条布局路径、重排/改 slug 仍无解）；`update_intent` 携带 `slug_stem`（slug 是 ordinal+stem 派生物，改它必然牵动 seed 文件名与重排——把 layout mutation 走私进 intent action；且 accepted spec 已有「existing id/slug MAY change only through `mutate_layout`」的边界）。数据结构仍由 Zod schema 定义、跨字段校验仍由 schema 层 superRefine 与 engine 检查拥有，本 decision 只改一个 closed enum 的取值域。`describeTopicApplyPlanSchema` 从真实 schema 派生 form，`schema --context hitl1` 自动跟进，无第二投影。

### D2. 授权判定完全复用 `lifecycleAuthorization` 既有 hitl1 分支，Engine 不新增任何权限源

window 谓词与 add/update 使用的谓词逐字节相同；caller 声明的 context 值不创造权限（既有 spec 原则，delta 已写明）。`applyCanonicalTopicState` 里 `mutate_layout` 的其余检查——hash CAS、`safeRemoveBlocker`、`activeTopicWork`、seed target 安全、`replacementsUnchanged`、prepared/recover——全部 context 无关，预期零改动；apply 期以现有单测 + 新增集成断言逐条验证该预期。

### D3. `inspect` baseline context 按当前 lifecycle window 派生，`rb_status.json` 不可读时 fallback `'rerun'`

副作用核查（规划期已完成）：`.context` 在 engine/gate 无分支消费，唯一用途是作为 apply 输入过 Zod；现有测试只断言 `.topics` 不锚定 `.context`；rerun/post-final e2e 所在 window 派生值保持 `'rerun'`，行为不变。fallback 只作用于 read-only 模板值，不是新的 recovery 机制。实现约束：window 谓词必须在 `topic-state-inspect.mjs` 内**内联**（直接读 `rb_status.json`），不得反向 import `canonical-topic-state.mjs` 的 `lifecycleAuthorization`——后者已 import 本模块（`activeTopicWork`/`safeRemoveBlocker`），反向 import 会成环。

### D4. 指引同步是契约级而非建议级

phase-hitl1.md §3a 增加「首次 apply 后结构再调整 → 完整 layout target」路由并封禁 direct-edit；operate-topic-state.md 与 COMMANDS.md 同步措辞。全部由 `tests/integration/md/canonical-topic-state-contract.test.mjs`（已读取 COMMANDS.md 与 phase-hitl1.md）扩展锁定，防止 prose 漂移回绕过路径。

## 三层设计审查（constitution evolution 顺序）

- **Semantic precision**：不新增具名 state/concept/view（proposal 已记 reflection）。保留的关键区别：「baseline 的 `context` 字段是模板事实，不是权限」。推理停止点：授权在 apply 时由 Engine 从 `rb_status.json` 判定。
- **Simple reliable control**：direct Source of Record 不变（`rb_plan.md#/topic_registry` 为 topic 身份、`rb_status.json` 为 window 事实）。最短合法闭环缩短：用户结构决定 → 一个完整 target → 原子提交 → 同一 gate，替代「3 处手工编辑 + checkpoint 重绑 + seed_mismatch 修复」。净简化：删除一类只能靠 direct multi-file edit 满足的合法需求缺口；未新增 check/state/fallback/retry（D3 的 fallback 是 read-only 派生值的容错，非控制流）。
- **Helper-oriented responsibility**：user 决定 title/order/remove 语义；Agent 做 retained input/机械化 apply/recover；Engine 做 window/护栏/原子性 deterministic verdict。`human-directed` 不创造权限，delta scenario 已锁定。

## Risks / Trade-offs

- [扩展 enum 使既有 `input_invalid` 拒绝变为可行提交] → 这是变更目的本身；护栏（历史/依赖/hash/原子性）不变，风险集中在 window 语义，而 window 判定代码零改动。
- [第三层（文档）与引擎行为漂移] → MD 契约测试锁定三个指引面（claim `guidance-surfaces-lock-hitl1-layout-path`）。
- [inspect 读 `rb_status.json` 引入新的读依赖] → try/catch fallback `'rerun'`，inspect 保持 read-only、确定性；不读取其他状态面。
- [HITL1 内误删仍想要的 topic] → 原子提交 + exact recover 不构成 undo；缓解是指引要求 Agent 在提交前向用户复述 remove 集合（语义决定仍属用户），Engine 只保证机械安全。这与既有 rerun remove 的责任分布一致，不新增 Engine 状态。

## Migration Plan

无数据迁移、无 bundle 结构变化、无 schema version 变化（`mutate_layout` 输入形状不变，仅授权 window 扩大）。部署即生效；回滚 = revert enum 与 inspect 派生两处 + 指引文本，无运行时残留。绕过方案造成的既有 bundle hash 漂移属于 run runtime state，由既有 gate 重绑路径自愈（本 change 不处理历史 bundle）。

## Open Questions

无——Q1（baseline context 派生）、Q2（seed_topics out of scope）、Q3（立即 propose）已在规划轮由用户定案并记录于 `_backlog/bugs/hitl1-cannot-remove-topic-layout.md` §7。
