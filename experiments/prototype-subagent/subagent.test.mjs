// subagent.test.mjs — @impl SUD-001, SUS-001, SUC-001, SUR-001
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

import {
  CONCURRENCY_CAP,
  evaluateBranch,
  forkRouter,
  convergeRepair,
  checkAndReflect,
  inspectFailure,
  SubagentWorkflowState,
  subagentDispatch,
  createSlot,
  getDispatchMap,
  writeSlotStatus,
  readSlotStatus,
  recordAgentSpawnRequested,
  importRuntimeReceipt,
  parentRelayWriteResult,
  markRelayFailure,
  readSlotResult,
  collectResults,
  mergeResults,
  runSubagentWave,
  collectAndMergeSubagentWave,
} from './subagent.mjs';
import { setTraceFile, traceInit, traceCleanup } from './trace.mjs';

function tempDir() {
  return mkdtempSync(path.join(tmpdir(), 'gs_test_'));
}

function baseState(overrides = {}) {
  return {
    current_gate: 'wave0_complete',
    ref_count: 5,
    ref_floor: 5,
    topicReadiness: 'ready',
    ...overrides,
  };
}

function doneResult(slot, evidenceCount = 2) {
  return {
    slotKey: slot.key,
    roleAgentKey: slot.roleAgentKey,
    status: 'done',
    summary: `Completed ${slot.roleAgentKey}`,
    evidenceCount,
    references: [{
      title: 'Example source',
      url: 'https://example.com/source',
      quote: 'short relevant fact',
      relevance: 'supports the slot task',
    }],
    confidence: 0.8,
    notes: [],
  };
}

function writeRuntimeReceipt(baseDir, slot, overrides = {}) {
  const receiptFile = path.join(baseDir, slot.receiptPath);
  mkdirSync(path.dirname(receiptFile), { recursive: true });
  const common = {
    slotKey: slot.key,
    roleAgentKey: slot.roleAgentKey,
    receiptNonce: slot.receiptNonce,
    platform: overrides.platform || 'codex',
    runtimeMode: overrides.runtimeMode || 'project-agent',
    agentType: overrides.agentType,
  };
  writeFileSync(receiptFile, [
    JSON.stringify({ event: 'agent_runtime_started', ...common }),
    JSON.stringify({ event: 'agent_result_ready', ...common }),
  ].join('\n') + '\n');
}

describe('Gate fork router', () => {
  it('routes deterministically by priority', () => {
    assert.equal(evaluateBranch(baseState()), 'pass');
    assert.equal(evaluateBranch(baseState({ ref_count: 2 })), 'fail_a');
    assert.equal(evaluateBranch(baseState({ topicReadiness: 'not_ready' })), 'fail_b');
    assert.equal(evaluateBranch(baseState({ ref_count: 0, topicReadiness: 'blocked' })), 'blocked');
    assert.equal(evaluateBranch(baseState({ ref_count: 0, topicReadiness: 'not_ready' })), 'fail_b');
  });

  it('forkRouter returns the branch and step', () => {
    const routed = forkRouter(baseState());
    assert.equal(routed.branch, 'pass');
    assert.equal(routed.step.name, 'pass_branch');
  });
});

