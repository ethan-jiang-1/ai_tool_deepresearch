# Agentic Queue 落地分析 — Loop Engineering

> 2026-06-23 | 本文件是 `_backlog/` 下的分析文档，不是 spec、不是运行时真相。
> 目的：为"把 Agentic Queue (AGQ) 接入 workflow loop"这件事定调，让人和 LLM 用同一把尺子决策。
> 如果要把它变成行为规约，必须走 OpenSpec proposal → spec → tasks → 实现 → 归档。

---

## 0. 给首次读者的背景

> **如果你是第一次读这份文档的 Agent（人或 LLM），先读这一节。**
> 它解释这个项目是什么、这份文档在解决什么问题、所有结论的信源在哪里。

### 0.1 这个项目是什么

这是 **Deep Research Tool rewrite**：一个 agentic framework，用于产出证据支撑、多阶段、多 checkpoint 的深度研究报告。

它的核心架构原则是**四层分工**（详见 `guidelines/project-charter.md`）：

| 层 | 是什么 | 做什么 | 不做什么 |
|----|--------|--------|----------|
| **Agent (LLM)** | 能力源 | 搜索、阅读、提取证据、写作、综合、做内容判断 | 确定性状态权威、receipt 权威、schema 真相 |
| **Markdown** | Agent Flow controller | 给 LLM 任务、阶段、约束、上下文、反馈入口 | 机器可验证真相、状态转换/receipt/trace 权威 |
| **JS/CLI/Engine** | 确定性 checkpoint | schema 校验、状态转换、receipt 检查、trace 写入 | 多阶段 Agent Flow 编排、语义理解、内容判断 |
| **JSON/YAML/JSONL** | 持久化状态 | 保存 runtime state、证据、receipt、trace，让上下文可重载 | Agent 的语义推理 |

一句话总纲：**Markdown controls Agent Flow; JS/CLI controls deterministic checkpoints. LLM supplies judgment. Engine enforces deterministic contracts.**

这个项目用 **spec-driven development**：所有能力、行为、schema、状态机迭代都必须遵循 OpenSpec（先 proposal/spec/tasks，再实现、验证、归档）。`guidelines/` 只能解释和指路，不能绕过 OpenSpec 直接定义新行为。

### 0.2 这份文档解决什么问题

系统里有一个 **Agentic Queue (AGQ)**——一个 JS 任务队列引擎。它的设计目标是：**给 Agent 一个动态 todo list，让它完成一件领下一件，中间不需要停下来问"下一步做什么"。**

这套队列的底层引擎（enqueue / claim / complete / fail / preempt / render）**已经实现并通过实验验证**（AGQ-001~006 已 accepted）。但问题是：

> **queue engine 存在，但没有被 workflow 使用。** 没有一个 workflow phase 实际调用它。

这份文档分析的就是：**怎么把 queue 接入 workflow loop？接入时必须遵守什么规则？哪些是已经确定的定调，哪些是开放问题？**

文档分三层：
- **§1–§4**：事实陈述（V12 做了什么、当前已落地什么、还缺什么、gap 在哪）——基于代码和 spec 的核查，不是推测。
- **§5**：**定调**（两层 loop + 谁验证谁派发）——这是整个文档的地基，也是最重要的部分。如果人和 LLM 对同一个场景得不出同一个结论，就是这里的规则没定死。
- **§6–§9**：落地建议、派生约束、开放问题、结论——都在 §5 定调的框架内。

> 注：本分析中的宪法原则（两层 loop、派发规则、结构约束）已提取为 `guidelines/agentic-queue-mechanism.md`（status: effective）。那份 guideline 是权威原则陈述；本文档是详细应用分析——含 scenario 枚举、实施路径和具体模板。

### 0.3 关键术语

| 术语 | 含义 |
|------|------|
| **Agentic Queue / AGQ / Q** | Engine-side 任务队列系统。Agent 从队列领任务 (claim)、执行、完成 (complete)、领下一个——在 phase 内部形成执行循环。 |
| **phase node** | 一个 workflow 阶段的 Markdown controller 文件，如 `phase-wave0.md`。它告诉 Agent 这一步的目标、允许动作、gate 命令。 |
| **gate** | phase 级的确定性 checkpoint。Gate CLI 检查整个 phase 的产出是否完整（文件存在、schema 通过、trace event 已写）。 |
| **chain** | `transitions.chain.json`——纯静态路由表。给定当前 node + gate outcome，返回下一个 node。只有 `passed` 边。 |
| **receipt** | task 完成后须满足的确定性条件（如 "file:reference/<topic>/source.yaml"）。`checkReceipts()` 支持 6 种前缀 (file/json/queue/slot/trace/none)，fail-closed。 |
| **task card** | 队列里一个任务单元。包含 work_id、action、target (main-agent/sub-agent)、required_receipts、done_condition、verification 等。 |
| **bundle** | 一次 run 的 runtime context。Production run = `dpt_rb_<name>/`，disposable experiment = `dpt_disp_<name>/`。包含 rb_status.json、rb_trace.jsonl、rb_queue.agq.json 等。 |
| **灌料 / filling** | phase 开始时往队列里灌入 task card 的过程。当前是 Agent 根据 MD 模板手写 task.json 再 enqueue。 |
| **回填 / backfill** | task 或 wave 完成后，将产出（ref 摘要、机制理解、判断）写回 seed_topics/{slug}.md 的 `__BACKFILL_*__` token 位置。**灌料是往 queue 里填任务，回填是往 seed topic 文件里填结果——两者方向相反，不可混用。** |
| **stop authorization** | "Agent 现在能不能停"的判定。`stop_authorization_state` 有四个值：`unauthorized_continue_required`（默认）、`final_delivery`、`decision_blocker`、`empty_queue_after_refill`。 |
| **V12** | 这个项目的前一个版本原型，存放在 `_original_dpt_v12/`（尤其 `DEEP_RESEARCH_TEMPLATE_V12/flows/queue-agentic-flow.md` 是 V12 的 queue loop 定义）。它把 queue 管理全做在手写 Markdown 里，失败教训详见 §1。注意：按 AGENTS.md 规矩，`_original_*` 归档不读除非用户明确要求分析历史版本。 |

### 0.4 信源——这份文档的事实从哪来

本文档的所有"已实现/已 accepted"声明都经过代码核查（不是推测）：

