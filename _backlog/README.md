# _backlog — 项目待办与决策记录

> 最后更新: 2026-07-01 | 本目录追踪项目的工作项、设计决策、依赖分析。
> 活跃工作走 OpenSpec（`openspec/changes/`）；本目录是 **上游分析与决策记录**，不是运行时真相。
>
> **本文件是 `_backlog` 的规矩手册。** todo→done 的判定与搬迁流程在下面定死，今后大家都遵循这里头定的规矩。

## 目录结构

```
_backlog/
├── README.md                          # 本文件（规矩手册 + 索引）
│
├── done/                              # ✅ 已完成/已归档的分析与决策记录
│   ├── DONE-*.md ×13                  #   单条已完成的 TODO/分析
│   ├── _fixed_bugs/                   #   已修复的 Bug 记录（7 个，BUG-001~007）
│   ├── _old_topics/                   #   已归档的历史文件夹
│   │   ├── _v12-migration/            #     V12→Agentic DPT 迁移记录（6 change 全 DONE）
│   │   ├── _workflow/                 #     Workflow Foundation 需求与拆解（8 change 全 ARCHIVED）
│   │   ├── _original_dpt_requirement/ #     原始需求归档（⚠️ 勿读，除非显式要求）
│   │   ├── _original_dpt_v12/         #     原始 V12 归档（⚠️ 勿读，除非显式要求）
│   │   ├── _guideline/                #     术语对齐审计
│   │   └── _trainsistion/             #     Transition 层设计分析
│
├── todo-*.md ×10                      # 📋 待设计/待实现的 TODO
│   ├── todo-helper-not-tool.md        #   ⭐ 北星：让系统成为"靠谱的同事"（记忆/主动/沟通/同频）
│   ├── todo-hitl-ux.md                #   HITL 是一个环，不是一张问卷
│   ├── todo-evidence-extraction.md    #   证据提取（来源→结构化 reference，含干货）（部分完成）
│   ├── todo-evidence-quality.md       #   证据质量评估——不够格就放弃
│   ├── todo-explore-exploit.md        #   搜索收敛检测与方向决策
│   ├── todo-final-output-eval.md      #   最终产物评估——不够格就自动 rerun
│   ├── todo-hooks-deferral.md         #   6 个 Boundary Hook（延后）
│   ├── todo-phase-recover.md          #   模型失焦的状态恢复——兜底（低，parked）
│   ├── todo-context-reground.md       #   长上下文定期重锚——预防（低，parked）
│   └── todo-coding-agent-setup-ux.md  #   用户手册：怎么配 coding agent 才不卡（Claude Code + Codex）
│
└── bugs/                              # 无活跃 bug（BUG-007 已修复，移入 done/_fixed_bugs/）
```

---

## todo → done 的规矩 ⭐

**这是本目录最核心的规矩。今后判定和搬迁一律照这里走。**

### 1. todo 和 done 的区别

| | `todo-*.md`（根目录） | `done/`（含 `DONE-*.md` 与子目录） |
|---|---|---|
| **含义** | pending / in-progress 的上游分析与决策 | 已结论、已完成、已归档的记录 |
| **谁在里头** | 还在想、还在设计、还在实施的工作项 | 工作已告一段落，留作决策历史与查阅 |
| **位置** | `_backlog/` 根 | `_backlog/done/` |
| **命名** | `todo-<name>.md` | `DONE-<name>.md`（保留 `DONE-` 前缀，**位置 + 前缀双重标识**） |

### 2. done 在 `_backlog` 内部判定，**独立于 OpenSpec**

> 🔒 **铁律：`_backlog` 是独立的决策记录层。一个 item 是否 done，由项目判断并记录在 `_backlog` 内，与 OpenSpec 的 `openspec/changes/archive/` 归档状态、`openspec/specs/` spec 同步状态无关。**
>
> OpenSpec 是另一层"运行时真相"；`_backlog` 是"上游决策记录"。**两层各自簿记，不交叉判定。** 不要为了在 `_backlog` 标 done 而去动 OpenSpec，也不要因为 OpenSpec 没归档就不敢在 `_backlog` 标 done。

