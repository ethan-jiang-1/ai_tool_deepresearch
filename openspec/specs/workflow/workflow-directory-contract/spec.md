# Workflow Directory Contract

> req: WDC-001, WDC-002, WDC-003, WDC-004, WDC-005, WDC-006, WDC-007, WDC-008, WDC-009, WDC-010, WDC-011

## Purpose

定义 Workflow Foundation 所有 artifact 的目录归属、命名约定、runtime coordinate vocabulary、active runtime bundle root 和禁止混放规则。该能力固定两条边界：`DEEP_RESEARCH_HARNESS/` 是可复用 read-only Harness assets；当前 run 或实验的 runtime truth 只存在于明确选中的 current run bundle root（production `dpt_rb_*` 或 disposable `dpt_disp_*`）。

Current run bundle root 是所有裸 runtime path 的解析锚点。Specs、workflow nodes、playbooks 或 prompts 中出现的 `rb_queue.json`、`rb_trace.jsonl`、`reference/`、`artifacts/`、`_cache/`、`_logs/`、`final/`、`_work_units/...` 等 runtime path，除非显式写成 `DEEP_RESEARCH_HARNESS/...`，都必须理解为 current run bundle-root relative，而不是 repo-root 或 Harness-relative。
## Requirements
### Requirement: Read-only Harness assets boundary

`DEEP_RESEARCH_HARNESS/` SHALL be the sole read-only reusable Harness assets
directory. Runtime user input, gate attempts, pass/fail results, repair
attempts, waiting/block facts, trace events, artifacts, and final output MUST
be written only under the current run bundle root and MUST NOT be written to
the canonical Harness tree.

The repository SHALL not retain a root-level filesystem alias or another
supported production/reusable source coordinate that resolves to the same
Harness assets. Test-owned dependencies below `tests/fixtures/` are not
reusable Harness source roots or supported command coordinates. A historical
bundle may retain a creation-time navigation coordinate, but that coordinate
SHALL not create a supported source path, runtime authority, or migration
obligation.

#### Scenario: Gate result written to correct location

- **WHEN** a gate CLI returns pass/fail/inspect/advice
- **THEN** the gate result is recorded in the current run bundle root's
  `rb_trace.jsonl` and/or `rb_status.json`
- **AND** it MUST NOT be written to
  `DEEP_RESEARCH_HARNESS/schema/gate_definitions/`

#### Scenario: Multiple bundles share one Harness

- **WHEN** two or more `dpt_rb_*` or `dpt_disp_*` runtime bundles exist
- **THEN** current supported bundles reference the canonical
  `DEEP_RESEARCH_HARNESS/` root
- **AND** all bundles use one shared Harness asset tree and independently hold
  runtime state without contamination

#### Scenario: Historical source coordinate is unavailable without migration

- **WHEN** an explicitly supplied existing bundle names a Harness coordinate
  that no longer reaches the canonical Harness root
- **THEN** the existing continuation procedure SHALL report the selected
  Harness context as unavailable and stop before executing bundle-provided
  commands
- **AND** it SHALL not rewrite the bundle, scan for another bundle, create an
  alternate source path, or infer a replacement coordinate

### Requirement: Workflow node directory structure

Workflow nodes SHALL reside under
`DEEP_RESEARCH_HARNESS/workflows/nodes/`, split into:

- `phases/` — phase nodes that an Agent follows in phase order before running
  the associated gate
- `shared/` — shared nodes providing reusable Agent-readable context

The phase manifest or equivalent lifecycle map SHALL reside at
`DEEP_RESEARCH_HARNESS/workflows/manifest.json`.

#### Scenario: Phase node location

- **WHEN** an Agent needs instructions for the current phase
- **THEN** the phase node MUST be at
  `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-<phase>.md`

#### Scenario: Shared node location

- **WHEN** an Agent needs shared context such as profile guidance or a gate
  summary
- **THEN** the shared node MUST be at
  `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-<scope>.md`

#### Scenario: Shared node is not a hidden phase

- **WHEN** a Markdown file is under the `shared/` directory
- **THEN** it SHALL NOT declare `phase`, `gate`, `next`, or `stop` fields
- **AND** it SHALL NOT change phase order

### Requirement: Gate artifacts location and shape

Gate-definition JSON files SHALL reside under
`DEEP_RESEARCH_HARNESS/schema/gate_definitions/`, named
`gate-<gate-name-kebab>.definition.json`. A Gate definition SHALL be a
read-only deterministic rule source belonging to the Harness and MUST NOT be
copied into each `dpt_rb_*` bundle.

