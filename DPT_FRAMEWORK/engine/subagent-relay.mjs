// @impl SUD-001, SUS-001, SUC-001, SUR-001, FRE-001
// Canonical engine location: DPT_FRAMEWORK/engine/subagent-relay.mjs
//
// ## Role
// Subagent Relay Engine — prepares file-system contracts for native LLM subagent
// slots, then validates and merges results. This engine OWNS deterministic slot
// lifecycle, schema validation, and trace. The LLM Agent OWNS search, evidence
// judgment, and content extraction inside each subagent slot.
//
// Think of this engine as "prepare then validate": it stages task.md and result
// schema for each slot, validates the Agent's returned JSON, and merges evidence
// counts into workflow state. It NEVER launches agents, makes search decisions,
// or judges evidence quality.
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
// collectAndMergeSubagentResults may trigger convergeRepair automatically when
// ALL subagents failed — the caller does not need to check for this condition.
// The return value always includes `checkResult`, `forkDecision`, and `repaired`
// fields; one of `checkResult`/`forkDecision` or `repaired` will be non-null.
//
// ## metadata parameter
// These functions accept an optional `metadata` object. All fields are optional
// unless noted:
//   platform             - 'claude-code' | 'codex' | …
//   runtimeMode          - 'project-agent' | 'builtin-agent-with-role-prompt' | …
//   runtimeAgentId       - REQUIRED for ingestAgentReceipt. The subagent's runtime ID.
//   parentRuntimeAgentId - the parent (caller) agent's runtime ID. Falls back to
//                          env DPT_PARENT_RUNTIME_AGENT_ID if not passed.
//   agentType            - 'worker' | …
//   spawnedAt            - ISO timestamp override (default: now)
//
// ## Architecture note
// This is the ONLY engine among the 6 DPT engines with extensive trace usage.
// gate-loop and gate-fork are pure deterministic functions (zero trace).
// queue-manager has trace but auto-inits from bundleDir like this one.
// Subagent relay needs trace because native subagent lifecycle spans parent←→
// subagent process boundaries and requires full observability.
//
// ## Trace
// Auto-inits on first mutation call via ensureTrace(baseDir). Fixed filename
// `_logs/_trace_subagent.jsonl` inside the bundle. consoleEcho: false (file only).
// Consumers never touch trace setup — no setter, no createTrace import needed.
//
// ## On-disk paths
// Slot files are written under `_subagents/wave_NN/slot_MM/`. The "wave" term
// in directory names is spec-contract (see openspec/specs/subagent-dispatch/).
// Internal helpers use "wave" naming to match these on-disk paths exactly.
//
// ## Exports
//   Pipeline:     stageSubagentSlots, recordAgentSpawnRequested, ingestAgentReceipt,
//                 commitSlotResult, collectAndMergeSubagentResults, forkRouter
//   Branch:       classifyBranch, convergeRepair
//   Validation:   validateAndDiagnose, inspectFailure
//   Slot I/O:     createSlot, readSlotStatus, writeSlotStatus, readSlotResult
//   Dispatch:     getDispatchMap
//   Collection:   collectResults, mergeResults, forkAndStageSubagents
//   Convenience:  markSlotFailed
//   Schemas:      SubagentWorkflowState, SlotResult, Branch, SlotStatus, DispatchManifest
//   Constants:    MAX_CONCURRENT_SUBAGENTS

import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createTrace } from './trace.mjs';
import { createRunLogger, readBundleName } from './logger.mjs';

// Trace + logger auto-init on first mutation call via ensureTrace(bundleDir).
// Fixed trace filename `_logs/_trace_subagent.jsonl` within the bundle. consoleEcho: false.
// Consumers never touch trace/log setup — no setter, no createTrace import needed.
let _trace = null;
let _traceBundleDir = null;
let _log = null;

function ensureTrace(bundleDir) {
  if (bundleDir && _traceBundleDir !== bundleDir) {
    _trace = createTrace(path.join(bundleDir, '_logs', '_trace_subagent.jsonl'), { consoleEcho: false });
    _traceBundleDir = bundleDir;
    _log = null; // reset on bundle change — logger must track the new bundle
  }
  if (!_log && bundleDir) {
    _log = createRunLogger(bundleDir);
  }
  return _trace;
}

function traceEntry(event, detail) {
  if (_trace) {
    const bundle = _traceBundleDir ? readBundleName(_traceBundleDir) : '<unknown>';
    _trace.traceEntry(event, { bundle, ...detail });
  }
}

// ── Logger helpers: log only the closed-set events (LOC-006) ──

/** @param {string} event — must be in LOC-006 closed-set */
function logEvent(level, event, detail) {
  if (_log) _log[level](event, detail);
}

export const MAX_CONCURRENT_SUBAGENTS = 4;

export const Branch = z.enum(['pass', 'fail_a', 'fail_b', 'blocked']);
export const SlotStatus = z.enum(['pending', 'running', 'done', 'failed']);

const RuntimeMode = z.enum([
  'project-agent',
  'builtin-agent-with-role-prompt',
  'session-dynamic-agent',
  'unknown',
]);

const SlotStatusFile = z.object({
  status: SlotStatus,
  updated: z.string(),
});

