// test-clean-script-contract.test.mjs
// Static contract for the package.json `test:clean` script: its deletion scope
// must stay mechanically bound to the `.gitignore` disposable-artifact anchor,
// so the two cannot drift apart silently. Pure string/fact assertions — this
// test never executes the script.
// @impl RET-007

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

const packageJson = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
const gitignore = readFileSync(join(REPO_ROOT, '.gitignore'), 'utf8');

describe('test:clean script contract', () => {
  it('declares a test:clean script scoped to the tests subtree', () => {
    const script = packageJson.scripts['test:clean'];
    assert.ok(typeof script === 'string' && script.length > 0, 'package.json must declare scripts["test:clean"]');
    assert.match(script, /(?:^|\s)tests(?:\s|'|"|$)/, 'script must target the tests subtree');
  });

  it('deletes only .test* prefixed directories without descending (prune + rm -rf)', () => {
    const script = packageJson.scripts['test:clean'];
    assert.match(script, /-type d/, 'script must match directories only (gitignore files are out of scope)');
    assert.match(script, /-name ['"]\.test\*['"]/, 'script must match .test* prefixed names only');
    assert.match(script, /-prune/, 'script must prune so only topmost matching directories are removed');
    assert.match(script, /-exec rm -rf \{\} \+/, 'script must remove matched directories via rm -rf');
  });

  it('stays bound to the .gitignore disposable-artifact anchor', () => {
    assert.match(gitignore, /^tests\/\*\*\/\.test\*\/$/m, '.gitignore must keep the tests/**/.test* anchor');
    assert.match(gitignore, /^tests\/\.test-tmp\/$/m, '.gitignore must keep the tests/.test-tmp anchor');
    assert.match(gitignore, /^tests\/\.test-bundles\/$/m, '.gitignore must keep the tests/.test-bundles anchor');
  });
});
