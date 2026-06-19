# Workflow Foundation — 需求梳理

> 2026-06-19 | 状态: 需求探索完成，待 review

---

## 文档上下文（给 Reviewer 的完整背景）

### 这份文档是什么

这是 Deep Research Tool 重构项目的 **workflow 需求推敲文档**。它不是实现计划，不是 OpenSpec proposal，而是把用户（项目作者）的意图、V12 的经验教训、当前代码库的现状、以及反复推敲后确定的设计决策，完整记录下来的需求基准。后续的 OpenSpec proposal 和实现都从这个文档出发。

### 初始需求（用户原始输入）

用户的核心诉求：

> 原来的 workflow 不清晰，都在代码里头。现在就是 workflow 要清晰，然后内容是动态加载。就是原来实现里头的那个 node。这样的好处是我们可以用 gate 机制——一个 node 做完了之后，往下走的时候，不管是 check 还是 inspect，看看可以往下走吗？不能走的话，它自己要修复。Engine 或者 JS 最主要的是要保障整个流程中传统程序能控制的质量部分一定要控制对。

> 以前早期就是有个问题——东西都是糊的。虽然从静态看好像有模有样的，但实际跑下来老是感觉是糊的。数据要么忘了更新，要么一个 wave 跑完了之后，里头部分对的部分不对的。质量门一直没有做对。

> 重构的核心是保障质量，让 MD 当 controller 的同时，充分利用 JS 的精确能力。JS 很容易判断最根本的不许出错的信息，而 MD 那个东西说不清楚。

> 原来 workflow 藏在各种各样的 MD 里头，一会儿在这儿一会儿在那儿，不清晰。我们这回用 node 的原因就是：一个 node 只负责一块。进入 wave1 的 node 的时候，上下文里基本上都是 wave1 的内容，而不用管 wave0 或 wave2。它们靠动态加载一个一个往前走。

### 探索过程中阅读的文件

**V12 原始设计（理解旧系统）：**
- `_original_dpt_v12/DEEP_RESEARCH_MANUL_V12/V12_Deep_Research_使用指南.md` — 用户指南，含 SVG 流程图。理解了 7 步生命周期和 HITL 机制
- `_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/` — 完整模板包：`AGENT-GUIDE.md`, `CLAUDE.md`, `COMMANDS.md`, 以及 `specs/`, `flows/`, `output_templates/`, `command_playbooks/` 子目录。理解了 V12 的模板结构、gate 规范、queue 合约
- `_original_dpt_requirement/` — 9 个需求文件（`00-overview.md` 到 `08-redesign-recommendations.md`）。深入理解了 V12 的 5 大问题：规范藏在 prose 里、类型系统是约定不是强制、状态机藏在 10+ 文件里、Projection Map 反模式、Agent 单点故障

**当前项目状态（理解现状）：**
- `DPT_FRAMEWORK/` — 30 个文件，含 `engine/`（7 个引擎）、`cli/`（4 个 CLI）、`schema/`（7 个 contract + enums）、`command_playbook/`、`rb_templates/`
- `DPT_FRAMEWORK/engine/workflow-chain.mjs` — MD node 依赖解析 + VM 沙箱执行引擎（后来判定这条路是错的）
- `DPT_FRAMEWORK/engine/workflow-fsm.mjs` — FSM 状态机引擎（这次不用）
- `DPT_FRAMEWORK/engine/gate-loop.mjs` — 确定性 gate checkpoint 引擎
- `DPT_FRAMEWORK/engine/gate-fork.mjs` — 多分支 gate 路由引擎
- `DPT_FRAMEWORK/engine/queue-manager.mjs` — 5-slot 队列管理器
- `DPT_FRAMEWORK/engine/trace.mjs` — 统一 JSONL trace writer
- `DPT_FRAMEWORK/schema/` — 10 个 Zod enum + 6 个 contract schema + gate 转换表
- `DPT_FRAMEWORK/cli/` — validate-bundle, inspect-bundle, instantiate-run-bundle, operate-queue
- `openspec/config.yaml`, `openspec/specs/`, `openspec/governance/` — 项目治理体系
- `guidelines/project-charter.md` — 项目宪章：MD 控 Agent Flow，JS 控 deterministic checkpoint
- `guidelines/command-experiments.md` — 实验规范：真实 bundle + 真实 framework code + trace 裁决
- `experiments/prototype-workflow-fsm/nodes-workflow-fsm/` — FSM node 格式参考（`.fsm.json` + entry MD）
- `experiments/prototype-workflow-chain/nodes-workflow-chain/` — chain node 格式参考（`requires` frontmatter + VM 沙箱 JS block）
- `experiments_playbook/` — 19 个 playbook，6 个实验系列
- `tests/` — 14 个测试文件，`node:test` + `node:assert` 模式
- `_backlog/` — 3 个 TODO（prototype-eval, prototype-explore-exploit, prototype-extract）+ done 目录

