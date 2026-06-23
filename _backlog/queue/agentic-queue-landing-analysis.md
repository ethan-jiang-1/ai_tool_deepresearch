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
| **灌料 / filling** | phase 开始时往队列里灌入 task card 的过程。当前是纯手动（Agent 手写 task.json 再 enqueue）。 |
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
| `DPT_FRAMEWORK/workflows/nodes/phases/phase-*.md` | §3、§5.5 的 phase 判定 | grep 确认**没有任何 phase node MD 引用 operate-queue**；读了 phase-wave0.md / phase-wave1.md 全文 |
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

### 2.4 实验验证 — `experiments_playbook/exp_agentic-queue/`

| Playbook | 验证内容 | 状态 |
|----------|---------|------|
| `test-simple-minimal-path.md` | enqueue → claim → complete → promotion → projection | ✅ |
| `test-medium-urgent-preemption.md` | full-window preemption, displaced tail, restore, refill | ✅ |
| `test-complex-failure-repair.md` | invalid task rejection, missing receipt blocking, unsafe-current guard, empty queue handling | ✅ |

---

## 3. 还缺什么

| 缺的 | 当前状态 | 差距 |
|------|---------|------|
| queue 接入 workflow loop | queue engine 存在但 phase node MD 没有引用它 | 需要在 phase body 里加入 queue-driven 工作模式 |
| "stop authorization" 强制执行 | stop_authorization_state 字段存在但 Agent 停不停靠自觉 | Engine 侧强制执行（让 gate CLI 或 complete() 读取并顶回非法停机）；MD 指令不够——见 §7.2 |
| producer rules enum 标准化 | priority_class 字段存在，部分 producer_rule 值在 makeRepairItem 里用了 | 需要 OpenSpec 定义最终 enum |
| gate + queue 联合操作 | Gate CLI 和 Queue CLI 是分开的 | 不是必须——Agent 可以自己协调，先跑 gate 再跑 queue |

**以下不是当前优先级：**
- `rb_ledger.jsonl` — claim provenance 账本，v1 不需要
- "boundary hooks catalog" — V12 遗留概念，chain + gate 已经覆盖了 wave 间过渡

---

## 4. 真正的 gap：queue 没有接入 workflow loop

**queue engine 本身已经很强了，但它没有被 workflow 使用。**

当前 workflow loop：
```
Agent → assessNode(phase MD) → 读 body → 执行 → gate CLI → chain 回答 next → 循环
```

