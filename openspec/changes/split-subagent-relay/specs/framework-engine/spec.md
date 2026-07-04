## ADDED Requirements

### Requirement: Subagent relay internal module layout

The Subagent Relay engine SHALL remain importable at its canonical barrel path `DPT_FRAMEWORK/engine/subagent-relay.mjs`. Implementation logic MAY be split across internal flat sub-modules at `DPT_FRAMEWORK/engine/subagent-relay-{suffix}.mjs` (same directory as the barrel, no subdirectory) provided that:

1. The barrel re-exports every public symbol previously exported from the monolithic file (schemas, constants, pipeline functions, slot I/O, fork/repair helpers).
2. External consumers (`queue-manager.mjs`, `drive-relay-slot.mjs`, tests, experiment playbooks) SHALL continue importing from `subagent-relay.mjs` only — they SHALL NOT import sub-module paths directly. Gate CLIs do not import this engine; they are not consumers of this refactor.
3. Sub-module files SHALL each stay within **200–800 lines** after the split (barrel excluded).
4. Trace/logger bundle singleton state (`ensureTrace`, `traceEntry`, `logEvent`) SHALL exist in exactly one sub-module; other sub-modules SHALL import it rather than duplicate module-level state.
5. The split SHALL NOT change runtime behavior, export signatures, Zod schema semantics, trace event names, or on-disk slot path conventions.
6. Workflow phase Markdown nodes (`DPT_FRAMEWORK/workflows/nodes/**/*.md`) SHALL NOT require edits for this refactor: they drive relay through `DPT_FRAMEWORK/cli/drive-relay-slot.mjs` (SNC-003), not through inline JavaScript imports of engine modules.

Internal sub-modules SHALL align with the relay pipeline stages:

| Sub-module | Responsibility |
|------------|----------------|
| `subagent-relay-schemas-trace.mjs` | Zod schemas, `ForkStep`, trace/logger init, shared path helpers |
| `subagent-relay-fork-dispatch.mjs` | Branch classification, dispatch map, converge repair, validation diagnostics |
| `subagent-relay-stage.mjs` | Slot staging, task.md / schema / manifest / spawn prompt materialization |
| `subagent-relay-slot-runtime.mjs` | Slot status transitions, runtime receipt validation, result commit |
| `subagent-relay-collect-pipeline.mjs` | Result collection, merge, high-level pipeline orchestrators, `resolveSlotFromResultRef` |

#### Scenario: External import path unchanged

- **WHEN** `queue-manager.mjs` imports `SlotResult` from `../subagent-relay.mjs`
- **THEN** the import SHALL resolve successfully without path changes
- **AND** `SlotResult.parse()` behavior SHALL be identical to pre-split

#### Scenario: Sub-module line budget

- **WHEN** the split is complete
- **THEN** each `DPT_FRAMEWORK/engine/subagent-relay-*.mjs` file (excluding the barrel) SHALL be at least 200 lines and at most 800 lines
- **AND** the barrel `subagent-relay.mjs` MAY be shorter than 200 lines

#### Scenario: Trace singleton not duplicated

- **WHEN** `stageSubagentSlots()` and `commitSlotResult()` run in the same bundle within one process
- **THEN** both SHALL write to the same `rb_trace.jsonl` via the shared trace singleton
- **AND** trace entries SHALL include consistent `bundle` field values

#### Scenario: Regression tests pass unchanged

- **WHEN** `node --test tests/engine/subagent-relay.test.mjs` runs after the split
- **THEN** all tests SHALL pass without modifying test assertions for behavior

#### Scenario: Workflow MD requires no import path edits

- **WHEN** a grep for inline engine imports runs over `DPT_FRAMEWORK/workflows/**/*.md`
- **THEN** zero matches SHALL import `subagent-relay.mjs` or `subagent-relay-*.mjs` directly
- **AND** phase nodes SHALL continue to instruct the Phase Agent to call `drive-relay-slot.mjs` for relay lifecycle

#### Scenario: Sub-module paths are not external import surfaces

- **WHEN** a grep for `subagent-relay-` imports runs over `DPT_FRAMEWORK/`, `tests/`, and `experiments_playbook/` (excluding the barrel file's re-export lines)
- **THEN** no consumer outside `DPT_FRAMEWORK/engine/subagent-relay*.mjs` SHALL import a `subagent-relay-{suffix}.mjs` path directly