| 信源文件 | 在本文档中的作用 | 核查了什么 |
|---------|----------------|-----------|
| `DPT_FRAMEWORK/engine/queue-manager.mjs` (619 行) | §2.1 的 engine 操作表、§7.1 的 `createQueue()`/`claim()` 行为、§7.2 的 `stop_authorization_state` 逻辑 | 读了 `claim()` 函数体、`createQueue()`、`StopAuthorizationState` enum、`QUEUE` 常量 |
| `DPT_FRAMEWORK/cli/operate-queue.mjs` (102 行) | §2.2 的 CLI 子命令表 | 通读全文，确认 7 个子命令 + CLI flags |
| `openspec/specs/agentic-queue/spec.md` + `openspec/governance/req-registry.yaml` | §2.3 的 spec 状态 | 确认 AGQ-001~006 全部 accepted |
| `experiments_playbook/exp_agentic-queue/` | §2.4 的 playbook 表 | 确认 3 个 playbook 文件存在 |
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-*.md` | §3、§5.5 的 phase 判定 | 通读全文——seed-topics 和 wave0 **已引用 operate-queue**（queue-driven 三阶段），wave1 仍为自由文本，wave2 为合成指令 |
| `DPT_FRAMEWORK/workflows/transitions.chain.json` | §5.1、§5.3 规则 4 | 确认只有 `passed` 边，无 fail/repair 分支 |
| `guidelines/agentic-workflow-mechanism.md` (effective) | §5.1 的外层 loop 描述 | 通读全文——这是已生效的 loop 机制规约 |
| `guidelines/project-charter.md` (effective) | §5.3 规则 3 的 MUST NOT 第一条、§7.2 的 stop authorization 讨论 | 通读全文——这是 repo-wide charter |
| `DPT_FRAMEWORK/workflows/nodes/shared/shared-repair-guidance.md` | §5.3 规则 3 的 gate-repair 机制 | 通读全文——retry 3 次、escalation 规则 |

### 0.5 这份文档的边界

**这份文档能做的：**
- 分析 queue 接入 workflow 的定调和规则
- 指出当前 gap 和待解问题
- 给出落地建议的优先级

**这份文档不能做的：**
- 定义新行为——那必须走 OpenSpec
- 声称 loop engineering 已实现——它还没有
- 替代 `guidelines/agentic-workflow-mechanism.md`（已生效的 loop 描述）或 `openspec/specs/agentic-queue/spec.md`（已接受的 spec）

---

## 一句话

给 Agent 一个动态 todo list (queue)，让它完成一件领下一件，中间不需要停下来问"下一步做什么"——这就是 loop engineering：**用 queue 制造持续执行的压力，实现长程自主静默。**

---

## 1. V12 做了什么、做错了什么

V12 的 `queue-agentic-flow.md` (~400 行 Markdown) 定义了完整的 queue-driven execution loop：

- reload → receipt preflight → select slot_1 → execute → verify → refill/promote → render → repeat
- 7 个 boundary hooks（wave 之间的过渡检查点）
- 3 个 stop authorization states
- "autonomous execution batch" 概念

**方向是对的**，但致命问题：

| V12 的问题 | 现在怎么解决的 |
|-----------|-------------|
| Queue 状态是巨大的手写 Markdown 文件 | ✅ `rb_queue.agq.json` — Zod-validated JSON, JS engine 管理 |
| Gate transition 依赖 "Agent self-discipline" | ✅ Gate CLI 强制检查，chain 查询路由，不可绕过 |
| Hook 规则分散在多个 Markdown 文件里 | ✅ 集中到 gate definition JSON + queue manager receipt check |
| Receipt 检查靠 Agent 自觉 | ✅ `checkReceipts()` 支持 6 种前缀 (file/json/queue/slot/trace/none)，fail-closed |
| 没有可复现的实验验证 | ✅ 3 个 agentic-queue playbook (simple/medium/complex)，trace-backed verdict |
| 没有 schema 约束 | ✅ QueueStateSchema + QueueItemSchema，Zod validated |

核心教训跟 project charter 一致：**Markdown controls Agent Flow; JS owns deterministic checkpoints.**

> **V12 不只是教训。** V12 在 evidence 质量模型（30+字段的 tier/trust/commercial_intent/cross_verification）、不确定性管理（四区 question ledger + Emergent Question Protocol）、source-intake cache boundary（staging→review→promote）、Anti-Stall Budget 等方面有深度设计，我们的 foundation 阶段尚未覆盖。详见 §6.2c——这些不是 V12 的问题，是 V12 的优势，应该在后续 change 中继承。

---

## 2. 当前已落地了什么

### 2.1 Engine 层 — `DPT_FRAMEWORK/engine/queue-manager.mjs` (619 行)

完整的 JS engine：

| 操作 | 状态 | 说明 |
|------|------|------|
| `createQueue()` | ✅ | 空队列，5 slot null |
| `loadQueue(dir)` | ✅ | 从 bundle 加载，无文件时自动创建 |
| `saveQueue(dir)` | ✅ | 持久化 JSON，先 validate 再写 |
| `enqueue(item)` | ✅ | 先填 slot，slot 满进 refill pool |
| `claim()` | ✅ | 只暴露 slot_1_current，标记 running |
| `complete(result)` | ✅ | receipt 校验 → promote → refill → render |
| `fail(failure)` | ✅ | 记录 fail → 创建 repair item → promote → preempt repair |
| `preempt(item)` | ✅ | 插入 slot_2（默认）或 slot_1（unsafeCurrent） |
| `inspect()` | ✅ | queue health + receipt check，返回 C&I feedback |
| `render()` | ✅ | 生成 `_cache/agentic-queue/current-task.md` 投影 |
| `checkReceipts()` | ✅ | 6 种前缀，fail-closed |
| `makeItem()` | ✅ | QueueItem factory，全字段默认值 |

**QueueItemSchema 的字段**：`work_id`, `title`, `target`, `action`, `producer_rule`, `lineage`, `priority_class`, `required_receipts`, `done_condition`, `verification` (engine/agent split), `writes_to`, `status_sync`, `completion_receipt`, `failure_route`, `status`, `payload`

### 2.2 CLI 层 — `DPT_FRAMEWORK/cli/operate-queue.mjs` (102 行)

7 个子命令：`check`, `enqueue`, `claim`, `complete`, `fail`, `preempt`, `render`

所有参数通过 CLI flags 传递 (`--task`, `--result`, `--failure`, `--actor`, `--reason`, `--unsafe-current`)。

### 2.3 Spec 层 — `openspec/specs/agentic-queue/spec.md`

- AGQ-001 ~ AGQ-006 全部 accepted
- Queue state schema, enqueue/claim/complete/fail/preempt/receipt/render 都有规约
- 3 个 experiment playbook 已通过

### 2.4 实验验证 — `experiments_playbook/exp_agentic-queue/`（底层 engine）

| Playbook | 验证内容 | 状态 |
|----------|---------|------|
| `test-simple-minimal-path.md` | enqueue → claim → complete → promotion → projection | ✅ |
| `test-medium-urgent-preemption.md` | full-window preemption, displaced tail, restore, refill | ✅ |
| `test-complex-failure-repair.md` | invalid task rejection, missing receipt blocking, unsafe-current guard, empty queue handling | ✅ |

### 2.5 实验验证 — `experiments_playbook/exp_wfn_*/`（phase 级 queue-loop 集成，按 phase 分目录）

**目录结构已重组：** `exp_agentic-queue-loop/` → `exp_wfn_seedtopic/` + `exp_wfn_wave0/` + `exp_wfn_wave1/`

| Playbook | 验证内容 | 状态 |
|----------|---------|------|
| `exp_wfn_seedtopic/test-simple-seedtopics-queue-loop.md` | seed topics queue-driven 物化：enqueue→claim→main-agent 执行→complete→gate pass | ✅ |
| `exp_wfn_wave0/test-heavy-wave0-happy-path.md` | seed_topics→wave0 queue-loop→dpt-source-intake sub-agent 真实搜索→backfill→gate pass 全链路 | ✅ retrofitted（target→targets） |
| `exp_wfn_wave0/test-heavy-wave0-gate-fail-repair.md` | gate fail（count_floor 检测缺失 source.yaml）→repair→gate pass，trace 含 fail+pass 两条 gate_attempt | ✅ retrofitted |
| `exp_wfn_wave1/test-heavy-wave1-batch-subagent.md` | 2-topic wave1 deepening：enqueue→relay 并行 spawn dpt-evidence-extractor→collect-as-return→backfill→gate pass | ✅ 新 |
| `exp_wfn_wave1/test-heavy-wave1-gate-fail-repair.md` | gate fail（缺失 evidence-summary + question-list）→repair→gate pass，trace 含 2 条 gate_attempt | ✅ 新 |
| `exp_wfn_wave1/test-heavy-wave1-subagent-failure.md` | WebFetch blocked→完整降级链（WebFetch→curl→node→python3）→partial evidence 不编造→gate 仍 pass | ✅ 新 |

### 2.6 已接入 queue 的 phase node MD（sub-agent 拆分后的结构）

每个使用 sub-agent 的 phase 拆成 main-agent 和 sub-agent 两个文件：`phase-{wave}.md` + `phase-{wave}-subagent.md`。共享 relay 基础设施在 `shared-subagent-protocol.md`。

| Phase | Queue-driven？ | Sub-agent role | 产出 | Backfill tokens | 状态 |
|-------|---------------|----------------|------|-----------------|------|
| `phase-seed-topics.md` | ✅ | 无（main-agent 直接写） | `seed_topics/{slug}.md` | 无（预埋 token 由后续 wave 回填） | ✅ |
| `phase-wave0.md` + `phase-wave0-subagent.md` | ✅ | `dpt-source-intake` | `reference/{slug}/source.yaml` | `__BACKFILL_WAVE0_EVIDENCE__` | ✅ |
| `phase-wave1.md` + `phase-wave1-subagent.md` | ✅ | `dpt-evidence-extractor` | `evidence-summary.md` + `question-list.md`（paired） | `__BACKFILL_WAVE1_MECHANISMS__`、`__BACKFILL_WAVE1_TRENDS__`、`__BACKFILL_PENDING_QUESTIONS__` | ✅ |
| `phase-wave2.md` + `phase-wave2-subagent.md` | 🔮 待设计 | `dpt-synthesis-reviewer`（暂定） | `synthesis.md`（暂定） | `__BACKFILL_WAVE2_JUDGMENT__` | 🔮 |

---

## 3. 还缺什么

| 缺的 | 当前状态 | 差距 |
|------|---------|------|
| ~~queue 接入 workflow loop~~ | ✅ **已完成**：seed-topics + wave0 两个 phase 已实现 queue-driven 三阶段（灌料→执行循环→收尾+gate），含 task card JSON 模板、inline backfill、3 个 playbook 验证 | — |
| "stop authorization" 强制执行 | stop_authorization_state 字段存在但 Agent 停不停靠自觉 | Engine 侧强制执行（让 gate CLI 或 complete() 读取并顶回非法停机）；MD 指令不够——见 §7.2 |
| producer rules enum 标准化 | 三个新的 producer_rule 值已投入使用（`seed_topic_materialize`、`source_intake_fan_in`、`backfill_wave0_evidence`）。AGQ-007~010 已在 OpenSpec 注册（`req-registry.yaml`）但 enum 尚未收敛为单一 `ProducerRule` zod type | 后续 change 中逐步收敛 |
| ~~灌料机制~~ | ✅ **已落地**：两个 phase 都有 task card JSON 模板，Agent 从 topic_registry 派生 task 并 enqueue | minor：批量 enqueue 仍是手写模板+CLI，未做 JS helper（`deriveTasks`） |
| ~~上下文隔离~~ | ⚠️ **MD 约定但未强制执行**：phase-wave0.md 要求 sub-agent 输出写入 `_cache/wave0/search-results/`、main-agent 只读投影。但实际执行时 main-agent 自己做了 WebSearch（噪声直接进主上下文），没有真正 spawn sub-agent 来隔离。上下文隔离靠 Agent 自律，不是 engine 强制。 | 需要真正走 sub-agent dispatch——见新增 gap「sub-agent dispatch 未实现」 |
| ~~wave1 queue 接入 + sub-agent dispatch~~ | ✅ **已完成**：wave1 完整重写为 queue-driven 三阶段 + relay 批量 sub-agent 并行执行。`target` → `targets` 一次性 breaking change，wave0/wave1 全部适配。每个 phase 的 main-agent 和 sub-agent 指令拆成独立文件（`phase-{wave}.md` + `phase-{wave}-subagent.md`）。shared 文件只保留 relay 基础设施 | — |
| **wave2 queue 接入 + sub-agent dispatch** | 🔮 phase-wave2.md 目前是 foundation placeholder，wave2 的 cross-topic synthesis + gap-fill 未实现 | **Change 3**（待设计）。详细分析见 §4.1 |
| gate + queue 联合操作 | Gate CLI 和 Queue CLI 是分开的 | 不是必须——Agent 可以自己协调，先跑 gate 再跑 queue |

**以下不是当前优先级：**
- `rb_ledger.jsonl` — claim provenance 账本，v1 不需要
- "boundary hooks catalog" — V12 遗留概念，chain + gate 已经覆盖了 wave 间过渡

---

## 4. wave2 sub-agent dispatch：待设计方向

### 4.1 wave2 跟 wave0/wave1 的本质差异

wave0 和 wave1 都是 **per-topic fan-out** 模式：

| | wave0 | wave1 |
|---|-------|-------|
| sub-agent role | `dpt-source-intake` | `dpt-evidence-extractor` |
| 搜索模式 | 每个 topic 独立搜 foundation reference | 每个 topic 独立做 deepening |
| 产出 | 每 topic 一个 `source.yaml` | 每 topic 两个文件：`evidence-summary.md` + `question-list.md` |
| 并发 | 多个 sub-agent 并行，互不依赖 | 同左 |
| backfill | 1 个 token（`__BACKFILL_WAVE0_EVIDENCE__`） | 3 个 token（mechanisms, trends, questions） |

但 wave2 的核心任务可能是 **cross-topic synthesis**——不是"每个 topic 再搜一轮"，而是"把 wave0 + wave1 的所有 topic 的 evidence 拉通看，找出跨 topic 的 pattern、矛盾、gap，产出一个综合判断"。

这意味着 wave2 sub-agent 的输入不再是"一个 seed topic 的 search_guardrails"，而是"所有 topic 的 evidence-summary + question-list"。这跟 wave0/wave1 有本质不同：

- **fan-in vs fan-out**：wave0/wave1 是 fan-out（并行搜多个 topic），wave2 可能需要 fan-in（多个 topic 产出汇聚到一个 synthesis agent）
- **search vs review**：wave0/wave1 的核心动作是 WebSearch+WebFetch，wave2 的核心动作可能是 read+compare+synthesize，search 只是 gap-fill 的辅助手段
- **bounded context 更大**：sub-agent 需要看到多个 topic 的产出才能做综合——relay slot 的 bounded context 模型可能需要放宽

### 4.2 待讨论的开放问题

1. **wave2 应该是 synthesis reviewer 还是 gap-fill hunter 还是两个都有？**  
   - synthesis reviewer：读所有 topic 的 evidence-summary + question-list，产出跨 topic 综合判断（contradictions, patterns, confidence levels），main-agent 回填 `__BACKFILL_WAVE2_JUDGMENT__`
   - gap-fill hunter：从所有 topic 的 question-list 中识别"missing_information_gap"信号，定向搜索填补
   - 可能两个都需要是一个 phase 内的两个 task 类型，也可能合成一个 role

2. **是否需要新的 DPT role？** wave0 用 `dpt-source-intake`，wave1 用 `dpt-evidence-extractor`，现有的 `dpt-synthesis-reviewer` 和 `dpt-topic-scout` 哪个适合 wave2？

3. **是否需要改变 relay 的 bounded context 模型？** 如果 synthesis 需要读多个 topic 的产出，sub-agent 可能需要比"一个 slot 的 task.md + result.schema.json"更多的上下文。这可能意味着 synthesis 更适合由 main-agent 自己做，sub-agent 只做 gap-fill search

4. **并发策略是否需要不同？** wave0/wave1 的 MAX_CONCURRENT_SUBAGENTS=4（per-topic parallel），wave2 synthesis 可能是单 agent（串行综合）或 `max_concurrent_override=-1`（全量 gap-fill 并行）

### 4.3 参考 V12

V12 wave2 的 Future Expansion 提到了"cross-topic synthesis"和"fan-in review"但未具体设计。wave1 的四节 question-list（Targets → Reconciliation → Emergence → Decision）天然为 wave2 提供了"每个 topic 还有什么 unresolved"的输入——wave2 synthesis agent 可以从所有 topic 的 question-list 中提取跨 topic pattern。

**待切磋。** 上述方向需要在 Change 3 设计阶段深入讨论后确定。
      → claim task → 执行 task → complete task (receipt check + promote + render)
      → 读下一个 task card → claim → 执行 → complete → ...
      → queue 空 + gate 过 → chain 回答 next phase → 循环
```

