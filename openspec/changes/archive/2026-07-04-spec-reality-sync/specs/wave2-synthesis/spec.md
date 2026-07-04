# Wave2 Synthesis (delta)

> req: WTS-002, WTS-003, WTS-006

## MODIFIED Requirements

### Requirement: Gap-fill sub-agent dispatch for targeted evidence search

During synthesis, after the Phase Agent has classified a finding and assigned decision `exploit_search` or `explore_search`, the Phase Agent SHALL stage the sub-agent slot via `drive-relay-slot stage`, spawn from the emitted prompt, and collect via `drive-relay-slot commit`. The Phase Agent SHALL NOT spawn sub-agents for findings with decision `use_existing_evidence`, `defer_hitl2`, `requires_internal_data`, or `record_only`. The Phase Agent SHALL NOT "directly spawn" without driver staging, and SHALL NOT hand-orchestrate `ingestAgentReceipt` / `commitSlotResult`.

The gap-fill sub-agent SHALL:
- Receive a bounded task description with the specific finding to search for
- Use WebSearch + WebFetch to find targeted evidence
- Return structured JSON result (found_evidence, source_urls, fills_gap, confidence)
- Write intermediate products to `_cache/wave2/{backing|depth|emergent}-r{N}/{finding_id}/sNN_{source-slug}/` (non-authority cache per `shared-subagent-protocol.md` §2)
- Write `runtime-receipt.jsonl` to its relay slot directory
- NOT write to WorkflowState, queue, or gate artifacts
- NOT make cross-topic synthesis judgments（that is Phase Agent work）

Gap-fill dispatch SHALL NOT go through queue delegates — findings are identified sequentially during synthesis and cannot be pre-enumerated at filling time.

#### Scenario: Phase Agent identifies gap and spawns sub-agent via driver

- **WHEN** during synthesis, Phase Agent finds that a cross-topic claim lacks independent verification
- **THEN** Phase Agent SHALL invoke `drive-relay-slot stage` before spawn
- **AND** SHALL spawn a `dpt-topic-scout` sub-agent with a bounded task description targeting that specific gap
- **AND** SHALL invoke `drive-relay-slot commit` on return
- **AND** Phase Agent SHALL incorporate verified findings into synthesis.md

#### Scenario: No gaps found — synthesis completes without gap-fill spawn

- **WHEN** Phase Agent drafts synthesis.md and identifies no evidence gaps requiring search
- **THEN** Phase Agent SHALL complete synthesis without spawning any gap-fill sub-agents

#### Scenario: Gap-fill sub-agent returns no useful evidence

- **WHEN** gap-fill sub-agent searches but finds no verifiable evidence for the gap
- **THEN** sub-agent SHALL record the search attempt and honest failure
- **AND** Phase Agent SHALL note the unresolved gap in synthesis.md under "Unresolved Cross-Topic Questions"

### Requirement: Iterative finding triage + targeted search loop with convergence criteria

The wave2 synthesis task (`producer_rule: cross_topic_synthesis`) SHALL execute as a **single-pass** Phase Agent task per `phase-wave2.md` §3.2: inventory Wave1 artifacts → build scan matrix → classify findings into ledger/index → make exploration/exploitation decision per finding → run JS feedback check → spawn sub-agent only for `exploit_search`/`explore_search` via `drive-relay-slot` → ingest receipt → run JS feedback check → project synthesis narrative → run JS feedback check → complete the queue task. The synthesis task SHALL NOT embed a multi-round internal convergence loop.

Quality and convergence gaps identified during gate inspection or §3.3 Quality Self-Check SHALL be addressed via §3.3.2 Quality Re-Fill Loop — supplementary task cards enqueued and executed through the normal queue + relay protocol. Iteration limits and quality thresholds (`max_supplementary_rounds`, backing/cross-topic/emergent quality params, etc.) SHALL be read from `rb_profile.yaml#/research_style_params`, not from phase node frontmatter.

The pass SHALL classify each finding into one of three types:
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

After the single pass completes, unresolved searchable findings MAY be addressed by supplementary re-fill tasks; backfill seed-topic tasks SHALL execute only after the synthesis queue task completes.

#### Scenario: Synthesis completes in one queue task pass

- **WHEN** Phase Agent claims the `cross_topic_synthesis` task
- **THEN** Phase Agent SHALL produce the three-artifact group in one execution pass
- **AND** SHALL NOT re-enter an internal multi-round gap-fill loop inside the same task card action

#### Scenario: Gate fail or quality gap triggers supplementary re-fill

- **WHEN** wave2 gate fails on quality/convergence rules after synthesis, or §3.3 Quality Self-Check marks gaps
- **THEN** Phase Agent SHALL enqueue supplementary task cards per §3.3.2
- **AND** supplementary search tasks SHALL use `drive-relay-slot stage/commit` for relay-backed gap-fill

#### Scenario: All remaining findings are non-searchable type

- **WHEN** after the single pass, remaining findings all have decision `requires_internal_data`, `defer_hitl2`, or `record_only`
- **THEN** the synthesis task MAY complete
- **AND** `requires_internal_data` findings SHALL be documented with `[需内部数据]` label in ledger and handoff

#### Scenario: Cross-topic emergent findings are processed with distinct labels

- **WHEN** synthesis identifies a finding that was NOT present in any wave1 question-list（cross-topic pattern, contradiction, or uncovered dimension first visible only after pulling together multiple topic evidence）
- **THEN** the finding SHALL be classified as `cross_topic_emergent_question` in ledger/index
- **AND** the finding SHALL receive an exploration decision（`explore_search`, `defer_hitl2`, `requires_internal_data`, or `record_only`）
- **AND** emergent findings that remain unresolved SHALL be documented with `[涌现]` label, distinct from wave1-legacy `[开放]` questions

#### Scenario: Resolution finding does not trigger search

- **WHEN** a Wave1 legacy question from topic A is answered by existing evidence in topic B's evidence-summary
- **THEN** the finding SHALL be classified as `cross_topic_resolution`
- **AND** decision SHALL be `use_existing_evidence`
- **AND** `search_required` SHALL be false
- **AND** no sub-agent SHALL be spawned for this finding

### Requirement: Wave2 sub-agent behavior specification

`phase-wave2-subagent.md` SHALL define the behavior contract for gap-fill sub-agents (`dpt-topic-scout` role).

The sub-agent instructions SHALL specify:
- **Receives**: Bounded gap description + search keywords + target output schema from Phase Agent (via relay slot `task.md`)
- **Produces**: Structured JSON with found_evidence, source_urls, fills_gap (boolean), confidence (low/medium/high)
- **Writes**: Intermediate products to `_cache/wave2/{backing|depth|emergent}-r{N}/{finding_id}/sNN_{source-slug}/`, runtime receipt to relay slot directory
- **Must NOT**: Write to WorkflowState, modify queue, pass/fail gate, make cross-topic claims (works on ONE gap)
- **Must**: Use tool degradation chain (WebFetch → curl → node → python3), record honest failures, never fabricate

#### Scenario: Sub-agent receives bounded gap-fill task

- **WHEN** Phase Agent spawns a gap-fill sub-agent via `drive-relay-slot`
- **THEN** sub-agent SHALL receive only the gap description, search keywords, and output schema
- **AND** sub-agent SHALL NOT receive WorkflowState, queue content, or other topic results

#### Scenario: Sub-agent exhausts fetch chain before reporting failure

- **WHEN** WebFetch is blocked or unavailable
- **THEN** sub-agent SHALL try curl, then node fetch, then python3 before reporting a source as inaccessible
- **AND** sub-agent SHALL record each tier attempt in runtime-receipt
