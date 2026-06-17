# Guideline: command_experiments 实验规范

> 状态: 生效 | 创建: 2026-06-17 | 适用于: `DPT_FRAMEWORK/command_experiments/` 下所有实验

---

## ⚠️ 第一条禁令：禁止 Mock

**这是 staging 级别的端到端测试。不是单元测试。没有 mock 的位置。**

传统程序测试：mock 外部依赖 → assert 返回值 → 通过。执行者是 CPU，mock 的是第三方 API。
**这个实验：执行者是 LLM。你 mock LLM 就是在 mock 核心执行者——等于什么都没测。**

```
传统程序 mock：  CPU → [mock 了外部 API] → assert  → 有意义，测的是自己的逻辑
智能体实验 mock： JS → [mock 了 LLM]       → "passed" → 毫无意义，你测的是你自己的假数据
```

如果你写了一个大脚本，用 `console.log` 模拟了 LLM 本该做的事，产出了看起来"passed"的结果——**你什么都没验证，你只是在自己骗自己。**

在模拟环境底下构造好了，实打实的测出来。不要用传统程序的 mock 思维来做智能体实验。

---

**你是在设计一个 LLM 能理解、能执行、能根据反馈自我纠正的系统。不是在写一个确定性的程序。**

这是理解本 guideline 一切规则的钥匙。下面所有内容——MD 是 controller、实验在真实 bundle 里跑、trace 做裁决、不能造假——都从这句话推导出来。

---

## 核心思想

这个框架的编程模型跟传统程序**根本不同**。

传统程序：代码定义控制流，按预定路径执行，出错就 crash 或 catch。
**这个框架：MD 定义 workflow（一个半结构化的 DAG），LLM 驱动 MD 一步一步往前走，JS/CLI 在关键节点做检查和反馈，LLM 拿到反馈后可以知错改错、调整方向。**

### Workflow 是一个半结构化的 DAG

Workflow 的每一步（step）写在 MD 里，step by step，**LLM 能看清，人也能看清**。它不是编译后的控制流图——它就是写在 Markdown 里的、带自然语言的 DAG。

Step 之间可以插入脚本检查、CLI 验证——这些是 DAG 的**关键节点**。每个节点的 owner 取决于谁擅长：
- **MD（LLM）擅长**：理解意图、加工信息、做决策、写内容、根据反馈调整
- **JS/CLI 擅长**：确定性校验、schema 检查、状态机执行、trace 记录、统计数据

### PDCA 是自然的 Step 模式

今后每个 step 可能都是一个 PDCA 循环：

```
Plan    → MD（LLM 分析现状，决定下一步做什么）
Do      → MD 或 subagent（执行实际工作）
Check   → JS/CLI（校验结果、检查约束、写 trace）
Act     → MD（LLM 拿到反馈，决定：通过 → 下一步 / 有问题 → 调整重来）
```

**Check 这一步是 JS/CLI 的主场。** LLM 不擅长精确校验——它擅长的是拿到反馈后的"知错改错"。所以双方配合：JS 做检查产生反馈，MD 读取反馈做决策。

### 反馈闭环是这个架构的核心竞争力

传统程序的反馈循环是：写代码 → 编译 → 跑测试 → 看报错 → 改代码。人在循环里。

这个框架的反馈循环是：**MD step 执行 → JS/CLI 检查 → trace 记录 → LLM 读 trace → LLM 调整下一步**。LLM 在循环里。

这意味着 workflow 不是写死的——它可以**根据中间检查结果动态调整**。一个 step 失败了，LLM 可以 repair 再试；一个检查发现缺失，LLM 可以回退补充。这就是 gate-loop 和 gate-fork 验证的核心能力。

## 实验哲学：小实验 → 泛化

### 实验是小而聚焦的

`command_experiments/` 下的每个实验验证**一个具体机制**，不是一个宏大流程。

```
workflow-next   → 验证：manifest 不预读，advance 时才动态加载依赖
gate-loop       → 验证：fail 后能 repair 并回到 gate 重评
gate-fork       → 验证：1→N 分支路由 + converge repair
subagent        → 验证：真实 LLM subagent dispatch → collect → merge
```

每个实验只回答**一个问题**。这个问题答通了，机制就被证明可行了。

### 做通了 → 泛化到生产

实验不是终点。实验验证通过的机制，**泛化**到真正的 deep research workflow 里：

