// deterministic_e2e — Progress grows per rerun cycle across the full lifecycle
// @impl PHS-006, PHS-010
// Chain: a fresh bundle is driven through the complete manifest lifecycle with
// the exact Engine writer the gate CLIs invoke (writePlanProgress) plus the
// matching legal trace (gate_attempt + route-bound load_complete) across the
// baseline, rerun cycle 1, rerun cycle 2, and a final readiness. Then
// reconcile must reproduce the identical state (idempotent agreement) and the
// audit CLI must report passed with no tamper/advisory. The real gate-CLI
// wiring (flip + checkpoint hash) is covered by
// tests/integration/cli/check-gate-progress-flip.test.mjs.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { writePlanProgress, CYCLE_PROGRESS_GATES } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';
import { createTempRoot, runNode, parseJsonOutput, instantiateBundle } from './helpers/deterministic-chain-harness.mjs';

const REPO_ROOT = process.cwd();
const RECONCILE_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/reconcile-plan-progress.mjs');
const AUDIT_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs');

const createdRoots = [];
after(() => { for (const root of createdRoots) rmSync(root, { recursive: true, force: true }); });

// Manifest lifecycle order for a baseline run ending in a rerun decision.
const BASELINE_GATES = [
  'instantiation-complete',
  'hitl1-recorded',
  'setup-ready',
  'seed-topics-ready',
  'wave0-complete',
  'wave1-complete',
  'wave2-complete',
  'hitl2-recorded',
  'rerun-ready',
];

// Simulates what a gate pass + enter-phase emit: gate_attempt (writer=engine)
// followed by its route-bound load_complete, with monotonically increasing ts.
function traceEmitter() {
  const events = [];
  let tick = 0;
  const ts = () => `2026-01-01T00:00:${String(Math.floor(tick / 1000)).padStart(2, '0')}.${String(tick % 1000).padStart(3, '0')}Z`;
  return {
    events,
    pass(gate, node, next) {
      const idx = events.length;
      events.push({
        ts: ts(),
        event: 'gate_attempt',
        gate,
        phase: node.replace('phases/phase-', '').replace('.md', ''),
        passed: true,
        currentNodeRef: node,
        next,
      });
      tick += 1;
      events.push({
        ts: ts(),
        event: 'load_complete',
        entry: next,
        handoff_source_gate: gate,
        handoff_source_node: node,
        handoff_target_node: next,
        handoff_source_attempt_index: idx,
      });
      tick += 1;
    },
  };
}

const NODE = {
  'instantiation-complete': ['phases/phase-instantiation.md', 'phases/phase-hitl1.md'],
  'hitl1-recorded': ['phases/phase-hitl1.md', 'phases/phase-setup.md'],
  'setup-ready': ['phases/phase-setup.md', 'phases/phase-seed-topics.md'],
  'seed-topics-ready': ['phases/phase-seed-topics.md', 'phases/phase-wave0.md'],
  'wave0-complete': ['phases/phase-wave0.md', 'phases/phase-wave1.md'],
  'wave1-complete': ['phases/phase-wave1.md', 'phases/phase-wave2.md'],
  'wave2-complete': ['phases/phase-wave2.md', 'phases/phase-hitl2.md'],
  'hitl2-recorded': ['phases/phase-hitl2.md', 'phases/phase-readiness.md'],
  'readiness-passed': ['phases/phase-readiness.md', 'phases/phase-final.md'],
  'rerun-ready': ['phases/phase-rerun.md', 'phases/phase-seed-topics.md'],
};

function progressSection(plan) {
  return plan.split('## Progress')[1].split('## Decisions')[0];
}

