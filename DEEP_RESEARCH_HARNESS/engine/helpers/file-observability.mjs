// file-observability.mjs — Bundle directory audit with work-unit-aware file classifications
// @impl FIO-001, FIO-002, FIO-004, FIO-005, FIO-006, REF-008, WPG-012, RWG-017
// Canonical engine location: DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs
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
import {
  readOutputDeclarations,
  readSubmittedWorkUnitDeclarations,
} from './gate-helpers-readers.mjs';
import {
  checkReferenceIndexCoverage,
  classifyReferenceAuthority,
  parseReferenceMetadata,
} from './gate-helpers-checks.mjs';
import {
  evaluateTopicLayouts,
  resolveReferenceTopicBinding,
} from './topic-layout.mjs';
import { checkSourceClaimCacheMapping } from './wave-depth-contracts.mjs';
import {
  CACHE_BASE_LEAF_FILES,
  cacheLeafMapping,
  normalizeCacheMappingUrl,
} from './cache-leaf-contract.mjs';

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
  'BUNDLE_ENTRY.md',
  'BUNDLE_MAP.md',
  'rb_plan.md',
  'rb_profile.yaml',
  'rb_status.json',
  'rb_queue.json',
  'rb_trace.jsonl',
  'rb_output_declarations.jsonl',
]);

const LEGACY_BUNDLE_ENTRY_FILES = new Set([
  'RUN_BUNDLE.md',
]);

