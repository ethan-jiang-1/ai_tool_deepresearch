// reconcile-plan-progress CLI — Engine-owned presentation rebuild (PHS-006/PHS-010)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const REPO_ROOT = process.cwd();
const CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/reconcile-plan-progress.mjs');
const AUDIT_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs');

after(cleanupAll);

function makeBundle(label) {
  const bundle = createTempDir(label);
  mkdirSync(join(bundle, 'final'), { recursive: true });
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
    bundle: label,
    current_mode: 'execution',
    state: 'in_progress',
    current_gate: 'readiness_passed',
    next_gate: 'none',
  }, null, 2));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), '');
  return bundle;
}

// Two rerun cycles then a final readiness — every gate_attempt has a
// route-bound load_complete so candidateLegalWindows admits it, and the final
// phase_transition witnesses the status window (readiness_passed / none).
function twoRerunTrace() {
  const events = [];
  const pushGate = (gate, node, next, ts) => {
    const idx = events.length;
    events.push({
      ts, event: 'gate_attempt', gate,
      phase: node.replace('phases/phase-', '').replace('.md', ''),
      passed: true, currentNodeRef: node, next,
    });
    events.push({
      ts: ts.replace(/000Z$/, '001Z'), event: 'load_complete', entry: next,
      handoff_source_gate: gate, handoff_source_node: node,
      handoff_target_node: next, handoff_source_attempt_index: idx,
    });
  };
  // baseline
  pushGate('instantiation-complete', 'phases/phase-instantiation.md', 'phases/phase-hitl1.md', '2026-01-01T00:00:00.000Z');
  pushGate('hitl1-recorded', 'phases/phase-hitl1.md', 'phases/phase-setup.md', '2026-01-01T00:00:01.000Z');
  pushGate('setup-ready', 'phases/phase-setup.md', 'phases/phase-seed-topics.md', '2026-01-01T00:00:02.000Z');
  pushGate('seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md', '2026-01-01T00:00:03.000Z');
  pushGate('rerun-ready', 'phases/phase-rerun.md', 'phases/phase-seed-topics.md', '2026-01-01T00:00:04.000Z'); // spawn cycle 1
  // cycle 1
  pushGate('seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md', '2026-01-01T00:00:05.000Z');
  pushGate('wave0-complete', 'phases/phase-wave0.md', 'phases/phase-wave1.md', '2026-01-01T00:00:06.000Z');
  pushGate('wave1-complete', 'phases/phase-wave1.md', 'phases/phase-wave2.md', '2026-01-01T00:00:07.000Z');
  pushGate('wave2-complete', 'phases/phase-wave2.md', 'phases/phase-hitl2.md', '2026-01-01T00:00:08.000Z');
  pushGate('hitl2-recorded', 'phases/phase-hitl2.md', 'phases/phase-readiness.md', '2026-01-01T00:00:09.000Z');
  pushGate('rerun-ready', 'phases/phase-rerun.md', 'phases/phase-seed-topics.md', '2026-01-01T00:00:10.000Z'); // spawn cycle 2
  // cycle 2
  pushGate('seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md', '2026-01-01T00:00:11.000Z');
  pushGate('wave0-complete', 'phases/phase-wave0.md', 'phases/phase-wave1.md', '2026-01-01T00:00:12.000Z');
  pushGate('wave1-complete', 'phases/phase-wave1.md', 'phases/phase-wave2.md', '2026-01-01T00:00:13.000Z');
  pushGate('wave2-complete', 'phases/phase-wave2.md', 'phases/phase-hitl2.md', '2026-01-01T00:00:14.000Z');
  pushGate('hitl2-recorded', 'phases/phase-hitl2.md', 'phases/phase-readiness.md', '2026-01-01T00:00:15.000Z');
  pushGate('readiness-passed', 'phases/phase-readiness.md', 'phases/phase-final.md', '2026-01-01T00:00:16.000Z');
  events.push({
    ts: '2026-01-01T00:00:17.000Z',
    event: 'phase_transition',
    from: 'wave2_complete',
    to: 'readiness_passed',
    next: 'none',
  });
  return events;
}

