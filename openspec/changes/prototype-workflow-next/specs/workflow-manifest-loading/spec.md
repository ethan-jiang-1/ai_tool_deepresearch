# Workflow Manifest Loading
> req: WML-001

Workflow manifest 定义已知 workflow 的 step MD 文件顺序。加载 manifest 只能建立 workflow cursor 和 runtime，不得预加载 step MD 内容。

## ADDED Requirements

### Requirement: Workflow manifest defines ordered MD steps
The system SHALL load a `workflow.json` manifest containing an ordered `steps` array of Markdown file references. The manifest SHALL be validated with Zod before runtime creation.

#### Scenario: Manifest loads ordered steps
- **WHEN** `loadWorkflowManifest('workflow.json')` reads a manifest with `steps: ['wave-entry.md', 'audit.md']`
- **THEN** it returns a validated manifest preserving that order

#### Scenario: Invalid manifest is rejected
- **WHEN** `loadWorkflowManifest('workflow.json')` reads a manifest where `steps` is missing, empty, or not an array of strings
- **THEN** validation fails and no workflow runtime is created

### Requirement: Manifest loading does not preload step Markdown
The system SHALL NOT read any step Markdown files while loading the workflow manifest or creating the workflow runtime.

#### Scenario: Runtime starts with empty content cache
- **WHEN** `createWorkflowRuntime(manifest)` is called after loading a valid manifest
- **THEN** `runtime.contentCache` is empty
- **AND** no receipt exists for `file_read` or `cache_hit`

### Requirement: Runtime cursor starts at the first step
The workflow runtime SHALL track progress with a numeric `cursor` that starts at `0` and points to the next step to advance.

#### Scenario: Cursor initialized to first step
- **WHEN** a runtime is created for a manifest with three steps
- **THEN** `runtime.cursor` is `0`
- **AND** `runtime.manifest.steps[runtime.cursor]` is the first step file reference
