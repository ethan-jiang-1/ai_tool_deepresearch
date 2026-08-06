# Wave2 Synthesis

> req: WTS-001, WTS-002, WTS-003, WTS-004, WTS-005, WTS-006, WTS-007, WTS-008, WTS-009, WTS-010, WTS-011

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

Before pure synthesis can complete, the Main Agent SHALL finish cross-topic scan matrix construction, finding confidence triage, gap analysis, and emergent-search decision recording. Convergence SHALL mean every finding has a decision, every search-required finding has submitted targeted evidence or an explicit deferral/record-only decision, and no unresolved `priority: p0` / `priority: p1` evidence gap is silently omitted from ledger/index/synthesis.

The triage loop SHALL read `rb_profile.yaml` values including `wave2_cross_topic_depth`, `wave2_emergent_search_rounds`, `p0p1_independent_backing`, `quality_min_tier`, and `quality_min_substance`. When a required profile parameter is missing, the Phase Agent SHALL record the missing parameter as a diagnostic or deferral rather than silently applying an unstated threshold.

#### Scenario: triage-created search is submitted

- **WHEN** triage creates delegated targeted search demand
- **THEN** gate coverage SHALL require successful work-unit submit

#### Scenario: pure synthesis requires convergence

- **WHEN** the Main Agent attempts to complete the pure synthesis queue item
- **THEN** `finding-index.yaml` SHALL show that all findings have decisions
- **AND** findings that require targeted search SHALL either have submitted targeted evidence refs or transition to an explicit `defer_hitl2`, `requires_internal_data`, or `record_only` routing decision with matching `gap_status`

#### Scenario: uncertain finding triggers targeted delegated search

- **WHEN** a finding with `priority: p0` or `priority: p1` lacks the required independent backing refs and can be checked with public evidence
- **THEN** the Agent SHALL enqueue `wave2_targeted_evidence`
- **AND** the finding SHALL remain unresolved until the targeted work unit is submitted or explicitly deferred

### Requirement: Wave2 three-artifact group with verified references

Wave2 SHALL produce three artifacts as a group, not a single synthesis.md:

- **`artifacts/wave2/synthesis.md`** — narrative projection for human reading. SHALL contain: cross-topic patterns and themes, contradictions/tensions between topic findings, confidence assessment per major claim, explicit Markdown links to Wave0/Wave1 artifacts, references to finding ids (W2F-xxx), and Unresolved Cross-Topic Questions section. SHALL NOT serve as dynamic finding source of truth, carry full scan matrix, solely decide seed topic backfill, or be parsed as a Seed Topic return-map entry.
- **`artifacts/wave2/cross-topic-ledger.md`** — Agent-readable dynamic ledger. SHALL contain 6 fixed sections: Cross-Topic Scan Matrix, Wave1 Legacy Questions, Cross-Topic Resolutions, Emergent Cross-Topic Questions, Exploration Decisions, HITL2 Handoff. SHALL be dynamically grown (appended/updated per round), not written once at the end, and SHALL NOT be parsed as a Seed Topic return-map entry.
- **`artifacts/wave2/finding-index.yaml`** — JS-readable structured shadow index. Each finding SHALL have: `id` (W2F-xxx), `type` (enum), `priority` (enum), `status` (enum), `decision` (enum), `affected_topics` (array, min 2 for emergent), `origin_refs`, `trigger_refs`, `search_required` (boolean), `subagent_receipt_refs`, `appears_in_synthesis` (boolean), `hitl2_handoff` (boolean), `confidence` (enum), `independent_backing_refs` (array), and `gap_status` (enum). SHALL be parseable YAML.

Synthesis narrative SHALL reference finding ids (W2F-xxx) to maintain traceability from narrative back to ledger/index. At least 1 reference to a wave1 `evidence-summary.md` or `question-list.md` SHALL exist.

**Question status tracking across Wave1/Wave2**: Synthesis SHALL read wave1's four-section question-list（Targets → Reconciliation → Emergent Protocol → Exploration/Exploitation Decision）as structured input. Wave2's cross-topic-ledger SHALL serve as the cross-topic continuation of the per-topic question tracking: Wave1 Legacy Questions section imports unresolved items from Wave1 question-lists, Cross-Topic Resolutions section records integration of legacy questions using other topics' evidence, and Emergent Cross-Topic Questions section captures new questions invisible from any single per-topic perspective. Question status labels (`[开放]`, `[部分解答]`, `[涌现]`, `[需内部数据]`, `[已解决]`) flow from Wave1 question-list through Wave2 ledger to backfill projection.

