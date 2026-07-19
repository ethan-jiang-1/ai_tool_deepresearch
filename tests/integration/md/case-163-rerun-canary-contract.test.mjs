import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { queueItemForWorkUnit } from '../../../experiments_env/shared/work-unit-playbook-utils.mjs';

const REPO_ROOT = join(import.meta.dirname, '../../..');
const SUITE_DIR = join(REPO_ROOT, 'experiments_playbook/exp_evidence-extraction');
const CASE_FILE = join(SUITE_DIR, 'case-163-heavy-rerun-add-real-cache-trail.md');

describe('case-163 rerun continuation canary contract', () => {
  const playbook = readFileSync(CASE_FILE, 'utf8');
  const readme = readFileSync(join(SUITE_DIR, 'README.md'), 'utf8');
  const registry = readFileSync(join(REPO_ROOT, 'experiments_playbook/PLAYBOOK_MANIFEST.md'), 'utf8');
  const fixtureRunner = readFileSync(join(REPO_ROOT, 'experiments_env/shared/run-fixture-backed-case.mjs'), 'utf8');

  it('keeps one existing rerun-add canary rather than adding a second case', () => {
    const rerunAddCases = readdirSync(SUITE_DIR).filter((name) => /case-\d+.*rerun-add.*\.md$/.test(name));
    assert.deepEqual(rerunAddCases, ['case-163-heavy-rerun-add-real-cache-trail.md']);
  });

  it('limits fixture authority to historical normal-run prerequisites', () => {
    assert.match(playbook, /historical fixture[\s\S]*prerequisite only/i);
    assert.match(playbook, /No fixture may prewrite either new Topic's result, receipt, cache leaf, evidence\/reference output, `source\.yaml`, depth review, ledger row, or recovery row/i);
    assert.match(playbook, /Historical fixture rows are excluded from real-Agent checks/i);
    assert.doesNotMatch(playbook, /Optional Automation Smoke/);
  });

  it('proves the historical prerequisite under one unchanged bounded profile', () => {
    assert.match(playbook, /research_profile: debug/);
    assert.match(playbook, /apply-research-style\.mjs --bundle "\$B" --style debug/);
    assert.match(playbook, /inspect-wave0-output\.mjs --bundle "\$B" > "\$B\/case-163-history-wave0-inspect\.json"/);
    assert.match(playbook, /inspect-wave1-output\.mjs --bundle "\$B" > "\$B\/case-163-history-wave1-inspect\.json"/);
    assert.match(playbook, /both production Wave inspectors pass the historical prerequisite under the unchanged `debug` profile/i);
    assert.match(playbook, /00-shared-\$\{topic\.slug\}\.md[\s\S]*wave1_topic/);
  });

  it('adds two Topics through the real rerun and normal Wave0/Wave1 path', () => {
    assert.match(playbook, /check-gate-hitl2-recorded\.mjs/);
    assert.match(playbook, /operate-topic-state\.mjs apply/);
    assert.match(playbook, /economic-impact/);
    assert.match(playbook, /workforce-transition/);
    assert.match(playbook, /wave0_source_intake/);
    assert.match(playbook, /wave1_topic_deepening/);
    assert.match(playbook, /open-batch "\$B" --phase wave0 --reason rerun_added_topics/);
    assert.match(playbook, /open-batch "\$B" --phase wave1 --reason rerun_added_topics/);
    assert.match(playbook, /Authorized Source-Ref Lineage/);
    assert.match(playbook, /prior submitted `evidence_summary`/i);
    assert.match(playbook, /minimal depth reviews/i);
    assert.match(playbook, /override the fixture defaults/i);
    assert.match(playbook, /A task that still says `Fixture-backed controlled work-unit task` or shares `reference\/work-unit-fixture\.md` is setup failure/i);
    assert.match(playbook, /render every reference from the loaded shared reference semantic contract/i);
    assert.match(playbook, /relationship: supports\|refutes\|partial\|opens\|defers\|context/);
    assert.match(playbook, /status: supported\|refuted\|partial\|open\|emergent\|deferred/);
  });

  it('lets the shared helper project real task action and unique write coordinates', () => {
    const task = queueItemForWorkUnit({
      phase: 'wave0',
      queue_item_id: 'case163-real-topic',
      topic_slug: '03_economic-impact',
      action: 'Perform real source intake for 03_economic-impact.',
      writes_to: [
        'reference/00-shared-03_economic-impact.md',
        'artifacts/wave0/03_economic-impact/source.yaml',
      ],
    });
    assert.equal(task.action, 'Perform real source intake for 03_economic-impact.');
    assert.deepEqual(task.writes_to, [
      'reference/00-shared-03_economic-impact.md',
      'artifacts/wave0/03_economic-impact/source.yaml',
    ]);
  });

  it('requires hint-only repair and existing-owner hash-identical recovery', () => {
    assert.match(playbook, /use the primary `hints\[\]` only/i);
    assert.match(playbook, /repair_kind\/missing_fact\/write_to\/rerun|`repair_kind`, `missing_fact`, `write_to`, and `rerun`/);
    assert.match(playbook, /recover-declaration "\$B" --work-id/);
    assert.match(playbook, /restored row is byte-semantically\/hash identical/i);
    assert.match(playbook, /Reconstruction facts do not make the Gate pass/i);
  });

  it('injects the declaration fault before the first formal Wave1 PASS', () => {
    const runtimeStart = playbook.indexOf('## Step 8:');
    const runtimeEnd = playbook.indexOf('## Step 10:');
    const runtime = playbook.slice(runtimeStart, runtimeEnd);
    const inspect = runtime.indexOf('inspect-wave1-output.mjs');
    const completion = runtime.indexOf('log-event.mjs --bundle "$B" --event wave1_completion');
    const faultGate = runtime.indexOf('case-163-wave1-missing-declaration.json');
    const recovery = runtime.indexOf('recover-declaration "$B" --work-id');
    const restoredGate = runtime.indexOf('case-163-wave1-restored.json');

    assert.ok(runtimeStart >= 0 && runtimeEnd > runtimeStart);
    assert.ok(inspect >= 0 && completion > inspect);
    assert.ok(faultGate > completion);
    assert.ok(recovery > faultGate);
    assert.ok(restoredGate > recovery);
    assert.doesNotMatch(runtime.slice(0, faultGate), /case-163-wave1-pre-fault\.json/);
    assert.match(playbook, /no successful formal Wave1 Gate attempt or Wave2 handoff exists before fault injection/i);
    assert.match(playbook, /same normal Wave1 Gate reaches its first PASS/i);
  });

  it('keeps real capability and verdict boundaries explicit', () => {
    assert.match(playbook, /Agent\/sub-agent plus search\/fetch capability is unavailable[\s\S]*`NOT_RUN`/i);
    assert.match(playbook, /Do not hardcode `passed: true`/);
    assert.match(playbook, /FAIL and NOT_RUN preserve the bundle/);
    assert.match(playbook, /There is intentionally no fixture-backed automation command that can turn this heavy canary green/);
    assert.match(fixtureRunner, /case-163 is a multi-stage real-Agent continuation canary and cannot be reduced to one fixture-backed result import/);
    assert.match(fixtureRunner, /ignored_real_result_argument: Boolean\(opts\.realResult\)/);
  });

  it('synchronizes suite and runner registry descriptions', () => {
    assert.match(readme, /case-163[\s\S]*adds two Topics[\s\S]*Wave0\/Wave1[\s\S]*hash-identical declaration recovery/i);
    assert.match(registry, /case-163[\s\S]*real rerun add 2 Topics[\s\S]*hint-only same-Gate repair[\s\S]*hash-identical recovery/i);
  });
});
