## ADDED Requirements

> req: BUS-003

### Requirement: START_FROM_HERE.md SHALL document current_node as the resume phase coordinate

The bundle boot entry SHALL explain that non-null `rb_status.json.current_node`, when present, identifies the lifecycle phase Markdown node the Agent should resume from. The boot entry SHALL preserve the existing instruction to read `rb_status.json`, `rb_queue.json`, and `rb_trace.jsonl`; it SHALL clarify that `current_gate` / `next_gate` are gate-window fields, while `current_node` is the active loaded control surface. If `current_node` is `null` or absent, the Agent SHALL fall back to existing trace/reentry checks instead of guessing from `current_gate` alone.

#### Scenario: Agent sees current node resume guidance

- **WHEN** an Agent reads `START_FROM_HERE.md`
- **THEN** it SHALL learn that non-null `rb_status.json.current_node` is the preferred current phase node coordinate when present
- **AND** it SHALL still read queue and trace before continuing work
