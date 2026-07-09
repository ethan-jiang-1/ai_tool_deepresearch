> req: RWE-012

## MODIFIED Requirements

### Requirement: Wave fault-tolerance playbook

The fault-tolerance playbook SHALL include invalid submit, terminal fail, timeout, abandon, duplicate submit, stale manifest/index mismatch, normal submit rejection after terminal timeout, and explicit audited late-submit behavior.

Normal submit after timeout SHALL still fail. Explicit `operate-work-unit late-submit` MAY pass only for an eligible `timed_out` original attempt whose result/receipt/output/cache/source/nonce surfaces validate and whose replacement has not already submitted. Late-submit SHALL reject if the replacement already submitted, and failed/abandoned attempts SHALL remain fail-closed.

#### Scenario: normal submit after timeout still fails

- **WHEN** a timed-out work unit submits through normal `operate-work-unit submit`
- **THEN** the playbook SHALL verify late-submit rejection
- **AND** no ledger row or queue completion SHALL occur

#### Scenario: explicit late-submit may accept eligible timed-out work

- **WHEN** a timed-out work unit has complete original output surfaces
- **AND** no replacement work unit has submitted
- **THEN** the playbook SHALL invoke `operate-work-unit late-submit`
- **AND** verify audited ledger, queue completion, and gate coverage from bundle authority files

## ADDED Requirements

### Requirement: Wave experiments SHALL cover audited late accept for timed-out work units

Controlled wave E2E coverage SHALL prove the audited late-accept recovery path for timed-out work units. The coverage SHALL use approved disposable-bundle infrastructure and production `operate-work-unit` CLI/API boundaries after fixture setup. Any fixture-backed result, receipt, output, or cache surfaces SHALL be labeled as fixture facts or Engine-layer evidence, not as real search/fetch quality proof.

The coverage SHALL include at least these cases:

- normal `submit` against `timed_out` still rejects;
- eligible `timed_out` original attempt late-submits successfully and writes an audited ledger row;
- queued retry demand for the same queue item is removed by late-submit;
- claimed retry attempt for the same queue item is superseded by late-submit;
- replacement already submitted causes late-submit rejection and no second ledger;
- failed/abandoned attempts reject late-submit;
- gates count the audited late-accepted row and reject filesystem-only late output.

Verdicts SHALL come from trace, CLI JSON output, gate output, and bundle authority files rather than console-only summaries. Critical runtime assertions SHALL be recorded as trace `check` events or equivalent accepted verdict entries so a runner can audit pass/fail from the disposable bundle. PASS cleanup and FAIL preserve-for-diagnosis behavior SHALL follow the command-experiments guideline.

#### Scenario: late-submit success is trace-backed

- **WHEN** a controlled wave case late-submits an eligible timed-out original attempt
- **THEN** the case SHALL verify `late_accept: true`, `terminal_status_before_accept: "timed_out"`, `late_accept_reason`, and durable queue postconditions from bundle files
- **AND** final verdict SHALL be trace-backed rather than console-only

#### Scenario: replacement submitted rejection prevents double success

- **WHEN** a controlled wave case has both a timed-out original attempt and an already submitted replacement for the same queue item
- **THEN** `late-submit` SHALL reject
- **AND** the case SHALL verify there is no second submitted ledger row for that queue item

#### Scenario: claimed retry supersede is auditable

- **WHEN** a controlled wave case late-submits the original timed-out attempt while a retry attempt is claimed but not submitted
- **THEN** the retry work ID SHALL become terminal and non-covering
- **AND** the audited late-accepted ledger row SHALL list the superseded retry work ID

#### Scenario: failed and abandoned late-submit cases reject

- **WHEN** a controlled wave case attempts `late-submit` for `failed` or `abandoned` work units
- **THEN** the command SHALL reject without ledger append or queue completion
- **AND** the playbook SHALL record fail-closed evidence
