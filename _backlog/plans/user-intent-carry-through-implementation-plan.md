# 用户意图 carry-through：最小侵入实施计划

> 2026-08-19 | status: ready to propose
> 计划中的唯一预期 OpenSpec change：`strengthen-user-intent-carry-through`
> 上游分析：`user-intent-carry-through-design-analysis.md`、`rerun-feedback-carry-through-design-analysis.md`

## 1. 最终决定

用**一个 OpenSpec change**同时收口以下两个诉求：

1. HITL1 中用户补 Topic、改重点或修正研究方向后，后续 Seed、Wave0、Wave1、Wave2、Final 不依赖 chat memory 才能继续执行。
2. HITL2 或 post-Final rerun 中用户提出的新研究要求，能够从决定记录进入 round-bound Topic direction、delegated work、coverage judgment 和最终 synthesis，而不在 Wave2 淡化。

**用户意图最终接纳到 current run bundle 已经存在的 `rb_plan.md`，不创建任何新 runtime 文档：**

- `rb_plan.md## Constraints > ### User Research Controls` 保存 HITL1 已接受的研究意图基线；
- `rb_plan.md## Decisions` 保存 HITL1 之后每一轮已接受的 research-intent revision；该 section 已经是 append-only、最新在上的关键决策区；
- 每个最新 revision 同时写“本轮 delta”和“相对 HITL1 基线仍有效的累计 amendments”，所以正常恢复只读 controls 基线与 Decisions 顶部一条；更早条目只承担多轮打磨历史。

机制不是新增一个 `user_intent` schema、memory store 或 Gate，而是加固既有链路：

```text
rb_plan.md / User Research Controls（HITL1 baseline）
  + rb_plan.md / Decisions 顶部 revision（current cumulative amendments）
  -> 既有 topic-local projection
  -> 既有 queue-owned task_brief
  -> 既有 round-bound focus_coverage
  -> 既有 synthesis / Final 消费
```

预期不改 Engine schema、Gate、状态机、rerun resolver、topic-state transaction、queue/work-unit authority 或 lifecycle。若 proposal discovery 没发现新的 executable constraint，本 change 应是 **spec + Agent-facing Markdown + verification**，而不是 Engine feature。

## 2. 已确认的直接事实

| 事实 | 当前 owner / interface | 对设计的约束 |
|---|---|---|
| `rb_plan.md` 已是无需 conversation history 即可恢复完整研究图景的 host file | `research/plan-hostfile-sections` | 用户可读的长期接纳面必须复用它，不新增 `user-intent.md` |
| HITL1 focus 原话与 Agent 理解已有 durable 基线家 | `rb_plan.md## Constraints > ### User Research Controls` | 它继续拥有 HITL1 baseline；不新增 `hitl1.rationale` |
| `rb_plan.md## Decisions` 已声明 append-only、最新在上 | 现有 host-file `## Decisions` | 用它保存每轮已接受 revision 与累计有效 amendments；旧条目不可改写 |
| 普通 HITL2 focus rerun 已要求两段式 rationale | `rb_profile.yaml#/human_decision_checkpoints/hitl2/rationale` | 它继续承载当前 route-bound Agent input；Engine 只判断既有结构/决定，不解释 prose，也不能靠它单独承担跨多轮可读历史 |
| post-Final C5 request 的 `reason` 是 multiline free-form string | `PostFinalRecoveryRequestSchema` | 两段式内容可直接放入现有 `reason`，无需 `{ focus: ... }` |
| C5 会确定性序列化 `reason` + `requested_scope` 到 rationale | `rationaleFor(request)` | 只需补 Agent authoring contract，并锁定现有 serializer 行为 |
| rerun direction 已有六字段并绑定 `rerun_count` | UID-bound seed 的 `## 本轮重跑方向` | 它是受影响 Topic 的 current increment projection，不是原话 owner |
| queue-owned `task_brief` 会原样进入 manifest 与 immutable `task.md` | `kindContractForQueueItem` -> work-unit envelope | delegated carry-through 应使用这个 interface，不应滥用 `action` 或新增字段 |
| Wave1 已有 current-round `focus_coverage` | `depth-review.yaml` | 它负责“做到/受限”的可审计声明，不负责保存原话 |
| Wave2 synthesis 是 Agent-owned narrative projection | `artifacts/wave2/synthesis.md` | 可增加 visible current-intent coverage，不给 finding schema/Gate 加字段 |

