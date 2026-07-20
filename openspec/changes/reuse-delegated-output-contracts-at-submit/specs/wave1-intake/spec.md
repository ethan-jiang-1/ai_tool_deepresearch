> req: WAI-007

## MODIFIED Requirements

### Requirement: Wave1 deepening queue items SHALL claim work units

Wave1 deepening queue items SHALL become eligible for `operate-work-unit claim` rather than non-work-unit delegated dispatch. The queue demand SHALL include the registered `wave1_topic_deepening` kind, canonical Topic UID/current slug, closed `payload.assignment_mode`, canonical required receipts, and any strictly valid non-selector kind-contract customization needed for the Engine to create the work unit.

Current primary demand SHALL use `payload.assignment_mode: "primary"` with exactly the canonical evidence-summary/question-list `file:` receipt pair for the bound Topic. Current supplementary demand SHALL use `payload.assignment_mode: "supplementary"` with empty required receipts and shall acquire new source/cache facts without rewriting the prior pair. Mode and receipt shape SHALL agree at enqueue and claim. Empty receipts alone, a queue-item suffix, title/action prose, `writes_to`, actor role, or current filesystem state SHALL NOT select supplementary behavior.

Supplementary Wave1 deepening queue items SHALL use the same work-unit path. Their `queue_item_id` MAY include a suffix such as `-v2` or `-suppl-rN`, but identity SHALL come from explicit `payload.topic_uid` plus current `payload.topic_slug`, and assignment intent SHALL come only from `payload.assignment_mode`. Queue item ID parsing SHALL NOT supply either fact for current cards.

An unclaimed Wave1 card missing assignment_mode SHALL return to AGQ-013 `repair --queue-item-id --set-assignment-mode` and SHALL NOT be claimed through compatibility inference. A work-unit attempt already claimed before assignment_contract_version existed MAY retain the bounded legacy submit semantics defined by delegated-work-units; queue-card repair SHALL NOT retrofit or reinterpret that attempt.

Persisted historical queue/terminal items MAY remain readable without assignment_mode. Current operation admission, rather than historical storage parsing, SHALL enforce the field before new enqueue/claim success. A planned Wave1 claim batch SHALL validate every candidate's mode/receipt/Topic obligation before any member is allocated.

When post-work_done candidate validation rejects missing research semantics, replacement demand SHALL preserve the failed attempt's canonical Topic and assignment obligation. A failed primary pair SHALL be closed through `operate-work-unit fail` with normalized reason `semantic_contract:<primary_root_code>` using the Engine-derived field, followed by an explicitly enqueued new primary paired demand under a fresh globally unused queue ID, not weakened into supplementary empty-output work. The semantic reason SHALL NOT use `actor_spawn_unavailable:` or another accepted automatic-retry trigger. This requirement SHALL NOT create automatic requeue, contract IDs in queue payloads, or a second success path.

#### Scenario: Wave1 primary claim binds paired assignment

- **WHEN** a current Wave1 primary queue item is enqueued and claimed
- **THEN** it SHALL carry assignment_mode primary and the exact Topic-bound paired receipts
- **AND** the allocated work unit SHALL have kind `wave1_topic_deepening` with current assignment contract binding

#### Scenario: Supplementary Wave1 task keeps identity and explicit intent

- **WHEN** shallow Wave1 output requires a second task for canonical topic A
- **AND** the Agent enqueues a new queue item with topic A's UID/current slug, assignment_mode supplementary, and empty required receipts
- **THEN** `operate-work-unit claim` SHALL preserve the Topic binding and supplementary intent through manifest, result guidance, submitted ledger row, and depth-review repair refs
- **AND** the queue ID suffix SHALL remain non-authoritative

#### Scenario: Missing mode cannot be inferred from receipt shape

- **WHEN** an unclaimed Wave1 queue item lacks assignment_mode
- **THEN** enqueue or claim SHALL fail before work-unit allocation and direct AGQ-013 explicit unclaimed assignment-mode repair
- **AND** neither an exact pair nor empty receipts SHALL cause implicit primary/supplementary selection

#### Scenario: historical missing mode is readable but not claimable

- **WHEN** an existing queue contains a terminal-history item or live pre-change Wave1 card without assignment_mode
- **THEN** queue inspection/repair SHALL still load the persisted state
- **AND** new claim SHALL reject a live mode-absent card until the queue owner selects explicit mode and the Engine-derived repaired card passes current admission

#### Scenario: Semantic replacement preserves primary obligation

- **WHEN** a current primary attempt reaches work_done and dry-submit reports missing required research semantics
- **THEN** the Phase Agent SHALL fail that attempt and explicitly enqueue a new primary item with a fresh globally unused `queue_item_id`, the same canonical Topic, and paired receipts
- **AND** it SHALL NOT change assignment_mode to supplementary to avoid the failed direct-output obligation
- **AND** it SHALL NOT reuse the failed ID now retained in terminal_history
