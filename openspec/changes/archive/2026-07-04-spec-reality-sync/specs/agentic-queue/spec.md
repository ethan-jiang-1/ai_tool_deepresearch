# Agentic Queue (delta)

> req: AGQ-007, AGQ-008, AGQ-013, AGQ-015
> shared-subagent-protocol block: no separate registry ID; content embedded in agentic-queue spec

## MODIFIED Requirements

### Requirement: Producer rule source_intake_fan_in

The Agentic Queue system SHALL recognize `source_intake_fan_in` as a valid `producer_rule` value. This producer rule governs the generation of source-intake task cards during wave0 (foundation reference collection).

A task card with `producer_rule: source_intake_fan_in` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `work_id` | yes | `"wave0-source-{topic.slug}"` |
| `title` | yes | `"Source intake: {topic.title}"` |
| `targets` | yes | `{ controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-source-intake", timeout_ms: 600000 } }` |
| `action` | yes | 自然语言描述：搜索 topic、找到可信来源、获取页面、提取 url/title/retrieved_date/topic_tag、写入 `artifacts/wave0/{topic.slug}/source.yaml`（满足 ReferenceMetadata schema）；跨 topic 共享 foundation reference 写入 `reference/00-shared-<slug>.md`；原始搜索/抓取内容写入 `_cache/wave0/primary/{topic.slug}/sNN_{source-slug}/` |
| `producer_rule` | yes | `"source_intake_fan_in"` |
| `priority_class` | yes | `"P5_new_reference_intake"` |
| `required_receipts` | yes | `["file:artifacts/wave0/{topic.slug}/source.yaml"]` |
| `done_condition` | yes | `"artifacts/wave0/{topic.slug}/source.yaml` 存在且通过 ReferenceMetadata schema 校验" |
| `verification.engine` | yes | `["receipt_check"]` |
| `writes_to` | yes | `["artifacts/wave0/{topic.slug}/source.yaml", "reference/00-shared-<slug>.md（可选）"]` |

The task card template in `phase-wave0.md` §3.1 SHALL set `targets.delegates` with `to: "sub-agent"` and `role_key: "dpt-source-intake"`. After Sub-agent completion, Phase Agent SHALL collect via `drive-relay-slot commit` (SNC-003 / SRD-001), verify the artifact receipt, and complete the queue task with `slot_result_ref`.

Filling (灌料) for wave0 SHALL follow this pattern: the Phase Agent reads `rb_plan.md` frontmatter `topic_registry` and generates one task card per topic, using `operate-queue enqueue` CLI with the fields above. All task cards SHALL be enqueued at once (one-shot fill) before entering the queue-driven execution loop.

#### Scenario: Task card derived from topic registry

- **WHEN** `topic_registry` contains 3 topics
- **THEN** Phase Agent SHALL generate 3 task cards, each with `producer_rule: source_intake_fan_in`
- **AND** each task card's `work_id` SHALL contain the topic slug
- **AND** each task card's `required_receipts` SHALL reference `artifacts/wave0/{topic.slug}/source.yaml`

#### Scenario: Task card delegates Sub-agent through targets

- **WHEN** a `source_intake_fan_in` task card is claimed
- **THEN** `targets.delegates.to` SHALL be `"sub-agent"`
- **AND** `targets.delegates.role_key` SHALL be `"dpt-source-intake"`
- **AND** search/retrieval intermediate products SHALL be written to `_cache/wave0/primary/{topic.slug}/sNN_{source-slug}/`
- **AND** structured metadata SHALL be written to `artifacts/wave0/{topic.slug}/source.yaml`

#### Scenario: Phase Agent reads render projection only

- **WHEN** Sub-agent completes a source-intake task and writes result
- **THEN** Phase Agent SHALL read `_cache/agentic-queue/current-task.md` projection to confirm done-condition
- **AND** Phase Agent SHALL NOT read full search results back into conversation context

> **Enforcement gap (Path A limitation):** This constraint is MD-instruction-level only. Under Path A, there is no JS-enforced mechanism to detect or prevent the Phase Agent from reading full search results back. No metric, warning, or gate failure signals a violation. Formal verification of this constraint is deferred to Path B (stop authorization enforcement) or a future context-sustainability measurement change.

### Requirement: Producer rule topic_deepening

The Agentic Queue system SHALL recognize `topic_deepening` as a valid `producer_rule` value. This producer rule governs the generation of wave1 topic-specific deepening task cards.

