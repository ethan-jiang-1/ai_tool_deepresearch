`GAC-001` through `GAC-009` are retired through the governed requirement
registry during Apply. This delta retires the whole current capability and
intentionally does not redeclare retired IDs in its header.

## REMOVED Requirements

### Requirement: Content deduplication capability remains retired

**Reason**: `content_dedup` and its duplicate URL, homepage/shallow URL,
Jaccard, and self-reference heuristics have no current Harness implementation,
Gate, reader, or Agent guidance authority. A live current spec/capability
catalog tombstone makes those historical patches look like an available
production decision.

**Migration**: Delete `openspec/specs/engine/gate-content-dedup/` and its
catalog row during Apply. Retain `GAC-001` through `GAC-009` as `[DEPRECATED]`
registry history under the retired no-spec-directory `GAC` prefix, in its
historical retired-tail group. Current quality/provenance readers use the
accepted work-unit, declaration-ledger, cache, provenance, source/reference-
schema, and phase-handoff owners; no compatibility reader, fallback,
migration, alias, or replacement Gate is created.

#### Scenario: Retired content-dedup capability has no live discovery entry

- **WHEN** a reader discovers current accepted capabilities after Apply
- **THEN** no `engine/gate-content-dedup` main spec or catalog row SHALL exist
- **AND** `GAC-001` through `GAC-009` SHALL remain deprecated registry history
- **AND** no current Harness, Gate, or guidance surface SHALL regain a
  content-dedup success path from this retirement
