---
doc_id: wave2-emergent-phenomena
title: "Wave2 涌现现象：跨话题合成中的探索/利用动态"
status: draft
created: 2026-06-24
revised: 2026-06-24
language: zh-CN
layer: design-exploration
context: wfq-wave2-synthesis Change 3 proposal 评审中发现的盲区
related:
  - _backlog/queue/agentic-queue-landing-analysis.md
  - _backlog/wave2_e2/wave2-engine-feedback-rails.md
  - openspec/changes/wfq-wave2-synthesis/
---

# Wave2 涌现现象：跨话题合成中的探索/利用动态

## 0. 这份文档是什么

`wfq-wave2-synthesis` proposal 把 Wave2 建模为 "queue-driven synthesis with gap-fill loop"：main-agent 写 `synthesis.md`，发现 gap 时 spawn sub-agent 补搜，再回写 synthesis。这个方向是对的，但原草案仍然把 Wave2 的关键动态压进一份 Markdown 叙事里。

这里需要修正一个更深的机制问题：

> Wave2 不是"写一篇 synthesis.md"。Wave2 是一个 cross-topic cognition phase：它要读取 Wave1 的 per-topic evidence 和 question ledger，发现跨 topic 的 resolution、legacy gap、emergent question，并把这些动态对象沉淀成可审阅、可投影、可由 JS engine 做结构反馈的 artifact group。

本文档只做机制推敲，不定义 accepted behavior，不替代 OpenSpec。当前目标是把想法调对：Wave2 该产生什么认知对象、这些对象如何动态增长、main-agent/sub-agent/queue/JS engine 各自帮什么，以及为什么不能只靠一个 `synthesis.md`。

配套文档 `_backlog/wave2_e2/wave2-engine-feedback-rails.md` 专门讨论 JS feedback rails：JS 不判断内容聪不聪明，但要持续发现"流程、引用、状态、receipt 断链"。

### 0.1 与 `guidelines/` 的对齐

这份探索必须服从 repo charter，而不是另起一套机制：

- **Project Charter**: LLM/main-agent 负责 cross-topic 判断、证据取舍和综合表达；Markdown/ledger 承载 Agent Flow 和 reasoning surface；JS/CLI 只做 deterministic checkpoint 和 check/inspect/advice feedback。
- **Framework Runtime Boundary**: 这里提到的 `artifacts/wave2/synthesis.md`、`cross-topic-ledger.md`、`finding-index.yaml` 都是 active run bundle 里的 runtime artifacts，未来应落在 `dpt_rb_*` 或 `dpt_disp_*`，不是写回 `DPT_FRAMEWORK/` 的 framework state。
- **Agentic Workflow Mechanism**: Wave2 仍由 Agent 读 phase MD 后执行；JS feedback check 只能由 Agent 调用并读回结果，不能变成 JS walker、scheduler 或 hidden controller。
- **Agentic Queue Mechanism**: queue 只能管 phase 内 task receipt；它不管 phase transition，不替代 gate/chain。Wave2 三件套可以成为 synthesis task 的 receipt surface，backfill 可以拆成 per-topic queue tasks，但 queue 不做语义裁决。
- **Sub-Agent Boundary**: sub-agent 只处理 WebSearch/WebFetch 等高噪声 I/O。`cross_topic_resolution` 和 finding triage 必须留在 main-agent；sub-agent 不做跨 topic synthesis judgment。
- **Command Experiments**: 将来验证这套机制时，应使用 real disposable bundle、真实 artifact、真实 receipt/trace 和 thin JS checkpoint；不能用脚本伪造 finding、receipt 或 trace 来证明通过。
- **OpenSpec discipline**: 本文档只是 design exploration。任何 accepted behavior、schema、gate rule、receipt grammar、CLI contract 的变化，都必须后续走 OpenSpec proposal/spec/tasks，再实现和验证。

---

## 1. 核心洞见：Wave2 的新东西不是一种 gap

### 1.1 Wave2 的输入空间

进入 Wave2 时，Agent 面前的信息来自 Wave0 和 Wave1：

```text
reference/<topic>/source.yaml
  Wave0 foundation reference metadata

artifacts/wave1/<topic>/evidence-summary.md
  Wave1 topic-specific evidence summary
  - Source URLs
  - Key Findings
  - Open Questions

artifacts/wave1/<topic>/question-list.md
  Wave1 per-topic exploration ledger
  - Topic Investigation Targets
  - Question Reconciliation
  - Emergent Question Protocol
  - Exploration / Exploitation Decision
```

