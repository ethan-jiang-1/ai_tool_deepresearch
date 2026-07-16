## ADDED Requirements

### Requirement: rb_plan template SHALL stamp the framework version at bundle creation

> req: CMI-007

Bundle instantiation templates SHALL stamp `framework_version` into `rb_plan.md` frontmatter at bundle creation, alongside the existing `topic_registry_version` schema stamp. The value SHALL be the current framework version, sourced from the latest `CHANGELOG.md` version entry — the version-history source of truth established by `version-management` (VEM-001) — so that a bundle records the irreplaceable fact of which framework version created it.

The `framework_version` field SHALL NOT introduce a competing version-string authority; it records a creation-time fact derived from the single CHANGELOG authority.

Any code path that rewrites `rb_plan.md` after creation (for example a rerun `add_topic` appending to `topic_registry`) SHALL preserve the existing `framework_version`.

#### Scenario: A newly created bundle stamps the current framework version

- **WHEN** `instantiate-run-bundle` creates a bundle under framework v0.30
- **THEN** `rb_plan.md` frontmatter SHALL contain `framework_version` set to v0.30, next to `topic_registry_version`
- **AND** that value SHALL equal the latest `CHANGELOG.md` version entry

#### Scenario: Rerun topic addition preserves the creation stamp

- **WHEN** a rerun `add_topic` rewrites `rb_plan.md` to append a topic to `topic_registry`
- **THEN** the pre-existing `framework_version` SHALL remain unchanged
- **AND** it SHALL still reflect the framework version the bundle was originally created under

#### Scenario: The stamp does not create a second version authority

- **WHEN** a developer looks for the framework version string
- **THEN** the bundle stamp and the RUN.md banner SHALL both derive from the same CHANGELOG authority
- **AND** no competing framework-version constant SHALL be introduced by this requirement
