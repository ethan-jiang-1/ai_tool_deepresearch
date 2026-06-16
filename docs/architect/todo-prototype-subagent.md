# TODO: prototype-subagent

> 状态: 待设计 | 优先级: 高 | 创建: 2026-06-16

## Why

`prototype-gate-loop` 验证了修复闭环（修得对），`prototype-gate-fork` 验证了多路分发（走得对）。但 deep research 还有一个核心能力缺失：**并行 fan-out**（做得广）。

真实 deep research 的一个 wave 需要同时做多件事：

```
Wave 0 Gate Audit 通过后：
  ├── 搜索 official sources（3 个 query 并行）
  ├── 搜索 academic sources（2 个 query 并行）
  ├── 验证已有的 reference（每条独立验证）
  └── 交叉检查 claim（每条独立 check）

这些任务互相独立，应该并行执行，而非串行。
```

当前 prototype 的 `segmentRegistry` 里的 Step 是串行执行的。要让 Agent 真正"放开手脚做 research"，需要一个 **subagent 编排层**。

## 核心挑战：跨 Coding Agent

我们一直没做对的关键点：**subagent 协议不应该绑定到某个特定的 Coding Agent**。

真实场景：
- 用户用 **Claude Code** 开发 → subagent 可能是 Claude Code 的子会话
- 用户用 **Codex** 开发 → subagent 是 Codex 的 agent 调用
- 未来可能有更多 Coding Agent

**目标：** JS Engine 定义工作项（what to do），Coding Agent 提供执行能力（how to do it）。协议层在中间做翻译。

```
┌─────────────────────────────────────────────────────┐
│                  Deep Research Engine               │
│                                                     │
│  evaluateBranch → fork → dispatch to N subagents    │
│                         │                           │
│                         ▼                           │
│              ┌──────────────────┐                   │
│              │  Subagent Protocol│                  │
│              │  (agent-agnostic) │                  │
│              └────────┬─────────┘                   │
│                       │                             │
│         ┌─────────────┼─────────────┐              │
│         ▼             ▼             ▼              │
│    ┌────────┐   ┌────────┐   ┌────────┐           │
│    │Claude  │   │ Codex  │   │Future  │           │
│    │ Code   │   │ Agent  │   │ Agent  │           │
│    └────────┘   └────────┘   └────────┘           │
└─────────────────────────────────────────────────────┘
```

## 与 gate-loop/gate-fork 的关系

三个 prototype 拼成完整的 Gate 路由模型：

```
evaluateBranch(state)
       │
       ▼
  forkRouter ──────→ pass ──→ dispatch subagents (prototype-subagent)
       │                        │
       │                        ├── subagent_1: search_official
       ├── fail_a ──→ converge  ├── subagent_2: search_academic  
       ├── fail_b ──→ converge  ├── subagent_3: verify_claim_A
       └── blocked ─→ HITL     └── subagent_4: verify_claim_B
              │                        │
              ▼                        ▼
         convergeRepair           collect results
         (prototype-gate-         → merge evidence
          fork/loop)              → re-enter Gate
```

- `gate-loop`：修得对（1→1 repair loopback）
- `gate-fork`：走得对（1→N branch routing）
- `subagent`：做得广（1→N parallel execution）

## 关键设计问题（待解决）

### 1. Subagent 协议层

用什么格式描述"给 subagent 的工作项"？

候选方案：
- A) Markdown 文件（与现有 segment MD 一致）：Engine 写 `.md` → Agent 读取并执行
- B) JSON 任务描述：Engine 生成结构化 task → Agent 解析
- C) CLI 参数：Engine 调用 `node subagent.mjs --task=...`

**倾向：A（Markdown）** — 与现有 `segments-gate-fork/*.md` 模式一致。Agent 已经会读 MD 文件。每个 subagent 得到一个独立的 Markdown 文件描述它的任务。

### 2. Fan-out 粒度

