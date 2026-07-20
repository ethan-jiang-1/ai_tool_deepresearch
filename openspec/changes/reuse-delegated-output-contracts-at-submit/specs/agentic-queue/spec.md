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
| `writes_to` | yes | `["artifacts/wave1/{topic.slug}/evidence-summary.md", "artifacts/wave1/{topic.slug}/question-list.md", "reference/{topic.slug}-*.md"]` |
| `payload` | yes | `{ topic_uid: "<uid>", topic_slug: "<slug>", topic_title: "<title>" }` |

Canonical `file:` entries in `required_receipts` SHALL be assignment facts bound by the queue-item snapshot. They SHALL identify exact required output paths for the delegated-work-unit resolver; `writes_to` SHALL remain the allowed write surface and SHALL NOT make every optional or pattern path required. A task card, its `payload`, its Markdown projection, and an actor result SHALL NOT author an output-contract ID or override the Engine-owned kind/direct contract.

An explicitly supplementary `topic_deepening` task that only acquires new source/cache facts MAY use `required_receipts: []` and retain `completion_receipt: "work_unit:submitted-ledger"`. Its `writes_to` MAY name optional current outputs, but no path SHALL become a required direct output without a canonical `file:` receipt. The supplementary result MAY cite an exact contract-authorized prior submitted `evidence_summary` for the same canonical Topic and SHALL NOT be required to redeclare or overwrite the paired evidence-summary/question-list solely to complete the supplementary attempt. Current source claims, accepted URLs, cache/degraded refs, receipt, result, and formal submit requirements remain in force.

The paired and supplementary shapes SHALL be selected from the exact snapshot-bound receipt set and canonical Topic binding, not from `queue_item_id` suffixes, title/action prose, path regexes over `writes_to`, or actor-declared roles. Any unsupported, duplicate, unsafe, non-canonical, or partial required-receipt set SHALL fail closed before work-unit allocation rather than silently becoming supplementary.

Task cards with `producer_rule: topic_deepening` SHALL NOT predeclare `work_id`; the Engine SHALL allocate `work_id` only when the delegated demand is claimed through `operate-work-unit claim`.

#### Scenario: topic deepening card waits for Engine work_id allocation

- **WHEN** the Phase Agent generates topic-deepening task cards
- **THEN** each task card SHALL identify demand by `queue_item_id`
- **AND** `operate-work-unit claim` SHALL allocate the delegated `work_id` later when the demand enters `delegated_in_flight`

#### Scenario: primary deepening binds paired file receipts

- **WHEN** a primary Wave1 task requires the canonical evidence-summary and question-list for one UID-bound current Topic
- **THEN** its snapshot SHALL contain exactly the two canonical `file:` receipts and both concrete paths in `writes_to`
- **AND** the work-unit resolver SHALL treat those two paths, not optional reference patterns, as required direct outputs

#### Scenario: supplementary source work does not rewrite paired artifacts

- **WHEN** a supplementary Wave1 task is assigned only new source/cache acquisition and can cite a contract-authorized prior submitted `evidence_summary`
- **THEN** it MAY carry an empty required-receipt set and complete only through a valid work-unit submitted-ledger receipt
- **AND** it SHALL NOT be forced to redeclare or overwrite the prior evidence-summary or question-list

#### Scenario: partial paired receipt set fails before allocation

- **WHEN** a `topic_deepening` card carries only the evidence-summary receipt, only the question-list receipt, a duplicate receipt, or a receipt for another Topic
- **THEN** `operate-work-unit claim` SHALL reject the assignment contract before allocating a work ID or mutating queue state
- **AND** it SHALL NOT infer the missing requirement from `writes_to`, prose, or a queue ID suffix

#### Scenario: queue item cannot select direct contract implementation

- **WHEN** a new `topic_deepening` queue item or payload supplies `output_contract`, `direct_contract`, or an equivalent contract selector
- **THEN** work-unit claim SHALL reject the unsupported override before mutation
- **AND** only the Engine-owned closed resolver SHALL select direct contract identities
