---
bug_id: BUG-215
title: HITL1 探测持续 unavailable 时 reason 前缀词汇未强制，gate 的 surface_absent/permission_required 根因分类静默失效；host 能搜不能抓时 run 无前进路径
severity: P2
phase: hitl1
status: fixed
source: CCDS4 (Claude Code + DeepSeek v4, 2026-08-11)
surfaced_at: 2026-08-11
resolved_at: 2026-08-11
resolved_by: rebuild-hitl1-source-access-alignment (v0.86, 10b42247c)
---

# BUG-215: HITL1 research-access 持续 unavailable 时，根因分类被弱模型 reason 丢失，且无诊断前进路径

## Resolution

已由 `rebuild-hitl1-source-access-alignment`（v0.86，`10b42247c`）修复。
当前 HITL1 使用固定的中外 direct-sample suite；schema-valid completed
`unavailable` observation 不再以自由文本 `reason` 前缀决定 Gate 是否阻塞。
Phase 在同一 HITL1 conversation 判断来源限制是否 material，并让用户选择重探、
修改显式来源约束，或按当前范围继续；之后该 completed observation 走既有 Gate
路径。legacy `access_boundary` 仍使用已校验的结构化 location 路由，未分类 legacy
observation 会被显式说明，而不是退化成泛化重试消息。

回归验证：`check-gate-hitl1-recorded`、`hitl1-research-access-adapter` 和
`phase-hitl1-research-access` 当前共 27 项确定性测试通过。

## Observation

`dpt_rb_enterprise-ai-harness-adoption-open-source` run 的 HITL1 capability probe
连续 3 次（1 次初探 + 2 次用户要求的重跑）全部返回 `research_access.status:
unavailable`，run 永久卡在 `hitl1-recorded` gate（`external_action`），没有前进路径。

三次探测的一致性观察（search → fetch → curl 兜底全链路）：

| 尝试 | WebSearch | native WebFetch | curl same-URL 兜底 |
|------|-----------|-----------------|--------------------|
| 1 | 返回 3 个 Wikipedia 候选 | 全被 policy 阻断 | 全部超时 (exit 28, 15s) |
| 2 | 返回 3 个候选 | 全被 host policy 阻断 | 403 / 超时 / 连接重置 |
| 3 | 返回 3 个候选 | 域名验证失败阻断 | 403 / 超时 / 超时 |

**触发链条**：selected host（deepseek-v4 via `claude-deepseek.mjs`）的 WebSearch
表面可用（每次都返回真实候选 URL），但 native WebFetch 被 host/provider policy
阻断，允许的 exact same-URL curl fallback 又全部失败（HTTP 403、15s 超时、连接
重置）——即该 host **能搜不能抓**，且 curl 出站 egress 也不可用。

## 探测的目的与预期输出（为什么有它 / 指望得到什么）

Deep Research Harness 的后续所有研究（Wave0 检索 → Wave1 深读 → Wave2 综合）都依赖
真实 search + fetch。进入静默自主执行之前，必须一次性、有界地确认 selected host
此刻真的能搜、能抓——否则 silent waves 会在无网络环境里空转或伪造 evidence。

**探测本身的设计**：固定中立 query（`site:wikipedia.org "Internet protocol suite"`）、
最多 3 个返回候选、每个候选至多一次 native fetch + 一次 exact same-URL curl 兜底、
整体至多一次 search。它不收集研究 evidence，只产出一条 `research_access` 观察
（写入 `rb_profile.yaml#/research_access`），是 HITL1 gate 的硬前置。

**指望得到的结论**：
- `available`：search 返回真实 HTTP(S) URL 且 fetch 拿到真实页面内容 → 证明研究
  waves 的 search/fetch 链路可用 → gate pass → 出口语 → 进入
  Setup → Seed Topics → Wave0/1/2 → HITL2 → Final（evidence-backed、有 gate、
  可追溯的研究报告）。