queue 能提供的增强：
```
Agent → assessNode(phase MD) → 读 body → loadQueue()
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

  └ 内层（phase 内，待落地）：
      claim → 执行 task → complete (receipt check + promote + refill)
      → 读下一个 task card → claim → 执行 → complete → ... → queue 空
      权威 = rb_queue.agq.json + queue-manager.mjs
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
| seed-topics | seed gate + 多 topic | **可能**（若 topic 多） |
| wave0 / wave1 / wave2 | phase gate + 多 topic × 多子任务 | **是**（Q 发挥价值的地方） |
| readiness | readiness gate | 否（单步） |
| final | final gate | 否（单步） |

phase MD 自己决定开不开 Q——这是 controller 的权利。

---

## 6. 落地建议

### 6.1 两条路

**A. 最小路径：只改 phase node MD，不写新代码**

修改 phase node MD body（wave0/wave1/wave2 最适合），把 "Allowed Actions" 从自由文本改成 queue-driven 模式：
```markdown
## 3. Allowed Actions
1. 加载 queue: `node DPT_FRAMEWORK/cli/operate-queue.mjs claim <bundle>`
2. 执行 task card 描述的 action
3. 完成: `node DPT_FRAMEWORK/cli/operate-queue.mjs complete <bundle> --result result.json`
4. 重复 1-3 直到 queue 空
5. 跑 gate CLI 推进到下一 phase
```

优点：零新代码，立即可用。

**局限（必须同时看清楚）：**

- Path A 解决的是 **visibility**——MD 告诉 Agent "你应该这样走 queue loop"。但它不解决 **enforcement**——Agent 仍然可以自己决定"我觉得差不多了，跳过 loop 直接跑 gate"。这正是 §7.2 指出的 charter 张力：放在 MD 里的步骤是 Agent 自律（只是换了份 MD），不是 Engine 强制执行。
- 因此 Path A 是**必要的第一步**（让 Agent 知道 queue 的存在和用法），但不是**充分的最后一步**（让 Engine 在非法停机时顶回）。两者互补，不是替代。
- 短期实用判断：MD 指令 + Agent 自觉在大多数情况下**能工作**——Agent 没有理由故意跳过 queue loop。但长期必须补上 Path B 的 JS-level stop authorization 强制检查。

**B. 完整路径：phase node MD 接入 + producer rules 标准化 + experiments**

在 A 的基础上：
- OpenSpec 定义 producer rules enum（少量新增 AGQ 条目）
- 建 `experiments_playbook/exp_agentic-queue-loop/` 验证 queue-driven phase 闭环
- 可选：如果 `complete` 后立即跑 gate 太繁琐，可以写一个薄 wrapper 把 complete + gate check 合成一步（但这不是必须的——Agent 能跑两步）

### 6.2 建议推进顺序

```
Phase 1: wave0 试点
  └→ 更新 phase-wave0.md 的 body，加入 queue-driven 工作模式
  └→ 验证: 走一次 wave0，Agent 在 queue 驱动下完成 source intake

Phase 2: wave1/wave2 推广
  └→ 更新 phase-wave1.md, phase-wave2.md
  └→ producer rules enum 标准化（OpenSpec change）

Phase 3: experiments
  └→ exp_agentic-queue-loop/ 建 playbook
  └→ 验证循环闭环: task → complete → 下一个 task → queue 空 → gate 过

Phase 4: 后续增强（可选）
  └→ rb_ledger.jsonl（如果需要 claim provenance）
  └→ operate-queue 扩展子命令（如果需要 gate+queue 联合操作）
