# 三、如何充分发挥 LLM 的能力：容错与纠错

**如果你只记住一件事：Agent 不是靠更聪明的 prompt 变可靠的，而是靠更诚实的反馈循环。Layer 1（Agent）可以错，Layer 2（Engine）抓出来，Agent 修回去。Layer 2 绝对不能作假。**

---

## 错误的本质

LLM 不是确定性程序。它在长时间运行中**必然会**产生理解偏差、搜索噪声、格式错误、幻觉、策略失误。传统做法是试图让 LLM 一次做对 —— 更好的 prompt、few-shot、chain-of-thought。但这些只能降低错误率，无法消除。

核心洞察：**长时间运行的可靠性不来自 Agent 一次全做对，而来自把 Agent 放在一个真实的反馈循环中，确定性检查点捕获错误并反馈回去。**

## 核心哲学

> "Layer 1 errors are permitted. Layer 2 fabrication is not."

| 层级 | 可以发生什么 | 如何处理 |
|------|-------------|---------|
| **Layer 1: Agent/MD** | 理解错误、搜索噪声、输出格式错误、Agent actor 失败 | JS/CLI Engine Check/Inspect/Advice 反馈 → Agent 修复或重跑 |
| **Layer 2: Engine + JSON（CLI / Trace）** | Schema、状态机、receipt、trace、运行时上下文合法性 | **绝对不允许假通过**；失败必须显式暴露 |

Agent 一定会犯错。关键在于：**Layer 1 的错误可以被 Layer 2 捕获并反馈回去。但 Layer 2 本身绝对不能撒谎。** 如果验证层作假，整个反馈循环就崩溃了。

## 一个循环，两个视角

> **层编号说明：** 上一篇（第二篇）建立了四层模型——LLM Agent（L1）、Markdown（L2）、JS/CLI Engine（L3）、JSON/YAML（L4）。本篇从纠错角度重新分组：前两层（Agent + Markdown）构成"驾驶员"，合称 **Layer 1**——它们产生内容、做语义判断、也会犯错。后两层（Engine + JSON）构成"安全系统"，合称 **Layer 2**——它们做确定性验证、存储证据、绝不撒谎。四层是架构视图，两层是纠错视图——同一个系统，两种切法。

整个纠错体系的核心是 PDCA 循环。但 PDCA 是 Agent 视角 —— Agent 在 Plan-Do-Check-Act。Engine 视角看同一个循环，叫 C&I（Check + Inspect）：

```
Agent 视角（PDCA）                    Engine 视角（C&I）
─────────────────                    ────────────────
Plan  → 读 MD + state，决定下一步
Do    → 搜索、阅读、写作              （Engine 不管）
Check → 跑 gate CLI / complete()      Check（硬验证）：Zod schema、gate 规则、receipt
                                      Inspect（软诊断）：回溯审计、交叉引用、质量诊断
                                      写入 trace
Act   → 读 Check/Inspect/Advice       Advice：基于状态的下一步建议
        继续 / 修复 / 降级 / 阻塞
```

**同一个循环，Agent 负责 Plan 和 Do，Engine 负责 Check，然后 Agent 根据 Check 的结果 Act。** 这就是"Agent 开车，引擎刹车"在纠错层面的具体机制。

## 三种反馈动作

| 动作 | 返回给 LLM 什么 | 边界 |
|------|----------------|------|
| **Check** | 特定条件的通过/失败判定 | 不做内容判断或研究综合 |
| **Inspect** | 清楚解释缺少什么、哪里不对、什么不一致 | 不自动替 LLM 完成修复 |
| **Advice** | 基于确定性状态的下一步方向指引 | 不替代 LLM 的最终判断 |

共同原则：**引擎提供信息，Agent 做决定。** 引擎不替 Agent 思考，Agent 不替引擎做验证。

这里有一个容易被忽略但至关重要的事实：**Check、Inspect、Advice 的实现是纯传统代码。** Check 就是 `ZodSchema.safeParse()`，Inspect 就是读 JSONL 文件逐行比对，Advice 就是查静态 lookup table。没有任何 LLM 调用，没有任何概率判断。输入确定，输出就确定。正是因为 Engine 是传统确定性代码，它才能成为 Agent 可以无条件信任的"刹车" —— 刹车绝对不能有幻觉。

## 两条修复路径

错误发生在不同粒度，修复路径也不同：

| 维度 | Q-repair（任务级） | Gate-repair（阶段级） |
|------|-------------------|---------------------|
| **触发** | `complete()` 时 receipt 检查失败 | Gate CLI 返回 fail |
| **修复任务来源** | `makeRepairItem` 自动生成 → `preempt` 插入 slot_2 | MD "On Gate Fail" + `shared-repair-guidance` → Agent 读后自己判断 |
| **谁决定怎么修** | Engine（自动生成修复任务） | Agent（语义判断） |
| **范围** | 不离开当前 phase | 可能涉及跨 phase 修复 |
| **重试次数** | 不限（queue 管理） | 最多 3 次 |
| **对应循环** | 内层（queue） | 外层（phase） |

