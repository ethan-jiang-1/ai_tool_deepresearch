import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  unreviewedSubmittedSupplementaryRows,
} from '../../DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs';
import { readBundlePlan } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-readers.mjs';
import { evaluateTopicLayouts } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/topic-layout.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  referenceContent,
  tempWorkUnitBundle,
} from '../engine/work-unit-test-helpers.mjs';

// @impl WAI-009

const createdBundles = [];

function writePlan(dir, topics) {
  writeFileSync(join(dir, 'rb_plan.md'), `---\n${JSON.stringify({
    plan_basename: 'wave1-floor-feedback-depth-review-test',
    derived_topic_count: topics.length,
    topic_registry_version: '2',
    topic_registry: topics,
  }, null, 2)}\n---\n# Plan\n`);
}

function topic(uid, id, slug) {
  return {
    topic_uid: uid,
    id,
    slug,
    title: slug,
    must_answer: [`What matters for ${slug}?`],
    scope_role: 'primary',
    depends_on_topic_uids: [],
    previous_layouts: [],
  };
}

function writeDepthReview(dir, topicSlug, refs) {
  const reviewPath = join(dir, 'artifacts', 'wave1', topicSlug, 'depth-review.yaml');
  mkdirSync(join(dir, 'artifacts', 'wave1', topicSlug), { recursive: true });
  writeFileSync(reviewPath, `${JSON.stringify({
    version: 'depth-review.v1',
    topic_slug: topicSlug,
    reviewed_work_unit_refs: refs,
  }, null, 2)}\n`);
}

function submitWave1(dir, { queueItemId, topicUid, topicSlug, sourceUrl, assignmentMode = 'supplementary' }) {
  const sourceRef = `reference/${queueItemId}-submitted-source.md`;
  const cacheTrail = `_cache/wave1/primary/${queueItemId}/source`;
  const claim = {
    url: sourceUrl,
    source_ref: sourceRef,
    acceptance_status: 'accepted',
    is_new_vs_wave0: true,
    cache_trail_refs: [cacheTrail],
  };
  const submitted = claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId,
    queueItemOverrides: {
      payload: { topic_uid: topicUid, topic_slug: topicSlug, wave: 1, assignment_mode: assignmentMode },
    },
    outputs: [{
      path: sourceRef,
      role: 'reference',
      source_url: sourceUrl,
      source_slug: 'submitted-source',
      content: referenceContent({ source_url: sourceUrl, related_topic_uid: topicUid }),
    }],
    cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
    resultOverrides: { source_claims: [claim], accepted_source_urls: [sourceUrl] },
    preserveQueue: true,
  });
  assert.equal(submitted.submitted.ok, true, JSON.stringify(submitted.submitted));
  return submitted.record;
}

function registryFact(dir) {
  return { layouts: evaluateTopicLayouts(readBundlePlan(dir).topic_registry) };
}

after(() => createdBundles.splice(0).forEach(cleanupWorkUnitBundle));

describe('unreviewed submitted supplementary Wave1 rows (WAI-009)', () => {
  it('names a submitted supplementary work unit missing from depth-review', () => {
    const dir = tempWorkUnitBundle('wave1-floor-sync-');
    createdBundles.push(dir);
    const topicA = topic('tp_123e4567-e89b-12d3-a456-426614174000', '01', 'topic-a');
    writePlan(dir, [topicA]);
    const submitted = submitWave1(dir, {
      queueItemId: 'topic-a-supp',
      topicUid: topicA.topic_uid,
      topicSlug: topicA.slug,
      sourceUrl: 'https://example.com/supplement/article',
    });
    // depth review exists but does NOT list the supplementary work unit
    writeDepthReview(dir, topicA.slug, []);

    const result = unreviewedSubmittedSupplementaryRows(dir, topicA.slug, registryFact(dir));

    assert.equal(result.ok, true);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].work_id, submitted.work_id);
    assert.match(result.rows[0].ref, /_work_units\/wave1\/wu-/);
  });

  it('reports no unreviewed rows once depth-review lists the work unit', () => {
    const dir = tempWorkUnitBundle('wave1-floor-sync2-');
    createdBundles.push(dir);
    const topicA = topic('tp_123e4567-e89b-12d3-a456-426614174001', '01', 'topic-a');
    writePlan(dir, [topicA]);
    const submitted = submitWave1(dir, {
      queueItemId: 'topic-a-supp2',
      topicUid: topicA.topic_uid,
      topicSlug: topicA.slug,
      sourceUrl: 'https://example.com/supplement/article2',
    });
    writeDepthReview(dir, topicA.slug, [submitted.paths.work_unit_dir]);

    const result = unreviewedSubmittedSupplementaryRows(dir, topicA.slug, registryFact(dir));

    assert.equal(result.ok, true);
    assert.equal(result.rows.length, 0);
  });

  it('excludes an omitted primary row from the supplementary review-sync signal', () => {
    const dir = tempWorkUnitBundle('wave1-floor-sync-');
    createdBundles.push(dir);
    const topicA = topic('tp_123e4567-e89b-12d3-a456-426614174000', '01', 'topic-a');
    writePlan(dir, [topicA]);
    submitWave1(dir, {
      queueItemId: 'topic-a-primary',
      topicUid: topicA.topic_uid,
      topicSlug: topicA.slug,
      sourceUrl: 'https://example.com/primary/article',
      assignmentMode: 'primary',
    });
    writeDepthReview(dir, topicA.slug, []);

    const result = unreviewedSubmittedSupplementaryRows(dir, topicA.slug, registryFact(dir));

    assert.equal(result.ok, true);
    assert.deepEqual(result.rows, []);
  });

  it('recognizes an alternate accepted supplementary coordinate with trailing slash as reviewed', () => {
    const dir = tempWorkUnitBundle('wave1-floor-sync-');
    createdBundles.push(dir);
    const topicA = topic('tp_123e4567-e89b-12d3-a456-426614174000', '01', 'topic-a');
    writePlan(dir, [topicA]);
    const submitted = submitWave1(dir, {
      queueItemId: 'topic-a-supp-alternate-ref',
      topicUid: topicA.topic_uid,
      topicSlug: topicA.slug,
      sourceUrl: 'https://example.com/supplement/alternate-coordinate',
    });
    writeDepthReview(dir, topicA.slug, [`${submitted.work_id}/`]);

    const result = unreviewedSubmittedSupplementaryRows(dir, topicA.slug, registryFact(dir));

    assert.equal(result.ok, true);
    assert.deepEqual(result.rows, []);
  });
});
