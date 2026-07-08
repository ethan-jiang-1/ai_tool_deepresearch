> req: QIV-005

## ADDED Requirements

### Requirement: Queue and work-unit runtime CLIs SHALL reject help and suspicious bundle arguments before side effects

`operate-queue.mjs` and `operate-work-unit.mjs` SHALL handle help flags and suspicious bundle arguments before any runtime side effect. A runtime side effect includes creating bundle-like directories, creating `_logs/`, reading or mutating `rb_queue.json`, reading or mutating `_work_units/`, appending trace/log files, or writing diagnostic artifacts.

Top-level `--help` or `-h` SHALL print usage and exit 0. Subcommand help such as `operate-queue enqueue --help` or `operate-work-unit claim --help` SHALL print usage or a clear argument error matching that CLI's local error-output convention, but SHALL NOT treat the help token as a bundle path. Any positional bundle value that begins with `-` SHALL be rejected before runtime load unless a future explicit path-escape syntax is specified by a separate change. This change SHALL NOT introduce a new `--bundle` alias for these positional-bundle CLIs.

#### Scenario: top-level help has no runtime side effect

- **WHEN** `node DPT_FRAMEWORK/cli/operate-queue.mjs --help` is invoked
- **OR** `node DPT_FRAMEWORK/cli/operate-work-unit.mjs --help` is invoked
- **THEN** the CLI SHALL print usage and exit 0
- **AND** it SHALL NOT create a `--help/` directory or any bundle-like runtime files

#### Scenario: subcommand help is not treated as bundle path

- **WHEN** `node DPT_FRAMEWORK/cli/operate-queue.mjs enqueue --help` is invoked
- **OR** `node DPT_FRAMEWORK/cli/operate-work-unit.mjs claim --help` is invoked
- **THEN** the CLI SHALL print usage or a clear argument error matching its local convention
- **AND** it SHALL NOT load queue/work-unit state from `--help`
- **AND** it SHALL NOT create a `--help/` directory

#### Scenario: suspicious bundle positional is rejected early

- **WHEN** `operate-queue` or `operate-work-unit` receives a bundle positional value beginning with `-`
- **THEN** the CLI SHALL reject the invocation before loading queue, trace, log, or work-unit state
- **AND** the rejection SHALL identify the suspicious bundle argument

#### Scenario: unsupported bundle flag form has no side effect

- **WHEN** `operate-queue` or `operate-work-unit` receives an unsupported flag-shaped bundle form such as `--bundle --help`
- **THEN** the CLI SHALL reject the invocation or print usage before runtime side effects
- **AND** it SHALL NOT create directories or files named `--bundle`, `--help`, or another flag-shaped token
- **AND** it SHALL NOT add a new `--bundle` alias as part of this change

#### Scenario: valid bundle invocation is unchanged

- **WHEN** `operate-queue` or `operate-work-unit` receives a valid explicit bundle path and valid subcommand arguments
- **THEN** the CLI SHALL continue to execute the existing queue or work-unit operation
- **AND** the help/suspicious-argument guard SHALL NOT weaken existing schema, bundle identity, or queue validation
