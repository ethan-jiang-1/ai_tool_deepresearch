> req: RRD-008

## ADDED Requirements

### Requirement: Reentry diagnostics SHALL summarize incident-shaped recovery truth

`check-reentry` SHALL compose existing status, queue, artifact, ledger, checkpoint, and file-observability audits into an additive structured recovery summary. The summary SHALL identify canonical topic footprint root findings, masked dependent finding count, and whether the nearest deterministic sanctioned path is reachable, missing, or not applicable.

The recovery summary SHALL be validated by an Engine-owned Zod schema. Cross-field validation SHALL require a concrete structured action only when path status is `reachable`, SHALL forbid a fabricated action when status is `missing_contract`, and SHALL require each root finding reference to resolve to an emitted finding. Existing `check`, `normalized_target`, `blockers`, `warnings`, `drift`, `findings`, `inspect`, `advice`, and exit-code behavior SHALL remain compatible.

Reentry diagnostics SHALL derive these facts from active bundle files and existing deterministic transition/handoff helpers. They SHALL NOT rely on chat memory and SHALL NOT mutate runtime authority.

#### Scenario: Incident-shaped bundle produces one root recovery action

- **WHEN** a bundle contains one registry-external durable topic that also causes dangling reference and missing canonical wave surfaces
- **THEN** `check-reentry` SHALL preserve the detailed findings
- **AND** its recovery summary SHALL identify the unregistered durable topic as a root finding
- **AND** dependent symptoms SHALL not produce competing primary actions

#### Scenario: Missing sanctioned path is explicit

- **WHEN** the current handoff/status window cannot legally reach the suggested predecessor gate or phase
- **THEN** the recovery summary SHALL report `sanctioned_path_status: missing_contract`
- **AND** it SHALL NOT emit that unreachable command as the recommended action

#### Scenario: Existing reentry output remains compatible

- **WHEN** an existing clean reentry case runs after this change
- **THEN** existing output fields and exit codes SHALL preserve their accepted semantics
- **AND** the additive recovery summary SHALL validate successfully

#### Scenario: Recovery summary is read-only

- **WHEN** `check-reentry` produces the recovery summary
- **THEN** a recursive before/after snapshot SHALL show no mutation to status, queue, trace, ledger, checkpoints, artifacts, references, final output, or cache
