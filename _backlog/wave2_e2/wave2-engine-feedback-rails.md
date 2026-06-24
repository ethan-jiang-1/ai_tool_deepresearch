---
doc_id: wave2-engine-feedback-rails
title: "Wave2 JS Engine 反馈轨道：让跨话题涌现不跑偏"
status: draft
created: 2026-06-24
language: zh-CN
layer: design-exploration
context: Wave2 emergent finding 需要传统 JS engine 提供结构反馈，而不是只依赖 Agent 自律
related:
  - _backlog/wave2_e2/emergent-phenomena-in-cross-topic-synthesis.md
  - DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md
  - DPT_FRAMEWORK/schema/README.md
---

# Wave2 JS Engine 反馈轨道：让跨话题涌现不跑偏

## 0. 这份文档是什么

这份文档回答一个问题：

> Wave2 的 cross-topic emergence 主要依赖 main-agent 的语义判断。既然 JS 不能判断内容聪不聪明，它还能怎样帮助 Agent 不发昏、知错改错、回到正确轨道？

答案不是让 JS 变成研究者，而是让 JS 成为 feedback rail：

```text
Agent writes ledger/index
  -> JS checks structure, refs, status, receipt
  -> JS returns check / inspect / advice
  -> Agent repairs ledger/index
  -> Agent writes synthesis/backfill projection
  -> JS checks coverage again
```

JS 不裁决 research quality；JS 裁决"有没有可审计的过程形状"。这正是本项目的基本分工：LLM owns judgment，Markdown controls Agent Flow，Engine owns deterministic checkpoints。

### 0.1 与 `guidelines/` 的对齐

这份 feedback rail 设计只在现有 charter 内工作：

- **不是 JS controller**：JS/checker 不驱动 Wave2 loop，不加载下一 phase，不决定是否推进。Agent 读 MD、调用 checker、读取 feedback、再修复或继续。
- **不是 semantic judge**：JS 不判断 synthesis 是否深刻、resolution 是否聪明、emergent question 是否值得研究；这些仍是 main-agent/HITL 的语义判断。
- **不是 runtime authority 替代品**：accepted gate、queue、receipt、trace contract 仍以 OpenSpec + `DPT_FRAMEWORK/` 实现为准。本文件只是未来设计输入。
- **runtime artifact 不进 framework**：`synthesis.md`、`cross-topic-ledger.md`、`finding-index.yaml`、sub-agent receipts、HITL handoff 都属于 active bundle；`DPT_FRAMEWORK/` 只能放可复用 checker、gate definition、phase MD 或 schema。
- **真实执行优先**：任何 receipt、trace、sub-agent result 都必须来自真实 relay/sub-agent/checker 执行，不能手写假文件让 feedback pass。
- **OpenSpec 后置落地**：如果本设计要变成 accepted behavior，需要后续 proposal/spec/tasks，再实现 CLI/checker/gate/playbook/tests。

---

## 1. Wave1 已有的反馈手段

Wave1 的质量并不是由 JS 判断"研究得好不好"。它靠 paired artifacts 和 gate checks 把行为显形：

```text
artifacts/wave1/<topic>/evidence-summary.md
artifacts/wave1/<topic>/question-list.md
```

JS/gate 已能帮助检查：

| Check | 能防什么 |
| --- | --- |
| per-topic `evidence-summary.md` exists | 防止 topic deepening 被跳过 |
| per-topic `question-list.md` exists | 防止只写 evidence、不记录问题状态 |
| question-list 四节结构 | 防止 exploration ledger 空掉 |
| source URL pattern | 防止没有任何真实来源形状 |
| key findings non-empty | 防止 summary 为空壳 |
| backfill token absence | 防止 seed topic 没闭合 |
| trace/status | 防止 phase 状态漂移 |

Wave1 仍然有盲区：

- JS 不知道 key finding 是否真的重要。
- JS 不知道 Question Reconciliation 是否语义准确。
- JS 不知道 emergent question 是否深刻。