## 3. 语义层：当前研究意图，不是新状态

这里需要回答的有界问题是：

> 当前 phase / actor 为完成本轮合法工作，必须考虑哪些仍然有效的用户研究语义，它们来自哪里，哪些只属于历史轮次？

必须保留四个区别：

- **原始 wording vs Agent interpretation**：HITL1 wording 在 controls；每轮已接受的 revision wording 与理解在 Decisions 对应条目；执行表面只携带 bounded、topic-local 解释。
- **baseline vs increment**：HITL1 controls 是 run baseline；Decisions 顶部条目给出累计有效 amendments；matching rerun direction 是当前受影响 Topic 的 round-bound projection，三者不互相替代。
- **current vs historical**：Decisions 顶部条目是 current narrative stop point，旧条目是不可变打磨历史；只有与 profile 当前 `rerun_count` 匹配的 direction / coverage 可表示 current execution/coverage，stale、future、invalid、legacy-unbound 不得冒充 current。
- **要求 vs 满足证明**：controls/rationale/direction 说明“要什么”；current-round `focus_coverage` + submitted backing 说明“做到了什么或为何受限”。

正常推理停止点：

- Phase Agent 或 human 恢复 run 时，只需读 `rb_plan.md` 的 controls 基线与 Decisions 顶部 revision，即可知道当前累计研究意图；只有审计打磨过程时才读更早条目。
- delegated actor 读生成后的 `task.md` 即可找到当前 bundle、canonical seed、controls/最新 revision 原坐标和 task-local objective，不需要 chat history。
- Wave2/Final 可从最新 revision、current directions、current focus coverage、verified evidence 与既有 handoff 决定 synthesis/delivery，不需要重建 HITL 对话。

`rb_plan.md` 是 narrative authority，但它不授权 route/mutation，也不证明研究已完成；permission、routing、Gate、canonical Topic state 和 evidence acceptance 仍由现有 machine owners 决定。

## 4. 最小机制

### 4.1 接纳入口：复用现有 `rb_plan.md`，保留多轮打磨痕迹

**HITL1 baseline** 保持现状：focus 的相关原话摘录与 Agent 理解写入既有 controls snapshot。Alignment Snapshot 继续记录 resolved understanding，不变成 transcript 或第二份 focus authority。

**每个 legal rerun**（普通 HITL2 或 post-Final C5）都在进入实际 rerun preparation 后、形成 topic-state candidate 前，由共同的 `phase-rerun` writer 在 `rb_plan.md## Decisions` 顶部写一个新的 immutable revision。这样两种入口共用一个 materialization point，不建立两套 writer protocol。旧 revision 永不覆盖；同一 accepted target round 的恢复不得重复插入同一条目。

每个 revision 至少包含以下人类可读语义；它是 presentation-tolerant Markdown，不新增 parser/schema：

```markdown
### Research Intent Revision — target rerun N

- Accepted via: HITL2 | post-Final C5
- This-round delta: added / changed / withdrawn
- Affected Topics: current UID/title；尚未 materialize 的新 Topic 用明确 proposed title
- Supersedes or withdraws: earlier revision/scope，若无则写 none
- Current active amendments to HITL1 baseline: 截至本轮仍有效的完整累计 amendment set
- Agent interpretation: 已经用户修正或接受的当前理解

User wording (verbatim):
> <逐行保留用户 wording，并保持 Markdown quote containment，避免用户文本形成 host-file 顶层 heading>

This entry records accepted intent, not execution success or coverage.
```

“累计 amendment set”只累计相对 HITL1 baseline 的仍有效变更，不复制整份 controls。后续 revision 若撤销旧要求，必须在本轮 delta / supersedes 中明确写出，并从新的累计 set 中移除；旧条目仍保留原貌。HITL 对话中的临时候选、提问和未接受草稿不进入 Decisions。

