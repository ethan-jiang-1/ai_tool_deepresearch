---
bug_id: BUG-100
title: "Research access probe 'first result only' rule causes false negatives"
severity: P2
discovered: 2026-07-23
bundle: dpt_rb_openspec-large-project-maintenance-patterns
phase: hitl1
gate: hitl1-recorded
---

# BUG-100: Research access probe 的 "first result only" 规则导致假阴性

## 现象

HITL1 research access probe 连续两次失败，但搜索面本身完全正常：

| Attempt | Search query | First HTTP result | Native fetch | Curl | 结论 |
|---------|-------------|-------------------|-------------|------|------|
| 1 | "OpenSpec specification-driven development 2026" | heise.de | blocked | timeout 15s | unavailable |
| 2 | "software engineering practices 2026" | computer.org | blocked | 403 | unavailable |
| 3 | "Wikipedia software development" | meta.wikimedia.org | blocked | success | available |

第三次才成功，因为前两次的首个结果域名恰好不可达。

## 根因

`phase-hitl1.md §3d` 规定："按 search surface 返回顺序只检查第一个实际 HTTP(S) result；第一条不合格时不得改选第二条，也不得使用用户/模型构造或替换的 URL"

此规则的意图是防止 agent cherry-pick URL，但它假定"第一个结果的可达性 = 搜索面的可用性"。这在现实中不成立——搜索面可以正常返回结果，但排第一的域名恰好被当前环境的网络策略阻止。

## 实际影响

- 增加了 2 次不必要的 probe retry（每次消耗 search + native fetch + curl）
- 如果第三个 query 的首个结果也不可达，可能导致无限循环或误判为 `unavailable`
- 用户体验差——agent 报告"环境不可用"，但实际上搜索完全正常

## 建议方向

- 允许 probe 检查 search result 的前 N 个（如 3 个）HTTP(S) URL，而非仅第一个
- 或者：将 probe 改为两步——(1) 验证 search surface 可用（一次 search 成功即可），(2) 验证 fetch surface 可用（从 results 中选第一个 fetchable URL）
- 在 `research_access` observation 中记录 `retry_count` 和 `attempted_urls[]`
