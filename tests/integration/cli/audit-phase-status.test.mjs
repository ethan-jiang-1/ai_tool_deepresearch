import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';

const REPO_ROOT = process.cwd();
const CLI = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs');

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

  it('reports failed source-gate status laundering without mutating status', () => {
    const bundle = makeBundle('phase-audit-failed-source-window', { current_gate: 'wave0_complete', next_gate: 'wave1_complete' });
    writeTrace(bundle, [{
      ts: '2026-01-01T00:00:00.000Z',
      event: 'gate_attempt',
      gate: 'wave0-complete',
      phase: 'wave0',
      passed: false,
      currentNodeRef: 'phases/phase-wave0.md',
      next: null,
    }]);
    const before = readFileSync(join(bundle, 'rb_status.json'), 'utf-8');

    const { output } = runAudit(bundle);
    assert.equal(output.outcome, 'failed_gate_downstream_status');
    assert.match(output.inspect.join('\n'), /wave0-complete failed with next:null/);
    assert.match(output.advice.join('\n'), /do not hand-edit rb_status\.json/);
    assert.equal(readFileSync(join(bundle, 'rb_status.json'), 'utf-8'), before);
  });

  it('reports manual bypass suspicion for skipped wave windows', () => {
    const bundle = makeBundle('phase-audit-manual', { current_gate: 'wave2_complete', next_gate: 'hitl2_recorded' });
    writeTrace(bundle, witnessed());
    const before = readFileSync(join(bundle, 'rb_status.json'), 'utf-8');
    const { output } = runAudit(bundle);
    assert.equal(output.outcome, 'manual_bypass_suspected');
    assert.match(output.inspect.join('\n'), /latest legal handoff target/);
    assert.equal(readFileSync(join(bundle, 'rb_status.json'), 'utf-8'), before);
  });

  it('treats non-canonical final files as supplementary: unwitnessed window stays status_drift without premature classification', () => {
    const bundle = makeBundle('phase-audit-premature-final-status', { current_gate: 'readiness_passed', next_gate: 'none', current_node: 'phases/phase-final.md' });
    writeTrace(bundle, witnessed());
    writeFileSync(join(bundle, 'final/report.md'), '# Premature final report\n');
    const before = readFileSync(join(bundle, 'rb_status.json'), 'utf-8');

    const { output } = runAudit(bundle);
    assert.equal(output.outcome, 'status_drift');
    assert.equal(output.diagnostic_only, true);
    assert.match(output.inspect.join('\n'), /does not match latest witnessed legal window/);
    assert.match(output.advice.join('\n'), /do not hand-edit rb_status\.json/);
    assert.equal(readFileSync(join(bundle, 'rb_status.json'), 'utf-8'), before);
  });

  it('reports premature canonical final output as premature_final_present with single remediation', () => {
    const bundle = makeBundle('phase-audit-final', { current_gate: 'wave0_complete', next_gate: 'wave1_complete' });
    writeTrace(bundle, witnessed());
    writeFileSync(join(bundle, 'final/final.md'), '# Premature report\n');
    const before = readFileSync(join(bundle, 'final/final.md'), 'utf-8');
    const { output } = runAudit(bundle);
    assert.equal(output.outcome, 'premature_final_present');
    assert.equal(output.diagnostic_only, true);
    assert.match(output.inspect.join('\n'), /canonical primary-series file\(s\) without any legal Final-entry admission/);
    assert.match(output.advice.join('\n'), /final\/attic-<original-name>/);
    assert.ok(Array.isArray(output.premature_final_present?.surfaces));
    assert.equal(output.premature_final_present.surfaces[0].kind, 'final_file');
    // Canonical presence takes precedence over an otherwise matching window.
    assert.notEqual(output.outcome, 'passed');
    // Engine never mutates the premature file.
    assert.equal(readFileSync(join(bundle, 'final/final.md'), 'utf-8'), before);
  });

  it('reports both integrity outcomes on the bug-shaped bundle with single remediations', () => {
    const bundle = makeBundle('phase-audit-bug-shape', { current_gate: 'wave0_complete', next_gate: 'wave1_complete' });
    writeTrace(bundle, witnessed());
    writeFileSync(join(bundle, 'final/final.md'), '# Hand-written final\n');
    writeFileSync(join(bundle, 'rb_plan.md'), [
      '# plan',
      '## Progress',
      '',
      '- [x] wave0-complete',
      '- [x] wave1-complete',
      '- [x] wave2-complete',
      '',
    ].join('\n'));
    const { output } = runAudit(bundle);
    assert.equal(output.outcome, 'premature_final_present');
    assert.ok(output.integrity, 'expected integrity object attached');
    assert.deepEqual(output.integrity.outcomes, ['premature_final_present', 'plan_progress_tamper_suspected']);
    const kinds = output.integrity.surfaces.map((surface) => surface.kind);
    assert.ok(kinds.includes('final_file'));
    assert.ok(kinds.includes('plan_progress_line'));
    const tamperSurfaces = output.integrity.surfaces.filter((surface) => surface.kind === 'plan_progress_line');
    assert.deepEqual(tamperSurfaces.map((surface) => surface.name).sort(), ['wave1-complete', 'wave2-complete']);
    assert.match(output.integrity.remediation.join('\n'), /final\/attic-<original-name>/);
    assert.match(output.integrity.remediation.join('\n'), /Engine-owned presentation/);
    assert.equal(output.diagnostic_only, true);
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

describe('trace completion integrity @impl TRW-008', () => {
  it('flags completion events without a passed gate_attempt witness', () => {
    const bundle = makeBundle('audit-trace-witness', { current_gate: 'wave2_complete', next_gate: 'hitl1_recorded' });
    const shortName = 'audit-trace-witness';
    writeTrace(bundle, [
      { ts: '2026-01-01T00:00:00.000Z', event: 'final_report_complete', bundle: 'no-canonical' },
      { ts: '2026-01-01T00:00:01.000Z', event: 'wave2_completion', bundle: 'no-canonical' },
    ]);
    const { output } = runAudit(bundle);
    const findings = output.trace_integrity?.findings || [];
    assert.ok(findings.some((f) => f.event === 'final_report_complete' && /no framework gate identity/.test(f.detail)), JSON.stringify(findings));
    assert.ok(findings.some((f) => f.event === 'wave2_completion' && /no passed gate_attempt witness for gate 'wave2-complete'/.test(f.detail)), JSON.stringify(findings));
    assert.equal(output.trace_integrity.ok, false);
  });

  it('flags a completion event whose bundle is the rb_status.json short name', () => {
    const bundle = makeBundle('audit-trace-bundle', { current_gate: 'wave1_complete', next_gate: 'wave2_complete' });
    // rb_status.json#/bundle is the label ('audit-trace-bundle'), which differs from the
    // canonical directory basename ('audit-trace-bundle-<random>') — the forged-event shape.
    writeTrace(bundle, [
      { ts: '2026-01-01T00:00:00.000Z', event: 'gate_attempt', gate: 'wave1-complete', phase: 'wave1', passed: true, bundle: 'audit-trace-bundle' },
      { ts: '2026-01-01T00:00:01.000Z', event: 'wave1_completion', bundle: 'audit-trace-bundle' },
    ]);
    const { output } = runAudit(bundle);
    const findings = output.trace_integrity?.findings || [];
    assert.ok(
      findings.some((f) => f.event === 'wave1_completion' && f.reason_code === 'trace_integrity_unsupported_completion' && /not the canonical bundle basename/.test(f.detail)),
      JSON.stringify(findings),
    );
    // The gate_attempt witness itself must NOT be flagged (historical short-name bundle).
    assert.ok(!findings.some((f) => f.event === 'gate_attempt'), JSON.stringify(findings));
  });

  it('flags a non-monotonic completion timestamp appended after later events', () => {
    const bundle = makeBundle('audit-trace-mono', { current_gate: 'wave1_complete', next_gate: 'wave2_complete' });
    writeTrace(bundle, [
      { ts: '2026-01-01T00:00:00.000Z', event: 'gate_attempt', gate: 'wave1-complete', phase: 'wave1', passed: true },
      { ts: '2026-01-01T00:00:02.000Z', event: 'diagnostic', kind: 'gate_failure_detail' },
      { ts: '2026-01-01T00:00:01.000Z', event: 'wave1_completion', bundle: bundle.split('/').pop() },
    ]);
    const { output } = runAudit(bundle);
    const findings = output.trace_integrity?.findings || [];
    assert.ok(findings.some((f) => f.reason_code === 'trace_integrity_non_monotonic_ts'), JSON.stringify(findings));
  });

  it('accepts a legitimate gate-backed completion with the canonical bundle', () => {
    const bundle = makeBundle('audit-trace-legal', { current_gate: 'wave1_complete', next_gate: 'wave2_complete' });
    writeTrace(bundle, [
      { ts: '2026-01-01T00:00:00.000Z', event: 'gate_attempt', gate: 'wave1-complete', phase: 'wave1', passed: true },
      { ts: '2026-01-01T00:00:01.000Z', event: 'wave1_completion', bundle: bundle.split('/').pop() },
    ]);
    const { output } = runAudit(bundle);
    assert.equal(output.trace_integrity.ok, true, JSON.stringify(output.trace_integrity));
    assert.deepEqual(output.trace_integrity.findings, []);
    assert.equal(output.trace_integrity.canonical_bundle, bundle.split('/').pop());
  });

  it('accepts a completion written before its passed gate attempt (legal phase flow)', () => {
    const bundle = makeBundle('audit-trace-legal-before-gate', { current_gate: 'wave1_complete', next_gate: 'wave2_complete' });
    writeTrace(bundle, [
      { ts: '2026-01-01T00:00:01.000Z', event: 'wave1_completion', bundle: bundle.split('/').pop() },
      { ts: '2026-01-01T00:00:02.000Z', event: 'gate_attempt', gate: 'wave1-complete', phase: 'wave1', passed: true },
    ]);
    const { output } = runAudit(bundle);
    assert.equal(output.trace_integrity.ok, true, JSON.stringify(output.trace_integrity));
    assert.deepEqual(output.trace_integrity.findings, []);
  });

  it('passes while surfacing frozen Progress as non-blocking advisory staleness', () => {
    const bundle = makeBundle('audit-stale-advisory', { current_gate: 'wave0_complete', next_gate: 'wave1_complete' });
    writeTrace(bundle, witnessed()); // wave0-complete passed with route-bound consumption
    // Progress frozen: the line stays unchecked (engine write failed/lagged).
    writeFileSync(join(bundle, 'rb_plan.md'), [
      '# plan',
      '## Progress',
      '',
      '- [ ] instantiation-complete',
      '- [ ] wave0-complete',
      '',
      '## Decisions',
      '',
      'x',
    ].join('\n'));
    const { status, output } = runAudit(bundle);
    assert.equal(status, 0, JSON.stringify(output)); // stale is non-blocking
    assert.equal(output.outcome, 'passed');
    assert.ok(Array.isArray(output.advisory), 'advisory field must exist');
    assert.deepEqual(output.advisory, [{ kind: 'stale_progress', gate: 'wave0-complete', block: 'baseline' }]);
    assert.ok(!output.integrity, 'stale alone must not create a blocking integrity outcome');
  });
});
