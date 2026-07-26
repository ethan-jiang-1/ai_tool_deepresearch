> req: GAC-001, GAC-002, GAC-003, GAC-004, GAC-005, GAC-006, GAC-007, GAC-008, GAC-009

## ADDED Requirements

### Requirement: Content deduplication capability remains retired

The `content_dedup` capability SHALL remain a traceability tombstone for
retired GAC-001 through GAC-009; it SHALL NOT require, restore, or authorize
duplicate URL, homepage/shallow URL, Jaccard, self-reference, or standalone
content-dedup gate behavior. Current quality authority remains in the accepted
work-unit, ledger, cache, provenance, source/reference schema, and handoff
contracts.

#### Scenario: Retired content dedup does not regain authority
- **WHEN** a reader inspects the `gate-content-dedup` specification
- **THEN** it SHALL identify the capability as retired and its IDs as traceability-only
- **AND** it SHALL NOT present `content_dedup` as an active production or gate requirement
