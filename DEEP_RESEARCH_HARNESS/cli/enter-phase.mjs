#!/usr/bin/env node
// @impl CPT-003, WNC-010, WNC-011, CLE-001

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createTrace } from '../engine/trace.mjs';
import {
  assessNode,
  createState,
  createWorkflowRuntime,
  nodePath,
} from '../engine/workflow-chain.mjs';
import {
  invocationError,
  parseOperationInvocation,
  validateBundleDirectory,
  validateWorkflowPhaseReference,
} from '../engine/helpers/cli-operation-contract.mjs';
import { continuationForLoadedNode } from '../engine/helpers/continuation-cue.mjs';
import {
  validateEnterPhaseTarget,
} from '../engine/helpers/handoff-helpers.mjs';
import {
  extractExecutionBrief,
  renderPhaseEntryPresentation,
} from '../engine/helpers/phase-entry-presentation.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NODES_DIR = join(__dirname, '..', 'workflows', 'nodes');
const command = 'node DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs';
const usage = [
  'Usage:',
  `  ${command} --bundle <bundle-path> --node <file-ref> [--full]`,
].join('\n');

function emit(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(reason, advice = [], exitCode = 1, extra = {}) {
  emit({ status: 'error', reason, advice, ...extra });
  process.exit(exitCode);
}

function failInvocation(reason, extra = {}) {
  emit({
    ...invocationError({ command: 'enter-phase', reason, usage }),
    advice: [usage],
    ...extra,
  });
  process.exit(2);
}

function failConfiguration(preflight) {
  fail(preflight.reason, [
    'Repair the selected framework node action core before retrying enter-phase.',
  ], 2, {
    error: 'framework_configuration',
    reason_code: preflight.reason_code,
  });
}

const invocation = parseOperationInvocation(process.argv.slice(2), {
  usage,
  forms: [{
    id: 'enter-phase',
    positionals: [],
    options: {
      bundle: { required: true },
      node: { required: true },
      full: { type: 'boolean' },
    },
  }],
});

if (invocation.kind === 'help') {
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}
if (invocation.kind === 'invalid') failInvocation(invocation.reason);

const bundle = validateBundleDirectory(invocation.values.bundle);
if (!bundle.ok) failInvocation(bundle.reason, { coordinate: bundle.coordinate });
const target = validateWorkflowPhaseReference(invocation.values.node);
if (!target.ok) failInvocation(target.reason, { coordinate: target.coordinate });

const bundlePath = bundle.path;
const targetNode = target.value;
const tracePath = join(bundlePath, 'rb_trace.jsonl');
if (!existsSync(tracePath)) fail(`rb_trace.jsonl not found in selected bundle`, []);
const statusPath = join(bundlePath, 'rb_status.json');
if (!existsSync(statusPath)) fail(`rb_status.json not found in selected bundle`, []);

const authorization = validateEnterPhaseTarget(bundlePath, targetNode);
if (!authorization.ok) fail(authorization.reason, authorization.advice || []);
const { handoff } = authorization;

let actionCore;
try {
  actionCore = extractExecutionBrief(readFileSync(nodePath(targetNode, NODES_DIR), 'utf8'), { nodeRef: targetNode });
} catch (error) {
  actionCore = {
    ok: false,
    reason_code: 'execution_brief_source_unreadable',
    reason: `cannot read target framework node ${targetNode}: ${error.message}`,
  };
}
if (!actionCore.ok) failConfiguration(actionCore);

const baseTrace = createTrace(tracePath, { consoleEcho: false });
const trace = {
  traceFilePath: baseTrace.traceFilePath,
  traceEntry(event, detail = {}) {
    if (event === 'load_complete' && detail.entry === handoff.targetNode) {
      if (handoff.kind === 'post_final_reentry') {
        if (handoff.loadComplete) return;
        baseTrace.traceEntry(event, {
          ...detail,
          handoff_source_kind: 'post_final_reentry',
          handoff_source_event_id: handoff.eventId,
          handoff_source_event_index: handoff.index,
          handoff_source_event_sha256: handoff.eventLineSha256,
          handoff_source_operation_id: handoff.operationId,
          handoff_target_node: handoff.targetNode,
        });
        return;
      }
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
} catch (error) {
  fail(`Failed to load node "${targetNode}": ${error.message}`);
}
if (!result || result.status !== 'loaded') {
  fail(`Failed to load node "${targetNode}": ${result?.error || 'unknown loader error'}`);
}

const targetEntry = runtime.contentCache.get(targetNode);
const continuation = continuationForLoadedNode({
  frontmatter: targetEntry?.frontmatter,
  nodeRef: targetNode,
});
if (!continuation) {
  fail(
    `Failed to derive continuation cue for loaded node "${targetNode}"`,
    ['Verify the target phase frontmatter includes a supported stop/gate contract.'],
  );
}

try {
  const status = JSON.parse(readFileSync(statusPath, 'utf8'));
  status.current_node = targetNode;
  writeFileSync(statusPath, JSON.stringify(status, null, 2) + '\n');
} catch (error) {
  fail(
    `Failed to write rb_status.json current_node after load_complete: ${error.message}`,
    ['Treat this as a partial phase-entry failure; repair or retry through Engine tooling before continuing.'],
  );
}

const statusSyncCommand = `node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle ${bundlePath} --to ${handoff.sourceGateEnum}`;
const bounded = renderPhaseEntryPresentation({
  continuation,
  status_sync_command: statusSyncCommand,
  action_core: actionCore.action_core,
  load_plan: result.plan,
  target_node: targetNode,
});

const fullClosure = invocation.values.full
  ? result.plan.map((fileRef) => {
    const entry = runtime.contentCache.get(fileRef);
    if (!entry) fail(`Loaded plan references missing cache entry: ${fileRef}`);
    return `<!-- DPT_LOADED_FILE_START ${fileRef} -->\n\n${entry.md.trimEnd()}\n\n<!-- DPT_LOADED_FILE_END ${fileRef} -->`;
  }).join('\n\n')
  : null;

process.stdout.write(`${fullClosure ? `${bounded}\n\n${fullClosure}` : bounded}\n`);
