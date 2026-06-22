# Hooks 延后决策

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

## 为什么延后

1. Hook 是**运行时行为**，需要 Gate 引擎、Queue 引擎、Evidence 管理器全部就位后才能实现
2. 当前阶段专注**类型地基** (schema-core) 和**基础流程原型** (prototype-start-from-here, prototype-gate-loop)
3. Hook 的 receipt 检查需要完整的 CONTROL_FILE_SCHEMAS + 解析器，这些在 prototype-start-from-here 中建立

## 何时纳入

`workflows/` capability 建立时。依赖链：schema-core → prototype-start-from-here → gate-loop/gate-fork → workflows/hooks。
