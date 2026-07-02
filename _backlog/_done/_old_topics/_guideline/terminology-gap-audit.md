---
doc_id: terminology-gap-audit
title: 全仓术语对齐审计
status: research
created: 2026-06-24
purpose: 宪法（guidelines/）已建立术语正典。本文档审计全仓其余文件与宪法的术语 gap，作为后续对齐决策的输入。
target: 终极目标是宪法、引擎代码、phase MD、specs、实验 playbook 术语统一。
---

# 全仓术语对齐审计

## 宪法基准

`guidelines/agentic-execution-model.md` §4 定义的术语正典：

| 规范术语 | 含义 | 废弃/别称 |
|---------|------|----------|
| **Three-Tier Execution Model** (三层执行模型) | Chain→Queue→Relay 嵌套系统 | "三层编排模型", "三层模型", "orchestration model" |
| **Three-Authority Architecture** (三层权威架构) | MD/Chain/Engine 控制权分工 | "Three-Layer Architecture", "三层架构" |
| **Two Nested Loops** (两层嵌套循环) | Queue 内部模型 | "two layers" |
| **Tier** | 执行粒度嵌套单位 | 不与 authority "layer" 混用 |
| **Agent** | 任何跑 MD 的 LLM/人类——都跑 MD | — |
| **MD controller** | 跑 phase MD 的 Agent，做流程决策 | "Main Agent", "主 Agent", "parent Agent" |
| **Sub-agent** | 跑 bounded task MD 的 Agent | "child Agent" |
| `rb_queue.agq.json` | Queue 权威状态文件 | — |
| `gate.mjs` | Gate schema contract | "gate-definition.mjs" |

---

## Gap 清单

### Gap A: "Main Agent" / "主 Agent" / "main-agent"

宪法说：Agent 之间只有角色区别（MD controller vs sub-agent），没有 "Main Agent"。所有 Agent 都跑 MD。

**总数：~184 处**

#### A1. guidelines/ 自身（宪法层，必须自洽）

| 文件 | 数量 | 典型文本 | 应改为 |
|------|------|---------|--------|
| `agentic-subagent-mechanism.md` | 36 | "主 Agent 的上下文是稀缺资源" | "Agent 的上下文是稀缺资源" 或 "MD controller" |
| `agentic-queue-mechanism.md` | 10 | "保护主 Agent 上下文" | "保护 Agent 上下文" |
| `agentic-workflow-mechanism.md` | 1 | "the three-layer authority split" | "the Three-Authority Architecture" |
| `command-experiments.md` | 2 | "main-Agent action" / "parent Agent" | "Agent action" / "MD controller" |
| `README.md` | 1 | "Let main-agent do" | "Let Agent do" |

**注意**：subagent 文件还额外有 "三道编排模型"（line 26）和 "三道模型"（line 347）两个 Pattern C 违规。

#### A2. DPT_FRAMEWORK/ phase MD（Agent 运行时读的指令）

| 文件 | 数量 |
|------|------|
| `workflows/nodes/phases/phase-wave0-subagent.md` | 8 |
| `workflows/nodes/phases/phase-wave1-subagent.md` | 7 |
| `workflows/nodes/shared/shared-subagent-protocol.md` | 7 |
| `workflows/nodes/phases/phase-wave2-subagent.md` | 6 |
| `workflows/nodes/phases/phase-wave1.md` | 5 |
| `workflows/nodes/phases/phase-wave2.md` | 4 |
| `workflows/nodes/phases/phase-seed-topics.md` | 4 |
| `workflows/nodes/phases/phase-wave0.md` | 2 |
| `workflows/nodes/shared/shared-schemas.md` | 2 |

**总计：~45 处**。这些是 Agent 执行时实际阅读的 MD——术语不一致可能直接影响 Agent 行为。

#### A3. OpenSpec specs（已接受规范）

| 文件 | 数量 | 备注 |
|------|------|------|
| `specs/agentic-queue/spec.md` | 35 | 含 `"controller": "main-agent"` schema enum |
| `specs/subagent-collect/spec.md` | 9 | |
| `specs/wave1-intake/spec.md` | 7 | |
| `specs/subagent-dispatch/spec.md` | 4 | 含 "parent agent" |
| `specs/research-wave-phase-content/spec.md` | 4 | |
| `specs/seed-topic-materialization/spec.md` | 3 | |

**总计：~62 处**。关键难点：`agentic-queue/spec.md` 中 `"main-agent"` 是 Zod enum 值，改了需要同步 engine 代码（`queue-manager.mjs`、`operate-queue.mjs`）。

#### A4. Active OpenSpec change（开发中）

| 文件 | 数量 |
|------|------|
| `changes/wfq-wave2-synthesis/specs/wave2-synthesis/spec.md` | 12 |
| `changes/wfq-wave2-synthesis/design.md` | 9 |
| `changes/wfq-wave2-synthesis/specs/agentic-queue/spec.md` | 6 |
| `changes/wfq-wave2-synthesis/proposal.md` | 4 |
| `changes/wfq-wave2-synthesis/tasks.md` | 3 |
| 其他 2 个 delta spec | 4 |

**总计：~38 处**。这是 active change，归档前应统一术语，否则会变成新的遗留问题。

#### A5. 实验 playbook

~44 处，分布在 ~15 个 playbook 文件中。主要是 JSON task card fixture 和 `--actor main-agent` CLI 调用。**低优先级**（实验文档，不影响生产行为）。

---

### Gap B: "parent Agent"

宪法说：用 "MD controller"，不用 "parent Agent"。

**总数：5 处**

