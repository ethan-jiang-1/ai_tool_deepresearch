// @impl EXA-003, EXA-004, EXA-005, EXA-006, EXA-007, EXA-008, LDC-002, LDC-005, LDC-008
// Deterministic Supervisor mechanics only; this fixture is not real Playbook-Agent evidence.

import assert from 'node:assert/strict';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { formatPlaybookManifest } from '../../../DPT_FRAMEWORK/host_tools/lib/agent-experiment-contract.mjs';
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
    for (const forbidden of ['-p', '--output-format', '--no-session-persistence', '--permission-mode', '--max-budget-usd']) assert.equal(capture.argv.includes(forbidden), false);
  });
});

function baseOptions(overrides = {}) {
  return {
    caseId: 'case-1-light-fixture', group: null, tier: null, all: false, interactive: false,
    cleanupPass: false, timeoutMs: 10000, healthTimeoutMs: 10000,
    maxTotalBudgetUsd: 1, maxCaseBudgetUsd: null, json: true, dryRun: false,
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

function agentFixtureSource(mode) {
  return `#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
let prompt = '';
const positionalPrompt = process.argv.at(-1)?.includes('## Injected execution identity') ? process.argv.at(-1) : null;
function execute() {
  const match = prompt.match(/## Injected execution identity[\\s\\S]*?\\x60\\x60\\x60json\\n([\\s\\S]*?)\\n\\x60\\x60\\x60/);
  if (!match) process.exit(7);
  const identity = JSON.parse(match[1]);
  const context = JSON.parse(readFileSync(identity.run_context_path, 'utf8'));
  const bundle = join(context.case_run_root, 'dpt_disp_fixture_verdict');
  mkdirSync(bundle);
  writeFileSync(join(bundle, 'rb_trace.jsonl'), JSON.stringify({event:'check',source:'playbook',gate:'fixture-pass',passed:true,expected:true}) + '\\n');
  const state = spawnSync(process.execPath, [join(process.cwd(), 'DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs'), 'register-bundle', '--context', identity.run_context_path, '--role', 'verdict', '--path', bundle], {encoding:'utf8'});
  if (state.status !== 0) { process.stderr.write(state.stderr); process.exit(8); }
  const final = spawnSync(process.execPath, [join(process.cwd(), 'DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs'), '--context', identity.run_context_path, '--bundle', 'verdict=' + bundle], {encoding:'utf8'});
  if (final.status !== 0) { process.stderr.write(final.stderr); process.exit(9); }
  writeFileSync(join(context.case_run_root, '_diagnostics/fixture-invocation.json'), JSON.stringify({
    cwd: process.cwd(), argv: process.argv.slice(2), prompt_has_full_playbook: prompt.includes('Complete rendered selected playbook'),
    provider_env_isolated: !process.env.DEEPSEEK_API_KEY && process.env.ANTHROPIC_AUTH_TOKEN === 'fixture-secret' && process.env.ANTHROPIC_MODEL === 'fixture-model'
  }, null, 2));
  if (!positionalPrompt) process.stderr.write('credential=' + process.env.ANTHROPIC_AUTH_TOKEN + '\\n');
  process.stdout.write(JSON.stringify({type:'system',subtype:'init',cwd:process.cwd()}) + '\\n');
  ${mode === 'mutate-source' ? "writeFileSync(context.source_playbook_path, readFileSync(context.source_playbook_path, 'utf8') + '\\nmutated');" : ''}
  ${mode === 'missing-cost'
    ? "process.stdout.write(JSON.stringify({type:'result',subtype:'success'}) + '\\n');"
    : "process.stdout.write(JSON.stringify({type:'result',subtype:'success',total_cost_usd:0.25}) + '\\n');"}
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
