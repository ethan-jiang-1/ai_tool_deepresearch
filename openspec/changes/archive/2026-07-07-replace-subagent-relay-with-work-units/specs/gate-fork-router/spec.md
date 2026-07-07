> req: GAF-001

## MODIFIED Requirements

### Requirement: Branch resolver uses explicit Map

The branch resolver SHALL use an explicit map from Branch identifier to deterministic branch handler or transform record. Adding a new branch SHALL require updating the branch enum/map data but SHALL NOT require embedding Agent-facing workflow node loading, Markdown execution, or delegated-work transport into the resolver.

#### Scenario: New branch added without changing resolver control flow

- **WHEN** a new branch `fail_c` is added to the Branch enum and fork map
- **THEN** the resolver control flow needs zero code changes beyond registering the branch handler or transform record

#### Scenario: Resolver returns branch decision for caller inspection

- **WHEN** the branch resolver is called
- **THEN** it returns the branch identifier and resolved deterministic handler or transform record
- **AND** the resolved value SHALL NOT be interpreted as an Agent-facing workflow node body
