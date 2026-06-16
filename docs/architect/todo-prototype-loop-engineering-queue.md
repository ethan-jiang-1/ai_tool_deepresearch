# TODO: Loop-Engineering Queue — Deep Research 的迭代推理引擎

> 状态: 待设计 | 优先级: 高 | 创建: 2026-06-16
> 参考: Addy Osmani "Loop Engineering" (2026-06), Boris Cherny (Claude Code lead)

## 问题：当前 queue 只是一张静态任务表

`rb_queue.json` 现在是：

```json
{
  "slots": [null, null, null, null, null],
  "producer_rule": "",
  "consumer_mode": "fifo"
}
```

这是 **Prompt Engineering 时代的队列** —— 一个待办清单。Agent 进来，拿一个 slot，执行，放回去。Engine 不参与"是否继续"、"是否重试"、"质量如何"的决策。

Loop Engineering 要的队列完全不同：

```
旧 Queue：静态任务表           新 Queue：自主迭代引擎
───────────────               ──────────────────────
人往 slot 填任务                Engine 自动发现和分配任务
Agent 执行一次                  Agent 迭代直到验证通过
人检查结果                     独立 Agent 验证结果
人决定下一步                    Gate + stop condition 决定
```

## Loop Engineering 的 5+1 模块 → 我们的 Queue 设计

Addy Osmani 提出的五个模块 + 记忆层，映射到 deep research：

```
Loop Engineering            Deep Research Queue
───────────────             ───────────────────
Automations（心跳）         Wave 调度器：Gate pass → 下一 wave 自动启动
Worktrees（隔离）           rb_queue slot 隔离：每个 slot = 独立工作目录
Skills（知识沉淀）           COMMANDS.md 和 AGENT_GUIDE.md（已有）
Plugins（连接器）           Search tool / WebFetch 工具接入
Sub-agents（生产者≠验证者） Producer slot vs Verifier slot（队列核心创新）
Memory（记忆脊椎）          rb_trace.jsonl + evidence ledger（跨迭代持久化）
```

## 核心设计：双层 Slot 架构

当前 queue 的 slot 只区分 `null`（空闲）和 `filled`（有任务）。新设计引入 **Slot 角色**：

```
┌─────────────────────────────────────────────────────────┐
│                    rb_queue.json                        │
│                                                         │
│  waves: [                                               │
│    {                                                    │
│      wave: 0,                                           │
│      gate: "wave0_complete",                            │
│      stop_condition: {                                  │  ← 新增
│        type: "all_slots_passed",                        │
│        max_iterations: 3,                               │
│        verifier: "wave0_audit"                          │
│      },                                                 │
│      slots: [                                           │
│        {                                                │
│          role: "producer",           ← 新增             │
│          key: "search_official",                        │
│          status: "pending",                             │
│          retry_count: 0,                                │
│          max_retries: 2,                                │
│          verification_slot: "verify_official"           │  ← 新增
│        },                                               │
│        {                                                │
│          role: "verifier",           ← 新增             │
│          key: "verify_official",                        │
│          status: "pending",                             │
│          depends_on: ["search_official"],               │  ← 新增
│          verdict: null              ← 新增              │
│        },                                               │
│        {                                                │
│          role: "producer",                              │
│          key: "search_academic",                        │
│          status: "pending",                             │
│          retry_count: 0,                                │
│          max_retries: 2,                                │
│          verification_slot: "verify_academic"           │
│        },                                               │
│        {                                                │
│          role: "verifier",                              │
│          key: "verify_academic",                        │
│          status: "pending",                             │
│          depends_on: ["search_academic"],               │
│          verdict: null                                  │
│        }                                                │
│      ]                                                  │
│    },                                                   │
│    {                                                    │
│      wave: 1,                                           │
│      gate: "wave1_complete",                            │
│      ...                                                │
│    }                                                    │
│  ]                                                      │
└─────────────────────────────────────────────────────────┘
```

### Slot 角色

