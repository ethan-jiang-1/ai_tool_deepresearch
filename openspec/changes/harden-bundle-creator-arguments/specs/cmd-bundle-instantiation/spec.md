> req: CMI-008

## ADDED Requirements

### Requirement: Production bundle creator SHALL reject invalid invocation before filesystem side effects

`DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs` SHALL parse its complete argv before resolving a repo root, creating a target directory, reading/writing templates, creating trace/log files, or invoking bundle validation. Its accepted invocation shape is `instantiate-run-bundle.mjs <name> [--target-dir <dir>|--target-dir=<dir>]`; it SHALL accept exactly one positional name and only the declared options. The parser SHALL also recognize `--force` solely to preserve its existing explicit no-overwrite rejection; it is not a successful invocation option. `--help` SHALL print usage and exit 0 without filesystem side effects, including when another option or target directory is present.

The production `<name>` SHALL match `^[a-z0-9][a-z0-9-]*$`. A flag token, unknown option, missing option value, additional positional, empty/whitespace name, or name containing a path separator, traversal segment, leading `-`, underscore, or another disallowed character SHALL fail before any filesystem side effect, with nonzero exit and one diagnostic that names the accepted invocation or name shape. The creator SHALL not normalize an invalid name into a new production identity.

After successful parsing and validation, existing production collision/no-overwrite, schema, trace/log, validation and inspection behavior SHALL remain unchanged. A successful bundle SHALL remain a direct child of the explicit `--target-dir` when supplied, otherwise of repo root. `--force` SHALL remain rejected before bundle mutation.

#### Scenario: Help is safe before target creation

- **WHEN** `instantiate-run-bundle.mjs --help` is invoked, including with a `--target-dir` whose path does not yet exist
- **THEN** the creator SHALL print usage, exit 0, and create neither that target directory nor a `dpt_rb_*` bundle, trace, log, or control file

#### Scenario: Invalid production name cannot create a bundle

- **WHEN** the only positional name is `--help`, `bad name`, `../escape`, `-leading`, or contains an underscore
- **THEN** the creator SHALL exit nonzero before target/bundle creation
- **AND** its diagnostic SHALL name the accepted production name shape or invocation usage

#### Scenario: Malformed option fails before mutation

- **WHEN** a caller supplies an unknown option, a `--target-dir` without a value, or more than one positional name
- **THEN** the creator SHALL exit nonzero before writing any filesystem surface
- **AND** the caller can correct the same command to its accepted invocation shape and retry

#### Scenario: Legal production invocation preserves direct-child creation

- **WHEN** a legal kebab-case name and explicit target directory are supplied
- **THEN** the creator SHALL preserve its existing successful production bundle creation behavior
- **AND** the emitted bundle path SHALL be a direct child of that target directory

#### Scenario: Force remains forbidden

- **WHEN** a caller supplies `--force` to the production creator
- **THEN** it SHALL return the existing no-overwrite rejection before bundle mutation