describe('Subagent dispatch (SUD-001)', () => {
  let testDir;
  before(() => { testDir = tempDir(); });
  after(() => { rmSync(testDir, { recursive: true, force: true }); });

  it('dispatchMap uses stable DPT role agents', () => {
    const configs = getDispatchMap().get('pass');
    assert.equal(configs.length, 4);
    assert.deepEqual(configs.map((c) => c.roleAgentKey), [
      'dpt-source-intake',
      'dpt-source-diagnostic',
      'dpt-claim-verifier',
      'dpt-evidence-extractor',
    ]);
  });

  it('subagentDispatch creates task, schema, status, and manifest files', () => {
    const slots = subagentDispatch(baseState(), testDir);
    assert.equal(slots.length, 4);

    const manifest = JSON.parse(readFileSync(path.join(testDir, '_subagents', 'wave_01', 'dispatch.json'), 'utf-8'));
    assert.equal(manifest.concurrencyCap, CONCURRENCY_CAP);
    assert.equal(manifest.slots[0].roleAgentKey, 'dpt-source-intake');

    for (const slot of slots) {
      assert.ok(existsSync(path.join(testDir, slot.taskPath)));
      assert.ok(existsSync(path.join(testDir, slot.schemaPath)));
      assert.ok(existsSync(path.join(testDir, slot.statusPath)));
      assert.ok(slot.resultPath.endsWith('result.json'));
      assert.ok(slot.summaryPath.endsWith('result.md'));
      assert.ok(slot.receiptPath.endsWith('runtime-receipt.jsonl'));
      assert.ok(slot.receiptNonce);

      const task = readFileSync(path.join(testDir, slot.taskPath), 'utf-8');
      assert.ok(task.includes(slot.roleAgentKey));
      assert.ok(task.includes('Forbidden Authority'));
      assert.ok(!task.includes('Current references:'));
    }
  });

  it('non-pass branches do not dispatch', () => {
    assert.equal(subagentDispatch(baseState({ ref_count: 0 }), testDir).length, 0);
  });

  it('rejects dispatch above the v1 concurrency cap', () => {
    const tooMany = new Map([['pass', [
      { key: 'a', slotIndex: 0, roleAgentKey: 'dpt-source-intake', taskDescription: 'a' },
      { key: 'b', slotIndex: 1, roleAgentKey: 'dpt-source-diagnostic', taskDescription: 'b' },
      { key: 'c', slotIndex: 2, roleAgentKey: 'dpt-claim-verifier', taskDescription: 'c' },
      { key: 'd', slotIndex: 3, roleAgentKey: 'dpt-evidence-extractor', taskDescription: 'd' },
      { key: 'e', slotIndex: 4, roleAgentKey: 'dpt-topic-scout', taskDescription: 'e' },
    ]]]);
    assert.throws(() => subagentDispatch(baseState(), testDir, tooMany), /concurrency cap exceeded/i);
  });

  it('createSlot derives result.json, schema, status, and metadata paths', () => {
    const slot = createSlot({
      key: 'test_slot',
      slotIndex: 0,
      roleAgentKey: 'dpt-source-intake',
      taskDescription: 'Test task',
    }, 1);
    assert.equal(slot.taskPath, '_subagents/wave_01/slot_00/task.md');
    assert.equal(slot.schemaPath, '_subagents/wave_01/slot_00/result.schema.json');
    assert.equal(slot.resultPath, '_subagents/wave_01/slot_00/result.json');
    assert.equal(slot.summaryPath, '_subagents/wave_01/slot_00/result.md');
    assert.equal(slot.agentPath, '_subagents/wave_01/slot_00/_agent.json');
    assert.equal(slot.receiptPath, '_subagents/wave_01/slot_00/runtime-receipt.jsonl');
  });
});

