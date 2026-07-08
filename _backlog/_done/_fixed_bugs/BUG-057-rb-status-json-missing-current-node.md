# BUG-057: `rb_status.json` 缺少 `current_node` 字段，无法确定当前执行的 phase node

## 严重程度
P1 — 诊断盲区。`rb_status.json` 是 run bundle 的 canonical 状态文件，所有 CLI（gate check, advance-status, enter-phase, audit-phase-status）都读它。但它只记录了 `current_gate` / `next_gate`，没有 `current_node`。当 run 中断、crash、或被用户中途检查时，无法从状态文件确定当前处于哪个 phase node（`phases/phase-wave1.md`？`phases/phase-hitl2.md`？）。

## 复现

在 `engelberg-tech-retreat-2026` run 中，当前实际处于 HITL2（刚通过 `enter-phase --node phases/phase-hitl2.md` 加载），但 `rb_status.json` 显示：

```json
{
  "bundle": "engelberg-tech-retreat-2026",
  "current_mode": "execution",
  "state": "not_started",
  "current_gate": "wave2_complete",
  "next_gate": "hitl2_recorded"
}
```

从这 6 个字段，你无法回答"现在在执行哪个 phase？"。你只能推断：上一个 synced gate 是 `wave2_complete`，下一个要过的 gate 是 `hitl2_recorded`。但当前 node 是 `phases/phase-wave2.md`、`phases/phase-hitl2.md`、还是某个 intermediate 状态？不知道。

## 根因分析

### 信息明明存在，但没有写对地方

`enter-phase.mjs` 成功进入 phase 时，会在 `rb_trace.jsonl` 中写入 `load_complete` 事件：

```json
{"event":"load_complete","entry":"phases/phase-hitl2.md","handoff_source_gate":"wave2-complete",...}
```

但 `enter-phase` **完全不碰 `rb_status.json`**。`rb_status.json` 只在 `advance-status.mjs` 中被更新——且只更新 `current_gate` / `next_gate`。

### StatusSchema 从未设计 `current_node`

`DPT_FRAMEWORK/schema/contracts/status.mjs` 的 `StatusSchema` 只有 5 个字段：

```js
export const StatusSchema = z.object({
  bundle: z.string().optional(),
  current_mode: z.literal('execution'),
  state: RunState,
  current_gate: CurrentGate,
  next_gate: CurrentGate,
}).passthrough();
```

没有 `current_node`。`.passthrough()` 允许额外字段，但没有任何 CLI 会写它。

### 为什么以前没发现

Phase agent 在正常 flow 中不读 `rb_status.json` 来判断"我在哪"——它读的是 trace 中的 `load_complete`。但人类操作者、诊断工具、和 resume-from-crash 逻辑需要从状态文件快速定位当前 phase。

## 建议修复

1. **`StatusSchema` 增加 `current_node` 字段**（带 `z.string().optional()`，向后兼容）:
   ```js
   current_node: z.string().optional(),  // e.g. "phases/phase-hitl2.md"
   ```

2. **`enter-phase.mjs` 成功进入后写入 `current_node`**。在 `load_complete` trace event 写入之后，同步更新 `rb_status.json#/current_node` 为 `targetNode`。

3. **`advance-status.mjs` 推进后清除 `current_node`**（因为 source gate 已 pass，下一 phase 尚未 enter）。或者保留旧值但不依赖它——至少让诊断工具能读到"上一次 enter 的 node"。

4. **`START_FROM_HERE.md` 也应反映 `current_node`**。当 Agent 重新进入 bundle 时，读 `rb_status.json` 就能知道从哪个 phase node 续跑，而不是需要扫整个 trace。

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run，HITL2 阶段用户检查状态文件时发现

## 关联
- [[BUG-048]] — 如果 gate 死锁时能看到 current_node，至少知道卡在哪个 phase，诊断会容易很多