```
小实验（command_experiments）
    │  验证一个具体机制
    │  在真实的 run bundle 环境里跑
    │  用真实的 LLM、真实的 MD node、真实的 trace
    │
    ▼ 做通了 ✓
    │
泛化（openspec specs + DPT_FRAMEWORK）
    │  把实验验证过的 pattern 写成 spec
    │  集成到生产 workflow 的对应 gate/phase
    │  实验的 JS engine 逻辑 → 生产 schema/CLI
```

**实验是 staging，不是 playground。** 实验环境要尽可能逼近最终运行环境。

### 不能造假 — mock 是头号敌人

这是智能体工程和传统软件工程**最关键的区别**。`command_experiments/` 下的实验是 staging 级别的端到端测试——不是在 playground 里写单元测试。

**传统 mock 思维（绝对禁止）：**
- 用 mock JS 模拟 LLM 的行为 → 你在测自己的假数据
- 手写假 `result.json` 塞进 slot 目录，假装 subagent 返回了 → 你伪造了 trace
- 跳过 validate/inspect，"反正实验跑通了就行" → 实验环境不合法，结果作废
- 在 bundle 外面用 `node` 跑几个函数，`console.log` 看起来 passed 了 → 什么都没验证
- 写一个大脚本，把 LLM 的搜索/阅读/决策全用 `echo` 带过去 → 这不是实验，是表演

**为什么绝对不能 mock：**
传统程序 mock 外部 API 是合理的——你的逻辑在代码里，CPU 真的执行了你的代码。
智能体实验 mock LLM 是荒谬的——LLM **就是**核心执行者。你 mock 掉执行者，剩下的 Engine 校验的是一个从未发生过的假事件流。反馈闭环塌了。

**正确的 staging 测试：**
- Subagent 实验？**用真实的 Agent 工具启动真实的 LLM subagent。** 让它真的去搜索、真的去读网页、真的写 `runtime-receipt.jsonl`。
- Workflow-next 实验？**让 Engine 真的去读 bundle 里的 node MD**，resolve 真实依赖，执行真实代码块。`file_read` receipt 必须对应一次真实的 `readFileSync`。
- **Trace 的每一行都必须来自真实执行。** 不是 `writeFileSync` 写进去的假数据。
- **Bundle 必须通过 validate + inspect。** 真实环境的前提是环境本身合法。

**判断标准只有一个：这个 trace event 是真实发生过，还是你的脚本产生的？**

如果是后者——删掉重来。

### Trace 是锤子的印记，不是你事后写的总结

这是理解"为什么不能 mock"的更深一层。

Trace 不是测试报告。Trace 是**真正做事的那个人，在做事的过程中，一锤一锤砸下去的印记**。Engine 读了一个文件 → `file_read`。vm 执行了一段代码 → `file_executed`。这些不是"测试断言"，这些是**操作本身的副产物**。

**Log 让你意识到你不能欺骗。** 当你必须产出一条真实的 log，而这条 log 只能由真正执行了那个操作的人写出来——你就被 log 约束了。你不能假装读过文件，因为 `readFileSync` 没调用就是没有 `file_read`。你不能假装执行过代码块，因为 vm sandbox 没跑就是没有 `file_executed`。**Trace 是锤子的内容，不是你对锤子的描述。**

这就是 DevOps 的核心：**可观测性来自真实执行的不可伪造的副产物。** CI pipeline 的 log 不是人写的，是每个 step 的 stdout/stderr。同样，这里的 trace 不是测试脚本写的，是 Engine 在执行过程中留下的。如果 Engine 自己不写 trace 到磁盘（就像 workflow-next 目前只写 `runtime.receipts` 内存数组），那就是设计缺口——锤子砸了，但印记没留下。

**为什么要跑在接近真实的环境？** 因为这个 staging 环境（`dpt_rb_test_*` bundle + 真实文件系统 + 真实 Engine 调用）确保 trace 的每一行都来自真实的系统调用。这不是模拟——这是在 staging 上跑端到端实验。传统程序在 staging 上跑集成测试；智能体工程在 staging 上跑端到端实验。原理一样：**环境越真实，log 越不可伪造，结论越可靠。**

```
Mock 路径（禁止）:
  脚本 → 手写假数据 → console.log "passed" → 锤子没砸过，什么都没发生

真实路径:
  Engine → readFileSync → receipt → trace JSONL → 锤子砸了，印记在磁盘上
```

**Trace 文件是 DevOps 的证据链。** 没有 trace，你不知道发生了什么。Trace 造假，你以为什么都发生了，其实什么都没发生。

### 智能体工程 vs 传统软件工程

