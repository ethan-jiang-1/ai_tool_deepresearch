# TODO: context-reground（长上下文定期重锚——周期性 reload 工程总图，对抗 lost-in-the-middle）

> 状态: 待设计 | 优先级: 低（先记录，parked） | 创建: 2026-06-25
>
> 暂不开 OpenSpec change——本文件是 backlog 记录，等优先级抬起后再 `/opsx:explore`。
>
> 互补项: `todo-phase-recover.md`（兜底层——模型已晕时从 ground truth 重新定位并复活 phase）
> 相关: 现有的 tail anchoring（各 phase §6 `check.next`）——本 TODO **增强不取代**它

## Why

模型在一个 phase（尤其 wave0/wave1/wave2 这类长 phase）里停留久了，**最初的 plan、工程全景、root research question 会被挤出上下文**。这是两个机制叠加的结果：

1. **lost-in-the-middle**——长上下文里，模型对**开头**和**结尾**记得清楚，对**中间**模糊。最初的 plan（HITL1 设定）和研究目标，随着上下文增长，逐渐沉到"中间"被遗忘。
2. **Single-phase-on-demand loading**——`agentic-workflow-mechanism.md:178` 的 dynamic-loading integrity 强制只加载当前 phase 的 MD，**故意不预加载其它 phase**（防止 context 累积未到达 phase 的内容）。这个设计对**隔离**是对的，但副作用是：模型在 wave1 里跑很久后，手头**没有任何材料**提醒它整个 10-phase lifecycle、自己在哪、为什么做这个研究。

**核心缺口**：framework 现在**只 re-inject per-phase gate feedback**（每次 gate fail 给 inspect/advice，模型据此修当前 phase），但**从不 re-inject global plan / lifecycle 位置 / root question**。tail anchoring 告诉模型"下一步去哪"；没有任何东西周期性告诉它"**为什么 / 在整个 arc 的哪里**"。

### 用户认可的优势：tail anchoring 是对的

用户特别强调：现有机制里，每个 phase MD 在最近的上下文里，模型再糊涂也**知道尾巴上该干什么**——§6 的 `check.next` → load `<next-phase>.md` 让下一跳始终清晰，脑子容易清醒回来。这正是 `JS engine + 路由表（chain）` 的价值。

**所以本 TODO 的定位明确**：tail anchoring 是 load-bearing，**增强、不取代**。缺的不是"下一跳"，而是"**我是谁、为什么在这、整体到哪了**"——即 **head grounding**。

```
当前 grounding（够用）:        缺失的 grounding（本 TODO）:
┌─────────────────┐            ┌─────────────────┐
│ tail anchoring  │            │ head re-ground  │
│ §6: 下一跳去哪   │            │ 我在 10-phase 的  │
│ check.next      │            │ 哪个、root Q 是啥 │
│ → load next     │            │ 整体 plan 进度    │
│ 局部、forward   │            │ 全局、situational │
└─────────────────┘            └─────────────────┘
```

## 现有基础设施（可借鉴 / 可复用）

| 基础设施 | 位置 | 现状 |
|---------|------|------|
| **Tail anchoring（保留）** | 各 phase MD §6（如 `phase-wave0.md:139-141`）+ chain 的 `check.next` | 完整运作。本 TODO 不动它 |
| **工程总图（10-phase 地图）** | `transitions.chain.json`——`instantiation → hitl1 → setup → seed-topics → wave0 → wave1 → wave2 → hitl2 → readiness → final`（+ rerun loop） | "chain 只是地图不是行程单"（`agentic-workflow-mechanism.md:135`）。**模型目前只在 gate 间接碰它**，不主动 re-read 作为 grounding 手势 |
| **Phase ↔ gate 清单** | `manifest.json` | inventory，把 phase key 映射到 gate key |
| **Root research question** | `rb_profile.yaml#/root_must_answer_set`（`schema/contracts/profile.mjs`） | **"为什么做这个研究"的真相源**，在磁盘上可 re-read。但模型没有周期性重读的习惯 |
| **Topic 清单** | `rb_plan.md` frontmatter `topic_registry` | 每个 research phase §3.1 已经在 phase 入口读它——**这是目前最接近 re-ground 的现成手势**，但只为拿 topic 列表，不为 situational grounding |
| **已散落的 reload 纪律** | `project-charter.md` Guardrails（"Use chat memory as run state → Reload control files"）、`START_FROM_HERE.md.tmpl:20`（"Gate 过渡前 reload 所有控制文件"）、`shared-anti-cheating-rules.md:30-32` §4（"需要 run 状态时从 control files reload，不依赖'上次对话说过'"） | **纪律存在但散落、未统一、未升级为周期性 re-ground gesture**。三者都说"操作前 reload 状态文件"，但没人说"周期性 re-surface 全局图 + root question" |
| **PDCA 闭环哲学** | `project-charter.md:206-214` | "长程运行的核心不是'Agent 一次想明白'，而是让 Agent 处在真实反馈闭环里"——本 TODO 是把"全局 situational 反馈"补进这个闭环 |

