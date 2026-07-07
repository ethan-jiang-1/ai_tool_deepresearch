# BUG-049: Phase Agent 在 gate 卡住后跳过 wave1/wave2 直接合成 final report

## 严重程度
P0 — 合约违反 + 跳过两个关键 research phase。`stop: no` 合约要求 Agent "自主继续执行"，含义是继续走完 phase chain（wave1 → wave2 → HITL2 → final），不是自主跳到终点。直接合成 final report 绕过了 wave1（topic deepening）和 wave2（cross-topic synthesis），产出的报告缺了两个 phase 本应提供的深度。

## 复现

在 `engelberg-tech-retreat-2026` run 中：

1. Wave0 gate 5 次 attempt 无法通过（shared_ref_count_floor, content_dedup）
2. Gate hit fatigue threshold
3. `advance-status` 和 `enter-phase` 因 BUG-048 死锁拒绝推进到 wave1
4. **Phase Agent 的决策**：跳过 wave1 + wave2 + HITL2，直接写 `final/engelberg-fose-retreat-report.md`
5. 报告中坦承 `wave1: skipped_degraded, wave2: skipped_degraded`

Agent 的行为链条：
```
Gate 卡住 → 修了 5 次修不好 → "算了直接写报告吧"
```
正确的行为链条应为：
```
Gate 卡住 → 修了 5 次修不好 → 记录 silent_degradation → 降级推进到 wave1 → 继续执行 wave1/wave2 → HITL2 → final
```

## 根因分析

### 为什么 Agent 会跳

**A. BUG-048 的下游效应。** 当 `advance-status` 和 `enter-phase` 全部拒绝降级推进时，Agent 面前没有合法的前进路径。Agent 必须在"停下来"（违反 stop: no）和"绕过"（违反 phase chain）之间二选一。它选了后者。

**B. Phase chain 的"终点导向"思维。** Agent 把研究目标理解成了"产出一份报告"，而非"走完 phase chain 产出报告"。当 gate 卡住时，Agent 判断"研究够好了可以直接写报告"，而不理解 wave1 的 deepening 和 wave2 的 cross-topic synthesis 是报告质量的必要前提——不管 wave0 数据多丰富。

**C. `stop: no` 合约的歧义。** "自主继续执行"是否等于"自主继续走 phase chain"？Agent 将"继续执行"解释为"继续向目标前进（final report）"，而非"继续走规定的 phase 序列"。这个歧义需要消除。

## 建议修复

### P0 — 堵住 phase skip 路径

1. **Phase Agent 的行为规则必须明确**：`stop: no` = 继续走 phase chain，不允许跳过任何 phase。在 phase-wave0.md §8 中增加：
   > "Gate 失败 ≠ wave0 研究不足。Gate 失败 ≠ 可以跳过 wave1/wave2。Agent MUST NOT 在所有 phase 完成前接触 final/ 目录。降级推进到 wave1 后，必须完整执行 wave1 deepening + wave2 cross-topic synthesis。"

2. **增加 phase order 硬约束**：`final/` 目录的写入应该被 HITL2 gate 保护。在 HITL2 gate pass 之前写入 `final/` 应被 `validate-bundle.mjs` 检测为 anomaly。

### P1 — 修复根因

3. **修 BUG-048**（增加降级推进路径），消除"没有合法推进路径"的困境——Agent 就不会被迫在"停下来"和"绕过"之间选择。

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run，Wave0 gate fatigue 后 Agent 跳过 wave1/wave2 直接写 final

## 关联
- [[BUG-048]] — 根因：gate 死锁迫使 Agent 寻找非法出口
- [[BUG-047]] — 同一 phase 的另一个 stop: no 违反（浮出水面）