describe('plan progress rerun-cycle growth (deterministic e2e)', () => {
  it('grows baseline + two cycle blocks through the lifecycle and reconcile agrees', () => {
    const root = createTempRoot();
    createdRoots.push(root);
    const bundleDir = instantiateBundle(root, 'prog-e2e');

    const emitter = traceEmitter();
    const pass = (gate) => {
      writePlanProgress(bundleDir, gate);
      const [node, next] = NODE[gate];
      emitter.pass(gate, node, next);
    };

    // Baseline: instantiation -> hitl2 -> rerun-ready (spawns cycle 1).
    for (const gate of BASELINE_GATES) pass(gate);
    // Rerun cycle 1: seed-topics -> hitl2 -> rerun-ready (spawns cycle 2).
    for (const gate of CYCLE_PROGRESS_GATES.slice(0, 5)) pass(gate);
    pass('rerun-ready');
    // Rerun cycle 2: seed-topics -> hitl2 -> readiness (run ends).
    for (const gate of CYCLE_PROGRESS_GATES.slice(0, 5)) pass(gate);
    pass('readiness-passed');

    // Persist the legal trace and align status with the final window so the
    // audit can consume it (as enter-phase/advance-status would).
    writeFileSync(join(bundleDir, 'rb_trace.jsonl'), emitter.events.map((e) => JSON.stringify(e)).join('\n') + '\n');
    mkdirSync(join(bundleDir, 'final'), { recursive: true });
    writeFileSync(join(bundleDir, 'rb_status.json'), JSON.stringify({
      bundle: bundleDir.split('/').pop(),
      current_mode: 'execution',
      state: 'completed',
      current_gate: 'readiness_passed',
      next_gate: 'none',
    }, null, 2));
    emitter.events.push({
      ts: '2026-01-01T00:01:00.000Z',
      event: 'phase_transition',
      from: 'wave2_complete',
      to: 'readiness_passed',
      next: 'none',
    });
    writeFileSync(join(bundleDir, 'rb_trace.jsonl'), emitter.events.map((e) => JSON.stringify(e)).join('\n') + '\n');

    const plan = readFileSync(join(bundleDir, 'rb_plan.md'), 'utf8');
    const section = progressSection(plan);

    // Baseline: all baseline gates checked, mutual-exit readiness unchecked.
    for (const gate of BASELINE_GATES) {
      assert.match(section, new RegExp(`- \\[x\\] ${gate} \\(\\d{4}-\\d{2}-\\d{2}T`), `baseline ${gate} must be checked`);
    }
    assert.match(section, /- \[ \] readiness-passed/);

    // Exactly two cycle blocks; cycle 2 rerun-ready unchecked (no third rerun).
    assert.equal((section.match(/### Rerun cycle /g) || []).length, 2);
    const cycle2 = section.split('### Rerun cycle 2')[1];
    assert.match(cycle2, /- \[x\] readiness-passed \(\d{4}-\d{2}-\d{2}T/);
    assert.match(cycle2, /- \[ \] rerun-ready/);

    // Reconcile normalizes timestamps to trace witnesses on the first run
    // (writer stamps pass time, trace stamps attempt time — close but not
    // byte-identical), then is idempotent: a second run is unchanged. The
    // checked/block STRUCTURE must survive unchanged.
    const firstReconcile = parseJsonOutput(runNode([RECONCILE_CLI, '--bundle', bundleDir]));
    assert.ok(['committed', 'unchanged'].includes(firstReconcile.outcome), JSON.stringify(firstReconcile));
    const rebuilt = readFileSync(join(bundleDir, 'rb_plan.md'), 'utf8');
    const rebuiltSection = progressSection(rebuilt);
    for (const gate of BASELINE_GATES) {
      assert.match(rebuiltSection, new RegExp(`- \\[x\\] ${gate} \\(\\d{4}-\\d{2}-\\d{2}T`), `rebuilt baseline ${gate} must be checked`);
    }
    assert.equal((rebuiltSection.match(/### Rerun cycle /g) || []).length, 2);
    assert.match(rebuiltSection.split('### Rerun cycle 2')[1], /- \[ \] rerun-ready/);
    const secondReconcile = parseJsonOutput(runNode([RECONCILE_CLI, '--bundle', bundleDir]));
    assert.equal(secondReconcile.outcome, 'unchanged', JSON.stringify(secondReconcile));

    // Audit: passed, no tamper, no stale advisory.
    const audit = parseJsonOutput(runNode([AUDIT_CLI, '--bundle', bundleDir]));
    assert.equal(audit.outcome, 'passed', JSON.stringify(audit));
    assert.ok(!audit.integrity, 'no blocking integrity outcome expected');
    assert.ok(!audit.advisory || audit.advisory.length === 0, 'no stale advisory expected');
  });
});
