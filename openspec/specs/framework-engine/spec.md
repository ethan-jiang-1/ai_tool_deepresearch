# Framework Engine

> req: FRE-001, FRE-003, FRE-004, FRE-005

## Purpose

Define the canonical location and import contract for production engine modules under `DEEP_RESEARCH_HARNESS/engine/`. These engines are the single source of truth for deterministic queue, gate, loader, work-unit, and hygiene mechanisms shared by production run bundles and experiment playbooks.
## Requirements
### Requirement: Engine code canonical location

Production work-unit Engine code SHALL live under
`DEEP_RESEARCH_HARNESS/engine/` and production CLI entrypoints SHALL live under
`DEEP_RESEARCH_HARNESS/cli/`. Runtime bundle state SHALL live under the current
run bundle root in `rb_queue.json`, `rb_output_declarations.jsonl`, and
`_work_units/`; `DEEP_RESEARCH_HARNESS/` SHALL remain reusable Harness assets,
not run state.

`DEEP_RESEARCH_HARNESS/` SHALL be the sole filesystem location for production
Engine and CLI assets. The repository SHALL not retain a filesystem alias,
alternate import location, or current guidance that resolves another source
coordinate to those assets. New source imports and current guidance SHALL use
the canonical Harness root.

Test-owned dependencies below `tests/fixtures/` MAY expose only the fixture
files required by the accepted `test-fixtures` contract. They SHALL NOT be
treated as a production Engine/CLI location, a production import coordinate, or
an Agent/operator command entry.

Harness import and location guidance SHALL describe deterministic queue, gate,
loader, and work-unit mechanisms. It SHALL NOT describe retired relay/slot
engine modules as production mechanisms outside explicit negative, deprecated,
checker self-reference, or minimized release-history contexts.

#### Scenario: Work-unit state is written to the current run bundle

- **WHEN** `operate-work-unit claim` runs against a bundle
- **THEN** work-unit envelope files SHALL be written under the current run
  bundle root's `_work_units/`
- **AND** no run-specific state SHALL be written under
  `DEEP_RESEARCH_HARNESS/`

#### Scenario: Engine source location is singular

- **WHEN** an Agent, CLI import, or production command locates Engine assets
- **THEN** it SHALL locate them below `DEEP_RESEARCH_HARNESS/engine/` or
  `DEEP_RESEARCH_HARNESS/cli/` as applicable
- **AND** the repository SHALL not resolve a second source path to the same
  Engine assets

#### Scenario: Harness guidance avoids retired engine authority

- **WHEN** a current Harness doc describes delegated production engine modules
- **THEN** it SHALL identify work-unit helpers and CLIs
- **AND** it SHALL NOT name a retired relay engine as production authority

### Requirement: Gate helpers provide shared frontmatter parsing

`DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs` SHALL export two shared functions for Markdown frontmatter parsing, eliminating duplicated `JSON.parse(m[1])` logic across gate CLIs and bundle tooling:

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

### Requirement: Queue manager internal module and regression layout

Queue Manager internals SHALL be updated from single-current-item delegated completion to queue v2 and work-unit binding helpers while preserving the public framework boundary for non-delegated queue operations. Regression coverage SHALL move from non-work-unit delegated completion to work-unit claim/submit state transitions.

Regression coverage SHALL keep negative tests for retired relay/slot tokens only as rejection or hygiene cases. Such tests SHALL NOT read as production usage examples.

#### Scenario: queue manager rejects non-work-unit delegated completion

- **WHEN** Queue Manager receives a delegated completion request that lacks a work-unit submit transaction
- **THEN** it SHALL reject the request
- **AND** it SHALL not append output declarations

#### Scenario: old token regression is negative

- **WHEN** a regression test mentions a retired relay/slot token
- **THEN** the test SHALL assert rejection, hygiene failure, or diagnostic classification
- **AND** it SHALL NOT use that token as a successful delegated production path

### Requirement: operate-work-unit owns delegated execution attempts

The Framework Engine SHALL provide `operate-work-unit` as the only production delegated-work CLI. It SHALL implement `claim`, `submit`, `fail`, `timeout`, `abandon`, and `inspect` against an explicit bundle path. All configuration SHALL be passed through CLI flags, file arguments, or bundle state; environment variables SHALL NOT be required.

No current production CLI or documentation SHALL present a retired relay/slot command as delegated execution authority.

#### Scenario: delegated claim command creates envelope

- **WHEN** `operate-work-unit claim <bundle> --phase wave0 --count 2` runs against two eligible queue-front delegated items
- **THEN** the Engine SHALL create two work-unit envelopes
- **AND** the command output SHALL include both generated prompts and both `work_id` values

#### Scenario: delegated CLI surface is singular

- **WHEN** current command docs list delegated production operations
- **THEN** they SHALL list `operate-work-unit` lifecycle commands
- **AND** they SHALL NOT list retired relay/slot commands as production operations

### Requirement: Work-unit index is Engine-owned allocation registry

The Framework Engine SHALL maintain `_work_units/_index.json` as the allocation and attempt-state registry. The index SHALL store wave/batch counters, kind registry, work-unit entries, lease/deadline fields, optional runtime refs, status counts, and inspect projection. Agents and sub-agents SHALL NOT edit `_work_units/_index.json`.

#### Scenario: index projection mismatch fails inspect

- **WHEN** `_work_units/_index.json` status counts disagree with the `work_units` records
- **THEN** `operate-work-unit inspect` SHALL fail closed
- **AND** it SHALL identify the mismatched projection fields

### Requirement: Work-unit transaction journal protects multi-file mutations

The Framework Engine SHALL acquire a bundle-scoped lock before mutating queue, index, work-unit files, or ledger. Multi-file work-unit mutations SHALL write `_work_units/_transactions/{tx_id}.json` before mutation and mark it committed only after all authority surfaces agree.

#### Scenario: uncommitted transaction blocks authority

- **WHEN** inspect finds an uncommitted work-unit transaction journal
- **THEN** inspect SHALL fail closed
- **AND** it SHALL not silently heal queue, index, or ledger state

### Requirement: Work-unit ID validation is deterministic

The Framework Engine SHALL validate `work_id` with `^wu-w[0-9]+-b[0-9]{3}-[a-z][a-z0-9]{1,7}-i[0-9]{4}$` and SHALL reject IDs whose encoded fields disagree with directory path, manifest, index, result, or ledger fields. The encoded kind segment is `kind_code`; validation SHALL resolve it through the Engine-owned kind registry before comparing it with the full `kind` field on queue demand, manifest, result, and ledger surfaces.

#### Scenario: two-digit batch is invalid

- **WHEN** a work-unit path or result uses `wu-w0-b00-src-i0001`
- **THEN** Engine validation SHALL reject the ID
- **AND** `wu-w0-b000-src-i0001` SHALL pass format validation before cross-field checks

#### Scenario: unregistered kind code is invalid

- **WHEN** a work-unit ID contains kind code `deep`
- **AND** `_work_units/_index.json` has no kind registry entry mapping `deep` to the manifest's full `kind`
- **THEN** Engine validation SHALL reject the work-unit binding
