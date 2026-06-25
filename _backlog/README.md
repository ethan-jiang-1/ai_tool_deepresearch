# _backlog — 项目待办与决策记录

> 最后更新: 2026-06-25 | 本目录追踪项目的工作项、设计决策、依赖分析。
> 活跃工作走 OpenSpec（`openspec/changes/`）；本目录是 **上游分析和决策记录**，不是运行时真相。

## 目录结构

```
_backlog/
├── README.md                          # 本文件
│
├── DONE-* ×10                         # 已完成/已归档的分析与决策记录
├── todo-* ×10                         # 待设计/待实现的 TODO
│   ├── todo-evidence-extraction.md     #   证据提取（来源→结构化 reference，含干货）
│   ├── todo-evidence-quality.md        #   证据质量评估——不够格就放弃
│   ├── todo-explore-exploit.md         #   搜索收敛检测与方向决策
│   ├── todo-final-output-eval.md       #   最终产物评估——不够格就自动 rerun
│   ├── todo-rerun-incremental-node.md   #   HITL2 增量重跑节点（已进实施）
│   ├── todo-plan-hostfile-sections.md  #   rb_plan.md 内部 Section 化 — Host File 设计（不改名）
│   ├── todo-hooks-deferral.md          #   6 个 Boundary Hook（延后）
│   ├── todo-phase-recover.md           #   模型失焦的状态恢复——兜底（低，parked）
│   ├── todo-context-reground.md        #   长上下文定期重锚——预防（低，parked）
│   └── todo-system-logging.md          #   系统日志/可观测性（中，半建成待激活）
│
├── _guideline/                        # 术语对齐审计（研究阶段）
│   └── terminology-gap-audit.md       #   ~253 处术语 gap，94% 是 "Main Agent"→"MD controller"
│
├── _trainsistion/                     # Transition 层设计分析（探索备忘录）
│   ├── cc_transition_systemic_analysis.md   # 系统性分析：5 bugs（1 critical FSM dispatch bug）
│   ├── cx_transition_boundary_review.md     # 边界审查：3 层 transition 的区分
│   └── review_and_suggestion.md             # 独立审查：统一 API 建议
│
├── _v12-migration/                    # V12→Agentic DPT 迁移记录
│   ├── README.md                      #   迁移概述
│   ├── decisions.md                   #   7 个关键架构决策
│   ├── enums-port.md                  #   51 个 enum 的取舍记录
│   └── roadmap.md                     #   实施路线图（6 个 change 全 DONE）
│
└── _workflow/                         # Workflow Foundation 需求与拆解
    ├── workflow-foundation-requirements.md   # 上游需求基准（draft-for-review）
    ├── openspec-change-map.md                # 8 个 OpenSpec change 映射（全部 ARCHIVED）
    └── breakdown/                            # 9 个拆解文档（00-07 + 90-review）
```

## 状态总览

### ✅ DONE（已完成/已归档）

10 个 `DONE-*` 文件 + `_v12-migration/` 全部 + `_workflow/` 的 8 个 OpenSpec change 全部归档。

关键完成项：
- **prototype loop engineering**：gate-loop、gate-fork、subagent 三个原型全部 DONE，对应的 OpenSpec change 已归档
- **queue engine**：`queue-manager.mjs`（657行）完整实现，AGQ-001~006 全部 accepted，3 个 playbook 验证通过
- **workflow foundation**：10-phase lifecycle 完整实现，19 phase node MD + 6 shared node MD，9 gate CLI
- **queue-loop 接入**：seed-topics + wave0 + wave1 三个 phase 已接入 queue-driven 三阶段，6 个 playbook 验证通过
- **实验验证**：16 个 experiment playbook，5 个 prototype 实验

### 📋 PENDING（待设计/待实现）

