# 二、Agentic Workflow 和传统软件开发的本质差异

**如果你只记住一件事：传统开发的能力来源是程序员写的确定性逻辑，正确性靠类型系统和测试。Agentic workflow 的能力来源是 LLM 的语义理解和判断，正确性靠确定性检查点（JS 引擎）在每一步做验证。代码的角色从"做事"变成了"确保事做对了"。**

---

## 根本差异：能力来源变了

传统软件开发的能力来源是程序员写的每一条 `if/else`、每一个算法。LLM 充其量是一个被调用的 API。

Agentic workflow 的能力来源是 LLM 本身 —— 搜索策略、信息阅读、证据判断、报告写作、犯错后的修复，全部由 LLM 完成。代码的角色从"做事"变成了"验证"。

两条流水线：

```
传统软件开发：
需求 → 设计 → 编写确定性代码 → 单元测试 → 集成测试 → 部署

agentic workflow 开发：
OpenSpec proposal → delta spec → LLM + 人类协作实现 → JS 引擎验证 → gate 检查 → trace 审计
```

差异的根源在于 README 中那句核心定义：

> "You are not writing a purely deterministic program."

## 六个维度的对比

| 维度 | 传统软件开发 | Agentic Workflow 开发 | **所以呢？** |
|------|-------------|---------------------|-------------|
| **能力来源** | 代码本身：每个算法都是程序员精确编写的 | LLM：搜索、阅读、判断、写作、综合 | 程序员从"写逻辑"变成"写约束"——能力边界变了 |
| **正确性模型** | 类型系统 + 单元测试 + CI/CD | 确定性检查点：JS/Zod 验证 schema、gate 规则、receipt | 正确性不在编译时，在运行时每一步——但每一步都是自动化的 |
| **控制流** | 命令式：`if (condition) { doA() }` | 声明式：Markdown 描述目标、gate、失败处理 | 改流程不用改代码，改 Markdown 就行——Agent 自己会读新指令 |
| **状态管理** | 内存中的变量、数据库连接池 | 文件系统：JSON/YAML/JSONL/MD | 对话断了可以恢复，人类可以随时读文件了解状态，全程可审计 |
| **用户界面** | React/Vue 组件树 | Markdown playbook：Agent 和人类读同一份 MD | 系统的"UI"就是它的说明书——不需要额外维护 |
| **错误定位** | 错误是 bug，应被测试捕获 | 错误是工作流的一部分，有结构化 repair 路径 | 不需要"一次写对"，需要"犯错后能修回来"（详见第三篇） |
| **部署模型** | 改代码 → 重启 → 状态丢失 | 框架只读 + 运行时可变状态分离（`DPT_FRAMEWORK/` vs `dpt_rb_*/`） | 改框架不影响正在跑的任务；读运行状态不需要看框架代码 |

## 四大不可变层次

这个系统的每一层都有精确的职责边界。最关键的是"不能做什么"：

| 层 | 职责 | **不能做** |
|----|------|-----------|
| **LLM Agent** | 语义理解、内容判断、证据选择、写作、读反馈后修复 | 不能拥有确定性状态权威、receipt 权威、schema 真相 |
| **Markdown** | Agent Flow 控制器：任务、阶段、约束、反馈、下一步 | 不能做机器可验证的真值判断、状态转换、receipt/trace 权威 |
| **JS/CLI Engine** | 精确解析、schema 验证、状态转换、receipt 检查、trace | 不能编排多阶段 Agent Flow、不能做语义判断 |
| **JSON/YAML/JSONL** | 持久化运行时状态、证据、trace | 不能做语义推理 |

传统开发只有后两层（代码 + 数据）。Agentic workflow 多了前两层（LLM + Markdown），而且**前两层是驾驶员，后两层是安全系统**。这是根本性的架构倒置。

一个关键澄清：**Engine 层是纯传统代码。** 它不是"LLM 辅助的验证"，不是"AI 驱动的检查"。它就是普通的 JavaScript —— Zod schema 验证、JSON 解析、文件存在检查、状态机转换表。不含 AI，不含概率判断，不含 prompt。它之所以能作为信任根基，正是因为它和传统软件一样：**输入确定 → 输出确定，永不撒谎。**

## 几个具体差异

### 没有环境变量

