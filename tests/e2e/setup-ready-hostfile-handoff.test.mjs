// @impl PHS-005, PRP-012
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const bundles = join(root, 'tests', '.test-bundles');
const created = [];
const instantiate = join(root, 'experiments_env/shared/new-disposable-bundle.mjs');
const gate = join(root, 'DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs');
const enter = join(root, 'DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs');
const ALIGNMENT_SNAPSHOT = '已记录：按确认的研究目标、对象、用途、范围和透明默认值继续。';

function run(script, args) {
  return spawnSync('node', [script, ...args], { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });
}

function createBundle(label) {
  const name = `e2e_setup_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const result = run(instantiate, [name, '--force', '--target-dir', bundles]);
  assert.equal(result.status, 0, result.stderr);
  const bundle = result.stdout.trim();
  created.push(bundle);
  const profile = [
    `plan_basename: ${name}`,
    'research_profile: quick_factual',
    'root_must_answer_set:',
    '  - "Q"',
    'research_access:',
    '  status: available',
    '  probed_at: "2026-08-11T00:00:00.000Z"',
    '  sample_observations:',
    '    - { sample_id: gov_cn, source_group: china, outcome: content, retrieval_surface: native }',
    '    - { sample_id: gitee, source_group: china, outcome: failed }',
    '    - { sample_id: xinhuanet, source_group: china, outcome: failed }',
    '    - { sample_id: cnki_catalog, source_group: china, outcome: failed }',
    '    - { sample_id: wikipedia, source_group: overseas, outcome: failed }',
    '    - { sample_id: github, source_group: overseas, outcome: failed }',
    '    - { sample_id: iana, source_group: overseas, outcome: failed }',
    '    - { sample_id: arxiv, source_group: overseas, outcome: failed }',
    '    - { sample_id: rfc_editor, source_group: overseas, outcome: failed }',
    'human_decision_checkpoints:',
    '  hitl1:',
    '    status: recorded',
    '    recorded_at: "2026-07-22T00:00:00.000Z"',
    '  hitl2:',
    '    status: not_started',
    '    answerability_class: not_assessed',
    '    user_decision: not_started',
    '    final_report_view: not_started',
    '',
  ].join('\n');
  writeFileSync(join(bundle, 'rb_profile.yaml'), profile);
  const planPath = join(bundle, 'rb_plan.md');
  const withAlignment = readFileSync(planPath, 'utf8').replace(
    /### HITL1 Alignment Snapshot\n\(待填充[^)]*\)/,
    `### HITL1 Alignment Snapshot\n${ALIGNMENT_SNAPSHOT}`,
  );
  writeFileSync(planPath, withAlignment
    .replace(/\(待填充[^)]*\)/g, '(filled)')
    .replace(/\(尚无话题[^)]*\)/g, '(filled)'));
  return bundle;
}

describe('setup-ready host-file handoff', () => {
  after(() => created.forEach((bundle) => rmSync(bundle, { recursive: true, force: true })));

  it('binds actual final plan bytes before legal Seed Topics entry', () => {
    const bundle = createBundle('pass');
    assert.match(readFileSync(join(bundle, 'rb_plan.md'), 'utf8'), new RegExp(`### HITL1 Alignment Snapshot\\n${ALIGNMENT_SNAPSHOT}`));
    const result = run(gate, ['--bundle', bundle, '--current-node', 'phases/phase-setup.md']);
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true);
    const trace = readFileSync(join(bundle, 'rb_trace.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    const attempt = trace.findLast((event) => event.event === 'gate_attempt' && event.gate === 'setup-ready');
    assert.ok(attempt?.gate_attempt_id);
    assert.match(attempt.checkpoint_ref, /^_checkpoints\/[^/]+\.json$/);
    const checkpoint = JSON.parse(readFileSync(join(bundle, attempt.checkpoint_ref), 'utf8'));
    assert.equal(checkpoint.trigger, 'setup_route_pending');
    assert.equal(checkpoint.route_state, 'pending');
    assert.equal(checkpoint.gate_attempt_id, attempt.gate_attempt_id);
    assert.equal(checkpoint.hashes['rb_plan.md'].sha256, attempt.plan_sha256);
    const boundPlanBytes = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
    assert.match(boundPlanBytes, new RegExp(`### HITL1 Alignment Snapshot\\n${ALIGNMENT_SNAPSHOT}`));
    assert.equal(attempt.plan_sha256, createHash('sha256').update(boundPlanBytes).digest('hex'));

    const entered = run(enter, ['--bundle', bundle, '--node', output.check.next]);
    assert.equal(entered.status, 0, entered.stdout + entered.stderr);
  });

  it('refuses a route whose recorded plan bytes drift after checkpoint', () => {
    const bundle = createBundle('drift');
    const result = run(gate, ['--bundle', bundle, '--current-node', 'phases/phase-setup.md']);
    assert.equal(result.status, 0, result.stderr);
    const planPath = join(bundle, 'rb_plan.md');
    writeFileSync(planPath, `${readFileSync(planPath, 'utf8')}\nDrift\n`);
    const entered = run(enter, ['--bundle', bundle, '--node', 'phases/phase-seed-topics.md']);
    assert.notEqual(entered.status, 0);
    assert.match(entered.stdout, /hashes do not agree/);
  });
});
