// gate-helpers-checks.test.mjs
// Tests for gate-helpers-checks.mjs: Gate rule checks — reference validation,
// content_dedup, cache_coverage, similarity helpers.
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  tokenizeForSimilarity,
  jaccardSimilarity,
  extractSection,
  isHomepageUrl,
  checkContentDedup,
  listMatchingBundleFiles,
  checkReferenceFormatFiles,
  checkReferenceLedgerCoverage,
} from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-gate-helpers-checks-tmp');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// Content Dedup (Stage 3) — tokenize / jaccard / extractSection
// ═══════════════════════════════════════════════════════════════════════════

describe('tokenizeForSimilarity', () => {
  it('tokenizes Chinese text into bigrams', () => {
    const tokens = tokenizeForSimilarity('年轻人消费平替趋势明显');
    assert.ok(tokens.includes('年轻'));
    assert.ok(tokens.includes('消费'));
    assert.ok(tokens.includes('平替'));
    assert.ok(tokens.includes('趋势'));
  });

  it('tokenizes English text into lowercase words', () => {
    const tokens = tokenizeForSimilarity('Young consumers prefer affordable alternatives');
    assert.ok(tokens.includes('young'));
    assert.ok(tokens.includes('consumers'));
    assert.ok(tokens.includes('affordable'));
  });

  it('returns empty array for empty input', () => {
    assert.deepEqual(tokenizeForSimilarity(''), []);
    assert.deepEqual(tokenizeForSimilarity(null), []);
  });
});

describe('jaccardSimilarity', () => {
  it('returns 1 for identical token sets', () => {
    assert.strictEqual(jaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'c']), 1);
  });

  it('returns 0 for disjoint sets', () => {
    assert.strictEqual(jaccardSimilarity(['a', 'b'], ['c', 'd']), 0);
  });

  it('returns ~0.5 for half overlap', () => {
    const sim = jaccardSimilarity(['a', 'b', 'c'], ['b', 'c', 'd', 'e']);
    assert.ok(sim > 0.3 && sim < 0.6, `expected ~0.5, got ${sim}`);
  });

  it('returns 1 for both empty', () => {
    assert.strictEqual(jaccardSimilarity([], []), 1);
  });
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

// ═══════════════════════════════════════════════════════════════════════════
// checkContentDedup
// ═══════════════════════════════════════════════════════════════════════════

