> req: PRG-010

## ADDED Requirements

### Requirement: HITL1 Gate feedback exposes the adapter-owned unavailable root

When the existing `research_access_available` rule fails because the recorded
observation is absent, unprobed, or unavailable, HITL1 Gate feedback SHALL retain the
existing field-value and ProfileSchema authority path while projecting one direct
adapter-owned root when the profile reason identifies `surface_absent` or
`permission_required`. The feedback SHALL name the selected adapter contract, the
owning host/provider boundary, and rerun of the same bounded probe followed by the
same Gate.

The Gate SHALL NOT discover providers, validate provider credentials, launch an
adapter, write the profile observation, add a research-access check type, create an
alternate Setup route, or reinterpret launcher preflight as available access.

#### Scenario: Selected adapter surface is surfaced directly

- **WHEN** a schema-valid unavailable profile observation records `surface_absent`
- **THEN** the Gate SHALL return the existing blocking `research_access_available`
  rule with feedback identifying the selected adapter surface and same-probe rerun
- **AND** routing SHALL remain at HITL1

#### Scenario: Existing available observation retains its Gate path

- **WHEN** the profile has an existing schema-valid available observation produced
  by a selected adapter
- **THEN** the Gate SHALL retain its existing successful field-value evaluation
- **AND** it SHALL not require a second adapter checker or provider preflight
