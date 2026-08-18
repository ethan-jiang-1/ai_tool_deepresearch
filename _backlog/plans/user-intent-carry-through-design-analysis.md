# 用户意图变更（补 seed topic / 改重点）的 carry-through：系统性设计分析

> 2026-08-19 | `_backlog/plans/` 设计分析稿 v2（设计讨论用，不是 bug 卡，也不是 OpenSpec change）
> v2 覆盖两个 juncture：**HITL1**（看到 seed topic 预览后想补充/修正）与 **rerun**（HITL2 / post-final）。
> 扩展并吸收 `rerun-feedback-carry-through-design-analysis.md`（v1，只覆盖 rerun 侧；同目录）。
> 总原则：**框架已经成熟——利用既有表面补契约，不新增机制、不搬家、不破坏。**

## 0. 结论先行

用户的直觉是对的：「他当时知道，流转后不记得」真实存在，但**丢的不是结构化决定，而是「用户原话 / 为什么」这一层**。

- **L1 结构化决定层已经 carry 得很好，不会丢**：HITL1 的补充/修正走 `operate-topic-state apply` 原子写入 canonical registry + 每 topic `must_answer` + seed skeleton（Engine 校验）；rerun 侧走 `## 本轮重跑方向` 六字段 + shared resolver 五态（Engine 校验 + round-bound）。
- **会丢的是 L2/L3 叙事层**：入口写一次，下游全靠 Agent「自觉重读」，消费契约全是 *when present* / *MAY*；setup/final 甚至完全不读。这正是「环节流转后不记得」的机制根因。
- 框架里已存在两样可以拼成强制链的东西：**(a) 两段式原话约定**（`用户的重点原话（逐字保留）` + `Agent 的理解`，URC-001 / HIU-003 均已接受）；**(b) per-topic 方向结构**（rerun direction 六字段 + resolver；首轮的等价物是 must_answer + enrich 五字段）。缺口只有三个，且都是「补契约」级别。

## 1. 用户意图变更的三层模型

| 层 | 是什么 | HITL1 侧 canonical 家 | rerun 侧 canonical 家 | 下游消费 |
|---|---|---|---|---|
| L1 结构化决定 | 补什么 topic、必须答什么、边界、guardrails | `root_must_answer_set` + canonical registry + seed frontmatter enrich 五字段 | `## 本轮重跑方向` 六字段（rerun_count/action/new_search_dimensions/adjusted_depth/search_guardrails/rationale_excerpt） | **强**：Engine 校验结构、resolver 决定激活 |
| L2 解释层 | Agent 对用户意图的理解 | controls snapshot 的理解段 / HITL1 Alignment Snapshot | `hitl2.rationale` 的理解段 | **弱**：叙事，靠 Agent 读 |
| L3 原话层 | 用户逐字表述（打磨的原始痕迹） | controls snapshot 的 verbatim 段；**topic 修正的 verbatim 目前无固定家** | `hitl2.rationale` 的 verbatim 段；**post-final 无 verbatim 槽** | **弱/缺失** |

设计目标一句话：**让 L2/L3 获得与 L1 同等的「必读/必写」契约**——每一环把 why 写进它下游必读的 artifact，而不是靠下游自己记得回读入口叙事。

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
| setup | 不读 controls | 无 |
| seed-topics | 读 controls（"when present"），**可将**焦点投影为 search_guardrails/evidence_route | MAY |
| wave0 | 读 controls（"when present"），**MAY** 在 task_brief 加一句 beacon 坐标 | MAY |
| wave1 | 同上；另有 depth-review 的 `focus_coverage` 块（绑 topic UID + rerun_count，但「正面来源」未写清） | MAY + 一个含糊消费点 |
| wave2 | 读 controls（"when present"）；resolver 只做 round-awareness；**synthesis task 不回显 why** | MAY + 最弱环 |
| final | 不读 controls（交付意图已由 HITL2 composition_handoff.primary_focus 覆盖） | 无需新增 |

### 2.3 rerun 出口写入与下游消费