Wave1 的 `question-list.md` 是 per-topic 视角的账本。它回答的是："在这个 topic 房间里，我们原本想问什么？搜完之后哪些有进展？搜着搜着又冒出什么？哪些还要继续？"

Wave2 的独特价值不在于把这些房间报告拼起来，而在于走到 cross-topic 视角后，看到单个房间里看不到的关系：

```text
per-topic 视角                         cross-topic 视角
═══════════════                        ════════════════

Topic A: "A 呈现趋势 X↑"              "A 和 B 都呈现 X，但方向相反
Topic B: "B 呈现趋势 X↓"        ->     -> 什么导致了分化？"
                                      这个问题在 A 或 B 单独的 question-list
Topic C: "C 与 X 无关"                里都不可表述；它只在拉通后存在。
```

### 1.2 三类 Wave2 finding

Wave2 中出现的"新东西"至少有三类，不能统一叫 gap：

| Finding type | 来源 | 正确动作 | 是否搜索 | 归属 |
| --- | --- | --- | --- | --- |
| `wave1_legacy_question` | Wave1 question-list 已有 `[仍开放]` / `[部分进展]` | 先做 cross-topic 对齐；若未解且可搜索，再定向补搜 | 可能需要 | 原 topic + Wave2 ledger |
| `cross_topic_resolution` | A topic 的问题被 B/C topic 既有 evidence 回答或部分回答 | 记录 resolution、更新状态、投影回相关 topic | 不需要 | Wave2 ledger |
| `cross_topic_emergent_question` | 多个 topic 拉通后首次出现的 pattern、矛盾、空白、机制差异 | 做 exploration/exploitation decision；搜索、记录、移交或暂存 | 视 decision | Wave2 ledger |

这个分类把原来的 `emergent resolution` 改名为 `cross_topic_resolution`。原因是它不是一个新问题，而是对已有问题的整合性解答；"emergent" 应主要留给 Wave1 阶段不存在、Wave2 拉通后才出现的问题。

### 1.3 与 Wave1 四区账本的关系

Wave2 不是复制 Wave1 四区，而是在 meta 层利用 Wave1 四区：

| Wave1 per-topic section | Wave2 如何使用 |
| --- | --- |
| Topic Investigation Targets | 提供 legacy question inventory |
| Question Reconciliation | 提供 `[已解决]` / `[部分进展]` / `[仍开放]` / `[需内部数据]` 状态输入 |
| Emergent Question Protocol | 提供 per-topic emergent question，可被 Wave2 再对齐或升级成 cross-topic finding |
| Exploration / Exploitation Decision | 提供后续行动线索，但 Wave2 需要重新做 cross-topic decision |

Wave1 的输入是 search guardrails 和 topic-local questions。Wave2 的输入是 Wave1 已形成的 evidence + question state。Wave2 的探索/利用判断不是"这个 topic 还要不要搜"，而是"这个跨 topic 关系是否值得追、能否公开搜索、是否必须移交人类或内部数据"。

---

## 2. 为什么一个 `synthesis.md` 不够

### 2.1 Narrative 会掩盖动态过程

`synthesis.md` 是最终叙事，它适合写：

- 综合判断
- 跨 topic pattern
- 关键引用
- 给 HITL2 或 final report 的阅读入口

但它不适合承担动态账本：

- 哪些 topic pair 被检查过？
- 哪个 Wave1 开放问题被哪个其他 topic 的 evidence 回答？
- 哪些 finding 是新出现的，哪些只是旧问题的状态更新？
- 哪个 finding 决定搜索、哪个决定 defer、哪个需要内部数据？
- 搜索是否真的发生，有没有 relay runtime receipt？
- 哪些 finding 已进入 narrative，哪些只进入 HITL2 handoff？

如果这些都藏在一篇自由叙事里，JS engine 最多检查"文件存在、非空、有链接"。这会让 Agent 看起来完成了 synthesis，但我们不知道它是否真的走过 cross-topic scan、finding triage、exploration decision、receipt-backed repair 这些关键动作。

### 2.2 Wave1 的启发：行为要显形