### 需求推敲过程

需求不是一次性写出来的，经历了多轮"提出 → 用户反馈 → 纠正 → 深化"的循环：

1. **第一轮**：初步理解用户意图，提出 chain-based node 结构、VM 沙箱执行模式、gate-loop 集成
2. **用户纠正 1**：VM 沙箱是错的路。MD 是给 Agent 读的，不是给 JS 自动跑的。这个纠正直接改变了整个技术路线——workflow-chain.mjs 排除，改为 Agent 读纯 MD + 主动调 CLI
3. **第二轮**：重新设计为 MD 纯文本 + CLI 入口模式；提出 HITL1 不是独立 node（放在 instantiation 之前作为触发条件）
4. **用户纠正 2**：HITL1 应该是独立 node。每个 node 要有 `stop` 属性控制能否暂停。Gate 规则用 JSON 人机共读。CLI 一个 gate 一个。HITL 交互用聊天 + 结构化问题
5. **第三轮**：整合所有反馈，确定 9 node + 3 shared MD 结构、`stop: yes/no` 机制、7 个 gate JSON + 7 个 CLI、三大块分步策略

### 关键参考

| 参考 | 作用 |
|------|------|
| `guidelines/project-charter.md` | MD/JS 分工原则、Check/Inspect/Advice 反馈模式、PDCA 循环 |
| `guidelines/command-experiments.md` | 真实执行、不 mock、trace 裁决 |
| `_original_dpt_requirement/08-redesign-recommendations.md` | V12 → 新架构的迁移建议、Schema-first、显式状态机 |
| `_original_dpt_v12/DEEP_RESEARCH_MANUL_V12/` | 原始 7 步生命周期、HITL 机制、gate 系统设计 |
| `DPT_FRAMEWORK/engine/gate-loop.mjs` | 可复用的 gate 引擎 |
| `DPT_FRAMEWORK/schema/` | 可复用的 Zod schema（enums + contracts） |

### 这份文档的使用方式

- **Reviewer 读**：理解整体需求、设计决策、待解决的问题
- **后续 OpenSpec proposal**：从这份文档提取 proposal.md + design.md + delta specs
- **实现时参考**：第一块（骨架）的产出物清单、每个 node 的模拟动作表、第二块（搬内容）的顺序和原则

---

## 问题

V12 的 workflow 藏在 MD 各处，不清晰。Agent 自己既当运动员又当裁判——gate 不精准，数据容易糊（忘了更新、部分对部分不对）。重构的核心目标是**质量门做对**：让 MD 当 controller，JS 做精确的 gate enforcement。

## 用户想要什么

1. **workflow 要清晰** — 不再是藏在各种 MD 里的隐式流程，而是显式的 node 链
2. **一个 node 只负责一块** — wave0 的 node 在一起，wave1 的在一起，上下文隔离
3. **动态加载** — 进入 wave1 时只加载 wave1 的上下文，不用管 wave0 或 wave2。不是一开始全部 MD 都加载
4. **JS 精确控制质量** — gate 机制：一个 node 做完 → check/inspect → 能往下走吗？不能走就修复
5. **先搭骨架，再填内容** — 先把结构跑通，再逐步往里加东西
6. **不用 FSM** — 怕调整复杂，先用简单的 chain 步骤
7. **不用 worktree** — 别把问题做复杂
8. **MD 驱动，JS 在它的位置上** — JS 保障传统程序能控制的质量部分

## 探索发现

### V12 的流程（从使用指南）

从用户角度看就是几步：

