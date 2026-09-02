# Tasks: extend-mutate-layout-to-hitl1

- [x] 5.3 openspec-feedback:plan-review — apply 前整 change 评审已在 polish 轮完成（Pass 1 whole-change coherence + Pass 2 风险导向），3 处发现（拆分流 forms 不混用两步语义、inspect 谓词内联约束、task 2.1 两步拆分覆盖）已同轮修复进 artifacts；semantic-closure 的 fragment/consumer 语义已核（`applyCanonicalTopicState`/`inspectCanonicalTopicState` 为真实导出符号，`LayoutPlanSchema` 模块私有故用 bare coordinate；consumers 为真实 verdict consumers）。Done when：评审发现全部落为 artifact 修复且无遗留 open finding。

## 1. Engine contract（CTS-004, CTS-006）

- [x] 1.1 @impl CTS-004, CTS-006 将 `DEEP_RESEARCH_HARNESS/engine/helpers/topic-state-plan-schema.mjs` 的 `LayoutPlanSchema.context` 由 `z.literal('rerun')` 改为 `z.enum(['hitl1', 'rerun'])`。Done when：`node --test tests/engine/helpers/canonical-topic-state.test.mjs` 全绿，且既有 `describeTopicApplyPlanSchema` 投影测试不回归（schema --context 投影从真实 schema 派生，无第二投影需要改）。
- [x] 1.2 @impl CTS-006 将 `DEEP_RESEARCH_HARNESS/engine/helpers/topic-state-inspect.mjs` `layout_baseline.context` 改为按当前 lifecycle window 派生（hitl1 window 谓词与 `lifecycleAuthorization` hitl1 分支一致 → `'hitl1'`；否则 `'rerun'`；`rb_status.json` 缺失/不可读时 try/catch fallback `'rerun'`，inspect 保持 read-only、确定性）。谓词必须在 `topic-state-inspect.mjs` 内内联实现（直接读 `rb_status.json`），不得反向 import `canonical-topic-state.mjs`（后者 import 本模块，反向成环）。Done when：单元断言覆盖三种派生分支且既有 inspect 断言（`.topics`/`plan_sha256`）不回归。
- [x] 1.3 @impl CTS-004, CTS-006 核对 design D2 的零改动预期：`lifecycleAuthorization` hitl1 分支、`buildTopicLayoutTarget`、`safeRemoveBlocker`、`activeTopicWork`、hash CAS、seed target 安全检查、prepared/recover、`registry_length_changed → style_projection` handoff（`styleProjectionCheckpoint('hitl1')`）在 `context: 'hitl1'` 的 mutate_layout 输入下逐条走读确认。Done when：走读记录完成；若任何一处出现 rerun 专属分支，停止并把它登记为本文件新增未完成 task（不得顺手改）。

## 2. Tests（verification-plan claims）

- [x] 2.1 @impl CTS-004, CTS-006 扩展 `tests/integration/cli/operate-topic-state-hitl1-readiness.test.mjs`：合法 HITL1 window（`new-disposable-bundle` + `advance-status --to hitl1_recorded`）内提交混合 remove+rename+reorder 的完整 `mutate_layout` target，断言 `verdict: committed`、registry 连续重编号、被移除 topic 的 seed 文件被 cleanup、`previous_layouts` 血统与 plan Topic Registry 表刷新；并覆盖 bug 现场的两步拆分流——先 `add_topic` change set，再 fresh inspect 取新 `expected_plan_sha256` 后以 layout target remove 旧 UID（apply forms 不混用）。对应 claim `hitl1-layout-target-commits`。Done when：新增用例经 production CLI 进程通过且失败注入（临时改坏断言）可见红。
- [x] 2.2 @impl CTS-004 扩展同文件护栏用例：过期 `expected_plan_sha256` → `plan_hash_mismatch`；植入 `reference/` 历史文件后 remove → `remove_has_history`；window 外（gate pass 后）提交 → `hitl1_not_authorized`；三种拒绝后断言 plan/seed/status/trace 字节不变且无 accepted workspace。对应 claim `hitl1-layout-guards-fail-closed`。Done when：三个拒绝分支各有独立断言且 exit code 契约（1）成立。
- [x] 2.3 @impl CTS-006 扩展同文件：inspect 在 hitl1 window 返回 `layout_baseline.context: 'hitl1'`、rerun window 返回 `'rerun'`、删除/破坏 `rb_status.json` 后 fallback `'rerun'` 不崩溃；`schema --context hitl1` 返回可被真实 schema 接受的 mutate_layout form/template 且不含 direction。对应 claims `inspect-baseline-context-derives-window`、`hitl1-schema-projection-exposes-layout-form`。Done when：用例通过且 rerun window 行为与改动前一致。
- [x] 2.4 @impl CTS-004, CTS-006 扩展 `tests/engine/helpers/canonical-topic-state.test.mjs`：helper 层 hitl1 授权路径 mutate_layout 与 rerun 路径同规则（含 remove blocker 与 unchanged 判定），保留既有 rerun/crash/recover 回归。对应 claim `canonical-topic-state-unit-regression`。Done when：`node --test tests/engine/helpers/canonical-topic-state.test.mjs` 全绿。

