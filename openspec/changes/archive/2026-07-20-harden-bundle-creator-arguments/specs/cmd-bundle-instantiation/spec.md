> req: CMI-008

## ADDED Requirements

### Requirement: Production bundle creator SHALL reject invalid invocation before filesystem side effects

`DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs` SHALL parse its complete argv before resolving a repo root, creating a target directory, reading/writing templates, creating trace/log files, or invoking bundle validation. Its accepted invocation shape is `instantiate-run-bundle.mjs <name> [--target-dir <dir>|--target-dir=<dir>]`; it SHALL accept exactly one positional name and only the declared options. The parser SHALL also recognize `--force` solely to preserve its existing explicit no-overwrite rejection; it is not a successful invocation option. A standalone `--help` option before any `--` end-of-options delimiter SHALL take precedence over other argv validation, print usage, and exit 0 without filesystem side effects. A `--help` text after that delimiter SHALL remain a positional name and fail the name grammar. Without a preceding help option, every declared option MAY occur at most once across its separated and `=` presentations; unknown, repeated, or missing-valued options SHALL fail before filesystem side effects.

The production `<name>` SHALL match `^[a-z0-9][a-z0-9-]*$`. A flag token, unknown option, missing option value, additional positional, empty/whitespace name, or name containing a path separator, traversal segment, leading `-`, underscore, or another disallowed character SHALL fail before any filesystem side effect, with nonzero exit and one diagnostic that names the accepted invocation or name shape. The creator SHALL not normalize an invalid name into a new production identity.

After successful parsing and validation, existing production collision/no-overwrite, schema, trace/log, validation and inspection behavior SHALL remain unchanged. A successful bundle SHALL remain a direct child of the explicit `--target-dir` when supplied, otherwise of repo root. `--force` SHALL remain rejected before bundle mutation. `--target-dir` is a location rather than a bundle-name token: when the creator invokes validation or inspection for its derived bundle path, it SHALL pass that path as one direct child-process argument and SHALL NOT interpolate it into a shell command string.

#### Scenario: Help is safe before target creation

- **WHEN** `instantiate-run-bundle.mjs --help` is invoked before an end-of-options delimiter, including with an unknown sibling option or a `--target-dir` whose path does not yet exist
- **THEN** the creator SHALL print usage, exit 0, and create neither that target directory nor a `dpt_rb_*` bundle, trace, log, or control file

#### Scenario: Invalid production name cannot create a bundle

- **WHEN** the only positional name is a delimiter-protected `--help`, `bad name`, `../escape`, `-leading`, or contains an underscore
- **THEN** the creator SHALL exit nonzero before target/bundle creation
- **AND** its diagnostic SHALL name the accepted production name shape or invocation usage

#### Scenario: Malformed option fails before mutation

- **WHEN** a caller supplies an unknown option, a repeated `--target-dir` in any separated/`=` combination, a `--target-dir` without a value, or more than one positional name without a preceding standalone `--help` option
- **THEN** the creator SHALL exit nonzero before writing any filesystem surface
- **AND** the caller can correct the same command to its accepted invocation shape and retry

#### Scenario: Legal production invocation preserves direct-child creation

- **WHEN** a legal kebab-case name and explicit target directory, including one whose path contains spaces or a double quote, are supplied
- **THEN** the creator SHALL preserve its existing successful production bundle creation behavior
- **AND** the emitted bundle path SHALL be a direct child of that target directory
- **AND** validation and inspection SHALL receive the derived bundle path as its literal child-process argument

#### Scenario: Force remains forbidden

- **WHEN** a caller supplies `--force` to the production creator
- **THEN** it SHALL return the existing no-overwrite rejection before bundle mutation