```

### 6.2a OpenSpec 落地：3 个 Changes（wfq-*）

以上 Phase 1-4 映射为 3 个 OpenSpec changes，按依赖顺序推进。命名前缀 `wfq-`（workflow queue），区别于已完成并归档的 `wff-*`（workflow foundation，搭 skeleton）。

| # | Change | 原 Phase | 范围 | 新代码 | 状态 |
|---|--------|---------|------|--------|------|
| 1 | `wfq-queue-loop-wave0` | Phase 1 | phase-wave0.md §3 重写 + AGQ-007 producer_rule `source_intake_fan_in` | 零（Path A） | **proposed** |
| 2 | `wfq-queue-loop-waves` | Phase 2 | phase-wave1.md §3 重写 + producer rules enum 标准化（AGQ-008~010）; wave2 不需要 queue（单一大任务）| 可能加 JS helper `deriveWave0Tasks`（视 Change 1 反馈） | 待 Change 1 完成后启动 |
| 3 | `wfq-queue-loop-experiments` | Phase 3 | `experiments_playbook/exp_agentic-queue-loop/` 建 playbook + 按 §7.3 实验协议测量上下文可持续性 | 实验协议（playbook MD） | 待 Change 2 完成后启动 |

**暂不纳入独立 change、但需在后续评估的项目：**

- stop authorization 强制执行（§7.2）— engine 侧改动，需等 Path A 验证"MD 指令是否足够"后再决定
- stale claim 检测 + crash 恢复（§7.4）— engine 侧改动
- `rb_ledger.jsonl` — claim provenance 账本，v1 不需要

**wave2 为什么不需要 queue：**

Wave0 和 wave1 各拆为 N 个独立子任务（一个 topic 一个 task），适合 queue 的 claim→execute→complete 循环。Wave2 只有一个子任务——从已验证的 wave0/wave1 artifact 派生一份 cross-topic synthesis。没有"多个独立子任务"可拆，queue 在这里帮不上忙，保持自由文本模式。

### 6.3 设计约束（从 project charter 继承，不变）

- **Queue 不驱动 Agent** — Agent 驱动自己，queue 只是它的 todo list
- **Queue 不代替 Agent 做判断** — receipt check 是确定性的，内容判断归 Agent
- **Markdown projection 是视图不是权威** — `rb_queue.agq.json` 是 Source of Record
- **Queue + chain 分工** — queue 管 phase 内部子任务，chain 管 phase 间路由
- **fail-closed** — receipt 缺失时阻塞

---

## 7. 定调下的派生约束

上面三条落地路径（§6）的判断方向是对的，但 §5 的定调把曾被一带而过的问题**降格成了派生约束**——它们不再是并列的大问号，而是"在两层-loop 定调下还必须解决的具体项"。任何一条没解决，loop 还是转不起来；但它们的解法现在都被 §5 的规则框住了。以下 §7.1–§7.3 是原"三个曾被一带而过的问题"，§7.4–§7.5 是在两层-loop 分析中暴露出来的、同样必须解决的额外约束。

### 7.1 灌料（filling）——phase 进入时由 MD 派生 task

**现状：** `createQueue()` 建出的是全空 5-slot 队列；`claim()` 在 slot_1 为空时直接返回 `item: null`，并把队列标成 `thin` 或 `blocked`。`enqueue` 是纯手动操作——Agent 得手写一个 `task.json` 再跑 CLI 才能往里放一条。

**为什么这是最弱环节：** queue 不灌料就什么也不干。如果 Agent 要为 wave0 的每一条 source 手写一个完整 task card（work_id / target / action / producer_rule / lineage / required_receipts / done_condition / verification / writes_to …），那比现在的自由文本 "Allowed Actions" 还累——"持续执行的压力"根本起不来，loop 在第一步就断了。

**待解的方向（不是结论，是必须回答的问题）：**

- **谁来生成 task？** enqueue 需要变得便宜、最好是半自动的。候选：phase 启动时由 main-agent 根据 rb_plan/topic_registry 批量生成结构化 task（一个 topic / 一条 source 一个 task），而不是逐条手写。
- **task 粒度多大？** 太细（每条 source 一个 task）灌料成本高；太粗（整个 wave 一个 task）等于退化回现在的自由文本，queue 失去意义。需要找到"一个 claim→complete 能在一两轮内完成"的粒度。
- **能不能由确定性逻辑生成骨架 task？** 比如 wave0 的 task 可以从 topic_registry 直接派生（每个 topic 生成一个 source-intake task），producer_rule = `source_intake_fan_in`。这种结构性灌料适合放进 JS，而不是靠 Agent 每次手写。

**灌料设计草图（供 Phase 1 试点参考，不是最终 spec）：**

以 wave0 为例，从 topic_registry 到 task card 的映射：

```
topic_registry 条目                     task card 字段
─────────────────────────────────       ─────────────────
topic.key                               work_id: "wave0-source-{topic.key}"
topic.label                             title: "Source intake: {topic.label}"
topic.description                       action: 含 topic.key + topic.description 的自然语言
(fixed)                                 target: "sub-agent"
(fixed)                                 producer_rule: "source_intake_fan_in"
(fixed)                                 priority_class: 1
topic + phase schema                     required_receipts: ["file:reference/{topic.key}/source.yaml",
                                                            "json:reference/{topic.key}/source.yaml:ReferenceMetadata"]
