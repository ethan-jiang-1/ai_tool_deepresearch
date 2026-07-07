> req: WDC-004

## MODIFIED Requirements

### Requirement: Runtime bundle canonical structure

Active `dpt_rb_*` run bundles SHALL contain canonical control files and data directories for runtime truth. Production delegated work SHALL use `_work_units/` as the work-unit runtime directory tree. `_work_units/_index.json` SHALL be Engine-owned allocation and attempt-state truth, while submitted delegated output coverage SHALL remain in bundle-root `rb_output_declarations.jsonl`.

#### Scenario: work-units directory is part of delegated runtime structure

- **WHEN** a bundle has executed delegated work-unit claim for a wave
- **THEN** `_work_units/waveN/{work_id}/` SHALL contain the claimed work-unit envelope
- **AND** `_work_units/_index.json` SHALL contain the corresponding allocation record

#### Scenario: runtime truth is in bundle not chat memory

- **WHEN** an Agent needs to recover current run state
- **THEN** the Agent MUST reload active bundle control files and work-unit state
- **AND** it MUST NOT rely on chat memory or console summary as runtime state