| 文件 | 行 | 文本 |
|------|----|------|
| `guidelines/command-experiments.md` | 322 | "let the parent Agent collect, merge, or judge" |
| `openspec/specs/subagent-dispatch/spec.md` | 7 | "The parent agent later maps each slot" |
| `experiments_playbook/exp_subagent/test-heavy-subagent-identity.md` | 114 | `DPT_PARENT_RUNTIME_AGENT_ID` (env var) |
| `experiments_playbook/exp_subagent/test-heavy-subagent-triple-failure.md` | 109 | 同上 |
| `experiments_playbook/exp_subagent/test-heavy-subagent-dual-parallel.md` | 99 | 同上 |

---

### Gap C: "three-layer" / "三层编排" / "三道编排"

宪法说：用 "Three-Tier Execution Model" (三层执行模型)。

**总数：3 处，全部在 guidelines/ 自身**

| 文件 | 行 | 文本 | 应改为 |
|------|----|------|--------|
| `agentic-subagent-mechanism.md` | 26 | "三道编排模型的内层引擎" | "三层执行模型的内层引擎" |
| `agentic-subagent-mechanism.md` | 347 | "三道模型的标准路径" | "三层执行模型的标准路径" |
| `agentic-workflow-mechanism.md` | 41 | "the three-layer authority split" | "the Three-Authority Architecture" |

---

### Gap D: "三层架构"

宪法说：用 "Three-Authority Architecture" (三层权威架构)。

**总数：1 处**

| 文件 | 行 | 文本 | 应改为 |
|------|----|------|--------|
| `framework-runtime-boundary.md` | 215 | "三层架构" | "三层权威架构" |

---

### Gap E: Queue 文件名漂移

| 位置 | 文件名 | 状态 |
|------|--------|------|
| `engine/queue-manager.mjs` | `rb_queue.agq.json` | ✅ 引擎权威 |
| `cli/instantiate-run-bundle.mjs:65` | `rb_queue.json` | ❌ 与引擎不一致 |
| `rb_templates/START_FROM_HERE.md.tmpl:10` | `rb_queue.json` | ❌ 与引擎不一致 |
| `guidelines/framework-runtime-boundary.md:143,171` | `rb_queue.json` | ❌ 与引擎不一致 |
| `guidelines/agentic-queue-mechanism.md:36,102,258` | `rb_queue.agq.json` | ✅ 与引擎一致 |
| `guidelines/agentic-execution-model.md:84,242` | `rb_queue.agq.json` | ✅ 与引擎一致 |
| `guidelines/agentic-subagent-mechanism.md:90` | `rb_queue.agq.json` | ✅ 与引擎一致 |

**推荐方向**：统一到 `rb_queue.agq.json`。引擎是 Source of Record，guidelines 宪法大部分已对——只改 CLI 和模板。

---

### Gap F: Gate schema 文件名错误

| 位置 | 文本 | 实际文件 |
|------|------|---------|
| `framework-runtime-boundary.md:95` | `gate-definition.mjs` | `DPT_FRAMEWORK/schema/contracts/gate.mjs` |
| `framework-runtime-boundary.md:189` | `gate-definition.mjs` | 同上 |
| `framework-runtime-boundary.md:296` | `gate-definition.mjs` | 同上 |

---

## 汇总

| Gap | 总数 | 涉及文件 | 难度 |
|-----|------|---------|------|
| A1: guidelines "主 Agent" | ~50 | 5 个 guideline 文件 | 低（纯文本替换） |
| A2: phase MD "main-agent" | ~45 | 8 个 MD 文件 | 低（纯文本替换） |
| A3: specs "main-agent" | ~62 | 6 个 spec 文件 | **中**（含 schema enum 迁移） |
| A4: active change "main-agent" | ~38 | 7 个 change 文件 | 低（change 未归档，直接改） |
| A5: experiments "main-agent" | ~44 | ~15 个 playbook | 低 |
| B: "parent Agent" | 5 | 4 个文件 | 低 |
| C: "三层编排/three-layer" | 3 | 2 个 guideline 文件 | 低 |
| D: "三层架构" | 1 | 1 个 guideline 文件 | 低 |
| E: Queue 文件名 | 2 | CLI + 模板 | 低（改 2 处字符串） |
| F: Gate schema 文件名 | 3 | 1 个 guideline 文件 | 低（改 3 处字符串） |

**总计：~253 处 gap，涉及 ~45 个文件。**

其中 "main-agent" 占了 ~239 处（94%）。其余模式合计 ~14 处。

---

## 不改的范围

以下区域明确**不改**：

- `openspec/changes/archive/` — 历史归档，保持原样
- `_backlog/` — 历史参考文档
- `tests/` — 已审计，无 gap
- `CLAUDE.md` / 根 `README.md` — 已 clean
- 引擎代码逻辑（`DPT_FRAMEWORK/engine/*.mjs`）— 代码注释中的 "MD controller" 是合法术语

---

## 决策点

以下问题需要在执行前决定：

1. **specs 中的 `"main-agent"` enum 值** — `agentic-queue/spec.md` 等文件将 `"main-agent"` 作为 Zod schema enum。改它需要同步 `queue-manager.mjs`、`operate-queue.mjs`、相关 gate definition JSON、所有 task card fixture。是否要改？（建议：改。enum 值影响代码行为，应该在宪法定调后统一）

2. **Active change `wfq-wave2-synthesis/`** — 是否在它归档前统一术语？（建议：是。趁还没归档，否则变成新的遗留债务）

3. **实验 playbook** — ~44 处，大部分是 `--actor main-agent` CLI 调用。优先级最低，是否随 Phase 3 一起修？（建议：是，一次性统一）
