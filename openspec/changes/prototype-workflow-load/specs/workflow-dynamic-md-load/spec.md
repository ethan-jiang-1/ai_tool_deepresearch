# Workflow Dynamic MD Load
> req: WDM-001

Workflow execution advances one manifest step at a time. The current step Markdown is loaded just-in-time when the cursor reaches it.

## ADDED Requirements

### Requirement: Advance loads only the current step
The `advanceWorkflow(state, runtime)` function SHALL load and execute only the Markdown dependency closure for the step at `runtime.cursor`.

#### Scenario: First advance loads first step only
- **WHEN** runtime cursor is `0` for steps `['wave-entry.md', 'audit.md']`
- **AND** `advanceWorkflow(state, runtime)` is called
- **THEN** `wave-entry.md` is loaded and executed
- **AND** `audit.md` is not loaded

#### Scenario: Second advance loads second step
- **WHEN** runtime cursor is `1` after the first successful advance
- **AND** `advanceWorkflow(state, runtime)` is called
- **THEN** `audit.md` is loaded and executed

### Requirement: Successful advance moves the cursor
The system SHALL increment `runtime.cursor` by exactly one after the current step dependency closure is successfully resolved and executed.

#### Scenario: Cursor advances after successful step
- **WHEN** `advanceWorkflow(state, runtime)` successfully executes the current step
- **THEN** `runtime.cursor` increases by `1`
- **AND** the result status is `advanced`

### Requirement: Complete workflow does not load new files
When `runtime.cursor` is equal to the number of manifest steps, `advanceWorkflow` SHALL return `complete` and SHALL NOT read or execute any Markdown file.

#### Scenario: Advance after last step returns complete
- **WHEN** all manifest steps have already advanced
- **AND** `advanceWorkflow(state, runtime)` is called
- **THEN** the result status is `complete`
- **AND** no new `file_read`, `cache_hit`, or `file_executed` receipt is added

### Requirement: Markdown content cache does not cache execution
The loader SHALL cache Markdown content and parsed frontmatter after the first read, but SHALL execute a Markdown file each time it appears in a new advance plan.

#### Scenario: Cached file executes again
- **WHEN** `workflow-context.md` was read during a previous advance
- **AND** a later advance plan includes `workflow-context.md`
- **THEN** the loader records a `cache_hit`
- **AND** it records a new `file_executed` event for `workflow-context.md`
