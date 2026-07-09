> req: RWE-012

## MODIFIED Requirements

### Requirement: Wave fault-tolerance playbook SHALL cover work-unit timeout and submit boundaries

The controlled wave fault-tolerance coverage SHALL distinguish normal submit from explicit audited late-submit:

- normal submit after timeout still rejects;
- explicit late-submit may accept an eligible targeted timed-out work unit;
- submitted replacement blocks late-submit;
- queued or claimed retry state can be cleaned up by accepted late-submit;
- failed and abandoned attempts still reject late-submit.

The playbook MAY use fixture-backed result, receipt, output, or cache surfaces to exercise Engine-layer behavior, but verdicts SHALL come from CLI JSON, bundle authority files, gate output, and trace/check entries.

#### Scenario: explicit late-submit is covered

- **WHEN** a controlled case has a targeted timed-out work unit with valid targeted result surfaces
- **THEN** the playbook SHALL verify explicit `operate-work-unit late-submit` success
- **AND** SHALL verify gate coverage comes from the audited submitted ledger row

#### Scenario: replacement submitted still rejects

- **WHEN** a replacement for the same `queue_item_id` already submitted
- **THEN** explicit late-submit for the targeted work unit SHALL reject
- **AND** the playbook SHALL verify no double ledger coverage exists
