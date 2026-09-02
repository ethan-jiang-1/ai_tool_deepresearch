# Bug: HITL1/seed-topics 初始建 topic 阶段无法物理移除 topic 或改 slug

## 发现场景

在 `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 的 HITL1 阶段（初始建 topic 阶段，**不是 rerun**），用户要求将一个已创建的合并 topic（"H200 & MI308 参照基线"）拆为两个独立 topic（"H200 参照基线"、"MI308 参照基线"）。拆完后旧的合并 topic 应被移除，但 HITL1 阶段**无法物理删除 topic**，也无法修改其 slug/stem。

## 症状

- `hitl1:add_topic` ✅ 可以新增 topic
- `hitl1:update_intent` ✅ 可以修改已有 topic 的 title/must_answer/scope_role
- `hitl1:update_intent` ❌ **不能修改 slug/stem**（`slug_stem` 不是 update_intent 的字段）
- `hitl1` 没有 `remove_topic` action
- `rerun:mutate_layout` ❌ 报 `rerun_not_authorized`（这本来就不该用，因为不是 rerun 阶段）

## 影响

旧的合并 topic 虽然可以用 `update_intent` 改成废弃占位（title 加"已拆分"标签、scope_role 改 `supporting`），但：
- slug 无法改，保留 `09_h200-mi308-baseline` 误导性名称
- 数组位置无法重排，出现 `09_废弃` → `10_混合部署` → `11_h200` → `12_mi308` 的跳跃感
- 这种"初始建 topic 时临时调整 topic 结构"的操作很常见（用户现场反馈），每次都会留下垃圾占位

## 复现步骤

1. `instantiate-run-bundle`
2. 第一次 `operate-topic-state apply --context hitl1` 创建了 10 个 topics，其中 topic 09 是合并的 "H200 & MI308"
3. 用户说"H200 和 MI308 分开，别混在一起"
4. `hitl1:add_topic` 加两个新的（11_H200, 12_MI308）✅ 成功
5. 想删旧的 09 或改 slug → 没有合法操作 ❌

## 关键时序

Bug 发生在**初始 HITL1 建 topic 阶段**，不是 rerun。用户说"这种调整今后也会用到，我们其实没有 rerun，还是开始讨论 seed topic 的过程中"。所以 `mutate_layout` 被 rerun 独占不是问题所在——问题在于 HITL1 本身缺少 topic 删除/重排/改 slug 的能力。

## 建议修复

在 hitl1 context 增加：
1. 一个 `remove_topic` action（接受 topic_uid，删除 topic 及其 seed 文件）
2. 或让 `update_intent` 允许修改 `slug_stem`（配合后续 slug 重算）
3. 或允许 HITL1 阶段的 `mutate_layout` 子集（至少 `remove_topic_uids` + 重排）

## 绕过方案（当前最终采用）

由于 HITL1/seed-topics 均无合法删除/重排路由，最终采用**直接编辑控制文件和种子文件**绕过：

1. 手动编辑 `rb_plan.md` frontmatter `topic_registry`：删除废弃 topic entry，重编其余 topic 的 id/slug
2. 手动删除 `seed_topics/09_h200-mi308-baseline.md`，重命名其他 seed 文件
3. 手动更新每个 seed 文件的 frontmatter（id, slug）

这导致 `rb_plan.md` 的 `plan_sha256` 与 engine 绑定的 checkpoint hash 不一致，且 canonical topic-state checker 报告 `seed_mismatch`。**目前已知影响**：
- `setup-ready` gate 重跑一次后 checkpoint 重新绑定可消解 hash 漂移
- `seed_mismatch` blocker 可能阻塞后续 gate，仍需在 seed-topics phase 内解决
- 如果 engine 的 canonical binding 检查比较的是 `topic_uid` 而非 `slug`/文件名，则绑定仍可维持

## 补充发现（seed-topics phase）

即使离开 HITL1 进入 seed-topics phase，`seed_topics:enrich_seed` action 也只能 enrich 现有 seed，不能增删 topic 或重排。所以「删除 topic + 重排」在任何非 rerun phase 都没有合法路径。

---

# 修复计划（研究/规划轮产出，落地走 OpenSpec）

> 状态：调查完成、方案已盘定，**尚未 propose**。落地必须走 `/opsx:propose` → `/opsx:apply`（本节只是 change 的输入底稿）。本节写作时未改动任何 `DEEP_RESEARCH_HARNESS/` 代码。

## 1. 根因：三层锁死，而布局变更的安全机器早已存在

「HITL1 无法删除/重排/改 slug」不是缺少实现，而是同一台已被 rerun 实战检验的机器被三层挡在 HITL1 之外：

| 层 | 位置 | 现状 |
|---|---|---|
| Schema 层 | `engine/helpers/topic-state-plan-schema.mjs:98` `LayoutPlanSchema.context: z.literal('rerun')` | `context: 'hitl1'` 的 `mutate_layout` 在 Zod parse 即被拒（`input_invalid`），根本走不到 lifecycle 检查 |
| 授权层 | `engine/helpers/canonical-topic-state.mjs` `lifecycleAuthorization` | hitl1 分支**已经就绪**（`phase-hitl1.md` + `hitl1_recorded → setup_ready` window）；且 apply 的全部护栏——`expected_plan_sha256` CAS（:419）、`safeRemoveBlocker`（:448）、`activeTopicWork`（:453）、seed target 安全检查（:455-469）、原子 workspace + `cleanup_files`（:526-586）——全部 context 无关 |
| 规格层 | accepted spec `openspec/specs/research/canonical-topic-state/spec.md:219` | 明文 "`set_rerun_direction` and `mutate_layout` SHALL be authorized only in a sanctioned normal or post-final rerun context"；playbook `command_playbook/operate-topic-state.md:30` 与 `phase-rerun.md` 同样写 rerun-only |

关键事实：`buildTopicLayoutTarget`（`engine/helpers/topic-layout.mjs:237`）已实现完整 target 的 rename/reorder/renumber/safe-remove，含 UID 全覆盖校验、入边依赖检查、slug 碰撞检查、`previous_layouts` 血统；`safeRemoveBlocker`（`engine/helpers/topic-state-inspect.mjs:78`）已实现 queue/work-unit/ledger/artifact/reference 历史任一存在即拒绝 remove。

**HITL1 恰是布局变更最安全的时机**：topic 刚建，不存在 queue/work-unit/artifact/reference 历史，safe-remove 护栏天然通过。把这套机器锁在 rerun 反而把用户逼向「直接编辑控制文件 + 种子文件」（即本文上述绕过方案），破坏 `plan_sha256` 绑定（`engine/helpers/handoff-helpers.mjs:711` 要求 checkpoint/trace/当前 rb_plan.md 三方 hash 一致）并触发 `seed_mismatch`。

## 2. 方案比较与推荐

| 方案 | 判断 | 理由 |
|---|---|---|
| A. hitl1 新增 `remove_topic` action | ❌ 否决 | 制造第二条布局变更路径，重复 safe-remove/原子提交逻辑；重排/改 slug 仍无解；schema+engine+测试面更大 |
| B. `update_intent` 允许改 `slug_stem` | ❌ 否决 | spec 明文 "existing id/slug MAY change only through `mutate_layout`"（canonical-topic-state spec：input requirement）；slug = ordinal+stem 是派生物，改它必然牵动 seed 文件名与重排——本质是把 layout mutation 走私进 action 语义 |
| **C. 把 `mutate_layout` 的合法 window 扩到 HITL1（推荐）** | ✅ | 保持「one complete `mutate_layout` target」是唯一布局操作不变；target 形状、护栏、原子性与 rerun 完全一致；代码改动最小；`schema --context hitl1` 投影自动跟随 Zod schema 自更新 |

细化决策：**不做 hitl1 "subset"**（如只允许 remove+reorder、禁 rename）。context 相关的字段级差异会放大 schema/文档/测试复杂度，而改 slug_stem（rename）正是本 bug 诉求之一（`09_h200-mi308-baseline` 误导性名称）。统一完整语义，window 才是权限边界——这是本项目「Context and human-directed are not mutation authority，lifecycle window 才是」既有原则的直接延伸。

## 3. 落地改动清单（供 propose 转写为 tasks）

### 3a. 引擎（仅 `/opsx:apply` 期修改）

1. `engine/helpers/topic-state-plan-schema.mjs`：`LayoutPlanSchema.context` 由 `z.literal('rerun')` 改为 `z.enum(['hitl1', 'rerun'])`。
2. `engine/helpers/topic-state-inspect.mjs:259`：`layout_baseline.context` 现硬编码 `'rerun'`；改为按当前 lifecycle 事实派生（hitl1 window 谓词与 `lifecycleAuthorization` 一致 → `'hitl1'`，否则 `'rerun'`），使 copy-ready baseline 在 HITL1 内开箱即用。**已定案（Q1）**：副作用核查通过——`.context` 在 engine/gate 无分支消费（仅作为 apply 输入过 Zod），授权由 apply 时实时读 `rb_status.json` 决定，模板字段不产生权限；现有测试只断言 `.topics` 不锚定 `.context`；唯一工程注意点：`rb_status.json` 缺失/不可读时 inspect 必须 fallback `'rerun'`，不得崩（inspect 保持 read-only、确定性）。
3. **预期零改动**：`lifecycleAuthorization` hitl1 分支、`buildTopicLayoutTarget`、`safeRemoveBlocker`、原子提交/recover、`registry_length_changed → style_projection` handoff（该 handoff 的 spec scenario 本就写明 "in a legal HITL1 or rerun window"）。propose 时逐条核对确认。

### 3b. 规格 delta（propose 产出）

- `research/canonical-topic-state/spec.md`：
  - Requirement "Sanctioned lifecycle windows SHALL authorize every canonical topic mutation"（:205）：把 :219 的 rerun-only 表述拆开——`set_rerun_direction` 保持 rerun-only；`mutate_layout` 合法 window = sanctioned rerun **或** legal HITL1 pre-gate window（`phase-hitl1.md` + `hitl1_recorded → setup_ready`）。
  - 新增 scenario：HITL1 window 内完整 layout target 被 apply 接受，subject to 同一套 safe-remove/quiescence/hash-CAS 检查；HITL1 输入不涉 direction。
  - Requirement "Layout mutation and post-final reentry SHALL stay bounded sanctioned operations"（:559）：:561 "one complete sanctioned-rerun target" 措辞扩展。
- `research/pre-research-phase-content/spec.md`（HITL1 phase 内容 owner，propose 时确认归属）：HITL1 阶段指引补「首次 apply 后用户再调整结构（拆分/删除/重排/改名）→ 同 window 内用完整 `mutate_layout` target」。
- propose 时核对 `workflow/rerun-incremental-node`、`workflow/workflow-node-contract` 是否残留 rerun-only 措辞需同步。

### 3c. 文档（apply 期）

- `command_playbook/operate-topic-state.md:30`：rename/reorder/renumber/safe-remove 场景从 "during sanctioned rerun" 扩为 "during the legal HITL1 window or sanctioned rerun"。
- `workflows/nodes/phases/phase-hitl1.md` §3a：补结构再调整路由；明确禁止 direct-edit `rb_plan.md`/seed（本 bug 的绕过方案在修复后作废）。
- `COMMANDS.md` `operate-topic-state` 行同步。

### 3d. 测试（apply 期，`tests/` 下，复用现有 fixture 模式）

- `tests/integration/cli/operate-topic-state-hitl1-readiness.test.mjs`（或新文件）：hitl1 window 内混合 remove+renumber+rename 的 `mutate_layout` committed；被删 seed 文件消失（cleanup_files）；`expected_plan_sha256` 不符 → `plan_hash_mismatch`；伪造 reference 历史 → `remove_has_history`；window 外 → `hitl1_not_authorized`；`schema --context hitl1` 出现 mutate_layout form。
- `tests/engine/helpers/canonical-topic-state.test.mjs`：buildMutation/layout 单元扩展。

## 4. 安全论证

- **授权不变**：window 仍由 `rb_status.json` lifecycle facts 决定，caller 声明的 context 不创造权限（既有 spec 原则）。
- **护栏全保留**：入边依赖、queue/work-unit/ledger/artifact/reference 历史、active work、slug 碰撞、hash CAS、prepared manifest 原子提交 + exact recover。崩溃不留半提交。
- **HITL1 特有安全性**：无历史可破坏——这是全生命周期里 remove 风险最低的 window。
- **style 一致性**：remove/拆分改变 registry length → 既有 `style_projection` handoff 自动要求重跑 `apply-research-style.mjs`（checkpoint 映射 `hitl1` → `hitl1-recorded`，`styleProjectionCheckpoint` 已 context-aware）。
- **hash 绑定天然兼容**：HITL1 布局变更发生在 setup-ready gate 绑定 `plan_sha256` 之前，gate 会绑定变更后的最新 plan；不再出现绕过方案的三方 hash 漂移。

## 5. 明确 out of scope

- **seed_topics phase 的增删/重排**（bug「补充发现」）：by design。彼时 topic 已绑 queue/work-unit，结构变更的正确位置是 sanctioned rerun 或起新 bundle；这正是 `safeRemoveBlocker` 存在的意义。若未来有真实场景，另立 change。
- 已研究 topic 的原地 retire（仍 = 起新 bundle，既有结论不变）。
- path move（历史路径原位，既有结论不变）。

## 6. OpenSpec 落地路线

1. `/opsx:propose`：change 名建议 `extend-mutate-layout-to-hitl1`；产出 proposal、上述 spec deltas、design（记录本节方案比较）、tasks。
2. `/opsx:apply`：按 tasks 修改 `DEEP_RESEARCH_HARNESS/` + `tests/`。
3. 验证：`node --test` 选中套件 + verification routing；记录结果。
4. `/opsx:archive`。

## 7. 决议记录（用户已确认）

- **Q1 定案**：`inspect` 的 `layout_baseline.context` 按 lifecycle window 派生（hitl1 window → `'hitl1'`，含 `rb_status.json` 不可读时 fallback `'rerun'`）。副作用核查见 §3a-2。
- **Q2 定案**：seed_topics 阶段结构调整确认 **out of scope**（§5 维持）。
- **Q3 定案**：立即开 OpenSpec change（`/opsx:propose`），本文件作为输入底稿。