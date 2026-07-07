> req: SDC-001, SDC-002, SDC-003

## MODIFIED Requirements

### Requirement: Work units SHALL be the sole production delegated runtime directory

Production delegated work SHALL write one directory per `work_id` under the active runtime bundle root at `_work_units/waveN/{work_id}/`. The `waveN` segment SHALL match the encoded wave in `work_id`, the manifest `wave`, and the submitted ledger row.

Bare `_work_units/...` paths SHALL always be read as active bundle-root relative. They SHALL NOT be created, inspected, or described as repository-root or `DPT_FRAMEWORK/` paths.

This capability SHALL be read as the sub-agent's work-unit envelope and directory contract. Current main spec Purpose and Requirements text SHALL NOT describe `_subagents/` relay slot directories as canonical production paths. Old relay/slot directory names may appear only in explicit removed, deprecated, checker self-reference, minimized release-history, or negative diagnostic contexts outside `openspec/changes/archive/`.

#### Scenario: work-unit directory path matches encoded wave

- **WHEN** the Engine creates `wu-w1-b000-deep-i0001`
- **THEN** the production directory SHALL be bundle-root `_work_units/wave1/wu-w1-b000-deep-i0001/`
- **AND** malformed work-unit paths or non-work-unit delegated paths SHALL NOT be accepted as the canonical production path

#### Scenario: work-unit directory is not repository-root state

- **WHEN** a spec, playbook, or prompt names `_work_units/waveN/{work_id}/`
- **THEN** the path SHALL resolve under the active `dpt_rb_*` or `dpt_disp_*` bundle root
- **AND** the Agent SHALL NOT create `_work_units/` at repository root or under `DPT_FRAMEWORK/`

#### Scenario: stale relay directory wording is not current contract

- **WHEN** active main specs are synced after this change
- **THEN** the sub-agent directory contract SHALL describe `_work_units/waveN/{work_id}/` as the production delegated runtime envelope
- **AND** it SHALL NOT describe a relay slot directory as the standard production structure

### Requirement: Work-unit directory SHALL contain binding surfaces

Each work-unit directory SHALL contain the binding surfaces needed for submit and gate cross-checks: `manifest.json`, `task.md`, `result.schema.json`, `_beacon.json`, `runtime-receipt.jsonl`, `result.json` when submitted, `result.md` when produced, `_status.json`, and `_agent.json`.

These surfaces SHALL be validated as work-unit binding surfaces. They SHALL NOT be described as relay slot artifacts, slot task files, or slot result files in current production-facing guidance.

#### Scenario: missing beacon blocks submit

- **WHEN** a work-unit result is submitted but `_beacon.json` is missing
- **THEN** `operate-work-unit submit` SHALL reject the result
- **AND** no ledger row SHALL be appended

#### Scenario: binding surfaces are work-unit surfaces

- **WHEN** a current playbook or spec describes delegated runtime files
- **THEN** it SHALL name the work-unit directory and binding surfaces
- **AND** it SHALL NOT frame them as relay slot artifacts
