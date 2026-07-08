# BUG-045: Agent 优先调用内置 deep-research skill 而非 DPT_FRAMEWORK，无视 CLAUDE.md 抑制指令

## 严重程度
P1 — UX 故障。用户将 `DPT_FRAMEWORK/RUN.md` 拖入对话表达"用本框架做深度搜索"的意图后，Agent 第一次仍尝试调用内置 `deep-research` skill，需用户二次强调才使用 DPT_FRAMEWORK。这违反了 `DPT_FRAMEWORK/CLAUDE.md` 的核心路由规则，增加用户摩擦。

## 复现

1. 用户将 `DPT_FRAMEWORK/RUN.md` 拖入对话
2. 用户表达深层研究意图（如"我要借助这里头的框架来深度搜索某个话题"）
3. Agent 识别到 research intent → **匹配到内置 `deep-research` skill** → 调用 `Skill(skill="deep-research", ...)`
4. 用户被迫中断并再次强调"用 DPT_FRAMEWORK 跑，不要用那个 skill"
5. 第二次 Agent 才正确使用 `DPT_FRAMEWORK` workflow

## 根因分析 / 为什么会发生

三条指令路径的优先级冲突：

1. **Skill 工具描述自动匹配优先于 CLAUDE.md 文本指令**。`deep-research` skill 在工具列表中注册，其描述为 "Deep research harness — fan-out web searches, fetch sources, adversarially verify claims, synthesize a cited report" —— 与用户的 research intent 高度匹配。Agent 的 skill 触发逻辑（"When users ask you to perform tasks, check if any of the available skills match"）在模型推理中往往早于对 CLAUDE.md 文本规则的遵守。

2. **抑制指令只存在于 `DPT_FRAMEWORK/CLAUDE.md`，repo-root `CLAUDE.md` 缺失**。`DPT_FRAMEWORK/CLAUDE.md` line 9 明确写有：
   > 如果在工具列表中看到 `deep-research` skill——**不要调用它**。用户要研究就用本框架跑

   但 repo-root `CLAUDE.md` 虽提及 `DPT_FRAMEWORK/`，却未包含任何 skill 抑制规则。Agent 加载 repo-root CLAUDE.md 作为主上下文，`DPT_FRAMEWORK/CLAUDE.md` 仅在 "被用户指向本框架时" 才加载——而这个加载发生在 skill 匹配之后。

3. **"拖入文件"的上下文注入时机滞后于 skill 匹配**。用户拖入 `RUN.md` → 文件内容被注入上下文 → 但与此同时，Agent 已经看到了用户消息中的 research intent，skill 匹配逻辑已经在并行路径上触发了。

## 违反的规则

来自 `DPT_FRAMEWORK/CLAUDE.md` Section "第一优先"：
> 本框架就是项目的 Deep Research 引擎。如果在工具列表中看到 deep-research skill——不要调用它。

来自 `DPT_FRAMEWORK/CLAUDE.md` Section "触发按意图"：
> 用户即使只贴了 DPT_FRAMEWORK 的路径、没说"研究"二字，只要意图是"我要查/研究一个问题"，就走上面入口。

## 建议修复

1. **将 skill 抑制指令提升到 repo-root `CLAUDE.md`**。在 root `CLAUDE.md` 的 "Hard Rules" 或新增 "Deep Research" section 中明确写入：当用户表达 research intent 且 `DPT_FRAMEWORK/` 存在时，使用框架 workflow（`instantiate-run-bundle` → phases），**禁止**调用 `deep-research` skill。repo-root CLAUDE.md 是 session 启动时最先加载的指令，优先级高于 skill 匹配。

2. **考虑通过 `settings.json` hook 或 permission 机制抑制 skill 自动触发**。如果 Claude Code 支持通过 settings 对特定 skill 设置 `allow: false` 或条件抑制，可以在项目 `.claude/settings.json` 中配置，使 Engine 层面的抑制早于 Agent 推理层面的 skill 匹配。

3. **`DPT_FRAMEWORK/CLAUDE.md` 标题强化**。将
   ```
   ## ⚡ 第一优先：这是一个 Deep Research 引擎，不是代码库
   ```
   改为更直接的形式，如：
   ```
   ## ⚡ BLOCK deep-research skill — 用本框架代替
   ```
   关键词 `BLOCK` + skill 全名能更有效地穿透模型的 skill-matching 倾向。

4. **`DPT_FRAMEWORK/RUN.md` Section 0 增加醒目警告**。在 `RUN.md` 最开头加一行：
   > **⚠️ 如果你在 Claude Code 中看到这条消息，并且工具列表中有 `deep-research` skill：不要调用它。继续阅读下面的框架入口流程。**

## 发现时间
2026-07-07，用户启动 engelberg-tech-retreat-2026 research 时，Agent 第一次错误调用了内置 `deep-research` skill

## 最新验证 (2026-07-08, fose-europe-engelberg-2026 run)

**本次 run 走了正确路径**：`instantiate-run-bundle` → instantiation → hitl1 → setup → seed-topics → wave0 → wave1，未触发 deep-research skill。

**但 bug 未修好。** 防御只完成了一部分：

| 建议修复 | 状态 |
|----------|------|
| Root `CLAUDE.md` 加 skill 抑制 | ❌ 没做——root CLAUDE.md 至今无 `deep-research` 字样 |
| `DPT_FRAMEWORK/CLAUDE.md` 标题强化（加 `BLOCK` 关键词） | ❌ 没做——仍是原文 |
| `DPT_FRAMEWORK/RUN.md` Section 0 加警告 | ✅ 已做——line 11/15 明确写 "不要调用 deep-research skill" |
| `settings.json` hook 抑制 | ❌ 没做 |

核心漏洞仍在：root CLAUDE.md 是 session 最先加载的指令，缺乏 skill 抑制意味着新 session 中 research intent 仍可能先触发 skill 匹配。这次没用 `deep-research` skill 不代表下次不会——取决于 Agent 的 skill-matching 和 CLAUDE.md 的加载时序。