Gate CLIs SHALL reside under `DEEP_RESEARCH_HARNESS/cli/gates/`, named
`check-gate-<gate-name-kebab>.mjs`. Each Gate SHALL have one external CLI
wrapper. The CLI SHALL explicitly receive a current run bundle root through
`--bundle` or an equivalent flag and SHALL NOT assume cwd is the target bundle.

Gate engines SHALL reside under `DEEP_RESEARCH_HARNESS/engine/gates/` when a
per-Gate engine module exists. Shared helpers SHALL reside under
`DEEP_RESEARCH_HARNESS/engine/helpers/`.

The current Gate transition-table contract SHALL be represented by
`DEEP_RESEARCH_HARNESS/schema/contracts/gate.mjs`. Gate-definition JSON files
remain read-only rule sources under the canonical Harness schema directory and
are loaded by the Gate-helper/per-Gate CLI pipeline; no
`gate-definition.mjs` executable contract is part of the current accepted
runtime surface.

#### Scenario: Gate definition is Harness asset not bundle copy

- **WHEN** a `dpt_rb_*` bundle is instantiated
- **THEN** Gate-definition JSON MUST NOT be copied into the bundle
- **AND** a Gate CLI reads the definition from the canonical Harness and uses
  `--bundle` to identify the checked current run bundle root

#### Scenario: One Gate per CLI

- **WHEN** an Agent needs to run a Gate
- **THEN** it MUST invoke that Gate's independent `check-gate-<name>.mjs`
- **AND** it MUST NOT distinguish Gates with subcommands on one universal entry

#### Scenario: Gate CLI requires bundle path

- **WHEN** a Gate CLI is called without a `--bundle` argument
- **THEN** it SHALL fail
- **AND** it MUST NOT assume a default bundle or scan directories

### Requirement: Runtime bundle canonical structure

Current runtime bundles SHALL contain canonical control files and data
directories for runtime truth. Production runs use `dpt_rb_*`; disposable
experiments use `dpt_disp_*`. Those bundle-name grammars remain unchanged by
the Harness-root retirement.

The current run bundle root SHALL be the single mutable runtime directory
explicitly selected for one research entry, command invocation, task card, or
controlled experiment. For production it SHALL be the selected `dpt_rb_*`
directory; for controlled experiments it SHALL be the selected `dpt_disp_*`
directory. It owns runtime truth for that operation. At an Agent/CLI handoff,
the selected root SHALL be supplied in its resolved absolute form; it SHALL NOT
be inferred from repository root, cwd, shell state, chat memory, chronology,
or an unqualified bundle mention.

A CLI MAY accept an explicitly supplied relative bundle path at its boundary,
but it SHALL resolve the reachable directory to its filesystem-resolved
canonical absolute form before using it for runtime paths or passing it to an
Agent/CLI handoff. A new-bundle creator SHALL emit the same resolved absolute
form to stdout. Relative input is not a second current-run-bundle-root
coordinate.

Current specs, Harness docs, workflow nodes, bundle templates, and Agent-facing
playbooks SHALL use this coordinate vocabulary:

- `repo_command_root`: the repository root used to invoke Harness commands. It
  may contain the canonical Harness root and many runtime bundles, but is not
  runtime truth and SHALL not expose an alternate Harness source root.
- `framework_root`: the canonical `DEEP_RESEARCH_HARNESS/` reusable Harness
  asset root. It contains schemas, CLIs, engines, workflow nodes, templates,
  and command playbooks, and is read-only during workflow execution.
- `current_run_bundle_root`: the explicitly selected `dpt_rb_*` or
  `dpt_disp_*` runtime bundle root. It is the only root for mutable runtime
  truth.

For CLI operations, `current_run_bundle_root` SHALL be the explicit bundle
path argument such as `--bundle <path>` or an equivalent positional bundle
path. For Agent-facing Markdown flows, it SHALL be the resolved directory
named by the run entry, playbook setup, or current task card. When multiple
`dpt_rb_*` or `dpt_disp_*` directories exist, every runtime read/write SHALL
resolve against the explicitly selected root for that operation.

Unless a path is explicitly rooted in `DEEP_RESEARCH_HARNESS/`, runtime paths
in accepted specs and Agent-facing guidance SHALL be read as relative to
`current_run_bundle_root`, not repository root or Harness root. This includes
`rb_queue.json`, `rb_trace.jsonl`, `rb_output_declarations.jsonl`,
`reference/`, `artifacts/`, `_cache/`, `_logs/`, `final/`, and
`_work_units/...`.

