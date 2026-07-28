# _done — 已完成/已归档记录

> 最后更新: 2026-07-28 | `_backlog/_done/` — 所有已完成内容与已吸收设计输入的归档根目录。
> **`_` 前缀 = coding agent 默认忽略，除非显式点名要读。**
>
> 状态总览和查阅指南在本文件。活跃工作的 PENDING 表、依赖链、执行顺序 → 见 [`../todos/README.md`](../todos/README.md)。

## 目录

```
_done/
├── README.md              # 本文件（状态总览 + 查阅指南）
├── _fixed_bugs/           # 已修复/结案 Bug（123 个，含间隔）
├── _suspened_bugs/        # 悬挂 Bug（3 个：BUG-026, 028, 030）
├── _done_todos/           # 已完成 TODO（16 个，DONE-001~016）+ 已吸收 standalone TODO（3 个）
├── _closed_plans/         # 已完成 Plan（38 个）
└── _old_topics/           # 历史归档（⚠️ 勿读，除非显式要求）
```

---

## 状态总览

### ✅ DONE（已完成/已归档）

| 归档目录 | 数量 | Next ID |
|---------|------|---------|
| `_fixed_bugs/` | 124 个已修复/结案 bug（含间隔） | BUG-139 |
| `_suspened_bugs/` | 3 个悬挂 bug（BUG-026, 028, 030） | — |
| `_done_todos/` | 16 个已完成 todo（DONE-001~016）+ 3 个已吸收设计输入（非实现） | DONE-017 |
| `_closed_plans/` | 38 个已完成 plan | — |
| `_old_topics/` | 历史归档：`_v12-migration/`（6 个 OpenSpec change 全 DONE）、`_workflow/`（8 个 OpenSpec change 全 ARCHIVED）、`_original_dpt_requirement/`、`_original_dpt_v12/`、`_guideline/`、`_trainsistion/` | — |

关键完成项（按完成日期）：
- **prototype loop engineering**（2026-06-16~18）：gate-loop、gate-fork、subagent、workflow-next 四个原型全部 DONE。详见 `_done_todos/DONE-prototype-*.md`
- **queue engine**（2026-06-16~18）：`queue-manager.mjs` 完整实现，AGQ-001~006 全部 accepted
- **workflow foundation**（2026-06-16~24）：10-phase lifecycle 完整实现，19 phase node MD + 6 shared node MD，9 gate CLI
- **queue-loop 接入**（2026-06-20~24）：seed-topics + wave0 + wave1 三个 phase 已接入 queue-driven 三阶段
- **实验验证**（2026-06-16~24）：16 个 experiment playbook，5 个 prototype 实验
- **agentic-queue-landing-analysis**（2026-06-23）：Queue loop 设计分析。详见 `_done_todos/DONE-agentic-queue-landing-analysis.md`
- **rerun-incremental-node**（2026-06-24）：HITL2 增量重跑节点。详见 `_done_todos/DONE-rerun-incremental-node.md`
- **plan-hostfile-sections**（2026-06-25）：`rb_plan.md` 内部 Section 化。详见 `_done_todos/DONE-plan-hostfile-sections.md`
- **wave1-sufficiency-gates**（2026-06-26）：研究充分性标准——4 套 research style JSON + CLI + 动态阈值。详见 `_done_todos/DONE-wave1-sufficiency-gates.md`
- **HITL UX**（2026-06-27）：HITL 环机制——3 个浮出水面点 + 静默自主契约 + 预设 prompt 模板。详见 `_done_todos/DONE-hitl-ux.md`
- **BUG-007 修复 — harden-rerun-topic-integration**（2026-06-29）：3 条独立根因链 → 多个新基础设施。详见 `_fixed_bugs/BUG-007-rerun-incremental-topic.md`
- **harden-stop-contract**（2026-07-02）：五层防御 stop:no 合约。详见 OpenSpec archive `2026-07-02-harden-stop-contract`
- **evidence-extraction 核心计数**（2026-07-02 落地 / 2026-07-09 todo 归档 DONE-015）：countReferences() + isCountable() + Engine-computed ref_count 已在 `ref-count.mjs`；后续用户控制和问题闭环见活跃 `plans/research-question-closure-and-evidence-judgment.md`。详见 `_done_todos/todo-evidence-extraction.md`

> 📋 **PENDING 待办、依赖链分析、推荐执行顺序** → 见 [`../todos/README.md`](../todos/README.md)

---

## 快速查阅指南

### 想看"现在该做什么"
→ [`../plans/research-question-closure-and-evidence-judgment.md`](../plans/research-question-closure-and-evidence-judgment.md)——当前先关注 HITL1 用户控制贯通，再做 Wave1→Wave2 问题闭环与模型主导的证据判断

### 想看 _backlog 的规矩
→ `../README.md` — 三套搬迁 ritual（todo / bug / plan）

### 想看历史决策
→ `_old_topics/_v12-migration/decisions.md`（7 个架构决策）
→ `_done_todos/` 下 16 个 DONE 文件与 3 个已吸收设计输入（按文件名主题查阅）

### 想看技术深度
- **queue loop 怎么设计** → `_done_todos/DONE-agentic-queue-landing-analysis.md`（59KB，最详细）
- **transition 层的坑** → `_old_topics/_trainsistion/review_and_suggestion.md`
- **workflow 怎么拆成 change** → `_old_topics/_workflow/openspec-change-map.md`
- **术语怎么乱** → `_old_topics/_guideline/terminology-gap-audit.md`
- **研究充分性标准怎么定** → `_done_todos/DONE-wave1-sufficiency-gates.md`
- **BUG-007 怎么修的** → `_fixed_bugs/BUG-007-rerun-incremental-topic.md`

### 想看具体 TODO 的设计思路
→ `../todos/todo-*.md`，每个都包含：Why、核心挑战、实验范围、关键设计问题、实现思路