A task card with `producer_rule: topic_deepening` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `work_id` | yes | `"wave1-deepen-{topic.slug}"` |
| `title` | yes | `"Deepen topic: {topic.title}"` |
| `targets` | yes | `{ controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-evidence-extractor", timeout_ms: 600000 } }` |
| `action` | yes | 自然语言描述：从 `seed_topics/{topic.slug}.md` 的 search_guardrails 和 open questions 派生搜索关键词；WebSearch + WebFetch；写入 paired `artifacts/wave1/{topic.slug}/evidence-summary.md` 和 `artifacts/wave1/{topic.slug}/question-list.md`；cache trails under `_cache/wave1/primary/{topic.slug}/sNN_{source-slug}/` |
| `producer_rule` | yes | `"topic_deepening"` |
| `priority_class` | yes | `"P4_progressive_artifact_or_seed_backfill"` |
| `required_receipts` | yes | `["file:artifacts/wave1/{topic.slug}/evidence-summary.md", "file:artifacts/wave1/{topic.slug}/question-list.md"]` |
| `done_condition` | yes | paired evidence-summary + question-list 存在且通过 wave1 gate 结构要求 |
| `writes_to` | yes | `["artifacts/wave1/{topic.slug}/evidence-summary.md", "artifacts/wave1/{topic.slug}/question-list.md", "reference/{topic.slug}-*.md"]` |
| `payload` | yes | `{ topic_slug: "<slug>", topic_title: "<title>" }` |

#### Scenario: Task card for topic deepening

- **WHEN** `topic_registry` contains 3 topics in wave1 phase
- **THEN** Phase Agent SHALL generate 3 task cards, each with `producer_rule: topic_deepening`
- **AND** each task card's `targets.delegates.role_key` SHALL be `dpt-evidence-extractor`
- **AND** each task card's `priority_class` SHALL be `P4_progressive_artifact_or_seed_backfill`

### Requirement: Producer rule cross_topic_synthesis for wave2 synthesis task cards

The Queue Manager SHALL accept `producer_rule: cross_topic_synthesis` on task cards. This producer_rule identifies the wave2 cross-topic synthesis task: a single Phase Agent-executed task that reads all topic evidence-summary and question-list artifacts, produces a three-artifact group (`synthesis.md`, `cross-topic-ledger.md`, `finding-index.yaml`), and runs a **single-pass** finding triage + targeted search protocol per `phase-wave2.md` §3.2. Quality/convergence gaps SHALL be addressed via §3.3.2 Quality Re-Fill Loop supplementary task cards, not via an embedded multi-round loop inside the synthesis task.

Task cards with `producer_rule: cross_topic_synthesis` SHALL:
- Use `targets: { controller: "main-agent" }` without delegates.
- Have `priority_class: P2_close_open_loop`.
- Have `required_receipts: ["file:artifacts/wave2/synthesis.md", "file:artifacts/wave2/cross-topic-ledger.md", "file:artifacts/wave2/finding-index.yaml"]`; structure, content, reference, and token requirements SHALL be verified by the wave2 gate, not by queue receipts.
- Have `done_condition` requiring single-pass synthesis completion and all three artifacts produced.

#### Scenario: Synthesis task card validates with cross_topic_synthesis producer rule

- **WHEN** a queue item has `producer_rule: cross_topic_synthesis`, `targets: { controller: "main-agent" }`, `priority_class: P2_close_open_loop`, and supported `file:` receipts
- **THEN** `QueueItemSchema.safeParse()` succeeds

#### Scenario: Synthesis task card completes with three-artifact file receipts

- **WHEN** `complete()` is called for a synthesis task
- **THEN** receipt check SHALL verify `artifacts/wave2/synthesis.md`, `artifacts/wave2/cross-topic-ledger.md`, and `artifacts/wave2/finding-index.yaml` all exist
- **AND** receipt failure SHALL block promotion and generate repair work
- **AND** non-empty content, structure, references, and backfill token absence SHALL be verified later by `gate-wave2-complete`

### Requirement: Wave0 queue-loop simple playbook

An experiment playbook SHALL exist at `experiments_playbook/exp_wfn_wave0/case-211-heavy-wave0-happy-path.md` (or successor case in the same exp directory) that verifies the wave0 queue-driven execution loop end-to-end on a disposable bundle.

The playbook SHALL cover three scenarios, with distinct data strategies:

