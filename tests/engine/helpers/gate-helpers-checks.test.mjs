// gate-helpers-checks.test.mjs
// Tests for gate-helpers-checks.mjs: Gate rule checks — reference validation
// and cache_coverage.
// @impl REF-009, WPG-017
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as gateHelpers from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import {
  extractSection,
  parseMarkdownSemanticSections,
  parseReferenceMetadata,
  readReferenceMetadata,
  listMatchingBundleFiles,
  checkReferenceFormatFiles,
  checkReferenceSourceUrls,
  checkReferenceLedgerCoverage,
  checkReferenceIndexCoverage,
  checkCacheCoverage,
  classifyReferenceAuthority,
} from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  referenceContent,
  tempWorkUnitBundle,
} from '../work-unit-test-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-gate-helpers-checks-tmp');

function canonicalReferenceFrontmatter({
  sourceUrl = 'https://example.com/news/a',
  relatedTopic = 'topic-a',
  coreContent = 'Narrative capture.',
} = {}) {
  return [
    '---',
    `source_url: "${sourceUrl}"`,
    'acceptance_status: accepted',
    'source_type: primary',
    'tier: "Tier 2"',
    'evidence_role: deepening_reference',
    'trust_level: practitioner',
    'why_it_matters: "Relevant."',
    'accessed_at: "2026-07-14"',
    `related_topic: "${relatedTopic}"`,
    '---',
    '',
    '# Reference',
    '',
    '## Key Facts',
    'Fact.',
    '',
    '## Core Content Capture',
    coreContent,
    '',
    '## Relevance To This Research',
    'Relevant.',
    '',
    '## Quotable Terms / Concepts',
    'Term.',
    '',
    '## Risks And Limitations',
    'Risk.',
  ].join('\n');
}

function wave0SourceYaml(urls) {
  return urls.map((url, index) => [
    `- url: ${url}`,
    `  title: Wave0 source ${index + 1}`,
    '  retrieved_date: 2026-07-20',
    '  topic_tag: topic-a',
  ].join('\n')).join('\n') + '\n';
}

