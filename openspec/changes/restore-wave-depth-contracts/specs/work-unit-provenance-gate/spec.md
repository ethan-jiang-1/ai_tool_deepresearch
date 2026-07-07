## MODIFIED Requirements

> req: WPG-003

### Requirement: Gate SHALL verify work-unit output coverage

Work-unit provenance gates SHALL verify output coverage from submitted work-unit ledger rows for the target wave, kind, scope, and required output contract. The check name SHALL be `work_unit_output_coverage`.

For Wave1 topic deepening, required delegated output coverage SHALL include `evidence-summary.md`, `question-list.md`, topic reference files, verified cache trails, and any depth-review projection that is derived from or bound to the submitted work-unit outputs. A depth-review projection MAY be written by the Phase Agent after submit, but it SHALL name the submitted work-unit rows and source/cache refs it reviewed; filesystem-only Wave1 outputs SHALL NOT become coverage authority.

For Wave2 targeted evidence, output coverage remains conditional on delegated search or evidence work. Pure synthesis artifacts do not require delegated rows, but any promoted `reference/00-cross-*.md` or finding-index receipt refs that claim delegated evidence SHALL bind to submitted `wave2_targeted_evidence` rows.

#### Scenario: missing submitted output coverage fails

- **WHEN** a wave expects a delegated reference output
- **AND** no submitted work-unit ledger row declares that output
- **THEN** `work_unit_output_coverage` SHALL fail even if the file exists on disk

#### Scenario: Wave1 depth review cannot cover filesystem-only outputs

- **WHEN** `depth-review.yaml` records source URLs from a topic reference file
- **AND** no submitted Wave1 work-unit ledger row covers that reference file or its cache trail
- **THEN** work-unit output coverage SHALL fail
- **AND** diagnostics SHALL direct repair through work-unit submit or supplementary work-unit demand

#### Scenario: Wave2 targeted finding requires submitted evidence row

- **WHEN** `finding-index.yaml` lists a submitted targeted evidence receipt ref for finding `W2F-001`
- **AND** the referenced `reference/00-cross-*.md` file has no submitted `wave2_targeted_evidence` ledger row
- **THEN** work-unit output coverage SHALL fail for that targeted evidence claim
