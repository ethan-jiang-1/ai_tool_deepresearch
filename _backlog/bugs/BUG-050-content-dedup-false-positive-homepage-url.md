# BUG-050: `content_dedup` gate rule 对合法文章 URL 产生假阳性

## 严重程度
P2 — 噪音。`content_dedup` 是 wave0 gate 的规则之一，历史上可能用于检测真正的重复/虚假 reference。但在当前代码状态下，它将合法、具体的文章 URL（如 `https://www.robert-glaser.de/agentic-engineering-thoughtworks-paper-loops/`）标记为 "homepage URL"，要求 "Replace homepage URL with a specific article URL"——但该 URL **已经是一个具体的文章 URL**。

此规则在 `stop: no` 静默执行中浪费了 Agent 的修复时间（Agent 反复检查 cache 文件、尝试修改 URL、rerun gate），且对实际研究质量无贡献。

## 复现

在 `engelberg-tech-retreat-2026` run 的 wave0 gate check 中：

```
check-gate-wave0-complete.mjs → content_dedup fail:
"Homepage URL in _cache/wave0/primary/04_outputs-conclusions-followups/
 robert-glaser-same-loop/page.md: 
 https://www.robert-glaser.de/agentic-engineering-thoughtworks-paper-loops/"
advice: "Replace homepage URL with a specific article URL."
```

该 URL 指向 Robert Glaser 的一篇具体文章（`/agentic-engineering-thoughtworks-paper-loops/`），不是首页（`/`）。规则将其误判为 homepage URL。

## 根因分析

### 为什么会产生假阳性

`content_dedup` 规则可能在内部用一个简单的启发式算法检测"homepage"——例如检查 URL 是否长于某个阈值、是否包含特定路径模式、或是否缺少文章 slug。Robert Glaser 的 URL 路径较长（`/agentic-engineering-thoughtworks-paper-loops/`），可能命中了某个过于宽泛的 pattern。

### 为什么这个规则现在可能不再重要

用户反馈："可能历史上 content_dedup 是个严重的问题，但是现在理顺了之后，感觉这个事儿已经不重要了。"

推测：`content_dedup` 最初设计用于检测 wave0 早期阶段常见的两类问题：
1. 虚假 reference（提交了 URL 但未实际抓取内容）
2. 真正的 homepage 替换（用首页 URL 冒充具体文章）

但当前 wave0 的 source intake 流程已经成熟——sub-agent 会实际 fetch 页面内容并写入 `page.md`。`content_dedup` 的"homepage URL"检测滞后于实际流程改进，现在主要产出假阳性。

## 建议修复

1. **短期**：审查 `content_dedup` 规则的当前实现，确认假阳性率。如果误判率超过合理阈值（如 >30%），考虑在 gate 中降低其权重或将其改为 warning-only（不阻塞 gate pass）。

2. **中期**：如果 `content_dedup` 的 core purpose（检测虚假 reference）已被其他机制覆盖（如 `work_unit_submit` 的 receipt check、cache trail 完整性检查），考虑将其从 gate required rules 移到 diagnostic-only checklist。

3. **更简单的方案**：将 `content_dedup` 的 "homepage URL" 检测从精确匹配改为信号提示——不直接 fail gate，而是输出 `advice` 供 Agent 自行判断。`stop: no` phase 中 Agent 可以读 advice 后决定是否值得修复，而非被迫 rerun gate。

## 发现时间
2026-07-07，engelberg-tech-retreat-2026 run，Wave0 gate check attempt 1-5 期间反复触发

## 关联
- [[BUG-048]] — content_dedup 假阳性是 wave0 gate 无法 pass 的两个 failing rule 之一（另一个是 shared_ref_count_floor），直接参与了 gate deadlock
