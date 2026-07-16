> req: RES-001, RES-002

## MODIFIED Requirements

### Requirement: Research style JSON files define per-style parameters

The system SHALL provide one JSON file per research style under `DPT_FRAMEWORK/schema/research-styles/`. Each file SHALL be consumed exclusively by JS (`apply-research-style.mjs` CLI) - Agent and MD SHALL NOT read these files. Adding a new style SHALL require only adding a new JSON file.

Each style file SHALL contain at minimum:
- `user_visible`: boolean
- `wave0_per_topic_source_floor`: positive integer
- `wave0_shared_ref`: object with `base` (non-negative integer) and `per_topic` (non-negative integer) - topic-count-dependent factor; CLI computes absolute `wave0_shared_ref_total`
- `wave1_per_topic_ref_floor`: positive integer
- `topic_unique_ratio`: number in [0, 1]
- `counterexample_search`: boolean
- `cross_verification`: boolean
- `p0p1_independent_backing`: positive integer
- `quality_min_tier`: string (`tier_1` / `tier_2` / `tier_3` / `tier_4`)
- `quality_min_substance`: string (`substantive` / `thin` / `none`)
- `wave2_cross_topic_depth`: non-negative integer - minimum cross-topic connections per topic (0=none, 1=at least 1 per topic, 2=at least 2 per topic with at least 1 contradiction)
- `wave2_emergent_search_rounds`: non-negative integer - rounds of emergent content search per topic, each from a different angle

One side-effect-free `computeResearchStyleParams({ styleDefinition, topicCount })` SHALL be the sole deterministic computation of the complete profile-side parameter object. It SHALL accept a parsed style definition and a non-negative integer canonical topic count, validate the definition fields needed by this requirement, compute `wave0_shared_ref_total = base + per_topic * topicCount`, validate the complete result through the existing `ResearchStyleParamsSchema`, and return only that result. It SHALL perform no file I/O, profile mutation, finding construction, routing, state or trace write.

`apply-research-style.mjs` SHALL remain the sole Agent-facing writer. It SHALL load the selected JSON definition, read committed canonical `rb_plan.md#/topic_registry.length`, call `computeResearchStyleParams`, and write the returned object. The C5 ownership/stage evaluator MAY call the same computation only to decide whether current `research_style_params` are the exact existing-owner projection from the event-bound `research_profile` and current committed canonical registry. C5 SHALL NOT use the current profile to select a different style, write the projection, create a second style authority, or turn this comparison into a general style-freshness Gate.

#### Scenario: JS reads style parameters via CLI
- **WHEN** `apply-research-style.mjs --bundle <path> --style claim_verification` executes
- **THEN** it SHALL read `DPT_FRAMEWORK/schema/research-styles/claim_verification.json`, read `topic_registry` length from `rb_plan.md`, call the shared pure computation, compute `wave0_shared_ref_total = base + per_topic * topic_count`, and write all parameters to `rb_profile.yaml#/research_style_params`

#### Scenario: Agent applies style parameters via CLI
- **WHEN** phase-hitl1.md instructs the Agent to apply a research style
- **THEN** the Agent SHALL run `apply-research-style.mjs --bundle <path> --style <profile>` and verify stdout output - the Agent SHALL NOT read JSON style files or compute topic-count-dependent values

#### Scenario: New style added with minimal change
- **WHEN** a developer creates a new JSON file under `research-styles/` with the required parameter keys
- **THEN** the style SHALL be available for use without any code changes beyond the new JSON file

#### Scenario: Shared style computation fails closed
- **WHEN** the style definition is missing a required value, contains an invalid parameter, or `topicCount` is not a non-negative integer
- **THEN** `computeResearchStyleParams` SHALL reject without returning a partial projection
- **AND** neither its CLI nor C5 consumer SHALL guess, coerce or persist replacement values

#### Scenario: C5 validates rather than rewrites style projection
- **WHEN** accepted post-final rerun lineage contains the same event-bound `research_profile` and current `research_style_params` exactly equal the shared computation over the current committed canonical registry
- **THEN** the C5 ownership/stage evaluator MAY treat that exact parameter object as an existing-owner mechanical projection
- **AND** it SHALL perform no profile write and SHALL reject a different style name, wrong computed value or partial parameter object

