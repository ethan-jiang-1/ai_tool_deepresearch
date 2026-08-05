// @impl EXA-005, EXA-006, PLR-003
// Shared command-experiment fact writers and native-finalizer adapter.
// These helpers do not own Agent Flow, health, audit, or cleanup.

import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AgentExperimentCompletionSchema,
  loadRunContext,
} from '../../DEEP_RESEARCH_HARNESS/host_tools/lib/agent-experiment-contract.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FINALIZER = path.join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/host_tools/finalize-agent-experiment.mjs');

/**
 * Append one strict playbook-owned verdict fact to bundle-root rb_trace.jsonl.
 * The native finalizer, not this helper, applies V2 required-check and
 * all/last-per-gate policy.
 */
export function recordCheck(tracePath, checkEvent) {
  if (!checkEvent || typeof checkEvent.gate !== 'string' || typeof checkEvent.passed !== 'boolean') {
    throw new Error('recordCheck requires gate and boolean passed');
  }
  const expected = checkEvent.expected === undefined ? true : checkEvent.expected;
  if (typeof expected !== 'boolean') throw new Error('recordCheck expected must be boolean');
  const entry = {
    ts: new Date().toISOString(),
    event: 'check',
    source: 'playbook',
    gate: checkEvent.gate,
    passed: checkEvent.passed,
    expected,
  };
  if (checkEvent.verdict_judge !== undefined) entry.verdict_judge = checkEvent.verdict_judge;
  if (checkEvent.detail !== undefined) entry.detail = String(checkEvent.detail);
  appendFileSync(tracePath, `${JSON.stringify(entry)}\n`);
}

function normalizeBindings(values, label) {
  if (!Array.isArray(values)) throw new Error(`${label} must be an array`);
  return values.map((entry) => {
    if (!entry || typeof entry.role !== 'string' || typeof entry.path !== 'string' || !entry.role || !entry.path) {
      throw new Error(`${label} entries require non-empty role and path`);
    }
    return { role: entry.role, path: entry.path };
  });
}

/**
 * Invoke the one deterministic native finalizer. This adapter intentionally
 * does not read/re-evaluate trace checks; it only constructs the exact CLI.
 */
export function finalizeAgentExperiment({
  contextPath,
  bundles,
  evidence = [],
  notRunReason = null,
  expectedMode = null,
} = {}) {
  if (!contextPath) throw new Error('finalizeAgentExperiment requires contextPath');
  const contextInfo = loadRunContext(contextPath);
  if (expectedMode !== null && contextInfo.context.policy.verdict_mode !== expectedMode) {
    throw new Error(`verdict mode mismatch: context=${contextInfo.context.policy.verdict_mode} helper=${expectedMode}`);
  }
  const bundleBindings = normalizeBindings(bundles ?? [], 'bundles');
  const evidenceBindings = normalizeBindings(evidence, 'evidence');
  const args = [FINALIZER, '--context', contextInfo.contextPath];
  for (const entry of bundleBindings) args.push('--bundle', `${entry.role}=${entry.path}`);
  for (const entry of evidenceBindings) args.push('--evidence', `${entry.role}=${entry.path}`);
  if (notRunReason !== null) {
    if (typeof notRunReason !== 'string' || !notRunReason.trim()) throw new Error('notRunReason must be non-empty');
    args.push('--not-run-reason', notRunReason.trim());
  }

  const result = spawnSync(process.execPath, args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`native finalizer failed: ${result.stderr.trim() || result.stdout.trim() || `status ${result.status}`}`);
  }
  const completion = AgentExperimentCompletionSchema.parse(JSON.parse(readFileSync(contextInfo.completionPath, 'utf8')));
  console.log(JSON.stringify({ native_outcome: completion.outcome, completion: contextInfo.completionPath }));
  return completion;
}

/**
 * Compatibility-shaped adapter for wff cases while they migrate. `tracePath`
 * identifies the default verdict bundle only; all policy comes from context.
 */
export function verdict(tracePath, mode = 'all', opts = {}) {
  if (typeof mode === 'object' && mode !== null) {
    opts = mode;
    mode = null;
  }
  if (!opts.contextPath) throw new Error('verdict now requires opts.contextPath from the rendered run context');
  const bundlePath = path.dirname(path.resolve(tracePath));
  const bundles = opts.bundles ?? [{ role: opts.bundleRole ?? 'verdict', path: bundlePath }];
  return finalizeAgentExperiment({
    contextPath: opts.contextPath,
    bundles,
    evidence: opts.evidence ?? [],
    notRunReason: opts.notRunReason ?? null,
    expectedMode: mode,
  });
}

/**
 * Playbook-local verdict logs and deletion are retired. The Autorun Supervisor
 * persists full audit/evidence and owns the only cleanup policy.
 */
export function recordVerdict() {
  throw new Error('recordVerdict is retired; native completion and Supervisor audit are authoritative');
}

export function cleanup() {
  throw new Error('playbook cleanup is retired; stop after native finalization');
}
