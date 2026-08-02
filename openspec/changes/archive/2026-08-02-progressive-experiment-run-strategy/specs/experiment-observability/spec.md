> req: EXO-007

## ADDED Requirements

### Requirement: Retained reports bind selection observations to an execution surface

Every newly written Autorun per-case audit event and retained batch report SHALL include a versioned execution-surface identity and the selection observation that caused the case to be selected. The identity SHALL bind the current selected source playbook, injected instruction, manifest entry, and the named framework/host helper bytes that participate in preparation, launch, completion validation, health, audit, and report production. The selection observation SHALL identify exact selector or run profile, prediction basis, and selection reason without inventing a result.

The report contract SHALL version this addition and the strategy reader SHALL remain able to read retained earlier report versions. Earlier reports without the new identity SHALL remain valid historical cost/outcome/health observations but SHALL produce `unknown` current execution-surface relation. A differing comparable identity SHALL produce `stale`; equal comparable identity may produce `matching` only as a report-comparison fact. Neither relation SHALL be interpreted as native completion, health verdict, proof of current Agent behavior, or permission to delete a preserved root.

Outcome, lifecycle, Agent process, health, cleanup, duration, and cost SHALL remain orthogonal report facts. In particular, selection metadata and execution-surface comparison SHALL NOT turn PASS plus ISSUES into FAIL, turn FAIL into diagnostic-only success, or suppress a report's native/lifecycle result.

#### Scenario: A new report supports later freshness comparison

- **WHEN** the Supervisor writes a completed or failed case result after this capability applies
- **THEN** its durable retained observation SHALL include the versioned execution-surface identity and selection observation
- **AND** a later strategy projection can compare those bytes against the current registered case
- **AND** the report retains its native outcome and health as separate fields

#### Scenario: Historical report is useful but freshness is unknown

- **WHEN** a strategy reader encounters a valid retained batch report produced before execution-surface identity existed
- **THEN** it MAY use valid duration/cost/outcome/health facts as historical observations
- **AND** it SHALL report current execution-surface relation as `unknown`
- **AND** it SHALL not manufacture a fingerprint from a filename, directory, or aggregate summary

#### Scenario: Helper change does not rewrite an old result

- **WHEN** a current framework/host helper fingerprint differs from a retained comparable observation
- **THEN** the strategy projection SHALL mark the observation `stale`
- **AND** the retained native outcome and health SHALL remain unchanged and auditable
