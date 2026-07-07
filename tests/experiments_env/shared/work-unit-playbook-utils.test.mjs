// @impl EXR-001, RWE-001, AGT-009

import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  claimAndSubmitFixtureWorkUnit,
  inspectWorkUnitsViaCli,
  readWorkUnitLedgerRows,
  sourceYamlContent,
  writeMinimalPlan,
  writeMinimalStatus,
} from '../../../experiments_env/shared/work-unit-playbook-utils.mjs';

describe('work-unit playbook utils', () => {
  it('drives fixture-backed delegated completion through real queue/work-unit CLIs', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'wu-playbook-utils-'));
    try {
      writeMinimalStatus(dir);
      writeMinimalPlan(dir);
      const result = claimAndSubmitFixtureWorkUnit(dir, {
        phase: 'wave0',
        queue_item_id: 'wave0-source-topic-a',
        topic_slug: 'topic-a',
        output_path: 'reference/00-shared-playbook-fixture.md',
        extra_output_files: [{
          path: 'artifacts/wave0/topic-a/source.yaml',
          role: 'source_yaml',
          content: sourceYamlContent({ topic_slug: 'topic-a' }),
        }],
      });

      assert.equal(result.claim.claimed_count, 1);
      assert.equal(result.submit.ok, true);
      assert.equal(result.submit.status, 'submitted');

      const rows = readWorkUnitLedgerRows(dir);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].work_id, result.record.work_id);
      assert.equal(rows[0].queue_item_id, 'wave0-source-topic-a');
      assert.deepEqual(rows[0].output_files.map((entry) => entry.path).sort(), [
        'artifacts/wave0/topic-a/source.yaml',
        'reference/00-shared-playbook-fixture.md',
      ]);
      assert.equal(rows[0].result_hash, result.submit.result_hash);
      assert.equal(inspectWorkUnitsViaCli(dir).passed, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
