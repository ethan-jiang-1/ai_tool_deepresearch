// parse-md-frontmatter.test.mjs
// @impl FRE-003: anti-regression scan for JSON.parse in frontmatter contexts
//
// After the YAML 1.2 migration, gate CLIs, validate-bundle, and
// instantiate-run-bundle MUST NOT use hand-rolled `JSON.parse(m[1])`
// frontmatter parsing. All frontmatter parsing SHALL go through
// gate-helpers.mjs: parseMdFrontmatter() or readBundlePlan().
//
// This test scans the source files and fails if it detects JSON.parse
// used on a regex frontmatter match result.
//
// Legitimate JSON.parse uses (rb_status.json, rb_queue.json, JSONL,
// gate definition loading) are NOT flagged.

import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const FRAMEWORK_ROOT = join(import.meta.dirname, '../../../DPT_FRAMEWORK');

// ── Files to scan ──────────────────────────────────────────────────────

const SCAN_DIRS = [
  { dir: join(FRAMEWORK_ROOT, 'cli/gates'),         label: 'gate CLI' },
  { dir: join(FRAMEWORK_ROOT, 'cli'),               label: 'validate/instantiate (specific files only)' },
];

const CLI_DIR_FILES = [
  'validate-bundle.mjs',
  'instantiate-run-bundle.mjs',
];

function collectScanTargets() {
  const targets = [];
  // Gate CLI dir: all .mjs files
  if (SCAN_DIRS[0]) {
    const gateDir = SCAN_DIRS[0].dir;
    try {
      const files = readdirSync(gateDir).filter(f => extname(f) === '.mjs');
      for (const f of files) {
        targets.push({ path: join(gateDir, f), label: `gate CLI: ${f}` });
      }
    } catch { /* dir missing */ }
  }
  // CLI dir: only validate-bundle.mjs and instantiate-run-bundle.mjs
  for (const f of CLI_DIR_FILES) {
    targets.push({ path: join(FRAMEWORK_ROOT, 'cli', f), label: `CLI: ${f}` });
  }
  return targets;
}

// ── Detection logic ────────────────────────────────────────────────────

/**
 * Check whether a file contains JSON.parse used in a frontmatter context.
 *
 * Detection strategy:
 *   1. Find all lines containing `JSON.parse(`.
 *   2. For each match, scan the preceding lines (within a window) for a
 *      regex literal that looks like a frontmatter delimiter match:
 *        - `/^---\n/`  or  `/^---/`  or  `match(/^---`
 *   3. If both are found within the same function scope, flag as violation.
 *
 * Legitimate JSON.parse uses like `JSON.parse(readFileSync(...))` for
 * rb_status.json, rb_queue.json, or JSONL parsing are not preceded by
 * frontmatter regex patterns, so they won't match.
 *
 * @param {string} content - file content
 * @returns {{ line: number, text: string }[]} violations
 */
function findFrontmatterJsonParse(content) {
  const lines = content.split('\n');
  const violations = [];

  // Find all JSON.parse lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('JSON.parse(')) continue;

    // Skip lines that are clearly NOT frontmatter parsing:
    // - JSON.parse(readFileSync(...)) — rb_status.json, rb_queue.json
    // - JSON.parse(raw) — gate definition loading, JSONL parsing
    if (line.includes('JSON.parse(readFileSync') || line.includes('JSON.parse(raw)')) {
      continue;
    }

    // Check preceding lines (window of 10 lines) for frontmatter regex
    const windowStart = Math.max(0, i - 10);
    let hasFrontmatterRegex = false;
    for (let j = windowStart; j < i; j++) {
      const prevLine = lines[j];
      // Match frontmatter delimiter regex patterns:
      //   /^---\n([\s\S]*?)\n---/
      //   /^---\n([\s\S]*?\n)---/
      //   match(/^---/
      if (prevLine.includes('/^---') || prevLine.includes("match(/^---")) {
        hasFrontmatterRegex = true;
        break;
      }
    }

    if (hasFrontmatterRegex) {
      violations.push({ line: i + 1, text: line.trim() });
    }
  }

  return violations;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('FRE-003 anti-regression: no JSON.parse for frontmatter', () => {
  const targets = collectScanTargets();

  for (const target of targets) {
    it(`${target.label} has no JSON.parse frontmatter usage`, () => {
      let content;
      try {
        content = readFileSync(target.path, 'utf-8');
      } catch {
        // File doesn't exist — skip (not all gate CLIs may exist yet)
        return;
      }

      const violations = findFrontmatterJsonParse(content);
      assert.deepStrictEqual(
        violations,
        [],
        `${target.label} has JSON.parse used in frontmatter context:\n` +
          violations.map(v => `  line ${v.line}: ${v.text}`).join('\n') +
          '\n\nReplace with parseMdFrontmatter() or readBundlePlan() from gate-helpers.mjs (FRE-003).'
      );
    });
  }
});

