// root-hard-rule-surface-sync.test.mjs
// Locks GCO-008's root hard-rule surface agreement: root README.md (Rules In
// One Screen), AGENTS.md, and CLAUDE.md agree on machine-checkable hard-rule
// key facts.
// @impl GCO-008

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

const KEY_FACTS = [
  { name: 'node floor', check: /Node\.js >=20|Node\.js >= 20/ },
  { name: 'pure ESM', check: /pure JavaScript ESM \(`?\.mjs`?\)/ },
  { name: 'no TypeScript', check: /[Nn]o TypeScript/ },
  { name: 'no Python', check: /[Nn]o Python/ },
  { name: 'approved deps zod+yaml', check: /`zod`, `yaml`|zod.*yaml/ },
  { name: 'node:test + node:assert', check: /`node:test` \+ `node:assert`|node:test.*node:assert/ },
  { name: 'tests placement', check: /tests\// },
  { name: '_old_topics do-not-read', check: /_old_topics/ },
];

const SURFACES = ['README.md', 'AGENTS.md', 'CLAUDE.md'];

describe('root hard-rule surface sync (GCO-008)', () => {
  for (const fact of KEY_FACTS) {
    it(`${fact.name} is present on all three root surfaces`, () => {
      for (const surface of SURFACES) {
        assert.match(
          read(surface),
          fact.check,
          `${fact.name} missing from ${surface}`,
        );
      }
    });
  }
});
