> req: RRD-008

## ADDED Requirements

### Requirement: Reentry diagnostics SHALL summarize incident-shaped recovery truth

`check-reentry` SHALL compose existing status, queue, artifact, ledger, checkpoint, and file-observability audits into an additive structured recovery summary. The summary SHALL identify canonical topic footprint root findings and supporting finding count. Each independent root finding SHALL state whether its nearest deterministic sanctioned path status is `reachable`, `missing_contract`, or `not_applicable` and SHALL carry at most one structured recommended action.

The recovery summary SHALL be validated by an Engine-owned Zod schema. Per-root cross-field validation SHALL require a concrete structured action only when that root's path status is `reachable`, SHALL forbid a fabricated action when status is `missing_contract`, and SHALL require every blocking canonical primary finding to appear in the root summary while supporting details do not create a second primary action. The Engine SHALL NOT select one global repair strategy across independent roots. Results produced after bundle loading and target normalization SHALL use output `schema_version: "1.1.0"` and include `recovery`. Exit-code `2` invocation/configuration failures that cannot form a recovery context MAY omit `recovery`. Existing `check`, `normalized_target`, `blockers`, `warnings`, `drift`, `findings`, `inspect`, `advice`, and exit-code behavior SHALL otherwise remain compatible.

Blocking canonical primary findings SHALL participate in the existing reentry verdict: they SHALL make `check.passed` false and produce exit code `1`. Warning/info canonical findings SHALL remain non-blocking. The projection SHALL reuse the same canonical finding result rather than reimplementing the audit condition in the CLI.

Reentry diagnostics SHALL derive these facts from active bundle files and existing deterministic transition/handoff helpers. They SHALL NOT rely on chat memory and SHALL NOT mutate runtime authority.

#### Scenario: Incident-shaped bundle produces one canonical recovery root

- **WHEN** a bundle contains one registry-external durable topic that also causes dangling reference and missing canonical wave surfaces
- **THEN** `check-reentry` SHALL preserve the detailed findings
- **AND** its recovery summary SHALL identify the unregistered durable topic as a root finding
- **AND** dependent symptoms SHALL not produce competing primary actions
- **AND** `check.passed` SHALL be false with exit code `1`

#### Scenario: Missing sanctioned path is explicit

- **WHEN** the current handoff/status window cannot legally reach the suggested predecessor gate or phase
- **THEN** the affected root finding SHALL report `sanctioned_path_status: missing_contract`
- **AND** that root SHALL NOT emit the unreachable command as its recommended action

#### Scenario: Existing reentry output remains compatible

- **WHEN** an existing clean reentry case runs after this change
- **THEN** existing output fields and exit codes SHALL preserve their accepted semantics
- **AND** output SHALL use `schema_version: "1.1.0"`
- **AND** the additive recovery summary SHALL validate successfully

#### Scenario: Invocation error may omit recovery context

- **WHEN** `check-reentry` cannot load a bundle or normalize the requested target and returns exit code `2`
- **THEN** it MAY omit the `recovery` field
- **AND** it SHALL preserve structured invocation inspect/advice

#### Scenario: Recovery summary is read-only

- **WHEN** `check-reentry` produces the recovery summary
- **THEN** a recursive before/after snapshot SHALL show no mutation to status, queue, trace, ledger, checkpoints, artifacts, references, final output, or cache
