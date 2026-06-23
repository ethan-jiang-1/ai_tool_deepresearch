# 四、OpenSpec：一套优美的 SDD 系统

**如果你只记住一件事：OpenSpec 不是代码生成工具，是 artifact 治理系统。它的主要产出是 Markdown（spec、proposal、design、tasks），少量 JS 负责合规验证。跟它治理的系统一样的结构 —— Agent 读 MD 做事，引擎做检查。**

---

## 不只是文档系统，是治理层

回到 README 中的四层模型。前三篇讲了前三层：

- **LLM Agent** 是驾驶员（第一篇）
- **Markdown** 是导航地图（第一篇、第二篇）
- **JS/CLI Engine** 是刹车和仪表盘（第三篇）

现在讲第四层：**OpenSpec** —— 交通规则。它决定"什么可以上路"、"变更怎么审批"、"合规怎么检查"。它是整个 agentic workflow 体系的治理层。

> OpenSpec 是 Specification-Driven Development（规格驱动开发）的简称。它不只是文档系统。它是"什么必须被构建"、"它如何工作"、"它满足哪些需求"的**真相来源** —— 并由自动化合规检查来强制执行。

## 它的主要产出不是代码，是 Markdown

一个典型的 OpenSpec change 的产出物：

```
openspec/changes/wfq-queue-loop-wave0/
├── proposal.md          ← MD：为什么要做、做什么、影响什么
├── design.md            ← MD：技术决策、权衡、风险
├── tasks.md             ← MD：实现步骤，勾选进度
└── specs/
    └── agentic-queue/
        └── spec.md      ← MD：delta requirements（ADDED/MODIFIED/REMOVED）
```

**4 个文件，全部是 Markdown。没有一行代码。** Propose 阶段不写代码，只写 MD。Explore 阶段也不写代码，深化 MD。Apply 阶段才开始写代码，但同时也在写更多 MD（phase nodes、playbooks、更新的 specs）。

Apply 阶段的产出：

```
DPT_FRAMEWORK/
├── engine/queue-manager.mjs       ← JS：引擎代码
├── cli/operate-queue.mjs          ← JS：CLI 工具
├── schema/contracts/queue.mjs     ← JS：Zod schema
└── workflows/nodes/phases/
    └── phase-wave0.md             ← MD：Agent 指令（Agent 读的！）
```

三种格式，三种角色：

| 格式 | 角色 | 示例 |
|------|------|------|
| **Markdown** | 控制面 + 内容面 | phase node、playbook、spec、proposal、design、最终研究报告 |
| **JavaScript** | 验证层（**纯传统代码**） | engine 模块、CLI 工具、Zod schema、合规检查脚本 |
| **JSON/YAML** | 数据层 | gate definitions、transitions.chain、req-registry、trace |

**代码只是配角。** 传统 SDD（比如 UML → 生成 Java 代码）的终点是代码，文档是手段。这里反过来：**MD 是 Agent 的运行表面，代码只是确保 Agent 不越轨的护栏。** MD 甚至比 JS 更重要 —— 因为改 MD 就改了系统行为（Agent 读 MD 来做事），改 JS 只改了检查规则。而且那些 JS 不是"智能"代码——就是普通的 Zod 验证、JSON 解析、文件检查。纯传统代码，不含 AI。

这就是 OpenSpec 和项目架构的同构性：**项目本身用 Markdown 做控制面，OpenSpec 也用 Markdown 做控制面。** spec.md 之于开发者，正如 phase-wave0.md 之于 Agent —— 告诉你要做什么、怎么验证、边界在哪。

## 四个阶段的生命周期

```
/opsx:propose  →  /opsx:explore  →  /opsx:apply  →  /opsx:archive
```

| 阶段 | 做什么 | 产出 |
|------|--------|------|
| **Propose** | 描述想构建什么 | `proposal.md`、`design.md`、`tasks.md`、delta specs |
| **Explore** | 用代码库推理问题、比较选项 | 深化 change artifacts |
| **Apply** | 顺序完成 tasks，每个引用 requirement ID | 代码 + 测试 + MD phase nodes |
| **Archive** | Delta specs 合并到 main specs，归档 | 冻结的变更记录，永不删除 |

这跟 "写需求 → 写代码 → code review → merge" 相似，但关键差异：**每一步都有机器可验证的 artifact，artifact 之间互相引用、双向追踪。**

## 需求可追踪性：一条 ID 贯穿所有层

每个 capability 获得 3 字母缩写（如 `agentic-queue` → `AGQ`）。需求获得全局唯一 ID（`AGQ-001`）。三个生命周期：`alive` → `pending` → `retired`。

```
req-registry.yaml:    AGQ-001: agentic-queue — Structured machine queue state...

spec.md:              > req: AGQ-001, AGQ-002
                      ### Requirement: Queue state schema is structured

tasks.md:             - [ ] 1.2 @impl AGQ-009: 重写 §3...

code (JS):            // @impl AGQ-001

code (MD frontmatter): req: AGQ-001
```

从代码里的 `@impl AGQ-001` 可以反向追溯到 spec 的 requirement 描述，再追溯到注册表的分配记录。一条 ID，双向可追踪。

