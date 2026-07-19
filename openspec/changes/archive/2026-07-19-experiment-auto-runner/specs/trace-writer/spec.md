# trace-writer

> req: TRW-005

## RENAMED Requirements

- FROM: `### Requirement: Trace path unification SHALL update specs and playbook infrastructure`
- TO: `### Requirement: Trace path unification SHALL update current Agent Autorun surfaces`

## MODIFIED Requirements

### Requirement: Trace path unification SHALL update current Agent Autorun surfaces

Trace unification SHALL update implementation files, accepted specs, playbook schema/tests, `PLAYBOOK_MANIFEST.md`, `RUN_AGENT_AUTORUN_EXPS.md`, `RUN_INTERACTIVE_EXPS.md`, experiment README, workflow shared docs, bundle log templates, and playbook utility docs so they describe only bundle-root `rb_trace.jsonl` as the trace surface.

Command experiment verdict-affecting events SHALL be written to `rb_trace.jsonl` by the playbook thin driver or accepted helper as strict `event: check`, `source: playbook` rows with stable gate ID and explicit boolean passed/expected. Gate CLI stdout SHALL remain the machine-readable gate result, and Engine/gate attempts SHALL also be recorded in the same root trace without automatically becoming verdict rows. The deterministic Agent Experiment finalizer SHALL bind every declared bundle's verdict-boundary raw trace through byte length and `sha256`, and SHALL additionally bind parse status/event count. Verdict and required-health bundles SHALL be valid JSONL; a non-health fault-injection auxiliary MAY intentionally be invalid or missing. Completion JSON SHALL NOT become a second trace sink. A later accepted health diagnostic append SHALL not retroactively invalidate the recorded prefix or alter native outcome.

Updated trace readers and summaries SHALL count only accepted verdict check events for their owned calculation. The Autorun Supervisor SHALL validate native completion and SHALL NOT reinterpret the existence of arbitrary trace checks as completed-case PASS.

#### Scenario: Active knowledge surfaces name one trace

- **WHEN** current manifest, Agent Autorun/Interactive instructions, schema/tests, README, or playbook utilities describe experiment evidence
- **THEN** they point to bundle-root `rb_trace.jsonl`
- **AND** they do not name `RUN_EXPS.md` or a legacy experiment-specific trace as current authority

#### Scenario: Native completion binds rather than replaces trace

- **WHEN** a playbook writes native completion
- **THEN** completion includes the validated root-trace byte length/digest, parse/event summary and native verdict summary
- **AND** runtime verdict facts remain auditable from the declared bundle trace

#### Scenario: Accepted specs no longer require separate experiment verdict trace

- **WHEN** accepted specs describe command-experiment verdict evidence
- **THEN** they point to bundle-root `rb_trace.jsonl`
- **AND** they do not require another trace JSONL

#### Scenario: Playbook tests validate unified trace path

- **WHEN** playbook schema or tests validate trace-path references
- **THEN** they expect `rb_trace.jsonl`
- **AND** they reject another trace JSONL in current playbooks
