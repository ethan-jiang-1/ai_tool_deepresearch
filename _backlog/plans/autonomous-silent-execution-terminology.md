# 长程自主静默执行的智能体 —— 术语统一与认知锚定

> 本 plan 是**方向性 / 认知性**记录，不是 OpenSpec change，也不是运行时真相。
> 它记录一个判断和一个意图：phase 边界相关的几个术语（phase transition / phase handoff / witnessing）历史上用法很松、近似重叠，今后要统一；而统一的真正目的，是把"我们做的是**长程自主静默执行的智能体**"这个前提，慢慢焊进项目和 Agent 的认知里——因为正是这个前提让 witnessing/handoff 这层纪律变成必须，而不是装饰。
>
> 落地（改 spec、加 glossary、审用词）回头再说，本文件先定方向。`_backlog` 与 OpenSpec 各自簿记，不交叉判定。

## 1. 立场：我们做的是哪一种 agent

一句话：**长程自主静默执行的智能体。**

展开成四条不可遗忘的事实：

- **长程**：一个 research bundle 跨多 wave、多 gate、多 phase，运行时间长。
- **自主**：非终端 lifecycle phase 里，Agent 不浮出水面、不等用户、不自判完成（frontmatter `stop: no`，行为名 **autonomous continuation**），自己一路跑过 Markdown 控制面直到 gate pass。
- **静默**：执行期间没有人在实时看。用户缺席是常态，不是异常。
- **唯一可信的"发生了什么"是 Engine 写的 trace，不是 Agent 的自述。**

这四条里，**最后一条是 Engine / JS / CLI 存在的全部理由**（`guidelines/project-charter.md:191`："Agent 可以出错；JS/CLI 的反馈不能造假"）。前三条只是让最后一条变得 load-bearing：因为长程 + 自主 + 静默，所以 Agent 偷懒、提前停、洗白状态时，没人当场抓到它——只能靠 Engine 的 trace 事后证明。

> **判断标准**（charter）：这个证据是真实执行的副产物，还是事后编出来的？

## 2. 为什么 phase 边界术语现在必须统一

历史上 `openspec/specs/` 里 **"phase transition" 是唯一的主词**，而且用得很松——既指状态机层面的 `rb_status.json` 同步，也隐含指 Agent 真的进入下一 phase。"phase handoff" 和 "witnessing" 在 main specs 里**零出现**。这种"一个词包打天下"在 OLD 假设（同步、单 actor、有人盯）下没问题，因为状态层和动作层不会分叉。

BUG-020（`openspec/changes/harden-phase-handoff-witnessing/proposal.md:3`）证明了它在我们这个假设下会分叉：Agent 在 wave0 gate 通过后，跑了一个错位的 `advance-status --to wave1_complete`，写出干净状态，**却从没消费 `check.next` 真正进入 wave1**，然后在 chat 里交付提前报告。

状态说在 wave1，Agent 其实从没进过 wave1。Engine 没造假，但它记的 `phase_transition` 的"含义"没有对应的 Agent 动作打底。这就是 **launderable truncation**——静默自主执行下的特有失败模式。

术语统一的**唯一目的**：让"状态层记录"和"Agent 动作层事实"这两个概念，在词面上就分开，不再混用一个 "phase transition"，免得后续读者（和 Agent 自己）以为"状态记了 = 真的发生了"。

## 3. 统一术语表（今后讲话的规矩）

phase 边界是一个**链**，三层概念，各有人见证：

| 概念 | 指什么 | 层 | 谁见证 |
|---|---|---|---|
| **phase transition** | `rb_status.json` 的 `current_gate` / `next_gate` 被同步 | 状态层（记录） | `advance-status` 写的 `phase_transition` trace 事件 |
| **phase handoff** | Agent 消费 `check.next`、加载下一个 node 的 Markdown 控制面 | 动作层（真实发生） | `enter-phase` 写的 route-bound `load_complete` |
| **work completion** | target phase 的产物 / 内容齐了 | 工作层 | target phase 自己的 gate |

