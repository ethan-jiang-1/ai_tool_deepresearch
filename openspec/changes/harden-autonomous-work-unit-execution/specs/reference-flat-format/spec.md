## ADDED Requirements

> req: REF-007

### Requirement: Agent-facing source.yaml and reference metadata formats SHALL be parser-aligned and complete

Agent-facing phase docs, shared schema docs, work-unit tasks, and repair diagnostics SHALL describe `artifacts/waveN/{topic}/source.yaml` in the exact shape parsed by the Engine: a top-level YAML array where each entry includes at least `url`, `title`, `retrieved_date`, and `topic_tag`. Guidance SHALL warn that wrapping entries under `sources:`, `wave:`, or `topic:` produces an object and is invalid for this parser.

Reference Markdown metadata SHALL be documented as bullet or colon-separated metadata in the accepted project format, not YAML frontmatter. Guidance SHALL include enough examples for an Agent to write valid files without inferring schema shape from gate errors.

#### Scenario: source.yaml top-level array is documented

- **WHEN** an Agent reads wave source output instructions
- **THEN** it SHALL see that `source.yaml` starts with YAML list entries at the top level
- **AND** it SHALL see that `{ sources: [...] }`, `wave:`, or `topic:` wrappers are invalid for the current parser

#### Scenario: source.yaml required fields are documented

- **WHEN** an Agent writes a `source.yaml` entry
- **THEN** guidance SHALL require `url`, `title`, `retrieved_date`, and `topic_tag`
- **AND** guidance SHALL state that `retrieved_date` is a string date and `topic_tag` is a string tag usable by gate diagnostics

#### Scenario: YAML serialization guidance avoids common parse failures

- **WHEN** an Agent writes field values containing colons, semicolons, arrows, brackets, or long prose
- **THEN** guidance SHALL instruct it to quote or block-string those values using YAML-safe syntax
- **AND** diagnostics SHALL prefer parser-aligned repair language over generic “cannot parse YAML array”

#### Scenario: Reference metadata is not YAML frontmatter

- **WHEN** an Agent writes `reference/*.md`
- **THEN** guidance SHALL identify the accepted metadata format parsed by `parseReferenceMetadata()`
- **AND** it SHALL warn that YAML frontmatter fences are not the current reference metadata contract