### 3. 一个 todo 做完之后，怎么进档（Move ritual）

当一个 todo 的工作**结论性完成**，执行以下步骤：

```bash
cd _backlog
# ① 改前缀 todo- → DONE-，并移入 done/
git mv todo-<name>.md done/DONE-<name>.md
```

- **内容原样保留**——DONE 文件就是当年的分析/决策原文，不重写、不加"完成总结"。唯一改动：把 frontmatter 的 `> 状态:` 行改成 `已完成（已移入 done/）`，`> 更新:` 日期改成今天。
- 整批完成的**记录文件夹**（如 `_v12-migration/`）：`git mv _<folder> done/`（保持子目录结构，前缀不动）。
- 用 `git mv`（不是普通 `mv`）以保留 git 历史。`_backlog` 全目录受 git 追踪。

### 4. 搬完之后，连带更新本 README

每搬一次，按需要更新这几处（别漏）：

| 更新处 | 怎么改 |
|--------|--------|
| **目录结构** 树 | done/ 的 `DONE-*.md ×N` 计数 +1；根 `todo-*.md ×N` 计数 -1；新文件夹加进 done/ 树 |
| **状态总览** | DONE 计数 +1；"关键完成项"加一条 bullet |
| **PENDING 表** | 删掉该行，下面的行重新编号 |
| **推荐执行顺序** | 如果它正好是 current，换一个新 current 并重写 rationale |
| **快速查阅指南** | DONE 文件引用路径从根改为 `done/DONE-...` |

### 5. 反向：done 能回 todo 吗？

极少见，但可以——`git mv done/DONE-<name>.md todo-<name>.md`，改回 `> 状态:`，更新 README。只有当结论被推翻、工作重新启动时才这么做。

---

## 状态总览

### ✅ DONE（已完成/已归档，在 `done/`）

13 个 `DONE-*.md` + `done/_old_topics/`（含 `_v12-migration`/6 change、`_workflow`/8 change、`_original_dpt_requirement`、`_original_dpt_v12`、`_guideline`、`_trainsistion`）+ `done/_fixed_bugs/`（7 个已修复 bug，BUG-001~007）。

关键完成项：
- **prototype loop engineering**：gate-loop、gate-fork、subagent 三个原型全部 DONE，对应的 OpenSpec change 已归档
- **queue engine**：`queue-manager.mjs` 完整实现，AGQ-001~006 全部 accepted，3 个 playbook 验证通过
- **workflow foundation**：10-phase lifecycle 完整实现，19 phase node MD + 6 shared node MD，9 gate CLI
- **queue-loop 接入**：seed-topics + wave0 + wave1 三个 phase 已接入 queue-driven 三阶段，6 个 playbook 验证通过
- **实验验证**：16 个 experiment playbook，5 个 prototype 实验
- **rerun-incremental-node**（2026-06-26）：HITL2 增量重跑节点——薄层 phase-rerun + gate + chain 边 `rerun → seed-topics`，5 个设计问题全解。详见 `done/DONE-rerun-incremental-node.md`
- **plan-hostfile-sections**（2026-06-26）：`rb_plan.md` 内部 Section 化（`## Goal`/`## Topic Registry`/`## Constraints`/`## Progress`/`## Decisions`），不改名、Frontmatter 不变。解锁 context-reground 的北星锚点与 final-output-eval 的完成度信号。详见 `done/DONE-plan-hostfile-sections.md`
- **wave1-sufficiency-gates**（2026-06-27）：研究充分性标准——4 套 research style JSON + `apply-research-style.mjs` CLI + gate `threshold_source` 动态阈值 + 三个 phase MD re-fill loop + placeholder 三层防线。OpenSpec change `establish-research-styles` 已归档，spec 已同步至 `openspec/specs/research-styles/`。详见 `done/DONE-wave1-sufficiency-gates.md`
- **BUG-007 修复 — harden-rerun-topic-integration**（2026-07-01）：修复 rerun 增量 topic 空壳 bug（3 条独立根因链）。新增基础设施：checkpoint manifests (`_checkpoints/`)、reentry checker CLI (`check-reentry.mjs`)、file observability (`file-observability.mjs`)、gate failure diagnostics (`_diagnostics/gates/`)、`creation_reason` in ledger、12 种 stable diagnostic event kinds。OpenSpec change 已归档，delta spec 已同步至 8 个 capability（含 3 个新能力）。详见 `done/_fixed_bugs/BUG-007-rerun-incremental-topic.md`

