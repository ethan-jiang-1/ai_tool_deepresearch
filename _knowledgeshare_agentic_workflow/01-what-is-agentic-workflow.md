# 一、什么是 Agentic Workflow？它跟传统 Workflow（如 Dify）的区别

**如果你只记住一件事：传统 workflow 是引擎按 DAG 推着 LLM 走，agentic workflow 是 Agent 自己读 Markdown、自己跑验证、自己走到下一站。引擎不推 Agent，Agent 拉着引擎用。**

---

## 传统 Workflow：引擎开车，LLM 是乘客

Dify、LangChain、Temporal 等传统 workflow 引擎的核心假设是：

```
人类定义 DAG/流程图 → 引擎按图执行 → 每个节点是确定性代码或单次 LLM 调用
```

- **控制流是预定义的**：节点 A → 节点 B → 节点 C，分支条件是显式写死的 `if/else`
- **引擎是驾驶员**：有一个 `while(true) { advance() }` 循环或状态机在推动流程前进
- **LLM 是被调用的工具**：LLM 只是一个"节点类型"，和其他节点（HTTP 请求、代码执行）没有本质区别 —— 它被调用、返回结果、然后引擎继续走
- **错误处理靠重试**：失败了就重试，重试几次就放弃。错误是异常，不是工作流的一部分

## Agentic Workflow：Agent 开车，引擎当刹车

本项目的做法完全相反：

```
Agent 读取 MD phase node
  → MD body 告诉 Agent：当前阶段的目标、允许的动作、gate 命令
  → Agent 自己决定怎么执行（搜索什么、读哪些、怎么写）
  → Agent 执行完后，主动运行 gate CLI
  → Gate 内部查询 transitions.chain.json
     → check.next = 下一个 phase node 的 fileRef
  → Agent 读取 check.next → 自己加载下一个 phase node
  → Loop
```

**没有 `while(true) { advance() }` 循环。** Agent 是 runtime driver —— 它自己读指令、自己做判断、自己跑验证、自己走到下一站。

**Agent 到底在读什么？** 下面是一个简化的 phase node —— Agent 在 wave0 阶段实际读取的 Markdown 指令（`DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md`）：

```markdown
---
phase: wave0
req: SRP-001, SRP-003, EVQ-002
gate: node cli/gates/check-gate-wave0-complete.mjs --bundle <bundle>
chain: transitions.chain.json
---

# Phase: Wave 0 — 第一轮搜索与证据收集

## 目标
为 seed-topics 阶段生成的每个 topic 找到至少 3 个高质量权威来源。

## 允许的动作
- 搜索：为每个 topic 搜索权威资料
- 阅读：打开候选 URL，判断内容质量和相关性
- 写入：将选定的 source 写入 `reference/{topic}/source.yaml`
- 验证：跑 gate CLI 检查完成度

## Gate 通过条件
- 每个 topic 的 source 数量 >= 3
- 每个 source 的 URL 格式有效
- 所有 source 文件符合 Zod schema

## 失败处理
如果 gate 返回 fail：
1. 读 inspect 输出，定位具体问题
2. 针对性修复（补搜缺失的 source、修正格式错误）
3. 重跑 gate
4. 若 3 次仍不过，进入 Gate-repair：评估是否降级 topic 或标记为 blocked
```

Agent 读的就是这份 MD。它不需要外部调度器告诉它"该搜索了"——它自己理解目标，自己决定搜索策略，自己跑验证，自己判断要不要重来。

**Gate 跑完后怎么知道下一站？** `transitions.chain.json` 是静态路由表：

