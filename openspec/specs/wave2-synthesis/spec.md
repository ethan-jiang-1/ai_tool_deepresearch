# Wave2 Synthesis

> req: WTS-001, WTS-002, WTS-003, WTS-004, WTS-005, WTS-006, WTS-007, WTS-008, WTS-009

## Purpose

Define wave2 cross-topic synthesis via queue-driven iterative finding triage + targeted search loop. Wave2 takes all topic evidence-summary and question-list from wave1, produces a three-artifact group (synthesis.md narrative projection, cross-topic-ledger.md dynamic ledger, finding-index.yaml JS-readable index), classifies findings into three types with six explicit exploration/exploitation decisions, records a cross-topic scan matrix as process evidence, runs JS feedback checks at semantic boundaries, and backfills seed topic files as projection from the ledger/index. This is the last research phase before HITL2 human review.

## Requirements

### Requirement: Wave2 phase uses queue-driven three-stage execution

`phase-wave2.md` SHALL guide the Phase Agent through queue-driven three-stage execution: filling (灌料), execution loop, and closeout+gate.

§3 Allowed Actions SHALL be structured as:
- **§3.1 Filling**: On first entry (queue empty), create 1 synthesis task card + N per-topic backfill task cards, enqueue all
- **§3.2 Execution Loop**: Claim → execute → complete cycle. Synthesis task executes first (with embedded finding triage + targeted search loop), then backfill tasks
- **§3.3 Closeout + Gate**: Verify all artifacts, run gate CLI, pass → chain to next phase

The synthesis task card SHALL use `targets: { controller: "main-agent" }` and `producer_rule: cross_topic_synthesis`. Backfill task cards SHALL use `targets: { controller: "main-agent" }` and `producer_rule: seed_topic_backfill_wave2`. Here `main-agent` is the current Queue schema wire value for Phase Agent execution, not the conceptual actor term.

#### Scenario: Phase Agent enters wave2 with empty queue

- **WHEN** Phase Agent loads `phase-wave2.md` and queue is empty
- **THEN** Phase Agent SHALL create 1 synthesis task card + N backfill task cards (one per topic in topic_registry)
- **AND** Phase Agent SHALL enqueue all task cards before beginning execution

#### Scenario: Synthesis task executes with finding triage loop

- **WHEN** Phase Agent claims the synthesis task card
- **THEN** Phase Agent SHALL read all topic evidence-summary and question-list from wave1 artifacts
- **AND** Phase Agent SHALL build cross-topic scan matrix and inventory findings into ledger/index
- **AND** Phase Agent SHALL classify each finding and assign exploration/exploitation decision
- **AND** Phase Agent SHALL spawn gap-fill sub-agents only for findings with decision exploit_search/explore_search
- **AND** Phase Agent SHALL iterate until no new findings or max iteration reached
- **AND** Phase Agent SHALL write synthesis.md as narrative projection referencing W2F-xxx finding ids
- **AND** Phase Agent SHALL complete the synthesis task with `file:` receipt verification for `artifacts/wave2/synthesis.md`, `artifacts/wave2/cross-topic-ledger.md`, and `artifacts/wave2/finding-index.yaml`

#### Scenario: Backfill tasks execute after synthesis completes

- **WHEN** synthesis task is complete and finding triage loop has converged
- **THEN** Phase Agent SHALL claim backfill tasks in order
- **AND** for each backfill task, Phase Agent SHALL replace `__BACKFILL_WAVE2_JUDGMENT__` and `__BACKFILL_PENDING_QUESTIONS__` tokens in the corresponding seed topic file
- **AND** Phase Agent SHALL complete each backfill task after replacing the token line; deterministic token absence is verified by the wave2 gate

### Requirement: Gap-fill sub-agent dispatch for targeted evidence search

During synthesis, after the Phase Agent has classified a finding and assigned decision `exploit_search` or `explore_search`, the Phase Agent SHALL directly spawn a sub-agent with role `dpt-topic-scout` to perform targeted search. The Phase Agent SHALL NOT spawn sub-agents for findings with decision `use_existing_evidence`, `defer_hitl2`, `requires_internal_data`, or `record_only`.

The gap-fill sub-agent SHALL:
- Receive a bounded task description with the specific finding to search for
- Use WebSearch + WebFetch to find targeted evidence
- Return structured JSON result (found_evidence, source_urls, fills_gap, confidence)
- NOT write to WorkflowState, queue, or gate artifacts
- NOT make cross-topic synthesis judgments（that is Phase Agent work）
- Follow the relay slot directory structure (`_subagents/wave_02/slot_MM/`)

Gap-fill dispatch SHALL NOT go through queue delegates — findings are identified sequentially during synthesis and cannot be pre-enumerated at filling time.

#### Scenario: Phase Agent identifies gap and spawns sub-agent

- **WHEN** during synthesis, Phase Agent finds that a cross-topic claim lacks independent verification
- **THEN** Phase Agent SHALL spawn a `dpt-topic-scout` sub-agent with a bounded task description targeting that specific gap
- **AND** sub-agent SHALL search and return structured evidence
- **AND** Phase Agent SHALL incorporate verified findings into synthesis.md