`finding-index.yaml` SHALL also include a top-level `synthesis_eligibility` projection recording scan coverage and unresolved search-required counts, so the gate can distinguish legal pure synthesis from skipped synthesis work.

The minimum `synthesis_eligibility` shape SHALL include:
- `pure_synthesis_eligible` (boolean)
- `scan_matrix_present` (boolean)
- `scan_topic_pair_coverage` (object or array with checked topic-pair refs)
- `unresolved_search_required_count` (integer)
- `targeted_search_required_count` (integer)
- `targeted_search_submitted_count` (integer)
- `explicit_deferral_count` (integer)
- `profile_params_read[]`
- `ineligibility_reasons[]`

#### Scenario: Three artifacts exist and are structurally complete

- **WHEN** Phase Agent completes the synthesis task
- **THEN** `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml` SHALL all exist and be non-empty
- **AND** `cross-topic-ledger.md` SHALL contain all 6 fixed sections
- **AND** `finding-index.yaml` SHALL parse as valid YAML with top-level keys `version`, `source_layer`, `ledger`, `synthesis`, `scan`, `findings`, `synthesis_eligibility`

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

#### Scenario: Finding index records synthesis eligibility

- **WHEN** Wave2 uses pure synthesis without delegated targeted search
- **THEN** `finding-index.yaml` SHALL record scan coverage and `unresolved_search_required_count: 0`
- **AND** if unresolved search-required findings remain, pure synthesis SHALL not be eligible to pass without explicit deferral fields

#### Scenario: Artifact contracts do not require a Seed Topic return-map section

- **WHEN** an otherwise valid `synthesis.md` and six-section `cross-topic-ledger.md` omit `## Return Map`
- **THEN** their Wave2 artifact evaluation SHALL use only their respective artifact contracts
- **AND** return-map five-field findings SHALL not be emitted for either artifact

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

Three-artifact Wave2 synthesis output SHALL continue to use JS feedback for their independent structural/reference checks. Delegated evidence supporting those artifacts SHALL be work-unit ledger covered when it was produced by sub-agent search. Wave2 return-map feedback SHALL remain limited to the existing Seed Topic projection evaluator and SHALL not be a second artifact validator.

#### Scenario: artifact reference uses delegated evidence row

- **WHEN** a Wave2 artifact references newly delegated evidence
- **THEN** the evidence SHALL be covered by a submitted work-unit ledger row

#### Scenario: artifact and Seed Topic failures retain distinct owners

- **WHEN** a Wave2 artifact violates its own structural contract and a Seed Topic Wave2 entry violates its return-map fields or W2F binding
- **THEN** inspect SHALL preserve the artifact's existing rule ID and the Seed Topic's exact projection coordinate
- **AND** neither failure SHALL satisfy, mask, or be recast as the other's contract

### Requirement: Finding taxonomy with explicit types, decisions, and consistency rules

Every Wave2 finding SHALL be classified into one of three types and receive one of six decisions. The `finding-index.yaml` SHALL enable deterministic JS consistency checks.

Finding type enum values:
- `wave1_legacy_question`: From Wave1 question-list `[仍开放]` / `[部分进展]` questions
- `cross_topic_resolution`: Legacy question answered by other topics' existing evidence
- `cross_topic_emergent_question`: New question first visible only after cross-topic alignment

Finding priority enum values:
- `p0`: Major report claim or must-answer finding
- `p1`: Important supporting finding or likely HITL2 decision input
- `p2`: Contextual, low-impact, or record-only finding

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

Confidence enum values:
- `high`: Meets or exceeds profile-required independent backing and source quality thresholds
- `medium`: Has some independent backing but below high-confidence threshold
- `low`: Weak or single-source backing
- `uncertain`: Requires search, internal data, or HITL2 judgment before use as a major claim

Gap status enum values:
- `no_gap`: Existing accepted evidence is enough for the finding's current decision
- `needs_search`: Public targeted evidence search is required and has not yet been submitted
- `search_submitted`: Targeted evidence search was submitted and linked to the finding
- `deferred_hitl2`: The gap is intentionally routed to HITL2
- `requires_internal_data`: The gap cannot be resolved with public evidence
- `record_only`: The gap is recorded but not pursued within Wave2 budget