// Known diagnostic/engine directories — contents expected
const KNOWN_ENGINE_DIRS = new Set([
  '_logs',
  '_checkpoints',
  '_diagnostics',
  '_cache',
  '_work_units',
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

const NON_WORK_UNIT_DELEGATED_RE = /^_subagents\/wave_(\d+)\/slot_\d+\//;

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
function queueItems(queue) {
  if (!queue || typeof queue !== 'object') return [];
  const items = [];
  if (Array.isArray(queue.active_window)) items.push(...queue.active_window);
  if (Array.isArray(queue.refill_pool)) items.push(...queue.refill_pool);
  for (const entry of Object.values(queue.delegated_in_flight || {})) {
    if (entry?.item && typeof entry.item === 'object') items.push(entry.item);
  }
  for (const entry of queue.terminal_history || []) {
    if (entry?.item && typeof entry.item === 'object') items.push(entry.item);
  }
  return items;
}

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

  // Queue v2 writes_to and required_receipts
  for (const item of queueItems(queue)) {
    for (const w of (item.writes_to || [])) {
      expectedPaths.add(w);
    }
    for (const r of (item.required_receipts || [])) {
      if (r.startsWith('file:')) {
        expectedPaths.add(r.slice('file:'.length));
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

function declarationKey(row) {
  return `${row.work_id || '<no-work-id>'}:${row.ledger_record_hash || '<no-ledger-hash>'}`;
}

function nonSubmittedDeclarations(rawDeclarations, submittedDeclarations) {
  const submitted = new Set(submittedDeclarations.map(declarationKey));
  return rawDeclarations.filter((row) => !submitted.has(declarationKey(row)));
}

function phaseFromWaveNumber(value) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? `wave${n}` : null;
}

function isReferenceMarkdown(relPath) {
  return /^reference\/[^/]+\.md$/.test(relPath) &&
    relPath !== 'reference/_INDEX.md' &&
    relPath !== 'reference/README.md';
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
  const { bundlePath, expectedPaths, declaredPaths, explanations, targetPhase } = ctx;

  if (relPath === 'START_FROM_HERE.md') {
    return {
      classification: 'unplanned_nonblocking',
      severity: 'info',
      reason: existsSync(join(bundlePath, 'BUNDLE_MAP.md'))
        ? 'Deprecated legacy bundle map compatibility debris; BUNDLE_MAP.md is current'
        : 'Deprecated legacy bundle map compatibility; migrate old bundles to BUNDLE_MAP.md',
      authority_status: 'none',
      phase: null,
    };
  }

  if (LEGACY_BUNDLE_ENTRY_FILES.has(relPath)) {
    return {
      classification: 'expected',
      severity: 'info',
      reason: 'Legacy non-authoritative bundle entry compatibility',
      authority_status: 'none',
      phase: null,
    };
  }

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

  // 3. Non-work-unit delegated paths are diagnostic only.
  const oldDelegatedMatch = relPath.match(NON_WORK_UNIT_DELEGATED_RE);
  if (oldDelegatedMatch) {
    return {
      classification: 'unplanned_needs_explanation',
      severity: 'warning',
      reason: 'Non-work-unit delegated artifact; production delegated runtime path is _work_units/waveN/{work_id}/',
      authority_status: 'none',
      phase: phaseFromWaveNumber(oldDelegatedMatch[1]),
      required_repair: 'Route delegated work through work-unit claim/submit; remove or explain this non-authoritative artifact.',
    };
  }

  // 4. runtime-receipt.jsonl outside work-unit envelopes → unplanned
  if (basename(relPath) === 'runtime-receipt.jsonl') {
    return {
      classification: 'unplanned_needs_explanation',
      severity: 'warning',
      reason: 'runtime-receipt.jsonl outside a work-unit envelope',
      authority_status: 'none',
      phase: null,
      required_repair: 'Use the assigned work-unit runtime_receipt_ref, or explain the file as non-authoritative.',
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

  const referenceAuthority = isReferenceMarkdown(relPath)
    ? classifyReferenceAuthority(bundlePath, relPath)
    : null;
  if (referenceAuthority?.passed && referenceAuthority.authority === 'phase_owned_projection') {
    return {
      classification: 'expected',
      severity: 'info',
      reason: `Phase-owned reference projection has submitted/prior backing: ${referenceAuthority.reason}`,
      authority_status: 'phase_owned_projection',
      phase: relPath.startsWith('reference/00-cross-') ? 'wave2' : 'wave1',
    };
  }
  if (referenceAuthority && !referenceAuthority.passed && referenceAuthority.authority === 'delegated_bypass') {
    return {
      classification: 'unplanned_needs_explanation',
      severity: 'warning',
      reason: referenceAuthority.reason,
      authority_status: 'none',
      phase: null,
      required_repair: 'Submit delegated fetched evidence through work-unit claim/submit, or remove/explain the non-authoritative reference.',
    };
  }

  // 8. Matches gate pass-condition pattern for target phase → orphan
  if (targetPhase) {
    const patterns = PHASE_ARTIFACT_PATTERNS[targetPhase] || [];
    for (const pat of patterns) {
      if (pat.test(relPath)) {
        const reason = referenceAuthority && !referenceAuthority.passed
          ? referenceAuthority.reason
          : `File matches ${targetPhase} pass-condition pattern but has no ledger declaration or queue receipt`;
        return {
          classification: 'orphan_authority_blocking',
          severity: 'blocker',
          reason,
          authority_status: 'none',
          phase: targetPhase,
          required_repair: referenceAuthority?.authority === 'delegated_bypass'
            ? 'Submit newly fetched evidence through operate-work-unit; filesystem-only delegated evidence is not authority.'
            : 'Repair projection backing, add submitted source/cache/degraded/work-unit refs, or explain as non-authoritative via log-event.mjs --explain-file.',
        };
      }
    }
  }

  // 9. Matches any phase's pass-condition pattern → unplanned_needs_explanation
  for (const [phase, patterns] of Object.entries(PHASE_ARTIFACT_PATTERNS)) {
    for (const pat of patterns) {
      if (pat.test(relPath)) {
        const reason = referenceAuthority && !referenceAuthority.passed
          ? referenceAuthority.reason
          : `File matches ${phase} pass-condition pattern but is not authoritative — explain or submit through work-unit`;
        return {
          classification: 'unplanned_needs_explanation',
          severity: 'warning',
          reason,
          authority_status: 'none',
          phase,
          required_repair: referenceAuthority?.authority === 'delegated_bypass'
            ? 'Submit delegated fetched evidence through work-unit claim/submit.'
            : 'Explain via log-event.mjs --explain-file or repair submitted projection backing.',
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

function canonicalFindingId(kind, identity) {
  return `${kind}:${String(identity || 'unknown').replace(/[^a-z0-9_-]+/gi, '_')}`;
}

function targetRequires(targetPhase, surface) {
  const rank = { 'seed-topics': 1, wave0: 2, wave1: 3, wave2: 4, hitl2: 5, readiness: 6, rerun: 7, final: 8 };
  const requiredAt = { seed: 1, wave0: 2, wave1: 3 };
  return Boolean(rank[targetPhase] && rank[targetPhase] >= requiredAt[surface]);
}

/**
 * Compare explicit topic identities against the current registry without guessing.
 * @impl FIO-006
 */
export function auditCanonicalTopicFootprint(bundlePath, {
  topics = [],
  topicSlugs = [],
  queue = null,
  ledgerDeclarations = [],
  targetPhase = null,
} = {}) {
  const registryTopics = topics.length > 0
    ? topics
    : topicSlugs.map((slug) => ({ id: slug, slug }));
  const layouts = evaluateTopicLayouts(registryTopics);
  const registeredTopicKeys = new Set();
  const canonicalKeyByAlias = new Map();
  for (const layout of layouts.referenceLayouts) {
    const canonicalKey = layout.topic_uid || `legacy:${layout.current.id}:${layout.current.slug}`;
    registeredTopicKeys.add(canonicalKey);
    for (const alias of [
      layout.topic_uid,
      layout.current.id,
      layout.current.slug,
      ...layout.previous.flatMap((entry) => [entry.id, entry.slug]),
    ]) {
      if (alias) canonicalKeyByAlias.set(alias, canonicalKey);
    }
  }

  const facts = new Map();
  const addFact = (identity, fact) => {
    if (!identity || identity === 'all') return;
    const canonicalIdentity = canonicalKeyByAlias.get(identity) || identity;
    if (!facts.has(canonicalIdentity)) facts.set(canonicalIdentity, []);
    facts.get(canonicalIdentity).push(fact);
  };

  const bindingFindings = [];
  const referenceRoot = join(bundlePath, 'reference');
  for (const relPath of walkDir(referenceRoot, bundlePath).filter(isReferenceMarkdown)) {
    let content = '';
    try { content = readFileSync(join(bundlePath, relPath), 'utf8'); } catch { continue; }
    const metadata = parseReferenceMetadata(content);
    const binding = resolveReferenceTopicBinding(layouts, metadata);
    if (binding.ok) {
      if (!binding.all) {
        for (const topicKey of binding.topic_keys || []) {
          addFact(topicKey, { kind: 'reference_topic_binding', surface: relPath, durable: true });
        }
      }
      continue;
    }

    if (['reference_topic_uid_unknown', 'reference_topic_binding_unknown'].includes(binding.reason_code) && binding.value) {
      addFact(binding.value, {
        kind: binding.reason_code,
        surface: relPath,
        durable: true,
      });
      continue;
    }

    if (binding.reason_code === 'reference_topic_binding_missing') continue;
    bindingFindings.push({
      id: canonicalFindingId(binding.reason_code || 'reference_topic_binding_invalid', relPath),
      rule_id: binding.reason_code || 'reference_topic_binding_invalid',
      classification: 'blocking',
      topic_identity: null,
      primary_surface: relPath,
      supporting_details: [
        metadata.get('related_topic_uid')
          ? { kind: 'related_topic_uid', surface: `${relPath}#metadata.related_topic_uid` }
          : null,
        metadata.get('related_topic')
          ? { kind: 'related_topic', surface: `${relPath}#metadata.related_topic` }
          : null,
      ].filter(Boolean),
      repair_kind: 'repair_topic_reference',
    });
  }

  for (const wave of ['wave0', 'wave1']) {
    const waveRoot = join(bundlePath, 'artifacts', wave);
    if (!existsSync(waveRoot)) continue;
    for (const entry of readdirSync(waveRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) addFact(entry.name, { kind: `${wave}_path`, surface: `artifacts/${wave}/${entry.name}`, durable: true });
    }
  }

  const seedRoot = join(bundlePath, 'seed_topics');
  if (existsSync(seedRoot)) {
    for (const entry of readdirSync(seedRoot, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) addFact(entry.name.slice(0, -3), { kind: 'seed_path', surface: `seed_topics/${entry.name}`, durable: false });
    }
  }

  for (const item of [...(queue?.active_window || []), ...(queue?.refill_pool || []), ...Object.values(queue?.delegated_in_flight || {})]) {
    const identity = item?.topic_slug || item?.payload?.topic_slug;
    if (identity) addFact(identity, { kind: 'queue_declaration', surface: `rb_queue.json:${item.queue_item_id || identity}`, durable: false });
  }
  for (const declaration of ledgerDeclarations || []) {
    const identity = declaration?.topic_slug || declaration?.payload?.topic_slug;
    if (identity) addFact(identity, { kind: 'work_unit_declaration', surface: declaration.work_id || 'submitted-work-unit', durable: false });
  }

  const canonicalFindings = [...bindingFindings];
  for (const [identity, identityFacts] of facts) {
    if (registeredTopicKeys.has(identity)) continue;
    const durable = identityFacts.find((fact) => fact.durable);
    const primaryFact = durable || identityFacts[0];
    canonicalFindings.push({
      id: canonicalFindingId(durable ? 'unregistered_durable_topic' : 'dangling_topic_identity', identity),
      rule_id: durable ? 'unregistered_durable_topic' : 'dangling_topic_identity',
      classification: durable ? 'blocking' : 'warning',
      topic_identity: identity,
      primary_surface: primaryFact.surface,
      supporting_details: identityFacts.filter((fact) => fact !== primaryFact).map((fact) => ({ kind: fact.kind, surface: fact.surface })),
      repair_kind: durable ? 'reconcile_topic_identity' : 'repair_topic_reference',
    });
  }

  if (targetPhase) {
    for (const topic of registryTopics) {
      const identity = topic.slug || topic.id;
      if (!identity) continue;
      const missing = [];
      if (targetRequires(targetPhase, 'seed') && !existsSync(join(bundlePath, 'seed_topics', `${identity}.md`))) missing.push(`seed_topics/${identity}.md`);
      if (targetRequires(targetPhase, 'wave0') && !existsSync(join(bundlePath, 'artifacts', 'wave0', identity))) missing.push(`artifacts/wave0/${identity}`);
      if (targetRequires(targetPhase, 'wave1') && !existsSync(join(bundlePath, 'artifacts', 'wave1', identity))) missing.push(`artifacts/wave1/${identity}`);
      if (missing.length === 0) continue;
      canonicalFindings.push({
        id: canonicalFindingId('registered_topic_surface_gap', identity),
        rule_id: 'registered_topic_surface_gap',
        classification: 'blocking',
        topic_identity: identity,
        primary_surface: missing[0],
        supporting_details: missing.slice(1).map((surface) => ({ kind: 'missing_surface', surface })),
        repair_kind: 'materialize_canonical_surface',
      });
    }
  }

  const artifactsRoot = join(bundlePath, 'artifacts');
  if (existsSync(artifactsRoot)) {
    for (const entry of readdirSync(artifactsRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && !['wave0', 'wave1', 'wave2'].includes(entry.name)) {
        canonicalFindings.push({
          id: canonicalFindingId('unknown_durable_namespace', entry.name),
          rule_id: 'unknown_durable_namespace',
          classification: 'warning',
          topic_identity: null,
          primary_surface: `artifacts/${entry.name}`,
          supporting_details: [],
          repair_kind: 'classify_namespace',
        });
      }
    }
  }

  return canonicalFindings;
}

/**
 * Audit bundle directories against expected file patterns.
 *
 * Reads topic_registry, queue v2 writes_to/required_receipts, and submitted
 * work-unit declarations to build expected path sets. Walks the bundle and
 * classifies every file. Non-work-unit delegated paths are diagnostic only.
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
  topics = [],
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
      canonical_findings: [],
      inspect: [`Bundle directory not found: ${bundlePath}`],
      advice: ['Verify --bundle points to an existing run bundle.'],
    };
  }

  const topicStateRoot = join(bundlePath, '_diagnostics', 'topic-state');
  const acceptedOperation = existsSync(topicStateRoot)
    ? readdirSync(topicStateRoot).sort().find((name) => existsSync(join(topicStateRoot, name, 'prepared.json')))
    : null;
  if (acceptedOperation) {
    const workspace = `_diagnostics/topic-state/${acceptedOperation}`;
    return {
      findings: [],
      canonical_findings: [{
        id: 'accepted_topic_layout_workspace',
        rule_id: 'accepted_topic_layout_workspace',
        classification: 'blocking',
        topic_identity: null,
        primary_surface: workspace,
        supporting_details: [],
        repair_kind: 'exact_topic_state_recover',
      }],
      inspect: ['[accepted_topic_layout_workspace] A canonical topic layout operation requires exact recovery before file classification.'],
      advice: [`node DEEP_RESEARCH_HARNESS/cli/operate-topic-state.mjs recover --bundle ${bundlePath} --operation-id ${acceptedOperation}`],
    };
  }

  let submittedDeclarations = [];
  let submittedLedgerError = null;
  try {
    submittedDeclarations = readSubmittedWorkUnitDeclarations(bundlePath);
  } catch (error) {
    submittedLedgerError = error;
  }

  let rawDeclarations = ledgerDeclarations;
  if (!Array.isArray(rawDeclarations) || rawDeclarations.length === 0) {
    try { rawDeclarations = readOutputDeclarations(bundlePath); } catch { rawDeclarations = []; }
  }
  const nonSubmittedRows = nonSubmittedDeclarations(rawDeclarations || [], submittedDeclarations);
  const hasBundleMap = existsSync(join(bundlePath, 'BUNDLE_MAP.md'));
  const hasLegacyStartHere = existsSync(join(bundlePath, 'START_FROM_HERE.md'));
  const canonicalFindings = auditCanonicalTopicFootprint(bundlePath, {
    topics,
    topicSlugs,
    queue,
    ledgerDeclarations: submittedDeclarations,
    targetPhase,
  });

  if (hasLegacyStartHere && !hasBundleMap) {
    inspect.push('[legacy_bundle_map] START_FROM_HERE.md is deprecated compatibility; new bundles use BUNDLE_MAP.md.');
    advice.push('Migrate legacy bundle root map to BUNDLE_MAP.md; do not treat START_FROM_HERE.md as current authority.');
  } else if (hasLegacyStartHere && hasBundleMap) {
    inspect.push('[legacy_bundle_map] START_FROM_HERE.md is deprecated compatibility debris; BUNDLE_MAP.md is the current map.');
    advice.push('Remove START_FROM_HERE.md after confirming BUNDLE_MAP.md covers passive navigation needs.');
  }

  if (submittedLedgerError) {
    inspect.push(`[work_unit_ledger_invalid] ${submittedLedgerError.message}`);
  }
  for (const row of nonSubmittedRows) {
    if ((row.output_files || []).length === 0) continue;
    inspect.push(`[non_authoritative_declaration] rb_output_declarations.jsonl:${row.work_id || '<no-work-id>'} is not a submitted work-unit ledger row`);
  }

  // Build expected sets from authoritative submitted rows only.
  const { expectedPaths, declaredPaths } = buildExpectedSets({
    topicSlugs,
    queue,
    ledgerDeclarations: submittedDeclarations,
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

  // Recursive: artifacts/, _cache/, _work_units/, old delegated artifact dir, final/
  for (const dir of ['artifacts', '_cache', '_work_units', '_subagents', 'final']) {
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
  const ctx = { bundlePath, expectedPaths, declaredPaths, explanations, targetPhase };

  for (const relPath of uniqueFiles) {
    const classification = classifyFile(relPath, ctx);
    findings.push({
      path: relPath,
      ...classification,
    });
  }

  const referenceFiles = uniqueFiles
    .filter(isReferenceMarkdown)
    .map((relPath) => ({ relPath, absPath: join(bundlePath, relPath) }));
  const referenceIndex = checkReferenceIndexCoverage(bundlePath, referenceFiles);
  if (!referenceIndex.passed) {
    for (const line of referenceIndex.inspect) inspect.push(line);
    for (const fix of referenceIndex.advice || []) advice.push(fix);
  }

  // ── Cache gap detection (RTI-006) ──
  // For each declared reference file, check if its cache trail exists.
  // Reported via inspect, NOT as a new FILE_CLASSIFICATIONS value.
  for (const decl of submittedDeclarations) {
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
      for (const f of CACHE_BASE_LEAF_FILES) {
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
            const mapping = cacheLeafMapping(meta);
            if (ref.source_url && mapping.urls.some((url) => normalizeCacheMappingUrl(url) === normalizeCacheMappingUrl(ref.source_url))) return true;
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

  for (const decl of submittedDeclarations) {
    const claims = Array.isArray(decl.source_claims) ? decl.source_claims : [];
    if (claims.length === 0) continue;
    const claimResult = checkSourceClaimCacheMapping(bundlePath, claims, {
      topic: typeof decl.queue_item_id === 'string' ? decl.queue_item_id : null,
    });
    if (!claimResult.passed) {
      for (const line of claimResult.inspect) inspect.push(`[cache_source_claim_mismatch] ${line}`);
      for (const fix of claimResult.advice || []) advice.push(fix);
    }
  }

  // Aggregate inspect/advice
  const blockers = findings.filter(f => f.severity === 'blocker');
  const warnings = findings.filter(f => f.severity === 'warning');
  const submittedPhases = new Set(submittedDeclarations.map((decl) => `wave${decl.wave}`));
  const mixed = findings.filter((f) =>
    f.phase && submittedPhases.has(f.phase) &&
    ['orphan_authority_blocking', 'unplanned_needs_explanation'].includes(f.classification));

  if (mixed.length > 0) {
    inspect.push(`[mixed_delegated_provenance] ${mixed.length} non-authoritative delegated file(s) found in phase(s) with submitted work-unit coverage`);
    for (const f of mixed) {
      inspect.push(`  ${f.path}: ${f.reason}`);
    }
    advice.push('Remove or explain non-work-unit delegated artifacts; submitted work-unit coverage cannot be mixed with non-authoritative delegated files.');
  }

  if (blockers.length > 0) {
    inspect.push(`${blockers.length} orphan authority blocking file(s) found`);
    for (const b of blockers) {
      inspect.push(`  ${b.path}: ${b.reason}`);
    }
    advice.push('Orphan files at pass-condition paths must be covered by submitted work-unit ledger rows or explained as non-authoritative.');
  }

  if (warnings.length > 0) {
    inspect.push(`${warnings.length} unplanned file(s) need explanation`);
    for (const w of warnings) {
      inspect.push(`  ${w.path}: ${w.reason}`);
    }
    advice.push('Use log-event.mjs --explain-file to record explanations for unplanned files.');
  }

  for (const finding of canonicalFindings) {
    inspect.push(`[${finding.rule_id}] ${finding.classification.toUpperCase()}: ${finding.primary_surface}${finding.topic_identity ? ` topic=${finding.topic_identity}` : ''}`);
  }
  if (canonicalFindings.some((finding) => finding.classification === 'blocking')) {
    advice.push('Reconcile each explicit topic identity with topic_registry and accepted canonical surfaces; do not grant parallel output authority by explanation alone.');
  }

  return { findings, canonical_findings: canonicalFindings, inspect, advice };
}
