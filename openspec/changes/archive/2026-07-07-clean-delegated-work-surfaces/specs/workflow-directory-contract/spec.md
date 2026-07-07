> req: WDC-001, WDC-003, WDC-004

## MODIFIED Requirements

### Requirement: Runtime bundle canonical structure

Active runtime bundles SHALL contain canonical control files and data directories for runtime truth. Production runs use `dpt_rb_*`; disposable experiments use `dpt_disp_*`.

The active runtime bundle root (short form: active bundle root) SHALL be the single mutable runtime directory selected for the current run, command invocation, or controlled experiment. For production it SHALL be the active `dpt_rb_*` directory; for controlled experiments it SHALL be the active `dpt_disp_*` directory. The active bundle root owns runtime truth for that invocation.

Current specs, framework docs, workflow nodes, bundle templates, and Agent-facing playbooks SHALL use this coordinate vocabulary:

- `repo_command_root`: the repository root used to invoke framework commands. It may contain `DPT_FRAMEWORK/` and many runtime bundles, but it is not runtime truth.
- `framework_root`: the `DPT_FRAMEWORK/` reusable framework asset root. It contains schemas, CLIs, engines, workflow nodes, templates, and command playbooks; it is read-only during workflow execution.
- `active_bundle_root`: the selected `dpt_rb_*` or `dpt_disp_*` runtime bundle root. It is the only root for mutable runtime truth.

For CLI operations, the active runtime bundle root SHALL be the explicit bundle path argument such as `--bundle <path>` or an equivalent positional bundle path. For Agent-facing Markdown flows, it SHALL be the bundle directory named by the run entry, playbook setup, or current task card. When multiple `dpt_rb_*` or `dpt_disp_*` directories exist, every runtime read/write SHALL resolve against the selected active bundle root for that step.

The active runtime bundle root SHALL NOT be inferred from repository root, `DPT_FRAMEWORK/`, chat memory, process working directory, shell state, or whichever bundle was mentioned earlier in conversation.

Unless a path is explicitly rooted in `DPT_FRAMEWORK/`, runtime paths in accepted specs and Agent-facing guidance SHALL be read as relative to the active runtime bundle root, not the repository root and not `DPT_FRAMEWORK/`. This includes bare paths such as `rb_queue.json`, `rb_trace.jsonl`, `rb_output_declarations.jsonl`, `reference/`, `artifacts/`, `_cache/`, `_logs/`, `final/`, and `_work_units/...`.

Bundle-root runtime surfaces include `START_FROM_HERE.md`, `rb_plan.md`, `rb_profile.yaml`, `rb_status.json`, `rb_queue.json`, `rb_trace.jsonl`, `rb_output_declarations.jsonl`, `seed_topics/`, `reference/`, `artifacts/`, `_cache/`, `_logs/`, `final/`, and `_work_units/`. Production delegated work SHALL use bundle-root `_work_units/` as the work-unit runtime directory tree. Bundle-root `_work_units/_index.json` SHALL be Engine-owned allocation and attempt-state truth, while submitted delegated output coverage SHALL remain in bundle-root `rb_output_declarations.jsonl`.

Runtime choices and runtime data SHALL be persisted in the active runtime bundle. Framework definitions, schemas, workflow nodes, CLIs, reusable engine code, templates, and command playbooks SHALL remain under `DPT_FRAMEWORK/` and SHALL NOT become per-run storage.

#### Scenario: coordinate vocabulary distinguishes roots

- **WHEN** an Agent reads a spec, workflow node, playbook, or bundle entrypoint that names `repo_command_root`, `framework_root`, and `active_bundle_root`
- **THEN** it SHALL treat `repo_command_root` only as the shell command location
- **AND** it SHALL treat `framework_root` only as reusable read-only framework assets
- **AND** it SHALL treat `active_bundle_root` as the only root for mutable runtime truth

#### Scenario: command root is not runtime root

- **WHEN** an Agent runs `node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim dpt_rb_climate-policy`
- **THEN** the repository root MAY be the process working directory
- **AND** all runtime state written by the command SHALL resolve under `dpt_rb_climate-policy/`
- **AND** no runtime state SHALL be written to `./_work_units/`, `./rb_queue.json`, or other repository-root runtime-looking paths

