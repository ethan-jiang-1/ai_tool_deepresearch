> req: PRG-002

## MODIFIED Requirements

### Requirement: HITL1 recorded gate rule set

`gate-hitl1-recorded.definition.json` SHALL define HITL1 rules based on `rb_profile.yaml`.

Rules SHALL cover:

- `rb_profile.yaml` exists and passes `ProfileSchema`;
- `research_profile` is not `not_selected`;
- `root_must_answer_set` is non-empty;
- `human_decision_checkpoints.hitl1.status == recorded`;
- `human_decision_checkpoints.hitl1.recorded_at` is non-empty;
- `research_access.status == available` through the existing `field_value` check type.

The gate SHALL rely on `ProfileSchema` as the single validator for available-branch timestamp, HTTP(S) URL, and fetch-success consistency. It SHALL NOT add a dedicated research-access check type, duplicate cross-field validator, inspect command, degraded pass, or alternate Setup route.

After the existing canonical topic-state prerequisite has established a current committed registry and the selected profile is usable, this Gate SHALL call the shared side-effect-free style-projection freshness evaluator over `research_style_params`, that selected profile, and the committed registry length. Absent, partial, wrong-profile, or stale parameters SHALL produce one direct `style_projection_freshness` root. Its feedback SHALL name the selected profile, committed count, the existing `apply-research-style.mjs` command, and rerun of this same Gate. A malformed profile, unavailable research access, or canonical topic-state prerequisite failure SHALL retain its earlier root and mask the dependent freshness result. The Gate SHALL not write profile fields, select a style, mutate canonical topic state, add a generic style controller, or create another HITL decision.

Missing `research_access`, `unprobed`, and `unavailable` SHALL fail with deterministic advice that directs the Phase Agent to inspect the recorded reason when present, repair or switch the environment, and rerun the same HITL1 probe and gate. The gate SHALL NOT authorize Setup or any silent wave while research access is not available.

#### Scenario: Stale style projection blocks HITL1 at its existing owner

- **WHEN** HITL1 has a committed five-topic registry but `research_style_params` reflect zero topics
- **THEN** `check-gate-hitl1-recorded.mjs` SHALL return one `style_projection_freshness` root
- **AND** its feedback SHALL identify `apply-research-style.mjs --bundle <path> --style <selected-profile>` and rerun of the same Gate

#### Scenario: Valid current style projection permits the existing HITL1 path

- **WHEN** the selected profile and complete `research_style_params` exactly match the committed current registry length
- **THEN** the style-projection check SHALL add no failure
- **AND** all other existing HITL1 rules SHALL retain their own verdict ownership

#### Scenario: Canonical topic-state prerequisite masks freshness

- **WHEN** a selected HITL1 profile has absent or stale style parameters but the
  canonical registry/current-seed prerequisite is unavailable
- **THEN** the Gate SHALL return the existing canonical topic-state prerequisite
  root rather than `style_projection_freshness`
- **AND** feedback SHALL retain that prerequisite's existing owner and rerun
  boundary without proposing a profile write first

#### Scenario: All HITL1 rules pass with available access

- **WHEN** profile fields are complete and `research_access.status` is `available` with a schema-valid direct observation
- **THEN** `check-gate-hitl1-recorded.mjs` SHALL return `passed: true`

#### Scenario: Unprobed access fails through existing field-value routing

- **WHEN** `research_access` is missing or has `status: unprobed`
- **THEN** the gate SHALL return `passed: false`
- **AND** advice SHALL direct the Phase Agent to run the real HITL1 search/fetch probe

#### Scenario: Unavailable access stays at HITL1

- **WHEN** `research_access.status` is `unavailable` with a schema-valid reason
- **THEN** the gate SHALL return `passed: false`
- **AND** advice SHALL point to the recorded reason and the same-probe repair path
- **AND** routing SHALL NOT authorize Setup or any silent wave

#### Scenario: Fake available observation fails schema

- **WHEN** status is `available` but probe timestamp is invalid, result URL is not HTTP(S), or fetch outcome is not success
- **THEN** ProfileSchema/gate validation SHALL fail closed

#### Scenario: Gate audit uses the existing checker route

- **WHEN** the active gate-rule audit inventories `research_access_available`
- **THEN** it SHALL classify the rule as blocking and route it through the existing HITL1 `field_value` implementation
- **AND** no new checker implementation route SHALL be required