Wave1 不是只产出一篇 summary。它有 paired artifacts：

```text
artifacts/wave1/<topic>/evidence-summary.md
  "What we know"

artifacts/wave1/<topic>/question-list.md
  "What we still do not know / what changed"
```

JS 仍然不能判断 Wave1 的语义质量，但它可以通过 paired files、四节结构、source URL、key findings、canonical labels、backfill token replacement 把 Agent 拉回正确轨道。

Wave2 也需要同样的"行为显形"。不同点是 Wave2 是 fan-in/cross-topic，不是 per-topic fan-out，所以它需要的是 artifact group，而不是每个 topic 两个文件。

---

## 3. 建议的 Wave2 artifact group

Wave2 应从单一 `synthesis.md` 升级为三件套：

```text
artifacts/wave2/
  synthesis.md
  cross-topic-ledger.md
  finding-index.yaml
```

这些路径描述的是每个 active runtime bundle 内的产物形状。`DPT_FRAMEWORK/` 只应保存未来的 phase instructions、schema/gate definitions 或 CLI/checker code；它不保存某次 run 的 ledger、index、receipt、HITL handoff 或 synthesis 结果。

### 3.1 `synthesis.md`: final narrative projection

职责：

- 面向人类阅读的 cross-topic narrative。
- 组织最终综合判断、关键 patterns、残留问题。
- 引用 Wave0/Wave1 artifacts。
- 引用 Wave2 finding id，例如 `W2F-003`，让 narrative 可以追溯回 ledger/index。

非职责：

- 不作为动态 finding 的 source of truth。
- 不承载完整 scan matrix。
- 不证明 exploration 真的发生。
- 不独自决定 seed topic backfill。

### 3.2 `cross-topic-ledger.md`: dynamic cognition ledger

这是 Wave2 的 Agent-readable source of truth，地位类似 Wave1 的 `question-list.md`，但粒度是 cross-topic。

固定 sections：

```markdown
# Cross-Topic Ledger

## Cross-Topic Scan Matrix

## Wave1 Legacy Questions

## Cross-Topic Resolutions

## Emergent Cross-Topic Questions

## Exploration Decisions

## HITL2 Handoff
```

每个 section 的职责：

| Section | 作用 |
| --- | --- |
| Cross-Topic Scan Matrix | 记录哪些 topic pair/group 被检查，检查了 shared pattern、contradiction、resolution opportunity、emergent question 哪些维度 |
| Wave1 Legacy Questions | 从 Wave1 question-list 汇入未完全解决的问题，并记录 Wave2 对齐后的状态 |
| Cross-Topic Resolutions | 记录用其他 topic 既有 evidence 回答 legacy question 的整合动作 |
| Emergent Cross-Topic Questions | 记录 Wave1 阶段不存在、Wave2 拉通后才出现的新问题 |
| Exploration Decisions | 记录每个 finding 的 action decision，尤其是否需要 sub-agent search |
| HITL2 Handoff | 汇总需要人类判断、内部数据、或超出 Wave2 budget 的 finding |

`cross-topic-ledger.md` 是动态增长文件。每轮 synthesis/repair/exploration 后，它应追加或更新 finding 状态，而不是只在最后写一次总结。

### 3.3 `finding-index.yaml`: JS-readable shadow index

`finding-index.yaml` 是 ledger 的结构化影子，不替代 ledger，也不承载长篇 reasoning。它让 JS engine 能做确定性反馈。

建议先采用 v0 最小形状，避免第一版 schema 过重。v0 只保留能支撑 JS feedback 的核心生命周期字段；更多 projection/backfill 细节可在 ledger 中写 prose，或作为 v1 扩展加入。

```yaml
version: 0.1
source_layer: wave2_cross_topic
ledger: artifacts/wave2/cross-topic-ledger.md
synthesis: artifacts/wave2/synthesis.md
scan:
  topic_count: 3
  pair_count_expected: 3
  pair_count_checked: 3
findings:
  - id: W2F-001
    type: cross_topic_resolution
    status: partial
    decision: use_existing_evidence
    affected_topics: [topic-a, topic-b]
    origin_refs:
      - artifacts/wave1/topic-a/question-list.md
    trigger_refs:
      - artifacts/wave1/topic-b/evidence-summary.md
    search_required: false
    subagent_receipt_refs: []
    appears_in_synthesis: true
    hitl2_handoff: false

  - id: W2F-002
    type: cross_topic_emergent_question
    status: deferred
    decision: requires_internal_data
    affected_topics: [topic-a, topic-c]
    origin_refs: []
    trigger_refs:
      - artifacts/wave1/topic-a/evidence-summary.md
      - artifacts/wave1/topic-c/evidence-summary.md
    search_required: false
    subagent_receipt_refs: []
    appears_in_synthesis: true
    hitl2_handoff: true
```

