# BUG-086: `isCountable` 要求 `## Core Content Capture` section——reference 模板用 `## Key Facts`

## 发现
2026-07-14, wave1 gate 报 0 countable references。根因：`ref-count.mjs:isCountable()` line 101 用 `extractSection(content, 'Core Content Capture')` 提取内容，但 reference 模板（phase-wave1.md）使用 `## Key Facts` section 名。Phase Agent 按模板写的 reference 文件无法通过 countability 检查。

## 严重程度
P2 — 模板和校验逻辑不一致，Agent 无法从错误消息推断正确 section 名。

## 修复
统一 section 名：要么模板改为 Core Content Capture，要么 isCountable 同时接受 Key Facts。
