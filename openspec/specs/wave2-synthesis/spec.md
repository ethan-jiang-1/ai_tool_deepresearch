# Wave2 Synthesis

> req: WTS-001, WTS-002, WTS-003, WTS-004, WTS-005, WTS-006, WTS-007, WTS-008, WTS-009

## Purpose

Define wave2 cross-topic synthesis via queue-driven iterative finding triage + targeted search loop. Wave2 takes all topic evidence-summary and question-list from wave1, produces a three-artifact group (synthesis.md narrative projection, cross-topic-ledger.md dynamic ledger, finding-index.yaml JS-readable index), classifies findings into three types with six explicit exploration/exploitation decisions, records a cross-topic scan matrix as process evidence, runs JS feedback checks at semantic boundaries, and backfills seed topic files as projection from the ledger/index. This is the last research phase before HITL2 human review.
## Requirements
### Requirement: Wave2 phase uses queue-driven three-stage execution

Wave2 SHALL keep queue-driven execution, but delegated targeted evidence search SHALL use work-unit claim/submit. Pure cross-topic synthesis SHALL remain main-agent work.

#### Scenario: pure synthesis has no delegated work-unit requirement

- **WHEN** Wave2 performs synthesis using existing accepted evidence
- **THEN** it SHALL not require a work-unit row for that synthesis step

### Requirement: Gap-fill sub-agent dispatch for targeted evidence search

Gap-fill sub-agent dispatch SHALL be represented as queue demand claimed into work-unit kind `wave2_targeted_evidence`. The result SHALL be submitted by `work_id` before any gate coverage can pass.

#### Scenario: gap-fill creates evidence work unit

- **WHEN** Wave2 triage identifies a delegated evidence gap
- **THEN** the Engine SHALL allocate a `wave2_targeted_evidence` work unit

### Requirement: Iterative finding triage + targeted search loop with convergence criteria

Iterative triage SHALL enqueue delegated queue demand for targeted search only when the Main Agent judges new evidence is required. Each delegated search SHALL return through the same work-unit submit loop.

#### Scenario: triage-created search is submitted

- **WHEN** triage creates delegated targeted search demand
- **THEN** gate coverage SHALL require successful work-unit submit

### Requirement: Wave2 three-artifact group with verified references

Wave2 SHALL produce three artifacts as a group, not a single synthesis.md:

- **`artifacts/wave2/synthesis.md`** — narrative projection for human reading. SHALL contain: cross-topic patterns and themes, contradictions/tensions between topic findings, confidence assessment per major claim, explicit Markdown links to Wave0/Wave1 artifacts, references to finding ids (W2F-xxx), and Unresolved Cross-Topic Questions section. SHALL NOT serve as dynamic finding source of truth, carry full scan matrix, or solely decide seed topic backfill.
- **`artifacts/wave2/cross-topic-ledger.md`** — Agent-readable dynamic ledger. SHALL contain 6 fixed sections: Cross-Topic Scan Matrix, Wave1 Legacy Questions, Cross-Topic Resolutions, Emergent Cross-Topic Questions, Exploration Decisions, HITL2 Handoff. SHALL be dynamically grown (appended/updated per round), not written once at the end.
- **`artifacts/wave2/finding-index.yaml`** — JS-readable structured shadow index. Each finding SHALL have: `id` (W2F-xxx), `type` (enum), `status` (enum), `decision` (enum), `affected_topics` (array, min 2 for emergent), `origin_refs`, `trigger_refs`, `search_required` (boolean), `subagent_receipt_refs`, `appears_in_synthesis` (boolean), `hitl2_handoff` (boolean). SHALL be parseable YAML.

Synthesis narrative SHALL reference finding ids (W2F-xxx) to maintain traceability from narrative back to ledger/index. At least 1 reference to a wave1 `evidence-summary.md` or `question-list.md` SHALL exist.

**Question status tracking across Wave1/Wave2**: Synthesis SHALL read wave1's four-section question-list（Targets → Reconciliation → Emergent Protocol → Exploration/Exploitation Decision）as structured input. Wave2's cross-topic-ledger SHALL serve as the cross-topic continuation of the per-topic question tracking: Wave1 Legacy Questions section imports unresolved items from Wave1 question-lists, Cross-Topic Resolutions section records integration of legacy questions using other topics' evidence, and Emergent Cross-Topic Questions section captures new questions invisible from any single per-topic perspective. Question status labels (`[开放]`, `[部分解答]`, `[涌现]`, `[需内部数据]`, `[已解决]`) flow from Wave1 question-list through Wave2 ledger to backfill projection.