**queue 是 phase 内部的执行引擎，chain 是 phase 之间的路由引擎。** 两者不冲突——queue 解决"一个 phase 里有很多子任务怎么做"，chain 解决"做完这个 phase 下一个是谁"。

---

## 5. 定调：两层 loop + 谁验证谁派发

> 这是整个落地分析的**地基**。后面的落地建议（§6）、派生约束（§7）、开放问题（§8）都从这里推导。
> 如果人和 LLM 对同一个场景得不出同一个结论，就是这里的规则没定死。

### 5.1 两层嵌套 loop，不是一个 loop

agent loop 不是一个循环，是**两层嵌套**：

```
外层（phase 间，已实现）：
  读 MD node → 执行 → 跑 gate → chain 查 next → 加载下一个 MD node → 循环
  权威 = gate + transitions.chain.json

  └ 内层（phase 内，已部分落地 — seed-topics + wave0）：
      claim → 执行 task → complete (receipt check + promote + refill)
      → 读下一个 task card → claim → 执行 → complete → ... → queue 空
      权威 = rb_queue.agq.json + queue-manager.mjs
      ⚠️ sub-agent dispatch 未实现（main-agent 自己做搜索），待 Change 2
```

**外层不进 Q。** 外层解决的是"做完这个 phase，下一个 phase 是谁"——一个确定性的、单步的、静态路由。内层解决的是"一个 phase 里有十几个子任务，怎么一个个做完不停下来问"。