### Requirement: Profile stores research style parameters after HITL1

The system SHALL store research style parameters in `rb_profile.yaml` under the key `research_style_params`. After HITL1, the Agent SHALL run `apply-research-style.mjs` to write all parameters from the selected style's JSON definition file into this section. The profile SHALL serve as the single source of truth for all downstream consumers (gate CLI and phase MD).

`apply-research-style.mjs` SHALL replace only `research_profile` and `research_style_params` in the parsed profile object and SHALL preserve the semantic values of all other existing profile sections, including `root_must_answer_set`, `human_decision_checkpoints`, rerun fields, and `research_access`. Serialization formatting, quoting, comments, and key layout are presentation details and need not be preserved.

When C5 lineage validation explains a rerun-time style recomputation, current `research_profile` SHALL still equal the event-bound value and all fields outside `research_style_params` plus the separately sanctioned event-bound `rerun_count` delta SHALL remain semantically equal to the event-bound after-profile. At either the event-bound current count or recorded next count, unchanged event-bound style parameters SHALL remain compatible; if a style delta exists, its only explainable shape SHALL be the complete exact object returned from the event-bound style definition and current canonical topic count. At current count, that exact delta SHALL project the existing phase-rerun count owner so a crash between style write and count increment remains resumable. This explanation SHALL not modify the C5 event, prepared manifest, profile schema, stage/action vocabulary or downstream rule authority, and SHALL not turn C5 into a general style-freshness Gate.

#### Scenario: HITL1 applies parameters via CLI
- **WHEN** user selects `claim_verification` during HITL1
- **THEN** Agent SHALL run `node DPT_FRAMEWORK/cli/apply-research-style.mjs --bundle <path> --style claim_verification`, verify stdout JSON (applied profile, topic_count, wave0_shared_ref_total), and confirm exit code 0

#### Scenario: Gate CLI reads dynamic threshold from profile
- **WHEN** gate CLI evaluates a `count_floor` rule with `threshold_source` pointing to `rb_profile.yaml#/research_style_params/wave0_shared_ref_total`
- **THEN** it SHALL resolve the threshold by reading the value at that path in `rb_profile.yaml`

#### Scenario: Rerun recomputes parameters when topic_registry changes
- **WHEN** phase-rerun adds or removes topics and updates `topic_registry` in `rb_plan.md`
- **THEN** it SHALL re-run `apply-research-style.mjs --bundle <path> --style <research_profile>` to recompute `wave0_shared_ref_total` with the updated topic count
- **AND** the recomputed `research_style_params` SHALL replace the previous values in `rb_profile.yaml`
- **AND** all unrelated profile sections, including `research_access`, SHALL retain their semantic values
- **AND** phase-seed-topics (rerun-aware mode) SHALL synchronize `action: add` and `action: remove` results with `topic_registry` before passing control to wave0

#### Scenario: Style apply preserves research access observation
- **WHEN** `rb_profile.yaml` contains a valid available or unavailable `research_access` observation before `apply-research-style.mjs` runs
- **THEN** the same observation SHALL remain present and semantically unchanged after style parameters are written

#### Scenario: Old bundle without research_style_params
- **WHEN** gate CLI evaluates a `count_floor` rule and `rb_profile.yaml` has no `research_style_params` section
- **THEN** it SHALL fall back to the hardcoded `threshold` value in the gate definition JSON

#### Scenario: Unrelated profile drift remains blocked
- **WHEN** a post-final rerun profile changes `research_profile`, any unrelated profile field, or has style params equal to neither the unchanged event-bound object nor the exact current shared computation
- **THEN** C5 and reentry lineage validation SHALL reject the profile as unexplained drift
- **AND** a correct value in some other style field SHALL NOT mask that drift

#### Scenario: Exact style projection before count increment is resumable
- **WHEN** the existing style CLI has written the exact current projection but `rerun_count` still equals the event-bound current count
- **THEN** C5 and reentry SHALL retain the accepted lineage and expose the existing phase-rerun count increment owner
- **AND** they SHALL NOT add a stage, write the count or require topic mutation again
