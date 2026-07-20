> req: AGQ-013

## MODIFIED Requirements

### Requirement: Producer rule topic_deepening

The Agentic Queue system SHALL recognize `topic_deepening` as a valid `producer_rule` value. This producer rule governs the generation of Wave1 topic-specific deepening task cards.

A primary paired-artifact task card with `producer_rule: topic_deepening` SHALL have the following default field values:

| Field | Required | Default / Derived From |
|-------|----------|------------------------|
| `queue_item_id` | yes | `"wave1-deepen-{topic.slug}"` |
| `title` | yes | `"Deepen topic: {topic.title}"` |
| `targets` | yes | `{ controller: "main-agent", delegates: { to: "sub-agent", role_key: "dpt-evidence-extractor", timeout_ms: 600000 } }` |
| `action` | yes | Natural-language instruction to derive search terms from `seed_topics/{topic.slug}.md`, use WebSearch/WebFetch, write paired Wave1 artifacts, declared references, and cache trails |
| `producer_rule` | yes | `"topic_deepening"` |
| `priority_class` | yes | `"P4_progressive_artifact_or_seed_backfill"` |
| `required_receipts` | yes | `["file:artifacts/wave1/{topic.slug}/evidence-summary.md", "file:artifacts/wave1/{topic.slug}/question-list.md"]` |
| `done_condition` | yes | Paired evidence-summary and question-list exist and can be validated later by the Wave1 gate structure requirements |
| `writes_to` | yes | `["artifacts/wave1/{topic.slug}/evidence-summary.md", "artifacts/wave1/{topic.slug}/question-list.md"]` |
| `payload` | yes | `{ topic_uid: "<uid>", topic_slug: "<slug>", topic_title: "<title>", assignment_mode: "primary" }` |

`payload.assignment_mode` SHALL be a closed `primary|supplementary` assignment-intent fact for `topic_deepening`, bound by the queue-item snapshot. It SHALL NOT contain or select a direct-contract ID. Canonical `file:` entries in `required_receipts` SHALL be the corresponding exact-output facts: current `primary` requires exactly the canonical evidence-summary/question-list pair, while current `supplementary` requires an empty set. Operation-specific enqueue and claim admission SHALL reject missing/unknown mode, mode/receipt mismatch, and unsupported shapes before work-unit allocation. Generic persisted queue parsing SHALL keep the field optional so historical terminal-history items and old live demand remain loadable for inspection/repair; loadability SHALL NOT authorize claim. `writes_to` SHALL remain the allowed write surface and SHALL NOT make every optional or pattern path required. Existing queue/payload kind-contract customization MAY retain its current result/cache/source fields when strictly valid. The closed reserved selector-key set is `required_outputs`, `direct_contract`, `direct_contract_id`, `assignment_contract_version`, `resolver_version`, and `contract_id`; enqueue, mode repair and claim SHALL reject those keys at the queue-item root or recursively under payload/output_contract. Other unknown payload fields SHALL never become resolver inputs. A task card, its Markdown projection, and an actor result SHALL NOT author the Engine-owned direct contract.

An explicitly supplementary `topic_deepening` task that only acquires new source/cache facts SHALL use `payload.assignment_mode: "supplementary"`, MAY use `required_receipts: []`, and SHALL retain `completion_receipt: "work_unit:submitted-ledger"`. Its `writes_to` MAY name optional current outputs, but no path SHALL become a required direct output without a canonical `file:` receipt. The supplementary result MAY cite an exact contract-authorized prior submitted `evidence_summary` for the same canonical Topic and SHALL NOT be required to redeclare or overwrite the paired evidence-summary/question-list solely to complete the supplementary attempt. Current source claims, accepted URLs, cache/degraded refs, receipt, result, and formal submit requirements remain in force.

The paired and supplementary shapes SHALL be selected from `assignment_mode` plus the exact snapshot-bound receipt set and canonical Topic binding, not from an empty receipt set alone, `queue_item_id` suffixes, title/action prose, path regexes over `writes_to`, or actor-declared roles. Any unsupported, duplicate, unsafe, non-canonical, partial, or mode-conflicting required-receipt set SHALL fail closed before work-unit allocation rather than silently becoming supplementary.

