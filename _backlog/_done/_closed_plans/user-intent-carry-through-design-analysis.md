# 用户意图变更（补 seed topic / 改重点）的 carry-through：系统性设计分析

> 2026-08-19 | `_backlog/plans/` 设计分析稿 v3（已完成复核，不是 bug 卡，也不是 OpenSpec change）
> 本稿覆盖两个 juncture：**HITL1**（看到 seed topic 预览后想补充/修正）与 **rerun**（HITL2 / post-final）。
> 扩展并吸收 `rerun-feedback-carry-through-design-analysis.md`（v1，只覆盖 rerun 侧；同目录）。
> 最终机制与执行 checklist：`user-intent-carry-through-implementation-plan.md`。
> 总原则：**框架已经成熟——加固既有 source -> projection -> task -> coverage -> synthesis 链，不新增 schema/Gate/lifecycle。**

## 0. 结论先行

用户的直觉是对的：「他当时知道，流转后不记得」真实存在，但根因不是缺少一个全局 `user_intent` 对象，而是**既有 source 到实际执行/综合决策点之间的消费边仍然偏软**。

- **结构化决定 carry 已经很强**：HITL1 的补充/修正走 canonical topic-state；rerun 走六字段 direction + shared round resolver。
- **现有接纳文档已经存在**：`rb_plan.md` 是 run 的 narrative host file；HITL1 baseline 已在 controls，而现成的 append-only、最新在上的 `## Decisions` 正适合承接每轮已接受 revision。
- **原始 wording 的机器入口也已存在**：普通 HITL2 focus rerun 在 rationale；post-Final 的现有 multiline `reason` 能复用同一两段式约定，不需要新字段。
- **真正缺口是 Decisions 尚未承接多轮历史，加上下游消费链偏软**：Seed 的 topic-local 投影是 MAY；Wave delegated work 只 MAY 携带 source coordinate；Wave2 没有 visible current-intent coverage；当前 Final phase 也未显式读取 controls/current revision。
- **正确目标不是逐层复制原话**：原话保留在既有 owner；执行层携带 source coordinate + bounded topic/task interpretation；完成情况由 current-round submitted backing / limitation 证明。

## 1. 用户意图变更的三类表面

| 表面 | 是什么 | HITL1 侧 | rerun 侧 | 下游角色 |
|---|---|---|---|---|
| 决定 / 原始叙事 | 用户到底改了什么、为什么 | controls 保存 baseline | current rationale/C5 event 承载当前 machine/audit decision；`rb_plan.md## Decisions` 保存多轮 narrative revisions | 正常只读 baseline + 最新 revision；旧 revision 供打磨审计 |
| Topic / attempt projection | 本 Topic、本 attempt 具体做什么 | seed enrichment/body + queue-owned `task_brief` | matching direction + queue-owned `task_brief` | 把 context 放到实际 decision point |
| 覆盖 / 综合投影 | 本轮要求做到了什么、哪里受限 | round-0 `focus_coverage` + synthesis | current-round `focus_coverage` + synthesis | 用 backing/limitation 回答完成度，而非重复原话 |

设计目标一句话：**现有 `rb_plan.md` 接纳 baseline 与多轮 revision，topic/task projection 在实际执行点必达，coverage 与 synthesis 对当前轮次负责。**

## 2. 现状事实链（已逐文件验证）

### 2.1 HITL1 出口写入什么

| 表面 | 内容 | 备注 |
|---|---|---|
| `rb_plan.md## Goal > ### HITL1 Alignment Snapshot` | 确认/委托的理解叙事 | 不是 transcript；可读叙事 |
| `rb_plan.md## Constraints > ### User Research Controls` | 两段式 focus（verbatim + 理解）；URC 唯一叙事权威 | renderer 写入；兼容三种形式 |
| `rb_profile.yaml` | research_profile、root_must_answer_set、hitl1.status/recorded_at、research_access、research_style_params | **hitl1 无 rationale 字段** |
| topic-state apply（hitl1 context） | canonical registry + UID-bound seed skeletons | **HITL1 apply 不携带 rerun direction**（CTS 明确） |