> **关键 gap**：exhaustive grep 确认**零** re-grounding / summarization / "lost in the middle" / context-budget 机制。本 TODO 在这条轴上 greenfield。最接近的是"gate 边界 reload 状态文件"的纪律——但它针对的是**状态文件**（rb_status/profile/trace），不是**全局 plan + lifecycle 位置**。

## 核心挑战：这是 Agent-layer 机制，触发节奏无法靠 token 计数

re-ground 本质是**给模型看的 prose re-injection**——属于 Agent/MD 层，不是 Engine/chain 层。这带来一个具体困难：

**Engine 没有 token 计数器**，无法基于"context length 超过阈值就 re-ground"触发。所以触发必须基于**结构化、Engine 可见的信号**，而不是 context 大小。

```
候选触发点:
  (a) phase 进入时（每个 phase §0/§1 re-ground）        ← 结构化、可靠
  (b) gate 边界（reuse 现有 reload-before-gate）          ← 结构化、已有纪律
  (c) 每 N turn（谁数 turn？跨 async turn 不可靠）        ← 不可靠，倾向放弃
  (d) Agent 自检"我晕了"                                  ← 依赖诚实，作为兜底
```

## 关键设计问题（开放，留给 `/opsx:explore`）

### 1. re-ground 什么？（最小集）

倾向**最小集**，避免把 re-ground 本身变成 context 膨胀的来源：

```
re-ground 物料（每次注入）:
  - lifecycle 位置: "你是 phase X of 10（<phase 名>），刚完成 <上一 phase>，下一是 <next>"
  - root question:  rb_profile.yaml#/root_must_answer_set（1-3 条，不展开）
  - topic 进度:     rb_plan.md topic_registry + 各 topic 当前深度/状态（一行一个，不展开）
  - 本 phase 目标:  当前 phase MD §1 Stage Goal（已有，强调即可）
```

**MUST NOT** re-inject 全部历史 artifacts / 全部 sub-agent 输出——那正是 context 膨胀的原因。re-ground 是**指针 + 摘要**，不是**内容回放**。

### 2. 触发节奏？

倾向 **(a) phase 进入时 + (b) gate 边界**：

- **phase 进入时**：每个 phase MD 的开头（§0 或 §1 前）加一个 re-ground block。这是最自然的 grounding 点——模型刚加载新 phase，正是该重新 situational 的时候。
- **gate 边界**：复用现有 "Gate 过渡前 reload 所有控制文件" 纪律，把它从"reload 状态文件"升级为"reload 状态文件 + re-ground 全局位置"。

**放弃** (c) 每 N turn（谁数 turn、跨 async turn 不可靠——rerun change 已踩过 stall detection 的坑，同理）。**(d) Agent 自检**作为兜底（"若你不确定自己在哪/为什么，回到本 phase 的 re-ground block 重读"）。

### 3. re-ground 物料放哪？

三种载体：

