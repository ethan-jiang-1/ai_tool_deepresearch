# BUG-010: queue completion 阶段不记录 cache_trail 诊断事件

**Severity**: P2 — 诊断信号缺失，影响问题发现时机
**Found**: 2026-07-01, 分析生产 bundle `dpt_rb_ai-agents-chinese-hospital-systems-2026`
**Related**: [[BUG-009-production-ledger-missing-required-fields]], [[implement-evidence-extraction]]

## 症状

生产 bundle `dpt_rb_ai-agents-chinese-hospital-systems-2026` 的 `_logs/run.log` 中：

- 49 次 `complete()` 调用，但**仅 1 条 `queue_complete` log event**（其他 48 次完成没有记录）
- **0 条 `ledger_append` log event**（所有 49 次 ledger append 都未记录）
- **0 条 `cache_trail_empty` / `cache_trail_incomplete` / `cache_trail_missing` log event**

对比：gate 阶段通过 `checkCacheCoverage` 一口气发现 49 条 `cache_coverage WARNING`——但此时 queue 早已 drained，错过了修复窗口。

## 为什么诊断时机很重要

```
Queue Drain 阶段（早）              Gate 阶段（晚）
─────────────────────              ──────────────
每次 complete() 后立即发现:        所有 complete 完成后一次性发现:
  "这个 task 产出了 reference       "49 个 reference 全部缺
   但没有声明 cache_trails"          cache provenance"
→ Phase Agent 可以立即修复         → 只能记录 warning，无法修复
  （重新 dispatch 或 补充声明）      因为 queue 已经空了
```

如果 queue 阶段的 log 正常工作，Phase Agent 在 drain queue 的过程中就能逐个发现 cache_trail 缺失，并有机会立即修复。现在只能等到 gate 阶段才发现，而且是 49 条一起出来，难以逐条处理。

## 根因分析

我们的新代码（`442a0583`）在 `queue-manager.mjs` 中添加了以下 log 事件：

- `logEvent('warn', 'cache_trail_empty', ...)` — cache_trails 为空时
- `logEvent('warn', 'cache_trail_incomplete', ...)` — trail 文件不完整时
- `logEvent('warn', 'cache_trail_missing', ...)` — trail 目录缺失时
- `logEvent('warn', 'cache_trail_warnings', ...)` — 聚合计数
- `logEvent('info', 'ledger_append', ...)` — 每次 ledger 写入（旧代码已有）

但该 bundle 创建时间在我们的 commit 之前（或 queue 阶段使用旧代码），所以这些事件没触发。

更重要的是：**即使新代码在跑，`queue_complete` log event 也只有 1 条而非 49 条**——说明 `logEvent('info', 'complete', ...)` 本身在旧代码中就不可靠。需要排查 `createRunLogger` 的写入路径是否在生产环境下被跳过或静默失败。

## 修复方向

1. **验证新 log 事件在生产路径上确实触发**：用新代码跑一次完整的 wave0 queue drain，确认 `_logs/run.log` 中出现 `cache_trail_empty`（当 Agent 未声明 cache_trails 时）或 `ledger_append`（每次 ledger 写入时）
2. **排查 `queue_complete` 丢失问题**：为什么 49 次 complete 只记录了 1 次？检查 `logEvent` 是否在某些条件下静默跳过
3. **考虑在 gate 阶段提供更结构化的反馈**：即使 log 不可靠，gate 的 `inspect` 输出也应该让 Phase Agent 能逐条追溯到具体 task（见 BUG-008）

## 验证

- 用新代码执行 `operate-queue complete` 后，确认 `_logs/run.log` 有对应的 `complete` 和 `ledger_append` event
- 用新代码对含 `cache_trails: []` 的 slot result 执行 complete，确认 log 出现 `cache_trail_empty` warning
- 用新代码跑完整 wave0（seed-topics → queue drain → gate），确认 log 中 queue 阶段的事件在 gate 阶段之前出现