这就是你感觉到的"dynamic workflow 的东西也漏进 loop、不走 Q"——那不是 bug，是 feature。那是外层 loop，验证者是 gate，本就不归 Q。V12 的教训之一就是把这两层混成了一个巨型队列。

### 5.2 核心规则：谁检查 receipt，谁派发这份工作

面对任何一份工作，人和 LLM 只需要问**同一个问题**：

> **这份工作的完成，由谁验证？**

三条判定，每份工作恰好命中一条：

| 验证者 | 走哪条路 | 例子 |
|--------|---------|------|
| 任务级 receipt（单个产出文件 + schema） | **走 Q**：enqueue → claim → complete | wave0 里为一个 topic 搜 source 并写 source.yaml |
| phase 级 gate（整个 phase 的完整性 + trace + status） | **走 gate + chain，不进 Q** | wave0 gate 查所有 topic 的 reference 是否到位 |
| 人工 checkpoint 或单步 phase | **无 Q，直接做** | HITL1 等用户回答、instantiation 建 bundle |

"所有进 agent loop 的都该走 Q"是**错的**——因为 phase 间推进的验证者是 gate，不是 Q。Q 只在"验证者是任务 receipt"时才有权。

### 5.3 结构四规则

**规则 1：两层不混。** 外层 = phase 间（gate → chain → 下一 node），内层 = phase 内（claim → 执行 → complete）。外层永远不进 Q，内层永远不碰 chain。

**规则 2：Q 的生命周期收敛在单个 phase。** phase 进来时灌料（§7.1），gate 跑之前清空。一个 task 不跨 phase 结束——它的 receipt 在当前 phase 过了就算完成；它的影响通过 artifact（reference / skeleton / evidence）流到后面 phase，但 task 本身不越过 gate。如果"下一个 phase"才发现它不够，那是 gate fail 或 escalate，不是"task 跨 phase 延续"。

**规则 3：两条 repair 各归一层，不交叉。**

- **Q-repair**（phase 内、task 级）：`complete()` receipt 一挂 → `makeRepairItem` 自动生成 repair task → `preempt` 塞进 slot_2。确定性、自动、留在 phase 内。
- **Gate-repair**（phase 间、phase 级）：gate fail → MD 的 "On Gate Fail" + `shared-repair-guidance` 接管 → retry 3 次封顶。语义判断、Agent 主导。

两者**唯一的接触点**是 scenario 6（见下表）：Q 已空但 gate fail。此刻 gate 是唯一权威——Agent 可以顺手拿 Q 当工具补一个 task，但权威不转移给 Q。

**规则 4：不能回退 phase。** chain 只有 `passed` 边（`transitions.chain.json` 现状）。后面 phase 发现前面 phase 的 gap → escalate（`rb_status.json` → blocked），而不是 Q 往回捅一个 task。这条专门防 V12 那种"什么都能塞进队列、队列还能跨边界"的糊。

**设计原则（从 project charter 继承）：**

- **Queue 不驱动 Agent** — Agent 驱动自己，queue 只是它的 todo list
- **Queue 不代替 Agent 做判断** — receipt check 是确定性的，内容判断归 Agent
- **Markdown projection 是视图不是权威** — `rb_queue.agq.json` 是 Source of Record
- **fail-closed** — receipt 缺失时阻塞

### 5.4 scenario 全过一遍——证明每条只有一个答案

| # | 场景 | 谁验证？ | 走 Q？ | repair 归谁 |
|---|------|---------|--------|------------|
| 1 | gate pass → chain → 下个 node | gate | 否 | — |
| 2 | gate **fail**，rerun same gate | gate | 否 | gate-repair（MD 驱动，retry 3 次） |
| 3 | phase 内：task card → claim → complete | 任务 receipt | **是** | Q 内部（promote + refill） |
| 4 | complete 时 receipt fail | 任务 receipt | **是** | Q-repair（`makeRepairItem` + `preempt`） |
| 5 | Agent 显式 fail 一个 task | 任务 receipt | **是** | Q-repair |
| 6 | **Q 空 + gate fail** | gate | Q 已无权威 | gate-repair（可选地重灌 Q，但权威在 gate） |
| 7 | 连续 gate fail 3 次 | gate | 否 | escalation → blocked |
| 8 | 中途插紧急工作（用户要求 / HITL 新增） | 若有任务级 receipt | 看 §5.2 | 有 receipt → Q；无 → 直接当上下文 |

**scenario 6 是两层唯一的接触点**，也是最该想清楚的：Q 的 receipt check 是 phase gate check 的**严格子集**——Q 查"这一个 task 的产出文件在不在、过不过 schema"，gate 查"整个 phase 的完整性 + trace event + status drift"。一个 task receipt 过了 ≠ phase 过了。这是对的，不是 bug。

### 5.5 哪些 phase 根本不需要 Q

不是所有 phase 都要 Q。判定仍然用 §5.2 那一问——看验证者：

| Phase | 验证者 | 需要 Q？ |
|-------|--------|---------|
| instantiation | bundle 结构 gate | 否（单步） |
| HITL1 / HITL2 | 人工 checkpoint | 否（等人） |
| setup | profile/status gate | 否（单步） |
| seed-topics | seed gate + 多 topic | **是**（已 queue-driven） |
| wave0 / wave1 | phase gate + 多 topic × 多子任务 | **是**（Q 发挥价值的地方） |
| wave2 | phase gate + synthesis + 多 topic backfill | **是**（synthesis 本体 1 task + backfill N tasks） |
| readiness | readiness gate | 否（单步） |
| final | final gate | 否（单步） |

phase MD 自己决定开不开 Q——这是 controller 的权利。

---

## 6. 落地建议

### 6.1 已选的路径：MD 驱动集成（Path A）+ 必要时改 schema（Path B 元素）

Change 1（seed-topics+wave0）走了纯 Path A——只改 MD，零新 JS 代码。Change 2（wave1+sub-agent dispatch）需要走混合路径——`target`→`targets` 是 breaking schema change，必须改 schema+engine+MD+playbook（~12 文件），但核心仍以 MD 驱动为主（`subagent-relay.mjs` 不改，Agent 工具本身支持 spawn sub-agent）。

**我们不追求纯 Path A 或纯 Path B——每 change 按实际需要选择深度。** 原则是：能不改 JS engine 就先用 MD 驱动（快速验证形状），需要 engine 强制执行时才改 JS（不为了"完整"提前过度工程化）。stop authorization 强制执行（§7.2）和 error recovery（§7.4）是长期需要 engine 侧解决的，但不阻塞当前 change 推进。

### 6.2 推进顺序

### 6.2a OpenSpec 落地：4 个 Changes（wfq-*），步步为营

以上 Phase 1-4 映射为 4 个 OpenSpec changes，按依赖顺序推进。命名前缀 `wfq-*`（workflow queue），区别于已完成并归档的 `wff-*`（workflow foundation，搭 skeleton）。

