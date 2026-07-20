// @impl DEW-017, DEW-018, SRL-006

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { claimWorkUnits, inspectWorkUnits, loadWorkUnitIndex, readWorkUnitLedgerRows, submitWorkUnit, workUnitIndexPath } from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';
import { claimAndSubmitWorkUnit, cleanupWorkUnitBundle, delegatedQueueItem, seedDelegatedQueue, tempWorkUnitBundle } from './work-unit-test-helpers.mjs';

describe('work-unit actor provenance', () => {
  it('persists normal and fallback actor classes through formal submit', () => {
    for (const actorDecision of [
      {
        actorObservation: { outcome: 'available', source: 'native_probe', role_key: 'dpt-source-intake', reason_code: 'probe_succeeded' },
        executionActorClass: 'delegated_subagent',
      },
      {
        actorObservation: { outcome: 'unavailable', source: 'native_probe', role_key: 'dpt-source-intake', reason_code: 'probe_capacity_unavailable' },
        executionActorClass: 'phase_agent_fallback',
      },
    ]) {
      const dir = tempWorkUnitBundle('wu-actor-submit-');
      try {
        const { record, submitted } = claimAndSubmitWorkUnit(dir, { actorDecision });
        assert.equal(submitted.ok, true);
        const [row] = readWorkUnitLedgerRows(dir);
        assert.equal(row.actor_contract_version, 'work-unit.actor.v1');
        assert.equal(row.actor_execution.execution_actor_class, actorDecision.executionActorClass);
        const inspected = inspectWorkUnits(dir);
        assert.equal(inspected.passed, true);
        assert.equal(inspected.actor_projection[0].execution_actor_class, actorDecision.executionActorClass);
        assert.equal(record.actor_execution.execution_actor_class, actorDecision.executionActorClass);
      } finally {
        cleanupWorkUnitBundle(dir);
      }
    }
  });

  it('submits a legacy claimed attempt without fabricating delegated execution', () => {
    const dir = tempWorkUnitBundle('wu-actor-legacy-');
    try {
      seedDelegatedQueue(dir, [delegatedQueueItem('queue-a')]);
      const claim = claimWorkUnits(dir, {
        phase: 'wave0',
        count: 1,
        actorObservation: { outcome: 'available', source: 'native_probe', role_key: 'dpt-source-intake', reason_code: 'probe_succeeded' },
        executionActorClass: 'delegated_subagent',
      });
      const workId = claim.claimed_work_ids[0];
      const record = loadWorkUnitIndex(dir).work_units[workId];
      for (const ref of [workUnitIndexPath(dir), path.join(dir, record.paths.manifest_ref), path.join(dir, record.paths.beacon_ref)]) {
        const value = JSON.parse(readFileSync(ref, 'utf-8'));
        const target = ref === workUnitIndexPath(dir) ? value.work_units[workId] : value;
        delete target.actor_contract_version;
        delete target.actor_execution;
        delete target.assignment_contract_version;
        if (target.output_contract) delete target.output_contract.required_outputs;
        writeFileSync(ref, `${JSON.stringify(value, null, 2)}\n`);
      }
      const legacyRecord = loadWorkUnitIndex(dir).work_units[workId];
      const outputPath = 'reference/legacy-source.md';
      const cacheTrail = '_cache/wave0/primary/queue-a/legacy-source';
      mkdirSync(path.join(dir, 'reference'), { recursive: true });
      writeFileSync(path.join(dir, outputPath), '# Legacy source\n\nCaptured evidence.\n');
      mkdirSync(path.join(dir, cacheTrail), { recursive: true });
      writeFileSync(path.join(dir, cacheTrail, 'websearch.json'), '[]\n');
      writeFileSync(path.join(dir, cacheTrail, 'page.md'), '# Capture\n\nFetched legacy source content.\n');
      writeFileSync(path.join(dir, cacheTrail, 'meta.json'), '{"url":"https://example.com/legacy"}\n');
      writeFileSync(path.join(dir, legacyRecord.paths.runtime_receipt_ref), `${JSON.stringify({ event: 'work_done', work_id: workId, queue_item_id: 'queue-a', kind: legacyRecord.kind, receipt_nonce: legacyRecord.receipt_nonce })}\n`);
      const resultPath = path.join(dir, '_tmp', 'legacy-result.json');
      mkdirSync(path.dirname(resultPath), { recursive: true });
      writeFileSync(resultPath, `${JSON.stringify({ schema_version: 'work-unit.result.v1', work_id: workId, queue_item_id: 'queue-a', kind: legacyRecord.kind, receipt_nonce: legacyRecord.receipt_nonce, summary: 'legacy', output_files: [{ path: outputPath, role: 'reference', source_url: 'https://example.com/legacy' }], cache_trails: [cacheTrail] })}\n`);
      assert.equal(submitWorkUnit(dir, { work_id: workId, resultPath }).ok, true);
      assert.equal(readWorkUnitLedgerRows(dir)[0].actor_execution.execution_actor_class, 'legacy_unrecorded');
      assert.equal(inspectWorkUnits(dir).actor_projection[0].execution_actor_class, 'legacy_unrecorded');
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('rejects conflicting result and receipt actor bindings before authority mutation', () => {
    for (const overrides of [
      { resultOverrides: { execution_actor_class: 'phase_agent_fallback' } },
      { receiptOverrides: { execution_actor_class: 'phase_agent_fallback' } },
    ]) {
      const dir = tempWorkUnitBundle('wu-actor-conflict-');
      try {
        const { record, submitted } = claimAndSubmitWorkUnit(dir, overrides);
        assert.equal(submitted.ok, false);
        assert.equal(readWorkUnitLedgerRows(dir).length, 0);
        assert.equal(loadWorkUnitIndex(dir).work_units[record.work_id].status, 'claimed');
      } finally {
        cleanupWorkUnitBundle(dir);
      }
    }
  });
});
