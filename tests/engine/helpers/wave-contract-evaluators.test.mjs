import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { evaluateWave1Contract } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-evaluators.mjs';
import {
  canonicalWave1ReferencePath,
  evaluateWave1ReferenceConvergence,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs';
import { buildCanonicalTopicRegistryFact } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/topic-registry-fact.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  referenceContent,
  tempWorkUnitBundle,
} from '../work-unit-test-helpers.mjs';

const bundles = [];

const TOPIC = {
  topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
  id: '01',
  slug: 'topic-a',
  title: 'Topic A',
  must_answer: ['What matters for Topic A?'],
  scope_role: 'primary',
  depends_on_topic_uids: [],
  previous_layouts: [],
};

const WAVE1_REFERENCE_RULES = {
  rules: [
    {
      id: 'per_topic_ref_md_count_floor',
      check: 'count_floor',
      target: 'reference/*{topic}*.md',
      threshold: 1,
      finding: { source: 'definition', blocking_basis: 'required_floor' },
      repair: { kind: 'agent_action', write_to: 'reference/' },
    },
    {
      id: 'ledger_coverage',
      check: 'reference_ledger_coverage',
      target: 'reference/*{topic}*.md',
      finding: { source: 'checker' },
    },
  ],
};

const WAVE1_MISSING_REVIEW_RULES = {
  rules: [
    {
      id: 'per_topic_depth_review_contract',
      check: 'depth_review_contract',
      target: 'artifacts/wave1/{topic}/depth-review.yaml',
      finding: { source: 'checker' },
    },
    WAVE1_REFERENCE_RULES.rules[0],
  ],
};

function bundle() {
  const dir = tempWorkUnitBundle('wave-contract-evaluators-');
  bundles.push(dir);
  writeFileSync(join(dir, 'rb_plan.md'), `---\n${JSON.stringify({
    plan_basename: 'wave-contract-evaluators-test',
    derived_topic_count: 1,
    topic_registry_version: '2',
    topic_registry: [TOPIC],
  }, null, 2)}\n---\n# Plan\n`);
  mkdirSync(join(dir, 'reference'), { recursive: true });
  return dir;
}

function submitReviewedCandidate(dir) {
  const sourceUrl = 'https://fixture.news-research.com/research/current-source';
  const sourceRef = 'reference/submitted-source.md';
  const cacheTrail = '_cache/wave1/primary/topic-a/source';
  const submitted = claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId: 'topic-a-primary',
    queueItemOverrides: {
      payload: { topic_uid: TOPIC.topic_uid, topic_slug: TOPIC.slug, wave: 1, assignment_mode: 'primary' },
    },
    outputs: [{
      path: sourceRef,
      role: 'reference',
      source_url: sourceUrl,
      source_slug: 'submitted-source',
      content: referenceContent({ source_url: sourceUrl, related_topic_uid: TOPIC.topic_uid }),
    }],
    cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
    resultOverrides: {
      source_claims: [{
        url: sourceUrl,
        source_ref: sourceRef,
        acceptance_status: 'accepted',
        is_new_vs_wave0: true,
        cache_trail_refs: [cacheTrail],
      }],
      accepted_source_urls: [sourceUrl],
    },
  });
  assert.equal(submitted.submitted.ok, true, JSON.stringify(submitted.submitted));
  mkdirSync(join(dir, 'artifacts', 'wave1', TOPIC.slug), { recursive: true });
  writeFileSync(join(dir, 'artifacts', 'wave1', TOPIC.slug, 'depth-review.yaml'), `${JSON.stringify({
    version: 'depth-review.v1',
    topic_slug: TOPIC.slug,
    reviewed_work_unit_refs: [submitted.record.paths.work_unit_dir],
  }, null, 2)}\n`);
  return { sourceUrl, record: submitted.record };
}

function materializationFinding(dir) {
  const evaluation = evaluateWave1Contract(dir, WAVE1_REFERENCE_RULES, {
    topicRegistryFact: buildCanonicalTopicRegistryFact(dir),
  });
  return {
    evaluation,
    finding: evaluation.findings.find((entry) => (
      entry.rule_id === 'per_topic_ref_md_count_floor'
      && entry.id.endsWith(':materialize_projection')
    )),
  };
}

