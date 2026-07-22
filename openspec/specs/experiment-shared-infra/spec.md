# Experiment Shared Infrastructure

> req: EXS-001, EXS-002, EXS-003, EXS-004

## Purpose

Define the shared experiment infrastructure directory `experiments_env/shared/` for tools that support experiment setup and execution but are NOT needed by production run bundles. This directory is the canonical location for experiment-scoped utilities shared across multiple experiment families.
## Requirements
### Requirement: Experiment shared infrastructure directory

The system SHALL provide a directory `experiments_env/shared/` for experiment-scoped shared infrastructure. Tools in this directory SHALL be importable by command experiment playbooks and experiment prototype code. Production run bundle code SHALL NOT import from this directory.

#### Scenario: Directory exists and is importable

- **WHEN** an experiment playbook inline script needs shared infrastructure
- **THEN** it SHALL import from `../experiments_env/shared/<tool>.mjs`

#### Scenario: Production code does not depend on experiment shared

- **WHEN** a production run bundle or `DPT_FRAMEWORK/` module runs
- **THEN** it SHALL NOT import from `experiments_env/shared/`

### Requirement: Disposable bundle creation tool

The disposable bundle creation script SHALL reside at `experiments_env/shared/new-disposable-bundle.mjs`. It SHALL create `dpt_disp_*` directories with Zod-validated control files using the same schemas as production bundles. Its generated basename SHALL be `dpt_disp_<name>_<hex>` without `--case`, or `dpt_disp_case-<digits>_<name>_<hex>` with `--case`; `<hex>` is the creator's random collision suffix. It SHALL accept:

- Required positional argument: bundle name suffix
- `--nodes=<dir>`: copy node MD files from a prototype's nodes directory into the bundle
- `--force`: overwrite the generated bundle directory selected for this invocation

#### Scenario: Create disposable bundle with nodes

- **WHEN** `node experiments_env/shared/new-disposable-bundle.mjs agq_simple --nodes=experiments_env/prototype-agentic-queue/nodes-agentic-queue --force` is executed
- **THEN** a directory matching `dpt_disp_agq_simple_<hex>/` SHALL be created at repo root
- **AND** it SHALL contain all standard bundle control files (`rb_status.json`, `rb_queue.json`, `rb_profile.yaml`, `rb_plan.md`, `rb_trace.jsonl`, `BUNDLE_MAP.md`)
- **AND** the control files SHALL pass `validate-bundle.mjs` and `inspect-bundle.mjs`
- **AND** node MD files from the `--nodes` source SHALL be copied into the bundle

#### Scenario: Overwrite existing bundle with --force

- **WHEN** the generated disposable bundle directory selected for an invocation already exists and `--force` is passed
- **THEN** that existing directory SHALL be removed and recreated without error

#### Scenario: Playbook Step 1 uses new path

- **WHEN** any command experiment playbook runs Step 1 (bundle creation)
- **THEN** it SHALL invoke `experiments_env/shared/new-disposable-bundle.mjs` (not `DPT_FRAMEWORK/command_experiments_env/scripts/new-disposable-bundle.mjs`)

### Requirement: Disposable bundle creator SHALL reject invalid invocation before filesystem side effects

`experiments_env/shared/new-disposable-bundle.mjs` SHALL parse its complete argv before resolving a repo root, creating a target directory, reading/writing templates, creating trace/log files, copying nodes, or invoking bundle validation. Its accepted invocation shape is `new-disposable-bundle.mjs <name> [--case <id>|--case=<id>] [--nodes <dir>|--nodes=<dir>] [--target-dir <dir>|--target-dir=<dir>] [--force]`; it SHALL accept exactly one positional name and only those declared options. A standalone `--help` option before any `--` end-of-options delimiter SHALL take precedence over other argv validation, print usage, and exit 0 without filesystem side effects. A `--help` text after that delimiter SHALL remain a positional name and fail the name grammar. Without a preceding help option, every declared option MAY occur at most once across its separated and `=` presentations; unknown, repeated, or missing-valued options SHALL fail before filesystem side effects.

