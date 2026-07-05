import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  validateEnterPhaseTarget,
  validateSourceGateStatusSync,
  checkPhaseHandoffPreflight,
} from '../../DPT_FRAMEWORK/engine/helpers/handoff-helpers.mjs';

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

  it('authorizes enter-phase from latest deterministic gate_attempt.next', () => {
    writeTrace([gateAttempt()]);
    const result = validateEnterPhaseTarget(dir, 'phases/phase-wave1.md');
    assert.equal(result.ok, true);
    assert.equal(result.handoff.sourceGate, 'wave0-complete');
    assert.equal(result.handoff.targetNode, 'phases/phase-wave1.md');
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
});