after(() => bundles.splice(0).forEach(cleanupWorkUnitBundle));

describe('Wave1 convergence feedback projection', () => {
  it('keeps missing depth review as the one direct root before reference-floor evaluation', () => {
    const dir = bundle();
    const evaluation = evaluateWave1Contract(dir, WAVE1_MISSING_REVIEW_RULES, {
      topicRegistryFact: buildCanonicalTopicRegistryFact(dir),
    });

    const direct = evaluation.findings.filter((entry) => (
      entry.id === 'per_topic_depth_review_contract:topic-a:missing'
    ));
    assert.equal(direct.length, 1, JSON.stringify(evaluation.findings, null, 2));
    assert.match(direct[0].id, /:missing$/);
    assert.equal(evaluation.findings.some((entry) => entry.rule_id === 'per_topic_ref_md_count_floor'), false);
    assert.equal(evaluation.masked_rule_ids.includes('per_topic_ref_md_count_floor:topic-a'), true);
  });

  it('projects stable canonical targets and submitted backing coordinates for materialization', () => {
    const dir = bundle();
    const { sourceUrl, record } = submitReviewedCandidate(dir);
    const expected = canonicalWave1ReferencePath({ topicSlug: TOPIC.slug, sourceUrl });
    const { evaluation, finding } = materializationFinding(dir);

    assert.ok(expected.ok);
    assert.ok(finding, JSON.stringify(evaluation.findings, null, 2));
    assert.equal(finding.masked_by_rule_id, null);
    assert.match(finding.write_to, new RegExp(expected.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(finding.write_to, /source_url=https:\/\/fixture.news-research.com\/research\/current-source/);
    assert.match(finding.write_to, new RegExp(record.work_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(finding.write_to, /work_unit_refs=\[/);
    assert.match(finding.write_to, /source_refs=\[reference\/submitted-source\.md\]/);
    assert.match(finding.write_to, /cache_trail_refs=\[_cache\/wave1\/primary\/topic-a\/source\]/);
    assert.equal(evaluation.findings.some((entry) => entry.id.includes('sync_reference_index')), false);
    assert.equal(evaluation.findings.some((entry) => entry.id.includes('reference_floor_deficit')), false);
  });

  it('keeps a separately evaluated legacy ledger root primary during materialization', () => {
    const dir = bundle();
    const { sourceUrl } = submitReviewedCandidate(dir);
    writeFileSync(join(dir, 'reference', 'topic-a-legacy.md'), referenceContent({
      source_url: sourceUrl,
      related_topic_uid: TOPIC.topic_uid,
      coreContent: 'This legacy projection intentionally lacks submitted backing references.',
    }));

    const { evaluation, finding } = materializationFinding(dir);
    const ledger = evaluation.findings.find((entry) => entry.rule_id === 'ledger_coverage');

    assert.ok(finding, JSON.stringify(evaluation.findings, null, 2));
    assert.ok(ledger, JSON.stringify(evaluation.findings, null, 2));
    assert.equal(finding.masked_by_rule_id, null);
    assert.equal(ledger.masked_by_rule_id, null);
  });

  it('keeps missing backing and a post-closeout floor deficit on their existing non-materialization routes', () => {
    const topic = { topic_uid: TOPIC.topic_uid, topic_slug: TOPIC.slug };
    const missingBacking = evaluateWave1ReferenceConvergence({
      topic,
      requiredFloor: 1,
      submittedBacking: { ok: false, root: { code: 'submitted_backing_invalid', detail: 'Submitted backing is invalid.' } },
    });
    const postCloseoutFloor = evaluateWave1ReferenceConvergence({
      topic,
      requiredFloor: 2,
      submittedBacking: { ok: true, candidates: [{ normalized_url: 'https://fixture.news-research.com/research/current-source' }] },
      projections: [{
        normalized_url: 'https://fixture.news-research.com/research/current-source',
        path_class: 'canonical_current',
        candidate_binding: true,
        format_valid: true,
        url_valid: true,
        countable: true,
      }],
    });

    assert.equal(missingBacking.outcome, 'parent_root');
    assert.equal(missingBacking.root.code, 'submitted_backing_invalid');
    assert.equal(postCloseoutFloor.outcome, 'reference_floor_deficit');
  });
});
