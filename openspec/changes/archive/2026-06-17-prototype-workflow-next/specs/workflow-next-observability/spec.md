# Workflow Next Observability
> req: WLO-001

Workflow-next experiments must expose enough receipts and trace events to understand exactly what was loaded, cached, resolved, executed, or rejected for a single entry Markdown closure.

## ADDED Requirements

### Requirement: Runtime records load receipts
The workflow runtime SHALL append structured receipts for load start, file read, cache hit, dependency resolution, file execution, load completion, and load error.

#### Scenario: Successful load records receipts
- **WHEN** `loadNextMarkdown('wave-entry.md', state, runtime)` succeeds
- **THEN** runtime receipts include `load_start`, one or more `file_read` or `cache_hit` entries, `dependency_resolved`, `file_executed`, and `load_complete`

#### Scenario: Load error records receipt
- **WHEN** dependency resolution fails during `loadNextMarkdown(fileRef, state, runtime)`
- **THEN** runtime receipts include `load_error` with the entry file reference and error message

### Requirement: Trace events mirror loader receipts
The experiment SHALL write JSONL trace events corresponding to the same major loader phases so Agent-assisted tests can inspect behavior outside process memory.

#### Scenario: Trace contains dynamic load phases
- **WHEN** the workflow-next experiment runs a successful load
- **THEN** the trace file includes events for `load_start`, `dependency_resolved`, `file_executed`, and `load_complete`

### Requirement: Experiment report records observed semantics
The `EXPERIMENT.md` file SHALL summarize what the prototype demonstrates and explicitly list any loader semantics that remain unclear or undesirable.

#### Scenario: Experiment report includes observations
- **WHEN** implementation is complete
- **THEN** `EXPERIMENT.md` records test results, loading order observations, cache/execution observations, and follow-up design questions
