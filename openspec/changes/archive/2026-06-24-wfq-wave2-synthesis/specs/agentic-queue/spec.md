# Agentic Queue (Delta)

> req: AGQ-015, AGQ-016

## ADDED Requirements

### Requirement: Producer rule cross_topic_synthesis for wave2 synthesis task cards

The Queue Manager SHALL accept `producer_rule: cross_topic_synthesis` on task cards. This producer_rule identifies the wave2 cross-topic synthesis task — a single Phase Agent-executed task that reads all topic evidence-summary and question-list artifacts, produces a three-artifact group (`synthesis.md`, `cross-topic-ledger.md`, `finding-index.yaml`), and contains an embedded iterative finding triage + targeted search loop.

Task cards with `producer_rule: cross_topic_synthesis` SHALL:
- Use `targets: {controller: main-agent}` (no delegates — synthesis is Phase Agent judgment work; `main-agent` is the current wire value)
- Have `priority_class: P2_close_open_loop` (current QueueWorkUnitSchema enum value for close-open-loop work)
- Have `required_receipts: ["file:artifacts/wave2/synthesis.md", "file:artifacts/wave2/cross-topic-ledger.md", "file:artifacts/wave2/finding-index.yaml"]`; structure, content, and reference requirements SHALL be verified by the wave2 gate, not by queue receipts
- Have `done_condition` requiring synthesis completion, finding triage loop convergence, and all three artifacts produced

#### Scenario: Synthesis task card validates with cross_topic_synthesis producer rule

- **WHEN** a queue item has `producer_rule: cross_topic_synthesis`, `targets: {controller: main-agent}`, `priority_class: P2_close_open_loop`, and supported `file:` receipts
- **THEN** `QueueItemSchema.safeParse()` succeeds

#### Scenario: Synthesis task card completes with three-artifact file receipt

- **WHEN** `complete()` is called for a synthesis task
- **THEN** receipt check SHALL verify `artifacts/wave2/synthesis.md`, `artifacts/wave2/cross-topic-ledger.md`, and `artifacts/wave2/finding-index.yaml` all exist
- **AND** receipt failure SHALL block promotion and generate repair task
- **AND** non-empty content, structure, and references SHALL be verified later by `gate-wave2-complete`

### Requirement: Producer rule seed_topic_backfill_wave2 for wave2 per-topic backfill task cards

The Queue Manager SHALL accept `producer_rule: seed_topic_backfill_wave2` on task cards. This producer_rule identifies wave2 per-topic backfill tasks — Phase Agent-executed tasks that replace `__BACKFILL_WAVE2_JUDGMENT__` and `__BACKFILL_PENDING_QUESTIONS__` tokens in seed topic files with content projected from the Wave2 ledger/index（not directly from synthesis.md narrative）.

Task cards with `producer_rule: seed_topic_backfill_wave2` SHALL:
- Use `targets: {controller: main-agent}` (no delegates — backfill is Phase Agent file editing; `main-agent` is the current wire value)
- Have `priority_class: P4_progressive_artifact_or_seed_backfill` (current QueueWorkUnitSchema enum value for progressive artifact/backfill work)
- Have `required_receipts` limited to current queue-engine supported prefixes (for example `file:seed_topics/{topic}.md`)
- Have `done_condition` requiring both tokens are replaced with content projected from ledger/index, preserving `source_layer: wave2_cross_topic`, finding id, decision, and status
- Rely on the wave2 gate's `pattern_match` checks to deterministically verify that stale token literals are absent

#### Scenario: Backfill task card validates with seed_topic_backfill_wave2 producer rule

- **WHEN** a queue item has `producer_rule: seed_topic_backfill_wave2`, `targets: {controller: main-agent}`, `priority_class: P4_progressive_artifact_or_seed_backfill`, and supported receipts
- **THEN** `QueueItemSchema.safeParse()` succeeds

#### Scenario: Backfill task completion leaves token checks to gate

- **WHEN** `complete()` is called for a backfill task
- **THEN** receipt check SHALL verify only the supported receipt prefixes declared on the task card
- **AND** token replacement SHALL be verified by the wave2 gate before phase completion