```
HITL1(用户选profile+must-answer)
  → Instantiation(创建Run Bundle)
    → Setup Ready(验证workspace)
      → Wave 0(共享基础——高可信材料打底)
        → Wave 1(逐题深挖——每个主题独立找证据)
          → Wave 2(跨题综合——比较、调和、判断)
            → HITL2(用户终审)
              → Readiness(最后验一遍)
                → Final Delivery(生成报告)
```

### V12 的问题（从 redesign-recommendations）

1. **规范藏在 prose 里** — ~22 不变量、~200 术语、~30 spec 文件，Agent 记不住
2. **类型系统是约定不是强制** — `acceptance_status` 应该是什么值？写错了后面才发现
3. **状态机藏在 10+ 个文件里** — `current_gate` 的合法转换散落各处
4. **Projection Map 反模式** — 规则从 CHARTER.md "投影"到 PLAN.md/STATUS.md，改了源头要改 5-10 个文件
5. **Agent 是单点故障** — 整个"运行时"就是一个 LLM Agent 读 MD 手动执行，没有 guardrail

### 当前项目已有的东西

**Engine 层（可复用）：**
- `gate-loop.mjs` — 确定性 gate checkpoint。对 state 跑 rules，返回 `{passed, say, next?}`
- `gate-fork.mjs` — 多分支 gate 路由
- `queue-manager.mjs` — 5-slot 队列 + receipt 检查
- `trace.mjs` — 统一 JSONL trace writer
- `workflow-fsm.mjs` — FSM 状态机（这次不用）

**Schema 层：**
- 10 个 Zod enum（CurrentGate, StopAuthorizationState, RunState 等）
- 6 个 contract schema（Status, Queue, Profile, Plan, Trace, Gate）
- Gate 转换表（8 状态，10 事件类型）

**CLI 层（可复用）：**
- `validate-bundle.mjs` — Zod 校验 bundle 里所有控制文件
- `inspect-bundle.mjs` — 目录结构完整性检查
- `instantiate-run-bundle.mjs` — 创建 bundle 目录 + 模板文件

> **重要：`workflow-chain.mjs` 的 VM 沙箱模式是错的路。** 那条路把 Agent Flow 藏进了 JS 自动执行——MD 里塞 JS code block，Engine 用 VM 沙箱跑。这等于 Agent 不用读 MD、不用自己做判断，JS 全自动跑了。违背 command-experiments 的核心原则：**MD 是给 Agent 读的，JS 只在关键节点做确定性 check。** 不用 workflow-chain.mjs。

## 关键设计决策（已确认）

| 决策 | 结论 |
|------|------|
| FSM vs Chain | **Chain** — 简单，好调整。以后需要再换 FSM |
| Worktree 隔离 | **不用** — 别做复杂 |
| 谁驱动 workflow | **MD/Agent 驱动** — JS 只在 gate 位置做 check |
| Scope | **完整生命周期骨架** — 所有步骤的 node 都定义，但内容逐步填 |
| VM 沙箱 | **不用** — MD 是给 Agent 读的，不是给 JS 跑的。workflow-chain.mjs 排除 |
| HITL1 | **独立 node** — phase-hitl1.md，stop=yes |
| HITL2 | **独立 node** — phase-hitl2.md，stop=yes |
| 暂停控制 | **`stop` frontmatter** — no = 不许停，yes = 可以停 |
| Gate 规则 | **JSON 人机共读** — `DPT_FRAMEWORK/gates/*.json` |
| Agent 调 JS | **CLI 入口** — MD 不直接看到 JS 代码 |
| wave1 | **placeholder** — 日后 sub-agent 支持，frontmatter subagent=true |

## 核心模式：MD 给 Agent 读，JS 给 Agent 用

**不是 VM 沙箱那套路。** Node MD 文件是**纯文本**，Agent 读它来理解当前阶段要干什么。没有 JS code block 自动执行。Agent 读了 MD 之后，自己去做内容工作，做完了**通过 CLI 调用** JS engine 来验证。

```
Agent 读 phase-wave1.md（纯 Markdown，无 JS block）
  → MD 告诉 Agent：这个阶段的目标、输入、产出、步骤、约束
  → MD 的 frontmatter 告诉 Agent：stop=no（不许停，不许问用户）
  → Agent 理解了，开始干活（搜索、阅读、写证据、写分析）
  → Agent 觉得干完了，调 CLI：
      node DPT_FRAMEWORK/cli/check-gate.mjs --gate wave0_complete --bundle dpt_rb_xxx
  → CLI 返回 { passed: true/false, say: '...' }
  → passed → Agent 读下一个 phase 的 MD
  → failed → Agent 读 say 里的诊断，修复，再 check
```

