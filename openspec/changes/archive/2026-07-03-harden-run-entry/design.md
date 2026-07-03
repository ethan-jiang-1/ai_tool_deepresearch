## Context

DPT_FRAMEWORK 的入口是 `RUN.md`——一个 drag-trigger Markdown 文件。用户将其拖入对话后，文件内容进入 agent 上下文，agent 按指令启动框架。

当前问题：
- RUN.md Section 1 用了"默认走框架"、"不要默认回退"等偏好性措辞；一旦 RUN.md 内容进入上下文，入口文件需要在最早位置给出更强的条件-动作指令，降低 agent 继续调用内置 `deep-research` skill 或等价 research shortcut 的风险
- 项目没有版本标识，无法判断当前运行的是哪个版本的框架

本 change 纯 Markdown 层面改动，不涉及 JS/CLI/schema。

## Goals / Non-Goals

**Goals:**
- RUN.md 在 agent 读到的最早位置（版本横幅之后、原 Section 1 之前）插入显式的 skill 禁用指令
- RUN.md 顶部宣告版本号 v0.1
- 同步强化 CLAUDE.md / AGENTS.md / README.md 中的措辞
- 创建 CHANGELOG.md 记录初始版本能力

**Non-Goals:**
- 不引入 JS/CLI 层面的 skill 拦截机制（那是 Claude Code 平台层的事，不在本框架控制范围内）
- 不声称能拦截 RUN.md 尚未进入上下文之前的平台级 tool/skill routing
- 不引入自动化版本号注入（如 git tag → MD）
- 不创建 semver 校验或版本比较逻辑
- 不修改 phase node、gate definition、schema contract

## Decisions

### D1: 指令位置——在 RUN.md 标题后、Section 1 前插入 Section 0

**选此方案**：将 RUN.md 顶部顺序固定为：

```text
# RUN.md — DPT_FRAMEWORK 入口
> **DPT_FRAMEWORK v0.1**

## 0. 禁用内置捷径（最高优先）
...

> **这个文件在对话中即触发**
...

## 1. 先确认引擎（一句话）
```

**理由**：这是 agent 上下文中的第一条实质性指令。版本横幅是元信息（一行带过），Section 0 是行为指令。agent 在解析完标题后立刻读到"不要调用 deep-research skill"——比原来 Section 1 的"先确认引擎"更靠前、更直接。

**未选方案**：放在 Section 1 内部强化措辞。这不能解决"agent 在读完 Section 1 之前就已经路由到内置 skill"的时序问题。

### D2: 措辞策略——用"不调用"替代"默认"

当前措辞是偏好性的（"默认走框架"），改为强约束指令措辞（"如果看到 X skill → 不调用它"）。

这是一种 agent prompt engineering 策略：在 agent 上下文中用条件-动作（if-then）指令直接约束 Skill 工具调用行为。验证对象是入口文档是否给出了明确且位置靠前的指令，而不是平台是否真的禁止了 tool/skill 调用。这依赖于 LLM 的 instruction-following 能力，不是 platform-level 的 skill 禁用。如果未来 Claude Code 提供了正式的 skill 禁用 API，可以再迁移。

### D3: CHANGELOG 位置——项目根目录

**选此方案**：`CHANGELOG.md` 放在 `/Users/bowhead/ai_tool_deepresearch/CHANGELOG.md`。

**理由**：这是项目级制品，不是 framework 运行时资产。放在根目录符合开源项目惯例，也与 `README.md`、`CLAUDE.md` 等项目级文件并列。`CHANGELOG.md` 是项目级版本历史来源，RUN.md 顶部版本横幅镜像其最新版本条目。

**未选方案**：放在 `DPT_FRAMEWORK/CHANGELOG.md`。DPT_FRAMEWORK 是 read-only framework surface，放项目级 changelog 会让 framework 目录不够纯粹。

### D4: 版本号格式——`v0.1`（不是 `v0.1.0` 或 `v1.0.0`）

当前框架处于早期开发阶段。`v0.1` 表示"第一个可用版本，但 API 不稳定"。后续版本号演进不在此 change 范围内。

### D5: Capability 边界——`run-entry` 与 `version-management` 分开

**选此方案**：将入口行为和版本治理拆成两个 capability：

- `run-entry` 只约束 `RUN.md` 入口形状、内置 research shortcut 覆盖指令，以及 `CLAUDE.md` / `AGENTS.md` / `README.md` 的入口行为同步。
- `version-management` 约束项目级版本历史：CHANGELOG 位置与格式、DPT_FRAMEWORK 行为变更必须更新 CHANGELOG、RUN.md banner 与 CHANGELOG 最新版本一致、版本号在 proposal 阶段决定。

**理由**：两者的约束条件不同。`run-entry` 是 agent 读取入口文件时的行为提示；`version-management` 是跨 change 的项目演进规则。把 CHANGELOG 和版本决策塞进 `run-entry` 会让入口行为 spec 承担版本治理职责，后续非入口行为变更也需要复用这套规则时会变得别扭。

### D6: Version-management 的操作入口——同步到 `openspec/config.yaml`

**选此方案**：在 apply 阶段更新 `openspec/config.yaml` 的 proposal/tasks rules：

- proposal rule 提醒：修改 `DPT_FRAMEWORK/` 行为时必须声明是否需要 version bump；需要时声明 target version。
- tasks rule 提醒：修改 `DPT_FRAMEWORK/` 行为且需要 version bump 时，必须包含 CHANGELOG 更新步骤；更新 CHANGELOG 时同步检查 RUN.md banner。

**理由**：accepted spec 是 Source of Record，但 future change 作者通常先读 `openspec/config.yaml` 和当前 change 模板。如果 `VEM-002` / `VEM-004` 只存在于 `version-management` spec 里，容易变成"理论规则"而不是实际 workflow 纪律。`openspec/config.yaml` 不替代 spec，只把规则放到日常入口。

## Risks / Trade-offs

- **[Risk] LLM 仍可能忽略指令调用内置 skill** → Mitigation: Section 0 用条件-动作句式（if-then），并放在文件最顶部。这是当前平台能力下能做到的最强上下文信号。效果需在实际使用中观察，若仍不够可考虑 project-level `.claude/settings.json` hook 方案（需 Claude Code 平台支持）。
- **[Risk] RUN.md 进入上下文前的 routing 仍可能走平台内置能力** → Mitigation: 本 change 不声称解决上下文注入前的路由，只保证文件内容一旦被读取，最早行为指令就是覆盖内置捷径。
- **[Risk] CHANGELOG 可能过时** → Mitigation: 每个后续 change 在 apply 时更新 CHANGELOG，作为 tasks.md 的标准步骤之一。此约定写入本 change 的 RUN.md 版本 section 中提及。
