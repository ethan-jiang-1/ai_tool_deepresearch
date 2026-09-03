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

// @impl CRC-009: generic no-information filler body lines (a heading followed by filler
// text is the fabricated-cache shape; real fetched text never matches these patterns).
const FILLER_BODY_PATTERNS = Object.freeze([
  /^deep research content\.?$/i,
  /^(no|none|n\/a|nothing|empty)( content| text| data| information)?\.?$/i,
  /^(content|text|body|page)( here| below)?[:.]?$/i,
  /^(todo|tbd|placeholder|sample|demo)( content| text| page)?\.?$/i,
  /^lorem ipsum\b/i,
  /^(see|refer to)( the)? (source|url|link)[:.]?$/i,
]);

function headingTextOf(line) {
  if (!/^#/.test(line)) return null;
  return line.replace(/^#+\s*/, '').trim();
}

// @impl CRC-009: IANA-reserved placeholder domains (RFC 2606) — URLs on these domains
// can never be real fetched sources.
const PLACEHOLDER_DOMAINS = Object.freeze([
  'example.com',
  'example.org',
  'example.net',
  'example.edu',
]);

function isPlaceholderDomain(hostname) {
  const host = String(hostname || '').trim().toLowerCase().replace(/\.$/, '');
  if (!host) return true;
  if (PLACEHOLDER_DOMAINS.includes(host)) return true;
  // Subdomains of the reserved example domains (e.g. news.example.com).
  if (PLACEHOLDER_DOMAINS.some((domain) => host.endsWith(`.${domain}`))) return true;
  return false;
}

// A mapping is placeholder-domain-only when every mapped URL is on a placeholder
// domain and no real source_slug evidence exists. A slug that merely restates the
// placeholder domain is not real evidence.
function isPlaceholderDomainMapping(urls, sourceSlug) {
  const slug = String(sourceSlug || '').trim().toLowerCase();
  if (slug) {
    const slugRestatesPlaceholder = PLACEHOLDER_DOMAINS.some((domain) => {
      const dashed = domain.replace(/\./g, '-');
      return slug === dashed || slug === domain || slug.endsWith(`-${dashed}`);
    });
    if (!slugRestatesPlaceholder) return false;
  }
  return urls.every((url) => {
    try {
      return isPlaceholderDomain(new URL(url).hostname);
    } catch {
      // Non-URL strings were normalized as-is; treat non-parsable values as placeholder.
      return isPlaceholderDomain(url);
    }
  });
}

// Structural filler judgment: a short page (≤ 2 non-empty lines) whose every line is a
// heading or a no-information filler line carries no fetched content.
function isFillerOnlyPage(lines) {
  if (lines.length === 0 || lines.length > 2) return false;
  const firstHeading = headingTextOf(lines[0]);
  for (const line of lines) {
    const heading = headingTextOf(line);
    if (heading !== null) continue;
    const bare = line.trim();
    const matchesPattern = FILLER_BODY_PATTERNS.some((pattern) => pattern.test(bare));
    const repeatsHeading = firstHeading !== null && bare.toLowerCase() === firstHeading.toLowerCase();
    if (!matchesPattern && !repeatsHeading) return false;
  }
  // Every line is a heading (heading-only page) or a no-information filler line:
  // the page carries no fetched content.
  return true;
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
  const keywordPlaceholder = lines.length <= 2 && lines.every((line) => /^#*\s*(cache page for|page|placeholder|todo|tbd)\b/i.test(line));
  // @impl CRC-009: structural judgment covers heading-only pages and heading + generic
  // filler sentences (e.g. "# <topic>" + "Deep research content.") that the keyword
  // regex cannot match.
  const fillerOnly = isFillerOnlyPage(lines);
  const placeholderOnly = keywordPlaceholder || fillerOnly;
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

  // @impl CRC-009: placeholder-domain judgment — every mapped URL on an IANA-reserved
  // example domain with no real source_slug evidence means the leaf never fetched a
  // real source. Any URL on a real domain clears the judgment. Explicit degraded
  // capture remains the legal outlet.
  if (!degraded && mapping.urls.length > 0 && isPlaceholderDomainMapping(mapping.urls, mapping.source_slug)) {
    return {
      ok: false,
      issue: 'meta.json maps the leaf to a placeholder domain URL rather than a real fetched source',
      missing_files: [],
      required_files: requiredFiles,
      degraded,
      mapping,
    };
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
