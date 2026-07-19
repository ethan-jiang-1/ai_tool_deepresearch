// @impl RRM-007

import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { collectEligibleRows } from '../../DPT_FRAMEWORK/engine/work-unit-projection.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  tempWorkUnitBundle,
} from './work-unit-test-helpers.mjs';

const TOPIC_UID = 'tp_123e4567-e89b-42d3-a456-426614174010';
const bundles = [];

function bundle({ rerunCount = 2, includeRound = true } = {}) {
  const dir = tempWorkUnitBundle('work-unit-projection-');
  bundles.push(dir);
  const round = includeRound ? `\n    rerun_count: ${rerunCount}` : ' {}';
  writeFileSync(path.join(dir, 'rb_profile.yaml'), `human_decision_checkpoints:\n  hitl2:${round}\n`);
  writeFileSync(path.join(dir, 'rb_plan.md'), `---
plan_basename: projection
derived_topic_count: 1
topic_registry_version: "2"
topic_registry:
  - topic_uid: ${TOPIC_UID}
    id: "01"
    slug: current-topic
    title: Current Topic
    must_answer: ["What matters?"]
    scope_role: primary
    depends_on_topic_uids: []
    previous_layouts:
      - id: "00"
        slug: old-topic
---
# Plan
`);
  return dir;
}

function submit(dir, { slug = 'current-topic', queueItemId = 'queue-current' } = {}) {
  return claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId,
    preserveQueue: true,
    queueItemOverrides: {
      payload: { topic_uid: TOPIC_UID, topic_slug: slug },
      lineage: { topic_uid: TOPIC_UID, topic_slug: slug, phase: 'wave1' },
    },
  });
}

after(() => bundles.forEach(cleanupWorkUnitBundle));

describe('eligible work-unit projection', () => {
  it('treats no submitted declarations as a valid empty set', () => {
    const dir = bundle();
    assert.deepEqual(collectEligibleRows(dir, 'wave1'), {
      passed: true, rows: [], root_findings: [], warnings: [],
    });
  });

  it('normalizes only an absent HITL2 round to zero', () => {
    const absent = bundle({ includeRound: false });
    assert.equal(collectEligibleRows(absent, 'wave1').passed, true);
    writeFileSync(path.join(absent, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: "2"\n');
    const malformed = collectEligibleRows(absent, 'wave1');
    assert.equal(malformed.passed, false);
    assert.match(malformed.root_findings[0].missing_fact, /non-negative integer/);
  });

  it('projects current rows through UID and previous-layout binding', () => {
    const dir = bundle();
    const submitted = submit(dir, { slug: 'old-topic' });
    const result = collectEligibleRows(dir, 'wave1', 'current-topic');
    assert.equal(result.passed, true, JSON.stringify(result.root_findings));
    assert.equal(result.rows[0].work_id, submitted.record.work_id);
    assert.equal(result.rows[0].topic_uid, TOPIC_UID);
    assert.equal(result.rows[0].topic_slug, 'current-topic');
    assert.deepEqual(result.rows[0].accepted_slugs, ['current-topic', 'old-topic']);
  });

  it('fails closed when stored snapshot hashes drift together', () => {
    const dir = bundle();
    const submitted = submit(dir);
    const indexPath = path.join(dir, '_work_units/_index.json');
    const manifestPath = path.join(dir, submitted.record.paths.manifest_ref);
    const index = JSON.parse(readFileSync(indexPath, 'utf8'));
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    index.work_units[submitted.record.work_id].queue_item_snapshot_hash = 'same-drift';
    manifest.queue_item_snapshot_hash = 'same-drift';
    writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const result = collectEligibleRows(dir, 'wave1');
    assert.equal(result.passed, false);
    assert.match(result.root_findings[0].missing_fact, /snapshot hash mismatch/);
  });

  it('does not import unrelated lease, receipt, cache, or orphan health', () => {
    const dir = bundle();
    const submitted = submit(dir);
    writeFileSync(path.join(dir, submitted.record.paths.runtime_receipt_ref), ': unrelated broken receipt\n');
    mkdirSync(path.join(dir, '_work_units/wave1/wu-w1-b000-deep-i9999'), { recursive: true });
    const result = collectEligibleRows(dir, 'wave1');
    assert.equal(result.passed, true, JSON.stringify(result.root_findings));
    assert.equal(result.rows.length, 1);
  });

  it('keeps the reader/projection import direction acyclic', () => {
    const reader = readFileSync(path.resolve('DPT_FRAMEWORK/engine/helpers/gate-helpers-readers.mjs'), 'utf8');
    const projection = readFileSync(path.resolve('DPT_FRAMEWORK/engine/work-unit-projection.mjs'), 'utf8');
    assert.doesNotMatch(reader, /work-unit-(?:projection|validation)\.mjs/);
    assert.match(projection, /gate-helpers-readers\.mjs/);
    assert.match(projection, /work-unit-validation\.mjs/);
  });
});
