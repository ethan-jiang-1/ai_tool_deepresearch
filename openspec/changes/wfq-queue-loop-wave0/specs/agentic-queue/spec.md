> req: AGQ-007

## ADDED Requirements

### Requirement: Producer rule source_intake_fan_in

The Agentic Queue system SHALL recognize `source_intake_fan_in` as a valid `producer_rule` value. This producer rule governs the generation of source-intake task cards during wave0 (foundation reference collection).

A task card with `producer_rule: source_intake_fan_in` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `work_id` | yes | `"wave0-source-{topic.key}"` |
| `title` | yes | `"Source intake: {topic.label}"` |
| `action` | yes | 自然语言描述：搜索 topic、找到可信来源、获取页面、提取 url/title/retrieved_date/topic_tag、写入 `reference/{topic.key}/source.yaml`（满足 ReferenceMetadata schema） |
| `target` | yes | `"sub-agent"` |
| `producer_rule` | yes | `"source_intake_fan_in"` |
| `priority_class` | yes | `1` (P1 — urgent productive) |
| `required_receipts` | yes | `["file:reference/{topic.key}/source.yaml"]` |
| `done_condition` | yes | `"reference/{topic.key}/source.yaml` 存在且通过 `ReferenceMetadata` schema 校验" |
| `verification.engine` | yes | `["receipt_check"]` |
| `writes_to` | yes | `["reference/{topic.key}/source.yaml", "_cache/search-results/"]` |

The task card SHALL target `sub-agent` — the sub-agent executes the search and bounded output, the main-agent reads the render projection (`_cache/agentic-queue/current-task.md`) to confirm done-condition without pulling full search results into conversation context.

Filling (灌料) for wave0 SHALL follow this pattern: the Agent reads `rb_plan.md` frontmatter `topic_registry` and generates one task card per topic, using `operate-queue enqueue` CLI with the fields above. All task cards SHALL be enqueued at once (one-shot fill) before entering the queue-driven execution loop.

#### Scenario: Task card derived from topic registry

- **WHEN** `topic_registry` contains 3 topics
- **THEN** Agent SHALL generate 3 task cards, each with `producer_rule: source_intake_fan_in`
- **AND** each task card's `work_id` SHALL contain the topic key
- **AND** each task card's `required_receipts` SHALL reference `reference/{topic.key}/source.yaml`

#### Scenario: Task card targets sub-agent

- **WHEN** a `source_intake_fan_in` task card is claimed
- **THEN** the task SHALL be executed by a sub-agent (target: sub-agent)
- **AND** search/retrieval results SHALL be written to `_cache/search-results/`
- **AND** structured metadata SHALL be written to `reference/{topic.key}/source.yaml`

#### Scenario: Main-agent reads render projection only

- **WHEN** sub-agent completes a source-intake task and writes result
- **THEN** main-agent SHALL read `_cache/agentic-queue/current-task.md` projection to confirm done-condition
- **AND** main-agent SHALL NOT read full search results back into conversation context

#### Scenario: Invalid producer_rule rejected

- **WHEN** a task card uses an unrecognized `producer_rule` value
- **THEN** `queue-manager.mjs` SHALL reject it at enqueue time via Zod validation
