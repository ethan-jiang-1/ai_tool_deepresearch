> req: WPG-003, WPG-005, WPG-012

## MODIFIED Requirements

### Requirement: Gate SHALL verify work-unit output coverage

Work-unit provenance gates SHALL verify delegated output coverage from submitted work-unit ledger rows for the target wave, kind, scope, and required delegated output contract. The check name SHALL be `work_unit_output_coverage`.

For Wave1 topic deepening, required delegated output coverage SHALL include submitted `evidence-summary.md`, submitted `question-list.md`, structured source-claim surfaces, accepted source URL surfaces for accepted sources, explicit degraded-capture records when used, and verified cache trails for fetched sources. Empty or absent source claims are legal only when the submitted work unit records an explicit no-source/limitation state that the phase can repair or surface as a limitation. Topic reference Markdown files and `depth-review.yaml` are Phase-owned projections written after submit. Gates MAY validate those projections as consistency and consumer-navigation surfaces, but work-unit provenance checks SHALL use them only to cross-check that every reviewed/reference source URL binds back to submitted work-unit ledger rows, source claims, explicit degraded-capture records, or verified cache trails.

A depth-review or topic reference projection MAY be written by the Phase Agent after submit, but it SHALL name or be traceable to the submitted work-unit rows and source/cache refs it used. Filesystem-only Wave1 outputs SHALL NOT become coverage authority, and Phase-owned projections SHALL NOT create delegated coverage absent submitted backing.

For Wave2 targeted evidence, output coverage remains conditional on delegated search or evidence work. Pure synthesis artifacts and existing-backed `reference/00-cross-*.md` projections do not require delegated Wave2 rows when they cite concrete already submitted Wave0/Wave1 backing. Any `reference/00-cross-*.md`, finding-index receipt ref, or artifact claim that represents new delegated evidence search SHALL bind to submitted `wave2_targeted_evidence` rows.

#### Scenario: missing submitted delegated output coverage fails

- **WHEN** a wave expects delegated evidence-summary, question-list, source-claim, cache, or targeted-evidence output coverage
- **AND** no submitted work-unit ledger row declares or backs that delegated output
- **THEN** `work_unit_output_coverage` SHALL fail even if similar files exist on disk

#### Scenario: Wave1 Phase-owned reference cannot create delegated coverage

- **WHEN** a Wave1 topic reference records a source URL
- **AND** no submitted Wave1 work-unit ledger row, source claim, verified cache trail, or explicit degraded-capture record backs that URL
- **THEN** work-unit output coverage or projection consistency SHALL fail
- **AND** diagnostics SHALL direct repair through work-unit submit or supplementary `wave1_topic_deepening`

#### Scenario: Wave1 Phase-owned reference with submitted backing is not delegated bypass

- **WHEN** `reference/{topic_slug}-<source-slug>.md` exists
- **AND** its source URL binds to submitted Wave1 source claims and cache trails
- **THEN** work-unit provenance SHALL NOT require the reference file itself to appear as a delegated output file
- **AND** the gate MAY validate the reference format and index entry as Phase-owned projection checks

#### Scenario: Wave2 targeted finding requires submitted evidence row

- **WHEN** `finding-index.yaml` lists a submitted targeted evidence receipt ref for finding `W2F-001`
- **AND** the referenced new evidence or `reference/00-cross-*.md` file has no submitted `wave2_targeted_evidence` ledger row
- **THEN** work-unit output coverage SHALL fail for that targeted evidence claim

#### Scenario: Wave2 existing-backed cross reference does not require new Wave2 row

- **WHEN** a `reference/00-cross-*.md` file cites only existing submitted Wave0/Wave1 backing and Wave2 ledger/index finding refs
- **THEN** work-unit provenance SHALL NOT require a submitted Wave2 targeted-evidence row for that reference
- **AND** the reference SHALL still be subject to format, index, and backing consistency checks

### Requirement: Wave2 work-unit provenance SHALL be conditional on delegated evidence search

