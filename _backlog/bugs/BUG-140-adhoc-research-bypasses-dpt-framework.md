---
bug_id: BUG-140
title: "Agent bypasses DPT_FRAMEWORK workflow entirely, does ad-hoc web search + manual synthesis instead"
severity: P2
discovered: 2026-07-28
bundle: (interactive session, no bundle — agent skipped framework)
affected: CLAUDE.md Deep Research Routing rule, DPT_FRAMEWORK/RUN.md
related: [BUG-045, BUG-139]
---

# BUG-140: Agent 绕过 DPT_FRAMEWORK 工作流，直接做 ad-hoc 搜索 + 手工合成

## 现象

用户消息以 `DPT_FRAMEWORK/RUN.md` 路径开头，明确表达 research intent（"再研究一下 Openspec 这种做法..."）。

Agent 的两次尝试：

1. **第一次**：调用 `Skill(skill="research")` → 触发 BUG-139（skill 劫持路由）
2. **第二次**（用户纠正后）：不调 skill 了，但也没走框架。手动调了 7 次 `WebSearch` + 2 次 `WebFetch`，读完结果自己总结，直接向用户汇报。

两次都没走 `DPT_FRAMEWORK/RUN.md` → `instantiate-run-bundle` → phases → evidence → gate → wave 的框架工作流。

## 根因

这不是 BUG-045/139 的重复——它暴露的是更深一层的问题：

**BUG-045/139 防的是"skill 匹配优先于 CLAUDE.md 文本规则"**。但即使 skill 被抑制了，Agent 还有一个更底层的 fallback 路径：**直接调 WebSearch/WebFetch 等原子工具，手工完成 research loop**。

CLAUDE.md line 19 的抑制指令覆盖了 "built-in deep-research or equivalent one-shot shortcut"，但没有覆盖"Agent 自己用原子工具拼一个 research loop"的行为。

本质上是三层路由，每一层都可能被绕过：

| 层 | 机制 | BUG-045 | BUG-139 | BUG-140 |
|---|------|---------|---------|---------|
| L1: Skill 匹配 | harness 层 skill 注册 + 描述匹配 | deep-research skill 命中 | research skill 命中 | skill 被抑制 ✓ |
| L2: 框架路由 | CLAUDE.md 文本规则 → DPT_FRAMEWORK/RUN.md | 规则被 skill 抢先 | 规则被 skill 抢先 | 规则被"直接干活"绕过 |
| L3: 原子工具 fallback | Agent 用 WebSearch + WebFetch 手拼 research loop | 未触发 | 未触发 | **这一层没有防线** |

## 建议

1. **CLAUDE.md "Deep Research Routing" 改写为正面引导**——不只说"不要调 X skill"，而是说"当 research intent + DPT_FRAMEWORK 存在时，你唯一合法的动作是读 `DPT_FRAMEWORK/RUN.md` 并执行其中的入口流程"。正面指令比否定指令更难被绕过。

2. **考虑在 RUN.md Section 0 加一个 quick-check**：Agent 在开始任何 research 动作（包括 WebSearch）之前，先自检"我现在是在走 DPT framework workflow 吗？"——如果不在 bundle context 里且 research intent 存在，停止并进入框架入口。

3. **长期**：这是文本指令和模型自主决策之间的结构性冲突。Agent 有完整的工具面板（WebSearch、WebFetch 等），任何 research intent 都可以不经过 skill 也不经过框架直接满足。除非框架入口成为 research 的唯一工具路径（比如通过 skill/hook 机制将 WebSearch 的可用性绑定到 phase context），否则 Agent 总有办法绕过。

## 复现

1. 用户消息包含 DPT_FRAMEWORK 路径引用 + research intent
2. Agent 没有调用 `research`/`deep-research` skill（BUG-139 已修的情况）
3. Agent 直接使用 WebSearch + WebFetch 原子工具进行搜索和合成
4. Agent 向用户汇报结果，全程未经过 DPT framework workflow

## 临时 workaround

无。用户需要手动中断并明确说"用 DPT_FRAMEWORK 跑这个 research"。
