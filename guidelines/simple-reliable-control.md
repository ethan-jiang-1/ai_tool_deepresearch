---
guideline_id: simple-reliable-control
suite: deep-research-guidelines
title: Simple Reliable Control
status: effective
created: 2026-07-10
revised: 2026-07-10
role: charter-level guidance for control-loop complexity and quality-control discipline
scope: openspec/changes/, DPT_FRAMEWORK/workflows/, DPT_FRAMEWORK/cli/, DPT_FRAMEWORK/engine/, tests/, experiments_playbook/
authority: guidance
defers_to:
  - AGENTS.md
  - openspec/config.yaml
siblings:
  - guidelines/project-charter.md
  - guidelines/framework-runtime-boundary.md
  - guidelines/logging-conventions.md
  - guidelines/command-experiments.md
  - guidelines/agentic-execution-model.md
  - guidelines/agentic-queue-mechanism.md
  - guidelines/agentic-workflow-mechanism.md
  - guidelines/agentic-subagent-mechanism.md
---

# Simple Reliable Control

> 状态: 生效 | 创建: 2026-07-10 | 修订: 2026-07-10 | 用途: 控制 Agent Flow、质量检查与恢复路径的复杂度

## Purpose

本项目不是纯传统程序。LLM Agent 会理解、修复和重试简单问题；Markdown controller 会把任务和反馈带回 conversation；Engine 负责不可含糊的确定性 checkpoint。

因此，可靠性不来自把所有可能性都编码成一条很长的精确逻辑链，而来自：

```text
直接事实 -> 简单检查 -> 最小根因反馈 -> 一个明确下一动作
```

当控制链过长时，Agent 容易忘记前置语义，Engine 实现容易兼顾不了两端，质量控制本身也会成为新的故障源。项目默认选择短、直、可解释、可重复的闭环。

本 guideline 只定义设计姿态和评审标准。具体 schema、CLI、gate rule、状态字段和 trace contract 仍必须通过 OpenSpec 与 executable contracts 定义。

本文件是 `project-charter.md` 的宪章伴随原则：Project Charter 定义层级和权威边界，本文件定义这些边界内允许采用怎样的控制复杂度。它不是运行时 spec，但在 `guidelines/` 内部遇到“是否应该再加一层 check、状态、fallback、retry 或 recovery”时，应优先用本文件裁决设计姿态。

## Standing And Precedence

本原则的地位必须同时满足两点：

1. **严格**：新的控制链、质量 gate、恢复路径和 diagnostic surface 必须遵守这里的复杂度纪律，不能把“这是历史机制”当作继续叠加的理由。
2. **兼容**：本原则不会自动宣布现有 accepted spec、可执行 contract 或生产代码无效。已有差距通过 OpenSpec 渐进收敛，不做脱离验证的全量重写。

冲突处理顺序：

```text
AGENTS.md / openspec/config.yaml
  -> accepted specs + executable contracts + runtime truth
  -> project-charter.md 的层级与权威边界
  -> simple-reliable-control.md 的复杂度姿态
  -> 各 mechanism guideline 的领域说明
```

因此：

- 若本文件与 accepted behavior 冲突，accepted behavior 继续生效；修正文档或提出 OpenSpec change。
- 若旧 mechanism guideline 要求“解决 recovery / stop / context 等问题”，只代表结果义务，不代表 watcher、daemon、controller、状态树或重试树已经获得预批准。
- 若旧实现比本原则复杂，维护者 SHALL 在后续触碰该 surface 时优先停止继续加层、删除重复判断、缩短反馈；除非用户明确要求，不做高风险 big-bang rewrite。

## Definitions

- **Control loop**：Agent 读取事实、调用确定性 checkpoint、接收反馈并采取下一动作的闭环。
- **Quality control**：会影响 pass/fail、coverage、routing eligibility、submit acceptance 或最终可信度的确定性检查。
- **Authority surface**：某类 runtime truth 的直接 Source of Record，例如 schema-valid JSON/YAML、status、receipt、submitted ledger 或 trace witness。
- **Projection**：从 authority 生成的 Markdown、cache、summary、index 或 diagnostic view；除非 accepted contract 明确规定，它不是新的 authority。
- **Root cause**：修复后能使一组依赖症状失效或重新可评估的最早直接失败。
- **Presentation preference**：不改变 authority、provenance、required semantic section availability 或机器可解析性的展示差异。
- **Recovery path**：失败后恢复到合法可继续状态的显式动作；它不等同于隐藏自动修复。

