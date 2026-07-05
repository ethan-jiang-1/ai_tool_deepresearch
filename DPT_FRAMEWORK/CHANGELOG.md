# Changelog — DPT_FRAMEWORK

## v0.4

- **fix (phase handoff witnessing, CPT-003/CPT-004/GSK-007):** gate pass handoff now requires `enter-phase --node <check.next>` to write a route-bound `load_complete` witness before source-gate `advance-status` can certify status. Covered lifecycle gates use shared handoff/status-window preflight instead of trusting own-gate `current_gate` before pass.
- **fix (HITL2/rerun branching):** HITL2 proceed and rerun decisions now emit their selected deterministic target into `gate_attempt.next`; rerun-ready runs under the incoming `current_gate: hitl2_recorded` / `next_gate: rerun_ready` status window until rerun itself passes.
- **diagnostics (GSK-008/SWE-003):** gate attempts now expose Engine-derived attempt diagnostics and pass-side autonomous continuation advice; silent execution guidance explains why continuing to `phase-final` is the helpful behavior.
- **experiments/tests (AGT-010):** added standard disposable-bundle handoff witnessing E2E coverage for unwitnessed status rejection, old-style next-gate laundering, route-bound entry metadata, HITL2 rerun, rerun→seed-topics, superseded passes, and entry-witness-vs-work-completion boundaries.

## v0.3

- **fix (relay staging off-by-one, SDC-003):** `drive-relay-slot stage --wave N` now places logical wave N slots in `_subagents/wave_{NN}/` (0-based: wave0→`wave_00`, wave1→`wave_01`, wave2→`wave_02`), matching the canonical convention (`shared-schemas.md`) and the `wave{N}-complete` gate's `subagent_slot_presence`/ledger-scope checks. Previously wave0 full-stage landed in `wave_01` (derived from `nextWaveIndex = subagent_wave+1`), which made the wave0 gate's slot-presence and scoped-ledger rules unsatisfiable.
  - `stageSubagentSlots(state, baseDir, customDispatchMap, explicitWaveIndex?)` gains an optional `explicitWaveIndex` param (used by the driver). Legacy direct callers and unit tests omit it → unchanged `nextWaveIndex` behavior.
  - `inferWaveFromBundle` returns `0` for a fresh bundle (was `1`), so a `--wave`-less first stage also lands in `wave_00`.
  - `stageReplacementSlot`/`commit`/`merge` already used the explicit wave index — unchanged.

## v0.2

- (prior release — see git history)
