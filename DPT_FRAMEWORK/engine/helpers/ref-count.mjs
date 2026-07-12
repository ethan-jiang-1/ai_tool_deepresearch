// ref-count.mjs — Engine reference counting with quality filtering
// @impl EEX-001, EEX-002, REF-008, WPG-012
// Canonical engine location: DPT_FRAMEWORK/engine/helpers/ref-count.mjs
//
// ## Role
// Engine-owned quality filter for reference counting. Determines whether a
// submitted or deterministically backed projection reference meets minimum
// quality thresholds (countable), then computes the countable reference count.
//
// Gate pass/fail decisions use ledger-mode counting only. Filesystem scan is
// diagnostic-only and SHALL NOT influence gate pass / fork branch decisions.
//
// ## Exports
//   isCountable(refPath, bundleDir) → { countable: boolean, reason?: string }
//   countReferences(bundleDir, options?) → { count: number, uncountable: Array<{path: string, reason: string}> }
//   QUALITY_THRESHOLDS — frozen object documenting the 4 conditions

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  extractSection,
  classifyReferenceAuthority,
  parseReferenceMetadata,
} from './gate-helpers-checks.mjs';
import {
  readSubmittedWorkUnitDeclarations,
} from './gate-helpers-readers.mjs';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

export const QUALITY_THRESHOLDS = Object.freeze({
  core_content_capture_min_chars: 100,
  key_facts_min_bullets: 5,
  acceptance_status_required: 'accepted',
});

// ═══════════════════════════════════════════════════════════════════════════
// isCountable — single reference file quality check
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine whether a reference file meets the minimum quality threshold
 * to be counted toward Engine ref_count. All 4 conditions must pass:
 *
 *   1. acceptance_status is "accepted"
 *   2. ## Core Content Capture section ≥ 100 characters
 *   3. source_url is present and URL-parseable
 *   4. ## Key Facts section has ≥ 5 bullet lines
 *
 * Unparseable files return { countable: false, reason: "unparseable" }
 * and do NOT throw.
 *
 * @param {string} refPath — bundle-relative path to the reference file
 * @param {string} bundleDir — absolute path to the bundle root
 * @returns {{ countable: boolean, reason?: string }}
 *
 * @impl EEX-001
 */