### 📋 PENDING（待设计/待实现，在根目录）

| # | 文件 | 优先级 | 简述 | 阻塞条件 |
|---|------|--------|------|----------|
| 0 | `todo-helper-not-tool.md` | **北星（UX 层北极）** | 让系统成为"靠谱的同事"而非"工具"——四根支柱：记忆、主动、沟通、同频。所有用户可见交互的人格层设计 | `todo-hitl-ux` ✅（环机制已就位——此为在其上加人格层） |
| 1 | `todo-evidence-quality.md` | **最高（当前优先）** | 逐条证据质量评估——不够格就**放弃**（discard，不是 repair） | evidence-extraction 部分完成（CCC section 已落地） |
| 2 | `todo-evidence-extraction.md` | **高** | 来源→结构化 reference（含硬数据/干货，不只是元数据）——**部分完成：CCC section + _cache/ 约定已落地；CandidateCard/promote/isCountable/countReferences/Engine-computed ref_count 待实现** | prototype-subagent ✅, prototype-gate-fork ✅ |
| 3 | `todo-explore-exploit.md` | **高** | 搜索收敛检测与方向决策（wave 级） | subagent ✅, gate-fork ✅, evidence-quality 集成 |
| 4 | `todo-final-output-eval.md` | **中** | 最终产物整体评估——不够格就自动 rerun（不等用户） | evidence-quality + explore-exploit 信号；plan-hostfile ✅（提供 Progress 信号） |
| 5 | `todo-hooks-deferral.md` | **延后** | V12 的 6 个 Boundary Hook | evidence 管理器就位 |
| 6 | `todo-phase-recover.md` | **中（升级，2026-07-01）** | 模型失焦时从 ground truth 重新定位并复活当前 phase（兜底层）。**升级理由：check-reentry.mjs 提供了 ground-truth 检测基础设施（status/queue/artifact/ledger/drift audit），此前缺失的"真相源对照"能力已就位** | 无硬阻塞；与 context-reground 真相源对齐；reentry CLI 可做检测基础 |
| 7 | `todo-context-reground.md` | **低（parked）** | 长上下文定期 reload 工程总图+root question，对抗 lost-in-the-middle（预防层） | 无硬阻塞；plan-hostfile ✅ 提供 `## Goal` 北星 |
| 8 | `todo-coding-agent-setup-ux.md` | **中（launch 前抬起）** | 用户手册：怎么配 Claude Code/Codex 的 permission/approval 才能让框架 HITL1↔HITL2 自主跑不卡 | 无硬阻塞；真跑一次完整 research 的前置 UX 条件 |
| 9 | `todo-hitl-ux.md` | **最高（与 evidence-quality 并列，active change 进行中）** | HITL 环机制 + 3 个浮出水面点 + 静默自主契约 + 预设 prompt 模板 | research-styles ✅ DONE（profile 参数体系已就位）；active change `establish-hitl-ux` |

### 🔮 分析文档中标记但未建 TODO 的待办

| 来源 | 内容 | 状态 |
|------|------|------|
| `done/DONE-agentic-queue-landing-analysis.md` | wfq-wave1-intake-subagent（Change 2） | ✅ OpenSpec 已归档（`2026-06-24-wfq-wave1-intake-subagent`） |
| 同上 | wfq-wave2-synthesis（Change 3） | ✅ OpenSpec 已归档（`2026-06-24-wfq-wave2-synthesis`） |
| 同上 | wfq-delivery（Change 4） | ✅ OpenSpec 已归档（`2026-06-23-wff-content-delivery`） |
| `done/_old_topics/_guideline/terminology-gap-audit.md` | ~253 处术语 gap 修复 | 无执行计划 |
| `done/_old_topics/_trainsistion/` 全部 3 文件 | Transition 层清理（FSM dispatch bug + API 统一） | 发现但未建 change |

