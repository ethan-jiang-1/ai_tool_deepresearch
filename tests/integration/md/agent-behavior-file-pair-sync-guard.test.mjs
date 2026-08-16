// agent-behavior-file-pair-sync-guard.test.mjs
// Deterministic byte-level sync guard for the AGENTS.md/CLAUDE.md pairs.
// Root pair and Harness pair must stay byte-identical modulo their
// tool-specific title lines (first three lines).
// @impl ACR-002, ACR-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');

function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

// Tool-specific title block: line 1 = file title, line 2 = blank, line 3 = tool notes.
function body(text) {
  return text.split('\n').slice(3).join('\n');
}

function firstDifference(a, b) {
  const la = a.split('\n');
  const lb = b.split('\n');
  const max = Math.max(la.length, lb.length);
  for (let i = 0; i < max; i++) {
    if (la[i] !== lb[i]) return `line ${i + 4} (1-based, after the stripped title block)`;
  }
  return null;
}

describe('AGENTS.md/CLAUDE.md behavior-file pair sync guard', () => {
  it('keeps the repo-root pair byte-identical modulo the tool-specific title lines', () => {
    const agents = body(read('AGENTS.md'));
    const claude = body(read('CLAUDE.md'));
    assert.equal(
      agents,
      claude,
      `root pair drifted at ${firstDifference(agents, claude)}; apply every edit to both files`,
    );
  });

  it('keeps the Harness pair byte-identical modulo the tool-specific title lines', () => {
    const agents = body(read('DEEP_RESEARCH_HARNESS/AGENTS.md'));
    const claude = body(read('DEEP_RESEARCH_HARNESS/CLAUDE.md'));
    assert.equal(
      agents,
      claude,
      `Harness pair drifted at ${firstDifference(agents, claude)}; apply every edit to both files`,
    );
  });
});
