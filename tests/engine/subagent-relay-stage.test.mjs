// subagent-relay-stage.test.mjs — @impl FRE-004, SUD-001, SNC-001
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

import {
  MAX_CONCURRENT_SUBAGENTS,
  stageSubagentSlots,
  createSlot,
  getDispatchMap,
  recordAgentSpawnRequested,
  loadSlotByManifestEntry,
  ingestAgentReceipt,
  commitSlotResult,
} from '../../DPT_FRAMEWORK/engine/subagent-relay.mjs';
import {
  baseState,
  tempDir,
  doneResult,
  setupRelayBundle,
  readTraceEvents,
  UUID_RE,
  writeRuntimeReceipt,
} from './subagent-relay-helpers.mjs';

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
      { key: 'b', slotIndex: 1, roleAgentKey: 'dpt-source-intake', taskDescription: 'b' },
      { key: 'c', slotIndex: 2, roleAgentKey: 'dpt-source-intake', taskDescription: 'c' },
      { key: 'd', slotIndex: 3, roleAgentKey: 'dpt-source-intake', taskDescription: 'd' },
      { key: 'e', slotIndex: 4, roleAgentKey: 'dpt-source-intake', taskDescription: 'e' },
      { key: 'f', slotIndex: 5, roleAgentKey: 'dpt-source-intake', taskDescription: 'f' },
      { key: 'g', slotIndex: 6, roleAgentKey: 'dpt-source-intake', taskDescription: 'g' },
      { key: 'h', slotIndex: 7, roleAgentKey: 'dpt-source-intake', taskDescription: 'h' },
      { key: 'i', slotIndex: 8, roleAgentKey: 'dpt-source-intake', taskDescription: 'i' },
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

