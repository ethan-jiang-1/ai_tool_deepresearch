#!/usr/bin/env node
// check-reentry.mjs — Validate runtime consistency for reentry at a given target
// @impl RRD-002, RRD-003, RRD-005, RRD-008, RRD-009, FIO-001, FIO-006, CHI-003
// Usage: node DPT_FRAMEWORK/cli/check-reentry.mjs --bundle <path> --at <target>
// Exit: 0 = clean, 1 = blockers, 2 = config error
//
// Reads only, never mutates. Derives all facts from bundle files, framework
// specs, and deterministic helpers. Requires no chat memory or free-text
// run summaries.
//
// Target vocabulary is closed — derived from manifest.json phases:
//   Gate forms:  wave1_complete, wave1-complete, seed-topics-ready, etc.
//   Phase forms: phase-wave1, wave1, phases/phase-wave1.md
//   All forms normalize to { kind, status_gate, gate_key, node_ref, phase_key }

import { parseArgs } from 'node:util';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import {
  loadManifest,
  readOutputDeclarations,
  readBundlePlan,
  readBundleProfile,
  parseMdFrontmatter,
} from '../engine/helpers/gate-helpers.mjs';
import { auditFileObservability } from '../engine/helpers/file-observability.mjs';
import { buildRecoverySummary } from '../engine/helpers/recovery-contract.mjs';
import { inspectCanonicalTopicState } from '../engine/helpers/canonical-topic-state.mjs';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const SCHEMA_VERSION = '1.1.0';

const PHASE_ORDER = [
  'instantiation', 'hitl1', 'setup', 'seed-topics', 'wave0', 'wave1', 'wave2',
  'hitl2', 'readiness', 'rerun', 'final',
];

// Phase keys to their expected artifact directories
const PHASE_EXPECTED_ARTIFACTS = {
  'seed-topics': ['seed_topics'],
  wave0: ['artifacts/wave0', 'reference'],
  wave1: ['artifacts/wave1', 'reference'],
  wave2: ['artifacts/wave2'],
};

// ═══════════════════════════════════════════════════════════════════════════
// CLI: argument parsing
// ═══════════════════════════════════════════════════════════════════════════

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    at: { type: 'string' },
  },
});

