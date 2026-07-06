> req: SDC-001, SDC-002, SDC-003

## ADDED Requirements

### Requirement: Work units SHALL be the sole production delegated runtime directory

Production delegated work SHALL write one directory per `work_id` under `_work_units/waveN/{work_id}/`. The `waveN` segment SHALL match the encoded wave in `work_id`, the manifest `wave`, and the submitted ledger row.

#### Scenario: work-unit directory path matches encoded wave

- **WHEN** the Engine creates `wu-w1-b000-deep-i0001`
- **THEN** the production directory SHALL be `_work_units/wave1/wu-w1-b000-deep-i0001/`
- **AND** malformed work-unit paths or non-work-unit delegated paths SHALL NOT be accepted as the canonical production path

### Requirement: Work-unit directory SHALL contain binding surfaces

Each work-unit directory SHALL contain the binding surfaces needed for submit and gate cross-checks: `manifest.json`, `task.md`, `result.schema.json`, `_beacon.json`, `runtime-receipt.jsonl`, `result.json` when submitted, `result.md` when produced, `_status.json`, and `_agent.json`.

#### Scenario: missing beacon blocks submit

- **WHEN** a work-unit result is submitted but `_beacon.json` is missing
- **THEN** `operate-work-unit submit` SHALL reject the result
- **AND** no ledger row SHALL be appended

## REMOVED Requirements

### Requirement: `_subagents/` SHALL be the sole directory for relay-managed slot artifacts

**Reason**: Production delegated artifacts now live under `_work_units/waveN/{work_id}/`.

**Migration**: Replace active production references to `_subagents/` with work-unit directories.

#### Scenario: old directory is not production authority

- **WHEN** delegated output exists only under `_subagents/`
- **THEN** gates and submit checks SHALL reject it as production authority

### Requirement: Relay slot artifacts SHALL NOT reside outside `_subagents/`

**Reason**: Relay slot artifacts are no longer the production artifact model.

**Migration**: Enforce work-unit directory containment and work-unit manifest/index binding.

#### Scenario: artifact containment uses work-unit root

- **WHEN** a delegated artifact is written outside `_work_units/waveN/{work_id}/`
- **THEN** work-unit submit SHALL reject it unless the kind-specific output contract explicitly allows that output path and the ledger declares it

### Requirement: Relay staging places logical wave N slots in _subagents/wave_{NN}/ (0-based, matching canonical convention and gate wave field) (SDC-003)

**Reason**: Relay staging and logical slots are replaced by Engine-allocated work-unit directories.

**Migration**: Use `_work_units/wave0/`, `_work_units/wave1/`, and `_work_units/wave2/` with canonical `work_id` values.

#### Scenario: wave directory convention is work-unit based

- **WHEN** work-unit validation checks a Wave2 directory
- **THEN** it SHALL require `_work_units/wave2/{work_id}/`
- **AND** it SHALL NOT accept `_subagents/wave_02/slot_00/` as production runtime path
