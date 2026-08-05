#!/usr/bin/env node
// @impl EXA-005, EXA-006, PLR-003
// Deterministic native playbook completion. Never runs Agent Flow, health or cleanup.

import { closeSync, fsyncSync, linkSync, lstatSync, openSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import {
  AgentExperimentBundleRegistrySchema,
  AgentExperimentCompletionSchema,
  evaluateVerdictTrace,
  loadRunContext,
  sha256Bytes,
  traceBinding,
} from './lib/agent-experiment-contract.mjs';

function usage() {
  console.error('Usage: finalize-agent-experiment.mjs --context <path> [--bundle role=path ...] [--evidence role=file ...] [--not-run-reason <reason>]');
  process.exit(2);
}

function splitBinding(value, label) {
  const separator = value.indexOf('=');
  if (separator <= 0 || separator === value.length - 1) throw new Error(`${label} must be role=path`);
  return { role: value.slice(0, separator), path: value.slice(separator + 1) };
}

function parseArgs(argv) {
  const result = { bundles: [], evidence: [], context: null, notRunReason: null };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!['--context', '--bundle', '--evidence', '--not-run-reason'].includes(flag) || index + 1 >= argv.length) usage();
    const value = argv[++index];
    if (flag === '--context') {
      if (result.context !== null) throw new Error('duplicate --context');
      result.context = value;
    } else if (flag === '--bundle') result.bundles.push(splitBinding(value, '--bundle'));
    else if (flag === '--evidence') result.evidence.push(splitBinding(value, '--evidence'));
    else {
      if (result.notRunReason !== null || !value.trim()) throw new Error('duplicate or empty --not-run-reason');
      result.notRunReason = value.trim();
    }
  }
  if (!result.context) usage();
  return result;
}