但这些 checks 仍然有价值，因为它们让 Agent 的动作不得不落在可检查的轨道上。Wave2 应该继承这个思想，而不是回到单篇自由文本。

---

## 2. 为什么 Wave2 不能只靠一个 MD

单一 `synthesis.md` 最大的问题不是表达能力不足，而是反馈面太薄。

JS 对一个自由叙事文件通常只能检查：

- file exists
- field non-empty
- Markdown links exist
- at least one link target exists
- trace/status

这些检查不能回答 Wave2 最重要的过程问题：

- 是否扫描了 topic pair？
- 是否区分 legacy question、resolution、emergent question？
- 是否把 resolution 错送去搜索？
- 是否对 emergent question 做了 explore/defer/internal-data 判断？
- 是否搜索真的发生并留下 receipt？
- 是否所有 finding 都进入 synthesis 或 HITL2？
- 是否 seed topic backfill 只是投影，而不是改变 finding 归属？

因此 Wave2 需要三件套：

```text
synthesis.md              # narrative projection
cross-topic-ledger.md      # dynamic Agent-readable ledger
finding-index.yaml         # JS-readable shadow index
```

`synthesis.md` 给人读。`cross-topic-ledger.md` 给 Agent 和 reviewer 看过程。`finding-index.yaml` 给 JS 做反馈。

---

## 3. Feedback rail 原则

### 3.1 JS 只检查轨道，不判断智慧

JS 可以检查：

- 文件是否存在。
- YAML 是否可 parse。
- required field 是否存在。
- enum value 是否合法。
- refs 是否像路径且目标存在。
- decision 和 receipt 是否一致。
- finding 是否被 projection 或 handoff 消费。

JS 不可以检查：

- resolution 是否聪明。
- emergent question 是否深刻。
- synthesis narrative 是否优美。
- 研究方向是否值得继续。
- sub-agent 是否应该替 main-agent 做 cross-topic synthesis。

### 3.2 Feedback 分三种

| Feedback | 用途 | 示例 |
| --- | --- | --- |
| `check` | 给出 pass/fail | `finding-index.yaml` 缺少 `findings[].decision` |
| `inspect` | 定位断链 | `W2F-003 decision=explore_search but subagent_receipt_refs=[]` |
| `advice` | 给修复方向 | `补 relay receipt，或把 decision 改为 defer_hitl2/record_only 并说明原因` |

这三个动作不是新概念，和项目 charter 中 JS/CLI 的反馈角色一致。

---

## 4. `finding-index.yaml` 建议结构

`finding-index.yaml` 应保持短、结构化、可 parse。长篇判断留在 `cross-topic-ledger.md`。第一版应采用 v0 最小形状：只记录 JS feedback 必须检查的 lifecycle fields，避免一开始把 schema 做重。

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
    status: open
    decision: explore_search
    affected_topics: [topic-a, topic-c]
    origin_refs: []
    trigger_refs:
      - artifacts/wave1/topic-a/evidence-summary.md
      - artifacts/wave1/topic-c/evidence-summary.md
    search_required: true
    subagent_receipt_refs:
      - _subagents/wave_02/slot_01/runtime-receipt.jsonl
    appears_in_synthesis: true
    hitl2_handoff: false
