// @impl ERS-001, ERS-002, ERS-003, EXA-003, EXA-004, EXA-005, EXA-006, EXA-007, EXA-008, EXA-009, EXO-007, LDC-002, LDC-005, LDC-008
// Deterministic Supervisor mechanics only; this fixture is not real Playbook-Agent evidence.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { formatPlaybookManifest, sha256Bytes } from '../../../DPT_FRAMEWORK/host_tools/lib/agent-experiment-contract.mjs';
import { runSupervisor } from '../../../DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs';

const REAL_REPO = path.resolve(new URL('../../..', import.meta.url).pathname);
const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('run-agent-experiment deterministic host lifecycle', () => {
  it('keeps dry-run credential-free and mutation-free', async () => {
    const fixture = makeProject({ writeEnv: false });
    const result = await runSupervisor(baseOptions({ dryRun: true, maxTotalBudgetUsd: null }), { repoRoot: fixture.root, executable: fixture.executable });
    assert.equal(result.dry_run, true);
    assert.equal(result.selected_count, 1);
    assert.equal(result.selected[0].case, 'case-1-light-fixture');
    assert.equal(existsSync(path.join(fixture.root, '.exp-bundles')), false);
  });

  it('rejects missing total budget and a per-case cap without total before launch', () => {
    const cli = path.join(REAL_REPO, 'DPT_FRAMEWORK/host_tools/run-agent-experiment.mjs');
    for (const args of [
      ['--case', 'case-41-light-minimal-path', '--json'],
      ['--dry-run', '--max-case-budget-usd', '0.1', '--json'],
      ['--dry-run', '--json'],
      ['--run-profile', 'calibration', '--dry-run', '--json'],
    ]) {
      const result = spawnSync(process.execPath, [cli, ...args], { cwd: REAL_REPO, encoding: 'utf8' });
      assert.equal(result.status, 2, args.join(' '));
      assert.match(result.stderr, /max-total-budget-usd|Headless execution requires|max-predicted-duration-ms/);
    }
  });

  it('keeps profile dry-run credential-free and mutation-free', async () => {
    const fixture = makeProject({ writeEnv: false });
    const result = await runSupervisor(baseOptions({
      caseId: null,
      runProfile: 'calibration',
      maxPredictedDurationMs: 120000,
      maxTotalBudgetUsd: null,
      dryRun: true,
    }), { repoRoot: fixture.root, executable: fixture.executable });
    assert.equal(result.dry_run, true);
    assert.equal(result.selection.mode, 'profile');
    assert.equal(result.selection.profile, 'calibration');
    assert.equal(result.selected_count, 1);
    assert.equal(result.selected[0].selection_observation.prediction_basis, 'filename_initial_estimate');
    assert.equal(existsSync(path.join(fixture.root, '.exp-bundles')), false);
  });

  it('rejects an unsafe helper inventory before a profile dry-run can create state', async () => {
    const fixture = makeProject({ writeEnv: false });
    const helper = path.join(fixture.root, 'experiments_env/shared/verify-bundle-health.mjs');
    rmSync(helper);
    symlinkSync(path.join(fixture.root, 'experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md'), helper);
    await assert.rejects(() => runSupervisor(baseOptions({
      caseId: null,
      runProfile: 'calibration',
      maxPredictedDurationMs: 120000,
      maxTotalBudgetUsd: null,
      dryRun: true,
    }), { repoRoot: fixture.root, executable: fixture.executable }), /helper path is a symlink/);
    assert.equal(existsSync(path.join(fixture.root, '.exp-bundles')), false);
  });

  it('rejects an empty profile launch before loading credentials or creating a run root', async () => {
    const fixture = makeProject({ writeEnv: false });
    await assert.rejects(() => runSupervisor(baseOptions({
      caseId: null,
      runProfile: 'diagnostic',
      maxPredictedDurationMs: 120000,
      maxTotalBudgetUsd: 1,
    }), { repoRoot: fixture.root, executable: fixture.executable }), /selected no runnable cases/);
    assert.equal(existsSync(path.join(fixture.root, '.exp-bundles')), false);
  });

  it('rejects widened or timeout-implicit regression requests before creating runtime state', async () => {
    for (const overrides of [
      { maxPredictedDurationMs: 480_001, maxTotalBudgetUsd: 3, maxCaseBudgetUsd: 0.60, timeoutMs: 120_000, timeoutExplicit: true, healthTimeoutMs: 60_000, dryRun: true },
      { maxPredictedDurationMs: 480_000, maxTotalBudgetUsd: 4, maxCaseBudgetUsd: 0.60, timeoutMs: 120_000, timeoutExplicit: true, healthTimeoutMs: 60_000, dryRun: true },
      { maxPredictedDurationMs: 480_000, maxTotalBudgetUsd: 3, maxCaseBudgetUsd: 0.61, timeoutMs: 120_000, timeoutExplicit: true, healthTimeoutMs: 60_000, dryRun: true },
      { maxPredictedDurationMs: 480_000, maxTotalBudgetUsd: 3, maxCaseBudgetUsd: 0.60, timeoutMs: 120_001, timeoutExplicit: true, healthTimeoutMs: 60_000, dryRun: true },
      { maxPredictedDurationMs: 480_000, maxTotalBudgetUsd: 3, maxCaseBudgetUsd: 0.60, timeoutMs: 120_000, timeoutExplicit: true, healthTimeoutMs: 60_001, dryRun: true },
      { maxPredictedDurationMs: 480_000, maxTotalBudgetUsd: 3, maxCaseBudgetUsd: 0.60, timeoutExplicit: false, healthTimeoutMs: 60_000, dryRun: false },
    ]) {
      const fixture = makeProject({ writeEnv: false });
      await assert.rejects(() => runSupervisor(baseOptions({
        caseId: null,
        runProfile: 'regression',
        ...overrides,
      }), { repoRoot: fixture.root, executable: fixture.executable }), /regression|explicit timeout/i);
      assert.equal(existsSync(path.join(fixture.root, '.exp-bundles')), false);
    }
  });

  it('keeps normal regression and explicit qualification distinct under the effective fast cap', async () => {
    const normalFixture = makeProject();
    await runSupervisor(baseOptions(), { repoRoot: normalFixture.root, executable: normalFixture.executable });
    const normal = await runSupervisor(baseOptions({
      caseId: null,
      runProfile: 'regression',
      maxPredictedDurationMs: 480_000,
      maxTotalBudgetUsd: 1,
      maxCaseBudgetUsd: null,
      timeoutMs: 120_000,
      timeoutExplicit: true,
      healthTimeoutMs: 60_000,
    }), { repoRoot: normalFixture.root, executable: normalFixture.executable });
    assert.equal(normal.results.length, 1);
    assert.equal(normal.max_case_budget_usd, 0.60);
    assert.equal(normal.results[0].selection_observation.schema_version, 'agent-experiment-selection-observation/v2');
    assert.equal(normal.results[0].selection_observation.regression_intent, 'normal');
    assert.equal(normal.results[0].selection_observation.profile, 'regression');
    const normalCapture = JSON.parse(readFileSync(path.join(normal.results[0].run_root, '_diagnostics/fixture-invocation.json'), 'utf8'));
    assert.equal(normalCapture.argv[normalCapture.argv.indexOf('--max-budget-usd') + 1], '0.6');
    const normalContext = JSON.parse(readFileSync(path.join(normal.results[0].run_root, 'agent-experiment-run.json'), 'utf8'));
    assert.equal(Object.hasOwn(normalContext.policy, 'regression_recommendation'), false);
    assert.equal(Object.hasOwn(normalContext.policy, 'regression_retry_safety'), false);

    const qualificationFixture = makeProject();
    writeHistoricalV1Report(qualificationFixture);
    const normalDryRun = await runSupervisor(baseOptions({
      caseId: null,
      runProfile: 'regression',
      maxPredictedDurationMs: 480_000,
      maxTotalBudgetUsd: null,
      maxCaseBudgetUsd: null,
      timeoutExplicit: false,
      dryRun: true,
    }), { repoRoot: qualificationFixture.root, executable: qualificationFixture.executable });
    assert.equal(normalDryRun.selected_count, 0);
    assert.equal(normalDryRun.selection.regression.admissions[0].status, 'needs_qualification');
    assert.equal(existsSync(path.join(qualificationFixture.root, '.exp-bundles/runs')), false);

    const qualification = await runSupervisor(baseOptions({
      caseId: null,
      runProfile: 'regression',
      regressionQualification: true,
      maxPredictedDurationMs: 480_000,
      maxTotalBudgetUsd: 3,
      maxCaseBudgetUsd: null,
      timeoutMs: 120_000,
      timeoutExplicit: true,
      healthTimeoutMs: 60_000,
    }), { repoRoot: qualificationFixture.root, executable: qualificationFixture.executable });
    assert.equal(qualification.results[0].selection_observation.regression_intent, 'qualification');
    assert.equal(qualification.results[0].selection_observation.prediction_basis, 'observed_source_matching_history');
    assert.equal(qualification.results[0].native_outcome, 'PASS');
    assert.equal(qualification.results[0].health, 'CLEAN');
  });

  it('preserves legacy filename-tier selection as an explicit compatibility filter', async () => {
    const fixture = makeProject();
    configureFixturePlaybook(fixture, { caseId: 'case-2-standard-fixture' });
    const report = await runSupervisor(baseOptions({ caseId: null, tier: 'standard' }), { repoRoot: fixture.root, executable: fixture.executable });
    assert.equal(report.results.length, 1);
    assert.equal(report.results[0].case, 'case-2-standard-fixture');
    assert.equal(report.results[0].selection_observation.mode, 'exact');
    assert.equal(report.results[0].selection_observation.prediction_basis, 'explicit_selector');
  });

  it('hands a bounded profile to the existing lifecycle and keeps v2 report facts orthogonal', async () => {
    const fixture = makeProject({ healthStatus: 'issues' });
    const report = await runSupervisor(baseOptions({
      caseId: null,
      runProfile: 'calibration',
      maxPredictedDurationMs: 120000,
    }), { repoRoot: fixture.root, executable: fixture.executable });
    const result = report.results[0];
    assert.equal(report.schema_version, 'agent-experiment-batch-report/v2');
    assert.equal(result.native_outcome, 'PASS');
    assert.equal(result.effective_outcome, 'PASS');
    assert.equal(result.health, 'ISSUES');
    assert.equal(result.selection_observation.mode, 'profile');
    assert.equal(result.selection_observation.profile, 'calibration');
    assert.equal(result.selection_observation.schema_version, 'agent-experiment-selection-observation/v2');
    assert.equal(result.selection_observation.regression_intent, null);
    assert.match(result.execution_surface.fingerprint, /^[a-f0-9]{64}$/);
    const retained = JSON.parse(readFileSync(report.report_path, 'utf8'));
    assert.equal(retained.schema_version, 'agent-experiment-batch-report/v2');
    const auditRows = readFileSync(path.join(fixture.root, '.exp-bundles/_audit/agent-experiment-runs.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(auditRows[0].schema_version, 'agent-experiment-audit-event/v2');
    assert.equal(auditRows[0].execution_surface.fingerprint, result.execution_surface.fingerprint);
    assert.equal(auditRows[0].selection_observation.profile, 'calibration');
  });

  it('uses exact repo cwd, rendered stdin, effective Headless flags, isolated env and native completion', async () => {
    const fixture = makeProject();
    const report = await runSupervisor(baseOptions(), { repoRoot: fixture.root, executable: fixture.executable });
    assert.equal(report.exit_code, 0);
    assert.equal(report.summary.PASS, 1);
    const result = report.results[0];
    assert.equal(result.native_outcome, 'PASS');
    assert.equal(result.lifecycle_outcome, null);
    assert.equal(result.agent_process, 'completed');
    assert.equal(result.health, 'CLEAN');
    assert.equal(result.cost_usd, 0.25);
    assert.equal(result.run_root_available, true);
    const capture = JSON.parse(readFileSync(path.join(result.run_root, '_diagnostics/fixture-invocation.json'), 'utf8'));
    assert.equal(capture.cwd, realpathSync(fixture.root));
    assert.equal(capture.prompt_has_full_playbook, true);
    assert.equal(capture.provider_env_isolated, true);
    assert.deepEqual(capture.argv.slice(0, 2), ['--setting-sources', 'project,local']);
    assert.ok(capture.argv.includes('-p'));
    assert.ok(capture.argv.includes('stream-json'));
    assert.ok(capture.argv.includes('bypassPermissions'));
    assert.ok(capture.argv.includes('--no-session-persistence'));
    assert.equal(capture.argv[capture.argv.indexOf('--max-budget-usd') + 1], '1');
    assert.equal(existsSync(path.join(result.run_root, 'DPT_FRAMEWORK')), false);
    assert.equal(existsSync(path.join(result.run_root, 'experiments_env')), false);
    const stderr = readFileSync(result.logs.stderr.path, 'utf8');
    assert.doesNotMatch(stderr, /fixture-secret/);
    assert.match(stderr, /\[REDACTED\]/);
    assert.ok(existsSync(path.join(result.run_root, 'agent-experiment-completion.json')));
    assert.ok(existsSync(report.report_path));
  });

  it('exports exact evidence and appends a hash-linked cleanup result before reporting removal', async () => {
    const fixture = makeProject();
    const report = await runSupervisor(baseOptions({ cleanupPass: true }), { repoRoot: fixture.root, executable: fixture.executable });
    const result = report.results[0];
    assert.equal(result.effective_outcome, 'PASS');
    assert.equal(result.cleanup_status, 'removed');
    assert.equal(result.run_root_available, false);
    assert.equal(existsSync(result.run_root), false);
    assert.equal(result.evidence.traces.length, 1);
    assert.ok(existsSync(result.evidence.traces[0].path));
    assert.ok(existsSync(result.logs.prompt.path));
    assert.ok(existsSync(result.logs.stdout.path));
    const auditRows = readFileSync(path.join(fixture.root, '.exp-bundles/_audit/agent-experiment-runs.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(auditRows.map((row) => row.event), ['case_result', 'cleanup_result']);
    assert.match(auditRows[1].case_result_sha256, /^[a-f0-9]{64}$/);
    assert.equal(auditRows[1].cleanup_status, 'removed');
  });

  it('preserves native PASS plus health ISSUES even when cleanup was requested', async () => {
    const fixture = makeProject({ healthStatus: 'issues' });
    const report = await runSupervisor(baseOptions({ cleanupPass: true }), { repoRoot: fixture.root, executable: fixture.executable });
    const result = report.results[0];
    assert.equal(report.exit_code, 1);
    assert.equal(result.native_outcome, 'PASS');
    assert.equal(result.effective_outcome, 'PASS');
    assert.equal(result.health, 'ISSUES');
    assert.equal(result.cleanup_status, 'not_attempted');
    assert.equal(result.run_root_available, true);
    assert.ok(existsSync(result.run_root));
  });

  it('preserves native FAIL, NOT_RUN, and health ERROR roots without cleanup', async () => {
    for (const { mode, healthStatus, native, effective, health, exitCode } of [
      { mode: 'native-fail', healthStatus: 'clean', native: 'FAIL', effective: 'FAIL', health: 'CLEAN', exitCode: 1 },
      { mode: 'not-run', healthStatus: 'clean', native: 'NOT_RUN', effective: 'NOT_RUN', health: 'CLEAN', exitCode: 2 },
      { mode: 'success', healthStatus: 'invalid', native: 'PASS', effective: 'ERROR', health: 'ERROR', exitCode: 2 },
    ]) {
      const fixture = makeProject({ fixtureMode: mode, healthStatus });
      const report = await runSupervisor(baseOptions({ cleanupPass: true }), { repoRoot: fixture.root, executable: fixture.executable });
      const result = report.results[0];
      assert.equal(report.exit_code, exitCode, mode);
      assert.equal(result.native_outcome, native, mode);
      assert.equal(result.effective_outcome, effective, mode);
      assert.equal(result.health, health, mode);
      assert.equal(result.cleanup_status, 'not_attempted', mode);
      assert.equal(result.run_root_available, true, mode);
    }
  });

  it('exports all declared multi-bundle trace prefixes before CLEAN PASS cleanup', async () => {
    const fixture = makeProject({ fixtureMode: 'multi-traces' });
    configureFixturePlaybook(fixture, {
      caseId: 'case-153-standard-multi-traces',
      replacements: [
        ['bundle_roles: [verdict]', 'bundle_roles: [verdict, required-aux, invalid-aux, missing-aux]'],
        ['health_roles: [verdict]', 'health_roles: [verdict, required-aux]'],
      ],
    });
    const report = await runSupervisor(baseOptions({ caseId: 'case-153-standard-multi-traces', cleanupPass: true }), { repoRoot: fixture.root, executable: fixture.executable });
    const result = report.results[0];
    assert.equal(result.effective_outcome, 'PASS');
    assert.equal(result.health, 'CLEAN');
    assert.equal(result.cleanup_status, 'removed');
    assert.equal(result.run_root_available, false);
    assert.deepEqual(result.evidence.traces.map((entry) => entry.role), ['verdict', 'required-aux', 'invalid-aux', 'missing-aux']);
    const invalid = result.evidence.traces.find((entry) => entry.role === 'invalid-aux');
    const missing = result.evidence.traces.find((entry) => entry.role === 'missing-aux');
    assert.equal(readFileSync(invalid.path, 'utf8'), '{not-json}\n');
    assert.equal(invalid.parse_status, 'invalid');
    assert.equal(missing.path, null);
    assert.equal(missing.parse_status, 'missing');
  });

  it('exports exact Agent-behavior Subject evidence before deleting a Heavy-cost Light-health root', async () => {
    const fixture = makeProject({ fixtureMode: 'agent-evidence' });
    configureFixturePlaybook(fixture, {
      caseId: 'case-406-heavy-agent-evidence',
      replacements: [
        ['durable_evidence_roles: []', 'durable_evidence_roles: [subject_task, subject_result, subject_receipt, subject_output]'],
        ['proof_subject: deterministic_contract', 'proof_subject: agent_behavior'],
        ['subject_execution: none', 'subject_execution: real_subagent'],
        ['fixture: fixture_backed', 'fixture: setup_only'],
      ],
    });
    const report = await runSupervisor(baseOptions({ caseId: 'case-406-heavy-agent-evidence', cleanupPass: true }), { repoRoot: fixture.root, executable: fixture.executable });
    const result = report.results[0];
    assert.equal(result.effective_outcome, 'PASS');
    assert.equal(result.health, 'CLEAN');
    assert.equal(result.cleanup_status, 'removed');
    assert.equal(result.completion.proof.subject, 'agent_behavior');
    assert.equal(result.completion.bundles[0].health.profile, 'light');
    assert.deepEqual(result.evidence.subject.map((entry) => entry.role), ['subject_task', 'subject_result', 'subject_receipt', 'subject_output']);
    for (const ref of result.evidence.subject) {
      assert.ok(existsSync(ref.path));
      assert.equal(JSON.parse(readFileSync(ref.path, 'utf8')).role, ref.role);
    }
  });

  it('rejects secret-bearing cleanup evidence and retains the case root', async () => {
    const fixture = makeProject({ fixtureMode: 'secret-trace' });
    const report = await runSupervisor(baseOptions({ cleanupPass: true }), { repoRoot: fixture.root, executable: fixture.executable });
    const result = report.results[0];
    assert.equal(report.exit_code, 2);
    assert.equal(result.native_outcome, 'PASS');
    assert.equal(result.effective_outcome, 'ERROR');
    assert.match(result.reason, /^evidence_export_failed: known credential found in trace verdict/);
    assert.equal(result.run_root_available, true);
    assert.equal(result.cleanup_status, 'not_attempted');
  });

  it('rejects missing or extra declared run-root bundles without outside cleanup', async () => {
    const extra = makeProject({ fixtureMode: 'extra-bundle' });
    const extraReport = await runSupervisor(baseOptions(), { repoRoot: extra.root, executable: extra.executable });
    assert.equal(extraReport.results[0].effective_outcome, 'ERROR');
    assert.equal(extraReport.results[0].agent_process, 'nonzero');
    assert.equal(extraReport.results[0].run_root_available, true);

    const missing = makeProject();
    configureFixturePlaybook(missing, {
      caseId: 'case-51-standard-missing-required-bundle',
      replacements: [
        ['bundle_roles: [verdict]', 'bundle_roles: [verdict, required-aux]'],
        ['health_roles: [verdict]', 'health_roles: [verdict, required-aux]'],
      ],
    });
    const missingReport = await runSupervisor(baseOptions({ caseId: 'case-51-standard-missing-required-bundle' }), { repoRoot: missing.root, executable: missing.executable });
    assert.equal(missingReport.results[0].effective_outcome, 'ERROR');
    assert.equal(missingReport.results[0].agent_process, 'nonzero');
    assert.equal(missingReport.results[0].run_root_available, true);
  });

  it('retires thin legacy result logs and leaves source surfaces untouched', async () => {
    const fixture = makeProject();
    const sourceSentinel = path.join(fixture.root, 'source-sentinel.txt');
    writeFileSync(sourceSentinel, 'unchanged\n');
    const report = await runSupervisor(baseOptions(), { repoRoot: fixture.root, executable: fixture.executable });
    const result = report.results[0];
    assert.equal(readFileSync(sourceSentinel, 'utf8'), 'unchanged\n');
    assert.equal(existsSync(path.join(fixture.root, '.exp-bundles/_run_log.jsonl')), false);
    assert.equal(existsSync(path.join(fixture.root, '.exp-bundles/_temp/exp_verdicts.jsonl')), false);
    assert.equal(existsSync(path.join(result.run_root, 'dpt_disp_fixture_verdict/exp_result.json')), false);
  });

  it('retains valid native completion but stops the batch when final cost is missing', async () => {
    const fixture = makeProject({ fixtureMode: 'missing-cost' });
    const report = await runSupervisor(baseOptions(), { repoRoot: fixture.root, executable: fixture.executable });
    const result = report.results[0];
    assert.equal(report.exit_code, 2);
    assert.equal(result.native_outcome, 'PASS');
    assert.equal(result.lifecycle_outcome, 'ERROR');
    assert.equal(result.effective_outcome, 'ERROR');
    assert.equal(result.reason, 'cost_unknown');
    assert.equal(result.run_root_available, true);
  });

  it('passes the bounded per-case cap to the Headless child', async () => {
    const fixture = makeProject();
    const report = await runSupervisor(baseOptions({ maxTotalBudgetUsd: 1, maxCaseBudgetUsd: 0.3 }), { repoRoot: fixture.root, executable: fixture.executable });
    assert.equal(report.exit_code, 0);
    const capture = JSON.parse(readFileSync(path.join(report.results[0].run_root, '_diagnostics/fixture-invocation.json'), 'utf8'));
    assert.equal(capture.argv[capture.argv.indexOf('--max-budget-usd') + 1], '0.3');
  });

  it('uses the terminal Headless result cost when native Sub-agent activity emits an earlier result', async () => {
    const fixture = makeProject({ fixtureMode: 'nested-result' });
    const report = await runSupervisor(baseOptions(), { repoRoot: fixture.root, executable: fixture.executable });
    const result = report.results[0];
    assert.equal(report.exit_code, 0);
    assert.equal(result.effective_outcome, 'PASS');
    assert.equal(result.cost_usd, 0.25);
    assert.equal(report.accumulated_cost_usd, 0.25);
  });

  it('spawns the test-owned Agent executable without a shell', async () => {
    const fixture = makeProject();
    const shellSensitiveExecutable = path.join(fixture.root, 'fixture; agent executable.mjs');
    writeFileSync(shellSensitiveExecutable, readFileSync(fixture.executable, 'utf8'));
    chmodSync(shellSensitiveExecutable, 0o755);
    const report = await runSupervisor(baseOptions(), { repoRoot: fixture.root, executable: shellSensitiveExecutable });
    assert.equal(report.exit_code, 0);
    assert.equal(report.results[0].effective_outcome, 'PASS');
  });

  it('fails closed for malformed, exhausted, or over-cap final cost', async () => {
    for (const { mode, options, reason } of [
      { mode: 'malformed-cost', options: {}, reason: 'cost_unknown' },
      { mode: 'budget-exhausted', options: {}, reason: 'case_budget_exhausted' },
      { mode: 'over-budget', options: { maxCaseBudgetUsd: 0.1 }, reason: 'case_budget_exhausted' },
    ]) {
      const fixture = makeProject({ fixtureMode: mode });
      const report = await runSupervisor(baseOptions(options), { repoRoot: fixture.root, executable: fixture.executable });
      const result = report.results[0];
      assert.equal(report.exit_code, 2, mode);
      assert.equal(result.lifecycle_outcome, 'ERROR', mode);
      assert.equal(result.reason, reason, mode);
      assert.equal(result.run_root_available, true, mode);
    }
  });

  it('stops the unstarted remainder after an over-cap started case', async () => {
    const fixture = makeProject({ fixtureMode: 'over-budget' });
    const firstPath = 'exp_fixture/case-1-light-fixture.md';
    const secondPath = 'exp_fixture/case-2-light-fixture.md';
    writeFileSync(
      path.join(fixture.root, 'experiments_playbook', secondPath),
      readFileSync(path.join(fixture.root, 'experiments_playbook', firstPath), 'utf8').replaceAll('case-1-light-fixture', 'case-2-light-fixture'),
    );
    writeFileSync(path.join(fixture.root, 'experiments_playbook/PLAYBOOK_MANIFEST.md'), formatPlaybookManifest([firstPath, secondPath]));
    const report = await runSupervisor(baseOptions({ caseId: null, all: true, maxCaseBudgetUsd: 0.1 }), { repoRoot: fixture.root, executable: fixture.executable });
    assert.equal(report.exit_code, 2);
    assert.equal(report.results.length, 2);
    assert.equal(report.results[0].reason, 'case_budget_exhausted');
    assert.equal(report.results[1].agent_process, 'not_started');
    assert.equal(report.results[1].reason, 'case_budget_exhausted');
  });

  it('keeps a specific lifecycle reason for Agent process and stream failures', async () => {
    for (const { mode, reason } of [
      { mode: 'nonzero', reason: 'agent_nonzero_17' },
      { mode: 'signal', reason: 'agent_signal_SIGTERM' },
      { mode: 'timeout', reason: 'agent_timeout' },
      { mode: 'approval', reason: 'approval_required' },
      { mode: 'malformed-stream', reason: 'malformed_agent_stream' },
    ]) {
      const fixture = makeProject({ fixtureMode: mode });
      const report = await runSupervisor(baseOptions({ timeoutMs: mode === 'timeout' ? 50 : 10000 }), { repoRoot: fixture.root, executable: fixture.executable });
      const result = report.results[0];
      assert.equal(report.exit_code, 2, mode);
      assert.equal(result.lifecycle_outcome, 'ERROR', mode);
      assert.equal(result.effective_outcome, 'ERROR', mode);
      assert.equal(result.reason, reason, mode);
      assert.equal(result.run_root_available, true, mode);
    }
  });

  it('fails closed when the native completion is missing or malformed', async () => {
    for (const mode of ['missing-completion', 'malformed-completion']) {
      const fixture = makeProject({ fixtureMode: mode });
      const report = await runSupervisor(baseOptions(), { repoRoot: fixture.root, executable: fixture.executable });
      const result = report.results[0];
      assert.equal(report.exit_code, 2, mode);
      assert.equal(result.native_outcome, null, mode);
      assert.equal(result.lifecycle_outcome, 'ERROR', mode);
      assert.match(result.reason, /^native_completion_invalid:/, mode);
      assert.equal(result.run_root_available, true, mode);
    }
  });

  it('cannot turn successful generic enqueue/save checks into a Heavy PASS without completion', async () => {
    const fixture = makeProject({ fixtureMode: 'heavy-generic-no-completion' });
    const originalPath = 'exp_fixture/case-1-light-fixture.md';
    const heavyPath = 'exp_fixture/case-406-heavy-generic.md';
    const original = readFileSync(path.join(fixture.root, 'experiments_playbook', originalPath), 'utf8');
    const heavy = original
      .replaceAll('case-1-light-fixture', 'case-406-heavy-generic')
      .replace('required_checks: [fixture-pass]', 'required_checks: [subject-work]')
      .replace('durable_evidence_roles: []', 'durable_evidence_roles: [subject_task]')
      .replace('proof_subject: deterministic_contract', 'proof_subject: agent_behavior')
      .replace('subject_execution: none', 'subject_execution: real_subagent')
      .replace('fixture: fixture_backed', 'fixture: setup_only');
    writeFileSync(path.join(fixture.root, 'experiments_playbook', heavyPath), heavy);
    rmSync(path.join(fixture.root, 'experiments_playbook', originalPath));
    writeFileSync(path.join(fixture.root, 'experiments_playbook/PLAYBOOK_MANIFEST.md'), formatPlaybookManifest([heavyPath]));
    const report = await runSupervisor(baseOptions({ caseId: 'case-406-heavy-generic' }), { repoRoot: fixture.root, executable: fixture.executable });
    const result = report.results[0];
    const trace = readFileSync(path.join(result.run_root, 'dpt_disp_fixture_verdict/rb_trace.jsonl'), 'utf8');
    assert.match(trace, /"gate":"enqueue"/);
    assert.match(trace, /"gate":"save"/);
    assert.equal(result.native_outcome, null);
    assert.equal(result.effective_outcome, 'ERROR');
    assert.match(result.reason, /^native_completion_invalid:/);
  });

  it('rejects source mutation after native finalization and preserves the run root', async () => {
    const fixture = makeProject({ fixtureMode: 'mutate-source' });
    const report = await runSupervisor(baseOptions(), { repoRoot: fixture.root, executable: fixture.executable });
    const result = report.results[0];
    assert.equal(result.effective_outcome, 'ERROR');
    assert.match(result.reason, /source playbook digest changed/);
    assert.equal(result.run_root_available, true);
  });

  it('launches Interactive as one positional prompt with inherited stdio and no Headless-only flags', async () => {
    const fixture = makeProject();
    const report = await runSupervisor(baseOptions({
      interactive: true, maxTotalBudgetUsd: null, maxCaseBudgetUsd: null, cleanupPass: false,
    }), { repoRoot: fixture.root, executable: fixture.executable });
    const result = report.results[0];
    assert.equal(result.effective_outcome, 'PASS');
    assert.equal(result.cost_usd, null);
    assert.deepEqual(result.logs, { prompt: null, stdout: null, stderr: null });
    assert.equal(result.run_root_available, true);
    const capture = JSON.parse(readFileSync(path.join(result.run_root, '_diagnostics/fixture-invocation.json'), 'utf8'));
    assert.equal(capture.argv.length, 3);
    assert.deepEqual(capture.argv.slice(0, 2), ['--setting-sources', 'project,local']);
    assert.match(capture.argv[2], /Complete rendered selected playbook/);
    assert.equal(capture.stdin_is_tty, Boolean(process.stdin.isTTY));
    assert.equal(capture.stdout_is_tty, Boolean(process.stdout.isTTY));
    assert.equal(capture.stderr_is_tty, Boolean(process.stderr.isTTY));
    for (const forbidden of ['-p', '--output-format', '--no-session-persistence', '--permission-mode', '--max-budget-usd']) assert.equal(capture.argv.includes(forbidden), false);
  });

  it('fails closed when the complete Interactive positional prompt exceeds 128 KiB', async () => {
    const fixture = makeProject();
    const instruction = path.join(fixture.root, 'experiments_playbook/RUN_INTERACTIVE_EXPS.md');
    writeFileSync(instruction, `${readFileSync(instruction, 'utf8')}\n${'x'.repeat(128 * 1024)}`);
    const report = await runSupervisor(baseOptions({
      interactive: true, maxTotalBudgetUsd: null, maxCaseBudgetUsd: null, cleanupPass: false,
    }), { repoRoot: fixture.root, executable: fixture.executable });
    assert.equal(report.exit_code, 2);
    assert.equal(report.results[0].agent_process, 'not_started');
    assert.equal(report.results[0].lifecycle_outcome, 'ERROR');
    assert.match(report.results[0].reason, /interactive prompt exceeds/);
  });
});

function baseOptions(overrides = {}) {
  return {
    caseId: 'case-1-light-fixture', group: null, tier: null, all: false, interactive: false,
    cleanupPass: false, timeoutMs: 10000, timeoutExplicit: true, healthTimeoutMs: 10000,
    maxTotalBudgetUsd: 1, maxCaseBudgetUsd: null, runProfile: null, maxPredictedDurationMs: null,
    agentBehaviorFreshAfterMs: null, regressionQualification: false, json: true, dryRun: false,
    ...overrides,
  };
}

function makeProject({ fixtureMode = 'success', writeEnv = true, healthStatus = 'clean' } = {}) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'agent-experiment-supervisor-')));
  roots.push(root);
  mkdirSync(path.join(root, 'experiments_playbook/exp_fixture'), { recursive: true });
  mkdirSync(path.join(root, 'experiments_env/shared'), { recursive: true });
  mkdirSync(path.join(root, 'tests'), { recursive: true });
  symlinkSync(path.join(REAL_REPO, 'DPT_FRAMEWORK'), path.join(root, 'DPT_FRAMEWORK'), 'dir');
  if (writeEnv) writeFileSync(path.join(root, '.env'), [
    'DEEPSEEK_API_KEY=fixture-secret',
    'DEEPSEEK_ANTHROPIC_BASE_URL=https://example.test/anthropic',
    'DEEPSEEK_MODEL=fixture-model',
    '',
  ].join('\n'));
  const playbookPath = 'exp_fixture/case-1-light-fixture.md';
  writeFileSync(path.join(root, 'experiments_playbook', playbookPath), `---
schema: command-experiment/v2
experiment: fixture
case: case-1-light-fixture
case_goal: Prove deterministic Supervisor mechanics only.
verdict_mode: all
regression_retry_safety: reviewed
required_checks: [fixture-pass]
bundle_roles: [verdict]
verdict_role: verdict
health_roles: [verdict]
health_profile: light
durable_evidence_roles: []
proof_subject: deterministic_contract
subject_execution: none
fixture: fixture_backed
runtime: real_disposable_bundle
external_calls: none
verdict_judge: deterministic
---

# Fixture

\`\`\`bash
echo {{CASE_RUN_ROOT_SH}}
node DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}}
\`\`\`
`);
  writeFileSync(path.join(root, 'experiments_playbook/PLAYBOOK_MANIFEST.md'), formatPlaybookManifest([playbookPath]));
  writeFileSync(path.join(root, 'experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md'), '# Headless fixture instruction\nExecute the complete rendered selected playbook.\n');
  writeFileSync(path.join(root, 'experiments_playbook/RUN_INTERACTIVE_EXPS.md'), '# Interactive fixture instruction\n');
  writeFileSync(path.join(root, 'experiments_env/shared/verify-bundle-health.mjs'), `#!/usr/bin/env node
const args = process.argv.slice(2);
const bundle = args[args.indexOf('--bundle') + 1];
const profile = args[args.indexOf('--profile') + 1];
console.log(JSON.stringify({schema_version:'experiment_health.v1',bundle_path:bundle,profile,status:${JSON.stringify(healthStatus)},issues:${healthStatus === 'issues' ? "[{code:'probe-issue',message:'intentional feasibility issue'}]" : '[]'}}));
`);
  const executable = path.join(root, `fixture-claude-${fixtureMode}.mjs`);
  writeFileSync(executable, agentFixtureSource(fixtureMode));
  chmodSync(executable, 0o755);
  return { root, executable };
}