## Core Principle

**Prefer the shortest correct control loop.**

更强的表述是：

> **Quality control SHALL be simpler than the work it validates.**

“简单”不是代码行数少，也不是少做验证；它指 authority 少而直接、分支少而可见、失败早而清楚、修复后回到同一个 checkpoint。一个 control surface 可以读取多个必要的直接 authority，但不应让真相经过 projection、derived status、summary、cache 和二次 validator 层层转译后才得到结论。

一个 checkpoint 默认只回答三个问题：

1. 当前直接事实是否满足契约？
2. 若不满足，最小根因是什么？
3. Agent 下一步只需做什么？

不要让 Agent 为了修一个简单问题，先理解多层派生状态、多个互相重复的 validator、隐藏 fallback 或跨文件格式暗号。

默认闭环：

```text
smallest direct fact set
  -> one deterministic checker path
  -> earliest actionable root cause
  -> one visible next action
  -> rerun the same checkpoint
```

如果一个设计无法保持这个形状，proposal 必须说明为什么直接 authority 不足，以及新增复杂度替代或删除了什么旧复杂度。

## Quality Control Is Safety-Critical

Engine 的质量控制代码比普通业务代码更需要简单。质量检查一旦误判、级联或反馈不清，会阻断整条 Agent Flow，并诱发手改 authority、跳 gate、重复重试或错误降级。

质量控制 SHALL 遵循：

- **Direct facts first**：直接读取 Source of Record，不通过 projection 的 projection 推断真相。
- **Strict authority, tolerant presentation**：对 JSON/YAML/schema/receipt/ledger/status 等 authority surface 严格；对 Markdown 空格、展示格式和等价写法宽容。表现层偏好默认是 inspect/advisory，不应轻易成为 blocking rule。
- **Short-circuit cascades**：前置结构缺失时，先报前置根因，不继续制造几十条依赖它的下游 symptom。
- **Smallest actionable root set**：一次返回足以修复的最小根因集；完整细节可留在 durable diagnostic artifact，不把全部级联噪声塞给 Agent。
- **One rule source**：preflight、inspect 和 final gate 应复用同一确定性检查，避免维护多份近似逻辑。
- **Fail clearly**：无法可靠判断时明确失败或标记 unknown，不用长链路猜测出一个看似完整的结论。
- **Decision-point proximity**：反馈放在 Agent 正要决定下一动作的输出边界，不依赖它回忆几十段之前的规则。
- **Same-check repair**：可修复失败默认回到同一个 inspect/gate/submit checkpoint；不要每失败一次就切换到另一套近似验证路径。
- **Control-path testability**：质量控制自身必须有 focused negative tests，证明 root cause、短路、副作用和 fail-closed 行为，而不只测试 happy path。

每增加一条 blocking rule，都应回答：

> 这条规则保护的是确定性 authority / provenance / required structure，还是仅仅保护一种理想展示格式？

如果只是展示偏好，优先降为 advice、宽容解析或人工语义判断。

## Non-Negotiable Disciplines

以下纪律对新的或被修改的质量控制路径是强制性的：

### 1. One Truth Path

- 同一 deterministic fact SHALL 有一个直接 authority interpretation。
- preflight、inspect、gate、submit 或 audit 需要判断同一事实时，SHALL 复用同一个 checker result 或纯 evaluator。
- 文档示例、projection、return map 或 cache 不得在 direct authority 已存在时另立 competing pass/fail truth。

### 2. Prerequisites Before Implications

- parent artifact、identity、schema 或 receipt binding 失败时，SHALL 先报告该失败。
- 依赖 parent 才能成立的 enum、eligibility、coverage、backing、handoff 或 count 检查 SHALL 短路。
- 无依赖的独立根因可以并列，但 primary feedback 不得把派生症状伪装成独立修复任务。

### 3. Blocking Rule Burden Of Proof

一条新 blocking rule 只有保护以下至少一项时才默认合理：

- deterministic authority 的存在与可解析性；
- identity、receipt、ledger、trace 或 provenance binding；
- accepted spec 明确要求的 required structure、enum、不变量或 floor；
- 用户消费所必需且没有更直接结构化 surface 的 semantic section availability。

Regex 容易写、格式看起来更整齐、文档作者偏好某种列表样式，都不足以成为 blocking 理由。

### 4. State Must Own Irreplaceable Truth

