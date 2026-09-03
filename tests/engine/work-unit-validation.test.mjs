// tests/engine/work-unit-validation.test.mjs — @impl WAI-013
// Unit tests for the validateSourceClaims empty-claims claim floor:
// kinds whose output contract accepts source claims (wave1_topic_deepening)
// must carry at least one claim or an explicit degraded capture; kinds without
// a source_claims contract (wave0/wave2) keep the empty pass-through.
// Also covers DEW-031 duplicate accepted-claim-url enrichment inside an
// already-invalid source-claims result.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSourceClaims } from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-validation.mjs';
import { DEFAULT_KIND_CONTRACTS } from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-constants.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const TMP = path.join(__dirname, '../../tests/_tmp_work_unit_validation');

const WAVE1_CONTRACT = DEFAULT_KIND_CONTRACTS.wave1_topic_deepening.output_contract;
const WAVE0_CONTRACT = DEFAULT_KIND_CONTRACTS.wave0_source_intake.output_contract;
const WAVE2_CONTRACT = DEFAULT_KIND_CONTRACTS.wave2_targeted_evidence.output_contract;

function bundleWithCacheLeaf({ degraded = false } = {}) {
  const dir = path.join(TMP, `dpt_rb_claim-floor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const trail = '_cache/wave1/primary/topic-a/deepening';
  mkdirSync(path.join(dir, trail), { recursive: true });
  writeFileSync(path.join(dir, trail, 'page.md'), degraded
    ? '# Topic\n\nfetch failure: 403 forbidden while fetching the assigned source (explicit degraded capture)\n'
    : '# Captured Page\n\nReal fetched body text preserving the source content for the work unit.\n');
  writeFileSync(path.join(dir, trail, 'meta.json'), `${JSON.stringify({ url: 'https://fixture.news-research.com/source-a' })}\n`);
  return { dir, trail };
}

function zeroClaimResult(trail) {
  return {
    work_id: 'wu-w1-b000-deep-i0001',
    queue_item_id: 'topic-a',
    kind: 'wave1_topic_deepening',
    source_claims: [],
    accepted_source_urls: [],
    cache_trails: trail ? [trail] : [],
  };
}

describe('validateSourceClaims empty-claims claim floor @impl WAI-013', () => {
  before(() => { mkdirSync(TMP, { recursive: true }); });
  after(() => { rmSync(TMP, { recursive: true, force: true }); });

  it('wave1 contract: zero claims without degraded capture throws a repair error', () => {
    const { dir, trail } = bundleWithCacheLeaf({ degraded: false });
    try {
      assert.throws(
        () => validateSourceClaims(dir, zeroClaimResult(trail), WAVE1_CONTRACT),
        (error) => {
          assert.match(error.message, /both empty and no explicit degraded capture/i);
          assert.equal(error.repair_contract.repair_kind, 'agent_action');
          return true;
        },
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('wave1 contract: zero claims with no declared cache trails throws', () => {
    const dir = path.join(TMP, `dpt_rb_claim-floor-empty-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    try {
      assert.throws(
        () => validateSourceClaims(dir, zeroClaimResult(null), WAVE1_CONTRACT),
        /both empty and no explicit degraded capture/i,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('wave1 contract: zero claims with an explicit degraded capture record passes the floor', () => {
    const { dir, trail } = bundleWithCacheLeaf({ degraded: true });
    try {
      assert.doesNotThrow(() => validateSourceClaims(dir, zeroClaimResult(trail), WAVE1_CONTRACT));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('wave1 contract: a non-empty accepted_source_urls entry passes the floor', () => {
    const { dir, trail } = bundleWithCacheLeaf({ degraded: false });
    try {
      const result = { ...zeroClaimResult(trail), accepted_source_urls: ['https://fixture.news-research.com/source-a'] };
      // The floor must not fire; later URL-coverage validation owns the remaining checks.
      try {
        validateSourceClaims(dir, result, WAVE1_CONTRACT);
      } catch (error) {
        assert.doesNotMatch(error.message, /both empty and no explicit degraded capture/i);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('wave0 contract (no source_claims): zero claims keeps the empty pass-through', () => {
    const { dir, trail } = bundleWithCacheLeaf({ degraded: false });
    try {
      assert.doesNotThrow(() => validateSourceClaims(dir, zeroClaimResult(trail), WAVE0_CONTRACT));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('wave2 contract (no source_claims): zero claims keeps the empty pass-through', () => {
    const { dir, trail } = bundleWithCacheLeaf({ degraded: false });
    try {
      assert.doesNotThrow(() => validateSourceClaims(dir, zeroClaimResult(trail), WAVE2_CONTRACT));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('validateSourceClaims duplicate accepted-claim-url enrichment @impl DEW-031', () => {
  before(() => { mkdirSync(TMP, { recursive: true }); });
  after(() => { rmSync(TMP, { recursive: true, force: true }); });

  function duplicateClaimBundle({ withExtraAcceptedUrl = false } = {}) {
    const dir = path.join(TMP, `dpt_rb_dup-claim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    const trail = '_cache/wave1/primary/topic-a/deepening';
    mkdirSync(path.join(dir, trail), { recursive: true });
    writeFileSync(path.join(dir, trail, 'page.md'), '# Captured Page\n\nReal fetched body text for the work unit source.\n');
    writeFileSync(path.join(dir, trail, 'meta.json'), `${JSON.stringify({ url: 'https://fixture.news-research.com/source-a' })}\n`);
    const claim = {
      url: 'https://fixture.news-research.com/source-a',
      source_ref: 'artifacts/wave1/topic-a/evidence-summary.md',
      acceptance_status: 'accepted',
      is_new_vs_wave0: true,
      cache_trail_refs: [trail],
    };
    const accepted = ['https://fixture.news-research.com/source-a'];
    if (withExtraAcceptedUrl) accepted.push('https://fixture.news-research.com/unclaimed-source');
    const result = {
      ...zeroClaimResult(trail),
      output_files: [{ path: 'artifacts/wave1/topic-a/evidence-summary.md', role: 'evidence_summary' }],
      source_claims: [claim, { ...claim, source_ref: 'artifacts/wave1/topic-a/evidence-summary.md' }],
      accepted_source_urls: accepted,
    };
    return { dir, trail, result };
  }

  it('reports repeated claim url, count, and pointer range inside an invalid accepted-url root', () => {
    const { dir, result } = duplicateClaimBundle({ withExtraAcceptedUrl: true });
    try {
      assert.throws(
        () => validateSourceClaims(dir, result, WAVE1_CONTRACT),
        (error) => {
          assert.match(error.message, /no matching accepted source_claims/);
          assert.match(error.message, /source-a' x2 at \/source_claims\/0\.\.1/);
          assert.equal(error.repair_contract.details.repeated_claim_urls.length, 1);
          assert.equal(error.repair_contract.details.repeated_claim_urls[0].count, 2);
          assert.equal(error.repair_contract.details.repeated_claim_urls[0].first_claim_index, 0);
          assert.equal(error.repair_contract.details.repeated_claim_urls[0].last_claim_index, 1);
          return true;
        },
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('adds no duplicate enrichment when the already-invalid result has distinct claim urls', () => {
    const { dir, result } = duplicateClaimBundle({ withExtraAcceptedUrl: true });
    try {
      result.source_claims = [result.source_claims[0]];
      assert.throws(
        () => validateSourceClaims(dir, result, WAVE1_CONTRACT),
        (error) => {
          assert.match(error.message, /no matching accepted source_claims/);
          assert.doesNotMatch(error.message, /Repeated accepted claim urls/);
          assert.equal(error.repair_contract.details?.repeated_claim_urls, undefined);
          return true;
        },
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not fail a duplicate-only result whose other source-claim checks pass', () => {
    const { dir, result } = duplicateClaimBundle({ withExtraAcceptedUrl: false });
    try {
      assert.doesNotThrow(() => validateSourceClaims(dir, result, WAVE1_CONTRACT));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