| | 传统软件工程 | 智能体工程 |
|---|---|---|
| 执行者 | CPU 按指令执行 | LLM 读 MD，理解意图，自主执行 |
| 控制流 | 代码定义，编译时确定 | MD 定义 DAG，运行时 LLM 可调整 |
| 测试 | mock 依赖、assert 返回值 | 真实 LLM 跑、真实 trace 裁决 |
| 反馈循环 | 人读报错改代码 | LLM 读 trace/检查结果，自己调整 |
| "通过"的含义 | 所有 assert 通过 | 真实执行产生的 trace 里 check 全 pass |
| 核心风险 | 逻辑 bug | LLM 理解偏差、MD 指令模糊、反馈被忽略 |

**你是在设计一个 LLM 能理解、能执行、能根据反馈自我纠正的系统。不是在写一个确定性的程序。**

**原则 1: MD 是 Controller，JS/CLI 是 Verifier**

| 归属 | 角色 | 做什么 | 例子 |
|------|------|--------|------|
| MD | Controller | 定义 workflow step、做决策、加工信息、根据反馈调整 | "Phase 1: 创建 bundle → Phase 2: dispatch → Phase 3: verify" |
| JS engine | Verifier | 执行确定性逻辑、校验 schema、写 trace | `advanceWorkflow()`, `subagentDispatch()`, `traceEntry('check', ...)` |
| CLI tool | Gate | 质量门、独立可执行的检查 | `validate-bundle.mjs`, `inspect-bundle.mjs` |

**MD 不写业务逻辑，JS 不定实验流程。MD 负责"做什么"和"根据反馈怎么办"，JS 负责"检查对不对"。**

**原则 2: 实验在真正的 Run Bundle 里跑**

每个实验创建一个 disposable 的 `dpt_rb_test_<name>/` bundle，按 `instantiate-run-bundle` playbook 完整创建（6 控制文件 + 6 数据目录），validate + inspect 通过之后才开始实验。

这是 staging 级别的端到端测试——实验环境越逼近真实 run bundle，发现的 bug 越有价值。实验需要的 node MD 也放在 bundle 内部（如 `exp/nodes/`）。

**原则 3: Trace 是唯一的裁决依据**

实验结果不靠 console output 判断。最终 pass/fail 从 trace JSONL 文件读取、统计、裁决。这让实验**机器可验证**——不管跑实验的是人还是 Agent，判定标准一致。

Trace 也是 LLM 的**反馈来源**——verify 脚本读 trace 发现失败，LLM 读同一份 trace 就能理解哪里出了问题，决定下一步怎么调整。

---

## 目录约定

```
repo root/
├── DPT_FRAMEWORK/
│   └── command_experiments/
│       └── <experiment-name>/           # 实验 playbook（MD）
│           ├── test-simple.md           # 简单：happy path
│           ├── test-medium.md           # 中等：核心高级特性
│           └── test-complex.md          # 复杂：错误路径、边界、恢复
│
├── experiments/
│   └── prototype-<experiment-name>/     # JS 引擎实现
│       ├── EXPERIMENT.md                # 研究目的、假设、结论
│       ├── <name>.mjs                   # 引擎代码
│       ├── trace.mjs                    # trace 系统（每个 prototype 一份）
│       └── nodes-<name>/                # （可选）node MD 文件
│
└── _backlog/
    └── todo-prototype-<name>.md         # 设计文档、TODO
```

**命名规则：**
- experiment name：kebab-case，描述实验对象（`workflow-next`、`subagent`、`gate-loop`）
- bundle name：`dpt_rb_test_<short>_<tier>/`，如 `dpt_rb_test_wl_simple/`
- short code：2-3 字母缩写（`wl`=workflow-next, `gs`=subagent(generic search), `gl`=gate-loop, `gf`=gate-fork）
- trace file：`_trace_<short>_<tier>.jsonl`，放在 bundle 根目录

---

## 实验生命周期

每个实验 playbook 严格按这个顺序：

