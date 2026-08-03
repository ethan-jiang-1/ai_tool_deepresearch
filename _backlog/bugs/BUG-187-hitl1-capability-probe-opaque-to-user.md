---
bug_id: BUG-187
title: "HITL1 capability probe (§3d) runs with no user-facing explanation, exposing framework plumbing as noise in user session"
severity: P3
discovered: 2026-08-03
bundle: dpt_rb_agentic-rd-org-delivery-systems-2026
phase: hitl1
node: phases/phase-hitl1.md
---

# BUG-176: HITL1 capability probe opaque to user

## 现象

用户在 HITL1 完成决策后，Agent 突然执行了一个和当前研究完全无关的 WebSearch
（`"HTTPS protocol specification RFC 2026"`），然后尝试 WebFetch 被
enterprise security policy 拦截，再走 `curl` fallback，最后将这些基础设施探测
结果写入了 `rb_profile.yaml` 的 `research_access` 字段。

整个过程对用户来说像是 **"突然冒出来的诉求"**——用户在跑一个关于
"Agentic R&D Org Delivery Systems" 的研究 bundle，完全没预期会看到 HTTP
spec 的搜索出现在屏幕上。

## 根因：这不是 bug，是设计如此，但 UX 侧完全缺失

`phase-hitl1.md` §3d 定义了 HITL1 出口前的 **bounded capability probe**：
在进入 silent autonomous execution 之前，Agent 必须用当前环境的实际
search/fetch surface 做一次 neutral capability-only search，确认工具确实可用。

机制本身是合理的——框架需要在投入 wave0-wave2 自主研究之前验证网络能力。
但规范只说 *做什么*，没说 *如何让用户理解正在发生什么*：

1. **无用户可见的前置说明**：§3d 要求 Agent 静默执行 probe，`brief/hitl1.md`
   出口语只说"已记录。接下来进入静默自主执行"，完全没提 probe 这一步
2. **中性搜索 query 是 Agent 任意选择的**：规范只说"neutral capability-only
   search"，不提供标准 query。不同 session 会出现不同的无关搜索内容，
   用户每次看到的"神秘搜索"都不一样
3. **基础设施错误暴露给用户**：native WebFetch blocked → curl fallback
   这个过程把 enterprise security policy、域名安全验证、curl 命令行等
   框架 plumbing 呈现在用户面前——用户来研究 Agentic R&D，不需要知道
   `greenbytes.de` 被企业策略拦截了
4. **`research_access` 与用户 HITL 决策混在同一文件**：`rb_profile.yaml`
   同时承载用户的研究偏好决策（profile、must-answer set、style）和框架的
   基础设施观察（`fetch_surface: curl`、`eligible_candidate_count: 2`），
   前者是用户可理解的，后者是纯框架 plumbing

## 影响

- **P3**（非阻塞）：probe 本身正常工作，gate pass，bundle 正确推进到 setup →
  seed-topics → wave0。功能上没有破坏。
- 但用户在 HITL1 出口看到的内容破坏了框架承诺的"静默自主执行"体感——
  用户以为框架会在后台安静工作，结果屏幕上出现了无关搜索和 curl 报错。
- 如果 native fetch 被 block 但 curl 不可用，用户会看到 `research_access:
  unavailable` 但缺少上下文来理解这意味着"研究跑不下去了"还是"有个临时
  网络问题"。

## 重现

任何 `exploratory_map`（或任意非 `debug` profile）的 HITL1 出口都会触发
§3d probe。以本次 `agentic-rd-org-delivery-systems-2026` 为例：

1. HITL1 用户决策写入 → Agent 读 `phase-hitl1.md` §3d
2. Agent 执行 `WebSearch("HTTPS protocol specification RFC 2026")`
3. Agent 对返回的 URL candidate 1 执行 `WebFetch`
4. WebFetch blocked → Agent 执行 `curl` fallback（同一 URL）
5. Agent 将 probe 结果写入 `rb_profile.yaml#/research_access`
6. `check-gate-hitl1-recorded.mjs` pass → `enter-phase setup`

用户在第 2-4 步看到完全无关的搜索内容和错误信息，在第 5 步的
`rb_profile.yaml` diff 中看到一堆不明所以的字段。

## 建议修复方向

1. **最小修复**：在 §3d 开头加一个 user-visible notice 模板，Agent 在
   probe 开始前必须输出。例如：

   > "在进入静默研究前，我先验证一下搜索和网页抓取工具是否可用——这是一个
   > 快速的中性能力检查，不是研究内容。大约 15 秒。"

   这 3 句话给用户上下文，不会显著增加交互摩擦。

2. **Standard probe query**：框架提供一个固定的中性 probe query（如
   `"site:wikipedia.org Internet protocol suite"`），消除不同 session
   之间搜索内容的随机性，用户至少每次看到的内容一致。

3. **抑制探针过程中的基础设施错误**：Agent 不把 native fetch blocked / curl
   fallback 的细节直接渲染给用户（除非 curl 也失败导致 probe `unavailable`）。
   成功路径只输出一行 "✓ 网络能力确认：正常"。

4. **分离 plumbing 和 user decision**：考虑将 `research_access` 移到
   `rb_status.json` 或 `_diagnostics/` 中，而不是和用户的 HITL 决策放在
   `rb_profile.yaml` 同一文件。或者至少给这个 section 加一个 `# 以下为框架自动探测结果，非用户决策` 注释。