### 2.2 HITL1 内容在下游的消费强度

| 节点 | 消费 | 强度 |
|---|---|---|
| setup | 不读 controls | 正确：只做 structural consistency |
| seed-topics | 读 controls（"when present"），**可将**焦点投影为 search_guardrails/evidence_route | MAY，需对 applicable Topic 收紧 |
| wave0 | 读 controls（"when present"），**MAY** 在 task_brief 加一句 beacon 坐标 | MAY；且必须在 Wave0 自己的 enqueue 点完成 |
| wave1 | 同上；另有 depth-review 的 `focus_coverage` 块（绑 topic UID + rerun_count，但「正面来源」未写清） | MAY + 一个含糊消费点 |
| wave2 | 读 controls（"when present"）；resolver 只做 round-awareness；**synthesis task 不呈现 current-intent coverage** | MAY + 最弱环 |
| final | 当前 phase 未显式列出 controls；`composition_handoff` 只拥有交付语义 | 与 accepted original-coordinate consumption 存在需收敛的 drift |

### 2.3 rerun 出口写入与下游消费

- HITL2：`hitl2.rationale`（HIU-003：rerun 带新/修订 focus 时必须两段式——verbatim + 理解）。
- `rb_plan.md## Decisions`：模板已经规定 append-only、最新在上，但当前 rerun phase 没有把 accepted rationale materialize 成多轮可读 revision；后续 profile rationale 被覆盖后，人类无法从 host file 看见完整打磨轨迹。
- phase-rerun：读 rationale → 对比推断 → `add_topic` / `update_intent` / `set_rerun_direction`（六字段 direction，count = profile+1）→ topic-state 原子提交 → 递增 rerun_count → rerun-ready gate。crash-safe（resolver 的 future/matching/stale 三态 + recover）。
- 下游：Wave0 在自己的 queue filling 中消费 canonical seed 与 current direction；Wave1/Wave2 有本地 resolver；**Wave2 synthesis 尚未呈现 current-intent coverage**。
- post-final（C5）：`operate-post-final-recovery apply` 请求 = schema version + action + multiline free-form reason/scope + identity/bindings；Engine 不评语义。现有 serializer 会把 reason/scope 确定性写入 rationale，并在 C5 audit event 中分开保留；缺的是两段式 authoring contract，不是 schema capacity。

## 3. 弱点分级

- **W1 既有 Decisions 未被使用**：current profile 只保留当前 rationale，多轮 rerun 后缺少一个 host-file narrative history 与 current stop point。
- **W2 消费义务偏软**："when present" / "MAY append beacon" 让正确执行依赖 Agent 自觉。
- **W3 post-Final authoring 未复用既有两段式约定**：能力已经存在，但 playbook 只写 `<decided reason>`。
- **W4 Wave0 的责任位置容易误判**：future Wave0 work unit 由 `phase-wave0` 创建；seed-topics 不能替它保证 task context。
- **W5 delegated interface 使用不精确**：真正进入 immutable `task.md` 的是 queue-owned `task_brief`，不是把原话塞进 `action`。
- **W6 Wave2/Final 缺 current-intent stop point**：读者需要重新拼 controls、directions、coverage 与 handoff。
- **W7 semantic proof 容易越界**：substring/equality test 只能证明文本复制，不能证明 Agent 正确理解或研究真正覆盖。

## 4. 设计原则