字段含义：

Top-level fields:

| Field | Required | Purpose |
| --- | --- | --- |
| `version` | yes | Index schema version for future migration |
| `source_layer` | yes | Always `wave2_cross_topic` for this artifact |
| `ledger` | yes | Path to the Agent-readable ledger |
| `synthesis` | yes | Path to the narrative projection |
| `scan` | yes | Topic/pair scan accounting for JS feedback |

Finding fields:

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Stable finding id, e.g. `W2F-001` |
| `type` | yes | `wave1_legacy_question` / `cross_topic_resolution` / `cross_topic_emergent_question` |
| `status` | yes | `resolved` / `partial` / `open` / `deferred` |
| `decision` | yes | one of the decision values in §5 |
| `affected_topics` | yes | 相关 topic；cross-topic finding 至少 2 个 |
| `origin_refs` | yes | legacy question 的来源；emergent question 可为空但必须显式为空 |
| `trigger_refs` | yes | 触发 finding 的 evidence/question refs |
| `search_required` | yes | 是否需要 sub-agent search |
| `subagent_receipt_refs` | yes | 搜索发生时的 relay/runtime receipt refs |
| `appears_in_synthesis` | yes | 是否已进入 narrative projection |
| `hitl2_handoff` | yes | 是否进入 HITL2 |

Optional v1 extension fields:

| Field | Purpose |
| --- | --- |
| `backfill_topics` | 哪些 seed topic 会收到投影 |
| `synthesis_refs` | `synthesis.md` 中引用该 finding 的 section/anchor |
| `handoff_refs` | HITL2 handoff 中引用该 finding 的 section/anchor |
| `last_checked_at` | 最近一次 JS feedback check 时间 |
| `repair_attempts` | 当前 finding 在同一 boundary 的修复次数 |

---

## 4. Wave2 执行机制

### 4.1 总体 loop

```text
1. Inventory Wave1 artifacts
   - evidence-summary.md
   - question-list.md

2. Build / update cross-topic-ledger.md
   - scan matrix
   - legacy question inventory
   - candidate resolutions
   - emergent questions

3. Write / update finding-index.yaml
   - every finding gets id, type, status, decision, refs

4. JS feedback rails run
   - missing sections?
   - invalid refs?
   - search decision without receipt?
   - impossible decisions?

5. If feedback fails, repair ledger/index first

6. For search decisions, spawn bounded sub-agent
   - exploit_search for legacy question
   - explore_search for emergent question
   - sub-agent only searches/fetches/extracts; it does not synthesize

7. Update ledger/index with results and receipts

8. Write synthesis.md as projection

9. Backfill seed topics as projection from ledger/index
```

这里的 "JS feedback rails run" 不是 JS 自动驱动 workflow。正确形态是：main-agent 按 phase MD 调用 CLI/checker，读取 check/inspect/advice，再由 main-agent 决定修复、搜索、降级、移交或继续。

反馈节奏应该按 semantic boundary，而不是按每次文字编辑：

- 初建 ledger/index 后检查一次，防止结构歪掉。
- finding triage 完成后检查一次，防止 type/decision/status/refs 断链。
- sub-agent search 前检查一次，防止把不该搜的 resolution/internal-data finding 送去搜索。
- sub-agent result/receipt ingest 后检查一次，防止声称搜索发生但没有 receipt。
- synthesis projection 后检查一次，防止 narrative drift 或 orphan finding。
- seed-topic backfill projection 后检查一次，防止投影丢失 `source_layer` 或引用不存在的 finding。
- phase 末尾再跑 gate，作为 Wave2 -> HITL2 的 boundary authority。

这样 JS feedback 既不是只在开头/结尾的事后检查，也不是每改一行就打断 Agent Flow。它检查的是状态对象完成一次有意义跃迁后的稳定形状。