```json
{
  "transitions": {
    "instantiation":  { "gate": "check-gate-instantiation",  "next": "phase-hitl1.md" },
    "hitl1":          { "gate": "check-gate-hitl1",          "next": "phase-setup.md" },
    "setup":          { "gate": "check-gate-setup",          "next": "phase-seed-topics.md" },
    "seed-topics":    { "gate": "check-gate-seed-topics",    "next": "phase-wave0.md" },
    "wave0":          { "gate": "check-gate-wave0-complete", "next": "phase-wave1.md" },
    "wave1":          { "gate": "check-gate-wave1-complete", "next": "phase-wave2.md" }
    // ... wave2, hitl2, readiness, final 共 10 phase, 9 gate
  }
}
```

Gate 返回 `check.next = "phase-wave1.md"`，Agent 读取这个值，加载下一个 phase node，继续走。没有调度循环，没有 DAG 引擎——就是查表。

这里有一个关键点：gate CLI 不是 AI，是**纯传统代码**。它做的就是 Zod schema 验证、JSON 解析、文件存在检查、数量比对。输入确定 → 输出确定。Agent 可以信任它，正是因为它不"智能"。

## 同一个场景，两种处理方式

假设你在做深度研究，第一阶段是"搜索相关资料"。Agent 执行了一次搜索，返回的结果大多不相关。

**Dify 模式下**：搜索节点调了 Google API，返回 10 条结果。引擎检查返回值非空 → 节点标记"完成" → 走向下一个节点（阅读）。引擎不知道结果质量好不好，它只知道"节点没报错"。如果下一个节点（阅读）读了不相关的内容然后写出了错误的摘要，引擎也不知道。你只能在 DAG 里加一个"人工审核"节点，让人来判断。

**Agentic 模式下**：Agent 读 phase node MD，里面写的是"为每个 topic 找到至少 3 个高质量权威来源"。Agent 搜完一看，觉得结果不好，**它自己决定换个关键词再搜**。搜到满意后，Agent 写入 `reference/topic/source.yaml`。然后 Agent 跑 gate CLI —— gate 不仅检查文件是否存在，还检查每个 topic 的 source 数量是否 >= 3、URL 是否有效、格式是否符合 schema。如果某个 topic 只有 2 个 source，gate 返回 fail + inspect 信息："topic X 缺少第 3 个 source"。Agent 读反馈，专门为 topic X 再搜一次，补上后重跑 gate。过了，Agent 才自己走到下一站。

关键差异：**Dify 的引擎不知道什么叫"质量好"，agentic workflow 的 gate 虽然也不知道，但它把"质量不够"编码成了可检查的条件（count >= 3），然后 Agent 自己判断怎么满足这个条件。**

## 关键区别

| 维度 | 传统 Workflow (Dify) | Agentic Workflow（本项目） |
|------|---------------------|--------------------------|
| **谁在驾驶** | 引擎按 DAG 推进 | **Agent（LLM）** 自己读 MD、自己决定下一步 |
| **控制面** | 可视化拖拽的流程图 | **Markdown 文件** —— 人类可读，Agent 可理解 |
| **LLM 角色** | 被调用的 API 节点 | **能力来源** —— 搜索、判断、写作、修复都由 LLM 完成 |
| **验证层** | 代码节点的 try/catch | **JS/CLI Engine 确定性检查点** —— schema 校验、gate 规则、receipt、trace |
| **路由方式** | DAG 中预设的分支条件 | Agent 跑 gate CLI → 查静态 `transitions.chain.json` → 得到下一站 → **Agent 自己走过去** |
| **错误处理** | 异常 → 重试 → 失败 | **PDCA 闭环**：Check 反馈 → Agent 反思 → 修复 → 重验证 |
| **状态存储** | 内存/数据库 | **文件系统** —— JSON/YAML/JSONL/MD，跨对话轮次可恢复 |

## 为什么需要两层循环？

本项目的 agentic workflow 实际上有双层嵌套循环：

### 外层循环（phase → phase）

读 MD node → 执行 → 跑 gate CLI → chain 查下一站 → 加载下一个 MD node。权威来源 = gate + `transitions.chain.json`。确定性的、单步的、静态路由的。

### 内层循环（phase 内）

