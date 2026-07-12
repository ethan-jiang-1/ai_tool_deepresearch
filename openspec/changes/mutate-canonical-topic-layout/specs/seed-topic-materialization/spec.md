> req: STM-008

## ADDED Requirements

### Requirement: Seed projection SHALL follow committed current topic layout

After successful layout mutation, every remaining canonical topic SHALL have exactly one UID-bound `seed_topics/<current-slug>.md` projection with current id/slug/title and unchanged semantic intent unless the explicit layout target changed title. Previous seed filenames SHALL not remain as aliases. Safe remove MAY delete only the seed of a topic already proven to have no durable history or dependency.

A generated new current seed path SHALL be created only when absent or when it is the same UID's existing current seed path being replaced. An unexplained existing target SHALL block rather than be adopted or overwritten.

#### Scenario: Renumber replaces and rebinds seed
- **WHEN** a topic keeps its UID but receives a new ordinal slug
- **THEN** recovery SHALL leave one seed at the current path with matching current metadata
- **AND** no old-path seed alias SHALL remain

#### Scenario: Seed replacement crash exposes exact recovery
- **WHEN** the process stops after the new current seed is written but before registry replacement or old-seed cleanup
- **THEN** topic-state inspect SHALL report the accepted workspace and exact recover command
- **AND** seed/gate checks SHALL short-circuit downstream mismatch noise

#### Scenario: Orphan target seed is not overwritten
- **WHEN** the target current seed filename already exists without binding to the same UID's current projection
- **THEN** layout apply SHALL reject before prepared publication and preserve that file