export function isCountable(refPath, bundleDir) {
  const absPath = join(bundleDir, refPath);

  // ── Read file ──
  let content;
  try {
    if (!existsSync(absPath)) {
      return { countable: false, reason: 'file_missing' };
    }
    content = readFileSync(absPath, 'utf-8');
  } catch {
    return { countable: false, reason: 'unparseable' };
  }

  // ── Parse metadata block ──
  let metadata;
  try {
    metadata = parseReferenceMetadata(content);
  } catch {
    return { countable: false, reason: 'unparseable' };
  }

  // ── Detect unparseable: no metadata fields AND no ## sections ──
  const hasSections = /^##\s+/m.test(content);
  if (metadata.size === 0 && !hasSections) {
    return { countable: false, reason: 'unparseable' };
  }

  // ── Condition 1: acceptance_status === "accepted" ──
  const acceptanceStatus = metadata.get('acceptance_status') || '';
  if (acceptanceStatus !== 'accepted') {
    return {
      countable: false,
      reason: `acceptance_status_not_accepted: ${acceptanceStatus || 'missing'}`,
    };
  }

  // ── Condition 2: Core Content Capture ≥ 100 chars ──
  let coreContent;
  try {
    coreContent = extractSection(content, 'Core Content Capture');
  } catch {
    return { countable: false, reason: 'unparseable' };
  }
  if (!coreContent || coreContent.length < QUALITY_THRESHOLDS.core_content_capture_min_chars) {
    return {
      countable: false,
      reason: `core_content_capture_too_thin: ${coreContent ? coreContent.length : 0} chars`,
    };
  }

  // ── Condition 3: present, URL-parseable source_url ──
  const sourceUrl = metadata.get('source_url') || '';
  if (!sourceUrl.trim()) {
    return { countable: false, reason: 'source_url_missing' };
  }
  // Support semicolon-delimited multi-URL — if ANY is parseable, passes.
  const urls = sourceUrl.split(';').map(u => u.trim()).filter(Boolean);
  if (urls.length === 0) {
    return { countable: false, reason: 'source_url_empty' };
  }
  const hasParseableUrl = urls.some((u) => {
    try {
      new URL(u);
      return true;
    } catch {
      return false;
    }
  });
  if (!hasParseableUrl) {
    return { countable: false, reason: 'source_url_invalid' };
  }

  // ── Condition 4: Key Facts ≥ 5 common list items ──
  let keyFacts;
  try {
    keyFacts = extractSection(content, 'Key Facts');
  } catch {
    return { countable: false, reason: 'unparseable' };
  }
  if (!keyFacts || keyFacts.trim().length === 0) {
    return { countable: false, reason: 'key_facts_section_missing' };
  }
  const factCount = keyFacts
    .split(/\r?\n/)
    .filter(line => /^\s*(?:[-+*]|\d+[.)])\s+\S/.test(line)).length;
  if (factCount < QUALITY_THRESHOLDS.key_facts_min_bullets) {
    return {
      countable: false,
      reason: `key_facts_insufficient: ${factCount} fact items, need ${QUALITY_THRESHOLDS.key_facts_min_bullets}`,
    };
  }

  return { countable: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal: file path matching
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Test whether a file path matches a gate target glob pattern.
 * Supports * wildcards and {topic} placeholder expansion.
 *
 * @param {string} filePath — bundle-relative path (e.g. "reference/00-shared-foo.md")
 * @param {string} targetGlob — gate target (e.g. "reference/00-shared-*.md")
 * @param {string|null} topic — topic slug for {topic} expansion, if any
 * @returns {boolean}
 */
function matchesTarget(filePath, targetGlob, topic = null) {
  if (!targetGlob) return true;
  let pattern = targetGlob;
  if (topic) {
    pattern = pattern.replace(/\{topic\}/g, topic);
  }
  // If {topic} remains unexpanded (no topic provided for a topic-scoped rule),
  // the glob can't match — the gate should have expanded {topic} before calling.
  if (pattern.includes('{topic}')) {
    // Unresolved placeholder: match any topic-like segment
    pattern = pattern.replace(/\{topic\}/g, '[^/]+');
  }
  const regex = new RegExp(
    '^' +
    pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '[^/]*')
      .replace(/\//g, '\\/') +
    '$'
  );
  return regex.test(filePath);
}

function listReferenceFiles(bundleDir) {
  const refDir = join(bundleDir, 'reference');
  if (!existsSync(refDir)) return [];
  try {
    return readdirSync(refDir, { withFileTypes: true })
      .filter(e => e.isFile() && e.name.endsWith('.md') && e.name !== '_INDEX.md' && e.name !== 'README.md')
      .map(e => `reference/${e.name}`);
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// countReferences — Engine reference counting
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Count submitted or backed-projection reference files that meet quality thresholds.
 *
 * Default mode (source: "ledger"): reads role=reference output paths from
 * submitted rb_output_declarations.jsonl rows, adds legal Phase-owned
 * projections whose backing can be classified from deterministic bundle
 * surfaces, filters each through isCountable(), and returns the Engine-computed
 * count. Unbacked filesystem-only files are NOT included.
 *
 * Diagnostic mode (source: "filesystem"): scans reference/ directory for .md
 * files excluding _INDEX.md and README.md. SHALL NOT be used for gate pass
 * or fork branch decisions.
 *
 * Scope filtering via options.targetGlob and options.topic preserves gate
 * target semantics — global references cannot satisfy another topic's floor.
 *
 * @param {string} bundleDir — absolute path to the bundle root
 * @param {object} [options]
 * @param {'ledger'|'filesystem'} [options.source='ledger'] — authority source
 *        for candidate paths. "filesystem" is diagnostic-only.
 * @param {string} [options.targetGlob] — gate target pattern
 *        (e.g. "reference/00-shared-*.md", "reference/*{topic}*.md")
 * @param {string} [options.topic] — topic slug for gate expansion context
 * @returns {{ count: number, uncountable: Array<{path: string, reason: string}> }}
 *
 * @impl EEX-002
 */
export function countReferences(bundleDir, {
  source = 'ledger',
  targetGlob = null,
  targetGlobs = null,
  topic = null,
} = {}) {
  const uncountable = [];

  // ── Collect candidate paths ──
  let candidatePaths = [];

  if (source === 'ledger') {
    // Authority mode: read submitted Engine-written work-unit rows and backed
    // Phase-owned projections.
    let declarations;
    try {
      declarations = readSubmittedWorkUnitDeclarations(bundleDir);
    } catch (error) {
      return {
        count: 0,
        uncountable: [{
          path: 'rb_output_declarations.jsonl',
          reason: `invalid_submitted_work_unit_ledger: ${error.message}`,
        }],
      };
    }
    const seen = new Set();
    for (const decl of declarations) {
      for (const entry of decl.output_files || []) {
        if (entry.role !== 'reference') continue;
        if (seen.has(entry.path)) continue;
        seen.add(entry.path);
        candidatePaths.push(entry.path);
      }
    }
    for (const fsPath of listReferenceFiles(bundleDir)) {
      if (seen.has(fsPath)) continue;
      const classification = classifyReferenceAuthority(bundleDir, fsPath);
      if (classification.passed && classification.authority === 'phase_owned_projection') {
        seen.add(fsPath);
        candidatePaths.push(fsPath);
      }
    }
  } else {
    // Diagnostic-only filesystem mode: scan reference/ directory
    candidatePaths = listReferenceFiles(bundleDir);
  }

  // ── Apply target glob + topic scope filter ──
  const targetPatterns = Array.isArray(targetGlobs) && targetGlobs.length > 0 ? targetGlobs : (targetGlob ? [targetGlob] : []);
  if (targetPatterns.length > 0) {
    candidatePaths = candidatePaths.filter((candidate) => targetPatterns.some((pattern) => matchesTarget(candidate, pattern, topic)));
  }

  // ── Check each candidate against isCountable ──
  let count = 0;
  for (const refPath of candidatePaths) {
    const result = isCountable(refPath, bundleDir);
    if (result.countable) {
      count++;
    } else {
      uncountable.push({ path: refPath, reason: result.reason || 'unknown' });
    }
  }

  if (source === 'ledger') {
    const declared = new Set(candidatePaths);
    for (const fsPath of listReferenceFiles(bundleDir)) {
      if (declared.has(fsPath)) continue;
      if (targetPatterns.length > 0 && !targetPatterns.some((pattern) => matchesTarget(fsPath, pattern, topic))) continue;
      const classification = classifyReferenceAuthority(bundleDir, fsPath);
      uncountable.push({
        path: fsPath,
        reason: classification.passed
          ? 'reference_not_in_count_scope'
          : `filesystem_only_not_backed: ${classification.reason}`,
      });
    }
  }

  return { count, uncountable };
}