### 4.2 Scan matrix is the "did we actually look?" surface

For topic count <= 5, Wave2 should default to checking all topic pairs. The ledger should show that this scan happened even when no interesting finding emerged.

This is a bounded scan policy, not a demand for mechanical table filling:

- If `topic_count <= 5`, check all topic pairs unless the profile explicitly says a topic is out of scope for cross-topic synthesis.
- If `topic_count > 5`, do not require full pairwise scanning. First cluster topics by shared dimension, then scan the most relevant pairs/groups per cluster.
- A "checked; no material relation" row is valid only when the note names the dimension considered. Empty boilerplate rows are noise.
- JS can check that scan accounting exists; it should not force every possible pair when topic count or profile makes that unreasonable.

Example:

```markdown
## Cross-Topic Scan Matrix

| pair_id | topics | checked_dimensions | finding_ids | notes |
| --- | --- | --- | --- | --- |
| P01 | topic-a + topic-b | shared_pattern, contradiction, resolution_opportunity, emergent_question | W2F-001, W2F-002 | A's open question partly answered by B; new divergence question found |
| P02 | topic-a + topic-c | shared_pattern, contradiction, resolution_opportunity, emergent_question | none | Checked; no material cross-topic relation found |
```

这不是要求 Agent 做机械笛卡尔积表演，而是给 JS 和人类一个反馈面：如果 Wave2 声称做了 cross-topic synthesis，却没有 scan surface，就很容易滑回自由总结。

### 4.3 Finding lifecycle

每个 finding 的生命周期：

```text
candidate
  -> classified
  -> decision_made
  -> searched / not_searched / deferred
  -> resolved / partial / open / deferred
  -> projected_to_synthesis and/or hitl2_handoff
  -> backfilled_to_related_seed_topics
```

Ledger 记录 reasoning，index 记录 lifecycle state。JS 不判断 reasoning 是否好，但可以检查 lifecycle 是否断链。

---

## 5. Exploration / exploitation decision

Wave2 不应采用"发现 gap 就搜"的机械规则。每个 finding 必须先做 decision。

| Decision | 适用对象 | 动作 | Sub-agent? |
| --- | --- | --- | --- |
| `use_existing_evidence` | `cross_topic_resolution` | 用已有 Wave1 evidence 整合回答 | no |
| `exploit_search` | unresolved `wave1_legacy_question` | 窄域定向补搜 | yes |
| `explore_search` | searchable `cross_topic_emergent_question` | 有限探索新关系问题 | yes |
| `defer_hitl2` | 需要研究重框定、人类取舍、优先级判断 | 进入 HITL2 handoff | no |
| `requires_internal_data` | 需要专有/非公开数据 | 进入 HITL2 handoff，不公开搜索硬凑 | no |
| `record_only` | 低影响或超出当前 Wave2 budget | 记录为 open/deferred，不追 | no |

判断标准：

| Dimension | Search now | Defer / record |
| --- | --- | --- |
| Searchability | 有明确关键词、公开资料、可在少量搜索中验证 | 概念性、需要内部数据、需要大规模数据集 |
| Impact | 影响多个 topic 的关键 claim 或 synthesis 结构 | 只影响边缘观察 |
| Cost | 预计 <= 2 次 WebSearch + <= 3 个 WebFetch | 会发散成新研究 |
| Evidence relation | 可能被少量外部 source 补强或反驳 | 需要全新研究方法或 human prioritization |

探索上限仍然需要，但语义要分开：

- legacy gap-fill 是 exploit，目标是收敛。
- emergent exploration 是 explore，天然可能发散。
- 达到上限后，未解决 finding 必须进入 `HITL2 Handoff` 或 `record_only`，不能静默消失。

---

## 6. Main-agent / sub-agent / queue / JS 的分工

### 6.1 Main-agent

Main-agent 负责：

- 读取所有 Wave1 evidence 和 question-list。
- 建立 cross-topic scan matrix。
- 判断 finding type。
- 做 exploration/exploitation decision。
- 综合 sub-agent 的 bounded result。
- 更新 ledger/index。
- 写 synthesis projection。
- 做 seed topic backfill projection。

Main-agent 不应该把 cross-topic judgment 外包给 sub-agent。

### 6.2 Sub-agent

Sub-agent 只做高噪声外部 I/O：