const SlotConfig = z.object({
  key: z.string(),
  slotIndex: z.number().int().min(0),
  roleAgentKey: z.string(),
  taskDescription: z.string(),
  modelHint: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export const DispatchManifest = z.object({
  wave: z.string(),
  waveIndex: z.number().int().min(1),
  created: z.string(),
  concurrencyCap: z.number().int().positive(),
  slots: z.array(SlotConfig),
});

const SubagentSlot = z.object({
  key: z.string(),
  roleAgentKey: z.string(),
  waveIndex: z.number().int().min(1),
  slotIndex: z.number().int().min(0),
  taskPath: z.string(),
  schemaPath: z.string(),
  resultPath: z.string(),
  summaryPath: z.string(),
  statusPath: z.string(),
  agentPath: z.string(),
  receiptPath: z.string(),
  receiptNonce: z.string().min(1),
  status: SlotStatus.default('pending'),
});

const RuntimeReceiptEvent = z.object({
  event: z.enum(['agent_runtime_started', 'agent_result_ready']),
  slotKey: z.string(),
  roleAgentKey: z.string(),
  receiptNonce: z.string().min(1),
  platform: z.string().optional(),
  runtimeMode: RuntimeMode.optional(),
  agentType: z.string().optional(),
  ts: z.string().optional(),
});

const EvidenceReference = z.object({
  title: z.string(),
  url: z.string(),
  quote: z.string().default(''),
  relevance: z.string().default(''),
});

export const SlotResult = z.object({
  slotKey: z.string(),
  roleAgentKey: z.string(),
  status: SlotStatus,
  summary: z.string().default(''),
  evidenceCount: z.number().int().min(0).default(0),
  references: z.array(EvidenceReference).default([]),
  confidence: z.number().min(0).max(1).default(0),
  notes: z.array(z.string()).default([]),
});

const AgentMetadata = z.object({
  slotKey: z.string(),
  roleAgentKey: z.string(),
  platform: z.string(),
  runtimeMode: RuntimeMode.default('unknown'),
  runtimeAgentId: z.string().min(1),
  agentType: z.string().optional(),
  spawnedAt: z.string(),
  completedAt: z.string().optional(),
  status: SlotStatus,
  validationOk: z.boolean().optional(),
  error: z.string().optional(),
});

export const SubagentWorkflowState = z.object({
  current_gate: z.string(),
  ref_count: z.number().default(0),
  ref_floor: z.number().default(5),
  topicReadiness: z.enum(['ready', 'not_ready', 'blocked']).default('ready'),
  subagent_wave: z.number().int().min(0).default(0),
  subagent_all_failed: z.boolean().default(false),
  subagent_results: z.array(SlotResult).default([]),
  topicRepairAttempted: z.boolean().optional(),
});

class ForkStep {
  constructor(name, executeFn) {
    this.name = name;
    this.execute = executeFn;
  }
}

// Historical implementation name: a ForkStep is a deterministic checkpoint
// transform record here, not an Agent-facing workflow node.

/**
 * Classify workflow state into a branch: 'pass', 'fail_a', 'fail_b', or 'blocked'.
 *
 * Rules are evaluated in priority order:
 *   1. blocked  — topicReadiness === 'blocked'
 *   2. fail_b   — topicReadiness !== 'ready'
 *   3. fail_a   — ref_count < ref_floor
 *   4. pass     — none of the above
 *
 * @param {object} state - workflow state (parsed against SubagentWorkflowState)
 * @returns {'pass'|'fail_a'|'fail_b'|'blocked'}
 */
export function classifyBranch(state) {
  const s = SubagentWorkflowState.parse(state);
  if (s.topicReadiness === 'blocked') return 'blocked';
  if (s.topicReadiness !== 'ready') return 'fail_b';
  if (s.ref_count < s.ref_floor) return 'fail_a';
  return 'pass';
}

const passStep = new ForkStep('pass_branch', (s) => ({ ...s, current_gate: 'wave_next' }));
const refCountLowStep = new ForkStep('fail_a_branch', (s) => ({ ...s, topicRepairAttempted: true }));
const topicNotReadyStep = new ForkStep('fail_b_branch', (s) => ({ ...s, ref_count: s.ref_count + 1 }));
const blockedStep = new ForkStep('blocked_branch', (s) => ({ ...s, current_gate: 'blocked_hitl' }));

const forkMap = new Map([
  ['pass', passStep],
  ['fail_a', refCountLowStep],
  ['fail_b', topicNotReadyStep],
  ['blocked', blockedStep],
]);

/**
 * Classify state and resolve the corresponding deterministic checkpoint transform.
 *
 * @param {object} state - workflow state
 * @returns {{ branch: string, step: ForkStep }}
 * @throws {Error} if no branch transform is registered for the classified branch
 */
export function forkRouter(state) {
  const branch = classifyBranch(state);
  const step = forkMap.get(branch);
  if (!step) throw new Error(`No fork for: ${branch}`);
  return { branch, step };
}


// Branch transforms are instantiated per fork map entry.
// Internal — consumers use forkRouter() to resolve branches.

const dispatchMap = new Map([
  ['pass', [
    {
      key: 'source_intake',
      slotIndex: 0,
      roleAgentKey: 'dpt-source-intake',
      taskDescription: 'Discover candidate sources for the research task and return bounded structured candidates.',
      timeoutMs: 10 * 60 * 1000,
    },
    {
      key: 'source_diagnostic',
      slotIndex: 1,
      roleAgentKey: 'dpt-source-diagnostic',
      taskDescription: 'Assess source quality, materiality, trust tier, and cross-verification needs.',
      timeoutMs: 10 * 60 * 1000,
    },
    {
      key: 'claim_verifier',
      slotIndex: 2,
      roleAgentKey: 'dpt-claim-verifier',
      taskDescription: 'Check whether critical claims are supported, weakened, contradicted, or uncertain.',
      timeoutMs: 10 * 60 * 1000,
    },
    {
      key: 'evidence_extractor',
      slotIndex: 3,
      roleAgentKey: 'dpt-evidence-extractor',
      taskDescription: 'Extract reusable evidence particles from qualified sources.',
      timeoutMs: 10 * 60 * 1000,
    },
  ]],
]);

/**
 * Return the built-in dispatch map (pass branch → 4 DPT role agent configs).
 *
 * The returned Map is live — callers may mutate it to customize slot configs
 * before passing to stageSubagentSlots.
 *
 * @returns {Map<string, Array<{key, slotIndex, roleAgentKey, taskDescription, ...}>>}
 */
export function getDispatchMap() {
  return dispatchMap;
}

// "wave" in these helpers matches the on-disk _subagents/wave_NN/ directory
// structure, which is spec-contract (openspec/specs/subagent-dispatch/).
function nextWaveIndex(state) {
  return (state.subagent_wave || 0) + 1;
}

function waveDirName(waveIndex) {
  return `wave_${String(waveIndex).padStart(2, '0')}`;
}

function slotDirName(slotIndex) {
  return `slot_${String(slotIndex).padStart(2, '0')}`;
}

/**
 * Create a slot object with derived file paths and a fresh receiptNonce.
 *
 * Does NOT write to disk — use stageSubagentSlots for the full disk setup.
 *
 * @param {object} slotConfig - { key, slotIndex, roleAgentKey, taskDescription, modelHint?, timeoutMs? }
 * @param {number} waveIndex  - stage number (1-based), derived from state.subagent_wave
 * @returns {object} slot object with all derived paths (taskPath, schemaPath, resultPath, etc.)
 */
export function createSlot(slotConfig, waveIndex) {
  const parsed = SlotConfig.parse(slotConfig);
  const slotBase = `_subagents/${waveDirName(waveIndex)}/${slotDirName(parsed.slotIndex)}`;
  return SubagentSlot.parse({
    key: parsed.key,
    roleAgentKey: parsed.roleAgentKey,
    waveIndex,
    slotIndex: parsed.slotIndex,
    taskPath: `${slotBase}/task.md`,
    schemaPath: `${slotBase}/result.schema.json`,
    resultPath: `${slotBase}/result.json`,
    summaryPath: `${slotBase}/result.md`,
    statusPath: `${slotBase}/_status.json`,
    agentPath: `${slotBase}/_agent.json`,
    receiptPath: `${slotBase}/runtime-receipt.jsonl`,
    receiptNonce: randomUUID(),
    status: 'pending',
  });
}

function resultJsonSchemaForSlot(slotConfig) {
  const parsed = SlotConfig.parse(slotConfig);
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: `DPT subagent result for ${parsed.key}`,
    type: 'object',
    additionalProperties: false,
    required: [
      'slotKey',
      'roleAgentKey',
      'status',
      'summary',
      'evidenceCount',
      'references',
      'confidence',
      'notes',
    ],
    properties: {
      slotKey: { const: parsed.key },
      roleAgentKey: { const: parsed.roleAgentKey },
      status: { enum: ['done', 'failed'] },
      summary: { type: 'string' },
      evidenceCount: { type: 'integer', minimum: 0 },
      references: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'url', 'quote', 'relevance'],
          properties: {
            title: { type: 'string' },
            url: { type: 'string' },
            quote: { type: 'string' },
            relevance: { type: 'string' },
          },
        },
      },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
      notes: { type: 'array', items: { type: 'string' } },
    },
  };
}

