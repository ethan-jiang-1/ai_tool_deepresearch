---
node_type: template
id: seed-topic-template
template_scope: seed-topic-document
authority: guidance-only
execution_contract:
  surface: template-guidance
  search_policy: no_search
requires: []
suggested_context: []
---

# Template: Seed Topic Document

This is the reusable, instantiable structure of one Seed Topic Document. It
defines the fixed skeleton, the later backfill slots, and the rendered entry
format. It is never evidence authority, a receipt, a gate result, or permission
to hand-edit a seed.

The template does not define a Projection Packet, lifecycle authorization,
apply/recover mechanics, repair loop, or rerun input. Those operational questions
belong to `command_playbook/operate-topic-state.md`, the existing command
playbook for the writer named by each backfill card.

## Initialization Skeleton

The Engine projects `topic_uid`, `id`, `slug`, `title`, `must_answer`,
`scope_role`, and `depends_on_topic_uids` from the canonical registry. The
Seed Topics Agent supplies only the existing complete enrichment object:

```yaml
hypothesis: "pending - record an explicit gap when upstream facts are insufficient"
in_scope: "pending - define the research boundary"
out_of_scope: "pending - define excluded directions"
search_guardrails:
  required_terms: ["pending - identify required terms"]
  forbidden_broadening: ["pending - identify forbidden broadening"]
evidence_route:
  preferred_sources: ["pending - identify preferred source types"]
  noise_to_avoid: ["pending - identify likely source noise"]
```

```markdown
# <topic title>

## 主题定位
<why this Topic matters and its research role>

## 初始假设、缺口或张力
**已知**：<recorded fact>
**缺口**：<what Wave0 must establish>
**张力**：<claim or bias requiring independent checking>

## why now
- <trigger, window, or milestone>

## 为什么对最终交付物重要
<concrete final-deliverable contribution>

## 下游位置（可选）
- <report location or explicit unassigned state>

---

## ═══ 研究轮次追加区 ═══

## 历史摘要

*(seed-topics: 本 topic 为新建，无历史轮次)*
```

## Appendix Slot Map

The executable slot map beside the canonical topic-state renderer is the
structural source. This template is its readable mirror. A heading, card, owner,
timing, or entry-format change needs the paired executable-map and template
change in a future OpenSpec change.

<!-- seed-topic-slot: wave0_evidence | owner: wave0 | identity: submitted_work | merge: upsert_by_entry_id -->
## Wave0：本主题的新增来源证据

> **回填卡（只读操作约束，不是 Projection Entry）**
> - 写入者：Wave0 Phase Agent
> - 依据：当前轮已 submitted 的 Wave0 work-unit
> - 回填时机：当前轮 Wave0 work-unit 已 submitted 后
> - 写法：<work_id>/<N>；N 是当前 result-declared、schema-valid `artifacts/wave0/<topic>/source.yaml` array 的 1-based ordinal（current projection coordinate，不是 result_hash 的永久 snapshot）；必须含 entry_id、evidence_meaning、relationship、refs、status、next_hop
> - 操作：由 Wave0 closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet
> - 禁止：手改本节；只写 “Wave0 submitted”；把 artifact/cache 当唯一 consumer ref

__BACKFILL_WAVE0_EVIDENCE__

<!-- seed-topic-slot: wave1_mechanisms | owner: wave1 | identity: submitted_work | merge: upsert_by_entry_id -->
## Wave1：本主题的机制理解

> **回填卡（只读操作约束，不是 Projection Entry）**
> - 写入者：Wave1 Phase Agent
> - 依据：当前轮已 submitted 的 Wave1 work-unit
> - 回填时机：当前轮 Wave1 work-unit 已 submitted 后
> - 写法：<work_id>/<positive ordinal>；必须含 entry_id、evidence_meaning、relationship、refs、status、next_hop
> - 操作：由 Wave1 closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet
> - 禁止：手改本节；只写 “Wave1 submitted”；把 evidence-summary provenance 当唯一 consumer ref

__BACKFILL_WAVE1_MECHANISMS__

