> req: SUD-008

## ADDED Requirements

### Requirement: Work-unit claim stdout is one machine-parseable JSON document (SUD-008)

`operate-work-unit claim` SHALL write exactly one JSON document to stdout: every machine consumer (JSON parsers, executors, wrappers) MUST be able to `JSON.parse` the full stdout without preprocessing. Any prompt, guidance, or long-form text embedded in the claim response SHALL be JSON-escaped string content (as produced by standard JSON serialization) and SHALL NOT be emitted as raw text with unescaped control characters or raw newlines inside a string value.

The claim response SHALL remain a bounded dispatch surface: per claimed work unit it carries machine-readable coordinates (`work_id`, `queue_item_id`, bundle-relative refs, result path) and a bounded `spawn_prompt`; it SHALL NOT embed the full generated `task.md` document content as a replacement for the on-disk `task_ref`/`task_path` coordinates. The stdout contract SHALL be regression-locked: a claim on an eligible queue item SHALL produce stdout that parses as a single JSON value.

#### Scenario: Machine consumer parses claim stdout

- **WHEN** a delegated queue item is claimed through the CLI
- **THEN** the complete stdout SHALL parse as a single JSON value without preprocessing
- **AND** the parsed object SHALL contain `claimed_work_ids[]` and `prompt_refs[]` with the claimed work-unit coordinates

#### Scenario: Embedded prompt text is escaped string content

- **WHEN** the claim response embeds a `spawn_prompt` or other long-form text field
- **THEN** the field SHALL be a JSON-escaped string value
- **AND** the full `task.md` document SHALL NOT be embedded as claim stdout content; the response SHALL point to the on-disk `task_ref`/`task_path` instead
