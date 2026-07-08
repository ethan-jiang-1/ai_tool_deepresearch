// gate-helpers-checks.mjs — Gate rule checks: reference validation and cache_coverage
// @impl GSK-001, GSK-002, CRC-006, REF-008, WPG-012, RWG-017
// Canonical location: DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs
//
// Re-exported by gate-helpers.mjs for backward compatibility.

import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  readOutputDeclarations,
  readSubmittedWorkUnitDeclarations,
  getDeclaredReferencePaths,
} from './gate-helpers-readers.mjs';

function normalizeUrl(url) {
  try {
    const parsed = new URL(String(url || '').trim());
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return String(url || '').trim();
  }
}

const ACCEPTED_SOURCE_STATUSES = new Set(['accepted', 'countable', 'accepted_countable']);

function acceptedSourceStatus(status) {
  return ACCEPTED_SOURCE_STATUSES.has(String(status || '').trim().toLowerCase());
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function isSafeBundleRef(ref) {
  return typeof ref === 'string' && ref.length > 0 && !ref.startsWith('/') && !ref.split(/[\\/]+/).includes('..');
}

function sourceUrlsFromMetadata(metadata) {
  const raw = metadata.get('source_url') || '';
  return raw.split(';').map((url) => url.trim()).filter(Boolean);
}

function normalizeIndexRef(ref) {
  let value = String(ref || '').trim().replace(/^`|`$/g, '');
  if (!value) return '';
  if (value.startsWith('./')) value = value.slice(2);
  if (!value.startsWith('reference/')) value = `reference/${value}`;
  return value;
}

function splitMarkdownTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((part) => part.trim());
}

function readReferenceIndexRows(bundlePath) {
  const indexPath = join(bundlePath, 'reference', '_INDEX.md');
  if (!existsSync(indexPath)) {
    return { exists: false, rows: [], rowByFile: new Map() };
  }

  const lines = readFileSync(indexPath, 'utf-8').split(/\r?\n/);
  const rows = [];
  const rowByFile = new Map();
  let headers = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = splitMarkdownTableRow(trimmed);
    if (!headers) {
      if (cells.includes('ref_file')) headers = cells;
      continue;
    }
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    const row = {};
    for (let i = 0; i < headers.length; i++) row[headers[i]] = cells[i] || '';
    const ref = normalizeIndexRef(row.ref_file);
    if (ref) {
      rows.push(row);
      rowByFile.set(ref, row);
    }
  }
  return { exists: true, rows, rowByFile };
}

function hasExplicitDegradedCapture(pageText, meta) {
  const text = String(pageText || '').toLowerCase();
  const reason = [
    meta?.capture_status,
    meta?.fetch_status,
    meta?.degraded_capture,
    meta?.failure_reason,
    meta?.reason,
  ].filter((value) => value !== undefined && value !== null).join(' ').toLowerCase();
  return /degraded|fetch[-_ ]?failure|access[-_ ]?failure|blocked|unavailable|failed/.test(`${text} ${reason}`);
}

