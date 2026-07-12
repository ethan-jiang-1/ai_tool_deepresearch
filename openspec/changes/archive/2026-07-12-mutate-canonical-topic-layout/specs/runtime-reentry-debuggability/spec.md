> req: RRD-010

## ADDED Requirements

### Requirement: Reentry SHALL consume canonical topic layout recovery facts

Reentry diagnostics SHALL consume topic-state layout inspection and the shared resolver without mutation. An accepted layout workspace SHALL be one primary blocker with exact recover action and SHALL short-circuit derived registry/seed drift. Without a workspace, one UID's current/previous layout collision or unresolved structured legacy binding SHALL be grouped into one root with at most one nearest repair action. Historical artifact/reference paths that resolve through previous layout SHALL not be reported as mutation drift.

Post-final fresh layout requests SHALL continue to report the missing C5 boundary rather than presenting `mutate_layout` as reachable.

#### Scenario: Partial layout commit has one recovery action
- **WHEN** reentry sees an accepted operation after new seed replacement and before registry replacement or old-seed cleanup
- **THEN** it SHALL return only the exact topic-state recover command as primary action

#### Scenario: Terminal final does not gain mutation authority
- **WHEN** a terminal bundle has no accepted workspace and a human requests rename or renumber
- **THEN** reentry SHALL report the missing C5 sanctioned reentry boundary
- **AND** SHALL NOT treat the request source as permission
