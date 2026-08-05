// tests/engine/esm-dirname.test.mjs
// Verify esmDirname returns the same value as the manual 3-line boilerplate.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { esmDirname } from '../../DEEP_RESEARCH_HARNESS/engine/esm-dirname.mjs';

describe('esmDirname', () => {
  it('returns an absolute path', () => {
    const d = esmDirname(import.meta.url);
    assert.ok(d.startsWith('/'), `expected absolute path, got: ${d}`);
  });

  it('matches the manual fileURLToPath + dirname result', () => {
    const manual = dirname(fileURLToPath(import.meta.url));
    const viaHelper = esmDirname(import.meta.url);
    assert.equal(viaHelper, manual);
  });

  it('returns a path that exists on disk', () => {
    const d = esmDirname(import.meta.url);
    assert.ok(existsSync(d), `expected dir to exist: ${d}`);
  });

  it('returns the directory containing this test file', () => {
    const d = esmDirname(import.meta.url);
    assert.ok(d.endsWith('/tests/engine'), `expected .../tests/engine, got: ${d}`);
  });
});