function submittedBackingIndex(bundlePath) {
  const rows = readSubmittedWorkUnitDeclarations(bundlePath);
  const referenceOutputs = new Map();
  const acceptedUrls = new Map();
  const priorAcceptedUrls = new Map();
  const targetedAcceptedUrls = new Map();
  const submittedRefs = new Set();

  function addUrl(map, url, row, source) {
    const normalized = normalizeUrl(url);
    if (!normalized) return;
    if (!map.has(normalized)) map.set(normalized, []);
    map.get(normalized).push({ row, source });
  }

  for (const row of rows) {
    if (row.work_id) submittedRefs.add(row.work_id);
    if (row.work_unit_ref) submittedRefs.add(row.work_unit_ref);
    if (row.result_ref) submittedRefs.add(row.result_ref);
    if (row.runtime_receipt_ref) submittedRefs.add(row.runtime_receipt_ref);

    for (const output of row.output_files || []) {
      if (output.path) submittedRefs.add(output.path);
      if (output.role === 'reference' && output.path) referenceOutputs.set(output.path, row);
      if (output.source_url) {
        addUrl(acceptedUrls, output.source_url, row, 'output_files.source_url');
        if (row.wave === 2 || row.kind === 'wave2_targeted_evidence') addUrl(targetedAcceptedUrls, output.source_url, row, 'output_files.source_url');
        else addUrl(priorAcceptedUrls, output.source_url, row, 'output_files.source_url');
      }
    }

    for (const claim of row.source_claims || []) {
      if (!acceptedSourceStatus(claim.acceptance_status)) continue;
      addUrl(acceptedUrls, claim.url, row, 'source_claims.url');
      if (row.wave === 2 || row.kind === 'wave2_targeted_evidence') addUrl(targetedAcceptedUrls, claim.url, row, 'source_claims.url');
      else addUrl(priorAcceptedUrls, claim.url, row, 'source_claims.url');
      if (claim.source_ref) submittedRefs.add(claim.source_ref);
      for (const ref of claim.cache_trail_refs || []) submittedRefs.add(ref);
      if (claim.degraded_capture_ref) submittedRefs.add(claim.degraded_capture_ref);
    }

    for (const url of row.accepted_source_urls || []) {
      addUrl(acceptedUrls, url, row, 'accepted_source_urls');
      if (row.wave === 2 || row.kind === 'wave2_targeted_evidence') addUrl(targetedAcceptedUrls, url, row, 'accepted_source_urls');
      else addUrl(priorAcceptedUrls, url, row, 'accepted_source_urls');
    }

    for (const trail of row.cache_trails || []) {
      submittedRefs.add(trail);
      const meta = readJsonSafe(join(bundlePath, trail, 'meta.json'));
      const pagePath = join(bundlePath, trail, 'page.md');
      const pageText = existsSync(pagePath) ? readFileSync(pagePath, 'utf-8') : '';
      const urls = [meta?.url, meta?.source_url, meta?.final_url, meta?.fetched_url].filter(Boolean);
      for (const url of urls) {
        addUrl(acceptedUrls, url, row, hasExplicitDegradedCapture(pageText, meta) ? 'degraded_cache_trail' : 'cache_trail');
        if (row.wave === 2 || row.kind === 'wave2_targeted_evidence') addUrl(targetedAcceptedUrls, url, row, 'cache_trail');
        else addUrl(priorAcceptedUrls, url, row, 'cache_trail');
      }
    }
  }

  return { rows, referenceOutputs, acceptedUrls, priorAcceptedUrls, targetedAcceptedUrls, submittedRefs };
}

function bodyHasSubmittedBackingRef(content, index) {
  for (const ref of index.submittedRefs) {
    if (ref && content.includes(ref)) return true;
  }
  return /(?:artifacts|_cache|_work_units)\/wave[01]\//.test(content);
}

function bodyHasWave2ProcessRefs(content) {
  return /W2F-\d{3}/.test(content) &&
    /(?:artifacts\/wave2\/)?(?:finding-index\.yaml|cross-topic-ledger\.md)/.test(content);
}

function isWave1TopicReference(relPath) {
  return /^reference\/(?!00-shared-)(?!00-cross-)[^/]+-[^/]+\.md$/.test(relPath);
}

function isWave2CrossReference(relPath) {
  return /^reference\/00-cross-[^/]+\.md$/.test(relPath);
}

function urlsBound(urls, map) {
  if (urls.length === 0) return false;
  return urls.every((url) => map.has(normalizeUrl(url)));
}

// ═══════════════════════════════════════════════════════════════════════════
// Markdown Text Utilities
// ═══════════════════════════════════════════════════════════════════════════

/** Extract a named Markdown section body. */
export function extractSection(mdContent, sectionName) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`##{1,3}\\s+${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##{1,3}\\s|$)`, 'i');
  const match = mdContent.match(re);
  return match ? match[1].trim() : '';
}


// ═══════════════════════════════════════════════════════════════════════════
// Reference Metadata Constants & Parser
// ═══════════════════════════════════════════════════════════════════════════

