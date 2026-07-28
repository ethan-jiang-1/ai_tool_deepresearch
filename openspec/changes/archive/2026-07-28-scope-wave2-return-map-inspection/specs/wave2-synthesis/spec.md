## MODIFIED Requirements

### Requirement: Wave2 three-artifact group with verified references

Wave2 SHALL produce three artifacts as a group, not a single synthesis.md:

- **`artifacts/wave2/synthesis.md`** — narrative projection for human reading. SHALL contain: cross-topic patterns and themes, contradictions/tensions between topic findings, confidence assessment per major claim, explicit Markdown links to Wave0/Wave1 artifacts, references to finding ids (W2F-xxx), and Unresolved Cross-Topic Questions section. SHALL NOT serve as dynamic finding source of truth, carry full scan matrix, solely decide seed topic backfill, or be parsed as a Seed Topic return-map entry.
- **`artifacts/wave2/cross-topic-ledger.md`** — Agent-readable dynamic ledger. SHALL contain 6 fixed sections: Cross-Topic Scan Matrix, Wave1 Legacy Questions, Cross-Topic Resolutions, Emergent Cross-Topic Questions, Exploration Decisions, HITL2 Handoff. SHALL be dynamically grown (appended/updated per round), not written once at the end, and SHALL NOT be parsed as a Seed Topic return-map entry.
- **`artifacts/wave2/finding-index.yaml`** — JS-readable structured shadow index. Each finding SHALL have: `id` (W2F-xxx), `type` (enum), `priority` (enum), `status` (enum), `decision` (enum), `affected_topics` (array, min 2 for emergent), `origin_refs`, `trigger_refs`, `search_required` (boolean), `subagent_receipt_refs`, `appears_in_synthesis` (boolean), `hitl2_handoff` (boolean), `confidence` (enum), `independent_backing_refs` (array), and `gap_status` (enum). SHALL be parseable YAML.

Synthesis narrative SHALL reference finding ids (W2F-xxx) to maintain traceability from narrative back to ledger/index. At least 1 reference to a wave1 `evidence-summary.md` or `question-list.md` SHALL exist.

**Question status tracking across Wave1/Wave2**: Synthesis SHALL read wave1's four-section question-list (Targets -> Reconciliation -> Emergent Protocol -> Exploration/Exploitation Decision) as structured input. Wave2's cross-topic-ledger SHALL serve as the cross-topic continuation of the per-topic question tracking: Wave1 Legacy Questions section imports unresolved items from Wave1 question-lists, Cross-Topic Resolutions section records integration of legacy questions using other topics' evidence, and Emergent Cross-Topic Questions section captures new questions invisible from any single per-topic perspective. Question status labels (`[开放]`, `[部分解答]`, `[涌现]`, `[需内部数据]`, `[已解决]`) flow from Wave1 question-list through Wave2 ledger to backfill projection.

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

### Requirement: Three-artifact Wave2 output with JS feedback integration

Three-artifact Wave2 synthesis output SHALL continue to use JS feedback for their independent structural/reference checks. Delegated evidence supporting those artifacts SHALL be work-unit ledger covered when it was produced by sub-agent search. Wave2 return-map feedback SHALL remain limited to the existing Seed Topic projection evaluator and SHALL not be a second artifact validator.

#### Scenario: artifact reference uses delegated evidence row

- **WHEN** a Wave2 artifact references newly delegated evidence
- **THEN** the evidence SHALL be covered by a submitted work-unit ledger row

#### Scenario: artifact and Seed Topic failures retain distinct owners

- **WHEN** a Wave2 artifact violates its own structural contract and a Seed Topic Wave2 entry violates its return-map fields or W2F binding
- **THEN** inspect SHALL preserve the artifact's existing rule ID and the Seed Topic's exact projection coordinate
- **AND** neither failure SHALL satisfy, mask, or be recast as the other's contract