关键点：
- **MD 不直接看到 JS 代码** — Agent 通过 CLI 入口调用，接口干净
- **动态加载** — Agent 只读当前 phase 的 MD。进入 wave1 时上下文里只有 wave1 + shared，没有 wave0 或 wave2
- **`requires_context` frontmatter** — 告诉 Agent "要理解这个 phase，你还需要读这几个文件"。Agent 自己决定要不要读

### Frontmatter：每个 node 的元数据

每个 phase node 的 frontmatter 让 LM 一眼看清楚这个 node 的性质：

| 字段 | 作用 | 示例 |
|------|------|------|
| `phase` | 阶段标识 | `wave1` |
| `gate` | 完成后要过的 gate | `wave1_complete` |
| `next` | gate 通过后进入哪个 phase | `wave2` |
| `stop` | 能否停下来跟用户说话 | `no` / `yes` |
| `requires_context` | 需要读哪些 shared MD | `[shared-profile.md, shared-gate-rules.md]` |
| `subagent` | 是否需要 sub-agent 支持（可选） | `true` / 省略 |

**`stop` 属性是这个 workflow 的关键控制机制：**

- `stop: no` → Agent **不许停**，不许问用户"要继续吗？""找到这个了看看？"。自主静默执行。大部分 phase 都是这个。
- `stop: yes` → Agent **可以停**，可以问用户问题、等用户决策。只有 HITL1 和 HITL2。

Agent 读 frontmatter → `stop: no` → 知道自己没资格停 → 干活 → 调 CLI → 进入下一个 node。简单干净。

### Node 结构

```
workflows/nodes-v12-lifecycle/
  shared-profile.md          # PROFILE 字段说明（给 Agent 参考）
  shared-gate-rules.md       # 每个 gate 的 prose 描述（给 Agent 参考）
  shared-schemas.md          # 关键 schema 的字段说明（给 Agent 参考）

  phase-hitl1.md             # stop=yes — 用户选 profile + must-answer
  phase-instantiation.md     # stop=no — 创建 bundle，初始化控制文件
  phase-setup.md             # stop=no — 验证 workspace
  phase-wave0.md             # stop=no — 共享基础材料
  phase-wave1.md             # stop=no — 逐主题深挖（placeholder，日后 sub-agent）
  phase-wave2.md             # stop=no — 跨主题综合
  phase-hitl2.md             # stop=yes — 用户终审
  phase-readiness.md         # stop=no — 最终验证
  phase-final.md             # stop=no — 生成报告
```

9 个 phase node + 3 个 shared MD。Phase node 之间**没有依赖链**——Agent 按 chain 表顺序一个接一个地读和执行。

### Node MD 内容（骨架阶段）

以 wave1 为例，骨架阶段的内容：

```markdown
---
phase: wave1
gate: wave1_complete
next: wave2
stop: no
requires_context:
  - shared-profile.md
  - shared-gate-rules.md
subagent: true
---

# Wave 1 — 逐题深挖

## 你要干什么

对 PLAN 里的每个 seed topic，搜 1-2 篇 topic-specific 材料，写成 evidence reference 文件，然后写一份 evidence-summary。

## 具体动作

1. 读 `PLAN.md` 的 Topic Registry，拿到 topic 列表
2. 对每个 topic：
   a. 搜 1-2 篇跟这个 topic 直接相关的材料（优先官方/学术来源）
   b. 写 `<topic-id>-<source>.md` 到 `seed_topics/_reference/`，元数据要完整（source_url, tier, trust_level, evidence_role, topic_unique_status 等）
   c. 写 `seed_topics/_artifacts/wave1_topics/<topic-id>-<slug>/evidence-summary.md`，包含：Key Evidence（从 ref 里摘出来的硬数据）、Current Judgment（基于当前证据的判断）
3. 更新 `STATUS.md` 的 Wave 1 审计表：每 topic 的 accepted_topic_ref_count、primary_count 等

## 你怎么知道自己做完了

```bash
node DPT_FRAMEWORK/cli/check-gate-wave1-complete.mjs --bundle dpt_rb_xxx
```
返回 `check.passed: true` 才算完。false 的话看 inspect 和 advice，修完再跑。

## 不许做的事
- 不许停，不许问用户"要继续吗？"（stop: no）
- 不许自己判断"差不多了"，CLI 说 passed 才算


### Gate 规则：JSON 人机共读

Gate 规则的源头是 **JSON 文件**，人和 JS 都能读：

```
DPT_FRAMEWORK/gates/
  instantiation-complete.json
  setup-ready.json
  wave0-complete.json
  wave1-complete.json
  wave2-complete.json
  hitl2-recorded.json
  readiness-passed.json
