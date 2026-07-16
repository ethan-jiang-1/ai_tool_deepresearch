// @impl CMI-007: readFrameworkVersion helper unit test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readFrameworkVersion } from '../../DPT_FRAMEWORK/engine/helpers/framework-version.mjs';

const REPO_ROOT = process.cwd();

describe('readFrameworkVersion (CMI-007)', () => {
  it('returns the latest CHANGELOG ## vX.Y version (VEM-001 authority)', () => {
    const v = readFrameworkVersion({ repoRoot: REPO_ROOT });
    const changelog = readFileSync(resolve(REPO_ROOT, 'CHANGELOG.md'), 'utf8');
    const match = changelog.match(/^##\s+(v?\d+\.\d+(?:\.\d+)?)\s*$/m);
    assert.ok(match, 'CHANGELOG must have a version heading');
    assert.equal(v, match[1]);
    assert.match(v, /^v?\d+\.\d+/);
  });

  it('fails closed to "unparseable" when CHANGELOG.md is absent (no throw, no guess)', () => {
    const v = readFrameworkVersion({ repoRoot: '/nonexistent-path-cmi007-xyz' });
    assert.equal(v, 'unparseable');
  });
});
