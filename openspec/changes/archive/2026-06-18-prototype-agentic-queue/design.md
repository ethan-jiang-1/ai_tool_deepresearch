# Design: prototype-agentic-queue

## Context

当前 rewrite 的 queue 只有生产 bundle 最小占位 schema。V12 则有成熟但过载的 Markdown queue：work unit 信息丰富、active window 清楚、preemption/promotion 经验可用，但所有机器规则都压在 Markdown 里，导致 Agent 自治理、hook 散落、receipt 解释困难。

这个 prototype 要验证的不是“研究 loop 做得更深”，而是“Q 怎么由 JS 管起来”。LLM/Agent 继续做语义判断和内容工作；Queue Manager 只负责结构化调度、receipt 检查、promotion/preemption、trace 和 Markdown 投影。

## Goals / Non-Goals

Goals:

- 定义 `QueueState` / `QueueItem` 的 prototype-local Zod schema。
- 实现 API-first Queue Manager：`enqueue`、`claimCurrent`、`completeCurrent`、`failCurrent`、`preempt`、`promote`、`refill`、`checkReceipts`、`renderProjection`、`inspectQueue`。
- 保留 V12 的 5-slot rolling active window 和 refill pool，但 JSON/JS 是 authority。
- 给 Agent/MD 一个薄 CLI 表面，验证 JS feedback 能回到 conversation context。
- 用 trace `check` events 裁决 command experiments。

Non-goals:

- 不修改 production `DPT_FRAMEWORK/schema/contracts/queue.mjs`。
- 不实现生产 `ds.mjs`。
- 不做 source quality、claim truth、research synthesis 判断。
- 不实现完整 V12 receipt DSL；prototype 只支持最小 deterministic subset。
- 不让 Markdown projection 反向更新 queue state。

## Decisions

### 1. QueueItem 固定合同 + payload 扩展

固定字段：

```js
{
  work_id,
  title,
  target,
  action,
  producer_rule,
  lineage,
  priority_class,
  required_receipts,
  done_condition,
  verification,
  writes_to,
  status_sync,
  completion_receipt,
  failure_route,
  status,
  preempted_from_slot,
  restore_priority,
  created_at,
  updated_at,
  payload
}
```

`payload` 是任意 JSON object，承载具体任务类型的可变信息。Queue Manager 不解释 `payload` 的内容，只校验它是 JSON object。

### 2. 5-slot active window 是调度视图

State shape：

```js
{
  queue_id,
  queue_health,
  stop_authorization_state,
  active_window: {
    slot_1_current,
    slot_2_next,
    slot_3_pending,
    slot_4_pending,
    slot_5_tail
  },
  refill_pool,
  projection_path,
  trace_path
}
```

Only `slot_1_current` is executable. Slot 2-5 and refill pool are previews/candidates only.

### 3. API owns queue mutation

Core API:

- `loadQueue(bundleDir)` reads `rb_queue.agq.json` when present, else creates prototype state.
- `validateQueue(queue)` runs Zod and cross-field checks.
- `enqueue(queue, item, { mode })` fills first open slot or pool.
- `claimCurrent(queue, { actor })` returns `slot_1_current` only, marks it `running`.
- `completeCurrent(queue, result, bundleDir)` checks completion receipt, records trace, promotes/refills.
- `failCurrent(queue, failure, bundleDir)` creates repair candidate and promotes/refills.
- `preempt(queue, item, { reason, unsafeCurrent })` inserts urgent work into pending slots by default.
- `promote(queue)` shifts slot 2→1, 3→2, 4→3, 5→4.
- `refill(queue)` fills tail from highest priority ready pool candidate.
- `checkReceipts(queue, item, bundleDir)` fail-closes deterministic receipts.
- `renderProjection(queue, bundleDir)` writes Markdown from JSON state.
- `inspectQueue(queue, bundleDir)` returns check/inspect/advice feedback.

### 4. Thin CLI wraps the same API

CLI commands:

- `check <bundle>`
- `enqueue <bundle> --task <task.json>`
- `claim <bundle> --actor <main-agent|sub-agent>`
- `complete <bundle> --result <result.json>`
- `fail <bundle> --failure <failure.json>`
- `preempt <bundle> --task <task.json> --reason <reason> [--unsafe-current]`
- `render <bundle>`

The CLI reads/writes `rb_queue.agq.json` so the prototype does not change production `rb_queue.json`.

### 5. Preemption is conservative

Default preemption inserts urgent work into earliest pending slot, usually `slot_2_next`. It shifts lower-priority pending work toward tail. If the window is full, displaced `slot_5_tail` moves to the top of `refill_pool` with `preempted_from_slot=slot_5_tail` and `restore_priority=next_tail_opening`.

`slot_1_current` is not interrupted unless `unsafeCurrent=true`. That flag is reserved for known-bad current work, illegal gate crossing, or work that would waste effort against a known blocker.

### 6. Receipt subset is deliberately small

Supported prefixes:

- `file:<path>`
- `json:<path>`
- `queue:<field>=<value>`
- `slot:<slotName>=<status>`
- `trace:<event>`
- `none`

Unknown prefix fails closed. Agent-judgment checks stay in `verification.agent`; Queue Manager only checks deterministic facts.

## Risks / Trade-offs

- [Risk] Prototype queue state diverges from future production schema. → Mitigation: store in `rb_queue.agq.json` and document candidate contract in `EXPERIMENT.md`.
- [Risk] Thin CLI starts to look like accepted production `ds.mjs`. → Mitigation: keep it under `experiments/prototype-agentic-queue/` and call it prototype-only.
- [Risk] Payload flexibility lets bad task shapes through. → Mitigation: fixed core fields remain strict; component-specific payload validation is future capability work.
- [Risk] Receipt subset misses V12 named branches. → Mitigation: command experiments prove fail-closed mechanics; full receipt grammar can be a later production change.

## Migration Plan

1. Rewrite OpenSpec artifacts to Queue Manager API-first.
2. Implement prototype-local schema/API/CLI.
3. Add unit tests for queue mechanics.
4. Add command experiments using real disposable bundles.
5. Record results in `EXPERIMENT.md`.
6. Leave production `rb_queue.json` unchanged.

## Open Questions

- Future production surface: should this become `DPT_FRAMEWORK/cli/ds.mjs`, `queue.mjs`, or a lower-level library used by ds?
- Should `rb_queue.agq.json` become `rb_queue.json` in a later migration, or remain a staging artifact until ds is accepted?
- Which V12 named branch receipts deserve first-class production support?