Wave2 work-unit provenance SHALL be conditional on delegated search or evidence work. Pure cross-topic synthesis remains main-agent work and SHALL NOT require a work-unit row. Existing-backed `reference/00-cross-*.md` files materialized during pure synthesis SHALL be treated as Phase-owned projections when they cite concrete already submitted Wave0/Wave1 backing and Wave2 finding refs. Wave2 targeted evidence search SHALL require submitted work-unit coverage.

#### Scenario: pure synthesis does not require delegated coverage

- **WHEN** Wave2 performs synthesis using existing accepted evidence
- **THEN** the gate SHALL NOT require a delegated work-unit row for that synthesis step
- **AND** any new delegated evidence search SHALL require submitted work-unit coverage

#### Scenario: existing-backed cross reference follows pure synthesis path

- **WHEN** Wave2 writes `reference/00-cross-*.md` from already submitted prior-wave evidence
- **THEN** the gate SHALL validate reference backing consistency without requiring a Wave2 targeted-evidence row
- **AND** it SHALL fail if the reference lacks concrete prior submitted backing

#### Scenario: targeted evidence cross reference follows delegated path

- **WHEN** Wave2 writes or promotes `reference/00-cross-*.md` from new public search
- **THEN** the reference SHALL require submitted `wave2_targeted_evidence` work-unit coverage
- **AND** filesystem-only new evidence SHALL be reported as delegated bypass

## ADDED Requirements

### Requirement: Provenance gates SHALL distinguish Phase-owned reference projections from delegated fetched evidence

Provenance gates SHALL classify reference artifacts by their authority claim before deciding whether work-unit output coverage is required. A reference that claims newly fetched delegated evidence SHALL require submitted work-unit coverage. A reference that projects existing submitted evidence for consumer navigation SHALL require deterministic backing to already submitted or accepted surfaces, but SHALL NOT be treated as delegated bypass merely because the reference file itself was written by the Phase Agent.

This distinction SHALL be derived from deterministic bundle surfaces such as reference metadata, `_INDEX.md`, `finding-index.yaml`, `cross-topic-ledger.md`, submitted source claims, accepted source URL surfaces, degraded-capture records, cache trails, output declarations, and work-unit refs. It SHALL NOT depend on chat memory or console summaries. `source_layer`, path shape, or file presence MAY help locate a candidate classification, but none of them SHALL be sufficient authority without submitted/prior accepted backing.

If a reference cannot be deterministically classified as either backed Phase-owned projection or ledger-backed fetched-source evidence, provenance gates SHALL fail closed or emit blocking diagnostics rather than passing the reference as accepted evidence.

#### Scenario: Phase-owned projection is backed by submitted source claims

- **WHEN** a Phase-owned reference points to a source URL present in submitted source claims and cache trails
- **THEN** provenance diagnostics SHALL treat it as a backed projection
- **AND** it SHALL not require the reference file path itself to be listed as delegated output coverage

#### Scenario: fetched-source claim without ledger remains blocked

- **WHEN** a reference claims a new fetched source or targeted evidence output
- **AND** no submitted work-unit row backs that fetched source
- **THEN** provenance gates SHALL fail or diagnose delegated bypass
- **AND** the reference SHALL NOT count as accepted delegated evidence

#### Scenario: classification uses bundle files, not chat memory

- **WHEN** the gate decides whether a reference is Phase-owned projection or delegated fetched evidence
- **THEN** it SHALL use structured bundle files and submitted ledgers
- **AND** it SHALL ignore chat summaries, progress reports, or file presence alone as authority

#### Scenario: ambiguous reference classification fails closed

- **WHEN** a reference has a legal path and `_INDEX.md` row
- **AND** the gate cannot bind its source URL, `W2F-xxx` claim, or backing refs to submitted/prior accepted bundle evidence
- **THEN** provenance SHALL fail closed or report blocking backing drift
- **AND** the reference SHALL NOT count as accepted evidence until repaired
