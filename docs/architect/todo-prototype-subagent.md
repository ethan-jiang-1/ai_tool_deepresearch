# TODO: prototype-subagent

> 状态: proposal 阶段 | 优先级: 高 | 创建: 2026-06-16
>
> 对应 OpenSpec change: `openspec/changes/prototype-subagent/`

## Why

`prototype-gate-loop` 验证了修复闭环（修得对：1→1 repair loopback），`prototype-gate-fork` 验证了多路分发（走得对：1→N branch routing）。但 deep research 还有一个核心能力缺失：**并行 fan-out**（做得广：1→N parallel execution）。

真实 deep research 的一个 wave 需要同时做多件事：

```
Wave 0 Gate Audit 通过后：
  ├── 搜索 official sources（3 个 query 并行）
  ├── 搜索 academic sources（2 个 query 并行）
  ├── 验证已有的 reference（每条独立验证）
  └── 交叉检查 claim（每条独立 check）

这些任务互相独立，应该并行执行，而非串行。
```

当前 prototype 的 segmentRegistry 里的 Step 是串行执行的。要让 Agent 真正"放开手脚做 research"，需要一个 **subagent 编排层**。

---

## 核心架构洞察：Context Isolation

### 为什么 subagent 对 deep research 至关重要

Deep research 的最大上下文杀手是 **web search 返回的内容**。一次搜索可能返回 20 个页面转 Markdown，轻松吃掉 50K tokens。如果主 Agent 的上下文中堆了 3 轮搜索的全部原始页面，它已经在噪声里溺水了 — 无法有效判断哪些 evidence 该采纳、哪些该丢弃。

Subagent 解决这个问题的核心机制是 **context isolation（上下文隔离）**：

```
┌─────────────────────────────────────────────────────────┐
│                   PERSISTENT LAYER                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │          Engine / 主 Agent (~10K tokens)           │  │
│  │  - WorkflowState（全局状态，永远干净）             │  │
│  │  - Gate 评估（pass/fail 路由决策）                 │  │
│  │  - Merge 决策（哪些 evidence 采纳，哪些丢弃）      │  │
│  │  - 不读原始搜索结果页面                            │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          │                               │
│         ┌────────────────┼────────────────┐              │
│         │                │                │              │
│         ▼                ▼                ▼              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ Subagent A │  │ Subagent B │  │ Subagent C │         │
│  │ search     │  │ search     │  │ verify     │         │
│  │ official   │  │ academic   │  │ claims     │         │
│  │            │  │            │  │            │         │
│  │ 50K tokens │  │ 50K tokens │  │ 30K tokens │         │
│  │ 的搜索噪声 │  │ 的搜索噪声 │  │ 的推理噪声 │         │
│  │     ↓      │  │     ↓      │  │     ↓      │         │
│  │ 返回 ~500  │  │ 返回 ~500  │  │ 返回 ~300  │         │
│  │ tokens     │  │ tokens     │  │ tokens     │         │
│  └────────────┘  └────────────┘  └────────────┘         │
│         │                │                │              │
│         └────────────────┼────────────────┘              │
│                          │                               │
│         NON-SYMMETRIC INFORMATION FLOW                   │
│         向下：task spec（~200 tokens）                   │
│         向上：structured result ONLY（~500 tokens）      │
│         原始搜索轨迹、死胡同、失败尝试 → 永远不向上传递  │
└─────────────────────────────────────────────────────────┘
```

**关键数字：** 腾讯 2025 年的 CodeDelegator 论文量化了这个效应：
- CodeAct agent 的平均上下文比 ReAct 多 60%（15.7K vs 9.4K tokens）
- 更长的上下文 → 更低的任务成功率（负相关），即使在困难任务上也是如此
- 简单任务上 CodeAct 反而比 ReAct 成功率低 5.8% — 纯粹是多余的上下文负担

**结论：窗口越大 ≠ 越好。噪声同比放大。** Subagent 把噪声关在"隔音房"里，只把最终结论递给主 Agent。

### EPSS 模式（Ephemeral-Persistent State Separation）

2026 年三家主要 Coding Agent 都收敛到了同一个架构模式：

| 产品 | Persistent Layer | Ephemeral Layer | 隔离方式 |
|------|-----------------|-----------------|---------|
| **Claude Code** | 主会话 + agent 定义（YAML） | Subagent 独立上下文 | Git Worktree 或内存 fork |
| **Codex** | Manager agent | Worker agent（每子任务一个） | Cloud Sandbox（容器） |
| **Gemini CLI** | 主会话 | Subagent（`@agent-name` 调用）| 独立上下文 |

我们的架构天然就是 EPSS：
- **Persistent Layer** = JS Engine + WorkflowState
- **Ephemeral Layer** = Subagent slots（`slot_NN/` 目录）
- **隔离机制** = 文件系统协议（最通用的解耦方式）

