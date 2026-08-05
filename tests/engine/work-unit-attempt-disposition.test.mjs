// @impl DEW-022, DEW-023, DEW-024, CHI-004

import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  drySubmitWorkUnit,
  inspectWorkUnits,
  supersedeWorkUnitAttempt,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  tempWorkUnitBundle,
} from './work-unit-test-helpers.mjs';

describe('work-unit attempt disposition', () => {
  it('shares identity and transaction facts across dry-submit and inspect without authentication claims', () => {
    const bundleDir = tempWorkUnitBundle('wu-attempt-disposition-');
    try {
      const { record, resultPath, submitted } = claimAndSubmitWorkUnit(bundleDir);
      assert.equal(submitted.ok, true);
      const dry = drySubmitWorkUnit(bundleDir, { work_id: record.work_id, resultPath });
      const inspected = inspectWorkUnits(bundleDir).attempt_disposition.find((entry) => entry.work_id === record.work_id);
      assert.deepEqual(dry.attempt_disposition.identity, inspected.identity);
      assert.deepEqual(dry.attempt_disposition.transaction, inspected.transaction);
      assert.equal(inspected.identity.execution_actor_class, 'delegated_subagent');
      assert.equal(inspected.identity.physical_actor_authenticated, false);
      assert.equal(inspected.identity.liveness_proven, false);
      assert.equal(inspected.coverage.disposition, 'current');
      assert.equal(inspected.next.repair_kind, 'semantic_boundary');
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('projects one supersede action for direct drift and one validated current leaf after correction', () => {
    const bundleDir = tempWorkUnitBundle('wu-attempt-disposition-drift-');
    try {
      const { record, resultPath, submitted } = claimAndSubmitWorkUnit(bundleDir);
      assert.equal(submitted.ok, true);
      const assignedPath = path.join(bundleDir, record.paths.result_ref);
      const result = JSON.parse(readFileSync(assignedPath, 'utf8'));
      result.summary = 'post-submit drift';
      writeFileSync(assignedPath, `${JSON.stringify(result, null, 2)}\n`);

      const dry = drySubmitWorkUnit(bundleDir, { work_id: record.work_id, resultPath });
      const inspected = inspectWorkUnits(bundleDir).attempt_disposition.find((entry) => entry.work_id === record.work_id);
      assert.deepEqual(dry.attempt_disposition.identity, inspected.identity);
      assert.equal(inspected.coverage.disposition, 'unresolved');
      assert.equal(inspected.coverage.root_code, 'submitted_result_drift');
      assert.equal(inspected.next.repair_kind, 'supersede');
      assert.match(inspected.next.rerun, /operate-work-unit\.mjs supersede/);

      const corrected = supersedeWorkUnitAttempt(bundleDir, {
        work_id: record.work_id,
        reason: 'result drift',
      });
      assert.equal(corrected.ok, true);
      const historical = inspectWorkUnits(bundleDir).attempt_disposition.find((entry) => entry.work_id === record.work_id);
      assert.equal(historical.coverage.disposition, 'historical');
      assert.equal(historical.coverage.current_lineage_leaf.queue_item_id, corrected.relation.successor_queue_item_id);
      assert.equal(historical.next.repair_kind, 'claim_successor');
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });
});
