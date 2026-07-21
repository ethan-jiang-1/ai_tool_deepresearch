# BUG-098: Wave1 sub-agent output format doesn't match Engine validation contract

| 字段 | 内容 |
|------|------|
| **编号** | BUG-098 |
| **发现日期** | 2026-07-21 |
| **发现场景** | `dpt_rb_ai-agents-enterprise-bpm-productivity` — wave1 work-unit dry-submit |
| **严重度** | P1 — 4/5 work units 在 dry-submit 时因 section header 格式不匹配被拒 |
| **影响面** | 所有 wave1 topic deepening sub-agent (dpt-evidence-extractor) |

## 现象

5 个 dpt-evidence-extractor sub-agents 完成了实质性的 topic deepening 工作（每 topic 10-35 个 evidence particles，丰富的 mechanism/trend/limitation 分析），但 dry-submit 时 4/5 失败：

- `key_findings_missing_or_empty` — evidence-summary.md 缺少 Engine 期望的 `## Key Findings` section header
- `question_list_sections_missing_or_empty` — question-list.md 缺少 Engine 期望的 4 个 section（`## Answered Questions`, `## Partially Answered Questions`, `## Open Questions`, `## Emergent Questions`）

## 根因

Sub-agent role guidance (dpt-evidence-extractor) 和 Engine 的 dry-submit validator 对 output file format 的 contract 不一致：

- Sub-agent 被要求写 "structured evidence summary with source URLs" 和 "question list with 4 sections"
- Engine 期望具体的 section header 名称（`## Key Findings`、`## Answered Questions` 等）
- Sub-agent 写了 `## What was found`、`## Questions`、`## Answered` 等变体——内容正确但 header 不匹配

这和 wave0 的 source_url/url、source.yaml schema 问题是同一类 bug：**Agent-facing sub-agent prompt 和 Engine-facing contract 之间的格式对齐是 manual/discipline-based，没有 automated enforcement。**

## 建议修复

1. **Short-term**：在 dpt-evidence-extractor sub-agent prompt 中硬编码 required section headers（`## Key Findings`, `## Answered Questions`, `## Partially Answered Questions`, `## Open Questions`, `## Emergent Questions`）
2. **Medium-term**：Engine dry-submit 应放宽 section header 匹配——做 fuzzy/semantic matching 而非 exact string match
3. **Long-term**：Sub-agent role definition 应包含 output contract schema，Engine 在 claim 时自动注入到 sub-agent prompt 中

## 相关 bugs

- BUG-096：WebFetch→curl fallback（同类：sub-agent 不知道替代路径）
- Wave0 source.yaml schema 不匹配（同类：Agent-facing vs Engine-facing format gap）