- **P1 原始痕迹留在既有 host file**：HITL1 baseline 留在 controls；每轮 accepted revision 留在既有 Decisions；current profile/C5 继续拥有 machine/audit decision。
- **P2 Source + bounded projection，不做 verbatim fan-out**：执行表面可携带坐标与 task-local interpretation，不复制整段原话。
- **P3 Decision-point proximity**：Wave0/1/2 在实际 enqueue/claim/synthesis 点读取 current intent，不依赖几十段前的提醒。
- **P4 使用现有 interface**：delegated handoff 用 `task_brief`；完成证明用 `focus_coverage`；Wave2 用现有 synthesis artifact。
- **P5 Engine 不加语义判断**：只保留既有 round/schema/transaction/submitted-backing verdict；Agent 负责映射与综合。
- **P6 不新增 HITL、state、Gate、queue kind、memory 或 controller**；`stop: no` 沉默纪律不动。

## 5. 机制设计

### 机制 1：让既有 `rb_plan.md` 真正接纳多轮变化

- HITL1 controls 继续是 baseline，不把后续历史塞回一次性 snapshot。
- `phase-rerun` 对普通 HITL2 与 post-Final C5 采用同一个 writer point：在形成 topic candidate 前，把 current accepted decision 写入 `rb_plan.md## Decisions` 顶部。
- 每个 immutable revision 同时保存：本轮 delta、用户原话、Agent 理解、affected Topics、supersedes/withdraws，以及相对 HITL1 baseline 的当前累计有效 amendments。
- 正常恢复只读 controls + 顶部 revision；旧 entries 只在审计多轮打磨时读取。未接受的 HITL 对话草稿不写入。
- 写入/确认 revision 后重新运行 existing topic-state inspect，再构造/apply candidate；current topic-state renderer 只刷新 Topic Registry 并保留其他 plan body，因此不增加 plan transaction、writer 或 parser。
- presentation-only Final feedback 继续留在既有 Final version lineage；只有改变 research semantics 并进入 legal rerun 的 feedback 才形成本类 revision。
- post-Final 有新/修订 focus 时，现有 request `reason` 使用 `用户的重点原话（逐字保留）` + `Agent 对本轮额外研究方向的理解（可由用户修正）` 两段；`requested_scope` 保持独立。
- 不新增 runtime 文档、`focus` object、`hitl1.rationale`，也不把 Alignment Snapshot 变成 transcript。

### 机制 2：加固 topic / attempt projection

- **Seed Topics**：applicable controls 必须投影到既有 enrichment/body；不适用不写，信息不足写 explicit gap，不复制完整 snapshot。
- **Rerun direction**：`rationale_excerpt` 是 bounded topic-local why；不同 Topic 可不同，但必须来自同一 current recorded rationale，并随同一 target round 的 retained input 原子提交。
- **Wave0/Wave1/Wave2 delegated work**：实际 enqueue 点 author queue-owned `task_brief`，携带 controls/Decisions-current/seed coordinates、current-direction 读取规则和 bounded task objective；不把完整 verbatim 放进 `action`、result、receipt 或 ledger。
- **Wave0 特例**：由 `phase-wave0` 自己为 `wave0_source_intake` demand 写 task brief，不依赖 seed-topics 预写未来 work unit。

### 机制 3：用既有 proof / synthesis 表面闭环

- **Wave1**：focus 正面来源为 round 0 controls + seed projection，或 rerun N baseline controls + Decisions 顶部 revision + matching direction；`focus_coverage` 只用 current-round submitted refs / honest limitation。
- **Wave2**：pure synthesis 读取 Decisions 顶部 revision、current directions、current focus coverage、carried-target receipt 与 verified evidence；在 `synthesis.md` 增加 presentation-tolerant current-intent coverage，不改 finding/ledger schema。
- **Final**：同时读取 controls baseline、Decisions 顶部 revision、Wave2 intent coverage（完成/受限视图）和 `composition_handoff`（交付语义）；任何一个都不替另一个补 authority。
- **Setup**：继续只做 structural consistency，不读取用户意图。

## 6. 「不破坏」清单

