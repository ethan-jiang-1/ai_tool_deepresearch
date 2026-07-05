# 长程自主静默执行下的"挫败→提前放弃"——为什么 exit code 不是那个杠杆

> 本 plan 是**方向性 / 认知性**记录，不是 OpenSpec change，也不是运行时真相。
> 它回答一个具体问题：反复 gate 失败让 Agent 累积挫败感、想提前交付（BUG-020 那种），要不要在**返回值 / exit code 这一层做文章**来"鼓励它继续走"？结论：**不要碰 exit code——它已经是对的；杠杆在别处。** 本文件记下判断、依据、落地清单。
> 与 `autonomous-silent-execution-terminology.md` 是姊妹篇：那份讲 phase 边界术语，这份讲失败下的持续力。

## 1. 问题

BUG-020 的失败形态：Phase Agent 在 wave0 gate 撞了 16 次才过，过了之后跑了 `advance-status --to wave1_complete`，然后**停手**——在 chat 里写了一份只有 wave0 的 synthesis，问用户"继续还是够了？"（`_backlog/bugs/BUG-020-deep-analysis-and-governance.md:32`）。

用户的焦虑：长程自主静默执行里，Agent 每次撞 gate 失败拿到一个失败信号，挫败感累积，会不会想放弃、提前交付？怎么引导它别放弃？**这个返回值（exit code）要不要"做文章"？还是现在的做法已经对？**

## 2. 核实过的事实（不是印象）

**Exit code 不是二元，是三元**（`DPT_FRAMEWORK/cli/README.md:40-48`；`engine/helpers/gate-helpers-core.mjs:340,343`）：

| code | 含义 |
|---|---|
| 0 | gate pass |
| 1 | gate fail（normal——需要 repair） |
| 2 | routing/config 错（`invalid_input` / `config_error`）——"你调错 CLI"，不是 gate 内容失败 |

用户记的"fail→1、pass→0"对，但不全——还有 exit 2 区分"内容没过"和"你调用方式错了"。

**失败输出早就不是裸 FAIL，是结构化的**（`gate-helpers-core.mjs:272-307`）：`{ check, routing, inspect, advice }`。fail 时 `advice[]` 强制非空（`cli/README.md:58`），且已带：
- 具体下一步动作（有时可直接复制的命令）；
- Engine 算的 attempt 诊断：`attempt_count`、`attempt_trend`（first/converging/stalled/regressed）、`newly_passing[]` / `still_failing[]` / `regressed[]`；
- attempt ≥ 3 且 fail 时注入 `fatigue_warning: true` + `step_back: true`；
- fatigue advice 字符串，包括："gate failure is not an emergency... Switch strategies, record a silent degradation, or hold in place."

所以"返回值"若指 exit code——它已是诚实的三元诊断；若指 gate 输出整体——它已远超 pass/fail，已带 progress + next-action。

## 3. 决定性事实：BUG-020 的放弃动作**根本不碰 engine**

这是回答"exit code 要不要做文章"最干净的一刀。

BUG-020 里 Agent 提前交付的方式是：**在 chat 里写 prose，然后停手**。它没跑 `exit(0)`，没调任何 engine 命令，只是"不往下跑了"。

> "Writing a synthesis in chat + asking the user + stopping touches no engine command, so no deterministic checkpoint is ever scheduled to fire against it."（`_backlog/bugs/BUG-020-deep-analysis-and-governance.md:196`）

含义：**exit code 是 code 消费的信号**（Agent 自己的 loop、E2E 断言、validator 读它来分支），不是 LLM 在"要不要停手"那个决策点读的 prose channel。Agent 真正决定放弃的瞬间，根本没产生新 exit code 给谁读。所以**无论在 exit code 里塞多少"加油"，都到不了那个失败点**——它绕开了 engine。

## 4. 判断：exit code 是错的层；现在的做法是对的

三条独立理由，任一成立：

