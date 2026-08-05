// @impl CMI-007: single framework-version reader.
//
// Resolves the current framework version from the latest `## vX.Y` heading in
// the repo-root CHANGELOG — the version source of truth established by
// version-management (VEM-001). This is the framework's first programmatic
// version reader; future version reads reuse it rather than adding a second
// parser (One Rule Source).
//
// Fails closed to 'unparseable' (never throws, never guesses) so callers such as
// bundle instantiation can stamp a value without a failure path.

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION_HEADING = /^##\s+(v?\d+\.\d+(?:\.\d+)?)\s*$/m;

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
// engine/helpers -> engine -> DEEP_RESEARCH_HARNESS -> repo root
const DEFAULT_REPO_ROOT = resolve(MODULE_DIR, '..', '..', '..');

export function readFrameworkVersion({ repoRoot = DEFAULT_REPO_ROOT } = {}) {
  try {
    const changelog = readFileSync(resolve(repoRoot, 'CHANGELOG.md'), 'utf8');
    const match = changelog.match(VERSION_HEADING);
    return match ? match[1] : 'unparseable';
  } catch {
    return 'unparseable';
  }
}
