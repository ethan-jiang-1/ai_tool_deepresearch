#!/usr/bin/env node
// Read-only lock-discovery query for governed documents.
//
// Usage: node scripts/list-doc-locks.mjs <repo-relative-doc-path>
//
// Answers: which regression tests reference (and likely string-lock) a given
// governed document? Rewording a governed doc without checking this is how
// stale locks land red (see close-verification-landing-loop). This tool is a
// projection over test sources only; it creates no state and is not authority
// — the test files themselves remain the only truth about what they assert.
//
// Pure ESM, Node built-ins only.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TESTS_ROOT = 'tests';

const STRING_LITERAL = /['"`]([^'"`\n]{1,240})['"`]/g;

// Pure core. `files` is an array of { path, content }; `docPath` is a
// repo-relative document path such as 'DEEP_RESEARCH_HARNESS/AGENTS.md'.
// Each hit classifies how the line references the document:
// - 'exact': a string literal equals the queried path.
// - 'containing': a string literal strictly longer than the queried path
//   contains it (for example querying 'AGENTS.md' also surfaces references
//   to 'DEEP_RESEARCH_HARNESS/AGENTS.md'); reported, not hidden.
// - 'basename': a string literal equals only the final path segment.
// Each hit carries nearby assertion-looking lines as an excerpt.
export function findDocLocks({ docPath, files }) {
  const normalized = String(docPath).replace(/^\.\//, '');
  if (!normalized || normalized.includes('..')) return [];
  const basename = normalized.split('/').pop();
  const results = [];
  for (const file of files) {
    const lines = String(file.content).split(/\r?\n/);
    const hits = [];
    lines.forEach((line, index) => {
      let kind = null;
      for (const match of line.matchAll(STRING_LITERAL)) {
        const literal = match[1];
        if (literal === normalized) kind = 'exact';
        else if (literal !== basename && literal.includes(normalized)) kind ||= 'containing';
        else if (literal === basename) kind ||= 'basename';
      }
      if (!kind) return;
      const context = [lines[index - 1], line, lines[index + 1]]
        .filter((candidate) => candidate && /assert|\.match|includes|doesNotMatch|read/.test(candidate))
        .map((candidate) => candidate.trim())
        .join(' | ');
      hits.push({
        line: index + 1,
        kind,
        excerpt: context.slice(0, 240),
      });
    });
    if (hits.length > 0) results.push({ file: file.path, hits });
  }
  return results;
}

function listTestFiles(dir, accumulator = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'suspended') continue;
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      listTestFiles(full, accumulator);
    } else if (entry.endsWith('.test.mjs')) {
      accumulator.push(full);
    }
  }
  return accumulator;
}

function main([docPath]) {
  if (!docPath) {
    console.error('usage: node scripts/list-doc-locks.mjs <repo-relative-doc-path>');
    process.exitCode = 2;
    return;
  }
  const files = listTestFiles(TESTS_ROOT).map((path) => ({
    path,
    content: readFileSync(path, 'utf8'),
  }));
  const locks = findDocLocks({ docPath, files });
  if (locks.length === 0) {
    console.log(`no test references found for ${docPath} under ${TESTS_ROOT}/`);
    return;
  }
  console.log(`test references for ${docPath} under ${TESTS_ROOT}/:`);
  for (const { file, hits } of locks) {
    console.log(`\n${file}`);
    for (const hit of hits) {
      console.log(`  L${hit.line} [${hit.kind}] ${hit.excerpt}`);
    }
  }
}

// CLI shell runs only when executed directly (unit tests import the core).
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main(process.argv.slice(2));
}