```

### 4.1 Required enums

Suggested `type` values:

- `wave1_legacy_question`
- `cross_topic_resolution`
- `cross_topic_emergent_question`

Suggested `status` values:

- `resolved`
- `partial`
- `open`
- `deferred`

Suggested `decision` values:

- `use_existing_evidence`
- `exploit_search`
- `explore_search`
- `defer_hitl2`
- `requires_internal_data`
- `record_only`

### 4.2 Minimum consistency rules

These are deterministic enough for JS feedback:

| Rule | Reason |
| --- | --- |
| Every finding has `id`, `type`, `status`, `decision`, `affected_topics`, `trigger_refs`, `search_required`, `appears_in_synthesis`, `hitl2_handoff` | Prevents half-formed finding objects |
| `cross_topic_resolution` has non-empty `origin_refs` and `trigger_refs` | Resolution must connect a prior question to other evidence |
| `cross_topic_resolution.search_required` is false | Resolution is evidence integration, not search |
| `cross_topic_emergent_question.affected_topics.length >= 2` | Cross-topic emergent question cannot belong to one topic only |
| `decision in [exploit_search, explore_search]` implies `search_required=true` and non-empty `subagent_receipt_refs` after search | Search claims need receipts |
| `decision in [defer_hitl2, requires_internal_data]` implies `hitl2_handoff=true` | Deferred findings must reach human review |
| `appears_in_synthesis=false` implies `hitl2_handoff=true` or `decision=record_only` | Prevents orphan finding |

Optional v1 fields may later add `backfill_topics`, `synthesis_refs`, `handoff_refs`, `last_checked_at`, and `repair_attempts`. They should not be required in the first landing unless a concrete checker needs them.

---

## 5. What existing JS check types can already support

Current framework/gate surfaces already contain check-type patterns such as `file_exists`, `field_non_empty`, `yaml_parse`, `pattern_match`, `cross_field`, `trace_event_present`, `status_value`, and others. Not every existing Wave2 gate CLI supports all of these today; the point is that the project already has these deterministic primitives. A future Wave2 checker/gate can reuse this style before inventing deeper consistency logic.

| Existing check type | Wave2 use |
| --- | --- |
| `file_exists` | Require `synthesis.md`, `cross-topic-ledger.md`, `finding-index.yaml` |
| `field_non_empty` | Ensure all three files have body/content |
| `yaml_parse` | Ensure `finding-index.yaml` parses |
| `pattern_match` | Ensure ledger has fixed sections; ensure synthesis contains `W2F-` ids |
| `cross_field` / markdown link resolution | Ensure Markdown artifact links in synthesis/ledger point to existing files |
| `trace_event_present` | Ensure `wave2_completion` or future wave2 feedback events exist |
| `status_value` | Ensure phase status points to the expected gate transition |

Useful near-term checks for a future Wave2 feedback checker:

```text
file_exists artifacts/wave2/synthesis.md
file_exists artifacts/wave2/cross-topic-ledger.md
file_exists artifacts/wave2/finding-index.yaml
field_non_empty artifacts/wave2/synthesis.md
field_non_empty artifacts/wave2/cross-topic-ledger.md
yaml_parse artifacts/wave2/finding-index.yaml
pattern_match cross-topic-ledger.md "## Cross-Topic Scan Matrix ... ## HITL2 Handoff"
pattern_match synthesis.md "W2F-[0-9]{3}"
cross_field markdown_link_resolution synthesis.md
```

These checks are shallow, but they force the right surfaces to exist.

These checks should be invoked as deterministic checkpoints by the Agent or gate CLI. They should not become a hidden scheduler that writes Wave2 artifacts, mutates queue state, spawns sub-agents, or advances the workflow without the Agent reading the feedback.

---

## 6. Checks that may need future implementation

Some high-value feedback needs custom logic beyond generic regex:

| Future check | What it catches |
| --- | --- |
| `finding_index_schema_valid` | Missing/invalid fields and enum values in `finding-index.yaml` |
| `finding_id_reference_consistency` | `synthesis.md` references unknown `W2F-xxx`, or index finding never appears anywhere |
| `decision_receipt_consistency` | `explore_search` / `exploit_search` without relay receipt; receipt path missing |
| `resolution_no_search_consistency` | `cross_topic_resolution` incorrectly marked `search_required=true` |
| `hitl2_handoff_coverage` | deferred/internal-data findings missing from HITL2 handoff |
| `scan_pair_count_check` | topic_count <= 5 but scan matrix did not cover expected pairs, unless the profile/ledger records a scoped exclusion |
| `backfill_projection_consistency` | seed topic backfill references finding ids that exist in index |

These checks do not judge research quality. They judge lifecycle consistency.

### 6.1 Example inspect/advice output

```text
check: failed
inspect:
  - W2F-002 decision=explore_search but subagent_receipt_refs is empty.
  - W2F-004 appears_in_synthesis=false and hitl2_handoff=false.
