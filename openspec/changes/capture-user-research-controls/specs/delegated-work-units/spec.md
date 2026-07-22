## ADDED Requirements

> req: DEW-020

### Requirement: Existing task brief may expose a read-only user-controls coordinate

When user research controls are present, a Phase Agent MAY add one instruction to the existing generated `task_brief` directing the actor to read `rb_plan.md## Constraints > User Research Controls` through the work unit's existing beacon-rooted bundle coordinate. The instruction SHALL be bundle-relative and read-only, and SHALL only guide source selection, evidence treatment, analysis, and presentation.

The instruction SHALL NOT add queue, manifest, result, receipt, allocation, lifecycle, assignment, or write authority; controls SHALL NOT be copied into work-unit machine fields. When controls are absent, generated task briefs SHALL retain their existing behavior without an empty control payload or added read obligation.

#### Scenario: delegated task receives coordinate but no new authority
- **WHEN** a control-bearing run creates a delegated work unit
- **THEN** its existing task brief may name the bounded read-only host-file coordinate
- **AND** the work-unit manifest/result/receipt schemas and submit authority remain unchanged