| Role | 谁执行 | 做什么 | 产出 |
|------|--------|--------|------|
| `producer` | Agent（LLM） | 搜索、阅读、提取证据 | `artifacts/waveN/<key>.json` |
| `verifier` | Agent（不同 model/instruction） | 对照证据审计 producer 产出 | `verdict: pass \| fail \| needs_rework` |
| `synthesizer` | Agent | 合并多个 producer 的结果 | `artifacts/waveN/synthesis.md` |
| `repair` | Agent | 修复验证失败的 slot | 更新原 slot 的产出 |

**关键原则：producer 永远不验证自己的产出。** 这和 Osmani 的 "Maker vs Checker" 完全一致。

## 自主迭代循环

```
┌──────────────────────────────────────────────────────┐
│              Wave N 的 Loop Engineering               │
│                                                       │
│   1. Gate pass → Wave Scheduler 启动                  │
│                         │                             │
│                         ▼                             │
│   2. Dispatch: 所有 producer slot 转为 running        │
│                         │                             │
│         ┌───────────────┼───────────────┐            │
│         ▼               ▼               ▼            │
│    producer_1      producer_2      producer_3         │
│    (search)        (search)        (extract)          │
│         │               │               │             │
│         ▼               ▼               ▼             │
│    verifier_1      verifier_2      verifier_3         │
│    (audit)         (audit)         (cross-check)      │
│         │               │               │             │
│         └───────────────┼───────────────┘            │
│                         │                             │
│                         ▼                             │
│   3. Collect verdicts                                  │
│      ├── all pass → synthesizer → wave_complete       │
│      ├── some fail → repair slots → re-verify         │
│      └── all fail → escalate to convergeRepair        │
│                         │                             │
│                         ▼                             │
│   4. Stop condition check                              │
│      ├── met → advance to next wave                   │
│      ├── max_iterations exhausted → escalate          │
│      └── stalled (no progress) → escalate             │
│                                                       │
│   5. Memory: write evidence ledger entry               │
│      { wave, slot, verdict, source_tag, timestamp }    │
└──────────────────────────────────────────────────────┘
```

## 跨 Agent 执行协议

与 `prototype-subagent` 的文件系统协议互补。Queue 定义 **谁做什么、依赖谁、怎样算通过**，Subagent 协议定义 **怎么执行**。

```
Queue（本设计）                  Subagent（prototype-subagent）
─────────────                    ────────────────────────────
定义 slot DAG                    定义单 slot 执行协议
producer → verifier 依赖         文件系统 task.md / result.md
stop condition 何时满足           跨 Claude Code / Codex 适配
retry / escalate 策略             结果格式规范
evidence ledger 持久化            执行状态 status.json
```

## 记忆层：Evidence Ledger

Loop Engineering 强调 **Memory 必须在磁盘上，不在上下文里**。当前 `rb_trace.jsonl` 是事件流。新设计增加 `rb_ledger.jsonl`：

```jsonl
{"ts":"...","wave":0,"slot":"search_official","role":"producer","action":"produced","claims":12,"sources":["url1","url2"]}
{"ts":"...","wave":0,"slot":"verify_official","role":"verifier","action":"verified","verdict":"pass","claims_verified":10,"claims_rejected":2}
{"ts":"...","wave":0,"slot":"search_official_retry","role":"producer","action":"repaired","claims_added":2}
{"ts":"...","wave":0,"slot":"verify_official","role":"verifier","action":"re_verified","verdict":"pass","claims_verified":12}
{"ts":"...","wave":0,"action":"wave_complete","total_claims":12,"verified_claims":12,"iterations":2}
```

每条记录带 source tag：
- `[PRODUCED]` — Agent 产出
- `[VERIFIED]` — Verifier 确认
- `[REJECTED]` — Verifier 驳回，附原因
- `[REPAIRED]` — 修复后重新产出
- `[INFERRED]` — Agent 推断，未经外部验证

这解决了 Osmani 警告的 **"Loop 完成了 ≠ 做对了"** 问题 —— ledger 是 traceable proof。

## 与现有 Gate 体系的集成

三个 prototype + loop-engineering queue 形成完整系统：

```
evaluateBranch(state)
       │
       ▼
  forkRouter ─→ pass ─→ Queue.wave[0].start()
       │                   │
       │                   ├── producer slots dispatch
       │                   ├── verifier slots audit
       │                   ├── collect verdicts
       │                   ├── stop condition check
       │                   └── evidence ledger commit
       │                        │
       ├── fail_a/b ─→ convergeRepair ─→ re-evaluate
       │                        │
       └── blocked ─→ HITL     ▼
                          escalate / retry
```