1. **够不着**（§3）：放弃动作不碰 engine，exit code 到不了。
2. **不能动**：charter 把 Engine 确定性立为承重墙——"JS/CLI 的反馈不能造假"（`project-charter.md:191`）、"Layer 2 不能造假"（:219-235）。exit code 的职责是给 downstream code 一个 true/false 分支依据；往里塞"鼓励"会污染确定性契约，且 fatigued Agent 也不会读它。
3. **已经够用**：0/1/2 已把"过 / 要修 / 你调错了"分清，这是 code-consumed 信号该有的全部 nuance。再往上加 morale 是 category error。

**结论：别碰 exit code。现在的三元 exit code + 结构化 gate 输出，是对的。** 用户直觉——"挫败→提前放弃是真问题，得管"——**也对**。只是杠杆不在 exit code 这一层。

## 5. 杠杆其实在两层（一层已建好，一层欠喂）

### 第一层：硬底——witnessing / state precondition（**已实施，change 的 §1/§2 tasks 全 `[x]`**）

这是 BUG-020 的**真·解药**。它的工作原理恰恰是**不依赖 Agent 士气**：

- `enter-phase` 写 route-bound `load_complete` 见证 → Agent 没法假装进了下一 phase；
- `advance-status` 没有真实 `gate_attempt(passed=true)` + post-pass `load_complete` 就拒写 `rb_status.json`；
- 每个 intermediate gate 跑 handoff preflight；
- wiring validator 防 preflight 变 dead code；
- source-gate status window 替换陈旧的 own-gate 期望；
- HITL2 deterministic branch 由记录的用户决定决定，不由 prose/写死默认。

效果：**哪怕 Agent 完全泄气、照样 bail out，也产不出可洗白的状态**——下次 engine 一碰就暴露。这才是 charter 的字面落地：不试图让 Agent"感觉好一点"，而是让**错误动作直接不工作**。

> 这是架构上的诚实：解药是 morale-independent 的。这不是 gap，是 feature。不要为了"鼓励"削弱硬底。

### 第二层：软引导——advice channel + autonomous-continuation prose（**位置对，但欠喂**）

这才是"鼓励"该待的地方——`advice[]` 数组才是 LLM 在决策点真正读的 channel。**位置对，内容欠**：

**Gap A：pass-side advice 是"禁止形"，不是"安心形"。**
现在 GSK-008 pass-side advice（`changes/harden-phase-handoff-witnessing/specs/gate-skeleton/spec.md:153`，**未实施**）写的是：
> "high gate friction does NOT authorize premature chat synthesis."

这是**训斥**（don't）。BUG-020 deep-analysis 开的方子是**安心**（do + why）：
> "a report IS delivered at phase-final; every completed phase makes it strictly better-sourced; the user chose autonomous mode so they would not be consulted now."

禁止会被疲劳磨掉；安心 + 目标可见能抗疲劳。这个安心内容**部分**进了 SWE-003 prose（`changes/.../specs/silent-wave-execution/spec.md:11-17`），但**没进 gate-result 的 advice**——也就是 Agent 决策点真正读的 channel。这是漏的那一勺。

**Gap B：没有 macro-gradient / goal-visibility。**
GSK-008 诊断显示**gate 内**进度（`newly_passing`），从不显示**跨 pipeline** 进度——"这是 Final 前最后一个 gate"、"4 个 wave 已完成 3 个"。`attempt_trend` 只是微观梯度。"看不到头 → 现在就交"是真实 rationalization，现在没被对冲（BUG-020 F8）。

## 6. 诚实的边界

