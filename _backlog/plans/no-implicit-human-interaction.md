# Commands 是 Agent-facing 的——人只在 HITL1/HITL2，别让系统以为有"人"在场

> 本 plan 是**方向性 / 认知性**记录，不是 OpenSpec change，也不是运行时真相。
> 它是"影响静默自主长程执行的因素"系列的**第 4 份**。起点：这个系统的 commands 基本全是给 AI Agent 用的，人几乎用不了、也很少用；人与系统唯一的交互就在 HITL1 + HITL2。任何 docs/contracts/Agent-self-model 里隐含"有个人在场"的 framing，都在给 BUG-020 那种"我该问问用户"的 fiction 输血。本文件核实现状、钉出原则、留 draft 给 framework/docs 侧 agent。
> 与 `autonomous-silent-execution-terminology.md`、`agent-persistence-and-exit-codes.md`、`cli-exit-code-contract.md` 同系列。

## 1. 起点（用户的点）

- Commands **基本全是给 AI Agent 跑的**——人几乎用不了、也很少用，至多几个诊断。
- 人和系统**唯一的交互点就是 HITL1（定方向/profile/topics）和 HITL2（审 synthesis）**；其它一切 Agent 静默自主（`stop: no`）。
- 危险：docs / contracts / Agent 自我认知里如果**隐含"有个人在场"**，就延续"我可以问用户"的 fiction——正是 BUG-020 的 Agent 在 wave0 后问"继续还是够了？"的根因之一。
- 这是用户系统性扫描的"影响静默自主长程执行的因素"之一。

## 2. 核实过的事实（agent audit，file:line）

### 2a. HITL-bounding 半句——**已显式**（4 处）

- `DPT_FRAMEWORK/RUN.md:28` — "人类介入点只有 `hitl1`（定方向 / profile / topics）和 `hitl2`（审 synthesis），其余 phase 均 `stop: no`，Agent 自行推进。"
- `DPT_FRAMEWORK/CLAUDE.md:12` — 同上。
- `DPT_FRAMEWORK/AGENTS.md:12` — 同上。
- `DPT_FRAMEWORK/command_playbook/start-research.md:73` — 同上。

### 2b. "Commands 是 Agent-facing" 半句——**几乎全隐式**

能推断出来的依据：
- 每个 playbook 顶部自标 "Agent 命令" / "Agent command"（`start-research.md:3`、`instantiate-run-bundle.md:3`、`setup-real-subagents.md:3`）。
- `cli/README.md:7,53,70` — "CLI 不替 Agent 选策略"、"CLI 是 Agent actor 的眼睛"、"Agent 在长程任务中依赖 CLI 输出"。
- `COMMANDS.md` 命令表体是中性描述，**没有** "you"/"run this" 的人称命令语气。

**但没有任何一句话把"两面"合成一个原则钉住。** 读者必须从（playbook 头）+（HITL-bounding 行）+（shared-silent-execution §0）自己拼。

### 2c. 漏点（小而真实，正是 fiction 的文档侧入口）

- **`README.md:55` — "Agent/operator 可读命令说明"**。slash 把 operator 留成 co-audience，**是整个 command surface 里最动摇的一句**。
- **`COMMANDS.md:5,10` + `README.md:5` — "把 `RUN.md` 拖进对话即触发框架"**。drag 是人的动作（对），但只说"触发"不说"之后命令都 Agent 跑"，给人发起的 tone 没被平衡。
- **`RUN.md:16` — "用户没明说就先用一句话确认走哪个，再开跑"**。让 Agent 在 pre-stop 阶段问用户一个 routing 问题——**这是 HITL-only 规则的真实 counterexample**（hitl1/hitl2 之外的 user 交互）。
- **`instantiate-run-bundle.md:14` — "用户提供 bundle 名称"**。`start-research.md` 已改成从研究问题推导；这句是残留的人框架。

### 2d. silent-execution "do not surface" 教条——**已强**（不是本 doc 的修点）

`shared-silent-execution.md:25,29,82,174` 已强禁 surfacing（含明禁"继续吗？"——BUG-020 原话）。这一侧已经做对。本 doc 只补 **docs 层**的漏。

## 3. 判断：把原则钉成一句话，并修掉那几个漏点

原则要 explicit（**目前不实**——半说、半隐式、一句拆台）：

> **本框架所有 command 都由 Agent 调用。人与系统的交互只在 `hitl1`（定方向/profile/topics）和 `hitl2`（审 synthesis）两个节点；其它一切 Agent 静默自主（`stop: no`）。人不会在 pipeline 中途跑命令、被问、或被汇报。**

