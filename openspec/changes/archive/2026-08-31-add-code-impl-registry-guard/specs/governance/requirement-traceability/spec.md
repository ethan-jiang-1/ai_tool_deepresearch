> req: RET-011

## ADDED Requirements

### Requirement: Requirement IDs in code implementation tags resolve against the registry

The project SHALL retain deterministic coverage that scans first-party implementation code surfaces — `DEEP_RESEARCH_HARNESS/`, `openspec/governance/`, and `tests/`, `*.mjs` files — for lines containing the `@impl` tag, and SHALL validate that every requirement-ID token matching `[A-Z]{3}-\d{3}` on those lines resolves to a registered ID in `openspec/governance/req-registry.yaml`. Registered `[DEPRECATED]` entries remain resolvable as historical annotation (mirroring the deprecated-ID posture of the "Requirement IDs in guidance prose resolve against the registry" requirement); resolution SHALL NOT grant a deprecated ID any live authority. Bug-namespace tokens (`BUG-<digits>`) are out of this coverage's scope and SHALL be ignored, consistent with the existing bug-namespace exclusion in the project requirement-ID checks. The coverage SHALL NOT scan non-`@impl` lines, registry key lines, or any surface outside the three declared code surfaces (guidance prose remains owned by the "Requirement IDs in guidance prose resolve against the registry" requirement; main-spec `> req:` headers remain owned by the spec requirement-ID consistency guard). The coverage SHALL be exposed as a governance check discoverable by the aggregated read-only governance health entry under its `check-*.mjs` naming convention, and SHALL be usable before archive.

#### Scenario: Code implementation tag cites an unregistered ID

- **WHEN** an implementation file under a covered surface carries an `@impl` line referencing a requirement ID absent from the registry
- **THEN** the deterministic coverage SHALL fail and name the file, the token, and the nearest repair (register the ID through the legal lifecycle path or correct the tag)
- **AND** the failure SHALL be surfaced by the aggregated read-only governance health entry

#### Scenario: Bug-namespace references on implementation tags remain out of scope

- **WHEN** an `@impl` line references a bug-namespace token (for example a `BUG-<digits>` token) alongside registered requirement IDs
- **THEN** the coverage SHALL ignore the bug token and validate only the requirement-ID tokens
- **AND** it SHALL NOT fail because of the bug token

#### Scenario: Deprecated IDs remain resolvable in implementation annotations

- **WHEN** an `@impl` line references a registered but `[DEPRECATED]` requirement ID as historical annotation
- **THEN** the coverage SHALL accept the reference as resolvable
- **AND** it SHALL NOT grant the deprecated ID any live authority

#### Scenario: Missing registry fails closed

- **WHEN** the coverage runs against a root whose `openspec/governance/req-registry.yaml` is missing
- **THEN** the coverage SHALL fail with a clear registry-not-found message rather than report a vacuous pass
- **AND** it SHALL NOT create, repair, or mutate any file