- WebSearch
- WebFetch / fallback fetch chain
- source extraction
- bounded JSON result
- runtime receipt

Sub-agent 不负责：

- 判断跨 topic synthesis 是否成立。
- 更新 ledger/index 的最终状态。
- 写 gate/status/queue。
- 把 emergent question 归属到某个 topic。

### 6.3 Queue

Queue 可以用于：

- 一个 main-agent `cross_topic_synthesis` task，receipt 至少覆盖三件套 artifact 存在。
- N 个 seed topic backfill task，逐 topic 投影 Wave2 finding。
- repair task：当 JS/gate 发现缺文件、缺 section、缺 token replacement 时，把 Agent 拉回修复。

Gap-fill/exploration search 是否进入 queue，需要后续落地时再定；机制上它仍是 synthesis task 内的顺序依赖动作，可以由 main-agent 直接 spawn relay sub-agent。

### 6.4 JS engine

JS engine 是 feedback rail，不是 semantic judge。

它不能判断：

- `cross_topic_resolution` 是否"聪明"。
- emergent question 是否"深刻"。
- 哪个研究方向更值得追。
- synthesis narrative 是否有最终报告质量。

它应该检查：

- 三件套 artifact 是否存在、非空。
- ledger 是否有固定 sections。
- `finding-index.yaml` 是否可 parse，字段是否完整。
- `cross_topic_resolution` 是否有 legacy origin ref 和 cross-topic trigger ref，且 `search_required=false`。
- `cross_topic_emergent_question` 是否至少涉及两个 topics，且有 decision。
- `explore_search` / `exploit_search` 是否有 sub-agent receipt refs。
- `defer_hitl2` / `requires_internal_data` 是否进入 HITL2 handoff。
- `synthesis.md` 是否引用 finding id，避免 narrative drift。
- 是否存在 orphan finding：既不在 synthesis，也不在 HITL2 handoff。

详见配套文档 `_backlog/wave2_e2/wave2-engine-feedback-rails.md`。

### 6.5 Gate / feedback / trace 的权威关系

Wave2 可以有 phase 内 feedback check，也可以在 phase 末尾有 gate check，但两者都必须保持同一权威边界：

- feedback check 用于让 Agent 早发现 ledger/index 断链，属于下一步 Agent 行动的上下文。
- gate check 用于 phase boundary，通过后才进入 chain 的下一 phase。
- trace/receipt 必须来自真实执行副产物，不能由 Agent 手写来满足检查。
- JS 输出不等于研究结论；它只说明结构、引用、状态、receipt 是否站得住。

---

## 7. Backfill：seed topic 是投影，不是归属地

Wave2 emergent question 属于 synthesis layer，不属于任何一个单独 topic。Seed topic backfill 只是长期研究日志的投影。

Backfill 应明确来源层：

```markdown
### Cross-Topic Questions (from Wave2)

- W2F-002 [涌现] 为什么 topic-a 与 topic-b 在 X 机制上方向相反？
  - source_layer: wave2_cross_topic
  - affected_topics: topic-a, topic-b
  - decision: requires_internal_data
  - see: artifacts/wave2/cross-topic-ledger.md#W2F-002
```

规则：

- 不把 cross-topic emergent question 改写成 topic-local pending question。
- 不隐藏 finding id。
- 不丢失 decision/status。
- 不声称 backfill 是新的 evidence source；source of truth 仍是 Wave2 ledger/index。

---

## 8. Anti-cheating rules

- 禁止只有 `synthesis.md` 而没有 ledger/index，就声称完成 Wave2 emergence handling。
- 禁止把所有 finding 都叫 gap。
- 禁止对 `cross_topic_resolution` spawn sub-agent 搜索；resolution 是 existing evidence integration。
- 禁止把 `cross_topic_emergent_question` 埋进某个 topic 的 pending questions 而不标注 `source_layer: wave2_cross_topic`。
- 禁止 `decision=explore_search` 或 `decision=exploit_search` 但没有 relay/runtime receipt。
- 禁止达到 max iteration 后静默丢弃 unresolved finding；必须进入 HITL2 handoff 或 record-only。
- 禁止 `synthesis.md` 写出没有 finding id 支撑的关键 cross-topic claim。
- 禁止让 sub-agent 做 cross-topic judgment；sub-agent 只返回 bounded search/extraction result。

