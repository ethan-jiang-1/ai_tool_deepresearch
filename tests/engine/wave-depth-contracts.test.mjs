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
  evaluateWave2PairFacts,
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
  decision = 'accept',
  supplementary = [],
  reviewedRefs = null,
  omitKey = null,
  legacyProjection = null,
} = {}) {
  const review = {
    version: 'depth-review.v1',
    topic_slug: topic,
    reviewed_work_unit_refs: reviewedRefs || [record.paths.work_unit_dir],
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
    ...(legacyProjection || {}),
  };
  if (omitKey) delete review[omitKey];
  writeJson(path.join(dir, 'artifacts', 'wave1', topic, 'depth-review.yaml'), review);
  return review;
}

function writeWave0Sources(dir, topic, urls) {
  const filePath = path.join(dir, 'artifacts', 'wave0', topic, 'source.yaml');
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, urls.map((url) => ({
    url,
    title: 'Wave0 source',
    retrieved_date: '2026-07-14',
    topic_tag: topic,
  })).map((entry) => `- url: ${entry.url}\n  title: ${entry.title}\n  retrieved_date: ${entry.retrieved_date}\n  topic_tag: ${entry.topic_tag}`).join('\n'));
}

function writeWave2Index(dir, data) {
  writeJson(path.join(dir, 'artifacts', 'wave2', 'finding-index.yaml'), data);
}

