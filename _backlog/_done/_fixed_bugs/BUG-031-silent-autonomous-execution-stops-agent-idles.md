# BUG-031: 自主静默长程执行失败——Agent 在 stop:no phase 停止并等待用户干预

## 严重程度
P0 — 违反 DPT_FRAMEWORK 最核心的执行契约（静默自主阶段绝不浮出水面），导致整个 autonomous pipeline 的可靠性归零

## 复现场景
2026-07-06，us-iran-conflict-situation run bundle：
- HITL1 完成后进入静默阶段（setup → seed-topics → wave0，全部 `stop: no`）
- Agent 在 wave0 spawn 了 4 个 background relay sub-agents 后**停止**
- 用户必须说"继续"才能恢复执行（发生了 2 次）
- 第二次停止在 wave0 gate fail 后——Agent 等待用户输入而不是自主进入 §3.3.1 Count-Floor Re-Fill Loop

## 根因分析

### 直接原因
1. **ScheduleWakeup 不可用**：Agent 在 spawn sub-agents 后尝试 `ScheduleWakeup(delaySeconds=120)` 来等待完成，但被拒绝——"/loop dynamic runtime gate is off"。Agent 没有其他机制能"等待并自动恢复"
2. **Agent 在 stop:no phase 末尾停止**：当 Agent 的 turn 没有更多立即可执行的同步工作时，它自然结束 turn，不会自动触发下一个 turn。`stop: no` 是用 MD 写的契约，没有任何 runtime 机制强迫 Agent 继续
3. **Sub-agent 完成通知 ≠ Phase Agent 自动恢复**：background agents 完成时系统发出 `<task-notification>`，但 Phase Agent 只在收到下一条用户消息时才看到这些通知。如果用户在睡觉，Phase Agent 永远停在那里

### 深层根因
- `stop: no` 是 human-readable contract，不是 machine-enforceable constraint
- DPT_FRAMEWORK 假设 Phase Agent 能在单个连续 turn 中跑完整个 phase，但 wave0 涉及 4 个独立的 5-8 分钟 web search sub-agent——总 wall-clock 时间远超单个 turn
- 当前的 background agent + notification 模型**解耦了执行和恢复**：sub-agent 完成时系统知道，但 Phase Agent 不知道（它需要下一条用户消息才醒来）
- `/loop` 机制被设计为面向用户的 recurring task scheduler，不是 autonomous phase 恢复机制

### 对比预期行为
- **预期**：Phase Agent spawn sub-agents → 静默等待 → 收到 completion notification → 自动恢复，commit slot → complete queue → rerun gate
- **实际**：Phase Agent spawn sub-agents → turn 结束 → 停止 → 用户必须输入"继续" → Phase Agent 才看到 notification → 手动恢复

## 证据

### rb_status.json 当前状态
```json
{"current_gate": "seed_topics_ready", "next_gate": "wave0_complete"}
```
系统仍认为在 seed-topics——wave0 gate 从未 pass，因为 Agent 在 gate fail 后停止了而不是自主进入 repair loop。

### run.log 证据
- 4 个 sub-agent 的 spawn 时间：16:49:20（stage 完成）
- Agent 第一次停止：约 16:50（ScheduleWakeup 被拒绝后）
- 用户"继续"消息：约 16:56
- Agent 第二次停止：约 17:02（gate fail 后没有立即进入 re-fill loop）
- 用户第二次"继续"：约 17:05

### 工具调用证据
- `ScheduleWakeup` 调用被拒绝：`Wakeup not scheduled. Either the /loop dynamic runtime gate is off or the loop reached its maximum duration`
- Agent 没有其他自动恢复机制可用

## 影响范围
- 整个 DPT_FRAMEWORK 的 autonomous execution model 在当前 relay/sub-agent 架构下是**不可实现的**——Agent 没有"等待 background work 完成后自动恢复"的能力
- 所有涉及 sub-agent 的 phase（wave0, wave1, wave2）都会遇到此问题
- 用户被要求"可以关闭终端"但实际上必须守在旁边输入"继续"

## 建议修复方向
1. **Runtime 层**：实现 sub-agent completion → auto-trigger Phase Agent 恢复的机制（CronCreate durable wakeup？hook-based auto-continue？）
2. **架构层**：允许 Phase Agent 在同一个 turn 中同步等待 sub-agent 结果（降低并发但保证连续性）
3. **契约层**：如果暂无法实现真正的 autonomous execution，更新 `stop: no` 文档为 `stop: conditional`——在有 pending sub-agent 时 Agent 可以暂时 idle 但应注明预期恢复方式
4. **短期方案**：Phase Agent 在 spawn sub-agents 前先 setup CronCreate 做 durable wakeup（120-300s 间隔轮询），确保即使 session 关闭也能恢复
