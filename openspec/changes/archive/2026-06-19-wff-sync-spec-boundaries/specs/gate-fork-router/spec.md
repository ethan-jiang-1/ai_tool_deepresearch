## RENAMED Requirements

- FROM: `### Requirement: Branch router uses explicit Map`
- TO: `### Requirement: Branch resolver uses explicit Map`

## MODIFIED Requirements

### Requirement: Branch resolver uses explicit Map

The branch resolver (`forkRouter()` in `subagent-relay.mjs`) SHALL use an explicit map from Branch identifier to deterministic branch handler or transform record. Adding a new branch SHALL require updating the branch enum/map data but SHALL NOT require embedding Agent-facing workflow node loading or Markdown execution into the resolver.

#### Scenario: New branch added without changing resolver control flow

- **WHEN** a new branch `fail_c` is added to the Branch enum and fork map
- **THEN** the `forkRouter()` control flow needs zero code changes beyond registering the branch handler or transform record

#### Scenario: Resolver returns branch decision for caller inspection

- **WHEN** `forkRouter(state)` is called in `subagent-relay.mjs`
- **THEN** it returns the branch identifier and resolved deterministic handler or transform record
- **AND** the resolved value SHALL NOT be interpreted as an Agent-facing workflow node body
