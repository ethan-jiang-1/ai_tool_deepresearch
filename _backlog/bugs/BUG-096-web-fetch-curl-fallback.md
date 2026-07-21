# BUG-096: WebFetch blocked → curl fallback missing (固疾复发)

| 字段 | 内容 |
|------|------|
| **编号** | BUG-096 |
| **发现日期** | 2026-07-21 |
| **发现场景** | `dpt_rb_ai-agents-enterprise-bpm-productivity` — HITL1 research-access capability probe |
| **严重度** | P1 — 阻断 evidence-backed wave 启动（research_access 判定为 unavailable） |
| **影响面** | main agent + sub-agent（两者都可能触发；Claude Code 使用 `WebFetch`，Codex 使用原生 `web_search` 工具的 `open_page` action，两者都需要 curl fallback） |
| **是否固疾** | 是 — 历史上解决过多次（见 Related bugs），本次在 production run 中再次复发 |
| **当前状态** | Active — HITL1/main-Agent path is separately fixed in archived `allow-bounded-hitl1-fetch-surface-fallback`; delegated actor fallback remains `UNOBSERVED` |

## 当前 delegated evidence

`deliver-work-unit-role-contracts-to-actors` 的唯一 case-221 Autorun 于 2026-07-21 以 `ERROR: agent_timeout` 结束，未产生 native completion、inspect 或 Gate verdict，因此不能关闭 delegated residual。代表 actor 的 durable receipt 有两条成功的 `node_fetch` `fetch_attempt_done` records，且其 paired outputs 已 dry-submit/formal-submit；但没有同 URL native blocked/unavailable predecessors 与 bounded curl success 的完整事实链。

结论：delegated native-to-curl fallback observation 是 `UNOBSERVED`，不是 claim-level `NOT_RUN`，也不是 `OBSERVED_PASS`。该结果只约束本次 Claude Autorun；不得外推到 Codex 或其他 runtime。BUG-096 保持 Active，直到 archived HITL1 closure 之外还有满足 delegated proof boundary 的 `OBSERVED_PASS` durable evidence。

## 现象

1. Claude Code 的 `WebFetch` 工具对主流域名（mckinsey.com, weforum.org, bls.gov, finance.yahoo.com）全部返回 `Unable to verify if domain is safe to fetch`
2. `WebSearch` 工具正常工作，返回详细摘要内容
3. `curl` 命令行可以成功获取部分 URL（httpbin.org 200），但部分域名超时/403
4. DPT_FRAMEWORK 的 `research_access` probe 在 `WebFetch` 失败后没有自动降级尝试 `curl`，导致 probe 进入 `unavailable` 路径（后经用户手动提示改用 curl 才通过）

## 根因分析（推测）

- **不同 Coding Agent 的 fetch surface 和命名均不一致**：Claude Code 暴露独立的 `WebFetch`；Codex 没有同名函数，其原生 Responses `web_search` 工具通过 `open_page` action 打开 URL（下文简称 `web_search.open_page`）。两者的网络策略和失败模式不能假定相同
- **DPT_FRAMEWORK 的 capability probe（phase-hitl1.md §3d）只测单一 fetch surface**：未定义 fallback chain（runtime native fetch → curl → wget）
- **HITL1 probe 成功路径只认一种 `fetch_surface`**：`research_access` schema 中 `fetch_surface` 是 optional audit label，不是 fallback chain
- **Wave 阶段（wave0/wave1）的 sub-agent 也可能遇到同样问题**：sub-agent 被派发去 fetch URL 时，如果当前 runtime 的 native fetch blocked/unavailable 且 sub-agent 不知道可以用 curl，work-unit 会 fail

## 为什么是固疾

- 历史上至少有 2-3 次相关修复记录（见 Related bugs）
- 每次修复可能只覆盖了单一 agent 类型或单一路径（如只修 main agent 没修 sub-agent，或只加了 curl 指令但没改 capability probe 逻辑）
- `research_access.probe` → `fetch_surface` → `Wave-level source intake` 三层之间缺少统一的 "try native fetch, fall back to curl" contract
- Claude Code `WebFetch` vs Codex `web_search.open_page` 的 fetch 能力差异使问题在跨平台时必然复发

## Coding Agent fetch surface 对照

| Coding Agent | 原生 fetch surface | URL 读取操作 | 说明 |
|--------------|--------------------|--------------|------|
| Claude Code | `WebFetch` | `WebFetch(url, prompt)` | 独立工具；本 bug 的 domain safety block 在此 surface 上实测 |
| Codex | `web_search` | `open_page` action（逻辑简称 `web_search.open_page`） | 不是名为 `WebFetch` 的独立函数；具体会话是否提供该工具仍取决于宿主配置 |
| 通用 shell fallback | shell/Bash | `curl -sSL --max-time 15 <url>` | 仅在 shell 网络权限可用时成立；成功 surface 必须如实记录 |

## 建议修复方向

1. **Capability probe 层面**：`phase-hitl1.md §3d` 的 probe 逻辑应包含跨运行时 fallback：先试当前 Coding Agent 的 native fetch（Claude Code：`WebFetch`；Codex：`web_search` 的 `open_page` action），失败或未提供时自动试 `curl -sSL --max-time 15 <url>`；任一成功即记录 `available` + 实际使用的 surface
2. **Wave source intake 层面**：wave0/wave1 sub-agent prompt 不应硬编码只有 `WebFetch`，应明确写 "Try the runtime's native fetch surface first (`WebFetch` on Claude Code; `open_page` on Codex's `web_search` tool); if blocked or unavailable, use curl to fetch the URL and read the output"
3. **`research_access` schema**：考虑增加 `fallback_used: true/false` 和 `available_surfaces: []` 字段，记录完整的可用 fetch surface 列表，而不是单一 surface
4. **Main agent vs sub-agent**：两个路径都需要 curl fallback——main agent 在 HITL1 probe 和 direct phase work 中可能 fetch；sub-agent 在 work-unit 执行中必然 fetch

## Related bugs

- 本 bug 编号之前的多次 fetch→curl fallback 修复（需翻 `_done/_fixed_bugs/` 确认精确编号）
- 可能与 BUG-046/062 等 sub-agent work-unit 执行路径有关（sub-agent 拿不到 content 导致 work-unit fail）

## 复现步骤

1. 在 Claude Code 环境中启动 DPT_FRAMEWORK research run
2. 进入 HITL1 → capability probe
3. 观察到 WebFetch 返回 domain safety block
4. 观察到框架未自动尝试 curl fallback
5. `research_access.status` 被设为 `unavailable`

Codex 对等路径的术语验证：检查会话是否暴露原生 `web_search` 工具，并以其 `open_page` action 打开 URL；不要查找或调用一个并不存在的 Codex `WebFetch` 函数。Codex 路径尚未在本 bug 中复现相同的 domain safety 错误，因此不能把 Claude Code 的具体报错归因给 Codex。
