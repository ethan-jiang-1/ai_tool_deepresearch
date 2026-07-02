# TODO: phase-recover（状态恢复——模型跑糊涂时从 ground truth 重新定位并复活当前 phase）

> 状态: 待设计 | 优先级: 低（先记录，parked） | 创建: 2026-06-25
>
> 暂不开 OpenSpec change——本文件是 backlog 记录，等优先级抬起、设计问题收敛后再 `/opsx:explore`。
>
> 互补项: `todo-context-reground.md`（预防层——周期性重锚，对抗 lost-in-the-middle）
> 相关: `todo-rerun-incremental-node.md`（node + gate + counter 的结构范本）、`phase-hitl2.md` 的 `request_view_revision`（Agent-routed 重定位范本）

## Why

模型在长程运行中有时会**完全失焦**：忘了自己在哪个 phase、幻觉已经完成的工作、原地打转重复 dispatch、把 `current_gate` 写成错误的值。今天这条路径**没有出路**。

具体地说，当前架构有三个相互叠加的脆弱点：

1. **Phase identity 是 Agent 手写的字符串**。`rb_status.json` 的 `current_gate` / `next_gate`（`DPT_FRAMEWORK/schema/contracts/status.mjs:7-9`）由 Agent 按 phase MD 的 prose 指令手写，**Engine 只读、从不写**。所有 11 个 gate CLI 都只是 `readFileSync` 来校验，没有 `writeFileSync` 回写 phase 进度。
2. **Engine 算出 `next` 后丢掉**。`resolveNodeTransitionDetailed()`（`engine/ask-next.mjs`）是纯查表，结果只出现在 gate CLI 的 stdout（`check.next`），**不持久化、不回读**。闭环由 Agent 手动接（移到下个 phase + 覆写 `current_gate`/`next_gate`），Engine 不验证接上了。
3. **"status drift" 只有 prose 救济**。每个 phase MD 的 failure table 有一行 "恢复 current_gate/next_gate 为 X/Y"（如 `phase-wave0.md:155`），但没有一个**单一的、有归属的**恢复路径。

**phase-recover 验证"我还清醒吗"——不清醒就停下手，从 ground truth 重新定位当前 phase，把它复活（re-load），而不是继续在幻觉里推进。**

### 与"失焦"的其他形态区分

| 失焦形态 | 当前出路 | 本 TODO 是否管 |
|---------|---------|---------------|
| Sub-agent wave 内部卡住（同 state 反复） | `convergeRepair`（`subagent-relay.mjs:929`，maxIterations=3 + stall set） | ❌ 不重复，那是 subagent 层局部 |
| Gate fail 需要修 | `convergeRepair` + repair guidance（3 次 retry limit） | ❌ 那是 repair |
| 用户想调整方向再跑一遍 | HITL2 `rerun` → `phase-rerun.md` | ❌ 那是用户主动的增量重跑 |
| **模型自己彻底迷路、不知道在哪个 phase** | **无** | ✅ 这才是本 TODO |

## 核心挑战：recover 的 target 是 runtime-dependent，不能进 chain

这是设计上最硬的约束，必须在第一步讲明。

**§13 确定性出口原则**（`shared-anti-cheating-rules.md:66-75`）规定：某 outcome 进 `transitions.chain.json` 的标准是"有固定、上下文无关的 next-node 目标"。

- `passed`（所有 phase）、`rerun`（HITL2 → 永远回 seed-topics）→ **固定目标 → 进 chain**。
- `request_view_revision` / `repair` / `stop_blocked` → **target 依赖 Agent 判断 → 不进 chain，返回 `no_transition`**。

recover 的 target 是"trace 说我们在哪个 phase"——**运行时才确定**，没有固定目标。所以 recover 落在不确定 branch 一侧：

> **recover MUST NOT 进 chain。它必须 Agent-routed（返回 `no_transition`），与 `request_view_revision` 同类。**

这意味着 recover 即便做成一个独立 node（`phase-recover.md`），它的 `On Gate Pass` 也不能靠 chain 查表给下一跳——chain 对它只会返回 `no_transition`，由 Agent 重载被恢复的 phase。这正是 recover 比 `phase-rerun.md` **更 tricky** 的点：rerun 有确定性出口（→seed-topics），recover 没有。

## 现有基础设施（可借鉴 / 可复用）

