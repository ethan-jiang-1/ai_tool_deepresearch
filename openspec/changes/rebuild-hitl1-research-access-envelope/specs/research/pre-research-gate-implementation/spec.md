# research/pre-research-gate-implementation (delta)

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

The admission line SHALL be partial reachability rather than total reachability. An
`available` observation established by at least one declared source class returning
real requested page content SHALL satisfy the existing `research_access_available`
rule, even when the recorded envelope also carries unreachable declared classes. An
observation with no reachable declared class SHALL fail closed at HITL1. The Gate
SHALL NOT require every declared source class to be reachable, and SHALL NOT
introduce a partial-coverage degraded pass, a per-class rule, or a second admission
threshold.

The gate SHALL rely on `ProfileSchema` as the single validator for available-branch timestamp, HTTP(S) URL, fetch-success consistency, envelope shape, and boundary-classification pairing. It SHALL NOT add a dedicated research-access check type, duplicate cross-field validator, inspect command, degraded pass, or alternate Setup route.

After the existing canonical topic-state prerequisite has established a current committed registry and the selected profile is usable, this Gate SHALL call the shared side-effect-free style-projection freshness evaluator over `research_style_params`, that selected profile, and the committed registry length. Absent, partial, wrong-profile, or stale parameters SHALL produce one direct `style_projection_freshness` root. Its feedback SHALL name the selected profile, committed count, the existing `apply-research-style.mjs` command, and rerun of this same Gate. A malformed profile, unavailable research access, or canonical topic-state prerequisite failure SHALL retain its earlier root and mask the dependent freshness result. The Gate SHALL not write profile fields, select a style, mutate canonical topic state, add a generic style controller, or create another HITL decision.

Missing `research_access`, `unprobed`, and `unavailable` SHALL fail with deterministic advice that directs the Phase Agent to the boundary that owns the failure and rerun of the same HITL1 probe and gate. The gate SHALL NOT authorize Setup or any silent wave while research access is not available.

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

#### Scenario: Partial class reachability admits research

- **WHEN** an available observation records at least one reachable declared source
  class alongside one or more unreachable declared classes
- **THEN** the existing `research_access_available` rule SHALL pass without a degraded
  pass, a per-class rule, or a second admission threshold
- **AND** the recorded unreachable classes SHALL remain readable rather than being
  cleared, downgraded, or converted into a blocking root

#### Scenario: No reachable class stays blocked

- **WHEN** an unavailable observation records no reachable declared source class
- **THEN** the Gate SHALL return `passed: false` and routing SHALL remain at HITL1
- **AND** it SHALL NOT authorize Setup or any silent wave

#### Scenario: Unprobed access fails through existing field-value routing

- **WHEN** `research_access` is missing or has `status: unprobed`
- **THEN** the gate SHALL return `passed: false`
- **AND** advice SHALL direct the Phase Agent to run the real HITL1 search/fetch probe

#### Scenario: Unavailable access stays at HITL1

- **WHEN** `research_access.status` is `unavailable` with a schema-valid reason
- **THEN** the gate SHALL return `passed: false`
- **AND** advice SHALL point to the owning boundary and the same-probe repair path
- **AND** routing SHALL NOT authorize Setup or any silent wave

#### Scenario: Fake available observation fails schema

- **WHEN** status is `available` but probe timestamp is invalid, result URL is not HTTP(S), or fetch outcome is not success
- **THEN** ProfileSchema/gate validation SHALL fail closed

#### Scenario: Gate audit uses the existing checker route

- **WHEN** the active gate-rule audit inventories `research_access_available`
- **THEN** it SHALL classify the rule as blocking and route it through the existing HITL1 `field_value` implementation
- **AND** no new checker implementation route SHALL be required

### Requirement: HITL1 Gate feedback exposes the adapter-owned unavailable root

When the existing `research_access_available` rule fails because the recorded
observation is absent, unprobed, or unavailable, HITL1 Gate feedback SHALL retain the
existing field-value and ProfileSchema authority path while projecting one direct
root determined by the recorded boundary classification. The Gate SHALL read that
classification as a direct validated value and SHALL NOT derive rule identity, owner,
or repair lineage from the reason prose, its position, or a textual prefix.

Each boundary-location value SHALL resolve to exactly one owner, and the projected
repair kind SHALL be derived from that owner. The three boundary locations owned
outside the Agent SHALL name the selected adapter contract, that owning
host/provider/network boundary, and rerun of the same bounded probe followed by the
same Gate. The probe-relay boundary location SHALL be owned by the Agent, SHALL
project an Agent-actionable repair, and SHALL NOT present an external prerequisite
for the user to resolve.

When the recorded observation carries no boundary classification, the Gate SHALL
state that direct fact explicitly in its feedback rather than degrading to a generic
retry message or inferring a boundary. An unclassified observation SHALL remain
blocking and SHALL retain the same-probe rerun boundary.

The Gate SHALL NOT discover providers, validate provider credentials, launch an
adapter, write the profile observation, add a research-access check type, create an
alternate Setup route, or reinterpret launcher preflight as available access.

#### Scenario: Selected adapter surface is surfaced directly

- **WHEN** a schema-valid unavailable profile observation records the absent-surface
  boundary location
- **THEN** the Gate SHALL return the existing blocking `research_access_available`
  rule with feedback identifying the selected adapter surface and same-probe rerun
- **AND** routing SHALL remain at HITL1

#### Scenario: Network-path boundary names the network owner

- **WHEN** a schema-valid unavailable observation records the network-path boundary
  location
- **THEN** feedback SHALL name that network boundary as the owner rather than an
  absent host surface or a host policy denial
- **AND** its projected repair kind SHALL be the external-action kind derived from
  that owner

#### Scenario: Probe-relay failure routes to the Agent

- **WHEN** a schema-valid unavailable observation records the probe-relay boundary
  location
- **THEN** the projected repair kind SHALL be the Agent-action kind derived from that
  owner
- **AND** feedback SHALL NOT present an external prerequisite for the user to resolve

#### Scenario: Unclassified observation is exposed rather than degraded

- **WHEN** a schema-valid unavailable observation carries a non-empty reason and no
  boundary classification
- **THEN** feedback SHALL state directly that the observation carries no routeable
  boundary
- **AND** it SHALL NOT parse the reason prose or emit a generic retry message in place
  of that fact

#### Scenario: Existing available observation retains its Gate path

- **WHEN** the profile has an existing schema-valid available observation produced
  by a selected adapter
- **THEN** the Gate SHALL retain its existing successful field-value evaluation
- **AND** it SHALL not require a second adapter checker or provider preflight