- 新持久字段 SHALL 保存无法从现有 direct authority 可靠重建、且确实需要跨 invocation 保留的事实。
- 纯 derived value、方便 UI 的 summary、重复 gate conclusion 或“也许将来恢复会用”的状态，默认做 projection，不做新 authority。
- 若新增状态，就必须写清 owner、writer、reader、失效条件、回滚与删除哪个旧推断路径。

### 5. Recovery Stays Explicit

默认恢复形状只有两类：

```text
repair the same visible attempt/check and rerun
or
explicitly terminalize it, then create one new legal attempt/path
```

accepted spec 可以定义一个狭窄、显式、可审计的例外，但例外不能扩张成隐藏 fallback tree。Recovery SHALL NOT 依赖后台 watcher、无界 retry、推断 Agent intent、chat interception 或多层“先自动试试看”。

### 6. One Next Action

Primary feedback SHALL 给每个独立 root cause 一个最近动作。它可以附带 durable diagnostic detail，但不应同时给出互相竞争的五条恢复路线，让 Agent 自己猜哪条才是正式路径。

## Agent-Friendly Feedback

MD controller 不怕简单问题，怕的是长判断链和模糊反馈。Engine/CLI 输出应让 Agent 不读源码也能继续。

推荐反馈形状：

```text
check: failed
root_cause: finding-index 缺少 required field `hitl2_handoff`
next_action: 补字段后重跑同一个 inspect/gate
```

不推荐：

```text
55 failures
  -> missing field
  -> enum mismatch
  -> synthesis ineligible
  -> handoff mismatch
  -> backing mismatch
  -> downstream count mismatch
```

后者可能都“逻辑正确”，但对 Agent Flow 不可靠。前置根因未修前，下游判断没有行动价值。

## Complexity Budget

新增机制前先尝试以下顺序：

1. 删除不必要的 blocking rule。
2. 把表现层规则降为 advisory 或宽容解析。
3. 复用已有 validator / gate rule。
4. 把反馈移动到 Agent 实际做决定的 checkpoint。
5. 只有前四步都不足时，才新增状态、CLI、schema 或恢复路径。

新增一层逻辑应至少删除一份重复逻辑、一个历史特例或一条 Agent 必须记忆的隐含规则。只增加层、不减少复杂度的方案默认不通过设计评审。

### Complexity Burden Of Proof

任何新增 persistent state、blocking rule、validator、fallback、retry branch、recovery command、controller 或 projection，都必须在 proposal/design 中用短句回答：

1. 它捕获哪个现有 direct check 无法捕获的真实故障？
2. 它读取或拥有哪个 Source of Record？
3. 为什么不能复用现有 checkpoint？
4. 它删除、合并或降级了哪一份旧逻辑？
5. 它失败时给 Agent 的唯一最近动作是什么？
6. 哪个 focused test 证明控制本身不会误阻塞？

回答不出来时，默认不加。

### Default Rejection Triggers

出现以下任一信号，reviewer 应先要求缩 scope，而不是继续补逻辑：

- 为修一个 bug 新增三层以上调用/状态转译；
- 同一事实出现第二份 blocking validator；
- 新状态大部分可以从旧状态推导；
- 一个 parent failure 仍会产生大量 downstream failures；
- recovery 需要 watcher、daemon、session manager 或隐式 background loop；
- 为了兼容旧实现同时保留新旧两条成功路径且没有明确退役计划；
- 测试 harness 比被测 checkpoint 更难理解，或者靠 mock 证明 Agent/外部能力。

## Compatibility And Gradual Convergence

本原则采用渐进收敛，而不是一次性清算历史代码。

### Existing Behavior

- accepted specs、可执行 contract 和真实 runtime behavior 继续是当前事实。
- 指导与实现有差距时，应记录为 design debt；不能因为“以后会简单化”就绕过当前 contract。
- 不能为了让代码立刻看起来符合本文件，删掉 provenance、receipt、schema、trace 或 fail-closed authority。

### New Work

- 新 Change SHALL 不再扩大不必要的控制复杂度。
- 修改既有 surface 时，SHOULD 至少完成一个局部收敛动作：复用 checker、删除重复 rule、短路派生症状、降级 presentation blocker、移除无用状态或把反馈移近决策点。
- 若安全兼容要求暂时保留旧路径，design SHALL 标明唯一 authority、兼容期限或退役条件，禁止让两条路径都悄悄成为成功 authority。

### Migration Sequence

推荐顺序：

