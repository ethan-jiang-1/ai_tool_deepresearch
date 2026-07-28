#!/usr/bin/env node
// @impl CPT-001: advance-status.mjs — Agent-facing CLI to advance rb_status.json current_gate/next_gate
//
// Usage:
//   node DPT_FRAMEWORK/cli/advance-status.mjs --bundle <path> --to <gate>
//
// <gate> is the snake_case gate enum value (e.g. seed_topics_ready).
// CLI resolves next_gate from transitions.chain.json (single truth source)
// via manifest.json bridge (gate ⇔ node fileRef).
//
// On success: prints {"status":"ok","current_gate":"...","next_gate":"..."} to stdout, exit 0.
// On failure: prints {"status":"error","reason":"..."} to stdout, exit 1.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parseMdFrontmatter } from '../engine/helpers/gate-helpers-readers.mjs';
import { validateSourceGateStatusSync } from '../engine/helpers/handoff-helpers.mjs';
import { continuationForLoadedNode } from '../engine/helpers/continuation-cue.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKFLOWS_DIR = join(__dirname, '..', 'workflows');
const NODES_DIR = join(WORKFLOWS_DIR, 'nodes');

// ── Helpers ──

/** snake_case → kebab-case */
function gateEnumToKey(gate) {
  return gate.replace(/_/g, '-');
}

/** kebab-case → snake_case */
function gateKeyToEnum(key) {
  return key.replace(/-/g, '_');
}

/** Load manifest, return { gateKey→node, node→gateKey } maps */
function loadManifest() {
  const raw = readFileSync(join(WORKFLOWS_DIR, 'manifest.json'), 'utf-8');
  const m = JSON.parse(raw);
  const gateToNode = new Map();
  const nodeToGate = new Map();
  for (const p of m.phases) {
    if (p.gate) {
      gateToNode.set(p.gate, p.node);
      nodeToGate.set(p.node, p.gate);
    }
  }
  return { gateToNode, nodeToGate };
}

/** Load chain.json */
function loadChain() {
  const raw = readFileSync(join(WORKFLOWS_DIR, 'transitions.chain.json'), 'utf-8');
  return JSON.parse(raw);
}

function readLoadedNodeContinuation(nodeRef) {
  try {
    const raw = readFileSync(join(NODES_DIR, nodeRef), 'utf-8');
    const frontmatter = parseMdFrontmatter(raw);
    const continuation = continuationForLoadedNode({ frontmatter, nodeRef });
    if (!continuation) {
      return { ok: false, reason: `loaded node "${nodeRef}" has no supported stop/gate continuation contract` };
    }
    return { ok: true, continuation };
  } catch (err) {
    return { ok: false, reason: `cannot read loaded node frontmatter for "${nodeRef}": ${err.message}` };
  }
}

// ── Main ──

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    to:     { type: 'string' },
  },
  strict: true,
});

if (!values.bundle || !values.to) {
  console.log(JSON.stringify({ status: 'error', reason: 'Missing required args: --bundle <path> --to <gate>' }));
  process.exit(1);
}

const bundlePath = values.bundle;
const targetGateEnum = values.to;

// Validate bundle exists
if (!existsSync(bundlePath)) {
  console.log(JSON.stringify({ status: 'error', reason: `Bundle not found: ${bundlePath}` }));
  process.exit(1);
}

const statusPath = join(bundlePath, 'rb_status.json');
if (!existsSync(statusPath)) {
  console.log(JSON.stringify({ status: 'error', reason: `rb_status.json not found in ${bundlePath}` }));
  process.exit(1);
}

// Load current status
let status;
try {
  status = JSON.parse(readFileSync(statusPath, 'utf-8'));
} catch {
  console.log(JSON.stringify({ status: 'error', reason: 'Failed to parse rb_status.json' }));
  process.exit(1);
}

// Resolve gate → node → next node → next gate via manifest + chain.
// Covered source-gate handoffs are validated against trace first; bootstrap
// compatibility source gates retain the legacy chain lookup below.
const targetGateKey = gateEnumToKey(targetGateEnum);
const { gateToNode, nodeToGate } = loadManifest();
const chain = loadChain();

const currentNode = gateToNode.get(targetGateKey);
if (!currentNode) {
  console.log(JSON.stringify({ status: 'error', reason: `Unknown gate: "${targetGateEnum}" (key: "${targetGateKey}"). Check manifest.json for valid gate keys.` }));
  process.exit(1);
}

const transitions = chain[currentNode];
if (!transitions) {
  console.log(JSON.stringify({ status: 'error', reason: `Node "${currentNode}" not found in chain.json.` }));
  process.exit(1);
}

const handoffCheck = validateSourceGateStatusSync(bundlePath, targetGateEnum);
if (!handoffCheck.ok) {
  console.log(JSON.stringify({
    status: 'error',
    reason: handoffCheck.reason,
    advice: handoffCheck.advice || [],
  }));
  process.exit(1);
}

const nextNode = handoffCheck.covered
  ? handoffCheck.handoff.targetNode
  : (transitions['passed'] || transitions['rerun']);
if (!nextNode) {
  console.log(JSON.stringify({ status: 'error', reason: `No transition from "${currentNode}" in chain.json. Available outcomes: ${Object.keys(transitions).join(', ')}` }));
  process.exit(1);
}

