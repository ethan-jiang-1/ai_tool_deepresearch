// @impl RTI-007, WPG-015, RRM-006, RRM-007, VER-001, VER-004
// Integration: current-round work-unit authority through the production inspect CLI.

import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  tempWorkUnitBundle,
} from '../../engine/work-unit-test-helpers.mjs';

const CLI = path.resolve('DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs');
const TOPIC_UID = 'tp_123e4567-e89b-42d3-a456-426614174010';
const bundles = [];

function bundle(rerunCount = 2) {
  const dir = tempWorkUnitBundle('rerun-round-cli-');
  bundles.push(dir);
  writeFileSync(path.join(dir, 'rb_profile.yaml'), `human_decision_checkpoints:\n  hitl2:\n    rerun_count: ${rerunCount}\n`);
  writeFileSync(path.join(dir, 'rb_plan.md'), `---
plan_basename: eligible-projection
derived_topic_count: 1
topic_registry_version: "2"
topic_registry:
  - topic_uid: ${TOPIC_UID}
    id: "01"
    slug: topic-a
    title: Topic A
    must_answer: ["What matters?"]
    scope_role: primary
    depends_on_topic_uids: []
    previous_layouts: []
---
# Plan
`);
  return dir;
}

function setRerunCount(dir, rerunCount) {
  writeFileSync(path.join(dir, 'rb_profile.yaml'), `human_decision_checkpoints:\n  hitl2:\n    rerun_count: ${rerunCount}\n`);
}

function submit(dir, queueItemId) {
  return claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId,
    preserveQueue: true,
    queueItemOverrides: {
      payload: { topic_uid: TOPIC_UID, topic_slug: 'topic-a' },
      lineage: { topic_uid: TOPIC_UID, topic_slug: 'topic-a', phase: 'wave1' },
    },
  });
}

function inspectEligible(dir) {
  const result = spawnSync(process.execPath, [CLI, 'inspect', dir, '--eligible-rows', '--phase', 'wave1'], {
    encoding: 'utf8',
    timeout: 15000,
  });
  assert.ok(result.stdout.trim(), `inspect emitted no structured stdout: ${result.stderr}`);
  return { process: result, output: JSON.parse(result.stdout) };
}

after(() => {
  for (const dir of bundles) cleanupWorkUnitBundle(dir);
});

describe('rerun current-round eligible rows CLI', () => {
  it('includes current-round submitted rows and excludes prior-round rows', () => {
    const dir = bundle(1);
    const prior = submit(dir, 'queue-prior');
    setRerunCount(dir, 2);
    const current = submit(dir, 'queue-current');

    const { process, output } = inspectEligible(dir);
    assert.equal(process.status, 0, `${process.stdout}\n${process.stderr}`);
    assert.equal(output.passed, true);
    assert.deepEqual(output.eligible_rows.map((row) => row.work_id), [current.record.work_id]);
    assert.equal(output.eligible_rows.some((row) => row.work_id === prior.record.work_id), false);
    assert.equal(output.eligible_rows[0].rerun_count, 2);
    assert.equal(output.eligible_rows[0].status, 'submitted');
  });

  it('excludes legacy submitted rows and emits the native warning', () => {
    const dir = bundle(2);
    const legacy = submit(dir, 'queue-legacy');
    const indexPath = path.join(dir, '_work_units', '_index.json');
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    delete index.work_units[legacy.record.work_id].rerun_count;
    writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

    const { process, output } = inspectEligible(dir);
    assert.equal(process.status, 0, `${process.stdout}\n${process.stderr}`);
    assert.deepEqual(output.eligible_rows, []);
    assert.match(output.warnings.join('\n'), /legacy submitted row.*without rerun_count excluded/);
  });

  it('fails closed and clears eligible rows when work-unit authority is inconsistent', () => {
    const dir = bundle(2);
    const current = submit(dir, 'queue-inconsistent');
    const manifestPath = path.join(dir, current.record.paths.manifest_ref);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.receipt_nonce = 'wu-ffffffffffffffff';
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const { process, output } = inspectEligible(dir);
    assert.equal(process.status, 1);
    assert.equal(output.passed, false);
    assert.deepEqual(output.eligible_rows, []);
    assert.match(output.inspect.join('\n'), /manifest\/index mismatch.*receipt_nonce/);
    assert.match(output.warnings.join('\n'), /authority is inconsistent/);
  });
});
