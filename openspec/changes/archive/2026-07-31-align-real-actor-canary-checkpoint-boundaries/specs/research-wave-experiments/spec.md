> req: RWE-002

## MODIFIED Requirements

### Requirement: Wave1 happy-path + boundary enforcement playbook

Wave1 playbooks SHALL verify topic deepening through work units and SHALL reject placeholder, shallow, cache-thin, or non-work-unit delegated artifacts as pass evidence.

Wave1 controlled E2E SHALL include a negative case where structurally present `evidence-summary.md` and `question-list.md` are insufficient because they reuse Wave0 URLs, omit required depth dimensions, or declare structured accepted source claims without matching submitted cache trails. The repair path SHALL be supplementary `wave1_topic_deepening` work-unit demand, not force-advance.

The real Wave1 Actor batch canary SHALL prove its two claimed `dpt-evidence-extractor` actors through their generated tasks, Subject-owned durable outputs, dry-submit/formal-submit outcomes, submitted ledger, and work-unit inspection. It SHALL stop at that actor checkpoint when its setup does not establish the complete Wave1 Phase projection. It SHALL NOT require a Wave1 Gate, synthesize `evidence-summary.md`/`question-list.md` or other semantic Phase inputs merely to obtain Gate success, or report actor submit success as Wave1 readiness. A Wave1 playbook that claims a Gate pass SHALL establish the full canonical Phase inputs through its declared Phase flow.

#### Scenario: Wave1 boundary rejects non-work-unit artifact

- **WHEN** a Wave1 delegated artifact exists without work-unit ledger coverage
- **THEN** the playbook gate SHALL fail

#### Scenario: Wave1 playbook rejects shallow topic deepening

- **WHEN** a Wave1 fixture-backed topic output mostly summarizes Wave0 and lacks enough new source URLs
- **THEN** the playbook SHALL observe a failed depth-review or gate verdict
- **AND** the playbook SHALL show supplementary work-unit refill as the repair path

#### Scenario: Wave1 playbook rejects cache-thin source claims

- **WHEN** Wave1 submitted `source_claims[]` / `accepted_source_urls[]` declare multiple accepted source URLs
- **AND** submitted cache trails cover only a subset of those URLs
- **THEN** the playbook SHALL observe cache/source mapping failure before Wave1 pass

#### Scenario: real Wave1 actor batch stops before an unestablished Phase Gate

- **WHEN** the real Wave1 actor batch has submitted its declared Subject results and its setup has not established the complete Wave1 canonical projection
- **THEN** the canary SHALL evaluate its actor submit and work-unit inspect checkpoints without a Wave1 Gate required check
- **AND** it SHALL not create Phase-owned semantic artifacts or claim Wave1 Gate readiness
