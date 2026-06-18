// subagent-relay.test.mjs — @impl SUD-001, SUS-001, SUC-001, SUR-001
// @impl FRE-001: Canonical test location tests/engine/subagent-relay.test.mjs
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';

import {
  MAX_CONCURRENT_SUBAGENTS,
  classifyBranch,
  forkRouter,
  convergeRepair,
  validateAndDiagnose,
  inspectFailure,
  SubagentWorkflowState,
  SlotResult,
  stageSubagentSlots,
  createSlot,
  getDispatchMap,
  writeSlotStatus,
  readSlotStatus,
  recordAgentSpawnRequested,
  ingestAgentReceipt,
  commitSlotResult,
  markSlotFailed,
  readSlotResult,
  collectResults,
  mergeResults,
  forkAndStageSubagents,
  collectAndMergeSubagentResults,
} from '../../DPT_FRAMEWORK/engine/subagent-relay.mjs';

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
    assert.equal(classifyBranch(baseState()), 'pass');
    assert.equal(classifyBranch(baseState({ ref_count: 2 })), 'fail_a');
    assert.equal(classifyBranch(baseState({ topicReadiness: 'not_ready' })), 'fail_b');
    assert.equal(classifyBranch(baseState({ ref_count: 0, topicReadiness: 'blocked' })), 'blocked');
    assert.equal(classifyBranch(baseState({ ref_count: 0, topicReadiness: 'not_ready' })), 'fail_b');
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

  it('stageSubagentSlots creates task, schema, status, and manifest files', () => {
    const slots = stageSubagentSlots(baseState(), testDir);
    assert.equal(slots.length, 4);

    const manifest = JSON.parse(readFileSync(path.join(testDir, '_subagents', 'wave_01', 'dispatch.json'), 'utf-8'));
    assert.equal(manifest.concurrencyCap, MAX_CONCURRENT_SUBAGENTS);
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
    assert.equal(stageSubagentSlots(baseState({ ref_count: 0 }), testDir).length, 0);
  });

  it('rejects dispatch above the v1 concurrency cap', () => {
    const tooMany = new Map([['pass', [
      { key: 'a', slotIndex: 0, roleAgentKey: 'dpt-source-intake', taskDescription: 'a' },
      { key: 'b', slotIndex: 1, roleAgentKey: 'dpt-source-diagnostic', taskDescription: 'b' },
      { key: 'c', slotIndex: 2, roleAgentKey: 'dpt-claim-verifier', taskDescription: 'c' },
      { key: 'd', slotIndex: 3, roleAgentKey: 'dpt-evidence-extractor', taskDescription: 'd' },
      { key: 'e', slotIndex: 4, roleAgentKey: 'dpt-topic-scout', taskDescription: 'e' },
    ]]]);
    assert.throws(() => stageSubagentSlots(baseState(), testDir, tooMany), /concurrency cap exceeded/i);
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
    slots = stageSubagentSlots(baseState(), testDir);
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

    const imported = ingestAgentReceipt(slot, testDir, { runtimeAgentId: 'runtime-receipt-agent-1' });
    assert.equal(imported.agent.runtimeAgentId, 'runtime-receipt-agent-1');
    assert.equal(readSlotStatus(slot, testDir), 'running');
    assert.ok(existsSync(path.join(testDir, slot.agentPath)));
  });

  it('commitSlotResult validates and writes result.json', () => {
    writeRuntimeReceipt(testDir, slots[0], {
      platform: 'codex',
      runtimeMode: 'builtin-agent-with-role-prompt',
      agentType: 'worker',
    });
    ingestAgentReceipt(slots[0], testDir, { runtimeAgentId: 'agent-1' });
    const relay = commitSlotResult(slots[0], testDir, doneResult(slots[0], 3), {
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
    ingestAgentReceipt(slots[1], testDir, { runtimeAgentId: 'agent-2' });
    const relay = commitSlotResult(slots[1], testDir, {
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
    ingestAgentReceipt(slots[2], testDir, { runtimeAgentId: 'agent-3' });
    markSlotFailed(slots[2], testDir, {
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

  it('validateAndDiagnose produces diagnostics for invalid state', () => {
    const result = validateAndDiagnose({ ...baseState(), ref_count: 'bad' }, SubagentWorkflowState);
    assert.equal(result.passed, false);
    assert.ok(inspectFailure(result.errors).length > 0);
  });

  it('forkAndStageSubagents stages slots and signals parent to launch agents', () => {
    const testDir = tempDir();
    try {
      const result = forkAndStageSubagents(baseState(), testDir);
      assert.equal(result.awaitingAgent, true);
      assert.equal(result.slots.length, 4);
      assert.ok(result.phaseLog.some((t) => t.phase === 'await_agent'));
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('collectAndMergeSubagentResults merges after agent results are committed', () => {
    const testDir = tempDir();
    try {
      // Trace auto-inits via ensureTrace(bundleDir) — no setup needed.
      const state = baseState();
      const { slots } = forkAndStageSubagents(state, testDir);
      for (const [index, slot] of slots.entries()) {
        writeRuntimeReceipt(testDir, slot, { platform: 'codex', runtimeMode: 'builtin-agent-with-role-prompt' });
        ingestAgentReceipt(slot, testDir, { runtimeAgentId: `agent-${index + 1}` });
        commitSlotResult(slot, testDir, doneResult(slot, index + 1), { platform: 'codex', runtimeMode: 'builtin-agent-with-role-prompt' });
      }
      const merged = collectAndMergeSubagentResults(state, slots, testDir);
      assert.equal(merged.finalState.ref_count, 15);
      assert.equal(merged.checkResult.passed, true);
      assert.equal(merged.forkDecision.branch, 'pass');
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('convergeRepair detects stall when state stops changing', () => {
    // blocked → classifyBranch returns 'blocked' immediately, before any iteration
    const dead = { ...baseState(), ref_count: 0, topicReadiness: 'blocked' };
    const deadResult = convergeRepair(dead, 3);
    assert.equal(deadResult.outcome, 'blocked');
    assert.equal(deadResult.iterations, 0);
  });

  it('convergeRepair respects maxIterations', () => {
    // ref_count=0 < ref_floor=5 → fail_a. Repair adds 2 per iteration.
    // With maxIterations=1, only one repair cycle runs.
    const low = baseState({ ref_count: 0 });
    const result = convergeRepair(low, 1);
    assert.equal(result.iterations, 1);
    assert.equal(result.state.ref_count, 2);
  });

  it('validateAndDiagnose returns passed for valid state', () => {
    const result = validateAndDiagnose(baseState(), SubagentWorkflowState);
    assert.equal(result.passed, true);
  });

  it('forkAndStageSubagents routes non-pass branch through convergeRepair', () => {
    const testDir = tempDir();
    try {
      const result = forkAndStageSubagents(baseState({ ref_count: 0 }), testDir);
      // fail_a → convergeRepair should run, no slots dispatched
      assert.equal(result.slots.length, 0);
      assert.ok(result.phaseLog.some((t) => t.phase === 'converge_repair'));
      assert.ok(result.finalState.ref_count >= 2);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('inspectFailure handles multiple Zod error codes', () => {
    // invalid_enum_value
    const badEnum = SubagentWorkflowState.safeParse({ ...baseState(), topicReadiness: 'unknown' });
    assert.equal(badEnum.success, false);
    const enumDiags = inspectFailure(badEnum.error);
    const enumDiag = enumDiags.find((d) => d.code === 'invalid_value');
    assert.ok(enumDiag, 'should diagnose invalid_value');

    // too_small
    const negEvidence = SlotResult.safeParse({
      slotKey: 'test', roleAgentKey: 'dpt-source-intake', status: 'done',
      summary: '', evidenceCount: -1, references: [], confidence: 0, notes: [],
    });
    assert.equal(negEvidence.success, false);
    const smallDiags = inspectFailure(negEvidence.error);
    const smallDiag = smallDiags.find((d) => d.code === 'too_small');
    assert.ok(smallDiag, 'should diagnose too_small');
  });

});