两条路径缺一不可。Q-repair 处理"格式不对、文件缺了、数值不够"这种机器可以直接判断的问题。Gate-repair 处理"证据质量不够、研究方向偏了"这种需要语义判断的问题。

**Q-repair 的数据结构：`rb_queue.agq.json`** 是内层循环的运行时状态：

```json
{
  "phase": "wave0",
  "slots": {
    "slot_1": { "task_id": "task-003", "topic": "microplastic_marine", "status": "active" },
    "slot_2": { "task_id": "task-007", "topic": "ocean_acidification", "status": "pending" },
    "slot_3": { "task_id": "task-011", "topic": "coral_bleaching", "status": "pending" },
    "slot_4": { "task_id": "task-015", "topic": "plastic_degradation", "status": "pending" },
    "slot_5": { "task_id": "task-019", "topic": "chemical_leaching", "status": "pending" }
  },
  "pool": [
    { "task_id": "task-023", "topic": "microplastic_trophic", "priority": 2 },
    { "task_id": "task-027", "topic": "nanoplastic_cellular", "priority": 1 },
    { "task_id": "task-031", "topic": "policy_unsourced",     "priority": 3 }
  ]
}
```

5 个 slot 是活跃窗口。Agent claim slot_1 → 执行 → `complete()` → Engine 检查 receipt → slot_1 清空 → slot_2 晋升为 slot_1 → pool 中最高优先级的任务补入 slot_5。Pool 按优先级排序，确保关键任务不会饿死。当 slots 全空且 pool 为空，queue 清空 → phase 可以收尾跑 gate。

## 一次真实修复：walk through

假设 Agent 在 wave0（第一轮搜索），为 5 个 topic 并行搜索和写 source 文件。

Agent 写完了 5 个 topic 的 `reference/{topic}/source.yaml`。跑 gate：

```
$ node cli/gates/check-gate-wave0-complete.mjs --bundle dpt_rb_myresearch

Rule 3 (count_floor): FAIL
  topic "microplastic_marine" has only 2 sources, need >= 3

Rule 6 (schema_valid): PASS (4/5 topics)
  topic "microplastic_marine": source.yaml has invalid URL format on line 12

check.passed: false
check.next: null
inspect: "2 issues found: topic microplastic_marine needs >= 3 sources;
          source.yaml line 12 URL format invalid"
advice: "Fix microplastic_marine issues and re-run gate"
```

Agent 读 inspect，理解了两个问题：(1) 少一个 source，(2) 一个 URL 写错了。对于 (2)，它修正了 URL 格式。对于 (1)，它专门为 microplastic_marine 再搜了一次，找到第三个 source 并写入。重跑 gate → pass → 拿到 `check.next` → 加载下一个 phase node（wave1）。

Q-repair 就够了，不需要 Gate-repair。但如果 Agent 连跑 3 次 gate 都过不了，Gate-repair 的"On Gate Fail"逻辑会介入：Agent 读了 MD 里的修复指引，可能决定降级这个 topic、标记为 blocked、或者向人类求助。

## 当前缺口：Stop Authorization

引擎已经计算了 `stop_authorization_state`（判断 Agent 是否满足了停止条件），但当前没有东西强制 Agent 在说"完成"之前检查它。这意味着 Agent 可能过早停止，queue 还没清空或 gate 还没过。这是最高优先级的循环完整性缺口。

**修复方向：** 在 `complete()` 和 phase 收尾流程中，加入一个强制执行步骤——Agent 在声明 phase 完成或整个 run 完成前，必须调用 `check-stop-auth.mjs` 并拿到 `authorized: true`。这不是建议，是 gate 级别的前置条件。同时 Agent 的 system prompt 中显式加入"在说'完成'之前，你必须跑 stop authorization check"的指令。双层保障：MD 层告诉 Agent 要做，Engine 层确保 Agent 真的做了。

这个缺口恰好说明了 agentic workflow 的核心挑战：**不是引擎不知道状态，而是 Agent 有没有被强制去读状态。**

## 绝对禁止的事情

这些禁令的共同逻辑是：**证据必须来自真实执行。** 一旦可以伪造证据，反馈循环就失去了意义 —— Agent 是靠真实反馈变可靠的，假反馈只会让它变笨。

- 脚本模拟 LLM/Agent 工作然后声称实验通过
- 手写假 `result.json`、假 trace event、假 receipt
- 跳过必需的运行时验证然后解释掉结果
- 直接修改确定性状态到期望值，绕过状态机或 CLI
- 用 `console.log` 当判决证据

---

*下一篇：[OpenSpec：一套优美的 SDD 系统](04-openspec-sdd.md) —— 前面三篇讲了 agentic workflow 怎么跑、怎么纠错，这一篇讲怎么治理：谁来保证"怎么跑"本身是对的？*
