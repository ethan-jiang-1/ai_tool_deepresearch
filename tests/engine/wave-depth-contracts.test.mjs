import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  checkSourceClaimCacheMapping,
  checkWave1DepthReviewContract,
  checkWave2FindingIndexContract,
  deriveWave1NewSourceFloor,
} from '../../DPT_FRAMEWORK/engine/helpers/wave-depth-contracts.mjs';
import {
  claimAndSubmitWorkUnit,
  referenceContent,
} from './work-unit-test-helpers.mjs';

const createdDirs = [];

function tempBundle(prefix = 'wave-depth-') {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  createdDirs.push(dir);
  return dir;
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function setupBundle({ profile = true, topicCount = 2 } = {}) {
  const dir = tempBundle();
  if (profile) {
    writeFileSync(path.join(dir, 'rb_profile.yaml'), `research_style_params:
  wave1_per_topic_ref_floor: 2
  topic_unique_ratio: 0.5
  counterexample_search: false
  cross_verification: false
  p0p1_independent_backing: 2
`);
  }
  const topics = Array.from({ length: topicCount }, (_, idx) => {
    const slug = `topic-${String.fromCharCode(97 + idx)}`;
    return `  - slug: ${slug}\n    title: Topic ${String.fromCharCode(65 + idx)}`;
  }).join('\n');
  writeFileSync(path.join(dir, 'rb_plan.md'), `---
plan_basename: wave-depth-test
derived_topic_count: ${topicCount}
topic_registry:
${topics}
---
# Plan
`);
  return dir;
}

function submitWave1Source(dir, {
  topic = 'topic-a',
  sourceUrl = 'https://example.com/topic-a/new-source',
  cacheTrail = `_cache/wave1/primary/${topic}/new-source`,
  degraded = false,
} = {}) {
  const referencePath = `reference/01-${topic}-new-source.md`;
  const evidencePath = `artifacts/wave1/${topic}/evidence-summary.md`;
  const questionPath = `artifacts/wave1/${topic}/question-list.md`;
  const claim = {
    url: sourceUrl,
    source_ref: referencePath,
    acceptance_status: 'accepted',
    is_new_vs_wave0: true,
    cache_trail_refs: degraded ? [] : [cacheTrail],
    ...(degraded ? { degraded_capture_ref: cacheTrail } : {}),
  };
  const { record, submitted } = claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId: topic,
    outputs: [
      {
        path: referencePath,
        role: 'reference',
        source_url: sourceUrl,
        source_slug: 'new-source',
        content: referenceContent({ source_url: sourceUrl, related_topic: topic }),
      },
      { path: evidencePath, role: 'evidence_summary', content: `[Source](${sourceUrl})\n\n## Key Findings\n1. Mechanism.\n` },
      { path: questionPath, role: 'question_list', content: '## Topic Investigation Targets\n\n## Question Reconciliation\n\n## Emergent Question Protocol\n\n## Exploration / Exploitation Decision\n' },
    ],
    cacheTrails: [{
      path: cacheTrail,
      url: sourceUrl,
      page_content: degraded
        ? '# Cache page for blocked source\n\nDegraded capture: fetch-failure after HTTP 403.\n'
        : undefined,
      meta: degraded ? { capture_status: 'degraded', failure_reason: 'HTTP 403' } : {},
    }],
    resultOverrides: {
      source_claims: [claim],
      accepted_source_urls: [sourceUrl],
    },
  });
  assert.equal(submitted.ok, true, JSON.stringify(submitted));
  return { record, claim, sourceUrl, referencePath, cacheTrail };
}

