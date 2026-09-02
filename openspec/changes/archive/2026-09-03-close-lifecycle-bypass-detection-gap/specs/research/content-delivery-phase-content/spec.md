> req: CDP-009

## ADDED Requirements

### Requirement: Premature canonical Final presence SHALL be surfaced and blocked until relocated

A primary-looking canonical Final file without legal Final entry SHALL keep its existing non-authoritative classification and SHALL additionally be reported by the phase status audit as `premature_final_present`, fail wave gates through the wave-gate premature-presence root, and appear in the route-bound entry integrity summary. The only legal remediation is Agent relocation out of canonical primary-series naming; the Engine SHALL NOT delete, move, or rewrite the file. Relocation SHALL clear the presence fact on the next evaluation; the relocated file SHALL remain a non-authoritative artifact and SHALL never retroactively become delivery evidence. The presence fact SHALL never evaluate report content, quality, or completeness, and SHALL NOT create a new lifecycle state or delivery authority.

#### Scenario: Audit names the premature file

- **WHEN** the audit evaluates a bundle whose `final/final.md` is not covered by any accepted Final admission/lineage evidence chain (current-lineage entry admission, prior-lineage admitted delivery, accepted post-final stage, or legacy compatibility)
- **THEN** the audit SHALL report outcome `premature_final_present` naming the file
- **AND** diagnostics SHALL distinguish it from accepted post-final recovery stages

#### Scenario: Completion claims cannot cite the premature file

- **WHEN** a premature file exists and the lifecycle has not legally reached terminal delivery
- **THEN** the file SHALL NOT satisfy any completion, delivery, or readiness claim
- **AND** surfaced integrity outcomes SHALL remain visible until relocation

#### Scenario: Relocation is the only Engine-recognized remediation

- **WHEN** the Agent relocates the file out of canonical primary-series naming
- **THEN** the presence fact SHALL clear on the next evaluation
- **AND** the Engine SHALL NOT have deleted, moved, or rewritten the file at any point
- **AND** the relocated file SHALL remain non-authoritative