```

每个 gate JSON 的结构（以 wave0_complete 为例）：

```json
{
  "gate": "wave0_complete",
  "description": "Wave 0 共享基础完成",
  "rules": [
    {
      "id": "shared_ref_floor",
      "description": "共享材料数量 >= floor",
      "check": "file_count",
      "target": "seed_topics/_reference/00-shared-*.md",
      "condition": ">=",
      "floor": "config.wave0_shared_floor"
    },
    {
      "id": "high_trust_majority",
      "description": "高可信来源 > 50%",
      "check": "ratio",
      "field": "trust_level",
      "values": ["official", "academic"],
      "condition": ">",
      "threshold": 0.5
    },
    {
      "id": "constraint_coverage",
      "description": "至少 1 篇覆盖约束/风险",
      "check": "count",
      "field": "evidence_role",
      "contains": "limitation",
      "condition": ">=",
      "floor": 1
    }
  ]
}
```

- **Agent 读** `shared-gate-rules.md` 了解每个 gate 的 prose 描述（干什么、为什么）
- **JS 读** JSON 文件执行精确验证
- **同一个源头**，不会出现 prose 和代码不一致

### Agent 调用 JS：CLI 入口

Agent 不直接看到 JS 代码。每个 phase 结束时通过 CLI 调用：

```bash
# Phase 完成后，验证是否可以进入下一个 phase
node DPT_FRAMEWORK/cli/<name-tbd>.mjs \
  --phase wave0 \
  --bundle dpt_rb_xxx