function writeDepthReview(dir, {
  topic = 'topic-a',
  record,
  claim,
  sourceUrl = claim?.url,
  wave0Urls = ['https://example.com/topic-a/wave0-foundation'],
  decision = 'accept',
  supplementary = [],
  omitKey = null,
} = {}) {
  const review = {
    version: 'depth-review.v1',
    topic_slug: topic,
    reviewed_work_unit_refs: [record.paths.work_unit_dir],
    wave0_source_urls: wave0Urls,
    source_claims: claim ? [claim] : [],
    new_source_urls: sourceUrl ? [sourceUrl] : [],
    new_source_floor: {
      required: 1,
      observed: sourceUrl && claim ? 1 : 0,
      source: 'ceil(wave1_per_topic_ref_floor * topic_unique_ratio)',
    },
    depth_dimensions: {
      mechanism: { status: 'covered', refs: [record.paths.result_ref] },
      trend_or_difficulty: { status: 'covered', refs: [record.paths.result_ref] },
      limitation_or_dispute: { status: 'covered', refs: [record.paths.result_ref] },
    },
    profile_checks: {
      counterexample_search: { status: 'not_required', refs: [] },
      cross_verification: { status: 'not_required', refs: [] },
    },
    decision,
    supplementary_queue_item_ids: supplementary,
  };
  if (omitKey) delete review[omitKey];
  writeJson(path.join(dir, 'artifacts', 'wave1', topic, 'depth-review.yaml'), review);
  return review;
}

function writeWave2Index(dir, data) {
  writeJson(path.join(dir, 'artifacts', 'wave2', 'finding-index.yaml'), data);
}

function validFinding(overrides = {}) {
  return {
    id: 'W2F-001',
    type: 'cross_topic_resolution',
    priority: 'p1',
    status: 'resolved',
    decision: 'use_existing_evidence',
    affected_topics: ['topic-a', 'topic-b'],
    origin_refs: ['artifacts/wave1/topic-a/question-list.md'],
    trigger_refs: ['artifacts/wave1/topic-b/evidence-summary.md'],
    search_required: false,
    subagent_receipt_refs: [],
    appears_in_synthesis: true,
    hitl2_handoff: false,
    confidence: 'high',
    independent_backing_refs: ['artifacts/wave1/topic-a/evidence-summary.md', 'artifacts/wave1/topic-b/evidence-summary.md'],
    gap_status: 'no_gap',
    ...overrides,
  };
}

function validWave2Index(overrides = {}) {
  return {
    version: 'finding-index.v1',
    source_layer: 'wave2_cross_topic',
    ledger: 'artifacts/wave2/cross-topic-ledger.md',
    synthesis: 'artifacts/wave2/synthesis.md',
    scan: {
      topic_count: 2,
      pair_count_expected: 1,
      pair_count_checked: 1,
    },
    findings: [validFinding()],
    synthesis_eligibility: {
      pure_synthesis_eligible: true,
      scan_matrix_present: true,
      scan_topic_pair_coverage: [{ pair: ['topic-a', 'topic-b'], refs: ['artifacts/wave2/cross-topic-ledger.md'] }],
      unresolved_search_required_count: 0,
      targeted_search_required_count: 0,
      targeted_search_submitted_count: 0,
      explicit_deferral_count: 0,
      profile_params_read: ['p0p1_independent_backing'],
      ineligibility_reasons: [],
    },
    ...overrides,
  };
}