---

## 9. Review scenarios

### Scenario A: Cross-topic resolution

Topic A 的 question-list 有 `[仍开放]` 问题：某机制是否存在实际部署证据。Topic B 的 evidence-summary 已引用一个 source，说明相同机制在邻近场景中的部署限制。

Expected:

- ledger 生成 `W2F-001`
- type = `cross_topic_resolution`
- decision = `use_existing_evidence`
- search_required = false
- origin_refs 指向 Topic A question-list
- trigger_refs 指向 Topic B evidence-summary
- synthesis 引用 `W2F-001`
- backfill Topic A，标记 partial/resolved

### Scenario B: Emergent exploration

Topic A 和 Topic B 都讨论同一指标，但方向相反。Wave1 任何 question-list 都没有问"为什么分化"。

Expected:

- ledger 生成 `W2F-002`
- type = `cross_topic_emergent_question`
- affected_topics 至少两个
- decision = `explore_search` 或 defer/internal-data
- 若 `explore_search`，必须有 sub-agent receipt refs
- synthesis 引用 `W2F-002`

### Scenario C: Requires internal data

跨 topic 对比发现某结论需要产品内部 usage data 或私有 benchmark 才能回答。

Expected:

- decision = `requires_internal_data`
- search_required = false
- hitl2_handoff = true
- 不 spawn sub-agent
- synthesis 和 HITL2 handoff 都保留 finding id

### Scenario D: Narrative drift

`synthesis.md` 写了一个强 cross-topic claim，但没有对应 finding id。

Expected:

- JS feedback 应提示 narrative claim 脱离 ledger/index。
- Agent 应补 ledger finding 或降级该 claim。

### Scenario E: Orphan finding

`finding-index.yaml` 里有 `W2F-004`，但既没有进入 synthesis，也没有进入 HITL2 handoff。

Expected:

- JS feedback 应提示 orphan finding。
- Agent 应决定 projection：进入 synthesis、进入 HITL2、或标记 record_only 且说明原因。

---

## 10. 边界

本文档不做这些事：

- 不修改 OpenSpec。
- 不定义 accepted spec。
- 不要求现在立刻修改 engine/gate/phase node。
- 不要求 JS 判断语义质量。
- 不引入新的 sub-agent 角色；优先利用已有 `dpt-topic-scout`、relay、queue、gate feedback pattern。

本文档要固定的是设计方向：

> Wave2 的可靠落地，不应从"如何把 synthesis.md 写漂亮"开始，而应从"如何让 cross-topic finding 动态显形，并让 JS engine 能持续反馈断链"开始。

---

## Appendix A: 与当前 wfq-wave2-synthesis proposal 的关系

| Proposal 元素 | 本文档的调整 |
| --- | --- |
| 1 个 synthesis task | 保留，但 task 的产物应是三件套，而不是只写 `synthesis.md` |
| N 个 backfill task | 保留，backfill 从 ledger/index 投影，不直接从 narrative 摘抄 |
| gap-fill loop | 改名为 finding triage + targeted search；不是所有 finding 都是 gap |
| dpt-topic-scout | 保留为 bounded search/exploration sub-agent，不做 synthesis judgment |
| max iterations | 保留上限，但必须把 unresolved finding 显式沉淀 |
| gate pattern_match | 可继续利用，但需要更多结构化 feedback rails |
| engine/relay 零改动 | 作为短期落地路径仍可成立；长期可考虑 finding-index consistency checks |

## Appendix B: 标签与状态

Wave1 标签可继续使用，但 Wave2 必须额外记录 origin/provenance。

| Label / status | Wave2 解释 |
| --- | --- |
| `[开放]` | 未完全回答；可能来自 Wave1 legacy 或 Wave2 emergent |
| `[部分解答]` | 有进展但不完整；可来自 cross-topic resolution 或 search |
| `[涌现]` | Wave1 阶段不存在、Wave2 拉通后首次出现 |
| `[需内部数据]` | 公开搜索不能回答，需要 human/internal data |
| `[已解决]` | 已由 existing evidence 或 search 充分回答 |

仅有标签不够。每个 Wave2 finding 还必须有：

- `source_layer`
- `type`
- `decision`
- `status`
- `origin_refs`
- `trigger_refs`
- `affected_topics`