- `unavailable`（诚实）：宿主当前无法完成 search 或 fetch → gate 失败、
  `external_action` → 用户解决外部前置条件后由 Agent 重跑同一 probe + gate
  （HITL1 choices 保留，不重答）。

**unavailable 的 `reason` 应当能区分根因**：`surface_absent:`（宿主无可用 fetch
surface）vs `permission_required:`（宿主 policy 拒绝）——只有带上这个词汇，gate
才能把 Agent 引向精确的修复边界。这正是本卡断言被丢失的地方。

## 环境上下文与探测设计关切（中国网络环境 / Wikipedia 假阴性）

**用户提供的运行环境背景（2026-08-11）**：运行环境在中国大陆。访问境内网站正常，
访问海外网站存在网络问题（GFW/出口网络）。Wikipedia 是典型的被挡站点。

**这改变了本次探测失败的归因**：探测固定 query `site:wikipedia.org "Internet protocol
suite"` 返回的候选全部是 Wikipedia / mirror 域名，属于**结构性不可达目标**。结合
4 次探测的一致观察（external Search 每次都返回真实候选 URL；失败的只是 fetch/抓取
内容这一段——native WebFetch 被"域名安全检查"阻断、curl 到 Wikipedia/mirror 失败），
本环境下更准确的结论是：

- **Search 侧基本没问题**（4 次探测每次都正常返回候选）；
- **问题集中在 fetch/抓取内容这一块**，且被挡的很可能只是 Wikipedia 这一目标族，
  而非整体出站 fetch 能力；
- 非 Wikipedia 的海外站点（博客、文档站、GitHub、CDN 等）**可能实际可抓，但本次
  探测没有覆盖**——即探测在当前环境是**假阴性**，把"特定目标不可达"误判成
  "宿主无 fetch 能力"。

**探测设计关切（值得用户考虑方案）**：固定单一 query 只测一个目标族（Wikipedia），
在中国网络环境下系统性失败，无法区分：
- `surface_absent:`（宿主无 fetch surface，真·整体不可用）；
- 特定目标被网络/政策挡（本例：Wikipedia，整体 fetch 能力未必坏）。

建议把探测的 fetch 覆盖面从"单一 Wikipedia 目标族"扩展为**少量多类目标采样**，
例如 3 个站点类别：
1. 一个普遍可达的海外站点（如 example.com 或某 CDN）→ 验证基本出站 fetch 能力；
2. 一个非 Wikipedia 的海外文档/博客站点 → 验证研究类目标的真实可抓性；
3. Wikipedia 自身 → 保留原"中性"锚点，用于识别"特定目标被挡"。

目标：让 `available`/`unavailable` 能区分"完全不能抓" vs "特定目标不可达"，避免在
中国网络环境下把整体研究能力误判为不可用、导致 run 无法起步。

## Why it matters

1. **框架本身的 fail-closed 行为是正确的**：诚实返回 unavailable、不伪造
   available、保留 HITL1 choices、gate 以 `external_action` 正确失败。Engine 无逻辑
   缺陷。
2. 但框架侧有两个可验证的确定性缺口，让这次真实 run 的用户体验是"死路"：

   **(a) reason 前缀词汇未强制 → gate 根因分类静默失效。**
   adapter contract 声明 `unavailable_roots: [surface_absent, permission_required]`
   （`host_tools/research-access-adapter.md`），gate 已实现按前缀分类路由：
   - `cli/gates/check-gate-hitl1-recorded.mjs:165` 调
     `selectedAdapterUnavailableRoot(failure.accessReason)`
   - `host_tools/lib/research-access-adapter.mjs:126-131` 只认 `reason` 以
     `surface_absent:` 或 `permission_required:` 开头
   - 命中后才输出具体 adapter 修复指引（`writeTo` 指向 adapter contract +
     `repair`），否则降级为通用消息 "Read research_access.reason, resolve or
     switch the unavailable search/fetch environment, then let the Agent rerun
     the real HITL1 probe."
   
   但 `schema/contracts/profile.mjs:34` 的 `reason` 只是 `TrimmedNonEmptyString`，
   **不校验前缀**；probe agent 返回的自由文本 reason（"Native fetch blocked by
   host policy…"、"All three candidates exhausted…"）都不带前缀，Phase Agent 又按
   phase-hitl1 §3d "将 valid return 原样写入" 原样持久化。结果：gate 的分类分支在
   真实弱模型 probe return 上从不命中，`surface_absent`/`permission_required` 的
   具体修复指引永远不出现，`external_action` 只剩一句通用重试消息，无法区分
   "宿主无 fetch surface" 与 "宿主 policy 拒绝 fetch"。

   **(b) host 能搜不能抓时无诊断前进路径。**
   当搜索可用、fetch 被永久阻断、curl egress 也失败时，HITL1 advice 只给一条
   generic rerun 指令，无任何诊断区分（transient network vs surface absent vs
   permission denied），也无 documented degraded/alternative 路线。run 只是停在
   HITL1，用户除了"换环境重试"外得不到可操作信息。这是 by-design fail-closed 的
   正确行为，但产品/DX 层面缺少对"结构性不可用"的识别与建议。