## Delta Spec：不直接改，写 diff

每个 change 写 delta，不直接改 main spec。一个真实的 delta spec 长这样（`openspec/changes/wfq-queue-loop-wave0/specs/agentic-queue/spec.md`）：

```markdown
## ADDED Requirements

### Requirement: Queue state schema is structured
Machine-readable queue state stored as `rb_queue.agq.json` with explicit slot
and pool arrays.
> req: AGQ-001

### Requirement: Queue manager reads and writes queue state
`queue-manager.mjs` is the sole authority for queue state mutation.
> req: AGQ-002

## MODIFIED Requirements

### Requirement: Complete() triggers receipt check and slot promotion
[was: "Complete() writes a receipt event to trace"]
Complete() now (a) runs receipt check via `validate-receipt.mjs`, (b) on pass,
promotes slot_2 → slot_1 and refills from pool, (c) writes all state changes
to trace.
> req: AGQ-003

## REMOVED Requirements

### Requirement: Agent manually manages task list in Markdown
Removed. Task list management is now handled by structured queue JSON, not
free-text Markdown checkboxes.
> req: AGQ-004 (retired)
```

四个 section 类型：ADDED（新能力）、MODIFIED（已有能力的变更，保留原文并标注变化）、REMOVED（废弃并写明原因）、RENAMED（ID 不变，名称更新）。

Archive 时，delta 智能合并到 main spec —— 保留已有内容，插入新内容。**不是粗暴替换，是有结构的合并。** 多个 change 可以同时进行，delta 互相独立，merge 时工具解决冲突。

这跟 git 的哲学一样：不改 origin，提 PR，merge 时解决冲突。

## 合规检查：脚本强制执行

两个脚本在每次 archive 前**必须 PASS**：

- **`check-project-reqs.mjs`**：检测重复 ID、未注册 ID、孤儿引用、复用已退役 ID
- **`check-project-specs.mjs`**：检测主 spec 中的非法 delta header、缺少 Purpose/Requirements、缺少 `> req:` 追溯行

不是 code review 的"建议"，是 archive **被拒绝**如果不过。规则写在脚本里，不在 wiki 里。这和第三篇的 Layer 2 哲学一脉相承：**验证层不能作假。**

## 完整生态（数字说明它是真实在用的）

- **41 个 capability 目录**，每个都有 `spec.md`，覆盖了从 gate 状态机到 agentic queue 到 subagent relay 的完整体系
- **24 个归档的变更**在 `openspec/changes/archive/` —— 两年多的变更历史，可审计
- **~120 个注册的需求 ID**，跨 ~25 个 capability 前缀 —— 没有 ID 漂移，没有孤儿引用（因为有脚本强制检查）
- **Path drift 追踪**：archive README 记录代码库重组导致的路径变化

## 回到主线：Agent 开车，引擎刹车，OpenSpec 定规则

回顾整个系列：

1. **Agentic Workflow** — 谁开车？Agent 开车，不是引擎推着走
2. **与传统开发的差异** — 车怎么造？LLM 是发动机，Markdown 是导航，引擎是刹车
3. **容错与纠错** — 翻车了怎么办？Layer 1 可以错，Layer 2 抓出来，Agent 修回去
4. **OpenSpec** — 交规怎么定？从 idea 到实现到归档，每一步可追踪、可验证、不可伪造

四层叠在一起：

```
Agent 开车（搜索、判断、写作、修复）
  ↕ 读 MD
Markdown 指路（目标、动作、gate、失败处理）
  ↕ 跑 CLI
Engine 刹车（schema 校验、gate 规则、receipt、trace）
  ↕ 合规检查
OpenSpec 定规则（propose → explore → apply → archive）
```

这不是一个"LLM + workflow 引擎"的系统。这是一个**以 LLM 为驾驶员、以 Markdown 为导航和控制面、以确定性验证为安全系统、以规格驱动为治理体系**的完整方法论。

而 OpenSpec 本身就是这套方法论的镜像：主要产出 Markdown，少量 JS 做合规验证，JSON/YAML 做数据层。**跟它治理的系统一样的结构 —— Agent 读 MD 做事，引擎做检查。**

---

## 接下来

这套文档系列描述了 Deep Research Tool 的架构哲学和治理体系。如果你想深入了解具体实现：

- **代码入口**：`DPT_FRAMEWORK/` —— 框架代码、phase node MD、engine 模块、CLI 工具、Zod schema
- **治理入口**：`openspec/specs/` —— 41 个 capability 的规格文件；`openspec/governance/` —— 合规脚本和需求注册表
- **实验入口**：`experiments_playbook/exp_*/` —— Agent 驱动的可控 E2E 实验，每个实验有独立 bundle、trace、receipt
- **变更历史**：`openspec/changes/archive/` —— 24 个已归档变更，每个都是完整的 proposal → design → tasks → delta spec 记录

如果想参与开发，从阅读 `guidelines/project-charter.md` 开始——它定义了项目的性质、原则和边界。然后用 `/opsx:propose` 提出你的第一个 change。
