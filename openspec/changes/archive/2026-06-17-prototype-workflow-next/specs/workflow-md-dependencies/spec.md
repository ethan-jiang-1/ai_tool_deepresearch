# Workflow MD Dependencies
> req: WMD-001

Entry Markdown files can declare dependent Markdown files in JSON frontmatter. The Engine resolves dependencies just-in-time for the requested entry closure.

## ADDED Requirements

### Requirement: Markdown frontmatter declares required Markdown files
The system SHALL parse a leading JSON frontmatter block delimited by `---` and read an optional `requires` array of Markdown file references. Missing frontmatter SHALL be treated as `{ "requires": [] }`.

#### Scenario: Requires parsed from frontmatter
- **WHEN** a Markdown file starts with JSON frontmatter containing `requires: ['workflow-context.md']`
- **THEN** `parseFrontmatter(md)` returns `requires: ['workflow-context.md']`

#### Scenario: Missing frontmatter has no dependencies
- **WHEN** a Markdown file has no leading frontmatter block
- **THEN** `parseFrontmatter(md)` returns `requires: []`

#### Scenario: Malformed JSON frontmatter prevents execution
- **WHEN** an entry Markdown file starts with a `---` delimited block
- **AND** the block content is not valid JSON
- **THEN** `loadNextMarkdown(fileRef, state, runtime)` returns status `error`
- **AND** the error message contains the file reference and indicates JSON parse failure
- **AND** no file in that load plan executes

### Requirement: Dependencies execute before requester
The system SHALL execute required Markdown files before executing the Markdown file that requested them.

#### Scenario: Chain dependency order
- **WHEN** `entry.md` requires `context.md`
- **AND** `context.md` requires `policy.md`
- **THEN** the execution order is `policy.md`, `context.md`, `entry.md`

### Requirement: Diamond dependency executes shared file once per load graph
Within a single `loadNextMarkdown()` dependency closure, the system SHALL execute a shared dependency only once even if multiple files require it.

#### Scenario: Shared dependency is deduplicated
- **WHEN** `entry.md` requires `a.md` and `b.md`
- **AND** both `a.md` and `b.md` require `shared.md`
- **THEN** `shared.md` appears once in the resolved plan
- **AND** `shared.md` executes once during that load

### Requirement: Missing dependency prevents execution
If a required Markdown file cannot be found or resolved, the system SHALL fail the current load before executing any file in that load plan.

#### Scenario: Missing dependency error names requester
- **WHEN** `entry.md` requires `missing-policy.md`
- **AND** `missing-policy.md` does not exist
- **THEN** `loadNextMarkdown('entry.md', state, runtime)` returns status `error`
- **AND** the error message contains `missing-policy.md` and requester `entry.md`
- **AND** no file in that load plan executes

### Requirement: Dependency cycles prevent execution
If Markdown dependencies form a cycle, the system SHALL fail the current load before executing any file in that load plan.

#### Scenario: Cycle error includes path
- **WHEN** `a.md` requires `b.md`
- **AND** `b.md` requires `a.md`
- **THEN** `loadNextMarkdown('a.md', state, runtime)` returns status `error`
- **AND** the error message contains `a.md -> b.md -> a.md`
- **AND** no file in that load plan executes
