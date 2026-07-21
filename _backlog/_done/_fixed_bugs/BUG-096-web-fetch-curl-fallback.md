# BUG-096: WebSearch / WebFetch or equivalent page access blocked -> bounded curl fallback missing (固疾复发)

| 字段 | 内容 |
|------|------|
| **编号** | BUG-096 |
| **发现日期** | 2026-07-21 |
| **发现场景** | `dpt_rb_ai-agents-enterprise-bpm-productivity` — HITL1 research-access capability probe |
| **严重度** | P1 — 阻断 evidence-backed wave 启动（research_access 判定为 unavailable） |
| **影响面** | main agent + sub-agent（两者都可能触发；先用 `WebSearch` / `WebFetch` 或当前 runtime 的等价检索、页面读取能力，再在页面读取受阻时走有限 `curl` fallback） |
| **是否固疾** | 是 — 历史上解决过多次（见 Related bugs），本次在 production run 中再次复发 |
| **当前状态** | Active — HITL1/main-Agent path is separately fixed in archived `allow-bounded-hitl1-fetch-surface-fallback`; delegated actor fallback remains `UNOBSERVED` |

## 结案决定（2026-07-21）

本 bug 的两条 implementation path 已分别由 archived `allow-bounded-hitl1-fetch-surface-fallback` 与 `deliver-work-unit-role-contracts-to-actors` 交付。delegated native-to-curl branch 仍为 `UNOBSERVED`，但这不是已知的实现失败，也不再为追逐 observation 创建嵌套 test/runner work。归档为 implementation delivered、runtime observation pending；不得把 `UNOBSERVED` 叙述为 `OBSERVED_PASS`。

## 当前 delegated evidence

`deliver-work-unit-role-contracts-to-actors` 的唯一 case-221 Autorun 于 2026-07-21 以 `ERROR: agent_timeout` 结束，未产生 native completion、inspect 或 Gate verdict，因此不能关闭 delegated residual。代表 actor 的 durable receipt 有两条成功的 `node_fetch` `fetch_attempt_done` records，且其 paired outputs 已 dry-submit/formal-submit；但没有同 URL native blocked/unavailable predecessors 与 bounded curl success 的完整事实链。

结论：delegated native-to-curl fallback observation 是 `UNOBSERVED`，不是 claim-level `NOT_RUN`，也不是 `OBSERVED_PASS`。该结果只约束本次 Claude Autorun；不得外推到 Codex 或其他 runtime。BUG-096 保持 Active，直到 archived HITL1 closure 之外还有满足 delegated proof boundary 的 `OBSERVED_PASS` durable evidence。

## 现象

1. Claude Code 的 `WebFetch` 工具对主流域名（mckinsey.com, weforum.org, bls.gov, finance.yahoo.com）全部返回 `Unable to verify if domain is safe to fetch`
2. `WebSearch` 工具正常工作，返回详细摘要内容
3. `curl` 命令行可以成功获取部分 URL（httpbin.org 200），但部分域名超时/403
4. DPT_FRAMEWORK 的 `research_access` probe 在 `WebFetch` 失败后没有自动降级尝试 `curl`，导致 probe 进入 `unavailable` 路径（后经用户手动提示改用 curl 才通过）

## 根因分析（推测）

- **不同 Coding Agent 的 surface 和命名均不一致**：`WebSearch` / `WebFetch` 是清晰的能力名称，但具体 Agent 可能通过同名工具或等价的检索、页面读取 surface 提供它们。流程必须按能力与实际可用权限路由，不能假定同名 function 存在
- **DPT_FRAMEWORK 的 capability probe（phase-hitl1.md §3d）只测单一 fetch surface**：当时没有定义有限的 same-URL fallback；已归档 Change 1 将其收敛为 native/Node fetch 后最多一次受限 `curl`，而不是 `curl -> wget` 等扩张链
- **HITL1 probe 成功路径只认一种 `fetch_surface`**：`research_access` schema 中 `fetch_surface` 是 optional audit label，不是 fallback chain
- **Wave 阶段（wave0/wave1）的 sub-agent 也可能遇到同样问题**：sub-agent 被派发去 fetch URL 时，如果当前 runtime 的 native fetch blocked/unavailable 且 sub-agent 不知道可以用 curl，work-unit 会 fail

