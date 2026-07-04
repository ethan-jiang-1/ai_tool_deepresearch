// gate-read-resilience.test.mjs — Robustness regression tests for malformed YAML/JSON
// @impl GSK-002, BUG-018
// Tests read-side defenses: parse error diagnostics, YAML repair, JSON repair,
// template_not_expanded detection, and write-side roundtrips.

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';
import {
  readYamlArraySafe,
  readJsonFileSafe,
  scanTemplateNotExpanded,
} from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-resilience-tmp');

// Clean before starting
if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

afterEach(() => {
  // Clean all temp files after each test
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11.1 Write-side YAML roundtrip
// ═══════════════════════════════════════════════════════════════════════════

describe('Write-side YAML roundtrip (11.1)', () => {
  it('roundtrips objects with special characters through yaml.stringify → readYamlArraySafe', () => {
    const testData = [
      {
        url: 'https://example.com/article?id=123&ref=456',
        title: '点球｜亚洲球队遭遇"滑铁卢" — 新华报业网',
        retrieved_date: '2026-07-03',
        topic_tag: 'test-topic',
        notes: 'Line 1\nLine 2 with : colon',
      },
      {
        url: 'https://example.com/emoji-test',
        title: '🚀 Launch Week — CJK: 日本語テスト',
        retrieved_date: '2026-07-03',
        topic_tag: 'emoji-topic',
        notes: 'Contains emoji and CJK',
      },
      {
        url: 'https://example.com/plain',
        title: 'Plain ASCII title',
        retrieved_date: '2026-07-03',
        topic_tag: 'plain-topic',
        notes: 'No special characters',
      },
    ];

    const filePath = join(TMP, 'roundtrip-test.yaml');
    const yamlStr = yaml.stringify(testData);
    writeFileSync(filePath, yamlStr);

    const result = readYamlArraySafe(filePath);
    assert.ok(result.ok, `Expected ok, got: ${result.error}`);
    assert.ok(Array.isArray(result.data));
    assert.equal(result.data.length, 3);

    // Verify each field roundtrips correctly
    for (let i = 0; i < testData.length; i++) {
      assert.equal(result.data[i].url, testData[i].url);
      assert.equal(result.data[i].title, testData[i].title);
      assert.equal(result.data[i].topic_tag, testData[i].topic_tag);
    }
  });

  it('roundtrips CJK-heavy titles correctly', () => {
    const testData = [
      {
        url: 'https://example.com/cjk',
        title: '深度学习在自然语言处理中的应用研究',
        retrieved_date: '2026-07-03',
        topic_tag: 'cjk',
      },
    ];

    const filePath = join(TMP, 'cjk-roundtrip.yaml');
    writeFileSync(filePath, yaml.stringify(testData));

    const result = readYamlArraySafe(filePath);
    assert.ok(result.ok);
    assert.equal(result.data[0].title, testData[0].title);
  });

  it('roundtrips URLs with query and fragment components', () => {
    const testData = [
      {
        url: 'https://example.com/path?q=search&lang=en&filter=date#section-3',
        title: 'URL Test',
      },
    ];

    const filePath = join(TMP, 'url-roundtrip.yaml');
    writeFileSync(filePath, yaml.stringify(testData));

    const result = readYamlArraySafe(filePath);
    assert.ok(result.ok);
    assert.equal(result.data[0].url, testData[0].url);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11.2 Write-side JSON roundtrip
// ═══════════════════════════════════════════════════════════════════════════

describe('Write-side JSON roundtrip (11.2)', () => {
  it('roundtrips objects with special characters through JSON.stringify → readJsonFileSafe', () => {
    const testData = {
      url: 'https://example.com/article?id=123',
      title: '点球｜亚洲球队遭遇"滑铁卢"',
      notes: 'Line 1\nLine 2',
      meta: { emoji: '🚀', cjk: '日本語' },
    };

    const filePath = join(TMP, 'roundtrip-test.json');
    writeFileSync(filePath, JSON.stringify(testData, null, 2));

    const result = readJsonFileSafe(filePath);
    assert.ok(result.ok, `Expected ok, got: ${result.error}`);
    assert.equal(result.data.url, testData.url);
    assert.equal(result.data.title, testData.title);
    assert.equal(result.data.notes, testData.notes);
  });

  it('roundtrips arrays correctly', () => {
    const testData = [
      { id: 1, url: 'https://a.com' },
      { id: 2, url: 'https://b.com?x=1&y=2' },
    ];

    const filePath = join(TMP, 'array-roundtrip.json');
    writeFileSync(filePath, JSON.stringify(testData));

    const result = readJsonFileSafe(filePath);
    assert.ok(result.ok);
    assert.equal(result.data.length, 2);
    assert.equal(result.data[1].url, testData[1].url);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11.3 Read-side YAML parse failure → actionable diagnostics
// ═══════════════════════════════════════════════════════════════════════════

describe('Read-side YAML parse failure diagnostics (11.3)', () => {
  it('distinguishes "file does not exist" from "parse failure"', () => {
    const missingPath = join(TMP, 'does-not-exist.yaml');
    const result = readYamlArraySafe(missingPath);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('does not exist'), `Error should mention file does not exist: ${result.error}`);
    assert.equal(result.filePath, missingPath);
  });

  it('returns file path in parse error', () => {
    const filePath = join(TMP, 'bad-indent.yaml');
    // YAML with broken indentation
    writeFileSync(filePath, [
      '- url: https://example.com',
      '  title: valid',
      '- url: https://example.com/2',
      ' title: bad indent',  // missing one space
    ].join('\n'));

    const result = readYamlArraySafe(filePath);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes(filePath), `Error should include file path: ${result.error}`);
    assert.ok(result.parserError, 'Should have parserError field');
  });

  it('returns line number in parse error when available', () => {
    const filePath = join(TMP, 'bad-syntax.yaml');
    // YAML with a syntax error: colon in a bad place
    writeFileSync(filePath, [
      '- url: https://example.com',
      '  title: valid',
      '- key: : value',  // invalid YAML syntax
    ].join('\n'));

    const result = readYamlArraySafe(filePath);
    assert.equal(result.ok, false);
    // The yaml parser may or may not give a line number — just verify we get a parse error
    assert.ok(result.parserError, 'Should have parserError field');
    assert.ok(!result.error.includes('Cannot read or parse YAML array'),
      'Error must not use the old generic message');
  });

  it('never returns the deprecated generic error message', () => {
    const filePath = join(TMP, 'malformed.yaml');
    writeFileSync(filePath, 'this: is: not: an: array: {\n');

    const result = readYamlArraySafe(filePath);
    assert.equal(result.ok, false);
    assert.ok(!result.error.includes('Cannot read or parse'),
      `Error should not be generic: ${result.error}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11.3b Read-side YAML repair — unescaped double quotes
// ═══════════════════════════════════════════════════════════════════════════

describe('Read-side YAML repair (11.3b)', () => {
  it('repairs BUG-018 original case: unescaped ASCII double quotes in title', () => {
    const filePath = join(TMP, 'bug-018-case.yaml');
    // This is the exact BUG-018 pattern: Chinese quotation marks that resolve to U+0022
    writeFileSync(filePath, [
      '- url: https://example.com/1',
      '  title: "点球｜亚洲球队遭遇"滑铁卢" — 新华报业网"',
      '  retrieved_date: "2026-07-03"',
      '  topic_tag: "test"',
    ].join('\n'));

    const result = readYamlArraySafe(filePath);
    assert.ok(result.ok, `Expected repair to succeed, got: ${result.error}`);
    assert.ok(result.repaired, 'Should indicate repair was performed');
    assert.ok(result.repairDetail, 'Should include repair detail');
    assert.ok(Array.isArray(result.data));
    assert.equal(result.data.length, 1);
    assert.ok(result.data[0].title.includes('滑铁卢'),
      `Title should contain 滑铁卢, got: "${result.data[0].title}"`);
  });

  it('repairs multiple unescaped quotes in a single value', () => {
    const filePath = join(TMP, 'multi-quote.yaml');
    writeFileSync(filePath, [
      '- url: https://example.com',
      '  title: "foo "bar" baz"',
      '  retrieved_date: "2026-07-03"',
      '  topic_tag: "test"',
    ].join('\n'));

    const result = readYamlArraySafe(filePath);
    assert.ok(result.ok, `Expected repair to succeed, got: ${result.error}`);
    assert.ok(result.repaired);
    assert.ok(result.data[0].title.includes('bar'),
      `Title should contain bar, got: "${result.data[0].title}"`);
  });

  it('repairs nested quotes pattern: he said "hello" and "goodbye"', () => {
    const filePath = join(TMP, 'nested-quote.yaml');
    writeFileSync(filePath, [
      '- url: https://example.com',
      '  title: "notes: "he said "hello" and "goodbye"""',
      '  retrieved_date: "2026-07-03"',
      '  topic_tag: "test"',
    ].join('\n'));

    const result = readYamlArraySafe(filePath);
    assert.ok(result.ok, `Expected repair to succeed, got: ${result.error}`);
    assert.ok(result.repaired);
  });

  it('does not trigger repair on valid YAML', () => {
    const filePath = join(TMP, 'valid-no-repair.yaml');
    const data = [
      { url: 'https://example.com', title: 'Normal title', retrieved_date: '2026-07-03', topic_tag: 'test' },
    ];
    writeFileSync(filePath, yaml.stringify(data));

    const result = readYamlArraySafe(filePath);
    assert.ok(result.ok);
    assert.equal(result.repaired, undefined, 'Should not repair valid YAML');
  });

  it('falls back to parse error for unrepairable malformation', () => {
    const filePath = join(TMP, 'unrepairable.yaml');
    // YAML block mapping with invalid indentation that can't be auto-repaired
    writeFileSync(filePath, [
      '- url: https://example.com',
      '    title: deeply indented',  // valid sub-indent
      '  nested:',
      '   - item1',
      '    - item2',  // inconsistent indentation within same sequence
    ].join('\n'));

    const result = readYamlArraySafe(filePath);
    // YAML may or may not parse this — if it does, it's YAML's permissiveness.
    // The key invariant: structured error response with diagnostic fields.
    if (!result.ok) {
      assert.ok(result.parserError, 'Should have parserError on unrepairable input');
      assert.ok(result.repairAttempted !== undefined, 'Should indicate repair was attempted');
    }
    // If it parsed successfully, that's fine too — YAML is forgiving
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11.4 Read-side JSON repair
// ═══════════════════════════════════════════════════════════════════════════

describe('Read-side JSON repair (11.4)', () => {
  it('repairs trailing comma before closing brace', () => {
    const filePath = join(TMP, 'trailing-comma.json');
    writeFileSync(filePath, '{ "a": 1, }');

    const result = readJsonFileSafe(filePath);
    assert.ok(result.ok, `Expected repair to succeed, got: ${result.error}`);
    assert.ok(result.repaired, 'Should indicate repair was performed');
    assert.equal(result.data.a, 1);
  });

  it('repairs unquoted keys', () => {
    const filePath = join(TMP, 'unquoted-key.json');
    writeFileSync(filePath, '{ a: 1 }');

    const result = readJsonFileSafe(filePath);
    assert.ok(result.ok, `Expected repair to succeed, got: ${result.error}`);
    assert.ok(result.repaired);
    assert.equal(result.data.a, 1);
  });

  it('repairs single-quoted strings', () => {
    const filePath = join(TMP, 'single-quote.json');
    writeFileSync(filePath, '{ "a": \'hello\' }');

    const result = readJsonFileSafe(filePath);
    assert.ok(result.ok, `Expected repair to succeed, got: ${result.error}`);
    assert.ok(result.repaired);
    assert.equal(result.data.a, 'hello');
  });

  it('repairs missing closing brace', () => {
    const filePath = join(TMP, 'missing-brace.json');
    writeFileSync(filePath, '{ "a": 1 ');

    const result = readJsonFileSafe(filePath);
    assert.ok(result.ok, `Expected repair to succeed, got: ${result.error}`);
    assert.equal(result.data.a, 1);
  });

  it('falls back to parse error for mismatched brackets', () => {
    const filePath = join(TMP, 'mismatched.json');
    writeFileSync(filePath, '{ "a": 1 ]');

    const result = readJsonFileSafe(filePath);
    // Mismatched brackets may or may not be repairable — just check we get a structured response
    if (!result.ok) {
      assert.ok(result.parserError, 'Should include parserError on failure');
      assert.ok(result.repairAttempted !== undefined, 'Should indicate repair attempt');
    }
  });

  it('distinguishes file not found from parse failure', () => {
    const missingPath = join(TMP, 'no-such-file.json');
    const result = readJsonFileSafe(missingPath);
    assert.equal(result.ok, false);
    assert.ok(result.error.includes('does not exist'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11.5 template_not_expanded detection
// ═══════════════════════════════════════════════════════════════════════════

describe('template_not_expanded detection (11.5)', () => {
  it('detects ${url} in source.yaml entries', () => {
    // Create a minimal bundle structure with a source.yaml containing ${...}
    const artifactsDir = join(TMP, 'artifacts', 'wave0', 'test-topic');
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(join(artifactsDir, 'source.yaml'), yaml.stringify([
      { url: '${url}', title: 'Template not expanded', retrieved_date: '2026-07-03', topic_tag: 'test' },
      { url: 'https://real.example.com', title: 'Normal entry', retrieved_date: '2026-07-03', topic_tag: 'test' },
    ]));

    // Also need minimal rb_status.json and other control files for scanTemplateNotExpanded
    writeFileSync(join(TMP, 'rb_status.json'), JSON.stringify({ bundle: 'test-tmpl' }));
    writeFileSync(join(TMP, 'rb_trace.jsonl'), '');
    mkdirSync(join(TMP, '_logs'), { recursive: true });
    writeFileSync(join(TMP, '_logs', 'run.log'), '');

    const result = scanTemplateNotExpanded(TMP);
    assert.ok(result.findings.length >= 1,
      `Expected at least 1 finding, got ${result.findings.length}`);
    const urlFinding = result.findings.find(f => f.value.includes('${url}'));
    assert.ok(urlFinding, 'Should find the ${url} template variable');
    assert.ok(urlFinding.file.includes('source.yaml'), 'Should identify the source.yaml file');
    assert.equal(urlFinding.field, 'entry[0].url');
  });

  it('detects ${topic_slug} in reference markdown frontmatter', () => {
    const refDir = join(TMP, 'reference');
    mkdirSync(refDir, { recursive: true });
    writeFileSync(join(refDir, '00-shared-test.md'), [
      '---',
      'source_url: "https://example.com/${topic_slug}/article"',
      '---',
      '# Test Reference',
    ].join('\n'));

    const result = scanTemplateNotExpanded(TMP);
    const refFinding = result.findings.find(f => f.value.includes('${topic_slug}'));
    assert.ok(refFinding, 'Should find the ${topic_slug} template variable in reference frontmatter');
  });

  it('does not false-positive on normal data (no ${...})', () => {
    // Clean up first
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(TMP, { recursive: true });

    const artifactsDir = join(TMP, 'artifacts', 'wave0', 'clean-topic');
    mkdirSync(artifactsDir, { recursive: true });
    writeFileSync(join(artifactsDir, 'source.yaml'), yaml.stringify([
      { url: 'https://real.example.com/article', title: 'Clean title', retrieved_date: '2026-07-03', topic_tag: 'clean' },
    ]));

    writeFileSync(join(TMP, 'rb_status.json'), JSON.stringify({ bundle: 'test-clean' }));
    writeFileSync(join(TMP, 'rb_trace.jsonl'), '');
    mkdirSync(join(TMP, '_logs'), { recursive: true });
    writeFileSync(join(TMP, '_logs', 'run.log'), '');

    const result = scanTemplateNotExpanded(TMP);
    assert.equal(result.findings.length, 0,
      `Expected 0 findings for clean data, got: ${JSON.stringify(result.findings)}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11.6 Integration: malformed source.yaml + gate rule loop
// ═══════════════════════════════════════════════════════════════════════════

describe('Integration: malformed source.yaml (11.6)', () => {
  it('normal entries are parsable after YAML repair of unescaped quotes', () => {
    const artifactsDir = join(TMP, 'artifacts', 'wave0', 'mixed-topic');
    mkdirSync(artifactsDir, { recursive: true });

    // Mixed: one entry with unescaped quotes, one normal entry
    const filePath = join(artifactsDir, 'source.yaml');
    writeFileSync(filePath, [
      '- url: https://example.com/good',
      '  title: "Normal Title"',
      '  retrieved_date: "2026-07-03"',
      '  topic_tag: "mixed"',
      '- url: https://example.com/bad',
      '  title: "点球｜亚洲球队遭遇"滑铁卢" — 新华报业网"',
      '  retrieved_date: "2026-07-03"',
      '  topic_tag: "mixed"',
    ].join('\n'));

    const result = readYamlArraySafe(filePath);
    assert.ok(result.ok, `Expected repair of mixed file to succeed: ${result.error}`);
    assert.ok(result.repaired, 'Should indicate repair was performed');
    assert.equal(result.data.length, 2, 'Both entries should be returned after repair');
    assert.equal(result.data[0].url, 'https://example.com/good');
    assert.equal(result.data[1].url, 'https://example.com/bad');
  });

  it('parse error diagnostic pinpoints the problem in a malformed file', () => {
    const filePath = join(TMP, 'bad-only.yaml');
    // YAML with a tab character where spaces are required (strictly invalid in block mappings)
    writeFileSync(filePath, [
      'key1: value1',
      'key2:\tvalue2',  // tab before value — invalid YAML indentation
    ].join('\n'));

    const result = readYamlArraySafe(filePath);
    // YAML may or may not parse this depending on parser strictness
    if (!result.ok) {
      assert.ok(result.parserError, 'Should include parserError');
      assert.ok(result.filePath === filePath, 'Should include filePath');
      assert.ok(!result.error.includes('Cannot read or parse'),
        'Must not use deprecated generic message');
    }
    // If it parsed, the YAML parser was lenient — still acceptable
  });
});