const FROZEN_PLAN = [
  '# plan',
  '## Progress',
  '',
  '<!-- frozen: only setup-ready was ever flipped by the pre-change engine -->',
  '- [ ] instantiation-complete',
  '- [ ] hitl1-recorded',
  '- [x] setup-ready (2026-01-01T00:00:02.000Z)',
  '- [ ] seed-topics-ready',
  '- [ ] wave0-complete',
  '- [ ] wave1-complete',
  '- [ ] wave2-complete',
  '- [ ] hitl2-recorded',
  '- [ ] readiness-passed',
  '- [ ] rerun-ready',
  '',
  '## Decisions',
  '',
  'x',
].join('\n');

function runReconcile(bundle) {
  return spawnSync('node', [CLI, '--bundle', bundle], { encoding: 'utf-8', timeout: 10000 });
}

function runAudit(bundle) {
  return spawnSync('node', [AUDIT_CLI, '--bundle', bundle], { encoding: 'utf-8', timeout: 10000 });
}

describe('reconcile-plan-progress CLI', () => {
  it('rebuilds baseline + cycle blocks from trace witnesses, is idempotent, and stays tamper-free', () => {
    const bundle = makeBundle('reconcile-two-reruns');
    writeFileSync(join(bundle, 'rb_trace.jsonl'), twoRerunTrace().map((e) => JSON.stringify(e)).join('\n') + '\n');
    writeFileSync(join(bundle, 'rb_plan.md'), FROZEN_PLAN);

    const first = runReconcile(bundle);
    assert.equal(first.status, 0, first.stderr);
    const firstOut = JSON.parse(first.stdout);
    assert.equal(firstOut.outcome, 'committed');
    assert.equal(firstOut.baselineCount, 10);
    assert.equal(firstOut.cycleCount, 2);
    assert.deepEqual(firstOut.post_rebuild_tamper, []);

    const plan = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
    // Baseline fully derived from witnesses; mutual-exit lines stay per window.
    assert.match(plan, /- \[x\] instantiation-complete \(2026-01-01T00:00:00\.000Z\)/);
    assert.match(plan, /- \[x\] rerun-ready \(2026-01-01T00:00:04\.000Z\)/); // baseline rerun spawns cycle 1
    assert.match(plan, /- \[ \] readiness-passed/); // baseline ended in rerun
    // Cycle 1: gates through hitl2 checked; rerun-ready checked by the pass that spawned cycle 2.
    const cycle1 = plan.split('### Rerun cycle 1')[1].split('### Rerun cycle 2')[0];
    assert.match(cycle1, /- \[x\] wave0-complete \(2026-01-01T00:00:06\.000Z\)/);
    assert.match(cycle1, /- \[x\] rerun-ready \(2026-01-01T00:00:10\.000Z\)/);
    assert.match(cycle1, /- \[ \] readiness-passed/);
    // Cycle 2: readiness chosen, no further rerun.
    const cycle2 = plan.split('### Rerun cycle 2')[1].split('## Decisions')[0];
    assert.match(cycle2, /- \[x\] readiness-passed \(2026-01-01T00:00:16\.000Z\)/);
    assert.match(cycle2, /- \[ \] rerun-ready/);

    // Idempotent: a second run must report unchanged (same bytes).
    const second = runReconcile(bundle);
    const secondOut = JSON.parse(second.stdout);
    assert.equal(secondOut.outcome, 'unchanged');

    // Audit agrees: passed, no tamper, no advisory.
    const audit = runAudit(bundle);
    const auditOut = JSON.parse(audit.stdout);
    assert.equal(audit.status, 0, JSON.stringify(auditOut));
    assert.equal(auditOut.outcome, 'passed');
    assert.ok(!auditOut.advisory || auditOut.advisory.length === 0, 'rebuilt Progress must surface no stale advisory');
    assert.ok(!auditOut.integrity, 'rebuilt Progress must not trigger tamper');
  });

  it('reports failed on a missing plan and refuses to fabricate state', () => {
    const bundle = makeBundle('reconcile-missing-plan');
    writeFileSync(join(bundle, 'rb_trace.jsonl'), twoRerunTrace().map((e) => JSON.stringify(e)).join('\n') + '\n');
    const result = runReconcile(bundle);
    assert.equal(result.status, 1);
    const out = JSON.parse(result.stdout);
    assert.equal(out.outcome, 'failed');
    assert.equal(out.reason, 'plan_missing');
  });
});
