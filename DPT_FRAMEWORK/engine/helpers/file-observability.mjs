// file-observability.mjs — Bundle directory audit with 6 file classifications
// @impl FIO-001, FIO-002, FIO-004
// Canonical engine location: DPT_FRAMEWORK/engine/helpers/file-observability.mjs
//
// ## Role
// Audits bundle directories against expected file patterns derived from
// topic_registry, queue writes_to/required_receipts, and ledger declarations.
// Classifies every discovered file into one of 6 categories. Explanation never
// equals authority — only ledger/receipt grants authority for gate pass.
//
// ## Exports
//   auditFileObservability(bundlePath, opts) → { findings, inspect, advice }
//   FILE_CLASSIFICATIONS — frozen array of 6 valid classification values
//   SEVERITY_LEVELS — frozen array of severity values

import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import { SLOT_NAMES } from '../../schema/contracts/queue-slots.mjs';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

export const FILE_CLASSIFICATIONS = Object.freeze([
  'expected',
  'declared_authoritative',
  'unplanned_nonblocking',
  'unplanned_needs_explanation',
  'orphan_authority_blocking',
  'explained_non_authoritative',
]);

export const SEVERITY_LEVELS = Object.freeze(['info', 'warning', 'blocker']);

// Known control files at bundle root — always expected
const ROOT_CONTROL_FILES = new Set([
  'START_FROM_HERE.md',
  'rb_plan.md',
  'rb_profile.yaml',
  'rb_status.json',
  'rb_queue.json',
  'rb_trace.jsonl',
  'rb_output_declarations.jsonl',
]);

// Known diagnostic/engine directories — contents expected
const KNOWN_ENGINE_DIRS = new Set([
  '_logs',
  '_checkpoints',
  '_diagnostics',
  '_cache',
]);

// Known relay slot files at _subagents/wave_NN/slot_MM/
const RELAY_SLOT_FILES = new Set([
  'task.md',
  'result.schema.json',
  'result.json',
  'status.json',
  '_agent.json',
  'runtime-receipt.jsonl',
]);

// Gate pass-condition artifact patterns per phase
const PHASE_ARTIFACT_PATTERNS = {
  seed_topics: [
    /^seed_topics\/[^/]+\.md$/,
  ],
  wave0: [
    /^artifacts\/wave0\/[^/]+\/source\.yaml$/,
    /^reference\/00-shared-[^/]+\.md$/,
  ],
  wave1: [
    /^artifacts\/wave1\/[^/]+\/evidence-summary\.md$/,
    /^artifacts\/wave1\/[^/]+\/question-list\.md$/,
    /^reference\/[^/]+-[^/]+\.md$/,
  ],
  wave2: [
    /^artifacts\/wave2\/synthesis\.md$/,
    /^artifacts\/wave2\/cross-topic-ledger\.md$/,
    /^artifacts\/wave2\/finding-index\.yaml$/,
    /^reference\/00-cross-[^/]+\.md$/,
  ],
};

const RELAY_SLOT_PATH_RE = /^_subagents\/wave_\d+\/slot_\d+\//;

// ═══════════════════════════════════════════════════════════════════════════
// Internal: directory walking
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recursively walk a directory, returning relative paths for all files.
 * Directories named .git or node_modules are skipped.
 *
 * @param {string} dir — absolute path to walk
 * @param {string} base — base path for relative path computation
 * @returns {string[]} relative file paths
 */
function walkDir(dir, base) {
  const results = [];
  try {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return results;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.git') || entry.name === 'node_modules') continue;
      const abs = join(dir, entry.name);
      const rel = relative(base, abs);
      if (entry.isFile()) {
        results.push(rel);
      } else if (entry.isDirectory()) {
        results.push(...walkDir(abs, base));
      }
    }
  } catch {
    // Permission error or missing dir — return what we have
  }
  return results;
}

/**
 * Single-level listing: returns relative file paths in a directory (non-recursive).
 */
function listDir(dir, base) {
  const results = [];
  try {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return results;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile()) {
        results.push(relative(base, join(dir, entry.name)));
      }
    }
  } catch { /* ignore */ }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal: expected pattern builders
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a set of expected file paths from authoritative sources.
 *
 * @param {object} opts
 * @param {string[]} opts.topicSlugs — from topic_registry
 * @param {object} opts.queue — parsed rb_queue.json
 * @param {object[]} opts.ledgerDeclarations — from readOutputDeclarations()
 * @returns {{ expectedPaths: Set<string>, declaredPaths: Set<string>, gatePassPatterns: RegExp[] }}
 */
