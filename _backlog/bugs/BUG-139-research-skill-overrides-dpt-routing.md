---
bug_id: BUG-139
title: "research skill (generic) overrides DPT_FRAMEWORK routing, same root cause as BUG-045"
severity: P2
discovered: 2026-07-28
bundle: (interactive session, no bundle — user invoked research intent inline)
affected: CLAUDE.md Deep Research Routing rule
related: [BUG-045]
---

# BUG-139: `research` skill 劫持 DPT_FRAMEWORK 路由，同 BUG-045 根因

## 现象

用户在消息开头明确提及 `DPT_FRAMEWORK/RUN.md`，表达"再研究一下 OpenSpec 的 spec-bloat 问题"的 research intent。

CLAUDE.md line 19 明确写道：
> research, deep-research, investigation, or report intent with `DPT_FRAMEWORK/` selected uses `DPT_FRAMEWORK/RUN.md` and the framework workflow; do not invoke a built-in `deep-research` or equivalent one-shot shortcut.

但 Agent 仍匹配并调用了 `Skill(skill="research", ...)` —— 通用的内置 research skill，而非走 `DPT_FRAMEWORK/RUN.md` 的框架工作流。

## 与 BUG-045 的关系

BUG-045 描述的是 **`deep-research` skill** 劫持框架路由。当时用户拖入 `DPT_FRAMEWORK/RUN.md`，Agent 第一次调了内置 `deep-research` skill。

这次是 **`research` skill** —— 同一个路由漏洞的第二个 skill。两个 skill 都是"built-in one-shot shortcut"，CLAUDE.md 的"do not invoke a built-in `deep-research` or equivalent one-shot shortcut"虽然覆盖面语义上包含了 `research`，但文本只点名了 `deep-research`，对 `research` 的抑制力不足。

BUG-045 的修复状态（引自其验证记录）：
| 建议修复 | 状态 |
|----------|------|
| Root `CLAUDE.md` 加 skill 抑制 | ❌ 没做 |
| `DPT_FRAMEWORK/CLAUDE.md` 标题强化（加 `BLOCK` 关键词） | ❌ 没做 |
| `DPT_FRAMEWORK/RUN.md` Section 0 加警告 | ✅ 已做 |
| `settings.json` hook 抑制 | ❌ 没做 |

**核心漏洞仍在**：root CLAUDE.md 没有显式 skill 抑制，skill-matching 在模型推理中的优先级高于 CLAUDE.md 文本规则的遵守。

## 根因

同 BUG-045 —— Skill 工具描述自动匹配优先于 CLAUDE.md 文本指令。`research` skill 描述为 "Investigate a question against high-trust primary sources and capture the findings as a Markdown file in the repo"，与用户的 research intent 高度匹配。Agent 的 skill 触发逻辑（"When users ask you to perform tasks, check if any of the available skills match"）在模型推理中往往早于对 CLAUDE.md 文本规则的遵守。

## 建议修复

1. **Root CLAUDE.md "Deep Research Routing" section 显式列出需抑制的 skill 名称**：
   ```markdown
   ## Deep Research Routing
   
   **SKILL SUPPRESSION**: When the user expresses research/deep-research/investigation/report intent
   and this repo's `DPT_FRAMEWORK/` is present, **do NOT invoke** any of these built-in skills:
   `deep-research`, `research`. Use `DPT_FRAMEWORK/RUN.md` instead.
   ```
   点名 `research` 和 `deep-research` 两个 skill 名称比泛泛的"or equivalent one-shot shortcut"更能穿透 skill-matching。

2. **考虑 `settings.json` 权限抑制**：如果 Claude Code 支持对特定 skill 设置条件抑制，应将其作为 Engine 层面的防线。

3. **长期**：CLAUDE.md 文本抑制和 skill 自动匹配之间是结构性冲突——skill 匹配发生在 harness 层，CLAUDE.md 解释发生在模型推理层。如果 harness 能支持"上下文敏感 skill 抑制"（如检测到某文件在上下文中时禁用特定 skill），这才是可靠解法。关注 Claude Code 是否有此路线图。

## 复现条件

1. 用户消息中同时包含：
   - `DPT_FRAMEWORK/RUN.md`（或框架路径）的引用
   - "research"/"研究"/"investigate" 等意图词
2. 工具列表中 `research` skill 可用
3. Agent 在 skill-matching 阶段命中 `research` skill 描述 → 调用 `Skill(skill="research")` 而非走框架路由

## BUG-045 修了，为什么没拦住？

BUG-045 的修复是一个 **point-fix，不是 class-fix**：

- **修了什么**：在 `DPT_FRAMEWORK/RUN.md` Section 0 加了一行警告"不要调用 deep-research skill"。只点名了一个 skill。
- **没修什么**：
  - Root `CLAUDE.md` 没有加任何 skill 抑制——而 root CLAUDE.md 是 session 最先加载的指令，skill-matching 在这之前没有防线
  - 抑制文本只写了 `deep-research` 一个字面量，没有覆盖 `research`、`investigation` 等同义 skill
  - 没有从 skill 类别层面做阻断（"任何名称包含 research 的 one-shot shortcut"）

结果就是今天 `research` skill 从同一个漏洞穿过来——skill-matching 看到一个叫 `research` 的工具，描述匹配用户意图，CLAUDE.md 里又没有点名禁止它，于是触发了。

**教训**：文本层面的 skill 抑制必须枚举所有可能匹配的 skill 名称。靠语义推论（"equivalent one-shot shortcut"）在 skill-matching 的优先级面前不够硬。

## 临时 workaround

无可靠的 Agent 侧 workaround——这是路由优先级问题。用户在观察到 Agent 错误调用 `research` skill 后需手动中断并重新强调"用 DPT_FRAMEWORK 跑"。
