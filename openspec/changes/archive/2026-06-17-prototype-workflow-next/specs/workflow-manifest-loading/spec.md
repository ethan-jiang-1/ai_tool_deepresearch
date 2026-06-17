# Workflow Single-Entry Runtime
> req: WML-001

Workflow-next runtime supports single-entry Markdown closure loading. It SHALL NOT require or load a workflow manifest.

## ADDED Requirements

### Requirement: Runtime initializes without manifest or cursor
The system SHALL create a workflow-next loader runtime without a manifest, step list, or cursor.

#### Scenario: Runtime starts empty
- **WHEN** `createWorkflowRuntime()` is called
- **THEN** it returns a runtime with empty `contentCache`, `executionLog`, and `receipts`
- **AND** the runtime has no `manifest`
- **AND** the runtime has no `cursor`

### Requirement: Runtime creation does not preload Markdown
The system SHALL NOT read any Markdown files while creating the workflow-next runtime.

#### Scenario: No file reads before explicit load
- **WHEN** `createWorkflowRuntime()` is called
- **THEN** `runtime.contentCache` is empty
- **AND** no receipt exists for `file_read` or `cache_hit`
