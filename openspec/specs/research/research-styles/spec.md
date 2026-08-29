# research-styles Specification

> req: RES-001, RES-002, RES-003, RES-004, RES-005, RES-006, RES-007, RES-008

## Purpose

Define research style profiles that control deep research depth and breadth parameters. Each style is a JSON file consumed by the JS engine. The system applies the selected style via CLI, stores resolved parameters in `rb_profile.yaml`, and enforces numeric thresholds through gate `count_floor` rules with dynamic threshold resolution. Quality parameters are enforced by Agent checklist + Queue re-fill loops.
## Requirements
### Requirement: Research style JSON files define per-style parameters

The system SHALL provide one JSON file per research style under `DEEP_RESEARCH_HARNESS/schema/research-styles/`. Each file SHALL be consumed exclusively by JS (`apply-research-style.mjs` CLI) - Agent and MD SHALL NOT read these files. Adding a new style SHALL require only adding a new JSON file.

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

`apply-research-style.mjs` SHALL remain the sole Agent-facing writer. It SHALL load the selected JSON definition, read committed canonical `rb_plan.md#/topic_registry.length`, call `computeResearchStyleParams`, and write the returned object. The ReopenResearchPass ownership/stage evaluator MAY call the same computation only to decide whether current `research_style_params` are the exact existing-owner projection from the event-bound `research_profile` and current committed canonical registry. ReopenResearchPass SHALL NOT use the current profile to select a different style, write the projection, create a second style authority, or turn this comparison into a general style-freshness Gate.

#### Scenario: JS reads style parameters via CLI
- **WHEN** `apply-research-style.mjs --bundle <path> --style claim_verification` executes
- **THEN** it SHALL read `DEEP_RESEARCH_HARNESS/schema/research-styles/claim_verification.json`, read `topic_registry` length from `rb_plan.md`, call the shared pure computation, compute `wave0_shared_ref_total = base + per_topic * topic_count`, and write all parameters to `rb_profile.yaml#/research_style_params`

#### Scenario: Agent applies style parameters via CLI
- **WHEN** phase-hitl1.md instructs the Agent to apply a research style
- **THEN** the Agent SHALL run `apply-research-style.mjs --bundle <path> --style <profile>` and verify stdout output - the Agent SHALL NOT read JSON style files or compute topic-count-dependent values

#### Scenario: New style added with minimal change
- **WHEN** a developer creates a new JSON file under `research-styles/` with the required parameter keys
- **THEN** the style SHALL be available for use without any code changes beyond the new JSON file

#### Scenario: Shared style computation fails closed
- **WHEN** the style definition is missing a required value, contains an invalid parameter, or `topicCount` is not a non-negative integer
- **THEN** `computeResearchStyleParams` SHALL reject without returning a partial projection
- **AND** neither its CLI nor ReopenResearchPass consumer SHALL guess, coerce or persist replacement values

#### Scenario: ReopenResearchPass validates rather than rewrites style projection
- **WHEN** accepted post-final rerun lineage contains the same event-bound `research_profile` and current `research_style_params` exactly equal the shared computation over the current committed canonical registry
- **THEN** the ReopenResearchPass ownership/stage evaluator MAY treat that exact parameter object as an existing-owner mechanical projection
- **AND** it SHALL perform no profile write and SHALL reject a different style name, wrong computed value or partial parameter object

### Requirement: Profile stores research style parameters after HITL1

The system SHALL store research style parameters in `rb_profile.yaml` under
`research_style_params`. `apply-research-style.mjs` SHALL remain the sole
Agent-facing profile writer: it reads the selected style definition and the
committed canonical `rb_plan.md#/topic_registry.length`, computes the complete
object through the existing pure computation, and replaces only
`research_profile` and `research_style_params`. All other profile sections,
including `root_must_answer_set`, human decision checkpoints, rerun fields, and
`research_access`, SHALL retain their semantic values.

HITL1 SHALL record the user-selected `research_profile`, commit canonical topic
state, then invoke the existing style writer using that selected profile before
the HITL1 readiness checkpoint. A topic-state result whose committed registry
length invalidates the existing params SHALL return the structured style handoff
owned by this CLI; it SHALL not mutate the profile itself. The relevant HITL1 or
rerun readiness checkpoint SHALL call one side-effect-free style-projection
freshness evaluator that compares current params to the shared computation for
the current committed registry and selected profile. The evaluator SHALL not
read/write a bundle, select a style, or create a lifecycle result; both Gates
SHALL reuse its classification. Absent,
partial, wrong-profile, or stale params SHALL produce one direct
style-projection root with the exact existing CLI command and same-check rerun.
This validates freshness; it does not create a second style writer, a generic
style controller, or a new user decision.

