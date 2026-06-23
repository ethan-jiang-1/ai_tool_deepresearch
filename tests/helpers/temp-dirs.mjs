// temp-dirs.mjs — Shared temp-dir helper for integration tests
//
// Every integration test that needs temp directories MUST use this helper.
// All temp dirs live under tests/.test-tmp/ — never in the repo root.
//
// Usage:
//   import { createTempDir, cleanupAll } from '../../helpers/temp-dirs.mjs';
//   const dir = createTempDir('my-test');  // → tests/.test-tmp/my-test-<random>/

import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Use process.cwd() — integration tests always run from repo root
const TMP_ROOT = join(process.cwd(), 'tests', '.test-tmp');

// Ensure the tmp root exists
try { mkdirSync(TMP_ROOT, { recursive: true }); } catch {}

// Track all created dirs for bulk cleanup
const _created = [];

/**
 * Create an isolated temp directory under tests/.test-tmp/.
 *
 * @param {string} label - short test identifier
 * @returns {string} absolute path
 */
export function createTempDir(label) {
  const dir = mkdtempSync(join(TMP_ROOT, `${label}-`));
  _created.push(dir);
  return dir;
}

/**
 * Clean up all temp directories created in this process.
 * Call in after() hooks.
 */
export function cleanupAll() {
  for (const d of _created.reverse()) {
    try { rmSync(d, { recursive: true, force: true }); } catch {}
  }
  _created.length = 0;
}