#### Scenario: work-units directory is part of delegated runtime structure

- **WHEN** a bundle has executed delegated work-unit claim for a wave
- **THEN** bundle-root `_work_units/waveN/{work_id}/` SHALL contain the claimed work-unit envelope
- **AND** bundle-root `_work_units/_index.json` SHALL contain the corresponding allocation record

#### Scenario: active runtime bundle root is explicit

- **WHEN** a CLI receives `--bundle dpt_rb_climate-policy`
- **THEN** `dpt_rb_climate-policy/` SHALL be the active runtime bundle root for that invocation
- **AND** runtime paths such as `rb_queue.json`, `rb_trace.jsonl`, `reference/`, and `_work_units/` SHALL resolve inside that directory

#### Scenario: work-unit path expands under selected bundle

- **WHEN** the selected active runtime bundle root is `dpt_rb_climate-policy/`
- **AND** a spec, playbook, or prompt names `_work_units/wave1/wu-w1-b000-deep-i0001/`
- **THEN** the runtime path SHALL mean `dpt_rb_climate-policy/_work_units/wave1/wu-w1-b000-deep-i0001/`
- **AND** it SHALL NOT mean `./_work_units/wave1/wu-w1-b000-deep-i0001/` at repository root

#### Scenario: runtime paths are bundle-root relative

- **WHEN** an accepted spec or Agent-facing runtime instruction names `reference/`, `artifacts/`, `_cache/`, `_logs/`, `_work_units/`, `rb_queue.json`, `rb_trace.jsonl`, or `rb_output_declarations.jsonl` without a leading framework path
- **THEN** the path SHALL resolve under the active `dpt_rb_*` or `dpt_disp_*` bundle root
- **AND** the Agent SHALL NOT create or read it as a repository-root or `DPT_FRAMEWORK/` runtime path

#### Scenario: bare work-unit path requires active bundle root

- **WHEN** a prompt or playbook gives the Agent `_work_units/wave2/{work_id}/result.json`
- **THEN** the Agent SHALL first identify the active bundle root for that run or experiment
- **AND** it SHALL resolve the file as `<active-bundle-root>/_work_units/wave2/{work_id}/result.json`
- **AND** it SHALL NOT create or inspect `./_work_units/wave2/{work_id}/result.json` at repo root

#### Scenario: framework templates are not active runtime state

- **WHEN** a template, schema, gate definition, workflow node, CLI, command playbook, or reusable engine helper under `DPT_FRAMEWORK/` names a runtime-relative path
- **THEN** that path SHALL be interpreted only after a caller supplies an active runtime bundle root
- **AND** the Agent or Engine SHALL NOT write current run data into the framework template, schema, workflow, CLI, or engine directory

#### Scenario: runtime truth is in bundle not chat memory

- **WHEN** an Agent needs to recover current run state
- **THEN** the Agent MUST reload active bundle control files and work-unit state
- **AND** it MUST NOT rely on chat memory or console summary as runtime state

### Requirement: Naming conventions

All workflow foundation artifacts SHALL follow the accepted naming conventions. Runtime bundle naming SHALL distinguish production run bundles from disposable experiment bundles without changing the runtime authority boundary.

#### Scenario: Runtime bundle names identify runtime context type

- **WHEN** a current spec or playbook names a production runtime context
- **THEN** it SHALL use `dpt_rb_<english-slug>[_collision]`
- **AND** when it names a disposable experiment runtime context, it SHALL use `dpt_disp_<short>_<case>_<hex>`

### Requirement: Anti-mixing rules

Framework artifact types SHALL NOT be mixed into each other's directories. Runtime state, runtime choices, gate result, trace, work-unit attempt data, receipts, artifacts, logs, cache projections, and repair attempt data MUST NOT be written back to `DPT_FRAMEWORK/`.

#### Scenario: Runtime data is not framework data

- **WHEN** an Agent, CLI, gate, or playbook produces runtime state or evidence
- **THEN** it SHALL write under the active `dpt_rb_*` or `dpt_disp_*` bundle root
- **AND** it SHALL NOT write that runtime output under `DPT_FRAMEWORK/`