function buildExpectedSets({ topicSlugs, queue, ledgerDeclarations }) {
  const expectedPaths = new Set();
  const declaredPaths = new Set();

  // Control files
  for (const cf of ROOT_CONTROL_FILES) {
    expectedPaths.add(cf);
  }

  // Topic-derived paths
  for (const slug of topicSlugs) {
    expectedPaths.add(`seed_topics/${slug}.md`);
    expectedPaths.add(join('artifacts', 'wave1', slug, 'evidence-summary.md'));
    expectedPaths.add(join('artifacts', 'wave1', slug, 'question-list.md'));
  }

  // Queue writes_to and required_receipts
  if (queue) {
    const allItems = [];
    // Active window slots
    for (const slot of SLOT_NAMES) {
      if (queue[slot]) allItems.push(queue[slot]);
    }
    // Refill pool
    if (Array.isArray(queue.refill_pool)) {
      allItems.push(...queue.refill_pool);
    }

    for (const item of allItems) {
      for (const w of (item.writes_to || [])) {
        expectedPaths.add(w);
      }
      for (const r of (item.required_receipts || [])) {
        if (r.startsWith('file:')) {
          expectedPaths.add(r.slice('file:'.length));
        }
      }
    }
  }

  // Ledger declarations
  for (const decl of ledgerDeclarations) {
    for (const entry of decl.output_files || []) {
      declaredPaths.add(entry.path);
      expectedPaths.add(entry.path);
    }
  }

  // Engine dir paths — contents are expected (added dynamically during audit)
  // _logs/run.log is always expected
  expectedPaths.add(join('_logs', 'run.log'));

  return { expectedPaths, declaredPaths };
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal: file explanation reader
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read file_explanation diagnostic events from rb_trace.jsonl.
 * Returns a Map of path → latest explanation event.
 *
 * @param {string} bundlePath
 * @returns {Map<string, object>}
 */
function readFileExplanations(bundlePath) {
  const explanations = new Map();
  try {
    const tracePath = join(bundlePath, 'rb_trace.jsonl');
    if (!existsSync(tracePath)) return explanations;
    const lines = readFileSync(tracePath, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.event === 'diagnostic' && entry.kind === 'file_explanation' && entry.path) {
          explanations.set(entry.path, entry);
        }
      } catch { /* skip unparseable lines */ }
    }
  } catch { /* trace unreadable */ }
  return explanations;
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal: classification logic
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classify a single file path.
 *
 * @param {string} relPath — bundle-relative file path
 * @param {object} ctx
 * @param {Set<string>} ctx.expectedPaths
 * @param {Set<string>} ctx.declaredPaths
 * @param {Map<string,object>} ctx.explanations
 * @param {string|null} ctx.targetPhase
 * @returns {{ classification: string, severity: string, reason: string, authority_status: string, phase: string|null }}
 */