When ReopenResearchPass lineage validation explains rerun-time style recomputation, current
`research_profile` SHALL equal the event-bound value and all fields outside
`research_style_params` plus the separately sanctioned event-bound
`rerun_count` delta SHALL remain semantically equal to the event-bound
after-profile. At either the event-bound current count or recorded next count,
unchanged event-bound style parameters remain compatible; if a style delta
exists, its only explainable shape is the complete exact object returned from
the event-bound style definition and current committed canonical topic count.
At current count, an exact projection differing from event-bound params SHALL
project the existing phase-rerun count owner. This explanation SHALL not modify
the ReopenResearchPass event, prepared manifest, profile schema, stage/action vocabulary, or
downstream rule authority, and SHALL not turn ReopenResearchPass into a general style writer.

#### Scenario: HITL1 applies parameters via CLI

- **WHEN** a user selects `claim_verification` during HITL1 and canonical
  topic-state applies five topics
- **THEN** the Agent SHALL run
  `apply-research-style.mjs --bundle <path> --style claim_verification` after
  the committed five-topic registry exists
- **AND** stdout SHALL report `topic_count: 5` and the corresponding complete
  parameter object
- **AND** the Agent SHALL verify the JSON result and successful exit before the
  HITL1 readiness checkpoint
#### Scenario: Gate CLI reads dynamic threshold from profile
- **WHEN** gate CLI evaluates a `count_floor` rule with `threshold_source` pointing to `rb_profile.yaml#/research_style_params/wave0_shared_ref_total`
- **THEN** it SHALL resolve the threshold by reading the value at that path in `rb_profile.yaml`

#### Scenario: Rerun recomputes parameters when topic_registry changes
- **WHEN** phase-rerun adds or removes topics and updates `topic_registry` in `rb_plan.md`
- **THEN** it SHALL re-run `apply-research-style.mjs --bundle <path> --style <research_profile>` to recompute `wave0_shared_ref_total` with the updated topic count
- **AND** the recomputed `research_style_params` SHALL replace the previous values in `rb_profile.yaml`
- **AND** all unrelated profile sections, including `research_access`, SHALL retain their semantic values
- **AND** phase-seed-topics (rerun-aware mode) SHALL synchronize `action: add` and `action: remove` results with `topic_registry` before passing control to wave0

#### Scenario: Stale HITL1 projection returns one existing-owner action

- **WHEN** `research_style_params` were computed for zero topics but the
  committed canonical registry contains five topics
- **THEN** the HITL1 readiness checkpoint SHALL fail with one
  style-projection freshness root
- **AND** feedback SHALL name `apply-research-style.mjs`, the selected profile,
  committed count, and rerun of that same checkpoint

#### Scenario: Style apply preserves research access observation
- **WHEN** `rb_profile.yaml` contains a valid available or unavailable `research_access` observation before `apply-research-style.mjs` runs
- **THEN** the same observation SHALL remain present and semantically unchanged after style parameters are written

#### Scenario: Old bundle without research_style_params
- **WHEN** gate CLI evaluates a `count_floor` rule and `rb_profile.yaml` has no `research_style_params` section
- **THEN** it SHALL fall back to the hardcoded `threshold` value in the gate definition JSON

#### Scenario: Legacy profile fallback remains bounded

- **WHEN** a pre-ResearchConfigLock bundle lacks `research_style_params` outside a
  ResearchConfigLock-authorized HITL1/rerun freshness checkpoint
- **THEN** existing `count_floor` fallback behavior SHALL remain
  readable-compatible
- **AND** this compatibility SHALL not make a current HITL1/rerun readiness
  checkpoint accept an absent required style projection

#### Scenario: Unrelated profile drift remains blocked
- **WHEN** a post-final rerun profile changes `research_profile`, any unrelated profile field, or has style params equal to neither the unchanged event-bound object nor the exact current shared computation
- **THEN** ReopenResearchPass and reentry lineage validation SHALL reject the profile as unexplained drift
- **AND** a correct value in some other style field SHALL NOT mask that drift

#### Scenario: Exact style projection before count increment is resumable
- **WHEN** the existing style CLI has written an exact current projection that differs from event-bound params but `rerun_count` still equals the event-bound current count
- **THEN** ReopenResearchPass and reentry SHALL retain the accepted lineage and expose the existing phase-rerun count increment owner
- **AND** they SHALL NOT add a stage, write the count or require topic mutation again

### Requirement: Gate count_floor reads dynamic threshold from profile

The `count_floor` rule type in gate definition JSONs SHALL support an optional `threshold_source` field specifying a JSON path within `rb_profile.yaml`. When present, the gate CLI SHALL resolve the threshold from the profile at that path. The existing `threshold` field SHALL be retained as fallback.

#### Scenario: count_floor with dynamic threshold
- **WHEN** gate-wave0-complete evaluates `shared_ref_count_floor` with `threshold_source: "rb_profile.yaml#/research_style_params/wave0_shared_ref_total"`
- **AND** the profile contains `research_style_params.wave0_shared_ref_total: 12`
- **THEN** the rule SHALL pass only if at least 12 matching files exist (not the hardcoded fallback of 1)