describe('Beacon mode + nonce persistence (SUD-004/005/006)', () => {
  it('staging writes a per-slot _beacon.json with complete, absolute coordinates', () => {
    const dir = setupRelayBundle('beacon');
    try {
      const slots = stageSubagentSlots(baseState(), dir);
      assert.ok(slots.length > 0);
      for (const slot of slots) {
        const beaconPath = path.join(dir, path.dirname(slot.taskPath), '_beacon.json');
        assert.ok(existsSync(beaconPath), `_beacon.json missing for ${slot.key}`);
        const beacon = JSON.parse(readFileSync(beaconPath, 'utf-8'));
        assert.equal(beacon.slot_key, slot.key);
        assert.equal(beacon.receipt_nonce, slot.receiptNonce, 'beacon nonce must equal in-memory slot nonce');
        assert.ok(UUID_RE.test(beacon.receipt_nonce), 'beacon receipt_nonce must be UUID-shaped');
        assert.ok(path.isAbsolute(beacon.bundle_dir), 'bundle_dir must be absolute');
        assert.ok(path.isAbsolute(beacon.log_cli), 'log_cli must be absolute');
        assert.ok(beacon.log_cli.endsWith('log-event.mjs'));
        assert.ok(beacon.bundle_dir.endsWith(path.basename(dir)) || path.resolve(beacon.bundle_dir) === path.resolve(dir));
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('dispatch.json persists each slot UUID receipt_nonce matching its beacon', () => {
    const dir = setupRelayBundle('dispatch-nonce');
    try {
      const slots = stageSubagentSlots(baseState(), dir);
      const manifest = JSON.parse(readFileSync(path.join(dir, '_subagents', 'wave_01', 'dispatch.json'), 'utf-8'));
      assert.equal(manifest.slots.length, slots.length);
      for (const [i, slot] of slots.entries()) {
        const entry = manifest.slots[i];
        assert.equal(entry.receipt_nonce, slot.receiptNonce, `dispatch nonce mismatch for ${slot.key}`);
        assert.ok(UUID_RE.test(entry.receipt_nonce), 'dispatch receipt_nonce must be UUID-shaped');
        // dispatch nonce must equal the slot's _beacon.json nonce
        const beacon = JSON.parse(readFileSync(path.join(dir, path.dirname(slot.taskPath), '_beacon.json'), 'utf-8'));
        assert.equal(entry.receipt_nonce, beacon.receipt_nonce, 'dispatch nonce must equal beacon nonce');
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('buildSpawnPrompt is beacon-driven: slot directory + beacon pointer, no inlined bundle nonce', () => {
    const dir = setupRelayBundle('spawn-beacon');
    try {
      const [slot] = stageSubagentSlots(baseState(), dir);
      const prompt = recordAgentSpawnRequested(slot, dir, { platform: 'claude-code' });
      const slotDir = path.join(dir, path.dirname(slot.taskPath));
      // Slot directory absolute path is present
      assert.ok(prompt.includes(slotDir), 'spawn prompt must contain the slot directory absolute path');
      // Beacon pointer directive is present
      assert.ok(prompt.includes('_beacon.json'), 'spawn prompt must direct the sub-agent to read _beacon.json');
      assert.ok(/read .*_beacon\.json|open .*_beacon\.json/i.test(prompt), 'prompt must instruct reading the beacon');
      // The literal nonce is NOT handed over as the sole channel — sub-agent reads it from beacon
      assert.ok(!prompt.includes(`Runtime receipt nonce: ${slot.receiptNonce}`), 'spawn prompt must not inline the nonce as the sole channel');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Trace nonce-anchoring across staging → ingest → commit (SUD-007)', () => {
  it('slot_create and dispatch_create trace events carry the slot nonce', () => {
    const dir = setupRelayBundle('trace-staging');
    try {
      const slots = stageSubagentSlots(baseState(), dir);
      const events = readTraceEvents(dir);
      const target = slots[0];
      const slotCreates = events.filter((e) => e.event === 'slot_create' && e.key === target.key);
      assert.ok(slotCreates.length === 1, 'expected one slot_create event');
      assert.equal(slotCreates[0].receiptNonce, target.receiptNonce, 'slot_create must carry slot nonce');

      const dispatchCreates = events.filter((e) => e.event === 'dispatch_create');
      assert.ok(dispatchCreates.length === 1, 'expected one dispatch_create event');
      const dispatchEntry = dispatchCreates[0].slots.find((s) => s.key === target.key);
      assert.ok(dispatchEntry, 'dispatch_create must list the slot');
      assert.equal(dispatchEntry.receiptNonce, target.receiptNonce, 'dispatch_create slot entry must carry nonce');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('loadSlotByManifestEntry — slot reconstruction from dispatch.json', () => {
  it('reconstructs a staged slot with the persisted nonce and correct file paths', () => {
    const dir = setupRelayBundle('load-manifest');
    try {
      const [slot] = stageSubagentSlots(baseState(), dir);
      const loaded = loadSlotByManifestEntry(dir, 1, slot.key);
      assert.equal(loaded.key, slot.key);
      assert.equal(loaded.roleAgentKey, slot.roleAgentKey);
      assert.equal(loaded.slotIndex, slot.slotIndex);
      assert.equal(loaded.receiptNonce, slot.receiptNonce, 'nonce comes from dispatch.json, matching the staged slot');
      assert.equal(loaded.taskPath, slot.taskPath);
      assert.equal(loaded.resultPath, slot.resultPath);
      assert.equal(loaded.receiptPath, slot.receiptPath);
      assert.equal(loaded.status, 'pending');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a reconstructed slot can drive ingest + commit like the in-memory slot', () => {
    const dir = setupRelayBundle('load-manifest-commit');
    try {
      const [slot] = stageSubagentSlots(baseState(), dir);
      const loaded = loadSlotByManifestEntry(dir, 1, slot.key);
      writeRuntimeReceipt(dir, loaded, { platform: 'codex', runtimeMode: 'project-agent' });
      ingestAgentReceipt(loaded, dir, { runtimeAgentId: 'agent-loaded' });
      const relay = commitSlotResult(loaded, dir, doneResult(loaded, 1), { platform: 'codex', runtimeMode: 'project-agent', runtimeAgentId: 'agent-loaded' });
      assert.equal(relay.ok, true);
      assert.equal(relay.result.status, 'done');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws on missing dispatch.json and on an unknown slot key', () => {
    const dir = setupRelayBundle('load-manifest-missing');
    try {
      assert.throws(() => loadSlotByManifestEntry(dir, 1, 'nope'), /dispatch\.json missing/);
      stageSubagentSlots(baseState(), dir);
      assert.throws(() => loadSlotByManifestEntry(dir, 1, 'nope'), /slot key not found/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