An already-enqueued, not-yet-claimed Wave1 item that lacks `assignment_mode` SHALL require AGQ-013 `operate-queue repair <bundle> --queue-item-id <id> --set-assignment-mode <primary|supplementary>` before claim. The queue owner SHALL choose explicit intent; the Engine SHALL derive its receipt obligation while preserving queue position, creation identity, Topic, producer/kind, delegation and non-selector contract fields. Claim SHALL NOT infer primary from an exact pair or supplementary from an empty set because field absence cannot prove historical origin or assignment intent. Already-claimed attempt compatibility remains owned by the work-unit index marker, not by queue-card inference. Newly enqueued `topic_deepening` cards SHALL always require explicit mode.

Assignment-mode repair SHALL target exactly one `status: queued` `topic_deepening` card in `active_window` or `refill_pool` whose `payload.assignment_mode` is genuinely absent. It SHALL reject an already-classified card rather than reclassify it. The operation SHALL preserve queue location/order, `queue_item_id`, original `created_at`, producer rule, kind, canonical Topic UID/slug, delegation target, lineage, action and non-selector contract customization. It SHALL change only `payload.assignment_mode`, `required_receipts`, `updated_at`, and the primary mode's canonical paired `writes_to` inclusion. Primary SHALL derive the exact canonical Topic-bound evidence-summary/question-list receipts and ensure both paths are allowed writes; supplementary SHALL derive an empty receipt set and SHALL NOT erase otherwise valid allowed writes merely because they are optional.

Before mutation, the derived card SHALL pass the same canonical Topic binding, assignment-mode/receipt-shape, direct-selector rejection, kind-contract and queue-item schema admission required by current enqueue. One complete validated queue save SHALL occur only after all checks pass. Missing/ambiguous ID, already-present mode, wrong producer/kind, unknown requested mode, non-queued location, `delegated_in_flight` or `terminal_history` target, unresolved Topic, selector-bearing customization, or invalid derived card SHALL leave prior queue state unchanged. The operation SHALL NOT accept a task document, arbitrary field names, JSON Pointer/merge patch input, revive terminal demand, edit work-unit authority, or broaden QIV-004 stale-card removal.

Successful repair SHALL append one structured `queue_assignment_mode_repaired` trace/audit event naming queue item, canonical Topic coordinates, queue location, prior receipt shape, selected mode and derived receipt shape. The saved queue item remains assignment authority; claim SHALL validate it rather than trust the event. Rejected repair SHALL not emit that success event.

For a multi-item work-unit claim, the Engine SHALL validate assignment mode, receipt shape, Topic binding and direct-selector absence for the complete planned contiguous candidate batch before allocating any work ID, opening a batch, moving demand or writing an envelope. One invalid candidate SHALL reject the planned batch with zero partial claim mutation.

Task cards with `producer_rule: topic_deepening` SHALL NOT predeclare `work_id`; the Engine SHALL allocate `work_id` only when the delegated demand is claimed through `operate-work-unit claim`.

#### Scenario: topic deepening card waits for Engine work_id allocation

- **WHEN** the Phase Agent generates topic-deepening task cards
- **THEN** each task card SHALL identify demand by `queue_item_id`
- **AND** `operate-work-unit claim` SHALL allocate the delegated `work_id` later when the demand enters `delegated_in_flight`

#### Scenario: primary deepening binds paired file receipts

- **WHEN** a primary Wave1 task requires the canonical evidence-summary and question-list for one UID-bound current Topic
- **THEN** its snapshot SHALL contain `payload.assignment_mode: "primary"`, exactly the two canonical `file:` receipts, and both concrete paths in `writes_to`
- **AND** the work-unit resolver SHALL treat those two paths as required direct outputs while Phase-owned reference materialization remains outside the task

#### Scenario: supplementary source work does not rewrite paired artifacts

