# BUG-221: REF-011 canonical Wave1 文件名算法未完整文档化（48 字符截断 + normalized-URL digest），且 inspect 每次只暴露单个 materialize 候选

> 状态: 活跃 | 优先级: P2 | 严重度: P2 | 更新: 2026-08-12 | source: 真实 run 执行（enterprise-safe-ai-harness wave1）

## Why

`phase-wave1.md` §3.2.2 声明 canonical Wave1 文件名按 REF-011 确定性推导：
"`{topic.slug}-{host+path-token}-{12-hex}.md`, where the token is ... (non-alphanumerics
→ `-`, **truncated**) and the digest is the first 12 hex chars of the **URL's** SHA-256"。
文档没有给出两处实现细节，Agent 无法不读 engine source 就推导出正确文件名：

1. **token 截断长度**：实现为 `safeUrlToken(...).slice(0, 48)`（
   `wave1-reference-convergence.mjs:31-37`）。文档只写 "truncated"，未写 48。Agent
   若按常见的 60 或其他长度截断，文件名与 canonical locator 不匹配，reference 无法
   "close the candidate"。
2. **digest 的输入**：实现为 `createHash('sha256').update(normalizeUrl(sourceUrl))`，
   即 digest 基于 **normalized URL**（可能含 scheme/host 归一化差异），而非文档所说
   "the URL"。原始 URL 与 normalized URL 的 SHA-256 前缀可能不同，导致文件名
   digest 对不上。

叠加问题：`inspect-wave1-output.mjs` 的 `materialize_projection` 反馈在
`per_topic_ref_md_count_floor` hint 的 `write_to` 中**只暴露每个 topic 的第一个
materializable 候选**的 canonical target path，其余候选（如 topic 01 的 6 个）不给出。
文档 §3.2.2 说 "it emits the exact canonical target path and submitted backing per
candidate"，但实际输出每个 topic 只有一个。Agent 要为全部候选推导文件名，只能读
engine source 抄 `slice(0,48)` 与 `normalizeUrl` digest 逻辑。

> **同样影响 Wave0：** `inspect-wave0-output.mjs` 的 `wave0_submitted_reference_materialization`
> 在共享 reference floor 未满时，每次也只在 hint 中暴露**一个** materializable 身份
> （实测逐次浮现 `wu-w0-b000-src-i0001/1` → `/2` → ... → `/7` → `wu-w0-b000-src-i0005/8`，
> 共 8 次迭代）。Agent 无法一次性拿到全部共享 reference 候选的 source_url + backing，
> 只能 materialize→inspect→materialize 循环。修复应覆盖 wave0 与 wave1 两处
> materialization 反馈。

实测：enterprise-safe-ai-harness 首次物化 25 个 Wave1 topic reference，其中 10 个
用 60 字符 token + raw-URL digest 命名，persist 后 `inspect-wave1-output` 报
"submitted backing candidate(s) without a closed canonical projection"，需删除误名
文件、用 engine 函数重算路径后重新 persist。

## 复现

1. 按文档"token truncated"自行选一个截断长度（如 60）计算 Wave1 reference 文件名。
2. persist 到 `reference/{topic.slug}-{token}-{digest}.md`。
3. `inspect-wave1-output.mjs` → `materialize_projection` 计数不减少（文件名不匹配
   canonical locator）。
4. 只有把 token 截断改为 48、digest 改为 `sha256(normalizeUrl(url))` 后，候选才 close。

## Owner / 最小修复

- Owner: `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md` §3.2.2
  （文档）+ `inspect-wave1-output.mjs` / `wave1-reference-convergence.mjs`
  （feedback 完整性）
- 最小修复方向：
  1. 文档明确写 `slice(0, 48)` 与 digest 输入为 `normalizeUrl(sourceUrl)`（或
     expose 一个 CLI 输出 canonical path 供 Agent 直接使用）。
  2. `materialize_projection` 反馈应列出**全部** incomplete candidates 的 canonical
     target path + backing（当前只列每 topic 第一个）。