- HITL2：`hitl2.rationale`（HIU-003：rerun 带新/修订 focus 时必须两段式——verbatim + 理解）。
- phase-rerun：读 rationale → 对比推断 → `add_topic` / `update_intent` / `set_rerun_direction`（六字段 direction，count = profile+1）→ topic-state 原子提交 → 递增 rerun_count → rerun-ready gate。crash-safe（resolver 的 future/matching/stale 三态 + recover）。
- 下游：seed-topics 灌料时把 `new_search_dimensions` 写进 wave0 task card；wave1/wave2 有本地 resolver；**wave2 synthesis 不回显 rationale_excerpt**。
- post-final（C5）：`operate-post-final-recovery apply` 请求 = schema version + action + 自由文本 reason/scope + identity/bindings；Engine 不评语义。**reason 是那次用户请求唯一的 durable 记录，但没有 verbatim 槽。**

## 3. 弱点分级

- **W1 转写链无 verbatim 强制**：原话 → rationale（Agent 转述）→ direction.rationale_excerpt（Agent 转述）→ task card（Agent 再转述）。没有一处强制逐字。
- **W2 HITL1 无 profile 级决策记录**：hitl1 只有 status/recorded_at；「用户修正/补充了什么」的 profile 级记录缺失，叙事只在 plan snapshots。
- **W3 消费是机会性的**："when present" / "MAY append beacon"；setup/final 零读取。→ 「他当时知道，流转后不记得」的机制根因。
- **W4 wave2 最弱**：synthesis 只读 evidence-summary/question-list/finding-index，不回显「为什么这轮」。
- **W5 跨 topic 一致性靠 Agent**：同一意图写 N 份 direction，靠 Agent 同步。
- **W6 post-final 无 verbatim 槽**（W1 在 post-final 路径上的根）。

## 4. 设计原则

- **P1 复用已接受约定**：两段式 verbatim+interpretation（URC-001 / HIU-003）、direction 六字段 + resolver 五态（RTI）、topic-state 原子 writer（CTS）、host-file renderer（plan-hostfile-sections）、composition_handoff.primary_focus（schema-core）。
- **P2 Engine 只加结构、不加语义判断**（与 RTI「Engine SHALL NOT judge direction semantics / compare rationale_excerpt」一致）。
- **P3 不新增 HITL、生命周期节点、profile 权威字段族**；gate verdict 语义不动；stop:no 沉默纪律不动（re-echo 全是本地写入，不浮出水面）。
- **P4 不靠记忆**：每环把 why 写进它下游必读的 artifact（task card `action`、depth-review `focus_coverage`、synthesis 范围节），而不是靠下游回读入口叙事。
- **P5 原始痕迹留在既有家，不搬家**：HITL1 focus 的 canonical 仍是 controls snapshot（URC「sole durable narrative authority」）；HITL2 的仍是 profile rationale（HIU-003）。

## 5. 机制设计

### 机制 1：补齐「原话层」的两个缺口（回答「打磨的原始痕迹记在哪儿」）

**1a. post-final 请求加可选 verbatim 槽（推荐做）**
`operate-post-final-recovery apply` 的 retained request 增加 optional `focus: { verbatim, agent_understanding }`（或遵循两段式标签的字符串）。C5 apply 写 `hitl2.rationale` 时保留两段式。
→ post-final juncture 的用户打磨从「只能靠 Agent 转述的 reason」升级为「有逐字记录」。additive optional；Engine 不评语义（延续 POF）；不进 gate 输入。