```
Step 1: 创建 Run Bundle
   ├── mkdir 6 个数据目录
   ├── 从 rb_templates/ 生成 5 个控制文件（sed {{name}}）
   ├── cp rb_trace.jsonl（空文件）
   ├── cp node MD 到 bundle 内（如 exp/nodes/）
   └── 跑 validate-bundle.mjs + inspect-bundle.mjs

Step 2: 准备实验环境
   ├── 创建 .tmp/ 或 _subagents/ 等实验目录
   ├── 写入 manifest / dispatch.json / workflow.json
   └── 创建 inline .mjs 脚本

Step 3: 执行实验
   ├── node <script>.mjs（每个 phase 一个或多个）
   └── 对于 subagent 类实验：Agent tool 启动真实 LLM subagent

Step 4: 从 trace 裁决
   ├── audit/verify 脚本读 trace JSONL
   ├── 统计 check events 的 pass/fail
   └── exit 0 = ALL PASSED, exit 1 = 有失败

Step 5: 清理
   └── rm -rf dpt_rb_test_<name>/
```

---

## MD Playbook 结构

### 文件头

每个 playbook **必须从 YAML frontmatter 开始**，第一行就是 `---`。Frontmatter 只放机器和 Agent 路由需要的硬事实；不要把实验解释、测试思路、教学性说明放进去。

```markdown
---
schema: command-experiment/v1
experiment: <experiment-name>
case: <simple|medium|complex|identity|...>
case_goal: "<一句话说明这个 case 到底验证什么>"
runner: coding-agent
agent_mode: native-subagent  # 仅 subagent 实验需要
execution: real-bundle
evidence: filesystem-and-trace
bundle: dpt_rb_test_<short>_<case>
trace: dpt_rb_test_<short>_<case>/_trace_<short>_<case>.jsonl
verdict: trace-jsonl
---

## Execution Contract

由 coding agent 在真实 `dpt_rb_test_*` bundle 中执行；如 playbook 包含 subagent phase，必须启动真实 native subagent。实验结果必须来自实际文件写入、Engine/Agent 调用和 trace event；允许通过文件系统读取中间产物；禁止 mock 返回、手写假 result、伪造 trace，或用 console output 代替 trace 裁决。

# test-<experiment>-<case>

一句话说清验证什么，不重复 frontmatter 里的 bundle/trace。
```

Frontmatter key 约定：

- `schema`: 固定 `command-experiment/v1`
- `experiment`: 实验族名，使用目录名，如 `workflow-next`、`gate-loop`、`gate-fork`、`subagent`
- `case`: case id，通常是 `simple`、`medium`、`complex`，也可以是 `identity` 这类具体 case
- `case_goal`: 一句话说明这个 case 到底验证什么；这里承载“名字后面跟上想测啥”
- `runner`: 固定 `coding-agent`，表示 playbook 由 coding agent 按步骤执行，不是 `node --test`
- `agent_mode`: 仅 subagent 实验使用，固定 `native-subagent`
- `execution`: 固定 `real-bundle`，表示必须在真实 `dpt_rb_test_*` bundle 中执行
- `evidence`: 固定 `filesystem-and-trace`，表示允许用文件系统传递/读取中间产物，但证据必须落到 trace
- `bundle`: disposable run bundle 目录名，不带尾部 `/`
- `trace`: 裁决 trace JSONL 路径，写完整相对路径
- `verdict`: 固定 `trace-jsonl`

`Execution Contract` 必须紧跟 frontmatter，放在标题之前。它是给 LLM 的运行边界，不是测试思路，措辞要短、硬、不可绕：

- 必须在真实 `dpt_rb_test_*` bundle 中执行
- subagent phase 必须启动真实 native subagent
- 可以通过文件系统读取中间产物
- 禁止 mock 返回、手写假 result、伪造 trace
- 禁止用 console output 代替 trace 裁决

不要再写 `## 测试思路`。如果需要说明路线，用 `## Expected Runtime Path` 写步骤；如果需要解释背景，放到 prototype 的 `EXPERIMENT.md`。

### 文件头之后

```markdown
## Task Size [MAIN]  （仅 subagent 类实验需要）

选择 fast/normal 的规则。

## Expected Runtime Path

1. 步骤 1 `[MAIN/SHELL]`
2. 步骤 2 `[MAIN->SUBAGENT]` （仅 subagent 类）
3. ...

## Phase 1: ... [MAIN/SHELL]

## Phase N: ...

## Cleanup
```

### Phase 内部

每个 Phase 包含：
1. **说明文字**：这个 phase 做什么、预期什么
2. **一个 shell code block**：`cat > script.mjs << 'JS' ... JS` 然后 `node script.mjs`
3. **预期结果**：`→ 预期：...`

### 关键约束

