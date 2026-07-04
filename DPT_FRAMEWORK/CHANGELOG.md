# Changelog — DPT_FRAMEWORK

## v0.3

- **fix (relay staging off-by-one, SDC-003):** `drive-relay-slot stage --wave N` now places logical wave N slots in `_subagents/wave_{NN}/` (0-based: wave0→`wave_00`, wave1→`wave_01`, wave2→`wave_02`), matching the canonical convention (`shared-schemas.md`) and the `wave{N}-complete` gate's `subagent_slot_presence`/ledger-scope checks. Previously wave0 full-stage landed in `wave_01` (derived from `nextWaveIndex = subagent_wave+1`), which made the wave0 gate's slot-presence and scoped-ledger rules unsatisfiable.
  - `stageSubagentSlots(state, baseDir, customDispatchMap, explicitWaveIndex?)` gains an optional `explicitWaveIndex` param (used by the driver). Legacy direct callers and unit tests omit it → unchanged `nextWaveIndex` behavior.
  - `inferWaveFromBundle` returns `0` for a fresh bundle (was `1`), so a `--wave`-less first stage also lands in `wave_00`.
  - `stageReplacementSlot`/`commit`/`merge` already used the explicit wave index — unchanged.

## v0.2

- (prior release — see git history)
