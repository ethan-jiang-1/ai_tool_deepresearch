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

### Requirement: Reports SHALL include work-unit lifecycle projection

Experiment observability reports SHALL project work-unit lifecycle state, including claimed, submitted, failed, timed_out, abandoned, expired in-flight attempts, retries, and late-submit rejections.

#### Scenario: report shows expired attempt

- **WHEN** an experiment bundle contains an expired claimed work unit
- **THEN** the health report SHALL show the expired attempt
- **AND** the report SHALL not mark the phase as drained

### Requirement: Profile-driven health checks consume explicit case health policy

The health verifier SHALL continue to expose explicit `light`, `standard`, and `heavy` profiles. `light` SHALL require trace parsing, legacy trace absence, and bundle schema validation. `standard` SHALL require all light checks plus gate diagnostics and trace/log timeline consistency. `heavy` SHALL require all standard checks plus ledger, runtime receipt, output file, cache trail, and dedup evidence checks.

For Agent Experiment Autorun, each selected playbook SHALL declare one explicit frontmatter `health_profile: light|standard|heavy`, independent of filename execution cost. Each native completion SHALL declare which created bundles are required health targets, and every declared target SHALL use that selected case health profile. Auxiliary bundles MAY be declared without becoming health targets. The Autorun Supervisor SHALL run health only from those validated declarations. Health scope/profile SHALL NOT be derived from a stale `RUN_EXPS` table, retired frontmatter `weight`, filename cost, or a scan-selected bundle.

#### Scenario: Light profile skips Heavy-only checks

- **WHEN** the health verifier runs a completion-declared target with `health_profile: light`
- **THEN** it does not require Heavy ledger, receipt, cache-trail, or dedup checks
- **AND** it still reports applicable observed diagnostics without changing native outcome

#### Scenario: Heavy profile requires provenance checks

- **WHEN** the health verifier runs a completion-declared target with `health_profile: heavy`
- **THEN** it requires ledger-driven declarations, receipts, output files, cache trails, and dedup evidence
- **AND** incomplete provenance is reported as health ISSUES or ERROR without rewriting native outcome

#### Scenario: Heavy Agent cost does not overstate bundle health scope

- **WHEN** a Heavy real-Agent playbook stops at an early lifecycle boundary whose explicit `health_profile` is light
- **THEN** native completion uses light health for its required target
- **AND** filename cost remains Heavy without being misused as an observability profile

#### Scenario: Missing explicit health policy blocks launch

- **WHEN** the selected case lacks a valid frontmatter `health_profile` or its completion declares a different target profile
- **THEN** case launch fails before health evaluation
- **AND** the Supervisor does not guess scope from filename cost, filesystem order, or a retired weight field

### Requirement: Autorun Supervisor report keeps native outcome separate from health

Agent Experiment Autorun reports SHALL present the Headless Playbook Agent process outcome, native playbook outcome `PASS|FAIL|NOT_RUN|null`, lifecycle outcome `HUMAN|ERROR|CANCELLED|null`, effective outcome, health `CLEAN|ISSUES|ERROR|null`, duration, reason, run-root preservation/cleanup, and durable prompt/transcript/trace/Subject-evidence references as separate fields. The durable per-case record SHALL retain full native completion and full validated health JSON outside a deletable case root. Every cleanup-eligible PASS SHALL additionally retain each declared bundle's exact verdict-boundary trace-prefix bytes by role, or an explicit null for a declared missing auxiliary; cleanup-eligible Agent-behavior PASS SHALL also retain exact exported Subject evidence bytes by required role. The health verifier SHALL NOT rerun gates, manufacture native completion, or change playbook outcome.

The Autorun Supervisor MAY aggregate these facts, but its report is a projection. It SHALL NOT reinterpret arbitrary trace checks or health status as native PASS/FAIL. PASS plus health ISSUES SHALL remain distinguishable and preserved.

#### Scenario: unresolved in-flight appears in health

- **WHEN** a completion-declared bundle retains an unresolved claimed work unit
- **THEN** the health report exposes that lifecycle blocker independently of native completion
- **AND** the Supervisor preserves the run root rather than treating health as a replacement verdict

#### Scenario: Health issues do not rewrite native PASS

- **WHEN** native playbook completion is PASS and health is ISSUES
- **THEN** the report shows outcome PASS and health ISSUES separately
- **AND** the run root is preserved

#### Scenario: Missing completion is not a health verdict

- **WHEN** a Headless Playbook Agent exits without native completion
- **THEN** the Supervisor reports ERROR even if health can inspect a partial bundle
- **AND** health output does not become a replacement verdict

#### Scenario: Cleanup does not erase the observable result

- **WHEN** an effective PASS with CLEAN health is removed under explicit cleanup policy
- **THEN** the outside-root audit/report retains the full completion, full health result, process/outcome and cleanup fact
- **AND** the exact prompt, sanitized structured Agent transcript/stderr and exact role-bound verdict trace prefixes remain referenced by byte length and sha256

