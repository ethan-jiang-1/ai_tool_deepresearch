# Work Unit Provenance Gate

> req: WPG-001, WPG-002, WPG-003, WPG-004, WPG-005, WPG-006, WPG-007, WPG-008, WPG-009, WPG-010, WPG-011, WPG-012, WPG-013

## Purpose

Define the work-unit provenance gate contract. Gates verify delegated output coverage from Engine-written submitted work-unit ledger rows and cross-check index, manifest, result, runtime receipt, beacon, lifecycle, output, cache, and diagnostic signals.
## Requirements
### Requirement: Gate SHALL verify submitted work-unit ledger rows

Work-unit provenance gates SHALL read Engine-written rows in bundle-root `rb_output_declarations.jsonl` as the delegated coverage authority. The check name SHALL be `work_unit_ledger_exists`. A row SHALL count only when its work-unit fields are schema-valid, its `ledger_record_hash` verifies, and it binds to a submitted work-unit attempt.

Current main spec Purpose and guidance SHALL describe this capability as the work-unit provenance gate contract. It SHALL NOT describe the capability as an artifact of archiving the retired relay/slot replacement change.

#### Scenario: hand-written ledger row is rejected

- **WHEN** a ledger row contains work-unit-looking fields but lacks a valid submit fingerprint or matching submitted index entry
- **THEN** `work_unit_ledger_exists` SHALL fail
- **AND** the row SHALL NOT count as coverage

#### Scenario: purpose text is durable

- **WHEN** active main specs are synced after this change
- **THEN** `work-unit-provenance-gate` Purpose SHALL describe submitted work-unit provenance gate behavior
- **AND** it SHALL NOT mention archived relay replacement history as the capability purpose

### Requirement: Gate SHALL verify work-unit submission presence

Work-unit provenance gates SHALL verify that each counted delegated ledger row binds to a `submitted` work unit whose `_work_units/_index.json` entry, manifest, result, runtime receipt, beacon, receipt nonce, output files, cache trails, and hashes agree.

#### Scenario: stale manifest binding fails

- **WHEN** a ledger row references a `work_id` whose manifest claims a different `queue_item_id`
- **THEN** `work_unit_submission_presence` SHALL fail
- **AND** the gate SHALL report the mismatched surfaces

### Requirement: Gate SHALL verify work-unit output coverage

Work-unit provenance gates SHALL verify delegated output coverage from submitted work-unit ledger rows for the target wave, kind, scope, and required delegated output contract. The check name SHALL be `work_unit_output_coverage`.

For Wave1 topic deepening, required delegated output coverage SHALL include submitted `evidence-summary.md`, submitted `question-list.md`, structured source-claim surfaces, accepted source URL surfaces for accepted sources, explicit degraded-capture records when used, and verified cache trails for fetched sources. Empty or absent source claims are legal only when the submitted work unit records an explicit no-source/limitation state that the phase can repair or surface as a limitation. Topic reference Markdown files and `depth-review.yaml` are Phase-owned projections written after submit. Gates MAY validate those projections as consistency and consumer-navigation surfaces, but work-unit provenance checks SHALL use them only to cross-check that every reviewed/reference source URL binds back to submitted work-unit ledger rows, source claims, accepted source URL surfaces, explicit degraded-capture records, or verified cache trails.

A depth-review or topic reference projection MAY be written by the Phase Agent after submit, but it SHALL name or be traceable to the submitted work-unit rows and source/cache refs it used. Filesystem-only Wave1 outputs SHALL NOT become coverage authority, and Phase-owned projections SHALL NOT create delegated coverage absent submitted backing.

For Wave2 targeted evidence, output coverage remains conditional on delegated search or evidence work. Pure synthesis artifacts and existing-backed `reference/00-cross-*.md` projections do not require delegated Wave2 rows when they cite concrete already submitted Wave0/Wave1 source/cache/degraded-capture/work-unit backing. Any `reference/00-cross-*.md`, finding-index receipt ref, or artifact claim that represents new delegated evidence search SHALL bind to submitted `wave2_targeted_evidence` rows.

#### Scenario: missing submitted delegated output coverage fails

- **WHEN** a wave expects delegated evidence-summary, question-list, source-claim, cache, or targeted-evidence output coverage
- **AND** no submitted work-unit ledger row declares or backs that delegated output
- **THEN** `work_unit_output_coverage` SHALL fail even if similar files exist on disk

#### Scenario: Wave1 Phase-owned reference cannot create delegated coverage

- **WHEN** a Wave1 topic reference records a source URL
- **AND** no submitted Wave1 work-unit ledger row, source claim, accepted source URL surface, verified cache trail, or explicit degraded-capture record backs that URL
- **THEN** work-unit output coverage or projection consistency SHALL fail
- **AND** diagnostics SHALL direct repair through work-unit submit or supplementary `wave1_topic_deepening`

