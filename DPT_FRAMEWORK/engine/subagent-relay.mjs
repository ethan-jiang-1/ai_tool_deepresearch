// @impl SUD-001, SUS-001, SUC-001, SUR-001, FRE-001, FRE-004
// Canonical engine location: DPT_FRAMEWORK/engine/subagent-relay.mjs
//
// Barrel re-export — implementation lives in subagent-relay-*.mjs sub-modules.
// All existing imports of subagent-relay.mjs continue to work unchanged.
//
// ## Role
// Subagent Relay Engine — prepares file-system contracts for native LLM subagent
// slots, then validates and merges results. This engine OWNS deterministic slot
// lifecycle, schema validation, and trace. The LLM Agent OWNS search, evidence
// judgment, and content extraction inside each subagent slot.
//
// ## Pipeline (what playbooks call, in order)
// ```
// stageSubagentSlots(state, baseDir, dispatchMap?)       → write task.md, schema, manifest
//   ↓
// recordAgentSpawnRequested(slot, baseDir, metadata?)     → trace + build spawn prompt
//   ↓  [Agent launches native subagent; subagent writes runtime-receipt.jsonl]
// ingestAgentReceipt(slot, baseDir, metadata)             → validate receipt, write _agent.json
//   ↓
// commitSlotResult(slot, baseDir, candidateResult, meta?) → validate + write result.json
//   ↓
// collectAndMergeSubagentResults(state, slots, baseDir)   → collect, merge, optionally repair
//   ↓
// forkRouter(state)                                        → classify branch, decide next action
// ```
//
// ## Sub-modules
//   subagent-relay-schemas-trace.mjs    — Zod schemas, trace/logger init, path helpers
//   subagent-relay-fork-dispatch.mjs    — fork/dispatch map, converge repair, diagnostics
//   subagent-relay-stage.mjs            — slot staging, task.md / manifest / spawn prompt
//   subagent-relay-slot-runtime.mjs     — slot status, receipt validation, result commit
//   subagent-relay-collect-pipeline.mjs — collect/merge/pipeline orchestrators

// Schemas + trace foundation
export {
  MAX_CONCURRENT_SUBAGENTS,
  Branch,
  SlotStatus,
  DispatchManifest,
  OutputFileRole,
  OutputFileEntry,
  AgentOutputDeclarationSchema,
  SlotResult,
  SubagentWorkflowState,
} from './subagent-relay-schemas-trace.mjs';

// Fork / dispatch / repair
export {
  classifyBranch,
  forkRouter,
  getDispatchMap,
  convergeRepair,
  validateAndDiagnose,
  inspectFailure,
} from './subagent-relay-fork-dispatch.mjs';

// Stage
export {
  createSlot,
  stageSubagentSlots,
  stageReplacementSlot,
  loadSlotByManifestEntry,
} from './subagent-relay-stage.mjs';

// Slot runtime
export {
  readSlotStatus,
  writeSlotStatus,
  recordAgentSpawnRequested,
  validateRuntimeReceipt,
  ingestAgentReceipt,
  commitSlotResult,
  markSlotFailed,
  readSlotResult,
} from './subagent-relay-slot-runtime.mjs';

// Collect / pipeline
export {
  collectResults,
  mergeResults,
  forkAndStageSubagents,
  collectAndMergeSubagentResults,
  resolveSlotFromResultRef,
} from './subagent-relay-collect-pipeline.mjs';