advice:
  - For W2F-002, either attach relay runtime receipt after search or change decision to defer_hitl2/record_only with a reason in the ledger.
  - For W2F-004, project it into synthesis, add it to HITL2 Handoff, or mark decision=record_only.
```

This is the shape we want: JS tells the Agent where the chain broke; Agent repairs the semantic artifact.

---

## 7. Feedback loop design

Wave2 should not wait until the final gate to discover that the process is incoherent. The feedback loop should happen before narrative projection.

The cadence should be semantic-boundary based, not edit-based. Do not run JS after every sentence or every small Markdown edit; that fragments Agent Flow and turns feedback into noise. Do not wait until the end either; then feedback becomes postmortem. Run checks after a meaningful state transition has produced a stable intermediate artifact.

```text
Phase entry
  -> Agent reads Wave1 artifacts
  -> Agent writes/updates cross-topic-ledger.md
  -> Agent writes/updates finding-index.yaml
  -> JS feedback check
      -> fail: inspect/advice -> Agent repairs ledger/index
      -> pass: proceed
  -> Agent spawns sub-agents for search decisions
  -> Agent updates receipt refs and statuses
  -> JS feedback check
      -> fail: repair receipt/status/decision
      -> pass: proceed
  -> Agent writes synthesis.md from ledger/index
  -> JS feedback check
      -> fail: repair narrative drift/orphan findings
      -> pass: backfill seed topics
```

Important order:

1. Ledger/index first.
2. JS feedback.
3. Search if required.
4. Ledger/index update with receipt.
5. Synthesis projection.
6. Backfill projection.

This keeps `synthesis.md` from becoming the hidden source of truth.

### 7.1 Cadence: when to check

Use three feedback levels:

| Level | When | Cost | Purpose |
| --- | --- | --- | --- |
| L0 local parse/shape | Whenever the Agent finishes writing a stable YAML/ledger chunk | Cheap | Catch malformed YAML, missing fixed sections, broken obvious links before more work piles on |
| L1 lifecycle consistency | After semantic boundaries: scan inventory complete, decisions assigned, sub-agent results ingested, synthesis projected, backfill projected | Moderate | Catch decision/receipt/handoff/projection断链 |
| L2 phase gate | Once, after Wave2 artifacts/backfill are complete and queue is drained | Highest authority | Decide whether Wave2 can advance to HITL2 |

Recommended checkpoint cadence:

1. **After initial ledger/index creation**: check file existence, fixed ledger sections, YAML parse, required finding fields, scan matrix presence.
2. **After finding triage**: check every finding has `type`, `decision`, `status`, refs, affected topics; check `cross_topic_resolution.search_required=false`.
3. **Before spawning sub-agents**: check only findings with `decision=exploit_search|explore_search` are queued/staged for search; defer/internal-data findings are not accidentally sent to search.
4. **After sub-agent results are ingested**: check receipt refs exist, searched finding statuses were updated, failed/inaccessible searches are represented honestly.
5. **After synthesis projection**: check `synthesis.md` references `W2F-xxx`, no unknown finding ids, no orphan finding without synthesis/HITL2/record-only route.
6. **After seed-topic backfill projection**: check the seed-topic projection references valid finding ids and preserves `source_layer: wave2_cross_topic`. This can be checked from the backfilled Markdown itself in v0; it does not require `backfill_topics` to be mandatory in `finding-index.yaml`.
7. **At Wave2 gate**: run the accepted phase boundary checks only after the above surfaces are coherent.

Do not check on every text mutation. Check when one of these state objects changes meaningfully:

- scan matrix
- finding classification
- exploration decision
- sub-agent receipt/result ingestion
- synthesis projection
- HITL2 handoff
- seed-topic backfill projection

### 7.2 Failure budget and avoiding feedback thrash

Repeated feedback failures can also become a loop hazard. Suggested rule:

- For L0 checks, repair immediately and rerun; they are cheap and deterministic.
- For L1 checks, allow at most 2 repair attempts for the same finding/state boundary before escalating that finding to `defer_hitl2` or `record_only` with a clear reason.
- For L2 gate, use the existing phase gate repair discipline: persistent failure should escalate rather than silently weakening requirements.

The point is to keep Wave2 moving while preserving honesty. A finding that cannot be made coherent should not block forever; it should become an explicit unresolved/handoff object.

### 7.3 Where feedback lives

There are two possible feedback surfaces, and they should not be conflated:

| Surface | Timing | Authority |
| --- | --- | --- |
| Phase-internal feedback check | During Wave2, before/after search and before synthesis projection | Advisory checkpoint: returns check/inspect/advice for Agent repair |
| `wave2-complete` gate | End of Wave2, before chain transition to HITL2 | Phase boundary: pass/fail controls whether workflow can advance |

The same rule may start as phase-internal feedback and later become a gate rule, but that promotion is an OpenSpec/spec decision. Until then, feedback failures should guide repair; they should not be described as accepted gate behavior.

---

## 8. Review scenarios

### 8.1 Cross-topic resolution

Situation:

- Topic A has an open Wave1 question.
- Topic B has evidence that partially answers it.

Expected index:

```yaml
type: cross_topic_resolution
decision: use_existing_evidence
search_required: false
origin_refs: [artifacts/wave1/topic-a/question-list.md]
trigger_refs: [artifacts/wave1/topic-b/evidence-summary.md]
```

JS feedback should catch:

- missing `origin_refs`
- missing `trigger_refs`
- `search_required=true`
- no synthesis projection

### 8.2 Emergent exploration

Situation:

- Topic A and Topic C create a new cross-topic question.
- Agent chooses to explore via search.

Expected index:

```yaml
type: cross_topic_emergent_question
decision: explore_search
search_required: true
subagent_receipt_refs:
  - _subagents/wave_02/slot_01/runtime-receipt.jsonl
