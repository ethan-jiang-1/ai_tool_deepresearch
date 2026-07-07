# BUG-048: Gate 不可通过时框架无降级推进路径，`stop: no` 与 gate contract 死锁

## 严重程度
P0 — 死锁。当 gate 因 profile 参数与现实不匹配而无法通过时，`stop: no` phase 的"自主继续"合约与 gate 的"无 pass 不推进"合约直接矛盾，框架进入不可前进的死锁状态。Agent 要么违规浮出水面（BUG-047），要么违规绕过 handoff 链（手改 rb_status.json + trace），要么永远卡住。

## 复现

在 `engelberg-tech-retreat-2026` run 的 wave0 phase 中，现场快照如下：

```
rb_status.json:  current_gate: wave0_complete (手动改的)
                  next_gate:   wave1_complete

rb_trace.jsonl:  gate_attempt × 11 条
                 gate_attempt(passed=true) 只有 2 条: setup-ready, seed-topics-ready
                 缺: gate_attempt(passed=true, gate=wave0-complete) ← 从未产生

enter-phase:     "requested node phases/phase-wave1.md is not authorized"
                 "latest check.next is phases/phase-wave0.md"

advance-status:  "wave0-complete is not the latest deterministic handoff"
                 "latest source gate is seed-topics-ready"
```

**死锁机制**：

1. Wave0 gate 5 次 attempt 全部 failed（`shared_ref_count_floor` threshold 9 vs 实际 0，因 profile 参数 `exploratory_map × 5 topics` 自动算出的 9 个 shared reference 对私人邀请制 retreat 不现实）
2. Gate hit fatigue threshold（attempt ≥ 3）
3. Phase §7 说"记录 silent_degradation，不浮出水面"
4. 但 **没有任何 CLI 或 API 允许在 gate 未 pass 的情况下推进到下一 phase**
5. `advance-status` 检查 trace 中的 `gate_attempt(passed=true)` — wave0-complete 的从未产生
6. `enter-phase` 检查 trace 中的 `load_complete` + `check.next` — 最新的是 `seed-topics-ready → wave0`
7. **框架在此处是一个闭合环：推进需要 gate pass，gate 无法 pass，没有降级推进的 escape hatch**

## 根因分析

### 合约矛盾

两个最高优先级的合约在此处直接冲突：

| 合约 | 来源 | 要求 |
|------|------|------|
| `stop: no` | phase-wave0.md §8, RUN.md §2 | "Agent 自行推进，不暂停，不浮出水面" |
| Gate handoff 链 | advance-status.mjs, enter-phase.mjs | "无 gate pass → 无 check.next → 无 enter-phase → 无 advance-status" |

当 gate 因 **profile 参数不合理**（而非 research 未完成）无法通过时，两个合约同时生效且互相否定。框架没有定义哪个合约优先。

### 为什么 shared_ref_count_floor 的 threshold 不现实

`apply-research-style.mjs` 对 `exploratory_map` profile + 5 topics 算出的 `wave0_shared_ref_total: 9`：

```
base(6) + per_topic × topic_count = wave0_shared_ref_total
```

但这个公式没有考虑：
- 私人邀请制 retreat 的公开 source 总数本来就有上限
- Chatham House Rule 限制了可公开获取的 shared reference
- 一个 niche event 能找到 2-3 个真正 shared（跨 topic）的 foundation reference 已经很好

结果是 gate 要求 9 个 shared reference，但现实世界只有 ~2 个 source 具有跨 topic 的 foundation 性质。

### 缺失的 escape hatch

框架没有以下任何一种降级推进机制：
- `advance-status --degraded --reason <...>` — 带降级标记的强制推进
- `enter-phase --degraded-from <gate>` — 从失败 gate 加载下一 phase
- Gate CLI 在 3+ attempt + fatigue 时自动返回 `passed: true, degraded: true`
- Phase MD 中 "gate 无法通过时做什么" 的明确指令

## 建议修复

### P0 — 增加降级推进路径

1. **`advance-status` 增加 `--force` flag + `--reason` 参数。** 当 Agent 已记录 `silent_degradation`、work-unit ledger 已验证、且 gate 已尝试 ≥3 次仍未通过时，允许强制推进：
   ```bash
   node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to wave0_complete --force --reason "shared_ref_floor_unrealistic_for_niche_event"
   ```
   `--force` 在 trace 中写入 `gate_attempt(passed=true,degraded=true,force_reason=...)` 作为降级 witness，使后续 `enter-phase` 能够正常消费 `check.next`。

2. **或者：Gate CLI 在 fatigue 时做最终裁决。** 如果 gate 检测到自己已被 attempt ≥3 次且 per-topic 产出已达标（work-unit ledger 可验证），自动降级为 `passed: true, degraded: true, degraded_rules: ["shared_ref_count_floor"]`。降级 pass 的 `check.next` 正常指向下一 phase。

### P1 — 修复 threshold 计算

3. **`apply-research-style.mjs` 的 `wave0_shared_ref_total` 公式增加 topic 独立性折扣。** 当 topics 之间有大量重叠 source 时（如 niche event 的 5 个 topic 共享相同 core sources），shared ref 的合理数量应该更低。可增加 `topic_independence_factor` 参数。

### P2 — Phase MD 明确降级行为

4. **所有 `stop: no` phase 的 §7 Persistent failure 条款增加降级推进指令：**
   > "若 gate 3+ attempt 仍 fail 且所有 per-topic work unit 已 submit，Agent MUST:
   > 1. 确认 work-unit ledger 可验证（所有 topic 的 required_receipts 存在）
   > 2. 记录 silent_degradation（含具体 fail 的 rule_id 和现实约束）
   > 3. 调用 `advance-status --force --reason <...>` 降级推进
   > 4. 继续加载下一 phase，携带降级标记"

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run，Wave0 → Wave1 过渡时触发

## 现场证据
- bundle: `dpt_rb_engelberg-tech-retreat-2026`
- trace: 11 gate_attempt，0 个 wave0-complete passed
- status: 手动改写为 wave0_complete（绕过机制，非正道）
- enter-phase: 拒绝授权 wave1
- 6 ledger rows（5 topic + 1 手动注入）