// ── Structural verification: gate-helpers exports parseMdFrontmatter ────

describe('FRE-003 structural: gate-helpers exports shared functions', () => {
  it('gate-helpers.mjs exports parseMdFrontmatter', async () => {
    const mod = await import(
      join(FRAMEWORK_ROOT, 'engine/helpers/gate-helpers.mjs')
    );
    assert.strictEqual(
      typeof mod.parseMdFrontmatter,
      'function',
      'gate-helpers.mjs must export parseMdFrontmatter'
    );
  });

  it('gate-helpers.mjs exports readBundlePlan', async () => {
    const mod = await import(
      join(FRAMEWORK_ROOT, 'engine/helpers/gate-helpers.mjs')
    );
    assert.strictEqual(
      typeof mod.readBundlePlan,
      'function',
      'gate-helpers.mjs must export readBundlePlan'
    );
  });
});

// ── Functional verification: parseMdFrontmatter behaviour ──────────────

describe('FRE-003 functional: parseMdFrontmatter behaviour', () => {
  async function loadHelpers() {
    const mod = await import(
      join(FRAMEWORK_ROOT, 'engine/helpers/gate-helpers.mjs')
    );
    return { parseMdFrontmatter: mod.parseMdFrontmatter, readBundlePlan: mod.readBundlePlan };
  }

  it('parses JSON frontmatter (backward compatible)', async () => {
    const { parseMdFrontmatter } = await loadHelpers();
    const input = '---\n{"slug":"x","title":"y"}\n---\n\n# Body';
    const result = parseMdFrontmatter(input);
    assert.deepStrictEqual(result, { slug: 'x', title: 'y' });
  });

  it('parses YAML frontmatter', async () => {
    const { parseMdFrontmatter } = await loadHelpers();
    const input = '---\nslug: x\ntitle: y\n---\n\n# Body';
    const result = parseMdFrontmatter(input);
    assert.deepStrictEqual(result, { slug: 'x', title: 'y' });
  });

  it('returns {} for missing frontmatter', async () => {
    const { parseMdFrontmatter } = await loadHelpers();
    const input = '# Just a heading\n\nNo frontmatter here.';
    const result = parseMdFrontmatter(input);
    assert.deepStrictEqual(result, {});
  });

  it('handles complex YAML frontmatter with nested objects', async () => {
    const { parseMdFrontmatter } = await loadHelpers();
    const input =
      '---\n' +
      'slug: "01_test"\n' +
      'title: "Test Topic"\n' +
      'search_guardrails:\n' +
      '  required_terms:\n' +
      '    - "term1"\n' +
      '    - "term2"\n' +
      '  forbidden_broadening:\n' +
      '    - "noise"\n' +
      '---\n\n# Body';
    const result = parseMdFrontmatter(input);
    assert.strictEqual(result.slug, '01_test');
    assert.strictEqual(result.title, 'Test Topic');
    assert.deepStrictEqual(result.search_guardrails.required_terms, ['term1', 'term2']);
    assert.deepStrictEqual(result.search_guardrails.forbidden_broadening, ['noise']);
  });
});
