> req: GSK-010

## ADDED Requirements

### Requirement: Lifecycle gates and final readiness SHALL reject status-only or artifact-only downstream authorization

Lifecycle gate preflight, readiness checks, and final-entry validation SHALL require trace-bound lifecycle evidence rather than accepting filesystem artifacts, `rb_status.json` drift, `current_node`, or chat memory as phase completion or handoff authority. For covered non-bootstrap phases, the current gate's preflight SHALL prove that the legal predecessor source gate passed cleanly or degraded legally, that the Phase Agent consumed that exact `check.next` through a route-bound `load_complete`, and that the status window matches the accepted predecessor route.

If that evidence is missing, stale, superseded, failed, or unbound, the gate SHALL fail with root-cause diagnostics. It SHALL NOT pass because downstream artifacts exist, because a later phase directory contains files, because status names a later gate, or because final output has been drafted.

#### Scenario: Wave2 gate rejects artifact-only entry

- **WHEN** `check-gate-wave2-complete.mjs` is called for `phases/phase-wave2.md`
- **AND** Wave2 artifacts exist in the bundle
- **AND** trace lacks a legal Wave1 source-gate pass plus later route-bound `load_complete(entry="phases/phase-wave2.md")`
- **THEN** the Wave2 gate SHALL fail preflight
- **AND** inspect/advice SHALL name the missing Wave1-to-Wave2 handoff evidence before artifact-level symptoms

#### Scenario: HITL2 and readiness reject skipped Wave2 handoff

- **WHEN** HITL2 or readiness checks are invoked after status was manually edited past Wave2
- **AND** trace lacks the required Wave2 source-gate pass and route-bound entry sequence
- **THEN** the gate SHALL fail closed
- **AND** it SHALL NOT treat `rb_status.json`, `current_node`, or HITL/final files as proof that Wave2 completed

#### Scenario: final output files do not authorize final delivery

- **WHEN** files exist under `final/` or a final draft exists
- **AND** readiness has not produced a legal readiness-to-final handoff consumed through route-bound entry
- **THEN** final readiness or terminal transition checks SHALL reject final delivery authorization
- **AND** diagnostics SHALL direct the Agent back to the missing readiness/final handoff path

#### Scenario: failed predecessor gate blocks downstream gates

- **WHEN** the latest predecessor gate attempt failed or was superseded by a later failed attempt
- **AND** a downstream gate is invoked for the target phase
- **THEN** lifecycle preflight SHALL reject the downstream gate
- **AND** it SHALL NOT use older passed attempts, artifacts, or status drift to bypass the failure

#### Scenario: degraded predecessor handoff is accepted only when runtime truth is intact

- **WHEN** the predecessor gate has a legal degraded pass and route-bound load witness
- **AND** all runtime-truth blockers required by the degraded handoff contract are absent
- **THEN** the downstream gate preflight MAY proceed to normal gate-specific rules
- **AND** degraded quality context SHALL remain visible in diagnostics

#### Scenario: diagnostics prioritize root cause over cascade symptoms

- **WHEN** a downstream gate sees both missing handoff evidence and missing/partial downstream artifacts
- **THEN** the primary inspect/advice output SHALL identify the missing handoff as the root cause
- **AND** downstream artifact findings MAY appear as cascade details but SHALL NOT obscure the required Engine-mediated repair path