- `gate-loop`：修得对
- `gate-fork`：走得对
- `subagent`：做得广（并行执行）
- `loop-engineering-queue`：**做得深**（迭代到确实通过为止）

## 关键设计决策（待讨论）

### 1. Verifier 是否需要不同模型？

Osmani 强调 Maker ≠ Checker，sub-agent 应使用不同模型或不同 instruction。

对于 deep research：
- **Producer**（搜索/提取）：用大模型（Claude Opus），需要理解和综合能力
- **Verifier**（审计证据）：可以用不同 prompt/instruction，也可以用小模型（Haiku）只做 fact-check

**待定：** prototype 阶段是否引入多模型？目前实验环境只有 2 个 npm dep，不便引入模型路由。

**建议：** prototype 用不同 instruction/prompt（同一模型），在 design.md 标注"生产环境应切换独立模型"。

### 2. Stop condition 的表达力

简单 stop condition：`all_slots_passed` + `max_iterations`。但真实 deep research 可能有更复杂的条件：

- "至少 3 个 independent source 确认同一个 claim" 
- "cross-reference 覆盖率 > 70%"
- "没有新的矛盾发现"

**建议：** prototype 先用简单条件。复杂条件需要 Engine 支持可配置的 predicate 语言——这是后续实验。

### 3. 队列优先级重排

Loop 执行中可能发现"这个 topic 不值得深挖"或"这里出问题了应该优先修"。队列需要支持运行时重排。

**建议：** 在 slot 加 `priority` 字段 + `reprioritize(reason)` 方法。prototype 可以先不实现运行时重排，但 schema 预留字段。

### 4. 跨 Wave 记忆传递

Wave 0 的搜索结果如何影响 Wave 1 的搜索策略？
- A) Agent 自己读上一 wave 的 evidence → 自己决定（Agent 管内容）
- B) Engine 分析 evidence → 自动调整 Wave 1 的 slot（Engine 管规则）

**建议：** A。与"Engine 管规则，Agent 管内容"原则一致。Engine 确保 evidence 存在且格式正确，Agent 决定搜索策略。

## 风险

- **[Risk] 双层 Slot 增加了复杂度** → Mitigation: 单独 prototype 验证，不修改现有 rb_queue.json
- **[Risk] Verifier 假阳性** → Mitigation: verifier 的 verdict 入 ledger，traceable。若 verifier 漏过错误 claim，后续 wave 或 final audit 应能发现
- **[Risk] Loop 无限迭代** → Mitigation: 复用 gate-loop/ fork 的 stall detection + maxIterations 双重保护
- **[Risk] Comprehension Debt（理解负债）** → Mitigation: evidence ledger 提供每个 claim 的来源追溯，不靠"Agent 的记忆"

## 下一步

1. OpenSpec explore: 细化 slot schema、stop condition 类型、verification protocol
2. `/opsx:propose prototype-loop-engineering-queue` — 出 proposal + design + specs + tasks
3. 实现 `experiments/prototype-loop-engineering-queue/`
4. 四个 prototype 集成 review：loop + fork + subagent + loop-engineering-queue

## 参考来源

- Addy Osmani, "Loop Engineering" (2026-06) — 5 模块 + 记忆层框架 [link](https://addyosmani.com/blog/loop-engineering/)
- Boris Cherny, Acquired Unplugged 发言 (2026-06) — "I don't prompt Claude anymore. My job is to write loops."
- "一文读懂Loop Engineering：6大板块和三个大坑" — 智东西 (2026-06) [link](https://zhidx.com/p/565982.html)
- Zenodo paper: "When the Loop Forgets the Why" — recursive drift + continuity architecture [link](https://zenodo.org/records/20621972)
- LangChain blog: "The Agent Improvement Loop Starts with a Trace" (2026-03) [link](https://www.langchain.com/blog/traces-start-agent-improvement-loop)
- ultragoal: Goal-driven loop with independent verification [link](https://github.com/morphaxl/ultragoal)
