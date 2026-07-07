# BUG-058: Wave1 cache trails 太薄——每个 topic 只有 1-2 个 cache dir，远低于 wave0 的 5-13 个

## 严重程度
P1 — 证据链不完整。Wave1 sub-agent 写了 evidence-summary.md（声称找到了新 source），但对应的 cache trails 极其稀疏：每个 topic 只有 1-2 个 `_cache/wave1/primary/` 目录，而 wave0 每个 topic 有 5-13 个。Cache trail 是 gate provenance 的核心组件——没有 cache trail，source 的 URL → fetched content → evidence chain 就无法独立验证。

当前状态：
```
topic 01: 1 cache dir  (wave0 有 5)
topic 02: 1 cache dir  (wave0 有 9)
topic 03: 1 cache dir  (wave0 有 13)
topic 04: 1 cache dir  (wave0 有 7)
topic 05: 2 cache dirs (wave0 有 9)
```

而 evidence-summary 中引用的新 source 数量远远超过 cache 数量（topic 04 声称 7 个新 source，只有 1 个 cache trail）。

## 复现

`engelberg-tech-retreat-2026` run 中，wave1 v2 supplementary sub-agents 完成了搜索和新 source 发现，但：
1. Evidence-summary.md 引用了多个新 URL
2. 对应的 `_cache/wave1/primary/{topic}/` 下只有 1-2 个 cache leaf directory
3. 大部分引用 source 没有对应的 `websearch.json + page.md + meta.json` cache trail
4. Gate 被 force-advance 绕过，没有检测到这个 gap

## 根因分析

两种可能：
- **Sub-agent 做了搜索但没有写 cache**：找到 source 后只在 evidence-summary 中引用 URL，没有 fetch + 写 cache trail
- **Sub-agent 写了 cache 但路径不对**：写了 cache 但 gate 找不到，因为路径 convention 不匹配

无论哪种，都有两层问题：
1. Phase Agent 在 submit 前没有检查 cache 完整性与 evidence-summary 引用是否匹配
2. Gate 的 cache_coverage 检查本来能发现，但被 force-advance 绕过

## 建议修复

1. **Phase Agent 的 wave1 §3.3 自检应包含 cache depth check**：每个 claimed source URL 必须有对应 cache trail；missing cache → fail work unit → sub-agent 重做
2. **Gate 的 cache_coverage rule 应该更早触发**：在 work-unit submit 时就检查（已存在但可能不强），而不是只在 gate check 时才报
3. **Sub-agent prompt 应明确要求**：每个引用 source URL 必须有对应的 cache trail leaf directory

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run

## 关联
- [[BUG-054]] — 根因：Phase Agent 照单全收不审查
- [[BUG-053]] — Gate 被绕过，cache_coverage 没机会报