export const REQUIRED_REFERENCE_METADATA_FIELDS = [
  'source_url',
  'acceptance_status',
  'source_type',
  'tier',
  'evidence_role',
  'trust_level',
  'why_it_matters',
  'accessed_at',
  'related_topic',
];

export const REQUIRED_REFERENCE_SECTIONS = [
  'Key Facts',
  'Core Content Capture',
  'Relevance To This Research',
  'Quotable Terms / Concepts',
  'Risks And Limitations',
];

export function parseReferenceMetadata(mdContent) {
  const beforeFirstSection = mdContent.split(/\n##\s+/)[0] || '';
  const metadata = new Map();
  for (const line of beforeFirstSection.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*([A-Za-z0-9_]+):\s*(.*)$/);
    if (match) metadata.set(match[1], match[2].trim());
  }
  return metadata;
}


// ═══════════════════════════════════════════════════════════════════════════
// Reference Validation Checks
// ═══════════════════════════════════════════════════════════════════════════

export function checkReferenceFormatFiles(files) {
  const inspect = [];
  for (const file of files) {
    const content = readFileSync(file.absPath, 'utf-8');
    if (content.trimStart().startsWith('---')) {
      inspect.push(`YAML frontmatter is not allowed in ${file.relPath}`);
      continue;
    }
    const metadata = parseReferenceMetadata(content);
    for (const field of REQUIRED_REFERENCE_METADATA_FIELDS) {
      if (!metadata.has(field) || !metadata.get(field)) {
        inspect.push(`Missing required metadata "${field}" in ${file.relPath}`);
      }
    }
    for (const section of REQUIRED_REFERENCE_SECTIONS) {
      if (!extractSection(content, section)) {
        inspect.push(`Missing or empty section "## ${section}" in ${file.relPath}`);
      }
    }
  }
  return { passed: inspect.length === 0, inspect };
}

export function checkReferenceSourceUrls(files) {
  const inspect = [];
  for (const file of files) {
    const content = readFileSync(file.absPath, 'utf-8');
    const metadata = parseReferenceMetadata(content);
    const sourceUrl = metadata.get('source_url') || '';
    if (!sourceUrl) {
      inspect.push(`Missing metadata source_url in ${file.relPath}`);
      continue;
    }
    const urls = sourceUrl.split(';').map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      inspect.push(`Empty metadata source_url in ${file.relPath}`);
      continue;
    }
    for (const url of urls) {
      try {
        new URL(url);
      } catch {
        inspect.push(`Invalid metadata source_url in ${file.relPath}: ${url}`);
      }
    }
  }
  return { passed: inspect.length === 0, inspect };
}

export function checkReferenceKeyFactsMinLines(files, minLines = 5) {
  const inspect = [];
  for (const file of files) {
    const content = readFileSync(file.absPath, 'utf-8');
    const keyFacts = extractSection(content, 'Key Facts');
    const bulletCount = keyFacts.split(/\r?\n/).filter((line) => /^\s*-\s+\S/.test(line)).length;
    if (bulletCount < minLines) {
      inspect.push(`Key Facts in ${file.relPath} has ${bulletCount} bullet line(s), expected at least ${minLines}`);
    }
  }
  return { passed: inspect.length === 0, inspect };
}

/**
 * Classify a reference artifact by deterministic backing surfaces.
 *
 * @impl REF-008, WPG-012, RWG-017
 */
