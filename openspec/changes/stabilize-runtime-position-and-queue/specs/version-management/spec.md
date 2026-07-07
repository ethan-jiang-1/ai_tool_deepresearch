## MODIFIED Requirements

> req: VEM-001

### Requirement: CHANGELOG is concise and human-readable

The project SHALL maintain a `CHANGELOG.md` file at the repository root as the framework version-history source of truth for DPT_FRAMEWORK behavior and Agent-facing framework contracts.

CHANGELOG entries SHALL be written for humans scanning version history. Each entry SHALL consist of a version header and a short summary of what changed. Verbose capability lists, file enumerations, requirement IDs, and implementation details SHALL NOT appear in CHANGELOG — those belong in OpenSpec change artifacts.

`DPT_FRAMEWORK/CHANGELOG.md` SHALL NOT be retained as a separate version-history authority. If a stale copy exists under `DPT_FRAMEWORK/`, this change SHALL remove it rather than update both files.

#### Scenario: Root changelog is the version source

- **WHEN** a developer looks for DPT_FRAMEWORK version history
- **THEN** repo-root `CHANGELOG.md` exists
- **AND** its latest entry is the source used by the `DPT_FRAMEWORK/RUN.md` version banner

#### Scenario: Stale framework-local changelog is removed

- **WHEN** the repository contains a stale `DPT_FRAMEWORK/CHANGELOG.md`
- **THEN** the stale framework-local changelog SHALL be removed during apply
- **AND** version history SHALL remain in repo-root `CHANGELOG.md`

#### Scenario: Changelog entry is concise

- **WHEN** a developer reads any DPT_FRAMEWORK changelog entry
- **THEN** the entry consists of the version header and one to two concise bullets or lines summarizing what changed
- **AND** does not enumerate files, requirement IDs, or implementation details

> req: VEM-002

### Requirement: Every behavior change updates CHANGELOG

Every OpenSpec change that modifies `DPT_FRAMEWORK/` behavior SHALL include a repo-root `CHANGELOG.md` update step in its `tasks.md`. The CHANGELOG entry SHALL use the version number decided during the change's proposal phase.

The project OpenSpec guidance in `openspec/config.yaml` SHALL surface this rule in its tasks guidance so future behavior changes encounter it during planning.

#### Scenario: Behavior change includes changelog task

- **WHEN** an OpenSpec change modifies `DPT_FRAMEWORK/` behavior
- **THEN** its `tasks.md` SHALL include a step to update repo-root `CHANGELOG.md`
- **AND** the step SHALL reference the version number from the proposal
- **AND** `openspec/config.yaml` SHALL remind authors to include this step

> req: VEM-003

### Requirement: RUN.md banner matches CHANGELOG

The version banner in `DPT_FRAMEWORK/RUN.md` SHALL match the latest version entry in repo-root `CHANGELOG.md`. When repo-root `CHANGELOG.md` is updated, the RUN.md banner SHALL be updated in the same change.

#### Scenario: Version consistency after changelog update

- **WHEN** a change adds a new version entry to repo-root `CHANGELOG.md`
- **THEN** `DPT_FRAMEWORK/RUN.md` SHALL display the same version in its banner
- **AND** both SHALL be updated as part of the same change's implementation

> req: VEM-004

### Requirement: Version number decided at proposal time

The version number for a change SHALL be decided during the proposal phase, not applied ad-hoc at implementation time. The proposal SHALL state whether a version bump is required and, when required, the target version number.

For this change, the proposal-declared target version SHALL be `v0.6`; apply tasks SHALL use that value for repo-root `CHANGELOG.md` and the `DPT_FRAMEWORK/RUN.md` banner.

#### Scenario: Proposal declares this change's target version

- **WHEN** this change is applied
- **THEN** repo-root `CHANGELOG.md` SHALL receive a `v0.6` entry
- **AND** `DPT_FRAMEWORK/RUN.md` SHALL display `DPT_FRAMEWORK v0.6`
- **AND** implementation SHALL NOT choose a different version number ad-hoc