function taskMarkdownForSlot(slotConfig) {
  const parsed = SlotConfig.parse(slotConfig);
  return `# DPT Subagent Task: ${parsed.key}

## Role

${parsed.roleAgentKey}

## Task

${parsed.taskDescription}

## Inputs

- Read this slot's \`task.md\`.
- Read this slot's \`result.schema.json\`.
- Use only bounded information in this task and sources you inspect yourself.

## Output

Return strict JSON to the parent agent. The JSON must match \`result.schema.json\`.

The parent performs Parent Relay: it validates your JSON and writes \`result.json\`, optional \`result.md\`, \`_status.json\`, and \`_agent.json\`.

## Forbidden Authority

- Do not mutate WorkflowState.
- Do not pass or fail gates.
- Do not repair queues.
- Do not decide queue integrity.
- Do not authorize stopping.
- Do not include raw search trails, large page dumps, or private reasoning.
`;
}

function buildSpawnPrompt(slot, baseDir, platform = 'codex') {
  const s = SubagentSlot.parse(slot);
  return `You are being launched as DPT role ${s.roleAgentKey} for slot ${s.key}.

Platform: ${platform}
Slot directory: ${path.join(baseDir, path.dirname(s.taskPath))}
Task file: ${path.join(baseDir, s.taskPath)}
Result schema: ${path.join(baseDir, s.schemaPath)}
Runtime receipt: ${path.join(baseDir, s.receiptPath)}
Runtime receipt nonce: ${s.receiptNonce}

Read the task and schema. Perform the bounded work in your isolated agent context.
Write runtime receipt events to the Runtime receipt JSONL file from inside your own agent context:
- first line before doing task work: {"event":"agent_runtime_started","slotKey":"${s.key}","roleAgentKey":"${s.roleAgentKey}","receiptNonce":"${s.receiptNonce}"}
- second line immediately before returning: {"event":"agent_result_ready","slotKey":"${s.key}","roleAgentKey":"${s.roleAgentKey}","receiptNonce":"${s.receiptNonce}"}
Return strict JSON only. Do not write workflow state. Do not pass gates, repair queues, or authorize stopping.
The parent will validate your JSON and write durable slot files.`;
}

