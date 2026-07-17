> req: VEM-001, VEM-002, VEM-003, VEM-004

## Purpose

定义 DPT_FRAMEWORK 项目的版本管理规范：CHANGELOG 格式与位置、版本号决定时机、每次行为变更的 CHANGELOG 强制更新、以及 RUN.md 版本横幅与 CHANGELOG 的一致性约束。
## Requirements
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

The version number for a change SHALL be decided during the proposal phase, not applied ad-hoc at implementation time. A proposal that modifies `DPT_FRAMEWORK/` behavior SHALL state whether a version bump is required and, when required, declare one target version. Apply tasks SHALL use that declared value for repo-root `CHANGELOG.md` and the `DPT_FRAMEWORK/RUN.md` banner.

Accepted requirements SHALL describe this stable rule without pinning a historical change's concrete version as the permanent current version. The concrete target remains in that change's proposal/tasks and, after archive, its historical artifacts and changelog entry.

The project OpenSpec guidance in `openspec/config.yaml` SHALL surface this rule in its proposal guidance.

#### Scenario: Proposal declares version

- **WHEN** a change proposes modifications to `DPT_FRAMEWORK/` behavior
- **THEN** its proposal SHALL state whether a version bump is required
- **AND** if required, the proposal SHALL declare the target version before apply
- **AND** implementation SHALL use the same target for `CHANGELOG.md` and the RUN banner
- **AND** `openspec/config.yaml` SHALL remind proposal authors to make that decision before apply

#### Scenario: This change uses v0.7

> **@deprecated name** — Retained as the historical scenario anchor; the stable requirement no longer pins any past version as current.

- **WHEN** a behavior change with a proposal-declared target version is applied
- **THEN** repo-root `CHANGELOG.md` SHALL receive that declared target
- **AND** `DPT_FRAMEWORK/RUN.md` SHALL display the same target
- **AND** implementation SHALL NOT select a different version ad hoc
