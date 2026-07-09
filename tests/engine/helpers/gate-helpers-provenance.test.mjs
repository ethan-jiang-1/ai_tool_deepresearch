import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  checkReferenceIndexCoverage,
  classifyReferenceAuthority,
} from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs';
import {
  checkDelegatedBypassSuspected,
  checkWorkUnitLedgerExists,
  checkWorkUnitOutputCoverage,
  checkWorkUnitSubmissionPresence,
  detectDelegatedBypassSuspicion,
} from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  referenceContent,
  tempWorkUnitBundle,
} from '../work-unit-test-helpers.mjs';

const dirs = [];

afterEach(() => {
  while (dirs.length > 0) cleanupWorkUnitBundle(dirs.pop());
});

function tempDir(prefix) {
  const dir = tempWorkUnitBundle(prefix);
  dirs.push(dir);
  return dir;
}

function submitWave1SourceBacking(dir, {
  sourceUrl = 'https://example.com/research/topic-a-source',
  topic = 'topic-a',
} = {}) {
  const cacheTrail = `_cache/wave1/primary/${topic}/s01_source`;
  const evidencePath = `artifacts/wave1/${topic}/evidence-summary.md`;
  const questionPath = `artifacts/wave1/${topic}/question-list.md`;
  return claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId: topic,
    outputs: [
      {
        path: evidencePath,
        role: 'evidence_summary',
        content: `# Evidence\n\n[Source](${sourceUrl})\n`,
      },
      {
        path: questionPath,
        role: 'question_list',
        content: '# Questions\n',
      },
    ],
    cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
    resultOverrides: {
      source_claims: [{
        url: sourceUrl,
        acceptance_status: 'accepted',
        is_new_vs_wave0: true,
        source_ref: evidencePath,
        cache_trail_refs: [cacheTrail],
      }],
      accepted_source_urls: [sourceUrl],
    },
  });
}

function writeIndex(dir, rows) {
  mkdirSync(join(dir, 'reference'), { recursive: true });
  writeFileSync(join(dir, 'reference', '_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n') + '\n');
}

