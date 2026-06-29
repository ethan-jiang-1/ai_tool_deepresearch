// gate-helpers.test.mjs
// Tests for shared validation helpers used by checkGate and forkGate.
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateState, validateRules, zodErrors, writeGateAttempt,
  tokenizeForSimilarity, jaccardSimilarity, extractSection,
  readOutputDeclarations, checkContentDedup, isHomepageUrl,
  listMatchingBundleFiles, checkReferenceFormatFiles, checkReferenceLedgerCoverage,
} from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-gate-helpers-tmp');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

const CALLER = 'testFn';

describe('validateState', () => {
  it('passes for plain object', () => {
    assert.doesNotThrow(() => validateState({ a: 1 }, CALLER));
  });

  it('throws for null', () => {
    assert.throws(() => validateState(null, CALLER), /state 必须是普通对象/);
  });

  it('throws for array', () => {
    assert.throws(() => validateState([1, 2], CALLER), /state 必须是普通对象/);
  });

  it('throws for string', () => {
    assert.throws(() => validateState('hello', CALLER), /state 必须是普通对象/);
  });

  it('throws for number', () => {
    assert.throws(() => validateState(42, CALLER), /state 必须是普通对象/);
  });

  it('includes caller name in error', () => {
    assert.throws(() => validateState(null, 'myFunc'), /myFunc: state 必须是普通对象/);
  });
});

describe('validateRules', () => {
  it('passes for valid check rules', () => {
    assert.doesNotThrow(() => validateRules([{ key: 'k', check: s => true, say: 'bad' }], CALLER));
  });

  it('passes for valid schema rules', () => {
    assert.doesNotThrow(() => validateRules([{ key: 'k', schema: z.object({ x: z.number() }), say: 'bad' }], CALLER));
  });

  it('passes for combined schema + check', () => {
    assert.doesNotThrow(() => validateRules([{ key: 'k', schema: z.object({}), check: s => true, say: 'ok' }], CALLER));
  });

  it('throws on empty array', () => {
    assert.throws(() => validateRules([], CALLER), /rules 必须是非空数组/);
  });

  it('throws when key is empty string', () => {
    assert.throws(() => validateRules([{ key: '', check: s => true, say: 'bad' }], CALLER), /key.*非空字符串/);
  });

  it('throws when key is missing', () => {
    assert.throws(() => validateRules([{ check: s => true, say: 'bad' }], CALLER), /key.*非空字符串/);
  });

  it('throws when say is missing', () => {
    assert.throws(() => validateRules([{ key: 'k', check: s => true }], CALLER), /say.*必须是字符串/);
  });

  it('throws when neither schema nor check provided', () => {
    assert.throws(() => validateRules([{ key: 'k', say: 'bad' }], CALLER), /必须提供 schema 或 check/);
  });

  it('throws when schema has no safeParse', () => {
    assert.throws(() => validateRules([{ key: 'k', schema: {}, say: 'bad' }], CALLER), /schema 必须是 Zod schema/);
  });

  it('throws when check is not a function', () => {
    assert.throws(() => validateRules([{ key: 'k', check: 'x', say: 'bad' }], CALLER), /check.*必须是函数/);
  });

  it('includes rule index in error for bad key', () => {
    assert.throws(() => validateRules([{ key: 'ok', check: s => true, say: 'ok' }, { key: '', check: s => true, say: 'bad' }], CALLER), /rules\[1\]/);
  });

  it('includes caller name in error', () => {
    assert.throws(() => validateRules([], 'myFn'), /myFn: rules 必须是非空数组/);
  });
});

