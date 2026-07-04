// subagent-relay-collect-pipeline.test.mjs — @impl FRE-004, SUR-001
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { rmSync } from 'node:fs';

import {
  stageSubagentSlots,
  collectResults,
  mergeResults,
  convergeRepair,
  validateAndDiagnose,
  forkAndStageSubagents,
  collectAndMergeSubagentResults,
  ingestAgentReceipt,
  commitSlotResult,
  markSlotFailed,
  readSlotResult,
} from '../../DPT_FRAMEWORK/engine/subagent-relay.mjs';
import {
  baseState,
  tempDir,
  doneResult,
  writeCountableRef,
  writeRuntimeReceipt,
} from './subagent-relay-helpers.mjs';

describe('Parent Relay collect/merge (SUR-001)', () => {
  let testDir;
  let slots;
  before(() => {
    testDir = tempDir();
    slots = stageSubagentSlots(baseState(), testDir);
    writeRuntimeReceipt(testDir, slots[0], { platform: 'codex', runtimeMode: 'builtin-agent-with-role-prompt', agentType: 'worker' });
    ingestAgentReceipt(slots[0], testDir, { runtimeAgentId: 'agent-1' });
    commitSlotResult(slots[0], testDir, doneResult(slots[0], 3), { platform: 'codex', runtimeMode: 'builtin-agent-with-role-prompt', agentType: 'worker', runtimeAgentId: 'agent-1' });
    writeRuntimeReceipt(testDir, slots[1], { platform: 'claude-code', runtimeMode: 'project-agent' });
    ingestAgentReceipt(slots[1], testDir, { runtimeAgentId: 'agent-2' });
    commitSlotResult(slots[1], testDir, { slotKey: 'wrong', roleAgentKey: slots[1].roleAgentKey, status: 'done', summary: '', evidenceCount: 1, references: [], confidence: 0, notes: [] }, { platform: 'claude-code', runtimeMode: 'project-agent', runtimeAgentId: 'agent-2' });
    writeRuntimeReceipt(testDir, slots[2], { platform: 'codex', runtimeMode: 'builtin-agent-with-role-prompt' });
    ingestAgentReceipt(slots[2], testDir, { runtimeAgentId: 'agent-3' });
    markSlotFailed(slots[2], testDir, { platform: 'codex', runtimeMode: 'builtin-agent-with-role-prompt', runtimeAgentId: 'agent-3' }, 'timeout');
  });
  after(() => { rmSync(testDir, { recursive: true, force: true }); });

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
  it('collectAndMergeSubagentResults uses Engine-computed ref_count from countable references', () => {
    const testDir = tempDir();
    try {
      const state = baseState();
      const { slots } = forkAndStageSubagents(state, testDir);
      for (const [index, slot] of slots.entries()) {
        const refPath = `reference/slot-${index}-ref.md`;
        writeCountableRef(testDir, refPath, `https://example.com/research/slot-${index}`);
        writeRuntimeReceipt(testDir, slot, { platform: 'codex', runtimeMode: 'builtin-agent-with-role-prompt' });
        ingestAgentReceipt(slot, testDir, { runtimeAgentId: `agent-${index + 1}` });
        commitSlotResult(slot, testDir, doneResult(slot, index + 1, [
          { path: refPath, role: 'reference', source_url: `https://example.com/research/slot-${index}` },
        ]), { platform: 'codex', runtimeMode: 'builtin-agent-with-role-prompt' });
      }
      const merged = collectAndMergeSubagentResults(state, slots, testDir);
      assert.equal(merged.finalState.ref_count, 9);
      assert.equal(merged.checkResult.passed, true);
      assert.equal(merged.forkDecision.branch, 'pass');
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});

describe('collectAndMergeSubagentResults aggregation (SUR-001)', () => {
  it('collectAndMergeSubagentResults aggregates output_files and cache_trails', () => {
    const innerDir = tempDir();
    try {
      const state = baseState();
      const { slots: innerSlots } = forkAndStageSubagents(state, innerDir);
      const outFiles = [];
      const cacheTr = [];
      for (const [i, s] of innerSlots.entries()) {
        writeRuntimeReceipt(innerDir, s);
        ingestAgentReceipt(s, innerDir, { runtimeAgentId: `agent-agg-${i}` });
        const of = i === 0
          ? [{ path: `reference/r${i}.md`, role: 'reference', source_url: `https://example.com/${i}` }]
          : [];
        const ct = i <= 1 ? [`_cache/wave0/primary/01_topic/s0${i}_src/`] : [];
        outFiles.push(...of);
        cacheTr.push(...ct);
        commitSlotResult(s, innerDir, {
          slotKey: s.key, roleAgentKey: s.roleAgentKey, status: 'done',
          summary: '', evidenceCount: i + 1,
          references: [{ title: 'T', url: `https://x.com/${i}`, quote: '', relevance: '' }],
          confidence: 0.5, notes: [],
          output_files: of,
          cache_trails: ct,
        }, { platform: 'codex' });
      }
      const merged = collectAndMergeSubagentResults(state, innerSlots, innerDir);
      assert.equal(merged.output_files.length, 1); // only slot 0 has output_files
      assert.equal(merged.cache_trails.length, 2);  // slots 0 and 1 have cache_trails
      assert.equal(merged.slotResultRefs.length, 4);
      assert.equal(merged.receiptRefs.length, 4);
    } finally {
      rmSync(innerDir, { recursive: true, force: true });
    }
  });
});
