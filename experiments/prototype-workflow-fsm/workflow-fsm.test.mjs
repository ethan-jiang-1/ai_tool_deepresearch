// workflow-fsm.test.mjs — FSM-driven workflow engine 单元测试
// @impl WFS-001, WFS-002, WFS-003

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, unlinkSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.env.NODES_DIR = join(__dirname, 'nodes-workflow-fsm');

import {
  loadFSM,
  createFSMRuntime,
  resolveTransition,
  createInitialState,
  runFSM,
  createMachine,
} from './workflow-fsm.mjs';

const NOD = process.env.NODES_DIR;

// ─── 1. FSM Loading (WFS-001) ────────────────────────────────────────

describe('1. FSM Loading (WFS-001)', () => {

  it('1.1 loads valid FSM', () => {
    const fsm = loadFSM(join(NOD, 'wf-simple.fsm.json'));
    assert.equal(fsm.name, 'wf-simple');
    assert.equal(fsm.initial, 'wave.entry.md');
    assert.ok('wave.entry.md' in fsm.states);
    assert.ok('wave-final.entry.md' in fsm.states);
  });

  it('1.2 rejects FSM with initial not in states', () => {
    const badFSM = {
      name: 'bad',
      initial: 'nonexistent.md',
      states: { 'real.md': { on: { success: null } } },
    };
    const tmpPath = join(NOD, '_test_bad.fsm.json');
    writeFileSync(tmpPath, JSON.stringify(badFSM));
    assert.throws(() => loadFSM(tmpPath), /initial/);
    unlinkSync(tmpPath);
  });

  it('1.3 rejects empty states', () => {
    const emptyFSM = {
      name: 'empty',
      initial: 'x.md',
      states: {},
    };
    const tmpPath = join(NOD, '_test_empty.fsm.json');
    writeFileSync(tmpPath, JSON.stringify(emptyFSM));
    assert.throws(() => loadFSM(tmpPath));
    unlinkSync(tmpPath);
  });

  it('1.4 createFSMRuntime initializes correctly', () => {
    const fsm = loadFSM(join(NOD, 'wf-simple.fsm.json'));
    const rt = createFSMRuntime(fsm);
    assert.equal(rt.currentState, 'wave.entry.md');
    assert.equal(rt.contentCache.size, 0);
    assert.equal(rt.receipts.length, 0);
    assert.equal(rt.executionLog.length, 0);
  });
});

// ─── 2. Transition Resolution (WFS-002) ──────────────────────────────

describe('2. Transition Resolution (WFS-002)', () => {

  const fsm = loadFSM(join(NOD, 'wf-simple.fsm.json'));

  it('2.1 advance: returns next node', () => {
    const result = resolveTransition(fsm, 'wave.entry.md', 'success');
    assert.equal(result.action, 'advance');
    assert.equal(result.next, 'wave-audit.entry.md');
  });

  it('2.2 complete: null target', () => {
    const result = resolveTransition(fsm, 'wave-final.entry.md', 'success');
    assert.equal(result.action, 'complete');
  });

  it('2.3 halt: unknown status', () => {
    const result = resolveTransition(fsm, 'wave.entry.md', 'unknown_status');
    assert.equal(result.action, 'halt');
    assert.ok(result.reason.includes('undefined_status') || result.reason.includes('unknown_status') || result.reason.includes('No transition'));
  });

  it('2.4 halt: unknown node', () => {
    const result = resolveTransition(fsm, 'nonexistent.md', 'success');
    assert.equal(result.action, 'halt');
    assert.ok(result.reason.includes('nonexistent.md'));
  });
});

// ─── 3. runFSM Simple Chain (WFS-003) ────────────────────────────────

