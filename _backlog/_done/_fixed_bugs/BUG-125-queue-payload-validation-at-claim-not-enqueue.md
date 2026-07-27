---
bug_id: BUG-125
title: "Queue item payload validation at claim time — stuck items require manual rb_queue.json editing"
severity: P2
discovered: 2026-07-26
status: fixed_archived_change
resolved: 2026-07-27
fixed_by: 2026-07-27-converge-queue-demand-admission
bundle: dpt_rb_openspec-influence-landscape
phase: wave0
node: phases/phase-wave0.md
---

# BUG-125: Queue item 的 payload schema 在 claim 时才校验，enqueue 时不校验

## Resolution (2026-07-27)

Archived Change 2, `converge-queue-demand-admission`, introduced one
current-facts admission evaluator across enqueue, queue health, claim, and the
existing stale-card repair path. It validates canonical binding and every
registered delegated kind before persistence, then revalidates at claim; an
unclaimable unclaimed card has a legal terminal path without editing
`rb_queue.json`.

## 现象

Phase Agent 创建了 4 个 wave0 shared-ref 的 task card JSON，通过 `operate-queue.mjs enqueue` 成功入队（返回 `ok: true`）。但后续 `operate-work-unit.mjs claim` 时报错：

```
assignment preflight failed for queue item wave0-shared-refs-batch01:
current assignment requires explicit payload topic_uid and topic_slug
```

4 个 queue items 全部因为 payload 缺少 `topic_uid`/`topic_slug` 而无法被 claim，但它们已经占据了 active_window 的队首位置，阻塞了后续合法 queue items（`wave0-shared-refs-cross-topic` 和 `wave0-shared-cross-topic`）的 claim。

更严重的是，`operate-queue.mjs check` 返回 `passed: true`（没有提示这些 items 是 unclaimable 的），而且 `operate-queue.mjs` 没有提供 `remove` 或 `drop` 命令来清理这些 items。Phase Agent 最终只能通过 `require('fs').writeFileSync` 直接编辑 `rb_queue.json` 来删除它们。

同样的 payload schema 问题导致后续 2 个合法 queue items 也无法 claim（`assignment preflight failed: Wave0 source intake assignment receipts do not match the canonical topic-bound set`），因为它们是为跨 topic shared ref 创建的，没有绑定单一 topic 的 required_receipts。

最终 6 个 queue items 全部需要手动从 `rb_queue.json` 中删除才能让 gate 的 `phase_queue_drained` 规则通过。

## 重现线索

1. 创建 task card JSON，payload 中不包含 `topic_uid` 或 `topic_slug`
2. `operate-queue.mjs enqueue` → `ok: true`（成功入队）
3. `operate-queue.mjs check` → `passed: true`（没有诊断信息）
4. `operate-work-unit.mjs claim` → `assignment preflight failed`
5. 尝试用 `operate-queue.mjs repair` 修复 → 没有适合的 repair 操作
6. 只能直接编辑 `rb_queue.json` 删除 items
7. Gate 的 `phase_queue_drained` 在 items 删除后才通过

## 根因假设

**主因**：Task card 的 schema 校验被拆成了两层。`operate-queue.mjs enqueue` 只做基本的 JSON parse + queue structure 校验，不做 assignment contract 校验（topic_uid、topic_slug、required_receipts 的 topic-bound set 匹配）。Assignment contract 校验推迟到了 `operate-work-unit.mjs claim` 阶段。这导致 unclaimable items 可以成功入队并阻塞队列。

**副因**：`operate-queue.mjs` 缺少 `remove`/`drop`/`fail` 命令。当前的 repair 操作只有 `--set-assignment-mode`，无法处理"这个 queue item 根本无法被 claim"的情况。Phase Agent 被迫直接编辑 Engine-owned 文件。

**第三因**：跨 topic 的 queue items（如 shared ref production）在当前的 topic-bound assignment contract 中没有合法的 payload shape。这是一个 schema 设计 gap：要么应该支持 `topic_uid: "all"` 或类似的跨 topic 标记，要么应该明确禁止创建跨 topic queue items 并在 enqueue 阶段拒绝。

## 框架层面的问题

1. Enqueue 和 claim 之间的 schema validation gap——enqueue 应该执行 assignment preflight 的子集（至少验证 payload 中有 claim 阶段需要的必填字段）
2. Queue 缺少 item removal 操作——stale/unclaimable items 没有 Engine 提供的清理路径
3. 跨 topic work unit 的 assignment contract 不存在——`topic_uid` 是必填的，没有 `all` 或 `shared` 的合法值

## 建议方向

- **短期**：`operate-queue.mjs enqueue` 对 task card JSON 执行 assignment preflight 的 schema 校验（至少检查 `payload.topic_uid` 和 `payload.topic_slug` 存在且格式合法），不合格的拒绝入队并给出结构化错误
- **短期**：`operate-queue.mjs` 增加 `drop <bundle> --queue-item-id <id>` 命令，允许 Phase Agent 合法地移除 unclaimable items
- **短期**：`operate-queue.mjs check` 在 active_window 中有 items 缺少必填 payload 字段时，报告 `queue_health: blocked` 并给出具体 item 的诊断
- **中期**：支持跨 topic work unit（`topic_uid: "__shared__"` 或 `topic_uid: ["tp_xxx", "tp_yyy"]`），有独立的 assignment preflight 规则和 required_receipts 校验
