> req: SCO-002, SCO-012

## ADDED Requirements

### Requirement: PlanSchema validates frontmatter fields

PlanSchema SHALL validate `plan_basename` (string), `derived_topic_count` (number >= 0), and `topic_registry` (array of `{id, slug, title}` objects) from `rb_plan.md` frontmatter. The frontmatter format MAY be JSON or YAML (YAML 1.2 is a superset of JSON). The `parseMdFrontmatter()` function SHALL extract and parse the frontmatter block using `yaml.parse()`, which handles both formats.

#### Scenario: YAML frontmatter parses successfully

- **WHEN** `rb_plan.md` frontmatter uses YAML block format with `plan_basename`, `derived_topic_count`, `topic_registry`
- **THEN** `parseMdFrontmatter()` SHALL return a valid object and `PlanSchema.safeParse()` SHALL succeed

#### Scenario: JSON frontmatter in old bundles still parses

- **WHEN** `rb_plan.md` frontmatter uses JSON format (from older template or disposable bundle)
- **THEN** `parseMdFrontmatter()` SHALL still parse it correctly (YAML 1.2 is JSON superset)

### Requirement: stripMdFrontmatter extracts body from Markdown

`stripMdFrontmatter(mdContent)` SHALL strip the YAML frontmatter block (delimited by `---`) from a Markdown string and return the trimmed body. If no frontmatter block exists, it SHALL return the trimmed input unchanged. This is the inverse operation of `parseMdFrontmatter()`.

#### Scenario: Strips frontmatter and returns body

- **WHEN** input is `---\nplan_basename: foo\n---\n\n# Plan\n\nSome content\n`
- **THEN** output SHALL be `# Plan\n\nSome content`

#### Scenario: Passes through content with no frontmatter

- **WHEN** input is `# Just a title\n\nNo frontmatter here\n`
- **THEN** output SHALL be `# Just a title\n\nNo frontmatter here`

#### Scenario: Empty input returns empty

- **WHEN** input is `""` (empty string)
- **THEN** output SHALL be `""`

#### Scenario: Frontmatter-only input returns empty

- **WHEN** input is `---\nplan_basename: foo\n---\n`
- **THEN** output SHALL be `""` (body is empty after frontmatter stripped and trimmed)

#### Scenario: Body `---` not mistaken for frontmatter

- **WHEN** input is `---\nplan: foo\n---\n\n# Plan\n\n--- not frontmatter ---\n`
- **THEN** output SHALL be `# Plan\n\n--- not frontmatter ---` (only first `---` pair stripped, anchored to start of string)
