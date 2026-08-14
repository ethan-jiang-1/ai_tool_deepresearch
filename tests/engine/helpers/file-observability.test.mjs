// file-observability.test.mjs
// Tests for auditFileObservability — validates classifications and work-unit delegated file handling
// @impl 8A.13, 8A.16
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditFileObservability } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs';
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
  writeFileSync(join(dir, 'BUNDLE_ENTRY.md'), '# Bundle Entry\n');
  writeFileSync(join(dir, 'BUNDLE_MAP.md'), '# Bundle Map\n');
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
  writeFileSync(join(dir, 'seed_topics', 'topic-a.md'), [
    '---',
    '{',
    '  "topic_uid": "tp_123e4567-e89b-12d3-a456-426614174000",',
    '  "id": "01",',
    '  "slug": "topic-a",',
    '  "title": "Topic A",',
    '  "must_answer": ["What must be established for Topic A?"],',
    '  "scope_role": "primary",',
    '  "depends_on_topic_uids": []',
    '}',
    '---',
    '# Topic A',
  ].join('\n'));

  // Extra files (pass as { 'relative/path': 'content' })
  for (const [relPath, content] of Object.entries(extraFiles)) {
    const fp = join(dir, relPath);
    mkdirSync(dirname(fp), { recursive: true });
    writeFileSync(fp, content);
  }

  return dir;
}

function snapshotBundle(root) {
  const entries = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        entries.push(`D:${path.slice(root.length + 1)}`);
        walk(path);
      } else {
        entries.push(`F:${path.slice(root.length + 1)}:${readFileSync(path).toString('base64')}`);
      }
    }
  };
  walk(root);
  return entries;
}