function syncDirectory(pathValue) {
  const fd = openSync(pathValue, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function readRegistry(contextInfo) {
  const stat = lstatSync(contextInfo.registryPath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('bundle registry must be a non-symlink regular file');
  const registry = AgentExperimentBundleRegistrySchema.parse(JSON.parse(readFileSync(contextInfo.registryPath, 'utf8')));
  if (registry.run_id !== contextInfo.context.run_id) throw new Error('bundle registry run_id mismatch');
  return registry;
}

function observedBundles(caseRoot) {
  const results = [];
  for (const entry of readdirSync(caseRoot, { withFileTypes: true })) {
    if (!/^dpt_(?:disp|rb)_/.test(entry.name)) continue;
    const full = join(caseRoot, entry.name);
    const stat = lstatSync(full);
    if (!entry.isDirectory() || stat.isSymbolicLink()) throw new Error(`observed bundle is not a non-symlink directory: ${entry.name}`);
    const actual = realpathSync(full);
    if (dirname(actual) !== caseRoot) throw new Error(`observed bundle escapes case root: ${entry.name}`);
    results.push(actual);
  }
  return results.sort();
}

function sameBindings(left, right) {
  if (left.length !== right.length) return false;
  const map = new Map(left.map((entry) => [entry.role, entry.path]));
  return right.every((entry) => map.get(entry.role) === entry.path);
}

function normalizeBundleArgs(args, contextInfo) {
  const roles = new Set();
  const paths = new Set();
  return args.map((entry) => {
    if (roles.has(entry.role)) throw new Error(`duplicate bundle role: ${entry.role}`);
    if (!contextInfo.context.policy.bundle_roles.includes(entry.role)) throw new Error(`unknown bundle role: ${entry.role}`);
    const actual = realpathSync(resolve(entry.path));
    const rel = relative(contextInfo.caseRoot, actual);
    const stat = lstatSync(actual);
    if (!rel || rel.startsWith(`..${sep}`) || rel.includes(sep) || !stat.isDirectory() || stat.isSymbolicLink() || dirname(actual) !== contextInfo.caseRoot) {
      throw new Error(`bundle is not a direct non-symlink child: ${entry.path}`);
    }
    if (paths.has(actual)) throw new Error(`duplicate bundle path: ${actual}`);
    roles.add(entry.role);
    paths.add(actual);
    return { role: entry.role, path: actual };
  });
}

function evidenceDeclarations(args, contextInfo, bundlePaths, isNotRun) {
  const roles = new Set();
  const declarations = [];
  for (const entry of args) {
    if (roles.has(entry.role)) throw new Error(`duplicate evidence role: ${entry.role}`);
    if (!contextInfo.context.policy.durable_evidence_roles.includes(entry.role)) throw new Error(`unknown evidence role: ${entry.role}`);
    const absolute = resolve(entry.path);
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`evidence must be a non-symlink regular file: ${absolute}`);
    const actual = realpathSync(absolute);
    if (!bundlePaths.some((bundle) => actual.startsWith(`${bundle}${sep}`))) throw new Error(`evidence is outside declared bundles: ${actual}`);
    const bytes = readFileSync(actual);
    declarations.push({ role: entry.role, path: actual, bytes: bytes.length, sha256: sha256Bytes(bytes) });
    roles.add(entry.role);
  }
  if (!isNotRun) {
    const missing = contextInfo.context.policy.durable_evidence_roles.filter((role) => !roles.has(role));
    if (missing.length) throw new Error(`required durable evidence roles missing: ${missing.join(', ')}`);
  }
  return contextInfo.context.policy.durable_evidence_roles.filter((role) => roles.has(role)).map((role) => declarations.find((entry) => entry.role === role));
}

function publishCompletion(pathValue, completion) {
  const parent = dirname(pathValue);
  const tempPath = join(parent, `.completion.${process.pid}.${Date.now()}.tmp`);
  const fd = openSync(tempPath, 'wx', 0o600);
  try {
    writeFileSync(fd, `${JSON.stringify(completion, null, 2)}\n`);
    fsyncSync(fd);
  } finally { closeSync(fd); }
  try {
    linkSync(tempPath, pathValue);
    unlinkSync(tempPath);
    syncDirectory(parent);
  } catch (error) {
    try { unlinkSync(tempPath); } catch {}
    if (error.code === 'EEXIST') throw new Error('native completion already exists');
    throw error;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const contextInfo = loadRunContext(args.context);
  const registry = readRegistry(contextInfo);
  const actualBundles = normalizeBundleArgs(args.bundles, contextInfo);
  if (!sameBindings(actualBundles, registry.bundles)) throw new Error('CLI bundle declarations do not exact-match the bundle registry');
  const observed = observedBundles(contextInfo.caseRoot);
  if (observed.length !== actualBundles.length || observed.some((pathValue) => !actualBundles.some((entry) => entry.path === pathValue))) {
    throw new Error('observed bundle directories do not exact-match completion declarations');
  }

  const isNotRun = args.notRunReason !== null;
  const actualRoles = new Set(actualBundles.map((entry) => entry.role));
  if (!isNotRun && (actualBundles.length !== contextInfo.context.policy.bundle_roles.length || contextInfo.context.policy.bundle_roles.some((role) => !actualRoles.has(role)))) {
    throw new Error('PASS/FAIL bundle roles do not exact-match V2 policy');
  }

  const byRole = new Map(actualBundles.map((entry) => [entry.role, entry]));
  const ordered = contextInfo.context.policy.bundle_roles.filter((role) => byRole.has(role)).map((role) => byRole.get(role));
  let verdict = { outcome: 'NOT_RUN', checksTotal: 0, consideredChecks: [], eventCount: null };
  if (!isNotRun) {
    const verdictBundle = byRole.get(contextInfo.context.policy.verdict_role);
    if (!verdictBundle) throw new Error('V2 verdict bundle is missing');
    verdict = evaluateVerdictTrace(readFileSync(join(verdictBundle.path, 'rb_trace.jsonl')), contextInfo.context.policy);
  }

  const bundleDeclarations = ordered.map((entry) => {
    const healthRequired = contextInfo.context.policy.health_roles.includes(entry.role);
    const binding = traceBinding(join(entry.path, 'rb_trace.jsonl'), {
      requireValid: healthRequired || (!isNotRun && entry.role === contextInfo.context.policy.verdict_role),
    });
    return {
      role: entry.role,
      path: entry.path,
      trace_prefix_bytes: binding.trace_prefix_bytes,
      trace_prefix_sha256: binding.trace_prefix_sha256,
      trace_parse_status: binding.trace_parse_status,
      trace_event_count: binding.trace_event_count,
      health: { required: healthRequired, profile: healthRequired ? contextInfo.context.policy.health_profile : null },
    };
  });
  const evidence = evidenceDeclarations(args.evidence, contextInfo, ordered.map((entry) => entry.path), isNotRun);
  const policy = contextInfo.context.policy;
  const completion = AgentExperimentCompletionSchema.parse({
    schema_version: 'agent-experiment-completion/v1',
    run_id: contextInfo.context.run_id,
    case: contextInfo.context.case,
    run_context_sha256: contextInfo.contextSha256,
    manifest_sha256: contextInfo.context.manifest_sha256,
    instruction_sha256: contextInfo.context.instruction_sha256,
    source_playbook_sha256: contextInfo.context.source_playbook_sha256,
    rendered_playbook_sha256: contextInfo.context.rendered_playbook_sha256,
    outcome: verdict.outcome,
    not_run_reason: args.notRunReason,
    verdict_mode: policy.verdict_mode,
    checks_total: verdict.checksTotal,
    checks_considered: verdict.consideredChecks.length,
    considered_checks: verdict.consideredChecks,
    verdict_role: isNotRun ? null : policy.verdict_role,
    bundles: bundleDeclarations,
    durable_evidence: evidence,
    proof: {
      subject: policy.proof_subject,
      execution: policy.subject_execution,
      fixture: policy.fixture,
      runtime: policy.runtime,
      external: policy.external_calls,
      judge: policy.verdict_judge,
    },
    completed_at: new Date().toISOString(),
  });
  publishCompletion(contextInfo.completionPath, completion);
  console.log(JSON.stringify({ ok: true, outcome: completion.outcome, completion: contextInfo.completionPath }));
}

try { main(); }
catch (error) {
  console.error(error.message);
  process.exit(1);
}