Bundle-root runtime surfaces include `BUNDLE_ENTRY.md`, `BUNDLE_MAP.md`,
`rb_plan.md`, `rb_profile.yaml`, `rb_status.json`, `rb_queue.json`,
`rb_trace.jsonl`, `rb_output_declarations.jsonl`, `seed_topics/`,
`reference/`, `artifacts/`, `_cache/`, `_logs/`, `final/`, and
`_work_units/`. Production delegated work SHALL use bundle-root `_work_units/`
as its work-unit runtime tree. Bundle-root `_work_units/_index.json` SHALL be
Engine-owned allocation and attempt-state truth, while submitted delegated
output coverage SHALL remain in bundle-root `rb_output_declarations.jsonl`.

A current operational bundle root SHALL contain both `BUNDLE_ENTRY.md` and
`BUNDLE_MAP.md`. A root missing either file, including one containing
`RUN_BUNDLE.md`, `START_FROM_HERE.md`, or only `BUNDLE_MAP.md`, is not a current
run bundle root for continue, inspect, reentry, or Engine operation. Those
legacy files are historical Markdown only; they SHALL not establish a Harness
source context, authorize a source-root fallback, migration, or compatibility
path. Extra legacy files beside the complete pair are non-authoritative
historical debris.

Runtime choices and runtime data SHALL be persisted under the current run
bundle root. Harness definitions, schemas, workflow nodes, CLIs, reusable
Engine code, templates, and command playbooks SHALL remain under the canonical
Harness root and SHALL NOT become per-run storage.

#### Scenario: Coordinate vocabulary distinguishes roots

- **WHEN** an Agent reads a spec, workflow node, playbook, or bundle entrypoint
  that names `repo_command_root`, `framework_root`, and
  `current_run_bundle_root`
- **THEN** it SHALL treat `repo_command_root` only as the shell command
  location
- **AND** it SHALL treat `framework_root` only as reusable read-only Harness
  assets at `DEEP_RESEARCH_HARNESS/`
- **AND** it SHALL treat `current_run_bundle_root` as the only root for mutable
  runtime truth

#### Scenario: Explicit relative bundle input resolves before handoff

- **WHEN** a CLI receives `--bundle dpt_rb_climate-policy` from a command
  working directory where that relative path is reachable
- **THEN** the filesystem-resolved absolute `dpt_rb_climate-policy/` directory
  SHALL be the current run bundle root for that invocation and any later
  Agent/CLI handoff
- **AND** runtime paths SHALL resolve only inside that directory

#### Scenario: Command root is not runtime root

- **WHEN** an Agent runs
  `node DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs claim dpt_rb_climate-policy`
- **THEN** repository root MAY be the process working directory
- **AND** all runtime state written by the command SHALL resolve under
  `dpt_rb_climate-policy/`
- **AND** no runtime state SHALL be written to `./_work_units/`,
  `./rb_queue.json`, or another repository-root runtime-looking path

#### Scenario: Work-units directory is part of delegated runtime structure

- **WHEN** a bundle has executed delegated work-unit claim for a wave
- **THEN** `<current-run-bundle-root>/_work_units/waveN/{work_id}/` SHALL
  contain the claimed work-unit envelope
- **AND** `<current-run-bundle-root>/_work_units/_index.json` SHALL contain
  the corresponding allocation record

#### Scenario: Incomplete legacy root is not a current bundle root

- **WHEN** a supplied directory lacks `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md`
- **THEN** it SHALL not be selected as a current run bundle root for Harness
  continuation, inspection, reentry, or Engine operations
- **AND** legacy Markdown at that root SHALL not create a fallback or migration
  route

#### Scenario: Bundle entry and map are canonical root surfaces

- **WHEN** a new bundle is instantiated
- **THEN** `BUNDLE_ENTRY.md` and `BUNDLE_MAP.md` SHALL be part of the canonical
  bundle-root surface
- **AND** `RUN_BUNDLE.md` and `START_FROM_HERE.md` SHALL NOT be required or
  accepted as current canonical entry surfaces

#### Scenario: Work-unit path expands under selected bundle

- **WHEN** the current run bundle root is `/repo/dpt_rb_climate-policy/`
- **AND** a spec, playbook, or prompt names `_work_units/wave1/wu-w1-b000-deep-i0001/`
- **THEN** the runtime path SHALL mean
  `/repo/dpt_rb_climate-policy/_work_units/wave1/wu-w1-b000-deep-i0001/`
