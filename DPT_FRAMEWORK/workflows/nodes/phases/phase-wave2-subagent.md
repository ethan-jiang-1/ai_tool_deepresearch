---
node_type: phase
id: phase-wave2-subagent
phase: wave2
role: dpt-topic-scout
stop: "no"
requires:
  - shared/shared-subagent-protocol
suggested_context: []
---

# Phase: Wave2 Sub-Agent — Gap-Fill Search (dpt-topic-scout)

## 1. Stage Goal

定向搜索填补 Phase Agent 在 synthesis 过程中发现的 specific finding（仅对 `decision=exploit_search` 或 `decision=explore_search` 的 finding 执行）。**不替代 Phase Agent 做 cross-topic synthesis judgment。**

## 2. Required Inputs

Phase Agent 在 spawn 时传入：
- **Finding description**：具体 finding 描述（这个 finding 是什么、为什么需要搜索）
- **Search keywords / direction**：从 finding 描述派生的搜索关键词
- **Target output schema**：结构化 JSON schema（见 §4）
- **Slot directory**：`_subagents/wave_02/slot_MM/`（由 relay engine 创建）

## 3. Allowed Actions

- WebSearch：使用传入的搜索关键词进行定向搜索
- WebFetch：抓取搜索结果中的高价值 URL
- Fallback fetch chain：WebFetch → curl → node fetch → python3（按序降级）
- 从抓取内容中提取 relevant evidence
- 返回结构化 JSON result（见 §4）
- 写入 runtime receipt（`_subagents/wave_02/slot_MM/runtime-receipt.jsonl`）
- 中间产物写入 `_cache/wave2/slot_MM/`

## 4. Expected Artifacts

Structured JSON result written to slot directory:

```json
{
  "found_evidence": ["evidence snippet 1", "evidence snippet 2"],
  "source_urls": ["https://example.com/page1", "https://example.com/page2"],
  "fills_gap": true,
  "confidence": "medium"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `found_evidence` | string[] | 提取的 evidence 片段（至少 1 条） |
| `source_urls` | string[] | 每条 evidence 对应的 source URL |
| `fills_gap` | boolean | 是否找到了能填补 finding 的 evidence |
| `confidence` | "low" / "medium" / "high" | 对 evidence 质量的信心评估 |

## 5. 无需 Gate

Sub-agent 不跑 gate。Result quality 由 Phase Agent 在 ingestion 时判断。

## 6. Relay Slot 契约

遵循 `shared-subagent-protocol.md` 的 relay slot 通信契约：
- Slot 目录：`_subagents/wave_02/slot_MM/`
- Cache 目录：`_cache/wave2/slot_MM/`
- Phase Agent 写入 `task.md`（含 finding description + keywords + schema）
- Sub-agent 读取 `task.md` → 执行 → 写入 result JSON
- Relay engine 写入 `runtime-receipt.jsonl`

## 7. Forbidden Actions

- **禁止写 WorkflowState**（`rb_status.json`、`rb_plan.md`、`rb_profile.yaml`）
- **禁止修改 queue**（不 enqueue/claim/complete/fail/preempt）
- **禁止 pass/fail gate**
- **禁止做 cross-topic synthesis judgment**（那是 Phase Agent 的工作）
- **禁止把 emergent question 归属到某个 topic**
- **禁止更新 ledger/index 的最终状态**（Phase Agent 在 ingestion 时更新）
- **禁止编造 source 或 evidence**
- **禁止不经过搜索直接返回 "fills_gap: false"**

## 8. Must Do

- **走完 tool degradation chain** 再报告 source inaccessible
- **记录 honest failure**：搜索了但没找到有用 evidence → `fills_gap: false, found_evidence: []`，附搜索关键词和尝试的 URL
- **记录 runtime receipt**：每次搜索/fetch 尝试

## 9. Anti-Cheating Rules

- **禁止编造 source URL 或 evidence 内容**
- **禁止声称搜索了实际未执行的搜索**
- **禁止做跨 topic 声明**（只处理当前 finding，不涉及其他 topic）
- **禁止跳过 WebSearch 直接用 WebFetch**（必须先搜再抓）
- **必须走完 tool degradation chain** 再报告 source 不可访问
- 参见 `shared-anti-cheating-rules.md` 的通用禁令