**明确不改 / 保持：**
- RTI resolver 五态、direction 六字段、rerun-ready gate 语义、rerun_count 语义、crash-safe 恢复。
- CTS「HITL1 apply 不携带 rerun direction」。
- URC snapshot 的三种兼容形式；它继续是 HITL1 baseline 的 sole narrative authority，后续 revisions 使用已有 Decisions，不改写 snapshot。
- HIU 两段式约定、HITL 环模型、stop:no 沉默纪律（re-echo 是本地写，不浮出水面）。
- topic-state 原子 writer、queue/work-unit/ledger/receipt 权威边界。
- C5 request schema、eligibility/lineage/event-last recovery 判定。
- finding-index / ledger schema 与全部 Gate rules。

**需要走 OpenSpec change 的（若采纳）：**
- 一个 `strengthen-user-intent-carry-through` change：existing Decisions 多轮接纳、post-final authoring、Seed projection、delegated task brief、Wave1 focus source、Wave2 synthesis、Final consumption。
- 预计只改 accepted specs、phase/playbook Markdown 与 verification assets；不改 production `.mjs`。若 proposal discovery 推翻这一点，必须先回写 design/tasks。

## 7. 建议的最小第一步

直接 proposal 一个 OpenSpec change：`strengthen-user-intent-carry-through`。不先做 schema change，也不拆成 capture/consumer 两个半链 change。完整 progress checklist 见 `user-intent-carry-through-implementation-plan.md`。

## 8. 测试锚点

- **Integration**：带两段式 multiline `reason` 的 post-Final apply 保留 rationale/event 中既有结构；只证明 serializer/durability。
- **Integration / deterministic E2E**：连续两个 rerun revision 最新在上、旧条目字节保留，topic-state plan replacement 不丢 Decisions history。
- **Markdown integration**：正确 phase decision point 使用 baseline + current revision coordinates + `task_brief`，并明确只有 host-file history 保存原话，不向 N 个执行 artifact fan-out。
- **Existing deterministic suites**：direction resolver、topic-state atomic apply、current-round focus binding、rerun continuity 不回归。
- **Agent-flow E2E**：真实 Subject Agent 在两轮反馈中正确保留/修改/撤回上一轮 amendment，并从 controls + 顶部 revision/current direction 形成 task/coverage/synthesis。不可用时 `NOT_RUN`，不得用 fixture PASS 代替。

## 9. 关联

- v1：`rerun-feedback-carry-through-design-analysis.md`（同目录，被本稿吸收扩展）
- specs：`agent/hitl-ux`（HIU-001/002/003）、`research/user-research-controls`（URC-001）、`workflow/rerun-topic-integration`（RTI）、`research/canonical-topic-state`（CTS）、`research/post-final-recovery`（POF）、`engine/schema-core`（SCO）、`research/research-styles`（RES）、`research/seed-topic-materialization`、`research/wave2-synthesis`、`research/pre-research-phase-content`
- phase MD：phase-hitl1 / phase-setup / phase-seed-topics / phase-wave0 / phase-wave1 / phase-wave2 / phase-final / phase-rerun
- playbooks：`command_playbook/operate-topic-state.md`（Rerun Direction Input）、`command_playbook/post-final-recovery.md`
- 实账：`dpt_rb_enterprise-ai-transformation-six-cases` rerun_count 1（org-roles supplement）；HITL1 观察（seed 预览后补充，原话只留在入口环节）

## 附：一处对 v1 的事实修正

v1 称「wave0/wave1/wave2 的 §3.0 direction resolver 会读方向段」不准确：Wave1/Wave2 有明确 local resolver，Wave0 在自己的 direct-fact classification/queue filling 中消费 seed direction。seed-topics 创建的是 seed materialization card，不拥有未来 `wave0_source_intake` work-unit context。另一个关键修正是：进入 immutable `task.md` 的专用 interface 是 queue-owned `task_brief`，不是把原话塞进 `action`。