| # | 文件 | 优先级 | 简述 | 阻塞条件 |
|---|------|--------|------|----------|
| 1 | `todo-evidence-extraction.md` | **高** | 来源→结构化 reference（含硬数据/干货，不只是元数据） | prototype-subagent ✅, prototype-gate-fork ✅ |
| 2 | `todo-evidence-quality.md` | **高** | 逐条证据质量评估——不够格就**放弃**（discard，不是 repair） | evidence-extraction（流水线上游） |
| 3 | `todo-explore-exploit.md` | **高** | 搜索收敛检测与方向决策（wave 级） | subagent ✅, gate-fork ✅, evidence-quality 集成 |
| 4 | `todo-final-output-eval.md` | **中** | 最终产物整体评估——不够格就自动 rerun（不等用户） | evidence-quality + explore-exploit 信号 |
| 5 | `todo-rerun-incremental-node.md` | **中→高（当前优先）** | HITL2 增量重跑节点——架构骨架，先走 | ✅ 设计已解（§2/§4），已进实施 |
| 6 | `todo-hooks-deferral.md` | **延后** | V12 的 6 个 Boundary Hook | evidence 管理器就位 |
| 7 | `todo-phase-recover.md` | **低（parked）** | 模型失焦时从 ground truth 重新定位并复活当前 phase（兜底层） | 无硬阻塞；与 context-reground 真相源对齐 |
| 8 | `todo-context-reground.md` | **低（parked）** | 长上下文定期 reload 工程总图+root question，对抗 lost-in-the-middle（预防层） | 无硬阻塞；增强 tail anchoring，不取代 |
| 9 | `todo-system-logging.md` | **中** | 系统日志/可观测性——统一 4 sink、激活死 logger、补 spec 要求却没写的事件、加 runId+读回工具 | 无硬阻塞；launch/排障前抬起。Phase 1 是纯激活死代码 |
| 10 | `todo-plan-hostfile-sections.md` | **中** | `rb_plan.md` 内部 Section 化——不改文件名，用 `## Goal`/`## Constraints`/`## Progress`/`## Decisions` 把 plan 做成 host file。~15 文件改动（vs rename 的 ~80） | 不阻塞当前 change；结构定下来后越早做越省事 |

### 🔮 分析文档中标记但未建 TODO 的待办

| 来源 | 内容 | 状态 |
|------|------|------|
| `DONE-agentic-queue-landing-analysis.md` | wfq-wave1-intake-subagent（Change 2） | 未开始 |
| 同上 | wfq-wave2-synthesis（Change 3） | 未开始 |
| 同上 | wfq-delivery（Change 4） | 未开始 |
| `_guideline/terminology-gap-audit.md` | ~253 处术语 gap 修复 | 无执行计划 |
| `_trainsistion/` 全部 3 文件 | Transition 层清理（FSM dispatch bug + API 统一） | 发现但未建 change |

## 依赖链分析

### 核心流水线：evidence-extraction → evidence-quality → explore-exploit → final-output-eval

三个层次，从细到粗：

```
    evidence-extraction          evidence-quality          explore-exploit        final-output-eval
    (per-source: 拿)             (per-source: 评)          (wave 级: 够不够)       (run 级: 该不该交付)
    ┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐    ┌──────────────────┐
    │ URL → reference   │       │ 逐条质量评估       │       │ 跨 wave 收敛检测  │    │ 最终产物自评       │
    │ 含硬数据/干货     │───→│ 不够格就放弃      │───→│ 继续/换向/结束   │───→│ 交付/自动rerun    │
    │ countReferences() │       │ discard ≠ repair  │       │ dispatch 决策     │    │ (不等用户)        │
    └──────────────────┘       └──────────────────┘       └──────────────────┘    └──────────────────┘
```

**关键洞察**：evidence-extraction 解决根本信任问题——**`ref_count` 变成 Engine 计算的派生值**，不再由 Agent 声明。这直接解锁 evidence-quality（评估 Engine 已计数的 reference），进而解锁 explore-exploit（收敛需要可信的增量统计），最后解锁 final-output-eval（自动 rerun 需要可信的质量信号）。evidence-quality 新增了**放弃**动作——烂材料直接排除，不修。

### 独立项

**`todo-rerun-incremental-node`** 不参与上述流水线。它的阻塞条件是设计层面的——必须先回答"rerun node 和 chain 的关系"（chain 至今刻意不编码 rerun 分支），这在 `_trainsistion/review_and_suggestion.md` 中有明确定调。

