> req: FRE-001, FRE-002

## Purpose

Define the canonical location, import contract, and dependency rules for production engine modules under `DPT_FRAMEWORK/engine/`. These engines are the single source of truth for deterministic queue, gate, loader, FSM, and subagent relay mechanisms — shared by both production run bundles and experiment playbooks.

## Requirements

### Requirement: Engine code canonical location

Six production engine modules SHALL reside at `DPT_FRAMEWORK/engine/` as their single canonical location:

| Module | Canonical Path |
|--------|---------------|
| Queue Manager | `DPT_FRAMEWORK/engine/queue-manager.mjs` |
| Gate Loop | `DPT_FRAMEWORK/engine/gate-loop.mjs` |
| Gate Fork | `DPT_FRAMEWORK/engine/gate-fork.mjs` |
| Subagent Relay | `DPT_FRAMEWORK/engine/subagent-relay.mjs` |
| Workflow Loader | `DPT_FRAMEWORK/engine/workflow-loader.mjs` |
| Workflow FSM | `DPT_FRAMEWORK/engine/workflow-fsm.mjs` |

No engine module SHALL exist as a copy in `experiments/prototype-*/`. Experiment playbooks and production run bundles SHALL import engines from their canonical paths.

#### Scenario: Experiment playbook imports engine from framework

- **WHEN** an experiment playbook inline script executes an engine function
- **THEN** the import statement SHALL reference `../DPT_FRAMEWORK/engine/<module>.mjs`

#### Scenario: Production run bundle imports engine from framework

- **WHEN** a production run bundle script calls an engine function
- **THEN** the import statement SHALL reference `../DPT_FRAMEWORK/engine/<module>.mjs` (same relative path)

#### Scenario: No engine copy remains in experiments

- **WHEN** the change is complete
- **THEN** no `experiments/prototype-*/` directory SHALL contain an engine `.mjs` file that duplicates a module in `DPT_FRAMEWORK/engine/`

### Requirement: Engine inter-dependency via import

Engine modules that depend on another engine's functionality SHALL import it directly rather than embedding a copy of the code.

#### Scenario: Subagent relay imports fork router from gate-fork

- **WHEN** `subagent-relay.mjs` needs fork routing (`evaluateBranch`, `forkRouter`, `convergeRepair`)
- **THEN** it SHALL `import { evaluateBranch, forkRouter, convergeRepair } from './gate-fork.mjs'`
- **AND** it SHALL NOT contain an embedded copy of those functions

#### Scenario: Workflow FSM imports loader from workflow-loader

- **WHEN** `workflow-fsm.mjs` needs loader functions (`resolveDependencyClosure`, `executeLoadPlan`, `createInitialState`, `createWorkflowRuntime`, `nodePath`, `parseFrontmatter`, `readMarkdownFile`)
- **THEN** it SHALL `import { ... } from './workflow-loader.mjs'`
- **AND** it SHALL NOT contain an embedded copy of those functions