- **(A) 共享 MD**（如 `shared-reground-block.md`）——每个 phase 引用它，统一维护。改一处全 phase 生效。但 re-ground 内容**部分是 runtime 的**（当前 phase、进度），纯静态 MD 表达不了 runtime 位置——需要 Engine 在 gate result 里附带 position 信号，prose block 只放静态部分（lifecycle 图 + 怎么读 profile）。
- **(B) 每 phase §0/§1 head 增强**——每个 phase MD 开头加一个 "## 位置与目标" section，restate 自己在 lifecycle 的位置。runtime 部分由 phase MD 自带的 phase 名 + chain 位置覆盖。**最贴近现有 tail anchoring 的对称做法**（tail 在 §6，head 在 §0）。
- **(C) gate result 信号**——在 gate CLI 的 `check` 输出里附带 current position（`check.next` 已给下一跳，旁边加当前位置）。Engine 触手可及，但**只在 gate 时刻注入**，phase 入口不经过 gate 就没有。

**倾向 (A)+(B) 组合**：共享 MD 放静态的 lifecycle 图 + 读法（避免每个 phase 重复），每 phase §0 放 runtime 的"我在哪 + 本 phase 目标"。这样 **head（§0）与 tail（§6）对称**，且静态部分 DRY。

### 4. Engine 还是 Agent？

re-ground **本质 Agent-layer**（给模型看的 prose，引擎不"理解"它）。Engine 的角色被严格限定：

- **不做** history summarization / compaction（那是另一类大工程，且 anti-cheating §8 精神要求 final report 从 verified state 生成，不是从摘要）。
- **最多做**：在 gate result 的 `check` 里附带 current position 信号（当前 phase、已完成的 phase 序列），让 §0 的 head block 有 runtime 数据可填。这是对现有 `check.next` 的**对称扩展**（给当前位置，不只是下一跳）。

## 实验范围

**Goals:**
- 定 re-ground 物料的最小集（lifecycle 位置 + root question + topic 进度 + 本 phase 目标）
- 定触发节奏（倾向 phase 进入 + gate 边界）
- 定载体（倾向共享 MD 静态部分 + 每 phase §0 head runtime 部分，与 §6 tail 对称）
- 评估 gate result 是否附带 current position 信号（`check.current` 对称于 `check.next`）
- 把现有散落的 reload 纪律（project-charter / START_FROM_HERE / anti-cheating §4）**统一引用**到 re-ground 手势，而非各自重复

**Non-Goals:**
- 不做 token 计数触发（Engine 无计数器，跨 async 不可靠）
- 不做 history summarization / context compaction（不解决 context 膨胀本身，只做 re-ground re-injection）
- 不取代 tail anchoring（§6 `check.next` 保持原样）
- 不 re-inject 全部历史内容（re-ground 是指针 + 摘要，不是回放）

## 与 tail anchoring / phase-recover 的关系

```
  head re-ground (本 TODO)        tail anchoring (现有)
  ─────────────────────           ─────────────────────
  §0: 我在哪、为什么、整体进度       §6: 下一跳去哪
  全局、situational               局部、forward
  预防模型失焦                     让模型知道下一步
            │                            │
            └────────── 互补 ────────────┘
                          │
                          ▼
  若仍失焦 → todo-phase-recover（兜底：从 ground truth 重新定位 + 复活 phase）
```

三者共享同一个 ground-truth 基座（`rb_status.json` + `rb_profile.yaml` + `rb_plan.md` + 工程总图）。设计时 re-ground 读什么、recover 读什么应对齐，避免两套不一致的"真相源"。

## 下一步（低优先级，不抢当前跑道）

1. `/opsx:explore context-reground` — 定：物料最小集、触发节奏、载体（共享 MD + §0 head vs gate signal）、gate result 是否加 `check.current`
2. `/opsx:propose context-reground` — 出 proposal + design + specs + tasks（主要是 MD 改动 + 可能 gate result 字段扩展 + 统一引用现有 reload 纪律）
3. 实施：新增/更新共享 MD + 各 phase §0 head block + 统一引用 project-charter / START_FROM_HERE / anti-cheating §4
4. 与 `todo-phase-recover.md` 联动：真相源选择一致