`phase-rerun` 的局部顺序固定为：写入或确认同一 target round 的 Decisions revision -> 重新运行现有 `operate-topic-state inspect` 取得包含该 revision 的 current plan hash -> 构造 retained candidate -> 运行 existing apply。当前 topic-state implementation 只刷新 canonical Topic Registry section 并保留其他 plan body bytes；verification 需要把 Decisions history 的保留锁成 regression。无需新增 Engine/CLI plan writer、事务阶段或 semantic parser。

这里只记录会改变研究问题、范围、Topic、证据要求或分析重点并进入 legal rerun 的 feedback。只改变报告措辞、版式、长度或阅读顺序的 presentation-only Final revision 继续由既有 Final version lineage 承载，不混入 research-intent revision history。

这给出两个读取模式：

- **正常执行/中断恢复**：只读 `User Research Controls` + Decisions 顶部 revision；
- **打磨审计**：按 Decisions 从上到下读取所有 immutable revisions，看到每次新增、修正、撤回和当时原话。

两轮示意：Rerun 1 在 HITL1 baseline 上增加 A 与 B；Rerun 2 把 A 修正为 A2 并撤回 B。此时 Decisions 顶部的 Rerun 2 条目写 `delta = A -> A2, withdraw B`、`current active amendments = [A2]`；下面的 Rerun 1 条目仍原样写着当时的 `delta = add A, add B`、`active amendments at that revision = [A, B]`。执行者读顶部不会误做 B，审计者仍能看见 B 曾经被接受又被撤回。

**普通 HITL2 rerun** 继续在 current profile `rationale` 保存当前 Phase Agent 要消费的 accepted decision；Engine 只使用既有结构/route facts，不解释 rationale 语义。有新/修订 focus 时使用既有两段式标签。后续 HITL2 可以覆盖 current profile projection，但不能抹掉 `rb_plan.md## Decisions` 中已完成的历史 revision。

**post-Final rerun** 只改 authoring contract：当请求包含新/修订 focus 时，现有 request 的 `reason` 写为：

```text
用户的重点原话（逐字保留）：
<只保留与本次 research expansion 直接相关的原话摘录>

Agent 对本轮额外研究方向的理解（可由用户修正）：
<已在当前 Final conversation 中解决歧义后的理解>
```

`requested_scope` 继续单独记录 bounded affected scope。C5 继续做现有 LF normalization、outer trim、request/profile/event durability；这里的“逐字”不声称保留 CRLF 或外围空白字节。

不新增 `focus` object，不改 ProfileSchema，不把 request prose 变成 permission 或 Gate input。除 `rb_plan.md## Decisions` 这一个既有 host-file 历史接纳面外，不得把完整原话再复制到 N 个 seed、queue item、work-unit result、receipt、ledger、finding 或 reference 中。

### 4.2 Topic projection：保留源，派生最小可执行解释

**首轮 / HITL1 路径**：当 controls 对某 Topic 有实际影响时，Seed Topics 必须把 topic-local 解释写入既有 Agent-owned enrichment/body：

- `search_guardrails` / `evidence_route`；
- 必要时 `hypothesis` / `in_scope`；
- initialization body 中的 why/delivery relevance。

不适用就不投影；上游信息不足就写 explicit gap。不得复制整份 controls，不得改 canonical Topic identity，也不得让 Engine 判断这段投影“语义正确”。

**rerun 路径**：`phase-rerun` 先把 accepted rationale materialize 为 Decisions 顶部 revision，再从同一 current decision 形成 retained topic-state input。每个受影响 Topic 的 `rationale_excerpt` 是**该 Topic 为什么受本轮影响的 bounded explanation**，不要求复制完整 user wording，也不要求多个 Topic 使用相同文本前缀。跨 Topic 一致性来自：同一 current revision、同一 target round、同一 atomic topic-state publication；不是 N 份逐字文本相等。

### 4.3 Delegated carry：使用现有 `task_brief` interface

Wave0、Wave1 和 Wave2 targeted-evidence 在 enqueue 时，为有 delegated work 的 queue item author 现有 queue-owned `task_brief`。它至少给 actor：

