---
title: BUG-200--204 Gate and Queue Contract Remediation
status: ready_for_openspec_proposals
created: 2026-08-06
---

# BUG-200--204：以两个 Change 收敛 Gate、Recovery 与 Queue 问题

## 决策

不要为每个 bug 各开一个 OpenSpec change，也不要先独立执行完整的
Gate Schema Capability Audit。采用两个 change：

1. `harden-gate-and-recovery-contracts`
2. `remove-recursive-queue-failure-repair`

这两个是最小且可独立验收的拆分。前者修改 Gate/terminal-recovery 的
确定性 contract 与诊断闭环；后者修改 queue `fail` 的状态转换语义。把它们
合成一个 change 会把两种 authority、回归集和风险混在一起，且 queue repair
行为可能掩盖 Gate/recovery 的根因。再拆细则只会增加 OpenSpec lifecycle 成本。

`gate-schema-capability-audit.md` 保留为问题背景，不单独立项。其有价值的部分
被收为第一个 change 的有限设计任务，不以“全面逐 gate 补强”作为前置条件。

## 明确排除的旧计划

以下两项在 taxonomy rebaseline 后复核，均没有当前可修改的 Harness contract，
不能作为第三个 change 混入本轮：

- `experiment-progressive-follow-up-plan` 需要未来 selected-host 的真实工具变化、
  新 evidence objective 与独立预算；配置、fixture 或历史结果不能代替这三个事实。
- `silent-autonomous-execution` 需要新的 current-head `agent_flow_e2e` observation；
  旧 incident、`NOT_RUN` 或 host 再开一轮 chat 都不能建立可移植的 Engine root。

它们已移为 closed external re-entry records。触发时应新开一个短期、有预算的计划，
而不是恢复本两-change 方案或建立常驻 retry。

## 已分诊的事实

| Bug | 处置 | 依据 / 边界 |
|---|---|---|
| BUG-200 | 不开 change，关闭为过时观察 | 当前 projection writer 已按 submitted contribution interval 识别 supplementary work unit；相应 work-unit projection 回归已覆盖 primary 后追加 supplementary 的路径。 |
| BUG-201 | 纳入 change 1 | Wave1 `question_list_has_four_sections` 的 regex 对小写 `exploration / exploitation decision log` 产生确定性 false negative。 |
| BUG-202 | 纳入 change 1，但不允许伪造 pass | 没有 submitted work unit 时，`reviewed_work_unit_refs[]` 不能凭空满足。要消除的是下游 depth-review 症状和无出口反馈，不是放宽 provenance closure。 |
| BUG-203 | 纳入 change 2 | queue `fail` 可对 repair item 再造 repair，缺少 ancestor/depth 与可执行 repair 路径的终止约束。 |
| BUG-204 | 纳入 change 1 的 recovery 取证与修复范围 | 当前 head 未复现原描述的“schema 与 full hash 必然冲突”。但 terminal late-submit/timeout-preflight 的回归基线存在失败，必须先建立最小的 Engine-path 反例，再对真实根因修复或重分类。 |

## 不要做的事

- 不把 Engine 变成研究内容、论点真实性或洞见的裁判。Engine 只验证可由
  schema、receipt、状态和明确契约决定的事实；证据质量判断仍属 Agent/HITL。
- 不新增一个“无证据也算完成”的 topic closure 状态，也不让空
  `reviewed_work_unit_refs[]` 通过 depth review。
- 不把 audit 扩展为 10 个 gate、100+ rule 的一次性重写。
- 不根据 BUG-204 的旧假设预先选择“放宽 schema”或“弱化 hash”。
- 不在 proposal/explore 期间改 `DEEP_RESEARCH_HARNESS/`、`tests/` 或
  `experiments_playbook/`；目标代码只在各 change 的 approved `tasks.md` 下 apply。

## Change 1: `harden-gate-and-recovery-contracts`

### 目标

让 Wave1 Gate 和 work-unit terminal recovery 对其可确定判断的事实给出一致、
可行动、root-first 的结果：有效 section 不能被格式偶然拒绝；缺失 submitted
evidence 不会伪装成可通过的 review；terminal snapshot/recovery 问题有可重复的
真实 Engine-path 回归。

### Proposal / design 中先完成的有限 audit

只审计本 change 触及的闭环，不输出泛化的 quality score：

```text
producer -> authoritative schema/state -> checker or gate
         -> legal repair/replacement path -> regression proof
```

每条发现必须回答：谁写入 authoritative fact、谁验证、失败后 Agent 可执行的
下一步是什么、以及哪条测试证明该闭环。无法用确定性事实裁决的内容质量 gap
记为 future policy/Agent concern，不衍生本 change 的 checker。

### 实施范围

1. 使 `question-list.md` 的四段检查复用现有宽容的语义 section parser，或以
   同等的明确 heading/body contract 取代大小写敏感 regex；保留空 section 的
   拒绝能力。