每个 Coding Agent tool call 都是独立 shell 进程，`process.env` 不跨调用持久化。所有配置必须显式传递：CLI flags、函数参数、运行时文件属性。**所以呢？** 状态管理被迫从"隐式的环境"变成"显式的文件"——想了解系统状态，读文件就行，不需要连进进程内存。

### Trace 是真相来源，不是 log

`rb_trace.jsonl` 是 append-only 权威审计追踪。每一条都是带时间戳、带事件类型、带 bundle 标识的结构化记录：

```jsonl
{"ts":"2026-06-23T10:32:01Z","event":"phase.enter","bundle":"dpt_rb_myresearch","phase":"wave0"}
{"ts":"2026-06-23T10:32:05Z","event":"queue.claim","bundle":"dpt_rb_myresearch","task":"task-003","slot":1}
{"ts":"2026-06-23T10:34:22Z","event":"queue.complete","bundle":"dpt_rb_myresearch","task":"task-003","receipt":"pass"}
{"ts":"2026-06-23T10:40:15Z","event":"gate.run","bundle":"dpt_rb_myresearch","gate":"check-gate-wave0-complete","result":"fail","fails":["count_floor"]}
{"ts":"2026-06-23T10:45:30Z","event":"gate.run","bundle":"dpt_rb_myresearch","gate":"check-gate-wave0-complete","result":"pass"}
{"ts":"2026-06-23T10:45:31Z","event":"phase.exit","bundle":"dpt_rb_myresearch","phase":"wave0","next":"phase-wave1.md"}
{"ts":"2026-06-23T14:20:00Z","event":"hitl.approve","bundle":"dpt_rb_myresearch","phase":"hitl2","human":"ethanmac","decision":"approved"}
{"ts":"2026-06-23T14:20:01Z","event":"phase.enter","bundle":"dpt_rb_myresearch","phase":"readiness"}
```

判决永远来自 trace JSONL 解析，绝不来自 console.log。**所以呢？** Trace 是机器可解析的证据链。一个 readiness gate 可以逐条审计"前面 8 个 gate 是不是真的都过了"——而且是机器自动做的，不是人翻日志。上面的 JSONL 里清楚记录了 wave0 gate 第一次 fail、第二次 pass——机器读这段 trace 就能自动判断"这个 phase 有修复记录但最终通过了"，不需要人类来翻。

### 不做 mock

伪造 trace event、手写 receipt、`console.log` 当判决 —— 这些绝对禁止。判断标准是："这个证据是真实执行的副产品，还是事后伪造的？"**所以呢？** 信任的根基不在"代码写对了没"，在"证据是不是真的"。一旦证据可以伪造，第三篇的 PDCA 反馈循环就失去意义了。

### 框架与运行时的严格边界

```
DPT_FRAMEWORK/  = 只读框架资产（代码、schema、模板、定义、Agent 指令）
dpt_rb_*/       = 可变生产运行状态/数据/证据/结果
dpt_disp_*/     = 可变一次性实验状态
```

**所以呢？** 同一套框架服务无数个运行实例，代码和状态彻底分离。改框架不影响正在跑的任务，读运行状态不需要看框架代码。这跟传统开发中"改代码、重启、状态丢失"的模式完全不同。

## 什么时候用传统开发，什么时候用 Agentic Workflow？

| 场景 | 推荐 | 原因 |
|------|------|------|
| 确定性业务逻辑（支付、认证、CRUD） | 传统软件开发 | LLM 的能力在这里是多余的，甚至危险的 |
| 需要 LLM 做语义判断但流程固定的（客服机器人、文档问答） | 传统 Workflow（Dify）+ LLM 节点 | 流程固定意味着 DAG 够用，LLM 只负责语义这一环 |
| 多阶段、需要 LLM 自主决策和自修复的（深度研究、代码审查、安全审计） | **agentic workflow** | LLM 需要自己判断"这一步做完没""要不要重做""换什么策略" |
| LLM 能力是核心价值来源，代码只是约束层 | **agentic workflow** | 当 LLM 是发动机时，你需要刹车和仪表盘，而不是另一个发动机 |

关键判据：LLM 是工具还是驾驶员？工具 → Dify。驾驶员 → Agentic Workflow。

---

*下一篇：[如何充分发挥 LLM 的能力：容错与纠错](03-llm-error-correction-loop.md) —— 上一篇说了"错误是工作流的一部分"，这篇详细展开：怎么允许犯错，又怎么保证最终正确。*