**核心原则：每个 change 自带验证，实验不集中到最后一个 change。** 每一步都有回归测试（防退化）+ experiment playbook（证闭环）。

| # | Change | 队列？ | 范围 | 测试 | 实验 | 新代码 | 状态 |
|---|--------|--------|------|------|------|--------|------|
| 1 | `wfq-queue-seedtopics-wave0` | ✅ | seed-topics + wave0 完整 queue-driven 三阶段（task card JSON 模板 + inline backfill + `__BACKFILL_*__` token 系统）+ wave1 foundation 内容（backfill + anti-cheating + future tracks）已就绪 + 3 playbook（1 light + 2 heavy）+ RUN.md 更新 + 全量 504 regression PASS | 2 个 MD structure regression + 2 个 phase-specific regression | ✅ 3 playbook 全部通过 | 零（Path A） | **✅ 已落地** |
| 2 | `wfq-wave1-intake-subagent` | ✅（wave1） | **Wave1 queue-driven 实现**：phase-wave1.md §3 完整 queue-driven 三阶段（灌料→执行循环→收尾+gate），复用 seed-topics + wave0 模板。**+ `target` → `targets` retrofit wave0&1**：schema+engine+phase MD+playbook，wave0 和 wave1 的 web search 一起切到真正的 sub-agent dispatch。新增 `shared-subagent-protocol.md`，上下文隔离从 MD 约定升级为 engine 强制 | queue schema + engine regression + phase-wave1 structure regression | wave1 queue-loop + wave0 happy-path 重跑（验证 sub-agent dispatch）| **有**（`target`→`targets` 是 breaking schema change，需改 schema+engine+MD+playbook ~12 文件） | **⏳ 待启动** |
| 3 | `wfq-wave2-synthesis` | ✅ | **Wave2 cross-topic synthesis + iterative gap-fill loop**：phase-wave2.md §3 生产级 queue-driven 内容——1 个 synthesis task card（灌料→claim→main-agent 执行 synthesis→complete）+ N 个 per-topic backfill task card（claim→execute→complete 循环，替换 `__BACKFILL_WAVE2_JUDGMENT__` + `__BACKFILL_PENDING_QUESTIONS__`）。**关键设计：合成→发现缺口→spawn sub-agent 补搜→回写 synthesis→再合成**（V12 纯本地做 synthesis 的教训）。Queue 在 N=1 时仍然有价值——receipt 检查、done-condition 强制、trace 记录、repair 自动生成 | wave2 gate regression + synthesis link validation | wave2 synthesis + gap-fill loop playbook | 零（Path A） | **⏳ 待启动** |
| 4 | `wfq-delivery` | ❌ | readiness + final phase MD 生产级内容 + HITL2 decision brief + full-chain 纵贯实验（seed-topics→wave0→wave1→wave2→readiness）+ 上下文可持续性测量 | readiness gate regression | full-chain + repair loop | 实验协议（playbook MD） | 待 Change 3 完成后启动 |

**为什么 wave1 + sub-agent 合并为一个 change：** wave1 是 topic-specific deepening——和 wave0 一样需要 WebSearch+WebFetch，一样需要 sub-agent dispatch 来隔离噪声。如果把 wave1 实现和 sub-agent retrofit 拆成两个 change，先做 wave1（main-agent 搜）再做 sub-agent（切 sub-agent）——和 wave0 一样，wave1 也要经历一次"先用 main-agent 跑通再用 sub-agent 重跑"的 migration。不如一个 change 里 wave1 从第一天就用 `targets` + sub-agent dispatch，wave0 顺便 retrofit。`target` → `targets` 是 breaking schema change，wave0 和 wave1 的 task card JSON 一起改，只改一次。

**为什么 wave2 单独拆出来：** V12 把 synthesis 放在本地做——只基于已有 artifact 综合。但真实深度研究里，synthesis 过程中才会发现缺了什么：某个 topic 的证据不够、某个 claim 没验证、某个维度没覆盖。这时候需要回头搜、补证据、再合成。这是一个 **synthesize → find gaps → search → re-synthesize** 的迭代 loop，不是一次性 linear pass。Wave2 单独成 change 给这个 loop 留足设计空间，不和 delivery 的 readiness/final 混在一起。

### 6.2b V12 对照与可复用模式

**V12 的 Queue 使用全景（对照 `_original_dpt_v12/DEEP_RESEARCH_TEMPLATE_V12/flows/execution-flow.md` 和 `queue-agentic-flow.md`）：**

V12 把 queue 用在了整个生命周期的每一层：

```
V12 Wave Internal Loop Pattern（所有 wave 共用）:
─────────────────────────────────────────────────────
wave starts → Queue slot work → fan-in/promotion →
verify receipts → gate audit →
  fail? → same-wave repair/refill → (回 Queue slot work)
  pass? → closeout → trace checkpoint → boundary hook

  Wave 0: shared foundation references + topic-start readiness
  Wave 1: topic-specific refs + fan-in steering + seed backfill 
          + evidence-summary.md + question-list.md
  Wave 2: synthesis + Cross-Topic Conclusion Matrix + 
          conflict handling + HITL2 prep
```

V12 用 **Boundary Hooks**（也是 queue-visible work）做 phase 间过渡。我们新的 gate → chain 机制替代了这部分——phase 间路由变成确定性查表（更干净）。但 **Wave Internal Loop** 的模式完全吻合：V12 的 `slot work → verify → gate audit → repair → closeout` 映射到我们的 `§3.1 灌料 → §3.2 claim→execute→complete → §3.3 收尾+gate`。

**新机制下的"一个 topic 一个 task"适用性判断：**

```
phase 内有 N 个独立子任务（一个 topic 一个 task）？
  ├── YES → queue 适用，使用 3-stage MD 模板
  │         差别只在 target:
  │           target=main-agent → 结构化写入（从 registry 提取）
  │           target=sub-agent  → 外部搜索/检索（WebSearch+WebFetch）
  │
  └── NO  → queue 不适用，保持自由文本
```

**已确认的 phase 分类（含 V12 对照）：**

| Phase | V12 Queue 用法 | 我们 N 个子任务？ | Queue？ | Needs Web？ | Targets | 现状 | Change |
|-------|---------------|-----------------|---------|-------------|---------|------|--------|
| seed-topics | setup-time decomposition repair work | ✅ N topics → N files | ✅ | ❌（纯写文件） | `{controller: main-agent}` — 无 delegates，不搜索 | ✅ 已落地 | Change 1 |
| wave0 | Wave 0 loop: shared reference + topic-start readiness | ✅ N topics → N files | ✅ | ✅（WebSearch+WebFetch） | `{controller: main-agent, delegates: {to: sub-agent, role_key: dpt-source-intake}}` | ⚠️ task card 写 `target: sub-agent` 但从未真正 spawn | Change 1 → Change 2 修 |
| wave1 | Wave 1 loop: topic refs + fan-in steering + seed backfill | ✅ N topics → N files | ✅ | ✅（topic-specific deepening 需要 WebSearch+WebFetch） | `{controller: main-agent, delegates: {to: sub-agent, role_key: dpt-evidence-extractor}}` — 从 Day 1 就用 sub-agent dispatch | ⏳ 待启动 | Change 2 |
| wave2 | Wave 2 loop: synthesis + matrix + conflict + HITL2 prep | ✅ synthesis 本体（1 task）+ backfill（N topics → N tasks） | ✅（synthesis 本体 1 task + backfill N tasks 都走 queue——N=1 时 queue 仍提供 receipt、done-condition、trace、repair） | ✅（合成→发现缺口→spawn sub-agent 补搜→回写 synthesis→再合成） | `{controller: main-agent}` — synthesis 本体 main-agent 执行，gap-fill 直接 spawn sub-agent，backfill 走 queue loop | ⏳ 待启动 | Change 3 |
| readiness | hook_readiness_closeout_to_final_delivery | ❌ 单检查 | ❌ | ❌ | — | ⏳ 待启动 | Change 4 |