**`todo-hooks-deferral`** 明确延后，依赖链为：
```
schema-core → prototype-start-from-here → gate-loop/gate-fork → workflows/hooks
```
当前 gate/queue/evidence 引擎尚未全部就位。

### 健壮性 / 元机制（正交于核心流水线，可长期 park）

三个新 TODO（#7-9）都针对"模型在长程运行中跑糊涂 / 无法事后排查"，与核心 evidence 流水线**正交**，互不阻塞：

```
   todo-system-logging（地基）          ← recover/reground 都把 rb_trace.jsonl + control
        │                                  files 当 ground truth；日志不可信就没真相源
        │                                  （且半已建成：logger.mjs 死代码、traceInit/
        │                                   traceSummary 从不调用、repair 事件 spec 违规）
        ▼
   todo-context-reground（预防）  ──减少失焦频率──▶  todo-phase-recover（兜底）
   周期性 reload 工程总图+root Q                      失焦时从 ground truth 重定位
   对抗 lost-in-the-middle；增强 §6 tail              +复活当前 phase，不继续幻觉
```

- **reground（预防）vs recover（兜底）互补**：reground 让模型别晕，recover 让模型晕了能救回来。两者共享同一 ground-truth 基座（`rb_status.json` + `rb_profile.yaml` + `rb_plan.md` + 工程总图），设计时真相源要对齐。
- **system-logging 是地基**：recover 直接读 `rb_trace.jsonl` 重建当前 phase，三个 TODO 共享同一 control files。日志做不对，前两者没有真相源。三者中优先级最高（launch/排障前抬起）。

## 推荐执行顺序（2026-06-25 决策）

**决定：rerun-incremental-node 先走。理由：架构骨架优先。**

```
Phase 1 (当前)            并行 explore           Phase 2              Phase 3           延后
┌──────────────────┐    ┌──────────────┐    ┌───────────────┐    ┌───────────────┐   ┌──────────┐
│ rerun-           │    │ evidence-    │    │ evidence-     │    │ explore-      │   │ hooks    │
│ incremental-node │    │ extraction   │    │ quality       │    │ exploit       │   │          │
│ (增量重跑节点)     │    │ (opsx:explore│    │ (逐条质量评估)   │    │ (收敛检测)     │   │          │
│                  │    │  只设计)      │    │               │    │               │   │          │
│ 为什么先做:        │    │              │    │               │    │               │   │          │
│ • 架构骨架——      │    │ 不抢跑道，     │    │               │    │               │   │          │
│   rerun 语义     │    │ 纯设计输出     │    │               │    │               │   │          │
│   影响 workflow  │    │              │    │               │    │               │   │          │
│   拓扑           │    │              │    │               │    │               │   │          │
│ • 已"熟了"——     │    │              │    │               │    │               │   │          │
│   实验存在,       │    │              │    │               │    │               │   │          │
│   约束清晰,       │    │              │    │               │    │               │   │          │
│   现成模式可复用   │    │              │    │               │    │               │   │          │
│ • unlock         │    │              │    │               │    │               │   │          │
│   final-output-  │    │              │    │               │    │               │   │          │
│   eval 的集成点   │    │              │    │ 前提:          │   │ 前提:          │   │          │
│                  │    │              │    │ extraction    │   │ extraction    │   │          │
│                  │    │              │    │ + quality     │   │ + quality     │   │          │
│                  │    │              │    │               │   │               │   │          │
│ 下一步:           │    │              │    │               │   │               │   │          │
│ opsx:explore →   │    │              │    │               │   │               │   │          │
│ opsx:propose →   │    │              │    │               │   │               │   │          │
│ 改 manifest.json │    │              │    │               │   │               │   │          │
│ + phase-hitl2.md │    │              │    │               │   │               │   │          │
│ + phase-rerun.md │    │              │    │               │   │               │   │          │
│ + gate def       │    │              │    │               │   │               │   │          │
│                  │    │              │    │               │   │               │   │          │
│ 🔺 不从 chain    │    │              │    │               │   │               │   │          │
│   加边（服从      │    │              │    │               │   │               │   │          │
│   anti-cheating  │    │              │    │               │   │               │   │          │
│   rule）          │    │              │    │               │   │               │   │          │
└──────────────────┘    └──────────────┘    └───────────────┘    └───────────────┘   └──────────┘

                              ┌──────────────────┐
                              │ final-output     │  前提: rerun node + 前 3 个 DONE
                              │ eval             │
                              │ (产出自评→自动rerun)│
                              └──────────────────┘
```