- **AND** it SHALL NOT mean `./_work_units/wave1/wu-w1-b000-deep-i0001/` at
  repository root

#### Scenario: Runtime paths are bundle-root relative

- **WHEN** an accepted spec or Agent-facing runtime instruction names
  `reference/`, `artifacts/`, `_cache/`, `_logs/`, `_work_units/`,
  `rb_queue.json`, `rb_trace.jsonl`, or `rb_output_declarations.jsonl` without
  a leading Harness path
- **THEN** the path SHALL resolve under the selected `dpt_rb_*` or `dpt_disp_*`
  current run bundle root
- **AND** the Agent SHALL NOT create or read it as a repository-root or Harness
  runtime path

#### Scenario: Bare work-unit path requires current run bundle root

- **WHEN** a prompt or playbook gives the Agent
  `_work_units/wave2/{work_id}/result.json`
- **THEN** the Agent SHALL first identify the current run bundle root for that
  run or experiment
- **AND** it SHALL resolve the file as
  `<current-run-bundle-root>/_work_units/wave2/{work_id}/result.json`
- **AND** it SHALL NOT create or inspect `./_work_units/wave2/{work_id}/result.json`
  at repository root

#### Scenario: Harness templates are not runtime state

- **WHEN** a template, schema, Gate definition, workflow node, CLI, command
  playbook, or reusable Engine helper under `DEEP_RESEARCH_HARNESS/` names a
  runtime-relative path
- **THEN** that path SHALL be interpreted only after a caller supplies a
  current run bundle root
- **AND** the Agent or Engine SHALL NOT write current run data into a Harness
  template, schema, workflow, CLI, or Engine directory

#### Scenario: Runtime truth is in bundle not chat memory

- **WHEN** an Agent needs to recover current run state
- **THEN** the Agent MUST reload current-run-bundle control files and work-unit
  state
- **AND** it MUST NOT rely on chat memory or console summary as runtime state

### Requirement: Test and experiment boundary

The repository SHALL use the canonical `verification-routing` test classes and
asset boundaries:

- `unit` SHALL use focused in-process `node:test` assets under `tests/`, outside
  `tests/integration/` and `tests/e2e/`, with directories mirroring the owned
  Harness or project surface where applicable. Test-owned temporary fixture I/O
  MAY remain in `unit` when it exercises only that one in-process contract;
- `integration` SHALL use JS-led `node:test` assets under `tests/integration/`;
- `deterministic_e2e` SHALL use JS-led full-chain state tests under `tests/e2e/`;
- `agent_flow_e2e` SHALL use coding-Agent-executed Markdown playbooks under the
  owning `experiments_playbook/exp_*/` family over real disposable run bundles.
  Workflow-foundation-specific cases SHALL remain under
  `experiments_playbook/exp_workflow-foundation/` when that family owns the
  proof.

`regression`, controlled-E2E prose, playbook cost, proof subject, actor type,
and runtime bundle type SHALL NOT be introduced as competing test classes.
`DEEP_RESEARCH_HARNESS/` SHALL NOT contain test files, experiment fixtures, or
playbooks.

#### Scenario: Unit test location

- **WHEN** a focused test covers gate-evaluator deterministic behavior
- **THEN** its `test_class` SHALL be `unit`
- **AND** the test file SHALL live under `tests/engine/gates/` corresponding to
  `DEEP_RESEARCH_HARNESS/engine/gates/`

#### Scenario: Deterministic full chain stays under tests

- **WHEN** JS simulates labeled Markdown/Agent-owned inputs and exercises a
  long state chain through real Engine paths
- **THEN** its `test_class` SHALL be `deterministic_e2e`
- **AND** the test file SHALL live under `tests/e2e/`, not
  `experiments_playbook/` or a repo-top-level `tests_e2e/`

#### Scenario: agent_flow_e2e is not a JS-led asset

- **WHEN** a coding Agent must execute a Markdown playbook over a real
  disposable bundle
- **THEN** its `test_class` SHALL be `agent_flow_e2e`
- **AND** the playbook SHALL live under the appropriate
  `experiments_playbook/exp_*/` family, not `tests/`

#### Scenario: Behavior determines class before directory

- **WHEN** a governance test invokes a real checker subprocess and reads or
  writes fixture repository files
- **THEN** its `test_class` SHALL be `integration`
- **AND** it SHALL live under `tests/integration/governance/` rather than using
  a unit-oriented directory to change its classification

#### Scenario: Temporary fixture I/O does not force integration

- **WHEN** a focused helper or schema test imports one in-process contract and
  uses a test-owned temporary file as input or output
