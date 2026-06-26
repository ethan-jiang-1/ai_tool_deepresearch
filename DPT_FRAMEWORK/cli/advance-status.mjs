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

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKFLOWS_DIR = join(__dirname, '..', 'workflows');

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

// Resolve gate → node → next node → next gate via manifest + chain
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

const nextNode = transitions['passed'] || transitions['rerun'];
if (!nextNode) {
  console.log(JSON.stringify({ status: 'error', reason: `No "passed" transition from "${currentNode}" in chain.json. Available outcomes: ${Object.keys(transitions).join(', ')}` }));
  process.exit(1);
}

const nextGateKey = nodeToGate.get(nextNode);
// Terminal: final phase has gate:null in manifest, so nodeToGate lookup returns undefined.
// Write string "none" (matching CurrentGate enum and gate-readiness-passed expected value),
// not JavaScript null (which serializes to JSON null ≠ "none").
const nextGateEnum = nextGateKey ? gateKeyToEnum(nextGateKey) : 'none';

// Update status
const from = status.current_gate || 'unknown';
status.current_gate = targetGateEnum;
status.next_gate = nextGateEnum;

writeFileSync(statusPath, JSON.stringify(status, null, 2) + '\n');

// Write phase_transition trace event
const tracePath = join(bundlePath, 'rb_trace.jsonl');
const traceEvent = JSON.stringify({
  ts: new Date().toISOString(),
  bundle: status.bundle || 'unknown',
  event: 'phase_transition',
  from,
  to: targetGateEnum,
  next: nextGateEnum,
});
writeFileSync(tracePath, traceEvent + '\n', { flag: 'a' });

console.log(JSON.stringify({ status: 'ok', current_gate: targetGateEnum, next_gate: nextGateEnum }));
process.exit(0);
