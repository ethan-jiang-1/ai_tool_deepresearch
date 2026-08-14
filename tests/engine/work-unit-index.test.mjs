// @impl DEW-002, SDC-001

import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { makeItem } from '../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import {
  createWorkUnit,
  loadWorkUnitIndex,
  parseWorkId,
  validateWorkIdBinding,
  workUnitIndexPath,
  workUnitsRoot,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import { currentDelegatedActorExecution } from './work-unit-test-helpers.mjs';

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
      topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      topic_slug: 'topic-a',
      wave: 0,
    },
    required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
    writes_to: ['artifacts/wave0/topic-a/source.yaml'],
    ...overrides,
  });
}

describe('work_id parsing and binding', () => {
  it('requires an existing index before a read-only load and creates no work-unit directories', () => {
    const dir = tempBundle();
    try {
      assert.throws(
        () => loadWorkUnitIndex(dir, { createIfMissing: false }),
        /work-unit index.*does not exist|missing existing work-unit authority/i,
      );
      assert.equal(existsSync(workUnitsRoot(dir)), false);
      assert.equal(existsSync(workUnitIndexPath(dir)), false);
    } finally {
      cleanup(dir);
    }
  });

  it('parses canonical work IDs', () => {
    assert.deepEqual(parseWorkId('wu-w1-b002-deep-i0007'), {
      work_id: 'wu-w1-b002-deep-i0007',
      wave: 1,
      batch_id: 'b002',
      batch_index: 2,
      kind_code: 'deep',
      claim_index: 7,
    });
  });

  it('rejects malformed work IDs', () => {
    assert.throws(() => parseWorkId('wu-w0-b00-src-i0001'), /Invalid work_id/);
    assert.throws(() => parseWorkId('wave0-source-topic-a'), /Invalid work_id/);
  });

  it('validates encoded fields against kind registry and manifest fields', () => {
    const dir = tempBundle();
    try {
      const item = queueItem();
      const { manifest } = createWorkUnit(dir, {
        queueItem: item,
        wave: 0,
        actor_execution: currentDelegatedActorExecution(item.targets.delegates.role_key),
      });
      assert.equal(validateWorkIdBinding({
        work_id: manifest.work_id,
        kindRegistry: loadWorkUnitIndex(dir).kind_registry,
        wave: manifest.wave,
        batch_id: manifest.batch_id,
        batch_index: manifest.batch_index,
        claim_index: manifest.claim_index,
        kind: manifest.kind,
        kind_code: manifest.kind_code,
      }).kind, 'wave0_source_intake');
      assert.throws(() => validateWorkIdBinding({
        work_id: manifest.work_id,
        kindRegistry: loadWorkUnitIndex(dir).kind_registry,
        kind: 'wave1_topic_deepening',
      }), /kind mismatch/);
    } finally {
      cleanup(dir);
    }
  });
});