每个 phase 内部，工作被组织成一个 **agentic queue**：5 个 slot 的活跃窗口（slot_1 是当前任务，slot_2 是下一个，slot_5 是队尾）+ 一个按优先级排序的 refill pool。Agent 的循环是：claim task（从 queue 取一个任务）→ 执行 → complete（引擎检查 receipt + promote 下一个任务 + 从 pool 补充新任务）→ claim 下一个 → ... → queue 清空。权威来源 = `rb_queue.agq.json` + `queue-manager.mjs`。

### V12 的教训

把 phase 间路由和 phase 内任务执行混在一起，是这个项目 V12（第 12 次迭代原型）版本的核心错误 —— 导致了一个 400 行的手写 Markdown，两层逻辑纠缠不清。教训是：

- Phase 路由是**确定性单步**的：gate 检查 → 静态 chain 表 → 下一站。不需要 Agent 判断。
- Phase 内执行是**动态多任务**的：queue 管理、receipt 检查、失败重试、优先级排序。Agent 需要灵活性。
- 不同的验证者，不同的权威来源，**不能混**。

## 派发规则：每件工作有且仅有一个验证者

问"谁验证这件工作？"答案决定派发路径。这其实就是双层循环的另一种表述：

- Task 级 receipt → Queue（内层循环）
- Phase 级 gate → Gate + Chain（外层循环）
- 人类检查点或单步操作 → 直接执行（无 queue）

## 具体化身：10 阶段研究生命周期

以上是抽象描述。在这个项目中，agentic workflow 的具体化身是一条 **10 阶段研究管线**，9 个 gate 串起 10 个 phase：

| # | Phase | 做什么 | 谁主导 | Gate 检查什么 |
|---|-------|--------|--------|--------------|
| 1 | **instantiation** | 创建 bundle 目录，初始化运行时状态文件，写入研究问题 | Agent | bundle 结构完整、状态文件 schema 合法 |
| 2 | **hitl1** | 人类确认研究模式、范围、深度 | **人类** | 人类显式批准信号 |
| 3 | **setup** | 环境准备：加载配置、初始化 source/topic 目录 | Agent | 目录结构就绪、配置完整 |
| 4 | **seed-topics** | 从研究问题生成初始 topic 列表，写入 `topics.yaml` | Agent（queue） | topic 数量 >= 下限、格式符合 schema |
| 5 | **wave0** | 第一轮搜索：为每个 topic 找 >=3 个权威来源，写入 `reference/{topic}/source.yaml` | Agent（queue） | 每个 topic source 数 >=3、URL 有效、schema 合法 |
| 6 | **wave1** | 第二轮搜索：扩展/深化证据，交叉验证已有 source | Agent（queue） | 新增证据满足增量要求、无未处理的交叉验证标记 |
| 7 | **wave2** | 第三轮搜索：填补剩余缺口，最终证据综合 | Agent（queue） | 所有必须回答的问题都有证据覆盖 |
| 8 | **hitl2** | 人类审核最终报告，判断质量是否达标 | **人类** | 人类显式批准信号 |
| 9 | **readiness** | 引擎审计全部 gate 记录和 trace，逐条验证前面 8 个 gate 是否真实通过 | Engine | 全量 gate replay、trace 完整性、无跳过记录 |
| 10 | **final** | 输出最终研究报告 | Agent | 最终格式和完整性检查 |

Agent 在每个 phase 中自己读 MD、自己做研究、自己跑 gate、自己走到下一站。人类在两个 HITL 检查点介入：hitl1 确认研究模式，hitl2 审核最终报告。readiness 是纯引擎阶段——Agent 不参与，由 JS/CLI Engine 逐条审计前面的 gate 记录，确保没有任何 gate 被跳过或作假。

---

*下一篇：[Agentic Workflow 和传统软件开发的本质差异](02-vs-traditional-software-development.md) —— 当 LLM 成为能力来源，Markdown 成为控制面，"写代码"这件事本身意味着什么？*