## 依赖链分析

### 核心流水线：wave1-sufficiency-gates（定标准）→ evidence-extraction → evidence-quality → explore-exploit → final-output-eval

**`todo-wave1-sufficiency-gates` 是上游设计约束**——它从 V12 的完整机制挖掘出 8 层 gap（研究画像 + 动态 floor 公式 + 证据质量阶梯 + Must-Answer 合约 + Topic-Unique 要求 + Stop Conditions + 探索/利用决策验证 + 自主推进阻止），定义"跑到什么程度算够"。evidence-extraction/quality/explore-exploit 是实现手段，它们的"做到什么程度"由 sufficiency-gates 定的标准决定。

三个层次，从细到粗：

```mermaid
flowchart LR
    subgraph G1["<b>wave1-sufficiency-gates</b><br/>标准层：多高才算够"]
        direction TB
        A1["研究画像+floor公式"]
        A2["isCountable规则"]
        A3["Must-Answer合约"]
        A4["Stop Conditions"]
    end
    subgraph G2["<b>evidence-extraction</b><br/>per-source：拿"]
        direction TB
        B1["URL → reference"]
        B2["含硬数据/干货"]
        B3["countReferences()"]
    end
    subgraph G3["<b>evidence-quality</b><br/>per-source：评"]
        direction TB
        C1["逐条质量评估"]
        C2["不够格就放弃"]
        C3["discard ≠ repair"]
    end
    subgraph G4["<b>explore-exploit</b><br/>wave 级：够不够"]
        direction TB
        D1["跨 wave 收敛检测"]
        D2["继续/换向/结束"]
        D3["dispatch 决策"]
    end
    subgraph G5["<b>final-output-eval</b><br/>run 级：该不该交付"]
        direction TB
        E1["最终产物自评"]
        E2["交付/自动rerun"]
        E3["不等用户"]
    end
    G1 --> G2 --> G3 --> G4 --> G5
```

**关键洞察**：evidence-extraction 解决根本信任问题——**`ref_count` 变成 Engine 计算的派生值**，不再由 Agent 声明。这直接解锁 evidence-quality（评估 Engine 已计数的 reference），进而解锁 explore-exploit（收敛需要可信的增量统计），最后解锁 final-output-eval（自动 rerun 需要可信的质量信号）。evidence-quality 新增了**放弃**动作——烂材料直接排除，不修。

### 独立项

**`todo-hooks-deferral`** 明确延后，依赖链为：
```
schema-core → prototype-start-from-here → gate-loop/gate-fork → workflows/hooks
```
当前 gate/queue/evidence 引擎尚未全部就位。

### 健壮性 / 元机制（正交于核心流水线，可长期 park）

三个 TODO（#6-8）都针对"模型在长程运行中跑糊涂 / 无法事后排查"，与核心 evidence 流水线**正交**，互不阻塞：

```mermaid
flowchart TB
    SL["<del>todo-system-logging（已迁移）</del><br/>→ openspec/changes/system-logging/<br/>已实现：统一 gate 写路径、激活 logger.mjs、<br/>加 bundle 缝合、inspect-bundle --summary/--timeline/--log"]
    CR["<b>todo-context-reground</b>（预防）<br/>周期性 reload 工程总图+root Q<br/>对抗 lost-in-the-middle；增强 §6 tail"]
    PR["<b>todo-phase-recover</b>（兜底）<br/>失焦时从 ground truth 重定位<br/>+复活当前 phase，不继续幻觉"]
    SL --> CR
    CR -- "减少失焦频率" --> PR
```

- **reground（预防）vs recover（兜底）互补**：reground 让模型别晕，recover 让模型晕了能救回来。两者共享同一 ground-truth 基座（`rb_status.json` + `rb_profile.yaml` + `rb_plan.md` + 工程总图），设计时真相源要对齐。**plan-hostfile ✅ 已落地**——reground 现在有了 `## Goal` 北星锚点。
- **system-logging 是地基**：recover 直接读 `rb_trace.jsonl` 重建当前 phase，三个 TODO 共享同一 control files。日志做不对，前两者没有真相源。三者中优先级最高（launch/排障前抬起）。

