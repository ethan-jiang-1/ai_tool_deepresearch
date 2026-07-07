## MODIFIED Requirements

> req: VEM-002, VEM-004

### Requirement: Every behavior change updates CHANGELOG

Every OpenSpec change that modifies `DPT_FRAMEWORK/` behavior SHALL include a CHANGELOG update step in its `tasks.md`. The CHANGELOG entry SHALL use the version number decided during the change's proposal phase.

The project OpenSpec guidance in `openspec/config.yaml` SHALL surface this rule in its tasks guidance so future behavior changes encounter it during planning.

This change modifies DPT_FRAMEWORK behavior and Agent-facing framework contracts, so its tasks SHALL update repo-root `CHANGELOG.md` with target version `v0.8` and synchronize `DPT_FRAMEWORK/RUN.md` in the same apply pass.

#### Scenario: Behavior change includes changelog task
- **WHEN** an OpenSpec change modifies `DPT_FRAMEWORK/` behavior
- **THEN** its `tasks.md` SHALL include a step to update `CHANGELOG.md`
- **AND** the step SHALL reference the version number from the proposal
- **AND** `openspec/config.yaml` SHALL remind authors to include this step

#### Scenario: Non-behavior change skips changelog
- **WHEN** a change only touches tests, docs, or OpenSpec artifacts without modifying `DPT_FRAMEWORK/` behavior
- **THEN** a CHANGELOG update is optional

#### Scenario: Restore wave depth change updates v0.8
- **WHEN** `restore-wave-depth-contracts` is applied
- **THEN** `CHANGELOG.md` SHALL receive a concise `v0.8` entry
- **AND** `DPT_FRAMEWORK/RUN.md` SHALL display the same version banner

### Requirement: Version number decided at proposal time

The version number for a change SHALL be decided during the proposal phase, not applied ad-hoc at implementation time. The proposal SHALL state the target version number.

The project OpenSpec guidance in `openspec/config.yaml` SHALL surface this rule in its proposal guidance.

For this change, the proposal-declared target version is `v0.8`.

#### Scenario: Proposal declares version
- **WHEN** a change proposes modifications to `DPT_FRAMEWORK/` behavior
- **THEN** the proposal SHALL state whether a version bump is required
- **AND** if required, SHALL declare the target version number
- **AND** `openspec/config.yaml` SHALL remind authors to make that decision during proposal

#### Scenario: Restore wave depth proposal declares v0.8
- **WHEN** `restore-wave-depth-contracts` enters apply
- **THEN** implementation SHALL use `v0.8` as the target version from proposal
