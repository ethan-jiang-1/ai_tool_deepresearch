> req: SRL-006

## ADDED Requirements

### Requirement: Runtime receipts SHALL identify the claimed execution actor class

Runtime receipt events for newly claimed work units SHALL carry `actor_contract_version: "work-unit.actor.v1"` and `execution_actor_class` equal to the Engine-owned claimed record. Receipt validation SHALL treat those fields as identity binding: missing or conflicting version/class SHALL reject submit for new claims. Receipt events SHALL NOT repeat the availability observation. The actor class SHALL distinguish `delegated_subagent` from `phase_agent_fallback`; runtime platform/session/spawn references remain optional diagnostic metadata and SHALL NOT determine actor class.

Legacy claimed attempts without an actor-class contract MAY use the truthful `legacy_unrecorded` compatibility path defined by delegated-work-units, but new normal/fallback attempts SHALL never use that compatibility path.

#### Scenario: Delegated receipt carries delegated actor class

- **WHEN** a newly claimed `delegated_subagent` work unit emits lifecycle receipt events
- **THEN** each submit-counted event SHALL carry `execution_actor_class: delegated_subagent`

#### Scenario: Fallback receipt does not impersonate subagent

- **WHEN** the Phase Agent executes a work unit claimed as `phase_agent_fallback`
- **THEN** each submit-counted receipt event SHALL carry `execution_actor_class: phase_agent_fallback`
- **AND** receipt validation SHALL reject `delegated_subagent` for that work ID