(fixed)                                 done_condition: "topic 的 source.yaml 存在且通过 schema 校验"
(fixed)                                 verification.engine: ["receipt_check"]
(fixed)                                 writes_to: ["reference/{topic.key}/source.yaml", "_cache/search-results/"]
```

**关键设计抉择（Phase 1 试点必须试出来的）：**

1. **派生逻辑放在哪？** 两个候选：
   - **JS helper**：在 queue-manager 侧加一个 `deriveWave0Tasks(topicRegistry)`，由 MD 指令 "run derive then enqueue all"。好处是确定性、可测试；代价是新代码。
   - **Agent 模板化生成**：MD 给 Agent 一个 task card 模板，Agent 根据 topic_registry 批量 fill in（每个 topic 一条 enqueue CLI）。好处是零新 JS 代码；代价是 Agent 可能填错字段。

2. **一次性灌还是渐进灌？**
   - **一次性灌满**（Path A 最简）：phase 开始时把所有 topic 的 task 全部 enqueue。适合 topic 数量 ≤10 的场景。
   - **分批灌**：先灌 5 个填满 active window，Agent 跑完一批再灌下一批。适合 topic 数量 >10 或搜索 token 预算有限时。
   - Phase 1 试点建议从一次性灌满开始——wave0 的 topic 数量通常可控。

3. **灌料时机**：在 phase node MD 的 "Allowed Actions" 第 1 步明确写"如果 queue 为空，从 topic_registry 生成 task card 并 enqueue"——让 Agent 在 phase 启动时就有灌料意识。

> 这一节升级自原"开放问题 #2"——它不是可以晚点再想的问题，而是 loop 能不能启动的前提。

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
- 一次 wave 跑完几十个 task，上下文曲线长什么样？这是 §6 Phase 3 实验必须测量的东西，而不是默认它会 work。

> project charter 反复强调"真实执行的副产物，还是事后编出来的"。上下文可持续性同样如此：它能不能撑住，必须靠真实 trace + 上下文采样验证，不能靠"queue 设计上就该撑得住"的推理。

**实验协议草案（供 Phase 3 使用）：**

| 维度 | 内容 |
|------|------|
| **测量指标** | 每轮 claim→complete 后的 Agent 上下文 token 估算（输入 + 输出）、有效信息密度（新 evidence 量 / 上下文总量）、上下文增长率（本轮 vs 上轮） |
| **对比基线** | 同一 wave 跑两次——一次 queue-driven（claim→execute→complete 循环），一次自由文本（传统 Agent 对话模式） |
| **判定标准** | 上下文增长率 < 线性（即每轮新增上下文递减而不是恒定或递增）、有效信息密度在前 5 轮后不低于 0.3（此阈值为草案占位，Phase 3 实施前需通过实验校准） |
| **具体实验** | wave0 跑 10 个 topic，使用 target: sub-agent 执行搜索、bounded 输出写 `_cache`、main-agent 只读 render projection——采样每轮 complete 后的上下文快照 |
| **关键要排除的** | main-agent 在 complete 后把完整 result 读回对话——这是上下文膨胀的主要来源，必须靠 sub-agent + _cache 隔离 |

> 这个实验协议是草案——Phase 3 实施前需要通过 OpenSpec proposal 确定最终度量、阈值和 playbook 形态。

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

### 7.5 target separation——main-agent vs sub-agent 的划分原则

**为什么这值得独立一节。** §7.3（上下文可持续性）的可行性严重依赖 target separation：sub-agent 跑重 I/O 工作、bounded 输出写 `_cache`、main-agent 只读投影。但 §0.3 术语表只给了定义，没有给划分原则。如果 task card 的 `target` 字段写错——该给 sub-agent 的给了 main-agent——上下文就膨胀；该给 main-agent 的给了 sub-agent——sub-agent 没有足够上下文做判断。

**划分原则（从 queue loop 的上下文压力推导，不是笼统的"搜索 vs 综合"）：**

| 判定维度 | target: main-agent | target: sub-agent |
|---------|-------------------|-------------------|
| **I/O 密度** | 低——读已有 artifact、做判断 | 高——外部搜索、抓取、大面积阅读 |
| **上下文依赖** | 需要全文 context（plan、profile、其他 topic 结果）来综合判断 | 只需要 task card 里的 bounded 上下文（topic key、搜索 query、schema） |
| **产出类型** | 综合判断、内容质量裁决、cross-topic 关联 | 结构化 data（source metadata、evidence particle、skeleton YAML） |
| **确定性程度** | 高判断成分——需要 trade-off 和 judgment | 高执行成分——搜索→筛选→结构化写入 |
| **上下文释放** | 产出留在对话中供下一轮决策 | 产出写 `_cache`，main-agent 只读 render projection |

**wave-level 建议（供 MD controller 在写 phase body 时参考）：**

| Wave | 典型 sub-agent task | 典型 main-agent task |
|------|-------------------|-------------------|
| wave0 | 搜索一个 topic 的 source，写 `source.yaml` | 审核 source 质量，决定是否需要补充 |
| wave1 | 为一个 topic 提取 evidence particle，写 `evidence/` | 审核 particle 质量，判断 coverage 是否足够 |
| wave2 | （较少——wave2 主要是综合） | Cross-topic synthesis、claim verification、矛盾裁决 |

**MD controller 的职责：** 每个 phase node MD 在 "Allowed Actions" 里必须明确——当前 phase 的 task 默认 target 是什么、哪些例外情况需要 main-agent 亲自做。这是 controller 的权利和职责，不是 engine 能自动判断的。

> 这个划分不是硬编码在 engine 里的——它是对 MD controller 的指导，帮助 phase node 作者在写 body 时做出不自毁上下文的选择。

---

## 8. 开放问题

1. **灌料的具体 MD 形态？** §7.1 定了"phase 进入时由 MD 派生 task"，但 wave0 的 phase body 具体怎么写灌料步骤（一个 topic 一个 task？一条 source 一个 task？producer_rule 用哪个？）还没落定，要靠 Phase 1 试点试出来。

2. **producer rules enum 什么时候标准化？** Phase 2 顺带做（小 OpenSpec change）。

3. **scenario 6 重灌 Q 的触发条件？** Q 空 + gate fail 时，gate-repair 决定"重灌 Q"的具体信号是什么——是 inspect 直接指出哪个 topic 缺了，还是靠 Agent 判断？这影响 gate-repair 和 Q 的接口怎么定。

> 注：原开放问题 #1（queue 强制还是可选）已被 §5.5 定调划清（看验证者 + 看 phase 类型）；原 #2（queue 谁往里填）已升级为 §7.1 派生约束。

---

## 9. 结论

Agentic Queue 的 JS 底盘已经 solid——engine (619 行) + CLI (102 行) + spec (AGQ-001~006) + 3 个 playbook 全部通过。

**唯一缺的，是让 workflow 用它。**

最小的下一步：更新 `phase-wave0.md` 的 body，把 wave0 的 source intake 变成 queue-driven 模式。不写新代码，只改 MD。验证可行后推广到 wave1/wave2。

---

## Appendix A: queue-driven phase-wave0.md 示例

> 这不是最终 spec——这是供 Phase 1 试点使用的**示例模板**，展示 Path A 的改动范围。实际形态由 Phase 1 试点后的 feedback 决定。

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

**关于这个示例的说明：**

- 灌料步骤（§3.1）目前是**手写 enqueue CLI**——每个 topic 一条命令。如果 topic 数量多，这比现在的自由文本繁琐。这正是 §7.1 灌料设计的核心张力——Phase 1 试点需要验证 Agent 能否可靠地批量生成这些 enqueue 命令。
- 如果 Phase 1 发现手写 enqueue 太贵，Phase 2 应该加一个 JS helper（`deriveWave0Tasks`）在 engine 侧自动从 topic_registry 派生 task card，MD 只写 "run deriveWave0Tasks then enqueue all"。
- complete 步骤的 `--result` flag 目前只是一个路径——实际 `complete()` 如何知道产出了什么文件，取决于 Phase 1 试点时 queue-manager 的具体 API 形态。
