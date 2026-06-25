# Framework Engine

> req: FRE-001, FRE-003

## Purpose

Define the canonical location and import contract for production engine modules under `DPT_FRAMEWORK/engine/`. These engines are the single source of truth for deterministic queue, gate, loader, and subagent relay mechanisms — shared by both production run bundles and experiment playbooks.
## Requirements
### Requirement: Engine code canonical location

Six production engine modules SHALL reside at `DPT_FRAMEWORK/engine/` as their single canonical location:

| Module | Canonical Path |
|--------|---------------|
| Queue Manager | `DPT_FRAMEWORK/engine/queue-manager.mjs` |
| Gate Loop | `DPT_FRAMEWORK/engine/gate-loop.mjs` |
| Gate Fork | `DPT_FRAMEWORK/engine/gate-fork.mjs` |
| Subagent Relay | `DPT_FRAMEWORK/engine/subagent-relay.mjs` |
| Workflow Chain | `DPT_FRAMEWORK/engine/workflow-chain.mjs` |
| Trace Writer | `DPT_FRAMEWORK/engine/trace.mjs` |

No engine module SHALL exist as a copy in `experiments_env/prototype-*/`. Experiment playbooks and production run bundles SHALL import engines from their canonical paths.

Workflow Chain is an MD loader + dependency resolver: it parses frontmatter, resolves dependency closures, reads and caches MD files, and returns results for the Agent to read. It SHALL NOT execute JS code blocks from MD nodes — MD content is Agent-readable, not engine-executable.

#### Scenario: Experiment playbook imports engine from framework

- **WHEN** an experiment playbook inline script executes an engine function
- **THEN** the import statement SHALL reference `../DPT_FRAMEWORK/engine/<module>.mjs`

#### Scenario: Production run bundle imports engine from framework

- **WHEN** a production run bundle script calls an engine function
- **THEN** the import statement SHALL reference `../DPT_FRAMEWORK/engine/<module>.mjs` (same relative path)

#### Scenario: No FSM engine modules

- **WHEN** listing `DPT_FRAMEWORK/engine/`
- **THEN** `workflow-fsm.mjs` SHALL NOT exist
- **AND** `transition-fsm.mjs` SHALL NOT exist

#### Scenario: Integrity via validate-workflow-package

- **WHEN** `DPT_FRAMEWORK/cli/validate-workflow-package.mjs` runs
- **THEN** it SHALL validate the workflow package without requiring a `.fsm.json` file

#### Scenario: No engine copy remains in experiments

- **WHEN** the change is complete
- **THEN** no `experiments_env/prototype-*/` directory SHALL contain an engine `.mjs` file that duplicates a module in `DPT_FRAMEWORK/engine/`

### Requirement: Gate helpers provide shared frontmatter parsing

`DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs` SHALL export two shared functions for Markdown frontmatter parsing, eliminating duplicated `JSON.parse(m[1])` logic across gate CLIs and bundle tooling:

- **`parseMdFrontmatter(rawString)`** — Accept a raw Markdown string. Extract the YAML frontmatter block between `---` delimiters. Parse with `parseYaml()` from the `yaml` package. Return the parsed object, or `{}` if no frontmatter block is found. Throw on invalid YAML syntax.
- **`readBundlePlan(bundlePath)`** — Accept a bundle directory path. Read `rb_plan.md`, call `parseMdFrontmatter()`, return the parsed plan object. Caching left to the caller.

**Rationale:** YAML 1.2 is a strict superset of JSON — `parseYaml()` parses both JSON and YAML frontmatter identically. This eliminates the format ambiguity where `rb_plan.md` and `seed_topics/*.md` were JSON-only while phase/shared workflow nodes used YAML. A single canonical implementation prevents format drift and eliminates the 6 duplicated regex+parse blocks across the codebase.

#### Scenario: parseMdFrontmatter handles JSON frontmatter (backward compatible)

- **WHEN** the input Markdown contains `---\n{"slug":"x","title":"y"}\n---`
- **THEN** `parseMdFrontmatter()` SHALL return `{ slug: "x", title: "y" }`
- **AND** the result SHALL be identical to what `JSON.parse()` would produce

#### Scenario: parseMdFrontmatter handles YAML frontmatter

- **WHEN** the input Markdown contains `---\nslug: x\ntitle: y\n---`
- **THEN** `parseMdFrontmatter()` SHALL return `{ slug: "x", title: "y" }`

#### Scenario: parseMdFrontmatter returns {} for missing frontmatter

- **WHEN** the input Markdown has no `---` delimited frontmatter block
- **THEN** `parseMdFrontmatter()` SHALL return `{}`

#### Scenario: readBundlePlan reads rb_plan.md frontmatter

- **WHEN** `readBundlePlan(bundlePath)` is called with a valid bundle directory
- **THEN** it SHALL return the parsed frontmatter object from `rb_plan.md`
- **AND** it SHALL delegate to `parseMdFrontmatter()` for extraction and parsing

### Requirement: Anti-regression scan for JSON.parse frontmatter usage

A regression test SHALL exist that scans gate CLI, validate-bundle, and instantiate-run-bundle source files for `JSON.parse` used in frontmatter parsing contexts. If any gate or bundle tooling file is found using `JSON.parse(m[1])` or equivalent hand-rolled frontmatter parsing instead of the shared `parseMdFrontmatter()` / `readBundlePlan()` functions, the test SHALL fail.

This test acts as an automated guardrail: new gate CLIs or bundle tools that copy-paste the old `JSON.parse` pattern will be caught in CI without requiring human code review to remember the convention.

#### Scenario: JSON.parse in frontmatter context is detected

- **WHEN** a gate CLI or bundle tool source file contains `JSON.parse` on a frontmatter regex match result
- **THEN** the anti-regression scan SHALL fail with a message pointing to the file and line
