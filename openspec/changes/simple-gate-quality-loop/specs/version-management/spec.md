## MODIFIED Requirements

> req: VEM-002, VEM-003, VEM-004

### Requirement: Version number decided at proposal time

The version number for a change SHALL be decided during the proposal phase, not applied ad-hoc at implementation time. The proposal SHALL state the target version number.

The project OpenSpec guidance in `openspec/config.yaml` SHALL surface this rule in its proposal guidance.

For this change, the proposal-declared target version SHALL be `v0.7`; apply tasks SHALL use that value for repo-root `CHANGELOG.md` and the `DPT_FRAMEWORK/RUN.md` banner.

#### Scenario: Proposal declares version

- **WHEN** a change proposes modifications to `DPT_FRAMEWORK/` behavior
- **THEN** the proposal SHALL state whether a version bump is required
- **AND** if required, SHALL declare the target version number
- **AND** `openspec/config.yaml` SHALL remind authors to make that decision during proposal

#### Scenario: This change uses v0.7

- **WHEN** this change is applied
- **THEN** repo-root `CHANGELOG.md` SHALL receive a `v0.7` entry
- **AND** `DPT_FRAMEWORK/RUN.md` SHALL display `DPT_FRAMEWORK v0.7`
- **AND** implementation SHALL NOT choose a different version number ad-hoc