### 正交的 UX 项

**`todo-hitl-ux`**（#9）和 **`todo-helper-not-tool`**（#0，北星）与上述正交——hitl-ux 解决交互结构（环/静默契约/3 浮出水面点），helper-not-tool 解决人格层（记忆/主动/沟通/同频）。两者都不参与 evidence 流水线也不参与健壮性层。hitl-ux 当前 active change 进行中（`openspec/changes/establish-hitl-ux/`）；helper-not-tool 是 UX 层北星，等 hitl-ux 的环机制落地后抬起。

## 推荐执行顺序（2026-06-27 更新）

**决定：evidence-quality 现在走。理由：sufficiency-gates ✅ DONE（标准已定）、evidence-extraction 部分完成（CCC section + _cache/ 约定已落地）。现在该让质量评估落地——把 profile 里已定义的质量阈值接入 per-reference 评估，实现 `fail_c` 分支，让不够格的 reference 被 discard 而不是 repair。**

**UX 层双轨并行：`todo-hitl-ux` active change 进行中 + `todo-helper-not-tool` 北星已立——前者解决交互结构（环/静默契约/3 浮出水面点），后者解决人格层（记忆/主动/沟通/同频）。两者与 evidence 流水线正交，互不阻塞。**

```mermaid
flowchart LR
    subgraph DONE["✅ 已完成"]
        direction TB
        W1D["<b>wave1-sufficiency-gates</b><br/>✅ DONE (2026-06-27)<br/>4 style JSON + CLI + threshold_source<br/>+ re-fill loop + placeholder 防线"]
    end
    subgraph P1["<b>Phase 1（当前）</b>"]
        direction TB
        EQ["<b>evidence-quality</b><br/>逐条质量评估——不够格就放弃<br/><br/>为什么现在走：<br/>• sufficiency-gates ✅ 标准已定<br/>• extraction 部分完成（CCC 已落地）<br/>• 质量阈值已在 profile 定义<br/>• quality 不依赖 extraction 全部完成<br/><br/>下一步：opsx:explore → opsx:propose → 实施"]
    end
    subgraph P2["<b>Phase 2</b>"]
        E2["<b>evidence-extraction（剩余部分）</b><br/>CandidateCard + promote + isCountable<br/>+ countReferences + Engine ref_count<br/><br/>前提：quality 的 discard 路径就位"]
    end
    subgraph P3["<b>Phase 3</b>"]
        E3["<b>explore-exploit</b><br/>收敛检测<br/><br/>前提：extraction + quality"]
    end
    subgraph DEFER["<b>延后</b>"]
        H["hooks"]
    end
    subgraph PARALLEL["<b>并行（正交，可随时做）</b>"]
        CA["<b>coding-agent-setup-ux</b><br/>UX 手册<br/>launch 前抬起"]
    end
    subgraph FINAL["<b>最终</b>"]
        FO["<b>final-output-eval</b><br/>产出自评→自动rerun<br/><br/>前提：前 4 个 DONE<br/>+ plan-hostfile ✅（Progress 信号已就位）"]
    end
    DONE --> P1 --> P2 --> P3 --> FINAL
```

✅ 已完成（已进 done/）：BUG-007（harden-rerun-topic-integration）、rerun-incremental-node、plan-hostfile-sections、wave1-sufficiency-gates
   → BUG-007 解锁 phase-recover 的 ground-truth 检测基础设施（check-reentry.mjs + file-observability + gate diagnostics）
   → rerun 解锁 final-output-eval 的 auto_rerun 落点
   → plan-hostfile 解锁 context-reground 北星 + final-output-eval 完成度信号
   → wave1-sufficiency-gates 定标准——4 套 style + 动态阈值 + re-fill loop

### 为什么 evidence-quality 现在走

