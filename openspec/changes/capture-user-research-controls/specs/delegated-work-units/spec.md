## ADDED Requirements

> req: DEW-020

### Requirement: Existing task brief may expose a read-only user-controls coordinate

When user research controls are present, Phase guidance SHALL permit the Phase Agent to add one instruction to its existing queue-item `task_brief` before claim, directing the actor to read `rb_plan.md## Constraints > User Research Controls` through the work unit's existing beacon-rooted bundle coordinate. The Engine SHALL carry that already-authored `task_brief` unchanged through the existing manifest/task rendering path; it SHALL NOT infer, generate, parse, or copy user controls itself. The instruction SHALL be bundle-relative and read-only, and SHALL only guide source selection, evidence treatment, analysis, and presentation.

The instruction SHALL NOT add queue, manifest, result, receipt, allocation, lifecycle, assignment, or write authority; controls SHALL NOT be copied into work-unit machine fields. When controls are absent, generated task briefs SHALL retain their existing behavior without an empty control payload or added read obligation.

#### Scenario: delegated task receives Phase-authored coordinate but no new authority
- **WHEN** a control-bearing Phase Agent creates a queue item whose existing task brief names the bounded read-only host-file coordinate
- **THEN** the claimed delegated task renders that existing brief unchanged
- **AND** the work-unit manifest/result/receipt schemas and submit authority remain unchanged
