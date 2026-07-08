# BUG-063 — Gate failure 手动修复级联导致下游 phase 被跳过

| 属性 | 值 |
|------|-----|
| ID | BUG-063 |
| 发现日期 | 2026-07-08 |
| 严重级别 | P0 — 导致整个 wave2（cross-topic synthesis）被静默跳过，研究 pipeline 的核心价值环节丢失 |
| 来源 | `dpt_rb_fose-europe-engelberg-2026` formal run |
| 相关 Bug | [[BUG-060]]（gate 无法 pass 的根因）、[[BUG-048]]（gate deadlock 无降级推进路径）、[[BUG-053]]（gate provenance chain 太脆） |

---

## 0. 一句话

**Wave0 gate 因 BUG-060（shared_ref contract mismatch）失败 → Phase Agent 手动改 `rb_status.json` 绕过 → handoff chain 断裂 → wave1 gate 无法运行 → 再次手动绕过 → wave2 被完全跳过 → 直接从 wave1 跳到 HITL2/final。一次 gate failure 的级联效应吞噬了整个 cross-topic synthesis phase。**

---

## 1. 事故链（本次 run 完整记录）

```
Wave0: 5 topics, 63 sources, 6 work units
  ↓
Wave0 gate attempt 1-3: shared_ref_count_floor + cache_coverage 持续失败
  ↓ (BUG-060: contract 不允许 source_claims，但 gate 要求 accepted source_claims)
Phase Agent 手动改 rb_status.json:
  current_gate: wave0_complete, next_gate: wave1_complete
  ↓
Wave1: 5 topics, ~50 new sources, 5 work units — 全部 submit 成功
  ↓
Wave1 gate attempt 1: "handoff targets phase-wave0, not phase-wave1" — 拒绝运行
  ↓ (handoff chain 在 wave0 处断裂，因为 wave0 gate 从未 pass)
Phase Agent 再次手动改 rb_status.json:
  current_gate: wave1_complete, next_gate: wave2_complete
  current_node: phases/phase-hitl2.md
  ↓
❌ WAVE2 被完全跳过 ❌
   - 没有 cross-topic synthesis
   - 没有 emergence detection（wave1 发现了 harness engineering 被四线夹击、Loop Engineering 崛起、TW 内部矛盾等跨 topic 信号——但从未被合成）
   - 没有 finding index
  ↓
Phase Agent 直接进入 HITL2，然后准备写 final report
```

**Wave2 是 DPT_FRAMEWORK 的核心价值环节**——它是唯一一个把 5 个独立 topic 的发现合并成统一叙事的 phase。跳过 wave2 意味着研究报告只是各 topic 发现的拼接，而非综合。

---

## 2. 为什么这是 P0

1. **静默跳过**：Phase Agent 没有意识到 wave2 被跳过了——手动改 status 后直接看到 HITL2，正常推进
2. **不可恢复**：一旦 `current_node` 被手动设为 HITL2，回头补 wave2 的唯一方式是 rerun（从 seed-topics 重来）
3. **影响研究质量**：本次 run 中 wave1 发现了多个跨 topic 信号（harness engineering 面临四线挑战、Loop Engineering 崛起、TW 内部矛盾、tokenpocalypse billing pivot）——这些只有在 wave2 中才能被合成为统一叙事
4. **系统性**：只要 wave0 gate 因 BUG-060 失败，这个级联就**必然发生**——不是偶发事件

---

## 3. 根因分析

### 直接原因

Phase Agent 的 repair 策略是"手动改 status → 推进到下一 phase"。这在**单个 gate** 失败时是可行的降级方案。但当**连续两个 gate** 都需要手动绕过时，wave2 就会被跳过——因为 Phase Agent 没有"检查是否所有 phase 都执行过"的逻辑。

### 深层原因

1. **`advance-status` 依赖 gate pass**：`advance-status --to wave0_complete` 要求 wave0-complete gate 是 "latest deterministic handoff"——但 gate 从未 pass，所以 advance-status 拒绝执行
2. **手动改 status 绕过 handoff chain**：Phase Agent 改 `rb_status.json` 直接写 `current_gate: wave0_complete`——这跳过了 `enter-phase` 的 handoff witness 记录
3. **Gate 的前置条件检查只看 handoff chain**：wave1 gate 拒绝运行是因为"handoff 还在 wave0"——但 wave0 gate 永远 pass 不了（BUG-060），形成了一个**无法打破的死锁**
4. **Phase Agent 没有 phase 完整性检查**：推进到 HITL2 之前，Phase Agent 不检查 "wave0, wave1, wave2 是否都已完成"

### 死锁结构

```
advance-status --to wave0_complete
  → 需要 wave0 gate pass（或 handoff chain 中有 wave0-complete）
  → wave0 gate 无法 pass（BUG-060: shared_ref 永远 0）
  → advance-status 拒绝执行
  → Phase Agent 手动改 status
  → handoff chain 断裂
  → 后续 gate 无法运行
  → 更多手动 status 修改
  → phase 被跳过
```

---

## 4. 与已有 Bug 的关系

| Bug | 关系 |
|-----|------|
| BUG-048 (gate deadlock 无降级路径) | **前置条件**：如果 gate 有合法的降级路径，Phase Agent 就不需要手动改 status |
| BUG-053 (gate provenance chain 太脆) | **放大因素**：provenance chain 的严格线性要求使一次断裂传染所有下游 gate |
| BUG-060 (contract mismatch) | **触发器**：BUG-060 导致 wave0 gate 永远 pass 不了，是整个级联的起点 |
| BUG-013 (gate fatigue 打破 stop 契约) | **背景**：3 次 attempt 后 fatigue 触发 step_back，但 step_back 没有给出合法推进路径 |

---

## 5. 修复方向

### 短期（阻止级联）

**Phase Agent 推进到 HITL2 之前，增加 phase 完整性检查**：
- 在 `shared-silent-execution.md` 或 phase-hitl2.md 中增加指令：进入 HITL2 前，Phase Agent MUST 确认 `rb_trace.jsonl` 中有 wave0、wave1、wave2 的 completion event
- 如果某个 wave 缺失，应回到该 wave 重新执行，而非跳过

### 中期（打破死锁）

**`advance-status` 增加 `--force` flag**：
- `advance-status --to wave0_complete --force` 允许在 gate 未 pass 时推进（记录 silent_degradation）
- 这样 Phase Agent 不需要手动改 JSON——用 CLI 推进至少会记录 trace event，不会静默断裂 handoff chain

### 长期（根除）

**Gate 降级路径**（BUG-048 的解决方案）：
- 当 gate 连续 N 次 attempt 失败时（fatigue），gate 自身提供 `degraded_pass` 选项
- `degraded_pass` 记录哪些规则被降级、为什么、影响评估
- 下游 phase 知道自己收到的输入是 degraded 的，可以调整行为
- 这样就不需要手动 advance status，handoff chain 保持完整