JS SHALL enforce these minimum consistency rules deterministically:
1. Every finding has all required fields
2. `cross_topic_resolution` has non-empty `origin_refs` AND non-empty `trigger_refs`
3. `cross_topic_resolution.search_required` is false
4. `cross_topic_emergent_question.affected_topics.length >= 2`
5. `decision in [exploit_search, explore_search]` implies `search_required=true`
6. After search completes, `decision in [exploit_search, explore_search]` implies non-empty `subagent_receipt_refs`
7. `decision in [defer_hitl2, requires_internal_data]` implies `hitl2_handoff=true`
8. `appears_in_synthesis=false` implies `hitl2_handoff=true` OR `decision=record_only`（prevents orphan finding）
9. `confidence=high` implies enough `independent_backing_refs` to satisfy the profile-required floor
10. `search_required=true` with no submitted receipt refs implies the finding is not resolved unless its decision is `defer_hitl2`, `requires_internal_data`, or `record_only`
11. `gap_status=needs_search` implies `decision in [exploit_search, explore_search]` and blocks pure synthesis eligibility
12. `gap_status=search_submitted` implies non-empty `subagent_receipt_refs`
13. `synthesis_eligibility.pure_synthesis_eligible=true` implies `unresolved_search_required_count=0` and no finding with `gap_status=needs_search`
14. `priority in [p0, p1]` with `confidence in [low, uncertain]` implies pure synthesis eligibility is false unless `gap_status` is `search_submitted`, `deferred_hitl2`, `requires_internal_data`, or `record_only` with matching receipts or routing decision

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

#### Scenario: High confidence requires independent backing

- **WHEN** a finding declares `confidence: high`
- **THEN** its `independent_backing_refs` SHALL meet the profile-required independent backing floor
- **AND** if the floor is not met, JS SHALL flag the finding as inconsistent rather than silently downgrading it

#### Scenario: Synthesis eligibility summarizes unresolved search gaps

- **WHEN** `finding-index.yaml` contains a finding with `gap_status: needs_search`
- **THEN** `synthesis_eligibility.pure_synthesis_eligible` SHALL be false
- **AND** `synthesis_eligibility.unresolved_search_required_count` SHALL be greater than 0

#### Scenario: Under-backed priority finding blocks pure synthesis until routed

- **WHEN** `finding-index.yaml` contains a finding with `priority: p0`, `confidence: low`, and no submitted targeted evidence receipt or explicit deferral/internal-data/record-only routing
- **THEN** `synthesis_eligibility.pure_synthesis_eligible` SHALL be false

### Requirement: Cross-topic scan matrix as process evidence surface

The cross-topic scan matrix remains process evidence for synthesis. It SHALL NOT substitute for work-unit ledger coverage when new delegated targeted evidence search was performed.

The scan matrix SHALL also be the deterministic process surface that shows pure synthesis was not skipped. It SHALL cover expected topic pairs or the explicitly documented reduced coverage allowed by `rb_profile.yaml`, list checked dimensions, and connect rows to finding IDs or `none`.

For deterministic Gate evaluation, checked pair identity SHALL be projected into `finding-index.yaml#/synthesis_eligibility/scan_topic_pair_coverage`. `cross-topic-ledger.md` remains the Agent-readable reasoning/process surface, but Gate code SHALL NOT infer blocking pair facts from Markdown prose, topic-slug substring presence, or pair-row formatting.

The accepted pair coverage container MAY remain an array or object. Array entries SHALL use `{ pair: [topicA, topicB], refs?: [...] }`. The only accepted object form SHALL be `{ pairs: [<same entries>] }`. Single-entry objects, arbitrary object maps, object-key pair encodings, and free-text pair encodings SHALL be invalid. One normalizer SHALL map both accepted container forms to canonical unordered topic keys through accepted topic-layout facts: UID when present, otherwise an evaluator-local stable legacy key derived from canonical id/current slug. Current or previous layout tokens SHALL resolve to the same topic key, and diagnostics SHALL use current slugs.