Synthesis SHALL NOT claim to be a complete research conclusion (HITL2 and readiness phases follow).

#### Scenario: Three artifacts exist and are structurally complete

- **WHEN** Phase Agent completes the synthesis task
- **THEN** `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml` SHALL all exist and be non-empty
- **AND** `cross-topic-ledger.md` SHALL contain all 6 fixed sections
- **AND** `finding-index.yaml` SHALL parse as valid YAML with top-level keys `version`, `source_layer`, `ledger`, `synthesis`, `scan`, `findings`

#### Scenario: Synthesis narrative references finding ids

- **WHEN** Phase Agent writes `synthesis.md`
- **THEN** narrative SHALL reference finding ids (W2F-xxx) for key cross-topic claims
- **AND** at least 1 Markdown link SHALL reference a wave1 `evidence-summary.md` or `question-list.md`

#### Scenario: Synthesis documents unresolved findings

- **WHEN** finding triage loop terminates with unresolved findings
- **THEN** `synthesis.md` SHALL contain an "Unresolved Cross-Topic Questions" section referencing finding ids
- **AND** `cross-topic-ledger.md` HITL2 Handoff section SHALL list findings with decisions `defer_hitl2` or `requires_internal_data`
- **AND** each unresolved finding SHALL be labeled with its status and decision in the ledger

#### Scenario: Ledger scan matrix records checked pairs

- **WHEN** Phase Agent scans cross-topic relationships
- **THEN** ledger scan matrix SHALL record which topic pairs were checked
- **AND** each row SHALL list checked dimensions (shared_pattern, contradiction, resolution_opportunity, emergent_question) and resulting finding_ids (or "none")
- **AND** scan matrix SHALL exist even when no findings emerged from a pair

### Requirement: Per-topic backfill via queue task cards

After synthesis completes, the Phase Agent SHALL execute per-topic backfill task cards to replace backfill tokens in seed topic files.

Each backfill task card SHALL:
- Target one topic from `topic_registry`
- Use `producer_rule: seed_topic_backfill_wave2`
- Have `required_receipts` limited to current queue-engine supported prefixes, with token absence verified by the wave2 gate
- Replace `__BACKFILL_WAVE2_JUDGMENT__` with cross-topic judgment relevant to that topic（projected from Wave2 ledger/index — filtering findings where `affected_topics` includes the topic）
- Replace `__BACKFILL_PENDING_QUESTIONS__` with updated question status labels（projected from Wave2 ledger/index finding status/decision fields）

Backfill execution SHALL use the standard claim→execute→complete queue loop. Backfill content SHALL be projected from ledger/index, NOT directly excerpted from synthesis.md narrative.

#### Scenario: Backfill replaces judgment token

- **WHEN** Phase Agent executes backfill task for topic X
- **THEN** Phase Agent SHALL grep for `__BACKFILL_WAVE2_JUDGMENT__` in `seed_topics/X.md`
- **AND** Phase Agent SHALL replace the token line with cross-topic judgment paragraphs relevant to topic X
- **AND** the replacement content SHALL be projected from Wave2 ledger/index（filtering findings where `affected_topics` includes topic X）, NOT directly excerpted from synthesis.md narrative

#### Scenario: Backfill updates question status tokens

- **WHEN** Phase Agent executes backfill task for topic X
- **THEN** Phase Agent SHALL grep for `__BACKFILL_PENDING_QUESTIONS__` in `seed_topics/X.md`
- **AND** Phase Agent SHALL update question status labels based on finding status/decision in Wave2 ledger/index
- **AND** partially answered questions SHALL be labeled `[部分解答]`
- **AND** still-open questions SHALL remain `[开放]`
- **AND** new cross-topic emergent questions SHALL be labeled `[涌现]` with `source_layer: wave2_cross_topic`

### Requirement: Wave2 sub-agent behavior specification

Wave2 sub-agent behavior SHALL be specified through work-unit task/result/receipt contracts and SHALL bind `work_id`, `queue_item_id`, `kind`, and `receipt_nonce`.