function emitAndExit(result) {
  writeFileSync(1, `${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.check.exit_code);
}

// Validate required args
if (!values.bundle) {
  emitAndExit({
    schema_version: SCHEMA_VERSION,
    check: { passed: false, target: null, exit_code: 2 },
    blockers: [],
    warnings: [],
    drift: [],
    findings: [],
    inspect: ['Missing required argument: --bundle <path>'],
    advice: ['Provide --bundle <path> pointing to an active run or disposable bundle.'],
  });
}

if (!values.at) {
  emitAndExit({
    schema_version: SCHEMA_VERSION,
    check: { passed: false, target: null, exit_code: 2 },
    blockers: [],
    warnings: [],
    drift: [],
    findings: [],
    inspect: ['Missing required argument: --at <target>'],
    advice: ['Provide --at with a gate (e.g. wave1_complete) or phase (e.g. phase-wave1).'],
  });
}

const bundlePath = values.bundle;
const rawTarget = values.at;

// Verify bundle exists
if (!existsSync(bundlePath)) {
  emitAndExit({
    schema_version: SCHEMA_VERSION,
    check: { passed: false, target: rawTarget, exit_code: 2 },
    blockers: [],
    warnings: [],
    drift: [],
    findings: [],
    inspect: [`Bundle directory not found: ${bundlePath}`],
    advice: ['Verify --bundle points to an existing run bundle.'],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Target normalization (RRD-002 — closed vocabulary from manifest)
// ═══════════════════════════════════════════════════════════════════════════

function normalizeTarget(raw, manifest) {
  const input = raw.trim();
  const inputLower = input.toLowerCase().replace(/-/g, '_');

  const vocab = [];

  for (const phase of manifest.phases) {
    const gateHyphen = phase.gate; // e.g. "wave1-complete"
    const gateUnderscore = (gateHyphen || '').replace(/-/g, '_'); // e.g. "wave1_complete"
    const phaseKey = phase.key; // e.g. "wave1"
    const phaseNode = phase.node; // e.g. "phases/phase-wave1.md"
    const phaseName = `phase-${phaseKey}`; // e.g. "phase-wave1"

    // Gate forms
    if (gateHyphen) {
      vocab.push({ form: gateHyphen, kind: 'gate', status_gate: gateUnderscore, gate_key: gateHyphen, node_ref: phaseNode, phase_key: phaseKey });
      vocab.push({ form: gateUnderscore, kind: 'gate', status_gate: gateUnderscore, gate_key: gateHyphen, node_ref: phaseNode, phase_key: phaseKey });
    }

    // Phase forms
    vocab.push({ form: phaseKey, kind: 'phase', status_gate: gateUnderscore, gate_key: gateHyphen, node_ref: phaseNode, phase_key: phaseKey });
    vocab.push({ form: phaseName, kind: 'phase', status_gate: gateUnderscore, gate_key: gateHyphen, node_ref: phaseNode, phase_key: phaseKey });
    vocab.push({ form: phaseNode, kind: 'phase', status_gate: gateUnderscore, gate_key: gateHyphen, node_ref: phaseNode, phase_key: phaseKey });
  }

  const match = vocab.find(v => v.form === input || v.form.toLowerCase() === inputLower);
  if (match) {
    return {
      input,
      kind: match.kind,
      status_gate: match.status_gate,
      gate_key: match.gate_key,
      node_ref: match.node_ref,
      phase_key: match.phase_key,
    };
  }

  return null;
}

const manifest = loadManifest();
const target = normalizeTarget(rawTarget, manifest);

if (!target) {
  const examples = manifest.phases.slice(0, 5).flatMap(p => {
    const entries = [p.key, `phase-${p.key}`];
    if (p.gate) entries.push(p.gate, (p.gate || '').replace(/-/g, '_'));
    return entries;
  });
  emitAndExit({
    schema_version: SCHEMA_VERSION,
    check: { passed: false, target: rawTarget, exit_code: 2 },
    normalized_target: null,
    blockers: [],
    warnings: [],
    drift: [],
    findings: [],
    inspect: [`Unknown target: "${rawTarget}". Must be a gate or phase from the manifest.`],
    advice: [`Examples of valid targets: ${examples.join(', ')}`],
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Checkpoint selection (RRD-002 — latest matching target, fallback to global)
// ═══════════════════════════════════════════════════════════════════════════

function selectCheckpoint(bundlePath, target) {
  const ckptDir = join(bundlePath, '_checkpoints');
  const warnings = [];

  if (!existsSync(ckptDir)) {
    return { checkpoint: null, warnings: ['No _checkpoints/ directory — checkpoint-based drift detection unavailable.'] };
  }

  let checkpoints = [];
  try {
    checkpoints = readdirSync(ckptDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const raw = JSON.parse(readFileSync(join(ckptDir, f), 'utf-8'));
          return { file: f, ...raw };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  } catch {
    return { checkpoint: null, warnings: ['Cannot read _checkpoints/ directory.'] };
  }

  if (checkpoints.length === 0) {
    return { checkpoint: null, warnings: ['_checkpoints/ directory is empty.'] };
  }

  // Try to match the target
  const targetGate = target.gate_key;
  const targetStatusGate = target.status_gate;

  const matching = checkpoints.filter(c => {
    if (c.gate_result_ref?.gate === targetGate) return true;
    if (c.normalized_target?.gate_key === targetGate) return true;
    if (c.normalized_target?.status_gate === targetStatusGate) return true;
    return false;
  });

  if (matching.length > 0) {
    return { checkpoint: matching[0], warnings };
  }

  // Fallback: global latest
  const latest = checkpoints[0];
  warnings.push(`No checkpoint matching "${target.input}" found; using latest global checkpoint (${latest.gate_result_ref?.gate || 'unknown'}) for drift context only.`);
  return { checkpoint: latest, warnings };
}

const { checkpoint, warnings: checkpointWarnings } = selectCheckpoint(bundlePath, target);

function readStatusPosition(bundlePath) {
  const statusPath = join(bundlePath, 'rb_status.json');
  if (!existsSync(statusPath)) {
    return {
      readable: false,
      current_gate: null,
      next_gate: null,
      current_node: null,
      current_node_present: false,
      current_node_status: 'missing_status',
      error: 'rb_status.json not found',
    };
  }

  try {
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    const currentNodePresent = Object.prototype.hasOwnProperty.call(status, 'current_node');
    const currentNode = currentNodePresent ? status.current_node : null;
    return {
      readable: true,
      current_gate: status.current_gate || null,
      next_gate: status.next_gate || null,
      current_node: currentNode ?? null,
      current_node_present: currentNodePresent,
      current_node_status: typeof currentNode === 'string' && currentNode.length > 0
        ? 'populated'
        : (currentNodePresent ? 'null' : 'absent'),
      error: null,
    };
  } catch (err) {
    return {
      readable: false,
      current_gate: null,
      next_gate: null,
      current_node: null,
      current_node_present: false,
      current_node_status: 'unparseable_status',
      error: err.message,
    };
  }
}

const statusPosition = readStatusPosition(bundlePath);

// ═══════════════════════════════════════════════════════════════════════════
// Audit: status compatibility
// ═══════════════════════════════════════════════════════════════════════════

function auditStatusCompatibility(bundlePath, target) {
  const blockers = [];
  const warnings = [];

  const statusPath = join(bundlePath, 'rb_status.json');
  if (!existsSync(statusPath)) {
    blockers.push({ severity: 'blocker', check: 'status', message: 'rb_status.json not found — cannot verify target compatibility.' });
    return { blockers, warnings };
  }

  let status;
  try { status = JSON.parse(readFileSync(statusPath, 'utf-8')); } catch {
    blockers.push({ severity: 'blocker', check: 'status', message: 'rb_status.json is unparseable.' });
    return { blockers, warnings };
  }

  const currentGate = status.current_gate || '';
  const targetGate = target.status_gate;

  if (currentGate !== targetGate) {
    blockers.push({
      severity: 'blocker',
      check: 'status_compatibility',
      message: `Status current_gate is "${currentGate}", expected "${targetGate}" for target "${target.input}".`,
      detail: { current_gate: currentGate, expected: targetGate, target: target.input },
    });
  }

  return { blockers, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════
// Audit: queue/lifecycle conflicts (RRD-003)
// ═══════════════════════════════════════════════════════════════════════════

function auditQueueConflicts(bundlePath, target, manifest) {
  const blockers = [];
  const warnings = [];

  const queuePath = join(bundlePath, 'rb_queue.json');
  if (!existsSync(queuePath)) {
    return { blockers, warnings }; // No queue — nothing to conflict
  }

  let queue;
  try { queue = JSON.parse(readFileSync(queuePath, 'utf-8')); } catch {
    warnings.push({ severity: 'warning', check: 'queue_conflict', message: 'rb_queue.json is unparseable.' });
    return { blockers, warnings };
  }

  const targetPhaseIdx = PHASE_ORDER.indexOf(target.phase_key);
  if (targetPhaseIdx === -1) return { blockers, warnings };

  // Collect all queue v2 demand items and in-flight bindings.
  const allItems = [];
  if (Array.isArray(queue.active_window)) {
    for (const item of queue.active_window) {
      allItems.push({ location: 'active_window', item });
    }
  }
  if (Array.isArray(queue.refill_pool)) {
    for (const item of queue.refill_pool) {
      allItems.push({ location: 'refill_pool', item });
    }
  }
  if (queue.delegated_in_flight && typeof queue.delegated_in_flight === 'object') {
    for (const [queueItemId, binding] of Object.entries(queue.delegated_in_flight)) {
      allItems.push({
        location: 'delegated_in_flight',
        queue_item_id: queueItemId,
        item: binding?.queue_item || binding,
      });
    }
  }

  // Derive phase from queue demand identity or producer rule.
  function derivePhaseKey(item) {
    const prefixes = ['wave0', 'wave1', 'wave2', 'seed-topics', 'setup', 'hitl1', 'hitl2', 'readiness', 'rerun', 'final', 'instantiation'];
    const identity = item.queue_item_id || '';
    for (const prefix of prefixes) {
      if (identity.startsWith(prefix)) return prefix;
    }
    // Try producer_rule
    const ruleMap = {
      topic_deepening: 'wave1',
      cross_topic_synthesis: 'wave2',
      seed_topic_backfill_wave2: 'wave2',
      seed_topic_materialization: 'seed-topics',
      shared_reference_intake: 'wave0',
    };
    if (ruleMap[item.producer_rule]) return ruleMap[item.producer_rule];
    return null;
  }

  for (const { location, queue_item_id, item } of allItems) {
    const itemPhase = derivePhaseKey(item);
    const itemPhaseIdx = itemPhase ? PHASE_ORDER.indexOf(itemPhase) : -1;
    const itemId = item.queue_item_id || queue_item_id || '(unknown queue item)';

    // Skip if we can't determine phase
    if (itemPhaseIdx === -1) {
      warnings.push({
        severity: 'warning',
        check: 'queue_conflict',
        message: `Cannot determine phase for queue item ${itemId} (location: ${location})`,
        detail: { queue_item_id: itemId, location, status: item.status },
      });
      continue;
    }

    // Prior-phase work
    if (itemPhaseIdx < targetPhaseIdx) {
      const isActive = item.status === 'queued' || item.status === 'running';
      const affectsGate = (item.writes_to || []).some(w => {
        // Check if writes_to target matches pass-condition patterns for the target gate
        const patterns = {
          wave0: [/^artifacts\/wave0\//, /^reference\/00-shared-/],
          wave1: [/^artifacts\/wave1\//, /^reference\//],
          wave2: [/^artifacts\/wave2\//],
          'seed-topics': [/^seed_topics\//],
        };
        const pats = patterns[target.phase_key];
        // If no specific patterns defined for this phase, any prior-phase active
        // work is conservatively treated as affecting gate pass conditions.
        if (!pats) return true;
        return pats.some(p => p.test(w));
      });

      if (isActive && affectsGate) {
        blockers.push({
          severity: 'blocker',
          check: 'queue_conflict',
          message: `Prior-phase queue item ${itemId} (phase: ${itemPhase}, status: ${item.status}) affects target gate pass conditions.`,
          detail: { queue_item_id: itemId, location, phase: itemPhase, status: item.status, writes_to: item.writes_to },
        });
      } else if (item.status === 'done' || item.status === 'failed' || item.status === 'blocked') {
        warnings.push({
          severity: 'warning',
          check: 'queue_conflict',
          message: `Prior-phase queue item ${itemId} (phase: ${itemPhase}) is ${item.status}.`,
          detail: { queue_item_id: itemId, location, phase: itemPhase, status: item.status },
        });
      } else if (isActive) {
        warnings.push({
          severity: 'warning',
          check: 'queue_conflict',
          message: `Prior-phase queue item ${itemId} (phase: ${itemPhase}, status: ${item.status}) is still active.`,
          detail: { queue_item_id: itemId, location, phase: itemPhase, status: item.status },
        });
      }
    }

    // Future-phase work — info only, not a conflict
    if (itemPhaseIdx > targetPhaseIdx) {
      warnings.push({
        severity: 'info',
        check: 'queue_conflict',
        message: `Future-phase queue item ${itemId} (phase: ${itemPhase}) present — not a conflict, noted for awareness.`,
        detail: { queue_item_id: itemId, location, phase: itemPhase, status: item.status },
      });
    }
  }

  return { blockers, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════
// Audit: required artifacts
// ═══════════════════════════════════════════════════════════════════════════

function auditRequiredArtifacts(bundlePath, target) {
  const blockers = [];
  const warnings = [];

  // Get topic slugs from plan
  let topicSlugs = [];
  try {
    const plan = readBundlePlan(bundlePath);
    if (plan && Array.isArray(plan.topic_registry)) {
      topicSlugs = plan.topic_registry.map(t => t.slug).filter(Boolean);
    }
  } catch { /* ignore */ }

  const phaseKey = target.phase_key;

  // Phase-specific artifact checks
  if (phaseKey === 'instantiation' || phaseKey === 'hitl1' || phaseKey === 'setup') {
    // Pre-research phases — no per-topic artifacts
    const required = ['rb_plan.md', 'rb_profile.yaml', 'rb_status.json'];
    for (const f of required) {
      if (!existsSync(join(bundlePath, f))) {
        blockers.push({
          severity: 'blocker',
          check: 'required_artifact',
          message: `Required file missing: ${f}`,
          detail: { path: f, phase: phaseKey },
        });
      }
    }
  }

  if (phaseKey === 'seed-topics') {
    if (topicSlugs.length === 0) {
      blockers.push({ severity: 'blocker', check: 'required_artifact', message: 'topic_registry is empty — no seed topics to verify.' });
    }
    for (const slug of topicSlugs) {
      const p = join(bundlePath, 'seed_topics', `${slug}.md`);
      if (!existsSync(p)) {
        blockers.push({
          severity: 'blocker',
          check: 'required_artifact',
          message: `Missing seed topic file: seed_topics/${slug}.md`,
          detail: { path: `seed_topics/${slug}.md`, phase: phaseKey },
        });
      }
    }
  }

  if (phaseKey === 'wave0') {
    if (!existsSync(join(bundlePath, 'artifacts', 'wave0'))) {
      blockers.push({ severity: 'blocker', check: 'required_artifact', message: 'Missing directory: artifacts/wave0/' });
    }
    if (!existsSync(join(bundlePath, 'reference', '_INDEX.md'))) {
      warnings.push({ severity: 'warning', check: 'required_artifact', message: 'Missing reference/_INDEX.md' });
    }
  }

  if (phaseKey === 'wave1') {
    for (const slug of topicSlugs) {
      const es = join(bundlePath, 'artifacts', 'wave1', slug, 'evidence-summary.md');
      const ql = join(bundlePath, 'artifacts', 'wave1', slug, 'question-list.md');
      if (!existsSync(es)) {
        blockers.push({
          severity: 'blocker',
          check: 'required_artifact',
          message: `Missing evidence-summary for topic ${slug}`,
          detail: { path: `artifacts/wave1/${slug}/evidence-summary.md`, phase: phaseKey },
        });
      }
      if (!existsSync(ql)) {
        blockers.push({
          severity: 'blocker',
          check: 'required_artifact',
          message: `Missing question-list for topic ${slug}`,
          detail: { path: `artifacts/wave1/${slug}/question-list.md`, phase: phaseKey },
        });
      }
    }
  }

  if (phaseKey === 'wave2') {
    for (const f of ['synthesis.md', 'cross-topic-ledger.md', 'finding-index.yaml']) {
      const p = join(bundlePath, 'artifacts', 'wave2', f);
      if (!existsSync(p)) {
        blockers.push({
          severity: 'blocker',
          check: 'required_artifact',
          message: `Missing wave2 artifact: artifacts/wave2/${f}`,
          detail: { path: `artifacts/wave2/${f}`, phase: phaseKey },
        });
      }
    }
  }

  return { blockers, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════
// Audit: ledger coverage (orphan reference detection)
// ═══════════════════════════════════════════════════════════════════════════

function auditLedgerCoverage(bundlePath, target) {
  const blockers = [];
  const warnings = [];

  // Only relevant for phases with reference files
  const refPhases = ['wave0', 'wave1', 'wave2'];
  if (!refPhases.includes(target.phase_key)) return { blockers, warnings };

  const declarations = readOutputDeclarations(bundlePath);
  const declaredPaths = new Set();
  for (const decl of declarations) {
    for (const entry of decl.output_files || []) {
      declaredPaths.add(entry.path);
    }
  }

  // Check reference/ directory for undeclared files
  const refDir = join(bundlePath, 'reference');
  if (!existsSync(refDir)) return { blockers, warnings };

  let refFiles = [];
  try {
    refFiles = readdirSync(refDir)
      .filter(f => f.endsWith('.md') && f !== '_INDEX.md' && f !== 'README.md')
      .map(f => join('reference', f));
  } catch { /* ignore */ }

  for (const rf of refFiles) {
    if (!declaredPaths.has(rf)) {
      blockers.push({
        severity: 'blocker',
        check: 'ledger_coverage',
        message: `Reference file is not declared in rb_output_declarations.jsonl: ${rf}`,
        detail: { path: rf, phase: target.phase_key },
      });
    }
  }

  return { blockers, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════
// Audit: checkpoint drift (RRD-002)
// ═══════════════════════════════════════════════════════════════════════════

function auditCheckpointDrift(bundlePath, checkpoint) {
  const drift = [];

  if (!checkpoint) {
    return { drift, warnings: ['No checkpoint available — drift detection skipped.'] };
  }

  const warnings = [];
  const hashes = checkpoint.hashes || {};

  // Control files — hash drift is a blocker
  const controlFiles = ['rb_status.json', 'rb_queue.json', 'rb_plan.md', 'rb_profile.yaml', 'rb_output_declarations.jsonl'];
  for (const cf of controlFiles) {
    const fp = join(bundlePath, cf);
    const prevHash = hashes[cf];

    if (!prevHash) continue;

    if (!existsSync(fp)) {
      drift.push({
        path: cf,
        severity: 'blocker',
        checkpoint_hash: prevHash.sha256,
        current_hash: null,
        detail: 'Control file missing since checkpoint',
      });
      continue;
    }

    try {
      const content = readFileSync(fp);
      const st = statSync(fp);
      const currentHash = createHash('sha256').update(content).digest('hex');

      if (currentHash !== prevHash.sha256) {
        drift.push({
          path: cf,
          severity: 'blocker',
          checkpoint_hash: prevHash.sha256,
          current_hash: currentHash,
          checkpoint_size: prevHash.size,
          current_size: st.size,
          checkpoint_mtime: prevHash.mtime,
          current_mtime: st.mtime.toISOString(),
          detail: 'Control file content has changed since checkpoint',
        });
      }
    } catch {
      drift.push({
        path: cf,
        severity: 'warning',
        detail: 'Cannot read control file for drift comparison',
      });
    }
  }

  // Cursor drift — append-only logs advancing is info
  const cursors = checkpoint.cursors || {};
  const cursorFiles = {
    trace_lines: join(bundlePath, 'rb_trace.jsonl'),
    log_lines: join(bundlePath, '_logs', 'run.log'),
    ledger_lines: join(bundlePath, 'rb_output_declarations.jsonl'),
  };

  for (const [key, fp] of Object.entries(cursorFiles)) {
    const prevCount = cursors[key];
    if (prevCount === undefined || prevCount === -1) continue;

    try {
      if (!existsSync(fp)) continue;
      const currentCount = readFileSync(fp, 'utf-8').split('\n').filter(l => l.trim()).length;
      if (currentCount !== prevCount) {
        drift.push({
          path: key,
          severity: 'info',
          checkpoint_cursor: prevCount,
          current_cursor: currentCount,
          delta: currentCount - prevCount,
          detail: `${key} cursor advanced by ${currentCount - prevCount} lines since checkpoint`,
        });
      }
    } catch { /* ignore */ }
  }

  // Artifact inventory drift — non-authority files changing is a warning
  const artifactInventory = checkpoint.artifact_inventory || {};
  for (const [dir, prevFiles] of Object.entries(artifactInventory)) {
    if (!Array.isArray(prevFiles)) continue;
    const dp = join(bundlePath, dir);
    if (!existsSync(dp)) {
      if (prevFiles.length > 0) {
        drift.push({
          path: dir,
          severity: 'warning',
          detail: `Directory ${dir}/ existed at checkpoint but is now missing`,
        });
      }
      continue;
    }

    // For authority artifacts (wave outputs), changes are warnings
    const isAuthorityDir = ['artifacts', 'reference'].includes(dir) ||
      dir.startsWith('artifacts/');
    const severity = isAuthorityDir ? 'warning' : 'info';

    try {
      const currentFiles = new Set();
      const walk = (d, base) => {
        for (const entry of readdirSync(d, { withFileTypes: true })) {
          const rel = join(base, entry.name);
          if (entry.isFile()) currentFiles.add(rel);
          else if (entry.isDirectory()) walk(join(d, entry.name), rel);
        }
      };
      walk(dp, dir);

      const prevSet = new Set(prevFiles);
      const added = [...currentFiles].filter(f => !prevSet.has(f));
      const removed = [...prevSet].filter(f => !currentFiles.has(f));

      if (added.length > 0 || removed.length > 0) {
        drift.push({
          path: dir,
          severity,
          added_files: added.slice(0, 10),
          removed_files: removed.slice(0, 10),
          added_count: added.length,
          removed_count: removed.length,
          detail: `Directory ${dir}/ changed: +${added.length} files, -${removed.length} files since checkpoint`,
        });
      }
    } catch { /* ignore */ }
  }

  return { drift, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════
// Run all audits
// ═══════════════════════════════════════════════════════════════════════════

const allBlockers = [];
const allWarnings = [];
const allDrift = [];
const allFindings = [];
const allInspect = [];
const allAdvice = [];

// 1. Status compatibility
const statusAudit = auditStatusCompatibility(bundlePath, target);
allBlockers.push(...statusAudit.blockers);
allWarnings.push(...statusAudit.warnings);

// 2. Queue conflicts
const queueAudit = auditQueueConflicts(bundlePath, target, manifest);
allBlockers.push(...queueAudit.blockers);
allWarnings.push(...queueAudit.warnings);

// 3. Required artifacts
const artifactAudit = auditRequiredArtifacts(bundlePath, target);
allBlockers.push(...artifactAudit.blockers);
allWarnings.push(...artifactAudit.warnings);

// 4. Ledger coverage
const ledgerAudit = auditLedgerCoverage(bundlePath, target);
allBlockers.push(...ledgerAudit.blockers);
allWarnings.push(...ledgerAudit.warnings);

// 5. Checkpoint drift
const driftAudit = auditCheckpointDrift(bundlePath, checkpoint);
allDrift.push(...driftAudit.drift);
allWarnings.push(...driftAudit.warnings);

// 6. Checkpoint selection warnings
allWarnings.push(...checkpointWarnings.map(m => ({ severity: 'info', check: 'checkpoint_selection', message: m })));

if (statusPosition.current_node_status === 'null' || statusPosition.current_node_status === 'absent') {
  allWarnings.push({
    severity: 'info',
    check: 'status_current_node',
    message: 'rb_status.json lacks a populated current_node; falling back to target/status/trace diagnostics.',
    detail: { current_node_status: statusPosition.current_node_status },
  });
  const hasBundleMap = existsSync(join(bundlePath, 'BUNDLE_MAP.md'));
  const hasLegacyStartHere = existsSync(join(bundlePath, 'START_FROM_HERE.md'));
  const mapAdvice = hasBundleMap
    ? 'use BUNDLE_MAP.md, trace, and reentry diagnostics'
    : hasLegacyStartHere
      ? 'use legacy START_FROM_HERE.md only as deprecated bundle-map compatibility, then migrate to BUNDLE_MAP.md; also use trace and reentry diagnostics'
      : 'restore BUNDLE_MAP.md, then use trace and reentry diagnostics';
  allAdvice.push(`rb_status.json.current_node is not populated; the next successful enter-phase will populate it. Until then, ${mapAdvice} rather than guessing from current_gate alone.`);
}

// 7. File observability
let topics = [];
let topicSlugs = [];
try {
  const plan = readBundlePlan(bundlePath);
  if (plan && Array.isArray(plan.topic_registry)) {
    topics = plan.topic_registry;
    topicSlugs = plan.topic_registry.map(t => t.slug).filter(Boolean);
  }
} catch { /* ignore */ }

let queue = null;
try {
  const qp = join(bundlePath, 'rb_queue.json');
  if (existsSync(qp)) queue = JSON.parse(readFileSync(qp, 'utf-8'));
} catch { /* ignore */ }

const ledgerDeclarations = readOutputDeclarations(bundlePath);

const foResult = auditFileObservability(bundlePath, {
  topics,
  topicSlugs,
  queue,
  ledgerDeclarations,
  targetPhase: target.phase_key,
});

allFindings.push(...foResult.findings);
allInspect.push(...foResult.inspect);
allAdvice.push(...foResult.advice);
for (const finding of foResult.canonical_findings || []) {
  if (finding.classification !== 'blocking') continue;
  if (finding.rule_id === 'accepted_topic_layout_workspace') continue;
  allBlockers.push({
    severity: 'blocker',
    check: 'canonical_topic_footprint',
    message: `${finding.rule_id}: ${finding.primary_surface}${finding.topic_identity ? ` topic=${finding.topic_identity}` : ''}`,
    detail: { finding_id: finding.id, topic_identity: finding.topic_identity, surface: finding.primary_surface },
  });
}

// 8. Canonical topic-state inspection (read-only)
const topicStateInspection = inspectCanonicalTopicState({ bundlePath });
if (topicStateInspection.mode === 'blocked') {
  const blocker = topicStateInspection.blockers[0];
  allBlockers.push({ severity: 'blocker', check: 'canonical_topic_state', message: `accepted topic-state workspace ${blocker.operation_id}`, detail: blocker });
  allAdvice.push(blocker.recommended_action);
} else if (topicStateInspection.mode === 'canonical') {
  for (const blocker of topicStateInspection.blockers || []) {
    allBlockers.push({ severity: 'blocker', check: 'canonical_topic_state', message: `${blocker.reason_code}: ${blocker.slug || blocker.topic_uid || 'topic'}`, detail: blocker });
  }
} else if (topicStateInspection.mode === 'legacy' && statusPosition.current_node === 'phases/phase-final.md') {
  allBlockers.push({ severity: 'blocker', check: 'canonical_topic_state', message: 'post-final legacy topic migration requires missing C5 reentry authority', detail: { reason_code: 'post_final_c5_required' } });
}

// Merge inspect/advice from audits
for (const b of allBlockers) {
  allInspect.push(`[${b.check}] ${b.message}`);
}
for (const w of allWarnings) {
  if (w.severity !== 'info') {
    allInspect.push(`[${w.check}] ${w.message}`);
  }
}
for (const d of allDrift) {
  allInspect.push(`[drift] ${d.path}: ${d.detail}`);
}

if (allBlockers.length > 0) {
  allAdvice.push(`${allBlockers.length} blocker(s) found. Resolve each before reentry.`);
}
if (allDrift.some(d => d.severity === 'blocker')) {
  allAdvice.push('Control file drift detected — restore from last known good state or accept the changes and create a new checkpoint.');
}

// ═══════════════════════════════════════════════════════════════════════════
// Assemble result and exit
// ═══════════════════════════════════════════════════════════════════════════

const exitCode = allBlockers.length > 0 ? 1 : 0;
const recovery = buildRecoverySummary({
  canonicalFindings: foResult.canonical_findings || [],
  blockers: allBlockers,
  target,
  statusPosition,
});
for (const root of recovery.root_findings) {
  if (root.sanctioned_path_status === 'reachable' && root.recommended_action?.command) allAdvice.push(root.recommended_action.command);
  if (root.sanctioned_path_status === 'missing_contract') allAdvice.push(`[missing_contract] ${root.direct_blocker}`);
}

const result = {
  schema_version: SCHEMA_VERSION,
  check: {
    passed: allBlockers.length === 0,
    target: target.input,
    exit_code: exitCode,
  },
  normalized_target: {
    input: target.input,
    kind: target.kind,
    status_gate: target.status_gate,
    gate_key: target.gate_key,
    node_ref: target.node_ref,
    phase_key: target.phase_key,
  },
  checkpoint: checkpoint ? {
    created_at: checkpoint.created_at,
    gate: checkpoint.gate_result_ref?.gate,
    passed: checkpoint.gate_result_ref?.passed,
  } : null,
  runtime_position: {
    current_node: statusPosition.current_node,
    current_node_present: statusPosition.current_node_present,
    current_node_status: statusPosition.current_node_status,
    current_gate: statusPosition.current_gate,
    next_gate: statusPosition.next_gate,
    status_readable: statusPosition.readable,
    status_error: statusPosition.error,
  },
  blockers: allBlockers,
  warnings: allWarnings,
  drift: allDrift,
  findings: allFindings,
  recovery,
  canonical_topic_state: topicStateInspection,
  inspect: allInspect,
  advice: allAdvice,
};

emitAndExit(result);
