// @impl EXA-002, EXA-003, EXA-004, EXA-005, EXA-006, EXA-007, EXA-008, PLR-003
// Deterministic host lifecycle helpers. Markdown Agent Flow is never parsed here.

import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  appendFileSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import {
  AgentExperimentBundleRegistrySchema,
  AgentExperimentCompletionSchema,
  AgentExperimentRunContextSchema,
  BUNDLE_REGISTRY_RELATIVE,
  COMPLETION_FILENAME,
  RUN_CONTEXT_FILENAME,
  caseRootIdentity,
  renderRuntimeTokens,
  sha256Bytes,
} from './agent-experiment-contract.mjs';

const PROTECTED_SOURCE_DIRS = ['DPT_FRAMEWORK', 'experiments_env', 'tests'];

function fail(message) { throw new Error(message); }

export function syncDirectory(pathValue) {
  const fd = openSync(pathValue, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

function ensureDir(pathValue) {
  if (!existsSync(pathValue)) {
    mkdirSync(pathValue, { recursive: true });
    syncDirectory(dirname(pathValue));
  }
}

export function writeDurableFile(pathValue, bytes, { flag = 'wx', mode = 0o600 } = {}) {
  ensureDir(dirname(pathValue));
  const fd = openSync(pathValue, flag, mode);
  try {
    writeFileSync(fd, bytes);
    fsyncSync(fd);
  } finally { closeSync(fd); }
  syncDirectory(dirname(pathValue));
  const stored = readFileSync(pathValue);
  return { path: pathValue, bytes: stored.length, sha256: sha256Bytes(stored) };
}

export function atomicWriteJson(pathValue, value) {
  ensureDir(dirname(pathValue));
  const temp = join(dirname(pathValue), `.${basename(pathValue)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    writeDurableFile(temp, `${JSON.stringify(value, null, 2)}\n`);
    renameSync(temp, pathValue);
    syncDirectory(dirname(pathValue));
  } catch (error) {
    try { unlinkSync(temp); } catch {}
    throw error;
  }
  return { path: pathValue, bytes: statSync(pathValue).size, sha256: sha256Bytes(readFileSync(pathValue)) };
}

function fileIdentityKey(stat) { return `${stat.dev}:${stat.ino}`; }

function collectSourceInodes(pathValue, sink) {
  if (!existsSync(pathValue)) return;
  const stat = lstatSync(pathValue);
  if (stat.isSymbolicLink()) return;
  if (stat.isFile()) { sink.add(fileIdentityKey(stat)); return; }
  if (!stat.isDirectory()) return;
  for (const entry of readdirSync(pathValue)) collectSourceInodes(join(pathValue, entry), sink);
}

/** Fail closed if historical or current experiment storage contains source links/copies. */
export function assertExpBundlesSourceIsolation(repoRoot, expBundlesRoot) {
  if (!existsSync(expBundlesRoot)) return;
  const sourceInodes = new Set();
  for (const name of PROTECTED_SOURCE_DIRS) collectSourceInodes(join(repoRoot, name), sourceInodes);

  const walk = (pathValue) => {
    const stat = lstatSync(pathValue);
    if (stat.isSymbolicLink()) fail(`source isolation forbids symlink under .exp-bundles: ${pathValue}`);
    if (stat.isFile()) {
      if (sourceInodes.has(fileIdentityKey(stat))) fail(`source isolation forbids hardlinked source under .exp-bundles: ${pathValue}`);
      return;
    }
    if (!stat.isDirectory()) return;
    if (pathValue !== expBundlesRoot && PROTECTED_SOURCE_DIRS.includes(basename(pathValue))) {
      fail(`source isolation forbids copied source tree under .exp-bundles: ${pathValue}`);
    }
    for (const entry of readdirSync(pathValue)) walk(join(pathValue, entry));
  };
  walk(expBundlesRoot);
}

export function isRealHumanCase(caseId) {
  const numeric = Number(caseId.match(/^case-(\d+)-/)?.[1]);
  return numeric >= 901 && numeric <= 949;
}

export function selectManifestEntries(entries, filters) {
  const { caseId = null, group = null, tier = null, all = false, interactive = false } = filters;
  if (interactive) {
    if (!caseId || group || tier || all) fail('interactive execution requires exactly one --case and no batch selector');
    const selected = entries.filter((entry) => entry.frontmatter.case === caseId);
    if (selected.length !== 1) fail(`unknown exact case: ${caseId}`);
    return selected;
  }
  if (caseId) {
    if (group || tier || all) fail('--case is exclusive with --group, --tier and --all');
    const selected = entries.filter((entry) => entry.frontmatter.case === caseId);
    if (selected.length !== 1) fail(`unknown exact case: ${caseId}`);
    return selected;
  }
  if (all && (group || tier)) fail('--all is exclusive with --group and --tier');
  let selected = entries.filter((entry) => !isRealHumanCase(entry.frontmatter.case));
  if (all) return selected;
  if (group) selected = selected.filter((entry) => entry.frontmatter.experiment === group);
  if (tier) selected = selected.filter((entry) => entry.cost === tier);
  if (!group && !tier) selected = selected.filter((entry) => entry.cost === 'light');
  if (selected.length === 0) fail('selection is empty or the exact group/tier is unknown');
  return selected;
}

function assertRegular(pathValue, label) {
  const stat = lstatSync(pathValue);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`${label} must be a non-symlink regular file: ${pathValue}`);
}

export function preflightRuntimeBindings(source) {
  return renderRuntimeTokens(source, {
    RUN_CONTEXT_SH: '/__agent_experiment__/agent-experiment-run.json',
    CASE_RUN_ROOT_SH: '/__agent_experiment__',
    PLAYBOOK_STATE_DIR_SH: '/__agent_experiment__/_playbook_state',
  });
}

function safeCaseId(value) { return value.replace(/[^a-zA-Z0-9._-]+/g, '-'); }

export function prepareCaseRun({
  repoRoot,
  expBundlesRoot,
  batchId,
  ordinal,
  entry,
  mode,
  manifestPath,
  instructionPath,
}) {
  const repoCommandRoot = realpathSync(repoRoot);
  const frameworkRoot = realpathSync(join(repoCommandRoot, 'DPT_FRAMEWORK'));
  assertRegular(manifestPath, 'manifest');
  assertRegular(instructionPath, 'instruction');
  assertRegular(entry.fullPath, 'source playbook');
  const sourceBytes = readFileSync(entry.fullPath);
  preflightRuntimeBindings(sourceBytes.toString('utf8'));

  const runsRoot = join(expBundlesRoot, 'runs', batchId);
  ensureDir(runsRoot);
  const caseRunRoot = join(runsRoot, `${String(ordinal).padStart(3, '0')}-${safeCaseId(entry.frontmatter.case)}-${randomUUID()}`);
  mkdirSync(caseRunRoot, { mode: 0o700 });
  syncDirectory(runsRoot);
  mkdirSync(join(caseRunRoot, '_playbook_state'), { mode: 0o700 });
  mkdirSync(join(caseRunRoot, '_diagnostics'), { mode: 0o700 });
  syncDirectory(caseRunRoot);

  const contextPath = join(caseRunRoot, RUN_CONTEXT_FILENAME);
  const renderedPath = join(caseRunRoot, 'rendered-playbook.md');
  const stateDir = join(caseRunRoot, '_playbook_state');
  const rendered = renderRuntimeTokens(sourceBytes.toString('utf8'), {
    RUN_CONTEXT_SH: contextPath,
    CASE_RUN_ROOT_SH: caseRunRoot,
    PLAYBOOK_STATE_DIR_SH: stateDir,
  }).rendered;
  const renderedBytes = Buffer.from(rendered);
  writeDurableFile(renderedPath, renderedBytes);

  const manifestBytes = readFileSync(manifestPath);
  const instructionBytes = readFileSync(instructionPath);
  const runId = randomUUID();
  const context = AgentExperimentRunContextSchema.parse({
    schema_version: 'agent-experiment-run/v1',
    run_id: runId,
    mode,
    created_at: new Date().toISOString(),
    manifest_path: realpathSync(manifestPath),
    manifest_sha256: sha256Bytes(manifestBytes),
    instruction_path: realpathSync(instructionPath),
    instruction_sha256: sha256Bytes(instructionBytes),
    source_playbook_path: realpathSync(entry.fullPath),
    source_playbook_sha256: sha256Bytes(sourceBytes),
    rendered_playbook_path: renderedPath,
    rendered_playbook_sha256: sha256Bytes(renderedBytes),
    case: entry.frontmatter.case,
    experiment: entry.frontmatter.experiment,
    cost: entry.cost,
    policy: {
      verdict_mode: entry.frontmatter.verdict_mode,
      required_checks: entry.frontmatter.required_checks,
      bundle_roles: entry.frontmatter.bundle_roles,
      verdict_role: entry.frontmatter.verdict_role,
      health_roles: entry.frontmatter.health_roles,
      health_profile: entry.frontmatter.health_profile,
      durable_evidence_roles: entry.frontmatter.durable_evidence_roles,
      proof_subject: entry.frontmatter.proof_subject,
      subject_execution: entry.frontmatter.subject_execution,
      fixture: entry.frontmatter.fixture,
      runtime: entry.frontmatter.runtime,
      external_calls: entry.frontmatter.external_calls,
      verdict_judge: entry.frontmatter.verdict_judge,
    },
    repo_command_root: repoCommandRoot,
    framework_root: frameworkRoot,
    case_run_root: caseRunRoot,
    case_root_identity: caseRootIdentity(caseRunRoot),
    completion_path: join(caseRunRoot, COMPLETION_FILENAME),
  });
  const contextBytes = Buffer.from(`${JSON.stringify(context, null, 2)}\n`);
  writeDurableFile(contextPath, contextBytes);
  const registryPath = join(caseRunRoot, BUNDLE_REGISTRY_RELATIVE);
  writeDurableFile(registryPath, `${JSON.stringify({ schema_version: 'agent-experiment-bundles/v1', run_id: runId, bundles: [] }, null, 2)}\n`);

  return {
    batchId,
    ordinal,
    entry,
    caseRunRoot,
    contextPath,
    context,
    contextBytes,
    contextSha256: sha256Bytes(contextBytes),
    renderedPath,
    renderedBytes,
    instructionBytes,
    sourceBytes,
    manifestBytes,
    registryPath,
    rootIdentity: context.case_root_identity,
  };
}

export function buildInjectedPrompt(prepared) {
  const identity = {
    case: prepared.context.case,
    manifest_path: prepared.context.manifest_path,
    manifest_sha256: prepared.context.manifest_sha256,
    instruction_path: prepared.context.instruction_path,
    instruction_sha256: prepared.context.instruction_sha256,
    source_playbook_path: prepared.context.source_playbook_path,
    source_playbook_sha256: prepared.context.source_playbook_sha256,
    rendered_playbook_path: prepared.context.rendered_playbook_path,
    rendered_playbook_sha256: prepared.context.rendered_playbook_sha256,
    run_context_path: prepared.contextPath,
    run_context_sha256: prepared.contextSha256,
    case_run_root: prepared.caseRunRoot,
  };
  return `${prepared.instructionBytes.toString('utf8').trim()}\n\n---\n\n## Injected execution identity\n\n\`\`\`json\n${JSON.stringify(identity, null, 2)}\n\`\`\`\n\n---\n\n## Complete rendered selected playbook\n\n${prepared.renderedBytes.toString('utf8')}`;
}

function rootIdentityMatches(pathValue, expected) {
  return JSON.stringify(caseRootIdentity(pathValue)) === JSON.stringify(expected);
}

export function assertCaseRunRootIdentity(prepared, boundary = 'operation') {
  if (!rootIdentityMatches(prepared.caseRunRoot, prepared.rootIdentity)) fail(`case run root identity changed before ${boundary}`);
}

function directObservedBundles(caseRoot) {
  const values = [];
  for (const entry of readdirSync(caseRoot, { withFileTypes: true })) {
    if (!/^dpt_(?:disp|rb)_/.test(entry.name)) continue;
    const full = join(caseRoot, entry.name);
    const stat = lstatSync(full);
    if (!entry.isDirectory() || stat.isSymbolicLink()) fail(`observed bundle is not a non-symlink directory: ${full}`);
    const actual = realpathSync(full);
    if (dirname(actual) !== caseRoot) fail(`observed bundle escapes case root: ${full}`);
    values.push(actual);
  }
  return values.sort();
}

function bindingMap(values) { return new Map(values.map((entry) => [entry.role, entry.path])); }

export function validateNativeCompletion(prepared) {
  assertCaseRunRootIdentity(prepared, 'completion validation');
  assertRegular(prepared.contextPath, 'run context');
  const currentContextBytes = readFileSync(prepared.contextPath);
  if (sha256Bytes(currentContextBytes) !== prepared.contextSha256) fail('run context digest changed');
  const currentContext = AgentExperimentRunContextSchema.parse(JSON.parse(currentContextBytes));
  if (JSON.stringify(currentContext) !== JSON.stringify(prepared.context)) fail('run context content changed');

  for (const [pathValue, expectedBytes, label] of [
    [prepared.context.manifest_path, prepared.manifestBytes, 'manifest'],
    [prepared.context.instruction_path, prepared.instructionBytes, 'instruction'],
    [prepared.context.source_playbook_path, prepared.sourceBytes, 'source playbook'],
    [prepared.context.rendered_playbook_path, prepared.renderedBytes, 'rendered playbook'],
  ]) {
    assertRegular(pathValue, label);
    if (sha256Bytes(readFileSync(pathValue)) !== sha256Bytes(expectedBytes)) fail(`${label} digest changed`);
  }

  const completionPath = prepared.context.completion_path;
  assertRegular(completionPath, 'native completion');
  const completion = AgentExperimentCompletionSchema.parse(JSON.parse(readFileSync(completionPath, 'utf8')));
  const expectedDigests = {
    run_id: prepared.context.run_id,
    case: prepared.context.case,
    run_context_sha256: prepared.contextSha256,
    manifest_sha256: prepared.context.manifest_sha256,
    instruction_sha256: prepared.context.instruction_sha256,
    source_playbook_sha256: prepared.context.source_playbook_sha256,
    rendered_playbook_sha256: prepared.context.rendered_playbook_sha256,
    verdict_mode: prepared.context.policy.verdict_mode,
  };
  for (const [key, expected] of Object.entries(expectedDigests)) if (completion[key] !== expected) fail(`completion ${key} mismatch`);
  const policy = prepared.context.policy;
  const expectedProof = {
    subject: policy.proof_subject, execution: policy.subject_execution, fixture: policy.fixture,
    runtime: policy.runtime, external: policy.external_calls, judge: policy.verdict_judge,
  };
  if (JSON.stringify(completion.proof) !== JSON.stringify(expectedProof)) fail('completion proof profile mismatch');

  const completionRoles = completion.bundles.map((entry) => entry.role);
  const expectedRoles = completion.outcome === 'NOT_RUN'
    ? policy.bundle_roles.filter((role) => completionRoles.includes(role))
    : policy.bundle_roles;
  if (JSON.stringify(completionRoles) !== JSON.stringify(expectedRoles)) fail('completion bundle roles/order mismatch V2 policy');
  if (completion.outcome !== 'NOT_RUN' && completion.verdict_role !== policy.verdict_role) fail('completion verdict role mismatch');
  for (const bundle of completion.bundles) {
    const required = policy.health_roles.includes(bundle.role);
    if (bundle.health.required !== required || bundle.health.profile !== (required ? policy.health_profile : null)) fail(`completion health policy mismatch: ${bundle.role}`);
  }

  const registryStat = lstatSync(prepared.registryPath);
  if (!registryStat.isFile() || registryStat.isSymbolicLink()) fail('bundle registry is not a non-symlink regular file');
  const registry = AgentExperimentBundleRegistrySchema.parse(JSON.parse(readFileSync(prepared.registryPath, 'utf8')));
  if (registry.run_id !== prepared.context.run_id) fail('bundle registry run_id mismatch');
  const completionBindings = completion.bundles.map(({ role, path }) => ({ role, path }));
  const completionMap = bindingMap(completionBindings);
  const registryMap = bindingMap(registry.bundles);
  if (completionBindings.length !== registry.bundles.length
    || completionBindings.some((entry) => registryMap.get(entry.role) !== entry.path)
    || registry.bundles.some((entry) => completionMap.get(entry.role) !== entry.path)) fail('completion and registry bindings differ');
  const observed = directObservedBundles(prepared.caseRunRoot);
  if (observed.length !== completion.bundles.length || observed.some((pathValue) => !completion.bundles.some((entry) => entry.path === pathValue))) {
    fail('observed bundles differ from native completion');
  }

  for (const bundle of completion.bundles) {
    const tracePath = join(bundle.path, 'rb_trace.jsonl');
    const current = existsSync(tracePath) ? readFileSync(tracePath) : Buffer.alloc(0);
    const prefix = current.subarray(0, bundle.trace_prefix_bytes);
    if (prefix.length !== bundle.trace_prefix_bytes || sha256Bytes(prefix) !== bundle.trace_prefix_sha256) fail(`trace prefix binding changed: ${bundle.role}`);
  }
  const expectedEvidenceRoles = completion.outcome === 'NOT_RUN'
    ? policy.durable_evidence_roles.filter((role) => completion.durable_evidence.some((entry) => entry.role === role))
    : policy.durable_evidence_roles;
  if (JSON.stringify(completion.durable_evidence.map((entry) => entry.role)) !== JSON.stringify(expectedEvidenceRoles)) fail('durable evidence roles/order mismatch');
  for (const evidence of completion.durable_evidence) {
    assertRegular(evidence.path, `durable evidence ${evidence.role}`);
    const actual = realpathSync(evidence.path);
    if (!completion.bundles.some((bundle) => actual.startsWith(`${bundle.path}${sep}`))) fail(`durable evidence escapes declared bundles: ${evidence.role}`);
    const bytes = readFileSync(actual);
    if (bytes.length !== evidence.bytes || sha256Bytes(bytes) !== evidence.sha256) fail(`durable evidence changed: ${evidence.role}`);
  }
  return completion;
}

function redactText(text, secrets) {
  let value = String(text);
  for (const secret of secrets) if (secret) value = value.split(secret).join('[REDACTED]');
  return value;
}

function createSanitizedWriter(pathValue, secrets) {
  ensureDir(dirname(pathValue));
  const fd = openSync(pathValue, 'wx', 0o600);
  const maxTail = Math.max(0, ...secrets.map((value) => value.length - 1));
  let pending = '';
  let failed = null;
  return {
    write(chunk) {
      if (failed) return;
      try {
        pending += chunk.toString('utf8');
        let emitLength = Math.max(0, pending.length - maxTail);
        for (const secret of secrets) {
          if (!secret) continue;
          const start = pending.lastIndexOf(secret, emitLength);
          if (start >= 0 && start < emitLength && start + secret.length > emitLength) emitLength = start;
        }
        if (emitLength > 0) {
          writeFileSync(fd, redactText(pending.slice(0, emitLength), secrets));
          pending = pending.slice(emitLength);
        }
      } catch (error) { failed = error; }
    },
    close() {
      try {
        if (pending) writeFileSync(fd, redactText(pending, secrets));
        fsyncSync(fd);
      } finally { closeSync(fd); }
      syncDirectory(dirname(pathValue));
      if (failed) throw failed;
      const bytes = readFileSync(pathValue);
      return { path: pathValue, bytes: bytes.length, sha256: sha256Bytes(bytes) };
    },
  };
}

function approvalRequested(event) {
  if (!event || typeof event !== 'object') return false;
  if (['permission_request', 'approval_request', 'can_use_tool'].includes(event.type)) return true;
  if (Array.isArray(event.permission_denials) && event.permission_denials.length > 0) return true;
  return false;
}

function budgetFailure(event) {
  const text = JSON.stringify(event ?? {}).toLowerCase();
  return text.includes('max_budget') || text.includes('budget_exhaust');
}

function signalProcessGroup(child, signal) {
  if (!child.pid) return;
  try { process.kill(-child.pid, signal); } catch { try { child.kill(signal); } catch {} }
}

export async function runHeadlessAgent({ plan, prompt, cwd, timeoutMs, logPaths, abortSignal }) {
  const promptRef = writeDurableFile(logPaths.prompt, prompt);
  const stdoutWriter = createSanitizedWriter(logPaths.stdout, plan.secretValues);
  const stderrWriter = createSanitizedWriter(logPaths.stderr, plan.secretValues);
  const child = spawn(plan.executable, plan.args, { cwd, env: plan.env, stdio: plan.stdio, shell: false, detached: true });
  let timedOut = false;
  let externalSignal = null;
  let stdoutBuffer = '';
  const events = [];
  let parseError = null;
  const timer = setTimeout(() => {
    timedOut = true;
    signalProcessGroup(child, 'SIGTERM');
    setTimeout(() => signalProcessGroup(child, 'SIGKILL'), 2000).unref();
  }, timeoutMs);
  const onAbort = () => {
    externalSignal = abortSignal.reason || 'SIGINT';
    signalProcessGroup(child, 'SIGTERM');
    setTimeout(() => signalProcessGroup(child, 'SIGKILL'), 2000).unref();
  };
  if (abortSignal) abortSignal.addEventListener('abort', onAbort, { once: true });

  child.stdout.on('data', (chunk) => {
    stdoutWriter.write(chunk);
    stdoutBuffer += chunk.toString('utf8');
    const lines = stdoutBuffer.split('\n');
    stdoutBuffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try { events.push(JSON.parse(line)); } catch (error) { parseError = error; }
    }
  });
  child.stderr.on('data', (chunk) => stderrWriter.write(chunk));
  child.stdin.end(prompt);
  const result = await new Promise((resolvePromise) => {
    child.once('error', (error) => resolvePromise({ error, code: null, signal: null }));
    child.once('close', (code, signal) => resolvePromise({ error: null, code, signal }));
  });
  clearTimeout(timer);
  if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
  if (stdoutBuffer.trim()) {
    try { events.push(JSON.parse(stdoutBuffer)); } catch (error) { parseError = error; }
  }
  const stdoutRef = stdoutWriter.close();
  const stderrRef = stderrWriter.close();
  const finalResults = events.filter((event) => event?.type === 'result');
  const costs = finalResults.filter((event) => typeof event.total_cost_usd === 'number' && Number.isFinite(event.total_cost_usd));
  const approval = events.some(approvalRequested);
  const budgetExhausted = events.some(budgetFailure);
  let processOutcome = 'completed';
  if (externalSignal) processOutcome = 'signal';
  else if (timedOut) processOutcome = 'timeout';
  else if (approval) processOutcome = 'approval_required';
  else if (result.error || result.signal || result.code !== 0) processOutcome = result.signal ? 'signal' : 'nonzero';
  return {
    processOutcome,
    code: result.code,
    signal: result.signal,
    externalSignal,
    parseError: parseError?.message ?? null,
    approval,
    budgetExhausted,
    totalCostUsd: costs.length === 1 && finalResults.length === 1 ? costs[0].total_cost_usd : null,
    finalResultCount: finalResults.length,
    logs: { prompt: promptRef, stdout: stdoutRef, stderr: stderrRef },
  };
}

export async function runInteractiveAgent({ plan, cwd, timeoutMs, abortSignal }) {
  const child = spawn(plan.executable, plan.args, { cwd, env: plan.env, stdio: 'inherit', shell: false, detached: true });
  let timedOut = false;
  let externalSignal = null;
  const timer = setTimeout(() => { timedOut = true; signalProcessGroup(child, 'SIGTERM'); }, timeoutMs);
  const onAbort = () => { externalSignal = abortSignal.reason || 'SIGINT'; signalProcessGroup(child, 'SIGTERM'); };
  if (abortSignal) abortSignal.addEventListener('abort', onAbort, { once: true });
  const result = await new Promise((resolvePromise) => {
    child.once('error', (error) => resolvePromise({ error, code: null, signal: null }));
    child.once('close', (code, signal) => resolvePromise({ error: null, code, signal }));
  });
  clearTimeout(timer);
  if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
  return {
    processOutcome: externalSignal ? 'signal' : timedOut ? 'timeout' : result.signal ? 'signal' : result.error || result.code !== 0 ? 'nonzero' : 'completed',
    code: result.code,
    signal: result.signal,
    externalSignal,
    logs: { prompt: null, stdout: null, stderr: null },
    totalCostUsd: null,
  };
}

export async function runHealthChecks({ completion, healthCli, cwd, timeoutMs }) {
  const targets = completion.bundles.filter((bundle) => bundle.health.required);
  if (targets.length === 0) return { aggregate: null, reports: [] };
  const reports = [];
  for (const target of targets) {
    const child = spawn(process.execPath, [healthCli, '--bundle', target.path, '--profile', target.health.profile, '--json'], {
      cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: false,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGTERM'); }, timeoutMs);
    const result = await new Promise((resolvePromise) => {
      child.once('error', (error) => resolvePromise({ code: null, signal: null, error }));
      child.once('close', (code, signal) => resolvePromise({ code, signal, error: null }));
    });
    clearTimeout(timer);
    if (timedOut || result.error || result.signal || ![0, 1].includes(result.code)) {
      return { aggregate: 'ERROR', reports, error: `health process failure for ${target.role}: ${stderr.trim() || result.error?.message || result.signal || result.code}` };
    }
    let report;
    try { report = JSON.parse(stdout); } catch { return { aggregate: 'ERROR', reports, error: `malformed health JSON for ${target.role}` }; }
    if (report?.schema_version !== 'experiment_health.v1' || report.profile !== target.health.profile || !['clean', 'issues'].includes(report.status)) {
      return { aggregate: 'ERROR', reports, error: `invalid health contract for ${target.role}` };
    }
    reports.push({ role: target.role, bundle: target.path, report });
  }
  return { aggregate: reports.every((entry) => entry.report.status === 'clean') ? 'CLEAN' : 'ISSUES', reports };
}

function assertNoSecrets(bytes, secrets, label) {
  const text = bytes.toString('utf8');
  for (const secret of secrets) if (secret && text.includes(secret)) fail(`known credential found in ${label}`);
}

export function exportCleanupEvidence({ prepared, completion, expBundlesRoot, secrets }) {
  assertCaseRunRootIdentity(prepared, 'evidence export');
  const base = join(expBundlesRoot, '_evidence', prepared.batchId, `${String(prepared.ordinal).padStart(3, '0')}-${safeCaseId(prepared.context.case)}`);
  const traceDir = join(base, 'traces');
  const subjectDir = join(base, 'subject');
  ensureDir(traceDir);
  const traceRefs = [];
  for (const bundle of completion.bundles) {
    if (bundle.trace_parse_status === 'missing') {
      traceRefs.push({ role: bundle.role, path: null, bytes: 0, sha256: bundle.trace_prefix_sha256, parse_status: 'missing' });
      continue;
    }
    const source = readFileSync(join(bundle.path, 'rb_trace.jsonl')).subarray(0, bundle.trace_prefix_bytes);
    if (source.length !== bundle.trace_prefix_bytes || sha256Bytes(source) !== bundle.trace_prefix_sha256) fail(`trace changed before export: ${bundle.role}`);
    assertNoSecrets(source, secrets, `trace ${bundle.role}`);
    const target = join(traceDir, `${safeCaseId(bundle.role)}.rb_trace.jsonl`);
    const ref = writeDurableFile(target, source);
    if (sha256Bytes(readFileSync(target)) !== ref.sha256) fail(`trace export verification failed: ${bundle.role}`);
    traceRefs.push({ role: bundle.role, ...ref, parse_status: bundle.trace_parse_status });
  }
  const subjectRefs = [];
  if (completion.durable_evidence.length > 0) ensureDir(subjectDir);
  for (const evidence of completion.durable_evidence) {
    const source = readFileSync(evidence.path);
    if (source.length !== evidence.bytes || sha256Bytes(source) !== evidence.sha256) fail(`Subject evidence changed before export: ${evidence.role}`);
    assertNoSecrets(source, secrets, `Subject evidence ${evidence.role}`);
    const target = join(subjectDir, `${safeCaseId(evidence.role)}-${basename(evidence.path)}`);
    const ref = writeDurableFile(target, source);
    if (ref.sha256 !== evidence.sha256) fail(`Subject evidence export verification failed: ${evidence.role}`);
    subjectRefs.push({ role: evidence.role, ...ref });
  }
  return { traces: traceRefs, subject: subjectRefs };
}

export function appendAuditEvent(expBundlesRoot, event) {
  const auditDir = join(expBundlesRoot, '_audit');
  ensureDir(auditDir);
  const auditPath = join(auditDir, 'agent-experiment-runs.jsonl');
  const line = Buffer.from(`${JSON.stringify(event)}\n`);
  const fd = openSync(auditPath, 'a', 0o600);
  try { appendFileSync(fd, line); fsyncSync(fd); } finally { closeSync(fd); }
  syncDirectory(auditDir);
  return { path: auditPath, record_sha256: sha256Bytes(line), bytes: line.length };
}

export function cleanupCaseRoot(prepared) {
  assertCaseRunRootIdentity(prepared, 'cleanup');
  rmSync(prepared.caseRunRoot, { recursive: true, force: false });
  syncDirectory(dirname(prepared.caseRunRoot));
  if (existsSync(prepared.caseRunRoot)) fail('case run root still exists after cleanup');
}

export function sha256Object(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