### 为什么 rerun-incremental-node 先走

| 维度 | 判断 |
|------|------|
| **架构层级** | 涉及 workflow **拓扑变更**（加 phase node、决定 chain 是否参与、与 HITL2 交互模式）。骨架错了后面全要改。 |
| **成熟度** | 已停放一个月（6/24→6/25）。Prior Art 验证通过（实验证明确认 chain 不参与 rerun）。5 个设计问题明确框架，硬核是 §2（增量语义边界）和 §4（chain 关系），其余有现成答案。 |
| **约束清晰** | anti-cheating rule 明确禁止 chain edge。`request_view_revision` 已实现作为对照边界。`convergeRepair` 的 maxIterations=3 + stall detection 直接可复用。 |
| **Unlock 效应** | final-output-eval 的 auto_rerun 路径写着"进入 rerun node"——先有 concrete target，不做 hypothetical design。 |
| **Scope 可控** | 改 3 个文件（manifest.json + phase-hitl2.md + 新增 phase-rerun.md + gate definition），不动 chain。 |

### 为什么 evidence-extraction 并行 explore 而不是等

- evidence-extraction 的 scope 更广（CandidateCard 设计、cache staging 升级、`countReferences()` Engine 函数），更多开放问题
- 先做 `opsx:explore`（纯设计，不写代码），等 rerun node proposal 出来后再 propose——**避免两个 change 同时活跃互相踩文件**
- 不耽误 rerun node 的实现进度

### 三个 parked TODO（健壮性/元机制，低优先级）

`todo-phase-recover` / `todo-context-reground` / `todo-system-logging`（#7-9）**不参与上述执行顺序**——它们正交于核心流水线，当前先记录、不抢跑道。详见上方"健壮性 / 元机制"小节。其中 **`todo-system-logging` 优先级最高**（launch/排障前抬起，且半已建成、拾起来成本低），另两者（recover / reground）低优先级 long park。

## 快速查阅指南

### 想看"现在该做什么"
→ 本文的"推荐执行顺序"——**当前：rerun-incremental-node 先走，evidence-extraction 并行 explore**

### 想看历史决策
→ `_v12-migration/decisions.md`（7 个架构决策）
→ 10 个 `DONE-*` 文件（按文件名主题查阅）

### 想看技术深度
- **queue loop 怎么设计** → `DONE-agentic-queue-landing-analysis.md`（59KB，最详细）
- **transition 层的坑** → `_trainsistion/review_and_suggestion.md`（FSM dispatch bug + API 统一建议）
- **workflow 怎么拆成 change** → `_workflow/openspec-change-map.md`
- **术语怎么乱** → `_guideline/terminology-gap-audit.md`

### 想看具体 TODO 的设计思路
→ 对应的 `todo-*.md` 文件，每个都包含：Why、核心挑战、从 V12 借鉴的模式、实验范围（Goals/Non-Goals）、关键设计问题、实现思路、下一步

## 相关外部文件

| 路径 | 角色 |
|------|------|
| `guidelines/project-charter.md` | 项目最高原则（Agent/Engine/Markdown 分工） |
| `guidelines/agentic-execution-model.md` | 三层执行模型 + 术语正典 |
| `openspec/specs/` | 43 个已接受 spec |
| `openspec/changes/archive/` | 15 个已归档 change（零活跃 change） |
| `DPT_FRAMEWORK/engine/` | 12 个 engine 模块（3192 行） |
| `DPT_FRAMEWORK/workflows/` | 10-phase lifecycle + 19 node MD |
| `tests/` | 32 个回归测试（engine/CLI/integration/schema） |
| `experiments_playbook/exp_*/` | 16 个 Agent-driven E2E 实验 |
