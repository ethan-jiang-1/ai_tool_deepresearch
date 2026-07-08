// file-observability.test.mjs
// Tests for auditFileObservability — validates classifications and work-unit delegated file handling
// @impl 8A.13, 8A.16
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditFileObservability } from '../../../DPT_FRAMEWORK/engine/helpers/file-observability.mjs';
import {
  claimAndSubmitWorkUnit,
  referenceContent,
} from '../work-unit-test-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-fo-tmp');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

function setupBundle(name, extraFiles = {}) {
  const dir = join(TMP, `dpt_rb_${name}`);
  mkdirSync(dir, { recursive: true });

  // Control files
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ bundle: name, current_gate: 'wave1_complete' }));
  writeFileSync(join(dir, 'rb_plan.md'), [
    '---',
    `topic_registry:`,
    '  - id: T01',
    '    slug: topic-a',
    '    title: Topic A',
    '---',
    '# Plan',
  ].join('\n'));
  writeFileSync(join(dir, 'rb_queue.json'), JSON.stringify({
    queue_health: 'ready',
    active_window: [],
    refill_pool: [],
    delegated_in_flight: {},
    terminal_history: [],
  }));
  writeFileSync(join(dir, 'rb_profile.yaml'), 'research_style: quick_factual\n');
  writeFileSync(join(dir, 'rb_trace.jsonl'), '');
  mkdirSync(join(dir, '_logs'), { recursive: true });
  writeFileSync(join(dir, '_logs', 'run.log'), '');

  // Standard dirs
  mkdirSync(join(dir, 'seed_topics'), { recursive: true });
  mkdirSync(join(dir, 'reference'), { recursive: true });
  mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-a'), { recursive: true });

  // Standard files
  writeFileSync(join(dir, 'seed_topics', 'topic-a.md'), '# Topic A\n');

  // Extra files (pass as { 'relative/path': 'content' })
  for (const [relPath, content] of Object.entries(extraFiles)) {
    const fp = join(dir, relPath);
    mkdirSync(dirname(fp), { recursive: true });
    writeFileSync(fp, content);
  }

  return dir;
}

