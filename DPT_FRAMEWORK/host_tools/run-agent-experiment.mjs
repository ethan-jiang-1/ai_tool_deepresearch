#!/usr/bin/env node
// @impl EXA-001, EXA-002, EXA-003, EXA-004, EXA-005, EXA-006, EXA-007, EXA-008, PLR-001, PLR-003
// Agent Experiment Autorun Supervisor. Supervises one Agent per case; never executes Markdown flow or re-judges trace verdicts.

import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { readAndValidateManifest } from './lib/agent-experiment-contract.mjs';
import {
  buildHeadlessAgentCliPlan,
  buildInteractiveAgentCliPlan,
  loadAgentCliBase,
} from './lib/agent-cli-launcher.mjs';
import {
  appendAuditEvent,
  assertCaseRunRootIdentity,
  assertExpBundlesSourceIsolation,
  atomicWriteJson,
  buildInjectedPrompt,
  cleanupCaseRoot,
  exportCleanupEvidence,
  isRealHumanCase,
  prepareCaseRun,
  preflightRuntimeBindings,
  runHeadlessAgent,
  runHealthChecks,
  runInteractiveAgent,
  selectManifestEntries,
  validateNativeCompletion,
} from './lib/agent-experiment-supervisor.mjs';
import { randomUUID } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = realpathSync(resolve(HERE, '..', '..'));
const PROOF_BOUNDARY = Object.freeze({
  deterministic_fixture_proves: 'autorun_supervisor_mechanics_only',
  agent_flow_proof_requires: ['real_agent_cli', 'model_credentials', 'required_tools', 'native_runtime_evidence'],
});

function usage(message = null) {
  if (message) console.error(message);
  console.error('Usage: run-agent-experiment.mjs [--case <exact>|--group <group> [--tier <cost>]|--tier <cost>|--all] [--dry-run] [--json]');
  console.error('       Headless: --max-total-budget-usd <positive> [--max-case-budget-usd <positive>] [--cleanup-pass] [--timeout <ms>]');
  console.error('       Interactive: --interactive --case <exact> [--timeout <ms>]');
  process.exit(2);
}

function positiveNumber(value, label, { integer = false } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || (integer && !Number.isInteger(number))) usage(`${label} must be a positive ${integer ? 'integer' : 'number'}`);
  return number;
}

