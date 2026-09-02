// @impl CPT-006, CPT-009, RWG-023, CDP-009, PHS-010
// Deterministic E2E on a real production CLI chain and a disposable bundle:
// the wave0-to-final bypass shape is self-defeating. Fixtures below are
// labelled simulated Agent actions; they make no claim about real research
// quality or real chat behavior.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  cleanupRoot,
  createTempRoot,
  enterPhase,
  instantiateBundle,
  parseJsonOutput,
  readStatus,
  runGate,
  runNode,
} from './helpers/deterministic-chain-harness.mjs';

const REPO_ROOT = process.cwd();
const AUDIT_CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs');

const roots = [];
after(() => {
  for (const root of roots) cleanupRoot(root);
});

function witnessedHandoff({ sourceGate, sourceNode, targetNode, phase, currentGate, nextGate, ts }) {
  // Simulated Agent actions: a deterministic witnessed handoff chain.
  return [
    {
      ts,
      event: 'gate_attempt',
      gate: sourceGate,
      phase,
      passed: true,
      currentNodeRef: sourceNode,
      next: targetNode,
    },
    {
      ts: ts.replace('00:00:00', '00:00:01'),
      event: 'load_complete',
      entry: targetNode,
      handoff_source_gate: sourceGate,
      handoff_source_node: sourceNode,
      handoff_target_node: targetNode,
      handoff_source_attempt_index: 0,
    },
    {
      ts: ts.replace('00:00:00', '00:00:02'),
      event: 'phase_transition',
      from: 'previous',
      to: currentGate,
      next: nextGate,
    },
  ];
}

function audit(bundle) {
  const result = runNode([AUDIT_CLI, '--bundle', bundle], { expectedStatus: 1 });
  return parseJsonOutput(result);
}

describe('lifecycle bypass detection e2e', { concurrency: false }, () => {
  it('makes the wave0-to-final bypass self-defeating on a disposable bundle', () => {
    const root = createTempRoot();
    roots.push(root);
    const bundle = instantiateBundle(root, 'bypass');

    // Simulated legal approach into Wave1: witnessed seed-topics -> wave0 -> wave1.
    writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
      bundle: 'e2e-bypass',
      current_mode: 'execution',
      state: 'in_progress',
      current_gate: 'wave0_complete',
      next_gate: 'wave1_complete',
      current_node: 'phases/phase-wave1.md',
    }, null, 2));
    writeFileSync(join(bundle, 'rb_trace.jsonl'), [
      ...witnessedHandoff({
        sourceGate: 'seed-topics-ready', sourceNode: 'phases/phase-seed-topics.md',
        targetNode: 'phases/phase-wave0.md', phase: 'seed-topics',
        currentGate: 'seed_topics_ready', nextGate: 'wave0_complete',
        ts: '2026-01-01T00:00:00.000Z',
      }),
      ...witnessedHandoff({
        sourceGate: 'wave0-complete', sourceNode: 'phases/phase-wave0.md',
        targetNode: 'phases/phase-wave1.md', phase: 'wave0',
        currentGate: 'wave0_complete', nextGate: 'wave1_complete',
        ts: '2026-01-01T00:05:00.000Z',
      }),
    ].map((event) => JSON.stringify(event)).join('\n') + '\n');

    // Legal entry into Wave1: clean projection adds no integrity block.
    const firstEntry = enterPhase(bundle, 'phases/phase-wave1.md');
    assert.doesNotMatch(firstEntry.stdout, /DPT_LIFECYCLE_INTEGRITY_START/);
    assert.equal(readStatus(bundle).current_node, 'phases/phase-wave1.md');

    // Simulated bypass: hand-written final report plus hand-checked Progress boxes.
    const prematurePath = join(bundle, 'final/final.md');
    writeFileSync(prematurePath, '# hand-written final research report\n');
    const planPath = join(bundle, 'rb_plan.md');
    let plan = readFileSync(planPath, 'utf-8');
    assert.match(plan, /- \[ \] wave1-complete/);
    plan = plan.replace('- [ ] wave1-complete', '- [x] wave1-complete')
      .replace('- [ ] wave2-complete', '- [x] wave2-complete');
    writeFileSync(planPath, plan);

    // Resume touch surfaces the drift without changing entry facts.
    const resumeEntry = enterPhase(bundle, 'phases/phase-wave1.md');
    assert.match(resumeEntry.stdout, /DPT_LIFECYCLE_INTEGRITY_START/);
    assert.match(resumeEntry.stdout, /outcome: premature_final_present/);
    assert.match(resumeEntry.stdout, /outcome: plan_progress_tamper_suspected/);
    assert.equal(readStatus(bundle).current_node, 'phases/phase-wave1.md');

    // The Wave1 gate is blocked by the premature root with one legal remedy.
    const blocked = runGate(bundle, 'wave1-complete', 'phases/phase-wave1.md', { expectedStatus: 1 });
    assert.match(blocked.output.inspect.join('\n'), /premature_final_present/);
    assert.match(blocked.output.advice.join('\n'), /final\/attic-<original-name>/);
    assert.equal(readFileSync(prematurePath, 'utf-8'), '# hand-written final research report\n');

    // One audit run reports both integrity facts with single remediations.
    const driftAudit = audit(bundle);
    assert.equal(driftAudit.outcome, 'premature_final_present');
    assert.deepEqual(driftAudit.integrity.outcomes, ['premature_final_present', 'plan_progress_tamper_suspected']);
    assert.match(driftAudit.integrity.remediation.join('\n'), /final\/attic-<original-name>/);
    assert.match(driftAudit.integrity.remediation.join('\n'), /Engine-owned presentation/);

    // Simulated repair: relocate out of canonical naming, uncheck hand-set boxes.
    writeFileSync(join(bundle, 'final/attic-final.md'), readFileSync(prematurePath, 'utf-8'));
    rmSync(prematurePath);
    assert.equal(existsSync(prematurePath), false);
    plan = readFileSync(planPath, 'utf-8')
      .replace('- [x] wave1-complete', '- [ ] wave1-complete')
      .replace('- [x] wave2-complete', '- [ ] wave2-complete');
    writeFileSync(planPath, plan);

    // The premature root no longer fails the gate (remaining contract roots may).
    const rerun = runGate(bundle, 'wave1-complete', 'phases/phase-wave1.md', { expectedStatus: 1 });
    assert.doesNotMatch(rerun.output.inspect.join('\n'), /premature_final_present/);

    // The audit projection is clean again on the current truth.
    const cleanAudit = runNode([AUDIT_CLI, '--bundle', bundle], { expectedStatus: 0 });
    const cleanOutput = parseJsonOutput(cleanAudit);
    assert.equal(cleanOutput.outcome, 'passed');
    assert.equal(cleanOutput.integrity, undefined);

    // Relocated bytes remain historical non-authoritative material.
    assert.equal(readFileSync(join(bundle, 'final/attic-final.md'), 'utf-8'), '# hand-written final research report\n');
    // Engine never authored or moved lifecycle files beyond its own witnesses.
    assert.equal(readStatus(bundle).current_gate, 'wave0_complete');
  });
});
