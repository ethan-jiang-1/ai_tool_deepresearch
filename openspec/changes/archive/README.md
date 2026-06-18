# Archived Changes

This directory contains historical snapshots of completed OpenSpec changes. Each archive is frozen at the time it was closed — its `design.md`, `proposal.md`, `specs/`, and `tasks.md` reflect the codebase state and file paths as they existed at archive time.

## Path Drift

Archived change documents may reference paths that no longer exist. Notable relocations:

| Pattern in archives | Current location |
|---------------------|------------------|
| `experiments/prototype-*/<engine>.mjs` | `DPT_FRAMEWORK/engine/<engine>.mjs` |
| `experiments/prototype-*/trace.mjs` | `DPT_FRAMEWORK/engine/trace.mjs` |
| `experiments/prototype-agentic-queue/agentic-queue-cli.mjs` | `DPT_FRAMEWORK/cli/operate-queue.mjs` |
| `DPT_FRAMEWORK/command_experiments/` | `experiments_playbook/` |
| `DPT_FRAMEWORK/command_experiments/scripts/new-disposable-bundle.mjs` | `experiments/shared/new-disposable-bundle.mjs` |
| `segments-gate-loop/` | `nodes-gate-loop/` (segment→node rename, see `seg2node` change) |
| `segmentRegistry` / `loadNextSegment()` | `forkMap` / `forkRouter()` (in `subagent-relay.mjs`) |
| `setTraceFile()` / `getTraceFile()` | `createTrace()` factory (in `DPT_FRAMEWORK/engine/trace.mjs`) |
| `claimCurrent` / `completeCurrent` / `failCurrent` | `claim` / `complete` / `fail` (in `queue-manager.mjs`) |
| `renderProjection` / `inspectQueue` | `render` / `inspect` (in `queue-manager.mjs`) |
| `executeMDAndRun()` | `assessNode()` (in `workflow-chain.mjs`) |
| `loadAndExecuteNode()` / `runFSM()` | `Machine.advance()` / `createMachine()` (in `workflow-fsm.mjs`) |
| `GateResult: pass/fail/needs_repair` | `GateResult: pass/fail` (in `schema/enums.mjs`) |
| `loadBundle()` | Removed (no equivalent) |
| `conditional-segments` spec | `conditional-nodes` spec |
| `dynamic-segment-loading` spec | `dynamic-node-loading` spec |
| `workflow-next` capability | Deprecated; `workflow-chain.mjs` is the active engine |

## Authoritative Source

For the current state of any requirement, consult the main specs under `openspec/specs/`, not the archived change documents. The requirement ID registry at `openspec/governance/req-registry.yaml` tracks the status of every requirement ID.
