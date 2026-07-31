> req: PRP-015

## ADDED Requirements

### Requirement: HITL1 uses the selected semantic research-access adapter

After the user has supplied or confirmed HITL1 research semantics, the HITL1 phase
body SHALL direct the Agent to read the one selected research-access adapter contract
before the existing bounded probe. When that contract supplies an already authorized
operation, the Agent SHALL carry out the ordinary search/fetch mechanics itself and
record the existing direct profile observation. When it supplies no legal operation,
the phase SHALL retain recorded user semantics, write the honest unavailable branch,
and expose only the adapter's direct external boundary before rerunning the same probe
and Gate.

This phase content SHALL NOT grant provider permission, ask the user to run the
pipeline, hand-edit `research_access`, add a HITL checkpoint, or write a parallel
adapter/status record. It SHALL keep probe output outside research evidence surfaces.

#### Scenario: Agent executes an already authorized adapter operation

- **WHEN** the selected adapter declares a legal search and same-URL fetch surface
- **THEN** the Agent SHALL execute the bounded probe after the existing HITL1
  semantic decision without seeking a second user confirmation
- **AND** it SHALL record the direct result through the existing profile owner and
  rerun the existing HITL1 Gate

#### Scenario: Selected adapter is absent

- **WHEN** the selected adapter has no callable search/fetch surface in the current host
- **THEN** the phase SHALL report the `surface_absent` boundary without
  asking the user to fabricate profile data or execute `curl`
- **AND** it SHALL preserve the current HITL1 user decision and remain at HITL1