```

JS feedback should catch:

- affected topic count < 2
- missing receipt after search
- receipt path does not exist
- finding absent from synthesis and HITL2

### 8.3 Deferred/internal-data question

Situation:

- Cross-topic finding requires private data or human priority decision.

Expected index:

```yaml
decision: requires_internal_data
search_required: false
hitl2_handoff: true
```

JS feedback should catch:

- `hitl2_handoff=false`
- sub-agent receipt present even though no public search should have been attempted

### 8.4 Narrative drift

Situation:

- `synthesis.md` contains a strong claim without `W2F-xxx`.

Expected feedback:

- `check`: failed or warning depending rollout level.
- `inspect`: synthesis contains cross-topic section without finding id.
- `advice`: add finding to ledger/index or downgrade claim.

### 8.5 Orphan finding

Situation:

- `finding-index.yaml` has a finding with `appears_in_synthesis=false` and `hitl2_handoff=false`.

Expected feedback:

- `inspect`: orphan finding id.
- `advice`: project to synthesis, move to HITL2 handoff, or mark `record_only` with reason.

---

## 9. Rollout idea

This can land in layers:

1. **MD-only guidance**: introduce the three artifacts and fixed ledger sections.
2. **Shallow gate feedback**: file existence, non-empty, section regex, YAML parse, `W2F-` presence.
3. **Index schema check**: validate required fields and enums.
4. **Consistency checks**: decision/receipt, finding id coverage, HITL2 coverage.
5. **Experiment/playbook**: demonstrate failure -> inspect/advice -> repair loop.

Do not start by asking JS to understand synthesis quality. Start by making the Agent's process legible enough that JS can catch broken rails.

---

## 10. Boundary

This document is a design exploration. It does not require immediate changes to OpenSpec, phase nodes, gate definitions, or engine code.

The design commitment is narrower and more important:

> Wave2 reliability should come from a feedback loop: Agent creates semantic artifacts; JS checks deterministic structure and lifecycle consistency; Agent reads feedback and repairs. That loop is how the system learns from mistakes without pretending JS can do research judgment.