### 非对称信息流

这是 EPSS 的核心约束，也是我们 prototype 必须严格执行的：

```
向下流（Engine → Subagent）：          向上流（Subagent → Engine）：
┌──────────────────────────┐           ┌──────────────────────────┐
│ task.md                  │           │ result.json（typed）     │
│ ~200 tokens              │           │ ~500 tokens              │
│                          │           │                          │
│ ✅ 任务描述              │           │ ✅ 结构化结果            │
│ ✅ input bindings        │           │ ✅ evidence count        │
│ ✅ output schema ref     │           │ ✅ confidence scores     │
│ ✅ 上下文预算限制        │           │ ✅ 不包含原始页面内容    │
│                          │           │                          │
│ ❌ 不传 WorkflowState    │           │ ❌ 不传搜索轨迹          │
│ ❌ 不传其他 slot 的结果  │           │ ❌ 不传失败尝试          │
│ ❌ 不传 Gate 内部状态    │           │ ❌ 不传推理过程          │
└──────────────────────────┘           └──────────────────────────┘
```

这个约束的意义：**向上传递的信息越少、越结构化，Engine 的判断质量越高。**

### 写入权收敛

Cognition（Devin 的开发公司）2026 年的一个关键实践发现：

> **"智能分布，写入收敛"** — 多个 Agent 可以提供智能（搜索、分析、审查），但最终写入文件、拍板决策的主线必须保持单线程。

在我们的架构中：
- **多 Subagent** = 分布智能，并行搜索和验证
- **Engine merge** = 收敛写入，只有 Engine 能修改 WorkflowState

当前设计已经做到了这一点（merge 由 Engine 执行）。但缺了一层：**去重和冲突标注**。两个搜索 slot 可能找到同一个 claim 的不同 source，verify slot 可能标记某个 claim 为 uncertain — 这些冲突需要一个 review subagent（独立上下文，只看合并结果）来标注，再由 Engine 做最终决策。

---

## 2026 年 Subagent 最佳实践映射

### 我们做对的 ✅

| 2026 实践 | 我们的实现 |
|-----------|----------|
| Context isolation | `_subagents/slot_NN/` — 每个 slot 独立文件空间 |
| Agent-agnostic protocol | 文件系统协议，不绑定 Claude Code 或 Codex |
| Flat hierarchy (no nested subagents) | Engine 直接管理 N 个 slot，无 coordinator |
| Lifecycle observability | `_status.json` 独立于 `result.md`，可读崩溃状态 |
| 容忍部分失败 | 单 slot failed → 部分结果仍推进 Gate |
| Config-as-code | `dispatch.json` + `dispatchMap`，路由可审计 |

### 本次 prototype 可以改进的 ⚠️

| 当前设计 | 问题 | 可改进方向 |
|---------|------|-----------|
| `result.md` — 自由 Markdown，Engine 用正则解析 | Agent 写 Markdown 格式不可靠，regex 脆弱 | 替换为 `result.json` + Zod typed output schema |
| 所有 slot 用相同模型 | 搜索和验证需要不同推理能力 | dispatch.json 加 `modelHint`（haiku/sonnet/opus） |
| merge = 简单加法，无去重 | 两个 slot 找到同一 source → double count | 加 dedup review subagent（独立上下文，只看合并结果） |
| 无上下文预算约束 | subagent 可能无限读取，自己也在噪声里溺水 | SlotConfig 加 `maxSources` + `maxTokens` |
| Slot 之间互相不知道对方产出 | verify slot 不知道 search slot 找到什么 | verify slot 的 task.md 应包含前序 slot 的摘要 |

---

## 与 gate-loop/gate-fork 的关系

三个 prototype 拼成完整的 Gate 路由模型：

```
evaluateBranch(state)
       │
       ▼
  forkRouter ──────→ pass ──→ dispatch subagents (prototype-subagent)
       │                        │
       │                        ├── slot_00: search_official
       ├── fail_a ──→ converge  ├── slot_01: search_academic
       ├── fail_b ──→ converge  ├── slot_02: verify_claims
       └── blocked ─→ HITL      └── ...
              │                        │
              ▼                        ▼
         convergeRepair           collect results
         (gate-loop 验证          → merge evidence
          gate-fork 扩展)         → re-enter Gate
```

- **gate-loop**：修得对（1→1 repair loopback）
- **gate-fork**：走得对（1→N branch routing）
- **subagent**：做得广（1→N parallel execution）

三个 prototype 共享同一套骨架：Zod schema、Step 类、evaluateBranch、convergeRepair、checkAndReflect。Subagent 实验自包含（不 import gate-fork），为后续合并为共享库做准备。

---

## 设计决策回顾

以下是当初"关键设计问题"的答案（已在 proposal + design 中确定）：

### 1. Subagent 协议层 → 文件系统

