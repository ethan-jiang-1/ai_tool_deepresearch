import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderReferenceIndex, syncReferenceIndex } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/reference-index-sync.mjs';
import { cleanupWorkUnitBundle, referenceContent, tempWorkUnitBundle } from '../work-unit-test-helpers.mjs';

const bundles = [];
after(() => bundles.splice(0).forEach(cleanupWorkUnitBundle));

function bundle() {
  const dir = tempWorkUnitBundle('reference-index-sync-');
  bundles.push(dir);
  mkdirSync(join(dir, 'reference'), { recursive: true });
  writeFileSync(join(dir, 'rb_plan.md'), `---\n${JSON.stringify({
    plan_basename: 'index-sync-test',
    derived_topic_count: 1,
    topic_registry_version: '2',
    topic_registry: [{
      topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A',
      must_answer: ['What matters?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [],
    }],
  }, null, 2)}\n---\n# Plan\n`);
  return dir;
}

function writeReference(dir, name, options) {
  writeFileSync(join(dir, 'reference', name), referenceContent(options));
}

describe('reference index synchronization', () => {
  it('renders every flat reference family in stable order and retains a valid prior date', () => {
    const dir = bundle();
    writeReference(dir, '00-cross-findings.md', { related_topic: 'all', source_type: 'mixed' });
    writeReference(dir, '00-shared-foundation.md', { related_topic: 'all' });
    writeReference(dir, '01-wave1-legacy.md', { related_topic: 'topic-a' });
    writeReference(dir, 'topic-a-current.md', { related_topic: 'topic-a' });
    writeFileSync(join(dir, 'reference', '_INDEX.md'), [
      '# Old', '', '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
      '| reference/topic-a-current.md | primary | expert | Tier 2 | topic-a | wave1_topic | accepted | 2025-01-02 |', '',
    ].join('\n'));
    const rendered = renderReferenceIndex(dir, { syncDate: '2026-07-28' });
    assert.equal(rendered.ok, true);
    assert.deepEqual(rendered.rows.map((row) => row.source_layer), ['wave2_cross', 'wave0_foundation', 'wave1_topic', 'wave1_topic']);
    assert.equal(rendered.rows.at(-1).date_landed, '2025-01-02');
    const committed = syncReferenceIndex(dir, { syncDate: '2026-07-28' });
    assert.equal(committed.verdict, 'committed');
    const index = readFileSync(join(dir, 'reference/_INDEX.md'), 'utf8');
    assert.match(index, /Reference count:\*\* 4/);
    assert.match(index, /01-wave1-legacy\.md \| primary .* \| wave1_topic/);
    assert.equal(syncReferenceIndex(dir, { syncDate: '2026-07-28' }).verdict, 'unchanged');
  });

  it('blocks an unclassifiable non-special reference without touching the target', () => {
    const dir = bundle();
    writeReference(dir, 'unknown.md', { related_topic: 'unknown-topic' });
    const target = join(dir, 'reference/_INDEX.md');
    writeFileSync(target, 'keep these bytes');
    const result = syncReferenceIndex(dir, { syncDate: '2026-07-28' });
    assert.equal(result.verdict, 'blocked');
    assert.equal(result.reason_code, 'reference_index_layer_unclassifiable');
    assert.equal(readFileSync(target, 'utf8'), 'keep these bytes');
  });

  it('returns a CAS block without merging concurrent index drift', () => {
    const dir = bundle();
    writeReference(dir, '00-shared-foundation.md', { related_topic: 'all' });
    const target = join(dir, 'reference/_INDEX.md');
    writeFileSync(target, [
      '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
      '| reference/old.md | primary | expert | Tier 2 | all | wave0_foundation | accepted | 2026-01-01 |', '',
    ].join('\n'));
    const result = syncReferenceIndex(dir, {
      syncDate: '2026-07-28',
      persistenceHooks: { afterPayloadFsync: () => writeFileSync(target, 'concurrent target bytes') },
    });
    assert.equal(result.verdict, 'blocked');
    assert.match(result.reason_code, /target_mismatch/);
    assert.equal(readFileSync(target, 'utf8'), 'concurrent target bytes');
  });

  it('reports and converges a later README CAS block without rollback or merge', () => {
    const dir = bundle();
    writeReference(dir, '00-shared-foundation.md', { related_topic: 'all' });
    const indexTarget = join(dir, 'reference/_INDEX.md');
    const readmeTarget = join(dir, 'reference/README.md');
    let payloadFsyncs = 0;

    const blocked = syncReferenceIndex(dir, {
      syncDate: '2026-07-28',
      persistenceHooks: {
        afterPayloadFsync: () => {
          payloadFsyncs += 1;
          if (payloadFsyncs === 2) writeFileSync(readmeTarget, 'concurrent README bytes');
        },
      },
    });

    assert.equal(blocked.verdict, 'blocked');
    assert.match(blocked.reason_code, /target_mismatch/);
    assert.equal(blocked.blocked_target, 'reference/README.md');
    assert.deepEqual(blocked.committed_targets, ['reference/_INDEX.md']);
    assert.equal(readFileSync(readmeTarget, 'utf8'), 'concurrent README bytes');
    assert.match(readFileSync(indexTarget, 'utf8'), /Reference count:\*\* 1/);

    const retried = syncReferenceIndex(dir, { syncDate: '2026-07-28' });
    assert.equal(retried.verdict, 'committed');
    assert.deepEqual(retried.committed_targets, ['reference/README.md']);
    assert.match(readFileSync(readmeTarget, 'utf8'), /## Reference Evidence Map/);
  });
});