describe('file observability', () => {
  it('classifies control files as expected', () => {
    const dir = setupBundle('fo-control');
    const result = auditFileObservability(dir, { topicSlugs: ['topic-a'] });

    const rbStatus = result.findings.find(f => f.path === 'rb_status.json');
    assert.ok(rbStatus, 'rb_status.json should be found');
    assert.strictEqual(rbStatus.classification, 'expected');
    assert.strictEqual(rbStatus.severity, 'info');
  });

  it('classifies ledger-declared files as declared_authoritative', () => {
    const dir = setupBundle('fo-declared', {
      'reference/topic-a-source1.md': '# Ref\n- source_url: https://example.com/news/a\n\n## Key Facts\n- Fact 1\n- Fact 2\n- Fact 3\n- Fact 4\n- Fact 5\n\n## Core Content Capture\nContent\n\n## Relevance To This Research\nRelevant\n\n## Quotable Terms / Concepts\nTerm\n\n## Risks And Limitations\nRisk\n',
    });
    claimAndSubmitWorkUnit(dir, {
      phase: 'wave1',
      queueItemId: 'topic-a',
      outputs: [{
        path: 'reference/topic-a-source1.md',
        role: 'reference',
        source_url: 'https://example.com/news/a',
        source_slug: 'source1',
      }],
      cacheTrails: [{
        path: '_cache/wave1/primary/topic-a/source1',
        url: 'https://example.com/news/a',
      }],
    });

    const result = auditFileObservability(dir, {
      topicSlugs: ['topic-a'],
    });

    const ref = result.findings.find(f => f.path === 'reference/topic-a-source1.md');
    assert.ok(ref, 'Declared reference should be found');
    assert.strictEqual(ref.classification, 'declared_authoritative');
  });

  it('detects orphan references at pass-condition paths as blockers', () => {
    const dir = setupBundle('fo-orphan', {
      'reference/topic-a-orphan.md': '# Orphan Ref\n',
    });

    const result = auditFileObservability(dir, {
      topicSlugs: ['topic-a'],
      ledgerDeclarations: [],
      targetPhase: 'wave1',
    });

    const orphan = result.findings.find(f => f.path === 'reference/topic-a-orphan.md');
    assert.ok(orphan, 'Orphan reference should be found');
    assert.strictEqual(orphan.classification, 'orphan_authority_blocking');
    assert.strictEqual(orphan.severity, 'blocker');
    assert.ok(result.inspect.some(i => i.includes('orphan')), 'Inspect should mention orphan');
  });

  it('treats backed Phase-owned reference projections as expected, not orphan blockers', () => {
    const dir = setupBundle('fo-backed-projection');
    const sourceUrl = 'https://example.com/news/phase-owned';
    const evidencePath = 'artifacts/wave1/topic-a/evidence-summary.md';
    const questionPath = 'artifacts/wave1/topic-a/question-list.md';
    const cacheTrail = '_cache/wave1/primary/topic-a/phase-owned';
    claimAndSubmitWorkUnit(dir, {
      phase: 'wave1',
      queueItemId: 'topic-a',
      outputs: [
        { path: evidencePath, role: 'evidence_summary', content: `# Evidence\n\n[Source](${sourceUrl})\n` },
        { path: questionPath, role: 'question_list', content: '# Questions\n' },
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
    writeFileSync(join(dir, 'reference', '_INDEX.md'), [
      '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
      '| --- | --- | --- | --- | --- | --- | --- | --- |',
      '| reference/topic-a-phase-owned.md | primary | expert | Tier 2 | topic-a | wave1_topic | accepted | 2026-07-06 |',
    ].join('\n'));
    writeFileSync(join(dir, 'reference', 'topic-a-phase-owned.md'), referenceContent({
      source_url: sourceUrl,
      related_topic: 'topic-a',
      coreContent: `This Phase-owned projection cites ${evidencePath} and ${cacheTrail} as submitted source/cache backing.`,
    }));

    const result = auditFileObservability(dir, {
      topicSlugs: ['topic-a'],
      targetPhase: 'wave1',
    });

    const ref = result.findings.find(f => f.path === 'reference/topic-a-phase-owned.md');
    assert.ok(ref);
    assert.strictEqual(ref.classification, 'expected');
    assert.strictEqual(ref.authority_status, 'phase_owned_projection');
    assert.ok(!result.inspect.some(line => line.includes('reference/topic-a-phase-owned.md') && line.includes('orphan')));
  });

  it('classifies non-work-unit delegated artifacts as diagnostic only', () => {
    const dir = setupBundle('fo-old-delegated', {
      '_subagents/wave_01/slot_01/task.md': '# Task\n',
      '_subagents/wave_01/slot_01/result.schema.json': '{}',
      '_subagents/wave_01/slot_01/runtime-receipt.jsonl': '{"event":"started"}\n',
    });

    const result = auditFileObservability(dir, { topicSlugs: ['topic-a'] });

    const receipt = result.findings.find(f => f.path.includes('runtime-receipt.jsonl'));
    assert.ok(receipt, 'runtime-receipt.jsonl should be found');
    assert.strictEqual(receipt.classification, 'unplanned_needs_explanation');
    assert.strictEqual(receipt.authority_status, 'none');
  });

  it('classifies work-unit envelope files as expected diagnostic runtime files', () => {
    const dir = setupBundle('fo-work-unit-runtime');
    claimAndSubmitWorkUnit(dir, {
      phase: 'wave1',
      queueItemId: 'topic-a',
      outputs: [{
        path: 'reference/topic-a-source1.md',
        role: 'reference',
        source_url: 'https://example.com/news/a',
        source_slug: 'source1',
        content: referenceContent({ source_url: 'https://example.com/news/a' }),
      }],
      cacheTrails: [{
        path: '_cache/wave1/primary/topic-a/source1',
        url: 'https://example.com/news/a',
      }],
    });

    const result = auditFileObservability(dir, { topicSlugs: ['topic-a'] });

    const receipt = result.findings.find(f => f.path.includes('_work_units/') && f.path.endsWith('runtime-receipt.jsonl'));
    assert.ok(receipt, 'work-unit runtime receipt should be found');
    assert.strictEqual(receipt.classification, 'expected');
  });

  it('classifies root-level runtime-receipt.jsonl as unplanned', () => {
    const dir = setupBundle('fo-bad-receipt', {
      'runtime-receipt.jsonl': '{"event":"started"}\n',
    });

    const result = auditFileObservability(dir, { topicSlugs: ['topic-a'] });

    const receipt = result.findings.find(f => f.path === 'runtime-receipt.jsonl');
    assert.ok(receipt, 'Root-level receipt should be found');
    assert.strictEqual(receipt.classification, 'unplanned_needs_explanation');
    assert.strictEqual(receipt.severity, 'warning');
  });

  it('classifies explained files as explained_non_authoritative (non-authoritative)', () => {
    const dir = setupBundle('fo-explained', {
      'reference/topic-a-explained.md': '# Explained Ref\n',
    });

    // Write a file_explanation diagnostic to trace
    writeFileSync(join(dir, 'rb_trace.jsonl'), JSON.stringify({
      ts: new Date().toISOString(),
      event: 'diagnostic',
      kind: 'file_explanation',
      bundle: 'fo-explained',
      path: 'reference/topic-a-explained.md',
      reason: 'Test-generated file, not from delegated queue completion',
      authority_status: 'explained_non_authoritative',
    }) + '\n');

    const result = auditFileObservability(dir, {
      topicSlugs: ['topic-a'],
      ledgerDeclarations: [],
      targetPhase: 'wave1',
    });

    const explained = result.findings.find(f => f.path === 'reference/topic-a-explained.md');
    assert.ok(explained, 'Explained file should be found');
    // Explained files take priority over orphan classification
    assert.strictEqual(explained.classification, 'explained_non_authoritative');
    assert.strictEqual(explained.authority_status, 'explained_non_authoritative');
  });

  it('reports mixed delegated provenance when submitted coverage coexists with non-authoritative delegated files', () => {
    const dir = setupBundle('fo-mixed', {
      'reference/topic-a-orphan.md': '# Orphan Ref\n',
    });
    claimAndSubmitWorkUnit(dir, {
      phase: 'wave1',
      queueItemId: 'topic-a',
      outputs: [{
        path: 'reference/topic-a-source1.md',
        role: 'reference',
        source_url: 'https://example.com/news/a',
        source_slug: 'source1',
        content: referenceContent({ source_url: 'https://example.com/news/a' }),
      }],
      cacheTrails: [{
        path: '_cache/wave1/primary/topic-a/source1',
        url: 'https://example.com/news/a',
      }],
    });

    const result = auditFileObservability(dir, {
      topicSlugs: ['topic-a'],
      targetPhase: 'wave1',
    });

    assert.ok(result.inspect.some((line) => line.includes('mixed_delegated_provenance')));
    const orphan = result.findings.find(f => f.path === 'reference/topic-a-orphan.md');
    assert.ok(orphan);
    assert.strictEqual(orphan.classification, 'orphan_authority_blocking');
  });

  it('labels projection drift, delegated bypass, missing index rows, and source-claim cache mismatches distinctly', () => {
    const dir = setupBundle('fo-diagnostics', {
      'reference/topic-a-unbacked.md': referenceContent({
        source_url: 'https://example.com/news/unbacked',
        related_topic: 'topic-a',
        coreContent: 'This reference cites no submitted source/cache/work-unit backing.',
      }),
      'reference/loose.md': referenceContent({
        source_url: 'https://example.com/news/loose',
        related_topic: 'topic-a',
      }),
    });
    claimAndSubmitWorkUnit(dir, {
      phase: 'wave1',
      queueItemId: 'topic-a',
      outputs: [{
        path: 'artifacts/wave1/topic-a/evidence-summary.md',
        role: 'evidence_summary',
        content: '# Evidence\n',
      }, {
        path: 'artifacts/wave1/topic-a/question-list.md',
        role: 'question_list',
        content: '# Questions\n',
      }],
      cacheTrails: [{
        path: '_cache/wave1/primary/topic-a/source',
        url: 'https://example.com/news/source',
      }],
      resultOverrides: {
        source_claims: [{
          url: 'https://example.com/news/source',
          acceptance_status: 'accepted',
          is_new_vs_wave0: true,
          source_ref: 'artifacts/wave1/topic-a/evidence-summary.md',
          cache_trail_refs: ['_cache/wave1/primary/topic-a/source'],
        }],
        accepted_source_urls: ['https://example.com/news/source'],
      },
    });
    writeFileSync(join(dir, '_cache/wave1/primary/topic-a/source/page.md'), '# Page\n');

    const result = auditFileObservability(dir, {
      topicSlugs: ['topic-a'],
      targetPhase: 'wave1',
    });
    const text = result.inspect.concat(result.findings.map(f => f.reason)).join('\n');
    assert.match(text, /projection_backing_drift/);
    assert.match(text, /delegated_bypass/);
    assert.match(text, /\[missing_index_row\]/);
    assert.match(text, /\[cache_source_claim_mismatch\]/);
  });

  it('creates findings with stable schema (path, classification, severity, phase, reason, authority_status)', () => {
    const dir = setupBundle('fo-schema');

    const result = auditFileObservability(dir, { topicSlugs: ['topic-a'] });

    for (const f of result.findings) {
      assert.ok(typeof f.path === 'string', 'path must be string');
      assert.ok(['expected', 'declared_authoritative', 'unplanned_nonblocking', 'unplanned_needs_explanation', 'orphan_authority_blocking', 'explained_non_authoritative'].includes(f.classification), `Invalid classification: ${f.classification}`);
      assert.ok(['info', 'warning', 'blocker'].includes(f.severity), `Invalid severity: ${f.severity}`);
      assert.ok('reason' in f, 'reason must be present');
      assert.ok('authority_status' in f, 'authority_status must be present');
    }
  });
});
