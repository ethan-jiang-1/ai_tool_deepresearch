// Engine-owned cache leaf contract projection.
// @impl CRC-008

import { z } from 'zod';

export const CACHE_BASE_LEAF_FILES = Object.freeze(['websearch.json', 'page.md', 'meta.json']);
export const CACHE_SOURCE_MAPPING_FIELDS = Object.freeze(['url', 'source_url', 'final_url', 'fetched_url', 'source_slug']);
export const CACHE_DEGRADED_SIGNAL_FIELDS = Object.freeze([
  'capture_status',
  'fetch_status',
  'degraded_capture',
  'failure_reason',
  'reason',
]);

const optionalMappingFields = Object.fromEntries(
  CACHE_SOURCE_MAPPING_FIELDS.map((field) => [field, z.string().trim().min(1).optional()]),
);

// @impl DEW-021
export const CacheLeafAuthoringProjectionSchema = z.object({
  required_leaves: z.array(z.string().min(1)).min(1),
  page_rule: z.string().min(1),
  allowed_meta_mapping_fields: z.array(z.string().min(1)).min(1),
  cache_trail_declaration: z.string().min(1),
}).strict();

export const CacheLeafMetaSchema = z.object(optionalMappingFields)
  .passthrough()
  .refine(
    (meta) => CACHE_SOURCE_MAPPING_FIELDS.some((field) => typeof meta[field] === 'string' && meta[field].trim().length > 0),
    { message: `meta.json requires at least one source mapping field: ${CACHE_SOURCE_MAPPING_FIELDS.join(', ')}` },
  );

export function resolveCacheLeafContract(cachePolicy = null) {
  const additions = Array.isArray(cachePolicy?.leaf_files) ? cachePolicy.leaf_files : [];
  return [...new Set([...CACHE_BASE_LEAF_FILES, ...additions.filter((entry) => typeof entry === 'string' && entry.length > 0)])];
}

export function describeCacheLeafAuthoringProjection(cachePolicy = null) {
  return CacheLeafAuthoringProjectionSchema.parse({
    required_leaves: resolveCacheLeafContract(cachePolicy),
    page_rule: 'page.md must contain fetched page content or an explicit degraded/fetch-failure record; it must not be empty or placeholder-only.',
    allowed_meta_mapping_fields: CACHE_SOURCE_MAPPING_FIELDS,
    cache_trail_declaration: 'Declare cache_trails as bundle-relative cache leaf directory paths, never individual leaf file paths.',
  });
}

export function normalizeCacheMappingUrl(value) {
  try {
    const parsed = new URL(String(value || '').trim());
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return String(value || '').trim();
  }
}

export function cacheLeafMapping(meta) {
  const parsed = CacheLeafMetaSchema.safeParse(meta);
  if (!parsed.success) return { valid: false, urls: [], source_slug: null, error: parsed.error.issues[0]?.message || 'invalid meta.json' };
  return {
    valid: true,
    urls: ['url', 'source_url', 'final_url', 'fetched_url']
      .map((field) => parsed.data[field])
      .filter(Boolean)
      .map(normalizeCacheMappingUrl),
    source_slug: parsed.data.source_slug || null,
    error: null,
  };
}

export function hasExplicitDegradedCapture(pageText, meta) {
  const text = String(pageText || '').toLowerCase();
  const reason = CACHE_DEGRADED_SIGNAL_FIELDS
    .map((field) => meta?.[field])
    .filter((value) => value !== undefined && value !== null)
    .join(' ')
    .toLowerCase();
  return /degraded|fetch[-_ ]?failure|access[-_ ]?failure|blocked|unavailable|failed/.test(`${text} ${reason}`);
}

export function inspectCacheLeaf({ availableFiles = [], pageText = '', meta = null, cachePolicy = null } = {}) {
  const available = new Set(availableFiles);
  const requiredFiles = resolveCacheLeafContract(cachePolicy);
  const missingFiles = requiredFiles.filter((file) => !available.has(file));
  if (missingFiles.length > 0) {
    return { ok: false, issue: `missing ${missingFiles.join(', ')}`, missing_files: missingFiles, required_files: requiredFiles };
  }

  const trimmed = String(pageText || '').trim();
  if (!trimmed) return { ok: false, issue: 'page.md is empty', missing_files: [], required_files: requiredFiles };
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const placeholderOnly = lines.length <= 2 && lines.every((line) => /^#*\s*(cache page for|page|placeholder|todo|tbd)\b/i.test(line));
  const degraded = hasExplicitDegradedCapture(trimmed, meta);
  if (placeholderOnly && !degraded) {
    return { ok: false, issue: 'page.md is placeholder-only', missing_files: [], required_files: requiredFiles, degraded };
  }

  const mapping = cacheLeafMapping(meta);
  if (!mapping.valid) {
    const issue = meta && typeof meta === 'object' && !Array.isArray(meta)
      ? 'meta.json lacks url/source mapping'
      : 'meta.json is missing or invalid';
    return { ok: false, issue, missing_files: [], required_files: requiredFiles, degraded, mapping };
  }

  return {
    ok: true,
    issue: null,
    missing_files: [],
    required_files: requiredFiles,
    degraded,
    urls: mapping.urls,
    source_slug: mapping.source_slug,
  };
}
