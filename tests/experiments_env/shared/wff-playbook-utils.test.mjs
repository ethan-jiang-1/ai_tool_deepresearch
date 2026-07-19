// @impl EXA-005, EXA-006, PLR-003

import { randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  cleanup,
  recordCheck,
  recordVerdict,
  verdict,
} from '../../../experiments_env/shared/wff-playbook-utils.mjs';
import {
  AgentExperimentCompletionSchema,
  caseRootIdentity,
  sha256Bytes,
} from '../../../DPT_FRAMEWORK/host_tools/lib/agent-experiment-contract.mjs';

const REPO_ROOT = path.resolve(new URL('../../..', import.meta.url).pathname);

describe('wff playbook native-finalizer adapter', () => {
  it('keeps check production strict and delegates last-mode completion to the finalizer', () => {
    const run = makeRun({ verdict_mode: 'last' });
    try {
      const tracePath = path.join(run.bundle, 'rb_trace.jsonl');
      recordCheck(tracePath, { gate: 'sample', passed: false, expected: true, detail: 'before repair' });
      recordCheck(tracePath, { gate: 'sample', passed: true, expected: true, detail: 'after repair' });
      const rows = readFileSync(tracePath, 'utf8').trim().split('\n').map(JSON.parse);
      assert.deepEqual(rows.map((row) => row.source), ['playbook', 'playbook']);
      assert.ok(rows.every((row) => typeof row.expected === 'boolean'));

      const completion = verdict(tracePath, 'last', { contextPath: run.contextPath });
      assert.equal(completion.outcome, 'PASS');
      assert.equal(completion.checks_total, 2);
      assert.equal(completion.checks_considered, 1);
      AgentExperimentCompletionSchema.parse(JSON.parse(readFileSync(path.join(run.root, 'agent-experiment-completion.json'), 'utf8')));
      assert.throws(() => verdict(tracePath, 'last', { contextPath: run.contextPath }), /already exists/);
    } finally { rmSync(run.root, { recursive: true, force: true }); }
  });

  it('rejects helper/context mode drift before native publication', () => {
    const run = makeRun({ verdict_mode: 'last' });
    try {
      recordCheck(path.join(run.bundle, 'rb_trace.jsonl'), { gate: 'sample', passed: true });
      assert.throws(() => verdict(path.join(run.bundle, 'rb_trace.jsonl'), 'all', { contextPath: run.contextPath }), /verdict mode mismatch/);
    } finally { rmSync(run.root, { recursive: true, force: true }); }
  });

  it('retires playbook-local thin audit and cleanup without deleting the bundle', () => {
    const run = makeRun();
    try {
      assert.throws(() => recordVerdict(), /retired/);
      assert.throws(() => cleanup(run.bundle), /retired/);
      assert.equal(realpathSync(run.bundle), run.bundle);
    } finally { rmSync(run.root, { recursive: true, force: true }); }
  });
});

function makeRun(policyOverrides = {}) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'wff-native-finalizer-')));
  const bundle = path.join(root, 'dpt_disp_case-1_verdict');
  mkdirSync(path.join(root, '_playbook_state'));
  mkdirSync(bundle);
  writeFileSync(path.join(bundle, 'rb_trace.jsonl'), '');
  const runId = randomUUID();
  const digest = sha256Bytes(Buffer.from('fixture'));
  const contextPath = path.join(root, 'agent-experiment-run.json');
  const context = {
    schema_version: 'agent-experiment-run/v1', run_id: runId, mode: 'headless_agent', created_at: new Date().toISOString(),
    manifest_path: path.join(REPO_ROOT, 'experiments_playbook/PLAYBOOK_MANIFEST.md'), manifest_sha256: digest,
    instruction_path: path.join(REPO_ROOT, 'experiments_playbook/RUN_AGENT_AUTORUN_EXPS.md'), instruction_sha256: digest,
    source_playbook_path: path.join(REPO_ROOT, 'experiments_playbook/exp_agentic-queue/case-41-light-minimal-path.md'), source_playbook_sha256: digest,
    rendered_playbook_path: path.join(root, 'rendered-playbook.md'), rendered_playbook_sha256: digest,
    case: 'case-1-light-sample', experiment: 'sample', cost: 'light',
    policy: {
      verdict_mode: 'all', required_checks: ['sample'], bundle_roles: ['verdict'], verdict_role: 'verdict', health_roles: ['verdict'],
      health_profile: 'light', durable_evidence_roles: [], proof_subject: 'deterministic_contract', subject_execution: 'none', fixture: 'fixture_backed',
      runtime: 'real_disposable_bundle', external_calls: 'none', verdict_judge: 'deterministic',
      ...policyOverrides,
    },
    repo_command_root: REPO_ROOT, framework_root: path.join(REPO_ROOT, 'DPT_FRAMEWORK'), case_run_root: root,
    case_root_identity: caseRootIdentity(root), completion_path: path.join(root, 'agent-experiment-completion.json'),
  };
  writeFileSync(contextPath, `${JSON.stringify(context, null, 2)}\n`);
  writeFileSync(path.join(root, '_playbook_state/bundles.json'), `${JSON.stringify({
    schema_version: 'agent-experiment-bundles/v1', run_id: runId, bundles: [{ role: 'verdict', path: bundle }],
  }, null, 2)}\n`);
  return { root, bundle, contextPath };
}