export function parseSupervisorCli(argv) {
  let values;
  try {
    ({ values } = parseArgs({
      args: argv,
      strict: true,
      allowPositionals: false,
      options: {
        case: { type: 'string' },
        group: { type: 'string' },
        tier: { type: 'string' },
        all: { type: 'boolean', default: false },
        interactive: { type: 'boolean', default: false },
        'cleanup-pass': { type: 'boolean', default: false },
        timeout: { type: 'string', default: '600000' },
        'health-timeout': { type: 'string', default: '60000' },
        'max-total-budget-usd': { type: 'string' },
        'max-case-budget-usd': { type: 'string' },
        json: { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
      },
    }));
  } catch (error) { usage(error.message); }
  if (values.tier && !['light', 'standard', 'heavy'].includes(values.tier)) usage('--tier must be light, standard, or heavy');
  const timeoutMs = positiveNumber(values.timeout, '--timeout', { integer: true });
  const healthTimeoutMs = positiveNumber(values['health-timeout'], '--health-timeout', { integer: true });
  const interactive = values.interactive;
  if (interactive && (values.group || values.tier || values.all || values['cleanup-pass'] || values['max-total-budget-usd'] || values['max-case-budget-usd'])) {
    usage('--interactive accepts only one exact --case plus timeout/json options');
  }
  let maxTotalBudgetUsd = null;
  let maxCaseBudgetUsd = null;
  if (values['max-total-budget-usd'] !== undefined) maxTotalBudgetUsd = positiveNumber(values['max-total-budget-usd'], '--max-total-budget-usd');
  if (values['max-case-budget-usd'] !== undefined) maxCaseBudgetUsd = positiveNumber(values['max-case-budget-usd'], '--max-case-budget-usd');
  if (maxCaseBudgetUsd !== null && maxTotalBudgetUsd === null) usage('--max-case-budget-usd requires --max-total-budget-usd');
  if (maxCaseBudgetUsd !== null && maxTotalBudgetUsd !== null && maxCaseBudgetUsd > maxTotalBudgetUsd) usage('--max-case-budget-usd cannot exceed --max-total-budget-usd');
  if (!interactive && !values['dry-run'] && maxTotalBudgetUsd === null) usage('Headless execution requires --max-total-budget-usd');
  return {
    caseId: values.case ?? null,
    group: values.group ?? null,
    tier: values.tier ?? null,
    all: values.all,
    interactive,
    cleanupPass: values['cleanup-pass'],
    timeoutMs,
    healthTimeoutMs,
    maxTotalBudgetUsd,
    maxCaseBudgetUsd,
    json: values.json,
    dryRun: values['dry-run'],
  };
}

function selectionProjection(selected, opts) {
  const exposure = opts.maxTotalBudgetUsd === null ? null : Math.min(
    opts.maxTotalBudgetUsd,
    selected.length * (opts.maxCaseBudgetUsd ?? opts.maxTotalBudgetUsd),
  );
  return selected.map((entry, index) => ({
    ordinal: index + 1,
    case: entry.frontmatter.case,
    experiment: entry.frontmatter.experiment,
    cost: entry.cost,
    health_profile: entry.frontmatter.health_profile,
    proof_subject: entry.frontmatter.proof_subject,
    verdict_judge: entry.frontmatter.verdict_judge,
    path: entry.path,
    manual_human: isRealHumanCase(entry.frontmatter.case),
    maximum_budget_exposure_usd: exposure === null ? null : Math.min(opts.maxCaseBudgetUsd ?? exposure, exposure),
  }));
}

function reasonForProcess(processResult) {
  if (processResult.externalSignal) return `external_${String(processResult.externalSignal).toLowerCase()}`;
  if (processResult.processOutcome === 'approval_required') return 'approval_required';
  if (processResult.processOutcome === 'timeout') return 'agent_timeout';
  if (processResult.processOutcome === 'signal') return `agent_signal_${processResult.signal || 'unknown'}`;
  if (processResult.processOutcome === 'nonzero') return `agent_nonzero_${processResult.code ?? 'unknown'}`;
  if (processResult.parseError) return 'malformed_agent_stream';
  if (processResult.budgetExhausted) return 'case_budget_exhausted';
  return null;
}

function summary(results) {
  const counts = { PASS: 0, FAIL: 0, NOT_RUN: 0, HUMAN: 0, ERROR: 0, CANCELLED: 0 };
  for (const result of results) counts[result.effective_outcome] = (counts[result.effective_outcome] ?? 0) + 1;
  return { total: results.length, ...counts };
}

function exitCodeFor(results, signalExit) {
  if (signalExit) return signalExit;
  if (results.some((result) => ['NOT_RUN', 'HUMAN', 'ERROR'].includes(result.effective_outcome))) return 2;
  if (results.some((result) => result.effective_outcome === 'FAIL' || (result.effective_outcome === 'PASS' && result.health === 'ISSUES'))) return 1;
  return 0;
}

function printReport(report) {
  console.log(`Agent Experiment Autorun ${report.batch_id}`);
  console.log(`selected=${report.summary.total} PASS=${report.summary.PASS} FAIL=${report.summary.FAIL} NOT_RUN=${report.summary.NOT_RUN} HUMAN=${report.summary.HUMAN} ERROR=${report.summary.ERROR} CANCELLED=${report.summary.CANCELLED}`);
  for (const result of report.results) {
    console.log(`${result.effective_outcome.padEnd(9)} ${result.case} process=${result.agent_process} native=${result.native_outcome ?? '-'} health=${result.health ?? '-'} cost=${result.cost_usd ?? 'unknown'} preserved=${result.run_root_available}`);
    if (result.reason) console.log(`  reason: ${result.reason}`);
  }
  console.log(`report: ${report.report_path}`);
}

function terminalEventBase({ batchId, ordinal, entry, prepared, opts, startedAt, durationMs }) {
  return {
    schema_version: 'agent-experiment-audit-event/v1',
    event: 'case_result',
    ts: new Date().toISOString(),
    batch_id: batchId,
    ordinal,
    case: entry.frontmatter.case,
    experiment: entry.frontmatter.experiment,
    playbook_path: entry.path,
    cost_class: entry.cost,
    execution_mode: opts.interactive ? 'interactive_agent' : 'headless_agent',
    started_at: startedAt,
    duration_ms: durationMs,
    run_context: prepared ? {
      path: prepared.contextPath,
      sha256: prepared.contextSha256,
      run_id: prepared.context.run_id,
      root_identity: prepared.rootIdentity,
      source_playbook_sha256: prepared.context.source_playbook_sha256,
      rendered_playbook_sha256: prepared.context.rendered_playbook_sha256,
      instruction_sha256: prepared.context.instruction_sha256,
      manifest_sha256: prepared.context.manifest_sha256,
    } : null,
  };
}

export async function runSupervisor(opts, { executable = 'claude', repoRoot = REPO_ROOT } = {}) {
  const projectRoot = realpathSync(repoRoot);
  const expBundles = join(projectRoot, '.exp-bundles');
  const manifestPath = join(projectRoot, 'experiments_playbook/PLAYBOOK_MANIFEST.md');
  const headlessInstruction = join(projectRoot, 'experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md');
  const interactiveInstruction = join(projectRoot, 'experiments_playbook/RUN_INTERACTIVE_EXPS.md');
  const healthCli = join(projectRoot, 'experiments_env/shared/verify-bundle-health.mjs');
  const manifest = readAndValidateManifest({ repoRoot: projectRoot, manifestPath, requireExactCorpus: true });
  const selected = selectManifestEntries(manifest.entries, opts);
  for (const entry of selected) preflightRuntimeBindings(readFileSync(entry.fullPath, 'utf8'));
  if (opts.dryRun) {
    return { dry_run: true, proof_boundary: PROOF_BOUNDARY, selected_count: selected.length, selected: selectionProjection(selected, opts) };
  }

  if (!existsSync(opts.interactive ? interactiveInstruction : headlessInstruction)) throw new Error('Agent instruction surface is missing');
  loadAgentCliBase({ repoRoot: projectRoot, executable });
  assertExpBundlesSourceIsolation(projectRoot, expBundles);

  const batchId = randomUUID();
  const results = [];
  let accumulatedCostUsd = 0;
  let stopLaunchReason = null;
  let cleanupInfrastructureFailed = false;
  let signalExit = null;
  const abortController = new AbortController();
  const onSigint = () => { signalExit = 130; abortController.abort('SIGINT'); };
  const onSigterm = () => { signalExit = 143; abortController.abort('SIGTERM'); };
  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);

  try {
    for (let index = 0; index < selected.length; index += 1) {
      const entry = selected[index];
      const ordinal = index + 1;
      const startedAt = new Date().toISOString();
      const startMs = Date.now();
      if (signalExit || stopLaunchReason) {
        const lifecycle = signalExit ? 'CANCELLED' : 'ERROR';
        const reason = signalExit ? `external_${signalExit === 130 ? 'sigint' : 'sigterm'}` : stopLaunchReason;
        const result = {
          case: entry.frontmatter.case, experiment: entry.frontmatter.experiment, playbook_path: entry.path,
          native_outcome: null, lifecycle_outcome: lifecycle, effective_outcome: lifecycle,
          agent_process: 'not_started', health: null, health_reports: [], reason, duration_ms: 0,
          cost_usd: null, accumulated_cost_usd: accumulatedCostUsd, run_root: null, run_root_available: false,
          cleanup_requested: opts.cleanupPass, cleanup_eligible: false, cleanup_status: 'not_attempted',
          completion: null, logs: { prompt: null, stdout: null, stderr: null }, evidence: null,
        };
        results.push(result);
        try { appendAuditEvent(expBundles, { ...terminalEventBase({ batchId, ordinal, entry, prepared: null, opts, startedAt, durationMs: 0 }), ...result }); } catch {}
        continue;
      }

      if (!opts.interactive && isRealHumanCase(entry.frontmatter.case)) {
        const result = {
          case: entry.frontmatter.case, experiment: entry.frontmatter.experiment, playbook_path: entry.path,
          native_outcome: null, lifecycle_outcome: 'HUMAN', effective_outcome: 'HUMAN', agent_process: 'not_started',
          health: null, health_reports: [], reason: 'real_human_judgment_requires_interactive', duration_ms: 0,
          cost_usd: 0, accumulated_cost_usd: accumulatedCostUsd, run_root: null, run_root_available: false,
          cleanup_requested: opts.cleanupPass, cleanup_eligible: false, cleanup_status: 'not_attempted', completion: null,
          logs: { prompt: null, stdout: null, stderr: null }, evidence: null,
        };
        results.push(result);
        appendAuditEvent(expBundles, { ...terminalEventBase({ batchId, ordinal, entry, prepared: null, opts, startedAt, durationMs: 0 }), ...result });
        continue;
      }

      let prepared = null;
      let processResult = { processOutcome: 'not_started', logs: { prompt: null, stdout: null, stderr: null }, totalCostUsd: null };
      let completion = null;
      let lifecycleOutcome = null;
      let reason = null;
      let health = { aggregate: null, reports: [] };
      let evidence = null;
      let cleanupStatus = 'not_attempted';
      let caseAudit = null;
      let currentCap = null;
      try {
        prepared = prepareCaseRun({
          repoRoot: projectRoot, expBundlesRoot: expBundles, batchId, ordinal, entry,
          mode: opts.interactive ? 'interactive_agent' : 'headless_agent', manifestPath,
          instructionPath: opts.interactive ? interactiveInstruction : headlessInstruction,
        });
        const prompt = buildInjectedPrompt(prepared);
        if (opts.interactive) {
          const plan = buildInteractiveAgentCliPlan({ repoRoot: projectRoot, prompt, executable });
          processResult = await runInteractiveAgent({ plan, cwd: projectRoot, timeoutMs: opts.timeoutMs, abortSignal: abortController.signal });
        } else {
          const remaining = opts.maxTotalBudgetUsd - accumulatedCostUsd;
          if (!(remaining > 0)) throw new Error('batch_budget_exhausted');
          currentCap = Math.min(opts.maxCaseBudgetUsd ?? remaining, remaining);
          const plan = buildHeadlessAgentCliPlan({ repoRoot: projectRoot, maxBudgetUsd: currentCap, executable });
          const logBase = join(expBundles, '_logs', batchId, `${String(ordinal).padStart(3, '0')}-${entry.frontmatter.case}`);
          processResult = await runHeadlessAgent({
            plan, prompt, cwd: projectRoot, timeoutMs: opts.timeoutMs, abortSignal: abortController.signal,
            logPaths: { prompt: `${logBase}.prompt.md`, stdout: `${logBase}.agent.jsonl`, stderr: `${logBase}.stderr.log` },
          });
          if (typeof processResult.totalCostUsd === 'number') accumulatedCostUsd += processResult.totalCostUsd;
          if (processResult.budgetExhausted || (processResult.totalCostUsd !== null && processResult.totalCostUsd > currentCap + 1e-9)) stopLaunchReason = 'case_budget_exhausted';
          else if (processResult.totalCostUsd === null) stopLaunchReason = 'cost_unknown';
          else if (accumulatedCostUsd >= opts.maxTotalBudgetUsd - 1e-9 && index + 1 < selected.length) stopLaunchReason = 'batch_budget_exhausted';
        }

        const processReason = reasonForProcess(processResult);
        if (processResult.externalSignal) { lifecycleOutcome = 'CANCELLED'; reason = processReason; }
        else if (processReason) { lifecycleOutcome = 'ERROR'; reason = processReason; }
        try { completion = validateNativeCompletion(prepared); }
        catch (error) {
          if (!lifecycleOutcome) { lifecycleOutcome = 'ERROR'; reason = `native_completion_invalid: ${error.message}`; }
        }
        if (!opts.interactive && (processResult.budgetExhausted
          || (currentCap !== null && processResult.totalCostUsd !== null && processResult.totalCostUsd > currentCap + 1e-9))) {
          lifecycleOutcome = 'ERROR';
          reason = 'case_budget_exhausted';
        } else if (!opts.interactive && processResult.totalCostUsd === null && !lifecycleOutcome) {
          lifecycleOutcome = 'ERROR';
          reason = 'cost_unknown';
        }
        if (!lifecycleOutcome && completion) {
          assertCaseRunRootIdentity(prepared, 'health');
          health = await runHealthChecks({ completion, healthCli, cwd: projectRoot, timeoutMs: opts.healthTimeoutMs });
          if (health.aggregate === 'ERROR') { lifecycleOutcome = 'ERROR'; reason = health.error; }
        }
      } catch (error) {
        lifecycleOutcome = signalExit ? 'CANCELLED' : 'ERROR';
        reason = error.message;
        if (error.message === 'batch_budget_exhausted') stopLaunchReason = error.message;
      }

      let nativeOutcome = completion?.outcome ?? null;
      let effectiveOutcome = lifecycleOutcome ?? nativeOutcome ?? 'ERROR';
      if (!lifecycleOutcome && nativeOutcome === null) { lifecycleOutcome = 'ERROR'; effectiveOutcome = 'ERROR'; reason ??= 'native_completion_missing'; }
      let cleanupEligible = Boolean(!opts.interactive && opts.cleanupPass && !cleanupInfrastructureFailed
        && effectiveOutcome === 'PASS' && health.aggregate === 'CLEAN' && prepared && completion);
      if (cleanupEligible) {
        try {
          completion = validateNativeCompletion(prepared);
          const base = loadAgentCliBase({ repoRoot: projectRoot, executable });
          evidence = exportCleanupEvidence({ prepared, completion, expBundlesRoot: expBundles, secrets: base.secretValues });
        } catch (error) {
          lifecycleOutcome = 'ERROR'; effectiveOutcome = 'ERROR'; reason = `evidence_export_failed: ${error.message}`; cleanupEligible = false;
          cleanupInfrastructureFailed = true;
        }
      }

      const durationMs = Date.now() - startMs;
      let result = {
        case: entry.frontmatter.case, experiment: entry.frontmatter.experiment, playbook_path: entry.path,
        native_outcome: nativeOutcome, lifecycle_outcome: lifecycleOutcome, effective_outcome: effectiveOutcome,
        agent_process: processResult.processOutcome, health: health.aggregate, health_reports: health.reports,
        reason, duration_ms: durationMs, cost_usd: processResult.totalCostUsd,
        accumulated_cost_usd: accumulatedCostUsd, run_root: prepared?.caseRunRoot ?? null,
        run_root_available: Boolean(prepared && existsSync(prepared.caseRunRoot)), cleanup_requested: opts.cleanupPass,
        cleanup_eligible: cleanupEligible, cleanup_status: cleanupStatus, completion,
        logs: processResult.logs, evidence,
      };
      try {
        caseAudit = appendAuditEvent(expBundles, { ...terminalEventBase({ batchId, ordinal, entry, prepared, opts, startedAt, durationMs }), ...result });
      } catch (error) {
        lifecycleOutcome = 'ERROR'; effectiveOutcome = 'ERROR'; reason = `audit_failed: ${error.message}`;
        cleanupEligible = false; cleanupInfrastructureFailed = true;
        result = { ...result, lifecycle_outcome: lifecycleOutcome, effective_outcome: effectiveOutcome, reason, cleanup_eligible: false };
      }

      if (cleanupEligible && caseAudit) {
        try {
          assertExpBundlesSourceIsolation(projectRoot, expBundles);
          cleanupCaseRoot(prepared);
          cleanupStatus = 'removed';
          appendAuditEvent(expBundles, {
            schema_version: 'agent-experiment-audit-event/v1', event: 'cleanup_result', ts: new Date().toISOString(),
            batch_id: batchId, ordinal, case: entry.frontmatter.case, case_result_sha256: caseAudit.record_sha256,
            cleanup_status: cleanupStatus, removed_path: prepared.caseRunRoot, lifecycle_outcome_override: null,
          });
        } catch (error) {
          cleanupStatus = 'failed'; cleanupInfrastructureFailed = true;
          lifecycleOutcome = 'ERROR'; effectiveOutcome = 'ERROR'; reason = `cleanup_failed: ${error.message}`;
          try {
            appendAuditEvent(expBundles, {
              schema_version: 'agent-experiment-audit-event/v1', event: 'cleanup_result', ts: new Date().toISOString(),
              batch_id: batchId, ordinal, case: entry.frontmatter.case, case_result_sha256: caseAudit.record_sha256,
              cleanup_status: cleanupStatus, removed_path: prepared.caseRunRoot, lifecycle_outcome_override: 'ERROR', reason,
            });
          } catch {}
        }
      }
      result = {
        ...result, lifecycle_outcome: lifecycleOutcome, effective_outcome: effectiveOutcome, reason,
        cleanup_status: cleanupStatus, run_root_available: Boolean(prepared && existsSync(prepared.caseRunRoot)),
      };
      results.push(result);
    }
  } finally {
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigterm);
  }

  const reportPath = join(expBundles, '_reports', `${batchId}.json`);
  const report = {
    schema_version: 'agent-experiment-batch-report/v1',
    batch_id: batchId,
    generated_at: new Date().toISOString(),
    runner: 'run-agent-experiment.mjs',
    execution_mode: opts.interactive ? 'interactive_agent' : 'headless_agent',
    proof_boundary: PROOF_BOUNDARY,
    cleanup_requested: opts.cleanupPass,
    max_total_budget_usd: opts.maxTotalBudgetUsd,
    max_case_budget_usd: opts.maxCaseBudgetUsd,
    accumulated_cost_usd: accumulatedCostUsd,
    summary: summary(results),
    results,
    report_path: reportPath,
  };
  atomicWriteJson(reportPath, report);
  return { ...report, exit_code: exitCodeFor(results, signalExit) };
}

async function main() {
  const opts = parseSupervisorCli(process.argv.slice(2));
  try {
    const result = await runSupervisor(opts);
    if (opts.json || result.dry_run) console.log(JSON.stringify(result, null, 2));
    else printReport(result);
    process.exitCode = result.exit_code ?? 0;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