#### Scenario: Wave1 Phase-owned reference with submitted backing is not delegated bypass

- **WHEN** `reference/{topic_slug}-<source-slug>.md` exists
- **AND** its source URL binds to submitted Wave1 source claims, accepted source URL surfaces, verified cache trails, or explicit degraded-capture records
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

### Requirement: Gate SHALL reject non-work-unit delegated authority surfaces

Work-unit provenance gates SHALL reject delegated artifacts, result references, hand-written declarations, and filesystem-only outputs that are not covered by submitted work-unit ledger rows. These surfaces MAY appear in diagnostics as bypass or cleanup evidence, but they SHALL NOT become alternate coverage authority.

Current forensics experiments, docs, and tests SHALL use work-unit signals for current proof. Old relay/slot forensics matrices SHALL be migrated to work-unit ledger/index/manifest/result/receipt/beacon/lifecycle signals or removed from current surfaces.

#### Scenario: non-work-unit delegated path cannot pass gate

- **WHEN** a delegated result file exists but no submitted work-unit ledger row covers the output
- **THEN** the gate SHALL fail delegated provenance
- **AND** the path SHALL be reported as non-authoritative

#### Scenario: old forensics matrix is not current proof

- **WHEN** a current playbook proves provenance forensics
- **THEN** it SHALL use submitted work-unit provenance signals
- **AND** it SHALL NOT present retired delegated artifacts or retired commit events as the production proof matrix

### Requirement: Wave2 work-unit provenance SHALL be conditional on delegated evidence search

Wave2 work-unit provenance SHALL be conditional on delegated search or evidence work. Pure cross-topic synthesis remains main-agent work and SHALL NOT require a work-unit row. Existing-backed `reference/00-cross-*.md` files materialized during pure synthesis SHALL be treated as Phase-owned projections when they cite concrete already submitted Wave0/Wave1 source/cache/degraded-capture/work-unit backing and Wave2 finding refs. Wave2 targeted evidence search SHALL require submitted work-unit coverage.

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

### Requirement: Work-unit provenance checks SHALL be standard gate definition checks

Work-unit provenance check types SHALL be standard `check` values in gate definition JSON files using the same rule structure as existing check types. Supported delegated provenance checks are `work_unit_ledger_exists`, `work_unit_output_coverage`, `work_unit_submission_presence`, and `delegated_bypass_suspected`.

Gate CLI rule evaluation SHALL dispatch to work-unit provenance checks through the same `rule.check` switch as structural checks. Provenance checks SHALL NOT require a separate CLI or a separate gate pass.

#### Scenario: work-unit provenance rule in gate definition

- **WHEN** a wave gate definition contains a rule with `"check": "work_unit_output_coverage"`
- **THEN** the gate CLI SHALL evaluate it in the rule evaluation loop
- **AND** the rule SHALL contribute to the overall pass/fail determination

### Requirement: Gate SHALL detect delegated bypass by phase

Work-unit provenance gates SHALL detect suspected delegated bypass by phase using the check name `delegated_bypass_suspected`. It SHALL report direct/orphan outputs, non-work-unit delegated artifacts, and hand-written declarations that lack submitted work-unit coverage.

#### Scenario: bypass diagnostic is failure evidence

- **WHEN** a phase output exists without submitted work-unit ledger coverage
- **THEN** `delegated_bypass_suspected` SHALL report the file
- **AND** the diagnostic SHALL NOT provide alternate pass authority

### Requirement: Gate diagnostics SHALL carry work-unit binding context

Work-unit provenance diagnostics SHALL carry `work_id` when available, `queue_item_id` when available, `wave`, `kind`, check name, and mismatched surface refs. Diagnostics SHALL use work-unit binding context rather than non-work-unit channel keys.

Current diagnostics SHALL NOT use retired channel keys, non-work-unit paths, or old result-reference fields as the primary identity for delegated provenance. If a retired token is named, it SHALL be framed only as rejected, non-authoritative, or removed.

Current provenance identity SHALL prefer `work_id`, `queue_item_id`, `kind`, work-unit receipt nonce, submitted ledger row, and work-unit binding surfaces.

When provenance drift is detected, the gate SHALL preserve valid submitted-row context where it can do so independently. A cache coverage failure SHALL NOT by itself make every otherwise hash-valid submitted ledger row unreadable. If a ledger row hash mismatch or manual row edit is detected, diagnostics SHALL distinguish that root cause from downstream missing-coverage symptoms.

#### Scenario: mismatch diagnostic identifies work unit

- **WHEN** a result hash mismatch is found for a submitted work unit
- **THEN** the diagnostic SHALL include `work_id`, `queue_item_id`, `wave`, and `kind`
- **AND** it SHALL identify the mismatched work-unit surfaces

#### Scenario: retired identity is not primary context

