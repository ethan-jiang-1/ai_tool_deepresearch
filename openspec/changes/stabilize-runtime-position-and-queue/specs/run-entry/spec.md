## MODIFIED Requirements

> req: RUE-001

### Requirement: Entry point announces version

The RUN.md entry point SHALL display the framework version as a banner immediately after the title, before any behavioral instructions.

The version banner format SHALL be `> **DPT_FRAMEWORK v<major>.<minor>**`. The concrete version in this banner SHALL match the latest repo-root `CHANGELOG.md` entry as required by `version-management` VEM-003; this requirement SHALL NOT hardcode an obsolete version after a version-management change has advanced the framework version.

#### Scenario: Agent reads RUN.md and sees current version

- **WHEN** an agent reads `DPT_FRAMEWORK/RUN.md`
- **THEN** the first content after the title is a blockquote banner in the format `DPT_FRAMEWORK v<major>.<minor>`
- **AND** for this change's apply target, the banner SHALL state `DPT_FRAMEWORK v0.6`
- **AND** the banner appears before the trigger-context blockquote and before Section 0
