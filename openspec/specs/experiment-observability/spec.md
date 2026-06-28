# Experiment Observability
> req: EXO-001, EXO-002, EXO-003, EXO-004, EXO-005, EXO-006

## Purpose

Provide a post-run observability layer for experiment playbooks: structured health reports, gate diagnostic capture, non-verdict trace events, Heavy provenance inspection, and runner report protocol. The layer reads bundle runtime facts without re-running gates, does not change playbook verdict semantics, and distinguishes verdict from health.

## Requirements

### Requirement: Stable post-run health report

The experiment observability layer SHALL provide a post-run bundle health report with a stable machine-readable JSON contract and a concise human-readable summary. The report SHALL include `schema_version`, `bundle_path`, `profile`, `status`, `trace`, `gate_attempts`, `bundle_schema`, `timeline`, `legacy_trace`, `ledger`, `receipts`, `cache_trails`, `dedup`, and `issues`. Each section SHALL include a `required` flag and a `status` using `clean`, `issues`, `not_applicable`, or `observed_optional`; top-level `status` SHALL be `issues` only when a required section reports `issues`. Top-level `issues` SHALL summarize only required-section issues that affect top-level `status`. Optional sections MAY report `issues` when an optional artifact is present but invalid, but those optional issues SHALL NOT flip top-level `status` and SHALL remain visible in section-level `issues` and the diagnostic summary. The JSON contract SHALL be validated by a Zod schema implemented in experiment shared infrastructure.

#### Scenario: Health report is generated for a bundle

- **WHEN** `node experiments_env/shared/verify-bundle-health.mjs <bundlePath> --profile standard` is executed
- **THEN** the command SHALL print a human-readable summary
- **AND** it SHALL be able to emit JSON matching the health report schema
- **AND** `status` SHALL be `clean` when all required checks for the selected profile pass
- **AND** `status` SHALL be `issues` when one or more required checks finds a problem

#### Scenario: Health report does not invent required runtime facts

- **WHEN** an artifact required by the selected profile, such as `rb_trace.jsonl` for all profiles or `rb_output_declarations.jsonl` for heavy profile, is absent
- **THEN** the report SHALL record the absence in the corresponding section and in `issues`
- **AND** it SHALL NOT synthesize replacement trace events, declarations, receipts, or cache files

#### Scenario: Optional Heavy sections do not fail Light health

- **WHEN** the health verifier runs with `--profile light`
- **AND** Heavy-only artifacts such as `rb_output_declarations.jsonl` are absent
- **THEN** Heavy-only sections SHALL be marked `required: false`
- **AND** absent Heavy-only sections SHALL use `status: "not_applicable"`
- **AND** the top-level health status SHALL NOT become `issues` because of those absent optional sections

#### Scenario: Optional artifact issues remain visible without changing top-level status

- **WHEN** the health verifier runs with `--profile light`
- **AND** an optional Heavy-only artifact is present but invalid
- **THEN** the corresponding optional section MAY use `status: "issues"` and include section-level issue details
- **AND** those optional issue details SHALL be available to the human-readable summary or diagnostics
- **AND** those optional issue details SHALL NOT be added to top-level `issues`
- **AND** the top-level health status SHALL NOT become `issues` solely because an optional section has issues

### Requirement: Profile-driven health checks

The health verifier SHALL use explicit profile definitions for `light`, `standard`, and `heavy`. `light` SHALL require trace parsing, legacy trace absence, and bundle schema validation. `standard` SHALL require all `light` checks plus gate diagnostics and trace/log timeline consistency. `heavy` SHALL require all `standard` checks plus ledger, runtime receipt, output file, cache trail, and dedup evidence checks. The `standard` profile names the current RUN_EXPS execution tier / observability profile and SHALL NOT by itself redefine the accepted playbook frontmatter weight contract.

#### Scenario: Light profile skips Heavy-only checks

- **WHEN** the health verifier runs with `--profile light`
- **THEN** it SHALL NOT require `rb_output_declarations.jsonl`, runtime receipts, cache trail leaves, or content dedup evidence
- **AND** it SHALL still report whether those optional sections were observed if they are present

#### Scenario: Heavy profile requires provenance checks

- **WHEN** the health verifier runs with `--profile heavy`
- **THEN** it SHALL require ledger-driven provenance checks for declarations, receipts, output files, cache trails, and dedup evidence
- **AND** missing or incomplete Heavy provenance SHALL appear in `issues`

### Requirement: Gate monitor wrapper preserves outcome and diagnostics

The experiment observability layer SHALL provide a gate monitor wrapper that runs a gate command, captures stdout/stderr, preserves the wrapped command's exit code, stores the raw gate JSON output under the bundle, and extracts `inspect[]` and `advice[]` diagnostics when present.

#### Scenario: Wrapper preserves failing gate exit code

- **WHEN** `run-gate-with-monitor.mjs --bundle <bundlePath> --gate wave0-complete -- <gate command>` wraps a gate command that exits non-zero
- **THEN** the wrapper process SHALL exit with the same non-zero code
- **AND** it SHALL still preserve parseable gate diagnostics from stdout when available

#### Scenario: Wrapper preserves passing gate exit code