3. **弱模型执行产物（→ 挂起参考，非活跃缺陷）**：三次独立 probe agent 返回的
   `probed_at` 都是 `2026-08-11T00:00:00.000Z`（精确午夜、跨 agent 相同、明显非
   实际探测时间）。Phase Agent 写入 profile 时已用真实时间戳替换。按
   `_backlog/_done/_suspened_bugs/` 分诊约定，此类属弱模型执行纪律问题，不列为
   活跃框架缺陷。

## Repro

1. 在 selected host（deepseek-v4 via `claude-deepseek.mjs`）上运行 HITL1，
   此时 host 的 WebSearch 可用但 WebFetch 被 policy 阻断、curl egress 失败。
2. 运行隔离 capability probe（`site:wikipedia.org "Internet protocol suite"`）。
3. probe agent 返回 unavailable，reason 为自由文本（无 `surface_absent:` /
   `permission_required:` 前缀）。
4. Phase Agent 按 §3d "原样写入" 持久化 reason。
5. `check-gate-hitl1-recorded.mjs` → `research_access_available` 失败，hint 的
   `write_to` 是通用 `External research-access prerequisite recorded at
   ...#/research_access/reason`，不指向 adapter contract（无根因分类）。
6. 无任何可操作前进路径；重跑同一 probe 结果不变。

## Suggested direction

- **校验/归一化 reason 前缀**：在 probe-return 边界（Phase Agent 写入 profile 前，
  或 schema 层）强制或归一化 `surface_absent:` / `permission_required:` 词汇，
  使 gate 的 `selectedAdapterUnavailableRoot` 分类分支在真实 return 上命中；或让
  gate 对无前缀 reason 做宽容分类（如按 reason 文本特征归到两个根之一），不再
  静默降级为 generic 消息。
- **结构性不可用的诊断**：当同一 host 连续 probe unavailable 且失败模式一致
  （search 成功 + fetch 全阻 + curl egress 失败）时，在 HITL1 advice 中给出
  "host 结构性不可用" 的明确提示与可选路线（换 adapter / 换 host / 确认出站
  网络），而不是只让用户"检查网络后重试"。
- **探测目标采样扩展（中国网络环境的假阴性问题）**：把固定单一 Wikipedia query
  改为少量多类 fetch 目标采样（如上述 3 类站点：通用可达站 / 非 Wikipedia 海外
  文档/博客站 / Wikipedia），让 `available`/`unavailable` 能区分"完全不能抓" vs
  "特定目标被挡"，避免 GFW 环境下把整体 fetch 能力误判为不可用而阻断 run。

## Verification

- 构造 reason 带 `permission_required:` 前缀的 unavailable observation →
  gate 应输出指向 adapter contract 的 `write_to` 与对应 `repair`（现状：通用消息）。
- 构造 reason 无前缀的 unavailable observation → gate 应要么归一化分类，要么明确
  暴露 `missing_contract`/分类缺失，而不是静默降级。
