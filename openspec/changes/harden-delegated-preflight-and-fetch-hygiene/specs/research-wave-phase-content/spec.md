> req: RWP-017

## ADDED Requirements

### Requirement: Wave0 and Wave1 fetch targets SHALL follow profile floors plus conservative margin

Wave0 and Wave1 phase guidance SHALL derive delegated fetch/source candidate targets from explicit profile/runtime floors plus a conservative small margin. The margin exists to absorb duplicates, inaccessible pages, and non-countable sources; it SHALL NOT change gate thresholds, reduce required coverage, or become a hidden quality override.

Wave0 guidance SHALL bind source-intake target planning to explicit `rb_profile.yaml#/research_style_params` Wave0 floors, including per-topic source floor and shared-reference target surfaces where relevant. Wave1 guidance SHALL bind topic-deepening target planning to explicit Wave1 floors and new-source floor semantics, including `wave1_per_topic_ref_floor` and `topic_unique_ratio` where the depth-review contract uses them.

Active Wave0/Wave1 phase docs SHALL NOT instruct Agents to use fixed hard-coded fetch aims unless the number is explicitly derived from the active profile/runtime floor plus a named margin. The margin SHALL remain a planning heuristic, not a new profile field, gate parameter, quality threshold, or hidden over-fetch policy. If later gate/inspect feedback shows a gap, repair SHALL use supplementary work units rather than relying on hidden over-fetching.

#### Scenario: Wave0 target reads profile floor

- **WHEN** the Phase Agent prepares Wave0 source intake
- **THEN** phase guidance SHALL tell it to read the explicit Wave0 profile floors
- **AND** initial candidate targets SHALL be described as floor plus conservative margin, not as a fixed unbound aim

#### Scenario: Wave1 target reads profile and novelty floor semantics

- **WHEN** the Phase Agent prepares Wave1 topic deepening
- **THEN** phase guidance SHALL tell it to read `wave1_per_topic_ref_floor`, `topic_unique_ratio`, and depth-review new-source floor semantics
- **AND** initial candidate targets SHALL be described as floor plus conservative margin

#### Scenario: hard-coded over-fetch aim is rejected

- **WHEN** active Wave0/Wave1 phase or Sub-agent guidance says to fetch a fixed number of URLs
- **AND** that number is not tied to explicit profile/runtime floor plus margin derivation
- **THEN** static tests or hygiene SHALL fail
- **AND** diagnostics SHALL require profile-bound floor+margin wording

#### Scenario: margin is not promoted into a new threshold

- **WHEN** phase guidance explains the conservative small margin
- **THEN** it SHALL describe the margin as a default planning buffer for duplicates, inaccessible pages, and non-countable sources
- **AND** it SHALL NOT define a new numeric gate threshold or profile parameter

#### Scenario: gate repair still uses supplementary work units

- **WHEN** formal gate or inspect feedback reports that floor coverage is still short after initial delegated work
- **THEN** phase guidance SHALL route repair through supplementary work-unit queue demand
- **AND** it SHALL NOT silently lower floors or treat the margin as pass authority