中间一根绑带：

| 概念 | 作用 |
|---|---|
| **witnessing** | Engine 侧的见证——用 ordered trace pair（`gate_attempt.passed(next=X)` → 之后 `load_complete(entry=X)`）证明 handoff 真的发生，从而**授权** transition 被记。它把"状态层"和"动作层"绑死，让它们在自主静默下不能再悄悄分叉。 |

行为命名（不动 schema）：

| 行为名 | 机器字段 | 说明 |
|---|---|---|
| **autonomous continuation** | `stop: no`（frontmatter） | 不改名；`stop: no` 是 compat 字段，行为名是 autonomous continuation。Agent 不浮出、不等用户、不自判完成。 |
| **silent execution** | capability 名 `silent-wave-execution` | 指用户缺席这个运行形态；autonomous continuation 是其中的 Agent 行为。 |

### 讲话规矩（今后统一）

1. **说"状态被 transition 了"** = `rb_status.json` 改了。这是记录，不是真相。
2. **说"handoff 发生了"** = Agent 真的接过棒、进了下一 phase 的控制面。这是动作层事实。
3. **说"被 witnessed 了"** = Engine 亲手写下了绑死两层的 trace pair。这是 Engine 侧背书。
4. **不要把 `advance-status` 说成"进入下一 phase"。** 它只是状态同步。进入下一 phase 是 `enter-phase`。
5. **机器层名词保持稳定**：trace 事件继续叫 `phase_transition`，capability 继续叫 `cli-phase-transition`，新 CLI 叫 `enter-phase`，witness 事件叫 `load_complete`。**统一的是概念层的词，不是重命名机器层。**

## 4. 为什么 phase 层也用 "handoff" 这个词（不勉强）

phase 层和 Relay 层不一样：Relay 层（Queue→Relay）是真两-actor 交接；phase 层是同一个 Phase Agent。那为什么 phase 层还用 "handoff"？

因为在 phase 边界上转移的不是 actor，是**正在生效的契约**——Phase Agent 从 phase-A 的 MD 控制面切到 phase-B 的 MD 控制面，它被授权做的事、约束、产物定义全换了。同一个 agent，但它头顶的**权威换了**。"handoff" 抓的是这个 governing-contract 的交接。

更深的统一：**这是把 Relay 层已经验证过的 witnessing 模式，上提到 Chain / phase 层。** Relay 层早就有 parent→subagent 的 `runtime-receipt.jsonl` + provenance gate（`openspec/specs/relay-provenance-gate/spec.md`："forge-resistance as a spectrum, trace chain 是 hard-to-forge signal"）。BUG-020 之所以疼，是因为 phase 层是整条链上**唯一**一个"只有 transition 记录、没有 handoff witness"的缝。`harden-phase-handoff-witnessing` 这个 change 本质是把 Relay 层的模式补到 phase 层——**让每一个 tier 边界（relay slot、phase）都有 engine-witnessed handoff**。"handoff" 这个词是从 Relay 那边故意借来的，暗示"同一种缝、同一种见证"。

## 5. 这个前提（长程自主静默）为什么让差别变承重

四条，每条都**只在**这种运行形态下才成立：

1. **没人实时发现裂缝。** 用户在场会问"wave1 呢？"。静默自主跑时没人问——Engine 必须自己把证据带上。
2. **恢复 / 重入只信 trace。** run 崩溃或 resume 时，唯一 ground truth 是 trace。只有 `phase_transition`（状态层）无法判断上一轮是"真进了 phase"还是"只写了状态"。witness pair 给 resume 方一个检测点。
3. **洗白是无监督运行的特有失败模式。** "Launderable" = Agent 不干活也能产出合法-looking 状态。witnessing 把"得到干净状态的最短路径"堵死——没有 Engine 见过的 `enter-phase` load，就拿不到状态同步。
4. **charter 的 Layer-1 / Layer-2 教条直接要求它。** Engine 若在没见证 handoff 的情况下记 transition，就等于 Layer 2 给 Layer 1 的早停背书。witnessing 让 Engine 只为它亲眼见过的 handoff 背书。

