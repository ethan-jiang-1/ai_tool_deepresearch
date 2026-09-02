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
    assert.deepEqual(tamper.stale, ['wave0-complete']);
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