#### Scenario: No gaps found — synthesis converges in one round

- **WHEN** Phase Agent drafts synthesis.md and identifies no evidence gaps
- **THEN** Phase Agent SHALL complete synthesis without spawning any gap-fill sub-agents
- **AND** synthesis.md SHALL be the final version

#### Scenario: Gap-fill sub-agent returns no useful evidence

- **WHEN** gap-fill sub-agent searches but finds no verifiable evidence for the gap
- **THEN** sub-agent SHALL record the search attempt and honest failure
- **AND** Phase Agent SHALL note the unresolved gap in synthesis.md under "Unresolved Cross-Topic Questions"

### Requirement: Iterative finding triage + targeted search loop with convergence criteria

The synthesis process SHALL iterate through: inventory Wave1 artifacts → build scan matrix → classify findings into ledger/index → make exploration/exploitation decision per finding → run JS feedback check → spawn sub-agent only for exploit_search/explore_search decisions → ingest receipt → run JS feedback check → project synthesis narrative → run JS feedback check → backfill seed topics.

The loop SHALL classify each finding into one of three types:
- `wave1_legacy_question`: unresolved/partially-resolved question from Wave1 question-list
- `cross_topic_resolution`: a legacy question answered by other topics' existing evidence
- `cross_topic_emergent_question`: a new question first visible only after cross-topic alignment

Each finding SHALL receive one of six decisions before any search action:
- `use_existing_evidence` (resolution only, no search)
- `exploit_search` (targeted supplementary search for legacy questions)
- `explore_search` (limited exploration for emergent questions)
- `defer_hitl2` (needs human prioritization/tradeoffs)
- `requires_internal_data` (needs proprietary/non-public data)
- `record_only` (low impact or exceeds Wave2 budget)

Convergence criteria (any one triggers stop):
1. No new findings identified in current round
2. Maximum iterations reached (`max_gapfill_iterations`, default 2)
3. All remaining unresolved findings are `requires_internal_data` / `defer_hitl2` / `record_only` type (not searchable via public web search)

Phase frontmatter SHALL declare `max_gapfill_iterations` (default 2) and `max_gapfill_subagents_per_round` (default 3).

#### Scenario: Loop converges after finding no new findings

- **WHEN** round 1 synthesis classifies 3 findings, spawns sub-agents for 2, re-synthesizes
- **AND** round 2 synthesis identifies 0 new findings
- **THEN** the finding triage loop SHALL terminate
- **AND** synthesis.md SHALL be written as final projection

#### Scenario: Loop reaches max iterations and force-converges

- **WHEN** round 1 and round 2 both identify new findings and `max_gapfill_iterations` is 2
- **THEN** the loop SHALL terminate after round 2
- **AND** remaining unresolved findings SHALL be documented in ledger's HITL2 Handoff section
- **AND** this SHALL NOT block synthesis completion or gate pass

#### Scenario: All remaining findings are non-searchable type

- **WHEN** remaining findings all have decision `requires_internal_data`, `defer_hitl2`, or `record_only`
- **THEN** the loop SHALL terminate
- **AND** `requires_internal_data` findings SHALL be documented with `[需内部数据]` label in ledger and handoff

#### Scenario: Cross-topic emergent findings are processed with distinct labels

- **WHEN** synthesis identifies a finding that was NOT present in any wave1 question-list（cross-topic pattern, contradiction, or uncovered dimension first visible only after pulling together multiple topic evidence）
- **THEN** the finding SHALL be classified as `cross_topic_emergent_question` in ledger/index
- **AND** the finding SHALL receive an exploration decision（`explore_search`, `defer_hitl2`, `requires_internal_data`, or `record_only`）
- **AND** the loop's `max_gapfill_iterations` SHALL apply uniformly to all finding types
- **AND** emergent findings that survive to loop termination SHALL be documented with `[涌现]` label, distinct from wave1-legacy `[开放]` questions

#### Scenario: Resolution finding does not trigger search

- **WHEN** a Wave1 legacy question from topic A is answered by existing evidence in topic B's evidence-summary
- **THEN** the finding SHALL be classified as `cross_topic_resolution`
- **AND** decision SHALL be `use_existing_evidence`
- **AND** `search_required` SHALL be false
- **AND** no sub-agent SHALL be spawned for this finding

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

`phase-wave2-subagent.md` SHALL define the behavior contract for gap-fill sub-agents (`dpt-topic-scout` role).

The sub-agent instructions SHALL specify:
- **Receives**: Bounded gap description + search keywords + target output schema from Phase Agent
- **Produces**: Structured JSON with found_evidence, source_urls, fills_gap (boolean), confidence (low/medium/high)
- **Writes**: Intermediate products to `_cache/wave2/slot_MM/`, runtime receipt to slot directory
- **Must NOT**: Write to WorkflowState, modify queue, pass/fail gate, make cross-topic claims (works on ONE gap)
- **Must**: Use tool degradation chain (WebFetch → curl → node → python3), record honest failures, never fabricate

#### Scenario: Sub-agent receives bounded gap-fill task

