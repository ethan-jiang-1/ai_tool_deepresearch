# BUG-044: work-unit submit 成功后 queue 状态未同步，delegated_in_flight 残留导致后续 item 无法 claim

## 严重程度
P0 — 阻塞 Wave0 全部后续进度。一个 topic 的 source intake 完成并成功 submit 后，queue 未将 item 从 `delegated_in_flight` 清理，导致 `stop_authorization_state: unauthorized_continue_required`，剩余 4 个 topic 的 queue item 虽在 `active_window` 中但无 Agent 能 claim。

## 复现

在 `engelberg-tech-retreat-2026` run 中：

1. Wave0 入队 5 个 `wave0_source_intake` item（topics 01-05）
2. Topic 01 被 claim，生成 work unit `wu-w0-b000-src-i0001`，sub-agent 完成搜索/抓取/写入工作
3. 前两次 `operate-work-unit submit` **被拒绝**（14:26:00, 14:26:03），reason: `detail` field expected record, got string（`WorkUnitRuntimeReceiptEventSchema.parse` 抛出的 Zod 校验错误）
4. 第三次 submit **成功**（14:26:50），ledger 写入 `rb_output_declarations.jsonl`，trace 记录 `work_unit_submitted`
5. **但 `rb_queue.json` 中 topic 01 仍残留在 `delegated_in_flight`**，未被移入 `terminal_history`
6. Topic 02-05 在 `active_window` 中 status 为 `queued`，但 queue health 为 `thin`，`stop_authorization_state: unauthorized_continue_required`
7. deadline `14:30:32` 已过，无人处理超时，queue 永久卡死

关键证据：
- `_work_units/_index.json`: work unit status=`submitted`, `terminal_at` 已设置
- `rb_output_declarations.jsonl`: ledger row 已写入
- `rb_trace.jsonl` line 201-204: `work_unit_ledger_appended` + `work_unit_submitted` 已记录
- `rb_queue.json`: topic 01 仍在 `delegated_in_flight`，topic 02-05 仍在 `active_window` 且无人 claim

## 根因分析 / 为什么会发生

两段逻辑共同导致：

1. **`submitWorkUnit` 的事务边界问题**（`engine/work-unit-core.mjs:1168-1252`）。成功路径在 transaction 内执行了 `delete queue.delegated_in_flight[record.queue_item_id]` + `queue.terminal_history.push(...)` + `refill(queue)` + `saveQueue(bundleDir, queue)`。但从最终 `rb_queue.json` 看，这些写入未生效。可能原因：
   - `withWorkUnitTransaction` 内 `saveQueue` 返回了更新后的 queue 对象（line 1219: `saveQueue(bundleDir, queue)`），但 transaction 的 commit 机制可能未真正将 queue 持久化到 `rb_queue.json`
   - `saveQueue` 依赖 `loadQueue` 的缓存——如果 transaction 外另有 queue reader 在 submit 之后重新 load 了旧状态并 save，则覆盖了更新

2. **`recordSubmitRejection` 保留 work unit 为 `claimed` 状态是正确的**（允许重试 submit），但前两次 rejection 的具体原因（`WorkUnitRuntimeReceiptEventSchema` 的 `detail` field 校验失败）表明 sub-agent 生成的 runtime-receipt.jsonl 中某行含有 `"detail": "string"` 而非 `"detail": {...}`。schema 定义在 `schema/contracts/work-unit.mjs:190-199`，`detail: JsonObject.optional()` 要求若存在则必须为 record。这是 rejection 的直接原因，但不是 queue 残留的根因。

3. **超时处理缺失**。deadline 过后没有超时清扫机制将过期的 `delegated_in_flight` item 移回 active_window 或标记为 timed_out。

## 建议修复

1. **短期**：在 `submitWorkUnit` 成功路径末尾增加 queue 持久化的显式验证——submit 返回前 reload queue 并断言 item 已从 `delegated_in_flight` 移除。若断言失败，重试 saveQueue。
2. **短期**：增加 `delegated_in_flight` 超时清扫——在 `operate-queue` 或 queue load 时检查 `deadline_at`，过期 item 自动 `closeWorkUnitAttempt(timeout)` 并移回 pool。
3. **中期**：审计 `withWorkUnitTransaction` 中 saveQueue/saveWorkUnitIndex 的 commit 顺序和原子性，确保 transaction 内对 queue 的 mutation 在 transaction commit 后不会被其他并发 reader/writer 覆盖。
4. **中期**：sub-agent 写入 runtime-receipt.jsonl 时，`detail` 字段若存在必须是 JSON object 而非 string。task.md 中的 log-event 示例使用了 `--detail '${JSON.stringify(...)}'` 是正确的，但 sub-agent 有可能直接用字符串传 `--detail`。应在 `log-event.mjs` 的 `--detail` 解析后额外做 schema 校验，或在 task.md 中更明确地禁止手动构造 `detail` 字段。

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run，Wave0 source intake phase