export function classifyReferenceAuthority(bundlePath, file) {
  const relPath = typeof file === 'string' ? file : file?.relPath;
  const absPath = typeof file === 'string' ? join(bundlePath, file) : file?.absPath;

  if (!relPath || !isSafeBundleRef(relPath)) {
    return { authority: 'unbacked', passed: false, reason: `unsafe_reference_path: ${relPath || '<missing>'}` };
  }

  let index;
  try {
    index = submittedBackingIndex(bundlePath);
  } catch (error) {
    return {
      authority: 'unbacked',
      passed: false,
      reason: `projection_backing_drift: submitted backing ledger is invalid for ${relPath}: ${error.message}`,
    };
  }

  if (index.referenceOutputs.has(relPath)) {
    return {
      authority: 'delegated_fetched_evidence',
      passed: true,
      reason: `reference declared by submitted work-unit output: ${relPath}`,
      row: index.referenceOutputs.get(relPath),
    };
  }
  if (!absPath || !existsSync(absPath)) {
    return { authority: 'unbacked', passed: false, reason: `reference file missing: ${relPath}` };
  }

  const content = readFileSync(absPath, 'utf-8');
  const metadata = parseReferenceMetadata(content);
  const sourceUrls = sourceUrlsFromMetadata(metadata);
  if (sourceUrls.length === 0) {
    return { authority: 'unbacked', passed: false, reason: `projection_backing_drift: ${relPath} lacks source_url metadata` };
  }

  if (isWave1TopicReference(relPath)) {
    if (!urlsBound(sourceUrls, index.acceptedUrls)) {
      return {
        authority: 'unbacked_projection',
        passed: false,
        reason: `projection_backing_drift: ${relPath} source_url is absent from submitted source claims, accepted source URL surfaces, cache trails, and degraded-capture backing`,
      };
    }
    if (!bodyHasSubmittedBackingRef(content, index)) {
      return {
        authority: 'unbacked_projection',
        passed: false,
        reason: `projection_backing_drift: ${relPath} lacks scannable body refs to submitted source/cache/work-unit backing`,
      };
    }
    return {
      authority: 'phase_owned_projection',
      passed: true,
      reason: `Phase-owned topic reference is backed by submitted source/cache/work-unit surfaces: ${relPath}`,
    };
  }

  if (isWave2CrossReference(relPath)) {
    if (urlsBound(sourceUrls, index.targetedAcceptedUrls)) {
      return {
        authority: 'delegated_fetched_evidence',
        passed: true,
        reason: `Wave2 cross reference source_url binds to submitted targeted evidence backing: ${relPath}`,
      };
    }
    if (!urlsBound(sourceUrls, index.priorAcceptedUrls)) {
      return {
        authority: 'unbacked_projection',
        passed: false,
        reason: `projection_backing_drift: ${relPath} source_url is not a prior accepted backing URL and no submitted targeted evidence backs it`,
      };
    }
    if (!bodyHasWave2ProcessRefs(content)) {
      return {
        authority: 'unbacked_projection',
        passed: false,
        reason: `projection_backing_drift: ${relPath} lacks W2F-xxx plus finding-index/cross-topic-ledger refs`,
      };
    }
    if (!bodyHasSubmittedBackingRef(content, index)) {
      return {
        authority: 'unbacked_projection',
        passed: false,
        reason: `projection_backing_drift: ${relPath} locator refs do not resolve to submitted prior-wave backing`,
      };
    }
    return {
      authority: 'phase_owned_projection',
      passed: true,
      reason: `Existing-backed Wave2 cross reference is a Phase-owned projection: ${relPath}`,
    };
  }

  return {
    authority: 'delegated_bypass',
    passed: false,
    reason: `delegated_bypass: ${relPath} is not a legal Phase-owned projection and is absent from submitted work-unit reference outputs`,
  };
}

export function checkReferenceLedgerCoverage(bundlePath, files) {
  const declared = getDeclaredReferencePaths(bundlePath);
  const missing = [];
  for (const file of files) {
    if (declared.has(file.relPath)) continue;
    const classification = classifyReferenceAuthority(bundlePath, file);
    if (!classification.passed) missing.push(`${file.relPath}: ${classification.reason}`);
  }
  return {
    passed: missing.length === 0,
    inspect: missing.map((detail) => `Reference file lacks submitted backing: ${detail}`),
  };
}

