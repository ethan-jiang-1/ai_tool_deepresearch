# Change: extend-mutate-layout-to-hitl1

## Why

HITL1 初始建 topic 阶段无法物理移除 topic、重排或修改 slug：用户在 `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 现场拆分合并 topic 后，只能把废弃 topic 留成误导性占位，或绕过契约直接编辑 `rb_plan.md` 与 seed 文件（来源：`_backlog/bugs/hitl1-cannot-remove-topic-layout.md`）。绕过破坏了 setup-ready route 的 `plan_sha256` 三方绑定（`DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs:711`）并触发 `seed_mismatch`。而布局变更的安全机器已经存在且被 rerun 实战检验——`buildTopicLayoutTarget`（完整 target 的 rename/reorder/renumber/safe-remove、UID 全覆盖、依赖与 slug 碰撞检查、`previous_layouts` 血统）+ `safeRemoveBlocker`（历史任一存在即拒绝）+ hash-CAS + 原子 prepared workspace——只是被三层挡在 HITL1 之外：schema 层 `LayoutPlanSchema.context: z.literal('rerun')`、accepted spec 的 rerun-only 授权表述、phase/playbook 指引。

## What Changes

- **`mutate_layout` 合法授权 window 扩展**：由 sanctioned rerun 扩为 sanctioned rerun **或** legal HITL1 pre-gate window（`current_node: phases/phase-hitl1.md` 且 `hitl1_recorded → setup_ready`）。target 形状、safe-remove 护栏、quiescence、`expected_plan_sha256` CAS、原子 prepared/recover 提交全部不变；HITL1 输入不涉 rerun direction。
- **`inspect` 的 `layout_baseline.context` 按 lifecycle window 派生**：hitl1 window → `'hitl1'`，否则 `'rerun'`；`rb_status.json` 缺失/不可读时 fallback `'rerun'`，inspect 保持 read-only、确定性。baseline 的 context 值仍是模板事实，不是 mutation authority。
- **指引同步**：HITL1 phase body、`command_playbook/operate-topic-state.md`、`COMMANDS.md` 补「首次 apply 后用户再调整结构（拆分/删除/重排/改名）→ 同 window 内提交一个完整 `mutate_layout` target；禁止 direct-edit」。
- **明确不产出**：seed_topics phase 的增删/重排（彼时 topic 已绑 queue/work-unit，结构变更走 sanctioned rerun 或新 bundle，`safeRemoveBlocker` 的设计本意）；已研究 topic 原地 retire（仍 = 新 bundle）；path move（历史路径原位）；新 CLI、新 workspace、新 action 形状。

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `research/canonical-topic-state` | main spec `openspec/specs/research/canonical-topic-state/spec.md` :205-221（lifecycle windows 授权）、:559-656（bounded layout operations）、:722-786（layout coordinates / complete target）；engine `topic-state-plan-schema.mjs`、`canonical-topic-state.mjs`、`topic-state-inspect.mjs`、`topic-layout.mjs` | Modify | `mutate_layout` 授权 window、layout operation 的 rerun-only 表述、inspect baseline context 派生都是该 capability 的 requirement 级行为 |
| `research/pre-research-phase-content` | main spec `openspec/specs/research/pre-research-phase-content/spec.md` :44-125（HITL1 body completeness / canonical topic-state path）、`phase-hitl1.md` §3a | Modify | HITL1 phase body 需新增结构再调整路由的 requirement 级指引（body SHALL 内容变化） |
| `workflow/rerun-incremental-node` | main spec :44-63（inspect baseline / complete target 引用） | Verify-only | rerun 侧 `mutate_layout` 语义零变化；其措辞不含 rerun-only 限定，无需 delta |
| `engine/schema-core` | main spec :346（`previous_layouts` 读取兼容、连续 id/slug 由 target builder 强制） | Verify-only | `CanonicalPlanSchema` 零变化；连续 id/slug 仍由既有 target builder 强制 |
| `engine/cli-inspect-output-conventions` | main spec 结构化 inspect 输出约定 | Verify-only | inspect 输出形状约定不变；baseline context 值的行为归属 canonical-topic-state |
| `agent/agentic-queue` | catalog 行 + 既有 safeRemoveBlocker/quiescence 事实 | Excluded | queue/work-unit 行为零变化 |
| `research/seed-topic-materialization` | catalog 行 + seed-topics-ready gate 现行为 | Excluded | seed_topics 结构调整已确认 out of scope（用户已定案），gate 行为零变化 |
| `agent/queue-input-validation` | catalog 行 + 既有 topic-registry admission 事实 | Excluded | admission 语义零变化 |
| `workflow/workflow-node-contract` | main spec :294（bootstrap 例外） | Excluded | instantiation/HITL1 bootstrap 例外措辞不动 |

无 New capability：本 change 只扩展现有 capability 的既有 requirement，不引入未被检查过的 observable behavior。

## Impact

- **Engine**（apply 期修改）：`DEEP_RESEARCH_HARNESS/engine/helpers/topic-state-plan-schema.mjs`（`LayoutPlanSchema.context` → enum）、`DEEP_RESEARCH_HARNESS/engine/helpers/topic-state-inspect.mjs`（baseline context 派生 + fallback）。预期零改动并在 apply 时逐条核对：`lifecycleAuthorization` hitl1 分支、`buildTopicLayoutTarget`、`safeRemoveBlocker`、原子提交/recover、`registry_length_changed → style_projection` handoff（其 spec scenario 本就覆盖 "legal HITL1 or rerun window"）。
- **文档/指引**（apply 期）：`command_playbook/operate-topic-state.md`、`workflows/nodes/phases/phase-hitl1.md`、`COMMANDS.md`。
- **测试**：`tests/integration/cli/operate-topic-state-hitl1-readiness.test.mjs`（或同目录新文件）、`tests/engine/helpers/canonical-topic-state.test.mjs`。
- 无 npm 依赖变化；无新 CLI 子命令；无 bundle 结构变化。

## Source of Record / 最短合法闭环 / 净简化

- **Source of Record 不变**：`rb_plan.md#/topic_registry` 仍是唯一 canonical topic 身份源；mutation 权限仍由 `rb_status.json` lifecycle facts 单一决定——caller 声明的 context 值依旧不创造权限。
- **最短合法闭环**：用户结构决定 → Agent 在既有 HITL1 window 内提交一个完整 `mutate_layout` target → Engine 原子提交（含旧 seed cleanup 与 style handoff）→ 同一 `hitl1-recorded` gate。相比绕过方案（3 处手工编辑 + checkpoint 重绑 + seed_mismatch 修复）路径更短且每步确定性。
- **净简化**：删除一类「合法需求只能靠 direct multi-file edit 满足」的缺口；不新增 check、state、fallback（`rb_status.json` fallback 仅是派生模板值的既有 read-only 容错）、retry 或 recovery 机制。

## Semantic-Precision Reflection

不新增具名 state、projection、status、concept、Module、command 或 reader-facing view；只扩展现有 `mutate_layout` 的合法 window 与 `layout_baseline.context` 的取值来源。读者的有界问题：「当前 window 能否提交完整 layout target」——扩展后该问题仍由 lifecycle facts 单一回答，且保留既有区别「baseline 的 context 字段是模板值，不是权限」。正常推理停止点：授权在 `apply` 时由 Engine 判定；`inspect` 的模板派生不做预授权。

## 责任边界

- **User**：决定 title/order/remove 语义（拆不拆、删哪个、排哪序、叫什么）。
- **Agent**：把决定机械化为一个完整 `mutate_layout` target（基于 inspect baseline），保留 retained input，执行 apply/recover 与同 checkpoint 复核；不发明用户语义，不 direct-edit canonical 文件。
- **Engine**：判定 window、护栏（依赖/历史/active work/slug 碰撞/hash CAS）、原子提交与 exact recover；不做语义评分。`human-directed` 不创造权限。
