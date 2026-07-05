# CLI Exit-Code 契约——从隐式到显式（且先承认它不统一）

> 本 plan 是**方向性 / 认知性**记录，不是 OpenSpec change，也不是运行时真相。
> 它起于一个观察：项目维护者本人在被问起时都不确定"exit code 是二元还是三元"——这是隐式知识的代价。本文件核实了契约到底定义在哪、统不统一，给出"如何显性化"的判断，并把 **COMMANDS.md 表 + CEC-001 spec 的 draft 内容**留作**给 framework/OpenSpec 那侧 agent 的对齐基准**。本 plan 作者只动 `_backlog/plans/`，不越界改 COMMANDS.md / specs / 代码。
> 与 `autonomous-silent-execution-terminology.md`、`agent-persistence-and-exit-codes.md` 是同一系列的第三份——都是把长程自主静默执行下的隐式知识显性化。

## 1. 起点：一个发现

维护者被问"我们 exit code 怎么定义的"时，答不准。三个 code 在用，但说不清定义在哪、是否全局统一。

这不是小事：exit code 是 **load-bearing 契约**——Agent loop、E2E 断言、validator 都按它分支。连维护者都不知道，说明它**埋了**。

## 2. 核实过的事实（不是印象）

### 2a. 定义在哪？——只有一处，且埋在子 README

整个仓库把 exit-code 契约**写明白**的，只有 `DPT_FRAMEWORK/cli/README.md:40-48` 那张表。顶层文档（`COMMANDS.md` / `RUN.md` / `README.md` / `CHANGELOG.md`）**零提及**（grep 过）。specs 里有 ~10 处散落的行为断言（`gate-skeleton:52,72-80`、`content-delivery-gate-implementation:90`、`cli-inspect-output-conventions:23`、`runtime-reentry-debuggability:80,101,117`、`logging-conventions:139`、`queue-input-validation:39`、`cmd-bundle-instantiation:50,54,61`、`requirement-traceability:148` …），**各说各的，没有任何一处 normative 地、一次性地定义系统级契约**。

### 2b. 统一吗？——不统一，三套约定并存

| 类别 | CLIs | 约定 | 决策点 |
|---|---|---|---|
| **A. Gate 类（11 个）** | 所有 `check-gate-*.mjs` | 三元 0/1/2，共享一个 helper | `emitGateResult` @ `engine/helpers/gate-helpers-core.mjs:323-344`（2 = routing/config 错） |
| **B. 操作/工具类（~13 个）** | `advance-status`、`enter-phase`、`operate-queue`、`validate-*`、`inspect-bundle`、`instantiate-run-bundle`、`drive-relay-slot`、`apply-research-style`… | 二元 0/1，各自 `process.exit`，无共享 helper | 散在每个文件 |
| **C. 异类** | 见下 | — | — |

**异类（"不统一"的硬证据）：**
- **`log-event.mjs`——永远 exit 0，连报错也是 0**。by design（"trace write failure must not block agent"，`logging-conventions:139`）。是显式例外，但藏在代码注释里，不在契约表里。
- **`check-reentry.mjs`——自己重实现三元 0/1/2**（`emitAndExit()` @ `:60-63`），**不走 `emitGateResult`**——靠复制，不靠共享。
- **`inspect-wave{0,1,2}-output.mjs`——code 2 = 参数错（missing `--bundle`）**。但 gate 类 code 2 = routing/config 错。**同一个数字，两种语义**——最锐的碎片信号。
- **`validate-workflow-package.mjs`——header 文档写了 code 2，代码从来不 emit 2**（只有 `:33` exit 0、`:36` exit 1）。**doc/code 各说各话。**

## 3. 判断：要显性化，但第一件事不是"写文档"，是"先决定正典"

直觉对：**这是隐式知识，必须显性化**。但有个前置陷阱——**你现在没法写一张"系统级 exit-code 契约表"，因为系统实际有三套**。硬写一张，要么给碎片化背书（如实写三类），要么写一个 canonical 契约然后制造 doc/code 裂缝。两条都不诚实。

