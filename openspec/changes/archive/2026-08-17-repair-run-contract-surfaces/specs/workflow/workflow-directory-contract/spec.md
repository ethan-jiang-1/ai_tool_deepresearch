> req: WDC-004

## MODIFIED Requirements

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
`reference/`, `artifacts/`, `_cache/`, `_logs/`, `final/`, `_scripts/`, and
`_work_units/...`.

Bundle-root runtime surfaces include `BUNDLE_ENTRY.md`, `BUNDLE_MAP.md`,
`rb_plan.md`, `rb_profile.yaml`, `rb_status.json`, `rb_queue.json`,
`rb_trace.jsonl`, `rb_output_declarations.jsonl`, `seed_topics/`,
`reference/`, `artifacts/`, `_cache/`, `_logs/`, `final/`, `_scripts/`, and
`_work_units/`. Production delegated work SHALL use bundle-root `_work_units/`
as its work-unit runtime tree. Bundle-root `_work_units/_index.json` SHALL be
Engine-owned allocation and attempt-state truth, while submitted delegated
output coverage SHALL remain in bundle-root `rb_output_declarations.jsonl`.

Run-scoped helper scripts — one-shot work-unit executors, reference/seed
generators, and recovery scripts that serve only the current run bundle — SHALL
be written under the current run bundle root `_scripts/` so they travel with
the bundle and never become repository-root or Harness-root files. `_scripts/`
is a non-authority runtime area in the same class as `_logs/` and `_cache/`:
its contents are Agent-produced execution aids that never establish gate,
evidence, provenance, receipt, or lifecycle authority, and its presence or
contents SHALL NOT be part of any gate or inspect-bundle required-shape check.
The repository root and `DEEP_RESEARCH_HARNESS/` SHALL NOT be used as the
location for run-scoped helper scripts.

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

#### Scenario: Run-scoped scripts live under the bundle root

- **WHEN** an Agent writes a work-unit executor, reference generator, or
  recovery script during a run
- **THEN** the script SHALL be written under `<current-run-bundle-root>/_scripts/`
- **AND** it SHALL NOT be written to the repository root or
  `DEEP_RESEARCH_HARNESS/`
- **AND** `_scripts/` contents SHALL NOT count as gate, evidence, provenance,
  or lifecycle authority

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
  `reference/`, `artifacts/`, `_cache/`, `_logs/`, `_scripts/`, `_work_units/`,
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
