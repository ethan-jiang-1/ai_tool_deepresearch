# BUG-056: Queue slug derivation 阻止同一 topic 创建补充 task

## 严重程度
P1 — 阻塞深度研究。Queue 的 enqueue validation 从 `queue_item_id` 中自动 derive topic_slug，并与 `payload.topic_slug` 做 strict match。当 Phase Agent 需要为同一 topic 创建第二批 deepening task（因为第一批 sub-agent 产出太浅）时，任何带有 suffix（如 `-v2`）的 `queue_item_id` 都会被 derive 出一个不存在的 topic_slug（如 `01_event-basics-logistics-v2`），enqueue 被拒绝。

**后果**：已经 submit 的 work unit 不能重跑（已 terminal），不能创建新 task（queue 拒绝），Agent 无法为同一 topic 补充深度。唯一的"出路"就是接受浅层产出然后 force-advance——这直接导致了 BUG-054。

## 复现

在 `engelberg-tech-retreat-2026` run 的 wave1 v2 重跑尝试中：

```bash
# 第一批 wave1 task（已 submit）
queue_item_id: "wave1-deepen-01_event-basics-logistics"  # ✓ OK

# 第二批 wave1 task（尝试补充深度）
queue_item_id: "wave1-deepen-01_event-basics-logistics-v2"  # ✗ REJECTED
# Error: "topic_slug mismatch: payload='01_event-basics-logistics' 
#         vs queue_item_id='wave1-deepen-01_event-basics-logistics-v2'
#         (derived slug: '01_event-basics-logistics-v2')"
```

任何 suffix（`-v2`、`-supplement`、`-deep`）都会触发此错误，因为 queue 从 `queue_item_id` 的最后一个 `-` 分隔段 derive topic_slug。

## 根因分析

Queue 的 topic validation 逻辑假设：每个 topic 在每个 phase 只会有**一个** queue item。`queue_item_id` 的命名约定被编码进了 validation（从 `queue_item_id` 中 extract topic_slug 并与 payload 对比）。

这个假设在 wave0 阶段成立（每个 topic 一个 source intake task），但在 wave1 及之后不成立：
- Wave1 可能需要多轮 deepening（第一轮太浅 → 第二轮补充）
- Gate fail 后的 repair path 要求"enqueue supplementary queue item"（phase-wave1.md §7）
- 但 repair path 的第一步就被 queue validation 挡住了

## 建议修复

1. **Queue validation 应改为只检查 `payload.topic_slug` 是否在 `topic_registry` 中存在**，不检查 `queue_item_id` 的命名约定。derive topic_slug 的逻辑（如果确实需要）应只用于 display/label，不用于 blocking validation。

2. **或者：queue_item_id 不再 derive topic_slug。** `payload.topic_slug` 是 topic 身份的 single source of truth。`queue_item_id` 只是一个唯一标识符，不应承载结构化语义。

3. **短期 workaround**：Phase Agent 在需要补充 task 时，手动编辑 `rb_queue.json` 绕过 CLI validation——但这是 BUG-051 的陷阱（手动编辑触发级联 distrust）。需要 CLI 支持 `--force` flag 或 `--supplementary` mode。

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run，wave1 v2 重跑时触发

## 关联
- [[BUG-054]] — 直接下游：queue 拒绝补充 task → Agent 接受浅层产出 → force-advance
- [[BUG-051]] — 如果 Agent 尝试手动编辑 queue 来绕过 → 触发 ledger 级联 distrust