describe('Slot lifecycle (SUS-001)', () => {
  const freshSlot = (index = 0, key = 'test') => ({
    key,
    roleAgentKey: 'dpt-source-intake',
    waveIndex: 1,
    slotIndex: index,
    taskPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/task.md`,
    schemaPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/result.schema.json`,
    resultPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/result.json`,
    summaryPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/result.md`,
    statusPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/_status.json`,
    agentPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/_agent.json`,
    receiptPath: `_subagents/wave_01/slot_${String(index).padStart(2, '0')}/runtime-receipt.jsonl`,
    receiptNonce: `nonce-${index}`,
    status: 'pending',
  });

  let testDir;
  before(() => { testDir = tempDir(); });
  after(() => { rmSync(testDir, { recursive: true, force: true }); });

  it('supports valid transitions and rejects terminal rollback', () => {
    const slot = freshSlot(0);
    assert.equal(readSlotStatus(slot, testDir), 'pending');
    writeSlotStatus(slot, 'running', testDir);
    writeSlotStatus(slot, 'done', testDir);
    assert.equal(readSlotStatus(slot, testDir), 'done');
    assert.throws(() => writeSlotStatus(slot, 'running', testDir), /Invalid slot status transition/);
  });

  it('supports failure transitions', () => {
    const slot = freshSlot(1);
    writeSlotStatus(slot, 'running', testDir);
    writeSlotStatus(slot, 'failed', testDir);
    assert.equal(readSlotStatus(slot, testDir), 'failed');
    assert.throws(() => writeSlotStatus(slot, 'done', testDir), /Invalid slot status transition/);
  });
});

describe('Parent Relay and collect (SUC-001)', () => {
  let testDir;
  let slots;
  before(() => {
    testDir = tempDir();
    slots = subagentDispatch(baseState(), testDir);
  });
  after(() => { rmSync(testDir, { recursive: true, force: true }); });

  it('builds spawn prompt that requires native runtime receipt', () => {
    const prompt = recordAgentSpawnRequested(slots[0], testDir, {
      platform: 'codex',
      runtimeMode: 'builtin-agent-with-role-prompt',
      parentRuntimeAgentId: 'parent-agent-1',
    });
    assert.ok(prompt.includes(slots[0].roleAgentKey));
    assert.ok(prompt.includes('result.schema.json'));
    assert.ok(prompt.includes('runtime-receipt.jsonl'));
  });

  it('imports runtime receipt written by the native subagent', () => {
    const slot = createSlot({
      key: 'receipt_slot',
      slotIndex: 10,
      roleAgentKey: 'dpt-source-intake',
      taskDescription: 'Test receipt import',
    }, 1);
    writeRuntimeReceipt(testDir, slot);

    const imported = importRuntimeReceipt(slot, testDir, { runtimeAgentId: 'runtime-receipt-agent-1' });
    assert.equal(imported.agent.runtimeAgentId, 'runtime-receipt-agent-1');
    assert.equal(readSlotStatus(slot, testDir), 'running');
    assert.ok(existsSync(path.join(testDir, slot.agentPath)));
  });

  it('parentRelayWriteResult validates and writes result.json', () => {
    writeRuntimeReceipt(testDir, slots[0], {
      platform: 'codex',
      runtimeMode: 'builtin-agent-with-role-prompt',
      agentType: 'worker',
    });
    importRuntimeReceipt(slots[0], testDir, { runtimeAgentId: 'agent-1' });
    const relay = parentRelayWriteResult(slots[0], testDir, doneResult(slots[0], 3), {
      platform: 'codex',
      runtimeMode: 'builtin-agent-with-role-prompt',
      agentType: 'worker',
      runtimeAgentId: 'agent-1',
      parentRuntimeAgentId: 'parent-agent-1',
    });
    assert.equal(relay.ok, true);
    assert.equal(readSlotStatus(slots[0], testDir), 'done');
    assert.ok(existsSync(path.join(testDir, slots[0].resultPath)));

    const collected = readSlotResult(slots[0], testDir);
    assert.equal(collected.status, 'done');
    assert.equal(collected.evidenceCount, 3);
  });

  it('schema invalid return becomes a failed slot', () => {
    writeRuntimeReceipt(testDir, slots[1], {
      platform: 'claude-code',
      runtimeMode: 'project-agent',
    });
    importRuntimeReceipt(slots[1], testDir, { runtimeAgentId: 'agent-2' });
    const relay = parentRelayWriteResult(slots[1], testDir, {
      slotKey: 'wrong',
      roleAgentKey: slots[1].roleAgentKey,
      status: 'done',
      summary: '',
      evidenceCount: 1,
      references: [],
      confidence: 0,
      notes: [],
    }, {
      platform: 'claude-code',
      runtimeMode: 'project-agent',
      runtimeAgentId: 'agent-2',
    });
    assert.equal(relay.ok, false);
    assert.equal(readSlotStatus(slots[1], testDir), 'failed');
    assert.equal(readSlotResult(slots[1], testDir).status, 'failed');
  });

  it('relay failure records a failed result', () => {
    writeRuntimeReceipt(testDir, slots[2], {
      platform: 'codex',
      runtimeMode: 'builtin-agent-with-role-prompt',
    });
    importRuntimeReceipt(slots[2], testDir, { runtimeAgentId: 'agent-3' });
    markRelayFailure(slots[2], testDir, {
      platform: 'codex',
      runtimeMode: 'builtin-agent-with-role-prompt',
      runtimeAgentId: 'agent-3',
    }, 'timeout');
    assert.equal(readSlotResult(slots[2], testDir).status, 'failed');
  });

  it('collectResults and mergeResults handle partial failure', () => {
    const results = collectResults(slots, testDir);
    assert.equal(results.length, 4);
    assert.equal(results.filter((r) => r.status === 'done').length, 1);
    assert.equal(results.filter((r) => r.status === 'failed').length, 3);

    const merged = mergeResults(results, baseState());
    assert.equal(merged.ref_count, 8);
    assert.equal(merged.subagent_all_failed, false);
    assert.equal(merged.subagent_results.length, 4);
  });
});