- Shell code block 中**不写复杂逻辑**——复杂逻辑放在 JS engine 里，shell 只负责创建文件 + `node` 调用
- inline `.mjs` 文件 import 路径相对于 bundle 位置：`'../experiments/prototype-<name>/<module>.mjs'`
- `NODES_DIR` 等 env var 指向 bundle 内部路径：`"$B/exp/nodes"`
- subagent 实验的 `node` 输出需要 `| grep -v "^\[trace\]"` 过滤 trace echo
- **中间步骤静默，只暴露质量门和裁决。** engine 执行步骤用 `> /dev/null 2>&1` 吞掉输出——这些输出对 coding agent 没有信息量。只让 validate/inspect/verify 的输出可见。Coding agent 看三步即可：bundle 合法 → 执行完成（exit 0）→ 裁决 PASS/FAIL

---

## JS Engine 模式

### 每个 prototype 必须有的文件

```
experiments/prototype-<name>/
├── EXPERIMENT.md          # 研究文档：假设、设计决策、结果、未解决问题
├── <name>.mjs             # 引擎实现（export 公共 API）
├── <name>.test.mjs        # 单元测试（node --test）
└── trace.mjs              # trace 系统
```

### trace.mjs 标准 API

```js
setTraceFile(path)      // 设置全局 trace 文件路径
getTraceFile()          // 获取当前路径
traceInit(label, detail) // 初始化（删除旧文件，写 run_start）
traceEntry(event, detail) // 追加一条 JSONL
traceSummary()           // 读取并打印摘要
traceCleanup()           // 删除 trace 文件
```

每个 prototype 的 `trace.mjs` 是独立副本——不在 prototype 之间 import trace。

### Engine API 设计

- 导出纯函数，不依赖全局状态（trace file path 除外）
- 每个操作产生 receipt，push 到 `runtime.receipts[]`
- state 通过 Zod schema 校验，不信任 Agent 返回的数据
- 错误时抛错、不吞错、不留半成品状态

---

## 复杂度分级

每个实验至少提供三个 tier：

| Tier | 覆盖 | 示例 |
|------|------|------|
| **simple** | Happy path，最小功能集 | 1 个 slot、1 个 step、无依赖 |
| **medium** | 核心高级特性 | 并行、repair、依赖链、内容/执行缓存分离 |
| **complex** | 错误路径、边界、恢复 | 缺失依赖、循环、malformed frontmatter、partial failure |

---

## 反模式（不要做的事）

1. **禁止 mock LLM。** 这是第一条禁令。不用 JS 模拟 LLM 的行为、不手写假 result.json、不用 console.log 假装跑通。见上方"不能造假"。
2. **不要在 bundle 外面做实验。** 没有 `dpt_rb_test_*` 的实验不是实验——是临时脚本。实验是 staging，构造真实环境实打实测。
3. **不要跳过 validate + inspect。** 这两个质量门是 bundle 合法性的唯一证据。实验的前提是 bundle 合法。
3. **不要把 node MD 放在 repo root 或 prototype 目录。** 放在 bundle 内的 `exp/nodes/`。
4. **不要用 console.log 做裁决。** 裁决只能从 trace JSONL 来。
5. **不要在 MD playbook 里写复杂 JS 逻辑。** MD 里的 JS 只做三件事：import、调用 engine API、trace 结果。复杂逻辑下沉到 engine `.mjs`。
6. **不要让 JS 决定实验流程。** JS 不知道"现在是 Phase 2"——MD 知道。MD 是 controller。
7. **不要跨 prototype import。** `gate-fork` 不 import `gate-loop`。每个 prototype 自包含。
8. **不要在生产 bundle 上做实验。** 只用 `dpt_rb_test_*` 前缀的临时 bundle。
9. **不要跳过清理。** 每个 playbook 最后一步是 `rm -rf`。

---

## 新增实验 Checklist

- [ ] `experiments/prototype-<name>/` 创建，包含 `EXPERIMENT.md`、`<name>.mjs`、`trace.mjs`
- [ ] `DPT_FRAMEWORK/command_experiments/<name>/` 创建
- [ ] `test-simple.md` 写好了：创建 bundle → validate+inspect → 执行 → verify → 清理
- [ ] `test-medium.md` 和 `test-complex.md` 写好了
- [ ] node MD（如有）放在 bundle 内的 `exp/nodes/`，从 playbook 的 Step 1 拷贝
- [ ] 所有 `NODES_DIR` 或类似路径指向 bundle 内部
- [ ] 裁决只从 trace JSONL 来，不靠 console output
- [ ] 端到端跑过：`test-simple.md` 的每个 step 都能复制到 shell 执行并通过
- [ ] `_backlog/todo-prototype-<name>.md` 记录了设计决策和 TODO
