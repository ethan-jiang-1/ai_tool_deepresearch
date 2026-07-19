// @impl EXA-004, EXA-005, EXA-006, EXA-007, PLR-001, PLR-003
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { linkSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  formatPlaybookManifest,
  AgentExperimentCompletionSchema,
  AgentExperimentRunContextSchema,
  caseRootIdentity,
  evaluateVerdictTrace,
  parsePlaybookManifest,
  renderRuntimeTokens,
  readAndValidateManifest,
  sha256Bytes,
  validateCaseCompatibilityLedger,
} from '../../DPT_FRAMEWORK/host_tools/lib/agent-experiment-contract.mjs';
import {
  assertExpBundlesSourceIsolation,
  selectManifestEntries,
} from '../../DPT_FRAMEWORK/host_tools/lib/agent-experiment-supervisor.mjs';
import {
  buildHeadlessAgentCliPlan,
  buildInteractiveAgentCliPlan,
  INTERACTIVE_PROMPT_MAX_BYTES,
} from '../../DPT_FRAMEWORK/host_tools/lib/agent-cli-launcher.mjs';

const REPO_ROOT = resolve(new URL('../..', import.meta.url).pathname);
const STATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/host_tools/agent-experiment-state.mjs');
const FINALIZER = join(REPO_ROOT, 'DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs');

const VALID_FRONTMATTER = `---
schema: command-experiment/v2
experiment: sample
case: case-1-light-sample
case_goal: Sample.
verdict_mode: all
required_checks: [sample]
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

# Sample
`;

