## 1. Engine 修复（handoff-helpers.mjs）

- [x] 1.1 修改 `DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs` 的 `classifyPostFinalProfile`：`currentCount` 在 profile 缺 `hitl2.rerun_count` 时按 `guard.current_count` 解释（`?? guard.current_count`），使计数窗口检查（`[guard.current_count, guard.next_count].includes(currentCount)`）对 legacy profile 可满足。
- [x] 1.2 修改同一函数的 comparable JSON 检查：仅当 `Object.hasOwn(accepted.human_decision_checkpoints.hitl2, 'rerun_count')` 时才把 `rerun_count` 写回 comparable；legacy 事件（语义缺键）下 comparable 键集合与 accepted 一致，全等比较可满足。
- [x] 1.3 复核 `inspectPostFinalHandoffStage` 调用点：legacy profile 在 `profileClass.ok` 为 true 后应落到 `synchronized_initial_profile` + topic_state owner；确认无需改动 stage 分派逻辑。

## 2. 测试

- [x] 2.1 在 `tests/engine/helpers/post-final-recovery.test.mjs`（或新建 `tests/engine/helpers/handoff-legacy-rerun.test.mjs`）新增 engine 层用例：构造缺 `rerun_count` 键的 profile + 缺键事件语义 + guard（current_count 0 / next_count 1），断言 `classifyPostFinalProfile` 返回 ok、count 为 `current`；再断言带键 profile 走原路径结果不变。
- [x] 2.2 在 `tests/integration/cli/post-final-recovery.test.mjs` 新增 integration 用例：用 `createTerminalFinalBundle` 建 bundle 后删除 profile 的 `hitl2.rerun_count` 键，走 apply → enter-phase → advance-status → `applyCanonicalTopicState`（context rerun），断言 `verdict: committed`（legacy 全链路）。
- [x] 2.3 运行相关测试套件确认全绿：`tests/engine/helpers/post-final-recovery.test.mjs`、`tests/integration/cli/post-final-recovery.test.mjs`、`tests/integration/cli/post-final-lineage-consumers.test.mjs`、`tests/e2e/post-final-rerun-lineage-continuity.test.mjs`（带键路径逐字节不变）。

## 3. 验证与收尾

- [x] 3.1 对真实 bundle `dpt_rb_ai-coding-evolution` 复跑 `node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs apply --bundle dpt_rb_ai-coding-evolution --input dpt_rb_ai-coding-evolution/_scripts/topic-rerun-candidates.json`，确认不再 `rerun_not_authorized` 且 `verdict: committed`。
- [x] 3.2 运行 `node openspec/governance/check-project-reqs.mjs --mode plan`（如 delta 涉及 req）与 `node openspec/governance/check-semantic-closure.mjs --change fix-post-final-rerun-legacy-profile --mode plan` 确认 governance 通过。
- [x] 3.3 `openspec validate fix-post-final-rerun-legacy-profile --type change` 通过后，按 `/openspec-archive-change` 流程归档 change。
- [x] 3.4 openspec-feedback:plan-review — 完成 change 范围评审：proposal/specs/design/tasks/verification-plan/semantic-closure 整体一致性（legacy 缺失 count 的判定与既有 evaluateRerunAvailability 缺失=0 语义一致；verification 只证明确定性分类器与 CLI 边界，不声称 Agent 行为）；语义闭包记录 `lifecycle.gate-status-trace-handoff` 的 fact/resolver/consumers/overlap 覆盖本次改动的 `classifyPostFinalProfile` 表面。
- [x] 3.5 openspec-feedback:closeout-review — 完成 closeout 评审：实际 diff 仅 `classifyPostFinalProfile` 一个函数（缺失 count 按 guard.current_count 解释 + legacy 事件下 comparable 剥离该键）；delta/main spec 已 Agent 同步并 re-comparison（3 个 Legacy scenario 已在 main spec，82 specs 校验通过）；43 个回归测试全绿且真实 bundle 全链路走通；无遗留 open finding。