诚实的显性化要同时做两件事：
1. **声明 canonical 契约**（最自然是 gate 类那套：0=pass / 1=fail-repairable / 2=config-or-invocation 错），然后**如实标注例外**。
2. **放到两个地方**：人类/Agent 会看的顶层文档（`COMMANDS.md`）+ normative spec（项目把确定性契约放 specs，不放散文）。

**而且——exit code 本身不是"鼓励"的杠杆**（见 `agent-persistence-and-exit-codes.md`）：放弃动作不碰 engine，且 exit code 必须保持诚实三态。显性化是为了**可发现 + 可对齐**，不是为了在 code 里塞士气。

## 4. 在哪一层做（以及不在哪一层）

| 层 | 做不做 | 谁的活 |
|---|---|---|
| exit code 数值 | **不动**——保持诚实 0/1/2 | 无人动（charter 承重墙） |
| caller-facing 顶层文档（`COMMANDS.md` 表） | **做**——堵"连维护者都不知道"的洞 | framework 侧 agent（apply 时） |
| normative spec（新 capability `cli-exit-code-conventions` / CEC-001） | **做**——一次性定义契约，如实标现状 | OpenSpec 侧 agent（开 change） |
| 代码统一（shared exit helper、修裂缝、定 code-2 语义） | **后续**——以显性化后的契约为基准 | future change |

## 5. 给 framework/OpenSpec 侧 agent 的对齐基准（draft 内容，可直接 lift）

> 本节是**草稿**，供负责 framework/OpenSpec 的 agent 当起点。本 plan 作者只动 `_backlog/plans/`，不会自己去 apply 这些。

### 5.1 `COMMANDS.md` 的 caller-facing 表（draft）

顶部、`> **最快触发**` callout 之后、`## 实例化与开始 Research` 之前，插入：

```markdown
## Exit Code 契约（所有 CLI 通用）

> 全局约定。框架 CLI 用这三个 exit code；具体细节走 stdout 结构化 JSON（gate 类 `{ check, routing, inspect, advice }`，其它 `{ status, reason, advice }`），exit code 只承载 pass/fail/config 三态。**永远读 stdout JSON 的 `check.passed` / `advice[]` 做决策；exit code 只用于 Agent loop 分支与 E2E/脚本断言——主调用方是 Agent，不是人。**

| code | 含义 | 何时出现 |
|------|------|----------|
| 0 | pass | 命令成功完成 |
| 1 | fail（normal，可修复） | gate 规则未过 / 校验失败 / 业务错误——读 stdout 的 `advice[]` 修复后重试 |
| 2 | config / invocation 错 | routing 契约错（`invalid_input` / `config_error`）或调用方式错（缺 `--bundle` 等）——"你调错了"，不是内容失败 |

**现状（如实标注，待统一）**：
- **Gate 类（11 个 `check-gate-*.mjs`）**：完整三元，走共享 `emitGateResult`（`engine/helpers/gate-helpers-core.mjs`）。code 2 = routing/config 错。
- **操作/工具类**（`advance-status`、`enter-phase`、`operate-queue`、`validate-*`、`inspect-bundle`、`instantiate-run-bundle`、`drive-relay-slot`、`apply-research-style` 等）：二元 0/1，各自 `process.exit`，无共享 helper。
- **`log-event.mjs`——例外**：永远 exit 0（含报错），by design：trace 写入失败不得阻塞 agent flow（见 `logging-conventions` spec）。
- **`inspect-wave{0,1,2}-output.mjs`、`check-reentry.mjs`**：emit code 2 = **参数/调用错**——语义接近 config 错但触发条件不同，读时按"调用方出错"理解。
- **`validate-workflow-package.mjs`**：header 文档写了 code 2，代码当前只 emit 0/1（doc/code 裂缝，待修）。

> exit code 不做"鼓励/士气"信号——它必须保持诚实三态（理由见 `_backlog/plans/agent-persistence-and-exit-codes.md`）。鼓励走 `advice[]`，不走 exit code。
```

### 5.2 CEC-001 spec（draft）

