# Framework Engine

> req: FRE-001

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

No engine module SHALL exist as a copy in `experiments/prototype-*/`. Experiment playbooks and production run bundles SHALL import engines from their canonical paths.

Workflow Chain is an MD loader + dependency resolver: it parses frontmatter, resolves dependency closures, reads and caches MD files, and returns results for the Agent to read. It SHALL NOT execute JS code blocks from MD nodes — MD content is Agent-readable, not engine-executable.

#### Scenario: Experiment playbook imports engine from framework

- **WHEN** an experiment playbook inline script executes an engine function
- **THEN** the import statement SHALL reference `../DPT_FRAMEWORK/engine/<module>.mjs`

#### Scenario: Production run bundle imports engine from framework

- **WHEN** a production run bundle script calls an engine function
- **THEN** the import statement SHALL reference `../DPT_FRAMEWORK/engine/<module>.mjs` (same relative path)

#### Scenario: No engine copy remains in experiments

- **WHEN** the change is complete
- **THEN** no `experiments/prototype-*/` directory SHALL contain an engine `.mjs` file that duplicates a module in `DPT_FRAMEWORK/engine/`


