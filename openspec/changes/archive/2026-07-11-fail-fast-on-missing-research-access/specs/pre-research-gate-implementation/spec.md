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

Missing `research_access`, `unprobed`, and `unavailable` SHALL fail with deterministic advice that directs the Phase Agent to inspect the recorded reason when present, repair or switch the environment, and rerun the same HITL1 probe and gate. The gate SHALL NOT authorize Setup or any silent wave while research access is not available.

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
