// guidance-references-resolve.test.mjs
// Deterministic existence check for guidance path references in repository
// skill files. A retired `guidelines/` prefix reference or any other missing
// path fails the test and names the offending file and reference.
// @impl ACR-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');

const SKILL_ROOTS = ['.agents/skills', '.claude/skills'];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      out.push(...walk(p));
    } else if (name === 'SKILL.md') {
      out.push(p);
    }
  }
  return out;
}

// Only backticked path refs; skip template placeholders such as `<name>`.
const REF_RE = /`((?:guidelines|openspec|DEEP_RESEARCH_HARNESS)\/[^`]+)`/g;

describe('repository skill guidance references resolve', () => {
  it('resolves every guidance path referenced by repo skill files', () => {
    const failures = [];
    for (const root of SKILL_ROOTS) {
      for (const file of walk(join(REPO_ROOT, root))) {
        const rel = file.slice(REPO_ROOT.length + 1);
        const text = readFileSync(file, 'utf8');
        for (const match of text.matchAll(REF_RE)) {
          const ref = match[1];
          if (ref.includes('<') || ref.includes('>')) continue;
          if (ref.startsWith('guidelines/')) {
            failures.push(`${rel}: retired guidelines/ prefix reference: ${ref}`);
          } else if (!existsSync(join(REPO_ROOT, ref))) {
            failures.push(`${rel}: missing guidance reference: ${ref}`);
          }
        }
      }
    }
    assert.deepEqual(failures, [], failures.join('\n'));
  });
});