function writeHistoricalV1Report(fixture) {
  const reportDir = path.join(fixture.root, '.exp-bundles/_reports');
  mkdirSync(reportDir, { recursive: true });
  const playbookPath = 'exp_fixture/case-1-light-fixture.md';
  const sourcePlaybookSha256 = sha256Bytes(readFileSync(path.join(fixture.root, 'experiments_playbook', playbookPath)));
  writeFileSync(path.join(reportDir, 'historical-v1.json'), `${JSON.stringify({
    schema_version: 'agent-experiment-batch-report/v1',
    batch_id: '00000000-0000-4000-8000-000000000007',
    generated_at: '2026-08-01T00:00:00.000Z',
    results: [{
      case: 'case-1-light-fixture',
      experiment: 'fixture',
      playbook_path: playbookPath,
      native_outcome: 'PASS',
      lifecycle_outcome: null,
      effective_outcome: 'PASS',
      health: 'CLEAN',
      duration_ms: 100,
      cost_usd: 0.25,
      completion: { source_playbook_sha256: sourcePlaybookSha256, outcome: 'PASS' },
    }],
  }, null, 2)}\n`);
}

function configureFixturePlaybook(fixture, { caseId, replacements = [] }) {
  const originalPath = 'exp_fixture/case-1-light-fixture.md';
  const cost = caseId.match(/^case-\d+-(light|standard|heavy)-/)?.[1];
  assert.ok(cost, `case id must carry a filename cost: ${caseId}`);
  const nextPath = `exp_fixture/${caseId}.md`;
  let content = readFileSync(path.join(fixture.root, 'experiments_playbook', originalPath), 'utf8')
    .replaceAll('case-1-light-fixture', caseId);
  for (const [from, to] of replacements) content = content.replace(from, to);
  writeFileSync(path.join(fixture.root, 'experiments_playbook', nextPath), content);
  rmSync(path.join(fixture.root, 'experiments_playbook', originalPath));
  writeFileSync(path.join(fixture.root, 'experiments_playbook/PLAYBOOK_MANIFEST.md'), formatPlaybookManifest([nextPath]));
  return nextPath;
}