#### Scenario: count_floor without threshold_source (backward compatible)
- **WHEN** gate-wave2-complete evaluates a rule without `threshold_source`
- **THEN** it SHALL use the hardcoded `threshold` value as before

### Requirement: Phase MD references style-specific targets and uses unified Queue re-fill loop

Research-style phase wording SHALL preserve the existing Queue re-fill loop while using canonical phase-boundary terminology for silent degradation.

Silent degradation, `silent_gap`, and no-progress refill handling SHALL NOT be described as authorizing a phase transition in the broad historical sense. The wording SHALL instead distinguish the two forbidden boundary effects:

- silent degradation SHALL NOT authorize phase handoff or loading the next phase control surface; only gate CLI `check.next` consumed through the accepted handoff path can do that; and
- silent degradation SHALL NOT authorize source-gate status synchronization in `rb_status.json`; status synchronization remains governed by `advance-status` and its accepted preconditions.

The existing behavior remains unchanged: if the gate/checkpoint does not accept the degraded artifact state, the Phase Agent remains in the current phase, repairs or changes strategy, records accepted silent diagnostics where allowed, and does not ask the user for a decision.

#### Scenario: Silent degradation is not boundary authority

- **WHEN** wave0/wave1/wave2 refill work records `silent_degradation` or `silent_gap`
- **THEN** the docs SHALL state that the Agent remains in the current phase unless the current gate emits `check.next`
- **AND** the docs SHALL NOT describe degradation as authorizing phase handoff, next-node loading, or `advance-status` synchronization

### Requirement: Supplementary tasks SHALL NOT produce placeholder references

When supplementary task execution produces only placeholder references or documented failure reports, the Phase Agent SHALL treat that round as no-progress and enter the silent degradation path defined in the Queue re-fill loop requirement. It SHALL delete placeholder references as before, preserve honest failure documentation, and SHALL NOT escalate to a user-facing stop from a `stop: "no"` wave phase.

#### Scenario: Placeholder-only supplementary round enters silent degradation

- **WHEN** Phase Agent drains supplementary task cards and all new reference files from this round have placeholder source URLs
- **THEN** placeholder reference files SHALL be deleted
- **AND** honest `suppl-failure-r{attempt}.md` documentation SHALL be preserved where present
- **AND** the Phase Agent SHALL record silent degradation instead of escalating to the user

### Requirement: Debug style is hidden from end users

The system SHALL support a `debug` research style with `user_visible: false`. HITL1 SHALL only present styles where `user_visible: true` to the user. The `debug` style SHALL use the lowest parameter values: `wave0_per_topic_source_floor: 1`, `wave0_shared_ref_total: 1` (computed from `wave0_shared_ref: {base:1, per_topic:0}`), `wave1_per_topic_ref_floor: 1`, `topic_unique_ratio: 0`, `counterexample_search: false`, `cross_verification: false`, `p0p1_independent_backing: 1`, `quality_min_tier: tier_4`, `quality_min_substance: none`. It SHALL be available for development and testing only.

#### Scenario: Debug style not shown in HITL1
- **WHEN** HITL1 presents research style options to the user
- **THEN** only `quick_factual`, `exploratory_map`, and `claim_verification` SHALL appear (not `debug`)

#### Scenario: Debug style usable internally
- **WHEN** a developer manually sets `research_profile: debug` and writes the corresponding `research_style_params` into `rb_profile.yaml`
- **THEN** the gate system SHALL use the debug parameters (lowest floor=1, all quality thresholds at minimum) for that run

### Requirement: Topic-state add SHALL reuse the existing research-style owner

When topic-state add commits and changes registry length, its structured result
SHALL expose one `style_projection` handoff with status, committed topic count,
selected profile, exact `apply-research-style.mjs` command, and the current
readiness checkpoint. The style CLI remains the only writer and reads only the
committed registry length. Prepared or blocked topic-state workspaces SHALL not
affect profile calculation, and topic-state code SHALL not directly mutate
profile fields.

#### Scenario: Add recomputes style after commit

- **WHEN** add-topic commits and changes the registry length
- **THEN** the topic-state result SHALL expose the existing style CLI as the
  refresh owner before the active HITL1 or rerun readiness gate
- **AND** the Agent SHALL run that CLI against the committed registry before
  the active HITL1 or rerun readiness gate
- **AND** only that CLI can write the updated params

### Requirement: Safe topic removal SHALL reuse the existing research-style owner

When a committed layout operation safely removes an unstarted topic and changes
registry length, its structured result SHALL expose the same style-projection
handoff. Topic-state code SHALL not write profile fields, and rename/reorder
without count change SHALL not trigger style recomputation.

#### Scenario: Safe remove recomputes style once

- **WHEN** layout commit reduces canonical registry length
- **THEN** the result SHALL expose one style refresh through the existing CLI
  before the rerun-ready gate
- **AND** the Agent SHALL run that CLI before the rerun-ready gate
- **AND** topic-state SHALL leave unrelated profile sections untouched