- **Scenario 1 — Real search (1 topic):** Uses real WebSearch + WebFetch to verify the queue-loop + relay driver + search integration works end-to-end.
- **Scenario 2 — Gate fail (3 topics, local fixture):** Pre-seeded bundle with 3 topics but only 2 `artifacts/wave0/{topic}/source.yaml` files produced — verifies gate correctly identifies the missing topic via `count_floor` rule.
- **Scenario 3 — Repair (continues from S2 state, local fixture):** Creates the missing `artifacts/wave0/{topic}/source.yaml` → reruns gate → verifies repair loop in queue-driven context.

The playbook SHALL use a disposable bundle (`dpt_disp_*`), import real framework CLIs (`operate-queue.mjs`, `drive-relay-slot.mjs`, `check-gate-wave0-complete.mjs`), and read verdict from trace JSONL.

#### Scenario: Real search — full queue-loop from filling to gate pass

- **WHEN** the playbook pre-seeds a post-seed-topics bundle with 1 topic in `topic_registry`
- **AND** Phase Agent executes §3.1 灌料 → §3.2 执行循环 → §3.3 收尾+gate
- **THEN** Phase Agent SHALL `operate-queue claim` → `drive-relay-slot stage` → spawn sub-agent → sub-agent produces `artifacts/wave0/{topic}/source.yaml` and cache under `_cache/wave0/primary/{topic.slug}/` → `drive-relay-slot commit` → `operate-queue complete` with `slot_result_ref`
- **AND** Phase Agent SHALL update `reference/_INDEX.md` → run gate
- **AND** gate SHALL pass (exit code 0)
- **AND** verdict SHALL be PASS

#### Scenario: Gate fail identifies missing topic

- **WHEN** the playbook pre-seeds a bundle with 3 topics but only 2 `artifacts/wave0/{topic}/source.yaml` files after execution
- **AND** Phase Agent runs gate
- **THEN** gate SHALL fail (exit code 1) — `count_floor` rule reports missing reference
- **AND** inspect SHALL reference the missing topic by key
- **AND** verdict SHALL be FAIL (gate fail is expected behavior for this negative case)

#### Scenario: Repair after gate fail closes the loop

- **WHEN** the playbook continues from the gate-fail state (3 topics, 2 source.yaml, inspect points to missing topic)
- **AND** Phase Agent creates the missing `artifacts/wave0/{topic}/source.yaml` for the reported topic
- **AND** reruns gate
- **THEN** gate SHALL pass (exit code 0)
- **AND** trace SHALL contain two `gate_attempt` events: first with `passed: false`, second with `passed: true`
- **AND** verdict SHALL be PASS — confirming the repair loop works in queue-driven wave0 context

### Requirement: Shared subagent protocol defines batch execution contract

A shared node SHALL exist at `DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md`. This node SHALL define: (1) communication contract between the Phase Agent and Sub-agent via relay slot files (`task.md`, `result.schema.json`, `runtime-receipt.jsonl`, `_beacon.json`), (2) directory structure with authority boundary — `_subagents/wave_NN/slot_MM/` for relay-managed structured output (authority: `result.json`, `_status.json`) and `_cache/{wave}/{batch}/{scope}/sNN_{source-slug}/` for intermediate Sub-agent work products (non-authority, organized by work not by slot index), (3) batch parallel execution protocol driven by `drive-relay-slot stage/commit/merge` (fill → stage → parallel spawn → collect-as-return → refill → merge), (4) concurrency control (`MAX_CONCURRENT_SUBAGENTS`, negative = unlimited), (5) parameterized interface (role_key, artifact_template, artifact_schema, backfill_tokens, search_focus) so each phase MD declares only its differences, (6) forbidden authority list for all Sub-agent roles.

#### Scenario: Protocol node is referenced by phase nodes using sub-agents

- **WHEN** a phase node uses `targets.delegates` in task cards
- **THEN** the phase node frontmatter `suggested_context` SHALL include `shared/shared-subagent-protocol.md`

#### Scenario: Protocol defines relay-based isolation, not MD convention

- **WHEN** `shared-subagent-protocol.md` is read
- **THEN** it SHALL define that Sub-agents operate within relay-assigned slot directories for relay-managed files
- **AND** Sub-agents SHALL receive only bounded context (`task.md` + `result.schema.json`)
- **AND** Phase Agent SHALL collect results via `drive-relay-slot commit`, not by hand-orchestrating engine functions