function writeWave0ProjectionProfile(dir) {
  writeFileSync(join(dir, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: 0\n');
}

function submittedWave0ProjectionContent({ sourceUrl, entryId, sourceYamlRef, cacheTrail, resultRef, workUnitRef }) {
  return canonicalReferenceFrontmatter({
    sourceUrl,
    relatedTopic: 'all',
    coreContent: [
      `Submitted source identity: ${entryId}.`,
      `Source YAML: ${sourceYamlRef}.`,
      `Cache trail: ${cacheTrail}.`,
      `Result: ${resultRef}.`,
      `Work unit: ${workUnitRef}.`,
    ].join(' '),
  });
}

const REFERENCE_SEMANTIC_BODY = [
  '# Reference',
  '',
  '## Key Facts',
  'Fact.',
  '',
  '## Core Content Capture',
  'Narrative.',
  '',
  '## Relevance To This Research',
  'Relevant.',
  '',
  '## Quotable Terms / Concepts',
  'Term.',
  '',
  '## Risks And Limitations',
  'Risk.',
].join('\n');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

describe('extractSection', () => {
  const md = `# Title

Some content.

## Key Facts

年轻人消费平替趋势明显。
国潮品牌市场份额增长。

## Other Section

More content here.`;

  it('extracts section by name', () => {
    const kf = extractSection(md, 'Key Facts');
    assert.ok(kf.includes('年轻人消费平替'));
    assert.ok(kf.includes('国潮品牌'));
    assert.ok(!kf.includes('Other Section'));
  });

  it('returns empty string for missing section', () => {
    assert.strictEqual(extractSection(md, 'NonExistent'), '');
  });

  it('recognizes semantic sections across heading level, case, spacing, and order', () => {
    const tolerant = [
      '#### risks and limitations   ',
      '',
      'Risk.',
      '',
      '### CORE CONTENT CAPTURE',
      '',
      'Narrative.',
      '',
      '## key facts',
      '',
      '1. Fact.',
    ].join('\n');
    const sections = parseMarkdownSemanticSections(tolerant);
    assert.equal(sections.get('risks and limitations'), 'Risk.');
    assert.equal(sections.get('core content capture'), 'Narrative.');
    assert.equal(extractSection(tolerant, 'Key Facts'), '1. Fact.');
  });
});

describe('retired content heuristics', () => {
  it('does not export retired phase-boundary helper paths', () => {
    assert.equal('checkContentDedup' in gateHelpers, false);
    assert.equal('jaccardSimilarity' in gateHelpers, false);
    assert.equal('tokenizeForSimilarity' in gateHelpers, false);
    assert.equal('isHomepageUrl' in gateHelpers, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Reference file gate helpers — checkReferenceFormatFiles,
// checkReferenceLedgerCoverage, listMatchingBundleFiles
// ═══════════════════════════════════════════════════════════════════════════

describe('reference file gate helpers', () => {
  it('accepts exact UID-only reference topic binding against canonical registry', () => {
    const dir = join(__dirname, '.test-gh-ref-uid-binding');
    const topicUid = 'tp_123e4567-e89b-12d3-a456-426614174000';
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'rb_plan.md'), [
      '---',
      JSON.stringify({
        plan_basename: 'uid-binding',
        derived_topic_count: 1,
        topic_registry_version: '2',
        topic_registry: [{
          topic_uid: topicUid,
          id: '01',
          slug: '01_topic-a',
          title: 'Topic A',
          must_answer: ['Question A'],
          scope_role: 'primary',
          depends_on_topic_uids: [],
          previous_layouts: [{ id: '02', slug: '02_old-topic-a' }],
        }],
      }, null, 2),
      '---',
    ].join('\n'));
    writeFileSync(join(dir, 'reference', 'topic-a-uid.md'), [
      '- source_url: https://example.com/news/a',
      '- acceptance_status: accepted',
      '- source_type: primary',
      '- tier: Tier 2',
      '- evidence_role: deepening_reference',
      '- trust_level: practitioner',
      '- why_it_matters: Relevant.',
      '- accessed_at: 2026-07-14',
      `- related_topic_uid: ${topicUid}`,
      '',
      '## Key Facts',
      'Fact.',
      '## Core Content Capture',
      'Narrative.',
      '## Relevance To This Research',
      'Relevant.',
      '## Quotable Terms / Concepts',
      'Term.',
      '## Risks And Limitations',
      'Risk.',
    ].join('\n'));
    try {
      const files = listMatchingBundleFiles(dir, 'reference/*.md');
      const result = checkReferenceFormatFiles(files, { bundlePath: dir });
      assert.equal(result.passed, true, result.inspect.join('; '));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports one topic-binding conflict when UID and legacy metadata disagree', () => {
    const dir = join(__dirname, '.test-gh-ref-dual-binding');
    const topicA = 'tp_123e4567-e89b-12d3-a456-426614174000';
    const topicB = 'tp_123e4567-e89b-12d3-a456-426614174001';
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'rb_plan.md'), [
      '---',
      JSON.stringify({
        plan_basename: 'dual-binding',
        derived_topic_count: 2,
        topic_registry_version: '2',
        topic_registry: [
          { topic_uid: topicA, id: '01', slug: '01_topic-a', title: 'Topic A', must_answer: ['A'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] },
          { topic_uid: topicB, id: '02', slug: '02_topic-b', title: 'Topic B', must_answer: ['B'], scope_role: 'primary', depends_on_topic_uids: [], previous_layouts: [] },
        ],
      }, null, 2),
      '---',
    ].join('\n'));
    writeFileSync(join(dir, 'reference', 'topic-a-conflict.md'), [
      '- source_url: https://example.com/news/a',
      '- acceptance_status: accepted',
      '- source_type: primary',
      '- tier: Tier 2',
      '- evidence_role: deepening_reference',
      '- trust_level: practitioner',
      '- why_it_matters: Relevant.',
      '- accessed_at: 2026-07-14',
      `- related_topic_uid: ${topicA}`,
      '- related_topic: 02_topic-b',
      '',
      '## Key Facts', 'Fact.',
      '## Core Content Capture', 'Narrative.',
      '## Relevance To This Research', 'Relevant.',
      '## Quotable Terms / Concepts', 'Term.',
      '## Risks And Limitations', 'Risk.',
    ].join('\n'));
    try {
      const result = checkReferenceFormatFiles(listMatchingBundleFiles(dir, 'reference/*.md'), { bundlePath: dir });
      assert.equal(result.passed, false);
      assert.equal(result.findings.filter((finding) => /topic_binding/.test(finding.id)).length, 1);
      assert.match(result.findings.find((finding) => /topic_binding/.test(finding.id)).missing_fact, /conflict/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('accepts all required non-empty semantic sections in tolerant presentation', () => {
    const dir = join(__dirname, '.test-gh-ref-tolerant-sections');
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'topic-a-tolerant.md'), [
      '- source_url: https://example.com/news/a',
      '- acceptance_status: accepted',
      '- source_type: primary',
      '- tier: Tier 2',
      '- evidence_role: deepening_reference',
      '- trust_level: practitioner',
      '- why_it_matters: Relevant.',
      '- accessed_at: 2026-07-14',
      '- related_topic: topic-a',
      '',
      '#### risks and limitations',
      'Risk.',
      '### Quotable Terms / Concepts',
      'Term.',
      '## relevance to this research',
      'Relevant.',
      '##### CORE CONTENT CAPTURE',
      'Narrative.',
      '### key facts',
      'A factual paragraph.',
    ].join('\n'));
    try {
      const files = listMatchingBundleFiles(dir, 'reference/*topic-a*.md');
      const result = checkReferenceFormatFiles(files);
      assert.equal(result.passed, true, result.inspect.join('; '));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('accepts homepage-looking source URLs when URL-parseable', () => {
    const dir = join(__dirname, '.test-gh-ref-parseable-url');
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'topic-a-url.md'), [
      '- source_url: https://m-en.yna.co.kr/',
      '- acceptance_status: accepted',
      '',
      '## Key Facts',
      '- Fact',
    ].join('\n'));
    try {
      const files = listMatchingBundleFiles(dir, 'reference/*topic-a*.md');
      const result = checkReferenceSourceUrls(files);
      assert.equal(result.passed, true, result.inspect.join('; '));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects missing or invalid source URLs as metadata shape', () => {
    const dir = join(__dirname, '.test-gh-ref-invalid-url');
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'topic-a-url.md'), [
      '- source_url: not a url',
      '- acceptance_status: accepted',
      '',
      '## Key Facts',
      '- Fact',
    ].join('\n'));
    try {
      const files = listMatchingBundleFiles(dir, 'reference/*topic-a*.md');
      const result = checkReferenceSourceUrls(files);
      assert.equal(result.passed, false);
      assert.ok(result.inspect.some((line) => line.includes('Invalid metadata source_url')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('accepts canonical YAML frontmatter while keeping legacy metadata readable', () => {
    const dir = join(__dirname, '.test-gh-ref-yaml');
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'topic-a-canonical.md'), canonicalReferenceFrontmatter());
    try {
      const files = listMatchingBundleFiles(dir, 'reference/*topic-a*.md');
      const format = checkReferenceFormatFiles(files);
      const urls = checkReferenceSourceUrls(files);
      const canonical = readReferenceMetadata(readFileSync(join(dir, 'reference', 'topic-a-canonical.md'), 'utf8'));
      const legacy = readReferenceMetadata('- source_url: https://example.com/legacy\n- acceptance_status: accepted\n\n## Key Facts\n- Fact\n');

      assert.equal(format.passed, true, format.inspect.join('; '));
      assert.equal(urls.passed, true, urls.inspect.join('; '));
      assert.equal(canonical.presentation, 'frontmatter');
      assert.equal(canonical.metadata.get('source_url'), 'https://example.com/news/a');
      assert.equal(parseReferenceMetadata(readFileSync(join(dir, 'reference', 'topic-a-canonical.md'), 'utf8')).get('related_topic'), 'topic-a');
      assert.equal(legacy.presentation, 'legacy_bullets');
      assert.equal(legacy.metadata.get('source_url'), 'https://example.com/legacy');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('short-circuits malformed or non-mapping frontmatter at one metadata root', () => {
    const dir = join(__dirname, '.test-gh-ref-invalid-frontmatter');
    mkdirSync(join(dir, 'reference'), { recursive: true });
    const cases = {
      malformed: `---\nsource_url: [unterminated\n---\n${REFERENCE_SEMANTIC_BODY}`,
      non_mapping: `---\n- source_url: https://example.com/news/a\n---\n${REFERENCE_SEMANTIC_BODY}`,
    };
    try {
      for (const [name, content] of Object.entries(cases)) {
        const path = join(dir, 'reference', `topic-a-${name}.md`);
        writeFileSync(path, content);
        const file = { relPath: `reference/topic-a-${name}.md`, absPath: path };
        const metadata = readReferenceMetadata(content);
        const format = checkReferenceFormatFiles([file]);
        const urls = checkReferenceSourceUrls([file]);

        assert.equal(metadata.error?.code, 'reference_metadata_frontmatter_invalid');
        assert.equal(format.findings.filter((finding) => /metadata_frontmatter/.test(finding.id)).length, 1, format.inspect.join('\n'));
        assert.equal(format.findings.some((finding) => /:metadata:|topic_binding/.test(finding.id)), false, format.inspect.join('\n'));
        assert.equal(urls.findings.filter((finding) => /metadata_frontmatter/.test(finding.id)).length, 1, urls.inspect.join('\n'));
        assert.equal(urls.findings.some((finding) => /:missing|:empty/.test(finding.id)), false, urls.inspect.join('\n'));
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects filesystem reference files with no submitted backing', () => {
    const dir = join(__dirname, '.test-gh-ref-orphan');
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'topic-a-orphan.md'), '# Ref\n');
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), [
      JSON.stringify({ work_id: 'w1', output_files: [], cache_trails: [] }),
    ].join('\n') + '\n');
    try {
      const files = listMatchingBundleFiles(dir, 'reference/*topic-a*.md');
      const result = checkReferenceLedgerCoverage(dir, files);
      assert.equal(result.passed, false);
      assert.ok(result.inspect.some((i) => i.includes('projection_backing_drift')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('classifies a Wave1 topic reference as a backed Phase-owned projection', () => {
    const dir = tempWorkUnitBundle('gh-ref-wave1-backed-');
    try {
      const sourceUrl = 'https://example.com/research/topic-a-source';
      const cacheTrail = '_cache/wave1/primary/topic-a/s01_source';
      const evidencePath = 'artifacts/wave1/topic-a/evidence-summary.md';
      claimAndSubmitWorkUnit(dir, {
        phase: 'wave1',
        queueItemId: 'topic-a',
        outputs: [
          {
            path: evidencePath,
            role: 'evidence_summary',
            content: `# Evidence\n\n[Source](${sourceUrl})\n\n## Key Findings\n\n- Supported finding.\n`,
          },
          {
            path: 'artifacts/wave1/topic-a/question-list.md',
            role: 'question_list',
            content: '## Topic Investigation Targets\n\nTargets.\n\n## Question Reconciliation\n\nReconciled.\n\n## Emergent Question Protocol\n\nChecked.\n\n## Exploration / Exploitation Decision\n\nContinue.\n',
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
      mkdirSync(join(dir, 'reference'), { recursive: true });
      writeFileSync(join(dir, 'reference', 'topic-a-source.md'), canonicalReferenceFrontmatter({
        sourceUrl,
        relatedTopic: 'topic-a',
        coreContent: `This Phase-owned projection cites submitted backing ${evidencePath} and ${cacheTrail}. The capture text is long enough to satisfy the countable reference threshold while preserving source provenance.`,
      }));

      const classification = classifyReferenceAuthority(dir, 'reference/topic-a-source.md');
      assert.equal(classification.passed, true, classification.reason);
      assert.equal(classification.authority, 'phase_owned_projection');

      const files = listMatchingBundleFiles(dir, 'reference/*topic-a*.md');
      const result = checkReferenceLedgerCoverage(dir, files);
      assert.equal(result.passed, true, result.inspect.join('; '));
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('preserves a submitted legacy Wave0 reference and accepts an exact Phase-owned projection', () => {
    const legacyDir = tempWorkUnitBundle('gh-ref-wave0-legacy-');
    const projectionDir = tempWorkUnitBundle('gh-ref-wave0-backed-');
    try {
      const legacyUrl = 'https://example.com/research/wave0-legacy';
      claimAndSubmitWorkUnit(legacyDir, {
        legacyV1Assignment: true,
        outputs: [{
          path: 'reference/00-shared-legacy.md',
          role: 'reference',
          source_url: legacyUrl,
          source_slug: 'legacy',
          content: canonicalReferenceFrontmatter({ sourceUrl: legacyUrl, relatedTopic: 'all' }),
        }],
        cacheTrails: [{
          path: '_cache/wave0/primary/queue-a/legacy',
          url: legacyUrl,
        }],
      });
      const legacy = classifyReferenceAuthority(legacyDir, 'reference/00-shared-legacy.md');
      assert.equal(legacy.passed, true, legacy.reason);
      assert.equal(legacy.authority, 'delegated_fetched_evidence');

      writeWave0ProjectionProfile(projectionDir);
      const sourceUrl = 'https://example.com/research/wave0-duplicate';
      const sourceYamlRef = 'artifacts/wave0/topic-a/source.yaml';
      const cacheTrail = '_cache/wave0/primary/queue-a/duplicate';
      const submission = claimAndSubmitWorkUnit(projectionDir, {
        phase: 'wave0',
        outputs: [{ path: sourceYamlRef, role: 'source_yaml', content: wave0SourceYaml([sourceUrl, sourceUrl]) }],
        cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
      });
      const entryId = `${submission.record.work_id}/2`;
      mkdirSync(join(projectionDir, 'reference'), { recursive: true });
      writeFileSync(join(projectionDir, 'reference/00-shared-backed.md'), submittedWave0ProjectionContent({
        sourceUrl,
        entryId,
        sourceYamlRef,
        cacheTrail,
        resultRef: submission.record.paths.result_ref,
        workUnitRef: submission.record.paths.work_unit_dir,
      }));

      const backed = classifyReferenceAuthority(projectionDir, 'reference/00-shared-backed.md');
      assert.equal(backed.passed, true, backed.reason);
      assert.equal(backed.authority, 'phase_owned_projection');
      assert.deepEqual(backed.source_identity, {
        work_id: submission.record.work_id,
        entry_id: entryId,
        source_ordinal: 2,
      });
    } finally {
      cleanupWorkUnitBundle(legacyDir);
      cleanupWorkUnitBundle(projectionDir);
    }
  });

  it('rejects URL-only, ambiguous, filesystem-only, and index-only Wave0 shared references', () => {
    const dir = tempWorkUnitBundle('gh-ref-wave0-unbacked-');
    try {
      writeWave0ProjectionProfile(dir);
      const sourceUrl = 'https://example.com/research/wave0-duplicate';
      const sourceYamlRef = 'artifacts/wave0/topic-a/source.yaml';
      const cacheTrail = '_cache/wave0/primary/queue-a/duplicate';
      const submission = claimAndSubmitWorkUnit(dir, {
        phase: 'wave0',
        outputs: [{ path: sourceYamlRef, role: 'source_yaml', content: wave0SourceYaml([sourceUrl, sourceUrl]) }],
        cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
      });
      const commonRefs = [sourceYamlRef, cacheTrail, submission.record.paths.result_ref, submission.record.paths.work_unit_dir].join(' ');
      mkdirSync(join(dir, 'reference'), { recursive: true });

      const refPath = join(dir, 'reference/00-shared-unbacked.md');
      writeFileSync(refPath, canonicalReferenceFrontmatter({
        sourceUrl,
        relatedTopic: 'all',
        coreContent: `URL-only projection cites ${commonRefs} but does not name a source identity.`,
      }));
      const urlOnly = classifyReferenceAuthority(dir, 'reference/00-shared-unbacked.md');
      assert.equal(urlOnly.passed, false);
      assert.equal(urlOnly.reason_code, 'wave0_source_identity_missing');

      writeFileSync(refPath, canonicalReferenceFrontmatter({
        sourceUrl,
        relatedTopic: 'all',
        coreContent: `Ambiguous duplicate URL identities ${submission.record.work_id}/1 and ${submission.record.work_id}/2 cite ${commonRefs}.`,
      }));
      const ambiguous = classifyReferenceAuthority(dir, 'reference/00-shared-unbacked.md');
      assert.equal(ambiguous.passed, false);
      assert.equal(ambiguous.reason_code, 'wave0_source_identity_ambiguous');

      writeFileSync(join(dir, 'reference/_INDEX.md'), [
        '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        '| 00-shared-index-only.md | primary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-20 |',
      ].join('\n'));
      writeFileSync(join(dir, 'reference/00-shared-index-only.md'), canonicalReferenceFrontmatter({
        sourceUrl,
        relatedTopic: 'all',
        coreContent: 'This file and its navigation row do not establish submitted backing.',
      }));
      const indexOnly = classifyReferenceAuthority(dir, 'reference/00-shared-index-only.md');
      assert.equal(indexOnly.passed, false);
      assert.equal(indexOnly.reason_code, 'wave0_source_identity_missing');
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('fails closed when _INDEX.md names a Wave1 reference with no submitted backing', () => {
    const dir = tempWorkUnitBundle('gh-ref-wave1-index-only-');
    try {
      mkdirSync(join(dir, 'reference'), { recursive: true });
      writeFileSync(join(dir, 'reference', '_INDEX.md'), [
        '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        '| reference/topic-a-source.md | primary | expert | Tier 2 | topic-a | wave1_topic | accepted | 2026-07-06 |',
      ].join('\n'));
      writeFileSync(join(dir, 'reference', 'topic-a-source.md'), referenceContent({
        source_url: 'https://example.com/research/unsubmitted',
        related_topic: 'topic-a',
        coreContent: 'This legal-looking reference has an index row, but no submitted source claim, cache trail, degraded capture, or accepted source URL backs it.',
      }));

      const classification = classifyReferenceAuthority(dir, 'reference/topic-a-source.md');
      assert.equal(classification.passed, false);
      assert.equal(classification.authority, 'unbacked_projection');
      assert.match(classification.reason, /projection_backing_drift/);
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('reports missing reference index rows separately from backing authority', () => {
    const dir = tempWorkUnitBundle('gh-ref-missing-index-');
    try {
      mkdirSync(join(dir, 'reference'), { recursive: true });
      writeFileSync(join(dir, 'reference', '_INDEX.md'), [
        '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        '| reference/other-source.md | primary | practitioner | Tier 2 | topic-b | wave1_topic | accepted | 2026-07-14 |',
      ].join('\n'));
      writeFileSync(join(dir, 'reference', 'topic-a-source.md'), referenceContent({
        source_url: 'https://example.com/research/source',
        related_topic: 'topic-a',
      }));

      const files = listMatchingBundleFiles(dir, 'reference/*topic-a*.md');
      const result = checkReferenceIndexCoverage(dir, files, { sourceLayer: 'wave1_topic' });
      assert.equal(result.passed, false);
      assert.match(result.inspect.join('\n'), /\[missing_index_row\]/);
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('short-circuits invalid reference index parent before per-file row checks', () => {
    const dir = join(__dirname, '.test-gh-ref-index-parent');
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', '_INDEX.md'), [
      '| ref_file | source_layer |',
      '| --- | --- |',
      '| reference/topic-a.md | wave1_topic |',
    ].join('\n'));
    const files = [
      { relPath: 'reference/topic-a.md', absPath: join(dir, 'reference/topic-a.md') },
      { relPath: 'reference/topic-b.md', absPath: join(dir, 'reference/topic-b.md') },
    ];
    try {
      const invalid = checkReferenceIndexCoverage(dir, files, { sourceLayer: 'wave1_topic' });
      assert.equal(invalid.passed, false);
      assert.equal(invalid.findings.length, 1);
      assert.match(invalid.findings[0].id, /index_table_invalid/);
      assert.equal(invalid.findings.some((finding) => /missing_row/.test(finding.id)), false);

      writeFileSync(join(dir, 'reference', '_INDEX.md'), [
        '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        '| reference/topic-a.md | primary | practitioner | Tier 2 | topic-a | wave1_topic | accepted | 2026-07-14 |',
      ].join('\n'));
      const validParent = checkReferenceIndexCoverage(dir, files, { sourceLayer: 'wave1_topic' });
      assert.equal(validParent.passed, false);
      assert.equal(validParent.findings.length, 1);
      assert.match(validParent.findings[0].id, /reference\/topic-b\.md:missing_row/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('cache coverage work-unit authority', () => {
  it('passes when a submitted work-unit ledger row declares a mapped cache leaf', () => {
    const dir = tempWorkUnitBundle('gh-cache-pass-');
    try {
      claimAndSubmitWorkUnit(dir, {
        legacyV1Assignment: true,
        outputs: [{
          path: 'reference/topic-a-source.md',
          role: 'reference',
          source_url: 'https://example.com/research/topic-a',
          source_slug: 's01_source',
          content: referenceContent({ source_url: 'https://example.com/research/topic-a' }),
        }],
        cacheTrails: [{
          path: '_cache/wave0/primary/topic-a/s01_source',
          url: 'https://example.com/research/topic-a',
        }],
      });
      const result = checkCacheCoverage(dir);
      assert.equal(result.passed, true, result.inspect.join('; '));
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('fails when raw reference declarations exist without submitted work-unit rows', () => {
    const dir = join(__dirname, '.test-gh-cache-raw');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), `${JSON.stringify({
      work_id: 'w1',
      output_files: [{ path: 'reference/a.md', role: 'reference', source_url: 'https://example.com/research/a' }],
      cache_trails: ['_cache/wave0/primary/a/s01_source'],
    })}\n`);
    try {
      const result = checkCacheCoverage(dir);
      assert.equal(result.passed, false);
      assert.ok(result.inspect.some((line) => line.includes('none are submitted work-unit ledger rows')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails when submitted cache trail files drift after submit', () => {
    const dir = tempWorkUnitBundle('gh-cache-drift-');
    try {
      claimAndSubmitWorkUnit(dir, {
        legacyV1Assignment: true,
        outputs: [{
          path: 'reference/topic-a-source.md',
          role: 'reference',
          source_url: 'https://example.com/research/article',
          source_slug: 's01_source',
          content: referenceContent({ source_url: 'https://example.com/research/article' }),
        }],
        cacheTrails: [{
          path: '_cache/wave0/primary/topic-a/s01_source',
          url: 'https://example.com/research/article',
        }],
      });
      rmSync(join(dir, '_cache/wave0/primary/topic-a/s01_source/meta.json'), { force: true });
      const result = checkCacheCoverage(dir);
      assert.equal(result.passed, false);
      assert.ok(result.inspect.some((line) => line.includes('missing files: meta.json')));
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('fails when submitted cache trail content is placeholder-only', () => {
    const dir = tempWorkUnitBundle('gh-cache-placeholder-');
    try {
      claimAndSubmitWorkUnit(dir, {
        legacyV1Assignment: true,
        outputs: [{
          path: 'reference/topic-a-source.md',
          role: 'reference',
          source_url: 'https://example.com/research/article',
          source_slug: 's01_source',
          content: referenceContent({ source_url: 'https://example.com/research/article' }),
        }],
        cacheTrails: [{
          path: '_cache/wave0/primary/topic-a/s01_source',
          url: 'https://example.com/research/article',
        }],
      });
      writeFileSync(join(dir, '_cache/wave0/primary/topic-a/s01_source/page.md'), '# Page\n');
      const result = checkCacheCoverage(dir);
      assert.equal(result.passed, false);
      assert.ok(result.inspect.some((line) => line.includes('incomplete cache content')));
      assert.ok(result.inspect.some((line) => line.includes('placeholder-only')));
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('names cache mapping rules and required leaf files when references do not map', () => {
    const dir = tempWorkUnitBundle('gh-cache-map-');
    try {
      claimAndSubmitWorkUnit(dir, {
        legacyV1Assignment: true,
        outputs: [{
          path: 'reference/topic-a-source.md',
          role: 'reference',
          source_url: 'https://example.com/research/topic-a',
          source_slug: 'topic-a-source',
          content: referenceContent({ source_url: 'https://example.com/research/topic-a' }),
        }],
        cacheTrails: [{
          path: '_cache/wave0/primary/topic-a/unrelated',
          url: 'https://example.com/research/other',
        }],
      });
      const result = checkCacheCoverage(dir);
      assert.equal(result.passed, false);
      const joined = result.inspect.join('\n');
      assert.match(joined, /reference\/topic-a-source\.md/);
      assert.match(joined, /source_url: https:\/\/example\.com\/research\/topic-a/);
      assert.match(joined, /meta\.json\.url\/source_url\/final_url\/fetched_url or source_slug/);
      assert.match(joined, /websearch\.json, page\.md, meta\.json/);
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });
});
