## ADDED Requirements

> req: CDP-005

### Requirement: Final artifacts SHALL count as delivery evidence only after legal readiness-to-final handoff and final node entry

Final report files under `final/` SHALL count as terminal delivery evidence only when the lifecycle has legally reached `phase-final.md`: readiness has passed with `check.next` targeting `phases/phase-final.md`, `enter-phase` has written a route-bound `load_complete` for Final, and status synchronization reflects the readiness source gate after that load witness.

Files under `final/` created from wave0, wave1, wave2, setup, seed-topics, HITL2, readiness before pass, rerun, or any other non-Final context SHALL be diagnostic evidence only. They SHALL NOT prove delivery, SHALL NOT authorize user-facing final report presentation, and SHALL NOT replace readiness or prior gate checks.

#### Scenario: Legal final delivery uses readiness handoff evidence

- **WHEN** readiness gate passes with `check.next: "phases/phase-final.md"`
- **AND** `enter-phase` writes a route-bound `load_complete` for `phases/phase-final.md`
- **AND** status synchronization records the readiness source gate window
- **AND** the Agent writes `final/report.md` while executing Final
- **THEN** the final report file MAY count as terminal delivery evidence

#### Scenario: Premature final report is phase-boundary violation

- **WHEN** the active authorized phase is wave0, wave1, wave2, or another non-Final phase
- **AND** a file appears under `final/`
- **THEN** inspection, readiness, or phase status audit SHALL report premature terminal output or phase-boundary violation
- **AND** the file SHALL NOT count as terminal delivery evidence

#### Scenario: Final file existence does not bypass readiness

- **WHEN** `final/report.md` exists
- **AND** trace lacks a passed readiness gate and route-bound Final `load_complete`
- **THEN** readiness/final audit SHALL treat the file as non-authoritative
- **AND** it SHALL direct the Agent back to the latest legal phase or repair path
