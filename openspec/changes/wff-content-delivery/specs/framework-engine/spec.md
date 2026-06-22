## MODIFIED Requirements

### Requirement: Engine code canonical location

The deterministic engine code SHALL reside exclusively under `DPT_FRAMEWORK/engine/`. Six engine modules SHALL be maintained:

| Engine | File |
|--------|------|
| Queue Manager | `DPT_FRAMEWORK/engine/queue-manager.mjs` |
| Gate Loop | `DPT_FRAMEWORK/engine/gate-loop.mjs` |
| Gate Fork | `DPT_FRAMEWORK/engine/gate-fork.mjs` |
| Subagent Relay | `DPT_FRAMEWORK/engine/subagent-relay.mjs` |
| Workflow Chain | `DPT_FRAMEWORK/engine/workflow-chain.mjs` |
| Trace Writer | `DPT_FRAMEWORK/engine/trace.mjs` |

Engine code SHALL NOT be duplicated under `experiments/`, `tests/`, or any runtime bundle directory. The engine code SHALL be imported by CLIs, the gate loop, and the lifecycle walker.

#### Scenario: Six engine modules present

- **WHEN** listing `DPT_FRAMEWORK/engine/`
- **THEN** the six listed engine modules SHALL exist
- **AND** `trace.mjs` SHALL exist (imported by queue-manager and subagent-relay for `createTrace`)
- **AND** there SHALL be zero copies under `experiments/`

#### Scenario: No FSM engine modules

- **WHEN** listing `DPT_FRAMEWORK/engine/`
- **THEN** `workflow-fsm.mjs` SHALL NOT exist
- **AND** `transition-fsm.mjs` SHALL NOT exist

#### Scenario: Integrity via validate-workflow-package

- **WHEN** `DPT_FRAMEWORK/cli/validate-workflow-package.mjs` runs
- **THEN** it SHALL validate the workflow package without requiring a `.fsm.json` file

## REMOVED Requirements

### Requirement: Engine inter-dependency via import

**Reason**: `transition-fsm.mjs` and `workflow-fsm.mjs` are removed as dead code. The only remaining transition backend is `transition-chain.mjs`. `ask-next.mjs` imports only `transition-chain.mjs`. `consistency-validator.mjs` validates only the chain table.

**Migration**: No migration needed. Engine inter-dependency is simplified: `ask-next.mjs` → `transition-chain.mjs`, `consistency-validator.mjs` → `transition-chain.mjs` (via opt). All gate CLIs use `transitions.chain.json` by default.
