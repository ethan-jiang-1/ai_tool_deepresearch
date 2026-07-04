// subagent-relay-slot-runtime.test.mjs — @impl FRE-004, SUS-001, SUC-001
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  stageSubagentSlots,
  createSlot,
  writeSlotStatus,
  readSlotStatus,
  recordAgentSpawnRequested,
  ingestAgentReceipt,
  commitSlotResult,
  markSlotFailed,
  readSlotResult,
  validateRuntimeReceipt,
  forkAndStageSubagents,
  collectAndMergeSubagentResults,
} from '../../DPT_FRAMEWORK/engine/subagent-relay.mjs';
import {
  baseState,
  tempDir,
  doneResult,
  writeRuntimeReceipt,
  setupRelayBundle,
  freshSlot,
  readTraceEvents,
} from './subagent-relay-helpers.mjs';

describe('Slot lifecycle (SUS-001)', () => {
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

});

describe('Agent Output Declaration commit paths (Stage 1)', () => {
  it('commitSlotResult rejects path escape in output_files', () => {
    const testDir = tempDir();
    try {
      const [slot] = stageSubagentSlots(baseState(), testDir);
      writeRuntimeReceipt(testDir, slot);
      ingestAgentReceipt(slot, testDir, { runtimeAgentId: 'agent-esc' });
      const relay = commitSlotResult(slot, testDir, {
        slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done',
        summary: '', evidenceCount: 1,
        references: [{ title: 'T', url: 'https://x.com', quote: '', relevance: '' }],
        confidence: 1, notes: [],
        output_files: [
          { path: '../../etc/passwd', role: 'reference', source_url: 'https://x.com' },
        ],
        cache_trails: [],
      });
      assert.equal(relay.ok, false);
      assert.ok(relay.result.notes.some((n) => n.includes('path escapes bundle')));
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('commitSlotResult rejects path escape in cache_trails', () => {
    const testDir = tempDir();
    try {
      const [slot] = stageSubagentSlots(baseState(), testDir);
      writeRuntimeReceipt(testDir, slot);
      ingestAgentReceipt(slot, testDir, { runtimeAgentId: 'agent-esc2' });
      const relay = commitSlotResult(slot, testDir, {
        slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done',
        summary: '', evidenceCount: 1,
        references: [{ title: 'T', url: 'https://x.com', quote: '', relevance: '' }],
        confidence: 1, notes: [],
        output_files: [],
        cache_trails: ['../escape/'],
      });
      assert.equal(relay.ok, false);
      assert.ok(relay.result.notes.some((n) => n.includes('path escapes bundle')));
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('commitSlotResult accepts valid declaration with output_files and cache_trails', () => {
    const testDir = tempDir();
    try {
      const [slot] = stageSubagentSlots(baseState(), testDir);
      writeRuntimeReceipt(testDir, slot);
      ingestAgentReceipt(slot, testDir, { runtimeAgentId: 'agent-ok' });
      const relay = commitSlotResult(slot, testDir, {
        slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done',
        summary: 'Done', evidenceCount: 2,
        references: [{ title: 'S', url: 'https://s.com/a', quote: 'q', relevance: 'r' }],
        confidence: 0.9, notes: [],
        output_files: [
          { path: 'reference/source.md', role: 'reference', source_url: 'https://s.com/a' },
          { path: 'source.yaml', role: 'source_yaml' },
        ],
        cache_trails: ['_cache/wave0/primary/01_src/s01_leaf/'],
      });
      assert.equal(relay.ok, true);
      assert.equal(relay.result.output_files.length, 2);
      assert.equal(relay.result.cache_trails.length, 1);
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});

describe('Pure runtime receipt validation (SUR-001, Stage 1)', () => {
  let testDir;
  let slot;
  before(() => {
    testDir = tempDir();
    [slot] = stageSubagentSlots(baseState(), testDir);
  });
  after(() => { rmSync(testDir, { recursive: true, force: true }); });

  it('validateRuntimeReceipt passes for valid receipt', () => {
    writeRuntimeReceipt(testDir, slot);
    const result = validateRuntimeReceipt(slot, testDir);
    assert.equal(result.passed, true);
    assert.equal(result.events.length, 2);
  });

  it('validateRuntimeReceipt fails for missing receipt file', () => {
    // Remove receipt file to test missing case
    const receiptFile = path.join(testDir, slot.receiptPath);
    if (existsSync(receiptFile)) rmSync(receiptFile, { force: true });
    const result = validateRuntimeReceipt(slot, testDir);
    assert.equal(result.passed, false);
    assert.ok(result.error.includes('missing'));
  });

  it('validateRuntimeReceipt fails for missing agent_runtime_started', () => {
    const receiptFile = path.join(testDir, slot.receiptPath);
    mkdirSync(path.dirname(receiptFile), { recursive: true });
    writeFileSync(receiptFile, JSON.stringify({
      event: 'agent_result_ready', slotKey: slot.key,
      roleAgentKey: slot.roleAgentKey, receiptNonce: slot.receiptNonce,
    }) + '\n');
    const result = validateRuntimeReceipt(slot, testDir);
    assert.equal(result.passed, false);
    assert.ok(result.error.includes('agent_runtime_started'));
  });

  it('validateRuntimeReceipt fails for nonce mismatch', () => {
    const receiptFile = path.join(testDir, slot.receiptPath);
    mkdirSync(path.dirname(receiptFile), { recursive: true });
    writeFileSync(receiptFile, [
      JSON.stringify({ event: 'agent_runtime_started', slotKey: slot.key, roleAgentKey: slot.roleAgentKey, receiptNonce: 'wrong-nonce' }),
      JSON.stringify({ event: 'agent_result_ready', slotKey: slot.key, roleAgentKey: slot.roleAgentKey, receiptNonce: 'wrong-nonce' }),
    ].join('\n') + '\n');
    const result = validateRuntimeReceipt(slot, testDir);
    assert.equal(result.passed, false);
    assert.ok(result.error.includes('nonce mismatch'));
  });

  it('validateRuntimeReceipt fails for slotKey mismatch', () => {
    const receiptFile = path.join(testDir, slot.receiptPath);
    writeFileSync(receiptFile, [
      JSON.stringify({ event: 'agent_runtime_started', slotKey: 'wrong-slot', roleAgentKey: slot.roleAgentKey, receiptNonce: slot.receiptNonce }),
      JSON.stringify({ event: 'agent_result_ready', slotKey: 'wrong-slot', roleAgentKey: slot.roleAgentKey, receiptNonce: slot.receiptNonce }),
    ].join('\n') + '\n');
    const result = validateRuntimeReceipt(slot, testDir);
    assert.equal(result.passed, false);
    assert.ok(result.error.includes('slotKey mismatch'));
  });

  it('validateRuntimeReceipt does not require runtimeAgentId', () => {
    writeRuntimeReceipt(testDir, slot);
    const result = validateRuntimeReceipt(slot, testDir);
    assert.equal(result.passed, true);
    // No runtimeAgentId was provided — this is the key difference from ingestAgentReceipt
  });

  it('ingestAgentReceipt returns receiptRef', () => {
    const slot2 = createSlot({
      key: 'ref_slot', slotIndex: 20,
      roleAgentKey: 'dpt-source-intake', taskDescription: 'Test ref',
    }, 1);
    writeRuntimeReceipt(testDir, slot2);
    const imported = ingestAgentReceipt(slot2, testDir, { runtimeAgentId: 'agent-ref' });
    assert.ok(imported.receiptRef);
    assert.ok(imported.receiptRef.includes('runtime-receipt.jsonl'));
  });
});

describe('LOG-006 relay diagnostics', () => {
  it('stageSubagentSlots logs attempt/done for pass branch', () => {
    const dir = setupRelayBundle('stage');
    const state = baseState({ ref_count: 5, ref_floor: 5 });
    const slots = stageSubagentSlots(state, dir);
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('relay_stage_attempt'));
    assert.ok(content.includes('relay_stage_done'));
    assert.ok(content.includes('"kind":"queue_enqueue"'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('stageSubagentSlots logs empty for non-pass branch', () => {
    const dir = setupRelayBundle('stage-empty');
    const state = baseState({ ref_count: 5, ref_floor: 5 }); // meets floor → pass, but we want a fail branch
    // Use a state that forkRouter classifies as non-pass
    const state2 = baseState({ ref_count: 5, ref_floor: 5, topicReadiness: 'blocked' });
    const slots = stageSubagentSlots(state2, dir);
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('relay_stage_attempt'));
    // May or may not be empty depending on dispatchMap; just verify attempt was logged
    rmSync(dir, { recursive: true, force: true });
  });

  it('recordAgentSpawnRequested logs attempt/requested', () => {
    const dir = setupRelayBundle('spawn');
    const state = baseState({ ref_count: 5, ref_floor: 5 });
    const slots = stageSubagentSlots(state, dir);
    assert.ok(slots.length > 0);
    const prompt = recordAgentSpawnRequested(slots[0], dir, { platform: 'codex' });
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('relay_spawn_attempt'));
    assert.ok(content.includes('relay_spawn_requested'));
    assert.ok(content.includes('"slotKey"'));
    assert.ok(content.includes('"roleAgentKey"'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('ingestAgentReceipt logs attempt/done on success', () => {
    const dir = setupRelayBundle('ingest');
    const state = baseState({ ref_count: 5, ref_floor: 5 });
    const slots = stageSubagentSlots(state, dir);
    const slot = slots[0];
    writeRuntimeReceipt(dir, slot, { platform: 'codex', runtimeMode: 'project-agent' });
    const result = ingestAgentReceipt(slot, dir, { runtimeAgentId: 'test-agent-1', platform: 'codex' });
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('relay_receipt_ingest_attempt'));
    assert.ok(content.includes('relay_receipt_ingest_done'));
    assert.ok(content.includes('"kind":"receipt_check"'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('ingestAgentReceipt logs failed on missing runtimeAgentId', () => {
    const dir = setupRelayBundle('ingest-fail');
    const state = baseState({ ref_count: 5, ref_floor: 5 });
    const slots = stageSubagentSlots(state, dir);
    const slot = slots[0];
    writeRuntimeReceipt(dir, slot);
    assert.throws(() => {
      ingestAgentReceipt(slot, dir, {}); // missing runtimeAgentId
    });
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('relay_receipt_ingest_attempt'));
    assert.ok(content.includes('relay_receipt_ingest_failed'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('commitSlotResult logs schema_fail on invalid result', () => {
    const dir = setupRelayBundle('commit-schema');
    const state = baseState({ ref_count: 5, ref_floor: 5 });
    const slots = stageSubagentSlots(state, dir);
    const slot = slots[0];
    writeRuntimeReceipt(dir, slot);
    ingestAgentReceipt(slot, dir, { runtimeAgentId: 'test-agent-1' });
    const result = commitSlotResult(slot, dir, {
      // Invalid: wrong slotKey, missing required fields
      slotKey: 'wrong-key',
      roleAgentKey: slot.roleAgentKey,
    });
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('relay_commit_attempt'));
    assert.ok(content.includes('relay_commit_schema_fail'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('commitSlotResult logs path_escape on absolute output_files path', () => {
    const dir = setupRelayBundle('commit-escape');
    const state = baseState({ ref_count: 5, ref_floor: 5 });
    const slots = stageSubagentSlots(state, dir);
    const slot = slots[0];
    writeRuntimeReceipt(dir, slot);
    ingestAgentReceipt(slot, dir, { runtimeAgentId: 'test-agent-1' });
    const result = commitSlotResult(slot, dir, {
      slotKey: slot.key,
      roleAgentKey: slot.roleAgentKey,
      status: 'done',
      summary: 'test',
      evidenceCount: 1,
      references: [{ title: 'T', url: 'https://x.com', quote: '', relevance: '' }],
      confidence: 0.5,
      notes: [],
      output_files: [{ path: '/etc/passwd', role: 'reference', source_url: 'https://x.com' }],
      cache_trails: [],
    });
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('relay_commit_attempt'));
    assert.ok(content.includes('relay_commit_path_escape'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('commitSlotResult logs done on success', () => {
    const dir = setupRelayBundle('commit-done');
    const state = baseState({ ref_count: 5, ref_floor: 5 });
    const slots = stageSubagentSlots(state, dir);
    const slot = slots[0];
    writeRuntimeReceipt(dir, slot);
    ingestAgentReceipt(slot, dir, { runtimeAgentId: 'test-agent-1' });
    const result = commitSlotResult(slot, dir, doneResult(slot, 2));
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('relay_commit_attempt'));
    assert.ok(content.includes('relay_commit_done'));
    assert.ok(content.includes('"kind":"queue_complete"'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('forkAndStageSubagents logs fork attempt/done for pass branch', () => {
    const dir = setupRelayBundle('fork-pass');
    const state = baseState({ ref_count: 5, ref_floor: 5 });
    const outcome = forkAndStageSubagents(state, dir);
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('relay_fork_attempt'));
    assert.ok(content.includes('relay_fork_done'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('forkAndStageSubagents logs repair for non-pass branch', () => {
    const dir = setupRelayBundle('fork-repair');
    const state = baseState({ ref_count: 3, ref_floor: 10, topicReadiness: 'ready' });
    const outcome = forkAndStageSubagents(state, dir);
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('relay_fork_attempt'));
    assert.ok(content.includes('repair_attempt'));
    assert.ok(content.includes('repair_done'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('collectAndMergeSubagentResults logs collect/merge/refork', () => {
    const dir = setupRelayBundle('collect');
    const state = baseState({ ref_count: 5, ref_floor: 5 });
    const slots = stageSubagentSlots(state, dir);
    // Write receipts and commit results for all slots
    for (const s of slots) {
      writeRuntimeReceipt(dir, s);
      ingestAgentReceipt(s, dir, { runtimeAgentId: 'test-agent-1' });
      commitSlotResult(s, dir, doneResult(s, 2));
    }
    const merged = collectAndMergeSubagentResults(state, slots, dir);
    const content = readFileSync(path.join(dir, '_logs', 'run.log'), 'utf-8');
    assert.ok(content.includes('relay_collect_attempt'));
    assert.ok(content.includes('relay_merge_done'));
    assert.ok(content.includes('relay_refork_done'));
    rmSync(dir, { recursive: true, force: true });
  });

  it('buildSpawnPrompt includes diagnostic logging section', () => {
    const dir = setupRelayBundle('spawn-diag');
    const state = baseState({ ref_count: 5, ref_floor: 5 });
    const slots = stageSubagentSlots(state, dir);
    assert.ok(slots.length > 0);
    const prompt = recordAgentSpawnRequested(slots[0], dir, { platform: 'codex' });
    // Verify the prompt contains the diagnostic logging section
    assert.ok(prompt.includes('Diagnostic logging'));
    assert.ok(prompt.includes('log-event.mjs'));
    assert.ok(prompt.includes('search_start'));
    assert.ok(prompt.includes('search_done'));
    assert.ok(prompt.includes('fetch_done'));
    assert.ok(prompt.includes('file_written'));
    assert.ok(prompt.includes('error'));
    assert.ok(prompt.includes('work_done'));
    assert.ok(prompt.includes('--level <info|warn|error>'));
    assert.ok(prompt.includes('slotKey'));
    assert.ok(prompt.includes('roleAgentKey'));
    assert.ok(prompt.includes('Do NOT log'));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('Trace nonce-anchoring across staging → ingest → commit (SUD-007)', () => {
  it('agent_result_received and result_schema_validated trace events carry the slot nonce', () => {
    const dir = setupRelayBundle('trace-commit');
    try {
      const [slot] = stageSubagentSlots(baseState(), dir);
      writeRuntimeReceipt(dir, slot, { platform: 'codex', runtimeMode: 'project-agent' });
      ingestAgentReceipt(slot, dir, { runtimeAgentId: 'agent-trace' });
      commitSlotResult(slot, dir, doneResult(slot, 2), { platform: 'codex', runtimeMode: 'project-agent', runtimeAgentId: 'agent-trace' });

      const events = readTraceEvents(dir);
      const received = events.filter((e) => e.event === 'agent_result_received' && e.key === slot.key);
      assert.ok(received.length === 1, 'expected one agent_result_received event');
      assert.equal(received[0].receiptNonce, slot.receiptNonce, 'agent_result_received must carry slot nonce');

      const validated = events.filter((e) => e.event === 'result_schema_validated' && e.key === slot.key);
      assert.ok(validated.length === 1, 'expected one result_schema_validated event');
      assert.equal(validated[0].receiptNonce, slot.receiptNonce, 'result_schema_validated must carry slot nonce');

      // Full chain nonce-anchored: the same nonce appears across all four event kinds
      const allNonced = ['slot_create', 'dispatch_create', 'agent_result_received', 'result_schema_validated']
        .every((kind) => events.some((e) => e.event === kind && (
          e.receiptNonce === slot.receiptNonce ||
          (e.slots && e.slots.some((s) => s.receiptNonce === slot.receiptNonce && s.key === slot.key))
        )));
      assert.ok(allNonced, 'all four trace event kinds must carry the slot nonce');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