**Target → Targets：** 上表中的 `Targets` 列是**目标 schema**（待 Change 2 实现），不是当前状态。当前 `target` 是单个 enum（`main-agent` / `sub-agent` / `engine`），不反映"main-agent 管任务、sub-agent 做脏活"的两层模型。`needs_web` 是判断是否需要 `delegates` 的关键维度——需要真实 WebSearch/WebFetch 的 phase（wave0、wave1）必须走 sub-agent dispatch；不需要的（seed-topics 纯写文件、readiness 单检查）main-agent 自己执行。Wave2 的 synthesis 本体不需要 web search（综合已有证据），但 gap-fill 补搜需要直接 spawn sub-agent（不通过 queue 的 delegates——因为是顺序依赖的判断链）。

**关键差异：** V12 用 Boundary Hook (queue work) 做 phase 过渡 → 我们用 gate + chain (deterministic lookup)。V12 的 hook 本身是个可失败、可 repair 的 queue 任务 → 我们的 gate fail → repair → rerun 在 phase MD §7 里处理，更干净。Wave2 的 synthesis 本体是 1 个 task，不是 N 个可并行的独立子任务——但 queue 在 N=1 时仍提供 receipt 检查、done-condition 强制、trace 记录和 repair 自动生成。Synthesis 后的 per-topic backfill 走 queue loop（`__BACKFILL_WAVE2_JUDGMENT__` + `__BACKFILL_PENDING_QUESTIONS__`——N topics → N backfill tasks，queue 的并行价值额外成立）。

**3-stage MD 模板（已落地，可直接复用）：**

```
§3 Allowed Actions — Queue-Driven 三阶段
  §3.1 灌料 (Filling)        → 完整 task card JSON 模板 + enqueue CLI
  §3.2 Queue-Driven 执行循环   → ASCII 流程图 + claim→execute→complete→投影
  §3.3 收尾与 Gate            → 检查产出 → 跑 gate CLI → pass/fail
```

**对 Change 3（wave2）的影响：** wave2 synthesis 本体 1 task + backfill N tasks 都走 queue。Synthesis task 是 main-agent 执行的单任务（N=1，queue 仍提供 receipt、done-condition、trace、repair）；backfill 是 N topic → N task 的 queue loop（替换 `__BACKFILL_WAVE2_JUDGMENT__` + `__BACKFILL_PENDING_QUESTIONS__`）。Synthesis 过程中的 gap-fill 补搜不走 queue（顺序依赖的判断链），直接 spawn sub-agent。

**对 Change 4（delivery）的影响：** Change 1-3 覆盖了 seed-topics→wave0→wave1→wave2，Change 4 full-chain playbook 应纵贯这四连——每个有 queue 的 phase 独立完成 queue-loop 后，验证跨 phase artifact 传递的一致性（seed_topics/ → reference/ → artifacts/wave1/ → artifacts/wave2/）。

### 6.2c V12 遗产：不应丢失的设计维度

新架构（engine-managed queue、gate CLI 确定性、chain routing）比 V12 更强大，但 V12 有几个维度我们当前的 foundation 阶段尚未覆盖：

**Evidence 质量模型（待 Change 3/4 引入）：** V12 的 reference metadata 有 30+ 字段——`tier`（1-4）、`trust_level`（official/academic/practitioner/community）、`commercial_intent`（none/mild/strong）、`marketing_risk`（low/medium/high）、`cross_verification_required`、`web_substance`、`evidence_role` 等。当前我们的 `ReferenceMetadata` schema 只有 `url/title/retrieved_date/topic_tag` 四字段——足够 foundation 阶段用，但完全不够做 quality filtering。V12 的 Webpage Material Diagnostic Gate（`web_substance=thin` 或 `none` 不计入 floor、`marketing_risk=high` 不能做 neutral factual evidence 未经独立验证）是关键的 anti-noise 机制。应在 Change 3（wave2 synthesis）或 Change 4（delivery readiness）中考虑扩展 reference schema。

**不确定性管理（待 Change 3 设计）：** V12 的 wave1 为每个 topic 维护四区 question ledger（Investigation Targets → Question Reconciliation → Emergent Question Protocol → Exploration/Exploitation Decision），系统性地追踪不确定性——新概念、矛盾、缺失信息、噪音模式——防止过早声称收敛。我们的 wave1 foundation 阶段只写 skeleton placeholder，但 V12 的 question-ledger 结构是 future deepening 的关键设计，应在 Change 3（wave2 synthesis）中考虑引入——synthesis 的质量依赖 wave1 对不确定性的系统追踪。

**Source-intake cache boundary（待 Change 2 考虑）：** V12 要求 sub-agent 输出先写入 `_cache/intake/`（staging），main-agent 审查（candidate cards quality check、topic alignment、trust/tier、webpage diagnostics）后才 promote 到 `REFERENCE_DIR/`。我们当前的 wave0 设计是 sub-agent 直接写 `reference/{topic}/source.yaml`——少了一层 main-agent review gate。Change 2（sub-agent dispatch）应考虑引入 V12 的 staging→review→promote 模式，防止未经审查的搜索结果直接进入 evidence surface。

**Anti-Stall Budget（长期考虑）：** V12 限制 max 3 degraded P0/P1 limitations、max 20% active must-answer claims 依赖 degraded evidence。超过预算 → repair 或 recorded blocker。我们的 stop authorization 机制在"该不该停"上比 V12 更强（engine 侧裁决），但没有"证据质量退化到不可接受"的量化边界。这不是 foundation 阶段的优先级，但 wave2 synthesis 做 claim verification 时可能需要。

---

## 7. 定调下的派生约束

上面三条落地路径（§6）的判断方向是对的，但 §5 的定调把曾被一带而过的问题**降格成了派生约束**——它们不再是并列的大问号，而是"在两层-loop 定调下还必须解决的具体项"。任何一条没解决，loop 还是转不起来；但它们的解法现在都被 §5 的规则框住了。以下 §7.1–§7.3 是原"三个曾被一带而过的问题"，§7.4–§7.5 是在两层-loop 分析中暴露出来的、同样必须解决的额外约束。

### 7.1 灌料（filling）——已落地：MD 模板 + Agent 批量生成

**已落地方案：** `phase-seed-topics.md` 和 `phase-wave0.md` 的 §3.1 提供了完整的 task card JSON 模板——Agent 读取 `topic_registry`，为每个 topic 替换模板变量（`{topic.slug}`、`{topic.title}`），写入 `/tmp/wfq-task-{slug}.json`，然后 `operate-queue enqueue`。Change 1 的 3 个 playbook 验证了这个方案可行——Agent 能可靠地从 topic_registry 派生 task card 并批量 enqueue。

**当前局限：**

- **仍是手写模板+CLI，未做 JS helper**：Agent 每次都要手写 task JSON 文件再跑 CLI。topic 数量多时（>10），这比 MD 模板描述的"批量 enqueue"累。JS helper（如 `deriveWave0Tasks(topicRegistry)`）可以自动从 registry 派生 task card，但目前优先级不高——因为 wave0 的 topic 数量通常可控（≤5）。
- **task 粒度已稳定**："一个 topic 一个 task"（wave0 source intake、seed-topics 物化、wave1 deepening），不更细（每条 source 一个 task 太碎）、不更粗（整个 wave 一个 task 退化回自由文本）。
- **灌料时机**：phase MD §3.1 明确写"如果 queue 为空"时灌料——Agent 进入 phase 时第一件事就是检查 queue 状态并灌料。

### 7.2 stop authorization——把已算出的结论接到能强制执行

**现状比原分析更细：** queue-manager 里 `stop_authorization_state` 不是空字段。`claim()` 在 slot_1 空时会主动设置它：refill pool 非空时 = `unauthorized_continue_required`，refill pool 也空时 = `empty_queue_after_refill`。也就是说，**engine 已经知道"现在该不该停"，并且把答案写进了结构化状态。**

