// @impl REF-003, REF-004

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  cleanupWorkUnitBundle,
  recursiveAuthoritySnapshot,
  referenceContent,
  tempWorkUnitBundle,
} from '../../engine/work-unit-test-helpers.mjs';

const bundles = [];
const ROOT = process.cwd();
const TOPIC = {
  topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
  id: '01',
  slug: 'topic-a',
  title: 'Topic A',
  must_answer: ['What matters?'],
  scope_role: 'primary',
  depends_on_topic_uids: [],
  previous_layouts: [],
};

after(() => bundles.splice(0).forEach(cleanupWorkUnitBundle));

function bundle() {
  const dir = tempWorkUnitBundle('reference-evidence-map-cli-');
  bundles.push(dir);
  mkdirSync(join(dir, 'reference'), { recursive: true });
  writeFileSync(join(dir, 'rb_plan.md'), ['---', JSON.stringify({
    plan_basename: 'reference-evidence-map-cli',
    derived_topic_count: 1,
    topic_registry_version: '2',
    topic_registry: [TOPIC],
  }, null, 2), '---', '# Plan', ''].join('\n'));
  writeFileSync(join(dir, 'rb_profile.yaml'), [
    'research_style_params:',
    '  wave1_per_topic_ref_floor: 1',
    '  topic_unique_ratio: 0',
    '  counterexample_search: false',
    '  cross_verification: false',
    'human_decision_checkpoints:',
    '  hitl2:',
    '    rerun_count: 0',
    '',
  ].join('\n'));
  writeFileSync(join(dir, 'reference', '00-shared-foundation.md'), referenceContent({ related_topic_uid: 'all' }));
  writeFileSync(join(dir, 'reference', 'topic-a-current.md'), referenceContent({ related_topic_uid: TOPIC.topic_uid }));
  writeFileSync(join(dir, 'reference', '_INDEX.md'), 'stale index');
  writeFileSync(join(dir, 'reference', 'README.md'), 'stale reader navigation');
  return dir;
}

function authoritySnapshot(dir) {
  return Object.fromEntries([
    'rb_status.json',
    'rb_queue.json',
    'rb_output_declarations.jsonl',
    '_work_units',
  ].map((name) => [name, recursiveAuthoritySnapshot(join(dir, name))]));
}

function sync(dir) {
  const result = spawnSync(process.execPath, [
    join(ROOT, 'DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs'),
    '--bundle',
    dir,
  ], { cwd: ROOT, encoding: 'utf8' });
  assert.ok([0, 1].includes(result.status), result.stderr || result.stdout);
  return { process: result, output: JSON.parse(result.stdout) };
}

describe('reference evidence map CLI', () => {
  it('persists paired reader navigation without mutating submitted or Gate authority', () => {
    const dir = bundle();
    const authorityBefore = authoritySnapshot(dir);

    const first = sync(dir);
    assert.equal(first.process.status, 0);
    assert.equal(first.output.verdict, 'committed');
    assert.deepEqual(first.output.committed_targets, ['reference/_INDEX.md', 'reference/README.md']);
    assert.equal(first.output.target_results.length, 2);
    assert.match(readFileSync(join(dir, 'reference/_INDEX.md'), 'utf8'), /Reference count:\*\* 2/);
    const readme = readFileSync(join(dir, 'reference/README.md'), 'utf8');
    assert.match(readme, /## Reference Evidence Map/);
    assert.match(readme, /Derived navigation only/);
    assert.match(readme, /00-shared-foundation\.md.*shared/);
    assert.match(readme, /topic-a-current\.md.*Topic-specific/);
    assert.deepEqual(authoritySnapshot(dir), authorityBefore);

    const second = sync(dir);
    assert.equal(second.process.status, 0);
    assert.equal(second.output.verdict, 'unchanged');
    assert.deepEqual(second.output.committed_targets, []);
    assert.deepEqual(authoritySnapshot(dir), authorityBefore);
  });

  it('rejects a retained legacy reference before navigation persistence', () => {
    const dir = bundle();
    const referencePath = join(dir, 'reference', 'topic-a-current.md');
    const historicalBytes = readFileSync(referencePath, 'utf8').replace(
      `- related_topic_uid: ${TOPIC.topic_uid}`,
      `- related_topic_uid: ${TOPIC.topic_uid}\n- related_topic: topic-a`,
    );
    writeFileSync(referencePath, historicalBytes);
    const indexBefore = readFileSync(join(dir, 'reference', '_INDEX.md'), 'utf8');
    const readmeBefore = readFileSync(join(dir, 'reference', 'README.md'), 'utf8');

    const result = sync(dir);
    assert.equal(result.process.status, 1);
    assert.equal(result.output.verdict, 'blocked');
    assert.equal(result.output.reason_code, 'reference_topic_binding_legacy_unsupported');
    assert.equal(readFileSync(referencePath, 'utf8'), historicalBytes);
    assert.equal(readFileSync(join(dir, 'reference', '_INDEX.md'), 'utf8'), indexBefore);
    assert.equal(readFileSync(join(dir, 'reference', 'README.md'), 'utf8'), readmeBefore);
  });
});
