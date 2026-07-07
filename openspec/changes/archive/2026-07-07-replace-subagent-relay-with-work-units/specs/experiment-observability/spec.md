> req: EXO-001, EXO-003, EXO-004, EXO-005, EXO-006

## ADDED Requirements

### Requirement: Reports SHALL include work-unit lifecycle projection

Experiment observability reports SHALL project work-unit lifecycle state, including claimed, submitted, failed, timed_out, abandoned, expired in-flight attempts, retries, and late-submit rejections.

#### Scenario: report shows expired attempt

- **WHEN** an experiment bundle contains an expired claimed work unit
- **THEN** the health report SHALL show the expired attempt
- **AND** the report SHALL not mark the phase as drained

## MODIFIED Requirements

### Requirement: Gate monitor wrapper preserves outcome and diagnostics

The gate monitor wrapper SHALL preserve work-unit provenance diagnostics, including mismatches across ledger, index, manifest, result, receipt, beacon, output files, and hashes.

#### Scenario: monitor keeps work-unit failure detail

- **WHEN** a gate fails because a work-unit receipt nonce mismatches
- **THEN** the monitor report SHALL preserve that diagnostic

### Requirement: Diagnostic trace events are non-verdict events

Work-unit diagnostics such as `work_unit_claimed`, `work_unit_submit_rejected`, `work_unit_failed`, `work_unit_timed_out`, `work_unit_abandoned`, `work_unit_retry_claimed`, `work_unit_late_submit_rejected`, and `work_unit_inspect_failed` SHALL be diagnostic events. Experiment verdicts SHALL still be explicit playbook verdicts or gate outcomes.

#### Scenario: diagnostic event does not imply pass

- **WHEN** a `work_unit_claimed` event exists
- **THEN** the experiment SHALL NOT treat it as evidence of delegated completion

### Requirement: Heavy provenance inspection is ledger-driven

Heavy provenance inspection SHALL be driven by work-unit submission ledger rows and their cross-checks. It SHALL NOT inspect non-work-unit delegated directories as coverage authority.

#### Scenario: heavy inspection starts from ledger

- **WHEN** heavy provenance inspection audits a wave
- **THEN** it SHALL start from `rb_output_declarations.jsonl` work-unit rows
- **AND** use `_work_units/_index.json` and files only as cross-check surfaces

### Requirement: Runner report includes health separately from verdict

Runner reports SHALL show work-unit health separately from final verdict, including unresolved in-flight attempts and mixed-provenance blockers.

#### Scenario: unresolved in-flight appears in health

- **WHEN** a playbook stops with one unresolved claimed work unit
- **THEN** the runner report SHALL show health as blocked even if no gate was run
