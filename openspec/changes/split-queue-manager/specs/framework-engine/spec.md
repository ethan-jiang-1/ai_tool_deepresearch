> req: FRE-005

## ADDED Requirements

### Requirement: Queue manager internal module and regression layout

The Queue Manager engine SHALL remain importable at its canonical barrel path `DPT_FRAMEWORK/engine/queue-manager.mjs`. Implementation logic MAY be split across five internal flat sub-modules at `DPT_FRAMEWORK/engine/queue-manager-{suffix}.mjs` provided that:

1. The barrel re-exports every public symbol previously exported from the monolithic file: `QUEUE_ACTIVE_WINDOW_SLOTS`, `SLOT_NAMES`, `QueueItemSchema`, `QUEUE`, `OutputDeclarationLedgerRecord`, `checkReceipts`, `createQueue`, `loadQueue`, `saveQueue`, `enqueue`, `claim`, `complete`, `fail`, `preempt`, `inspect`, `pendingCount`, `render`, and `makeItem`.
2. External consumers SHALL continue importing from `queue-manager.mjs` only. This includes production CLIs, regression tests, integration tests, experiment playbooks with inline JS, and workflow/playbook code that reaches the engine through `operate-queue.mjs`.
3. Sub-module boundaries SHALL follow queue responsibility domains: core schema/trace/logger helpers, active-window mechanics, delegated provenance/ledger, lifecycle API, and projection rendering.
4. Trace/logger bundle singleton state SHALL exist in exactly one sub-module; other sub-modules SHALL import shared helpers rather than duplicate module-level state.
5. The split SHALL NOT change runtime behavior, public export signatures, Zod schema semantics, trace/log event names, queue file shape, output declaration ledger shape, projection path, or workflow/playbook queue invocation semantics.
6. The companion regression test monolith `tests/engine/queue-manager.test.mjs` SHALL be split into topic-focused test files under `tests/engine/`, with any shared fixtures kept under `tests/`. These tests SHALL continue validating the public barrel path rather than importing Queue Manager internal sub-modules directly.

Internal sub-modules:

| Sub-module | Responsibility |
|------------|----------------|
| `queue-manager-core.mjs` | Trace/logger init, Queue constants, Zod schemas, queue validation and shared helpers |
| `queue-manager-window.mjs` | Active-window mechanics, pool sorting, promote/refill, urgent preemption |
| `queue-manager-ledger.mjs` | Delegated completion provenance, output declaration ledger, cache trail validation |
| `queue-manager-lifecycle.mjs` | Public queue lifecycle API and receipt checking |
| `queue-manager-render.mjs` | Markdown projection rendering |

Regression test files:

| Test file | Coverage |
|-----------|----------|
| `queue-manager-schema.test.mjs` | Queue item schema, TargetSpec, active-window constants, makeItem defaults |
| `queue-manager-window-lifecycle.test.mjs` | enqueue, claim, pendingCount, complete/fail promotion and refill, preempt |
| `queue-manager-receipts-cli-render.test.mjs` | checkReceipts, projection rendering, save/load, operate-queue CLI smoke |
| `queue-manager-delegated.test.mjs` | delegated complete, Queue↔Relay pipeline, ledger, gate handoff |
| `queue-manager-logging.test.mjs` | LOG-006 Queue Manager diagnostics |

#### Scenario: External import path unchanged

- **WHEN** `DPT_FRAMEWORK/cli/operate-queue.mjs` imports Queue Manager functions
- **THEN** the import SHALL reference `../engine/queue-manager.mjs`
- **AND** queue lifecycle behavior SHALL match pre-split behavior

#### Scenario: Regression tests protect the barrel contract

- **WHEN** `node --test tests/engine/queue-manager*.test.mjs` runs
- **THEN** the split regression tests SHALL pass
- **AND** test files SHALL import Queue Manager public API from `../../DPT_FRAMEWORK/engine/queue-manager.mjs`
- **AND** they SHALL NOT import `queue-manager-*.mjs` internal sub-modules directly

#### Scenario: Workflow Markdown requires no edits

- **WHEN** workflow phase Markdown calls Queue operations
- **THEN** it SHALL continue using `DPT_FRAMEWORK/cli/operate-queue.mjs`
- **AND** no workflow phase Markdown SHALL import `queue-manager.mjs` or `queue-manager-*.mjs` directly

#### Scenario: Experiment playbooks keep real queue paths

- **WHEN** experiment playbooks exercise Queue behavior through inline JS or CLI commands
- **THEN** inline JS imports SHALL continue targeting `../DPT_FRAMEWORK/engine/queue-manager.mjs`
- **AND** CLI examples SHALL continue invoking `DPT_FRAMEWORK/cli/operate-queue.mjs`
- **AND** no experiment playbook SHALL import Queue Manager internal sub-module paths

#### Scenario: Trace and logger singleton not duplicated

- **WHEN** `loadQueue()`, `enqueue()`, `complete()`, and `render()` run against the same bundle in one process
- **THEN** trace and run-log events SHALL be written through the shared Queue Manager trace/logger helpers
- **AND** the split SHALL NOT create multiple independent Queue Manager trace/logger singleton states

#### Scenario: Queue artifacts remain stable

- **WHEN** Queue operations persist runtime state or projections after the split
- **THEN** `rb_queue.json`, `_cache/agentic-queue/current-task.md`, `rb_output_declarations.jsonl`, and `rb_trace.jsonl` SHALL retain their existing paths and shapes
