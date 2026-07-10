> req: RES-002

## MODIFIED Requirements

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