function createDispatchManifest(slotConfigs, state, baseDir, waveIndex) {
  ensureTrace(baseDir);
  const configs = z.array(SlotConfig).parse(slotConfigs);
  if (configs.length > MAX_CONCURRENT_SUBAGENTS) {
    throw new Error(`Subagent concurrency cap exceeded: ${configs.length} > ${MAX_CONCURRENT_SUBAGENTS}`);
  }

  const waveDir = waveDirName(waveIndex);
  const wavePath = path.join(baseDir, '_subagents', waveDir);
  mkdirSync(wavePath, { recursive: true });

  const slots = [];
  for (const config of configs) {
    const slot = createSlot(config, waveIndex);
    slots.push(slot);

    const slotDir = path.join(baseDir, `_subagents/${waveDir}/${slotDirName(config.slotIndex)}`);
    mkdirSync(slotDir, { recursive: true });

    writeFileSync(path.join(slotDir, 'task.md'), taskMarkdownForSlot(config));
    writeFileSync(path.join(slotDir, 'result.schema.json'), JSON.stringify(resultJsonSchemaForSlot(config), null, 2));
    writeFileSync(path.join(slotDir, '_status.json'), JSON.stringify({
      status: 'pending',
      updated: new Date().toISOString(),
    }, null, 2));

    traceEntry('slot_create', {
      source: 'gs-slot',
      key: config.key,
      roleAgentKey: config.roleAgentKey,
      slotIndex: config.slotIndex,
      waveIndex,
    });
    logEvent('info', 'slot_create', { key: config.key, roleAgentKey: config.roleAgentKey, slotIndex: config.slotIndex });
  }

  const manifest = {
    wave: `wave-${waveIndex}`,
    waveIndex,
    created: new Date().toISOString(),
    concurrencyCap: MAX_CONCURRENT_SUBAGENTS,
    slots: configs,
  };
  DispatchManifest.parse(manifest);
  writeFileSync(path.join(wavePath, 'dispatch.json'), JSON.stringify(manifest, null, 2));

  traceEntry('dispatch_create', {
    source: 'gs-dispatch',
    waveIndex,
    slotCount: slots.length,
    slots: slots.map((s) => ({ key: s.key, roleAgentKey: s.roleAgentKey })),
  });
  logEvent('info', 'dispatch', { waveIndex, slotCount: slots.length });

  return slots;
}

/**
 * Entry point: classify state, resolve slot configs for the branch, and write
 * task.md, result.schema.json, _status.json, and dispatch.json to disk.
 *
 * Returns the created slot objects. Non-pass branches return an empty array
 * (no slots dispatched — the caller should run convergeRepair instead).
 *
 * @param {object}   state             - workflow state
 * @param {string}   baseDir           - bundle root directory
 * @param {Map}      [customDispatchMap] - override the built-in dispatch map
 * @returns {object[]} array of slot objects (empty if branch !== 'pass')
 * @throws {Error} if concurrency cap is exceeded
 */
export function stageSubagentSlots(state, baseDir, customDispatchMap) {
  ensureTrace(baseDir);
  const map = customDispatchMap || dispatchMap;
  const branch = classifyBranch(state);
  const slotConfigs = map.get(branch);
  if (!slotConfigs) return [];
  const waveIndex = nextWaveIndex(state);
  return createDispatchManifest(slotConfigs, state, baseDir, waveIndex);
}

const slotTransitions = new Map([
  ['pending', new Set(['running', 'failed'])],
  ['running', new Set(['done', 'failed'])],
  ['done', new Set()],
  ['failed', new Set()],
]);

function extractParentRuntimeId(metadata = {}) {
  return metadata.parentRuntimeAgentId || undefined;
}

/**
 * Read the current status of a slot from its _status.json file.
 * Returns 'pending' if the file does not exist yet.
 *
 * @param {object} slot    - slot object
 * @param {string} baseDir - bundle root directory
 * @returns {'pending'|'running'|'done'|'failed'}
 */
export function readSlotStatus(slot, baseDir) {
  const file = path.join(baseDir, slot.statusPath);
  if (!existsSync(file)) return 'pending';
  return SlotStatusFile.parse(JSON.parse(readFileSync(file, 'utf-8'))).status;
}

/**
 * Write a new status for a slot, enforcing valid transitions.
 *
 * Allowed transitions:
 *   pending → running | failed
 *   running → done | failed
 *   done    → (terminal)
 *   failed  → (terminal)
 *
 * @param {object} slot    - slot object
 * @param {'pending'|'running'|'done'|'failed'} status - new status
 * @param {string} baseDir - bundle root directory
 * @throws {Error} if the transition is not allowed
 */