2. 当 Wave1 topic 没有可引用的 submitted work unit 时，检查/反馈必须先报告
   缺失 submitted evidence 或合法 replacement 路径，并抑制由该前提必然导致的
   depth-review 派生症状。Gate 仍不得给 pass，且不得把 failed/pending WU 当作
   submitted evidence。
3. 以真正由 Engine 产生的 queue item、manifest 与 terminal snapshot 建立
   terminal recovery 的最小反例。先隔离目前 late-submit 和 timeout-preflight
   失败的共同根因；只有在反例证实 snapshot/hash/schema contract 错配时，才改变
   该 contract，并保持 anti-drift 保护。
4. 为以上行为补最小 unit/integration regression。测试要覆盖 valid lower-case
   section、无 submitted evidence 的 root-first feedback、以及实际 terminal
   recovery path；不使用手工拼出的“不可能 snapshot”作为唯一证明。

### 预期受影响的 capability 边界

- `research/research-wave-gate-implementation`
- `engine/gate-skeleton`
- `engine/check-inspect-feedback`
- `agent/delegated-work-units`
- `agent/work-unit-provenance-gate`

proposal 阶段以当前 accepted specs 为准确认最终 capability delta；上列只是
检索和影响分析的起点，不是预先批准的 spec 修改。

### 验收与 BUG 处置

- BUG-201 有先红后绿的确定性回归，且 heading 的大小写/无关标点不再造成
  false negative。
- BUG-202 的 no-submitted-evidence 状态继续 fail，但反馈只保留能导致合法修复的
  root facts；补交或合法 replacement 后可重新进入正常 validation。
- BUG-204 有一条可运行的 Engine-path 回归，并有以下之一：修复后通过，或证实
  原 bug 假设不成立并把它重分类为具体的 late-submit/timeout 根因。两者都不能用
  手工编辑 runtime state 取代。
- BUG-200 以当前实现和回归证据关闭，不与本 change 的 apply 绑定。

## Change 2: `remove-recursive-queue-failure-repair`

### 目标

保留 queue `fail` 的 failure record 与可恢复语义，但禁止 Engine 对不能执行、
已经是 repair、或没有合法终点的 item 无限生成 generic repair work item。

### 实施范围

1. 明确 queue `fail` 的合法后继：故障必须被记录；只有可证明存在可执行的
   repair/replacement 路径时才可创建后继；delegated work unit 走既有的
   terminal/replacement authority，而非通用 repair 链。
2. 对 repair ancestor、最大修复深度或等价的 terminal/no-path 约束建立一个
   deterministic stop condition。具体字段与状态名称只在 OpenSpec design 中，按
   已有 schema/accepted contract 决定，不凭计划新增 lifecycle 状态。
3. 让 queue check/inspect 对失败项、合法后继和阻塞 root 给出一致视图，避免
   “check 看不见、gate 仍看得见”的孤儿项症状。
4. 加入 queue lifecycle regressions：不可 claim 的无-delegate item、repair item
   再次失败、以及 delegated work-unit failure。每种都必须有限终止，不能产生
   `repair-repair-*` 链。

### 预期受影响的 capability 边界

- `agent/agentic-queue`
- `agent/delegated-work-units`
- `workflow/repair-loop`

### 验收与 BUG 处置

- 连续执行 `fail` 不会创建无限 repair descendants。
- 可恢复的 delegated failure 仍指向现有合法 replacement/terminal 流程，既有
  receipt 与 provenance 不被绕过。
- 不可恢复的 failure 能在 queue/gate 诊断中显示其直接原因和无路径状态，而不是
  通过 `preempt --unsafe-current` 或手工编辑 runtime JSON 才能逃脱。
- BUG-203 仅在这些 state-transition regressions 通过后关闭。

## 顺序与 OpenSpec 操作

可以为两个 change 并行准备 proposal，但 apply 顺序是：先
`remove-recursive-queue-failure-repair`，再 `harden-gate-and-recovery-contracts`。
前者先消除失败时的无限副作用，后者随后在有限、可信的 recovery 状态上验证
root-first Gate 行为。

每个 change 都走完整的 propose -> review -> apply -> archive。proposal 阶段只在
`openspec/changes/` 写 artifacts；apply 只执行 approved `tasks.md`，并在 archive
前完成 capability spec sync、规定的 feedback lifecycle 以及对应回归验证。

## 第三个 Change 的唯一触发条件

只有产品明确决定：某 topic 即使没有任何 submitted evidence，也可以合法进入
Wave2 或 Final，才新开 `explicit-deferred-topic-closure`。这会引入新的 completion
语义、HITL 决策和 downstream provenance 规则，不能作为 BUG-202 的隐式修复。

在没有该决定前，两个 change 完成即为本轮终点。
