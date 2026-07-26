> req: BUS-001, BUS-002, BUS-003

## MODIFIED Requirements

### Requirement: Legacy boot-entry stop authorization behavior is retired

Detailed stop authorization SHALL remain owned by lifecycle phase/shared
Markdown and accepted Agent command guidance; a passive bundle map or
deprecated legacy file SHALL NOT establish, grant, or override stop authority.

#### Scenario: Current docs do not source stop authority from legacy boot entry
- **WHEN** an Agent needs stop authorization guidance
- **THEN** current docs SHALL route it to lifecycle phase/shared Markdown, command guidance, status, trace, and Engine checks
- **AND** they SHALL NOT rely on `START_FROM_HERE.md` as current stop authority
