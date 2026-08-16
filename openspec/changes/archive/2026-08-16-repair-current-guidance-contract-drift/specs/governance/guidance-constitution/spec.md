> req: GCO-001

## MODIFIED Requirements

### Requirement: Constitutional clarification preserves authority boundaries

Constitutional guidance SHALL preserve the core Agent/Markdown/Engine/runtime authority split and defer to accepted specs, executable contracts, and runtime truth. It SHALL state implementation-neutral review laws; it SHALL NOT use prose to override accepted behavior, define a new runtime procedure, or imply a new capability.

The guidance suite SHALL maintain a single onboarding invariant brief at `openspec/guidance/models/invariants-brief.md` that presents the repository's current invariant facts as a new-Agent baseline. Root `AGENTS.md` SHALL reference the brief from its top reading surface, and the brief SHALL be the lazy-load target for the remaining facts rather than requiring their full restatement in every behavior file.

Each invariant entry SHALL be either directly machine-verifiable or a pointer to exactly one Source of Record (an accepted spec, an executable contract with a stated coordinate, or a deterministic test). The brief SHALL NOT grant authority, capability, permission, liveness, or evidence; it SHALL NOT override an accepted spec or executable contract; and it SHALL NOT become a third terminology canon alongside `CONTEXT.md` and the execution-model guidance. Its entries SHALL state the machine-checkable fact or the single truth source in one line and SHALL NOT reproduce the full contract prose. Entries SHALL NOT present current-incident, BUG, Wave, CLI, file-format, or implementation names as durable rules; an entry MAY name a concrete coordinate, file, or mechanism only as the pointer payload of a stated fact, never as a prescription. When a listed fact stops matching its Source of Record, the fact, not the source, SHALL be corrected, and the deterministic checks that can verify the fact SHALL be run in the same change.

#### Scenario: A constitutional clarification stays within its authority

- **WHEN** this change updates the Project Charter
- **THEN** it adds no new current runtime behavior or operational procedure
- **AND** it does not prevent a future, separately scoped OpenSpec change from reorganizing guidance where that is justified

#### Scenario: New Agent gets a verifiable baseline

- **WHEN** a new Agent reads root `AGENTS.md` and then `openspec/guidance/models/invariants-brief.md`
- **THEN** it SHALL find each invariant either machine-verifiable or pointing to exactly one Source of Record
- **AND** it SHALL NOT need to reconstruct the fact from multiple guidance surfaces

#### Scenario: Brief is not an authority surface

- **WHEN** a reader treats the brief as a behavior authority
- **THEN** the brief SHALL state its non-authoritative role and defer behavior to accepted specs and executable contracts
- **AND** it SHALL NOT be used to justify permission, capability, or lifecycle claims
