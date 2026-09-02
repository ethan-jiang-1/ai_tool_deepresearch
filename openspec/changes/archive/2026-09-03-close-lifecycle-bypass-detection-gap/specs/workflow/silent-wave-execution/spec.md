> req: SWE-007

## ADDED Requirements

### Requirement: Fatigue-path synthesis and completion claims SHALL consume lifecycle-integrity facts

At the fatigue threshold, before changing strategy, and before synthesizing any final-report content during a non-terminal `stop: no` phase, Agent-facing guidance SHALL direct the Agent to obtain and consume the current lifecycle-integrity verdict from the latest checkpoint output or the audit command. A verdict reporting `premature_final_present`, `plan_progress_tamper_suspected`, `status_drift`, `manual_bypass_suspected`, `missing_witness`, or `failed_gate_downstream_status` SHALL route the Agent back to the named repair and never to synthesis. Reporting research completion to the user SHALL cite terminal lifecycle facts: terminal status plus an integrity `passed` verdict. A completion claim without that backing remains prohibited surfacing under the silent execution contract, whose contrary lifecycle facts are deterministically visible through the audit. The Engine SHALL NOT inspect conversation state to enforce the citation; Agent-facing guidance carries the duty, and static guidance validation SHALL check its presence. Legally reached terminal Final delivery remains governed by the existing delivery contract and is unaffected.

#### Scenario: Fatigue path consults integrity before synthesis

- **WHEN** a `stop: no` wave gate has failed at the fatigue threshold
- **THEN** guidance SHALL direct the Agent to consume the latest integrity verdict before any strategy change or content synthesis
- **AND** a verdict carrying a lifecycle drift outcome SHALL route to the named repair, not to final synthesis

#### Scenario: Completion claim requires terminal backing

- **WHEN** the Agent is about to report research completion to the user
- **THEN** guidance SHALL require citing terminal status plus an integrity `passed` verdict
- **AND** absent that backing the report SHALL NOT be made and the silent execution contract applies

#### Scenario: Static validation rejects unbacked completion guidance

- **WHEN** static validation scans silent-execution and delivery guidance
- **THEN** it SHALL find the integrity-consumption duty and the terminal-fact citation requirement
- **AND** it SHALL NOT find guidance that permits completion claims without terminal lifecycle facts

#### Scenario: Legal Final delivery is unaffected

- **WHEN** the lifecycle legally reached terminal Final with terminal status and an integrity `passed` verdict
- **THEN** existing delivery, publication, and feedback behavior SHALL remain unchanged