- **WHEN** a supplementary Wave1 task is assigned only new source/cache acquisition and can cite a contract-authorized prior submitted `evidence_summary`
- **THEN** it SHALL carry `payload.assignment_mode: "supplementary"`, MAY carry an empty required-receipt set, and complete only through a valid work-unit submitted-ledger receipt
- **AND** it SHALL NOT be forced to redeclare or overwrite the prior evidence-summary or question-list

#### Scenario: partial paired receipt set fails before allocation

- **WHEN** a `topic_deepening` card carries only the evidence-summary receipt, only the question-list receipt, a duplicate receipt, or a receipt for another Topic
- **THEN** `operate-work-unit claim` SHALL reject the assignment contract before allocating a work ID or mutating queue state
- **AND** it SHALL NOT infer the missing requirement from `writes_to`, prose, or a queue ID suffix

#### Scenario: queue item cannot select direct contract implementation

- **WHEN** a new `topic_deepening` queue item contains any closed reserved selector key at its root or recursively under payload/output_contract
- **THEN** enqueue or work-unit claim SHALL reject the unsupported selector before mutation
- **AND** only the Engine-owned closed resolver SHALL select direct contract identities

#### Scenario: non-selector kind customization remains compatible

- **WHEN** a queue item carries a strictly valid existing output_contract customization limited to result fields, allowed roles, and source-claim policy
- **THEN** claim MAY preserve it as the kind-contract base and merge Engine-resolved required_outputs
- **AND** submit SHALL reconstruct the same merged contract from the hash-bound snapshot

#### Scenario: empty receipts without supplementary intent fail closed

- **WHEN** a current `topic_deepening` card has empty required receipts but lacks `payload.assignment_mode: "supplementary"`
- **THEN** enqueue or claim SHALL reject the ambiguous assignment
- **AND** it SHALL NOT treat missing primary receipts as supplementary intent

#### Scenario: pre-change unclaimed card requires explicit repair

- **WHEN** a not-yet-claimed `topic_deepening` card lacks assignment_mode even if it has the exact canonical paired receipts
- **THEN** claim SHALL reject before allocation and direct AGQ-013 explicit unclaimed assignment-mode repair
- **AND** it SHALL NOT infer historical origin or assignment intent from receipt shape

#### Scenario: historical queue remains readable for repair

- **WHEN** persisted terminal history or an old live Wave1 item lacks assignment_mode
- **THEN** generic queue loading SHALL remain possible
- **AND** a live mode-absent item SHALL still fail new claim admission until explicit mode repair derives a card that passes current admission

#### Scenario: assignment-mode repair preserves demand identity

- **WHEN** a genuinely mode-absent unclaimed `topic_deepening` card receives an explicit supported repair mode
- **THEN** the Engine SHALL derive that mode's canonical receipts, preserve immutable card fields and queue position, and update only the bounded repair fields
- **AND** a later claim SHALL revalidate the saved card under current assignment-contract admission

#### Scenario: assignment-mode repair cannot reclassify or broaden mutation

- **WHEN** the target already has a mode, belongs to another producer/kind, is in-flight/terminal/non-queued, or the requested/derived contract is invalid
- **THEN** repair SHALL reject with no queue mutation and no success event
- **AND** it SHALL not accept a replacement task or arbitrary field patch

#### Scenario: assignment-mode repair is auditable but queue remains authority

- **WHEN** assignment-mode repair succeeds
- **THEN** one structured event SHALL record queue ID, Topic, location, prior receipts, selected mode and derived receipts
- **AND** claim SHALL validate `rb_queue.json` rather than treat that event as a second assignment authority

#### Scenario: mixed-validity claim batch has zero partial allocation

- **WHEN** a planned Wave1 claim batch contains a valid first item and a later item with missing/mismatched assignment mode
- **THEN** claim SHALL reject the planned batch before allocating any work ID or moving either item
- **AND** no work-unit envelope, index row, batch counter, or delegated-in-flight binding SHALL be written