**选择：** `_subagents/` 目录 + `dispatch.json` + `slot_NN/task.md` + `result.md` + `_status.json`

文件系统是任何 Coding Agent 都能读写的"总线" — 不需要 SDK、不需要 API、不需要特定进程间通信机制。与项目核心原则一致：Engine 管规则，Agent 做内容。

### 2. Fan-out 粒度 → Flat，无 Coordinator

**选择：** Engine 直接管理 N 个 subagent slot，通过 `dispatchMap: Map<Branch, SlotConfig[]>` 定义分派规则。

Engine 保持控制权 — 与 2026 年 "写入权收敛" 原则一致。所有路由决策在代码中可见，不隐藏在 Agent prompt 中。

### 3. 结果汇聚 → Engine merge

**选择：** 简单加法合并（sum evidenceCount → ref_count），`subagent_all_failed` 布尔标志路由决策。

Prototype 阶段目标是验证管线结构，不是证据合并质量。`SlotResult` 保留了每个 slot 的 summary，后续可选地引入去重和交叉验证。

### 4. 跨 Agent 适配 → 文件系统 = 通用总线

**选择：** 不定义 Engine → Agent 的触发机制（轮询? IPC? 消息队列?）。测试中用 `slotExecutionSimulator()` mock Agent 行为。文件系统协议天然解耦，触发方式可以独立演进。

### 5. 失败处理 → 复用 convergeRepair

**选择：** 单 slot 失败非致命（部分结果仍可推进），全部失败路由到 `convergeRepair`。复用 gate-fork 的 stall 检测 + maxIterations 守卫，不引入新的修复机制。

---

## 实验范围（prototype 级别）

**Goals:**
- 3+ subagent 并行 dispatch（search ×2 + verify ×1）
- 文件系统协议（`_subagents/` 目录）
- Slot 生命周期状态机（`pending → running → done | failed`）
- 结果收集 + 合并 → re-enter Gate
- 失败处理：单 slot 非致命，全部失败走 convergeRepair
- 独立实验，命名对齐（`SubagentWorkflowState`、`subagentDispatch`、`collectResults`）

**Non-Goals:**
- 不实现真实 subagent 进程管理（Coding Agent 的事）
- 不追求生产级并发（实验用 mock）
- 不实现跨网络 dispatch（本地文件系统足够）
- 不提升到 DPT_FRAMEWORK 共享层（实验级别验证）
- 不定义 Agent 触发机制（轮询、IPC、消息队列留待后续）

---

## 实现思路（概要）

```javascript
// 管线: runSubagentWave
function runSubagentWave(state, baseDir) {
  // Phase 1: Gate fork — 决定走哪个分支
  const { branch } = forkRouter(state);

  // Phase 2: non-pass → converge repair
  if (branch !== 'pass') {
    return { finalState: convergeRepair(state).state };
  }

  // Phase 3: pass → dispatch N subagent slots
  const slots = subagentDispatch(state, baseDir);
  // → 写 dispatch.json + slot_NN/task.md + slot_NN/_status.json

  // Phase 4: Agent 执行 slots（测试中 mock）
  // → Agent 读 task.md → 搜索/验证 → 写 result.md + _status.json

  // Phase 5: 收集结果
  const results = collectResults(slots, baseDir);
  // → 读 _status.json 判断状态，读 result.md 解析 summary + evidenceCount

  // Phase 6: 合并到 WorkflowState
  const merged = mergeResults(results, state);
  // → 简单加法，设置 subagent_all_failed 标志

  // Phase 7: 失败处理
  if (merged.subagent_all_failed) {
    return { finalState: convergeRepair(merged).state };
  }

  // Phase 8: C&I → re-enter Gate
  const ci = checkAndReflect(merged, SubagentWorkflowState);
  return { finalState: merged, ci, slots };
}
```

---

## 参考来源

- Claude Code Subagents: A 2026 Practical Guide — [tembo.io](https://www.tembo.io/blog/claude-code-subagents)
- How and when to use subagents in Claude Code — [Anthropic official blog](https://claude.com/blog/subagents-in-claude-code) (2026-04-07)
- Codex vs Claude Code (June 2026): Subagents & Limits — [morphllm.com](https://www.morphllm.com/comparisons/codex-vs-claude-code)
- CodeDelegator: Mitigating Context Pollution via Role Separation — Tencent, 2025 ([arXiv](https://ar5iv.labs.arxiv.org/html/2601.14914))
- Subagents in Gemini CLI — [Google Developers Blog](https://developers.googleblog.com/subagents-have-arrived-in-gemini-cli) (2026-04)
- Context Engineering、Subagents与Harness的协同机制 — [百度开发者](https://developer.baidu.com/article/detail.html?id=7575885)
- AI Coding Agent 工程化：从上下文污染到多 Agent 分工 — [阿里云](https://developer.aliyun.com/article/1734306)
