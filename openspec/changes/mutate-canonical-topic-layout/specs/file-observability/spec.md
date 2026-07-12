> req: FIO-007

## ADDED Requirements

### Requirement: File observability SHALL consume canonical layout resolution

File observability SHALL use the shared UID/layout resolver for current seeds and topic-bearing artifact/reference paths. Current seed paths SHALL be audited against current registry layout. Accepted artifact/reference paths using unique previous slugs SHALL remain at their recorded locations and SHALL be classified as historical bindings rather than stale projections, independent topic identity or mandatory rename work. An accepted layout workspace SHALL be the primary root and SHALL mask derivative seed mismatch findings.

Previous layouts SHALL be classification alternatives only. File observability SHALL NOT synthesize missing expected artifact/reference paths for every previous slug; existing files still require their normal ledger/receipt authority before they count as accepted outputs.

#### Scenario: Old submitted path remains valid historical coverage
- **WHEN** immutable provenance records a previous slug and the accepted artifact remains at its recorded path
- **THEN** observability SHALL bind that path to the same UID and report the topic's current slug without requiring a move

#### Scenario: Workspace masks cascade
- **WHEN** a prepared layout workspace temporarily leaves old and new seed paths on disk
- **THEN** observability SHALL return one exact recovery blocker
- **AND** SHALL NOT report the two seed paths as two canonical topics

#### Scenario: Missing historical alias path is not an error
- **WHEN** a UID has a previous slug with no artifact/reference file at that coordinate
- **THEN** observability SHALL NOT create a missing-path finding solely from layout history