- **WHEN** the wrapped gate command exits with code `0`
- **THEN** the wrapper process SHALL exit with code `0`
- **AND** it SHALL store the raw gate output and extracted diagnostics for health reporting

#### Scenario: Wrapper stores raw output in a stable bundle path

- **WHEN** the gate monitor wrapper captures a gate invocation
- **THEN** it SHALL write a bundle-local artifact under `_observability/gates/`
- **AND** the artifact filename SHALL use a stable monotonic sequence prefix such as `0001-<gate>.json`, `0002-<gate>.json`
- **AND** the artifact SHALL include `sequence`, gate name, wrapped command, exit code, stdout, stderr, parsed gate JSON when parseable, extracted diagnostics, and capture timestamp
- **AND** the health verifier SHALL discover gate artifacts via `_observability/gates/*.json`, sort by `sequence` and filename, and read these artifacts rather than re-running the gate command

#### Scenario: Wrapper survives repeated gate invocation

- **WHEN** the same gate is wrapped more than once during a single playbook execution, for example on a repair retry
- **THEN** each invocation SHALL produce a separate artifact with its own monotonic sequence number, such as `0001-wave0-complete.json` and `0002-wave0-complete.json`
- **AND** the health verifier SHALL discover both artifacts, sorted by sequence
- **AND** the most recent invocation's outcome SHALL NOT overwrite or hide the earlier invocation's artifact

### Requirement: Diagnostic trace events are non-verdict events

Observability diagnostics written to `rb_trace.jsonl` SHALL use the canonical trace writer/contract and a non-verdict event shape, such as `event: "diagnostic"` with `source: "experiment-observability"`. Diagnostic events SHALL NOT be written as playbook verdict `check` events and SHALL NOT be counted by existing verdict logic as PASS/FAIL checks.

#### Scenario: Gate diagnostics enter trace without changing verdict

- **WHEN** the gate monitor wrapper extracts `inspect[]` or `advice[]` from a gate result
- **THEN** it SHALL append a diagnostic trace event containing the gate name and diagnostic details
- **AND** the event SHALL NOT use `event: "check"`
- **AND** a verdict step that counts `check` events SHALL produce the same verdict with or without the diagnostic event

#### Scenario: Health diagnostics identify their source

- **WHEN** the health verifier appends a diagnostic event
- **THEN** the event SHALL include `source: "experiment-observability"`
- **AND** it SHALL include enough detail for the runner report to summarize the issue without re-running the gate command

### Requirement: Heavy provenance inspection is ledger-driven

Heavy provenance checks SHALL start from `rb_output_declarations.jsonl` as the authority for Agent outputs. The health verifier SHALL validate declaration schema, `slot_result_ref`, declared `output_files`, declared `cache_trails`, runtime receipt completeness, and evidence that relevant gates consumed the ledger. It SHALL NOT treat directory scanning alone as proof of Agent output provenance, and it SHALL NOT re-run gates to create missing evidence.

#### Scenario: Declaration points to complete Heavy artifacts

- **WHEN** a Heavy bundle contains a valid output declaration with declared output files, cache trails, slot result reference, runtime receipt, and ledger-consuming gate evidence
- **THEN** the Heavy health report SHALL mark `ledger`, `receipts`, `cache_trails`, and `dedup` as clean

#### Scenario: Files exist but ledger is empty

- **WHEN** a Heavy bundle contains files under `_subagents/`, `reference/`, or `_cache/` but `rb_output_declarations.jsonl` is missing or empty
- **THEN** the Heavy health report SHALL mark ledger-driven provenance as an issue
- **AND** it SHALL NOT mark Heavy provenance clean based only on scanned files

#### Scenario: Heavy gate-consumption evidence is read-only

- **WHEN** Heavy health checks need to determine whether a gate consumed ledger-derived provenance
- **THEN** the health verifier SHALL inspect existing wrapper raw gate artifacts, existing `gate_attempt` trace events, or existing diagnostic events
- **AND** it SHALL NOT execute a gate command during health verification

### Requirement: Runner report includes health separately from verdict

The playbook runner protocol SHALL record post-run health separately from playbook verdict. For each executed case, the runner report SHALL include `verdict`, `health`, optional `not_run_reason`, and `bundle_preserved`. Health SHALL be collected after verdict and before cleanup. Cleanup policy SHALL preserve bundles when verdict or health has issues unless the playbook explicitly documents a safe cleanup exception.

#### Scenario: Passing verdict with health issues is visible

- **WHEN** a playbook verdict is PASS but the post-run health report has `status: "issues"`
- **THEN** the runner report SHALL show verdict PASS and health ISSUES as separate fields
- **AND** the report SHALL include a concise summary of the health issues

#### Scenario: Cleanup preserves evidence for failure analysis

- **WHEN** verdict is FAIL or health is ISSUES
- **THEN** runner protocol SHALL preserve the disposable bundle by default
- **AND** the report SHALL set `bundle_preserved` to true with the bundle path

#### Scenario: Runner source drift is handled explicitly

- **WHEN** implementation updates the runner health protocol
- **THEN** it SHALL first identify the active runner instruction surface such as `experiments_playbook/RUN_EXPS.md`
- **AND** it SHALL update the active surface before or together with any `RUN.md` synchronization
- **AND** it SHALL NOT leave two runner instruction files with conflicting health or cleanup policy