#### Scenario: Wave2 sub-agent result binds nonce

- **WHEN** a Wave2 targeted evidence result is submitted
- **THEN** submit SHALL verify the receipt nonce across result, receipt, beacon, and manifest

### Requirement: Three-artifact Wave2 output with JS feedback integration

Three-artifact Wave2 synthesis output SHALL continue to use JS feedback for structural/reference checks. Delegated evidence supporting those artifacts SHALL be work-unit ledger covered when it was produced by sub-agent search.

#### Scenario: artifact reference uses delegated evidence row

- **WHEN** a Wave2 artifact references newly delegated evidence
- **THEN** the evidence SHALL be covered by a submitted work-unit ledger row

### Requirement: Finding taxonomy with explicit types, decisions, and consistency rules

Every Wave2 finding SHALL be classified into one of three types and receive one of six decisions. The `finding-index.yaml` SHALL enable deterministic JS consistency checks.

Finding type enum values:
- `wave1_legacy_question`: From Wave1 question-list `[仍开放]` / `[部分进展]` questions
- `cross_topic_resolution`: Legacy question answered by other topics' existing evidence
- `cross_topic_emergent_question`: New question first visible only after cross-topic alignment

Finding status enum values:
- `resolved`: Fully answered
- `partial`: Partially answered
- `open`: Not yet answered
- `deferred`: Explicitly deferred

Decision enum values:
- `use_existing_evidence`: Integrate using existing Wave1 evidence (no search)
- `exploit_search`: Narrow targeted supplementary search for legacy questions
- `explore_search`: Limited exploration for emergent questions
- `defer_hitl2`: Needs human prioritization/tradeoffs
- `requires_internal_data`: Needs proprietary/non-public data
- `record_only`: Low impact or exceeds Wave2 budget

JS SHALL enforce these minimum consistency rules deterministically:
1. Every finding has all required fields
2. `cross_topic_resolution` has non-empty `origin_refs` AND non-empty `trigger_refs`
3. `cross_topic_resolution.search_required` is false
4. `cross_topic_emergent_question.affected_topics.length >= 2`
5. `decision in [exploit_search, explore_search]` implies `search_required=true`
6. After search completes, `decision in [exploit_search, explore_search]` implies non-empty `subagent_receipt_refs`
7. `decision in [defer_hitl2, requires_internal_data]` implies `hitl2_handoff=true`
8. `appears_in_synthesis=false` implies `hitl2_handoff=true` OR `decision=record_only`（prevents orphan finding）

JS SHALL NOT judge whether a resolution is "smart," an emergent question is "profound," or a research direction is "worth pursuing."

#### Scenario: Resolution finding has correct structure

- **WHEN** Topic A has an open Wave1 question partially answered by Topic B's evidence
- **THEN** finding SHALL have `type: cross_topic_resolution`, `decision: use_existing_evidence`, `search_required: false`
- **AND** `origin_refs` SHALL point to Topic A's question-list, `trigger_refs` SHALL point to Topic B's evidence-summary

#### Scenario: Emergent question has at least two affected topics

- **WHEN** a cross-topic pattern emerges involving topics A and C
- **THEN** finding SHALL have `type: cross_topic_emergent_question` and `affected_topics.length >= 2`
- **AND** if `affected_topics.length < 2`, JS SHALL flag as invalid

#### Scenario: Search decision has receipt after sub-agent completes

- **WHEN** a finding with `decision=explore_search` has spawned a sub-agent that completed
- **THEN** `subagent_receipt_refs` SHALL be non-empty
- **AND** if empty, JS L1 check SHALL flag the inconsistency

#### Scenario: Deferred finding reaches HITL2 handoff

- **WHEN** a finding has `decision=requires_internal_data`
- **THEN** `hitl2_handoff` SHALL be true
- **AND** finding SHALL appear in ledger's HITL2 Handoff section

### Requirement: Cross-topic scan matrix as process evidence surface

The cross-topic scan matrix remains process evidence for synthesis. It SHALL NOT substitute for work-unit ledger coverage when new delegated targeted evidence search was performed.

#### Scenario: scan matrix cannot cover delegated search

- **WHEN** delegated targeted evidence search produced a file
- **THEN** the scan matrix SHALL NOT make that file gate-authoritative without submitted work-unit coverage