一个 Gate pass 后，是 fork 到 N 个 subagent 还是 fork 到一个 coordinator？

- A) **Flat fan-out**: Gate → N 个 subagent，Engine 直接管理
- B) **Coordinator**: Gate → 1 个 coordinator agent → 它再 spawn subagent

**倾向：A（Flat）** — 与 fork 的 Map 模式一致（`Map<SubagentKey, Step>`）。Engine 保持控制权，Agent 不做编排决策（Engine 管规则，Agent 做内容）。

### 3. 结果汇聚

N 个 subagent 完成后的结果如何合并？

- 每个 subagent 产出独立证据文件（`artifacts/waveN/subagent_*.json`）
- Engine 收集 → 合并 → 更新 state → re-enter Gate
- 不需要 Agent 来做 merge 决策（又是 Engine 管规则）

### 4. 跨 Agent 适配

如何让同一个 protocol 在 Claude Code 和 Codex 上都工作？

关键洞察：**协议层应该是文件系统**。

```
dpt_rb_<name>/
  _subagents/                ← Engine 创建
    dispatch.json            ← Engine 写入：要运行哪些 subagent
    slot_01/
      task.md                ← Engine 写入：这个 subagent 的任务
      result.md              ← Agent 写入：这个 subagent 的结果
      _status.json           ← Engine 读：done | running | failed
    slot_02/
      ...
```

- **Engine**：创建 dispatch，读 result，更新 state
- **Agent**（Claude Code / Codex）：读 task.md，执行，写 result.md
- **协议**：文件系统 = 任何 Coding Agent 都能读写的"总线"

### 5. 失败处理

Subagent 失败（超时、错误、结果为空）怎么办？

- 复用 `convergeRepair` 的 stall + maxIterations 模式
- 单个 subagent 失败 → 标记 `_status.json: failed` → Engine 决定 retry 还是 escalate
- 全部 subagent 失败 → re-enter Gate 走 repair 路径

## 实验范围（prototype 级别）

遵循 gate-loop/gate-fork 的实验哲学：

**Goals:**
- 3+ subagent 并行 dispatch（search ×2 + verify ×1）
- 文件系统协议（`_subagents/` 目录）
- 结果收集 + merge → re-enter Gate
- 独立实验，命名对齐（`subagentDispatch`、`SubagentSlot`、`collectResults`）

**Non-Goals:**
- 不实现真实 subagent 进程管理（那是 Coding Agent 的事）
- 不追求生产级并发（实验用 mock）
- 不实现跨网络 dispatch（本地文件系统足够）

## 实现思路

```javascript
// 预计新增的概念

// 每个 subagent 是一个 slot
class SubagentSlot {
  constructor(key, taskMD, context) {
    this.key = key;           // 'search_official_01'
    this.taskPath = `_subagents/${key}/task.md`;
    this.resultPath = `_subagents/${key}/result.md`;
  }
}

// dispatch: 根据 branch 决定启动哪些 subagent
const dispatchMap = new Map([
  ['pass', ['search_official', 'search_academic', 'verify_claims']],
  // fail 不分发 subagent，走 converge 修复
]);

// collect: 读取所有 slot 的 result
function collectResults(slots) {
  // 读取每个 result.md → merge → 返回合并后的 state
}

// 主循环
function runSubagentWave(state) {
  const { branch } = forkRouter(state);
  if (branch !== 'pass') return convergeRepair(state);
  
  const slotKeys = dispatchMap.get('pass');
  const slots = slotKeys.map(k => createSlot(k, state));
  // Agent 执行每个 slot...
  return collectResults(slots);
}
```

## 下一步

1. OpenSpec explore: 细化协议层设计、slot 文件格式、merge 逻辑
2. `/opsx:propose prototype-subagent` — 出 proposal + design + specs + tasks
3. 实现 `experiments/prototype-subagent/`
4. 三个 prototype 合并 review：loop + fork + subagent = 完整 Gate 路由