describe('wave depth contract helpers', () => {
  after(() => {
    for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
  });

  it('derives the Wave1 new-source floor from explicit profile parameters', () => {
    assert.deepEqual(
      deriveWave1NewSourceFloor({ research_style_params: { wave1_per_topic_ref_floor: 3, topic_unique_ratio: 0.34 } }),
      { ok: true, required: 2, source: 'ceil(wave1_per_topic_ref_floor * topic_unique_ratio)' },
    );
    const missing = deriveWave1NewSourceFloor({ research_style_params: { wave1_per_topic_ref_floor: 3 } });
    assert.equal(missing.ok, false);
    assert.equal(missing.code, 'missing_profile_parameter');
    assert.match(missing.inspect.join('\n'), /topic_unique_ratio/);
  });

  it('passes a valid Wave1 depth review with exact-URL novelty and submitted cache mapping', () => {
    const dir = setupBundle();
    const submitted = submitWave1Source(dir, { sourceUrl: 'https://example.com/topic-a/deep/path' });
    writeDepthReview(dir, {
      record: submitted.record,
      claim: submitted.claim,
      sourceUrl: submitted.sourceUrl,
      wave0Urls: ['https://example.com/topic-a/wave0-foundation'],
    });

    const result = checkWave1DepthReviewContract(dir, { topic: 'topic-a' });
    assert.equal(result.passed, true, result.inspect.join('\n'));
  });

  it('fails missing required keys, non-closed decisions, and missing profile parameters', () => {
    const dir = setupBundle({ profile: false });
    const submitted = submitWave1Source(dir);
    writeDepthReview(dir, {
      record: submitted.record,
      claim: submitted.claim,
      decision: 'maybe',
      omitKey: 'new_source_floor',
    });

    const result = checkWave1DepthReviewContract(dir, { topic: 'topic-a' });
    assert.equal(result.passed, false);
    assert.match(result.inspect.join('\n'), /missing required key: new_source_floor/);
    assert.match(result.inspect.join('\n'), /decision must be one of/);
    assert.match(result.inspect.join('\n'), /missing_profile_parameter/);
  });

  it('uses exact URL equality for novelty and does not revive retired heuristics', () => {
    const dir = setupBundle();
    const submitted = submitWave1Source(dir, { sourceUrl: 'https://example.com/topic-a/same' });
    writeDepthReview(dir, {
      record: submitted.record,
      claim: submitted.claim,
      sourceUrl: submitted.sourceUrl,
      wave0Urls: ['https://example.com/topic-a/same'],
    });

    const result = checkWave1DepthReviewContract(dir, { topic: 'topic-a' });
    assert.equal(result.passed, false);
    assert.match(result.inspect.join('\n'), /marks Wave0 URL as new/);

    const helperSource = readFileSync('DPT_FRAMEWORK/engine/helpers/wave-depth-contracts.mjs', 'utf-8');
    assert.doesNotMatch(helperSource, /jaccard|homepage|path[-_ ]depth|self[-_ ]reference|content_dedup/i);
  });

  it('rejects prose-only or review-only source URLs as Wave1 coverage authority', () => {
    const dir = setupBundle();
    const submitted = submitWave1Source(dir);
    writeDepthReview(dir, {
      record: submitted.record,
      claim: null,
      sourceUrl: submitted.sourceUrl,
    });

    const result = checkWave1DepthReviewContract(dir, { topic: 'topic-a' });
    assert.equal(result.passed, false);
    assert.match(result.inspect.join('\n'), /not backed by accepted exact-new source_claims/);
  });

  it('checks accepted source-claim cache mapping and reports incomplete cache leaves', () => {
    const dir = setupBundle();
    const submitted = submitWave1Source(dir);
    assert.equal(checkSourceClaimCacheMapping(dir, [submitted.claim], { topic: 'topic-a' }).passed, true);

    writeFileSync(path.join(dir, submitted.cacheTrail, 'page.md'), '# Page\n');
    const result = checkSourceClaimCacheMapping(dir, [submitted.claim], { topic: 'topic-a' });
    assert.equal(result.passed, false);
    assert.match(result.inspect.join('\n'), /placeholder-only/);
    assert.match(result.inspect.join('\n'), /work_id: wu-w1/);
  });

  it('fails missing cache trail refs and accepts explicit degraded captures', () => {
    const missingDir = setupBundle();
    const submitted = submitWave1Source(missingDir);
    const missing = checkSourceClaimCacheMapping(missingDir, [{
      ...submitted.claim,
      cache_trail_refs: ['_cache/wave1/missing'],
    }], { topic: 'topic-a' });
    assert.equal(missing.passed, false);
    assert.match(missing.inspect.join('\n'), /not in a submitted ledger row/);

    const degradedDir = setupBundle();
    const degraded = submitWave1Source(degradedDir, {
      sourceUrl: 'https://example.com/topic-a/blocked',
      cacheTrail: '_cache/wave1/primary/topic-a/blocked',
      degraded: true,
    });
    const accepted = checkSourceClaimCacheMapping(degradedDir, [degraded.claim], { topic: 'topic-a' });
    assert.equal(accepted.passed, true, accepted.inspect.join('\n'));
  });

  it('passes Wave2 pure synthesis eligibility when scan, confidence, and gap projections converge', () => {
    const dir = setupBundle({ topicCount: 2 });
    writeWave2Index(dir, validWave2Index());

    const result = checkWave2FindingIndexContract(dir);
    assert.equal(result.passed, true, result.inspect.join('\n'));
  });

  it('fails Wave2 skipped scan and unresolved search-required findings', () => {
    const dir = setupBundle({ topicCount: 2 });
    writeWave2Index(dir, validWave2Index({
      scan: { topic_count: 2, pair_count_expected: 1, pair_count_checked: 0 },
      findings: [validFinding({
        decision: 'explore_search',
        search_required: true,
        confidence: 'uncertain',
        independent_backing_refs: [],
        gap_status: 'needs_search',
      })],
      synthesis_eligibility: {
        pure_synthesis_eligible: true,
        scan_matrix_present: false,
        scan_topic_pair_coverage: [],
        unresolved_search_required_count: 0,
        targeted_search_required_count: 1,
        targeted_search_submitted_count: 0,
        explicit_deferral_count: 0,
        profile_params_read: ['p0p1_independent_backing'],
        ineligibility_reasons: [],
      },
    }));

    const result = checkWave2FindingIndexContract(dir);
    assert.equal(result.passed, false);
    assert.match(result.inspect.join('\n'), /scan_matrix_present/);
    assert.match(result.inspect.join('\n'), /gap_status=needs_search/);
    assert.match(result.inspect.join('\n'), /lacks submitted receipt refs/);
  });

  it('passes Wave2 targeted evidence receipt refs when backed by submitted work-unit rows', () => {
    const dir = setupBundle({ topicCount: 2 });
    const { record, submitted } = claimAndSubmitWorkUnit(dir, {
      phase: 'wave2',
      queueItemId: 'targeted-w2f-001',
      outputs: [{
        path: 'reference/00-cross-w2f-001.md',
        role: 'reference',
        source_url: 'https://example.com/wave2/targeted',
        source_slug: 'targeted',
        content: referenceContent({ source_url: 'https://example.com/wave2/targeted' }),
      }],
      cacheTrails: [{
        path: '_cache/wave2/primary/targeted-w2f-001/source',
        url: 'https://example.com/wave2/targeted',
      }],
    });
    assert.equal(submitted.ok, true, JSON.stringify(submitted));
    writeWave2Index(dir, validWave2Index({
      findings: [validFinding({
        type: 'cross_topic_emergent_question',
        decision: 'explore_search',
        search_required: true,
        confidence: 'medium',
        subagent_receipt_refs: [record.paths.runtime_receipt_ref],
        gap_status: 'search_submitted',
      })],
      synthesis_eligibility: {
        pure_synthesis_eligible: true,
        scan_matrix_present: true,
        scan_topic_pair_coverage: [{ pair: ['topic-a', 'topic-b'], refs: ['artifacts/wave2/cross-topic-ledger.md'] }],
        unresolved_search_required_count: 0,
        targeted_search_required_count: 1,
        targeted_search_submitted_count: 1,
        explicit_deferral_count: 0,
        profile_params_read: ['p0p1_independent_backing'],
        ineligibility_reasons: [],
      },
    }));

    const result = checkWave2FindingIndexContract(dir);
    assert.equal(result.passed, true, result.inspect.join('\n'));
  });

  it('passes legal Wave2 pure synthesis with zero delegated targeted rows', () => {
    const dir = setupBundle({ topicCount: 1 });
    writeWave2Index(dir, validWave2Index({
      scan: { topic_count: 1, pair_count_expected: 0, pair_count_checked: 0 },
      findings: [],
      synthesis_eligibility: {
        pure_synthesis_eligible: true,
        scan_matrix_present: true,
        scan_topic_pair_coverage: [],
        unresolved_search_required_count: 0,
        targeted_search_required_count: 0,
        targeted_search_submitted_count: 0,
        explicit_deferral_count: 0,
        profile_params_read: ['p0p1_independent_backing'],
        ineligibility_reasons: [],
      },
    }));

    const result = checkWave2FindingIndexContract(dir);
    assert.equal(result.passed, true, result.inspect.join('\n'));
  });
});