describe('Repair, C&I, and pipeline split', () => {
  it('all failed routes through repair semantics', () => {
    const results = [
      { slotKey: 'a', roleAgentKey: 'dpt-source-intake', status: 'failed', summary: '', evidenceCount: 0, references: [], confidence: 0, notes: [] },
      { slotKey: 'b', roleAgentKey: 'dpt-source-diagnostic', status: 'failed', summary: '', evidenceCount: 0, references: [], confidence: 0, notes: [] },
    ];
    const merged = mergeResults(results, baseState());
    assert.equal(merged.subagent_all_failed, true);
    assert.equal(convergeRepair(merged).outcome, 'pass');
  });

  it('checkAndReflect produces diagnostics for invalid state', () => {
    const result = checkAndReflect({ ...baseState(), ref_count: 'bad' }, SubagentWorkflowState);
    assert.equal(result.passed, false);
    assert.ok(inspectFailure(result.errors).length > 0);
  });

  it('runSubagentWave dispatches and waits for Parent Relay instead of executing agents', () => {
    const testDir = tempDir();
    try {
      const result = runSubagentWave(baseState(), testDir);
      assert.equal(result.awaitingParentRelay, true);
      assert.equal(result.slots.length, 4);
      assert.ok(result.trace.some((t) => t.phase === 'await_parent_relay'));
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('collectAndMergeSubagentWave merges after Parent Relay files exist', () => {
    const testDir = tempDir();
    try {
      setTraceFile(path.join(testDir, '_trace.jsonl'));
      traceInit('gs-test/collect', { source: 'gs-test/collect' });
      const state = baseState();
      const { slots } = runSubagentWave(state, testDir);
      for (const [index, slot] of slots.entries()) {
        writeRuntimeReceipt(testDir, slot, { platform: 'codex', runtimeMode: 'builtin-agent-with-role-prompt' });
        importRuntimeReceipt(slot, testDir, { runtimeAgentId: `agent-${index + 1}` });
        parentRelayWriteResult(slot, testDir, doneResult(slot, index + 1), { platform: 'codex', runtimeMode: 'builtin-agent-with-role-prompt' });
      }
      const merged = collectAndMergeSubagentWave(state, slots, testDir);
      assert.equal(merged.finalState.ref_count, 15);
      assert.equal(merged.ci.passed, true);
      assert.equal(merged.reFork.branch, 'pass');
      traceCleanup();
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});
