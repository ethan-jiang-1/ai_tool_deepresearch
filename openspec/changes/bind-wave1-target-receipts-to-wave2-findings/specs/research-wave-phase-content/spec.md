## ADDED Requirements

> req: RWP-021

### Requirement: Wave phases SHALL operate one receipt-bound carried-target loop

Wave1 guidance SHALL direct the Phase Agent, after reading submitted evidence, question-list reasoning, current Topic/profile, and optional user controls, to make the semantic carry-forward decision in the Phase-owned depth review. The review SHALL contain an explicit `carried_targets` declaration, which MAY be empty; prose, a slug-looking target ID, or a question-list line outside that declaration SHALL not create carry-forward authority.

Wave2 guidance SHALL direct the Agent to consume the receipt from the exact routed Wave1 Gate handoff, bind its selected targets only in the existing finding index, and use existing finding decision/gap-status routes for resolution, new targeted evidence, limitation, `defer_hitl2`, `requires_internal_data`, or `record_only`. It SHALL not reread a mutable depth review as a second parent, hand-edit trace, or ask the user to perform ordinary repair.

#### Scenario: empty declaration keeps the normal Wave2 path
- **WHEN** Wave1 explicitly declares `carried_targets: []`
- **THEN** the Wave1 receipt contains an empty selected set
- **AND** Wave2 has no added target-binding work while its existing synthesis contract remains active

#### Scenario: missing target binding repairs the existing consumer
- **WHEN** Wave2 inspect reports receipt targets without valid finding bindings
- **THEN** the Phase Agent repairs `artifacts/wave2/finding-index.yaml` and reruns the same inspect/Gate
- **AND** it SHALL not invent a new queue authority or user checkpoint