# 返回 JSON 包含三部分：
# {
#   "check": { "passed": false },
#   "inspect": "shared_ref_floor: 3 < 5. 缺 2 篇。high_trust_majority: 0.4 < 0.5。",
#   "advice": "建议补充 2 篇以上高可信共享材料，优先官方/学术来源"
# }
```

这就是 project-charter 里定义的 **Check / Inspect / Advice** 反馈模式：
- **check**: 过还是不过（布尔）
- **inspect**: 不过的话，缺什么、错在哪（诊断）
- **advice**: 下一步怎么修复（方向建议）

Agent 读 JSON → check.passed 为 true → 进入下一个 phase。false → 读 inspect + advice → 修复 → 再跑 CLI。

CLI 命名：**一个 gate 一个 CLI**，`check-gate-<gate-name>.mjs`。7 个 gate 就是 7 个 CLI，各自处理自己的数据和反馈逻辑。

### Chain 表

Agent 推进用的 chain 表（放在 `workflow-runner.mjs` 里）：

```
hitl1 → instantiation → setup → wave0 → wave1 → wave2 → hitl2 → readiness → final
```

### 需要新写的代码

- **新**: `DPT_FRAMEWORK/gates/` — 7 个 gate JSON 文件，人机共读
- **新**: `DPT_FRAMEWORK/cli/check-gate-*.mjs` — 7 个 CLI，一个 gate 一个。Agent 调 `check-gate-<gate-name>.mjs --bundle ...`。各自读 gate JSON + bundle state，跑 gate-loop，输出 check/inspect/advice
- **新**: `DPT_FRAMEWORK/engine/workflow-runner.mjs` — `PHASE_CHAIN` 表 + `nextPhase()` 查询。特别薄，~30 行
- **新**: 12 个 node MD — 9 个 phase node（含 HITL1）+ 3 个 shared。纯 Markdown
- **新**: Agent 用的 playbook — `run-v12-lifecycle.md`
- **复用**: `gate-loop.mjs`（被 CLI 调用）、`trace.mjs`、`validate-bundle.mjs`、`inspect-bundle.mjs`、`instantiate-run-bundle.mjs`
- **不用**: `workflow-chain.mjs`（VM 沙箱错路）、`workflow-fsm.mjs`

## 分步推敲

这个东西不可能一步做完。大概分三大块：

### 第一块：Workflow Foundation（骨架）

目标：**把 node 链 + gate JSON + CLI 入口 + playbook 搭起来。每个 node 不是完全空的——里头得有一个简单的模拟动作，看起来像回事。**

每个 phase node 的正文写一个最小的具体动作。比如：

| Node | 模拟动作 |
|------|----------|
| phase-hitl1.md | 读用户写的原始问题 MD → 拆成 seed topics → 问用户选 profile + 写 must-answer → 写入 PROFILE |
| phase-instantiation.md | 创建 `dpt_rb_xxx/` 目录 → 从模板 copy 5 个控制文件 → 跑 `validate-bundle` + `inspect-bundle` |
| phase-setup.md | 检查 seed topic 文件都存在 → 检查 `_reference/` 和 `_artifacts/` 目录结构 → 确认 navigation stub |
| phase-wave0.md | 搜 2-3 篇高可信共享材料（官方/学术）→ 写入 `00-shared-*.md`（含元数据）→ 写 `_INDEX.md` |
| phase-wave1.md | 对每个 topic 搜 1-2 篇材料 → 写入 `<topic-id>-*.md` → 写 `evidence-summary.md`（placeholder） |
| phase-wave2.md | 读各 topic 的 evidence-summary → 写 `cross-topic-synthesis.md`（placeholder）→ 标几个 judgment |
| phase-hitl2.md | 写 `human-decision-brief.md` → 呈现给用户 → 等用户选 A/B/C/D → 写入 PROFILE |
| phase-readiness.md | 跑 `validate-bundle` → 检查 30s 内能找到关键证据 → 检查 trace checkpoint 齐全 |
| phase-final.md | 生成最终报告到 `final/` 目录 |

**每个 node 的 MD 正文就是这些动作的详细说明。** Agent 读 node → 知道具体要干什么 → 执行（骨架阶段是做模拟动作，第二块换成真实研究）→ 调 CLI gate。

验证：
1. Agent 按 playbook 指示，读 frontmatter（知道 phase/gate/next/stop）→ 读正文（知道具体动作）→ 执行 → 调 CLI → 推进
2. `stop: no` 的 node 上 Agent 不会停，`stop: yes` 的 node 上 Agent 可以交互
3. 完整 9 步链路从头跑到尾，每个 node 做一个最小但有形态的动作

产出物：
```
DPT_FRAMEWORK/workflows/nodes-v12-lifecycle/   # 12 个 node MD
DPT_FRAMEWORK/gates/                            # 7 个 gate JSON
DPT_FRAMEWORK/cli/check-gate.mjs                # Agent 用的 CLI
DPT_FRAMEWORK/engine/workflow-runner.mjs        # chain 表 + helper
DPT_FRAMEWORK/command_playbook/run-v12-lifecycle.md  # Agent 看的 playbook
tests/engine/workflow-runner.test.mjs           # chain 表正确性
tests/engine/gate-json.test.mjs                 # gate JSON schema 校验
```

### 第二块：一个一个 node 搬内容

骨架跑通之后，逐个 node 往里填内容。从 V12 参考（`_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/`）搬，但适配新模式。

**搬的顺序：**

```
第1个: hitl1          — stop=yes，问用户 profile + must-answer
第2个: instantiation  — stop=no，创建 bundle，初始化控制文件
第3个: setup          — stop=no，验证 workspace
第4个: wave0          — stop=no，共享基础材料
第5个: wave1          — stop=no，逐主题深挖（placeholder → 日后 sub-agent）
第6个: wave2          — stop=no，跨主题综合
第7个: hitl2          — stop=yes，用户终审
第8个: readiness      — stop=no，最终验证
第9个: final          — stop=no，生成报告
```

**wave1 的特殊处理**：wave1 是整个 workflow 最复杂的部分。第一块和第二块都只放 placeholder——在 MD 里写清楚这个阶段要干什么，但具体实现留到以后。日后拆子步骤，用 sub-agent 支持里面的搜索/筛选/backfill 循环，维持主 Agent 的信噪比。Frontmatter 里 `subagent: true` 标记。

**搬的时候的核心原则：**

- Agent 不自 policed — JS gate 精确到数字
- V12 prose 规则 → gate JSON 的 `rules` 数组
- Agent 维护的状态 → bundle 控制文件（STATUS/TRACE），CLI gate 直接读
- Agent 聊天记忆 → trace JSONL 持久事件

### 第三块：HITL 放在哪 + `stop` 控制机制

V12 有两个人机交互点。在新 workflow 里，**都是独立 node**，靠 `stop` frontmatter 控制。

**HITL1 — 研究开始前，用户定义意图**

```
phase-hitl1.md（stop: yes）
  → Agent 读 node：它的任务就是问用户两个问题
  → 用户选了 research_profile + 写了 must-answer
  → Agent 把回答写入 PROFILE
  → gate: hitl1_recorded（JS 检查 profile + must-answer 已写入 PROFILE）
  → 进入 phase-instantiation.md
