// ref-count.mjs — Engine reference counting with narrow numeric eligibility
// @impl EEX-001, EEX-002, EEX-003, REF-008, WPG-012
// Canonical engine location: DEEP_RESEARCH_HARNESS/engine/helpers/ref-count.mjs
//
// ## Role
// Engine-owned numeric eligibility for reference counting. Determines whether
// a submitted or deterministically backed projection reference is accepted and
// carries a parseable source URL, then computes the countable reference count.
// Semantic-section availability and presentation remain owned by the separate
// reference-format evaluator.
//
// Gate pass/fail decisions use ledger-mode counting only. Filesystem scan is
// diagnostic-only and SHALL NOT influence gate pass / fork branch decisions.
//
// ## Exports
//   isCountable(refPath, bundleDir) → { countable: boolean, reason?: string }
//   countReferences(bundleDir, options?) → { count: number, uncountable: Array<{path: string, reason: string}> }
//   QUALITY_THRESHOLDS — compatibility export for the accepted-status contract

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  classifyReferenceAuthority,
  readReferenceMetadata,
} from './gate-helpers-checks.mjs';
import {
  readSubmittedWorkUnitDeclarations,
} from './gate-helpers-readers.mjs';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

export const QUALITY_THRESHOLDS = Object.freeze({
  acceptance_status_required: 'accepted',
});

// ═══════════════════════════════════════════════════════════════════════════
// isCountable — single reference numeric-eligibility check
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine whether an already authority-selected reference file is eligible
 * to be counted toward Engine ref_count. Both conditions must pass:
 *
 *   1. acceptance_status is "accepted"
 *   2. source_url is present and at least one value is URL-parseable
 *
 * This function intentionally does not evaluate semantic sections, prose
 * length, Key Facts quantity, presentation, backing, index, or provenance.
 * Those facts remain owned by their existing direct evaluators.
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
  let metadataRead;
  try {
    metadataRead = readReferenceMetadata(content);
  } catch {
    return { countable: false, reason: 'unparseable' };
  }
  if (metadataRead.error) return { countable: false, reason: 'unparseable' };
  const metadata = metadataRead.metadata;

  // A historical binding is never current evidence, even in this deliberately
  // narrow numeric predicate that otherwise does not resolve Topic identity.
  if (metadata.has('related_topic')) {
    return { countable: false, reason: 'reference_topic_binding_legacy_unsupported' };
  }

  // ── Detect unparseable: no metadata fields AND no ## sections ──
  const hasSections = /^##\s+/m.test(content);
  if (metadata.size === 0 && !hasSections) {
    return { countable: false, reason: 'unparseable' };
  }

  // ── Condition 1: acceptance_status belongs to the accepted family ──
  // The template-documented YAML quoted form "accepted :warning:" (an accepted
  // reference with an inline honesty marker) is the same accepted verdict for
  // numeric eligibility; EXCLUDED and any other value stay non-countable.
  const ACCEPTED_STATUS_FAMILY = new Set(['accepted', 'accepted :warning:']);
  const acceptanceStatus = (metadata.get('acceptance_status') || '').trim();
  if (!ACCEPTED_STATUS_FAMILY.has(acceptanceStatus)) {
    return {
      countable: false,
      reason: `acceptance_status_not_accepted: ${acceptanceStatus || 'missing'}`,
    };
  }

  // ── Condition 2: present, URL-parseable source_url ──
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
 * Count submitted or backed-projection reference files that meet the narrow
 * accepted-status/source-URL numeric eligibility contract.
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
 * @param {string[]} [options.selectedPaths] — exact already-authorized
 *        reference paths. This bypasses discovery only; each selected path
 *        still passes the shared numeric-eligibility predicate.
 * @returns {{ count: number, uncountable: Array<{path: string, reason: string}> }}
 *
 * @impl EEX-002
 */
export function countReferences(bundleDir, {
  source = 'ledger',
  targetGlob = null,
  targetGlobs = null,
  topic = null,
  selectedPaths = null,
} = {}) {
  const uncountable = [];

  // ── Collect candidate paths ──
  let candidatePaths = [];

  if (Array.isArray(selectedPaths)) {
    candidatePaths = [...new Set(selectedPaths.filter((path) => (
      typeof path === 'string'
      && path.startsWith('reference/')
      && !path.includes('..')
    )))].sort();
  } else if (source === 'ledger') {
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

  if (source === 'ledger' && !Array.isArray(selectedPaths)) {
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