describe('checkContentDedup', () => {
  it('fails closed when ledger is missing', () => {
    const dir = join(__dirname, '.test-gh-cd-empty');
    mkdirSync(dir, { recursive: true });
    try {
      const result = checkContentDedup(dir);
      assert.strictEqual(result.passed, false);
      assert.ok(result.inspect.some((i) => i.includes('missing or empty')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects URL duplicates via normalization', () => {
    const dir = join(__dirname, '.test-gh-cd-url');
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'a.md'), '## Key Facts\n\nReal facts A.\n');
    writeFileSync(join(dir, 'reference', 'b.md'), '## Key Facts\n\nReal facts B.\n');
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), [
      JSON.stringify({ work_id: 'w1', output_files: [{ path: 'reference/a.md', role: 'reference', source_url: 'https://example.com/news/article' }], cache_trails: [] }),
      JSON.stringify({ work_id: 'w2', output_files: [{ path: 'reference/b.md', role: 'reference', source_url: 'https://example.com/news/article/' }], cache_trails: [] }),
    ].join('\n') + '\n');
    try {
      const result = checkContentDedup(dir);
      assert.strictEqual(result.passed, false);
      assert.ok(result.inspect.some((i) => i.includes('URL duplicate')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects homepage URLs', () => {
    const dir = join(__dirname, '.test-gh-cd-home');
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'hp.md'), '## Key Facts\n\nSome facts.\n');
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), [
      JSON.stringify({ work_id: 'w1', output_files: [{ path: 'reference/hp.md', role: 'reference', source_url: 'https://www.chinanews.com.cn/' }], cache_trails: [] }),
    ].join('\n') + '\n');
    try {
      const result = checkContentDedup(dir);
      assert.strictEqual(result.passed, false);
      assert.ok(result.inspect.some((i) => i.includes('Homepage URL')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects self-referential Key Facts', () => {
    const dir = join(__dirname, '.test-gh-cd-self');
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'self.md'), '## Key Facts\n\nThis reference supplements the wave1 deepening evidence.\n');
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), [
      JSON.stringify({ work_id: 'w1', output_files: [{ path: 'reference/self.md', role: 'reference', source_url: 'https://example.com/news/a' }], cache_trails: [] }),
    ].join('\n') + '\n');
    try {
      const result = checkContentDedup(dir);
      assert.strictEqual(result.passed, false);
      assert.ok(result.inspect.some((i) => i.includes('Self-referential')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects Jaccard clones', () => {
    const dir = join(__dirname, '.test-gh-cd-jac');
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, 'reference'), { recursive: true });
    const sameText = '## Key Facts\n\n年轻人消费平替趋势明显。国潮品牌市场份额增长。新能源汽车销量突破千万。\n';
    writeFileSync(join(dir, 'reference', 'clone1.md'), sameText);
    writeFileSync(join(dir, 'reference', 'clone2.md'), sameText);
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), [
      JSON.stringify({ work_id: 'w1', output_files: [{ path: 'reference/clone1.md', role: 'reference', source_url: 'https://a.com/news/1' }], cache_trails: [] }),
      JSON.stringify({ work_id: 'w2', output_files: [{ path: 'reference/clone2.md', role: 'reference', source_url: 'https://b.com/news/2' }], cache_trails: [] }),
    ].join('\n') + '\n');
    try {
      const result = checkContentDedup(dir, { jaccard: 0.8 });
      assert.strictEqual(result.passed, false);
      assert.ok(result.inspect.some((i) => i.includes('Jaccard clone')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('passes clean declared references', () => {
    const dir = join(__dirname, '.test-gh-cd-clean');
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'r1.md'), '## Key Facts\n\n中国新能源汽车销量突破 1000 万辆。比亚迪市场份额领先。\n');
    writeFileSync(join(dir, 'reference', 'r2.md'), '## Key Facts\n\n日本电子产业出口额增长 15%。半导体需求旺盛。\n');
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), [
      JSON.stringify({ work_id: 'w1', output_files: [{ path: 'reference/r1.md', role: 'reference', source_url: 'https://auto.example.com/news/ev-2024' }], cache_trails: [] }),
      JSON.stringify({ work_id: 'w2', output_files: [{ path: 'reference/r2.md', role: 'reference', source_url: 'https://electronics.example.com/news/japan-2024' }], cache_trails: [] }),
    ].join('\n') + '\n');
    try {
      const result = checkContentDedup(dir, { jaccard: 0.8, url_dedup: true, homepage_detect: true, self_ref_detect: true });
      assert.strictEqual(result.passed, true, `Expected pass but got: ${result.inspect.join('; ')}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails closed when ledger has no reference declarations', () => {
    const dir = join(__dirname, '.test-gh-cd-noref');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), [
      JSON.stringify({ work_id: 'w1', output_files: [{ path: 'artifacts/wave1/topic/evidence-summary.md', role: 'evidence_summary' }], cache_trails: [] }),
    ].join('\n') + '\n');
    try {
      const result = checkContentDedup(dir);
      assert.strictEqual(result.passed, false);
      assert.ok(result.inspect.some((i) => i.includes('no role=reference')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Reference file gate helpers — isHomepageUrl, checkReferenceFormatFiles,
// checkReferenceLedgerCoverage, listMatchingBundleFiles
// ═══════════════════════════════════════════════════════════════════════════

describe('reference file gate helpers', () => {
  it('treats shallow paths as homepage URLs', () => {
    assert.equal(isHomepageUrl('https://m-en.yna.co.kr/'), true);
    assert.equal(isHomepageUrl('https://m-en.yna.co.kr/news/'), true);
    assert.equal(isHomepageUrl('https://m-en.yna.co.kr/view/AEN20260113007053315'), false);
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
