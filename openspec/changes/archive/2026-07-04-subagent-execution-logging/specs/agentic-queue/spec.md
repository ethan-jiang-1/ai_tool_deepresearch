# Agentic Queue (delta)

> req: AGQ-007

## Purpose

SSOT de-noise: the accepted AGQ-007 prose said the Phase Agent "collects the structured result
via relay (`ingestAgentReceipt` + `commitSlotResult`)" — direct engine-function orchestration.
With the runtime driver CLI shipped (SRD-001) and driver-first orchestration mandated (SNC-003),
the collection sentence is rewritten to route through `drive-relay-slot commit`. No other part of
the producer-rule contract changes.

## MODIFIED Requirements

### Requirement: Producer rule source_intake_fan_in

The Agentic Queue system SHALL recognize `source_intake_fan_in` as a valid `producer_rule` value. This producer rule governs the generation of source-intake task cards during wave0 (foundation reference collection).

A task card with `producer_rule: source_intake_fan_in` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `work_id` | yes | `"wave0-source-{topic.slug}"` |
| `title` | yes | `"Source intake: {topic.title}"` |
| `targets` | yes | `{ controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-source-intake", timeout_ms: 600000 } }` |
| `action` | yes | 自然语言描述：搜索 topic、找到可信来源、获取页面、提取 url/title/retrieved_date/topic_tag、写入 `reference/{topic.slug}/source.yaml`（满足 ReferenceMetadata schema） |
| `producer_rule` | yes | `"source_intake_fan_in"` |
| `priority_class` | yes | `"P5_new_reference_intake"` |
| `required_receipts` | yes | `["file:reference/{topic.slug}/source.yaml"]` |
| `done_condition` | yes | `"reference/{topic.slug}/source.yaml` 存在且通过 `ReferenceMetadata` schema 校验" |
| `verification.engine` | yes | `["receipt_check"]` |
| `writes_to` | yes | `["reference/{topic.slug}/source.yaml", "_cache/search-results/"]` |

The task card template in `phase-wave0.md` §3.1 SHALL set `targets.delegates` with `to: "sub-agent"` and `role_key: "dpt-source-intake"`. The `targets.controller` value `"main-agent"` is the current schema wire value for Phase Agent workflow authority, not the preferred conceptual role name. The Sub-agent executes the search within its relay-assigned slot directory (`_subagents/wave_NN/slot_MM/`); directory isolation is enforced by the relay slot contract, not by a path in the task card. After Sub-agent completion, Phase Agent collects the structured result through the relay driver CLI (`drive-relay-slot commit`, which invokes `ingestAgentReceipt` + `commitSlotResult` — SNC-003 / SRD-001), verifies the artifact receipt, and completes the queue task.

**Enforcement boundary:** The `targets` field shape is JS-enforced (Zod schema). The mapping `producer_rule: source_intake_fan_in → targets.delegates.role_key: dpt-source-intake` is an MD-template-level constraint (Path A) — the queue manager validates the `targets` schema but does not infer producer_rule-to-role policy.

Filling (灌料) for wave0 SHALL follow this pattern: the Phase Agent reads `rb_plan.md` frontmatter `topic_registry` and generates one task card per topic, using `operate-queue enqueue` CLI with the fields above. All task cards SHALL be enqueued at once (one-shot fill) before entering the queue-driven execution loop.

#### Scenario: Task card derived from topic registry

- **WHEN** `topic_registry` contains 3 topics
- **THEN** Phase Agent SHALL generate 3 task cards, each with `producer_rule: source_intake_fan_in`
- **AND** each task card's `work_id` SHALL contain the topic slug
- **AND** each task card's `required_receipts` SHALL reference `reference/{topic.slug}/source.yaml`

#### Scenario: Task card delegates Sub-agent through targets

- **WHEN** a `source_intake_fan_in` task card is claimed
- **THEN** `targets.delegates.to` SHALL be `"sub-agent"`
- **AND** `targets.delegates.role_key` SHALL be `"dpt-source-intake"`
- **AND** search/retrieval results SHALL be written to `_cache/search-results/`
- **AND** structured metadata SHALL be written to `reference/{topic.slug}/source.yaml`

#### Scenario: Phase Agent reads render projection only

- **WHEN** Sub-agent completes a source-intake task and writes result
- **THEN** Phase Agent SHALL read `_cache/agentic-queue/current-task.md` projection to confirm done-condition
- **AND** Phase Agent SHALL NOT read full search results back into conversation context

> **Enforcement gap (Path A limitation):** This constraint is MD-instruction-level only. Under Path A, there is no JS-enforced mechanism to detect or prevent the Phase Agent from reading full search results back. No metric, warning, or gate failure signals a violation. Formal verification of this constraint is deferred to Path B (stop authorization enforcement) or a future context-sustainability measurement change. Design decision D5 and the Risks section of design.md document this as a known blind spot.
