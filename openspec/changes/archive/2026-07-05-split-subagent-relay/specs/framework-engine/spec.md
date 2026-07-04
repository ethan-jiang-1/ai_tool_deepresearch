> req: FRE-004

## ADDED Requirements

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
