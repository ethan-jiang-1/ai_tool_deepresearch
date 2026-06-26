> req: SCO-002

## MODIFIED Requirements

### Requirement: PlanSchema validates frontmatter fields

PlanSchema SHALL validate `plan_basename` (string), `derived_topic_count` (number >= 0), and `topic_registry` (array of `{id, slug, title}` objects) from `rb_plan.md` frontmatter. The frontmatter format MAY be JSON or YAML (YAML 1.2 is a superset of JSON). The `parseMdFrontmatter()` function SHALL extract and parse the frontmatter block using `yaml.parse()`, which handles both formats.

#### Scenario: YAML frontmatter parses successfully

- **WHEN** `rb_plan.md` frontmatter uses YAML block format with `plan_basename`, `derived_topic_count`, `topic_registry`
- **THEN** `parseMdFrontmatter()` SHALL return a valid object and `PlanSchema.safeParse()` SHALL succeed

#### Scenario: JSON frontmatter in old bundles still parses

- **WHEN** `rb_plan.md` frontmatter uses JSON format (from older template or disposable bundle)
- **THEN** `parseMdFrontmatter()` SHALL still parse it correctly (YAML 1.2 is JSON superset)
