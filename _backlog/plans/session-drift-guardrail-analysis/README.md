---
title: Per-OpenSpec-Session Drift Guardrail — Analysis
status: analysis_complete_final_recommendation_in_08
created: 2026-07-30
predecessor: framework-contract-remediation-openspec-sequence
source_bugs:
  - BUG-143
  - BUG-146
  - BUG-148
  - BUG-150
  - BUG-151
  - BUG-152
  - BUG-153
  - BUG-154
  - BUG-155
  - BUG-156
  - BUG-157
  - BUG-158
  - BUG-159
  - BUG-160
  - BUG-162
  - BUG-170
  - BUG-171
  - BUG-172
  - BUG-173
  - BUG-174
  - BUG-175
  - BUG-176
  - BUG-177
  - BUG-178
  - BUG-179
  - BUG-180
  - BUG-181
  - BUG-182
  - BUG-183
  - BUG-184
  - BUG-185
  - BUG-186
explored_mechanism: two-tier (derived consumption-boundary check + declared semantic-object card)
recommendation: one OpenSpec-centered feedback loop — short AGENTS/CLAUDE routing, OpenSpec 1.7 artifact/operation guidance, persistent finding tasks, risk-led Agent review, supported-entry convergence, and a guarded governance finalizer around native archive (`08`)
related:
  - _backlog/plans/framework-contract-feedback-and-control-structure-analysis.md
  - _backlog/plans/framework-contract-remediation-openspec-sequence.md
---

# Per-OpenSpec-Session Drift Guardrail — Analysis

## 0. 这份文档是什么

这是一份 **analysis-only 规划文档**。它记录“如何为每一个 OpenSpec session
引入一个自动机制，防止 BUG-143…186 那类反复出现的语义漂移 bug”的**完整思考路线**
——包括走通的结论和走不通的死路。它**不创建 OpenSpec change，也不改任何实现代码**。
最终建议与要创建的 change 边界在 `08`；真正 artifacts 仍须由后续 `/opsx:propose` 单独承载。

它是 `_backlog/plans/framework-contract-remediation-openspec-sequence.md` 的**前件/伴随件**：
那份计划决定“修哪几个已知语义对象”（C1–C5）；本文决定“之后怎样在 change lifecycle 中重新触发
相关 review、持久化 finding，并闭合可确定检查”。前者修已知内容，后者降低跨 change 复发率；边界不同，
但会在 apply/archive closeout 汇合。

`01`–`07` 保留探索和压力测试路线；**最终组装结论以 `08` 为准**。`08` 修正了早期文档的两个
关键问题：不能把三个 governance checker 的漏执行说成整批 bug 的内容根因，也不能把
`AGENTS.md` / `CLAUDE.md` / `tasks.md` 本身误叫作自动执行器。

## 1. 结论（TL;DR）

反复出现的“基础 bug”**不是态度问题**，但也不能只归因于一个机器级执行缺口。内容侧的根因是
同一事实被 writer、reader、reentry、Gate 和时间投影沿多条路径解释；生命周期侧的缺口是
propose→apply→archive 没有稳定地重新推送相关 review，也没有把既有 governance check 与最终
archive move 绑定。三个 checker 今天仍以 `tasks.md` 文本为主、archive 不强制调用；这只解释
为什么它们覆盖的机械不变量会漏跑，**不能解释或防住整批 BUG-143…186**。

我们探索过一个更有野心的两层自动机制（**派生的**消费边界检查 + **声明的**语义对象卡）。
对抗性压力测试把它**大幅收窄**：

- **声明卡层（Tier B）直接撞 GCO-007**（`guidance-constitution/spec.md:91`）：语义精度
  反思“SHALL be short connected reasoning, **not a required field schema … deterministic
  validator**”。把它合法化意味着在**错误的层**打一场宪法战（GCO-003 admission test，
  `spec.md:21-31`，抵制把 incident-driven 的机制规则抬到宪法层）。
- **派生检查层（Tier A）按原样会在当前 repo 上误报**：“两个源”其实是 ~7 个**故意发散**的
  站点；`rule.target` 是粗粒度 inspection glob，**不是 authority 声明**；且它根本抓不到
  点名的 bug——BUG-178 的缺陷在分类**逻辑**里，不在 target 声明里（见
  `evidence/B-consumption-graph-derivability.md`、`evidence/D-adversarial-stress-test.md`）。

最终推荐不是两个松散层，而是 `08` 的**一个 loop**：复用历史上已经有效的
`config.rules.tasks -> tasks.md -> openspec/governance checker` 接入链；再用 OpenSpec 1.7 的
`operations.apply/archive.guidance` 自动把 targeted review 推回当前 Agent。finding 进入未完成 tasks；
archive 时对 change-scoped actual diff 再 review；最后由 governance finalizer 在 lifecycle marker、任务和
现有 checker 全部通过后包装 native OpenSpec archive。新的有界 lifecycle capability 拥有这条 feedback loop；现有
RET/VER capability 继续拥有各自 checker 的事实。`AGENTS.md` / `CLAUDE.md` 只放短路由，七问保留
单一 guidance 来源；项目声明支持的入口必须收敛到同一个 finalizer。