- **WHEN** a provenance diagnostic mentions a retired delegated artifact
- **THEN** the diagnostic SHALL identify it as rejected or non-authoritative
- **AND** the diagnostic SHALL use work-unit binding context for current delegated provenance whenever available

#### Scenario: retired event is not provenance authority

- **WHEN** a current provenance playbook or diagnostic mentions a retired delegated event
- **THEN** that event SHALL be framed as retired or non-authoritative
- **AND** submitted work-unit ledger and binding surfaces SHALL remain the only delegated provenance authority

#### Scenario: manual ledger drift receives root-cause repair advice

- **WHEN** a submitted ledger row fails hash verification or does not bind to `_work_units/_index.json`
- **THEN** diagnostics SHALL identify ledger/manual-edit drift as the root cause
- **AND** advice SHALL direct restoration, retry/replacement submit, or Engine-mediated ledger repair if available
- **AND** advice SHALL NOT tell the Agent to edit `rb_output_declarations.jsonl` by hand

#### Scenario: cache coverage failure does not erase valid ledger context

- **WHEN** a submitted work-unit ledger row is hash-valid but one declared cache trail leaf is missing
- **THEN** the gate SHALL report cache coverage as its own failure
- **AND** it SHALL preserve the ledger row's work-unit identity in diagnostics
- **AND** it SHALL NOT report all submitted rows as absent solely because a cache file is missing

### Requirement: Gate SHALL emit work-unit nonce mismatch diagnostics

Work-unit provenance gates SHALL compare the work-unit `receipt_nonce` across submitted ledger row, manifest, result, runtime receipt, beacon, and lifecycle events when those surfaces are available. A missing nonce, malformed nonce, or nonce disagreement SHALL emit a `provenance_nonce_mismatch` diagnostic. The diagnostic is advisory unless paired with a failing authoritative work-unit provenance check.

#### Scenario: malformed nonce is flagged

- **WHEN** a work-unit binding surface carries a receipt nonce that is malformed or not equal to the manifest nonce
- **THEN** the gate SHALL emit `provenance_nonce_mismatch`
- **AND** the diagnostic SHALL identify the mismatched work-unit surfaces

### Requirement: Gate SHALL emit work-unit lifecycle evidence diagnostics

Work-unit provenance gates SHALL check, for each evidence-producing submitted work unit, whether lifecycle events exist with matching `work_id` and `receipt_nonce` when lifecycle logging is expected. Missing lifecycle evidence SHALL emit `lifecycle_events_missing` as an advisory diagnostic and SHALL NOT replace authoritative ledger and submit checks.

Lifecycle evidence guidance SHALL bind to work-unit receipt nonce and submitted work-unit identity. It SHALL NOT require retired relay staging, relay commit events, or slot paths as current lifecycle proof.

#### Scenario: missing lifecycle evidence is advisory

- **WHEN** a submitted evidence-producing work unit has no matching lifecycle event
- **THEN** the gate SHALL emit `lifecycle_events_missing`
- **AND** pass/fail authority SHALL still come from submitted ledger coverage and required cross-checks

#### Scenario: lifecycle proof uses work-unit identity

- **WHEN** current diagnostics or playbooks explain lifecycle provenance
- **THEN** they SHALL bind lifecycle evidence to `work_id` and `receipt_nonce`
- **AND** they SHALL NOT require retired relay commit or slot path evidence as current proof

### Requirement: Framework SHALL ship a work-unit provenance-forensics guide

The framework SHALL ship a durable provenance-forensics judgment guide that a coding agent can read post-run to decide whether delegated evidence provenance is real or bypassed. The guide SHALL describe work-unit signals across submitted ledger rows, `_work_units/_index.json`, manifest, result, runtime receipt, beacon, lifecycle events, submit fingerprints, output files, cache trails, and gate diagnostics.

The guide SHALL explain forge-resistance as a spectrum: single files can be hand-shaped, while Engine-written submit transactions plus cross-surface hash/nonce consistency and trace/log timing are stronger evidence. The guide SHALL include a decision matrix mapping work-unit signal patterns to conclusions and remediation. Signing remains out of scope.

Current forensics guidance SHALL NOT present retired relay/slot tiers as the current decision matrix. Old relay/slot playbooks that no longer diagnose current work-unit provenance SHALL be removed from current experiment surfaces.

#### Scenario: coding agent decides from landed evidence using the guide

- **WHEN** a coding agent inspects a completed run bundle
- **THEN** it SHALL be able to open the shipped provenance-forensics judgment guide
- **AND** follow work-unit ledger/index/manifest/result/receipt/beacon/lifecycle signals to reach a documented conclusion

#### Scenario: retired matrix is not shipped as current guidance

- **WHEN** current forensics guidance names provenance decision tiers
- **THEN** those tiers SHALL be expressed in submitted work-unit signal terms
- **AND** retired relay/slot tiers SHALL NOT appear as current proof instructions