For every run, malformed entries, self-pairs, unknown topics, and duplicate unordered pairs SHALL fail the structured pair contract. `scan.topic_count` SHALL equal the canonical topic registry count. `scan.pair_count_expected` SHALL equal `C(topic_count,2)`. `scan.pair_count_checked` SHALL be an integer between zero and `pair_count_expected` and equal the observed unique normalized pair count. When topic count is greater than one, the observed set SHALL contain at least one pair to prove scan was not wholly skipped. These parent/identity/count/process-presence failures protect required structured authority or binding and SHALL NOT be degradation-eligible.

These general structural rules SHALL NOT impose universal full-pair coverage on an ordinary first-run or `action:supplement`. `wave2_cross_topic_depth: 0` means no material cross-topic connection is required, not that a multi-topic scan may be empty. The profile's remaining reduced-coverage quality semantics stay with the accepted Agent self-check unless a separate deterministic checked-dimension contract is introduced. When the existing shared direction resolver activates rerun `action:add`, the same normalized fact result SHALL instead be compared with the complete canonical pair universe as required by the full re-synthesis contract.

#### Scenario: scan matrix cannot cover delegated search

- **WHEN** delegated targeted evidence search produced a file
- **THEN** the scan matrix SHALL NOT make that file gate-authoritative without submitted work-unit coverage

#### Scenario: missing scan matrix blocks pure synthesis pass

- **WHEN** `synthesis.md` exists but `cross-topic-ledger.md` lacks a scan matrix or `finding-index.yaml` lacks scan coverage
- **THEN** Wave2 SHALL fail deterministic structure/preflight checks
- **AND** diagnostics SHALL instruct the Agent to complete scan matrix and triage before synthesis

#### Scenario: accepted container forms share one pair grammar

- **WHEN** equivalent `{pairs: [...]}` object-wrapper and direct array coverage contain the same structured pair entries
- **THEN** the normalizer SHALL produce the same canonical unordered pair set and count
- **AND** object keys or Markdown prose SHALL NOT create additional pair facts

#### Scenario: unsupported object maps fail closed

- **WHEN** pair coverage uses a single-entry object, arbitrary object map, or key-encoded pair instead of `{pairs: [...]}`
- **THEN** the normalizer SHALL report one container/entry-shape root
- **AND** it SHALL NOT guess pair identity from object keys

#### Scenario: legacy topic registry has an in-memory pair identity

- **WHEN** a supported legacy topic registry lacks topic UIDs
- **THEN** current or previous layout tokens SHALL normalize through an evaluator-local stable legacy topic key
- **AND** the Engine SHALL NOT require a new persistent UID field merely to evaluate pair structure

#### Scenario: profile-reduced coverage remains a distinct policy

- **WHEN** ordinary Wave2 checked coverage is non-empty but intentionally smaller than `pair_count_expected` under accepted reduced-profile semantics
- **AND** `pair_count_checked` matches the observed unique structured entries
- **THEN** the general pair-fact contract SHALL pass its structural slice
- **AND** it SHALL NOT report full-pair coverage or deterministic profile-depth proof

### Requirement: Wave2 SHALL materialize existing-backed cross references without weakening targeted evidence provenance

Wave2 pure synthesis SHALL materialize `reference/00-cross-*.md` files for accepted consumer-facing cross-topic findings when those findings have concrete existing backing that ultimately binds to submitted Wave0/Wave1 source claims, accepted source URL surfaces, cache trails, explicit degraded-capture records, or work-unit ledger rows. Backed references, evidence summaries, question lists, and synthesis artifacts MAY be locator refs only when they resolve to that underlying submitted backing. These existing-backed cross references are Phase-owned consumer projections. They SHALL cite `W2F-xxx` finding ids and bundle-relative backing refs to `cross-topic-ledger.md`, `finding-index.yaml`, and the submitted prior-wave evidence surfaces that support the finding. A prior reference file MAY be one backing ref only when that prior reference itself binds to submitted/prior accepted evidence; reference-to-reference chains without underlying submitted backing SHALL NOT be sufficient.

Wave2 MAY omit a `00-cross` reference only for findings explicitly marked as process-only, internal, deferred, not sufficiently source-backed, or intentionally not consumer-facing. Such omission SHALL be visible in Wave2 artifacts or diagnostics, not hidden by silence.

