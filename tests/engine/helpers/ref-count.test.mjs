// ref-count.test.mjs
// Tests for isCountable() and countReferences() — quality-gated reference counting
// @impl EEX-001, EEX-002
import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isCountable, countReferences, QUALITY_THRESHOLDS } from '../../../DPT_FRAMEWORK/engine/helpers/ref-count.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  referenceContent,
  tempWorkUnitBundle,
} from '../work-unit-test-helpers.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '.test-rc-tmp');

after(() => {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

// ── Helper: build a reference file ──

function refContent(overrides = {}) {
  const defaults = {
    source_url: 'https://example.com/research/findings',
    acceptance_status: 'accepted',
    source_type: 'primary',
    tier: 'Tier 2',
    trust_level: 'expert',
    related_topic: 'topic-a',
    evidence_role: 'deepening_reference',
    why_it_matters: 'Key source for the research.',
    accessed_at: '2026-06-15',
    coreContent: 'This is a substantive core content capture section that provides meaningful analysis of the topic. It exceeds one hundred characters to satisfy the minimum quality threshold for reference counting.',
    keyFacts: [
      'Fact 1: Important finding about the topic.',
      'Fact 2: Second key insight from the source.',
      'Fact 3: Third data point supporting the argument.',
      'Fact 4: Fourth observation about trends.',
      'Fact 5: Fifth concluding fact.',
    ],
  };
  const opts = { ...defaults, ...overrides };
  return [
    `- source_url: ${opts.source_url}`,
    `- acceptance_status: ${opts.acceptance_status}`,
    `- source_type: ${opts.source_type}`,
    `- tier: ${opts.tier}`,
    `- trust_level: ${opts.trust_level}`,
    `- related_topic: ${opts.related_topic}`,
    `- evidence_role: ${opts.evidence_role}`,
    `- why_it_matters: ${opts.why_it_matters}`,
    `- accessed_at: ${opts.accessed_at}`,
    '',
    '## Key Facts',
    ...(Array.isArray(opts.keyFacts) ? opts.keyFacts.map(f => `- ${f}`) : [opts.keyFacts]),
    '',
    '## Core Content Capture',
    opts.coreContent,
    '',
    '## Relevance To This Research',
    'Relevant context.',
    '',
    '## Quotable Terms / Concepts',
    '- Term 1',
    '',
    '## Risks And Limitations',
    'Some limitations.',
  ].join('\n');
}

function setupBundle(name, refs = {}) {
  const dir = join(TMP, `dpt_rb_${name}`);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, 'reference'), { recursive: true });
  for (const [relPath, content] of Object.entries(refs)) {
    writeFileSync(join(dir, relPath), content);
  }
  return dir;
}

// ═══════════════════════════════════════════════════════════════════════════
// isCountable tests — 4 conditions
// ═══════════════════════════════════════════════════════════════════════════

