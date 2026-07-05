# BUG-035: 每个 relay-based phase 重复同一失败模式——wave0/1/2 三连卡

## 严重程度
P0 — BUG-034 的乘法效应。不只 wave0 过不去——所有 relay-based phase（wave0、wave1、wave2）共享同一套 relay→ledger→gate 基础设施，每一个都会在同一个地方卡死。

## 复现预测
当前 session 进入 wave1 后，预期路径：
1. Phase Agent 灌料（5 个 evidence-extractor task cards）
2. 需要 `drive-relay-slot stage` → spawn sub-agents → commit → complete → ledger
3. 与 wave0 完全相同的 5+ 步骤链
4. 每一步都有相同的脆弱点（runtime-receipt 格式、slot status 状态机、slot_result_ref 映射、ledger append）
5. **注定失败**——除非 Phase Agent 把 wave0 中学到的所有 workaround 再手动操作一遍

## 根因

### BUG-034 是单点故障，BUG-035 是系统性的模式重复

BUG-034 描述的是"wave0 gate 需要 5 个步骤全部完美成功"。BUG-035 说的是这个链条在 **每个 wave 中都是 identically re-instantiated**：

| 组件 | Wave0 | Wave1 | Wave2 |
|------|-------|-------|-------|
| relay stage | ✓ | ✓ | ✓ |
| sub-agent spawn | ✓ | ✓ | ✓ |
| runtime-receipt 格式 | 相同要求 | 相同要求 | 相同要求 |
| slot status 状态机 | 相同 | 相同 | 相同 |
| drive-relay-slot commit | 相同 | 相同 | 相同 |
| operate-queue complete | 相同 | 相同 | 相同 |
| ledger append | 相同 | 相同 | 相同 |
| gate countReferences(ledger) | 相同 | 相同 | 相同 |

**没有任何学习效应**——Phase Agent 在 wave0 中花了 12 次 gate attempt 学会的所有 workaround（手动修 runtime-receipt 格式、手动重置 slot status、手动建 ledger、手动创建 cache 文件、手动匹配 meta.json.url），在 wave1 中需要**全部重新执行一遍**。

### 为什么没有复用

1. **Ledger 是 append-only 但 gate 只认当前 wave 的声明**——wave0 的 ledger entries 不能帮助 wave1 gate pass
2. **Relay slots 是 per-wave 的**——`_subagents/wave_00/` vs `_subagents/wave_01/`——不能复用
3. **Queue tasks 是 per-wave per-topic 的**——每次灌料都是全新的 work_id
4. **没有"已知通过"的快速通道**——即使 Phase Agent 刚刚证明了自己能在 wave0 中收集 50+ refs，wave1 gate 仍然要求完整的 relay provenance 链

### 对 Phase Agent 的激励

这个系统创造了一个**反常激励**：Phase Agent 面对 wave1 时有两种选择：
- **A**：走完整 relay pipeline → 预计 10+ gate attempt，每个都需要手动修复 runtime-receipt/slot status/ledger/cache
- **B**：绕过去，直接写 evidence-summary.md → 违反 `relay_required` 但能快速产出用户要的结果

BUG-033（跳到 final）就是选择了 B。如果每个 phase 都需要 12 次 gate attempt，Agent 自然会寻找绕过路径。

## 与现有 BUG 的关系

```
BUG-035（这个）—— 跨 wave 模式重复
  ├─ 源自 BUG-034 —— 单 wave 的 relay→ledger→gate 链脆弱
  ├─ 放大 BUG-031 —— 每个 wave 都要停（不只是 wave0）
  ├─ 放大 BUG-032 —— 每个 wave 都要面对 relay commit 失败
  └─ 放大 BUG-033 —— 每个 wave 都产生绕过 incentive
```

## 修复方向

1. **短期——Phase Agent 记忆**：Phase Agent 在 wave0 中成功应用的 workaround 序列应被记录为 bundle-level 的 "known fixes"，wave1/2 自动应用
2. **中期——shared relay infrastructure**：多个 waves 是否可以共享同一套 relay slot 结果？如果 wave0 sub-agent 已经搜索了所有 topic，wave1 agent 是否可以复用这些搜索而不是重新跑？
3. **中期——ledger 生命周期**：ledger 是否应该是 cumulative 的（所有 waves）而不是 per-wave？gate 是否可以检查"该 wave 或之前 waves 的 ledger entries"？
4. **长期——消除重复**：如果 wave0→wave1→wave2 的模式是"用同一套 source 做越来越深层的分析"，那为什么需要三套完全独立的 relay pipeline？能否合并为一个统一的分析 pipeline？
5. **长期——lightweight execution mode**：当 Phase Agent 已经在 main-agent context 中拥有所有需要的 evidence 时（当前 session 就是如此——Agent 读了所有 sub-agent 结果），是否允许 Phase Agent 直接写 evidence-summary 而不是强制 relay delegation？