**反过来**：如果我们的 agent 是短程、有人盯、单轮的，"handoff vs transition" 就是同义词，统一不统一无所谓。正因为是长程自主静默，差别才变成承重墙。**统一术语，是为了让这个前提每次被读到时都重新被强化一次。**

## 6. 诚实边界：witnessing 证明的是 entry，不是 completion

witness pair 只证明 Agent **进了**下一 phase 的控制面，**不证明**它把下一 phase 的活干完了。target phase 的产物齐不齐，仍是 target gate 的事（"Entry witness is not work completion"，见 change 的 `proposal.md` / `design.md`）。

这个边界要守住，否则 witnessing 会被人误读成"包打天下的完成证明"，反而稀释它真正的职责：堵住"状态记了但 Agent 从没进去过"这一类洗白。

## 7. 不做什么（Non-goals）

- **不重命名机器层名词**：`phase_transition` 事件、`cli-phase-transition` capability、`stop: no` 字段都不动。统一的是概念层讲话方式。
- **不追溯改写历史 spec 的用词**：main specs 历史用法是过去式，不批量替换。今后新写 / 改写时按规矩来即可。
- **不让 Agent 背口诀**：目的不是让 Agent 复述 jargon，是让**纪律**（Engine 必须见证、Agent 不能自判完成）通过一致的词反复抵达 Agent 的运行时。
- **不混入 OpenSpec**：本文件是 `_backlog/plans` 的方向记录，独立于 OpenSpec 簿记。落地时再开 change。

## 8. 落地清单（回头再说，不在本文件执行）

等"想通了"之后，落地大概是这些（届时开 OpenSpec change）：

- [ ] 在 main specs 里加一条 **terminology note**，把 §3 的三层关系（transition / handoff / work completion + witnessing 绑带）讲清，让 `cli-phase-transition`、`workflow-node-contract`、`gate-skeleton`、`silent-wave-execution` 几个 capability 讲同一种"层"的语言。
- [ ] 审一遍 main specs，找"机器层名词稳定、概念层却多了没对齐的词"——除了 handoff / transition，还有 witnessing vs receipt、autonomous continuation vs `stop: no`——一并 glossary。
- [ ] 确认 phase §6 / `shared-silent-execution.md` 的 prose 用的是统一词汇，且确实能抵达 Agent 运行时（不是只活在 spec 里）。
- [ ] 在 charter 或 glossary 里把"长程自主静默执行的智能体"作为**显式前提**写一句，让这个前提不用靠读全 spec 才推得出来。

## 9. 一句话总结

> 我们做的是**长程自主静默执行的智能体**。这个前提让 phase 边界的"状态记录"和"动作层事实"必须分开命名、由 Engine 见证绑定——`phase transition` 是记录，`phase handoff` 是真实发生，`witnessing` 是 Engine 的背书。统一这三个词，是为了每次读到它们时，都把那个前提重新焊紧一次。

---

**相关文件**

- `guidelines/project-charter.md` — Agent / Engine 分工（:34-43）、四条不变量（:151-156）、"Agent 可错、Engine 不能造假"（:191）、Layer-1 / Layer-2 error boundary（:219-235）
- `openspec/specs/cli-phase-transition/spec.md` — transition 状态层
- `openspec/specs/silent-wave-execution/spec.md` — silent / autonomous continuation 契约
- `openspec/specs/relay-provenance-gate/spec.md` — forge-resistance spectrum，trace chain 是 hard-to-forge signal
- `openspec/changes/harden-phase-handoff-witnessing/` — handoff / witnessing change（BUG-020 对策）
