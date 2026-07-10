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
- `research_access.status == available`;
- available research access contains a parseable result URL and successful fetch observation.

Missing `research_access`, `unprobed`, and `unavailable` SHALL fail fast with inspect/advice that names the HITL1 probe repair path. The gate SHALL NOT route to Setup while research access is not available, and SHALL NOT normalize unavailable access into a degraded pass.

#### Scenario: All HITL1 rules pass with available access

- **WHEN** profile fields are complete and `research_access.status` is `available` with a valid URL/fetch observation
- **THEN** `check-gate-hitl1-recorded.mjs` SHALL return `passed: true`

#### Scenario: Unprobed access fails fast

- **WHEN** `research_access` is missing or has `status: unprobed`
- **THEN** the gate SHALL return `passed: false`
- **AND** advice SHALL direct the Phase Agent to run the real HITL1 search/fetch probe

#### Scenario: Unavailable access stays at HITL1

- **WHEN** `research_access.status` is `unavailable`
- **THEN** the gate SHALL return `passed: false` with the recorded reason
- **AND** routing SHALL NOT authorize Setup or any silent wave

#### Scenario: Fake available observation fails schema

- **WHEN** status is `available` but result URL is invalid or fetch outcome is not success
- **THEN** ProfileSchema/gate validation SHALL fail closed
