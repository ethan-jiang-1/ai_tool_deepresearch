> req: PHS-001, PHS-002, PHS-003, PHS-004, PHS-005, PHS-006

## ADDED Requirements

### Requirement: Plan template uses YAML frontmatter with structured body sections

The `rb_plan.md.tmpl` SHALL use YAML frontmatter (instead of JSON) for `plan_basename`, `derived_topic_count`, and `topic_registry` fields. The frontmatter field names SHALL remain unchanged from the current PlanSchema definition. The body SHALL contain six Markdown sections in fixed order: `## Goal`, `## Topic Registry`, `## Constraints`, `## Progress`, `## Decisions`.

#### Scenario: Production bundle instantiation with new template

- **WHEN** `instantiate-run-bundle.mjs` creates a new bundle with `{{name}}` substitution
- **THEN** the resulting `rb_plan.md` SHALL have YAML frontmatter parseable by `parseMdFrontmatter()` and a body containing all six section headers

#### Scenario: Existing JSON frontmatter remains parseable

- **WHEN** `parseMdFrontmatter()` reads an `rb_plan.md` with JSON frontmatter (from an older bundle or disposable path)
- **THEN** the function SHALL return the correct `{ plan_basename, derived_topic_count, topic_registry }` object (YAML 1.2 is a superset of JSON)

### Requirement: Goal section provides north-star anchor for Agent

The `## Goal` section SHALL contain three optional sub-sections: `### Purpose` (one-paragraph summary of the research), `### Research Questions` (numbered list of core questions), and `### Scope` (explicit include/exclude boundaries). At minimum, the `### Purpose` sub-section SHALL be present after HITL1 completes.

#### Scenario: Agent reads Goal section during reground

- **WHEN** a new Agent session loads `rb_plan.md` for context reground
- **THEN** the `## Goal` section SHALL provide a single authoritative source for the research objective, without requiring the Agent to consult conversation history or `rb_profile.yaml`

#### Scenario: Goal section remains empty before HITL1

- **WHEN** a newly instantiated bundle has not yet gone through HITL1
- **THEN** the `## Goal` section MAY contain placeholder text indicating it should be filled during HITL1

### Requirement: Topic Registry body section is human-readable table

The `## Topic Registry` section SHALL be a Markdown table with columns: `#`, `Slug`, `Title`, `Status`. The frontmatter `topic_registry` SHALL remain the authoritative source for topic identity (id/slug/title). The body table is a derived human-readable view; conflicts SHALL be resolved in favor of frontmatter.

#### Scenario: Topic Registry table reflects frontmatter topics

- **WHEN** Agent writes topics to `topic_registry` frontmatter during HITL1
- **THEN** the body `## Topic Registry` table SHALL list the same topics with corresponding slugs and titles

#### Scenario: Status column tracks per-topic progress

- **WHEN** a wave completes for a specific topic
- **THEN** the Agent MAY update the Status column for that topic's row (frontmatter remains authoritative for identity)

### Requirement: Constraints, Progress, and Decisions sections are reserved for future use

The `## Constraints`, `## Progress`, and `## Decisions` sections SHALL be present in the template as empty sections. No gate SHALL check their content. No Engine code SHALL write to them in Phase 1. They exist to define the extension surface for future phases.

#### Scenario: Empty sections do not cause gate failure

- **WHEN** a newly instantiated bundle passes through gates
- **THEN** empty `## Constraints`, `## Progress`, or `## Decisions` sections SHALL NOT cause any gate to fail

### Requirement: Gate checks plan body for minimum content

The `setup-ready` gate SHALL verify that `rb_plan.md` body is non-empty (at least one character after stripping frontmatter) and that it does not contain the template placeholder tokens `(待填充)` or `(尚无话题)`.

#### Scenario: Non-empty body passes gate

- **WHEN** `rb_plan.md` has a body with at least one character of content after the frontmatter block
- **THEN** the `plan_body_non_empty` rule SHALL pass

#### Scenario: Empty body fails gate

- **WHEN** `rb_plan.md` body is empty or contains only whitespace after stripping frontmatter
- **THEN** the `plan_body_non_empty` rule SHALL fail with inspect pointing to the empty body

#### Scenario: Placeholder tokens cause gate failure

- **WHEN** `rb_plan.md` body contains the strings `(待填充)` or `(尚无话题)`
- **THEN** the `plan_body_no_placeholder` rule SHALL fail with inspect listing which token was found

#### Scenario: Body without placeholder tokens passes gate

- **WHEN** `rb_plan.md` body has content that does not contain `(待填充)` or `(尚无话题)`
- **THEN** the `plan_body_no_placeholder` rule SHALL pass

### Requirement: Disposable bundle path is unaffected

`new-disposable-bundle.mjs` SHALL NOT be modified. Disposable bundles SHALL continue to create `rb_plan.md` with JSON frontmatter and a minimal body (title line only). The gate body checks SHALL pass for disposable bundles that have body content (even minimal) and no placeholder tokens.

#### Scenario: Disposable bundle with title-only body passes gate

- **WHEN** a disposable bundle's `rb_plan.md` has JSON frontmatter and a title line like `# Deep Research Plan: <name>`
- **THEN** the body non-empty check SHALL pass (title line counts as content)