export function writeSlotStatus(slot, status, baseDir) {
  const parsedStatus = SlotStatus.parse(status);
  const current = readSlotStatus(slot, baseDir);
  if (current !== parsedStatus && !slotTransitions.get(current).has(parsedStatus)) {
    throw new Error(`Invalid slot status transition: ${current} -> ${parsedStatus}`);
  }
  const file = path.join(baseDir, slot.statusPath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify({
    status: parsedStatus,
    updated: new Date().toISOString(),
  }, null, 2));
}

/**
 * Trace an agent_spawn_requested event and build the spawn prompt that the
 * Agent tool needs to launch a native subagent.
 *
 * Reads DPT_PARENT_RUNTIME_AGENT_ID env var as fallback for metadata.parentRuntimeAgentId.
 *
 * @param {object} slot      - slot object
 * @param {string} baseDir   - bundle root directory
 * @param {object} [metadata] - { platform?, runtimeMode?, parentRuntimeAgentId? }
 * @returns {string} spawn prompt text — pass this to the Agent tool
 */
export function recordAgentSpawnRequested(slot, baseDir, metadata = {}) {
  ensureTrace(baseDir);
  const s = SubagentSlot.parse(slot);
  const prompt = buildSpawnPrompt(s, baseDir, metadata.platform || 'unknown');
  const parentId = extractParentRuntimeId(metadata);
  traceEntry('agent_spawn_requested', {
    source: 'gs-agent',
    actor: 'parent',
    actorRuntimeAgentId: parentId,
    parentRuntimeAgentId: parentId,
    key: s.key,
    roleAgentKey: s.roleAgentKey,
    platform: metadata.platform || 'unknown',
    runtimeMode: metadata.runtimeMode || 'unknown',
  });
  return prompt;
}

function readReceiptEvents(slot, baseDir) {
  const s = SubagentSlot.parse(slot);
  const file = path.join(baseDir, s.receiptPath);
  if (!existsSync(file)) throw new Error(`runtime receipt missing: ${s.receiptPath}`);
  const text = readFileSync(file, 'utf-8').trim();
  if (!text) throw new Error(`runtime receipt empty: ${s.receiptPath}`);
  return text.split('\n').map((line, index) => {
    try {
      return RuntimeReceiptEvent.parse(JSON.parse(line));
    } catch (error) {
      throw new Error(`runtime receipt line ${index + 1} invalid: ${error.message}`);
    }
  });
}

/**
 * Validate the subagent-written runtime-receipt.jsonl and import it into the
 * engine trace. Writes _agent.json and transitions slot status to 'running'.
 *
 * metadata.runtimeAgentId is REQUIRED — this is the subagent's runtime ID
 * from the Agent tool response.
 *
 * @param {object} slot      - slot object
 * @param {string} baseDir   - bundle root directory
 * @param {object} metadata  - { runtimeAgentId (required), platform?, runtimeMode?, agentType?, spawnedAt? }
 * @returns {{ agent: object, events: object[] }}
 * @throws {Error} if runtimeAgentId is missing or receipt is invalid/missing
 */
export function ingestAgentReceipt(slot, baseDir, metadata = {}) {
  ensureTrace(baseDir);
  const s = SubagentSlot.parse(slot);
  if (!metadata.runtimeAgentId) throw new Error('runtimeAgentId required when ingesting runtime receipt');
  const events = readReceiptEvents(s, baseDir);
  const started = events.find((event) => event.event === 'agent_runtime_started');
  const ready = events.find((event) => event.event === 'agent_result_ready');
  if (!started) throw new Error('runtime receipt missing agent_runtime_started');
  if (!ready) throw new Error('runtime receipt missing agent_result_ready');

  for (const event of [started, ready]) {
    if (event.slotKey !== s.key) throw new Error(`runtime receipt slotKey mismatch: ${event.slotKey} !== ${s.key}`);
    if (event.roleAgentKey !== s.roleAgentKey) throw new Error(`runtime receipt roleAgentKey mismatch: ${event.roleAgentKey} !== ${s.roleAgentKey}`);
    if (event.receiptNonce !== s.receiptNonce) throw new Error(`runtime receipt nonce mismatch: ${event.receiptNonce} !== ${s.receiptNonce}`);
  }

  writeSlotStatus(s, 'running', baseDir);
  const now = new Date().toISOString();
  const agent = AgentMetadata.parse({
    slotKey: s.key,
    roleAgentKey: s.roleAgentKey,
    platform: started.platform || metadata.platform || 'unknown',
    runtimeMode: started.runtimeMode || metadata.runtimeMode || 'unknown',
    runtimeAgentId: metadata.runtimeAgentId,
    agentType: started.agentType || metadata.agentType,
    spawnedAt: started.ts || metadata.spawnedAt || now,
    status: 'running',
  });
  writeFileSync(path.join(baseDir, s.agentPath), JSON.stringify(agent, null, 2));

  traceEntry('agent_runtime_started', {
    source: 'gs-agent-runtime',
    actor: 'subagent',
    actorRuntimeAgentId: agent.runtimeAgentId,
    key: s.key,
    roleAgentKey: s.roleAgentKey,
    platform: agent.platform,
    runtimeMode: agent.runtimeMode,
    runtimeAgentId: agent.runtimeAgentId,
    receiptPath: s.receiptPath,
    receiptNonce: s.receiptNonce,
  });
  traceEntry('agent_result_ready', {
    source: 'gs-agent-runtime',
    actor: 'subagent',
    actorRuntimeAgentId: agent.runtimeAgentId,
    key: s.key,
    roleAgentKey: s.roleAgentKey,
    platform: agent.platform,
    runtimeMode: agent.runtimeMode,
    runtimeAgentId: agent.runtimeAgentId,
    receiptPath: s.receiptPath,
    receiptNonce: s.receiptNonce,
  });
  return { agent, events };
}

