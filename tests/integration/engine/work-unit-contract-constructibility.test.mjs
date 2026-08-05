// @impl DEW-021

import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  claimWorkUnits,
  drySubmitWorkUnit,
  loadWorkUnitIndex,
  WORK_UNIT_OUTPUT_LEDGER,
  submitWorkUnit,
  timeoutPreflightWorkUnit,
} from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import {
  availableActorDecision,
  cleanupWorkUnitBundle,
  delegatedQueueItem,
  seedDelegatedQueue,
  tempWorkUnitBundle,
} from '../../engine/work-unit-test-helpers.mjs';

function claimWave(bundleDir, { phase, assignmentMode = 'primary' }) {
  const kind = phase === 'wave0' ? 'wave0_source_intake' : 'wave1_topic_deepening';
  const item = delegatedQueueItem(`${phase}-${assignmentMode}`, {
    phase,
    kind,
    ...(phase === 'wave1' ? { payload: { assignment_mode: assignmentMode } } : {}),
  });
  seedDelegatedQueue(bundleDir, [item]);
  const claim = claimWorkUnits(bundleDir, {
    phase,
    count: 1,
    ...availableActorDecision(kind),
  });
  assert.equal(claim.claimed_count, 1);
  const workId = claim.claimed_work_ids[0];
  const record = loadWorkUnitIndex(bundleDir).work_units[workId];
  return {
    claim,
    record,
    task: readFileSync(path.join(bundleDir, record.paths.task_ref), 'utf8'),
  };
}

describe('DEW-021 generated Completion Contract', () => {
  for (const testCase of [
    { phase: 'wave0', assignmentMode: 'primary' },
    { phase: 'wave1', assignmentMode: 'primary' },
    { phase: 'wave1', assignmentMode: 'supplementary' },
  ]) {
    it(`makes ${testCase.phase}/${testCase.assignmentMode} authoring contract one task entry without actor-authority precreation`, () => {
      const bundleDir = tempWorkUnitBundle(`dew021-${testCase.phase}-${testCase.assignmentMode}-`);
      try {
        const { claim, record, task } = claimWave(bundleDir, testCase);
        assert.match(task, /## Completion Contract/);
        assert.equal(task.indexOf('## Completion Contract'), task.indexOf('##'));
        assert.ok(task.indexOf('## Completion Contract') < task.indexOf('## Actor Guidance'));
        assert.match(claim.prompt_refs[0].spawn_prompt, /Completion Contract/);
        assert.doesNotMatch(claim.prompt_refs[0].spawn_prompt, /runtime-receipt\.jsonl/);
        assert.equal(existsSync(path.join(bundleDir, record.paths.result_ref)), false);
        assert.equal(readFileSync(path.join(bundleDir, record.paths.runtime_receipt_ref), 'utf8'), '');
        const manifest = JSON.parse(readFileSync(path.join(bundleDir, record.paths.manifest_ref), 'utf8'));
        for (const required of manifest.output_contract.required_outputs) {
          assert.equal(existsSync(path.join(bundleDir, required.path)), false, required.path);
        }
        assert.equal(existsSync(path.join(bundleDir, '_cache')), false);
        assert.equal(existsSync(path.join(bundleDir, WORK_UNIT_OUTPUT_LEDGER)), false);
      } finally {
        cleanupWorkUnitBundle(bundleDir);
      }
    });
  }

  it('renders complete Wave0 metadata and cache construction facts from existing owners', () => {
    const bundleDir = tempWorkUnitBundle('dew021-wave0-facts-');
    try {
      const { task } = claimWave(bundleDir, { phase: 'wave0' });
      assert.match(task, /required metadata fields: `url`, `title`, `retrieved_date`, `topic_tag`/i);
      assert.match(task, /optional metadata fields: `notes`/i);
      assert.match(task, /allowed meta\.json source-mapping fields: `url`, `source_url`, `final_url`, `fetched_url`, `source_slug`/i);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });

  it('keeps a historical task surface readable without adding a Completion Contract migration', () => {
    const bundleDir = tempWorkUnitBundle('dew021-historical-task-');
    try {
      const { record } = claimWave(bundleDir, { phase: 'wave0' });
      const taskPath = path.join(bundleDir, record.paths.task_ref);
      const historicalTask = '# Historical Work Unit\n\nLegacy task rendering remains attempt history.\n';
      writeFileSync(taskPath, historicalTask);

      const dry = drySubmitWorkUnit(bundleDir, {
        work_id: record.work_id,
        resultPath: path.join(bundleDir, record.paths.result_ref),
      });
      assert.equal(dry.ok, false);
      const formal = submitWorkUnit(bundleDir, {
        work_id: record.work_id,
        resultPath: path.join(bundleDir, record.paths.result_ref),
      });
      assert.equal(formal.ok, false);
      const timeout = timeoutPreflightWorkUnit(bundleDir, { work_id: record.work_id });
      assert.equal(timeout.work_id, record.work_id);
      assert.equal(readFileSync(taskPath, 'utf8'), historicalTask);
    } finally {
      cleanupWorkUnitBundle(bundleDir);
    }
  });
});
