# research-styles Specification

> req: RES-001, RES-002, RES-003, RES-004, RES-005, RES-006

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
- **AND** phase-seed-topics (rerun-aware mode) SHALL synchronize `action: add` and `action: remove` results with `topic_registry` before passing control to wave0

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

The existing wave0/wave1/wave2 re-fill loop SHALL remain the execution model: fill Q, drain Q, check, identify gaps, re-fill Q, drain, re-check, and repeat until the relevant checkpoint passes or a legal degradation path is recorded.

For wave phases, active queue, thin queue, count-floor gap, placeholder-only output, exhausted search documentation, and Quality Self-Check gap are all work signals. They SHALL drive enqueue/claim/complete, supplementary task creation, strategy change, self-check, or gate rerun. They SHALL NOT be interpreted as permission to surface a stage summary, "nothing left" message, or "done so far" progress report.

The wave0/wave1/wave2 Stop Behavior wording MAY remain node-specific, because each wave optimizes a different quality target. The common invariant is that quality work continues inside the node until the gate/checkpoint passes or a legal silent holding path is reached.

For `stop: "no"` wave phases, no-progress after repeated re-fill attempts SHALL NOT escalate to a user-facing stop, write `rb_status.json` state `blocked`, or ask the user for a decision. Instead, the phase body SHALL instruct the Phase Agent to take a silent degradation path: document the failed search/refill attempts, record `silent_degradation` or `silent_gap` through an accepted trace/log surface, change strategy where possible, and continue only within the boundary accepted by the current gate/checkpoint.

Silent degradation SHALL NOT authorize phase transition. If the gate/checkpoint does not accept the degraded artifact state, the Phase Agent SHALL remain in the current phase and continue repair or change strategy. If the gate/checkpoint is structurally unpassable after legal strategies are exhausted, the Phase Agent SHALL record `silent_unpassable` through an accepted trace/log surface and enter the silent holding behavior defined by `silent-wave-execution`. The Phase Agent SHALL NOT load the next phase without gate CLI `check.next`.

#### Scenario: wave0 no-progress re-fill degrades silently

- **WHEN** wave0 count-floor re-fill has made no progress after the retry limit
- **THEN** the Phase Agent SHALL record `silent_degradation` or `silent_gap` through an accepted trace/log surface
- **AND** the Phase Agent SHALL NOT ask the user, report and stop, or write `rb_status.json` state `blocked`
- **AND** the Phase Agent SHALL NOT load wave1 unless the wave0 gate returns `check.next`

#### Scenario: wave1 no-progress re-fill degrades silently

- **WHEN** wave1 count-floor re-fill has made no progress after the retry limit
- **THEN** the Phase Agent SHALL record the exhausted search angles and degradation decision through an accepted trace/log surface
- **AND** the Phase Agent SHALL NOT ask the user for a decision
- **AND** the Phase Agent SHALL NOT load wave2 unless the wave1 gate returns `check.next`

#### Scenario: wave2 quality re-fill degrades silently

- **WHEN** wave2 Quality Self-Check still identifies a gap after repeated re-fill attempts
- **THEN** the Phase Agent SHALL record `silent_degradation` or `silent_gap` with gap impact
- **AND** the Phase Agent SHALL NOT surface to the user mid-phase
- **AND** the Phase Agent SHALL NOT treat degradation as a gate pass

#### Scenario: wave phase active work does not become idle reporting

- **WHEN** a wave phase has active queue items, thin queue state, count-floor gap, or Quality Self-Check gap
- **THEN** the Phase Agent SHALL continue the queue/refill/self-check loop using node-specific instructions
- **AND** the Phase Agent SHALL NOT produce a stage progress report or idle summary
- **AND** the Phase Agent SHALL NOT advance without the current gate/checkpoint returning `check.next`

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