- relevant canonical seed coordinate(s)（topic-local work 通常为一个；跨 Topic targeted-evidence 可为多个）；
- controls present 时的原始 `rb_plan.md## Constraints > User Research Controls` read-only coordinate；
- rerun 时 `rb_plan.md## Decisions` 顶部 current revision 的 read-only coordinate；
- 当前 matching direction 的读取规则；
- 一个由 Phase Agent 从这些表面形成的 bounded task-local objective；
- 明确提示 stale/future/invalid/legacy direction 不构成本轮指令。

优先复用当前已测试的 `payload.task_brief` -> manifest/task rendering 路径。完整 user wording 不进入 task brief；actor 可通过 work-unit 已有 `bundle_dir` 读取原始 coordinate。`action` 继续描述 queue demand，不承担 transcript 或 source-of-record 职责。

特别修正 Wave0：Wave0 delegated demand 是 `phase-wave0` 自己创建的，不能假设 `phase-seed-topics` 已替未来 Wave0 work unit 写好 action/brief。`phase-wave0` 必须在自己的 queue filling 点消费 current seed direction 并 author task brief。

### 4.4 Wave1：把“为什么”转成 current-round 可审计 commitment

`focus_coverage` 的正面来源写清：

- round 0：既有 controls snapshot + current canonical seed projection；
- rerun N：baseline controls + Decisions 顶部 current revision + matching direction for N；
- 不从 filename、chat、profile 的普通 prose、旧 direction 或历史 submitted work 推断 current commitment。

Phase Agent 只记录最小 commitment set。`covered` 必须绑定 current-round submitted Wave1 refs；无 legal repair 时才记录现有 boundary kind 下的 `limited`。这保持“用户要求”与“完成证明”分离。

### 4.5 Wave2：消费 current intent，不扩 finding schema

Pure synthesis 前，Phase Agent 必须同时读：

- baseline controls（若存在）；
- Decisions 顶部 current revision（rerun 时）；
- 受影响 Topics 的 matching current direction；
- current-round `focus_coverage` outcomes；
- routed carried-target receipt、finding index 和 verified evidence。

`synthesis.md` 增加一个 presentation-tolerant 的 current-intent coverage 段，简洁写明：本轮增量目标、受影响 Topics、哪些已有 current backing、哪些仍是 visible limitation。它引用 source coordinates / commitment ids，不复制完整原话。

不新增 `finding-index.yaml.rerun_focus`、`synthesis_eligibility` 字段、固定 ledger 行或 Gate rule；`cross-topic-ledger.md` 仍服务 finding process，避免把同一语义建立第二份 blocking validator。

### 4.6 Final：研究语义与交付语义各读其 owner

Final composition 同时 reground in：

- verified evidence、answerability 和 limitation surfaces；
- current-lineage `composition_handoff`（交付/呈现语义 owner）；
- 原始 controls coordinate（研究语义 baseline）；
- Decisions 顶部 current revision（当前累计 research-intent amendments）；
- Wave2 current-intent coverage projection（本轮完成/受限的可读入口）。

controls 或 synthesis 不得填补缺失的 composition handoff，也不得覆盖 current Final lineage；handoff 也不能让未满足的 hard research control 悄悄消失。

Setup 仍只做 structural consistency，不需要消费用户意图。

## 5. 明确不做

- 不新增 `user_intent` / `focus` / `hitl1.rationale` schema 或 profile 字段。
- 不新增 `user-intent.md`、feedback log 文件或第二个 run-level Markdown；复用既有 `rb_plan.md## Decisions`。
- 不把 Alignment Snapshot 改成 transcript 或第二份 controls authority。
- 不要求每个 task、seed、ledger 或 finding 逐字复制用户原话。
- 不让 Engine 比较 rationale 与 direction 的语义相等或做 verbatim substring Gate。
- 不新增 HITL、lifecycle state、queue kind、rerun mode、memory store、sync protocol、controller 或 fallback path。
- 不改 resolver 五态、direction 六字段、rerun_count、C5 lineage、topic-state transaction、work-unit submit/provenance 或 Gate semantics。
- 不用 deterministic fixture 声称 Agent 理解或真实 carry-through 已被证明。