export function checkReferenceIndexCoverage(bundlePath, files, { sourceLayer = null } = {}) {
  const index = readReferenceIndexRows(bundlePath);
  const inspect = [];
  if (!index.exists) {
    for (const file of files) {
      inspect.push(`[missing_index_row] ${file.relPath}: reference/_INDEX.md is missing`);
    }
    return {
      passed: inspect.length === 0,
      inspect,
      advice: inspect.length > 0 ? ['Create reference/_INDEX.md and add one row per materialized reference projection.'] : [],
    };
  }

  for (const file of files) {
    const row = index.rowByFile.get(file.relPath);
    if (!row) {
      inspect.push(`[missing_index_row] ${file.relPath}: no matching reference/_INDEX.md row`);
      continue;
    }
    if (sourceLayer && row.source_layer !== sourceLayer) {
      inspect.push(`[missing_index_row] ${file.relPath}: reference/_INDEX.md source_layer is "${row.source_layer || '<missing>'}", expected "${sourceLayer}"`);
    }
  }

  return {
    passed: inspect.length === 0,
    inspect,
    advice: inspect.length > 0
      ? ['Repair reference/_INDEX.md rows for consumer navigation. source_layer is a navigation label only; submitted backing still determines authority.']
      : [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// cache_coverage Gate Check
// ═══════════════════════════════════════════════════════════════════════════

export function checkCacheCoverage(bundlePath) {
  let declarations;
  try {
    declarations = readSubmittedWorkUnitDeclarations(bundlePath);
  } catch (error) {
    return {
      passed: false,
      inspect: [`[cache_coverage] FAIL: invalid submitted work-unit ledger: ${error.message}`],
      advice: ['Repair work-unit submit/index/ledger drift before rerunning the gate.'],
    };
  }
  const inspect = [];
  const advice = [];
  let passed = true;

  function readMeta(trail) {
    try {
      const metaPath = join(bundlePath, trail, 'meta.json');
      if (!existsSync(metaPath)) return null;
      return JSON.parse(readFileSync(metaPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  function hasExplicitDegradedCapture(pageText, meta) {
    const text = String(pageText || '').toLowerCase();
    const reason = [
      meta?.capture_status,
      meta?.fetch_status,
      meta?.degraded_capture,
      meta?.failure_reason,
      meta?.reason,
    ].filter((value) => value !== undefined && value !== null).join(' ').toLowerCase();
    return /degraded|fetch[-_ ]?failure|access[-_ ]?failure|blocked|unavailable|failed/.test(`${text} ${reason}`);
  }

  function cacheContentIssue(trail) {
    const pagePath = join(bundlePath, trail, 'page.md');
    const pageText = existsSync(pagePath) ? readFileSync(pagePath, 'utf-8') : '';
    const meta = readMeta(trail);
    const trimmed = pageText.trim();
    if (!trimmed) return 'page.md is empty';
    const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const placeholderOnly = lines.length <= 2 && lines.every((line) => /^#*\s*(cache page for|page|placeholder|todo|tbd)\b/i.test(line));
    if (placeholderOnly && !hasExplicitDegradedCapture(trimmed, meta)) return 'page.md is placeholder-only';
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return 'meta.json is missing or invalid';
    if (!(meta.url || meta.source_url || meta.final_url || meta.fetched_url || meta.source_slug)) {
      return 'meta.json lacks url/source mapping';
    }
    return null;
  }

  if (declarations.length === 0) {
    const rawDeclarations = readOutputDeclarations(bundlePath);
    const rawReferenceRows = rawDeclarations.filter((decl) => (decl.output_files || []).some((f) => f.role === 'reference'));
    if (rawReferenceRows.length > 0) {
      return {
        passed: false,
        inspect: ['[cache_coverage] FAIL: reference output declarations exist but none are submitted work-unit ledger rows'],
        advice: ['Submit delegated reference outputs through operate-work-unit so cache coverage can validate Engine-written cache trails.'],
      };
    }
    return { passed: true, inspect, advice }; // Nothing to check
  }

  for (const decl of declarations) {
    const refOutputs = (decl.output_files || []).filter(f => f.role === 'reference');
    if (refOutputs.length === 0) continue;

    // Derive a stable identifier: prefer work_id, fall back to first reference path
    const declId = decl.work_id || (refOutputs[0]?.path ? `record for ${refOutputs[0].path}` : 'unknown');

    const cacheTrails = decl.cache_trails || [];

    // ── Phase 1: empty cache_trails → warning only ──
    if (cacheTrails.length === 0) {
      for (const ref of refOutputs) {
        inspect.push(`[cache_coverage] WARNING (Phase 1): ${declId} has empty cache_trails for reference ${ref.path} — gap will become fail in Phase 2`);
      }
      advice.push('Empty cache_trails on a submitted work-unit reference output — ensure the work-unit result declares verified _cache/ leaves before submit.');
      continue;
    }

    // ── Non-empty: verify each trail exists with 3 files ──
    const missingTrails = [];
    const validTrails = [];
    for (const trail of cacheTrails) {
      const trailDir = join(bundlePath, trail);
      if (!existsSync(trailDir)) {
        missingTrails.push({ trail, reason: 'directory missing' });
        continue;
      }
      const missingFiles = [];
      for (const f of ['websearch.json', 'page.md', 'meta.json']) {
        if (!existsSync(join(trailDir, f))) missingFiles.push(f);
      }
      if (missingFiles.length > 0) {
        missingTrails.push({ trail, reason: `missing files: ${missingFiles.join(', ')}` });
        continue;
      }
      const contentIssue = cacheContentIssue(trail);
      if (contentIssue) {
        missingTrails.push({ trail, reason: `incomplete cache content: ${contentIssue}` });
        continue;
      }
      validTrails.push(trail);
    }

    if (missingTrails.length > 0) {
      passed = false;
      for (const mt of missingTrails) {
        inspect.push(`[cache_coverage] FAIL: ${declId}: cache trail ${mt.trail} — ${mt.reason}`);
      }
      advice.push(`Cache trail(s) missing for ${declId}. Re-run or repair the work unit so submit records complete cache leaves.`);
    }

    // ── Per-reference mapping: each reference must map to at least one valid trail ──
    for (const ref of refOutputs) {
      let mapped = false;
      for (const trail of validTrails) {
        // Try meta.json.url match
        try {
          const metaPath = join(bundlePath, trail, 'meta.json');
          if (existsSync(metaPath)) {
            const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
            const metaUrl = meta.url || meta.source_url || meta.final_url || meta.fetched_url;
            if (metaUrl && ref.source_url && normalizeUrl(metaUrl) === normalizeUrl(ref.source_url)) {
              mapped = true;
              break;
            }
          }
        } catch { /* meta.json unreadable — skip this trail */ }

        // Try source_slug match from output_files entry
        if (ref.source_slug) {
          const trailBasename = basename(trail);
          if (trailBasename.includes(ref.source_slug)) {
            mapped = true;
            break;
          }
        }

        // Try filename qualifier match (reference filename stem vs trail slug)
        if (ref.path) {
          const refStem = basename(ref.path).replace(/\.md$/, '');
          const trailBasename = basename(trail);
          // Check if trail contains ref stem or ref stem appears in trail components
          if (trailBasename.includes(refStem) || refStem.includes(trailBasename)) {
            mapped = true;
            break;
          }
        }
      }

      if (!mapped && validTrails.length > 0) {
        passed = false;
        const required = 'websearch.json, page.md, meta.json';
        inspect.push(`[cache_coverage] FAIL: ${declId}: reference ${ref.path} (source_url: ${ref.source_url || 'none'}) not mapped to any valid cache trail. Mapping uses meta.json.url/source_url/final_url/fetched_url or source_slug. Required cache leaf files: ${required}.`);
        advice.push(`Reference ${ref.path} has no cache trail mapping. Ensure the submitted work-unit result includes a matching _cache/ leaf via meta.json.url/source_url/final_url/fetched_url or source_slug, with websearch.json, page.md, and meta.json.`);
      } else if (!mapped && validTrails.length === 0) {
        // Already reported as missing trail above — don't double-report
      }
    }
  }

  return { passed, inspect, advice };
}
