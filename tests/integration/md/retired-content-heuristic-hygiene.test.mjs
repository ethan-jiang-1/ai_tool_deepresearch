import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const REPO_ROOT = join(import.meta.dirname, '../../..');

const SCAN_ROOTS = [
  'DPT_FRAMEWORK',
  'experiments_playbook',
  'experiments_env/shared',
  'guidelines',
  '_backlog/plans',
  'CHANGELOG.md',
  'README.md',
  'package.json',
];

const TOKEN_PATTERNS = [
  /\bcontent_dedup\b/i,
  /\bcheckContentDedup\b/,
  /\bjaccard\b/i,
  /\bsource_url_article_level\b/i,
  /\bsource_url_is_homepage\b/i,
  /\bduplicate URL\b/i,
  /\bURL duplicate\b/i,
  /\bself-reference\b/i,
  /\bself referential\b/i,
  /\bshallow URL\b/i,
  /\bpath-depth\b/i,
  /\bhomepage_detect\b/i,
  /\bisHomepageUrl\b/,
];

const SCANNED_EXTENSIONS = new Set(['.md', '.mjs', '.json', '.yaml', '.yml', '.js']);

function extensionOf(path) {
  const idx = path.lastIndexOf('.');
  return idx === -1 ? '' : path.slice(idx);
}

function walk(relPath, out = []) {
  const abs = join(REPO_ROOT, relPath);
  if (!existsSync(abs)) return out;
  const st = statSync(abs);
  if (st.isFile()) {
    if (SCANNED_EXTENSIONS.has(extensionOf(relPath))) out.push(relPath);
    return out;
  }
  if (!st.isDirectory()) return out;
  for (const entry of readdirSync(abs)) {
    if (entry === 'node_modules' || entry === '.git') continue;
    walk(join(relPath, entry), out);
  }
  return out;
}

describe('retired content heuristic hygiene', () => {
  it('keeps retired content heuristics out of current implementation and guidance surfaces', () => {
    const files = SCAN_ROOTS.flatMap((root) => walk(root));
    const violations = [];

    for (const rel of files) {
      const text = readFileSync(join(REPO_ROOT, rel), 'utf-8');
      for (const pattern of TOKEN_PATTERNS) {
        const regex = new RegExp(pattern.source, pattern.flags.includes('i') ? 'gi' : 'g');
        for (const match of text.matchAll(regex)) {
          const index = match.index ?? 0;
          const context = text.slice(Math.max(0, index - 80), Math.min(text.length, index + match[0].length + 80)).replace(/\s+/g, ' ');
          if (context.includes('checker-self-reference')) continue;
          violations.push(`${rel}: ${match[0]} :: ${context}`);
        }
      }
    }

    assert.deepEqual(violations, []);
  });
});