## 6. 为什么只用一个 OpenSpec change

推荐 change：`strengthen-user-intent-carry-through`。

Acceptance history、projection、delegated delivery、coverage 和 synthesis 是同一个 reader question 的连续链。拆成两个 change 会产生一个暂时态：`rb_plan.md` 记录了多轮 revision，但消费者仍不必读；或消费者被要求读取一个尚未稳定 author 的表面。现有 host file、Decisions section、rationale、direction 与 task brief 已经提供全部 interface，也没有 schema migration，所以一个 focused cross-surface change 更小、更一致。

只有 proposal discovery 发现必须改变 Engine schema/authority 时才拆第二个 change；当前代码证据不支持该拆分。

### 6.1 Capability discovery 预期

最终以 proposal 时读取的 main specs 为准；当前候选如下：

| Capability | 预期 disposition | 原因 |
|---|---|---|
| `research/plan-hostfile-sections` | Modify | 将既有 append-only `## Decisions` 明确用作多轮 accepted intent revision history；不新增文档或 Gate parser |
| `research/post-final-recovery` | Modify | 规定 focus-bearing C5 `reason` 复用既有两段式文本 |
| `research/pre-research-phase-content` | Modify | 将适用 controls 的 Seed 投影从机会性消费收紧为必达契约 |
| `research/seed-topic-materialization` | Modify | 约束既有 enrichment/body 如何承载 topic-local intent |
| `agent/delegated-work-units` | Modify | `task_brief` 从 MAY coordinate delivery 收紧为有 controls/current revision/current direction 时 SHALL |
| `research/research-wave-phase-content` | Modify | Wave0/1/2 在实际 queue/claim/synthesis decision point 消费 current intent |
| `research/wave1-intake` | Modify | 明确 `focus_coverage` 的正面来源和 current-round 边界 |
| `research/wave2-synthesis` | Modify | 增加非权威 current-intent coverage projection，不改 finding schema |
| `research/content-delivery-phase-content` | Modify | Final 同时消费 research controls 与 composition handoff，明确优先级 |
| `workflow/rerun-incremental-node` | Modify | 统一 materialize Decisions revision，并明确 `rationale_excerpt` 是 topic-local explanation，不是 verbatim replica |
| `agent/hitl-ux` | Verify-only | 普通 HITL1/HITL2 两段式 capture 已接受 |
| `research/user-research-controls` | Modify | 明确 controls 只拥有 HITL1 baseline，post-HITL1 accepted revisions 进入既有 Decisions |
| `workflow/rerun-topic-integration` | Verify-only | round binding/resolver/atomic direction contract 不变 |
| `research/canonical-topic-state` | Verify-only | existing writer 与 authority 不变 |
| `engine/schema-core` | Excluded | 不新增 profile/schema field |
| `verification/verification-routing` | Verify-only | 使用既有四类验证分类，不改 taxonomy |

预计没有 New capability，因此不应创建 requirement reservation；proposal 的 capability discovery 仍必须实际确认。

### 6.2 预计 target files

- `DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md`
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-rerun.md`
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-seed-topics.md`
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md`
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md`
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md`
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md`
- 上表中判定为 Modify 的 delta/main specs
- focused tests / selected `agent_flow_e2e` playbook

预计不改 `.mjs` production implementation。若 apply 中出现 production JS edit，必须先把原因、Source of Record 和无法复用现有 interface 的证据写回 change design/tasks，再继续。

## 7. Verification 计划

