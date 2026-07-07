import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const REPO_ROOT = process.cwd();
const CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/audit-phase-status.mjs');

after(cleanupAll);

function makeBundle(label, status = { current_gate: 'setup_ready', next_gate: 'seed_topics_ready' }) {
  const bundle = createTempDir(label);
  mkdirSync(join(bundle, 'final'), { recursive: true });
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
    bundle: label,
    current_mode: 'execution',
    state: 'in_progress',
    ...status,
  }, null, 2));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), '');
  return bundle;
}

function runAudit(bundle) {
  const result = spawnSync('node', [CLI, '--bundle', bundle], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 10000,
  });
  return { status: result.status, output: JSON.parse(result.stdout) };
}

function writeTrace(bundle, events) {
  writeFileSync(join(bundle, 'rb_trace.jsonl'), events.map((event) => JSON.stringify(event)).join('\n') + '\n');
}

function witnessed({ sourceGate = 'wave0-complete', sourceNode = 'phases/phase-wave0.md', targetNode = 'phases/phase-wave1.md', phase = 'wave0', transition = true } = {}) {
  const currentGate = sourceGate.replace(/-/g, '_');
  const nextGate = targetNode === 'phases/phase-final.md'
    ? 'none'
    : `${targetNode.match(/phase-([^.]+)\.md/)?.[1].replace(/-/g, '_')}_complete`
      .replace('seed_topics_complete', 'seed_topics_ready')
      .replace('hitl2_complete', 'hitl2_recorded')
      .replace('readiness_complete', 'readiness_passed')
      .replace('rerun_complete', 'rerun_ready');
  const events = [
    {
      ts: '2026-01-01T00:00:00.000Z',
      event: 'gate_attempt',
      gate: sourceGate,
      phase,
      passed: true,
      currentNodeRef: sourceNode,
      next: targetNode,
    },
    {
      ts: '2026-01-01T00:00:01.000Z',
      event: 'load_complete',
      entry: targetNode,
      handoff_source_gate: sourceGate,
      handoff_source_node: sourceNode,
      handoff_target_node: targetNode,
      handoff_source_attempt_index: 0,
    },
  ];
  if (transition) {
    events.push({
      ts: '2026-01-01T00:00:02.000Z',
      event: 'phase_transition',
      from: 'previous',
      to: currentGate,
      next: nextGate,
    });
  }
  return events;
}

describe('audit-phase-status CLI', () => {
  it('passes explicit bootstrap exception without mutating status', () => {
    const bundle = makeBundle('phase-audit-bootstrap');
    const before = readFileSync(join(bundle, 'rb_status.json'), 'utf-8');
    const { status, output } = runAudit(bundle);
    assert.equal(status, 0);
    assert.equal(output.outcome, 'bootstrap_exception');
    assert.match(output.inspect.join('\n'), /template_initial_setup_window/);
    assert.equal(readFileSync(join(bundle, 'rb_status.json'), 'utf-8'), before);
  });

  it('passes legal witnessed handoff with phase_transition', () => {
    const bundle = makeBundle('phase-audit-pass', { current_gate: 'wave0_complete', next_gate: 'wave1_complete' });
    writeTrace(bundle, witnessed());
    const { status, output } = runAudit(bundle);
    assert.equal(status, 0, JSON.stringify(output));
    assert.equal(output.outcome, 'passed');
  });

  it('reports missing phase_transition witness without mutating status', () => {
    const bundle = makeBundle('phase-audit-missing-witness', { current_gate: 'wave0_complete', next_gate: 'wave1_complete' });
    writeTrace(bundle, witnessed({ transition: false }));
    const before = readFileSync(join(bundle, 'rb_status.json'), 'utf-8');
    const { status, output } = runAudit(bundle);
    assert.equal(status, 1);
    assert.equal(output.outcome, 'missing_witness');
    assert.match(output.inspect.join('\n'), /phase_transition witness/);
    assert.equal(readFileSync(join(bundle, 'rb_status.json'), 'utf-8'), before);
  });

  it('reports failed gate downstream status', () => {
    const bundle = makeBundle('phase-audit-failed-gate', { current_gate: 'hitl2_recorded', next_gate: 'readiness_passed' });
    writeTrace(bundle, [
      ...witnessed(),
      {
        ts: '2026-01-01T00:00:03.000Z',
        event: 'gate_attempt',
        gate: 'wave1-complete',
        phase: 'wave1',
        passed: false,
        currentNodeRef: 'phases/phase-wave1.md',
        next: null,
      },
    ]);
    const { output } = runAudit(bundle);
    assert.equal(output.outcome, 'failed_gate_downstream_status');
    assert.match(output.inspect.join('\n'), /failed with next:null/);
  });

  it('reports manual bypass suspicion for skipped wave windows', () => {
    const bundle = makeBundle('phase-audit-manual', { current_gate: 'wave2_complete', next_gate: 'hitl2_recorded' });
    writeTrace(bundle, witnessed());
    const { output } = runAudit(bundle);
    assert.equal(output.outcome, 'manual_bypass_suspected');
    assert.match(output.inspect.join('\n'), /latest legal handoff target/);
  });

  it('reports premature final output as diagnostic-only non-delivery', () => {
    const bundle = makeBundle('phase-audit-final', { current_gate: 'wave0_complete', next_gate: 'wave1_complete' });
    writeTrace(bundle, witnessed());
    writeFileSync(join(bundle, 'final/report.md'), '# Premature report\n');
    const { output } = runAudit(bundle);
    assert.equal(output.outcome, 'status_drift');
    assert.equal(output.diagnostic_only, true);
    assert.match(output.inspect.join('\n'), /premature final output|premature terminal output/);
  });

  it('accepts legal readiness-to-final handoff with final files', () => {
    const bundle = makeBundle('phase-audit-legal-final', { current_gate: 'readiness_passed', next_gate: 'none' });
    writeTrace(bundle, witnessed({
      sourceGate: 'readiness-passed',
      sourceNode: 'phases/phase-readiness.md',
      targetNode: 'phases/phase-final.md',
      phase: 'readiness',
    }));
    writeFileSync(join(bundle, 'final/report.md'), '# Final report\n');
    const { status, output } = runAudit(bundle);
    assert.equal(status, 0, JSON.stringify(output));
    assert.equal(output.outcome, 'passed');
  });
});