| 基础设施 | 位置 | 如何用 |
|---------|------|--------|
| **持久化 phase 信号** | `rb_status.json` `current_gate`/`next_gate`（`schema/contracts/status.mjs:7-9`）+ `CurrentGate` enum（`schema/enums.mjs:5-17`，11 值） | recover 读取以判断"我们在哪"。但这是 Agent 手写、可能 drift——见设计问题 2 |
| **append-only 事件流** | `rb_trace.jsonl`（`engine/trace.mjs` 写，`gate-helpers.mjs:255-282`） | 可作为**重建**当前 phase 的 ground truth——读最后一个 `gate_attempt` 的 passed gate。这是比手写字段更可信的真相源 |
| **Agent-routed 重定位范本** | `request_view_revision`（`phase-hitl2.md:78`，`enums.mjs:57`） | "Agent 读 rationale → 决定回哪个 phase → 不 restart"——recover 的最小形态可直接镜像它（无 node、无 gate） |
| **thin node + counter + gate 范本** | `phase-rerun.md`（整文件）+ `rerun_count`（`profile.mjs:19`）+ `gate-rerun-ready` | recover 若做成 node，结构照抄 rerun：thin 分析层 + 计数字段（`recover_count`）+ 确定性 gate + 每目标 hint section |
| **无限循环保护范本** | `convergeRepair`（`subagent-relay.mjs:929`）maxIterations=3 + `rerun_count_valid` 硬 cap | recover 自身也可能循环（recover 完又晕）。复用**硬 cap**（`recover_count < max`），**不用 stall detection**——rerun change 已定调跨 async turn 的 stall set 不可靠 |
| **新 node 接线 recipe** | `openspec/changes/rerun-incremental-node/tasks.md` | 7 触点：phase MD + gate 定义 + gate CLI + manifest.json + chain + enums.mjs CurrentGate + 依赖 doc。recover 若做成 node，**跳过 chain 触点**（§13） |
| **已确认的架构红线** | `agentic-workflow-mechanism.md:154,159` "MUST NOT reintroduce FSM / JS walker / cursor 驱动 node-to-node" | recover 必须 **Agent-invoked**（模型加载并遵循 `phase-recover.md`），不是 Engine 后台进程。即便引入 engine-written cursor，它只**持久化 phase identity**，不**驱动**路由 |

> **关键 gap**：re-enter / resume / checkpoint / rehydrate 机制在 engine 和 CLI grep 中**零命中**。本 TODO 是 greenfield，不会重复造轮子。但有一个相邻的已承认缺口：queue 层的 crash recovery（`guidelines/agentic-queue-mechanism.md:41` "Error recovery（stale claim / crash）❌ 未实现"）——那是**跨 process 恢复**，本 TODO 是**同 process 内的 phase identity 恢复**，层级不同，不要混。

## 关键设计问题（开放，留给 `/opsx:explore`）

### 1. recover 的形态：out-of-band 自愈 vs 独立 node

| | Shape A：out-of-band 自愈 | Shape B：`phase-recover.md` thin node |
|---|---|---|
| 镜像 | `request_view_revision` | `phase-rerun.md` |
| 新 node / 新 gate / 新 enum | 全无 | 有（node + gate + 可能 CurrentGate 加 `recover_ready`） |
| 成本 | 最低（纯 prose 指令 + Agent 自检） | 中（7 触点 recipe，但跳过 chain） |
| Guardrail | 弱（无 gate 证明"确实恢复对了"） | 强（gate 校验 bundle 完好、recover_count 未超限、被恢复 phase 前置产物存在） |
| 无限循环保护 | 只能靠 Agent 自律 | `recover_count_valid` 硬 cap（可强制） |
| 出口 | Agent 重载被恢复 phase | gate pass → chain 返回 `no_transition` → Agent 重载被恢复 phase |

**倾向**：先走 Shape A（最低成本，立即可用的 prose 救济），验证"Agent 自检 + 从 trace 重建"够不够用；不够再升级 Shape B（加 gate 强制 + 硬 cap）。这与 `final-output-eval` TODO 的"先 HITL2 前置步骤，需要再升级独立 phase"同一种演进思路。

### 2. "当前 phase" 的单一真相源是什么？（本 TODO 价值最大的一问）

三个候选：

- **(a) 信 `rb_status.json` 手写字段**——最简单，但正是 drift 的来源。模型晕的时候恰恰最可能把这两个字段写错，读错的字段定位出错的 phase。
- **(b) 从 `rb_trace.jsonl` 重建**——读最后一个 `gate_attempt` 的 passed gate，反推当前 phase。append-only、gate CLI 写入、Agent 难以伪造（anti-cheating §1）。**比手写字段可信**，但需要新 helper（`readLastPassedGate()`——目前 `readTraceEvents()` 只用来数子任务，`gate-helpers.mjs:296-307`）。
- **(c) 引入 Engine-written cursor 修根因**——让 Engine 在 gate pass 时**持久化** `last_completed_gate`（今天它算了 `next` 就丢）。recover 读这个 engine-owned 字段，而非 agent-owned 字段。

**(c) 是治本**：phase identity drift 的根因是"Engine 算了但不存、Agent 手写但不可信"。给 Engine 一个 cursor，drift 这条 failure mode 从根上消失，recover 只是顺带受益（读可信的 cursor 而非手写字段）。