When Wave2 requires new public evidence, it SHALL enqueue and drain `wave2_targeted_evidence` work units. A `reference/00-cross-*.md` that claims newly fetched evidence, targeted search, or source discovery beyond existing submitted backing SHALL require submitted Wave2 work-unit coverage and cache trails before it can count as resolved evidence.

Wave2 SHALL NOT use synthesis prose alone as backing for `00-cross` references. If concrete prior-wave backing is absent and targeted search is not performed or fails, the finding SHALL be deferred, routed to internal data/HITL2, or recorded as a limitation rather than materialized as an accepted cross reference.

#### Scenario: pure synthesis writes existing-backed cross reference

- **WHEN** Wave2 identifies finding `W2F-001` from already submitted Wave0/Wave1 evidence
- **AND** the finding has concrete backing refs in `finding-index.yaml` or `cross-topic-ledger.md` that resolve to submitted prior-wave source/cache/degraded-capture/work-unit backing
- **AND** the finding is accepted and consumer-facing
- **THEN** the Phase Agent SHALL write `reference/00-cross-w2f-001-<slug>.md`
- **AND** the reference SHALL cite the finding id and prior-wave backing refs

#### Scenario: non-consumer finding omission is explicit

- **WHEN** Wave2 does not materialize a `00-cross` reference for a backed `W2F-xxx` finding
- **THEN** Wave2 artifacts or diagnostics SHALL record that the finding is process-only, internal, deferred, not sufficiently source-backed, or intentionally not consumer-facing
- **AND** the omission SHALL NOT be treated as silent successful materialization

#### Scenario: new external evidence still requires targeted work unit

- **WHEN** a Wave2 finding requires new public search or fetched evidence
- **THEN** the Phase Agent SHALL enqueue `wave2_targeted_evidence`
- **AND** any `reference/00-cross-*.md` claiming that new fetched evidence SHALL bind to submitted Wave2 work-unit rows and cache trails

#### Scenario: synthesis prose alone cannot back cross reference

- **WHEN** `synthesis.md` makes a cross-topic statement but `finding-index.yaml` and `cross-topic-ledger.md` do not identify concrete existing source backing
- **THEN** the Phase Agent SHALL NOT materialize an accepted `reference/00-cross-*.md` from that prose alone
- **AND** it SHALL repair the ledger/index backing, run targeted evidence, or defer the finding

#### Scenario: reference chain alone cannot back cross reference

- **WHEN** a proposed `reference/00-cross-*.md` cites another reference file
- **AND** that prior reference cannot itself be bound to submitted/prior accepted source backing
- **THEN** the cross reference SHALL NOT count as existing-backed
- **AND** the Phase Agent SHALL repair backing refs, run targeted evidence, or record a limitation

#### Scenario: cross references update consumer navigation

- **WHEN** Wave2 materializes one or more `reference/00-cross-*.md` files
- **THEN** `reference/_INDEX.md` SHALL include corresponding `source_layer: wave2_cross` entries
- **AND** Wave2 seed-topic backfill SHALL preserve `W2F-xxx` ids and refs to the cross reference plus ledger/index backing

### Requirement: Finding index SHALL bind carried targets separately from artifact lineage

`finding-index.yaml` MAY give a finding `wave1_target_bindings[]` only when the finding is offered as coverage for a receipt-declared Wave1 target. Every entry SHALL have exactly `{ receipt_sha256, topic_uid, intent_sha256, target_id, target_revision }` and SHALL equal one target in the selected routed receipt. It SHALL be distinct from `origin_refs[]`, `trigger_refs[]`, affected-topic presentation, and work-unit receipts.

A target MAY have several bindings and a finding MAY bind several targets. Coverage requires at least one exact binding on a finding whose existing decision/gap-status contract is valid. Unrelated/emergent/legacy findings remain valid without this field but SHALL not satisfy a carried target merely through shared topic or lineage.

#### Scenario: one finding covers multiple declared targets
- **WHEN** one Wave2 finding legitimately disposes of two targets from the selected receipt
- **THEN** it MAY carry two exact target bindings
- **AND** each target is independently visible to the Wave2 closure evaluator

#### Scenario: stale binding does not cover revised target
- **WHEN** a target has the same local ID but a different receipt digest, intent binding, or target revision
- **THEN** the old finding binding SHALL not satisfy the selected receipt target
- **AND** the existing finding index receives the repair