1. 停止继续叠加。
2. 识别当前真正 Source of Record。
3. 锁定现有必要 authority 行为的 regression tests。
4. 删除/合并 duplicate checker，或将 presentation-only blocker 降级。
5. 让 Agent-facing feedback 返回最小根因和一个动作。
6. 通过 OpenSpec 逐块迁移并归档，不做跨机制大爆炸式重写。

## Interpreting Older Mechanism Guidance

历史 mechanism guideline 中常见的词需要按本原则重新解释：

| 旧表述 | 兼容解释 |
|--------|----------|
| “architectural direction is settled” | 边界或结果义务已定，不代表具体复杂机制预批准 |
| “recovery must be solved” | 先要求 direct inspect + explicit repair/terminal action，不自动推导 controller |
| “context sustainability” | 优先减少读取、使用 bounded projection，不新增 summary/state stack |
| “stop authorization” | 优先在 decision point 输出短 cue 或直接 gate fact，不建设 chat interceptor |
| “defense in depth” | 可以有独立 authority cross-check，但不得是同一事实的重复 validator 链 |
| “comprehensive validation” | 覆盖所有必要 authority，不等于返回所有派生症状或阻塞所有表现差异 |

如果旧 guideline 的具体机制与本原则冲突，先保持 accepted runtime truth，再修订 guideline；若需要改行为，单独走 OpenSpec。

## Anti-Patterns

- 为一个具体故障建设通用 controller、watcher、daemon 或自动修复框架。
- 同一契约在 phase MD、inspect CLI、gate、helper 中各写一份近似 validator。
- 为了“首过完美”叠加多层 auto-normalize、fallback、retry 和推断状态。
- 用精确 regex 阻塞语义正确的 Markdown，只因为空格、编号或等价展示不同。
- 一个前置字段缺失，却继续运行所有依赖该字段的规则并返回级联失败墙。
- Engine 给出“哪里都可能有问题”的长报告，却不给一个直接下一动作。
- 用 mock、手写结果或 make-believe playbook 证明 Agent/检索/外部能力可用。
- 以“兼容”为名永久保留两个 success authority，却没有 source-of-record 优先级和退役条件。
- 把每次事故都升级成 generalized framework，导致质量控制比原问题更难测试。
- 让 diagnostic、log、cache 或 Markdown projection 反向成为 gate authority。

## Design Review Checklist

OpenSpec proposal/design/tasks 在进入 apply 前应回答：

1. 这个 checkpoint 最简单的问题是什么？
2. 它读取哪个直接 Source of Record？
3. 是否已有 validator 可以复用？
4. 哪些规则是真 blocker，哪些只是 presentation preference？
5. 一个前置失败会不会制造大量下游 symptom？
6. Agent 能否只看一次输出就知道下一步？
7. 新方案增加了多少状态、分支、surface 和恢复路径？删掉了什么？
8. 测试是否走真实 Engine/Agent path，而不是伪造结果？
9. 新状态是否保存不可替代的事实，还是已有 authority 的派生副本？
10. Recovery 是否只有一个显式修复/终止动作，还是形成隐藏 fallback tree？
11. 这次修改是否完成了至少一个局部简化，而不只是增加保护层？
12. 若保留兼容路径，唯一 authority 和退役条件是否清楚？

如果这些问题无法用短句回答，先缩小 change、删除规则或拆掉派生链，再考虑实现。

## Verification Discipline

- Deterministic checker 使用 focused unit/integration tests 证明 direct authority、fail-closed、short-circuit 和 no-unintended-side-effect。
- Inspect 与 formal gate 共享事实时，测试 SHALL 证明它们的 shared result 同源，而不是各自“看起来差不多”。
- Agent 行为、Sub-agent 行为、WebSearch/WebFetch 或真实长程 continuation 只能通过真实 controlled/production observation 证明；脚本 fixture 只能证明 Engine contract。
- Negative case 的 PASS 意味着系统正确拒绝或正确诊断；报告必须写清 expected outcome，不能把 hardcoded verdict 当证据。
- 质量控制代码的测试首先保护“不会误阻塞、不会造假、不会写错 authority”，其次才是规则数量覆盖。

## Boundary

简单不等于放松确定性底线：

- schema、状态转换、receipt、ledger、trace 和 provenance 仍然 fail closed；
- Agent 语义判断仍由 Agent 负责；
- Markdown 仍控制 Agent Flow；
- Engine 仍只控制确定性 checkpoint。

本原则要求的是减少不必要的控制复杂度，不是把 authority 交回 Agent，也不是跳过真实验证。