**但 (c) 触碰架构红线附近**——`agentic-workflow-mechanism.md:159` 禁止 "cursor 驱动 node-to-node progression"。关键是边界：cursor **持久化 phase identity**（记录事实）是允许的，cursor **驱动路由**（Engine 自己决定下一步）是禁止的。本 TODO 要在 explore 里把这条边界画清楚。

### 3. 谁判定"模型跑糊涂了"？

- **Agent 自检**——每个 phase MD 加一条"若你不确定当前在哪个 phase，停止推进，走 recover 程序"。最简单，依赖 Agent 诚实。
- **Engine stall 检测**——但 `convergeRepair` 只在 subagent wave 内部，没有跨 phase 的"同一个 phase 反复进入"检测器。要做就得新加（scope 大）。
- **用户 HITL**——用户看 artifact 发现不对，手动触发 recover。

**倾向**：以 Agent 自检为主（成本低、符合"Agent 是唯一 driver"原则），HITL 触发为辅。Engine 自动检测留作 Non-Goal（scope 太大，且跨 async turn 不可靠——rerun change 已踩过坑）。

### 4. 无限循环保护

recover 完，模型可能又晕，又 recover。直接复用 rerun change 的定调：**硬 cap，不用 stall detection**。

```
recover_count（profile 新增，默认 0）每次 recover +1
gate rule: recover_count_valid → recover_count < max（默认 3）
超限 → terminal，告诉用户"已反复 recover N 次仍未稳定，建议开新 Deep Research 或人工介入"
```

### 5. recover gate 验证什么（仅 Shape B）

| Rule | Type | What |
|------|------|------|
| `bundle_structure_valid` | structural | wave0/seed-topics 需要的目录和文件存在（被恢复的 phase 有得跑） |
| `recover_count_valid` | field_value | `recover_count < max` |
| `recovered_phase_prereqs` | structural | 被恢复 phase 的前置 artifact 存在（不能恢复到一个还没条件的 phase） |
| `status_consistent` | field_value | `rb_status.json` 反映被恢复的 phase |

注意：recover gate **不验证"恢复对了"**（那是语义判断，anti-cheating §10/§12 的精神——gate 只做 deterministic structural check）。它只验证"bundle 完好、前置满足、没超限"。

## 实验范围

**Goals:**
- 定 recover 的触发者与触发条件（Agent 自检 / HITL）
- 选 Shape A 还是 B（含演进路径）
- 定"当前 phase"的真相源（手写字段 / trace 重建 / engine cursor）——这是治本 vs 治标的关键决策
- 若 Shape B：定 `phase-recover.md` 结构 + `gate-recover-ready` rule set + `recover_count` 字段 + 无限循环硬 cap
- recover 程序本身不破坏已有 artifacts（与 rerun 一致：MUST NOT 删除 reference/、artifacts/）

**Non-Goals:**
- 不替代 HITL（recover 是自愈，用户仍有最终决定权；超限或不确定时 escalate 给人）
- 不做跨 process crash recovery（那是 queue-tier `agentic-queue-mechanism.md` 已承认的缺口，层级不同）
- 不做全局跨 phase stall 检测（scope 太大，跨 async turn 不可靠）
- 不做"修复已经写错的内容"（recover 只重定位 + 复活 phase，不回滚 artifacts——那是另一类问题）

## 与 context-reground 的关系

```
        todo-context-reground（预防层）        todo-phase-recover（兜底层）
        proactive                               reactive
   ┌──────────────────────┐               ┌──────────────────────┐
   │ 周期性 reload 工程总图  │   减少触发频率   │ 模型已晕 → 从 ground  │
   │ + root question       │ ◄──────────── │ truth 重新定位 phase  │
   │ → 让模型保持清醒        │               │ → 复活，不继续幻觉      │
   └──────────────────────┘               └──────────────────────┘
```

- reground 让模型**别晕**；recover 让模型**晕了能救回来**。
- 理想上 regound 落地后，recover 的触发频率应显著下降——但 recover 仍需保留（regound 不能 100% 防住失焦）。
- 两者共享同一个 ground-truth 基座（`rb_status.json` + `rb_trace.jsonl` + `rb_profile.yaml` + 工程总图），设计时应对齐"真相源"选择。

## 下一步（低优先级，不抢当前跑道）

1. `/opsx:explore phase-recover` — 定：Shape A vs B（及演进）、真相源（手写 / trace / engine cursor，含 cursor 治本 vs 红线边界的权衡）、触发者、gate rule set
2. `/opsx:propose phase-recover` — 仅当选 Shape B，出 proposal + design + specs + tasks
3. 实施（Shape B 时）：`phase-recover.md` + `gate-recover-ready` 定义 + CLI + manifest + enums + 依赖 doc；**chain 触点跳过**（§13）
4. 与 `todo-context-reground.md` 联动：真相源选择要一致
