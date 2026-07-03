# BUG-019: Main Agent 在主上下文与 relay/gate 基础设施搏斗，违反搜索下沉 sub-agent 架构原则

**Reported**: 2026-07-03
**Severity**: P1（每次 wave0/wave1 必定触发；导致主 Agent SNR 崩溃、用户看到大量无意义基础设施操作）
**Status**: Open
**Bundle**: `dpt_rb_wocheng-info-china-unicom-subsidiary`
**Related**: [[BUG-014-phase-agent-bypasses-subagent-relay-regression]], [[BUG-015-wave-gate-quality-rules-too-strict]], [[BUG-018-wave0-repair-whack-a-mole-and-yaml-sanitization]]

---

## 0. 一句话核心诊断

**DPT_FRAMEWORK 设计原则是"搜索一律下沉 sub-agent，主 Agent 只做编排"。但单会话模式下 relay 管线（`subagent-relay.mjs`）无法完整走通 → Phase Agent 被迫在主上下文手动操作 queue fail/claim/complete、手动创建 relay slot 文件、手动拼接 `rb_output_declarations.jsonl`、反复运行 gate 并逐条修复 inspect/advice → 主 Agent 上下文被大量基础设施噪声污染，用户看到的是"卡住了，不知道在干什么"。**

## 1. 现象（用户视角）

1. **阶段 1**：Main Agent 调 `operate-queue claim` → spawn dpt-source-intake sub-agent → 搜索成功 → `operate-queue complete` 失败（要求 `slot_result_ref`）
2. **阶段 2**：Main Agent 调 `operate-queue fail` → 反复试不同命令 → 在 main context 里讨论"queue 陷入 relay 要求"
3. **阶段 3**：3 个并发 dpt-source-intake sub-agent 成功完成搜索（这是正确行为）
4. **阶段 4**：Main Agent 在主上下文创建 `_subagents/wave_00/slot_*/` 文件、写 `rb_output_declarations.jsonl`、修 slot status 从 `complete` 到 `done`、反复跑 `check-gate-wave0-complete.mjs` 并逐条修 inspect 项

**用户观察到的异常**："搜索行为发生在主 Agent 上就是错误，就是 BUG"、"老是在等什么，进步好艰难"

## 2. 根因分析

### 2a. Relay 引擎设计假设多进程架构

`subagent-relay.mjs` 的 `commitSlotResult()` 要求 slot object 具有 12 个必需字段（key, roleAgentKey, waveIndex, slotIndex, taskPath, schemaPath 等），这些字段由 `stageSubagentSlots()` 创建。完整的 relay 管线是：

```
stageSubagentSlots → recordAgentSpawnRequested → [独立进程 Sub-agent 执行] → ingestAgentReceipt → commitSlotResult → collectAndMergeSubagentResults
```

在 Claude Code 单会话模式下，没有独立的 Sub-agent 进程——Agent tool 调用共享同一个 session。relay 的 `commitSlotResult()` 无法接受手动构建的 slot object。

### 2b. Queue 的 delegated complete 强依赖 relay provenance

当 task card 的 `targets.delegates.to: "sub-agent"` 时，`operate-queue complete` 要求 `slot_result_ref`。没有通过 relay 管线 committed 的 slot result，queue 拒绝 complete。

这导致一个死锁：
- 搜索必须在 sub-agent 做（架构原则）
- Sub-agent 产出必须通过 relay provenance 验证（queue 要求）
- Relay 在多进程缺失时无法完成 provenance 验证（单会话限制）
- Phase Agent 被迫在主上下文绕过 relay（违反架构原则）

### 2c. Gate 的 provenance check 将 relay 缺失视为 bypass

`check-gate-wave0-complete.mjs` 检查以下 relay 相关项：
- `rb_output_declarations.jsonl` 存在且含合法 entry
- `_subagents/wave_00/` 目录存在
- 每个 slot 的 status 为 `done`
- 每个 slot 有合法的 runtime-receipt.jsonl
- 产出文件在 ledger 中已声明

这些检查在 relay 完整走通时自动满足。在单会话模式下，Phase Agent 被迫手动创建这些文件，导致一系列格式/状态不匹配。

## 3. 为什么这对用户体验致命

DPT_FRAMEWORK 的价值主张是"静默自主执行"——HITL1 后用户不需要看任何东西直到 HITL2。但当 Main Agent 在主上下文与基础设施搏斗时：

- 用户看到的是 queue fail/claim/complete 的原始 JSON 输出
- 用户看到 gate inspect 的逐条修复过程
- 用户看到 relay slot 文件的手动创建
- **这与"高信噪比"的设计承诺直接矛盾**

## 4. 建议修复方向

1. **Phase Agent 在单会话模式下不应尝试绕过 relay**：当 `targets.delegates` 存在但 relay 基础设施不可用时，Phase Agent 应记录 `silent_degradation` 并 fallback 到简化的非 relay 路径（使用 Agent tool spawn sub-agent → 收集结构化输出 → 直接写入 artifact 文件）
2. **Gate 应为非 relay 产出提供合法路径**：如果 source.yaml 文件存在、内容有效、来源真实，就不应因缺少 relay provenance 而拒绝
3. **Queue 的 delegated complete 应支持 Agent tool 输出作为替代 provenance**：Agent tool 调用的返回结果（含 output_files 声明）应作为合法的 slot_result_ref 等价物

---

## 5. 反思与修正（2026-07-03 第二轮分析）

### 5a. 不要假定执行模型

原始分析 §2a 将问题归因于"多进程 vs 单会话"的 mismatch。这是一个过度假定——我们不知道 Coding Agent 底层用的是进程、线程还是协程，也不应该猜测。relay 为什么走不通的原因不重要（可能是模型幻觉、可能是 infrastructure bug、可能是字段缺失），重要的是**走不通之后怎么办**。

### 5b. 真正的架构缺口：缺少 degradation 决策点

DPT_FRAMEWORK 的设计原则应该是：

> **优先 sub-agent，sub-agent 不行就 fallback 到 main Agent 直接执行。**

当前这个 fallback 路径不存在。当 sub-agent relay 管线走不通时，Phase Agent 没有"算了，主 Agent 直接干"的选项，而是试图在主上下文里手动重建 relay 的那些文件/声明/状态——这就是"infrastructure fight"。

关键的不是 relay/queue/gate 哪个组件有问题，而是**缺少一个明确的 degradation 决策点**：Phase Agent 应该能在运行时判断"sub-agent relay 这条路径走不通"，然后走简化路径：

```
Agent tool spawn sub-agent → 收集结构化输出 → 直接写 artifact 文件
```

不经过 relay provenance，gate 也接受这种产出。

### 5c. 三个修复方向的优先级重新评估

在原分析的方向 1/2/3 中：

- **方向 1（silent degradation + fallback）是优先级最高的**——它不需要改 relay/queue/gate 的现有逻辑，只需要在 Phase Agent 层面加一个"检测 + 降级"的决策。relay/queue/gate 在 sub-agent 路径走通时都是合理的设计，不需要推翻。
- 方向 2 和 3 可以让 fallback 路径更顺畅，但不是必须先做的——fallback 路径即使粗糙，也比"在主上下文 infrastructure fight"好一个数量级。

### 5d. 值得进一步确认的问题

1. Phase Agent 在什么时候应该判定"relay 走不通"？尝试 N 次失败后？特定错误类型？
2. fallback 路径产出的 artifact 质量是否与 relay 路径等价？gate 应该如何区分对待？
3. degradation 应该记录在哪里（run.log？silent_degradation 标记？）以便后续诊断 relay 本身的问题？