function classifyFile(relPath, ctx) {
  const { expectedPaths, declaredPaths, explanations, targetPhase } = ctx;

  // 1. Known control file → expected
  if (ROOT_CONTROL_FILES.has(relPath)) {
    return {
      classification: 'expected',
      severity: 'info',
      reason: 'Known bundle control file',
      authority_status: 'none',
      phase: null,
    };
  }

  // 2. In known engine dir (_logs, _checkpoints, _diagnostics) → expected
  for (const ed of KNOWN_ENGINE_DIRS) {
    if (relPath.startsWith(ed + '/') || relPath === ed) {
      return {
        classification: 'expected',
        severity: 'info',
        reason: `File in known engine directory: ${ed}/`,
        authority_status: 'none',
        phase: null,
      };
    }
  }

  // 3. In recognized relay slot path → check relay contract
  const relayMatch = relPath.match(RELAY_SLOT_PATH_RE);
  if (relayMatch) {
    const fileName = basename(relPath);
    if (RELAY_SLOT_FILES.has(fileName)) {
      return {
        classification: 'expected',
        severity: 'info',
        reason: 'Relay slot file recognized by slot contract',
        authority_status: 'none',
        phase: null,
      };
    }
    // File inside relay slot but not in contract → unplanned
    return {
      classification: 'unplanned_nonblocking',
      severity: 'info',
      reason: 'File inside relay slot directory but not in relay contract',
      authority_status: 'none',
      phase: null,
    };
  }

  // 4. runtime-receipt.jsonl outside recognized slot path → unplanned
  if (basename(relPath) === 'runtime-receipt.jsonl') {
    return {
      classification: 'unplanned_needs_explanation',
      severity: 'warning',
      reason: 'runtime-receipt.jsonl outside recognized relay slot path',
      authority_status: 'none',
      phase: null,
      required_repair: 'Move to _subagents/wave_NN/slot_MM/ or explain via log-event.mjs --explain-file',
    };
  }

  // 5. Declared in ledger → authoritative
  if (declaredPaths.has(relPath)) {
    return {
      classification: 'declared_authoritative',
      severity: 'info',
      reason: 'Declared in rb_output_declarations.jsonl',
      authority_status: 'declared_authoritative',
      phase: null,
    };
  }

  // 6. In expected set (from queue/topics) → expected
  if (expectedPaths.has(relPath)) {
    return {
      classification: 'expected',
      severity: 'info',
      reason: 'Expected artifact from topic registry or queue contract',
      authority_status: 'none',
      phase: null,
    };
  }

  // 7. Has file explanation → explained_non_authoritative
  const explanation = explanations.get(relPath);
  if (explanation) {
    return {
      classification: 'explained_non_authoritative',
      severity: 'info',
      reason: explanation.reason || 'File explained by Agent — non-authoritative',
      authority_status: explanation.authority_status || 'explained_non_authoritative',
      phase: explanation.phase || null,
    };
  }

  // 8. Matches gate pass-condition pattern for target phase → orphan
  if (targetPhase) {
    const patterns = PHASE_ARTIFACT_PATTERNS[targetPhase] || [];
    for (const pat of patterns) {
      if (pat.test(relPath)) {
        return {
          classification: 'orphan_authority_blocking',
          severity: 'blocker',
          reason: `File matches ${targetPhase} pass-condition pattern but has no ledger declaration or queue receipt`,
          authority_status: 'none',
          phase: targetPhase,
          required_repair: 'Complete delegated reference production through Relay/Queue, or explain as non-authoritative via log-event.mjs --explain-file',
        };
      }
    }
  }

  // 9. Matches any phase's pass-condition pattern → unplanned_needs_explanation
  for (const [phase, patterns] of Object.entries(PHASE_ARTIFACT_PATTERNS)) {
    for (const pat of patterns) {
      if (pat.test(relPath)) {
        return {
          classification: 'unplanned_needs_explanation',
          severity: 'warning',
          reason: `File matches ${phase} pass-condition pattern but is not authoritative — explain or complete via queue`,
          authority_status: 'none',
          phase,
          required_repair: 'Explain via log-event.mjs --explain-file or produce through delegated queue completion',
        };
      }
    }
  }

  // 10. Default → unplanned_nonblocking
  return {
    classification: 'unplanned_nonblocking',
    severity: 'info',
    reason: 'File does not match any expected pattern and is not in a pass-condition path',
    authority_status: 'none',
    phase: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Audit bundle directories against expected file patterns.
 *
 * Reads topic_registry, queue writes_to/required_receipts, and ledger
 * declarations to build expected path sets. Walks the bundle and classifies
 * every file. Relay slot files are recognized by path structure.
 *
 * @param {string} bundlePath — absolute path to the bundle directory
 * @param {object} opts
 * @param {string[]} [opts.topicSlugs=[]] — topic slugs from plan frontmatter
 * @param {object|null} [opts.queue=null] — parsed rb_queue.json
 * @param {object[]} [opts.ledgerDeclarations=[]] — from readOutputDeclarations()
 * @param {string|null} [opts.targetPhase=null] — phase key for pass-condition severity
 * @returns {{ findings: object[], inspect: string[], advice: string[] }}
 *
 * @impl FIO-001, FIO-002, FIO-004
 */
export function auditFileObservability(bundlePath, {
  topicSlugs = [],
  queue = null,
  ledgerDeclarations = [],
  targetPhase = null,
} = {}) {
  const inspect = [];
  const advice = [];
  const findings = [];

  if (!existsSync(bundlePath)) {
    return {
      findings,
      inspect: [`Bundle directory not found: ${bundlePath}`],
      advice: ['Verify --bundle points to an existing run bundle.'],
    };
  }

  // Build expected sets
  const { expectedPaths, declaredPaths } = buildExpectedSets({
    topicSlugs,
    queue,
    ledgerDeclarations,
  });

  // Read file explanations from trace
  const explanations = readFileExplanations(bundlePath);

  // Walk bundle root (non-recursive for root, recursive for artifacts)
  const allFiles = [];

  // Root-level files only (no recursion into directories)
  try {
    for (const entry of readdirSync(bundlePath, { withFileTypes: true })) {
      if (entry.isFile()) {
        allFiles.push(entry.name);
      }
    }
  } catch { /* ignore */ }

  // Shallow: seed_topics/, reference/
  for (const dir of ['seed_topics', 'reference']) {
    const dp = join(bundlePath, dir);
    allFiles.push(...listDir(dp, bundlePath));
  }

  // Recursive: artifacts/, _cache/, _subagents/, final/
  for (const dir of ['artifacts', '_cache', '_subagents', 'final']) {
    const dp = join(bundlePath, dir);
    allFiles.push(...walkDir(dp, bundlePath));
  }

  // Also include known engine dir files
  for (const dir of KNOWN_ENGINE_DIRS) {
    const dp = join(bundlePath, dir);
    allFiles.push(...walkDir(dp, bundlePath));
  }

  // Also include _checkpoints and _diagnostics if they exist
  for (const dir of ['_checkpoints', '_diagnostics']) {
    const dp = join(bundlePath, dir);
    allFiles.push(...walkDir(dp, bundlePath));
  }

  // Deduplicate
  const seen = new Set();
  const uniqueFiles = allFiles.filter(f => {
    if (seen.has(f)) return false;
    seen.add(f);
    return true;
  });

  // Classify each file
  const ctx = { expectedPaths, declaredPaths, explanations, targetPhase };

  for (const relPath of uniqueFiles) {
    const classification = classifyFile(relPath, ctx);
    findings.push({
      path: relPath,
      ...classification,
    });
  }

  // ── Cache gap detection (RTI-006) ──
  // For each declared reference file, check if its cache trail exists.
  // Reported via inspect, NOT as a new FILE_CLASSIFICATIONS value.
  for (const decl of ledgerDeclarations) {
    const refOutputs = (decl.output_files || []).filter(f => f.role === 'reference');
    if (refOutputs.length === 0) continue;

    const cacheTrails = decl.cache_trails || [];

    if (cacheTrails.length === 0) {
      for (const ref of refOutputs) {
        inspect.push(`[cache_gap] declaration ${decl.work_id}: reference ${ref.path} has empty cache_trails — no raw source provenance`);
      }
      continue;
    }

    for (const trail of cacheTrails) {
      const trailDir = join(bundlePath, trail);
      if (!existsSync(trailDir)) {
        inspect.push(`[cache_gap] declaration ${decl.work_id}: cache trail directory missing: ${trail}`);
        continue;
      }
      const missingFiles = [];
      for (const f of ['websearch.json', 'page.md', 'meta.json']) {
        if (!existsSync(join(trailDir, f))) missingFiles.push(f);
      }
      if (missingFiles.length > 0) {
        inspect.push(`[cache_gap] declaration ${decl.work_id}: cache trail ${trail} missing files: ${missingFiles.join(', ')}`);
      }
    }

    // Check per-reference mapping
    for (const ref of refOutputs) {
      const mapped = cacheTrails.some(trail => {
        const trailDir = join(bundlePath, trail);
        if (!existsSync(trailDir)) return false;
        // Check meta.json.url match
        try {
          const metaPath = join(trailDir, 'meta.json');
          if (existsSync(metaPath)) {
            const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
            if (meta.url && ref.source_url) {
              try {
                const a = new URL(meta.url); a.hash = '';
                const b = new URL(ref.source_url); b.hash = '';
                if (a.toString() === b.toString()) return true;
              } catch { /* URL parse error — skip */ }
            }
          }
        } catch { /* meta.json unreadable */ }
        // Check source_slug or filename qualifier
        if (ref.source_slug && trail.includes(ref.source_slug)) return true;
        if (ref.path) {
          const refStem = basename(ref.path).replace(/\.md$/, '');
          if (basename(trail).includes(refStem) || refStem.includes(basename(trail))) return true;
        }
        return false;
      });

      if (!mapped && cacheTrails.length > 0) {
        inspect.push(`[cache_gap] declaration ${decl.work_id}: reference ${ref.path} not mapped to any cache trail`);
      }
    }
  }

  // Aggregate inspect/advice
  const blockers = findings.filter(f => f.severity === 'blocker');
  const warnings = findings.filter(f => f.severity === 'warning');

  if (blockers.length > 0) {
    inspect.push(`${blockers.length} orphan authority blocking file(s) found`);
    for (const b of blockers) {
      inspect.push(`  ${b.path}: ${b.reason}`);
    }
    advice.push('Orphan files at pass-condition paths must be declared through ledger or explained as non-authoritative.');
  }

  if (warnings.length > 0) {
    inspect.push(`${warnings.length} unplanned file(s) need explanation`);
    for (const w of warnings) {
      inspect.push(`  ${w.path}: ${w.reason}`);
    }
    advice.push('Use log-event.mjs --explain-file to record explanations for unplanned files.');
  }

  return { findings, inspect, advice };
}