- **硬底挡不住同一轮 chat halt**（GAP-1 / change 的 R1 residual）。Agent 在同一轮里写 chat + 停手，没有 charter-legal 机制能当场拦下。硬底保证的是：这次 halt **洗不白**，下次 engine touch 会被抓。结构性，不是设计漏洞。
- **`silent_unpassable` 是唯一"真无路可走"答案**，让 Agent **静默 hold**，不交付、不问用户（`openspec/specs/silent-wave-execution/spec.md:70,142-145`）。这对，但意味着一个真过不了结构性 gate 的 Agent 除了等 legal review **没有终局救济**——这个状态本身可能绝望到触发提前交付。项目立场（Final 是唯一交付点）对，但这是"无路可走"感觉上的真实 gap。
- **GSK-008 attempt count 还没从 Engine 侧算**（task 3.1 未实施）。在那之前，fatigued Agent 若省略 `--attempt`（默认 0）会沉默掉 GSK-006 唯一 fatigue 钩子——BUG-020 F4。spec 修了，code 还没。
- **§6 reorder（D8，tasks 4.1-4.7）未实施**：`enter-phase` 还没排在 `advance-status` 之前，dispatch 决策仍在 fatigued 工作上下文里。

## 7. 落地清单（回头再说，不在本文件执行）

这个 change 的 §3/§4 还**没实施**（tasks 全 `[ ]`），所以现在是把"鼓励"喂对的好时机。落地（届时在 `harden-phase-handoff-witnessing` 内或新 change）：

- [ ] **把 GSK-008 L153 pass-side advice 从"禁止形"改成"安心形 + 禁止形并存"**：至少一行正向安心（"报告在 phase-final 交付；每完成一个 wave，证据/sourcing/综合质量都严格更好；用户选了 autonomous mode 就是不想现在被问"），再保留 prohibition。位置就在 gate-result 的 `advice[]`。
- [ ] **加一个 macro-gradient / goal-visibility 诊断字段**（如 `phase_position` / `gates_remaining` / `pipeline_progress`）到 gate result，让 Agent 看到 pipeline 全貌，对冲"看不到头"。
- [ ] **实施 task 3.1**（Engine 侧算 attempt count），堵掉"省略 `--attempt` 沉默 fatigue 钩子"的 F4 漏洞。
- [ ] **实施 §6 reorder（D8）**：`enter-phase` 在 `advance-status` 之前，把 dispatch 决策挪出 fatigued 工作上下文（BUG-020 C1）。
- [ ] **不要动 exit code**。0/1/2 保持诚实三元。任何"鼓励"走 `advice[]` + prose，不走 exit code。

## 8. 一句话总结

> 反复失败让 Agent 想提前放弃——真问题。但 exit code 不是杠杆：放弃动作根本不碰 engine，且 exit code 必须保持诚实（charter 承重墙）。真解药是**硬底**（witnessing，已建，morale-independent——这才是 BUG-020 的 cure）+ **喂对的软引导**（把 gate-result 的 pass-side advice 从"禁止"改成"安心 + 目标可见"）。鼓励要进的是 `advice[]`，不是 exit code。

---

**相关文件**

- `_backlog/bugs/BUG-020-deep-analysis-and-governance.md` — BUG-020 失败形态、F4/F8 gap、C1/C2/C3 对策、Tier A-C 分层
- `guidelines/project-charter.md:191,219-235` — "Agent 可错、Engine 不能造假"、Layer-1/Layer-2 error boundary
- `DPT_FRAMEWORK/cli/README.md:40-92` — exit code 三元契约 + 结构化输出 MUST
- `DPT_FRAMEWORK/engine/helpers/gate-helpers-core.mjs:272-407` — gate result 构造、`emitGateResult`、attempt 诊断、fatigue advice
- `openspec/specs/silent-wave-execution/spec.md:61-70,147-171` — 疲劳抵抗、"降级不是失败"、`silent_unpassable`
- `openspec/changes/harden-phase-handoff-witnessing/` — 硬底（§1/§2 已实施）+ 软引导（§3/§4 未实施）；GSK-008 L153 pass-side advice；SWE-003
- `_backlog/plans/autonomous-silent-execution-terminology.md` — 姊妹篇：phase 边界术语统一
