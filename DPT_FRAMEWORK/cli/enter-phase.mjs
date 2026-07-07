#!/usr/bin/env node
// enter-phase.mjs — Agent-facing lifecycle node entry witness
// @impl CPT-003

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createTrace } from '../engine/trace.mjs';
import { createState, createWorkflowRuntime, assessNode } from '../engine/workflow-chain.mjs';
import { validateEnterPhaseTarget } from '../engine/helpers/handoff-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NODES_DIR = join(__dirname, '..', 'workflows', 'nodes');

function fail(reason, advice = [], exitCode = 1) {
  console.log(JSON.stringify({ status: 'error', reason, advice }, null, 2));
  process.exit(exitCode);
}

let values;
try {
  ({ values } = parseArgs({
    options: {
      bundle: { type: 'string' },
      node: { type: 'string' },
    },
    strict: true,
  }));
} catch (err) {
  fail(`Invalid arguments: ${err.message}`, ['Usage: node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <fileRef>']);
}

if (!values.bundle || !values.node) {
  fail('Missing required args: --bundle <path> --node <fileRef>', ['Usage: node DPT_FRAMEWORK/cli/enter-phase.mjs --bundle <path> --node <fileRef>']);
}

const bundlePath = values.bundle;
const targetNode = values.node;

if (!existsSync(bundlePath)) {
  fail(`Bundle not found: ${bundlePath}`);
}

const tracePath = join(bundlePath, 'rb_trace.jsonl');
if (!existsSync(tracePath)) {
  fail(`rb_trace.jsonl not found in ${bundlePath}`);
}

const statusPath = join(bundlePath, 'rb_status.json');
if (!existsSync(statusPath)) {
  fail(`rb_status.json not found in ${bundlePath}`);
}

const authorization = validateEnterPhaseTarget(bundlePath, targetNode);
if (!authorization.ok) {
  fail(authorization.reason, authorization.advice || []);
}

const { handoff } = authorization;
const baseTrace = createTrace(tracePath, { consoleEcho: false });
const trace = {
  traceFilePath: baseTrace.traceFilePath,
  traceEntry(event, detail = {}) {
    if (event === 'load_complete' && detail.entry === handoff.targetNode) {
      baseTrace.traceEntry(event, {
        ...detail,
        handoff_source_gate: handoff.sourceGate,
        handoff_source_node: handoff.sourceNode,
        handoff_target_node: handoff.targetNode,
        handoff_source_attempt_index: handoff.index,
        handoff_source_attempt_ts: handoff.sourceAttemptTs,
        handoff_source_degraded: handoff.degraded === true,
        handoff_source_degraded_reason: handoff.degradedReason || null,
        handoff_source_degraded_rules: handoff.degradedRules || [],
      });
      return;
    }
    baseTrace.traceEntry(event, detail);
  },
};

const runtime = createWorkflowRuntime('enter-phase', NODES_DIR);
const state = createState();
let result;
try {
  result = assessNode(targetNode, state, runtime, trace);
} catch (err) {
  fail(`Failed to load node "${targetNode}": ${err.message}`);
}

if (!result || result.status !== 'loaded') {
  fail(`Failed to load node "${targetNode}": ${result?.error || 'unknown loader error'}`);
}

try {
  const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
  status.current_node = targetNode;
  writeFileSync(statusPath, JSON.stringify(status, null, 2) + '\n');
} catch (err) {
  fail(
    `Failed to write rb_status.json current_node after load_complete: ${err.message}`,
    ['Treat this as a partial phase-entry failure; repair or retry through Engine tooling before continuing.'],
  );
}

const sections = [];
for (const fileRef of result.plan || []) {
  const entry = runtime.contentCache.get(fileRef);
  if (!entry) {
    fail(`Loaded plan references missing cache entry: ${fileRef}`);
  }
  sections.push(`<!-- DPT_LOADED_FILE_START ${fileRef} -->\n\n${entry.md.trimEnd()}\n\n<!-- DPT_LOADED_FILE_END ${fileRef} -->`);
}

console.log(sections.join('\n\n'));
process.exit(0);
