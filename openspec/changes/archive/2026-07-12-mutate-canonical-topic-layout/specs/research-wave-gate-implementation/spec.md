> req: RWG-019

## ADDED Requirements

### Requirement: Wave gates SHALL aggregate accepted topic layouts by UID

For each canonical topic UID, Wave0 and Wave1 gate evaluators SHALL use the shared resolver's bounded current-plus-previous slug set when locating submitted artifact/reference coverage. Historical files SHALL remain at recorded paths and SHALL count only when existing submitted provenance authority binds them to the same UID. Current seed checks and new work eligibility SHALL continue to use only the current slug.

Accepted slugs SHALL be alternatives for one UID, not separate mandatory targets. Per-topic floors SHALL evaluate aggregate submitted coverage across the UID's accepted slugs and SHALL NOT require one file per historical alias. The same physical file or submitted row SHALL count at most once for one UID. A previous slug SHALL NOT create a new topic, satisfy another UID or grant authority without existing submitted coverage.

#### Scenario: Renamed topic retains historical wave coverage
- **WHEN** a topic's submitted Wave1 outputs remain under a unique previous slug after canonical rename
- **THEN** the Wave1 gate SHALL attribute those outputs to the same UID without requiring file moves or ledger rewrites

#### Scenario: New rerun output uses current slug
- **WHEN** new work is enqueued after layout mutation
- **THEN** its required output paths SHALL use the current slug while historical coverage remains readable under previous slugs

#### Scenario: Duplicate match counts once
- **WHEN** one submitted output is discoverable through more than one accepted-layout check
- **THEN** gate counting SHALL deduplicate it by existing provenance identity

#### Scenario: Previous aliases are not extra floors
- **WHEN** one UID has several previous slugs but valid submitted coverage under only one accepted slug
- **THEN** a one-per-topic rule SHALL evaluate the UID aggregate rather than require coverage for every alias
