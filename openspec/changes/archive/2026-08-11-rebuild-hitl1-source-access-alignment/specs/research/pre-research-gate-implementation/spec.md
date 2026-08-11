# research/pre-research-gate-implementation (delta)

## MODIFIED Requirements

### Requirement: HITL1 recorded gate rule set

`gate-hitl1-recorded.definition.json` SHALL retain its existing ProfileSchema,
profile-selection, must-answer, recorded-HITL1, canonical-topic-state, and style
projection rules. It SHALL require a schema-valid completed `research_access`
observation rather than an absent or `unprobed` observation.

The Gate SHALL not treat `research_access.status: available` as a capability
admission threshold. A schema-valid final `available` or `unavailable` direct-sample
observation may satisfy the recorded-observation rule after the Phase Agent has
completed the HITL1 access-alignment flow. The Gate does not receive the original
question, source constraints, Topic map, or user intent, so it SHALL NOT determine
whether an observed China/overseas limitation is material, whether a user must adjust
their environment, or whether the user accepted the current research scope.

ProfileSchema remains the sole validator for the direct-sample data shape and its
status/content invariant. The Gate SHALL not add a per-group or per-sample threshold,
availability score, degraded pass, new check type, alternate Setup route, retry
counter, VPN verdict, or future-access promise. A Phase that has not resolved a
material access gap SHALL remain at HITL1 and SHALL not invoke the Gate as a shortcut.

#### Scenario: Final constrained observation can reach the existing Gate

- **WHEN** the Phase has completed the user-led access-alignment flow and records a
  schema-valid unavailable direct-sample observation
- **THEN** the existing recorded-observation rule SHALL not reject it solely because
  no sample returned content
- **AND** all independent existing HITL1 rules retain their own verdict authority

#### Scenario: Unprobed access remains incomplete

- **WHEN** `research_access` is absent or has `status: unprobed`
- **THEN** the Gate SHALL fail at HITL1 with the existing structural observation
  repair boundary
- **AND** it SHALL not authorize Setup or silent research

#### Scenario: Gate does not judge source relevance

- **WHEN** a recorded observation contains mixed China and overseas terminal outcomes
- **THEN** the Gate SHALL validate only its schema-valid completed shape
- **AND** it SHALL not infer user intent from language, geography, sample group, or
  a source/tool name

### Requirement: HITL1 Gate feedback exposes the adapter-owned unavailable root

When the recorded research-access observation is absent, unprobed, malformed, or a
legacy branch establishes a validated `access_boundary`, HITL1 Gate feedback SHALL
retain the existing ProfileSchema and field-value authority path. The resolver may
project only a validated boundary location; it SHALL not derive identity, ownership,
or repair lineage from reason prose, sample outcome, tool name, provider identity,
or user language. This feedback remains the existing Gate CLI's native completion
verdict contract: the checker derives the blocking root from the schema-validated
observation and binds it to the same `check-gate-hitl1-recorded` rerun, and never
from the reason prose or a provider name.

For a completed current direct-sample observation, the Gate SHALL not produce a
blocking unavailable-root feedback message. Its China/overseas outcome is a Phase
Agent access-alignment input, not a deterministic defect or an external prerequisite
that the user can acknowledge away. The Gate SHALL not discover providers, validate
credentials, launch an adapter, write the observation, choose a network change, or
create a second user decision path.

#### Scenario: Current unavailable outcome is not misreported as a missing adapter

- **WHEN** a schema-valid current observation has `status: unavailable`
- **THEN** the Gate SHALL not identify a Claude adapter, `WebSearch`, `WebFetch`, or
  provider-specific missing surface as its root cause
- **AND** the Phase retains responsibility for any required user alignment before it
  invokes the Gate

#### Scenario: Legacy classified boundary remains precise

- **WHEN** a schema-valid legacy unavailable observation carries `access_boundary`
- **THEN** feedback SHALL use only that validated boundary's owner and same-check
  repair coordinate
- **AND** it SHALL not invent a current direct-sample group diagnosis
