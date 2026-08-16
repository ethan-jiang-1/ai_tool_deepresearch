import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import {
  validateEnterPhaseTarget,
  validateSourceGateStatusSync,
  checkPhaseHandoffPreflight,
  evaluateFinalEntryAdmission,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs';

describe('handoff helpers', () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dpt-handoff-'));
    writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({
      bundle: 'test',
      current_mode: 'execution',
      state: 'in_progress',
      current_gate: 'wave0_complete',
      next_gate: 'wave1_complete',
    }, null, 2));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeTrace(events) {
    writeFileSync(join(dir, 'rb_trace.jsonl'), events.map(e => JSON.stringify(e)).join('\n') + '\n');
  }

  function writeStatus(currentGate, nextGate) {
    writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({
      bundle: 'test',
      current_mode: 'execution',
      state: 'in_progress',
      current_gate: currentGate,
      next_gate: nextGate,
    }, null, 2));
  }

  function gateAttempt(overrides = {}) {
    return {
      ts: '2026-01-01T00:00:00.000Z',
      event: 'gate_attempt',
      gate: 'wave0-complete',
      phase: 'wave0',
      passed: true,
      currentNodeRef: 'phases/phase-wave0.md',
      next: 'phases/phase-wave1.md',
      ...overrides,
    };
  }

  function loadComplete(sourceIndex = 0, overrides = {}) {
    return {
      ts: '2026-01-01T00:00:01.000Z',
      event: 'load_complete',
      entry: 'phases/phase-wave1.md',
      handoff_source_gate: 'wave0-complete',
      handoff_source_node: 'phases/phase-wave0.md',
      handoff_target_node: 'phases/phase-wave1.md',
      handoff_source_attempt_index: sourceIndex,
      ...overrides,
    };
  }

  function finalHandoff() {
    return {
      index: 0,
      sourceNode: 'phases/phase-readiness.md',
      targetNode: 'phases/phase-final.md',
    };
  }

  function writeFinalHandoffTrace() {
    writeTrace([gateAttempt({
      gate: 'readiness-passed',
      phase: 'readiness',
      currentNodeRef: 'phases/phase-readiness.md',
      next: 'phases/phase-final.md',
    })]);
    mkdirSync(join(dir, 'final'));
  }

  function setupReadyAttempt(overrides = {}) {
    const plan = '# Setup plan\n';
    writeFileSync(join(dir, 'rb_plan.md'), plan);
    const planHash = createHash('sha256').update(readFileSync(join(dir, 'rb_plan.md'))).digest('hex');
    mkdirSync(join(dir, '_checkpoints'), { recursive: true });
    writeFileSync(join(dir, '_checkpoints', 'setup.json'), JSON.stringify({
      trigger: 'setup_route_pending',
      route_state: 'pending',
      gate_attempt_id: 'setup-attempt',
      content_evaluation_ref: { gate: 'setup-ready', passed: true, currentNodeRef: 'phases/phase-setup.md', candidate_next: 'phases/phase-seed-topics.md' },
      hashes: { 'rb_plan.md': { sha256: planHash } },
    }));
    return {
      ts: '2026-01-01T00:00:00.000Z',
      event: 'gate_attempt',
      gate: 'setup-ready',
      phase: 'setup',
      passed: true,
      currentNodeRef: 'phases/phase-setup.md',
      next: 'phases/phase-seed-topics.md',
      gate_attempt_id: 'setup-attempt',
      checkpoint_ref: '_checkpoints/setup.json',
      plan_sha256: planHash,
      ...overrides,
    };
  }

  it('authorizes enter-phase from latest deterministic gate_attempt.next', () => {
    writeTrace([gateAttempt()]);
    const result = validateEnterPhaseTarget(dir, 'phases/phase-wave1.md');
    assert.equal(result.ok, true);
    assert.equal(result.handoff.sourceGate, 'wave0-complete');
    assert.equal(result.handoff.targetNode, 'phases/phase-wave1.md');
  });

  it('requires setup-ready trace, checkpoint, and current plan bytes to bind exactly', () => {
    writeTrace([setupReadyAttempt()]);
    assert.equal(validateEnterPhaseTarget(dir, 'phases/phase-seed-topics.md').ok, true);

    writeTrace([setupReadyAttempt({ checkpoint_ref: '_checkpoints/nested/setup.json' })]);
    assert.equal(validateEnterPhaseTarget(dir, 'phases/phase-seed-topics.md').ok, false);

    writeTrace([setupReadyAttempt()]);
    writeFileSync(join(dir, 'rb_plan.md'), '# Drifted plan\n');
    const drifted = validateEnterPhaseTarget(dir, 'phases/phase-seed-topics.md');
    assert.equal(drifted.ok, false);
    assert.match(drifted.reason, /hashes do not agree/);
  });

  it('rejects stale enter-phase target after later deterministic handoff points elsewhere', () => {
    writeTrace([
      gateAttempt(),
      gateAttempt({
        gate: 'wave1-complete',
        phase: 'wave1',
        currentNodeRef: 'phases/phase-wave1.md',
        next: 'phases/phase-wave2.md',
      }),
    ]);
    const result = validateEnterPhaseTarget(dir, 'phases/phase-wave1.md');
    assert.equal(result.ok, false);
    assert.match(result.reason, /not authorized by latest deterministic handoff/);
  });

  it('requires route-bound load_complete for source-gate status sync', () => {
    writeTrace([gateAttempt()]);
    const missing = validateSourceGateStatusSync(dir, 'wave0_complete');
    assert.equal(missing.ok, false);
    assert.match(missing.reason, /missing route-bound load_complete/);

    writeTrace([gateAttempt(), loadComplete(0)]);
    const ok = validateSourceGateStatusSync(dir, 'wave0_complete');
    assert.equal(ok.ok, true);
    assert.equal(ok.handoff.targetGateEnum, 'wave1_complete');
  });

  it('accepts status-window preflight after witnessed handoff', () => {
    writeTrace([gateAttempt(), loadComplete(0)]);
    const result = checkPhaseHandoffPreflight(dir, 'phases/phase-wave1.md');
    assert.equal(result.ok, true);
    assert.equal(result.handoff.sourceGateEnum, 'wave0_complete');
  });

  it('rejects current-node preflight when matching load_complete is missing', () => {
    writeTrace([gateAttempt()]);
    const result = checkPhaseHandoffPreflight(dir, 'phases/phase-wave1.md');
    assert.equal(result.ok, false);
    assert.match(result.inspect.join('\n'), /missing route-bound load_complete/);
    assert.ok(result.advice.some(a => a.includes('enter-phase')));
  });

  it('rejects stale load_complete that happened before the authorizing pass', () => {
    writeTrace([loadComplete(1), gateAttempt()]);
    const result = checkPhaseHandoffPreflight(dir, 'phases/phase-wave1.md');
    assert.equal(result.ok, false);
    assert.match(result.inspect.join('\n'), /missing route-bound load_complete/);
  });

  it('rejects unbound load_complete with the wrong source attempt index', () => {
    writeTrace([gateAttempt(), loadComplete(99)]);
    const result = checkPhaseHandoffPreflight(dir, 'phases/phase-wave1.md');
    assert.equal(result.ok, false);
    assert.match(result.inspect.join('\n'), /missing route-bound load_complete/);
  });

  it('rejects stale status-window preflight after latest handoff points elsewhere', () => {
    writeTrace([
      gateAttempt(),
      loadComplete(0),
      gateAttempt({
        gate: 'wave1-complete',
        phase: 'wave1',
        currentNodeRef: 'phases/phase-wave1.md',
        next: 'phases/phase-wave2.md',
      }),
      loadComplete(2, {
        entry: 'phases/phase-wave2.md',
        handoff_source_gate: 'wave1-complete',
        handoff_source_node: 'phases/phase-wave1.md',
        handoff_target_node: 'phases/phase-wave2.md',
      }),
    ]);
    const result = checkPhaseHandoffPreflight(dir, 'phases/phase-wave1.md');
    assert.equal(result.ok, false);
    assert.match(result.inspect.join('\n'), /Latest deterministic handoff targets phases\/phase-wave2\.md/);
  });

  it('rejects superseded source pass', () => {
    writeTrace([
      gateAttempt(),
      gateAttempt({ passed: false, next: null }),
      loadComplete(0),
    ]);
    const result = validateEnterPhaseTarget(dir, 'phases/phase-wave1.md');
    assert.equal(result.ok, false);
  });

  it('rejects superseded predecessor pass for gate preflight', () => {
    writeTrace([
      gateAttempt(),
      loadComplete(0),
      gateAttempt({ passed: false, next: null }),
    ]);
    const result = checkPhaseHandoffPreflight(dir, 'phases/phase-wave1.md');
    assert.equal(result.ok, false);
  });

  it('accepts HITL2 proceed target without helper-selected branching', () => {
    writeStatus('hitl2_recorded', 'readiness_passed');
    writeTrace([
      gateAttempt({
        gate: 'hitl2-recorded',
        phase: 'hitl2',
        currentNodeRef: 'phases/phase-hitl2.md',
        next: 'phases/phase-readiness.md',
      }),
      loadComplete(0, {
        entry: 'phases/phase-readiness.md',
        handoff_source_gate: 'hitl2-recorded',
        handoff_source_node: 'phases/phase-hitl2.md',
        handoff_target_node: 'phases/phase-readiness.md',
      }),
    ]);
    const result = checkPhaseHandoffPreflight(dir, 'phases/phase-readiness.md');
    assert.equal(result.ok, true);
    assert.equal(result.handoff.targetGateEnum, 'readiness_passed');
  });

  it('accepts HITL2 rerun selected target without defaulting to readiness', () => {
    writeStatus('hitl2_recorded', 'rerun_ready');
    writeTrace([
      gateAttempt({
        gate: 'hitl2-recorded',
        phase: 'hitl2',
        currentNodeRef: 'phases/phase-hitl2.md',
        next: 'phases/phase-rerun.md',
      }),
      loadComplete(0, {
        entry: 'phases/phase-rerun.md',
        handoff_source_gate: 'hitl2-recorded',
        handoff_source_node: 'phases/phase-hitl2.md',
        handoff_target_node: 'phases/phase-rerun.md',
      }),
    ]);
    const result = checkPhaseHandoffPreflight(dir, 'phases/phase-rerun.md');
    assert.equal(result.ok, true);
    assert.equal(result.handoff.targetGateEnum, 'rerun_ready');
  });

  it('admits only an empty safe primary inventory for a first Final load', () => {
    writeFinalHandoffTrace();
    const admitted = evaluateFinalEntryAdmission(dir, finalHandoff());
    assert.equal(admitted.ok, true);
    assert.equal(admitted.mode, 'first_empty');

    writeFileSync(join(dir, 'final', 'final.md'), '# Premature\n');
    const canonical = evaluateFinalEntryAdmission(dir, finalHandoff());
    assert.equal(canonical.ok, false);
    assert.match(canonical.reason, /empty primary inventory/);
  });

  it('fails closed for malformed and unsafe Final inventories before first entry', () => {
    writeFinalHandoffTrace();
    writeFileSync(join(dir, 'final', 'final_bad-name.md'), '# malformed\n');
    const malformed = evaluateFinalEntryAdmission(dir, finalHandoff());
    assert.equal(malformed.ok, false);
    assert.match(malformed.reason, /primary inventory is invalid/);

    rmSync(join(dir, 'final'), { recursive: true, force: true });
    mkdirSync(join(dir, 'final'));
    symlinkSync(join(dir, 'rb_status.json'), join(dir, 'final', 'report.md'));
    const unsafe = evaluateFinalEntryAdmission(dir, finalHandoff());
    assert.equal(unsafe.ok, false);
    assert.match(unsafe.reason, /cannot read Final inventory/);
  });
});
