---
title: Gate Schema Capability Audit
status: active; reframed 2026-08-07
created: 2026-08-06
updated: 2026-08-07
---

# Gate / Schema / Queue 能力审计

> 这是 overall 决策与导航页。它把
> [BUG-200--204 remediation](bug-200-204-gate-and-queue-remediation.md) 与近期
> Gate、schema、Queue、handoff、feedback incident 放进同一个系统模型，但不吞并两个既定
> change，也不授权一次性重写所有 Gate。详细证据、假设和观测方法已拆入
> [gate-schema-capability-audit/](gate-schema-capability-audit/evidence-base.md)。

## Current Handoff State（2026-08-07）

本轮已经完成研究重定性、current-head 事实核对和文档拆分；**尚未**执行六类 observation、
创建新的 OpenSpec change 或修改 Harness/tests。下一个 Agent 不需要从聊天记录重建推理，按下面顺序读取：

1. 本 overall 页：结论、范围、ownership 与完成条件；
2. [evidence-base.md](gate-schema-capability-audit/evidence-base.md)：直接事实与证据限制；
3. [hypotheses-and-prompt-feedback.md](gate-schema-capability-audit/hypotheses-and-prompt-feedback.md)：
   H1-H4、反证和 prompt/control-surface 含义；
4. [observation-protocol.md](gate-schema-capability-audit/observation-protocol.md)：下一步 record、metrics 与 priority；
5. [BUG-200--204 remediation](bug-200-204-gate-and-queue-remediation.md)：两个既定 change 的实施 ownership。

当前进度与首个续接动作：

- [x] 最近窗口 81 条结案记录已按证据等级筛选，不能当作 defect frequency；
- [x] Top 3 gaps、H1-H4、六类 obligation 和三类 proof 已确定；
- [x] current Gate metadata/runtime 反例、Gate-audit authority 冲突及 BUG-203 路径已核实；
- [ ] **首先**按 observation protocol 为 Gate-audit authority 冲突建立 meta-contract record 并明确 disposition；
- [ ] 再为六类 blocking obligation 建 current-head consumer matrices；
- [ ] real Agent adherence 没有被静态测试证明；缺 host/tool evidence 时继续诚实记为 `NOT_RUN` / `UNOBSERVED`。

续接时仍受 OpenSpec phase gate 约束：本 note 是 observation/research 入口，不是 target-code 授权。
BUG-201/204 必须先有真实 Engine-path counterexample；BUG-203 实施仍归既定 change 2；没有满足
P0/P1 + current-head evidence + accepted-contract uncovered 三个条件时，不新增第三个 change。

本轮验证基线见子目录 [HANDOFF.md](gate-schema-capability-audit/HANDOFF.md)；workspace 只变更
本 overall 页及该 audit 子目录，未修改 Harness/tests。

## Overall 结论

原诊断“结构检查太弱，所以 Engine 需要更深的语义 Gate”不够准确，也会把 Engine 推向内容裁判
职责。近期 incident 更稳定地指向三个系统闭环缺口：

| Top gap | 要回答的问题 | 反复出现的结果 |
|---|---|---|
| **G1：义务可构造性 / producer closure** | Agent 在真正 authoring / submit / transition 时，是否拿到当前 attempt 的完整可执行 contract？ | 猜 schema、查 Engine source、整批返工、末端才发现格式错误 |
| **G2：解释一致性 / one-truth-path closure** | accepted authority、definition、schema、admission、inspect、Gate、projection 是否表达同一 contract 并复用同一 evaluator？ | checkpoint verdict 漂移、writer/parser 冲突、陈旧 metadata 或 authority 误导 |
| **G3：恢复与反馈闭环 / recovery closure** | 失败后是否只有一个当前合法且有限的最近动作，或诚实 no-path？ | root 被症状淹没、建议自身非法、手改 authority、repair 递归制造 repair |

共同审计单元不是一个 Gate 或 check type，而是**一个阻断性的 Agent↔Engine 义务**：

1. **可构造吗？** Agent 在 owning decision point 能否构造合法输入？
2. **同义吗？** 所有消费者是否解释同一权威事实？
3. **可收敛吗？** failure 是否通向一个 legal action + same-check rerun，或 honest no-path？

```text
incident -> direct fact -> accepted authority -> producer projection
         -> all consumers/evaluators -> smallest root
         -> one legal action or honest no-path -> proof class
```

只统计 122 条 rule、继续加 prompt prose，或者让 Gate 判断 claim/source 真假，都没有回答这三个问题。

## 当前最重要的信号

- 2026-07-24 至 2026-08-05 的 81 条结案记录只是机制筛选池，其中混有真实修复、
  no-reproduction、external residual 和 unobserved；不能把它们写成 81 个当前同类 bug。
- 当前 10 个 Gate / 122 条 rule 的静态 metadata 不是 capability map。Wave1
  question_list_has_four_sections 虽声明为 regex，实际 dispatch 已进入共享 semantic-section
  evaluator；BUG-201 必须由真实 Gate-path regression 裁决。
- accepted gate-skeleton spec 当前同时保留“禁止第二份 rule catalog”和“必须维护逐 rule
  inventory”两组互斥 clauses；现有 audit test 只实现前者。实现通过不能替代 authority reconciliation。
- current queue fail() 对每个合法 failure 都选取 caller repair 或创建 generic repair，并无条件
  插回队列；现有测试只证明一次创建，没有证明 repeated failure 有限终止。

这些信号的逐条出处、历史 analogues 与 accepted contract 见
[evidence-base.md](gate-schema-capability-audit/evidence-base.md)。

## 可证伪假设