describe('Agent Experiment manifest contract', () => {
  it('round-trips the exact one-column machine section', () => {
    const paths = ['exp_sample/case-1-light-sample.md'];
    assert.deepEqual(parsePlaybookManifest(formatPlaybookManifest(paths)), paths);
  });

  it('rejects duplicate markers, unsafe rows and a second runnable projection', () => {
    const valid = formatPlaybookManifest(['exp_sample/case-1-light-sample.md']);
    assert.throws(() => parsePlaybookManifest(`${valid}\n<!-- agent-experiment-manifest:v1 -->`), /markers/);
    assert.throws(() => parsePlaybookManifest(valid.replace('exp_sample/case-1-light-sample.md', '../case-1-light-sample.md')), /unsafe|invalid/);
    assert.throws(() => parsePlaybookManifest(`${valid}\n\`exp_sample/case-2-light-other.md\``), /outside/);
  });

  it('validates manifest order, V2 identity and exact runnable corpus', () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-experiment-manifest-'));
    try {
      const playbooks = join(root, 'experiments_playbook');
      mkdirSync(join(playbooks, 'exp_sample'), { recursive: true });
      writeFileSync(join(playbooks, 'exp_sample', 'case-1-light-sample.md'), VALID_FRONTMATTER);
      writeFileSync(join(playbooks, 'PLAYBOOK_MANIFEST.md'), formatPlaybookManifest(['exp_sample/case-1-light-sample.md']));
      const result = readAndValidateManifest({ repoRoot: root });
      assert.equal(result.entries[0].cost, 'light');
      assert.equal(result.entries[0].frontmatter.case, 'case-1-light-sample');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('rejects unregistered and symlink playbooks', () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-experiment-manifest-'));
    try {
      const playbooks = join(root, 'experiments_playbook');
      mkdirSync(join(playbooks, 'exp_sample'), { recursive: true });
      writeFileSync(join(playbooks, 'exp_sample', 'case-1-light-sample.md'), VALID_FRONTMATTER);
      writeFileSync(join(playbooks, 'exp_sample', 'case-2-light-other.md'), VALID_FRONTMATTER.replaceAll('case-1-light-sample', 'case-2-light-other'));
      writeFileSync(join(playbooks, 'PLAYBOOK_MANIFEST.md'), formatPlaybookManifest(['exp_sample/case-1-light-sample.md']));
      assert.throws(() => readAndValidateManifest({ repoRoot: root }), /unregistered/);
      rmSync(join(playbooks, 'exp_sample', 'case-2-light-other.md'));
      symlinkSync(join(playbooks, 'exp_sample', 'case-1-light-sample.md'), join(playbooks, 'exp_sample', 'case-2-light-other.md'));
      writeFileSync(join(playbooks, 'PLAYBOOK_MANIFEST.md'), formatPlaybookManifest(['exp_sample/case-2-light-other.md']));
      assert.throws(() => readAndValidateManifest({ repoRoot: root, requireExactCorpus: false }), /non-symlink/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

describe('case compatibility ledger contract', () => {
  it('locks the checked 97-case baseline', () => {
    const ledger = parseYaml(readFileSync(new URL('../../openspec/changes/experiment-auto-runner/case-compatibility-ledger.yaml', import.meta.url), 'utf8'));
    assert.deepEqual(validateCaseCompatibilityLedger(ledger), { cases: 97, requiredChecks: 502, agentBehaviorCases: 16 });
  });
});

describe('runtime token rendering and verdict evaluation', () => {
  it('renders only standalone tokens in bash/sh fences with POSIX quoting', () => {
    const source = '```bash\nnode tool --context {{RUN_CONTEXT_SH}} --target {{CASE_RUN_ROOT_SH}}\nB=$(node creator --target-dir {{CASE_RUN_ROOT_SH}})\n```';
    const result = renderRuntimeTokens(source, {
      RUN_CONTEXT_SH: "/tmp/a'b/context.json",
      CASE_RUN_ROOT_SH: '/tmp/run root',
      PLAYBOOK_STATE_DIR_SH: '/tmp/run root/_playbook_state',
    });
    assert.match(result.rendered, /'\/tmp\/a'"'"'b\/context\.json'/);
    assert.match(result.rendered, /'\/tmp\/run root'/);
    assert.match(result.rendered, /--target-dir '\/tmp\/run root'\)/);
  });

  it('rejects prose, quoted, concatenated, heredoc and unknown tokens', () => {
    const values = { RUN_CONTEXT_SH: '/tmp/context', CASE_RUN_ROOT_SH: '/tmp/root', PLAYBOOK_STATE_DIR_SH: '/tmp/state' };
    for (const source of [
      '{{RUN_CONTEXT_SH}}\n```bash\necho {{CASE_RUN_ROOT_SH}}\n```',
      '```bash\necho "{{RUN_CONTEXT_SH}}" {{CASE_RUN_ROOT_SH}}\n```',
      '```bash\necho {{RUN_CONTEXT_SH}}/x {{CASE_RUN_ROOT_SH}}\n```',
      "```bash\ncat <<'EOF'\n{{RUN_CONTEXT_SH}}\nEOF\necho {{CASE_RUN_ROOT_SH}}\n```",
      '```bash\necho {{UNKNOWN_SH}} {{RUN_CONTEXT_SH}} {{CASE_RUN_ROOT_SH}}\n```',
      '```bash\necho {{unknown_token}} {{RUN_CONTEXT_SH}} {{CASE_RUN_ROOT_SH}}\n```',
    ]) assert.throws(() => renderRuntimeTokens(source, values));
  });

  it('uses strict playbook checks and exact last-per-gate semantics', () => {
    const bytes = Buffer.from([
      JSON.stringify({ event: 'check', source: 'engine', gate: 'required', passed: true, expected: true }),
      JSON.stringify({ event: 'check', source: 'playbook', gate: 'required', passed: false, expected: true }),
      JSON.stringify({ event: 'check', source: 'playbook', gate: 'required', passed: true, expected: true }),
      '',
    ].join('\n'));
    const last = evaluateVerdictTrace(bytes, { verdict_mode: 'last', required_checks: ['required'], verdict_judge: 'deterministic' });
    assert.equal(last.outcome, 'PASS');
    assert.equal(last.checksTotal, 2);
    assert.equal(last.consideredChecks.length, 1);
    const all = evaluateVerdictTrace(bytes, { verdict_mode: 'all', required_checks: ['required'], verdict_judge: 'deterministic' });
    assert.equal(all.outcome, 'FAIL');
    assert.throws(() => evaluateVerdictTrace(bytes, { verdict_mode: 'last', required_checks: ['missing'], verdict_judge: 'deterministic' }), /missing/);
  });
});

describe('bundle registry and native finalizer CLI', () => {
  it('registers exact roles and publishes one PASS completion without overwrite', () => {
    const run = makeRun();
    try {
      const bundle = join(run.root, 'dpt_disp_case-1_sample');
      mkdirSync(bundle);
      writeFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ event: 'check', source: 'playbook', gate: 'sample', passed: true, expected: true })}\n`);
      let result = spawnSync('node', [STATE_CLI, 'register-bundle', '--context', run.contextPath, '--role', 'verdict', '--path', bundle], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout.trim(), bundle);
      result = spawnSync('node', [STATE_CLI, 'get-bundle', '--context', run.contextPath, '--role', 'verdict'], { encoding: 'utf8' });
      assert.equal(result.stdout.trim(), bundle);
      result = spawnSync('node', [FINALIZER, '--context', run.contextPath, '--bundle', `verdict=${bundle}`], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const completion = AgentExperimentCompletionSchema.parse(JSON.parse(readFileSync(join(run.root, 'agent-experiment-completion.json'), 'utf8')));
      assert.equal(completion.outcome, 'PASS');
      assert.equal(completion.considered_checks[0].gate, 'sample');
      const first = readFileSync(join(run.root, 'agent-experiment-completion.json'));
      result = spawnSync('node', [FINALIZER, '--context', run.contextPath, '--bundle', `verdict=${bundle}`], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.deepEqual(readFileSync(join(run.root, 'agent-experiment-completion.json')), first);
    } finally { rmSync(run.root, { recursive: true, force: true }); }
  });

  it('does not allow generic checks to satisfy required policy', () => {
    const run = makeRun();
    try {
      const bundle = join(run.root, 'dpt_disp_case-1_generic');
      mkdirSync(bundle);
      writeFileSync(join(bundle, 'rb_trace.jsonl'), `${JSON.stringify({ event: 'check', source: 'playbook', gate: 'enqueue', passed: true, expected: true })}\n`);
      assert.equal(spawnSync('node', [STATE_CLI, 'register-bundle', '--context', run.contextPath, '--role', 'verdict', '--path', bundle]).status, 0);
      const result = spawnSync('node', [FINALIZER, '--context', run.contextPath, '--bundle', `verdict=${bundle}`], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /required verdict checks missing/);
    } finally { rmSync(run.root, { recursive: true, force: true }); }
  });

  it('canonicalizes registry and completion bundles by V2 role order', () => {
    const run = makeRun({ bundle_roles: ['verdict', 'fault-aux'], verdict_role: 'verdict', health_roles: ['verdict'] });
    try {
      const verdict = join(run.root, 'dpt_disp_case-1_verdict');
      const auxiliary = join(run.root, 'dpt_disp_case-1_aux');
      mkdirSync(verdict);
      mkdirSync(auxiliary);
      writeFileSync(join(verdict, 'rb_trace.jsonl'), `${JSON.stringify({ event: 'check', source: 'playbook', gate: 'sample', passed: true, expected: true })}\n`);
      assert.equal(spawnSync('node', [STATE_CLI, 'register-bundle', '--context', run.contextPath, '--role', 'fault-aux', '--path', auxiliary]).status, 0);
      assert.equal(spawnSync('node', [STATE_CLI, 'register-bundle', '--context', run.contextPath, '--role', 'verdict', '--path', verdict]).status, 0);
      const registry = JSON.parse(readFileSync(join(run.root, '_playbook_state/bundles.json'), 'utf8'));
      assert.deepEqual(registry.bundles.map((entry) => entry.role), ['verdict', 'fault-aux']);
      const result = spawnSync('node', [FINALIZER, '--context', run.contextPath, '--bundle', `fault-aux=${auxiliary}`, '--bundle', `verdict=${verdict}`], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const completion = AgentExperimentCompletionSchema.parse(JSON.parse(readFileSync(join(run.root, 'agent-experiment-completion.json'), 'utf8')));
      assert.deepEqual(completion.bundles.map((entry) => entry.role), ['verdict', 'fault-aux']);
      assert.equal(completion.bundles[1].trace_parse_status, 'missing');
    } finally { rmSync(run.root, { recursive: true, force: true }); }
  });

  it('supports bundle-free NOT_RUN but rejects a missing required-health trace', () => {
    const emptyRun = makeRun();
    try {
      const result = spawnSync('node', [FINALIZER, '--context', emptyRun.contextPath, '--not-run-reason', 'actor unavailable'], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const completion = AgentExperimentCompletionSchema.parse(JSON.parse(readFileSync(join(emptyRun.root, 'agent-experiment-completion.json'), 'utf8')));
      assert.equal(completion.outcome, 'NOT_RUN');
      assert.deepEqual(completion.bundles, []);
      assert.equal(completion.verdict_role, null);
    } finally { rmSync(emptyRun.root, { recursive: true, force: true }); }

    const partialRun = makeRun();
    try {
      const bundle = join(partialRun.root, 'dpt_disp_case-1_partial');
      mkdirSync(bundle);
      assert.equal(spawnSync('node', [STATE_CLI, 'register-bundle', '--context', partialRun.contextPath, '--role', 'verdict', '--path', bundle]).status, 0);
      const result = spawnSync('node', [FINALIZER, '--context', partialRun.contextPath, '--bundle', `verdict=${bundle}`, '--not-run-reason', 'actor unavailable'], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /required trace missing/);
    } finally { rmSync(partialRun.root, { recursive: true, force: true }); }
  });

  it('fails closed on registry overwrite, duplicate paths and a retained lock', () => {
    const run = makeRun({ bundle_roles: ['verdict', 'auxiliary'], verdict_role: 'verdict', health_roles: ['verdict'] });
    try {
      const bundle = join(run.root, 'dpt_disp_case-1_one');
      const other = join(run.root, 'dpt_disp_case-1_two');
      mkdirSync(bundle);
      mkdirSync(other);
      assert.equal(spawnSync('node', [STATE_CLI, 'register-bundle', '--context', run.contextPath, '--role', 'verdict', '--path', bundle]).status, 0);
      let result = spawnSync('node', [STATE_CLI, 'register-bundle', '--context', run.contextPath, '--role', 'verdict', '--path', other], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /already registered/);
      result = spawnSync('node', [STATE_CLI, 'register-bundle', '--context', run.contextPath, '--role', 'auxiliary', '--path', bundle], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /another role/);
      writeFileSync(join(run.root, '_playbook_state/bundles.lock'), 'retained');
      result = spawnSync('node', [STATE_CLI, 'register-bundle', '--context', run.contextPath, '--role', 'auxiliary', '--path', other], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /concurrent or crashed writer/);
    } finally { rmSync(run.root, { recursive: true, force: true }); }
  });

  it('rejects a repo-root or sibling bundle leak without mutating the outside directory', () => {
    const run = makeRun();
    const outside = join(run.root, '..', `dpt_disp_outside_${randomUUID()}`);
    try {
      mkdirSync(outside);
      const result = spawnSync('node', [STATE_CLI, 'register-bundle', '--context', run.contextPath, '--role', 'verdict', '--path', outside], { encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /direct child/);
      assert.equal(realpathSync(outside), outside);
    } finally {
      rmSync(run.root, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('feasibility-audit production-contract shapes', () => {
  it('represents case-41 one-bundle Light CLEAN policy', () => {
    const result = runProbe({
      caseId: 'case-41-light-minimal-path', cost: 'light',
      policy: probePolicy({ required_checks: ['minimal-path'] }),
      bundles: [{ role: 'verdict', trace: checks(['minimal-path']) }],
    });
    assert.equal(result.completion.outcome, 'PASS');
    assert.equal(result.completion.bundles[0].health.profile, 'light');
    result.cleanup();
  });

  it('represents case-111 last-per-gate repair semantics', () => {
    const result = runProbe({
      caseId: 'case-111-standard-repair-loop', cost: 'standard',
      policy: probePolicy({ verdict_mode: 'last', required_checks: ['setup-ready'], health_profile: 'standard' }),
      bundles: [{ role: 'verdict', trace: checks(['setup-ready'], true, ['setup-ready']) }],
    });
    assert.equal(result.completion.outcome, 'PASS');
    assert.equal(result.completion.checks_total, 2);
    assert.equal(result.completion.checks_considered, 1);
    result.cleanup();
  });

  it('represents case-112 invalid non-health auxiliary plus healthy repair verdict', () => {
    const result = runProbe({
      caseId: 'case-112-standard-fault-tolerance', cost: 'standard',
      policy: probePolicy({
        verdict_mode: 'last', required_checks: ['fault-observed'], bundle_roles: ['bad-json', 'repair-verdict'],
        verdict_role: 'repair-verdict', health_roles: ['repair-verdict'], health_profile: 'standard',
      }),
      bundles: [
        { role: 'bad-json', trace: '{bad json\n' },
        { role: 'repair-verdict', trace: checks(['fault-observed'], true, ['fault-observed']) },
      ],
    });
    assert.equal(result.completion.outcome, 'PASS');
    assert.equal(result.completion.bundles[0].trace_parse_status, 'invalid');
    assert.equal(result.completion.bundles[0].health.required, false);
    result.cleanup();
  });

  it('represents case-135 malformed non-health auxiliary without weakening Standard health', () => {
    const result = runProbe({
      caseId: 'case-135-standard-readiness-precheck', cost: 'standard',
      policy: probePolicy({
        required_checks: ['readiness'], bundle_roles: ['readiness-verdict', 'missing-prior-gate', 'corrupt-trace'],
        verdict_role: 'readiness-verdict', health_roles: ['readiness-verdict'], health_profile: 'standard',
      }),
      bundles: [
        { role: 'corrupt-trace', trace: 'not-json\n' },
        { role: 'readiness-verdict', trace: checks(['readiness']) },
        { role: 'missing-prior-gate', trace: `${JSON.stringify({ event: 'diagnostic' })}\n` },
      ],
    });
    assert.deepEqual(result.completion.bundles.map((entry) => entry.role), ['readiness-verdict', 'missing-prior-gate', 'corrupt-trace']);
    assert.equal(result.completion.bundles[2].trace_parse_status, 'invalid');
    result.cleanup();
  });

  it('represents case-51 three declared Standard health targets', () => {
    const result = runProbe({
      caseId: 'case-51-standard-happy-path', cost: 'standard',
      policy: probePolicy({
        required_checks: ['proceed'], bundle_roles: ['proceed-verdict', 'rerun', 'context'],
        verdict_role: 'proceed-verdict', health_roles: ['proceed-verdict', 'rerun', 'context'], health_profile: 'standard',
      }),
      bundles: [
        { role: 'context', trace: `${JSON.stringify({ event: 'diagnostic' })}\n` },
        { role: 'proceed-verdict', trace: checks(['proceed']) },
        { role: 'rerun', trace: `${JSON.stringify({ event: 'diagnostic' })}\n` },
      ],
    });
    assert.equal(result.completion.bundles.filter((entry) => entry.health.required).length, 3);
    result.cleanup();
  });

  it('represents case-153 ten roles with only the aggregate verdict in health scope', () => {
    const roles = ['invalid-submit-verdict', 'fail-late-submit', 'audited-late-submit', 'claimed-retry-cleanup', 'replacement-blocks-late', 'timeout-retry', 'abandon', 'duplicate-submit', 'stale-binding', 'mixed-provenance'];
    const required = roles.map((role) => `${role}-verified`);
    const result = runProbe({
      caseId: 'case-153-standard-wave-fault-tolerance', cost: 'standard',
      policy: probePolicy({ required_checks: required, bundle_roles: roles, verdict_role: roles[0], health_roles: [roles[0]], health_profile: 'standard' }),
      bundles: roles.toReversed().map((role) => ({ role, trace: role === roles[0] ? checks(required) : `${JSON.stringify({ event: 'diagnostic', role })}\n` })),
    });
    assert.equal(result.completion.bundles.length, 10);
    assert.deepEqual(result.completion.bundles.filter((entry) => entry.health.required).map((entry) => entry.role), [roles[0]]);
    result.cleanup();
  });

  it('represents case-711 Heavy-cost Light-health honest actor-unavailable NOT_RUN', () => {
    const result = runProbe({
      caseId: 'case-711-heavy-hitl1-natural-acceptance', cost: 'heavy',
      policy: probePolicy({
        required_checks: ['subject-fact'], health_profile: 'light', durable_evidence_roles: ['subject_prompt', 'subject_transcript', 'subject_result'],
        proof_subject: 'agent_behavior', subject_execution: 'real_agent', fixture: 'setup_only', external_calls: 'real',
      }),
      bundles: [{ role: 'verdict', trace: `${JSON.stringify({ event: 'diagnostic' })}\n` }],
      notRunReason: 'independent Subject Agent unavailable',
    });
    assert.equal(result.completion.outcome, 'NOT_RUN');
    assert.equal(result.completion.bundles[0].health.profile, 'light');
    assert.deepEqual(result.completion.durable_evidence, []);
    result.cleanup();
  });

  it('represents case-73/102 disposable verdict plus production-shaped contained subject', () => {
    const result = runProbe({
      caseId: 'case-73-standard-production-instantiator', cost: 'standard',
      policy: probePolicy({
        required_checks: ['creator-contract'], bundle_roles: ['verdict', 'production-subject'],
        verdict_role: 'verdict', health_roles: ['verdict', 'production-subject'], health_profile: 'standard',
      }),
      bundles: [
        { role: 'production-subject', name: 'dpt_rb_probe_subject', trace: `${JSON.stringify({ event: 'diagnostic' })}\n` },
        { role: 'verdict', name: 'dpt_disp_probe_verdict', trace: checks(['creator-contract']) },
      ],
    });
    assert.match(result.completion.bundles[0].path, /dpt_disp_/);
    assert.match(result.completion.bundles[1].path, /dpt_rb_/);
    assert.equal(result.completion.proof.runtime, 'real_disposable_bundle');
    result.cleanup();
  });

  it('represents case-318 repo-cwd source with explicit rendered preparation and state targets', () => {
    const source = '```bash\nB=$(node experiments_env/shared/prepare-rerun-direction-canary.mjs --target-dir {{CASE_RUN_ROOT_SH}})\nSTATE=$(printf %s {{PLAYBOOK_STATE_DIR_SH}})\nprintf %s "$B" > "$STATE/bundle-path"\nnode DPT_FRAMEWORK/host_tools/finalize-agent-experiment.mjs --context {{RUN_CONTEXT_SH}}\n```';
    const rendered = renderRuntimeTokens(source, {
      RUN_CONTEXT_SH: '/tmp/probe/agent-experiment-run.json', CASE_RUN_ROOT_SH: '/tmp/probe', PLAYBOOK_STATE_DIR_SH: '/tmp/probe/_playbook_state',
    }).rendered;
    assert.match(rendered, /node experiments_env\/shared\/prepare-rerun-direction-canary\.mjs/);
    assert.match(rendered, /--target-dir '\/tmp\/probe'/);
    assert.match(rendered, /STATE=\$\(printf %s '\/tmp\/probe\/_playbook_state'\)/);
    assert.match(rendered, /> "\$STATE\/bundle-path"/);
    assert.doesNotMatch(rendered, /DPT_AGENT_EXPERIMENT_CONTEXT|latest[-_ ]run/i);
  });

  it('represents case-406 Agent-behavior PASS only with exact Subject evidence roles', () => {
    const evidenceRoles = ['subject_task', 'subject_result', 'subject_receipt', 'subject_output'];
    const result = runProbe({
      caseId: 'case-406-heavy-real-subagent', cost: 'heavy',
      policy: probePolicy({
        required_checks: ['real-subagent'], health_profile: 'heavy', durable_evidence_roles: evidenceRoles,
        proof_subject: 'agent_behavior', subject_execution: 'real_subagent', fixture: 'setup_only', external_calls: 'none',
      }),
      bundles: [{ role: 'verdict', trace: checks(['real-subagent']), evidenceRoles }],
    });
    assert.equal(result.completion.outcome, 'PASS');
    assert.deepEqual(result.completion.durable_evidence.map((entry) => entry.role), evidenceRoles);
    result.cleanup();
  });

  it('represents case-224 one happy verdict plus three non-health negative auxiliaries', () => {
    const roles = ['happy-verdict', 'orphan-output', 'shallow-depth-review', 'cache-thin'];
    const result = runProbe({
      caseId: 'case-224-heavy-negative-auxiliaries', cost: 'heavy',
      policy: probePolicy({ required_checks: ['happy'], bundle_roles: roles, verdict_role: roles[0], health_roles: [roles[0]], health_profile: 'heavy' }),
      bundles: [
        { role: 'cache-thin', trace: null },
        { role: 'orphan-output', trace: 'invalid\n' },
        { role: 'happy-verdict', trace: checks(['happy']) },
        { role: 'shallow-depth-review', trace: `${JSON.stringify({ event: 'diagnostic' })}\n` },
      ],
    });
    assert.deepEqual(result.completion.bundles.map((entry) => entry.role), roles);
    assert.deepEqual(result.completion.bundles.slice(1).map((entry) => entry.health.required), [false, false, false]);
    result.cleanup();
  });
});

describe('run-context and completion schema cross-fields', () => {
  it('rejects mismatched cost and mutable completion coordinates', () => {
    const run = makeRun();
    try {
      const context = JSON.parse(readFileSync(run.contextPath, 'utf8'));
      assert.throws(() => AgentExperimentRunContextSchema.parse({ ...context, cost: 'heavy' }), /cost/);
      assert.throws(() => AgentExperimentRunContextSchema.parse({ ...context, completion_path: join(run.root, 'redirect.json') }), /completion_path/);
    } finally { rmSync(run.root, { recursive: true, force: true }); }
  });

  it('rejects inconsistent NOT_RUN and trace/health bindings', () => {
    const digest = sha256Bytes(Buffer.alloc(0));
    const base = {
      schema_version: 'agent-experiment-completion/v1', run_id: randomUUID(), case: 'case-1-light-sample',
      run_context_sha256: digest, manifest_sha256: digest, instruction_sha256: digest, source_playbook_sha256: digest, rendered_playbook_sha256: digest,
      outcome: 'NOT_RUN', not_run_reason: 'unavailable', verdict_mode: 'all', checks_total: 0, checks_considered: 0, considered_checks: [], verdict_role: null,
      bundles: [], durable_evidence: [],
      proof: { subject: 'deterministic_contract', execution: 'none', fixture: 'fixture_backed', runtime: 'real_disposable_bundle', external: 'none', judge: 'deterministic' },
      completed_at: new Date().toISOString(),
    };
    assert.throws(() => AgentExperimentCompletionSchema.parse({ ...base, not_run_reason: null }), /NOT_RUN requires a reason/);
    assert.throws(() => AgentExperimentCompletionSchema.parse({ ...base, checks_total: 1 }), /cannot manufacture/);
    const brokenHealth = { role: 'verdict', path: '/tmp/dpt_disp_case', trace_prefix_bytes: 0, trace_prefix_sha256: digest, trace_parse_status: 'missing', trace_event_count: null, health: { required: true, profile: 'light' } };
    assert.throws(() => AgentExperimentCompletionSchema.parse({ ...base, bundles: [brokenHealth] }), /required health trace must be valid/);
    const validTrace = { ...brokenHealth, trace_prefix_bytes: 1, trace_prefix_sha256: sha256Bytes(Buffer.from('\n')), trace_parse_status: 'valid', trace_event_count: 1 };
    const inconsistentPass = {
      ...base, outcome: 'PASS', not_run_reason: null, verdict_role: 'verdict', checks_total: 1, checks_considered: 1,
      considered_checks: [{ gate: 'sample', passed: false, expected: true }], bundles: [validTrace],
    };
    assert.throws(() => AgentExperimentCompletionSchema.parse(inconsistentPass), /considered-check projection/);
  });
});

describe('Supervisor selection, launcher and source-isolation policy', () => {
  const entry = (caseId, experiment, cost, judge = 'deterministic') => ({
    path: `exp_${experiment}/${caseId}.md`, cost,
    frontmatter: { case: caseId, experiment, verdict_judge: judge },
  });
  const entries = [
    entry('case-2-standard-second', 'beta', 'standard'),
    entry('case-1-light-first', 'alpha', 'light'),
    entry('case-901-heavy-human', 'human', 'heavy', 'real_human'),
    entry('case-3-light-third', 'alpha', 'light'),
  ];

  it('preserves manifest order across default, exact, group/tier and all selection', () => {
    assert.deepEqual(selectManifestEntries(entries, {}).map((item) => item.frontmatter.case), ['case-1-light-first', 'case-3-light-third']);
    assert.deepEqual(selectManifestEntries(entries, { group: 'alpha', tier: 'light' }).map((item) => item.frontmatter.case), ['case-1-light-first', 'case-3-light-third']);
    assert.deepEqual(selectManifestEntries(entries, { all: true }).map((item) => item.frontmatter.case), ['case-2-standard-second', 'case-1-light-first', 'case-3-light-third']);
    assert.deepEqual(selectManifestEntries(entries, { caseId: 'case-901-heavy-human' }).map((item) => item.frontmatter.case), ['case-901-heavy-human']);
    assert.throws(() => selectManifestEntries(entries, { caseId: 'case-1-light-first', tier: 'light' }), /exclusive/);
    assert.throws(() => selectManifestEntries(entries, { group: 'missing' }), /empty|unknown/);
    assert.throws(() => selectManifestEntries(entries, { interactive: true, group: 'alpha' }), /exactly one/);
  });

  it('constructs separate Headless and Interactive Claude argv classes', () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-cli-plan-'));
    try {
      writeFileSync(join(root, '.env'), 'DEEPSEEK_API_KEY=secret\nDEEPSEEK_ANTHROPIC_BASE_URL=https://example.test/anthropic\nDEEPSEEK_MODEL=model\n');
      const headless = buildHeadlessAgentCliPlan({ repoRoot: root, maxBudgetUsd: 1.25 });
      assert.ok(headless.args.includes('-p'));
      assert.ok(headless.args.includes('stream-json'));
      assert.ok(headless.args.includes('bypassPermissions'));
      assert.equal(headless.args[headless.args.indexOf('--max-budget-usd') + 1], '1.25');
      const interactive = buildInteractiveAgentCliPlan({ repoRoot: root, prompt: 'one case' });
      assert.deepEqual(interactive.args, ['--setting-sources', 'project,local', 'one case']);
      for (const forbidden of ['-p', '--output-format', '--no-session-persistence', '--permission-mode', '--max-budget-usd']) assert.equal(interactive.args.includes(forbidden), false);
      assert.throws(() => buildInteractiveAgentCliPlan({ repoRoot: root, prompt: 'x'.repeat(INTERACTIVE_PROMPT_MAX_BYTES + 1) }), /exceeds/);
      assert.throws(() => buildHeadlessAgentCliPlan({ repoRoot: root, maxBudgetUsd: 1, extraEnv: { ANTHROPIC_MODEL: 'override' } }), /cannot override/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('rejects source-tree symlinks and hardlinks under .exp-bundles', () => {
    const root = mkdtempSync(join(tmpdir(), 'agent-source-isolation-'));
    try {
      mkdirSync(join(root, 'DPT_FRAMEWORK'), { recursive: true });
      mkdirSync(join(root, 'experiments_env'), { recursive: true });
      mkdirSync(join(root, 'tests'), { recursive: true });
      mkdirSync(join(root, '.exp-bundles'), { recursive: true });
      writeFileSync(join(root, 'DPT_FRAMEWORK/source.mjs'), 'source');
      symlinkSync(join(root, 'DPT_FRAMEWORK'), join(root, '.exp-bundles/framework-link'), 'dir');
      assert.throws(() => assertExpBundlesSourceIsolation(root, join(root, '.exp-bundles')), /symlink/);
      rmSync(join(root, '.exp-bundles/framework-link'));
      linkSync(join(root, 'DPT_FRAMEWORK/source.mjs'), join(root, '.exp-bundles/source-hardlink.mjs'));
      assert.throws(() => assertExpBundlesSourceIsolation(root, join(root, '.exp-bundles')), /hardlinked/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

function makeRun(policyOverrides = {}, { caseId = 'case-1-light-sample', cost = 'light', experiment = 'sample' } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'agent-experiment-run-')));
  mkdirSync(join(root, '_playbook_state'));
  const runId = randomUUID();
  const digest = sha256Bytes(Buffer.from('fixture'));
  const contextPath = join(root, 'agent-experiment-run.json');
  const context = {
    schema_version: 'agent-experiment-run/v1', run_id: runId, mode: 'headless_agent', created_at: new Date().toISOString(),
    manifest_path: join(REPO_ROOT, 'experiments_playbook/PLAYBOOK_MANIFEST.md'), manifest_sha256: digest,
    instruction_path: join(REPO_ROOT, 'experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md'), instruction_sha256: digest,
    source_playbook_path: join(REPO_ROOT, 'experiments_playbook/exp_agentic-queue/case-41-light-minimal-path.md'), source_playbook_sha256: digest,
    rendered_playbook_path: join(root, 'rendered-playbook.md'), rendered_playbook_sha256: digest,
    case: caseId, experiment, cost,
    policy: {
      verdict_mode: 'all', required_checks: ['sample'], bundle_roles: ['verdict'], verdict_role: 'verdict', health_roles: ['verdict'],
      health_profile: 'light', durable_evidence_roles: [], proof_subject: 'deterministic_contract', subject_execution: 'none', fixture: 'fixture_backed',
      runtime: 'real_disposable_bundle', external_calls: 'none', verdict_judge: 'deterministic',
      ...policyOverrides,
    },
    repo_command_root: REPO_ROOT, framework_root: join(REPO_ROOT, 'DPT_FRAMEWORK'), case_run_root: root,
    case_root_identity: caseRootIdentity(root), completion_path: join(root, 'agent-experiment-completion.json'),
  };
  writeFileSync(contextPath, `${JSON.stringify(context, null, 2)}\n`);
  writeFileSync(join(root, '_playbook_state/bundles.json'), `${JSON.stringify({ schema_version: 'agent-experiment-bundles/v1', run_id: runId, bundles: [] }, null, 2)}\n`);
  return { root, contextPath };
}

function probePolicy(overrides = {}) {
  return {
    verdict_mode: 'all', required_checks: ['probe'], bundle_roles: ['verdict'], verdict_role: 'verdict', health_roles: ['verdict'],
    health_profile: 'light', durable_evidence_roles: [], proof_subject: 'deterministic_contract', subject_execution: 'none', fixture: 'fixture_backed',
    runtime: 'real_disposable_bundle', external_calls: 'none', verdict_judge: 'deterministic', ...overrides,
  };
}

function checks(required, initialFailure = false, repaired = []) {
  const rows = [];
  for (const gate of required) {
    if (initialFailure && repaired.includes(gate)) rows.push({ event: 'check', source: 'playbook', gate, passed: false, expected: true });
    rows.push({ event: 'check', source: 'playbook', gate, passed: true, expected: true });
  }
  return `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
}

function runProbe({ caseId, cost, policy, bundles, notRunReason = null }) {
  const run = makeRun(policy, { caseId, cost });
  try {
    const flags = [];
    const evidenceFlags = [];
    for (const [index, spec] of bundles.entries()) {
      const name = spec.name ?? `dpt_disp_probe_${index}`;
      const bundle = join(run.root, name);
      mkdirSync(bundle);
      if (spec.trace !== null) writeFileSync(join(bundle, 'rb_trace.jsonl'), spec.trace);
      const registered = spawnSync('node', [STATE_CLI, 'register-bundle', '--context', run.contextPath, '--role', spec.role, '--path', bundle], { encoding: 'utf8' });
      assert.equal(registered.status, 0, registered.stderr);
      flags.push('--bundle', `${spec.role}=${bundle}`);
      for (const role of spec.evidenceRoles ?? []) {
        const pathValue = join(bundle, `${role}.json`);
        writeFileSync(pathValue, `${JSON.stringify({ role, actual_runtime_evidence: true })}\n`);
        evidenceFlags.push('--evidence', `${role}=${pathValue}`);
      }
    }
    const args = [FINALIZER, '--context', run.contextPath, ...flags, ...evidenceFlags];
    if (notRunReason !== null) args.push('--not-run-reason', notRunReason);
    const finalized = spawnSync('node', args, { encoding: 'utf8' });
    assert.equal(finalized.status, 0, finalized.stderr);
    const completion = AgentExperimentCompletionSchema.parse(JSON.parse(readFileSync(join(run.root, 'agent-experiment-completion.json'), 'utf8')));
    return { completion, cleanup: () => rmSync(run.root, { recursive: true, force: true }) };
  } catch (error) {
    rmSync(run.root, { recursive: true, force: true });
    throw error;
  }
}
