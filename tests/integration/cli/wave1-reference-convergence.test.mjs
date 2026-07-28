import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  canonicalWave1ReferencePath,
  evaluateWave1ReferenceTopic,
  resolveReviewedWave1SubmittedBacking,
} from '../../../DPT_FRAMEWORK/engine/helpers/wave1-reference-convergence.mjs';
import { buildCanonicalTopicRegistryFact } from '../../../DPT_FRAMEWORK/engine/helpers/topic-registry-fact.mjs';
import { claimAndSubmitWorkUnit, cleanupWorkUnitBundle, referenceContent, tempWorkUnitBundle } from '../../engine/work-unit-test-helpers.mjs';

const bundles = [];
const root = process.cwd();
after(() => bundles.splice(0).forEach(cleanupWorkUnitBundle));

function bundle() {
  const dir = tempWorkUnitBundle('wave1-reference-integration-');
  bundles.push(dir);
  const topic = {
    topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', id: '01', slug: 'topic-a', title: 'Topic A',
    must_answer: ['What matters?'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [],
  };
  writeFileSync(join(dir, 'rb_plan.md'), `---\n${JSON.stringify({ plan_basename: 'wave1-reference-integration', derived_topic_count: 1, topic_registry_version: '2', topic_registry: [topic] }, null, 2)}\n---\n# Plan\n`);
  mkdirSync(join(dir, 'reference'), { recursive: true });
  return { dir, topic };
}

function submitReviewedCandidate(dir, topic) {
  const sourceUrl = 'https://example.com/research/current-source';
  const submitted = claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId: 'topic-a-primary',
    queueItemOverrides: { payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug, wave: 1, assignment_mode: 'primary' } },
    outputs: [{
      path: 'reference/submitted-source.md', role: 'reference', source_url: sourceUrl, source_slug: 'submitted-source',
      content: referenceContent({ source_url: sourceUrl, related_topic: topic.slug }),
    }],
    cacheTrails: [{ path: '_cache/wave1/primary/topic-a-primary/source', url: sourceUrl }],
    resultOverrides: {
      source_claims: [{
        url: sourceUrl, source_ref: 'reference/submitted-source.md', acceptance_status: 'accepted', is_new_vs_wave0: true,
        cache_trail_refs: ['_cache/wave1/primary/topic-a-primary/source'],
      }],
      accepted_source_urls: [sourceUrl],
    },
  });
  mkdirSync(join(dir, 'artifacts/wave1', topic.slug), { recursive: true });
  writeFileSync(join(dir, 'artifacts/wave1', topic.slug, 'depth-review.yaml'), `${JSON.stringify({
    version: 'depth-review.v1', topic_slug: topic.slug, reviewed_work_unit_refs: [submitted.record.paths.work_unit_dir],
  }, null, 2)}\n`);
  return submitted.record;
}

function sync(dir) {
  const result = spawnSync('node', [join(root, 'DPT_FRAMEWORK/cli/sync-reference-index.mjs'), '--bundle', dir], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

describe('Wave1 reference convergence commands', () => {
  it('closes a real submitted candidate only after canonical projection and index sync', () => {
    const { dir, topic } = bundle();
    submitReviewedCandidate(dir, topic);
    const registry = buildCanonicalTopicRegistryFact(dir);
    const backing = resolveReviewedWave1SubmittedBacking(dir, { topic: topic.slug, topicRegistryFact: registry });
    assert.equal(backing.ok, true);
    const candidate = backing.candidates[0];
    const canonical = canonicalWave1ReferencePath({ topicSlug: topic.slug, sourceUrl: candidate.normalized_url });
    writeFileSync(join(dir, canonical.path), referenceContent({
      source_url: candidate.normalized_url,
      related_topic: topic.slug,
      coreContent: `Submitted backing: ${candidate.source_refs[0]} ${candidate.cache_trail_refs[0]} ${candidate.work_unit_refs[0]}.`,
    }));
    assert.equal(sync(dir).verdict, 'committed');
    const result = evaluateWave1ReferenceTopic(dir, { topic: topic.slug, topicRegistryFact: registry, requiredFloor: 1 });
    assert.equal(result.result.outcome, 'satisfied');
    assert.match(readFileSync(join(dir, 'reference/_INDEX.md'), 'utf8'), new RegExp(`\\| ${canonical.path.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')} \\|`));
  });

  it('does not let a legacy projection satisfy canonical current coverage', () => {
    const { dir, topic } = bundle();
    const record = submitReviewedCandidate(dir, topic);
    writeFileSync(join(dir, 'reference/01-wave1-legacy.md'), referenceContent({
      source_url: 'https://example.com/research/current-source', related_topic: topic.slug,
      coreContent: `Historical backing: reference/submitted-source.md _cache/wave1/primary/topic-a-primary/source ${record.work_id}.`,
    }));
    assert.equal(sync(dir).verdict, 'committed');
    const result = evaluateWave1ReferenceTopic(dir, { topic: topic.slug, topicRegistryFact: buildCanonicalTopicRegistryFact(dir), requiredFloor: 1 });
    assert.equal(result.result.outcome, 'materialize_projection');
  });
});