| Hypothesis | 要验证的判断 | 主要反证 |
|---|---|---|
| **H1 / Constructibility** | current-attempt authority 生成且紧邻决策点的 projection，会提高首轮可构造性并减少查源码/整批返工 | Agent 已先读完整 projection，仍稳定产生同类错误 |
| **H2 / Parity** | authority 内部一致、最早 owning admission 拒绝、所有 checkpoint 共用 evaluator，会降低 late rejection 和 verdict drift | evaluator 已复用且 facts 相同，verdict 仍因 identity/snapshot/binding 漂移 |
| **H3 / Recovery** | prerequisite-aware root + 每 root 一个 legal action / honest no-path，会降低 repair turns、手改 authority 和递归 descendants | structured root/action 完整但 operation 自身仍非法或 recovery 不收敛 |
| **H4 / Adherence** | 行为失败主要集中在 degraded/recovery/handoff 等 authority 变化点；proximity 和实际 next action 比 substring 更有解释力 | 保留的真实运行显示 happy path 同样失败，或 decision-point delivery 与行为无相关性 |

完整指标、削弱条件和 prompt/control-surface 含义见
[hypotheses-and-prompt-feedback.md](gate-schema-capability-audit/hypotheses-and-prompt-feedback.md)。

## 下一步系统性观察

先做一个 **G2 meta-contract precheck**：记录 accepted Gate-audit clauses 的冲突及 current
disposition。它不是第七个 Agent↔Engine obligation，也不自动产生 implementation change。

随后观察六类高价值 blocking obligations，每类至少覆盖一次正常路径和一次 failure/recovery：

| Obligation | 主要 gap | 关键 consumers / decision points |
|---|---|---|
| work-unit direct output + dry-submit | G1, G2 | claim projection, authoring, dry-submit, formal submit |
| Queue payload executable demand | G1, G2 | enqueue, check/inspect, claim, stale repair |
| Wave1 semantic-section contract | G2 | definition, dispatch, evaluator, Gate feedback |
| submitted evidence + depth review | G2, G3 | provenance, derived checks, root masking, replacement |
| terminal failure / repair successor | G3 | fail, successor insertion, inspect/Gate, repeated failure |
| Final selected-finding backing | proof boundary, G1 | Agent selection, submitted backing, semantic review |

每个样本必须把三类 proof 分开：

1. **Static delivery**：Agent surface 是否交付 current-attempt contract。
2. **Deterministic Engine**：相同 facts 是否在真实 owning paths 得到同 verdict/root/action。
3. **Real agent flow**：真实首次返回、读取面、tool calls、下一动作和收敛轨迹。

详细 consumer matrix、统一 metrics、YAML observation record、P0-P2 判定和完成条件见
[observation-protocol.md](gate-schema-capability-audit/observation-protocol.md)。

## 给 Note / Prompt Engineering 的 Overall 反馈

Prompt 侧缺的不是更多静态约束文本，而是：

- 从 current authority 生成、放在 owning decision point 的 action core；
- 明确 producer owner、合法 writable surface、done condition；
- submit 前调用同一 evaluator 的 dry-run / dry-submit；
- failure 先消费 structured root，并给出一个精确 write_to + same-check rerun；
- 用真实 Agent transcript/next action 证明 adherence，而不是用 substring test 代替行为。

## 非协商边界

Engine 可以验证 schema、状态、identity、hash、receipt、submitted provenance 和声明的 backing
绑定；source 是否可信、claim 是否真实、证据是否充分、backing 是否语义支持 finding，仍由
Agent/HITL 判断。在线 URL 可达性也不是稳定 truth Gate。

因此本审计：

- 不建立第二份静态 per-Gate/per-rule capability catalog；
- 不新增 generic repair controller、隐式 completion state 或手工 authority 修复路线；
- 不把 fixture、prompt substring、mock transcript 当真实 Agent behavior proof；
- 不一次性修改 10 个 Gate 或 122 条 rule；
- 不自动产生“统一 prompt 重写”或第三个 implementation change。

## 与既定 Remediation 的边界

| Existing change | 继续拥有的实施 | 本 audit 只补充什么 |
|---|---|---|
| harden-gate-and-recovery-contracts | BUG-201/202/204 的 Gate 与 terminal-recovery contract | 真实 dispatch/evaluator parity、root-first/no-path observation |
| remove-recursive-queue-failure-repair | BUG-203 的 queue failure transition | successor legality、descendant depth、finite terminal observation |

只有 H1-H4 获得 current-head direct evidence、达到 P0/P1、且现有 accepted contract 无法覆盖时，
才沿正常 OpenSpec propose -> explore -> apply -> archive 路径提出后续 change。

## Overall 完成条件

- Gate-audit authority 冲突有 current-head observation 和明确 disposition；
- 六类 obligation 都有 consumer matrix 与 H1-H4 判断；
- static delivery、deterministic Engine、real agent flow 三类 proof 分开记账；
- prompt 侧收到 decision-point/adherence 反馈，只有未被 accepted contract 覆盖的 P0/P1 机制进入提案。

## Detail Index

- [HANDOFF.md](gate-schema-capability-audit/HANDOFF.md)：下一位 Agent 的续接入口、当前状态、
  read order、guardrails 与 suggested skills。
- [evidence-base.md](gate-schema-capability-audit/evidence-base.md)：evidence discipline、current-head
  facts、历史 incident chains、deterministic/semantic boundary。
- [hypotheses-and-prompt-feedback.md](gate-schema-capability-audit/hypotheses-and-prompt-feedback.md)：
  H1-H4、falsifiers、prompt/control-surface feedback。
- [observation-protocol.md](gate-schema-capability-audit/observation-protocol.md)：sample matrix、
  proof classes、metrics、record template、priority、completion conditions。
