// @impl CPT-006, CPT-009, RWG-023, CDP-009, PHS-010
// Unit truth table for the read-only lifecycle-integrity projection:
// premature canonical Final presence (blocking root shared with wave gates)
// and plan Progress tamper evidence consumed by the phase status audit.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';
import {
  PHASE_STATUS_AUDIT_OUTCOMES,
  evaluatePrematureFinalPresence,
  evaluatePlanProgressTamper,
  evaluateLifecycleIntegrity,
  evaluateTraceCompletionIntegrity,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs';
import {
  loadHandoffTopology,
  readTraceEventsWithIndex,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs';

after(cleanupAll);

function makeBundle(label) {
  const bundle = createTempDir(label);
  mkdirSync(join(bundle, 'final'), { recursive: true });
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
    bundle: label,
    current_mode: 'execution',
    state: 'in_progress',
    current_gate: 'wave0_complete',
    next_gate: 'wave1_complete',
  }, null, 2));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), '');
  return bundle;
}

function writeTrace(bundle, events) {
  writeFileSync(join(bundle, 'rb_trace.jsonl'), events.map((event) => JSON.stringify(event)).join('\n') + '\n');
}

function witnessedEvents({ sourceGate = 'wave0-complete', sourceNode = 'phases/phase-wave0.md', targetNode = 'phases/phase-wave1.md' } = {}) {
  return [
    {
      ts: '2026-01-01T00:00:00.000Z',
      event: 'gate_attempt',
      gate: sourceGate,
      phase: 'wave0',
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
    {
      ts: '2026-01-01T00:00:02.000Z',
      event: 'phase_transition',
      from: 'previous',
      to: 'wave0_complete',
      next: 'wave1_complete',
    },
  ];
}

function finalEntryEvents() {
  return witnessedEvents({
    sourceGate: 'readiness-passed',
    sourceNode: 'phases/phase-readiness.md',
    targetNode: 'phases/phase-final.md',
  }).map((event) => {
    if (event.event === 'gate_attempt') {
      return { ...event, gate: 'readiness-passed', phase: 'readiness' };
    }
    return event;
  });
}

const TOPOLOGY = loadHandoffTopology();

function tamperFor(bundle) {
  const trace = readTraceEventsWithIndex(bundle);
  return evaluatePlanProgressTamper(bundle, trace.events, TOPOLOGY);
}

describe('lifecycle integrity projection', () => {
  it('keeps the audit outcome vocabulary closed with exactly the two new outcomes', () => {
    assert.ok(PHASE_STATUS_AUDIT_OUTCOMES.includes('premature_final_present'));
    assert.ok(PHASE_STATUS_AUDIT_OUTCOMES.includes('plan_progress_tamper_suspected'));
    assert.equal(new Set(PHASE_STATUS_AUDIT_OUTCOMES).size, PHASE_STATUS_AUDIT_OUTCOMES.length);
    assert.equal(PHASE_STATUS_AUDIT_OUTCOMES.length, 11);
  });

  it('reports premature presence for an uncovered canonical primary-series file', () => {
    const bundle = makeBundle('integrity-premature-hit');
    writeFileSync(join(bundle, 'final/final.md'), '# Hand-written final\n');
    const verdict = evaluatePrematureFinalPresence(bundle);
    assert.equal(verdict.hit, true);
    assert.equal(verdict.surfaces.length, 1);
    assert.equal(verdict.surfaces[0].kind, 'final_file');
    assert.equal(verdict.surfaces[0].name, 'final.md');
    assert.match(verdict.surfaces[0].detail, /final\/final\.md/);
    assert.ok(verdict.remediation.some((line) => /final\/attic-<original-name>/.test(line)));
  });

  it('exempts files covered by a route-bound legal Final entry (current lineage)', () => {
    const bundle = makeBundle('integrity-premature-final-entry');
    writeFileSync(join(bundle, 'final/final.md'), '# Published final\n');
    writeTrace(bundle, finalEntryEvents());
    const verdict = evaluatePrematureFinalPresence(bundle);
    assert.equal(verdict.hit, false);
    assert.match(verdict.reason, /route-bound legal Final entry/);
  });

  it('exempts a single legacy base via explicit legacy compatibility', () => {
    const bundle = makeBundle('integrity-premature-legacy');
    mkdirSync(join(bundle, 'final'), { recursive: true });
    writeFileSync(join(bundle, 'final/report.md'), '# Legacy v0 report\n');
    const verdict = evaluatePrematureFinalPresence(bundle);
    assert.equal(verdict.hit, false);
    assert.match(verdict.reason, /legacy compatibility/);
  });

  it('is silent when the primary series is empty or only supplementary', () => {
    const bundle = makeBundle('integrity-premature-empty');
    mkdirSync(join(bundle, 'final'), { recursive: true });
    writeFileSync(join(bundle, 'final/notes.txt'), 'supplementary scratch\n');
    let verdict = evaluatePrematureFinalPresence(bundle);
    assert.equal(verdict.hit, false);
    const missing = makeBundle('integrity-premature-no-dir');
    verdict = evaluatePrematureFinalPresence(missing);
    assert.equal(verdict.hit, false);
  });

  it('reports tamper evidence for hand-checked gate lines without passed witnesses', () => {
    const bundle = makeBundle('integrity-tamper-hit');
    writeFileSync(join(bundle, 'rb_plan.md'), [
      '# plan',
      '## Progress',
      '',
      '- [x] wave1-complete',
      '- [x] wave2-complete (2026-01-01T00:00:00.000Z)',
      '- [ ] wave0-complete',
      '',
    ].join('\n'));
    const tamper = tamperFor(bundle);
    assert.equal(tamper.tampered.length, 2);
    assert.deepEqual(tamper.tampered.map((item) => item.gateKey).sort(), ['wave1-complete', 'wave2-complete']);

    const integrity = evaluateLifecycleIntegrity(bundle);
    assert.ok(integrity);
    assert.ok(integrity.outcomes.includes('plan_progress_tamper_suspected'));
    assert.ok(integrity.surfaces.every((surface) => surface.kind === 'plan_progress_line'));
    assert.ok(integrity.remediation.some((line) => /Engine-owned presentation/.test(line)));
  });

  it('does not report tamper for an Engine-flipped line backed by a witnessed pass', () => {
    const bundle = makeBundle('integrity-tamper-engine-flip');
    writeTrace(bundle, witnessedEvents());
    writeFileSync(join(bundle, 'rb_plan.md'), [
      '# plan',
      '## Progress',
      '',
      '- [x] wave0-complete (2026-01-01T00:00:03.000Z)',
      '',
    ].join('\n'));
    const tamper = tamperFor(bundle);
    assert.equal(tamper.tampered.length, 0);
    assert.equal(tamper.stale.length, 0);
    assert.equal(evaluateLifecycleIntegrity(bundle), null);
  });

  it('treats a passed-but-unflipped gate as advisory staleness, never an integrity outcome', () => {
    const bundle = makeBundle('integrity-staleness');
    writeTrace(bundle, witnessedEvents());
    writeFileSync(join(bundle, 'rb_plan.md'), [
      '# plan',
      '## Progress',
      '',
      '- [ ] wave0-complete',
      '',
    ].join('\n'));
    const tamper = tamperFor(bundle);
    assert.equal(tamper.tampered.length, 0);
    assert.deepEqual(tamper.stale, [{ gate: 'wave0-complete', block: 'baseline' }]);
    assert.equal(evaluateLifecycleIntegrity(bundle), null);
  });

  it('returns null integrity for a clean bundle', () => {
    const bundle = makeBundle('integrity-clean');
    assert.equal(evaluateLifecycleIntegrity(bundle), null);
  });

  it('ignores checkbox-looking lines outside the canonical Progress section', () => {
    const bundle = makeBundle('integrity-noncanonical-section');
    writeFileSync(join(bundle, 'rb_plan.md'), [
      '# plan',
      '## Decisions',
      '',
      '- [x] wave1-complete',
      '',
    ].join('\n'));
    const tamper = tamperFor(bundle);
    assert.equal(tamper.tampered.length, 0);
    assert.equal(evaluateLifecycleIntegrity(bundle), null);
  });
});

describe('trace completion integrity @impl TRW-008', () => {
  it('accepts a completion written before its passed gate attempt (legal phase flow)', () => {
    const bundle = makeBundle('trace-witness-completion-before-gate');
    const canonical = bundle.split('/').pop();
    writeTrace(bundle, [
      { ts: '2026-01-01T00:00:01.000Z', event: 'wave1_completion', bundle: canonical },
      { ts: '2026-01-01T00:00:02.000Z', event: 'gate_attempt', gate: 'wave1-complete', phase: 'wave1', passed: true },
    ]);
    const verdict = evaluateTraceCompletionIntegrity(bundle);
    assert.equal(verdict.ok, true, JSON.stringify(verdict.findings));
    assert.equal(verdict.findings.length, 0);
  });

  it('accepts a completion written after its passed gate attempt (rerun shape)', () => {
    const bundle = makeBundle('trace-witness-completion-after-gate');
    const canonical = bundle.split('/').pop();
    writeTrace(bundle, [
      { ts: '2026-01-01T00:00:00.000Z', event: 'gate_attempt', gate: 'wave1-complete', phase: 'wave1', passed: true },
      { ts: '2026-01-01T00:00:01.000Z', event: 'wave1_completion', bundle: canonical },
    ]);
    const verdict = evaluateTraceCompletionIntegrity(bundle);
    assert.equal(verdict.ok, true, JSON.stringify(verdict.findings));
  });

  it('flags a completion with no passed gate attempt for its gate', () => {
    const bundle = makeBundle('trace-witness-no-witness');
    const canonical = bundle.split('/').pop();
    writeTrace(bundle, [
      { ts: '2026-01-01T00:00:00.000Z', event: 'gate_attempt', gate: 'wave1-complete', phase: 'wave1', passed: false },
      { ts: '2026-01-01T00:00:01.000Z', event: 'wave1_completion', bundle: canonical },
    ]);
    const verdict = evaluateTraceCompletionIntegrity(bundle);
    assert.equal(verdict.ok, false);
    assert.ok(
      verdict.findings.some((f) => f.event === 'wave1_completion' && /no passed gate_attempt witness for gate 'wave1-complete'/.test(f.detail)),
      JSON.stringify(verdict.findings),
    );
  });

  it('flags a completion whose bundle is the short name rather than canonical basename', () => {
    const bundle = makeBundle('trace-witness-short-name');
    writeTrace(bundle, [
      { ts: '2026-01-01T00:00:00.000Z', event: 'gate_attempt', gate: 'wave1-complete', phase: 'wave1', passed: true },
      { ts: '2026-01-01T00:00:01.000Z', event: 'wave1_completion', bundle: 'trace-witness-short-name' },
    ]);
    const verdict = evaluateTraceCompletionIntegrity(bundle);
    assert.equal(verdict.ok, false);
    assert.ok(
      verdict.findings.some((f) => f.event === 'wave1_completion' && /not the canonical bundle basename/.test(f.detail)),
      JSON.stringify(verdict.findings),
    );
  });

  it('flags a completion appended with a timestamp older than a preceding event', () => {
    const bundle = makeBundle('trace-witness-non-monotonic');
    const canonical = bundle.split('/').pop();
    writeTrace(bundle, [
      { ts: '2026-01-01T00:00:00.000Z', event: 'gate_attempt', gate: 'wave1-complete', phase: 'wave1', passed: true },
      { ts: '2026-01-01T00:00:02.000Z', event: 'diagnostic', kind: 'gate_failure_detail' },
      { ts: '2026-01-01T00:00:01.000Z', event: 'wave1_completion', bundle: canonical },
    ]);
    const verdict = evaluateTraceCompletionIntegrity(bundle);
    assert.equal(verdict.ok, false);
    assert.ok(
      verdict.findings.some((f) => f.reason_code === 'trace_integrity_non_monotonic_ts'),
      JSON.stringify(verdict.findings),
    );
  });
});

describe('plan Progress cycle blocks (PHS-010)', () => {
  // Builds a trace with baseline gates, a baseline rerun-ready (spawns cycle 1)
  // and a full cycle 1 ending in readiness. Every gate_attempt carries a
  // route-bound load_complete so candidateLegalWindows admits it.
  function cycleTrace() {
    const events = [];
    const pushGate = (gate, node, next, ts) => {
      const idx = events.length;
      events.push({
        ts,
        event: 'gate_attempt',
        gate,
        phase: node.replace('phases/phase-', '').replace('.md', ''),
        passed: true,
        currentNodeRef: node,
        next,
      });
      events.push({
        ts: ts.replace(/000Z$/, '001Z'),
        event: 'load_complete',
        entry: next,
        handoff_source_gate: gate,
        handoff_source_node: node,
        handoff_target_node: next,
        handoff_source_attempt_index: idx,
      });
    };
    pushGate('instantiation-complete', 'phases/phase-instantiation.md', 'phases/phase-hitl1.md', '2026-01-01T00:00:00.000Z');
    pushGate('hitl1-recorded', 'phases/phase-hitl1.md', 'phases/phase-setup.md', '2026-01-01T00:00:01.000Z');
    pushGate('setup-ready', 'phases/phase-setup.md', 'phases/phase-seed-topics.md', '2026-01-01T00:00:02.000Z');
    pushGate('seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md', '2026-01-01T00:00:03.000Z');
    pushGate('rerun-ready', 'phases/phase-rerun.md', 'phases/phase-seed-topics.md', '2026-01-01T00:00:04.000Z');
    pushGate('seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md', '2026-01-01T00:00:05.000Z');
    pushGate('wave0-complete', 'phases/phase-wave0.md', 'phases/phase-wave1.md', '2026-01-01T00:00:06.000Z');
    pushGate('wave1-complete', 'phases/phase-wave1.md', 'phases/phase-wave2.md', '2026-01-01T00:00:07.000Z');
    pushGate('wave2-complete', 'phases/phase-wave2.md', 'phases/phase-hitl2.md', '2026-01-01T00:00:08.000Z');
    pushGate('hitl2-recorded', 'phases/phase-hitl2.md', 'phases/phase-readiness.md', '2026-01-01T00:00:09.000Z');
    pushGate('readiness-passed', 'phases/phase-readiness.md', 'phases/phase-final.md', '2026-01-01T00:00:10.000Z');
    return events;
  }

  const CYCLE_SPAWN_TS = '2026-01-01T00:00:04.000Z';

  function planWithCycleBlock(cycleLines, header = `### Rerun cycle 1 (spawned ${CYCLE_SPAWN_TS})`) {
    return [
      '# plan',
      '## Progress',
      '',
      '- [x] instantiation-complete (2026-01-01T00:00:00.000Z)',
      '- [x] hitl1-recorded (2026-01-01T00:00:01.000Z)',
      '- [x] setup-ready (2026-01-01T00:00:02.000Z)',
      '- [x] seed-topics-ready (2026-01-01T00:00:03.000Z)',
      '- [ ] wave0-complete',
      '- [ ] wave1-complete',
      '- [ ] wave2-complete',
      '- [ ] hitl2-recorded',
      '- [ ] readiness-passed',
      '- [x] rerun-ready (2026-01-01T00:00:04.000Z)',
      '',
      header,
      ...cycleLines,
      '',
      '## Decisions',
      '',
      'x',
    ].join('\n');
  }

  const CYCLE_GATE_LINES = (checked = {}) => [
    `- [${checked['seed-topics-ready'] ? 'x' : ' '}] seed-topics-ready`,
    `- [${checked['wave0-complete'] ? 'x' : ' '}] wave0-complete`,
    `- [${checked['wave1-complete'] ? 'x' : ' '}] wave1-complete`,
    `- [${checked['wave2-complete'] ? 'x' : ' '}] wave2-complete`,
    `- [${checked['hitl2-recorded'] ? 'x' : ' '}] hitl2-recorded`,
    `- [${checked['readiness-passed'] ? 'x' : ' '}] readiness-passed`,
    `- [${checked['rerun-ready'] ? 'x' : ' '}] rerun-ready`,
  ];

  it('flags a cycle-block checked line without a witness at or after spawn as tamper', () => {
    const bundle = makeBundle('integrity-cycle-tamper-no-witness');
    writeTrace(bundle, cycleTrace());
    // hitl1-recorded only ever passed in the baseline (00:00:01 < spawn 00:00:04).
    writeFileSync(join(bundle, 'rb_plan.md'), planWithCycleBlock([
      ...CYCLE_GATE_LINES(),
      '- [x] hitl1-recorded',
    ]));
    const tamper = tamperFor(bundle);
    assert.ok(
      tamper.tampered.some((t) => t.gateKey === 'hitl1-recorded' && t.block === 'Rerun cycle 1'),
      JSON.stringify(tamper.tampered),
    );
    assert.equal(evaluateLifecycleIntegrity(bundle)?.outcomes[0], 'plan_progress_tamper_suspected');
  });

  it('flags a cycle-block rerun-ready line with no in-cycle rerun witness as tamper', () => {
    const bundle = makeBundle('integrity-cycle-tamper-rerun');
    writeTrace(bundle, cycleTrace()); // cycle 1 ends in readiness, no second rerun-ready
    writeFileSync(join(bundle, 'rb_plan.md'), planWithCycleBlock(
      CYCLE_GATE_LINES({ 'rerun-ready': true }),
    ));
    const tamper = tamperFor(bundle);
    assert.ok(
      tamper.tampered.some((t) => t.gateKey === 'rerun-ready' && t.block === 'Rerun cycle 1'),
      JSON.stringify(tamper.tampered),
    );
  });

  it('treats checked lines inside an unparseable cycle header as tamper (fail-closed)', () => {
    const bundle = makeBundle('integrity-cycle-bad-header');
    writeTrace(bundle, cycleTrace());
    writeFileSync(join(bundle, 'rb_plan.md'), planWithCycleBlock(
      CYCLE_GATE_LINES({ 'wave0-complete': true }),
      '### Rerun cycle X (spawned 2026-01-01T00:00:04.000Z)',
    ));
    const tamper = tamperFor(bundle);
    assert.ok(
      tamper.tampered.some((t) => t.gateKey === 'wave0-complete' && t.block === 'unparseable'),
      JSON.stringify(tamper.tampered),
    );
  });

  it('does not report tamper for a legal cycle flip backed by an in-cycle witness', () => {
    const bundle = makeBundle('integrity-cycle-legal-flip');
    writeTrace(bundle, cycleTrace());
    // wave0-complete passed in cycle 1 at 00:00:06, at/after spawn 00:00:04.
    writeFileSync(join(bundle, 'rb_plan.md'), planWithCycleBlock(
      CYCLE_GATE_LINES({ 'wave0-complete': true, 'seed-topics-ready': true, 'wave1-complete': true, 'wave2-complete': true, 'hitl2-recorded': true, 'readiness-passed': true }),
    ));
    const tamper = tamperFor(bundle);
    assert.equal(tamper.tampered.length, 0);
  });

  it('surfaces stale per attempt block: cycle-gate passed but its cycle line unchecked', () => {
    const bundle = makeBundle('integrity-cycle-stale');
    writeTrace(bundle, cycleTrace());
    writeFileSync(join(bundle, 'rb_plan.md'), planWithCycleBlock(
      CYCLE_GATE_LINES({ 'seed-topics-ready': true }), // wave0..readiness passed in cycle 1 but unchecked
    ));
    const tamper = tamperFor(bundle);
    assert.equal(tamper.tampered.length, 0);
    assert.deepEqual(
      tamper.stale.map((s) => `${s.gate}@${s.block}`).sort(),
      [
        'hitl2-recorded@Rerun cycle 1',
        'readiness-passed@Rerun cycle 1',
        'wave0-complete@Rerun cycle 1',
        'wave1-complete@Rerun cycle 1',
        'wave2-complete@Rerun cycle 1',
      ],
    );
  });

  it('keeps stale advisory out of blocking integrity outcomes', () => {
    const bundle = makeBundle('integrity-cycle-stale-nonblocking');
    writeTrace(bundle, cycleTrace());
    writeFileSync(join(bundle, 'rb_plan.md'), planWithCycleBlock(
      CYCLE_GATE_LINES({ 'seed-topics-ready': true }),
    ));
    assert.equal(evaluateLifecycleIntegrity(bundle), null); // stale alone → clean integrity
  });
});
