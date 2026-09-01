> req: RRM-007

## MODIFIED Requirements

### Requirement: Template and command guidance SHALL preserve separate Seed Topic questions

> req: RRM-008

Wave phase docs SHALL direct the Phase Agent to use the current-round return-map entries derived from submitted authority, referencing the owning inspection contract (RRM-006/007). The superseded per-wave `hasBackfillToken` behaviour and the `inspectSeedTopicReturnMaps` mapping entry point SHALL be retired: their behaviour is realized by the current return-map entry points.

#### Scenario: per-wave backfill token behaviour

- **WHEN** the phase doc teaches backfill token handling
- **THEN** the guidance SHALL defer to RRM-006/007 for the behavioural truth
- **AND** the scenario title is retained only as the OpenSpec delta-sync key

#### Scenario: Template answers the document-level question without owning mutation

- **WHEN** the phase doc describes the Seed Topic template's role
- **THEN** the guidance SHALL defer to RRM-008 for the behavioural truth

#### Scenario: A visible card constrains a backfill without becoming content

- **WHEN** the phase doc teaches backfill card handling
- **THEN** the guidance SHALL defer to RRM-008 for the behavioural truth

#### Scenario: Concise actor cue remains permitted

- **WHEN** the phase doc teaches concise actor cues for seed topics
- **THEN** the guidance SHALL defer to RRM-008 for the behavioural truth

#### Scenario: Command guidance preserves the legal repair boundary

- **WHEN** the phase doc teaches repair boundary for seed topics
- **THEN** the guidance SHALL defer to RRM-008 for the behavioural truth