describe('isCountable', () => {
  it('returns countable=true for a fully qualified reference', () => {
    const dir = setupBundle('rc-qualified', {
      'reference/qualified.md': refContent(),
    });
    const result = isCountable('reference/qualified.md', dir);
    assert.strictEqual(result.countable, true, `Expected countable but got: ${JSON.stringify(result)}`);
  });

  it('returns countable=false when Core Content Capture < 100 chars', () => {
    const dir = setupBundle('rc-thin-core', {
      'reference/thin.md': refContent({ coreContent: 'Too short.' }),
    });
    const result = isCountable('reference/thin.md', dir);
    assert.strictEqual(result.countable, false);
    assert.ok(result.reason.includes('core_content_capture_too_thin'), `Reason: ${result.reason}`);
  });

  it('returns countable=false when source_url is homepage', () => {
    const dir = setupBundle('rc-homepage', {
      'reference/homepage.md': refContent({ source_url: 'https://example.com/' }),
    });
    const result = isCountable('reference/homepage.md', dir);
    assert.strictEqual(result.countable, false);
    assert.ok(result.reason.includes('source_url_is_homepage'), `Reason: ${result.reason}`);
  });

  it('returns countable=false when source_url is shallow (depth < 2)', () => {
    const dir = setupBundle('rc-shallow', {
      'reference/shallow.md': refContent({ source_url: 'https://example.com/news/' }),
    });
    const result = isCountable('reference/shallow.md', dir);
    assert.strictEqual(result.countable, false);
    assert.ok(result.reason.includes('source_url_is_homepage'), `Reason: ${result.reason}`);
  });

  it('returns countable=false when Key Facts < 5 bullets', () => {
    const dir = setupBundle('rc-thin-facts', {
      'reference/thin-facts.md': refContent({
        keyFacts: ['Fact 1.', 'Fact 2.', 'Fact 3.'],
      }),
    });
    const result = isCountable('reference/thin-facts.md', dir);
    assert.strictEqual(result.countable, false);
    assert.ok(result.reason.includes('key_facts_insufficient'), `Reason: ${result.reason}`);
  });

  it('returns countable=false when acceptance_status is not "accepted"', () => {
    const dir = setupBundle('rc-rejected', {
      'reference/rejected.md': refContent({ acceptance_status: 'rejected' }),
    });
    const result = isCountable('reference/rejected.md', dir);
    assert.strictEqual(result.countable, false);
    assert.ok(result.reason.includes('acceptance_status_not_accepted'), `Reason: ${result.reason}`);
  });

  it('returns countable=false and does not throw for unparseable file', () => {
    const dir = setupBundle('rc-malformed', {
      'reference/malformed.md': 'not a valid reference file at all\njust raw text\nno metadata block',
    });
    let threw = false;
    let result;
    try {
      result = isCountable('reference/malformed.md', dir);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, false, 'isCountable should not throw on unparseable files');
    assert.strictEqual(result.countable, false);
    assert.ok(result.reason.includes('unparseable'), `Reason: ${result.reason}`);
  });

  it('returns countable=false and does not throw for missing file', () => {
    const dir = setupBundle('rc-missing', {});
    let threw = false;
    let result;
    try {
      result = isCountable('reference/nonexistent.md', dir);
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, false, 'isCountable should not throw on missing files');
    assert.strictEqual(result.countable, false);
    assert.strictEqual(result.reason, 'file_missing');
  });

  it('returns countable=false when source_url is missing entirely', () => {
    const dir = setupBundle('rc-no-url', {
      'reference/no-url.md': refContent({ source_url: '' }),
    });
    const result = isCountable('reference/no-url.md', dir);
    assert.strictEqual(result.countable, false);
    assert.ok(result.reason.includes('source_url_missing'), `Reason: ${result.reason}`);
  });

  it('returns countable=false when Key Facts section is missing', () => {
    const dir = setupBundle('rc-no-facts', {
      'reference/no-facts.md': [
        '- source_url: https://example.com/research/article',
        '- acceptance_status: accepted',
        '- source_type: primary',
        '- tier: Tier 2',
        '- trust_level: expert',
        '- related_topic: topic-a',
        '- evidence_role: deepening_reference',
        '- why_it_matters: Important.',
        '- accessed_at: 2026-06-15',
        '',
        '## Core Content Capture',
        'Substantive content that is definitely more than one hundred characters long for the purpose of testing. It discusses findings in detail.',
        '',
        '## Relevance To This Research',
        'Relevant.',
      ].join('\n'),
    });
    const result = isCountable('reference/no-facts.md', dir);
    assert.strictEqual(result.countable, false);
    assert.ok(result.reason.includes('key_facts_section_missing'), `Reason: ${result.reason}`);
  });

  it('returns countable=true with semicolon-delimited URLs where one is article-level', () => {
    const dir = setupBundle('rc-multi-url', {
      'reference/multi-url.md': refContent({
        source_url: 'https://example.com/;https://example.com/research/article',
      }),
    });
    const result = isCountable('reference/multi-url.md', dir);
    assert.strictEqual(result.countable, true, `Expected countable but got: ${JSON.stringify(result)}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// countReferences tests
// ═══════════════════════════════════════════════════════════════════════════

describe('countReferences', () => {
  it('returns zero count when no ledger file exists', () => {
    const dir = setupBundle('cr-no-ledger', {
      'reference/some-ref.md': refContent(),
    });
    const result = countReferences(dir);
    assert.strictEqual(result.count, 0);
    assert.strictEqual(result.uncountable.length, 1);
    assert.match(result.uncountable[0].reason, /filesystem_only_not_ledger_declared/);
  });

  it('returns zero count when ledger has no role=reference entries', () => {
    const dir = tempWorkUnitBundle('cr-no-refs-');
    try {
      claimAndSubmitWorkUnit(dir, {
        outputs: [{
          path: 'artifacts/wave0/topic-a/evidence-summary.md',
          role: 'evidence_summary',
          content: '# Evidence Summary\n',
        }],
      });
      const result = countReferences(dir);
      assert.strictEqual(result.count, 0);
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('counts only declared reference files that pass isCountable', () => {
    const dir = tempWorkUnitBundle('cr-mixed-');
    try {
      claimAndSubmitWorkUnit(dir, {
        outputs: [
          {
            path: 'reference/countable-1.md',
            role: 'reference',
            source_url: 'https://example.com/research/a',
            source_slug: 's01_source',
            content: referenceContent({ source_url: 'https://example.com/research/a' }),
          },
          {
            path: 'reference/countable-2.md',
            role: 'reference',
            source_url: 'https://example.com/research/b',
            source_slug: 's01_source',
            content: referenceContent({ source_url: 'https://example.com/research/b' }),
          },
          {
            path: 'reference/uncountable-homepage.md',
            role: 'reference',
            source_url: 'https://example.com/',
            source_slug: 's01_source',
            content: referenceContent({ source_url: 'https://example.com/' }),
          },
        ],
      });
      const result = countReferences(dir);
      assert.strictEqual(result.count, 2, `Expected 2 countable, got ${result.count}`);
      assert.strictEqual(result.uncountable.length, 1);
      assert.ok(result.uncountable[0].reason.includes('source_url_is_homepage'));
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('orphan reference does not affect ledger-mode count', () => {
    const dir = tempWorkUnitBundle('cr-orphan-');
    try {
      claimAndSubmitWorkUnit(dir, {
        outputs: [{
          path: 'reference/declared.md',
          role: 'reference',
          source_url: 'https://example.com/research/declared',
          source_slug: 's01_source',
          content: referenceContent({ source_url: 'https://example.com/research/declared' }),
        }],
      });
      writeFileSync(
        join(dir, 'reference/orphan.md'),
        referenceContent({ source_url: 'https://example.com/research/orphan' }),
      );
      const result = countReferences(dir);
      assert.strictEqual(result.count, 1, 'Orphan ref should not be counted in ledger mode');
      assert.ok(result.uncountable.some((entry) => entry.path === 'reference/orphan.md'));
      assert.ok(result.uncountable.some((entry) => entry.reason.includes('filesystem_only_not_ledger_declared')));
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('diagnostic filesystem mode discovers all reference/ md files', () => {
    const dir = setupBundle('cr-filesystem', {
      'reference/ref-a.md': refContent({ source_url: 'https://example.com/research/a' }),
      'reference/ref-b.md': refContent({ source_url: 'https://example.com/research/b' }),
    });
    const result = countReferences(dir, { source: 'filesystem' });
    assert.strictEqual(result.count, 2, `Expected 2 in filesystem mode, got ${result.count}`);
  });

  it('targetGlob filters candidates by glob pattern', () => {
    const dir = tempWorkUnitBundle('cr-glob-');
    try {
      claimAndSubmitWorkUnit(dir, {
        outputs: [
          {
            path: 'reference/00-shared-foundation.md',
            role: 'reference',
            source_url: 'https://example.com/research/shared',
            source_slug: 's01_source',
            content: referenceContent({ source_url: 'https://example.com/research/shared' }),
          },
          {
            path: 'reference/topic-a-specific.md',
            role: 'reference',
            source_url: 'https://example.com/research/topic-a',
            source_slug: 's01_source',
            content: referenceContent({ source_url: 'https://example.com/research/topic-a' }),
          },
        ],
      });
      const result = countReferences(dir, { targetGlob: 'reference/00-shared-*.md' });
      assert.strictEqual(result.count, 1, `Expected 1 with 00-shared glob, got ${result.count}`);
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('per-topic scoped count does not include other topic references', () => {
    const dir = tempWorkUnitBundle('cr-scoped-');
    try {
      claimAndSubmitWorkUnit(dir, {
        outputs: [
          {
            path: 'reference/topic-a-source.md',
            role: 'reference',
            source_url: 'https://example.com/research/topic-a',
            source_slug: 's01_source',
            content: referenceContent({
              source_url: 'https://example.com/research/topic-a',
              related_topic: 'topic-a',
            }),
          },
          {
            path: 'reference/topic-b-source.md',
            role: 'reference',
            source_url: 'https://example.com/research/topic-b',
            source_slug: 's01_source',
            content: referenceContent({
              source_url: 'https://example.com/research/topic-b',
              related_topic: 'topic-b',
            }),
          },
        ],
      });
      const result = countReferences(dir, { targetGlob: 'reference/*topic-a*.md', topic: 'topic-a' });
      assert.strictEqual(result.count, 1, `Expected 1 for topic-a scope, got ${result.count}`);
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('returns full audit transparency in uncountable array', () => {
    const dir = tempWorkUnitBundle('cr-audit-');
    try {
      claimAndSubmitWorkUnit(dir, {
        outputs: [
          {
            path: 'reference/good.md',
            role: 'reference',
            source_url: 'https://example.com/research/good',
            source_slug: 's01_source',
            content: referenceContent({ source_url: 'https://example.com/research/good' }),
          },
          {
            path: 'reference/bad-homepage.md',
            role: 'reference',
            source_url: 'https://example.com/',
            source_slug: 's01_source',
            content: referenceContent({ source_url: 'https://example.com/' }),
          },
          {
            path: 'reference/bad-thin.md',
            role: 'reference',
            source_url: 'https://example.com/research/thin',
            source_slug: 's01_source',
            content: referenceContent({
              source_url: 'https://example.com/research/thin',
              coreContent: 'Short.',
            }),
          },
        ],
      });
      const result = countReferences(dir);
      assert.strictEqual(result.count, 1, `Expected 1 countable, got ${result.count}`);
      assert.strictEqual(result.uncountable.length, 2, `Expected 2 uncountable, got ${result.uncountable.length}`);
      const reasons = result.uncountable.map(u => u.reason);
      assert.ok(reasons.some(r => r.includes('source_url_is_homepage')), 'Should report homepage reason');
      assert.ok(reasons.some(r => r.includes('core_content_capture_too_thin')), 'Should report thin content reason');
      for (const u of result.uncountable) {
        assert.ok(u.path, 'Each uncountable entry must have path');
        assert.ok(u.reason, 'Each uncountable entry must have reason');
      }
    } finally {
      cleanupWorkUnitBundle(dir);
    }
  });

  it('QUALITY_THRESHOLDS documents the 4 conditions', () => {
    assert.strictEqual(QUALITY_THRESHOLDS.core_content_capture_min_chars, 100);
    assert.strictEqual(QUALITY_THRESHOLDS.key_facts_min_bullets, 5);
    assert.strictEqual(QUALITY_THRESHOLDS.acceptance_status_required, 'accepted');
  });
});
