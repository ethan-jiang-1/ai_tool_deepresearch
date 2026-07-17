> req: VEM-004

## MODIFIED Requirements

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
