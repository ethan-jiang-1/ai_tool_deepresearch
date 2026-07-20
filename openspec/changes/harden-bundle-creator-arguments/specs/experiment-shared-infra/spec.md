> req: EXS-003

## ADDED Requirements

### Requirement: Disposable bundle creator SHALL reject invalid invocation before filesystem side effects

`experiments_env/shared/new-disposable-bundle.mjs` SHALL parse its complete argv before resolving a repo root, creating a target directory, reading/writing templates, creating trace/log files, copying nodes, or invoking bundle validation. Its accepted invocation shape is `new-disposable-bundle.mjs <name> [--case <id>|--case=<id>] [--nodes <dir>|--nodes=<dir>] [--target-dir <dir>|--target-dir=<dir>] [--force]`; it SHALL accept exactly one positional name and only those declared options. `--help` SHALL print usage and exit 0 without filesystem side effects, including when another option or target directory is present.

The disposable `<name>` and an optional `<id>` used in the generated directory name SHALL each match `^[a-z0-9][a-z0-9_-]*$`. A flag token, unknown option, missing option value, additional positional, empty/whitespace value, or name/case containing a path separator, traversal segment, leading `-`, or another disallowed character SHALL fail before any filesystem side effect, with nonzero exit and one diagnostic that names the accepted invocation or name shape. Existing trailing-underscore normalization and random hex collision suffix behavior MAY remain, but SHALL not turn an invalid input into an accepted identity.

After successful parsing and validation, existing case composition, node-copy, explicit target, collision and disposable `--force` behavior SHALL remain unchanged. A successful disposable bundle SHALL remain a direct child of the explicit `--target-dir` when supplied, otherwise of repo root, and its final basename SHALL satisfy the existing disposable naming grammar.

#### Scenario: Help is safe before target creation

- **WHEN** `new-disposable-bundle.mjs --help` is invoked, including with a `--target-dir` whose path does not yet exist
- **THEN** the creator SHALL print usage, exit 0, and create neither that target directory nor a `dpt_disp_*` bundle, trace, log, control file, or copied node

#### Scenario: Flag or unsafe disposable input cannot create a bundle

- **WHEN** the positional name or `--case` value is `--help`, `bad name`, `../escape`, or another value outside the disposable segment grammar
- **THEN** the creator SHALL exit nonzero before target/bundle creation
- **AND** its diagnostic SHALL name the accepted disposable name shape or invocation usage

#### Scenario: Malformed disposable option fails before mutation

- **WHEN** a caller supplies an unknown option, a value-taking option without a value, or more than one positional name
- **THEN** the creator SHALL exit nonzero before writing any filesystem surface
- **AND** the caller can correct the same command to its accepted invocation shape and retry

#### Scenario: Legal disposable invocation preserves case-target behavior

- **WHEN** a legal name, legal case id, and explicit target directory are supplied
- **THEN** the creator SHALL preserve its existing successful case-scoped disposable bundle creation behavior
- **AND** the emitted bundle path SHALL be a direct child of that target directory and satisfy the disposable bundle naming grammar

#### Scenario: Valid disposable force remains available

- **WHEN** a legal disposable invocation targets an existing generated bundle and supplies `--force`
- **THEN** the creator SHALL preserve its existing disposable overwrite behavior after argv/name validation succeeds