function writeWave2CrossReference(dir, {
  id = 'W2F-001',
  sourceUrl = 'https://example.com/topic-a/new-source',
  slug = 'resolved-finding',
} = {}) {
  const refPath = path.join(dir, 'reference', `00-cross-${id.toLowerCase()}-${slug}.md`);
  mkdirSync(path.dirname(refPath), { recursive: true });
  writeFileSync(refPath, referenceContent({
    source_url: sourceUrl,
    related_topic: 'cross-topic',
    evidence_role: 'cross_topic_projection',
    coreContent: `${id} cites artifacts/wave2/finding-index.yaml, artifacts/wave2/cross-topic-ledger.md, artifacts/wave1/topic-a/evidence-summary.md, and artifacts/wave1/topic-b/evidence-summary.md as concrete prior backing.`,
  }));
  return refPath;
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

function pairFactPlan({ legacy = false } = {}) {
  const topics = [
    { topic_uid: legacy ? undefined : 'tp_123e4567-e89b-12d3-a456-426614174000', id: '01', slug: 'topic-a', previous_layouts: [{ id: '01', slug: 'old-topic-a' }] },
    { topic_uid: legacy ? undefined : 'tp_123e4567-e89b-12d3-a456-426614174001', id: '02', slug: 'topic-b', previous_layouts: [{ id: '02', slug: 'old-topic-b' }] },
    { topic_uid: legacy ? undefined : 'tp_123e4567-e89b-12d3-a456-426614174002', id: '03', slug: 'topic-c', previous_layouts: [] },
  ];
  return { topic_registry: topics };
}

function pairFactIndex(coverage, scan = {}) {
  return {
    scan: { topic_count: 3, pair_count_expected: 3, pair_count_checked: 1, ...scan },
    synthesis_eligibility: { scan_topic_pair_coverage: coverage },
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

  it('normalizes direct-array and pairs-wrapper coverage through UID/current/previous slugs', () => {
    const plan = pairFactPlan();
    const uidA = plan.topic_registry[0].topic_uid;
    const uidB = plan.topic_registry[1].topic_uid;
    const direct = evaluateWave2PairFacts(plan, pairFactIndex([
      { pair: [uidA, 'old-topic-b'], refs: [] },
    ]));
    const wrapped = evaluateWave2PairFacts(plan, pairFactIndex({
      pairs: [{ pair: ['topic-b', 'old-topic-a'], refs: [] }],
    }));
    assert.equal(direct.usable, true, JSON.stringify(direct));
    assert.equal(wrapped.usable, true, JSON.stringify(wrapped));
    assert.deepEqual(direct.observed_pair_keys, wrapped.observed_pair_keys);
    assert.deepEqual(direct.observed_pairs, [['topic-a', 'topic-b']]);
  });

  it('normalizes supported legacy current/previous slugs without persistent UID state', () => {
    const result = evaluateWave2PairFacts(pairFactPlan({ legacy: true }), pairFactIndex([
      { pair: ['old-topic-a', 'topic-b'] },
    ]));
    assert.equal(result.usable, true, JSON.stringify(result));
    assert.deepEqual(result.observed_pairs, [['topic-a', 'topic-b']]);
    assert.match(result.observed_pair_keys[0], /legacy:01:topic-a/);
  });

  it('rejects unsupported pair containers and malformed identity entries before count implications', () => {
    const plan = pairFactPlan();
    const cases = [
      { label: 'object map', coverage: { 'topic-a--topic-b': { refs: [] } }, code: 'pair_container_invalid' },
      { label: 'single entry object', coverage: { pair: ['topic-a', 'topic-b'] }, code: 'pair_container_invalid' },
      { label: 'malformed pair', coverage: [{ pair: ['topic-a'] }], code: 'pair_entry_invalid' },
      { label: 'self pair', coverage: [{ pair: ['topic-a', 'old-topic-a'] }], code: 'pair_self_invalid' },
      { label: 'unknown topic', coverage: [{ pair: ['topic-a', 'missing-topic'] }], code: 'pair_topic_unknown' },
      { label: 'duplicate unordered pair', coverage: [{ pair: ['topic-a', 'topic-b'] }, { pair: ['old-topic-b', 'old-topic-a'] }], code: 'pair_duplicate_invalid' },
    ];
    for (const testCase of cases) {
      const result = evaluateWave2PairFacts(plan, pairFactIndex(testCase.coverage, { pair_count_checked: 99 }));
      assert.equal(result.usable, false, testCase.label);
      assert.ok(result.issues.some((issue) => issue.code === testCase.code), `${testCase.label}: ${JSON.stringify(result)}`);
      assert.equal(result.issues.some((issue) => issue.code === 'pair_count_checked_mismatch'), false, testCase.label);
    }
  });

  it('keeps scan presence distinct from full-pair policy while enforcing canonical counts', () => {
    const plan = pairFactPlan();
    const partial = evaluateWave2PairFacts(plan, pairFactIndex([
      { pair: ['topic-a', 'topic-b'] },
    ]));
    assert.equal(partial.usable, true, JSON.stringify(partial));
    assert.equal(partial.complete, false);
    assert.equal(partial.observed_count, 1);
    assert.equal(partial.expected_count, 3);

    const empty = evaluateWave2PairFacts(plan, pairFactIndex([], { pair_count_checked: 0 }));
    assert.equal(empty.usable, false);
    assert.ok(empty.issues.some((issue) => issue.code === 'pair_scan_empty'));

    for (const scan of [
      { topic_count: 2 },
      { pair_count_expected: 2 },
      { pair_count_checked: 2 },
      { pair_count_checked: -1 },
    ]) {
      const drift = evaluateWave2PairFacts(plan, pairFactIndex([{ pair: ['topic-a', 'topic-b'] }], scan));
      assert.equal(drift.usable, false, JSON.stringify(scan));
    }
  });

  it('passes a minimal Wave1 depth review by deriving source/cache/novelty/floor from reviewed rows', () => {
    const dir = setupBundle();
    const submitted = submitWave1Source(dir, { sourceUrl: 'https://example.com/topic-a/deep/path' });
    writeDepthReview(dir, {
      record: submitted.record,
    });

    const result = checkWave1DepthReviewContract(dir, { topic: 'topic-a' });
    assert.equal(result.passed, true, result.inspect.join('\n'));
  });

  it('canonicalizes harmless trailing slash reviewed work-unit refs before submitted-row comparison', () => {
    const dir = setupBundle();
    const submitted = submitWave1Source(dir, { sourceUrl: 'https://example.com/topic-a/trailing-slash' });
    writeDepthReview(dir, {
      record: submitted.record,
      reviewedRefs: [`${submitted.record.paths.work_unit_dir}/`],
    });

    const result = checkWave1DepthReviewContract(dir, { topic: 'topic-a' });
    assert.equal(result.passed, true, result.inspect.join('\n'));
    assert.match((result.diagnostics || []).join('\n'), /canonicalized.*reviewed_work_unit_refs/i);
    assert.match((result.diagnostics || []).join('\n'), new RegExp(`${submitted.record.paths.work_unit_dir}/`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  it('keeps unsafe and unsubmitted reviewed work-unit refs fail-closed', () => {
    const unsafeDir = setupBundle();
    const unsafeSubmitted = submitWave1Source(unsafeDir, { sourceUrl: 'https://example.com/topic-a/unsafe' });
    writeDepthReview(unsafeDir, {
      record: unsafeSubmitted.record,
      reviewedRefs: ['/tmp/not-a-bundle-ref'],
    });
    const unsafe = checkWave1DepthReviewContract(unsafeDir, { topic: 'topic-a' });
    assert.equal(unsafe.passed, false);
    assert.match(unsafe.inspect.join('\n'), /reviewed work-unit ref is unsafe/);

    const missingDir = setupBundle();
    const missingSubmitted = submitWave1Source(missingDir, { sourceUrl: 'https://example.com/topic-a/missing' });
    writeDepthReview(missingDir, {
      record: missingSubmitted.record,
      reviewedRefs: ['_work_units/wave1/not-submitted/'],
    });
    const missing = checkWave1DepthReviewContract(missingDir, { topic: 'topic-a' });
    assert.equal(missing.passed, false);
    assert.match(missing.inspect.join('\n'), /not submitted.*canonical: _work_units\/wave1\/not-submitted/);
    assert.match((missing.diagnostics || []).join('\n'), /canonicalized/);
    assert.doesNotMatch(missing.inspect.join('\n'), /source_claim_cache_mapping|source_novelty_floor|observed .*required/);
    assert.equal(missing.findings.filter((finding) => /reviewed_work_unit_refs/.test(finding.id)).length, 1);
  });

  it('fails missing required keys, non-closed decisions, and missing profile parameters', () => {
    const dir = setupBundle({ profile: false });
    const submitted = submitWave1Source(dir);
    writeDepthReview(dir, {
      record: submitted.record,
      decision: 'maybe',
      omitKey: 'depth_dimensions',
    });

    const result = checkWave1DepthReviewContract(dir, { topic: 'topic-a' });
    assert.equal(result.passed, false);
    assert.match(result.inspect.join('\n'), /missing required key: depth_dimensions/);
    assert.match(result.inspect.join('\n'), /decision must be one of/);
    assert.match(result.inspect.join('\n'), /missing_profile_parameter/);
  });

  it('ignores drift in legacy copied source/cache/floor projections', () => {
    const dir = setupBundle();
    const submitted = submitWave1Source(dir);
    writeDepthReview(dir, {
      record: submitted.record,
      legacyProjection: {
        wave0_source_urls: [submitted.sourceUrl],
        source_claims: [],
        new_source_urls: ['https://wrong.example/drift'],
        new_source_floor: { required: 99, observed: 99, source: 'manual' },
      },
    });

    const result = checkWave1DepthReviewContract(dir, { topic: 'topic-a' });
    assert.equal(result.passed, true, result.inspect.join('\n'));
    assert.match((result.diagnostics || []).join('\n'), /projection drift|ignored/i);
  });

  it('derives exact URL novelty from Wave0 authority and ignores copied novelty flags', () => {
    const dir = setupBundle();
    const submitted = submitWave1Source(dir, { sourceUrl: 'https://example.com/topic-a/same' });
    writeWave0Sources(dir, 'topic-a', [submitted.sourceUrl]);
    writeDepthReview(dir, {
      record: submitted.record,
    });

    const result = checkWave1DepthReviewContract(dir, { topic: 'topic-a' });
    assert.equal(result.passed, false);
    assert.match(result.inspect.join('\n'), /observed 0 new accepted source URL\(s\), required 1/);
    assert.doesNotMatch(result.inspect.join('\n'), /marks Wave0 URL as new/);

    const helperSource = readFileSync('DPT_FRAMEWORK/engine/helpers/wave-depth-contracts.mjs', 'utf-8');
    assert.doesNotMatch(helperSource, /jaccard|homepage|path[-_ ]depth|self[-_ ]reference|content_dedup/i);
  });

  it('does not let review-only claims or filesystem-only cache expand submitted coverage', () => {
    const dir = setupBundle();
    const submitted = submitWave1Source(dir, { sourceUrl: 'https://example.com/topic-a/submitted' });
    const manualTrail = '_cache/wave1/primary/topic-a/manual-only';
    mkdirSync(path.join(dir, manualTrail), { recursive: true });
    writeFileSync(path.join(dir, manualTrail, 'websearch.json'), '[]\n');
    writeFileSync(path.join(dir, manualTrail, 'page.md'), '# Manual cache\n\nFilesystem-only content.\n');
    writeJson(path.join(dir, manualTrail, 'meta.json'), { url: 'https://example.com/topic-a/manual-only' });
    writeFileSync(path.join(dir, 'rb_profile.yaml'), `research_style_params:
  wave1_per_topic_ref_floor: 4
  topic_unique_ratio: 0.5
  counterexample_search: false
  cross_verification: false
  p0p1_independent_backing: 2
`);
    writeDepthReview(dir, {
      record: submitted.record,
      legacyProjection: {
        source_claims: [{
          url: 'https://example.com/topic-a/manual-only',
          source_ref: 'artifacts/wave1/topic-a/evidence-summary.md',
          acceptance_status: 'accepted',
          is_new_vs_wave0: true,
          cache_trail_refs: [manualTrail],
        }],
        new_source_urls: [submitted.sourceUrl, 'https://example.com/topic-a/manual-only'],
        new_source_floor: { required: 2, observed: 2, source: 'manual' },
      },
    });

    const result = checkWave1DepthReviewContract(dir, { topic: 'topic-a' });
    assert.equal(result.passed, false);
    assert.match(result.inspect.join('\n'), /observed 1 new accepted source URL\(s\), required 2/);
    assert.doesNotMatch(result.inspect.join('\n'), /manual-only.*accepted|manual-only.*mapped/);
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
    writeWave2CrossReference(dir);
    writeWave2Index(dir, validWave2Index());

    const result = checkWave2FindingIndexContract(dir);
    assert.equal(result.passed, true, result.inspect.join('\n'));
  });

  it('reports one missing hitl2_handoff root without derivative handoff symptoms', () => {
    const dir = setupBundle({ topicCount: 2 });
    const finding = validFinding({
      decision: 'defer_hitl2',
      appears_in_synthesis: false,
      gap_status: 'deferred_hitl2',
    });
    delete finding.hitl2_handoff;
    writeWave2Index(dir, validWave2Index({
      findings: [finding],
      synthesis_eligibility: {
        pure_synthesis_eligible: true,
        scan_matrix_present: true,
        scan_topic_pair_coverage: [{ pair: ['topic-a', 'topic-b'], refs: ['artifacts/wave2/cross-topic-ledger.md'] }],
        unresolved_search_required_count: 0,
        targeted_search_required_count: 0,
        targeted_search_submitted_count: 0,
        explicit_deferral_count: 1,
        profile_params_read: ['p0p1_independent_backing'],
        ineligibility_reasons: [],
      },
    }));

    const result = checkWave2FindingIndexContract(dir);
    const text = result.inspect.join('\n');
    assert.equal(result.passed, false);
    assert.equal(result.inspect.filter((line) => line.includes('missing field: hitl2_handoff')).length, 1);
    assert.doesNotMatch(text, /implies hitl2_handoff|must be hitl2_handoff/);
    assert.ok(result.masked_rule_ids.some((id) => id.includes('hitl2_handoff')));
  });

  it('requires consumer-facing backed W2F findings to materialize 00-cross references or record omission reasons', () => {
    const missingDir = setupBundle({ topicCount: 2 });
    writeWave2Index(missingDir, validWave2Index());
    const missing = checkWave2FindingIndexContract(missingDir);
    assert.equal(missing.passed, false);
    assert.match(missing.inspect.join('\n'), /cross_reference_materialization/);
    assert.match(missing.inspect.join('\n'), /reference\/00-cross-\*\.md/);

    const omittedDir = setupBundle({ topicCount: 2 });
    writeWave2Index(omittedDir, validWave2Index({
      findings: [validFinding({
        consumer_reference_omission_reason: 'limitation: not source-backed enough for a consumer reference projection',
      })],
    }));
    const omitted = checkWave2FindingIndexContract(omittedDir);
    assert.equal(omitted.passed, true, omitted.inspect.join('\n'));
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
