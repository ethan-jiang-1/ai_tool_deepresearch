> req: AGQ-007, AGQ-008, AGQ-009, AGQ-010

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
| `priority_class` | yes | `"P5_new_reference_intake"` |
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

### Requirement: Wave0 queue-loop simple playbook

An experiment playbook SHALL exist at `experiments_playbook/exp_agentic-queue-loop/test-simple-wave0-queue-loop.md` that verifies the wave0 queue-driven execution loop end-to-end on a disposable bundle.

The playbook SHALL cover three scenarios, with distinct data strategies:

- **Scenario 1 — Real search (1 topic):** Uses real WebSearch + WebFetch to verify the queue-loop + search integration works end-to-end. Single topic to control real-search cost and non-determinism.
- **Scenario 2 — Gate fail (3 topics, local fixture):** Pre-seeded bundle with 3 topics but only 2 source.yaml files produced — verifies gate correctly identifies the missing topic via `count_floor` rule.
- **Scenario 3 — Repair (continues from S2 state, local fixture):** Creates the missing source.yaml → reruns gate → verifies repair loop in queue-driven context.

The playbook SHALL use a disposable bundle (`dpt_disp_*`), import real framework CLIs (`operate-queue.mjs`, `check-gate-wave0-complete.mjs`), and read verdict from trace JSONL.

#### Scenario: Real search — full queue-loop from filling to gate pass

- **WHEN** the playbook pre-seeds a post-seed-topics bundle with 1 topic in `topic_registry`（topic key 和 label 指向一个具体、可搜索的真实话题——如 "Claude Code CLI tool Anthropic"）
- **AND** Agent loads `phase-wave0.md` and executes §3.1 灌料：创建 task card JSON → `operate-queue enqueue`
- **THEN** 1 task card SHALL be enqueued with `producer_rule: source_intake_fan_in`, `target: sub-agent`, `priority_class: P5_new_reference_intake`
- **AND** Agent SHALL `operate-queue claim --actor main-agent` → 获取 task card
- **AND** Agent SHALL 执行 sub-agent search：使用 **真实 WebSearch + WebFetch** 工具搜索该 topic 的 foundation reference，找到至少 1 条可信来源
- **AND** sub-agent SHALL 产出 `reference/<topic>/source.yaml`，每项 reference 的 `url` 指向真实可访问页面、`title` 反映实际页面标题、`retrieved_date` 为 YYYY-MM-DD、`topic_tag` 匹配 topic key
- **AND** search/retrieval 中间结果 SHALL 写入 `_cache/search-results/`
- **AND** Agent SHALL 创建 result JSON → `operate-queue complete --result <result.json>` → receipt check PASS
- **AND** Agent SHALL 读 `_cache/agentic-queue/current-task.md` 投影确认 done-condition
- **AND** claim 返回 `item: null` → queue 空
- **AND** Agent SHALL 更新 `reference/index.md` → 跑 gate
- **AND** gate SHALL pass（exit code 0）— `file_exists` rule 找到 source.yaml、`schema_valid` rule 通过 ReferenceMetadata 校验
- **AND** trace SHALL 含 `queue_enqueued`, `queue_claimed`, `receipt_checked`, `queue_completed`, `gate_attempt(passed: true)` events
- **AND** verdict SHALL be PASS — 验证了 queue-loop + 真实搜索集成的闭环

#### Scenario: Gate fail identifies missing topic

- **WHEN** the playbook pre-seeds a bundle with 3 topics but only 2 source.yaml files after execution
- **AND** Agent runs gate
- **THEN** gate SHALL fail (exit code 1) — `count_floor` rule reports missing reference
- **AND** inspect SHALL reference the missing topic by key
- **AND** verdict SHALL be FAIL (gate fail is expected behavior for this negative case)

#### Scenario: Repair after gate fail closes the loop