**但断点在于：没有任何东西读这个字段去阻止 Agent 停。** 当 Agent 跑完一个 task、决定"我先停一下汇报"，phase node MD 和 gate CLI 都不会看 `stop_authorization_state`。原分析建议"让 phase node MD 在 unauthorized 时不给停"——但这仍然是 Agent 自律（只是换了份 MD），正好撞上 project charter 的 MUST NOT 第一条：不得回到 Agent self-governance 管 deterministic runtime authority。

**待解的方向：** 真正的 JS 强制版本应该让 engine 在不合法的停机点上主动顶回。候选机制——`complete()` / `claim()` 在返回的 advice 里，当 `stop_authorization_state = unauthorized_continue_required` 时，明确输出"continue required"而不是任由 Agent 停；或在 gate CLI 加一道检查：phase 内 queue 未空且非 blocker/final 状态时，拒绝推进到下一 phase。这样"能不能停"就由 engine 裁决，而不是靠 MD 劝说 Agent。这是把"engine 已经算出的结论"接到"engine 能强制执行"的最后一公里。

### 7.3 上下文可持续性——因 task 收在 phase 内，才有"只读投影"的前提

**原分析从未触及这个问题。** 整篇的立论是"用 queue 制造持续执行的压力，实现长程自主静默"。但一个 claim → 执行 → complete 跑 20 轮的循环，会把全部内容堆进 Agent 上下文。这里有一个被默认但从未验证的假设：

- **完成一个 task 是否真的释放了上下文，还是只是把"停下汇报"换成了"不停下地累积"？** 如果每一轮 complete 的 receipt、result、render 投影都留在对话里，那么"静默"只是表面——上下文压力没消失，只是从"频繁打断"变成了"持续膨胀"，长程跑下去同样会撞上下文墙。

**待解的方向（这是必须做实验验证、不能靠推理下结论的）：**

- sub-agent（target: sub-agent）跑检索/抓取，bounded 输出写进 `_cache`，main-agent 只读投影——这是否足够把"噪音"挡在主上下文之外？原分析的 Target Separation 表暗示了这条，但从没说清 queue 循环里上下文是怎么流进流出的。
- `complete()` 之后 main-agent 应该读什么、丢弃什么？如果它每轮都把完整 result 读回，就没有释放。需要定义"completion 后 main-agent 的最小读入"——理想是只读 projection 的 done/done-condition，细节留在 `_cache`。
- 一次 wave 跑完几十个 task，上下文曲线长什么样？这是 Change 4（`wfq-delivery`）full-chain 实验必须测量的东西，而不是默认它会 work。

> project charter 反复强调"真实执行的副产物，还是事后编出来的"。上下文可持续性同样如此：它能不能撑住，必须靠真实 trace + 上下文采样验证，不能靠"queue 设计上就该撑得住"的推理。

**实验协议草案（供 Change 4 full-chain 实验使用）：**

| 维度 | 内容 |
|------|------|
| **测量指标** | 每轮 claim→complete 后的 Agent 上下文 token 估算（输入 + 输出）、有效信息密度（新 evidence 量 / 上下文总量）、上下文增长率（本轮 vs 上轮） |
| **对比基线** | 同一 wave 跑两次——一次 queue-driven（claim→execute→complete 循环），一次自由文本（传统 Agent 对话模式） |
| **判定标准** | 上下文增长率 < 线性（即每轮新增上下文递减而不是恒定或递增）、有效信息密度在前 5 轮后不低于 0.3（此阈值为草案占位，Change 4 实施前需通过 OpenSpec proposal 校准） |
| **具体实验** | wave0 跑 10 个 topic，使用 target: sub-agent 执行搜索、bounded 输出写 `_cache`、main-agent 只读 render projection——采样每轮 complete 后的上下文快照 |
| **关键要排除的** | main-agent 在 complete 后把完整 result 读回对话——这是上下文膨胀的主要来源，必须靠 sub-agent + _cache 隔离 |

> 这个实验协议是草案——Change 4 实施前需要通过 OpenSpec proposal 确定最终度量、阈值和 playbook 形态。

### 7.4 error recovery——stale claim 与 crash 恢复

**这是原分析从未触及的问题。** Queue loop 的核心前提是"Agent 连续执行不中断"。但长程运行必然遇到中断：Agent crash、上下文窗口溢出被迫重置、网络错误导致 task 半完成。

**现状核查：** `claim()` 的行为是直接设置 `slot_1_current.status = 'running'`，不检查是否已有 running task。`loadQueue()` 从磁盘恢复 queue state 时不会主动清理 running 状态。也就是说：

- **如果 Agent 在 claim 后、complete 前 crash，task 停在 running 状态——但没有超时检测机制。**
- **下次 `loadQueue()` 回来，`claim()` 仍然能拿同一个 task（因为它只读 `slot_1_current`，重新设 `status = 'running'`，是幂等的）。task 不会"卡死"——但系统无法判断这个 task 是真在做、还是上次 crash 的残留。**

问题不是"task 卡死无法 reclaim"——claim 是幂等的，crash 后 re-claim 同一个 task 在机制上没问题。真正的问题是**系统无法区分"正在做"和"crash 残留"**：没有时间戳记录 claim 时刻，没有阈值判断 stale，`inspect()` 也不报告 running 时长。如果 task card 的 action 不是幂等的（比如 side-effectful 写入），crash 后 re-execute 可能产生重复或冲突。

**待解的方向（必须通过 engine 侧改动解决）：**

1. **stale claim 检测：** `claim()` 在 slot_1 已为 running 时，检查 claim 时间戳。如果超过阈值（如 10 分钟），自动 fail 旧 task（reason: `stale_claim_timeout`）→ promote → 允许 claim 下一个。阈值应该是可配置的（phase node frontmatter？全局常量？）。

2. **幂等 claim：** `loadQueue()` 恢复时，如果 slot_1 是 running 且没有超时，Agent 应该能重新拿同一个 task 继续执行（而不是跳过）。task card 的 `action` 和 `done_condition` 应设计为幂等——重跑不会产生副作用。

3. **crash 后的 queue health：** `inspect()` 应报告 running 时长和 stale 状态，让 Agent 或人在恢复时能看到"这个 task 从 X 分钟前就 running 了"。

4. **与 stop authorization 的关系：** stale claim 被 timeout 后，auto-fail → promote → 如果 refill pool 空了，`stop_authorization_state` 会自动变 `empty_queue_after_refill`。这意味 crash 后队列可能自动变成"允许停"——是期望行为还是 bug，取决于具体场景。

> 这个问题在 Path A（纯 MD 驱动）下无法解决——它需要 engine 侧的 claim() + loadQueue() 改动。建议作为 Path B 的一部分，优先级在 stop authorization 强制执行之后。

### 7.5 targets 模型——何时需要 delegates（旧名 target separation）

**为什么这值得独立一节。** §7.3（上下文可持续性）的可行性严重依赖正确的 sub-agent 委托：sub-agent 跑重 I/O 工作、bounded 输出写 `_cache`、main-agent 只读投影。当前 `target` 是单个 enum（`main-agent` / `sub-agent` / `engine`），但 Change 2 将改为 `targets: {controller: 'main-agent', delegates?: {to: 'sub-agent', role_key, noise_boundary}}`——核心问题从"二选一"变成"是否需要 delegates"。

**判断标准——task 是否需要 `delegates`：**

| 判定维度 | 不需要 delegates（main-agent 自己执行） | 需要 delegates（委托 sub-agent） |
|---------|--------------------------------------|----------------------------------|
| **I/O 密度** | 低——读已有 artifact、做判断 | 高——外部 WebSearch、WebFetch、大面积阅读 |
| **上下文依赖** | 需要全文 context（plan、profile、其他 topic 结果）来综合判断 | 只需要 task card 里的 bounded 上下文（topic slug、search_guardrails、schema） |
| **产出类型** | 综合判断、内容质量裁决、cross-topic 关联 | 结构化 data（source metadata、evidence particle、skeleton YAML） |
| **上下文释放** | 产出留在对话中供下一轮决策 | 产出写 `_cache/.../search-results/`，main-agent 只读 render projection 确认 done-condition |

