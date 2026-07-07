## MODIFIED Requirements

> req: WTS-003, WTS-004, WTS-008, WTS-009

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

- **`artifacts/wave2/synthesis.md`** — narrative projection for human reading. SHALL contain: cross-topic patterns and themes, contradictions/tensions between topic findings, confidence assessment per major claim, explicit Markdown links to Wave0/Wave1 artifacts, references to finding ids (W2F-xxx), and Unresolved Cross-Topic Questions section. SHALL NOT serve as dynamic finding source of truth, carry full scan matrix, or solely decide seed topic backfill.
- **`artifacts/wave2/cross-topic-ledger.md`** — Agent-readable dynamic ledger. SHALL contain 6 fixed sections: Cross-Topic Scan Matrix, Wave1 Legacy Questions, Cross-Topic Resolutions, Emergent Cross-Topic Questions, Exploration Decisions, HITL2 Handoff. SHALL be dynamically grown (appended/updated per round), not written once at the end.
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

#### Scenario: scan matrix cannot cover delegated search

- **WHEN** delegated targeted evidence search produced a file
- **THEN** the scan matrix SHALL NOT make that file gate-authoritative without submitted work-unit coverage

#### Scenario: missing scan matrix blocks pure synthesis pass

- **WHEN** `synthesis.md` exists but `cross-topic-ledger.md` lacks a scan matrix or `finding-index.yaml` lacks scan coverage
- **THEN** Wave2 SHALL fail deterministic structure/preflight checks
- **AND** diagnostics SHALL instruct the Agent to complete scan matrix and triage before synthesis
