> req: RWG-023

## ADDED Requirements

### Requirement: Wave gates SHALL fail closed on premature canonical Final presence

Each wave completion gate (wave0, wave1, wave2) SHALL evaluate a fail-closed rule `premature_final_present`. The rule SHALL fail when a file matching canonical primary-series names under `final/` exists and that file is not covered by any accepted Final admission/lineage evidence chain: no legal Final-entry admission for the current lineage, no admitted delivery evidence of a prior legal lineage, no accepted post-final recovery/entry stage, and no explicit legacy compatibility for pre-contract legal Final loads. Accepted `post_final_*` recovery/entry intermediate stages SHALL be classified through the accepted post-final contract, and the rule SHALL NOT fail for them.

When the rule fails, the gate verdict SHALL be a blocking failure and primary advice SHALL state exactly one legal remediation: relocate the premature file out of canonical primary-series naming into a non-authoritative diagnostic location. The gate SHALL NOT delete, move, or rewrite the file; relocation is Agent work. The premature file SHALL remain non-delivery evidence before and after relocation, and the rule SHALL make no judgment about its content. The failure SHALL NOT recommend surfacing to the user, phase bypass, or status edits; the existing silent-execution repair loop remains the only route.

#### Scenario: Premature final written during a wave blocks the next gate attempt

- **WHEN** a primary-looking `final/final.md` exists without legal Final entry
- **AND** the Agent reruns the current wave gate as directed by the repair cue
- **THEN** the gate SHALL fail with the `premature_final_present` root
- **AND** advice SHALL name the file and the single legal relocation remediation
- **AND** the failure SHALL NOT advise phase bypass, status edits, or user surfacing

#### Scenario: Legal post-final rerun intermediate state does not fail the rule

- **WHEN** an accepted post-final recovery event is pending its route-bound load or status sync
- **AND** canonical Final files from the prior legal lineage exist
- **THEN** the rule SHALL pass when no other rule fails
- **AND** the accepted `post_final_*` stage classification SHALL remain the only lifecycle verdict for that state

#### Scenario: Relocation clears the root

- **WHEN** the Agent relocates the premature file to a non-canonical diagnostic name
- **AND** the gate is rerun
- **THEN** `premature_final_present` SHALL no longer fail
- **AND** the relocated file SHALL remain non-authoritative and outside delivery evidence

#### Scenario: Gate evaluation never mutates the premature file

- **WHEN** the rule fails on a premature file
- **THEN** the file bytes and name SHALL be unchanged by the gate evaluation

#### Scenario: Prior-lineage Final files during an active rerun do not fail the rule

- **WHEN** an accepted post-final rerun chain is in progress and the status window is a normal rerun phase window
- **AND** canonical Final files exist that are covered by the prior lineage's admitted delivery evidence
- **THEN** the rule SHALL NOT fail for those files
- **AND** the new lineage remains subject to its own admission at the later Final entry

#### Scenario: Pre-contract legal Final load is honored

- **WHEN** a bundle's Final load predates the Final admission contract
- **AND** explicit legacy compatibility applies
- **THEN** the rule SHALL NOT fail for those canonical files