The disposable `<name>` SHALL match `^[a-z0-9][a-z0-9_-]*$`. An optional `--case <id>` SHALL match `^case-[0-9]+$`, the shape used by the existing basename normalization which strips the case prefix before comparing plan/profile identities. A flag token, unknown option, missing option value, additional positional, empty/whitespace value, or name/case containing a path separator, traversal segment, leading `-`, or another disallowed character SHALL fail before any filesystem side effect, with nonzero exit and one diagnostic that names the accepted invocation or name shape. Existing trailing-underscore normalization and random hex collision suffix behavior MAY remain, but SHALL not turn an invalid input into an accepted identity.

After successful parsing and validation, existing case composition, node-copy, explicit target, collision and disposable `--force` behavior SHALL remain unchanged. A successful disposable bundle SHALL remain a direct child of the explicit `--target-dir` when supplied, otherwise of repo root, and its final basename SHALL satisfy the existing disposable naming grammar. `--target-dir` is a location rather than a bundle-name token: when the creator invokes validation or inspection for its derived bundle path, it SHALL pass that path as one direct child-process argument and SHALL NOT interpolate it into a shell command string.

#### Scenario: Help is safe before target creation

- **WHEN** `new-disposable-bundle.mjs --help` is invoked before an end-of-options delimiter, including with an unknown sibling option or a `--target-dir` whose path does not yet exist
- **THEN** the creator SHALL print usage, exit 0, and create neither that target directory nor a `dpt_disp_*` bundle, trace, log, control file, or copied node

#### Scenario: Flag or unsafe disposable input cannot create a bundle

- **WHEN** the positional name or `--case` value is a delimiter-protected `--help`, `bad name`, `../escape`, `case-label`, or another value outside the accepted name/case grammar
- **THEN** the creator SHALL exit nonzero before target/bundle creation
- **AND** its diagnostic SHALL name the accepted disposable name shape or invocation usage

#### Scenario: Malformed disposable option fails before mutation

- **WHEN** a caller supplies an unknown option, a repeated option in any separated/`=` combination, a value-taking option without a value, or more than one positional name without a preceding standalone `--help` option
- **THEN** the creator SHALL exit nonzero before writing any filesystem surface
- **AND** the caller can correct the same command to its accepted invocation shape and retry

#### Scenario: Legal disposable invocation preserves case-target behavior

- **WHEN** a legal name, legal case id, and explicit target directory, including one whose path contains spaces or a double quote, are supplied
- **THEN** the creator SHALL preserve its existing successful case-scoped disposable bundle creation behavior
- **AND** the emitted bundle path SHALL be a direct child of that target directory and satisfy the disposable bundle naming grammar
- **AND** validation and inspection SHALL receive the derived bundle path as its literal child-process argument

#### Scenario: Valid disposable force remains available

- **WHEN** a legal disposable invocation targets an existing generated bundle and supplies `--force`
- **THEN** the creator SHALL preserve its existing disposable overwrite behavior after argv/name validation succeeds

### Requirement: Disposable creator renders shared map navigation coordinates

`experiments_env/shared/new-disposable-bundle.mjs` SHALL render the same
`BUNDLE_MAP.md` framework-root and repo-command-root relative navigation
coordinates as the production creator, calculated from each generated bundle
directory to the actual repository framework source. It SHALL replace every
continuation-card template placeholder used by the shared map.

These coordinates remain static navigation text; disposable bundle creation
does not gain a framework copy, a runtime-state field, or a new verdict.

#### Scenario: Non-sibling disposable target has no unresolved card placeholder

- **WHEN** the disposable creator writes a case bundle beneath an explicit
  non-sibling target directory
- **THEN** its map SHALL contain resolving framework/repo relative coordinates
- **AND** it SHALL contain no unresolved continuation-card placeholder or
  fixed sibling-layout assumption