| 维度 | 判断 |
|------|------|
| **上游标准已就位** | sufficiency-gates ✅ DONE——`quality_min_tier`/`quality_min_substance`/`p0p1_independent_backing` 等质量参数已在 4 套 research style JSON 中定义，profile schema 已支持。quality 直接消费这些参数。 |
| **extraction 部分完成** | CCC section + `_cache/` 约定已落地，reference template 已有结构化内容可评估。CandidateCard/promote 等剩余 extraction 工作不阻塞 quality——quality 评估的是已写出的 reference 文件。 |
| **discard 路径是 pipeline 的转折点** | quality 新增 `fail_c` 分支（不够格就放弃），这是 pipeline 首次引入"排除"动作。之后的 explore-exploit（收敛检测）和 final-output-eval（自评）都需要可信的 discard 后 ref_count，quality 是必经之路。 |
| **下一步** | `opsx:explore evidence-quality` → `opsx:propose` → 实施 |

### 三个 parked TODO（健壮性/元机制，低优先级）

`todo-phase-recover` / `todo-context-reground`（#6-7）**不参与上述执行顺序**——它们正交于核心流水线，当前先记录、不抢跑道。**2026-07-01 更新**：phase-recover 从 Low 升级到 Medium——`check-reentry.mjs` + file-observability 已提供 ground-truth 检测层，修复此前缺失的关键基础设施。但 evidence pipeline 仍是主线，phase-recover 在 pipeline 有进展时并行抬起即可。`todo-system-logging` 已迁移至 `/openspec/changes/system-logging/` 并已实现。

## 快速查阅指南

### 想看"现在该做什么"
→ 本文的"推荐执行顺序"——**当前：evidence-quality 走**

### 想看 _backlog 的规矩（todo 怎么变 done）
→ 本文的 **"todo → done 的规矩"** 一节

### 想看历史决策
→ `done/_old_topics/_v12-migration/decisions.md`（7 个架构决策）
→ `done/` 下 13 个 `DONE-*` 文件（按文件名主题查阅）

### 想看技术深度
- **queue loop 怎么设计** → `done/DONE-agentic-queue-landing-analysis.md`（59KB，最详细）
- **transition 层的坑** → `done/_old_topics/_trainsistion/review_and_suggestion.md`（FSM dispatch bug + API 统一建议）
- **workflow 怎么拆成 change** → `done/_old_topics/_workflow/openspec-change-map.md`
- **术语怎么乱** → `done/_old_topics/_guideline/terminology-gap-audit.md`
- **研究充分性标准怎么定** → `done/DONE-wave1-sufficiency-gates.md`（8 层 gap → 4 style JSON + CLI + gate threshold_source）
- **BUG-007 怎么修的** → `done/_fixed_bugs/BUG-007-rerun-incremental-topic.md`（3 条独立根因链 → 4 个新基础设施 + 8 个 delta spec）

### 想看具体 TODO 的设计思路
→ 对应的 `todo-*.md` 文件，每个都包含：Why、核心挑战、从 V12 借鉴的模式、实验范围（Goals/Non-Goals）、关键设计问题、实现思路、下一步
→ **UX 层北星**：`todo-helper-not-tool.md` — 让系统成为"靠谱的同事"（记忆/主动/沟通/同频）
→ **HITL 环机制**：`todo-hitl-ux.md` — HITL 是一个环，不是一张问卷

## 相关外部文件

| 路径 | 角色 |
|------|------|
| `guidelines/project-charter.md` | 项目最高原则（Agent/Engine/Markdown 分工） |
| `guidelines/agentic-execution-model.md` | 三层执行模型 + 术语正典 |
| `openspec/specs/` | 已接受 spec（运行时真相层，与 _backlog 各自簿记） |
| `openspec/changes/` | 活跃 change |
| `DPT_FRAMEWORK/engine/` | engine 模块 |
| `DPT_FRAMEWORK/workflows/` | 10-phase lifecycle + 19 node MD |
| `tests/` | 回归测试（engine/CLI/integration/schema） |
| `experiments_playbook/exp_*/` | Agent-driven E2E 实验 |