describe('zodErrors', () => {
  it('maps ZodError to flat diagnostics', () => {
    const parsed = z.object({ ref_count: z.number() }).safeParse({ ref_count: 'bad' });
    const errors = zodErrors(parsed.error);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].field, 'ref_count');
    assert.equal(errors[0].code, 'invalid_type');
    assert.ok(typeof errors[0].message === 'string');
  });

  it('handles nested paths', () => {
    const s = z.object({ nested: z.object({ val: z.number() }) });
    const parsed = s.safeParse({ nested: { val: 'bad' } });
    const errors = zodErrors(parsed.error);
    assert.equal(errors[0].field, 'nested.val');
  });

  it('includes received and expected fields', () => {
    const parsed = z.object({ x: z.number() }).safeParse({ x: 'bad' });
    const errors = zodErrors(parsed.error);
    assert.ok(errors.length >= 1);
    assert.equal(errors[0].code, 'invalid_type');
    assert.equal(typeof errors[0].field, 'string');
    assert.equal(typeof errors[0].message, 'string');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// writeGateAttempt — GSK-005, TRW-003
// ═══════════════════════════════════════════════════════════════════════════

function setupBundle(bundleName) {
  const bundleDir = join(TMP, `dpt_rb_${bundleName}`);
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(join(bundleDir, 'rb_status.json'), JSON.stringify({ bundle: bundleName }));
  return bundleDir;
}

function makeGateResult(passed, gate = 'test-gate') {
  return {
    check: { passed, gate, currentNodeRef: 'phases/phase-test.md', next: passed ? 'phases/phase-next.md' : null },
    routing: { kind: passed ? 'next' : 'retry', next: passed ? 'phases/phase-next.md' : null },
    inspect: passed ? [] : ['rule 1 failed'],
    advice: passed ? [] : ['fix rule 1'],
  };
}

describe('writeGateAttempt (GSK-005, TRW-003)', () => {
  it('writes gate_attempt to rb_trace.jsonl with bundle field', () => {
    const b = setupBundle('test-gate-trace');
    const result = makeGateResult(true);
    writeGateAttempt(b, result);

    const tracePath = join(b, 'rb_trace.jsonl');
    assert.ok(existsSync(tracePath));
    const content = readFileSync(tracePath, 'utf-8');
    const entry = JSON.parse(content.trim().split('\n')[0]);
    assert.strictEqual(entry.event, 'gate_attempt');
    assert.strictEqual(entry.gate, 'test-gate');
    assert.strictEqual(entry.passed, true);
    assert.strictEqual(entry.bundle, 'test-gate-trace');
  });

  it('writes gate_attempt to _logs/run.log with unified envelope and bundle', () => {
    const b = setupBundle('test-gate-log');
    const result = makeGateResult(false);
    writeGateAttempt(b, result);

    const logPath = join(b, '_logs', 'run.log');
    assert.ok(existsSync(logPath));
    const content = readFileSync(logPath, 'utf-8');
    assert.match(content, /^\[.+\] WARN gate_attempt bundle=test-gate-log/);
    assert.ok(content.includes('"gate":"test-gate"'));
  });

  it('PASS gate writes INFO level log', () => {
    const b = setupBundle('test-gate-pass');
    writeGateAttempt(b, makeGateResult(true));
    const content = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    assert.match(content, /INFO gate_attempt/);
  });

  it('FAIL gate writes WARN level log', () => {
    const b = setupBundle('test-gate-fail');
    writeGateAttempt(b, makeGateResult(false));
    const content = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    assert.match(content, /WARN gate_attempt/);
  });

  it('never throws when bundle dir does not exist', () => {
    assert.doesNotThrow(() => writeGateAttempt('/nonexistent/path', makeGateResult(true)));
  });

  it('bundle matches rb_status.json value', () => {
    const b = setupBundle('test-gate-match');
    writeGateAttempt(b, makeGateResult(true));

    const traceContent = readFileSync(join(b, 'rb_trace.jsonl'), 'utf-8');
    const traceEntry = JSON.parse(traceContent.trim().split('\n')[0]);
    assert.strictEqual(traceEntry.bundle, 'test-gate-match');

    const logContent = readFileSync(join(b, '_logs', 'run.log'), 'utf-8');
    assert.ok(logContent.includes('bundle=test-gate-match'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Content Dedup (Stage 3)
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

describe('readOutputDeclarations', () => {
  it('returns empty array when ledger file missing', () => {
    const dir = join(__dirname, '.test-gh-nonexistent');
    assert.deepEqual(readOutputDeclarations(dir), []);
  });

  it('reads declaration records from JSONL', () => {
    const dir = join(__dirname, '.test-gh-read-decl');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), [
      JSON.stringify({ work_id: 'w1', output_files: [{ path: 'ref/a.md', role: 'reference', source_url: 'https://a.com' }], cache_trails: [] }),
      JSON.stringify({ work_id: 'w2', output_files: [{ path: 'ref/b.md', role: 'evidence_summary' }], cache_trails: ['_cache/leaf/'] }),
    ].join('\n') + '\n');
    try {
      const decls = readOutputDeclarations(dir);
      assert.strictEqual(decls.length, 2);
      assert.strictEqual(decls[0].work_id, 'w1');
      assert.strictEqual(decls[1].work_id, 'w2');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

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