function failedResultForSlot(slot, notes = []) {
  return SlotResult.parse({
    slotKey: slot.key,
    roleAgentKey: slot.roleAgentKey,
    status: 'failed',
    summary: '',
    evidenceCount: 0,
    references: [],
    confidence: 0,
    notes,
  });
}

function validateSlotResult(slot, candidate) {
  const parsed = SlotResult.safeParse(candidate);
  if (!parsed.success) return { ok: false, error: parsed.error };
  if (parsed.data.slotKey !== slot.key) {
    return { ok: false, error: new Error(`slotKey mismatch: ${parsed.data.slotKey} !== ${slot.key}`) };
  }
  if (parsed.data.roleAgentKey !== slot.roleAgentKey) {
    return { ok: false, error: new Error(`roleAgentKey mismatch: ${parsed.data.roleAgentKey} !== ${slot.roleAgentKey}`) };
  }
  if (parsed.data.status === 'failed' && parsed.data.evidenceCount !== 0) {
    return { ok: false, error: new Error('failed slot result must have evidenceCount 0') };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Validate a subagent's returned JSON against the slot schema, write
 * result.json (and optional result.md summary), update slot status, and
 * finalize _agent.json.
 *
 * If validation fails, the slot is automatically marked 'failed' — the
 * caller does NOT need to call markSlotFailed separately. Check `relay.ok`
 * to know whether validation passed.
 *
 * @param {object} slot            - slot object
 * @param {string} baseDir         - bundle root directory
 * @param {object} candidateResult - raw JSON returned by the subagent
 * @param {object} [metadata]      - { platform?, runtimeMode?, runtimeAgentId?,
 *                                    parentRuntimeAgentId?, agentType?, spawnedAt? }
 * @returns {{ ok: boolean, result: object, agent: object }}
 */
export function commitSlotResult(slot, baseDir, candidateResult, metadata = {}) {
  ensureTrace(baseDir);
  const s = SubagentSlot.parse(slot);
  const parentId = extractParentRuntimeId(metadata);
  traceEntry('agent_result_received', {
    source: 'gs-agent',
    actor: 'parent',
    actorRuntimeAgentId: parentId,
    parentRuntimeAgentId: parentId,
    key: s.key,
    roleAgentKey: s.roleAgentKey,
    platform: metadata.platform || 'unknown',
  });
  logEvent('info', 'result', { key: s.key, roleAgentKey: s.roleAgentKey, platform: metadata.platform || 'unknown' });

  const validation = validateSlotResult(s, candidateResult);
  const completedAt = new Date().toISOString();
  const result = validation.ok
    ? validation.data
    : failedResultForSlot(s, [`schema validation failed: ${validation.error.message}`]);

  traceEntry('result_schema_validated', {
    source: 'gs-agent',
    actor: 'parent',
    actorRuntimeAgentId: parentId,
    parentRuntimeAgentId: parentId,
    key: s.key,
    roleAgentKey: s.roleAgentKey,
    valid: validation.ok,
  });

  writeFileSync(path.join(baseDir, s.resultPath), JSON.stringify(result, null, 2));
  if (result.status === 'done') {
    writeFileSync(path.join(baseDir, s.summaryPath), `# ${s.key}\n\n${result.summary}\n`);
  }
  writeSlotStatus(s, result.status, baseDir);

  const existingAgentPath = path.join(baseDir, s.agentPath);
  const existing = existsSync(existingAgentPath)
    ? JSON.parse(readFileSync(existingAgentPath, 'utf-8'))
    : {};
  const agent = AgentMetadata.parse({
    slotKey: s.key,
    roleAgentKey: s.roleAgentKey,
    platform: metadata.platform || existing.platform || 'unknown',
    runtimeMode: metadata.runtimeMode || existing.runtimeMode || 'unknown',
    runtimeAgentId: metadata.runtimeAgentId || existing.runtimeAgentId,
    agentType: metadata.agentType || existing.agentType,
    spawnedAt: metadata.spawnedAt || existing.spawnedAt || completedAt,
    completedAt,
    status: result.status,
    validationOk: validation.ok,
    error: validation.ok ? undefined : validation.error.message,
  });
  writeFileSync(existingAgentPath, JSON.stringify(agent, null, 2));

  return { ok: validation.ok, result, agent };
}

/**
 * Convenience: mark a slot as failed with a reason string.
 *
 * Calls commitSlotResult internally with a pre-built failed result.
 *
 * @param {object} slot      - slot object
 * @param {string} baseDir   - bundle root directory
 * @param {object} [metadata] - passed through to commitSlotResult
 * @param {string} [reason]  - failure reason (default: 'subagent slot marked failed')
 * @returns {{ ok: boolean, result: object, agent: object }}
 */
export function markSlotFailed(slot, baseDir, metadata = {}, reason = 'subagent slot marked failed') {
  return commitSlotResult(slot, baseDir, failedResultForSlot(slot, [reason]), metadata);
}

/**
 * Read and validate a slot's result.json from disk.
 *
 * Returns a failed result object (not an error) if the file is missing,
 * invalid, or the slot status is 'failed'.
 *
 * @param {object} slot    - slot object
 * @param {string} baseDir - bundle root directory
 * @returns {object} SlotResult (status may be 'done' or 'failed')
 */
export function readSlotResult(slot, baseDir) {
  const s = SubagentSlot.parse(slot);
  const status = readSlotStatus(s, baseDir);
  if (status === 'failed') {
    const resultPath = path.join(baseDir, s.resultPath);
    if (existsSync(resultPath)) {
      const parsed = validateSlotResult(s, JSON.parse(readFileSync(resultPath, 'utf-8')));
      if (parsed.ok) return parsed.data;
    }
    return failedResultForSlot(s, ['slot status failed']);
  }

  const resultPath = path.join(baseDir, s.resultPath);
  if (!existsSync(resultPath)) {
    return failedResultForSlot(s, ['result.json missing']);
  }

  const parsed = validateSlotResult(s, JSON.parse(readFileSync(resultPath, 'utf-8')));
  if (!parsed.ok) {
    return failedResultForSlot(s, [`result.json invalid: ${parsed.error.message}`]);
  }
  return parsed.data;
}

/**
 * Collect results from all slots by reading their result.json files.
 * Traces a collect_result event for each slot.
 *
 * @param {object[]} slots   - array of slot objects
 * @param {string}   baseDir - bundle root directory
 * @returns {object[]} array of SlotResult objects
 */
export function collectResults(slots, baseDir) {
  ensureTrace(baseDir);
  return slots.map((slot) => {
    const result = readSlotResult(slot, baseDir);
    traceEntry('collect_result', {
      source: 'gs-collect',
      slotKey: result.slotKey,
      roleAgentKey: result.roleAgentKey,
      status: result.status,
      evidenceCount: result.evidenceCount,
    });
    logEvent('info', 'collect', { slotKey: result.slotKey, status: result.status, evidenceCount: result.evidenceCount });
    return result;
  });
}

/**
 * Merge collected slot results into workflow state.
 *
 * Pure function — does NOT write to disk. Adds evidence counts to ref_count,
 * increments subagent_wave, and sets subagent_all_failed if every slot failed.
 *
 * @param {object[]} results - array of SlotResult objects
 * @param {object}   state   - current workflow state
 * @returns {object} updated workflow state (parsed against SubagentWorkflowState)
 */
export function mergeResults(results, state) {
  const doneResults = results.filter((r) => r.status === 'done');
  const totalEvidence = doneResults.reduce((sum, r) => sum + r.evidenceCount, 0);
  const allFailed = results.length > 0 && results.every((r) => r.status === 'failed');
  const merged = SubagentWorkflowState.parse({
    ...state,
    ref_count: state.ref_count + totalEvidence,
    subagent_results: results,
    subagent_wave: (state.subagent_wave || 0) + 1,
    subagent_all_failed: allFailed,
  });

  logEvent('info', 'merge', { totalEvidence, doneCount: doneResults.length, failedCount: results.length - doneResults.length });
  traceEntry('merge_complete', {
    source: 'gs-merge',
    totalEvidence,
    doneCount: doneResults.length,
    failedCount: results.length - doneResults.length,
    allFailed,
    waveIndex: merged.subagent_wave,
  });

  return merged;
}

function serializeState(state) {
  return JSON.stringify(state);
}

const defaultRepairStep = new ForkStep('shared_repair', (s) => {
  const repaired = { ...s };
  if (repaired.ref_count < repaired.ref_floor) {
    repaired.ref_count = Math.min(repaired.ref_count + 2, repaired.ref_floor);
  }
  if (repaired.topicReadiness !== 'ready' && repaired.topicReadiness !== 'blocked') {
    repaired.topicReadiness = 'ready';
  }
  repaired.subagent_all_failed = false;
  return repaired;
});

/**
 * Run the default repair step iteratively until the state converges to
 * 'pass' or 'blocked', or maxIterations is reached.
 *
 * Detects stalls (state unchanged between iterations) and exits early.
 * Repair increments ref_count toward ref_floor and resets topicReadiness
 * to 'ready' when it's not 'blocked'.
 *
 * @param {object} state          - workflow state to repair
 * @param {number} [maxIterations=3] - maximum repair cycles
 * @returns {{ state: object, outcome: string, iterations: number }}
 */
export function convergeRepair(state, maxIterations = 3) {
  let current = { ...state };
  const seen = new Set();

  for (let i = 0; i < maxIterations; i++) {
    const branch = classifyBranch(current);
    if (branch === 'pass' || branch === 'blocked') {
      return { state: current, outcome: branch, iterations: i };
    }
    const h = serializeState(current);
    if (seen.has(h)) {
      return { state: current, outcome: 'stalled', iterations: i };
    }
    seen.add(h);
    current = defaultRepairStep.execute(current);
  }
  return { state: current, outcome: classifyBranch(current), iterations: maxIterations };
}

/**
 * Validate state against a Zod schema and return diagnostics on failure.
 *
 * @param {object} state  - state to validate
 * @param {z.ZodType} [schema=SubagentWorkflowState] - schema to validate against
 * @returns {{ passed: true } | { passed: false, errors: z.ZodError, diagnostics: object[] }}
 */
export function validateAndDiagnose(state, schema = SubagentWorkflowState) {
  const result = schema.safeParse(state);
  if (result.success) return { passed: true };
  return { passed: false, errors: result.error, diagnostics: inspectFailure(result.error) };
}

/**
 * Convert a ZodError into human-readable diagnostics with suggested fixes.
 *
 * Handles error codes: invalid_type, invalid_value, too_small, and a generic fallback.
 *
 * @param {z.ZodError} zodError - the error from Zod's safeParse
 * @returns {Array<{ field: string, issue: string, code: string, fix: string }>}
 */
export function inspectFailure(zodError) {
  return zodError.issues.map((issue) => {
    const field = issue.path.join('.');
    const received = JSON.stringify(issue.received);
    const expected = issue.expected ? JSON.stringify(issue.expected) : 'valid value';
    let fix;
    switch (issue.code) {
      case 'invalid_type':
        fix = `Set ${field} to type ${expected} (received ${received})`;
        break;
      case 'invalid_value':
        fix = `Set ${field} to one of: ${expected} (received ${received})`;
        break;
      case 'too_small':
        fix = `Increase ${field} to minimum ${issue.minimum}`;
        break;
      default:
        fix = `Fix ${field}: ${issue.message}`;
    }
    return { field, issue: issue.message, code: issue.code, fix };
  });
}

/**
 * Convenience composition: forkRouter → convergeRepair (non-pass) or
 * stageSubagentSlots (pass). Run this at the start of a subagent phase.
 *
 * On 'pass' branch: stages slots and returns awaitingAgent=true to signal
 * the Phase Agent to launch native subagents through the Markdown control surface.
 *
 * On non-pass branches: runs convergeRepair and returns the repaired state
 * with an empty slots array.
 *
 * @param {object} state               - workflow state
 * @param {string} baseDir             - bundle root directory
 * @param {Map}    [customDispatchMap] - override the built-in dispatch map
 * @returns {{ finalState: object, phaseLog: object[], slots: object[],
 *             awaitingAgent?: boolean }}
 */
export function forkAndStageSubagents(state, baseDir, customDispatchMap) {
  const phaseLog = [];
  const map = customDispatchMap || dispatchMap;
  const { branch } = forkRouter(state);
  phaseLog.push({ phase: 'fork', branch });

  if (branch !== 'pass') {
    const repaired = convergeRepair(state);
    phaseLog.push({ phase: 'converge_repair', outcome: repaired.outcome });
    logEvent('warn', 'repair', { trigger: 'fork_reject', outcome: repaired.outcome, iterations: repaired.iterations });
    traceEntry('repair', { trigger: 'fork_reject', outcome: repaired.outcome, iterations: repaired.iterations });
    return { finalState: repaired.state, phaseLog, slots: [] };
  }

  const slots = stageSubagentSlots(state, baseDir, map);
  phaseLog.push({ phase: 'dispatch', slotCount: slots.length });
  phaseLog.push({ phase: 'await_agent', slotCount: slots.length });
  return { finalState: SubagentWorkflowState.parse(state), slots, phaseLog, awaitingAgent: true };
}

/**
 * Collect results from all slots, merge into workflow state, and run
 * convergeRepair automatically if ALL subagents failed.
 *
 * The return shape is always the same regardless of which path was taken:
 * - checkResult / forkDecision are non-null when repair did NOT run
 * - repaired is non-null when all subagents failed and repair DID run
 *
 * @param {object}   state   - workflow state before this subagent wave
 * @param {object[]} slots   - array of slot objects
 * @param {string}   baseDir - bundle root directory
 * @returns {{
 *   finalState: object,
 *   results: object[],
 *   checkResult: object|null,
 *   forkDecision: object|null,
 *   repaired: object|null,
 *   phaseLog: object[]
 * }}
 */
export function collectAndMergeSubagentResults(state, slots, baseDir) {
  ensureTrace(baseDir);
  const results = collectResults(slots, baseDir);
  const merged = mergeResults(results, state);

  let checkResult = null;
  let forkDecision = null;
  let repaired = null;
  const phaseLog = [];

  if (merged.subagent_all_failed) {
    repaired = convergeRepair(merged);
    phaseLog.push({ phase: 'subagent_repair', outcome: repaired.outcome });
    logEvent('warn', 'repair', { trigger: 'all_subagents_failed', outcome: repaired.outcome, iterations: repaired.iterations });
    traceEntry('repair', { trigger: 'all_subagents_failed', outcome: repaired.outcome, iterations: repaired.iterations });
    return { finalState: repaired.state, results, checkResult, forkDecision, repaired, phaseLog };
  }

  checkResult = validateAndDiagnose(merged, SubagentWorkflowState);
  forkDecision = forkRouter(merged);
  phaseLog.push({ phase: 'ci_check', passed: checkResult.passed }, { phase: 're_fork', branch: forkDecision.branch });
  return { finalState: merged, results, checkResult, forkDecision, repaired, phaseLog };
}