| Claim | Test class | 计划证据 |
|---|---|---|
| C5 已有 serializer 能保留带两段式标签的 multiline `reason`，且 reason/scope 仍分离 | `integration` | 扩展 `tests/integration/cli/post-final-recovery.test.mjs` |
| 两轮以上 rerun 的 Decisions revisions 保持最新在上、旧条目不变，topic-state plan replacement 不丢历史 | `integration` + `deterministic_e2e` | 扩展 plan-hostfile/topic-state/rerun continuity tests；只证明字节保留与轮次结构 |
| queue-owned task brief 原样进入 manifest / `task.md` | `unit` 或 existing evidence | 复用 `tests/engine/work-unit-lifecycle.test.mjs` 既有 interface test；仅在 contract 改变时扩展 |
| phase/playbook 文档在正确 decision point 要求读取 source/projection，且禁止 verbatim fan-out | `integration` | 新增或扩展 `tests/integration/md/` focused contract test |
| resolver、atomic direction publication、current-round focus binding 未回归 | `unit` + `integration` + `deterministic_e2e` | 运行现有 rerun-direction、topic-state、focus-coverage、rerun-round-continuity suites |
| 真实 Subject Agent 在连续两轮反馈后能从 controls + Decisions 顶部 revision 形成 current task/coverage/synthesis，而非依赖 chat 或误用旧 revision | `agent_flow_e2e` | 选定一个 two-rerun case：第二轮保留、修改或撤回第一轮要求，并观察 current cumulative amendments 与旧历史均正确 |

Deterministic tests 只证明结构、round binding、serializer 和真实 Engine path；Agent semantic carry-through 只由真实 `agent_flow_e2e` observation 证明。真实 Agent/tool 不可用时记录 `NOT_RUN`，不得用 fixture PASS 替代。

## 8. Progress Plan

### A. Discovery（本分析轮）

- [x] 阅读 Project Charter、root `CONTEXT.md` 与 invariants brief。
- [x] 对照 accepted specs、phase Markdown、C5 request/serializer、queue task-brief path 和现有 tests。
- [x] 确认 post-Final 不需要新增 `focus` schema。
- [x] 确认用户变化的既有 runtime 接纳文档是 `rb_plan.md`，不是新建 feedback/intention 文件。
- [x] 确认多轮打磨复用现有 append-only、最新在上的 `rb_plan.md## Decisions`。
- [x] 确认 delegated handoff 应使用 `task_brief`，不是复制到 `action`。
- [x] 确认一个 OpenSpec change 足够，第二个 change 暂不成立。

### B. Propose

- [ ] 运行 `/opsx:propose strengthen-user-intent-carry-through`，由 CLI scaffold change。
- [ ] 完成 proposal capability discovery；逐个读取候选 main spec，确认 Modify / Verify-only / Excluded。
- [ ] 在 proposal 中写 semantic-precision reflection、direct Source of Record、最短合法闭环、net simplification、user/Agent/Engine responsibility。
- [ ] 创建并校验 change-root `semantic-closure.yaml`；按当前 catalog 判定 affected families，不猜 fragment。
- [ ] 创建 closed `verification-plan.yaml`，使用 canonical 四类 test class。
- [ ] 在 `tasks.md` 加入且仅加入一次 `openspec-feedback:plan-review` 与 `openspec-feedback:closeout-review` checkbox。
- [ ] 若 capability discovery 仍为 existing-only，明确不创建 requirement reservation；若发现真实 New capability，停止并重新评估是否仍应保持一个 change。

### C. Plan Review / Polish

- [ ] 完成 `openspec-feedback:plan-review`，把每个 actionable finding 变成普通未完成 task。
- [ ] 核对没有新增 profile field、Gate、parser、queue kind、lifecycle 或第二 authority。
- [ ] 核对 delta specs 明确 baseline + cumulative amendments + round projection、current + historical、requirement + coverage 三组区别。
- [ ] 将单 task 控制在 2 小时内，并为每项写 independently observable done condition。
- [ ] 运行 proposal/semantic-closure/verification-routing 的 plan-mode checks，全部通过后才进入 apply。

### D. Apply：Agent-facing contracts

