# Framework Engine

> req: FRE-001, FRE-003, FRE-004

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

### Requirement: Subagent relay internal module layout

The Subagent Relay engine SHALL remain importable at its canonical barrel path `DPT_FRAMEWORK/engine/subagent-relay.mjs`. Implementation logic MAY be split across **five** internal flat sub-modules at `DPT_FRAMEWORK/engine/subagent-relay-{suffix}.mjs` (same directory as the barrel, no subdirectory) provided that:

1. The barrel re-exports every public symbol previously exported from the monolithic file (**32** exports per `rg '^export ' subagent-relay.mjs` at apply baseline).
2. External consumers (`queue-manager.mjs`, `drive-relay-slot.mjs`, tests, experiment playbooks) SHALL continue importing from `subagent-relay.mjs` only — they SHALL NOT import sub-module paths directly. Gate CLIs do not import this engine.
3. Sub-module boundaries SHALL follow the relay pipeline domains (schemas/trace → fork/dispatch → stage → slot runtime → collect/pipeline). A **200–800 line range per sub-module is advisory only**; logical cohesion and a cycle-free dependency graph take precedence over line count.
4. Trace/logger bundle singleton state (`ensureTrace`, `traceEntry`, `logEvent`) SHALL exist in exactly one sub-module; other sub-modules SHALL import it rather than duplicate module-level state.
5. The split SHALL NOT change runtime behavior, export signatures, Zod schema semantics, trace event names, or on-disk slot path conventions.
6. Workflow phase Markdown nodes SHALL NOT require edits: they drive relay through `drive-relay-slot.mjs` (SNC-003).

Internal sub-modules:

| Sub-module | Responsibility | Approx. lines |
|------------|----------------|---------------|
| `subagent-relay-schemas-trace.mjs` | Zod schemas, trace/logger init, path helpers | ~209 |
| `subagent-relay-fork-dispatch.mjs` | Fork/dispatch map, converge repair, validation diagnostics | ~294 |
| `subagent-relay-stage.mjs` | Slot staging, task.md / schema / manifest / spawn prompt | ~446 |
| `subagent-relay-slot-runtime.mjs` | Slot status transitions, runtime receipt validation, result commit | ~464 |
| `subagent-relay-collect-pipeline.mjs` | Result collection, merge, pipeline orchestrators, `resolveSlotFromResultRef` | ~242 |

#### Scenario: External import path unchanged

- **WHEN** `queue-manager.mjs` imports `SlotResult` from `../subagent-relay.mjs`
- **THEN** the import SHALL resolve without path changes
- **AND** `SlotResult.parse()` behavior SHALL be identical to pre-split

#### Scenario: Sub-module boundaries follow pipeline domains

- **WHEN** the split is complete
- **THEN** fork/dispatch and repair diagnostics SHALL reside in `subagent-relay-fork-dispatch.mjs`
- **AND** trace/logger singletons SHALL reside in `subagent-relay-schemas-trace.mjs`
- **AND** no sub-module file SHALL exceed ~1000 lines without a documented reason

#### Scenario: Trace singleton not duplicated

- **WHEN** `stageSubagentSlots()` and `commitSlotResult()` run in the same bundle within one process
- **THEN** both SHALL write to the same `rb_trace.jsonl` via the shared trace singleton

#### Scenario: Regression tests pass unchanged

- **WHEN** `node --test tests/engine/subagent-relay.test.mjs` runs after the split
- **THEN** all tests SHALL pass without modifying test assertions

#### Scenario: Two-argument stage call still works

- **WHEN** `drive-relay-slot.mjs` calls `stageSubagentSlots(state, bundleDir)` with no third argument
- **THEN** the built-in dispatch map SHALL still resolve via `getDispatchMap()` inside `stageSubagentSlots`

#### Scenario: Workflow MD requires no import path edits

- **WHEN** grep runs over `DPT_FRAMEWORK/workflows/**/*.md` for inline engine imports
- **THEN** zero matches SHALL import `subagent-relay.mjs` or `subagent-relay-*.mjs` directly

#### Scenario: Sub-module paths are not external import surfaces

- **WHEN** grep for `from '.*subagent-relay-` runs over `DPT_FRAMEWORK/`, `tests/`, and `experiments_playbook/`
- **THEN** matches SHALL appear only under `DPT_FRAMEWORK/engine/subagent-relay*.mjs`