describe('3. runFSM Simple Chain (WFS-003)', () => {

  it('3.1 3-node chain completes in order', () => {
    const fsm = loadFSM(join(NOD, 'wf-simple.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    const result = runFSM(fsm, state, rt);

    assert.equal(result.outcome, 'complete');
    assert.deepEqual(result.finalState.executionOrder, [
      'wave.entry.md',
      'wave-audit.entry.md',
      'wave-final.entry.md',
    ]);
    assert.equal(result.finalState.counters.wave, 3);
  });

  it('3.2 runtime.currentState tracks progress', () => {
    const fsm = loadFSM(join(NOD, 'wf-simple.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    assert.equal(rt.currentState, 'wave.entry.md');
    runFSM(fsm, state, rt);
    // After completion, currentState should be the last state that resolved
    assert.equal(rt.currentState, 'wave-final.entry.md');
  });

  it('3.3 receipts include node_start, transition, file_executed', () => {
    const fsm = loadFSM(join(NOD, 'wf-simple.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    runFSM(fsm, state, rt);

    const starts = rt.receipts.filter(r => r.type === 'node_start');
    const completes = rt.receipts.filter(r => r.type === 'node_complete');
    const transitions = rt.receipts.filter(r => r.type === 'transition');
    const execs = rt.receipts.filter(r => r.type === 'file_executed');

    assert.equal(starts.length, 3);
    assert.equal(completes.length, 3);
    assert.equal(transitions.length, 3);
    assert.equal(execs.length, 3);
  });
});

// ─── 4. runFSM Retry (WFS-002, WFS-003) ─────────────────────────────

describe('4. runFSM Retry (WFS-002)', () => {

  it('4.1 retries on error then succeeds', () => {
    const fsm = loadFSM(join(NOD, 'wf-retry.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    const result = runFSM(fsm, state, rt);

    assert.equal(result.outcome, 'complete');
    // retry-node executed twice (first error, second success), retry-next once
    assert.equal(result.finalState.counters.retryNode, 2);
    assert.equal(result.finalState.counters.retryNext, 1);
    assert.deepEqual(result.finalState.executionOrder, [
      'retry-node.entry.md',
      'retry-node.entry.md',
      'retry-next.entry.md',
    ]);
  });

  it('4.2 transition receipts show error then success', () => {
    const fsm = loadFSM(join(NOD, 'wf-retry.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    runFSM(fsm, state, rt);

    const transitions = rt.receipts.filter(r => r.type === 'transition');
    assert.equal(transitions.length, 3); // error, success, success
    assert.equal(transitions[0].status, 'error');
    assert.equal(transitions[1].status, 'success');
  });

  it('4.3 currentState unchanged on retry', () => {
    const fsm = loadFSM(join(NOD, 'wf-retry.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    // Before execution, currentState is retry-node.md
    assert.equal(rt.currentState, 'retry-node.entry.md');
    runFSM(fsm, state, rt);
    // After completion, currentState advanced to retry-next.md
    assert.equal(rt.currentState, 'retry-next.entry.md');
  });

  it('4.4 maxIterations guard halts infinite self-loop', () => {
    const fsm = loadFSM(join(NOD, 'wf-retry.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    // retry-node.md returns 'error' on first execution (counter 0→1),
    // then 'success' on second (counter 1→2). With maxIterations=1,
    // it won't get a second chance.
    const result = runFSM(fsm, state, rt, 1);

    assert.equal(result.outcome, 'halted');
    assert.ok(result.reason.includes('max iterations') || result.reason.includes('Exceeded'));
    assert.equal(result.iterations, 1);
  });
});

// ─── 5. runFSM Halt (WFS-002, WFS-003) ──────────────────────────────

describe('5. runFSM Halt (WFS-002)', () => {

  it('5.1 halts on undefined status', () => {
    const fsm = loadFSM(join(NOD, 'wf-halt.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    const result = runFSM(fsm, state, rt);

    assert.equal(result.outcome, 'halted');
    assert.ok(result.reason.includes('undefined_status') || result.reason.includes('No transition'));
    // The node DID execute once
    assert.equal(result.finalState.counters.haltNode, 1);
  });

  it('5.2 halts on missing dependency', () => {
    const fsm = loadFSM(join(NOD, 'wf-missing.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    const result = runFSM(fsm, state, rt);

    assert.equal(result.outcome, 'halted');
    assert.ok(result.reason.includes('nonexistent-file.md') || result.reason.includes('File not found'));
    // The entry node never executed
    assert.equal(result.finalState.counters.missingEntry || 0, 0);
  });

  it('5.3 halts on cycle dependency', () => {
    const fsm = loadFSM(join(NOD, 'wf-cycle.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    const result = runFSM(fsm, state, rt);

    assert.equal(result.outcome, 'halted');
    assert.ok(result.reason.includes('cycle'));
    assert.equal(result.finalState.counters.cycleA || 0, 0);
  });

  it('5.4 halts on malformed frontmatter', () => {
    const fsm = loadFSM(join(NOD, 'wf-malformed.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    const result = runFSM(fsm, state, rt);

    assert.equal(result.outcome, 'halted');
    assert.ok(result.reason.includes('Malformed JSON') || result.reason.includes('JSON'));
    assert.equal(result.finalState.counters.malformedEntry || 0, 0);
  });
});

// ─── 6. Dependency Chain (WFS-003) ───────────────────────────────────

describe('6. Dependency Chain (WFS-003)', () => {

  it('6.1 dependencies execute before requester', () => {
    const fsm = loadFSM(join(NOD, 'wf-chain.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    const result = runFSM(fsm, state, rt);

    assert.equal(result.outcome, 'complete');
    const order = result.finalState.executionOrder;
    const pIdx = order.indexOf('chain-policy.dep.md');
    const cIdx = order.indexOf('chain-context.dep.md');
    const eIdx = order.indexOf('chain.entry.md');

    assert.ok(pIdx >= 0 && cIdx >= 0 && eIdx >= 0, 'all three present');
    assert.ok(pIdx < cIdx, 'policy before context');
    assert.ok(cIdx < eIdx, 'context before entry');
  });

  it('6.2 dependency counters reflect execution', () => {
    const fsm = loadFSM(join(NOD, 'wf-chain.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    const result = runFSM(fsm, state, rt);

    assert.equal(result.finalState.counters.chainPolicy, 1);
    assert.equal(result.finalState.counters.chainContext, 1);
    assert.equal(result.finalState.counters.chainEntry, 1);
  });
});

// ─── 7. Content Cache + Execution Separation (WFS-003) ───────────────

describe('7. Cache / Execute Separation (WFS-003)', () => {

  it('7.1 shared-lib cached on second reference, re-executed', () => {
    const fsm = loadFSM(join(NOD, 'wf-cache.fsm.json'));
    const rt = createFSMRuntime(fsm);
    const state = createInitialState();

    const result = runFSM(fsm, state, rt);

    assert.equal(result.outcome, 'complete');

    const reads = rt.receipts.filter(r => r.type === 'file_read' && r.fileRef === 'shared-lib.dep.md');
    const hits = rt.receipts.filter(r => r.type === 'cache_hit' && r.fileRef === 'shared-lib.dep.md');
    const execs = rt.receipts.filter(r => r.type === 'file_executed' && r.fileRef === 'shared-lib.dep.md');

    // First encounter: file_read, second: cache_hit
    assert.equal(reads.length, 1, 'shared-lib should be read from disk once');
    assert.equal(hits.length, 1, 'shared-lib should be cache-hit on second reference');
    // But executed twice (once per reference)
    assert.equal(execs.length, 2, 'shared-lib executed twice');
    // Counter confirms two executions
    assert.equal(result.finalState.counters.sharedLib, 2);
  });
});

// ─── 8. Recovery (WFS-003) ───────────────────────────────────────────

describe('8. Recovery (WFS-003)', () => {

  it('8.1 valid path works after halt', () => {
    // First, a halt FSM
    const haltFSM = loadFSM(join(NOD, 'wf-halt.fsm.json'));
    const haltRT = createFSMRuntime(haltFSM);
    const haltState = createInitialState();
    const haltResult = runFSM(haltFSM, haltState, haltRT);
    assert.equal(haltResult.outcome, 'halted');

    // New FSM, new runtime — should work fine
    const validFSM = loadFSM(join(NOD, 'wf-valid.fsm.json'));
    const validRT = createFSMRuntime(validFSM);
    const validState = createInitialState();
    const validResult = runFSM(validFSM, validState, validRT);

    assert.equal(validResult.outcome, 'complete');
    assert.deepEqual(validResult.finalState.executionOrder, ['wave.entry.md']);
  });
});

// ─── 9. Machine (Declarative API, WFS-003) ──────────────────────────

describe('9. Machine (WFS-003)', () => {

  it('9.1 createMachine from path initializes correctly', () => {
    const m = createMachine(join(NOD, 'wf-simple.fsm.json'));
    assert.equal(m.current, 'wave.entry.md');
    assert.equal(m.outcome, 'running');
    assert.equal(m.canAdvance, true);
    assert.equal(m.isComplete, false);
    assert.equal(m.isHalted, false);
    assert.equal(m.iterations, 0);
    assert.equal(m.receipts.length, 0);
    assert.equal(m.state.executionOrder.length, 0);
  });

  it('9.2 step advances through 3-node chain', () => {
    const m = createMachine(join(NOD, 'wf-simple.fsm.json'));

    assert.equal(m.step(), 'running');
    assert.equal(m.current, 'wave-audit.entry.md');

    assert.equal(m.step(), 'running');
    assert.equal(m.current, 'wave-final.entry.md');

    assert.equal(m.step(), 'complete');
    assert.equal(m.isComplete, true);
    assert.equal(m.canAdvance, false);
  });

  it('9.3 run completes full chain and returns outcome', () => {
    const m = createMachine(join(NOD, 'wf-simple.fsm.json'));
    const outcome = m.run();
    assert.equal(outcome, 'complete');
    assert.equal(m.isComplete, true);
    assert.equal(m.iterations, 3);
    assert.deepEqual(m.state.executionOrder, [
      'wave.entry.md',
      'wave-audit.entry.md',
      'wave-final.entry.md',
    ]);
  });

  it('9.4 step is no-op after completion', () => {
    const m = createMachine(join(NOD, 'wf-simple.fsm.json'));
    m.run();
    const outcome = m.step();
    assert.equal(outcome, 'complete');
    assert.equal(m.iterations, 3); // no extra step
  });

  it('9.5 retry self-loop works with step', () => {
    const m = createMachine(join(NOD, 'wf-retry.fsm.json'));

    // First step: retry-node → error → self-loop
    assert.equal(m.step(), 'running');
    assert.equal(m.current, 'retry-node.entry.md'); // unchanged (self-loop)
    assert.equal(m.state.counters.retryNode, 1);

    // Second step: retry-node → success → advance
    assert.equal(m.step(), 'running');
    assert.equal(m.current, 'retry-next.entry.md');
    assert.equal(m.state.counters.retryNode, 2);

    // Third step: retry-next → success → complete
    assert.equal(m.step(), 'complete');
    assert.equal(m.state.counters.retryNext, 1);
  });

  it('9.6 receipts are accumulated across steps', () => {
    const m = createMachine(join(NOD, 'wf-simple.fsm.json'));
    m.run();

    const starts = m.receipts.filter(r => r.type === 'node_start');
    const completes = m.receipts.filter(r => r.type === 'node_complete');
    const transitions = m.receipts.filter(r => r.type === 'transition');

    assert.equal(starts.length, 3);
    assert.equal(completes.length, 3);
    assert.equal(transitions.length, 3);
  });

  it('9.7 halts on undefined status and reports reason', () => {
    const m = createMachine(join(NOD, 'wf-halt.fsm.json'));
    m.step();
    assert.equal(m.outcome, 'halted');
    assert.ok(m.haltReason.includes('undefined_status') || m.haltReason.includes('No transition'));
  });

  it('9.8 maxIterations guard works with run', () => {
    const m = createMachine(join(NOD, 'wf-retry.fsm.json'));
    // retry-node needs 2 iterations to succeed, but we cap at 1
    const outcome = m.run(1);
    assert.equal(outcome, 'halted');
    assert.ok(m.haltReason.includes('max iterations') || m.haltReason.includes('Exceeded'));
    assert.equal(m.iterations, 1);
  });

  it('9.9 run returns outcome string', () => {
    const m1 = createMachine(join(NOD, 'wf-simple.fsm.json'));
    assert.equal(m1.run(), 'complete');

    const m2 = createMachine(join(NOD, 'wf-halt.fsm.json'));
    assert.equal(m2.run(), 'halted');
  });
});