describe('file observability', () => {
  it('classifies control files as expected', () => {
    const dir = setupBundle('fo-control');
    const result = auditFileObservability(dir, { topicSlugs: ['topic-a'] });

    const bundleMap = result.findings.find(f => f.path === 'BUNDLE_MAP.md');
    assert.ok(bundleMap, 'BUNDLE_MAP.md should be found');
    assert.strictEqual(bundleMap.classification, 'expected');
    assert.strictEqual(bundleMap.authority_status, 'none');

    const bundleEntry = result.findings.find(f => f.path === 'BUNDLE_ENTRY.md');
    assert.ok(bundleEntry, 'BUNDLE_ENTRY.md should be found');
    assert.strictEqual(bundleEntry.classification, 'expected');
    assert.strictEqual(bundleEntry.authority_status, 'none');

    const rbStatus = result.findings.find(f => f.path === 'rb_status.json');
    assert.ok(rbStatus, 'rb_status.json should be found');
    assert.strictEqual(rbStatus.classification, 'expected');
    assert.strictEqual(rbStatus.severity, 'info');
  });

  it('classifies legacy RUN_BUNDLE.md beside a current pair as non-authoritative historical debris', () => {
    const dir = setupBundle('fo-legacy-entry', {
      'RUN_BUNDLE.md': '# Legacy Bundle Entry\n',
    });

    const result = auditFileObservability(dir, { topicSlugs: ['topic-a'] });
    const legacy = result.findings.find(f => f.path === 'RUN_BUNDLE.md');

    assert.ok(legacy, 'RUN_BUNDLE.md should be found');
    assert.strictEqual(legacy.classification, 'unplanned_nonblocking');
    assert.strictEqual(legacy.authority_status, 'none');
    assert.match(legacy.reason, /historical bundle-entry debris/);
  });

  it('returns a blocking current-entry conclusion before auditing an incomplete root', () => {
    const dir = setupBundle('fo-legacy-map');
    rmSync(join(dir, 'BUNDLE_MAP.md'));
    writeFileSync(join(dir, 'START_FROM_HERE.md'), '# Legacy Map\n');

    const result = auditFileObservability(dir, { topicSlugs: ['topic-a'] });

    assert.deepStrictEqual(result.findings, []);
    assert.strictEqual(result.canonical_findings.length, 1);
    assert.strictEqual(result.canonical_findings[0].rule_id, 'unsupported_current_entry_contract');
    assert.ok(result.inspect.some(line => line.includes('unsupported_current_entry_contract')));
    assert.ok(!result.advice.some(line => line.includes('migrat')));
  });

  it('does not create two map authorities when both map names exist', () => {
    const dir = setupBundle('fo-both-maps', {
      'START_FROM_HERE.md': '# Legacy Map\n',
    });

    const result = auditFileObservability(dir, { topicSlugs: ['topic-a'] });

    const bundleMap = result.findings.find(f => f.path === 'BUNDLE_MAP.md');
    const legacy = result.findings.find(f => f.path === 'START_FROM_HERE.md');
    assert.ok(bundleMap);
    assert.ok(legacy);
    assert.strictEqual(bundleMap.classification, 'expected');
    assert.strictEqual(legacy.classification, 'unplanned_nonblocking');
    assert.strictEqual(bundleMap.authority_status, 'none');
    assert.strictEqual(legacy.authority_status, 'none');
    assert.ok(!result.inspect.some(i => i.includes('compatibility')));
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
        { path: evidencePath, role: 'evidence_summary', content: `# Evidence\n\n[Source](${sourceUrl})\n\n## Key Findings\n\n- Supported finding.\n` },
        { path: questionPath, role: 'question_list', content: '## Topic Investigation Targets\n\nTargets.\n\n## Question Reconciliation\n\nReconciled.\n\n## Emergent Question Protocol\n\nChecked.\n\n## Exploration / Exploitation Decision\n\nContinue.\n' },
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
        content: '# Evidence\n\n## Key Findings\n\n- Supported finding.\n',
      }, {
        path: 'artifacts/wave1/topic-a/question-list.md',
        role: 'question_list',
        content: '## Topic Investigation Targets\n\nTargets.\n\n## Question Reconciliation\n\nReconciled.\n\n## Emergent Question Protocol\n\nChecked.\n\n## Exploration / Exploitation Decision\n\nContinue.\n',
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

  it('groups explicit registry-external durable topic facts into one canonical finding', () => {
    const dir = setupBundle('fo-canonical-unregistered', {
      'artifacts/wave1/topic-x/evidence-summary.md': '# Evidence\n',
      'reference/topic-x-source.md': '- related_topic: topic-x\n\n## Key Facts\n',
    });
    const result = auditFileObservability(dir, {
      topics: [{ id: 'T01', slug: 'topic-a' }],
      targetPhase: null,
    });
    const roots = result.canonical_findings.filter((finding) => finding.topic_identity === 'topic-x');
    assert.strictEqual(roots.length, 1);
    assert.strictEqual(roots[0].rule_id, 'unregistered_durable_topic');
    assert.strictEqual(roots[0].classification, 'blocking');
    const surfaces = new Set([roots[0].primary_surface, ...roots[0].supporting_details.map((detail) => detail.surface)]);
    assert.ok(surfaces.has('reference/topic-x-source.md'));
    assert.ok(surfaces.has('artifacts/wave1/topic-x'));
  });

  it('uses exact registry ids/slugs and accepts related_topic all or exact lists', () => {
    const dir = setupBundle('fo-topic-aliases', {
      'reference/shared.md': '- related_topic: all\n\n## Key Facts\n',
      'reference/list.md': '- related_topic: T01, topic-a\n\n## Key Facts\n',
      'reference/dangling.md': '- related_topic: T01, topic-z\n\n## Key Facts\n',
    });
    const result = auditFileObservability(dir, { topics: [{ id: 'T01', slug: 'topic-a' }] });
    assert.equal(result.canonical_findings.some((finding) => finding.topic_identity === 'all'), false);
    assert.equal(result.canonical_findings.some((finding) => finding.topic_identity === 'T01'), false);
    assert.equal(result.canonical_findings.some((finding) => finding.topic_identity === 'topic-a'), false);
    assert.equal(result.canonical_findings.filter((finding) => finding.topic_identity === 'topic-z').length, 1);
  });

  it('binds UID-only reference metadata through the canonical resolver', () => {
    const topicUid = 'tp_11111111-1111-4111-8111-111111111111';
    const dir = setupBundle('fo-topic-uid', {
      'reference/uid-only.md': `- related_topic_uid: ${topicUid}\n\n## Key Facts\n- Fact\n`,
    });
    const result = auditFileObservability(dir, {
      topics: [{ topic_uid: topicUid, id: 'T01', slug: 'topic-a' }],
    });
    assert.equal(result.canonical_findings.some((finding) => finding.topic_identity === topicUid), false);
    assert.equal(result.canonical_findings.some((finding) => finding.primary_surface === 'reference/uid-only.md'), false);
  });

  it('attaches a UID-array reference footprint to the selected Topics only', () => {
    const topicA = 'tp_11111111-1111-4111-8111-111111111111';
    const topicB = 'tp_22222222-2222-4222-8222-222222222222';
    const topicC = 'tp_33333333-3333-4333-8333-333333333333';
    const dir = setupBundle('fo-topic-uid-subset', {
      'reference/00-cross-selected.md': [
        '---',
        'related_topic_uids:',
        `  - ${topicB}`,
        `  - ${topicA}`,
        '---',
        '',
        '## Key Facts', '- Fact',
      ].join('\n'),
    });
    const result = auditFileObservability(dir, {
      topics: [
        { topic_uid: topicA, id: 'T01', slug: 'topic-a' },
        { topic_uid: topicB, id: 'T02', slug: 'topic-b' },
        { topic_uid: topicC, id: 'T03', slug: 'topic-c' },
      ],
    });
    assert.equal(result.canonical_findings.some((finding) => finding.primary_surface === 'reference/00-cross-selected.md'), false);
    assert.equal(result.canonical_findings.some((finding) => finding.topic_identity === topicC), false);
  });

  it('reports an unknown UID-only reference as one unregistered durable topic', () => {
    const unknownUid = 'tp_99999999-9999-4999-8999-999999999999';
    const dir = setupBundle('fo-topic-uid-unknown', {
      'reference/uid-only.md': `- related_topic_uid: ${unknownUid}\n\n## Key Facts\n- Fact\n`,
    });
    const result = auditFileObservability(dir, {
      topics: [{ topic_uid: 'tp_11111111-1111-4111-8111-111111111111', id: 'T01', slug: 'topic-a' }],
    });
    const roots = result.canonical_findings.filter((finding) => finding.topic_identity === unknownUid);
    assert.equal(roots.length, 1);
    assert.equal(roots[0].rule_id, 'unregistered_durable_topic');
    assert.equal(roots[0].primary_surface, 'reference/uid-only.md');
  });

  it('reports conflicting UID and legacy reference metadata as one binding root', () => {
    const topicUid = 'tp_11111111-1111-4111-8111-111111111111';
    const otherUid = 'tp_22222222-2222-4222-8222-222222222222';
    const dir = setupBundle('fo-topic-binding-conflict', {
      'reference/conflict.md': `- related_topic_uid: ${topicUid}\n- related_topic: topic-b\n\n## Key Facts\n- Fact\n`,
    });
    const result = auditFileObservability(dir, {
      topics: [
        { topic_uid: topicUid, id: 'T01', slug: 'topic-a' },
        { topic_uid: otherUid, id: 'T02', slug: 'topic-b' },
      ],
    });
    const roots = result.canonical_findings.filter((finding) => finding.primary_surface === 'reference/conflict.md');
    assert.equal(roots.length, 1);
    assert.equal(roots[0].rule_id, 'reference_topic_binding_conflict');
    assert.equal(roots[0].classification, 'blocking');
  });

  it('keeps canonical footprint binding audit read-only', () => {
    const topicUid = 'tp_11111111-1111-4111-8111-111111111111';
    const dir = setupBundle('fo-topic-binding-read-only', {
      'reference/uid-only.md': `- related_topic_uid: ${topicUid}\n\n## Key Facts\n- Fact\n`,
    });
    const before = snapshotBundle(dir);
    auditFileObservability(dir, {
      topics: [{ topic_uid: topicUid, id: 'T01', slug: 'topic-a' }],
      targetPhase: 'wave0',
    });
    assert.deepEqual(snapshotBundle(dir), before);
  });

  it('classifies previous-layout artifact and reference paths as the same UID without expecting aliases', () => {
    const dir = setupBundle('fo-topic-history', {
      'artifacts/wave1/old-topic/evidence-summary.md': '# Evidence\n',
      'reference/old-topic-source.md': '- related_topic: old-topic\n\n## Key Facts\n',
    });
    const result = auditFileObservability(dir, {
      topics: [{ topic_uid: 'tp-a', id: '01', slug: 'current-topic', previous_layouts: [{ id: '02', slug: 'old-topic' }] }],
      topicSlugs: ['current-topic'],
    });
    assert.equal(result.canonical_findings.some((finding) => finding.topic_identity === 'old-topic'), false);
    assert.equal(result.findings.some((finding) => finding.path.includes('old-topic') && /missing/i.test(finding.reason)), false);
  });

  it('does not require future wave surfaces for an early target', () => {
    const dir = setupBundle('fo-early-target');
    mkdirSync(join(dir, 'artifacts', 'wave0', 'topic-a'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave0', 'topic-a', 'source.yaml'), '[]\n');
    const result = auditFileObservability(dir, {
      topics: [{ id: 'T01', slug: 'topic-a' }],
      targetPhase: 'wave0',
    });
    assert.equal(result.canonical_findings.some((finding) => finding.rule_id === 'registered_topic_surface_gap'), false);
  });

  it('keeps cache-only unknown subtrees non-authoritative and warns on unknown durable artifact namespaces', () => {
    const dir = setupBundle('fo-unknown-namespace', {
      '_cache/wave1/primary/topic-z/source/page.md': '# Page\n',
      'artifacts/addendum/result.md': '# Parallel result\n',
    });
    const result = auditFileObservability(dir, { topics: [{ id: 'T01', slug: 'topic-a' }] });
    assert.equal(result.canonical_findings.some((finding) => finding.primary_surface.startsWith('_cache/')), false);
    const unknown = result.canonical_findings.find((finding) => finding.rule_id === 'unknown_durable_namespace');
    assert.ok(unknown);
    assert.strictEqual(unknown.classification, 'warning');
  });
});