只有真实复发证明现有 reviewer + regression + finalizer 仍有一个可机械推导的窄缺口时，才回头做
定向 Tier-A；不预先建设全 repo 语义扫描器。

## 2. 文档索引

| 文件 | 回答什么 |
|---|---|
| `01-root-cause-enforcement-is-manual.md` | 生命周期根因之一：现有 req/spec/routing checker 未与 archive move 绑定 |
| `02-explored-two-tier-design.md` | 我们设计的两层自动机制（Tier A 派生 + Tier B 声明 + 挂载点） |
| `03-stress-test-why-it-narrowed.md` | 为什么两层设计被收窄，以及补充的 OpenSpec 1.7 / multi-adapter 事实：S0–S9 |
| `04-recommendation-archive-governance-gate.md` | 必要 hard floor：三个 checker 与 archive move 绑定；最终实现由 `08` 修正为 repo-owned finalizer |
| `05-deferred-openspec-change-sketch.md` | 已被 `08` 取代的 narrow hard-floor provisional sketch，保留历史路线 |
| `06-soft-guidance-loop-design.md` | advisory 跨 session guidance loop 与 7 条 meta-question；触发/载体已按 OpenSpec 1.7 收束到 `08` |
| `07-open-question-guidelines-into-openspec.md` | **本机制已决定 A**：`guidelines/` 不搬；guidance 修改走 OpenSpec lifecycle，并由 config bridge 在事件上主动注入 |
| `08-final-recommendation-openspec-feedback-loop.md` | **最终建议**：OpenSpec-centered feedback loop；明确 lifecycle ownership、AGENTS/CLAUDE、operation guidance、tasks、Agent reviewer、supported entry 与 guarded finalizer 的边界 |
| `evidence/A-session-lifecycle-and-attach-points.md` | session 生命周期、OpenSpec 1.7 operation guidance 与 executable gate 缺口核实 |
| `evidence/B-consumption-graph-derivability.md` | artifact→evaluator 消费图的可派生性核实 |
| `evidence/C-object-card-dimensions.md` | 语义对象卡的 10 个维度：哪些已声明/未表示/未 enforce |
| `evidence/D-adversarial-stress-test.md` | 完整 S0–S7 + go/narrow/redirect 判定 |
| `evidence/E-governance-integration-history.md` | governance 从真实 archive 事故到 config task 注入、accepted spec、verification-routing 的历史消费链与量化效果 |

## 3. 与 C1–C5 的关系

active change set 与 task 进度是易变事实；后续 proposal 必须重新运行 `openspec list --json`，不能把
本次审阅时看到的名称、数量或完成度写进 migration/runtime logic。
本文的最终推荐项是一个**横切 lifecycle change**（`establish-openspec-change-feedback-loop`），
不属于 C2–C5 中任何一个。它是后续 focused meta change；proposal 时仍 active 以及之后创建的 change
会在 apply/archive 事件收到 targeted feedback，并在归档时由 deterministic finalizer 闭合，从而把
“修内容”和“验证本次 change 未留下同类漂移”接成一条可返回的回路。

## 4. 需要避免的错误归因

- **不要归因于“态度/不够小心”**：机械侧缺的是 checker 与 transition 的绑定；语义侧缺的是事件触发的
  review、durable finding 和回返路径。让人“更小心”不能替代这两部分机制。
- **不要造一张新手填的 map**：手填 map 自己也会漂移——这正是 BUG-146/162 的 archived fix
  当初**拒绝**建 registry 的原因（`design.md:61`）。
- **不要去和 GCO-007 硬刚**：把语义精度做成 deterministic validator（pass/fail 裁决）是被宪法明确禁止的。
  但 **advisory 提醒是允许的**（见 `06`：advisor 给反馈、不裁决）——机器**裁决**只限机械事实，机器**提醒**
  可以覆盖语义类。区分 verdict 与 reminder 是这个项目的活路。
- **不要用 Tier A 原样跑当前 repo**：它会在 wave1 上误报（intentional narrowing），且抓不到 BUG-178。
- **不要把 SessionStart banner 当挂载点**：repo 同步 `AGENTS.md`↔`CLAUDE.md`（多 harness），
  Claude-only hook 不可移植、易腐烂、误报疲劳。
- **不要直接把完整规则粘进生成的 OpenSpec skill/command**：repo 同时有 Claude/Codex/通用 adapter，
  且 `openspec update` 会重新生成 instruction；以 `openspec/config.yaml` dynamic guidance 为主，adapter
  只保留经过测试的薄调用。
