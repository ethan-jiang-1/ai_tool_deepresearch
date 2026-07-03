> req: VEM-001, VEM-002, VEM-003, VEM-004

## ADDED Requirements

### Requirement: CHANGELOG is concise and human-readable

The project SHALL maintain a `CHANGELOG.md` file at the repository root as the project-level source of truth for version history.

CHANGELOG entries SHALL be written for humans scanning version history. Each entry SHALL consist of a version header and a short summary of what changed. Verbose capability lists, file enumerations, requirement IDs, and implementation details SHALL NOT appear in CHANGELOG — those belong in OpenSpec change artifacts.

#### Scenario: Changelog entry is concise
- **WHEN** a developer reads any CHANGELOG entry
- **THEN** the entry consists of the version header and one to two lines summarizing what changed
- **AND** does not enumerate files, requirement IDs, or implementation details

#### Scenario: Changelog is project root
- **WHEN** a developer looks for version history
- **THEN** `CHANGELOG.md` exists at the repository root
- **AND** is not buried inside `DPT_FRAMEWORK/` or another subdirectory

### Requirement: Every behavior change updates CHANGELOG

Every OpenSpec change that modifies `DPT_FRAMEWORK/` behavior SHALL include a CHANGELOG update step in its `tasks.md`. The CHANGELOG entry SHALL use the version number decided during the change's proposal phase.

The project OpenSpec guidance in `openspec/config.yaml` SHALL surface this rule in its tasks guidance so future behavior changes encounter it during planning.

#### Scenario: Behavior change includes changelog task
- **WHEN** an OpenSpec change modifies `DPT_FRAMEWORK/` behavior
- **THEN** its `tasks.md` SHALL include a step to update `CHANGELOG.md`
- **AND** the step SHALL reference the version number from the proposal
- **AND** `openspec/config.yaml` SHALL remind authors to include this step

#### Scenario: Non-behavior change skips changelog
- **WHEN** a change only touches tests, docs, or OpenSpec artifacts without modifying `DPT_FRAMEWORK/` behavior
- **THEN** a CHANGELOG update is optional

### Requirement: RUN.md banner matches CHANGELOG

The version banner in `DPT_FRAMEWORK/RUN.md` SHALL match the latest version entry in `CHANGELOG.md`. When `CHANGELOG.md` is updated, the RUN.md banner SHALL be updated in the same change.

#### Scenario: Version consistency after changelog update
- **WHEN** a change adds a new version entry to `CHANGELOG.md`
- **THEN** `DPT_FRAMEWORK/RUN.md` SHALL display the same version in its banner
- **AND** both SHALL be updated as part of the same change's implementation

### Requirement: Version number decided at proposal time

The version number for a change SHALL be decided during the proposal phase, not applied ad-hoc at implementation time. The proposal SHALL state the target version number.

The project OpenSpec guidance in `openspec/config.yaml` SHALL surface this rule in its proposal guidance.

#### Scenario: Proposal declares version
- **WHEN** a change proposes modifications to `DPT_FRAMEWORK/` behavior
- **THEN** the proposal SHALL state whether a version bump is required
- **AND** if required, SHALL declare the target version number
- **AND** `openspec/config.yaml` SHALL remind authors to make that decision during proposal
