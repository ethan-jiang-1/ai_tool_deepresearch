# Project Guidelines

> 状态: 生效 | 创建: 2026-06-17

---

**你是在设计一个 LLM 能理解、能执行、能根据反馈自我纠正的系统。不是在写一个确定性的程序。**

这是理解本项目一切决策的根。如果你是从传统软件工程背景进来的，放下那些习惯——这里没有编译时确定的控制流、没有 mock 驱动的单元测试、没有"代码即真理"。这里有的是 MD 定义的 DAG、LLM 驱动的执行、JS 做的确定性校验、以及 trace 记录的反馈闭环。

---

## 这个项目做什么

Deep Research Tool — 一个 agentic 框架，用于产出证据支撑的、多 wave、多 gate 的深度研究报告。

核心分工：

```
Engine（JS）  → 执行规则、校验 schema、强制 gate 转换、写 trace
Agent（LLM）  → 读 MD、理解意图、搜索/阅读/提取证据、根据反馈调整
MD（Markdown）→ 定义 workflow step、承载规则、连接 Engine 和 Agent
```

**Engine enforces rules. LLM agents produce content. MD bridges them.**

---

## 核心架构原则

### MD 是 Controller

Workflow 本质是一个半结构化的 DAG，写在 Markdown 里。每一步 step 对 LLM 可读、对人可读。MD 负责"做什么"和"根据反馈怎么办"。

### JS/CLI 是 Verifier

JS 处理 MD 和 LLM 不擅长的东西：确定性校验、schema 检查、状态机执行、trace 记录。JS 不做决策，JS 产生反馈让 LLM 做决策。

### PDCA 是自然的 Step 模式

```
Plan  → MD（LLM 决定下一步）
Do    → MD 或 subagent（执行）
Check → JS/CLI（校验、写 trace）
Act   → MD（LLM 读反馈：通过 → 继续 / 失败 → 调整）
```

### 反馈闭环是核心竞争力

传统程序：人写代码 → 编译 → 测试 → 人读报错改代码。人在循环里。
这个框架：MD step → JS 检查 → trace → **LLM 读 trace** → LLM 调整。LLM 在循环里。

Workflow 不是写死的——LLM 可以根据中间检查结果动态调整路线。

---

## 错误容忍度：什么能错，什么绝对不能错

这是本项目与传统程序最关键的工程差异之一。

### 两层分治

```
Layer 1 — 容许出错（LLM / Agent）
    │  MD 指令理解偏差、搜索结果不完美、subagent 输出格式不对
    │  → 这些是可以接受的。PDCA 的 Check-Act 就是为了处理这些。
    │  → LLM 拿到 JS 的反馈后可以知错改错、调整重来。
    │
Layer 2 — 绝对不能错（Engine / JS / CLI）
    │  schema 校验、gate 状态转换、trace event 完整性、bundle 合法性
    │  → 这些是系统的安全带。如果这层错了，整个反馈闭环就塌了。
    │  → 因为 LLM 依赖这层的输出来做决策——反馈本身是假的，调整就毫无意义。
```

**Layer 2 是 Layer 1 的信任根基。** 如果 Engine 的校验是假的、trace 是 mock 的、bundle 没有真正 validate，那 LLM 就是在根据谎言做决策。

### 绝对不容忍的行为

- **用大脚本模拟真实流程。** 写一个 JS 把 LLM 该做的事用 `console.log` 带过去，假装跑通了。
- **跳过 validate/inspect。** "反正实验跑通了就行"——实验的前提是 bundle 合法。
- **mock trace event。** 手写 JSONL 塞进去。trace 必须来自真实执行。
- **用假数据填充 `result.json`。** subagent 没跑，但手动写了个看起来对的 JSON。
- **绕过 gate 状态机。** 直接改 `rb_status.json` 跳到想要的 gate，而不是让 Engine 执行转换。

**这些不是"偷懒"——是直接破坏了系统唯一可信的校验层。** 传统程序里 mock 是正常的，因为执行者是 CPU，你 mock 的是外部依赖。这个系统里执行者是 LLM——你 mock LLM 就是在 mock 核心执行者，等于什么都没测。

### 判断标准

问自己一句：**这个 trace event 是真实发生过的，还是我写脚本产生的？**

如果答案是后者——停下来。你在造假。

---

## 项目结构

```
repo root/
├── DPT_FRAMEWORK/           # 共享框架（只读，不修改）
│   ├── cli/                 # validate-bundle, inspect-bundle
│   ├── schema/              # Zod 合约 + gate 状态机
│   ├── rb_templates/        # run bundle 模板
│   ├── command_playbook/    # Agent 操作手册（MD）
│   └── command_experiments/ # 实验 playbook（MD）
│
├── experiments/             # JS 引擎原型
│   └── prototype-<name>/
│
├── openspec/                # 规格与治理
│   ├── config.yaml
│   ├── specs/
│   ├── changes/
│   └── governance/
│
├── guidelines/              # 项目指导原则（你在这里）
│   ├── project.md
│   └── command-experiments.md
│
└── _backlog/                # 设计文档、TODO
```

---

## Run Bundle

Run Bundle 是本项目的**工作单元**。每个 research run 是一个 `dpt_rb_<name>/` 目录，包含 6 个控制文件 + 6 个数据目录，由 `validate-bundle.mjs` + `inspect-bundle.mjs` 保证合法性。

Bundle 是 self-contained 的——多个 bundle 并存，互不污染。实验也在 bundle 里跑（`dpt_rb_test_*`）。

详见 `guidelines/command-experiments.md`。

---

## 开发流程

```
实验（command_experiments）
    │  小、聚焦、在真实 bundle 里验证一个机制
    │  不能造假——必须用真实 LLM、真实 MD、真实 trace
    │
    ▼ 做通了 ✓
    │
OpenSpec（spec + change）
    │  把验证过的 pattern 写成 spec
    │  /opsx:propose → explore → apply → archive
    │
    ▼
生产（DPT_FRAMEWORK）
    │  JS engine 逻辑 → schema/CLI
    │  MD pattern → command_playbook
```

---

## 硬性规则

1. **不用 TypeScript。** 纯 JavaScript ESM（`.mjs`），Node.js >=20。
2. **不新增依赖。** 允许的 npm 包：`zod`、`yaml`。其余用 Node built-ins。
3. **测试用 `node:test` + `node:assert`。** 不引入 Jest/Vitest。
4. **不修改 `DPT_FRAMEWORK/` 除非通过 OpenSpec change。**
5. **Bundle 必须通过 validate + inspect。** 不合法 bundle 上的任何实验结果无效。
6. **裁决只从 trace JSONL 来。** console.log 不是证据。
7. **实验在真实 bundle 里跑。** 不在外面用 mock JS 伪装。
8. **不读 `_original_*` 归档文件**，除非明确要求。

---

## 给新来的人

如果你是第一次接触这个项目：

1. 先读这份 `project.md`
2. 再读 `guidelines/command-experiments.md`
3. 看一个实验 playbook（比如 `DPT_FRAMEWORK/command_experiments/workflow-load/test-simple.md`）理解 MD 怎么驱动实验
4. 看对应的 JS engine（`experiments/prototype-workflow-load/`）理解 Engine 怎么做校验
5. 跑一遍实验，读 trace 输出

记住：放下传统程序思维。你面对的是一套 LLM 能读、能执行、能根据反馈自我纠正的系统。代码不是真理——MD + trace + LLM 的反馈闭环才是。
