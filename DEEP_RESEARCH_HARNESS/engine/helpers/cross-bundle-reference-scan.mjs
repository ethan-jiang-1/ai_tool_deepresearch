// @impl BUI-003: cross-bundle-reference-scan.mjs — Pure-function content scan
// Scans bundle content files for dpt_rb_* tokens that reference other bundles.
// Exported for both inspect/audit wiring and unit tests.
import { readFileSync, readdirSync, statSync as fsStatSync } from 'node:fs';
import { join, extname } from 'node:path';

const BUNDLE_TOKEN_RE = /dpt_rb_([a-z0-9][a-z0-9-]*)/g;

/**
 * Text-content file extensions to scan.
 * Markdown and YAML cover the bulk of bundle content; JSONL is trace (out of scope).
 */
const SCANNED_EXTS = new Set(['.md', '.yaml', '.yml']);

/**
 * Content file patterns relative to bundle root.
 */
const SCANNED_PATTERNS = [
  'rb_plan.md',
  // seed_topics/ — individual topic files
  // artifacts/**/*.md — wave output
  // reference/*.md — shared references
  // final/**/*.md — final report
];

/**
 * Collect all candidate content-file paths within a bundle directory.
 * Supports injecting readdirSync/statSync for unit test isolation.
 *
 * @param {string} bundleDir
 * @param {{ readdirSync?: Function, statSync?: Function }} [fsOverrides]
 * @returns {string[]} resolved content-file paths
 */
export function collectContentFiles(bundleDir, fsOverrides) {
  const readdirSyncFn = fsOverrides?.readdirSync ?? readdirSync;
  const statSyncFn = fsOverrides?.statSync ?? fsStatSync;
  const files = [];

  // Always scan rb_plan.md (bundle root)
  const planPath = join(bundleDir, 'rb_plan.md');
  try { if (statSyncFn(planPath).isFile()) files.push(planPath); } catch { /* skip */ }

  // Scan seed_topics/
  const seedDir = join(bundleDir, 'seed_topics');
  try {
    for (const entry of readdirSyncFn(seedDir, { withFileTypes: true })) {
      if (entry.isFile() && SCANNED_EXTS.has(extname(entry.name))) {
        files.push(join(seedDir, entry.name));
      }
    }
  } catch { /* skip if missing */ }

  // Scan reference/
  const refDir = join(bundleDir, 'reference');
  try {
    for (const entry of readdirSyncFn(refDir, { withFileTypes: true })) {
      if (entry.isFile() && SCANNED_EXTS.has(extname(entry.name))) {
        files.push(join(refDir, entry.name));
      }
    }
  } catch { /* skip */ }

  // Scan artifacts/ recursively
  collectRecursive(join(bundleDir, 'artifacts'), files, readdirSyncFn, statSyncFn);

  // Scan final/ recursively
  collectRecursive(join(bundleDir, 'final'), files, readdirSyncFn, statSyncFn);

  return files;
}

function collectRecursive(dir, files, readdirSyncFn, statSyncFn) {
  let entries;
  try { entries = readdirSyncFn(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRecursive(fullPath, files, readdirSyncFn, statSyncFn);
    } else if (entry.isFile() && SCANNED_EXTS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }
}

/**
 * Scan a single file for cross-bundle references.
 * @param {string} filePath
 * @param {string} ownBundleName — bare name of the current bundle (e.g. 'glm-5-3-deepseek-v4-domestic-chips')
 * @returns {{ file: string, citedBundles: string[] }}
 */
export function scanFile(filePath, ownBundleName) {
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return { file: filePath, citedBundles: [] };
  }

  const citedBundles = new Set();
  let match;
  BUNDLE_TOKEN_RE.lastIndex = 0;
  while ((match = BUNDLE_TOKEN_RE.exec(content)) !== null) {
    const cited = match[1]; // captured group: name after dpt_rb_
    if (cited !== ownBundleName) {
      citedBundles.add(cited);
    }
  }
  return { file: filePath, citedBundles: [...citedBundles].sort() };
}

/**
 * Full scan: collect content files then scan each.
 * @param {string} bundleDir
 * @param {string} ownBundleName
 * @param {{ readdirSync?: Function, statSync?: Function }} [fsOverrides]
 * @returns {{ file: string, citedBundles: string[] }[]}
 */
export function scanBundle(bundleDir, ownBundleName, fsOverrides) {
  const files = collectContentFiles(bundleDir, fsOverrides);
  const results = [];
  for (const f of files) {
    const result = scanFile(f, ownBundleName);
    if (result.citedBundles.length > 0) results.push(result);
  }
  return results;
}