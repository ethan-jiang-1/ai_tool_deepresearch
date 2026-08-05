import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  currentIntentSha256,
  isValidCarriedTargetReceipt,
  selectWave1CarriedTargetReceipt,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-carried-target-receipts.mjs';

const dirs = [];

function bundle(topics) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'wave-carried-targets-'));
  dirs.push(dir);
  writeFileSync(path.join(dir, 'rb_plan.md'), `---\n${JSON.stringify({
    plan_basename: 'receipt-test',
    topic_registry_version: '2',
    topic_registry: topics,
  }, null, 2)}\n---\n# Plan\n`);
  return dir;
}

function topic({ uid, slug, previous = [], title = 'Topic' }) {
  return {
    topic_uid: uid,
    id: '01',
    slug,
    title,
    must_answer: ['What remains?'],
    scope_role: 'primary',
    depends_on_topic_uids: [],
    previous_layouts: previous,
  };
}

function review(dir, slug, carriedTargets) {
  const file = path.join(dir, 'artifacts', 'wave1', slug, 'depth-review.yaml');
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ carried_targets: carriedTargets }, null, 2)}\n`);
}

after(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe('Wave1 carried-target receipt selector', () => {
  it('normalizes, sorts, and digests every canonical Topic declaration', () => {
    const first = topic({ uid: 'tp-a', slug: 'topic-a', title: 'Alpha' });
    const second = topic({ uid: 'tp-b', slug: 'topic-b', title: 'Beta' });
    const dir = bundle([second, first]);
    review(dir, 'topic-a', [{ target_id: 'question.2', target_text: '  Normalize\r\nthis target  ' }]);
    review(dir, 'topic-b', []);

    const selected = selectWave1CarriedTargetReceipt(dir);
    assert.equal(selected.ok, true, JSON.stringify(selected.findings));
    assert.equal(isValidCarriedTargetReceipt(selected.receipt), true);
    assert.deepEqual(selected.receipt.targets.map((target) => [target.topic_uid, target.target_id]), [['tp-a', 'question.2']]);
    assert.equal(selected.receipt.targets[0].intent_sha256, currentIntentSha256(first));
    assert.match(selected.receipt.targets[0].target_revision, /^[0-9a-f]{64}$/);
  });

  it('accepts an explicit empty declaration and layout-only reuse', () => {
    const current = topic({ uid: 'tp-a', slug: 'topic-a', previous: [{ id: '02', slug: 'old-topic-a' }] });
    const dir = bundle([current]);
    review(dir, 'old-topic-a', []);

    const selected = selectWave1CarriedTargetReceipt(dir);
    assert.equal(selected.ok, true, JSON.stringify(selected.findings));
    assert.deepEqual(selected.receipt.targets, []);
  });

  it('rejects missing declarations, duplicate local IDs, and ambiguous layout candidates', () => {
    const current = topic({ uid: 'tp-a', slug: 'topic-a', previous: [{ id: '02', slug: 'old-topic-a' }] });
    const missing = bundle([current]);
    review(missing, 'topic-a', undefined);
    assert.equal(selectWave1CarriedTargetReceipt(missing).ok, false);

    const duplicate = bundle([current]);
    review(duplicate, 'topic-a', [
      { target_id: 'same', target_text: 'One' },
      { target_id: 'same', target_text: 'Two' },
    ]);
    assert.equal(selectWave1CarriedTargetReceipt(duplicate).ok, false);

    const ambiguous = bundle([current]);
    review(ambiguous, 'topic-a', []);
    review(ambiguous, 'old-topic-a', []);
    assert.equal(selectWave1CarriedTargetReceipt(ambiguous).ok, false);
  });

  it('changes intent and target revision only when their canonical source changes', () => {
    const base = topic({ uid: 'tp-a', slug: 'topic-a', title: 'Original' });
    const renamed = { ...base, title: 'Changed' };
    assert.notEqual(currentIntentSha256(base), currentIntentSha256(renamed));

    const first = bundle([base]);
    review(first, 'topic-a', [{ target_id: 'target', target_text: 'One' }]);
    const second = bundle([base]);
    review(second, 'topic-a', [{ target_id: 'target', target_text: 'Two' }]);
    assert.notEqual(
      selectWave1CarriedTargetReceipt(first).receipt.targets[0].target_revision,
      selectWave1CarriedTargetReceipt(second).receipt.targets[0].target_revision,
    );
  });
});