## 为什么是固疾

- 历史上至少有 2-3 次相关修复记录（见 Related bugs）
- 每次修复可能只覆盖了单一 agent 类型或单一路径（如只修 main agent 没修 sub-agent，或只加了 curl 指令但没改 capability probe 逻辑）
- `research_access.probe` → `fetch_surface` → `Wave-level source intake` 三层之间缺少统一的 "try native fetch, fall back to curl" contract
- 不同 runtime 的 `WebSearch` / `WebFetch` 等价能力与网络权限可能不同，因此必须保留同 URL、有限、可审计的 fallback，而不是依赖某个专有 function 名称

## Coding Agent fetch surface 对照

| 能力层 | 首选 surface | 说明 |
|--------|-------------|------|
| URL discovery | `WebSearch` 或当前 runtime 的等价检索能力 | 只选择第一个符合当前 contract 的实际 HTTP(S) URL |
| Page retrieval | `WebFetch` 或当前 runtime 的等价页面读取能力 | 对该 URL 获取真实 page content；历史 Claude Code 的 domain-safety block 出现在此层 |
| Bounded fallback | 独立允许的 shell `curl -sSL --max-time 15 <same-url>` | 只在页面读取 blocked/unavailable 且 shell/network permission 独立允许时执行一次；成功 surface 必须如实记录 |

## 建议修复方向

1. **Capability probe 层面**：已归档 Change 1 定义 one-URL、一次 `WebFetch` 或其 runtime-equivalent page retrieval、最多一次 same-URL 受限 `curl` fallback。`WebSearch` / `WebFetch` 是能力语言；实际 Agent 选择当前已提供的等价 surface，不虚构 function。
2. **Wave source intake 层面**：已归档 Change 2 的 shared guidance 使用相同的能力语言：先用 `WebSearch` / `WebFetch` 或当前 runtime 的等价能力取得页面内容；页面读取 blocked/unavailable 时，Agent 自己在独立 shell/network permission 允许下对同一 URL 执行一次 bounded `curl`，而不是把已授权工作交给用户。
3. **`research_access` schema**：保持现有单一最终 surface audit label；不为 fallback history 新增 `fallback_used` 或 `available_surfaces[]` derived state。
4. **Main agent vs sub-agent**：两个路径都需要有限 fallback，但当前没有新的测试或验证基础设施工作；真实 runtime evidence 只能在实际可用的 session 中自然产生，不能由测试嵌套制造。

## Related bugs

- 本 bug 编号之前的多次 fetch→curl fallback 修复（需翻 `_done/_fixed_bugs/` 确认精确编号）
- 可能与 BUG-046/062 等 sub-agent work-unit 执行路径有关（sub-agent 拿不到 content 导致 work-unit fail）

## 复现步骤

1. 在 Claude Code 环境中启动 DPT_FRAMEWORK research run
2. 进入 HITL1 → capability probe
3. 观察到 WebFetch 返回 domain safety block
4. 观察到框架未自动尝试 curl fallback
5. `research_access.status` 被设为 `unavailable`

跨 Agent 术语：`WebSearch` / `WebFetch` 指 URL discovery 与 page retrieval 能力，或当前 runtime 的等价能力；它们不是要求某个专有 function 名称。页面读取出现 blocked/unavailable 时，Agent 应在独立 shell/network permission 允许下，对同一 URL 自行执行一次 bounded `curl` fallback；若该权限或页面内容仍不可得，则记录最小失败边界。Codex 路径尚未在本 bug 中复现 Claude Code 的 domain-safety 错误，因此不能把该具体报错归因给 Codex。