不实，就留缝；BUG-020 的 Agent 之所以觉得"可以问"，正是因为 docs 层半活着"有个人在场"。修 docs 不是装饰——是堵 BUG-020 复发的文档侧入口。

## 4. 这为什么是"静默自主长程执行"的因素

链条：docs 里"Agent/operator"slash + drag-trigger tone + `RUN.md:16` 路由问句 → Agent 读到的整体语气是"有个人在场、可以问" → 高摩擦时（BUG-020 的 16 次 gate）"问用户"变成最自然的 fallback（`shared-silent-execution.md:174` 自己点破这一点） → 提前交付。

behavior 侧（`shared-silent-execution` 禁 surfacing）已经设防；但 **docs 侧的 slash/tone/counterexample 在悄悄给 fiction 输血**。两侧都得堵，本 doc 管 docs 侧。

## 5. 给 framework/docs 侧 agent 的对齐基准（draft，可直接 lift）

> 本节是草稿。本 plan 作者只动 `_backlog/plans/`，不越界改 COMMANDS.md / README.md / RUN.md / command_playbook / phase MD。

### 5.1 钉一句话原则（加到 `COMMANDS.md` 顶部）

```markdown
> **Audience**：本索引里的所有命令都由 Agent 调用。人与系统的交互只在 `hitl1`（定方向/profile/topics）和 `hitl2`（审 synthesis）两个节点；其它一切 Agent 静默自主（`stop: no`）。人不会在 pipeline 中途跑命令、被问、或被汇报。
```

### 5.2 修掉拆台句（`README.md:55`）

`Agent/operator 可读命令说明` → `Agent 可读命令说明（人只在 hitl1/hitl2 与系统交互）`

### 5.3 重框 drag-trigger（`COMMANDS.md:5,10` / `README.md:5`）

"把 `RUN.md` 拖进对话"是**人唯一的、一次性的交接动作**——把控制权交给 Agent；**之后跑命令的都是 Agent**。措辞要点：把"人触发"和"Agent 跑命令"分开说，drag 是前者，命令是后者。别让 drag 的语气蔓延成"人在跑命令"。

### 5.4 处理 `RUN.md:16` 的路由问句

要么显式标成"pre-pipeline routing（hitl1 之前的定向确认，HITL-only 规则的明示例外）"，要么删掉、并入 hitl1。**不能不明不白留在 stop:no 区里当 counterexample。**

### 5.5 清掉残留人框架（`instantiate-run-bundle.md:14`）

`用户提供 bundle 名称` → 跟 `start-research.md` 对齐（从研究问题推导）。

## 6. 不做什么（Non-goals）

- **本 plan 作者不改 COMMANDS.md / README.md / RUN.md / command_playbook / phase MD**（framework 侧 agent 的活；draft 只作对齐基准留在此）。
- **不弱化 HITL1/HITL2 的人介入**——那两个点是设计内的、必要的。
- **不去掉 drag-trigger**——它对，是人的交接动作；只是要把"人触发"和"Agent 跑命令"分开。
- **不弱化 `shared-silent-execution` 的 "do not surface" 教条**——它是对的；本 doc 只补 docs 层。
- 不追溯改写所有 phase MD 的人称；只改最动摇的几句（§5.2-5.5）。

## 7. 一句话总结

> 系统的 commands 是 Agent-facing 的，人与系统的交互**只在 hitl1 和 hitl2**。HITL-bounding 半句已显式，"Agent-facing" 半句隐式，且 `README.md:55` 的 "Agent/operator" slash 在拆台——加上 drag-trigger tone 和 `RUN.md:16` 的路由问句，docs 层半活着"有个人在场"的 fiction，正是 BUG-020 的文档侧入口。修法：把原则钉成一句话、修掉拆台句、重框 drag、处理路由问句。

---

**相关文件**
- `DPT_FRAMEWORK/RUN.md:28`、`CLAUDE.md:12`、`AGENTS.md:12`、`command_playbook/start-research.md:73` — HITL-bounding（已显式的半句）
- `DPT_FRAMEWORK/README.md:55` — "Agent/operator" slash（最动摇的一句，待修）
- `DPT_FRAMEWORK/RUN.md:16` — pre-stop 路由问句（HITL-only 的 counterexample，待处理）
- `DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md:25,29,82,174` — "do not surface" 教条（behavior 侧已强）
- `_backlog/plans/autonomous-silent-execution-terminology.md` — 同系列：phase 边界术语
- `_backlog/plans/agent-persistence-and-exit-codes.md` — 同系列：exit code 不是士气杠杆
- `_backlog/plans/cli-exit-code-contract.md` — 同系列：exit-code 契约显性化（本 doc 连带把它的 audience 措辞改 Agent-primary）
