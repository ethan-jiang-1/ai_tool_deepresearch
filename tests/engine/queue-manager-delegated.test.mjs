// @impl FRE-005
// Queue Manager delegated completion, Queue↔Relay pipeline, ledger, and gate handoff regression coverage.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createQueue,
  enqueue,
  claim,
  complete,
  makeItem,
} from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import {
  stageSubagentSlots,
  commitSlotResult,
  writeSlotStatus,
  ingestAgentReceipt,
} from '../../DPT_FRAMEWORK/engine/subagent-relay.mjs';
import { checkContentDedup } from '../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import {
  baseState,
  cleanup,
  setupDelegatedFixture,
  tempBundle,
  writeRuntimeReceipt,
} from './queue-manager-fixtures.mjs';

describe('Delegated queue completion (Stage 2)', () => {
  it('non-delegated complete() works without relay provenance', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('nondel');
      const workItem = makeItem({
        work_id: 'work-direct',
        title: 'Direct work',
        targets: { controller: 'main-agent' },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2, item } = claim(queue, { actor: 'main-agent' });
      assert.ok(item);
      const result = complete(q2, { work_id: 'work-direct', receipt: 'none', summary: 'ok' }, dir);
      assert.equal(result.feedback.passed, true);
    } finally {
      cleanup(dir);
    }
  });

  it('delegated complete() rejects missing slot_result_ref', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('del1');
      const workItem = makeItem({
        work_id: 'work-del',
        title: 'Delegated work',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      const result = complete(q2, { work_id: 'work-del', receipt: 'none' }, dir);
      assert.equal(result.feedback.passed, false);
      assert.ok(result.feedback.advice.includes('slot_result_ref'));
    } finally {
      cleanup(dir);
    }
  });

  it('delegated complete() rejects uncommitted slot result', () => {
    const dir = tempBundle();
    try {
      let queue = createQueue('del2');
      const workItem = makeItem({
        work_id: 'work-del2',
        title: 'Delegated work 2',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      // slot_result_ref points to a non-existent file
      const result = complete(q2, {
        work_id: 'work-del2',
        receipt: 'none',
        slot_result_ref: '_subagents/wave_01/slot_00/result.json',
      }, dir);
      assert.equal(result.feedback.passed, false);
      assert.ok(result.feedback.advice.includes('not found'));
    } finally {
      cleanup(dir);
    }
  });

  it('delegated complete() succeeds with full provenance and appends ledger', () => {
    const dir = tempBundle();
    try {
      const { slot, relay } = setupDelegatedFixture(dir);
      assert.equal(relay.ok, true);

      let queue = createQueue('del-ok');
      const workItem = makeItem({
        work_id: 'work-del-ok',
        title: 'Delegated intake',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });

      const result = complete(q2, {
        work_id: 'work-del-ok',
        receipt: 'none',
        summary: 'Completed via relay',
        slot_result_ref: slot.resultPath,
      }, dir);

      assert.equal(result.feedback.passed, true, `Expected pass but got: ${result.feedback.advice}`);

      // Ledger must exist and contain the declaration
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      assert.ok(existsSync(ledgerPath), 'ledger file should exist');
      const ledgerContent = readFileSync(ledgerPath, 'utf-8').trim();
      assert.ok(ledgerContent.length > 0, 'ledger should not be empty');
      const record = JSON.parse(ledgerContent);
      assert.equal(record.work_id, 'work-del-ok');
      assert.equal(record.output_files.length, 1);
      assert.equal(record.cache_trails.length, 1);
      assert.equal(record.slot_result_ref, slot.resultPath);
    } finally {
      cleanup(dir);
    }
  });

  it('delegated complete() rejects missing declared output file', () => {
    const dir = tempBundle();
    try {
      const { slot } = setupDelegatedFixture(dir);
      // Remove the declared output file
      rmSync(path.join(dir, 'reference', 'source.md'));

      let queue = createQueue('del-missing');
      const workItem = makeItem({
        work_id: 'work-missing',
        title: 'Missing output',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      const result = complete(q2, {
        work_id: 'work-missing', receipt: 'none',
        slot_result_ref: slot.resultPath,
      }, dir);
      assert.equal(result.feedback.passed, false);
      assert.ok(result.feedback.advice.includes('missing'));
      // Ledger must NOT be appended for failed completion
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      assert.equal(existsSync(ledgerPath), false);
    } finally {
      cleanup(dir);
    }
  });

  it('delegated complete() warns but succeeds with incomplete cache leaf (Phase 1)', () => {
    const dir = tempBundle();
    try {
      const { slot } = setupDelegatedFixture(dir);
      // Remove meta.json from cache leaf — incomplete leaf, not unsafe
      rmSync(path.join(dir, '_cache', 'wave0', 'primary', '01_test', 's01_source', 'meta.json'));

      let queue = createQueue('del-cache');
      const workItem = makeItem({
        work_id: 'work-cache',
        title: 'Missing cache',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      const result = complete(q2, {
        work_id: 'work-cache', receipt: 'none',
        slot_result_ref: slot.resultPath,
      }, dir);
      // Phase 1: incomplete leaf is warning, not hard-fail — complete succeeds
      assert.equal(result.feedback.passed, true, 'Incomplete cache leaf should warn but not block complete');
      // Verify the incomplete trail was filtered from the ledger
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      if (existsSync(ledgerPath)) {
        const ledgerLines = readFileSync(ledgerPath, 'utf-8').trim().split('\n').filter(Boolean);
        for (const line of ledgerLines) {
          const rec = JSON.parse(line);
          if (rec.work_id === 'work-cache') {
            // The incomplete trail should NOT be in the ledger
            const hasIncompleteTrail = (rec.cache_trails || []).some(t => t.includes('s01_source'));
            assert.equal(hasIncompleteTrail, false, 'Incomplete trail should be filtered from ledger');
          }
        }
      }
    } finally {
      cleanup(dir);
    }
  });

  it('delegated complete() rejects missing runtime receipt', () => {
    const dir = tempBundle();
    try {
      const { slot } = setupDelegatedFixture(dir);
      // Remove runtime receipt
      rmSync(path.join(dir, slot.receiptPath));

      let queue = createQueue('del-norec');
      const workItem = makeItem({
        work_id: 'work-norec',
        title: 'No receipt',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      const result = complete(q2, {
        work_id: 'work-norec', receipt: 'none',
        slot_result_ref: slot.resultPath,
      }, dir);
      assert.equal(result.feedback.passed, false);
      assert.ok(result.feedback.advice.includes('runtime receipt'));
    } finally {
      cleanup(dir);
    }
  });

  it('full pipeline: enqueue delegated → claim → relay → complete → ledger (AGQ-019, AGQ-020)', () => {
    // This is the only test that proves Queue and Relay compose correctly
    // in the real execution path. Every other test exercises one system in isolation.
    const dir = tempBundle();
    try {
      // 1. Build queue with a delegated task
      let queue = createQueue('pipeline');
      const workItem = makeItem({
        work_id: 'work-pipe',
        title: 'Pipeline task',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);

      // 2. Claim — verify delegates advice
      const { queue: q2, item, advice } = claim(queue, { actor: 'main-agent' });
      assert.ok(item);
      assert.equal(advice.delegates_required, true);
      assert.equal(advice.delegates_config.role_key, 'dpt-source-intake');

      // 3. Stage relay slots (what the Phase Agent does after seeing delegates_required)
      const state = baseState();
      const slots = stageSubagentSlots(state, dir);
      assert.ok(slots.length > 0, 'expected at least one relay slot');

      // 4. Execute relay pipeline for first slot
      writeRuntimeReceipt(dir, slots[0]);
      ingestAgentReceipt(slots[0], dir, { runtimeAgentId: 'pipeline-agent' });
      writeSlotStatus(slots[0], 'running', dir);

      // Need output file + cache for commitSlotResult
      const refDir = path.join(dir, 'reference');
      mkdirSync(refDir, { recursive: true });
      writeFileSync(path.join(refDir, 'source.md'), '# Pipeline output\n');
      const cacheLeaf = path.join(dir, '_cache', 'wave0', 'pipeline', 's01');
      mkdirSync(cacheLeaf, { recursive: true });
      writeFileSync(path.join(cacheLeaf, 'websearch.json'), '[]');
      writeFileSync(path.join(cacheLeaf, 'page.md'), '# Page');
      writeFileSync(path.join(cacheLeaf, 'meta.json'), '{"url":"https://example.com/p"}');

      const relay = commitSlotResult(slots[0], dir, {
        slotKey: slots[0].key, roleAgentKey: slots[0].roleAgentKey, status: 'done',
        summary: 'Pipeline done', evidenceCount: 1,
        references: [{ title: 'T', url: 'https://example.com/p', quote: 'q', relevance: 'r' }],
        confidence: 0.9, notes: [],
        output_files: [{ path: 'reference/source.md', role: 'reference', source_url: 'https://example.com/p' }],
        cache_trails: ['_cache/wave0/pipeline/s01/'],
      }, { platform: 'pipeline-test', runtimeAgentId: 'pipeline-agent' });
      assert.equal(relay.ok, true);

      // 5. Complete queue task with slot_result_ref
      const result = complete(q2, {
        work_id: 'work-pipe',
        receipt: 'none',
        summary: 'Pipeline complete',
        slot_result_ref: slots[0].resultPath,
      }, dir);
      assert.equal(result.feedback.passed, true,
        `Pipeline complete should pass, got: ${result.feedback.advice}`);

      // 6. Ledger must exist
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      assert.ok(existsSync(ledgerPath), 'ledger should be appended');

      // 7. Promote should have happened (current slot cleared after completion)
      assert.equal(result.queue.active_window.slot_1_current, null,
        'promote should clear slot_1 after completing the only queued item');
    } finally {
      cleanup(dir);
    }
  });

  it('batch: 2-slot parallel relay → single complete → ledger (AGQ-019)', () => {
    // Proves N>1 slots work: one delegated Queue task fans out to 2 Relay slots,
    // both commit independently, complete() succeeds with either slot_result_ref.
    const dir = tempBundle();
    try {
      let queue = createQueue('batch-2slot');
      const workItem = makeItem({
        work_id: 'work-batch',
        title: 'Batch task',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2, advice } = claim(queue, { actor: 'main-agent' });
      assert.equal(advice.delegates_required, true);

      // Stage 2 slots (pass-branch dispatch gives 4, take first 2)
      const allSlots = stageSubagentSlots(baseState(), dir);
      assert.ok(allSlots.length >= 2, 'need at least 2 relay slots');
      const slots = allSlots.slice(0, 2);

      // Commit both slots in parallel (sequentially in test, logically parallel)
      for (let i = 0; i < 2; i++) {
        const slot = slots[i];
        writeRuntimeReceipt(dir, slot);
        ingestAgentReceipt(slot, dir, { runtimeAgentId: `batch-agent-${i}` });
        writeSlotStatus(slot, 'running', dir);

        const outDir = path.join(dir, 'reference', `batch-${i}`);
        mkdirSync(outDir, { recursive: true });
        writeFileSync(path.join(outDir, 'source.md'), `# Batch ${i} output\n`);

        const cacheLeaf = path.join(dir, '_cache', 'wave0', `batch-${i}`, 's01');
        mkdirSync(cacheLeaf, { recursive: true });
        writeFileSync(path.join(cacheLeaf, 'websearch.json'), '[]');
        writeFileSync(path.join(cacheLeaf, 'page.md'), '# Page');
        writeFileSync(path.join(cacheLeaf, 'meta.json'), `{"url":"https://example.com/batch-${i}"}`);

        const relay = commitSlotResult(slot, dir, {
          slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done',
          summary: `Batch slot ${i} done`, evidenceCount: 1,
          references: [{ title: `T${i}`, url: `https://example.com/batch-${i}`, quote: 'q', relevance: 'r' }],
          confidence: 0.9, notes: [],
          output_files: [{ path: `reference/batch-${i}/source.md`, role: 'reference', source_url: `https://example.com/batch-${i}` }],
          cache_trails: [`_cache/wave0/batch-${i}/s01/`],
        }, { platform: 'batch-test', runtimeAgentId: `batch-agent-${i}` });
        assert.equal(relay.ok, true, `slot ${i} commit should pass`);
      }

      // Both slots' result.json must exist on disk
      for (const slot of slots) {
        assert.ok(existsSync(path.join(dir, slot.resultPath)), `slot ${slot.key} result.json must exist`);
      }

      // Complete with first slot's result_ref
      const result = complete(q2, {
        work_id: 'work-batch',
        receipt: 'none',
        summary: 'Batch complete',
        slot_result_ref: slots[0].resultPath,
      }, dir);
      assert.equal(result.feedback.passed, true,
        `Batch complete should pass, got: ${result.feedback.advice}`);

      // Ledger exists and references the slot
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      assert.ok(existsSync(ledgerPath), 'ledger should be appended');
      const ledger = JSON.parse(readFileSync(ledgerPath, 'utf-8'));
      assert.equal(ledger.work_id, 'work-batch');
      assert.equal(ledger.slot_result_ref, slots[0].resultPath);
      assert.equal(ledger.output_files.length, 1);

      // Promote should have cleared the current slot
      assert.equal(result.queue.active_window.slot_1_current, null);
    } finally {
      cleanup(dir);
    }
  });

  it('pipeline → gate: ledger produced by complete() is consumable by checkContentDedup', () => {
    // Proves the output declaration ledger written by the Queue↔Relay pipeline
    // is parseable and valid for the gate's content_dedup check.
    const dir = tempBundle();
    try {
      let queue = createQueue('pipe-gate');
      const workItem = makeItem({
        work_id: 'work-pg',
        title: 'Pipeline→Gate',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      const slots = stageSubagentSlots(baseState(), dir);
      const slot = slots[0];

      writeRuntimeReceipt(dir, slot);
      ingestAgentReceipt(slot, dir, { runtimeAgentId: 'pg-agent' });
      writeSlotStatus(slot, 'running', dir);

      mkdirSync(path.join(dir, 'reference'), { recursive: true });
      writeFileSync(path.join(dir, 'reference', 'pg-source.md'), '# Pipeline→Gate ref\n\nSource URL: https://real-source.example.com/pg\n');

      const cacheLeaf = path.join(dir, '_cache', 'wave0', 'pg', 's01');
      mkdirSync(cacheLeaf, { recursive: true });
      writeFileSync(path.join(cacheLeaf, 'websearch.json'), '[]');
      writeFileSync(path.join(cacheLeaf, 'page.md'), '# Page');
      writeFileSync(path.join(cacheLeaf, 'meta.json'), '{"url":"https://real-source.example.com/pg"}');

      const relay = commitSlotResult(slot, dir, {
        slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done',
        summary: 'PG done', evidenceCount: 1,
        references: [{ title: 'PG', url: 'https://real-source.example.com/pg', quote: 'q', relevance: 'r' }],
        confidence: 0.9, notes: [],
        output_files: [{ path: 'reference/pg-source.md', role: 'reference', source_url: 'https://real-source.example.com/pg' }],
        cache_trails: ['_cache/wave0/pg/s01/'],
      }, { platform: 'pg-test', runtimeAgentId: 'pg-agent' });
      assert.equal(relay.ok, true);

      const result = complete(q2, {
        work_id: 'work-pg',
        receipt: 'none',
        summary: 'PG complete',
        slot_result_ref: slot.resultPath,
      }, dir);
      assert.equal(result.feedback.passed, true);

      // Gate's content_dedup must consume the pipeline-produced ledger
      const dedupResult = checkContentDedup(dir, {
        jaccard: 0.8, url_dedup: true, homepage_detect: false, self_ref_detect: false,
      });
      assert.equal(dedupResult.passed, true,
        `content_dedup should pass on pipeline ledger, got: ${dedupResult.inspect.join('; ')}`);
    } finally {
      cleanup(dir);
    }
  });

  it('ledger record includes non-empty creation_reason derived from queue item and slot result', () => {
    // @impl 8A.15 — creation_reason must be present and non-empty in delegated ledger records
    const dir = tempBundle();
    try {
      let queue = createQueue('cr-reason');
      const workItem = makeItem({
        work_id: 'work-cr',
        title: 'CreationReason test',
        action: 'Deepen topic: Test Topic using WebSearch and WebFetch',
        targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-evidence-extractor' } },
        completion_receipt: 'none',
      });
      queue = enqueue(queue, workItem);
      const { queue: q2 } = claim(queue, { actor: 'main-agent' });
      const slots = stageSubagentSlots(baseState(), dir);
      const slot = slots[0];

      writeRuntimeReceipt(dir, slot);
      ingestAgentReceipt(slot, dir, { runtimeAgentId: 'cr-agent' });
      writeSlotStatus(slot, 'running', dir);

      mkdirSync(path.join(dir, 'reference'), { recursive: true });
      writeFileSync(path.join(dir, 'reference', 'cr-source.md'), '# CR Ref\n\nSource URL: https://example.com/cr\n');

      const cacheLeaf = path.join(dir, '_cache', 'wave0', 'cr', 's01');
      mkdirSync(cacheLeaf, { recursive: true });
      writeFileSync(path.join(cacheLeaf, 'websearch.json'), '[]');
      writeFileSync(path.join(cacheLeaf, 'page.md'), '# Page');
      writeFileSync(path.join(cacheLeaf, 'meta.json'), '{"url":"https://example.com/cr"}');

      const relay = commitSlotResult(slot, dir, {
        slotKey: slot.key, roleAgentKey: slot.roleAgentKey, status: 'done',
        summary: 'Found 3 deep evidence sources for topic',
        evidenceCount: 1,
        references: [{ title: 'CR', url: 'https://example.com/cr', quote: 'q', relevance: 'r' }],
        confidence: 0.9, notes: [],
        output_files: [{ path: 'reference/cr-source.md', role: 'reference', source_url: 'https://example.com/cr' }],
        cache_trails: ['_cache/wave0/cr/s01/'],
      }, { platform: 'cr-test', runtimeAgentId: 'cr-agent' });
      assert.equal(relay.ok, true);

      const result = complete(q2, {
        work_id: 'work-cr',
        receipt: 'none',
        summary: 'CR complete',
        slot_result_ref: slot.resultPath,
      }, dir);
      assert.equal(result.feedback.passed, true);

      // Read the ledger and validate creation_reason
      const ledgerPath = path.join(dir, 'rb_output_declarations.jsonl');
      assert.ok(existsSync(ledgerPath));
      const ledger = JSON.parse(readFileSync(ledgerPath, 'utf-8'));

      // MUST be present and non-empty
      assert.ok(ledger.creation_reason, 'creation_reason must be present');
      assert.ok(ledger.creation_reason.length > 0, 'creation_reason must be non-empty');

      // MUST start with "Delegated: " since this is a delegated task
      assert.ok(ledger.creation_reason.startsWith('Delegated: '),
        `creation_reason should start with "Delegated: ", got: "${ledger.creation_reason}"`);

      // MUST include the action text
      assert.ok(ledger.creation_reason.includes('Deepen topic'),
        `creation_reason should include action text, got: "${ledger.creation_reason}"`);

      // MUST include the slot result summary
      assert.ok(ledger.creation_reason.includes('Found 3 deep evidence'),
        `creation_reason should include summary, got: "${ledger.creation_reason}"`);
    } finally {
      cleanup(dir);
    }
  });
});
