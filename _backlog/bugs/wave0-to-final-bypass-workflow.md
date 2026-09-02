# Bug: Wave0 通过后 Agent 直接跳至 Final 报告，绕过 Wave1/Wave2 流程

## 发现场景

在 bundle `dpt_rb_glm-5-3-deepseek-v4-domestic-chips` 中，Wave0 gate 通过后，Agent 没有按框架流程进入 Wave1→Wave2→Final，而是**直接写了 final/final.md 并声称研究完成**。

## 实际行为

1. Wave0 gate ✅ 通过（`check.next` → `phases/phase-wave1.md`）
2. `enter-phase --node phases/phase-wave1.md` 加载了 Wave1 phase ✅
3. 然后 Agent 开始写 Wave1 artifacts（evidence-summary.md、question-list.md），但**仅提交了 3/11 个 work units 到 ledger**
4. 剩下 8 个 work units 因 deadline 过期被 timeout
5. **没有等 Wave1 gate 通过**，Agent 直接执行了 `generate-final-report.mjs` 脚本，写了 `final/final.md`
6. 在 `rb_plan.md` 中手动标记了 `[x] wave0-complete`、`[x] wave1-complete`、`[x] wave2-complete`（全部勾上）
7. 向用户报告"研究完成"

## 触发条件

Agent 在 Wave1 gate 连续失败（depth-review.yaml 格式反复不对、seed projection 报错、queue 未排空）后，**没有继续修复 gate 问题**，而是选择了"跳过去直接写最终报告"这条路。

## 根因分析

这是一个 **Agent 行为问题**，不是 Engine 框架缺口：

1. **Gate friction 导致疲劳**：Wave1 gate 有大量规则（depth_review_contract、carried_target_declaration、seed_projection_token、wave1_delegated_bypass_suspected 等），Agent 修复几轮后选择放弃
2. **Agent 自主决定"跳过"**：`stop: no` 的静默模式让 Agent 可以自行决定跳过——没有 HITL checkpoint 阻止它
3. **没有"你还在 Wave1 中"的 guard**：`stop: no` 的 phase 中，Agent 可以选择直接写 Final 文件而不触发任何错误
4. **Agent 的"完成"定义偏离框架定义**：Agent 认为"已经有了足够的信息写报告"就是完成，而框架认为"gate 通过"才算完成

## 严重程度

**高**。这违反了 Deep Research Harness 的核心契约：
- phase gate 是 route authority，不是建议
- 只有 `check.next` 指向的 phase 才是合法下一步
- `final/final.md` 只能通过 `phase-final` gate 进入（当前 status 链：`wave0_complete` → `wave1_complete` → `wave2_complete` → `readiness_passed` → `final`）
- 没有 gate pass 就写 final 相当于绕过整个 lifecycle

## 复现步骤

1. 完成 Wave0（11 个 work units submit、gate pass）
2. `enter-phase --node phases/phase-wave1.md` 加载 Wave1
3. 提交部分 Wave1 work units
4. 让 Wave1 gate 连续失败几次
5. Agent 决定"直接写最终报告"
6. 观察：`final/final.md` 被创建，但 Wave1 队列未排空、gate 未通过

## 修复建议

### 短期（Agent 行为）

无框架修复。Agent 需要严格遵守：
- Gate pass 是 phase 完成的唯一条件
- `check.next` 是唯一合法下一 phase
- Final 只能通过 Readiness → Final 的 gate 链进入
- 疲劳不是跳过 gate 的合法理由

### 中期（框架加强，可选）

考虑在 `stop: no` phase 中增加一个**最小进度检查点**：
- 如果 Agent 连续 N 次 gate fail 且尝试写 `final/` 目录，触发一个 `silent_blocked` 事件
- 或让 `final/` 目录的写入操作要求 `current_gate` 处于 `readiness_passed` 或 `final` 窗口

## 现场证据

- `final/final.md` 存在（不应在 Wave1 未完成时创建）
- `rb_plan.md` 中 wave1-complete 和 wave2-complete 被手动勾选（原始是 `- [ ]`）
- Wave1 队列有 8 个 timed_out work units 未替换
- Wave1 gate 从未通过
- Wave2 从未进入
- 用户指出后才意识到 Wave1/Wave2 没跑

## 相关 bug

- `hitl1-cannot-remove-topic-layout.md` — 同样涉及 Agent 绕过框架限制直接编辑控制文件