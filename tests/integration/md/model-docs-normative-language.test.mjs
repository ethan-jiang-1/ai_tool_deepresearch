// model-docs-normative-language.test.mjs
// Locks GCO-009: model documents under openspec/guidance/models/ must not
// contain normative MUST/MUST-NOT phrasing. Any MUST token outside a quoted
// requirement pointer fails.
// @impl GCO-009

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const MODELS_DIR = join(REPO_ROOT, 'openspec', 'guidance', 'models');

function walkModels(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkModels(p, out);
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

describe('model documents normative-language guard (GCO-009)', () => {
  const files = walkModels(MODELS_DIR);
  it('models directory contains markdown files', () => {
    assert.ok(files.length > 0, 'no model markdown files found');
  });

  for (const file of files) {
    const rel = file.replace(REPO_ROOT + '/', '');
    it(`${rel} carries no MUST phrasing`, () => {
      const text = readFileSync(file, 'utf8');
      const hit = text.match(/^.*\bMUST\b.*$/gm);
      assert.deepEqual(
        hit,
        null,
        `${rel} contains MUST phrasing:\n${hit ? hit.join('\n') : ''}`,
      );
    });
  }
});
