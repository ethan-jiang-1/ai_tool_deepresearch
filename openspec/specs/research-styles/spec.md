# research-styles Specification

> req: RES-001, RES-002, RES-003, RES-004, RES-005, RES-006, RES-007, RES-008

## Purpose

Define research style profiles that control deep research depth and breadth parameters. Each style is a JSON file consumed by the JS engine. The system applies the selected style via CLI, stores resolved parameters in `rb_profile.yaml`, and enforces numeric thresholds through gate `count_floor` rules with dynamic threshold resolution. Quality parameters are enforced by Agent checklist + Queue re-fill loops.
## Requirements
### Requirement: Research style JSON files define per-style parameters

The system SHALL provide one JSON file per research style under `DPT_FRAMEWORK/schema/research-styles/`. Each file SHALL be consumed exclusively by JS (`apply-research-style.mjs` CLI) — Agent and MD SHALL NOT read these files. Adding a new style SHALL require only adding a new JSON file.

Each style file SHALL contain at minimum:
- `user_visible`: boolean
- `wave0_per_topic_source_floor`: positive integer
- `wave0_shared_ref`: object with `base` (non-negative integer) and `per_topic` (non-negative integer) — topic-count-dependent factor; CLI computes absolute `wave0_shared_ref_total`
- `wave1_per_topic_ref_floor`: positive integer
- `topic_unique_ratio`: number in [0, 1]
- `counterexample_search`: boolean
- `cross_verification`: boolean
- `p0p1_independent_backing`: positive integer
- `quality_min_tier`: string (`tier_1` / `tier_2` / `tier_3` / `tier_4`)
- `quality_min_substance`: string (`substantive` / `thin` / `none`)
- `wave2_cross_topic_depth`: non-negative integer — minimum cross-topic connections per topic (0=none, 1=≥1 per topic, 2=≥2 per topic with at least 1 contradiction)
- `wave2_emergent_search_rounds`: non-negative integer — rounds of emergent content search per topic, each from a different angle

#### Scenario: JS reads style parameters via CLI
- **WHEN** `apply-research-style.mjs --bundle <path> --style claim_verification` executes
- **THEN** it SHALL read `DPT_FRAMEWORK/schema/research-styles/claim_verification.json`, read `topic_registry` length from `rb_plan.md`, compute `wave0_shared_ref_total = base + per_topic × topic_count`, and write all parameters (with computed absolute values) to `rb_profile.yaml#/research_style_params`

#### Scenario: Agent applies style parameters via CLI
- **WHEN** phase-hitl1.md instructs the Agent to apply a research style
- **THEN** the Agent SHALL run `apply-research-style.mjs --bundle <path> --style <profile>` and verify stdout output — the Agent SHALL NOT read JSON style files or compute topic-count-dependent values

#### Scenario: New style added with minimal change
- **WHEN** a developer creates a new JSON file under `research-styles/` with the required parameter keys
- **THEN** the style SHALL be available for use without any code changes (beyond the new JSON file)

### Requirement: Profile stores research style parameters after HITL1

The system SHALL store research style parameters in `rb_profile.yaml` under the key `research_style_params`. After HITL1, the Agent SHALL run `apply-research-style.mjs` to write all parameters from the selected style's JSON definition file into this section. The profile SHALL serve as the single source of truth for all downstream consumers (gate CLI and phase MD).

`apply-research-style.mjs` SHALL replace only `research_profile` and `research_style_params` in the parsed profile object and SHALL preserve the semantic values of all other existing profile sections, including `root_must_answer_set`, `human_decision_checkpoints`, rerun fields, and `research_access`. Serialization formatting, quoting, comments, and key layout are presentation details and need not be preserved.

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

When topic-state add commits and changes registry length, its structured result SHALL identify the existing `apply-research-style.mjs` path as the one required follow-up. Research-style computation SHALL read only committed registry length and preserve unrelated profile sections under its existing contract. Prepared/blocked topic-state workspaces SHALL NOT affect profile calculation, and topic-state code SHALL NOT directly mutate profile fields.

#### Scenario: Add recomputes style after commit
- **WHEN** add-topic commits successfully
- **THEN** the Agent SHALL run the existing research-style CLI using the committed registry before the active HITL1 or rerun readiness gate

### Requirement: Safe topic removal SHALL reuse the existing research-style owner

When a committed layout operation safely removes an unstarted topic and changes registry length, its structured result SHALL identify the existing `apply-research-style.mjs` follow-up. Topic-state code SHALL not write profile fields, and rename/reorder without count change SHALL not trigger style recomputation.

#### Scenario: Safe remove recomputes style once
- **WHEN** layout commit reduces canonical registry length
- **THEN** the Agent SHALL run the existing style CLI before the rerun-ready gate
- **AND** topic-state helper SHALL leave unrelated profile sections untouched