### Requirement: Provenance gates SHALL distinguish Phase-owned reference projections from delegated fetched evidence

Provenance gates SHALL classify reference artifacts by their authority claim before deciding whether work-unit output coverage is required. A reference that claims newly fetched delegated evidence SHALL require submitted work-unit coverage. A reference that projects existing submitted evidence for consumer navigation SHALL require deterministic backing to already submitted or accepted surfaces, but SHALL NOT be treated as delegated bypass merely because the reference file itself was written by the Phase Agent.

This distinction SHALL be derived from deterministic bundle surfaces such as reference metadata, `_INDEX.md`, `finding-index.yaml`, `cross-topic-ledger.md`, submitted source claims, accepted source URL surfaces, degraded-capture records, cache trails, output declarations, and work-unit refs. It SHALL NOT depend on chat memory or console summaries. `source_layer`, path shape, or file presence MAY help locate a candidate classification, but none of them SHALL be sufficient authority without submitted/prior accepted backing.

If a reference cannot be deterministically classified as either backed Phase-owned projection or ledger-backed fetched-source evidence, provenance gates SHALL fail closed or emit blocking diagnostics rather than passing the reference as accepted evidence.

#### Scenario: Phase-owned projection is backed by submitted source claims

- **WHEN** a Phase-owned reference points to a source URL present in submitted source claims, accepted source URL surfaces, verified cache trails, or explicit degraded-capture records
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

### Requirement: Wave1 output coverage SHALL bind required paths to canonical roles

Wave1 work-unit provenance coverage SHALL treat required delegated output path-to-role binding as part of the coverage contract. A submitted ledger row SHALL satisfy Wave1 required output coverage only when:

- `artifacts/wave1/{topic}/evidence-summary.md` is present with canonical role `evidence_summary`; and
- `artifacts/wave1/{topic}/question-list.md` is present with canonical role `question_list`.

The gate helper MAY rely on submit-time normalization to make future ledger rows canonical, but it SHALL NOT let role `other` satisfy these required outputs at gate time. Role `other` SHALL remain available for extra non-blocking outputs that are not selected by required output coverage.

#### Scenario: canonical roles satisfy required output coverage

- **WHEN** submitted Wave1 ledger rows declare `evidence-summary.md` as `evidence_summary`
- **AND** `question-list.md` as `question_list`
- **THEN** `wave1_work_unit_output_coverage` SHALL count those paths as covered when the other required coverage preconditions for that topic are satisfied

#### Scenario: other role does not satisfy required output coverage

- **WHEN** a submitted Wave1 ledger row declares `artifacts/wave1/01_topic/evidence-summary.md` only as role `other`
- **THEN** Wave1 required output coverage SHALL NOT treat that row as canonical evidence-summary coverage
- **AND** diagnostics SHALL identify the missing canonical coverage or the submit normalization that should have occurred

#### Scenario: extra other output remains non-blocking

- **WHEN** a Wave1 work unit declares an extra notes file as role `other`
- **THEN** that extra output SHALL NOT be reported as required-output drift
- **AND** it SHALL NOT satisfy evidence-summary or question-list coverage

### Requirement: Wave2 cross-reference provenance SHALL distinguish submitted targeted evidence from Phase-owned projections

Wave2 work-unit provenance checks for `reference/00-cross-*.md` SHALL distinguish two valid authority paths:

- new fetched evidence backed by submitted `wave2_targeted_evidence` work-unit rows; and
- existing-backed Phase-owned projections backed by prior accepted evidence plus deterministic Wave2 process refs.

The gate SHALL NOT collapse these paths into a single rule that requires every `00-cross` reference to have a new Wave2 submitted row. It also SHALL NOT treat filesystem presence, `source_layer: wave2_cross`, or reference index coverage as sufficient evidence authority without submitted targeted evidence or existing prior backing.

#### Scenario: new fetched cross reference requires submitted Wave2 authority

- **WHEN** a `reference/00-cross-*.md` file introduces a source URL not present in prior accepted backing
- **THEN** Wave2 provenance SHALL require submitted `wave2_targeted_evidence` coverage or receipt authority for that new evidence
- **AND** missing submitted authority SHALL be reported as blocking provenance drift

#### Scenario: existing-backed cross projection does not require a new Wave2 row

- **WHEN** a `reference/00-cross-*.md` file is backed by prior accepted evidence
- **AND** it includes auditable Wave2 process refs such as `W2F-xxx`, `finding-index.yaml`, and `cross-topic-ledger.md`
- **AND** the prior backing resolves to submitted or accepted evidence surfaces
- **THEN** Wave2 provenance MAY classify it as a Phase-owned projection
- **AND** missing new Wave2 submitted output coverage SHALL NOT fail that projection by itself