**phase 级 delegates 判断：**

| Phase | Needs delegates？ | 原因 |
|-------|------------------|------|
| seed-topics | ❌ | 纯写文件——从 topic_registry 提取信息写入 seed_topics/{slug}.md，不搜索 |
| wave0 | ✅ | WebSearch+WebFetch——需要 `dpt-source-intake` role sub-agent |
| wave1 | ✅ | topic-specific deepening 需要 WebSearch+WebFetch——需要 `dpt-evidence-extractor` role sub-agent |
| wave2 | ❌ synthesis 本体 | 综合已有证据——不需要外部搜索。但 gap-fill 补搜直接 spawn sub-agent（不通过 queue delegates——顺序依赖的判断链） |
| readiness | ❌ | 单步 deterministic 检查——gate CLI 执行 |

**MD controller 的职责：** 每个 phase node MD 在 task card JSON 模板里必须明确——当前 phase 的 task 是否需要 `delegates`。这是 controller 的权利和职责，不是 engine 能自动判断的。

> 这个划分不是硬编码在 engine 里的——它是对 MD controller 的指导，帮助 phase node 作者在写 body 时做出不自毁上下文的选择。Change 2 实现后，`targets.delegates` 的存在与否由 phase MD 的 task card 模板决定。

---

## 8. 开放问题

1. **灌料的下一步——JS helper？** 当前 MD 模板 + 手动 enqueue 在 topic ≤5 时够用。是否需要在 engine 侧加 `deriveTasks(topicRegistry)` 自动批量生成 task card？JS helper 的好处是确定性和可测试，代价是新代码。目前优先级低——seed-topics 和 wave0 的 topic 数量可控——但不排除在 future change 里做。

2. **producer rules enum 什么时候标准化？** 后续 change 中逐步收敛——每次引入新 producer_rule 时在对应 OpenSpec change 中注册。

3. **scenario 6 重灌 Q 的触发条件？** Q 空 + gate fail 时，gate-repair 决定"重灌 Q"的具体信号是什么——是 inspect 直接指出哪个 topic 缺了，还是靠 Agent 判断？这影响 gate-repair 和 Q 的接口怎么定。

> 注：原开放问题 #1（queue 强制还是可选）已被 §5.5 定调划清（看验证者 + 看 phase 类型）；原 #2（queue 谁往里填）已升级为 §7.1 派生约束。

---

## 9. 结论

Agentic Queue 的 JS 底盘已经 solid——engine (619 行) + CLI (102 行) + spec (AGQ-001~006) + 6 个 playbook（3 engine-level + 3 phase-level）全部通过。

**两个 phase 已接入 queue：seed-topics + wave0。** Change 1（`wfq-queue-seedtopics-wave0`）已落地，scope 比原计划扩大：
- seed-topics：两区结构（初始化区 + `__BACKFILL_*__` token 回填区）+ queue-driven 物化
- wave0：queue-driven source intake + inline backfill（§3.2 step 5）+ sub-agent 上下文隔离（`_cache/wave0/search-results/`）
- 3 个 playbook（1 light + 2 heavy）+ 全量 504 regression PASS

**下一步：Change 2 — `wfq-wave1-intake-subagent`。**Wave1 queue-driven 实现 + `target` → `targets`，wave0 和 wave1 的 web search 一起切到真正的 sub-agent dispatch。然后 Change 3 — `wfq-wave2-synthesis`：cross-topic synthesis + iterative gap-fill loop。最后 Change 4 — `wfq-delivery`：readiness + final + full-chain 纵贯验证。

---

## Appendix A: queue-driven phase-wave0.md 示例（历史——Phase 1 已完成，实际实现已偏离此模板）

> ⚠️ 这是 Change 1 启动前的草案模板。Phase 1 已完成——实际 `phase-wave0.md` 的 §3 实现比此模板更完整（含 inline backfill step 5、`_cache/wave0/search-results/` 上下文隔离、tool degradation chain 等）。保留此附录仅作设计演变参考，不作为当前真相。

以下仅展示 `phase-wave0.md` 需要改动的 §3（Allowed Actions）部分。其余 §1/§2/§4–§9 不变（§5 gate command 不变，§7 gate fail 处理不变，§8 stop behavior 不变）。

```markdown
## 3. Allowed Actions

### 3.1 首次进入 wave0 — 灌料（filling）

如果 queue 为空（`operate-queue check <bundle>` 返回 empty/null）：

1. 读取 `rb_plan.md` frontmatter 的 `topic_registry`，确定需要覆盖的 topic 集合
2. 为每个 topic 生成一个 source-intake task card，然后 enqueue：
   ```bash
   # 为 topic_registry 中的每个 topic key 跑：
   node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue <bundle> \
     --work-id "wave0-source-{topic_key}" \
     --title "Source intake: {topic_label}" \
     --target sub-agent \
     --action "搜索 topic [{topic_label}] 的 foundation reference，找到至少 1 条可信来源，获取页面内容，提取 url/title/retrieved_date/topic_tag，写入 reference/{topic_key}/source.yaml（满足 ReferenceMetadata schema）。搜索关键词从 topic.description 派生。"
     --priority 1 \
     --producer-rule source_intake_fan_in \
     --receipts "file:reference/{topic_key}/source.yaml"
   ```
3. 灌料完毕后，跑 `operate-queue check <bundle>` 确认 active_window 已填充

### 3.2 Queue-driven 执行循环

```
┌─────────────────────────────────────────┐
│ 1. claim 下一个 task:                    │
│    operate-queue claim <bundle>          │
│         │                                │
│         ▼                                │
│ 2. 执行 task card 描述的 action           │
│    (target: sub-agent → 新 Agent 执行)    │
│         │                                │
│         ▼                                │
│ 3. complete:                             │
│    operate-queue complete <bundle>        │
│    --result reference/{topic}/source.yaml │
│         │                                │
│         ▼                                │
│ 4. 读 projection 确认 done-condition:     │
│    _cache/agentic-queue/current-task.md   │
│         │                                │
│         ▼                                │
│ 5. 如果 slot_1 仍有 task → 回到步骤 1     │
│    如果 queue 空 → 跳到 §3.3              │
└─────────────────────────────────────────┘
```

**执行期间的行为约束：**

- **不跳过 task：** 只要 claim 返回了 task card，就必须执行+complete，不能无故跳过
- **不伪造产出：** 每个 task 的产出文件必须来自真实搜索/阅读，禁止 fake URL
- **complete 阻塞：** 如果 complete 时 receipt check 失败（source.yaml 不存在或 schema 不对），Engine 会自动生成 repair task——必须修复而不是跳过
- **上下文管理：** sub-agent 执行的搜索/抓取结果写入 `_cache/search-results/`。main-agent 在 complete 后只读 `_cache/agentic-queue/current-task.md` 投影确认 done-condition，**不把完整搜索结果读回对话**

### 3.3 Queue 空后 — 收尾与 gate

当 queue 空（claim 返回 item: null）时：

1. 检查 `reference/index.md` 是否已更新（列出所有 topic 的 reference 摘要）
2. 如果 index 缺失——手动写入（不需要重新灌 Q，这是单步收尾动作）
3. 跑 gate CLI：
   ```bash
   node DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs --bundle <path> --current-node phases/phase-wave0.md
   ```
4. 如果 gate pass → 读 `check.next` → 加载 `phase-wave1.md`
5. 如果 gate fail → 按 §7 On Gate Fail 处理
```

**关于这个示例的说明：** 此附录是 Change 1 启动前的草案。实际实现已偏离：task card 使用完整 JSON 文件（`--task /tmp/wfq-task-{slug}.json`）而非 CLI flags；complete 的 result 是 JSON 文件（`--result /tmp/wfq-result-{work_id}.json`）包含 work_id/receipt/summary/writes；backfill 已改为 inline step 5 而非 §3.3 的 queue-driven batch。
