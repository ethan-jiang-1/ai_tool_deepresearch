import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  canonicalWave1ReferencePath,
  classifyWave1ReferencePath,
  evaluateWave1ReferenceConvergence,
  evaluateWave1ReferenceTopic,
  inspectWave1CandidateProjection,
  normalizeWave1ReferenceUrl,
  resolveReviewedWave1SubmittedBacking,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs';
import { readBundlePlan } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-readers.mjs';
import { evaluateTopicLayouts } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/topic-layout.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  referenceContent,
  tempWorkUnitBundle,
} from '../work-unit-test-helpers.mjs';

const createdBundles = [];

function writePlan(dir, topics) {
  writeFileSync(join(dir, 'rb_plan.md'), `---\n${JSON.stringify({
    plan_basename: 'wave1-reference-convergence-test',
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

function submitWave1Candidate(dir, { queueItemId, topicUid, topicSlug, sourceUrl }) {
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
      payload: { topic_uid: topicUid, topic_slug: topicSlug, wave: 1, assignment_mode: 'primary' },
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

function writeDepthReview(dir, topicSlug, refs) {
  const reviewPath = join(dir, 'artifacts', 'wave1', topicSlug, 'depth-review.yaml');
  mkdirSync(join(dir, 'artifacts', 'wave1', topicSlug), { recursive: true });
  writeFileSync(reviewPath, `${JSON.stringify({
    version: 'depth-review.v1',
    topic_slug: topicSlug,
    reviewed_work_unit_refs: refs,
  }, null, 2)}\n`);
}

function topicRegistryFact(dir) {
  return { layouts: evaluateTopicLayouts(readBundlePlan(dir).topic_registry) };
}

after(() => createdBundles.splice(0).forEach(cleanupWorkUnitBundle));

describe('Wave1 reference identity', () => {
  it('normalizes fragments without changing canonical identity', () => {
    assert.equal(
      normalizeWave1ReferenceUrl('https://example.com/paper#section'),
      normalizeWave1ReferenceUrl('https://example.com/paper'),
    );
  });

  it('derives a repeatable full-current-slug path with a collision-safe qualifier', () => {
    const input = {
      topicSlug: '01_meal-timing-blood-glucose-insulin',
      sourceUrl: 'https://example.com/research/paper',
    };
    const first = canonicalWave1ReferencePath(input);
    const second = canonicalWave1ReferencePath(input);
    const different = canonicalWave1ReferencePath({ ...input, sourceUrl: 'https://example.com/research/other-paper' });

    assert.equal(first.ok, true);
    assert.equal(first.path, second.path);
    assert.match(first.path, /^reference\/01_meal-timing-blood-glucose-insulin-/);
    assert.notEqual(first.path, different.path);
  });

  it('keeps canonical, legacy, and current misnamed paths distinct', () => {
    const input = {
      topicSlug: '01_meal-timing-blood-glucose-insulin',
      sourceUrl: 'https://example.com/research/paper',
    };
    const canonical = canonicalWave1ReferencePath(input);

    assert.equal(classifyWave1ReferencePath({ ...input, relPath: canonical.path }).path_class, 'canonical_current');
    assert.equal(classifyWave1ReferencePath({ ...input, relPath: 'reference/01-wave1-deepening.md', metadataBindsCurrentTopic: true }).path_class, 'legacy');
    assert.equal(classifyWave1ReferencePath({ ...input, relPath: 'reference/01_meal-timing-blood-glucose-insulin-not-canonical.md', metadataBindsCurrentTopic: true }).path_class, 'misnamed_current');
  });

  it('rejects a non-http submitted backing URL', () => {
    assert.equal(canonicalWave1ReferencePath({ topicSlug: '01_topic', sourceUrl: 'mailto:team@example.com' }).ok, false);
  });

  it('keeps the current normalized long-URL locator stable as an implementation regression', () => {
    const locator = canonicalWave1ReferencePath({
      topicSlug: 'topic-a',
      sourceUrl: 'HTTPS://EXAMPLE.COM/a-very-long-path-segment-with-many-words-and-unicode-like-characters---plus-query?ignored=1#fragment',
    });

    assert.deepEqual(locator, {
      ok: true,
      normalized_url: 'https://example.com/a-very-long-path-segment-with-many-words-and-unicode-like-characters---plus-query?ignored=1',
      qualifier: 'example-com-a-very-long-path-segment-with-many-w-f4d8b6306a70',
      path: 'reference/topic-a-example-com-a-very-long-path-segment-with-many-w-f4d8b6306a70.md',
    });
  });
});

describe('reviewed Wave1 submitted backing', () => {
  it('selects only current-Topic submitted backing and deduplicates fragment variants', () => {
    const dir = tempWorkUnitBundle('wave1-convergence-');
    createdBundles.push(dir);
    const topicA = topic('tp_123e4567-e89b-12d3-a456-426614174000', '01', 'topic-a');
    writePlan(dir, [topicA]);
    const first = submitWave1Candidate(dir, {
      queueItemId: 'topic-a-one',
      topicUid: topicA.topic_uid,
      topicSlug: topicA.slug,
      sourceUrl: 'https://example.com/paper#overview',
    });
    const second = submitWave1Candidate(dir, {
      queueItemId: 'topic-a-two',
      topicUid: topicA.topic_uid,
      topicSlug: topicA.slug,
      sourceUrl: 'https://example.com/paper',
    });
    writeDepthReview(dir, topicA.slug, [first.paths.work_unit_dir, second.paths.work_unit_dir]);

    const resolved = resolveReviewedWave1SubmittedBacking(dir, { topic: topicA.slug, topicRegistryFact: topicRegistryFact(dir) });

    assert.equal(resolved.ok, true);
    assert.deepEqual(resolved.topic, { topic_uid: topicA.topic_uid, topic_slug: topicA.slug });
    assert.equal(resolved.candidates.length, 1);
    assert.equal(resolved.candidates[0].normalized_url, 'https://example.com/paper');
    assert.deepEqual(resolved.candidates[0].work_ids, [first.work_id, second.work_id].sort());
  });

  it('closes only a canonical projection with the candidate-exact URL and backing coordinates', () => {
    const dir = tempWorkUnitBundle('wave1-convergence-');
    createdBundles.push(dir);
    const topicA = topic('tp_123e4567-e89b-12d3-a456-426614174000', '01', 'topic-a');
    writePlan(dir, [topicA]);
    const record = submitWave1Candidate(dir, {
      queueItemId: 'topic-a-one',
      topicUid: topicA.topic_uid,
      topicSlug: topicA.slug,
      sourceUrl: 'https://example.com/paper',
    });
    writeDepthReview(dir, topicA.slug, [record.paths.work_unit_dir]);
    const backing = resolveReviewedWave1SubmittedBacking(dir, { topic: topicA.slug, topicRegistryFact: topicRegistryFact(dir) });
    const candidate = backing.candidates[0];
    const locator = canonicalWave1ReferencePath({ topicSlug: topicA.slug, sourceUrl: candidate.normalized_url });
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, locator.path), referenceContent({
      source_url: candidate.normalized_url,
      related_topic_uid: topicA.topic_uid,
      coreContent: `Projection backing: ${candidate.source_refs[0]} ${candidate.cache_trail_refs[0]} ${candidate.work_unit_refs[0]}.`,
    }));

    const closed = inspectWave1CandidateProjection(dir, { topicSlug: topicA.slug, candidate });
    assert.equal(closed.path_class, 'canonical_current');
    assert.equal(closed.candidate_binding, true);
    assert.equal(closed.format_valid, true);
    assert.equal(closed.url_valid, true);
    assert.equal(closed.countable, true);

    const exactTopic = evaluateWave1ReferenceTopic(dir, {
      topic: topicA.slug,
      topicRegistryFact: topicRegistryFact(dir),
      requiredFloor: 1,
      index: { valid: true, stale: false },
    });
    assert.equal(exactTopic.numeric.count, 1);
    assert.equal(exactTopic.result.outcome, 'satisfied');

    writeFileSync(join(dir, locator.path), referenceContent({
      source_url: candidate.normalized_url,
      related_topic_uid: topicA.topic_uid,
      coreContent: `Projection backing: ${candidate.source_refs[0]}.`,
    }));
    const unbound = inspectWave1CandidateProjection(dir, { topicSlug: topicA.slug, candidate });
    assert.equal(unbound.candidate_binding, false);
    assert.equal(unbound.issue, 'canonical_projection_body_unbound');
  });

  it('fails closed when a reviewed submitted row is bound to another current Topic', () => {
    const dir = tempWorkUnitBundle('wave1-convergence-');
    createdBundles.push(dir);
    const topicA = topic('tp_123e4567-e89b-12d3-a456-426614174000', '01', 'topic-a');
    const topicB = topic('tp_123e4567-e89b-12d3-a456-426614174001', '02', 'topic-b');
    writePlan(dir, [topicA, topicB]);
    const otherTopic = submitWave1Candidate(dir, {
      queueItemId: 'topic-b-one',
      topicUid: topicB.topic_uid,
      topicSlug: topicB.slug,
      sourceUrl: 'https://example.com/topic-b/paper',
    });
    writeDepthReview(dir, topicA.slug, [otherTopic.paths.work_unit_dir]);

    const resolved = resolveReviewedWave1SubmittedBacking(dir, { topic: topicA.slug, topicRegistryFact: topicRegistryFact(dir) });

    assert.equal(resolved.ok, false);
    assert.equal(resolved.root.code, 'manifest_topic_binding_invalid');
  });

  it('fails closed before candidate selection for an invalid reviewed reference', () => {
    const dir = tempWorkUnitBundle('wave1-convergence-');
    createdBundles.push(dir);
    const topicA = topic('tp_123e4567-e89b-12d3-a456-426614174000', '01', 'topic-a');
    writePlan(dir, [topicA]);
    writeDepthReview(dir, topicA.slug, ['../not-a-work-unit']);

    const resolved = resolveReviewedWave1SubmittedBacking(dir, { topic: topicA.slug, topicRegistryFact: topicRegistryFact(dir) });

    assert.equal(resolved.ok, false);
    assert.equal(resolved.root.code, 'reviewed_work_unit_ref_unsafe');
  });
});

describe('Wave1 reference convergence priority', () => {
  const topicFact = { topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000', topic_slug: 'topic-a' };
  const backing = {
    ok: true,
    candidates: [{ normalized_url: 'https://example.com/a' }, { normalized_url: 'https://example.com/b' }],
  };
  const closedProjections = backing.candidates.map((candidate) => ({
    ...candidate,
    path_class: 'canonical_current',
    candidate_binding: true,
    format_valid: true,
    url_valid: true,
    countable: true,
  }));

  it('requires projection materialization before index synchronization or a floor deficit', () => {
    const result = evaluateWave1ReferenceConvergence({
      topic: topicFact,
      requiredFloor: 8,
      submittedBacking: backing,
      projections: [closedProjections[0]],
      index: { valid: false, stale: true },
    });
    assert.equal(result.outcome, 'materialize_projection');
    assert.deepEqual(result.candidates.map((candidate) => candidate.normalized_url), ['https://example.com/b']);
  });

  it('keeps a concrete unusable submitted-backing root ahead of synthetic guards', () => {
    const result = evaluateWave1ReferenceConvergence({
      topic: null,
      requiredFloor: null,
      submittedBacking: {
        ok: false,
        root: { code: 'reviewed_work_unit_refs_missing', detail: 'Missing current depth review.' },
      },
    });

    assert.equal(result.outcome, 'parent_root');
    assert.deepEqual(result.root, {
      code: 'reviewed_work_unit_refs_missing',
      detail: 'Missing current depth review.',
    });
  });

  it('keeps an unrelated canonical Topic root direct when submitted backing is valid', () => {
    const result = evaluateWave1ReferenceConvergence({
      topic: null,
      requiredFloor: 1,
      submittedBacking: backing,
    });

    assert.equal(result.outcome, 'parent_root');
    assert.equal(result.root.code, 'wave1_reference_topic_invalid');
  });

  it('does not let legacy or misnamed current paths count as closed coverage', () => {
    for (const path_class of ['legacy', 'misnamed_current']) {
      const result = evaluateWave1ReferenceConvergence({
        topic: topicFact,
        requiredFloor: 1,
        submittedBacking: { ok: true, candidates: [backing.candidates[0]] },
        projections: [{
          ...backing.candidates[0],
          path_class,
          candidate_binding: true,
          format_valid: true,
          url_valid: true,
          countable: true,
        }],
      });
      assert.equal(result.outcome, 'materialize_projection');
    }
  });

  it('requires index synchronization before an otherwise true floor deficit', () => {
    const result = evaluateWave1ReferenceConvergence({
      topic: topicFact,
      requiredFloor: 8,
      submittedBacking: backing,
      projections: closedProjections,
      index: { valid: false, stale: true },
    });
    assert.equal(result.outcome, 'sync_reference_index');
  });

  it('reuses existing supplementary demand and computes controlled floor deficits', () => {
    const existing = evaluateWave1ReferenceConvergence({
      topic: topicFact,
      requiredFloor: 8,
      submittedBacking: backing,
      projections: closedProjections,
      liveSupplementaryDemand: { queue_item_id: 'supplement-topic-a' },
    });
    assert.equal(existing.outcome, 'existing_supplementary');
    assert.equal(existing.deficit, 6);

    const cases = [[6, 2], [5, 3], [5, 3], [6, 2]];
    for (const [observed, deficit] of cases) {
      const candidates = Array.from({ length: observed }, (_, index) => ({ normalized_url: `https://example.com/${index}` }));
      const projections = candidates.map((candidate) => ({
        ...candidate,
        path_class: 'canonical_current',
        candidate_binding: true,
        format_valid: true,
        url_valid: true,
        countable: true,
      }));
      const result = evaluateWave1ReferenceConvergence({
        topic: topicFact,
        requiredFloor: 8,
        submittedBacking: { ok: true, candidates },
        projections,
      });
      assert.equal(result.outcome, 'reference_floor_deficit');
      assert.equal(result.observed, observed);
      assert.equal(result.deficit, deficit);
    }
  });
});
