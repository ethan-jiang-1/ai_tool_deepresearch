// @impl RUS-003, RUS-004: run-scoped-tmp.mjs — Bundle-scoped staging paths + hardcoded /tmp write scan
// Pure functions for the run-scoped tmp-artifact contract:
//   - stagingFile(bundleRoot, slug, kind) resolves an intermediate-artifact path
//     inside the current run bundle root `_tmp/`, sanitizing tokens so the path
//     cannot escape the bundle.
//   - scanHardcodedSystemTmpWrites(bundleRoot) read-only scans `_scripts/*.mjs`
//     for hardcoded system-tmp write-path literals (e.g. '/tmp/enrich-' + slug)
//     and returns [{ file, literal, line }] hits for inspect wiring.
// Exported for both inspect-bundle wiring and unit tests.
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';

const SAFE_TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const TRAVERSAL_RE = /(^|\/)\s*\.\.(\/|$)|[\\/]/;

/**
 * Sanitize a staging token (slug or kind). Rejects empty, separator, traversal,
 * and disallowed-character tokens so the resolved path stays inside `_tmp/`.
 *
 * @param {string} token
 * @param {string} name — token role for the error message
 * @returns {string} the token unchanged (validated)
 */
export function sanitizeStagingToken(token, name) {
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error(`stagingFile: ${name} must be a non-empty string`);
  }
  if (TRAVERSAL_RE.test(token)) {
    throw new Error(`stagingFile: ${name} must not contain path separators or traversal (got ${JSON.stringify(token)})`);
  }
  if (!SAFE_TOKEN_RE.test(token)) {
    throw new Error(`stagingFile: ${name} must match [A-Za-z0-9][A-Za-z0-9._-]* (got ${JSON.stringify(token)})`);
  }
  return token;
}

/**
 * Resolve a staging file path inside the current run bundle root `_tmp/`.
 * File name is `${kind}-${slug}.json`; both tokens are sanitized so the result
 * stays under `_tmp/` and repeated calls are stable, while kind/slug variations
 * produce distinct paths.
 *
 * @param {string} bundleRoot — current run bundle root
 * @param {string} slug — topic/work-unit slug
 * @param {string} kind — artifact kind (enrich, wave0-proj, source-draft, result-draft, ...)
 * @returns {string} resolved path under bundleRoot/_tmp/
 */
export function stagingFile(bundleRoot, slug, kind) {
  const safeSlug = sanitizeStagingToken(slug, 'slug');
  const safeKind = sanitizeStagingToken(kind, 'kind');
  return join(bundleRoot, '_tmp', `${safeKind}-${safeSlug}.json`);
}

const BLOCK_COMMENT_RE = /\/\*[\s\S]*?\*\//g;
const TMP_LITERAL_RE = /(["'`])\/tmp\/[^"'`]*\1/g;

function stripLineComment(line) {
  const idx = line.indexOf('//');
  return idx === -1 ? line : line.slice(0, idx);
}

/**
 * Read-only scan of `_scripts/*.mjs` for hardcoded system-tmp write paths.
 * A hit is a quoted literal containing `/tmp/` that appears in code (not inside
 * line/block comments). Returns [{ file, literal, line }] with `file` relative
 * to the bundle root; a missing `_scripts/` directory yields [].
 *
 * @param {string} bundleRoot — current run bundle root
 * @returns {Array<{file: string, literal: string, line: number}>}
 */
export function scanHardcodedSystemTmpWrites(bundleRoot) {
  const scriptsDir = join(bundleRoot, '_scripts');
  let entries;
  try {
    entries = readdirSync(scriptsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const hits = [];
  for (const entry of entries) {
    if (!entry.isFile() || extname(entry.name) !== '.mjs') continue;
    const filePath = join(scriptsDir, entry.name);
    let text;
    try {
      text = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }
    const withoutBlockComments = text.replace(BLOCK_COMMENT_RE, '');
    const lines = withoutBlockComments.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const code = stripLineComment(lines[i]);
      const matches = [...code.matchAll(TMP_LITERAL_RE)];
      for (const match of matches) {
        hits.push({
          file: `_scripts/${entry.name}`,
          literal: match[0],
          line: i + 1,
        });
      }
    }
  }
  return hits;
}