- **THEN** its `test_class` MAY remain `unit`
- **AND** the fixture file SHALL NOT be treated as a production CLI,
  multi-component, or workflow-chain boundary

### Requirement: Naming conventions

All workflow-foundation artifacts SHALL follow the accepted naming conventions.
Runtime bundle naming SHALL distinguish production run bundles from disposable
experiment bundles without changing the runtime-authority boundary or the
legacy `dpt_rb_*` / `dpt_disp_*` grammar.

#### Scenario: Runtime bundle names identify runtime context type

- **WHEN** a current spec or playbook names a production runtime context
- **THEN** it SHALL use `dpt_rb_<english-slug>[_collision]`
- **AND** when it names a disposable experiment runtime context, it SHALL use
  `dpt_disp_<short>_<case>_<hex>`

### Requirement: Anti-mixing rules

Harness artifact types SHALL NOT be mixed into each other's directories.
Runtime state, runtime choices, Gate results, trace, work-unit attempt data,
receipts, artifacts, logs, cache projections, and repair-attempt data MUST NOT
be written back to `DEEP_RESEARCH_HARNESS/`. No alternate source-root path
shall be treated as an additional exception or a second Harness storage tree.

#### Scenario: Runtime data is not Harness data

- **WHEN** an Agent, CLI, Gate, or playbook produces runtime state or evidence
- **THEN** it SHALL write under the selected `dpt_rb_*` or `dpt_disp_*` current
  run bundle root
- **AND** it SHALL NOT write that runtime output under
  `DEEP_RESEARCH_HARNESS/`

### Requirement: Single canonical workflow package

v1 SHALL have one canonical Deep Research workflow package at
`DEEP_RESEARCH_HARNESS/workflows/manifest.json`. It SHALL NOT introduce a
`workflows/<workflow-name>/` namespace.

This decision SHALL NOT limit run-bundle count: one Harness MUST serve multiple
isolated `dpt_rb_*` run bundles.

#### Scenario: Multiple run bundles share one workflow package

- **WHEN** `dpt_rb_project-a` and `dpt_rb_project-b` both exist as current run
  bundles for separate operations
- **THEN** both bundles MUST reference the same
  `DEEP_RESEARCH_HARNESS/workflows/` phase/shared nodes
- **AND** each SHALL maintain independent runtime state

### Requirement: Manifest includes rerun phase entry

`DEEP_RESEARCH_HARNESS/workflows/manifest.json` SHALL include a `rerun` phase
entry in its `phases` array:

```json
{ "key": "rerun", "node": "phases/phase-rerun.md", "gate": "rerun-ready" }
```

The rerun phase SHALL be registered as a phase node with its corresponding
Gate. Its manifest-array position SHALL NOT imply linear runtime order; the
manifest is an inventory, not a routing table.

#### Scenario: Manifest lists rerun phase

- **WHEN** a workflow consistency validator scans `manifest.json`
- **THEN** it SHALL find `rerun` among registered phase keys with node
  `phases/phase-rerun.md` and Gate `rerun-ready`

#### Scenario: Rerun node file exists

- **WHEN** the manifest references `phases/phase-rerun.md`
- **THEN** the file SHALL exist at
  `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-rerun.md`

### Requirement: Command playbooks are Agent-facing command instructions

`DEEP_RESEARCH_HARNESS/command_playbook/` SHALL be described as containing
Agent-facing command instructions and diagnostic/maintenance playbooks, not as
instructions for a human or operator co-runner inside the autonomous pipeline.

Harness directory docs SHALL NOT use unqualified `Agent/operator` or
equivalent slash wording to describe the command-playbook audience. Operator
or maintainer wording MAY appear only when clearly scoped to post-run
inspection, diagnostics, repository maintenance, or out-of-band review, and
not to running lifecycle commands mid-pipeline.

#### Scenario: Command playbook audience is Agent-facing

- **WHEN** Harness docs describe
  `DEEP_RESEARCH_HARNESS/command_playbook/`
- **THEN** they SHALL identify the directory as Agent-readable or Agent-facing
  command guidance
- **AND** they SHALL NOT identify an operator as a co-runner audience for
  autonomous pipeline execution

#### Scenario: Diagnostic operator wording is allowed

- **WHEN** a command playbook describes post-run forensics, diagnostic
  inspection, or maintainer review
- **THEN** operator wording MAY appear if it is explicitly out-of-band
- **AND** the wording SHALL NOT imply that an operator runs normal lifecycle
  commands during `stop: no` execution
