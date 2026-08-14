// @impl EXO-001

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { makeItem } from '../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import {
  createWorkUnit as createWorkUnitProduction,
  inspectWorkUnits,
  loadWorkUnitIndex,
  transactionDir,
  workUnitIndexPath,
  workUnitsRoot,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';

function tempBundle() {
  return mkdtempSync(path.join(os.tmpdir(), 'wu-'));
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function queueItem(overrides = {}) {
  return makeItem({
    queue_item_id: 'queue-source-topic-a',
    title: 'Source intake topic A',
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: {
      topic_uid: 'tp_00000001-0000-4000-8000-000000000000',
      topic_slug: 'topic-a',
      wave: 0,
    },
    required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
    writes_to: ['artifacts/wave0/topic-a/source.yaml'],
    ...overrides,
  });
}

function createWorkUnit(bundleDir, options = {}) {
  const roleKey = options.queueItem?.targets?.delegates?.role_key;
  return createWorkUnitProduction(bundleDir, {
    ...options,
    actor_execution: {
      execution_actor_class: 'delegated_subagent',
      delegated_role_key: roleKey,
      observation: {
        outcome: 'available',
        source: 'native_probe',
        role_key: roleKey,
        reason_code: 'probe_succeeded',
        recorded_at: '2026-08-14T00:00:00.000Z',
      },
      policy_decision: 'normal_allowed',
      fallback_from: null,
    },
  });
}

describe('work-unit inspect', () => {
  it('passes on a consistent index and envelope', () => {
    const dir = tempBundle();
    try {
      createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      const result = inspectWorkUnits(dir, { nowMs: Date.parse('2026-07-06T00:01:00.000Z') });
      assert.equal(result.passed, true, result.inspect.join('\n'));
    } finally {
      cleanup(dir);
    }
  });

  it('detects status-count drift', () => {
    const dir = tempBundle();
    try {
      createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      const index = loadWorkUnitIndex(dir);
      index.status_counts.claimed = 99;
      writeFileSync(workUnitIndexPath(dir), `${JSON.stringify(index, null, 2)}\n`);
      const result = inspectWorkUnits(dir);
      assert.equal(result.passed, false);
      assert.match(result.inspect.join('\n'), /status-count drift/);
    } finally {
      cleanup(dir);
    }
  });

  it('detects orphan directories', () => {
    const dir = tempBundle();
    try {
      createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      mkdirSync(path.join(workUnitsRoot(dir), 'wave0', 'wu-w0-b000-src-i9999'), { recursive: true });
      const result = inspectWorkUnits(dir);
      assert.equal(result.passed, false);
      assert.match(result.inspect.join('\n'), /orphan work-unit directory/);
    } finally {
      cleanup(dir);
    }
  });

  it('detects uncommitted transactions', () => {
    const dir = tempBundle();
    try {
      createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      const txDir = transactionDir(dir);
      writeFileSync(path.join(txDir, 'tx-open.json'), JSON.stringify({ tx_id: 'tx-open', status: 'started' }));
      const result = inspectWorkUnits(dir);
      assert.equal(result.passed, false);
      assert.match(result.inspect.join('\n'), /suspect legacy transaction|unlocked unresolved transaction journal/);
    } finally {
      cleanup(dir);
    }
  });

  it('detects expired claimed leases', () => {
    const dir = tempBundle();
    try {
      createWorkUnit(dir, { queueItem: queueItem({ targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 1 } } }), wave: 0 });
      const result = inspectWorkUnits(dir, { nowMs: Date.now() + 10000 });
      assert.equal(result.passed, false);
      assert.match(result.inspect.join('\n'), /expired lease/);
    } finally {
      cleanup(dir);
    }
  });

  it('validates lifecycle receipt event identity when events are present', () => {
    const dir = tempBundle();
    try {
      const { record } = createWorkUnit(dir, { queueItem: queueItem(), wave: 0 });
      writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
        event: 'work_done',
        work_id: record.work_id,
        queue_item_id: record.queue_item_id,
        kind: record.kind,
        receipt_nonce: record.receipt_nonce,
        actor_contract_version: record.actor_contract_version,
        execution_actor_class: record.actor_execution.execution_actor_class,
        ts: '2026-07-06T00:00:00.000Z',
      })}\n`);
      assert.equal(inspectWorkUnits(dir).passed, true);

      writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
        event: 'work_done',
        work_id: record.work_id,
        queue_item_id: 'wrong-queue-item',
        kind: record.kind,
        receipt_nonce: record.receipt_nonce,
        actor_contract_version: record.actor_contract_version,
        execution_actor_class: record.actor_execution.execution_actor_class,
        ts: '2026-07-06T00:00:00.000Z',
      })}\n`);
      const result = inspectWorkUnits(dir);
      assert.equal(result.passed, false);
      assert.match(result.inspect.join('\n'), /runtime receipt mismatch/);
    } finally {
      cleanup(dir);
    }
  });
});