## 3. Guidance surfaces（CTS-004, PRP-011）

- [x] 3.1 @impl PRP-011 更新 `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-hitl1.md` §3a：首次 apply 后用户再调整结构（拆分/删除/重排/改 slug）→ 同 window 内基于 inspect baseline 提交一个完整 `mutate_layout` target；user 拥有 title/order/remove 语义、Agent 拥有机械化 target/retained input、Engine 拥有护栏与原子性；registry length 变化后消费返回的 `style_projection` handoff 再跑 gate；显式封禁 direct-edit `rb_plan.md`/seed 与「废弃占位」绕过。Done when：§3a 措辞与 delta spec scenario 一致且不与 §3b/§3c/§3d 顺序冲突。
- [x] 3.2 @impl CTS-004 更新 `DEEP_RESEARCH_HARNESS/command_playbook/operate-topic-state.md`（rename/reorder/renumber/safe-remove 合法 surface 扩为 legal HITL1 window 或 sanctioned rerun）与 `DEEP_RESEARCH_HARNESS/COMMANDS.md` 的 `operate-topic-state` 行。Done when：两文件措辞互洽、与 accepted delta 无矛盾、无 rerun-only 残留。
- [x] 3.3 @impl CTS-004 扩展 `tests/integration/md/canonical-topic-state-contract.test.mjs`：锁定 phase-hitl1.md 布局路由（match 完整 target 路由、doesNotMatch direct-edit 指令）与 operate-topic-state.md/COMMANDS.md 的 HITL1 surface 措辞。对应 claim `guidance-surfaces-lock-hitl1-layout-path`。Done when：MD 契约测试通过且对三处指引面的删除具有红变绿验证。

## 4. Selected verification evidence

- [x] 4.1 运行 `node --test tests/integration/cli/operate-topic-state-hitl1-readiness.test.mjs tests/integration/cli/operate-topic-state.test.mjs tests/integration/cli/operate-topic-state-direction.test.mjs tests/engine/helpers/canonical-topic-state.test.mjs tests/integration/md/canonical-topic-state-contract.test.mjs`，并补跑 `tests/e2e/rerun-round-continuity.test.mjs`、`tests/e2e/post-final-rerun-lineage-continuity.test.mjs` 证明既有 layout_baseline 消费方不回归。Done when：全部选中套件原生 `node:test` 通过且结果记录于本 task 勾选备注。
- [x] 4.2 运行 `node openspec/governance/check-verification-routing.mjs --change extend-mutate-layout-to-hitl1 --mode assets`。Done when：输出 valid 且 claim 数量与 verification-plan.yaml 一致（6 claims）。

## 5. Closeout（归档前硬性检查）

- [x] 5.1 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change extend-mutate-layout-to-hitl1` 必须 PASS（0 duplicate / 0 orphan / 0 unregistered / 0 reusedRetired）。Done when：命令 exit 0 并记录输出。
- [x] 5.2 运行 `node openspec/governance/check-project-specs.mjs` 必须 PASS（0 deltaHeaderInMain / 0 missingPurpose / 0 missingRequirements / 0 missingReqHeader）。Done when：命令 exit 0 并记录输出。
- [x] 5.4 openspec-feedback:closeout-review — 归档前 closeout 评审：①划定 change-scoped diff 边界（`git status` 对照本 change 文件清单，无关 worktree 变更不入评审）；②Agent-owned spec sync 完成后逐 capability 重比对 delta/main 等价（已程序化验证 3 MODIFIED + 1 ADDED 逐块一致）；③按实际 diff 重估 semantic-closure.yaml 的 fact/resolver/established_by/consumers/overlap 与 fragment 真实性；④`npm test` 全量 exit 0（finalizer 机械前置）。Done when：①-④全部通过且无 open finding，方可勾选并运行 finalizer。
- [x] 5.5 修复 closeout 评审暴露的两处回归红：①`tests/engine/cts-slim-structure-locks.test.mjs` 逐字冻结主 spec 块的 stale lock —— 改为组合已记录 deltas（slim-cts ADDED ⊕ extend-mutate-layout-to-hitl1 MODIFIED，active/archive 双路径解析），scenario 计数从组合块推导（5/5 绿）；②HEAD 既有 `validate-work-unit-hygiene.mjs` 对 `_backlog/plans` 历史文档中已退役家族枚举的误报 —— 经用户批准在其 `isAllowedOccurrence` 增加行级 `historical-plan-family-enumeration` 允许类（validator passed、exit-code 套件 33/33）。Done when：两处修复对应套件全绿且全量 `npm test` exit 0。
