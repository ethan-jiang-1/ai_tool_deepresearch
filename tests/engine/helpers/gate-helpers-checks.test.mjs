// gate-helpers-checks.test.mjs
// Tests for gate-helpers-checks.mjs: Gate rule checks — reference validation
// and cache_coverage.
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as gateHelpers from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import {
  extractSection,
  listMatchingBundleFiles,
  checkReferenceFormatFiles,
  checkReferenceSourceUrls,
  checkReferenceLedgerCoverage,
  checkCacheCoverage,
} from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  referenceContent,
  tempWorkUnitBundle,
} from '../work-unit-test-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-gate-helpers-checks-tmp');

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

  it('rejects YAML frontmatter reference format', () => {
    const dir = join(__dirname, '.test-gh-ref-yaml');
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'topic-a-bad.md'), '---\nsource_url: https://example.com/news/a\n---\n## Key Facts\n- Fact\n');
    try {
      const files = listMatchingBundleFiles(dir, 'reference/*topic-a*.md');
      const result = checkReferenceFormatFiles(files);
      assert.equal(result.passed, false);
      assert.ok(result.inspect.some((i) => i.includes('YAML frontmatter')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects filesystem reference files missing from ledger declarations', () => {
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
      assert.ok(result.inspect.some((i) => i.includes('not declared')));
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