**1b. `hitl1.rationale`（讨论项，倾向做，但必须写清分工）**
ProfileSchema 给 `human_decision_checkpoints.hitl1` 加 optional 两段式 `rationale`：记录「用户对草案的修正/补充及其理由（含原话摘录）」。
- 分工（避免与已接受 spec 撞线）：rationale = **决定记录**（profile 家）；controls snapshot = **研究指导 literal 快照**（plan 家，URC 权威不变）。focus 的 canonical 语义仍留 controls snapshot，rationale 只引用不替代——因此不违反 HIU-002「accepted focus remains in the existing literal controls snapshot, not a profile field」。
- 收益：hitl1/hitl2 对称；下游 re-echo 有了 profile 级、可被结构检查的源头。
- 替代方案 **1b'（零 schema 变化，先做）**：扩展 HITL1 Alignment Snapshot 写作契约——对每条被用户修正/补充的 structured 决定，snapshot MUST 保留两段式 verbatim 摘录。收益略小（仍在 plan 叙事层），但不碰 ProfileSchema。
- 推荐顺序：先 1b'，1b 作为后续 change 的讨论项。

**1c. 既有家不动**：controls snapshot、alignment snapshot、hitl2.rationale 及其兼容形式（no-controls / ordinary-controls / legacy）全部保留。

### 机制 2：强制 re-echo（消费契约升级；纯 phase MD 写作契约，零 schema/gate 变化）

- **2a. seed-topics：MAY 投影 → MUST 投影**。与某 topic 相关的 controls focus，enrich_seed 的 hypothesis/in_scope/search_guardrails/evidence_route 必须体现（或显式 gap——gap 仍是合法输入供 wave0 收敛，不编造）；seed initialization 的「为什么对最终交付物重要」段回显 verbatim 摘录。
- **2b. wave0/wave1：task card 强制携带 excerpt**。受影响 topic 的 delegated task card `action` 必须含一行「本轮用户要求（原话摘录）：…」——首轮取自 controls snapshot（或 hitl1.rationale / alignment verbatim）；rerun 轮取自 `direction.rationale_excerpt`。现状只有 beacon 坐标（MAY）；升级为 MUST 且带 excerpt 本身。task card `action` 已有非空约束，无 schema 变化。
- **2c. wave1 focus_coverage：写清正面来源**。现在只说不许从文件名/HITL rationale/profile 推断；补一句正面来源：focus 语境必须从 controls snapshot（首轮）/ direction（rerun 轮）读入并绑定本轮 UID + rerun_count。让这个已有消费点从含糊变确定。
- **2d. wave2：synthesis 回显 why**。synthesis task card `action` 必须回显受影响 topic 的方向 excerpt / 首轮 focus；`synthesis.md` 的「本轮范围」节 MUST 引用 rationale/direction excerpt。`cross-topic-ledger.md` 的 HITL2 Handoff 节（6 固定节之一）增加「本轮用户要求」回显行作为讨论项（担心 6 节结构就只落 synthesis.md 范围节，Agent-owned）。finding-index 已绑 `created_in_rerun_count`，轮次身份不会丢。
- **2e. final：无需新增**（composition_handoff 已覆盖交付意图）；**setup：不需要读**（纯结构检查），在 MD 里明确写出即可。

### 机制 3：单一来源 + 派生 + 结构可验证（v1 建议 C/D 的落地）

- **3a. excerpt 派生契约**：phase-rerun 写作规则——每个 direction 的 `rationale_excerpt` 必须以 hitl2.rationale 的 verbatim 段引出（形如 `用户要求：<verbatim>；本轮方向：<guidance>`）。Engine 仍不做语义比较（RTI 不变）；确定性测试断言 verbatim 子串存在。
- **3b. 跨 topic 一致性**：同一 rerun 的多个 direction 已在一个 retained input 中经 topic-state apply 原子提交；再加写作契约——同一 rationale 的 excerpt verbatim 前缀一致。从「靠 Agent 同步」升级为「靠事务 + 契约」。
- **3c.（可选，暂不推荐）**：rationale 升级为结构化子字段 `{verbatim, understanding}`，Engine 才能做 verbatim 子串包含校验。成本：ProfileSchema 破坏性变化 + 历史 bundle 兼容面。留后续评估。

## 6. 「不破坏」清单

