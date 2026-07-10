// @impl CPT-001, CPT-004: trace-backed advance-status regression

import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const REPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

function runAdvance(bundlePath, toGate) {
  try {
    const out = execFileSync('node', ['DPT_FRAMEWORK/cli/advance-status.mjs', '--bundle', bundlePath, '--to', toGate], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(out.trim());
  } catch (err) {
    return JSON.parse(err.stdout.trim());
  }
}

describe('advance-status CLI', { concurrency: false }, () => {
  let dir;
  let statusPath;
  let tracePath;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dpt-advance-'));
    statusPath = join(dir, 'rb_status.json');
    tracePath = join(dir, 'rb_trace.jsonl');
    writeFileSync(statusPath, JSON.stringify({
      bundle: 'test',
      current_mode: 'execution',
      state: 'in_progress',
      current_gate: 'hitl1_recorded',
      next_gate: 'setup_ready',
      current_node: null,
    }, null, 2) + '\n');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeTrace(events) {
    writeFileSync(tracePath, events.map(e => JSON.stringify(e)).join('\n') + '\n');
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

  function loadComplete(index, overrides = {}) {
    const gate = overrides.handoff_source_gate || 'wave0-complete';
    const source = overrides.handoff_source_node || 'phases/phase-wave0.md';
    const target = overrides.entry || overrides.handoff_target_node || 'phases/phase-wave1.md';
    return {
      ts: '2026-01-01T00:00:01.000Z',
      event: 'load_complete',
      entry: target,
      handoff_source_gate: gate,
      handoff_source_node: source,
      handoff_target_node: target,
      handoff_source_attempt_index: index,
      ...overrides,
    };
  }

  function writeCurrentNode(nodeRef) {
    const status = JSON.parse(readFileSync(statusPath, 'utf8'));
    status.current_node = nodeRef;
    writeFileSync(statusPath, JSON.stringify(status, null, 2) + '\n');
  }

  it('allows explicit bootstrap source gates without handoff witness', () => {
    const result = runAdvance(dir, 'hitl1_recorded');
    assert.equal(result.status, 'ok');
    assert.equal(result.current_gate, 'hitl1_recorded');
    assert.equal(result.next_gate, 'setup_ready');
    assert.equal(result.continuation, undefined);
    assert.match(result.continuation_diagnostic, /bootstrap-compatible status sync/);
    assert.ok(existsSync(tracePath));
  });

  it('fails covered source gate without gate pass witness and does not mutate status', () => {
    const before = readFileSync(statusPath, 'utf8');
    writeTrace([]);
    const result = runAdvance(dir, 'setup_ready');
    assert.equal(result.status, 'error');
    assert.match(result.reason, /no latest passed deterministic/);
    assert.equal(readFileSync(statusPath, 'utf8'), before);
  });

  it('fails covered source gate without route-bound target entry witness', () => {
    const before = readFileSync(statusPath, 'utf8');
    writeTrace([gateAttempt()]);
    const result = runAdvance(dir, 'wave0_complete');
    assert.equal(result.status, 'error');
    assert.match(result.reason, /missing route-bound load_complete/);
    assert.ok(result.advice.some((item) => item.includes('enter-phase') && item.includes('phases/phase-wave1.md')));
    assert.equal(readFileSync(statusPath, 'utf8'), before);
  });

  it('fails a failed source gate without mutating status or appending phase_transition', () => {
    const before = readFileSync(statusPath, 'utf8');
    writeTrace([
      gateAttempt({
        passed: false,
        next: null,
      }),
    ]);

    const result = runAdvance(dir, 'wave0_complete');
    assert.equal(result.status, 'error');
    assert.match(result.reason, /no latest passed deterministic/);
    assert.ok(result.advice.some((item) => item.includes('Rerun the source gate') && item.includes('wave0-complete')));
    assert.equal(readFileSync(statusPath, 'utf8'), before);
    const events = readFileSync(tracePath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(events.some((event) => event.event === 'phase_transition'), false);
  });

  it('fails covered source gate when load_complete is not bound to the source attempt index', () => {
    const before = readFileSync(statusPath, 'utf8');
    writeTrace([gateAttempt(), loadComplete(99)]);
    const result = runAdvance(dir, 'wave0_complete');
    assert.equal(result.status, 'error');
    assert.match(result.reason, /missing route-bound load_complete/);
    assert.equal(readFileSync(statusPath, 'utf8'), before);
  });

  it('fails covered source gate before mutation when current_node does not match witnessed target', () => {
    const before = readFileSync(statusPath, 'utf8');
    writeCurrentNode('phases/phase-wave2.md');
    const beforeWithMismatch = readFileSync(statusPath, 'utf8');
    writeTrace([gateAttempt(), loadComplete(0)]);

    const result = runAdvance(dir, 'wave0_complete');
    assert.equal(result.status, 'error');
    assert.match(result.reason, /current_node/);
    assert.match(result.reason, /phases\/phase-wave1\.md/);
    assert.equal(readFileSync(statusPath, 'utf8'), beforeWithMismatch);

    const events = readFileSync(tracePath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.some(e => e.event === 'phase_transition'), false);
    assert.notEqual(readFileSync(statusPath, 'utf8'), before);
  });

  it('succeeds after witnessed handoff and writes phase_transition', () => {
    writeCurrentNode('phases/phase-wave1.md');
    writeTrace([gateAttempt(), loadComplete(0)]);
    const result = runAdvance(dir, 'wave0_complete');
    assert.equal(result.status, 'ok');
    assert.equal(result.current_gate, 'wave0_complete');
    assert.equal(result.next_gate, 'wave1_complete');
    assert.deepEqual(result.continuation, {
      interaction: 'prohibited',
      next_action: 'execute_loaded_node',
      node_ref: 'phases/phase-wave1.md',
    });

    const status = JSON.parse(readFileSync(statusPath, 'utf8'));
    assert.equal(status.current_gate, 'wave0_complete');
    assert.equal(status.next_gate, 'wave1_complete');
    assert.equal(status.current_node, 'phases/phase-wave1.md');

    const events = readFileSync(tracePath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.ok(events.some(e => e.event === 'phase_transition' && e.to === 'wave0_complete' && e.next === 'wave1_complete'));
  });

  it('preserves degraded source handoff context during status sync', () => {
    writeCurrentNode('phases/phase-wave1.md');
    writeTrace([
      gateAttempt({
        degraded: true,
        degraded_reason: 'fatigue_threshold_reached_with_only_degradation_eligible_quality_rules',
        degraded_rules: ['shared_ref_count_floor'],
      }),
      loadComplete(0, {
        handoff_source_degraded: true,
        handoff_source_degraded_reason: 'fatigue_threshold_reached_with_only_degradation_eligible_quality_rules',
        handoff_source_degraded_rules: ['shared_ref_count_floor'],
      }),
    ]);

    const result = runAdvance(dir, 'wave0_complete');
    assert.equal(result.status, 'ok');
    assert.equal(result.source_handoff_degraded, true);

    const events = readFileSync(tracePath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    const transition = events.find(e => e.event === 'phase_transition' && e.to === 'wave0_complete');
    assert.equal(transition.source_handoff_degraded, true);
    assert.deepEqual(transition.source_handoff_degraded_rules, ['shared_ref_count_floor']);
  });

  it('fails closed and restores status when phase_transition trace append fails', () => {
    writeCurrentNode('phases/phase-wave1.md');
    writeTrace([gateAttempt(), loadComplete(0)]);
    const before = readFileSync(statusPath, 'utf8');
    chmodSync(tracePath, 0o444);
    try {
      const result = runAdvance(dir, 'wave0_complete');
      assert.equal(result.status, 'error');
      assert.match(result.reason, /Failed to append phase_transition/);
      assert.equal(readFileSync(statusPath, 'utf8'), before);
    } finally {
      chmodSync(tracePath, 0o644);
    }

    const events = readFileSync(tracePath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.some(e => e.event === 'phase_transition'), false);
  });

  it('rejects old-style next-gate enum sync', () => {
    writeTrace([gateAttempt(), loadComplete(0)]);
    const result = runAdvance(dir, 'wave1_complete');
    assert.equal(result.status, 'error');
    assert.match(result.reason, /not the latest deterministic handoff/);
    assert.ok(result.advice.some(a => a.includes('--to wave0_complete')));
  });

  it('rejects superseded source pass and does not mutate status', () => {
    const before = readFileSync(statusPath, 'utf8');
    writeTrace([
      gateAttempt(),
      loadComplete(0),
      gateAttempt({
        ts: '2026-01-01T00:00:02.000Z',
        passed: false,
        next: null,
      }),
    ]);
    const result = runAdvance(dir, 'wave0_complete');
    assert.equal(result.status, 'error');
    assert.equal(readFileSync(statusPath, 'utf8'), before);
  });

  it('uses actual HITL2 rerun target instead of default passed target', () => {
    writeCurrentNode('phases/phase-rerun.md');
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
    const result = runAdvance(dir, 'hitl2_recorded');
    assert.equal(result.status, 'ok');
    assert.equal(result.next_gate, 'rerun_ready');
    assert.deepEqual(result.continuation, {
      interaction: 'prohibited',
      next_action: 'execute_loaded_node',
      node_ref: 'phases/phase-rerun.md',
    });
  });

  it('returns required-interaction cue for witnessed Wave2 to HITL2 handoff', () => {
    writeCurrentNode('phases/phase-hitl2.md');
    writeTrace([
      gateAttempt({
        gate: 'wave2-complete',
        phase: 'wave2',
        currentNodeRef: 'phases/phase-wave2.md',
        next: 'phases/phase-hitl2.md',
      }),
      loadComplete(0, {
        entry: 'phases/phase-hitl2.md',
        handoff_source_gate: 'wave2-complete',
        handoff_source_node: 'phases/phase-wave2.md',
        handoff_target_node: 'phases/phase-hitl2.md',
      }),
    ]);

    const result = runAdvance(dir, 'wave2_complete');
    assert.equal(result.status, 'ok');
    assert.equal(result.next_gate, 'hitl2_recorded');
    assert.deepEqual(result.continuation, {
      interaction: 'required',
      next_action: 'wait_for_user_in_loaded_node',
      node_ref: 'phases/phase-hitl2.md',
    });
  });

  it('sets next_gate none for witnessed readiness to final handoff', () => {
    writeCurrentNode('phases/phase-final.md');
    writeTrace([
      gateAttempt({
        gate: 'readiness-passed',
        phase: 'readiness',
        currentNodeRef: 'phases/phase-readiness.md',
        next: 'phases/phase-final.md',
      }),
      loadComplete(0, {
        entry: 'phases/phase-final.md',
        handoff_source_gate: 'readiness-passed',
        handoff_source_node: 'phases/phase-readiness.md',
        handoff_target_node: 'phases/phase-final.md',
      }),
    ]);
    const result = runAdvance(dir, 'readiness_passed');
    assert.equal(result.status, 'ok');
    assert.equal(result.next_gate, 'none');
    assert.deepEqual(result.continuation, {
      interaction: 'terminal_delivery',
      next_action: 'deliver_final_artifacts',
      node_ref: 'phases/phase-final.md',
    });
  });
});
