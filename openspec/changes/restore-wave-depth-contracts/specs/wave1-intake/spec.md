## MODIFIED Requirements

> req: WAI-002, WAI-004, WAI-005, WAI-006, WAI-007

### Requirement: Sub-agent executes deepening search and writes bounded output

The Wave1 sub-agent SHALL execute bounded topic deepening according to the work-unit task/result schema and SHALL return through `operate-work-unit submit`.

The task SHALL require more than summarizing Wave0. For each assigned topic, the sub-agent SHALL search for topic-specific new evidence, fetch source content, write cache trails, and produce outputs that support mechanism analysis, trend/difficulty/limitation analysis, and profile-required counterexample or cross-verification checks. Wave0 artifacts MAY be used as starting context, but Wave0 URLs SHALL NOT satisfy the Wave1 new-source floor.

The submitted result SHALL expose enough structured fields for the Phase Agent and Engine to compare claimed source URLs against Wave0 source URLs and verified cache trails. At minimum, the result or covered artifacts SHALL make claimed source URLs, output files, and cache trail refs inspectable by `work_id`.

#### Scenario: bounded output is submitted

- **WHEN** the Wave1 sub-agent writes bounded output
- **THEN** submit SHALL validate the output contract before ledger append

#### Scenario: Wave1 work finds new topic-specific sources

- **WHEN** a Wave1 topic deepening work unit completes
- **THEN** its submitted outputs SHALL identify source URLs that are new relative to that topic's Wave0 source URL set
- **AND** reused Wave0 URLs MAY provide context but SHALL NOT count toward the Wave1 new-source floor

#### Scenario: Wave1 work covers depth dimensions

- **WHEN** a Wave1 topic deepening work unit completes
- **THEN** `evidence-summary.md` or the submitted result SHALL cover mechanism, trend/difficulty, and limitation/dispute/failure-mode dimensions
- **AND** when `rb_profile.yaml` enables counterexample search or cross-verification, the submitted output SHALL record the attempted check and its evidence or limitation

### Requirement: Wave1 gate checks deepening artifacts

Wave1 gate SHALL check deepening artifacts through submitted work-unit ledger coverage, cross-checks, and deterministic depth-review projections. It SHALL require each topic to have `evidence-summary.md`, `question-list.md`, and `depth-review.yaml` covered by or derived from submitted work-unit outputs.

The gate SHALL validate deterministic depth-adjacent facts only: source URL novelty by exact URL comparison against Wave0 source URLs, claimed source URL to submitted cache trail mapping, required depth-review keys, profile parameter presence, and supplementary loop coverage. It SHALL NOT judge whether the evidence is insightful or whether the prose quality is sufficient.

#### Scenario: deepening artifact requires ledger row

- **WHEN** a Wave1 deepening artifact exists without submitted ledger coverage
- **THEN** Wave1 gate SHALL fail

#### Scenario: shallow depth review fails

- **WHEN** `depth-review.yaml` records fewer new source URLs than the profile-derived floor
- **THEN** Wave1 gate SHALL fail with diagnostics naming the topic, observed new-source count, required floor, and repair path through supplementary `wave1_topic_deepening`

#### Scenario: missing cache trail for claimed source fails

- **WHEN** `evidence-summary.md` or a topic reference claims an accepted source URL
- **AND** no submitted verified cache trail or explicit degraded-capture record maps to that source URL
- **THEN** Wave1 gate SHALL fail cache/source mapping for that topic

### Requirement: Wave1 queue-loop playbook verifies deepening end-to-end

Wave1 playbook SHALL verify deepening end to end through work-unit claim, sub-agent execution, submit, ledger, Phase Agent depth review, supplementary refill when shallow, backfill, and gate.

The playbook SHALL include negative coverage where a structurally valid Wave1 output is shallow: it reuses Wave0 sources, omits depth dimensions, or claims source URLs without cache trails. That fixture-backed negative case SHALL prove Engine/phase contract rejection only; it SHALL NOT claim to prove real Agent research quality.

#### Scenario: Wave1 playbook covers out-of-order submit

- **WHEN** multiple Wave1 deepening work units are in flight
- **THEN** the playbook SHALL allow submits to arrive out of order

#### Scenario: Wave1 playbook rejects shallow output

- **WHEN** a Wave1 fixture submits evidence-summary and question-list files that mostly summarize Wave0 and lack enough new source URLs
- **THEN** the playbook SHALL observe a failed depth-review or gate check
- **AND** repair SHALL proceed through supplementary work-unit demand rather than force-advance

### Requirement: Wave1 deepening queue items SHALL claim work units

Wave1 deepening queue items SHALL become eligible for `operate-work-unit claim` rather than non-work-unit delegated dispatch. The queue demand SHALL include enough kind/output contract data for the Engine to create a `wave1_topic_deepening` work unit.

Supplementary Wave1 deepening queue items SHALL use the same work-unit path. Their `queue_item_id` MAY include a suffix such as `-v2` or `-suppl-rN`, but topic identity SHALL come from explicit `payload.topic_slug`; queue item ID parsing SHALL be fallback only.

#### Scenario: Wave1 claim creates deepening work unit

- **WHEN** a Wave1 deepening queue item is claimed
- **THEN** the allocated work unit SHALL have kind `wave1_topic_deepening`

#### Scenario: Supplementary Wave1 task keeps topic identity

- **WHEN** shallow Wave1 output requires a second task for topic `topic-a`
- **AND** the Agent enqueues `wave1-deepen-topic-a-v2` with `payload.topic_slug: "topic-a"`
- **THEN** `operate-work-unit claim` SHALL preserve the topic binding through manifest, result, submitted ledger row, and depth review repair refs
