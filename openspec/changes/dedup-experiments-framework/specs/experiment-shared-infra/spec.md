> req: EXS-001, EXS-002

## Purpose

Define the shared experiment infrastructure directory `experiments/shared/` for tools that support experiment setup and execution but are NOT needed by production run bundles. This directory is the canonical location for experiment-scoped utilities shared across multiple experiment families.

## Requirements

### Requirement: Experiment shared infrastructure directory

The system SHALL provide a directory `experiments/shared/` for experiment-scoped shared infrastructure. Tools in this directory SHALL be importable by command experiment playbooks and experiment prototype code. Production run bundle code SHALL NOT import from this directory.

#### Scenario: Directory exists and is importable

- **WHEN** an experiment playbook inline script needs shared infrastructure
- **THEN** it SHALL import from `../experiments/shared/<tool>.mjs`

#### Scenario: Production code does not depend on experiment shared

- **WHEN** a production run bundle or `DPT_FRAMEWORK/` module runs
- **THEN** it SHALL NOT import from `experiments/shared/`

### Requirement: Disposable bundle creation tool

The disposable bundle creation script SHALL reside at `experiments/shared/new-disposable-bundle.mjs`. It SHALL create `dpt_disp_*` directories with Zod-validated control files using the same schemas as production bundles. It SHALL accept:

- Required positional argument: bundle name suffix
- `--nodes=<dir>`: copy node MD files from a prototype's nodes directory into the bundle
- `--force`: overwrite existing bundle directory

#### Scenario: Create disposable bundle with nodes

- **WHEN** `node experiments/shared/new-disposable-bundle.mjs agq_simple --nodes=experiments/prototype-agentic-queue/nodes-agentic-queue --force` is executed
- **THEN** a directory `dpt_disp_agq_simple/` SHALL be created at repo root
- **AND** it SHALL contain all standard bundle control files (`rb_status.json`, `rb_queue.json`, `rb_profile.yaml`, `rb_plan.md`, `rb_trace.jsonl`, `START_FROM_HERE.md`)
- **AND** the control files SHALL pass `validate-bundle.mjs` and `inspect-bundle.mjs`
- **AND** node MD files from the `--nodes` source SHALL be copied into the bundle

#### Scenario: Overwrite existing bundle with --force

- **WHEN** a bundle directory already exists and `--force` is passed
- **THEN** the existing directory SHALL be removed and recreated without error

#### Scenario: Playbook Step 1 uses new path

- **WHEN** any command experiment playbook runs Step 1 (bundle creation)
- **THEN** it SHALL invoke `experiments/shared/new-disposable-bundle.mjs` (not `DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs`)
