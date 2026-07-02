# Hooks 延后决策

> 状态: 延后 | 创建: 2026-06-16 | 更新: 2026-06-25

V12 定义了 6 个 Boundary Hook。它们属于 `workflows/`（执行流程），不是 `schema/`（数据类型）。

## V12 的 6 个 Hook

| Hook | 触发点 | 依赖 |
|------|--------|------|
| hook_setup_to_wave0_start | setup_ready → Wave 0 | Gate 转换表 ✅ |
| hook_wave0_closeout_to_wave1_start | Wave 0 → Wave 1 | Gate 转换表 + 共享参考清单 |
| hook_wave1_topic_fanin_steering | Topic 参考数变更 | Gate 转换表 + Topic 回填 |
| hook_wave1_closeout_to_wave2_start | Wave 1 → Wave 2 | Gate 转换表 + 各 Topic 地板 |
| hook_wave2_closeout_to_hitl2 | Wave 2 → HITL2 | Gate 转换表 + 综合制品 |
| hook_readiness_closeout_to_final_delivery | Readiness → 最终交付 | Gate 转换表 + 运行时资格 |

## 依赖链状态（更新于 2026-06-25）

原始依赖链：
```
schema-core → prototype-start-from-here → gate-loop/gate-fork → workflows/hooks
```

| 依赖 | 状态 | 备注 |
|------|------|------|
| schema-core | ✅ DONE | `DPT_FRAMEWORK/schema/`：8 contract files, 10 gate definitions, enums.mjs (10 domain enums) |
| prototype-start-from-here | ✅ DONE | `openspec/specs/bundle-start-from-here/` accepted. CONTROL_FILE_SCHEMAS 在 schema/contracts/ |
| gate-loop | ✅ DONE | `DPT_FRAMEWORK/engine/gate-loop.mjs` — `checkGate()` implemented |
| gate-fork | ✅ DONE | `DPT_FRAMEWORK/engine/gate-fork.mjs` — `forkGate()` implemented |
| queue-manager（原未列入） | ✅ DONE | `DPT_FRAMEWORK/engine/queue-manager.mjs` (657 lines). `checkReceipts()` supports 6 receipt types (file/json/queue/slot/trace/none) — **可复用为 hook receipt 验证的模式** |
| subagent-relay（原未列入） | ✅ DONE | `DPT_FRAMEWORK/engine/subagent-relay.mjs` (1067 lines). Evidence data flows through `SlotResult.evidenceCount` + `EvidenceReference` schema + per-wave artifacts |
| Evidence 管理器 | ❌ 缺失 | 无独立 evidence engine。Evidence 数据分散在 subagent-relay 和 artifact files (evidence-summary.md, cross-topic-ledger.md)，但没有集中管理的 `evidence-manager.mjs`。**这是 hooks 解封的主要剩余阻塞。** |
| workflows/hooks | ❌ 未开始 | 0/6 hooks 实现。无 hook 注册、触发、或 receipt 检查基础设施。 |

## 为什么仍然延后

1. **Evidence 管理器未就位**。Hook 是运行时行为，需要在 wave 过渡时检查 evidence 的完整性（共享参考清单、Topic 回填状态、综合制品）。目前 evidence 数据存在但没有集中管理——没有统一的 `evidence-manager` 来回答 "当前 wave 的证据够不够触发 hook"。
2. **更优先的工作在前面**。extract → evidence-quality → explore-exploit 这条流水线 + rerun-incremental-node 的优先级都高于 hooks。Hooks 是锦上添花（wave 间过渡检查），不是阻塞基本流程的东西。
3. **0/6 hooks 实现**。情况从未改变——hook 基础设施根本不存在。

## 部分满足的信号

- `queue-manager.mjs` 的 `checkReceipts()`（6 种 receipt type）可以作为 hook receipt 验证的模式直接复用
- `transitions.chain.json` 已有所有 wave 间的 passed 边——hook 的"触发点"已存在，只是没有 hook 注册在上面
- Gate 引擎（gate-loop + gate-fork）完整运作——hook 可以在 gate pass 后、chain 路由前插入

## 何时纳入

当以下条件**全部**满足时解封：
1. Evidence 管理器存在（独立 engine 或轻量级 wrapper over 现有 subagent-relay evidence structures）
2. extract + evidence-quality + explore-exploit 三个核心 prototype 完成
3. rerun-incremental-node 完成（HITL2 rerun 路径稳定后，hook 才知道 rerun 场景下的 wave transition 长什么样）

## 纳入时的最小可行路径

1. 先做一个 hook（`hook_wave0_closeout_to_wave1_start`）验证 hook 注册/触发/receipt 检查的基础设施
2. Hook receipt 验证复用 `queue-manager.mjs` 的 `checkReceipts()` 模式
3. 逐个加其余 5 个
