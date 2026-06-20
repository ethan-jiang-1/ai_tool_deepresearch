# Framework Engine
> req: FRE-001, FRE-002

## MODIFIED Requirements

### Requirement: Engine inter-dependency via import

Engine modules that depend on another engine's functionality SHALL import it directly rather than embedding a copy of the code. `queue-manager.mjs` and `subagent-relay.mjs` both import `createTrace` from `trace.mjs`. `transition-chain.mjs` and `transition-fsm.mjs` provide transition-table helpers used by routing. `workflow-fsm.mjs` is the stateful FSM runtime wrapper; it imports pure resolution from `transition-fsm.mjs` and owns `Machine` / `createMachine`. `gate-loop.mjs` and `gate-fork.mjs` are single-function exports with no engine imports. `workflow-chain.mjs` is an MD loader + dependency resolver with no engine imports and no VM sandbox execution.

#### Scenario: Queue manager and subagent relay import trace

- **WHEN** `queue-manager.mjs` or `subagent-relay.mjs` needs trace writing
- **THEN** it SHALL `import { createTrace } from './trace.mjs'`

#### Scenario: Workflow FSM delegates pure resolution

- **WHEN** `workflow-fsm.mjs` performs FSM transition resolution
- **THEN** it SHALL import pure resolution from `transition-fsm.mjs`
- **AND** it SHALL NOT import loader functions from `workflow-chain.mjs`

#### Scenario: Subagent relay is self-contained for fork/repair

- **WHEN** `subagent-relay.mjs` performs fork routing, dispatch, collect, merge, or repair
- **THEN** it SHALL use its own domain-specific implementation
- **AND** it SHALL NOT import fork/repair functions from `gate-fork.mjs`