- **WHEN** Phase Agent spawns a gap-fill sub-agent
- **THEN** sub-agent SHALL receive only the gap description, search keywords, and output schema
- **AND** sub-agent SHALL NOT receive WorkflowState, queue content, or other topic results

#### Scenario: Sub-agent exhausts fetch chain before reporting failure

- **WHEN** WebFetch is blocked or unavailable
- **THEN** sub-agent SHALL try curl, then node fetch, then python3 before reporting a source as inaccessible
- **AND** sub-agent SHALL record each tier attempt in runtime-receipt

### Requirement: Three-artifact Wave2 output with JS feedback integration

Wave2 SHALL produce a three-artifact group as defined in WTS-004（synthesis.md narrative projection, cross-topic-ledger.md dynamic ledger, finding-index.yaml JS-readable index）. JS engine SHALL provide layered feedback at semantic boundaries on this artifact group.

The artifact contents and structure are specified in WTS-004（three artifacts and their roles）、WTS-008（finding fields, enum values）、and WTS-009（scan matrix）. This requirement defines the JS feedback integration on top of those artifacts.

JS feedback SHALL operate at three levels:
- **L0** (local parse/shape): After Phase Agent writes stable YAML/ledger chunks — catch malformed YAML, missing fixed sections, broken links
- **L1** (lifecycle consistency): After semantic boundaries — catch decision/receipt/handoff/projection consistency (see WTS-008 consistency rules)
- **L2** (phase gate): Once, after all artifacts complete and queue is drained — decide whether Wave2 can advance to HITL2

JS feedback SHALL return `{ check, inspect, advice }` format. JS SHALL NOT judge semantic quality of findings, synthesis insight, or research direction merit.

#### Scenario: Three artifacts pass L0 check after initial creation

- **WHEN** Phase Agent writes initial ledger and index
- **THEN** JS L0 check SHALL verify: all three files exist and are non-empty, ledger has 6 fixed sections, index parses as valid YAML, index findings have all required fields
- **AND** if L0 fails, Phase Agent SHALL repair immediately and rerun

#### Scenario: L1 check catches decision/receipt inconsistency

- **WHEN** a finding has `decision=explore_search` but `subagent_receipt_refs` is empty after search was supposed to complete
- **THEN** L1 check SHALL return `check: failed` with `inspect` pointing to the specific finding id
- **AND** `advice` SHALL suggest attaching receipt or changing decision to `defer_hitl2`/`record_only`

#### Scenario: L1 check catches orphan finding

- **WHEN** a finding has `appears_in_synthesis=false` AND `hitl2_handoff=false`
- **THEN** L1 check SHALL flag it as orphan finding
- **AND** `advice` SHALL suggest projecting to synthesis, adding to HITL2 Handoff, or marking `decision=record_only`

#### Scenario: Phase Agent escalates after 2 failed L1 repair attempts

- **WHEN** the same finding fails L1 check 3 times (2 repair attempts exhausted)
- **THEN** Phase Agent SHALL escalate: change finding decision to `defer_hitl2` or `record_only` with reason recorded in ledger
- **AND** this SHALL NOT block synthesis completion

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

The `cross-topic-ledger.md` SHALL contain a Cross-Topic Scan Matrix section that records which topic pairs/groups were examined for cross-topic relationships.

For `topic_count <= 5`, the scan SHALL default to checking all topic pairs. The scan matrix SHALL record each checked pair even when no finding emerged.

Each scan row SHALL include:
- `pair_id`: Stable identifier (e.g., P01, P02)
- `topics`: Which topics were compared
- `checked_dimensions`: Which dimensions were examined（`shared_pattern`, `contradiction`, `resolution_opportunity`, `emergent_question`）
- `finding_ids`: Resulting finding ids, or "none" if no material relation found
- `notes`: Brief context on what was found or why nothing emerged

The `finding-index.yaml` top-level `scan` object SHALL record `topic_count`, `pair_count_expected`, and `pair_count_checked` to enable JS feedback on scan coverage.

JS SHALL check that a scan accounting exists but SHALL NOT force every pair when `topic_count > 5` or profile explicitly scopes cross-topic synthesis.

#### Scenario: All pairs checked for small topic count

- **WHEN** topic_count is 3 and all 3 pairs are checked
- **THEN** scan matrix SHALL have 3 rows
- **AND** `pair_count_checked` SHALL equal `pair_count_expected`
- **AND** pairs with no findings SHALL still have rows with `finding_ids: "none"`

#### Scenario: Scan matrix exists even when no findings emerged

- **WHEN** all topic pairs were checked but no cross-topic findings emerged
- **THEN** scan matrix SHALL still exist with rows documenting the checks
- **AND** `finding_ids` column SHALL contain "none"
- **AND** `pair_count_checked` SHALL demonstrate that scan was performed

#### Scenario: Large topic count uses clustering, not full pairwise

- **WHEN** topic_count is 8 (exceeds 5)
- **THEN** scan SHALL cluster by shared dimension first, then scan most relevant pairs/groups per cluster
- **AND** JS SHALL NOT require `pair_count_checked == pair_count_expected`
- **AND** JS SHALL still require scan accounting to exist