- [ ] 更新 post-final recovery spec/playbook：focus-bearing `reason` 使用既有两段式标签；`requested_scope` 保持独立。
- [ ] 更新 plan-hostfile / controls spec：HITL1 baseline 留在现有 controls；每轮 accepted revision 写入现有 append-only Decisions，不新增 runtime 文档。
- [ ] 更新 rerun spec/phase：在 topic candidate 前幂等写入一个 target-round Decisions revision，含本轮 delta、累计有效 amendments、原话/理解和 supersedes；旧条目不改。
- [ ] 更新 rerun spec/phase：`rationale_excerpt` 是 bounded topic-local explanation，不复制整段原话、不要求跨 Topic 文本相等。
- [ ] 更新 Seed spec/phase：适用 controls 必须投影到既有 enrichment/body；不适用保持无新增字段，缺信息写 gap。
- [ ] 更新 delegated-work spec 与 Wave0/1/2 phase：在实际 enqueue 点 author queue-owned task brief，传 source coordinates + bounded task objective。
- [ ] 修正 Wave0 责任位置：由 `phase-wave0` 自己为 source-intake demand 携带 current direction，不依赖 seed-topics 预写未来 task。
- [ ] 更新 Wave1 spec/phase：明确 current focus 的正面来源并写入 existing round-bound `focus_coverage`。
- [ ] 更新 Wave2 spec/phase：pure synthesis 消费 Decisions 顶部 revision、current direction/coverage，在 `synthesis.md` 写非权威 coverage 段；不改 finding/ledger schema。
- [ ] 更新 Final spec/phase：同时 reground in controls、Decisions 顶部 revision、Wave2 coverage、verified evidence 和 composition handoff，并写清 owner precedence。

### E. Apply：Verification

- [ ] 扩展 post-final integration test，证明现有 multiline reason -> rationale/event durability，不声称 semantic correctness。
- [ ] 扩展 host-file/topic-state/rerun continuity test，证明两轮以上 Decisions entries 不丢失、不覆盖、不因 plan replacement 消失。
- [ ] 新增/扩展 focused Markdown integration test，锁定 source-coordinate consumption、task-brief placement 和 no-verbatim-fan-out。
- [ ] 运行 existing task-brief, direction resolver, topic-state, Wave1 focus coverage 和 rerun continuity tests。
- [ ] 完成选定 `agent_flow_e2e` asset/manifest 更新；真实执行若不可用，保留 `NOT_RUN`，不伪造 PASS。
- [ ] 运行 change `verification-plan` 选定的全部 deterministic checks。
- [ ] 运行 `node openspec/governance/check-project-reqs.mjs --mode archive --change strengthen-user-intent-carry-through`。
- [ ] 运行 `node openspec/governance/check-project-specs.mjs`。

### F. Closeout / Archive

- [ ] 完成 `openspec-feedback:closeout-review`；finding 必须成为普通未完成 task，不能只留在 chat。
- [ ] 对 affected delta/main specs 做 Agent-owned semantic sync 与逐项复核。
- [ ] 所有 tasks、verification evidence、semantic closure 与 spec sync 完成。
- [ ] 仅使用 `node openspec/governance/finalize-change-archive.mjs --change strengthen-user-intent-carry-through` 完成 archive。
- [ ] 更新本 plan 的 checkbox、实际 change 名、验证结果和最终 archive coordinate。

## 9. Done 条件

完成不等于“文档里出现 user intent 字样”。必须同时满足：

- HITL1 baseline 位于既有 `User Research Controls`；普通 HITL2 与 post-Final 的每个 accepted rerun 都在既有 `rb_plan.md## Decisions` 留下一条 immutable revision，不新增 runtime 文档或 schema。
- 连续两轮以上反馈后，Decisions 顶部条目给出当前累计有效 amendments，旧条目保留每轮 delta/原话/理解；撤回或替换不会抹掉历史，也不会继续出现在 current set。
- Wave0/Wave1/Wave2 targeted-evidence delegated actor 的 immutable task surface 可以定位 baseline controls、current Decisions revision 与 assigned current direction，且没有向每个 task 扇出完整原话。
- Wave1 current focus coverage 只由 current-round submitted backing 或 honest existing limitation 支撑。
- Wave2 synthesis 明确处理本轮意图及其 covered/limited outcome，stale direction 不冒充 current。
- Final 不会因只读 composition handoff 而遗漏 material research control，也不会用 controls 填补缺失 handoff。
- Engine/Gate/queue/work-unit/topic-state/C5 authority 和 legacy bundle compatibility 均未扩大。
- deterministic claims 与 real Agent-behavior claims 按 verification-routing 分开，未用 mock/fixture 代替真实 Agent 证据。
