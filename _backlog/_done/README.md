# _done — 已完成/已归档记录

> `_done/` 是 `_backlog` 的归档区——记录已完成内容的状态总览和查阅指南。活跃工作的 PENDING 表、依赖链、执行顺序 → 见 `../todos/README.md`。
>
> **`_` 前缀 = coding agent 默认忽略，除非显式点名要读。**

## 目录

```
_done/
├── README.md              # 本文件（状态总览 + 查阅指南）
├── _fixed_bugs/           # 已修复 Bug（13 个，BUG-001~013）
├── _done_todos/           # 已完成 TODO（14 个 DONE-*.md）
├── _closed_plans/         # 已完成 Plan（2 个）
└── _old_topics/           # 历史归档（⚠️ 勿读，除非显式要求）
```

---

## 状态总览

### ✅ DONE（已完成/已归档）

`_done_todos/`（14 个 DONE-*.md）+ `_old_topics/`（含 `_v12-migration`/6 change、`_workflow`/8 change、`_original_dpt_requirement`、`_original_dpt_v12`、`_guideline`、`_trainsistion`）+ `_fixed_bugs/`（13 个已修复 bug，BUG-001~013）+ `_closed_plans/`（2 个已完成 plan）。

关键完成项：
- **HITL UX**（2026-06-28）：HITL 环机制——3 个浮出水面点 + 静默自主契约 + 预设 prompt 模板。详见 `_done_todos/DONE-hitl-ux.md`
- **prototype loop engineering**：gate-loop、gate-fork、subagent 三个原型全部 DONE
- **queue engine**：`queue-manager.mjs` 完整实现，AGQ-001~006 全部 accepted
- **workflow foundation**：10-phase lifecycle 完整实现，19 phase node MD + 6 shared node MD，9 gate CLI
- **queue-loop 接入**：seed-topics + wave0 + wave1 三个 phase 已接入 queue-driven 三阶段
- **实验验证**：16 个 experiment playbook，5 个 prototype 实验
- **rerun-incremental-node**（2026-06-26）：HITL2 增量重跑节点。详见 `_done_todos/DONE-rerun-incremental-node.md`
- **plan-hostfile-sections**（2026-06-26）：`rb_plan.md` 内部 Section 化。详见 `_done_todos/DONE-plan-hostfile-sections.md`
- **wave1-sufficiency-gates**（2026-06-27）：研究充分性标准——4 套 research style JSON + CLI + 动态阈值。详见 `_done_todos/DONE-wave1-sufficiency-gates.md`
- **BUG-007 修复 — harden-rerun-topic-integration**（2026-07-01）：3 条独立根因链 → 多个新基础设施。详见 `_fixed_bugs/BUG-007-rerun-incremental-topic.md`
- **harden-stop-contract**（2026-07-02）：五层防御 stop:no 合约。详见 OpenSpec archive `2026-07-02-harden-stop-contract`

> 📋 **PENDING 待办、依赖链分析、推荐执行顺序** → 见 [`../todos/README.md`](../todos/README.md)

---

## 快速查阅指南

### 想看"现在该做什么"
→ 本文的"推荐执行顺序"——**当前：evidence-quality 走**

### 想看 _backlog 的规矩
→ `../README.md` — 三套搬迁 ritual（todo / bug / plan）

### 想看历史决策
→ `_old_topics/_v12-migration/decisions.md`（7 个架构决策）
→ `_done_todos/` 下 14 个 DONE 文件（按文件名主题查阅）

### 想看技术深度
- **queue loop 怎么设计** → `_done_todos/DONE-agentic-queue-landing-analysis.md`（59KB，最详细）
- **transition 层的坑** → `_old_topics/_trainsistion/review_and_suggestion.md`
- **workflow 怎么拆成 change** → `_old_topics/_workflow/openspec-change-map.md`
- **术语怎么乱** → `_old_topics/_guideline/terminology-gap-audit.md`
- **研究充分性标准怎么定** → `_done_todos/DONE-wave1-sufficiency-gates.md`
- **BUG-007 怎么修的** → `_fixed_bugs/BUG-007-rerun-incremental-topic.md`

### 想看具体 TODO 的设计思路
→ `../todos/todo-*.md`，每个都包含：Why、核心挑战、实验范围、关键设计问题、实现思路