describe('work-unit provenance gate helpers', () => {
  it('accepts only submitted work-unit ledger rows for scoped ledger existence', () => {
    const dir = tempDir('wpg-ledger-');
    claimAndSubmitWorkUnit(dir, { phase: 'wave0', queueItemId: 'queue-a' });

    const result = checkWorkUnitLedgerExists(dir, {
      wave: 'wave0',
      kind: 'wave0_source_intake',
      role: 'reference',
    });

    assert.equal(result.passed, true);
    assert.equal(result.records.length, 1);
    assert.match(result.records[0].work_id, /^wu-w0-b000-src-i0001$/);
  });

  it('rejects work-unit-looking hand-written rows without submit/index fingerprints', () => {
    const dir = tempDir('wpg-handwritten-');
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), `${JSON.stringify({
      declared_at: '2026-07-06T00:00:00.000Z',
      work_id: 'wu-w0-b000-src-i0001',
      queue_item_id: 'queue-a',
      wave: 0,
      kind: 'wave0_source_intake',
      producer_rule: 'source_intake_fan_in',
      creation_reason: 'hand written',
      work_unit_ref: '_work_units/wave0/wu-w0-b000-src-i0001',
      result_ref: '_work_units/wave0/wu-w0-b000-src-i0001/result.json',
      runtime_receipt_ref: '_work_units/wave0/wu-w0-b000-src-i0001/runtime-receipt.jsonl',
      receipt_nonce: '1234567890123456',
      output_files: [],
      cache_trails: [],
      result_hash: 'not-engine-written',
      ledger_record_hash: 'not-engine-written',
    })}\n`);

    const result = checkWorkUnitLedgerExists(dir, { wave: 'wave0' });
    assert.equal(result.passed, false);
    assert.match(result.inspect.join('\n'), /invalid submitted work-unit declaration ledger/);
  });

  it('requires filesystem outputs to be covered by submitted work-unit rows', () => {
    const dir = tempDir('wpg-coverage-');
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'topic-a-orphan.md'), '# Orphan\n');

    const result = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave1',
      output_selectors: { glob: 'reference/*.md', roles: ['reference'] },
    });

    assert.equal(result.passed, false);
    assert.equal(result.orphans.length, 1);
    assert.match(result.orphans[0], /reference\/topic-a-orphan\.md/);
    assert.match(result.orphans[0], /projection_backing_drift/);
    assert.match(result.inspect.join('\n'), /lacks submitted work-unit coverage/);
  });

  it('accepts a Wave1 Phase-owned topic reference backed by submitted source claims', () => {
    const dir = tempDir('wpg-wave1-projection-');
    const sourceUrl = 'https://example.com/research/topic-a-source';
    submitWave1SourceBacking(dir, { sourceUrl, topic: 'topic-a' });
    writeIndex(dir, [
      '| reference/topic-a-source.md | primary | expert | Tier 2 | topic-a | wave1_topic | accepted | 2026-07-06 |',
    ]);
    writeFileSync(join(dir, 'reference', 'topic-a-source.md'), referenceContent({
      source_url: sourceUrl,
      related_topic: 'topic-a',
      coreContent: 'This Phase-owned topic reference cites artifacts/wave1/topic-a/evidence-summary.md and _cache/wave1/primary/topic-a/s01_source as submitted backing for the source URL.',
    }));

    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave1',
      kind: 'wave1_topic_deepening',
      output_selectors: { glob: 'reference/topic-a*.md', roles: ['reference'] },
    });
    const presence = checkWorkUnitSubmissionPresence(dir, {
      wave: 'wave1',
      kind: 'wave1_topic_deepening',
      output_selectors: { glob: 'reference/topic-a*.md', roles: ['reference'] },
    });

    assert.equal(coverage.passed, true, coverage.inspect.join('; '));
    assert.equal(presence.passed, true, presence.inspect.join('; '));
  });

  it('rejects a Wave1 topic reference whose source URL has no submitted backing', () => {
    const dir = tempDir('wpg-wave1-unbacked-');
    writeIndex(dir, [
      '| reference/topic-a-source.md | primary | expert | Tier 2 | topic-a | wave1_topic | accepted | 2026-07-06 |',
    ]);
    writeFileSync(join(dir, 'reference', 'topic-a-source.md'), referenceContent({
      source_url: 'https://example.com/research/unsubmitted',
      related_topic: 'topic-a',
      coreContent: 'This reference names artifacts/wave1/topic-a/evidence-summary.md, but the URL is absent from submitted source claims, accepted URL surfaces, cache trails, and degraded capture backing.',
    }));

    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave1',
      kind: 'wave1_topic_deepening',
      output_selectors: { glob: 'reference/*.md', roles: ['reference'] },
    });

    assert.equal(coverage.passed, false);
    assert.match(coverage.inspect.join('\n'), /projection_backing_drift/);
    assert.match(coverage.advice.join('\n'), /supplement|repair|Submit delegated outputs|Phase-owned reference backing/i);
  });

  it('passes output coverage and submission presence for a real submit', () => {
    const dir = tempDir('wpg-submitted-');
    claimAndSubmitWorkUnit(dir, {
      phase: 'wave1',
      queueItemId: 'queue-b',
      outputs: [{
        path: 'reference/topic-a-source.md',
        role: 'reference',
        source_url: 'https://example.com/research/article',
        source_slug: 's01_source',
        content: '# Source\n',
      }],
    });

    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave1',
      kind: 'wave1_topic_deepening',
      output_selectors: { glob: 'reference/*.md', roles: ['reference'] },
    });
    const presence = checkWorkUnitSubmissionPresence(dir, {
      wave: 'wave1',
      kind: 'wave1_topic_deepening',
    });

    assert.equal(coverage.passed, true);
    assert.equal(presence.passed, true);
  });

  it('reports delegated bypass suspicion for direct artifacts without submitted coverage', () => {
    const dir = tempDir('wpg-bypass-');
    mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-a'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave1', 'topic-a', 'evidence-summary.md'), '# Evidence\n');
    writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ bundle: 'wpg-bypass' }));

    const result = detectDelegatedBypassSuspicion(dir, 'wave1', 'wave1-complete');
    const check = checkDelegatedBypassSuspected(dir, { wave: 'wave1', gate: 'wave1-complete' });

    assert.equal(result.suspected, true);
    assert.equal(check.passed, false);
    assert.match(check.inspect.join('\n'), /delegated_bypass_suspected/);
  });

  it('does not require Wave2 work-unit rows for pure synthesis artifacts', () => {
    const dir = tempDir('wpg-wave2-pure-');
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave2', 'synthesis.md'), '# Synthesis\n');

    const result = detectDelegatedBypassSuspicion(dir, 'wave2', 'wave2-complete');
    assert.equal(result.suspected, false);
  });

  it('accepts an existing-backed Wave2 00-cross projection without a new Wave2 row', () => {
    const dir = tempDir('wpg-wave2-existing-backed-');
    const sourceUrl = 'https://example.com/research/prior-source';
    submitWave1SourceBacking(dir, { sourceUrl, topic: 'topic-a' });
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave2', 'finding-index.yaml'), [
      'version: "0.1"',
      'findings:',
      '  - id: W2F-001',
      '    decision: use_existing_evidence',
      '    search_required: false',
    ].join('\n'));
    writeFileSync(join(dir, 'artifacts', 'wave2', 'cross-topic-ledger.md'), '# Ledger\n\nW2F-001\n');
    writeIndex(dir, [
      '| reference/00-cross-w2f-001-topic-a.md | primary | expert | Tier 2 | cross-topic | wave2_cross | accepted | 2026-07-06 |',
    ]);
    writeFileSync(join(dir, 'reference', '00-cross-w2f-001-topic-a.md'), referenceContent({
      source_url: sourceUrl,
      related_topic: 'cross-topic',
      evidence_role: 'cross_topic_projection',
      coreContent: 'W2F-001 is linked to artifacts/wave2/finding-index.yaml, artifacts/wave2/cross-topic-ledger.md, artifacts/wave1/topic-a/evidence-summary.md, and _cache/wave1/primary/topic-a/s01_source as prior submitted backing.',
    }));

    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave2',
      kind: 'wave2_targeted_evidence',
      output_selectors: { glob: 'reference/00-cross-*.md', roles: ['reference'] },
    });
    const presence = checkWorkUnitSubmissionPresence(dir, {
      wave: 'wave2',
      kind: 'wave2_targeted_evidence',
      output_selectors: { glob: 'reference/00-cross-*.md', roles: ['reference'] },
    });
    const bypass = detectDelegatedBypassSuspicion(dir, 'wave2', 'wave2-complete');

    assert.equal(coverage.passed, true, coverage.inspect.join('; '));
    assert.equal(presence.passed, true, presence.inspect.join('; '));
    assert.equal(bypass.suspected, false, bypass.provenanceMissing?.join('; '));
  });

  it('accepts a submitted Wave2 targeted-evidence row for a new 00-cross reference', () => {
    const dir = tempDir('wpg-wave2-targeted-');
    const sourceUrl = 'https://example.com/research/new-wave2-targeted-source';
    claimAndSubmitWorkUnit(dir, {
      phase: 'wave2',
      queueItemId: 'w2-targeted',
      outputs: [{
        path: 'reference/00-cross-w2f-004-new.md',
        role: 'reference',
        source_url: sourceUrl,
        source_slug: 's01_targeted',
        content: referenceContent({
          source_url: sourceUrl,
          related_topic: 'cross-topic',
          evidence_role: 'cross_topic_projection',
          coreContent: 'W2F-004 targeted evidence was fetched by a Wave2 work unit and materialized as a submitted reference output.',
        }),
      }],
    });
    writeIndex(dir, [
      '| reference/00-cross-w2f-004-new.md | primary | expert | Tier 2 | cross-topic | wave2_cross | accepted | 2026-07-06 |',
    ]);

    const classification = classifyReferenceAuthority(dir, 'reference/00-cross-w2f-004-new.md');
    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave2',
      kind: 'wave2_targeted_evidence',
      output_selectors: { glob: 'reference/00-cross-*.md', roles: ['reference'] },
    });
    const presence = checkWorkUnitSubmissionPresence(dir, {
      wave: 'wave2',
      kind: 'wave2_targeted_evidence',
      output_selectors: { glob: 'reference/00-cross-*.md', roles: ['reference'] },
    });

    assert.equal(classification.passed, true, classification.reason);
    assert.equal(classification.authority, 'delegated_fetched_evidence');
    assert.equal(coverage.passed, true, coverage.inspect.join('; '));
    assert.equal(presence.passed, true, presence.inspect.join('; '));
  });

  it('rejects a Wave2 00-cross reference when source_layer and index coverage are the only authority', () => {
    const dir = tempDir('wpg-wave2-new-unsubmitted-');
    const priorUrl = 'https://example.com/research/prior-source';
    submitWave1SourceBacking(dir, { sourceUrl: priorUrl, topic: 'topic-a' });
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave2', 'finding-index.yaml'), 'findings:\n  - id: W2F-002\n    decision: use_existing_evidence\n    search_required: false\n');
    writeFileSync(join(dir, 'artifacts', 'wave2', 'cross-topic-ledger.md'), '# Ledger\n\nW2F-002\n');
    writeIndex(dir, [
      '| reference/00-cross-w2f-002-new.md | primary | expert | Tier 2 | cross-topic | wave2_cross | accepted | 2026-07-06 |',
    ]);
    writeFileSync(join(dir, 'reference', '00-cross-w2f-002-new.md'), referenceContent({
      source_url: 'https://example.com/research/new-wave2-source',
      related_topic: 'cross-topic',
      evidence_role: 'cross_topic_projection',
      coreContent: 'W2F-002 cites artifacts/wave2/finding-index.yaml, artifacts/wave2/cross-topic-ledger.md, artifacts/wave1/topic-a/evidence-summary.md, and _cache/wave1/primary/topic-a/s01_source, but the metadata source_url is newly introduced.',
    }));

    const indexCoverage = checkReferenceIndexCoverage(dir, [{
      relPath: 'reference/00-cross-w2f-002-new.md',
      absPath: join(dir, 'reference', '00-cross-w2f-002-new.md'),
    }], { sourceLayer: 'wave2_cross' });
    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave2',
      kind: 'wave2_targeted_evidence',
      output_selectors: { glob: 'reference/00-cross-*.md', roles: ['reference'] },
    });
    const bypass = detectDelegatedBypassSuspicion(dir, 'wave2', 'wave2-complete');

    assert.equal(indexCoverage.passed, true, indexCoverage.inspect.join('; '));
    assert.equal(coverage.passed, false);
    assert.match(coverage.inspect.join('\n'), /source_url is not a prior accepted backing URL/);
    assert.equal(bypass.suspected, true);
  });

  it('rejects a Wave2 00-cross reference backed only by another unbacked reference', () => {
    const dir = tempDir('wpg-wave2-ref-chain-');
    const sourceUrl = 'https://example.com/research/prior-source';
    submitWave1SourceBacking(dir, { sourceUrl, topic: 'topic-a' });
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave2', 'finding-index.yaml'), 'findings:\n  - id: W2F-003\n    decision: use_existing_evidence\n    search_required: false\n');
    writeFileSync(join(dir, 'artifacts', 'wave2', 'cross-topic-ledger.md'), '# Ledger\n\nW2F-003\n');
    writeIndex(dir, [
      '| reference/topic-b-unbacked.md | primary | expert | Tier 2 | topic-b | wave1_topic | accepted | 2026-07-06 |',
      '| reference/00-cross-w2f-003-chain.md | primary | expert | Tier 2 | cross-topic | wave2_cross | accepted | 2026-07-06 |',
    ]);
    writeFileSync(join(dir, 'reference', 'topic-b-unbacked.md'), referenceContent({
      source_url: 'https://example.com/research/unbacked-chain-source',
      related_topic: 'topic-b',
    }));
    writeFileSync(join(dir, 'reference', '00-cross-w2f-003-chain.md'), referenceContent({
      source_url: sourceUrl,
      related_topic: 'cross-topic',
      evidence_role: 'cross_topic_projection',
      coreContent: 'W2F-003 cites artifacts/wave2/finding-index.yaml, artifacts/wave2/cross-topic-ledger.md, and reference/topic-b-unbacked.md, but no concrete prior-wave source/cache/work-unit backing ref appears in the body.',
    }));

    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave2',
      kind: 'wave2_targeted_evidence',
      output_selectors: { glob: 'reference/00-cross-*.md', roles: ['reference'] },
    });

    assert.equal(coverage.passed, false);
    assert.match(coverage.inspect.join('\n'), /locator refs do not resolve to submitted prior-wave backing/);
  });
});