新 capability `cli-exit-code-conventions`，ADDED Requirement **CEC-001 "Framework CLI exit-code contract"**。第一段（含 SHALL，满足 `openspec validate` 的 first-paragraph 检查）：

> The framework CLI surface SHALL use a single documented exit-code contract: `0` for pass, `1` for normal repairable failure (gate rule not met, validation failure, business error), and `2` for configuration or invocation error (routing contract `invalid_input` / `config_error`, or caller misuse such as a missing required flag). Every CLI SHALL emit structured JSON on stdout carrying the actionable detail (`{ check, routing, inspect, advice }` for gate CLIs, `{ status, reason, advice }` for non-gate CLIs); the exit code SHALL carry only the pass/fail/config tri-state and SHALL NOT encode encouragement, morale, or progress signals — those belong in the `advice[]` channel. The contract SHALL be documented in a discoverable top-level location (`DPT_FRAMEWORK/COMMANDS.md`) in addition to the implementer-facing `cli/README.md`.

正文如实标三类现状（gate 三元 via `emitGateResult` / 操作类二元 / `log-event` 永远 0 例外）+ code-2 两种语义 + `validate-workflow-package` 裂缝；future code reconciliation 明确 out-of-scope。Scenarios 至少覆盖：caller 读 JSON 分支 / gate tri-state via helper / log-event 永远 0 / exit code 无士气信号 / discoverable 契约 / code-2 调用方解释。

### 5.3 future code reconciliation 清单（独立 change，不属于 CEC-001）

- [ ] 把 ~13 个 binary 操作 CLI 收敛到一个 shared exit helper（对齐 `emitGateResult` 模式）。
- [ ] 修 `validate-workflow-package.mjs` doc/code 裂缝（header 写 code 2 但从不 emit）。
- [ ] 定 code-2 系统级语义：收敛（统一为 routing/config 错）或显式区分（config 错 vs 参数错用不同 code/field）。
- [ ] `log-event.mjs` always-0 保持 by design，但在 `logging-conventions` spec 里更显式标注为 CEC-001 的 documented exception。

## 6. 不做什么（Non-goals）

- **本 plan 作者不改 COMMANDS.md / specs / 任何代码**——只留思考与 draft 在 `_backlog/plans/`。
- 不改 `log-event` 的 always-0（by design）。
- 不在 exit code 里塞士气信号（见 `agent-persistence-and-exit-codes.md`）。
- 不追溯改写历史 spec 的散落 exit-code 断言；新契约立起来后，逐步对齐即可。

## 7. 一句话总结

> exit-code 契约是隐式的（埋在 `cli/README.md`，顶层文档零提及）、且不统一（三套约定 + code-2 语义冲突 + `validate-workflow-package` doc/code 裂缝）。显性化的正确姿势：先承认它不统一、声明 canonical + 如实标例外，再放进 `COMMANDS.md`（caller-facing）+ 一个 normative spec（CEC-001），**不动 exit code 数值本身**。本文把 draft 内容留给 framework/OpenSpec 侧 agent 当对齐基准。

---

**相关文件**
- `DPT_FRAMEWORK/cli/README.md:40-48` — 现存唯一契约表（implementer-facing，埋着）
- `DPT_FRAMEWORK/engine/helpers/gate-helpers-core.mjs:323-344` — `emitGateResult`，gate 类唯一共享决策点
- `openspec/specs/gate-skeleton/spec.md:52,72-80` — gate 类 exit-code 断言（最完整的一处）
- `openspec/specs/cli-inspect-output-conventions/spec.md:23` — inspect 类 exit-code 断言
- `openspec/specs/logging-conventions/spec.md:139` — `log-event` 永远 exit 0 的 by-design 依据
- `_backlog/plans/agent-persistence-and-exit-codes.md` — 姊妹篇：为什么 exit code 不该当"鼓励"杠杆
- `_backlog/plans/autonomous-silent-execution-terminology.md` — 同系列：phase 边界术语显性化
- `_backlog/plans/no-implicit-human-interaction.md` — 同系列：commands 是 Agent-facing，人只在 HITL1/HITL2