```

**HITL2 — 研究快结束时，用户终审**

```
phase-hitl2.md（stop: yes）
  → Agent 读 node：写决策简报，呈现给用户，等回答
  → Agent 写 human-decision-brief.md
  → 同步 PROFILE/STATUS/QUEUE 到 pending_user
  → 用户选 A/B/C/D
  → Agent 把决策写入 PROFILE
  → gate: hitl2_recorded（JS 检查决策已写入）
  → 进入 phase-readiness.md
```

这两个 node 的 gate 跟其他 gate 不同——条件包含人机交互。JS 只检查决策已记录，不替用户做决定。

**`stop` 是整个 workflow 的暂停控制机制：**

```
phase-hitl1.md        stop: yes    ← 可以停，问用户
phase-instantiation.md stop: no  ← 不许停
phase-setup.md         stop: no
phase-wave0.md         stop: no
phase-wave1.md         stop: no
phase-wave2.md         stop: no
phase-hitl2.md        stop: yes    ← 可以停，等用户
phase-readiness.md     stop: no
phase-final.md         stop: no
```

Agent 读 node frontmatter → 看到 `stop: no` → 知道自己没资格停 → 干完就调 CLI gate → 进入下一个 node。不会有 V12 那种模糊状态。今后要加新的 HITL 点，加一个 `stop: yes` 的 node 就行。

**总结：**

```
phase-hitl1.md         → gate: hitl1_recorded (stop: yes)
phase-instantiation.md → gate: instantiation_complete (stop: no)
phase-setup.md         → gate: setup_ready
phase-wave0.md         → gate: wave0_complete
phase-wave1.md         → gate: wave1_complete
phase-wave2.md         → gate: wave2_complete
phase-hitl2.md         → gate: hitl2_recorded (stop: yes)
phase-readiness.md     → gate: readiness_passed
phase-final.md         → gate: none (终点)
```

---

## 已解决的疑问

| 问题 | 结论 |
|------|------|
| wave1 太大 | 先 placeholder，日后拆子步骤 + sub-agent 支持。frontmatter `subagent: true` |
| Gate 规则源头 | **JSON 人机共读**。Agent 看 prose 描述（shared-gate-rules.md），JS 读同一个 JSON |
| Agent 怎么调 JS | **CLI 入口，一个 gate 一个 CLI**：`check-gate-instantiation-complete.mjs`、`check-gate-wave0-complete.mjs` 等。多少个 gate 就多少个。各自处理自己的数据/反馈 |
| HITL1 放哪 | **独立 node**。phase-hitl1.md，`stop: yes` |
| HITL2 放哪 | **独立 node**。phase-hitl2.md，`stop: yes` |
| 怎么控制暂停 | 每个 node 的 frontmatter `stop` 字段：`no` = 不许停，`yes` = 可以停 |
| CLI 命名 | **一个 gate 一个 CLI**：`check-gate-<gate-name>.mjs`。各有各的数据和反馈逻辑 |
| HITL 交互形式 | **聊天 + 结构化问题**。用户不一定专业，问题要结构化让用户清楚怎么回答。参考 V12 的 A/B/C/D 选择设计 |
| 骨架跑通标准 | 12 个 node MD + 7 个 gate JSON + 7 个 CLI + playbook 写好，Agent 跑 9 步链路，每个 node 执行模拟动作 + CLI gate 通过 |

---

## 需求推敲完成，准备进入下一步
