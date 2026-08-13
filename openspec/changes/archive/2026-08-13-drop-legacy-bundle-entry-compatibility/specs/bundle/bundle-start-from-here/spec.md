# bundle-start-from-here (delta)

Note: `BUS-001` through `BUS-003` are retired in the requirement registry.
This delta retires the whole current capability and intentionally does not
redeclare retired IDs in its header.

## REMOVED Requirements

### Requirement: START_FROM_HERE.md legacy boot-entry behavior is deprecated

**Reason**: A retained current-spec tombstone that permits diagnostic operation
on an incomplete legacy entry shape contradicts the selected current-entry
contract. `START_FROM_HERE.md` is historical Markdown, not a current Harness
entry, map, or diagnostic success path.

**Migration**: Delete `openspec/specs/bundle/bundle-start-from-here/` and its
catalog row during Apply. Retain `BUS-001` through `BUS-003` as deprecated
registry history with a retired no-spec-directory prefix. Humans may directly
open historical Markdown; current operational readers require the
`BUNDLE_ENTRY.md` + `BUNDLE_MAP.md` pair and otherwise reject without
migration.

#### Scenario: Legacy boot-entry capability no longer appears as current

- **WHEN** Apply retires this whole capability
- **THEN** `openspec/specs/bundle/bundle-start-from-here/spec.md` SHALL NOT
  exist
- **AND** the accepted capability catalog SHALL have no
  `bundle/bundle-start-from-here` row
- **AND** `BUS-001` through `BUS-003` SHALL remain deprecated registry history

### Requirement: Legacy boot-entry stop authorization behavior is retired

**Reason**: This retired requirement is solely a historical guard around the
same obsolete entry capability. Current stop authority is already owned by
lifecycle phase/shared Markdown, command guidance, status, trace, and Engine
checks; keeping this requirement as a current capability creates noise.

**Migration**: Use the active lifecycle and command capability owners for stop
authorization. Do not restore a legacy entry compatibility route.

#### Scenario: Current stop authority remains outside legacy entry history

- **WHEN** an Agent needs stop authorization guidance after this retirement
- **THEN** it SHALL use the active lifecycle/command and deterministic owners
- **AND** it SHALL NOT treat a retired BUS capability as current guidance

### Requirement: Legacy current_node resume guidance is superseded

**Reason**: `current_node` remains a current runtime coordinate, but the
legacy-file-specific requirement does not. Its retained fallback creates a
second, obsolete operational route.

**Migration**: Use active `agent-command-surface`, `bundle-map`, and
`runtime-reentry-debuggability` requirements for current-pair routing,
`current_node`, trace, and reentry guidance. No migration is offered to a
legacy-only directory.

#### Scenario: Current reentry guidance has active owners

- **WHEN** an Agent needs current reentry guidance after this retirement
- **THEN** it SHALL use the active current-pair, status, trace, and reentry
  owners
- **AND** it SHALL NOT use a legacy boot-entry capability or fallback