<!-- seed-topic-slot: wave1_trends | owner: wave1 | identity: submitted_work | merge: upsert_by_entry_id -->
## Wave1：本主题的趋势、难点与限制

> **回填卡（只读操作约束，不是 Projection Entry）**
> - 写入者：Wave1 Phase Agent
> - 依据：当前轮已 submitted 的 Wave1 work-unit
> - 回填时机：当前轮 Wave1 work-unit 已 submitted 后
> - 写法：<work_id>/<positive ordinal>；必须含 entry_id、evidence_meaning、relationship、refs、status、next_hop
> - 操作：由 Wave1 closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet
> - 禁止：手改本节；只写 “Wave1 submitted”；用泛化 submitted prose 替代限制

__BACKFILL_WAVE1_TRENDS__

<!-- seed-topic-slot: wave2_judgment | owner: wave2 | identity: finding | merge: upsert_by_entry_id -->
## Wave2：本主题的当前跨主题判断

> **回填卡（只读操作约束，不是 Projection Entry）**
> - 写入者：Wave2 Phase Agent
> - 依据：解析到本 topic 的当前轮 W2F finding
> - 回填时机：当前轮 W2F finding 已解析到本 topic 后
> - 写法：exact current-round W2F-* finding id；必须含 entry_id、evidence_meaning、relationship、refs、status、next_hop
> - 操作：由 Wave2 closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet
> - 禁止：手改本节；只写 “Wave2 submitted”；无 exact W2F binding 的泛化 synthesis line

__BACKFILL_WAVE2_JUDGMENT__

<!-- seed-topic-slot: pending_questions | owner: wave1,wave2 | identity: submitted_work_or_finding | merge: append_or_upsert_by_entry_id -->
## 本主题的待验证问题与后续验证路径

> **回填卡（只读操作约束，不是 Projection Entry）**
> - 写入者：Wave1 Phase Agent（首写）或 Wave2 Phase Agent（仅追加其 W2F 条目）
> - 依据：当前轮 Wave1 submitted work-unit，或解析到本 topic 的当前轮 W2F finding
> - 回填时机：Wave1 submitted 后首写；Wave2 仅在其当前 W2F finding 解析到本 topic 后追加
> - 写法：Wave1: <work_id>/<positive ordinal>; Wave2: exact current-round W2F-* finding id；必须含 entry_id、evidence_meaning、relationship、refs、status、next_hop
> - 操作：由对应 Wave closeout 经 operate-topic-state materialize；详见 command_playbook/operate-topic-state.md#Wave Projection Packet
> - 禁止：手改本节；只写泛化 submitted prose；Wave2 覆盖或删除 Wave1 question entry

__BACKFILL_PENDING_QUESTIONS__

The card is immutable layout context. It stays immediately below its canonical
heading; it is not a Projection Entry and is never replaced by a token or entry.

## Projection Entry Shape

Every rendered backfill entry has one stable identity plus the five fields:

```markdown
- **entry_id**: <work_id>/<positive ordinal> | W2F-<exact-current-finding-id>
  - **evidence_meaning**: <what this authority changes for this seed>
  - **relationship**: <supports|refutes|partial|opens|defers|context>
  - **refs**:
    - reference/<concrete-existing-file>.md
    - artifacts/<secondary-lineage> # optional
  - **status**: <supported|refuted|partial|open|emergent|deferred>
  - **next_hop**: <concrete navigation or explicit limitation>
```

Wave0 `entry_id` uses `<work_id>/N`, where `N` is the 1-based position in the
current result-declared, schema-valid `artifacts/wave0/<topic>/source.yaml` array.
It is a current projection coordinate, not a permanent candidate ID or a
`result_hash` snapshot; one source intake with multiple current positions needs
one entry or exact deferred disposition for each position. Wave1 `entry_id`
uses its exact submitted `work_id` plus a positive ordinal. Wave2 `entry_id`
uses its exact current-round W2F finding ID. Evidence-bearing
`refs` lead with one existing flat `reference/*.md` file; `artifacts/`,
`_cache/`, and `_work_units/` are secondary provenance only. A deferred entry
uses `relationship: defers`, `refs: [none]`, `status: deferred`, and a concrete
limitation in `next_hop`.