**明确不改 / 保持：**
- RTI resolver 五态、direction 六字段、rerun-ready gate 语义、rerun_count 语义、crash-safe 恢复。
- CTS「HITL1 apply 不携带 rerun direction」。
- URC snapshot 的三种兼容形式与「sole durable narrative authority」。
- HIU 两段式约定、HITL 环模型、stop:no 沉默纪律（re-echo 是本地写，不浮出水面）。
- topic-state 原子 writer、queue/work-unit/ledger/receipt 权威边界。
- C5 eligibility/lineage 判定（1a 只是请求 schema 的 additive optional 字段）。

**需要走 OpenSpec change 的（若采纳）：**
- 1a：`post-final-recovery` spec + `operate-post-final-recovery.mjs` request schema。
- 1b：`schema-core` ProfileSchema + `phase-hitl1.md` payload checklist + `shared-profile.md`。
- 1b'：`pre-research-phase-content`（HITL1 phase 对应 spec）。
- 2a-2e：phase MD 写作契约 + 对应 accepted spec delta（seed-topic-materialization、research-wave-phase-content、rerun-topic-integration、wave2-synthesis 等）。
- 3a：`rerun-topic-integration` / `rerun-incremental-node` 写作契约。

## 7. 建议的最小第一步（风险升序）

- **Step 0（零风险）**：本分析稿 + 与用户确认方向。
- **Step 1**：机制 2b/2d（wave task card excerpt + wave2 回显）+ 2a（seed-topics MUST 投影）——纯 MD + spec 写作契约，不碰 Engine/gate/schema。
- **Step 2**：机制 1a（C5 focus 槽，additive optional）+ 3a（excerpt 派生契约）+ 确定性测试（verbatim 全链贯穿断言）。
- **Step 3**：1b'（alignment snapshot verbatim 摘录，零 schema）或 1b（hitl1.rationale，讨论后）。
- **Step 4（可选）**：2d 的 ledger 回显行、3c 结构化 rationale。

## 8. 测试锚点

- **首轮链**：HITL1 修正（含原话）→ controls/alignment snapshot 含 verbatim → enrich_seed 焦点投影 → wave0 task card action 含 excerpt → wave1 focus_coverage 引用 → wave2 synthesis 范围节含 excerpt。
- **rerun 链**：post_final_rerun focus 槽 → rationale 两段式 → N 个 seed 的 rationale_excerpt 均含 verbatim 前缀 → wave1 task card 含 excerpt → wave2 回显。
- 借鉴 `tests/e2e/rerun-round-continuity.test.mjs` 的 baseline 模式（HITL2 → phase-rerun → seed-topics → waves 全链）。

## 9. 关联

- v1：`rerun-feedback-carry-through-design-analysis.md`（同目录，被本稿吸收扩展）
- specs：`agent/hitl-ux`（HIU-001/002/003）、`research/user-research-controls`（URC-001）、`workflow/rerun-topic-integration`（RTI）、`research/canonical-topic-state`（CTS）、`research/post-final-recovery`（POF）、`engine/schema-core`（SCO）、`research/research-styles`（RES）、`research/seed-topic-materialization`、`research/wave2-synthesis`、`research/pre-research-phase-content`
- phase MD：phase-hitl1 / phase-setup / phase-seed-topics / phase-wave0 / phase-wave1 / phase-wave2 / phase-final / phase-rerun
- playbooks：`command_playbook/operate-topic-state.md`（Rerun Direction Input）、`command_playbook/post-final-recovery.md`
- 实账：`dpt_rb_enterprise-ai-transformation-six-cases` rerun_count 1（org-roles supplement）；HITL1 观察（seed 预览后补充，原话只留在入口环节）

## 附：一处对 v1 的事实修正

v1 称「wave0/wave1/wave2 的 §3.0 direction resolver 会读方向段」——准确说法是：**wave0 没有本地 resolver**，它的 supplement 输入由 seed-topics 灌料时把 `new_search_dimensions` 写进 wave0 task card（phase-seed-topics Rerun-Aware 节）；wave1/wave2 才有本地 resolver。这反而强化了机制 2b 的必要性：wave0 的保真链多一跳（direction → seed-topics 灌料 → task card），MUST-carry excerpt 恰好能把这跳也从「靠自觉」变成「必写」。
