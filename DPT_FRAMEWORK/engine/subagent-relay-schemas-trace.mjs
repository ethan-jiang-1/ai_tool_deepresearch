// @impl FRE-004
// subagent-relay-schemas-trace.mjs — Zod schemas, trace/logger init, path helpers
// Source domains: trace/logger (L85–125), schemas (L127–267), path helpers (L376–386)

import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTrace } from './trace.mjs';
import { createRunLogger, readBundleName } from './logger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Absolute path to the Agent-facing logging CLI (SUD-004 beacon `log_cli` source).
// It is a constant — every bundle uses the same framework CLI — so it is never
// passed through the spawn prompt; the sub-agent reads it from _beacon.json.
export function logEventCliPath() {
  return path.join(__dirname, '..', 'cli', 'log-event.mjs');
}

// Trace + logger auto-init on first mutation call via ensureTrace(bundleDir).
// Fixed trace filename `rb_trace.jsonl` within the bundle. consoleEcho: false.
// Consumers never touch trace/log setup — no setter, no createTrace import needed.
let _trace = null;
let _traceBundleDir = null;
let _log = null;

export function ensureTrace(bundleDir) {
  if (bundleDir && _traceBundleDir !== bundleDir) {
    _trace = createTrace(path.join(bundleDir, 'rb_trace.jsonl'), { consoleEcho: false });
    _traceBundleDir = bundleDir;
    _log = null; // reset on bundle change — logger must track the new bundle
  }
  if (!_log && bundleDir) {
    _log = createRunLogger(bundleDir);
  }
  return _trace;
}

export function traceEntry(event, detail) {
  if (_trace) {
    const bundle = _traceBundleDir ? readBundleName(_traceBundleDir) : '<unknown>';
    _trace.traceEntry(event, { bundle, ...detail });
  }
}

// ── Logger helpers: log only the closed-set events (LOC-006) ──

/** @param {string} event — must be in LOC-006 closed-set */
export function logEvent(level, event, detail) {
  if (_log) _log[level](event, detail);
}

export const MAX_CONCURRENT_SUBAGENTS = 8;

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

// Per-slot entry persisted in dispatch.json. Extends SlotConfig with the
// engine-generated receipt_nonce (SUD-005) so provenance forensics can bind
// receipts/ledger entries back to a staged slot from disk alone.
export const ManifestSlotEntry = SlotConfig.extend({
  receipt_nonce: z.string().uuid(),
});

export const DispatchManifest = z.object({
  wave: z.string(),
  waveIndex: z.number().int().min(0),
  created: z.string(),
  concurrencyCap: z.number().int().positive(),
  slots: z.array(ManifestSlotEntry),
});

export const SubagentSlot = z.object({
  key: z.string(),
  roleAgentKey: z.string(),
  waveIndex: z.number().int().min(0),
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

// ── Agent Output Declaration (AGO-001, AGO-002) ──

export const OutputFileRole = z.enum([
  'reference',
  'evidence_summary',
  'question_list',
  'source_yaml',
  'index',
  'other',
]);

export const OutputFileEntry = z.object({
  path: z.string().min(1),
  role: OutputFileRole,
  source_url: z.string().optional(),
  source_slug: z.string().optional(),
});

export const AgentOutputDeclarationSchema = z.object({
  output_files: z.array(OutputFileEntry).default([]),
  cache_trails: z.array(z.string()).default([]),
}).refine(
  (data) => data.output_files.every((f) => f.role !== 'reference' || f.source_url),
  { message: 'output_files with role=reference must include source_url' },
);

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
  output_files: z.array(OutputFileEntry).default([]),
  cache_trails: z.array(z.string()).default([]),
}).refine(
  (data) => data.output_files.every((f) => f.role !== 'reference' || f.source_url),
  { message: 'output_files with role=reference must include source_url' },
);

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
export function nextWaveIndex(state) {
  return (state.subagent_wave || 0) + 1;
}

export function waveDirName(waveIndex) {
  return `wave_${String(waveIndex).padStart(2, '0')}`;
}

export function slotDirName(slotIndex) {
  return `slot_${String(slotIndex).padStart(2, '0')}`;
}