const nextGateKey = nodeToGate.get(nextNode);
// Terminal: final phase has gate:null in manifest, so nodeToGate lookup returns undefined.
// Write string "none" (matching CurrentGate enum and gate-readiness-passed expected value),
// not JavaScript null (which serializes to JSON null ≠ "none").
const nextGateEnum = nextGateKey ? gateKeyToEnum(nextGateKey) : 'none';

if (handoffCheck.exceptional && handoffCheck.stage === 'synchronized_initial_profile') {
  const output = {
    status: 'ok',
    current_gate: targetGateEnum,
    next_gate: nextGateEnum,
    source_handoff_kind: 'post_final_reentry',
    idempotent: true,
  };
  console.log(JSON.stringify(output));
  process.exit(0);
}

let continuation = null;
let continuationDiagnostic = null;
if (handoffCheck.covered) {
  if (status.current_node !== nextNode) {
    console.log(JSON.stringify({
      status: 'error',
      reason: `rb_status.json#/current_node must equal witnessed handoff target "${nextNode}" before syncing covered source gate "${targetGateEnum}", got ${JSON.stringify(status.current_node ?? null)}`,
      advice: [`Run enter-phase with the source gate check.next before status sync: node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle ${bundlePath} --node ${nextNode}`],
    }));
    process.exit(1);
  }

  const cueResult = readLoadedNodeContinuation(nextNode);
  if (!cueResult.ok) {
    console.log(JSON.stringify({
      status: 'error',
      reason: cueResult.reason,
      advice: ['Repair the framework node frontmatter before syncing this covered handoff; advance-status must not guess loaded-node continuation.'],
    }));
    process.exit(1);
  }
  continuation = cueResult.continuation;
} else if (status.current_node === nextNode) {
  const cueResult = readLoadedNodeContinuation(nextNode);
  if (cueResult.ok) {
    continuation = cueResult.continuation;
  } else {
    continuationDiagnostic = `continuation omitted: ${cueResult.reason}`;
  }
} else {
  continuationDiagnostic = `continuation omitted: bootstrap-compatible status sync did not have loaded current_node "${nextNode}"`;
}

const from = handoffCheck.exceptional ? 'readiness_passed' : (status.current_gate || 'unknown');
const previousStatusRaw = readFileSync(statusPath, 'utf-8');
const nextStatus = {
  ...status,
  current_gate: targetGateEnum,
  next_gate: nextGateEnum,
  ...(targetGateEnum === 'readiness_passed' && nextGateEnum === 'none' ? { state: 'completed' } : {}),
};

// Write phase_transition trace event
const tracePath = join(bundlePath, 'rb_trace.jsonl');
const traceEvent = JSON.stringify({
  ts: new Date().toISOString(),
  bundle: status.bundle || 'unknown',
  event: 'phase_transition',
  from,
  to: targetGateEnum,
  next: nextGateEnum,
  source_handoff_degraded: handoffCheck.covered ? handoffCheck.handoff.degraded === true : false,
  source_handoff_degraded_reason: handoffCheck.covered ? handoffCheck.handoff.degradedReason || null : null,
  source_handoff_degraded_rules: handoffCheck.covered ? handoffCheck.handoff.degradedRules || [] : [],
  ...(handoffCheck.exceptional ? {
    source_handoff_kind: 'post_final_reentry',
    source_handoff_event_id: handoffCheck.handoff.eventId,
    source_handoff_event_index: handoffCheck.handoff.index,
    source_handoff_event_sha256: handoffCheck.handoff.eventLineSha256,
    source_handoff_operation_id: handoffCheck.handoff.operationId,
    source_handoff_load_index: handoffCheck.handoff.loadComplete.index,
  } : {}),
});

try {
  writeFileSync(statusPath, JSON.stringify(nextStatus, null, 2) + '\n');
  try {
    writeFileSync(tracePath, traceEvent + '\n', { flag: 'a' });
  } catch (err) {
    try {
      writeFileSync(statusPath, previousStatusRaw);
    } catch (rollbackErr) {
      console.log(JSON.stringify({
        status: 'error',
        reason: `Failed to append phase_transition and failed to restore rb_status.json: ${err.message}; rollback: ${rollbackErr.message}`,
        advice: ['Treat rb_status.json as suspect; restore it from checkpoint or rerun the prior verified gate before continuing.'],
      }));
      process.exit(1);
    }
    console.log(JSON.stringify({
      status: 'error',
      reason: `Failed to append phase_transition: ${err.message}`,
      advice: ['Status was restored to its previous value; fix rb_trace.jsonl durability and rerun advance-status.'],
    }));
    process.exit(1);
  }
} catch (err) {
  console.log(JSON.stringify({
    status: 'error',
    reason: `Failed to write rb_status.json: ${err.message}`,
    advice: ['Fix bundle write permissions and rerun advance-status.'],
  }));
  process.exit(1);
}

const output = {
  status: 'ok',
  current_gate: targetGateEnum,
  next_gate: nextGateEnum,
  source_handoff_degraded: handoffCheck.covered ? handoffCheck.handoff.degraded === true : false,
};
if (handoffCheck.exceptional) output.source_handoff_kind = 'post_final_reentry';
if (continuation) output.continuation = continuation;
if (!continuation && continuationDiagnostic) output.continuation_diagnostic = continuationDiagnostic;

console.log(JSON.stringify(output));
process.exit(0);
