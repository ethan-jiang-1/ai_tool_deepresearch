# TODO: evidence-quality（语义层 discard — 结构计数已落地）

> 状态: 待设计（已收窄） | 优先级: 高 | 更新: 2026-07-15  
> 上游: `todo-evidence-extraction` ✅ DONE（`ref-count.mjs` + ledger + CCC 结构门槛）  
> 下游: `todo-explore-exploit` → `todo-final-output-eval`

## Why

Extraction 已回答「声明了什么、结构上能不能数」。Quality 回答「语义上该不该算进 coverage」。

`isCountable()` 今天只做**结构门槛**（acceptance、CCC≥100、Key Facts≥5、可解析 URL）。一条 reference 可以结构过关，仍然 thin / 软广 / 与 claim 无关。这类材料应从 countable coverage **discard**，不是用 prose「修」成高质量。

## 地基对齐（2026-07-15）

| 旧期望 | 现状 |
|--------|------|
| 等 extraction 解锁计数 | ✅ 已解锁 — `countReferences({ source: 'ledger' })` |
| 用 `fail_c` fork 分支做 discard | ❌ 无此 enum/分支；不可数已由 `isCountable: false` 静默排除；wave 级 escape 是 **degraded pass** |
| CandidateCard / promote | ❌ 已退役；勿再设计 |
| 重做 CCC/Key Facts 门槛 | ❌ 已在 `ref-count.mjs` — **本 todo 不碰** |
| countability 用 content/presentation 启发式 | ✅ **repair-rerun 已收窄**（BUG-086）：仅 `accepted` status + parseable source URL；`key_facts_min_lines` 规则已删除 |
| depth facts 需 Agent 手抄 ledger/cache 真相 | ✅ **repair-rerun 已修复**（BUG-087）：Engine 从 reviewed submitted rows 派生，Agent 只给 reviewed refs + 不可派生判断 |
| BUG-069 契约不自洽阻塞 gate 消费面 | ✅ **已修复** — gate hints + contract lineage 落地，不再在漂移契约上叠语义规则 |

## Current Direction（收窄后）

只做**语义层**：

- Agent / `dpt-source-diagnostic`（或 extractor 扩展字段）写结构化语义质量字段
- Engine 校验字段，并决定是否计入 countable（扩展 `isCountable` 或并列 `isSemanticallyCountable`）
- Gate / reentry 继续只消费 submitted ledger + 可数投影，不扫盘扩 coverage

### Candidate fields（示意，未定稿）

```javascript
const EvidenceQuality = z.object({
  substance: z.enum(['substantive', 'thin', 'none']),
  source_tier: z.enum(['tier_1', 'tier_2', 'tier_3', 'tier_4']),
  commercial_intent: z.enum(['none', 'mild', 'strong', 'unknown']),
  independent_backing: z.number().int().min(0).default(0),
  retention_decision: z.enum(['retain', 'prune_partial', 'exclude_source']),
});
```

### Deterministic rules（方向）

- `retention_decision: exclude_source` → 不可数
- `substance: thin|none` → 不可数
- 强商业意图且无独立 backing → 不能支撑 P0/P1
- discard 可触发补搜；被 discard 的源本身不「repair 成合格」

## Design Questions

- 字段落在 reference 文件、work-unit result JSON，还是 declaration-derived index？
- Engine 最少强制哪些规则，才不假装做语义判断？
- 与现有 degraded pass / uncountable[] 如何汇成 gate advice，而不是新造 `fail_c`？
- `dpt-source-diagnostic` 是否接入默认 wave dispatch，还是字段并进 intake/extractor？

## Non-Goals

- 不重做结构 countability（CCC / Key Facts / ledger）
- 不引入 CandidateCard / relay 兼容路径
- 不一次做完整 citation scoring
- 不把未 submit 文件算进 coverage
- 不把 wave 级 degraded pass 当成 run 级 auto_rerun（那是 final-output-eval）

## Next Step

`/opsx:explore evidence-quality` — 只谈语义字段落点 + Engine 最少规则 + 与 `uncountable[]`/degraded 的关系。  
countability 结构层已由 repair-rerun 收窄；本 todo 聚焦语义层，不再担心 gate 契约漂移。
