// @impl SUD-001, SUS-001, SUC-001, SUR-001
// prototype-subagent: Engine-owned dispatch/collect/merge plus Parent Relay contracts.

import { z } from 'zod';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { traceEntry } from './trace.mjs';

export const CONCURRENCY_CAP = 4;

export const Branch = z.enum(['pass', 'fail_a', 'fail_b', 'blocked']);
export const SlotStatus = z.enum(['pending', 'running', 'done', 'failed']);

export const RuntimeMode = z.enum([
  'project-agent',
  'builtin-agent-with-role-prompt',
  'session-dynamic-agent',
  'unknown',
]);

export const SlotStatusFile = z.object({
  status: SlotStatus,
  updated: z.string(),
});

export const SlotConfig = z.object({
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

export const SubagentSlot = z.object({
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

export const RuntimeReceiptEvent = z.object({
  event: z.enum(['agent_runtime_started', 'agent_result_ready']),
  slotKey: z.string(),
  roleAgentKey: z.string(),
  receiptNonce: z.string().min(1),
  platform: z.string().optional(),
  runtimeMode: RuntimeMode.optional(),
  agentType: z.string().optional(),
  ts: z.string().optional(),
});

export const Reference = z.object({
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
  references: z.array(Reference).default([]),
  confidence: z.number().min(0).max(1).default(0),
  notes: z.array(z.string()).default([]),
});

export const AgentMetadata = z.object({
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

export class Step {
  constructor(name, executeFn) {
    this.name = name;
    this.execute = executeFn;
  }
}

export function evaluateBranch(state) {
  const s = SubagentWorkflowState.parse(state);
  if (s.topicReadiness === 'blocked') return 'blocked';
  if (s.topicReadiness !== 'ready') return 'fail_b';
  if (s.ref_count < s.ref_floor) return 'fail_a';
  return 'pass';
}

const passStep = new Step('pass_branch', (s) => ({ ...s, current_gate: 'wave_next' }));
const failAStep = new Step('fail_a_branch', (s) => ({ ...s, topicRepairAttempted: true }));
const failBStep = new Step('fail_b_branch', (s) => ({ ...s, ref_count: s.ref_count + 1 }));
const blockedStep = new Step('blocked_branch', (s) => ({ ...s, current_gate: 'blocked_hitl' }));

const forkMap = new Map([
  ['pass', passStep],
  ['fail_a', failAStep],
  ['fail_b', failBStep],
  ['blocked', blockedStep],
]);

export function forkRouter(state) {
  const branch = evaluateBranch(state);
  const step = forkMap.get(branch);
  if (!step) throw new Error(`No fork for: ${branch}`);
  return { branch, step };
}

export { passStep, failAStep, failBStep, blockedStep };

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

export function getDispatchMap() {
  return dispatchMap;
}

function nextWaveIndex(state) {
  return (state.subagent_wave || 0) + 1;
}

function waveDirName(waveIndex) {
  return `wave_${String(waveIndex).padStart(2, '0')}`;
}

function slotDirName(slotIndex) {
  return `slot_${String(slotIndex).padStart(2, '0')}`;
}

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

export function resultJsonSchemaForSlot(slotConfig) {
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

export function buildSpawnPrompt(slot, baseDir, platform = 'codex') {
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

export function createDispatchManifest(slotConfigs, state, baseDir, waveIndex) {
  const configs = z.array(SlotConfig).parse(slotConfigs);
  if (configs.length > CONCURRENCY_CAP) {
    throw new Error(`Subagent concurrency cap exceeded: ${configs.length} > ${CONCURRENCY_CAP}`);
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
  }

  const manifest = {
    wave: `wave-${waveIndex}`,
    waveIndex,
    created: new Date().toISOString(),
    concurrencyCap: CONCURRENCY_CAP,
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

  return slots;
}

export function subagentDispatch(state, baseDir, customDispatchMap) {
  const map = customDispatchMap || dispatchMap;
  const branch = evaluateBranch(state);
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

function parentRuntimeAgentId(metadata = {}) {
  return metadata.parentRuntimeAgentId || process.env.DPT_PARENT_RUNTIME_AGENT_ID || undefined;
}

export function readSlotStatus(slot, baseDir) {
  const file = path.join(baseDir, slot.statusPath);
  if (!existsSync(file)) return 'pending';
  return SlotStatusFile.parse(JSON.parse(readFileSync(file, 'utf-8'))).status;
}

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

export function recordAgentSpawnRequested(slot, baseDir, metadata = {}) {
  const s = SubagentSlot.parse(slot);
  const prompt = buildSpawnPrompt(s, baseDir, metadata.platform || 'unknown');
  const parentId = parentRuntimeAgentId(metadata);
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

export function importRuntimeReceipt(slot, baseDir, metadata = {}) {
  const s = SubagentSlot.parse(slot);
  if (!metadata.runtimeAgentId) throw new Error('runtimeAgentId required when importing runtime receipt');
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

export function validateSlotResult(slot, candidate) {
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

export function parentRelayWriteResult(slot, baseDir, candidateResult, metadata = {}) {
  const s = SubagentSlot.parse(slot);
  const parentId = parentRuntimeAgentId(metadata);
  traceEntry('agent_result_received', {
    source: 'gs-agent',
    actor: 'parent',
    actorRuntimeAgentId: parentId,
    parentRuntimeAgentId: parentId,
    key: s.key,
    roleAgentKey: s.roleAgentKey,
    platform: metadata.platform || 'unknown',
  });

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

export function markRelayFailure(slot, baseDir, metadata = {}, reason = 'relay failure') {
  return parentRelayWriteResult(slot, baseDir, failedResultForSlot(slot, [reason]), metadata);
}

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

export function collectResults(slots, baseDir) {
  return slots.map((slot) => {
    const result = readSlotResult(slot, baseDir);
    traceEntry('collect_result', {
      source: 'gs-collect',
      slotKey: result.slotKey,
      roleAgentKey: result.roleAgentKey,
      status: result.status,
      evidenceCount: result.evidenceCount,
    });
    return result;
  });
}

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

export function hashState(state) {
  return JSON.stringify(state);
}

export const sharedRepairStep = new Step('shared_repair', (s) => {
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

export function convergeRepair(state, maxIterations = 3) {
  let current = { ...state };
  const seen = new Set();

  for (let i = 0; i < maxIterations; i++) {
    const branch = evaluateBranch(current);
    if (branch === 'pass' || branch === 'blocked') {
      return { state: current, outcome: branch, iterations: i };
    }
    const h = hashState(current);
    if (seen.has(h)) {
      return { state: current, outcome: 'stalled', iterations: i };
    }
    seen.add(h);
    current = sharedRepairStep.execute(current);
  }
  return { state: current, outcome: evaluateBranch(current), iterations: maxIterations };
}

export function checkAndReflect(state, schema = SubagentWorkflowState) {
  const result = schema.safeParse(state);
  if (result.success) return { passed: true };
  return { passed: false, errors: result.error, diagnostics: inspectFailure(result.error) };
}

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
      case 'invalid_enum_value':
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

export function runSubagentWave(state, baseDir, customDispatchMap) {
  const trace = [];
  const map = customDispatchMap || dispatchMap;
  const { branch } = forkRouter(state);
  trace.push({ phase: 'fork', branch });

  if (branch !== 'pass') {
    const repaired = convergeRepair(state);
    trace.push({ phase: 'converge_repair', outcome: repaired.outcome });
    return { finalState: repaired.state, trace, slots: [] };
  }

  const slots = subagentDispatch(state, baseDir, map);
  trace.push({ phase: 'dispatch', slotCount: slots.length });
  trace.push({ phase: 'await_parent_relay', slotCount: slots.length });
  return { finalState: SubagentWorkflowState.parse(state), slots, trace, awaitingParentRelay: true };
}

export function collectAndMergeSubagentWave(state, slots, baseDir) {
  const results = collectResults(slots, baseDir);
  const merged = mergeResults(results, state);
  if (merged.subagent_all_failed) {
    const repaired = convergeRepair(merged);
    return { finalState: repaired.state, results, repaired, trace: [{ phase: 'subagent_repair', outcome: repaired.outcome }] };
  }
  const ci = checkAndReflect(merged, SubagentWorkflowState);
  const reFork = forkRouter(merged);
  return { finalState: merged, results, ci, reFork, trace: [{ phase: 'ci_check', passed: ci.passed }, { phase: 're_fork', branch: reFork.branch }] };
}
