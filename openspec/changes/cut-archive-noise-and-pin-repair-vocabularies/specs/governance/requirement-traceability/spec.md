## ADDED Requirements

### Requirement: New closed feedback vocabularies pass a reuse-first gate

> req: RET-012

A change SHALL NOT introduce a new Agent-facing closed-enum feedback field name (a field carrying a closed set of repair/recovery/diagnostic directives in framework feedback) unless it records, in the change proposal or design, why none of the existing feedback surfaces can carry the fact. The existing surfaces are at minimum: the gate/phase `repair_kind` surface, the work-unit `next.recovery_action` surface, and the file-observability `repair_directive` surface.

When a new closed feedback vocabulary is justified, the same change SHALL deliver all of the following before archive:

- one code-derived frozen export as the executable enum source, referenced by every emitter and consumer of the field;
- registration of that export in the enum-restatement governance checker so prose restatements are validated against the code-derived set;
- a field-name triage row in root `CONTEXT.md` that classifies the new surface against the existing ones by field name and names its owner or enum source.

The gate SHALL be checkable: a change adding a new closed feedback field name without the export, the checker registration, or the glossary triage row SHALL fail the deterministic governance checks at validation or archive time.

#### Scenario: Reuse is attempted before a new field name is invented

- **WHEN** a change proposes a new closed-enum feedback field name for framework feedback
- **THEN** the change artifacts SHALL record why the existing repair-vocabulary surfaces cannot carry the fact
- **AND** the proposal SHALL NOT describe the new field as a convenience alias for an existing surface

#### Scenario: New vocabulary ships its full pinning set in one change

- **WHEN** a change introduces a justified new closed feedback vocabulary
- **THEN** the same change SHALL add the code-derived frozen export, the enum-restatement registration, and the root `CONTEXT.md` triage row
- **AND** all three SHALL be present before the change archives

#### Scenario: Unpinned new field name fails governance

- **WHEN** a change adds an Agent-facing closed-enum feedback field name without its code-derived export, checker registration, or glossary triage row
- **THEN** the deterministic governance checks SHALL fail at validation or archive time naming the missing pinning artifact