function agentFixtureSource(mode) {
  return `#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const mode = ${JSON.stringify(mode)};
let prompt = '';
const positionalPrompt = process.argv.at(-1)?.includes('## Injected execution identity') ? process.argv.at(-1) : null;
function execute() {
  const match = prompt.match(/## Injected execution identity[\\s\\S]*?\\x60\\x60\\x60json\\n([\\s\\S]*?)\\n\\x60\\x60\\x60/);
  if (!match) process.exit(7);
  if (mode === 'nonzero') process.exit(17);
  if (mode === 'signal') process.kill(process.pid, 'SIGTERM');
  if (mode === 'timeout') { setInterval(() => {}, 1000); return; }
  const identity = JSON.parse(match[1]);
  const context = JSON.parse(readFileSync(identity.run_context_path, 'utf8'));
  const checks = mode === 'heavy-generic-no-completion'
    ? ['enqueue', 'save'].map((gate) => ({event:'check',source:'playbook',gate,passed:true,expected:true}))
    : mode === 'native-fail'
      ? [{event:'check',source:'playbook',gate:'fixture-pass',passed:false,expected:true}]
    : [{event:'check',source:'playbook',gate:'fixture-pass',passed:true,expected:true}];
  if (mode === 'secret-trace') checks[0].detail = 'fixture-secret';
  const validTrace = checks.map((entry) => JSON.stringify(entry)).join('\\n') + '\\n';
  const bundleSpecs = mode === 'multi-traces'
    ? [
      {role:'verdict',name:'dpt_disp_fixture_verdict',trace:validTrace},
      {role:'required-aux',name:'dpt_disp_fixture_required_aux',trace:validTrace},
      {role:'invalid-aux',name:'dpt_disp_fixture_invalid_aux',trace:'{not-json}\\n'},
      {role:'missing-aux',name:'dpt_disp_fixture_missing_aux',trace:null},
    ]
    : [{role:'verdict',name:'dpt_disp_fixture_verdict',trace:validTrace}];
  const bundles = bundleSpecs.map((spec) => ({...spec,path:join(context.case_run_root,spec.name)}));
  for (const spec of bundles) {
    mkdirSync(spec.path);
    if (spec.trace !== null) writeFileSync(join(spec.path, 'rb_trace.jsonl'), spec.trace);
    const state = spawnSync(process.execPath, [join(process.cwd(), 'DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs'), 'register-bundle', '--context', identity.run_context_path, '--role', spec.role, '--path', spec.path], {encoding:'utf8'});
    if (state.status !== 0) { process.stderr.write(state.stderr); process.exit(8); }
  }
  const bundle = bundles.find((spec) => spec.role === 'verdict').path;
  if (mode === 'extra-bundle') mkdirSync(join(context.case_run_root, 'dpt_disp_fixture_extra'));
  if (mode === 'malformed-completion') {
    writeFileSync(join(context.case_run_root, 'agent-experiment-completion.json'), '{not-json');
  } else if (!['missing-completion', 'heavy-generic-no-completion'].includes(mode)) {
    const finalArgs = [join(process.cwd(), 'DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs'), '--context', identity.run_context_path];
    for (const spec of bundles) finalArgs.push('--bundle', spec.role + '=' + spec.path);
    if (mode === 'not-run') finalArgs.push('--not-run-reason', 'required Subject actor unavailable');
    if (mode === 'agent-evidence') {
      for (const role of ['subject_task', 'subject_result', 'subject_receipt', 'subject_output']) {
        const evidencePath = join(bundle, role + '.json');
        writeFileSync(evidencePath, JSON.stringify({role,actual_runtime_evidence:true}) + '\\n');
        finalArgs.push('--evidence', role + '=' + evidencePath);
      }
    }
    const final = spawnSync(process.execPath, finalArgs, {encoding:'utf8'});
    if (final.status !== 0) { process.stderr.write(final.stderr); process.exit(9); }
  }
  writeFileSync(join(context.case_run_root, '_diagnostics/fixture-invocation.json'), JSON.stringify({
    cwd: process.cwd(), argv: process.argv.slice(2), prompt_has_full_playbook: prompt.includes('Complete rendered selected playbook'),
    provider_env_isolated: !process.env.DEEPSEEK_API_KEY && process.env.ANTHROPIC_AUTH_TOKEN === 'fixture-secret' && process.env.ANTHROPIC_MODEL === 'fixture-model',
    stdin_is_tty: Boolean(process.stdin.isTTY), stdout_is_tty: Boolean(process.stdout.isTTY), stderr_is_tty: Boolean(process.stderr.isTTY)
  }, null, 2));
  if (!positionalPrompt) process.stderr.write('credential=' + process.env.ANTHROPIC_AUTH_TOKEN + '\\n');
  process.stdout.write(JSON.stringify({type:'system',subtype:'init',cwd:process.cwd()}) + '\\n');
  if (mode === 'mutate-source') writeFileSync(context.source_playbook_path, readFileSync(context.source_playbook_path, 'utf8') + '\\nmutated');
  if (mode === 'approval') process.stdout.write(JSON.stringify({type:'approval_request'}) + '\\n');
  if (mode === 'malformed-stream') process.stdout.write('not-json\\n');
  if (mode === 'missing-cost') process.stdout.write(JSON.stringify({type:'result',subtype:'success'}) + '\\n');
  else if (mode === 'malformed-cost') process.stdout.write(JSON.stringify({type:'result',subtype:'success',total_cost_usd:'invalid'}) + '\\n');
  else if (mode === 'budget-exhausted') process.stdout.write(JSON.stringify({type:'result',subtype:'success',total_cost_usd:0.25,message:'max_budget exhausted'}) + '\\n');
  else if (mode === 'over-budget') process.stdout.write(JSON.stringify({type:'result',subtype:'success',total_cost_usd:0.5}) + '\\n');
  else if (mode === 'nested-result') {
    process.stdout.write(JSON.stringify({type:'result',subtype:'success',total_cost_usd:0.1}) + '\\n');
    process.stdout.write(JSON.stringify({type:'result',subtype:'success',origin:{kind:'task-notification'},total_cost_usd:0.25}) + '\\n');
  }
  else process.stdout.write(JSON.stringify({type:'result',subtype:'success',total_cost_usd:0.25}) + '\\n');
}
if (positionalPrompt) {
  prompt = positionalPrompt;
  execute();
} else {
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { prompt += chunk; });
  process.stdin.on('end', execute);
}
`;
}