- **WHEN** the playbook continues from the gate-fail state (3 topics, 2 source.yaml, inspect points to missing topic)
- **AND** Agent creates the missing `reference/<topic>/source.yaml` for the reported topic
- **AND** reruns gate
- **THEN** gate SHALL pass (exit code 0)
- **AND** trace SHALL contain two `gate_attempt` events: first with `passed: false`, second with `passed: true`
- **AND** verdict SHALL be PASS — confirming the repair loop works in queue-driven wave0 context

### Requirement: Producer rule seed_topic_materialize

The Agentic Queue system SHALL recognize `seed_topic_materialize` as a valid `producer_rule` value. This producer rule governs the materialization of seed topic files from `topic_registry` entries during seed-topics phase.

A task card with `producer_rule: seed_topic_materialize` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `work_id` | yes | `"seed-topic-{topic.key}"` |
| `title` | yes | `"Materialize seed topic: {topic.label}"` |
| `target` | yes | `"main-agent"` |
| `action` | yes | 自然语言描述：从 topic_registry 和 rb_profile.yaml 提取信息，按 seed topic 文件结构创建 `seed_topics/{topic.key}.md`（含 must_answer/hypothesis/scope/search_guardrails/evidence_route） |
| `producer_rule` | yes | `"seed_topic_materialize"` |
| `priority_class` | yes | `"P3_current_gate_gap"` |
| `required_receipts` | yes | `["file:seed_topics/{topic.key}.md"]` |
| `done_condition` | yes | `seed_topics/{topic.key}.md` 存在，frontmatter 含 id/slug/title（均非空），slug 与文件名 stem 一致，正文含研究骨架 + 原始语境约束 block |

Seed topic materialization uses `target: main-agent` because it involves structured writing from existing registry data — no external web search is required. The main-agent reads `topic_registry` and `rb_profile.yaml`, fills in the seed topic template, and writes the file.

#### Scenario: Task card for seed topic materialization

- **WHEN** `topic_registry` contains 3 topics
- **THEN** Agent SHALL generate 3 task cards, each with `producer_rule: seed_topic_materialize`
- **AND** each task card's `target` SHALL be `main-agent`
- **AND** each task card's `priority_class` SHALL be `P3_current_gate_gap`

#### Scenario: Seed topic file contains V12-aligned fields

- **WHEN** a `seed_topic_materialize` task is executed
- **THEN** the produced `seed_topics/<slug>.md` SHALL contain frontmatter fields: id, slug, title, must_answer, hypothesis, in_scope, out_of_scope, search_guardrails, evidence_route
- **AND** the body SHALL contain 原始语境约束 block

### Requirement: Seed-topics queue-loop simple playbook

An experiment playbook SHALL exist at `experiments_playbook/exp_agentic-queue-loop/test-simple-seedtopics-queue-loop.md` that verifies the seed-topics queue-driven execution loop end-to-end on a disposable bundle.

The playbook SHALL verify:
- Bundle pre-seeded with `topic_registry` (3 topics + sufficient detail for seed topic fields) and `rb_profile.yaml`
- Agent loads `phase-seed-topics.md`, executes §3.1 灌料 (enqueue 3 task cards), §3.2 执行循环 (claim → execute → complete × 3), §3.3 收尾 (run gate)
- Each produced `seed_topics/<slug>.md` contains V12-aligned frontmatter (must_answer, hypothesis, etc.) and 原始语境约束 block
- Gate pass confirms bidirectional slug consistency
- Missing upstream info annotated as gap (not fabricated)

The playbook SHALL use local fixture data for topic_registry entries (pre-written YAML in rb_plan.md frontmatter). No web search required.

#### Scenario: Full seed-topics queue-loop

- **WHEN** the playbook pre-seeds a post-setup bundle with 3 topics in `topic_registry`（含 topic label, description 等足够信息）
- **AND** Agent loads `phase-seed-topics.md` and executes §3.1 灌料
- **THEN** 3 task cards SHALL be enqueued
- **AND** Agent SHALL claim → execute → complete each task
- **AND** after 3 tasks, queue SHALL be empty
- **AND** each `seed_topics/<slug>.md` SHALL contain complete V12-aligned fields
- **AND** gate SHALL pass
- **AND** verdict SHALL be PASS
