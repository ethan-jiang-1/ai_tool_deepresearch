#!/usr/bin/env node
// check-gate-seed-topics-ready.mjs — evaluates gate-seed-topics-ready rules
// @impl GSK-001, GSK-002, GSK-004, STM-003, STM-007, PRG-007, FRE-003
// Usage: node check-gate-seed-topics-ready.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, statSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  parseGateCliArgs,
  tryLoadGateDefinition,
  validateNodeGateBinding,
  resolveRouting,
  buildGateResult,
  emitGateResult,
  writeGateAttempt,
  checkPhaseHandoffPreflight,
  readBundlePlan,
  parseMdFrontmatter,
} from '../../engine/helpers/gate-helpers.mjs';
import { inspectCanonicalTopicState } from '../../engine/helpers/canonical-topic-state.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

// Load gate definition
const { definition, error: defError } = tryLoadGateDefinition('seed-topics-ready', args.currentNode || null);
if (defError) { emitGateResult(defError, { bundlePath: args.bundle }); }

// Validate node/gate binding
const bindingError = validateNodeGateBinding(args.currentNode, definition.gate);
if (bindingError) {
  const result = {
    check: { passed: false, gate: definition.gate, currentNodeRef: args.currentNode, next: null },
    routing: { kind: 'invalid_input', next: null, detail: bindingError },
    inspect: [bindingError],
    advice: ['Verify --current-node matches the phase for this gate.'],
  };
  emitGateResult(result, { bundlePath: args.bundle });
}

const handoffPreflight = checkPhaseHandoffPreflight(args.bundle, args.currentNode);
if (!handoffPreflight.ok) {
  const routing = resolveRouting(args.transitions, args.currentNode, 'failed');
  const result = buildGateResult({
    passed: false,
    gate: definition.gate,
    currentNodeRef: args.currentNode,
    routing,
    inspect: handoffPreflight.inspect || [handoffPreflight.reason || 'Lifecycle handoff preflight failed'],
    advice: handoffPreflight.advice || ['Follow the handoff remedy and rerun this gate.'],
    extraCheck: { handoff_preflight: false },
    attemptNumber: args.attempt ?? 0,
  });
  writeGateAttempt(args.bundle, result, { strictTrace: result.check?.passed === true && result.check?.next != null });
  emitGateResult(result);
}

const bundlePath = args.bundle;
const inspect = [];
const advice = [];
let allPassed = true;

const topicState = inspectCanonicalTopicState({ bundlePath });
if (topicState.mode === 'blocked' || (topicState.mode === 'canonical' && topicState.passed !== true)) {
  allPassed = false;
  const blocker = topicState.blockers?.[0];
  inspect.push(`Canonical topic-state prerequisite failed: ${blocker?.reason_code || 'unknown'}`);
  advice.push(blocker?.recommended_action || 'Repair the exact UID-bound registry/seed projection and rerun this gate.');
}

// ── Cached parsers (lazy) ──
let _planCache = null;
function getPlan() {
  if (_planCache) return _planCache;
  _planCache = readBundlePlan(bundlePath);
  return _planCache;
}

let _statusCache = null;
function getStatus() {
  if (_statusCache) return _statusCache;
  const p = join(bundlePath, 'rb_status.json');
  if (!existsSync(p)) return null;
  _statusCache = JSON.parse(readFileSync(p, 'utf-8'));
  return _statusCache;
}

/**
 * Collect the disk slug set from seed_topics/*.md files.
 * Returns an array of {slug, filenameStem, filePath} objects.
 */
function getDiskSlugs() {
  const dir = join(bundlePath, 'seed_topics');
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  const files = readdirSync(dir).filter(f => extname(f) === '.md');
  return files.map(f => {
    const filePath = join(dir, f);
    const raw = readFileSync(filePath, 'utf-8');
    const stem = basename(f, '.md');
    let frontmatterSlug = null;
    let frontmatterTitle = null;
    try {
      const fm = parseMdFrontmatter(raw);
      frontmatterSlug = fm.slug || null;
      frontmatterTitle = fm.title || null;
    } catch { /* frontmatter unparseable */ }
    return { slug: frontmatterSlug, title: frontmatterTitle, filenameStem: stem, filePath: f };
  });
}

/**
 * Get registry slugs from rb_plan.md topic_registry.
 */
function getRegistrySlugs() {
  const plan = getPlan();
  if (!plan || !Array.isArray(plan.topic_registry)) return [];
  return plan.topic_registry.map(t => t.slug);
}

// ── Rule evaluation ──
for (const rule of definition.rules) {
  let rulePassed = true;
  let ruleDetail = null;

  try {
    if (rule.check === 'dir_non_empty') {
      const targetPath = join(bundlePath, rule.target);
      if (!existsSync(targetPath) || !statSync(targetPath).isDirectory()) {
        rulePassed = false;
        ruleDetail = `Directory ${rule.target} does not exist`;
      } else {
        const glob = rule.glob || '*.md';
        const ext = glob.replace('*', ''); // simple glob: *.md → .md
        const files = readdirSync(targetPath).filter(f => extname(f) === ext);
        if (files.length === 0) {
          rulePassed = false;
          ruleDetail = `Directory ${rule.target} is empty (no ${glob} files found)`;
        }
      }
    } else if (rule.check === 'cross_field' && rule.mode === 'slug_consistency') {
      if (rule.scope === 'per_file') {
        // Per-file: check each seed_topics/<slug>.md frontmatter slug == filename stem
        const diskInfo = getDiskSlugs();
        const mismatches = [];
        for (const info of diskInfo) {
          if (info.slug !== info.filenameStem) {
            mismatches.push(`${info.filePath}: frontmatter slug="${info.slug}" != filename stem="${info.filenameStem}"`);
          }
        }
        if (mismatches.length > 0) {
          rulePassed = false;
          ruleDetail = `Slug/stem mismatches: ${mismatches.join('; ')}`;
        }
      } else {
        // Bidirectional set equality: disk slug set == registry slug set
        const diskInfo = getDiskSlugs();
        const diskSlugs = new Set(diskInfo.map(d => d.filenameStem));
        const registrySlugs = new Set(getRegistrySlugs());

        if (registrySlugs.size === 0) {
          rulePassed = false;
          ruleDetail = 'topic_registry is empty. Cannot materialize seed topics with no topics defined. Complete HITL1 to populate topic_registry first.';
        } else {
          const missing = [...registrySlugs].filter(s => !diskSlugs.has(s));
          const extra = [...diskSlugs].filter(s => !registrySlugs.has(s));

          if (missing.length > 0 || extra.length > 0) {
            rulePassed = false;
            const parts = [];
            if (missing.length > 0) parts.push(`missing slugs (in registry but not on disk): ${missing.join(', ')}`);
            if (extra.length > 0) parts.push(`extra slugs (on disk but not in registry): ${extra.join(', ')}`);
            ruleDetail = `Slug consistency failed: ${parts.join('; ')}`;
          }
        }
      }
    } else if (rule.check === 'field_non_empty') {
      // per-file title non-empty: iterate all seed_topics/*.md and check title
      const diskInfo = getDiskSlugs();
      const emptyTitles = [];
      for (const info of diskInfo) {
        if (!info.title || info.title.trim() === '') {
          emptyTitles.push(info.filePath);
        }
      }
      if (emptyTitles.length > 0) {
        rulePassed = false;
        ruleDetail = `Files with empty or missing title: ${emptyTitles.join(', ')}`;
      } else if (diskInfo.length === 0) {
        rulePassed = false;
        ruleDetail = 'No seed topic files found to check title fields';
      }
    } else if (rule.check === 'status_value') {
      const [file, jsonPath] = rule.target.split('#/');
      const status = getStatus();
      if (!status) {
        rulePassed = false;
        ruleDetail = 'rb_status.json not found';
      } else {
        const value = jsonPath.split('/').reduce((obj, key) => obj?.[key], status);
        if (value !== rule.expected) {
          rulePassed = false;
          ruleDetail = `${rule.target}: expected "${rule.expected}", got "${value}"`;
        }
      }
    } else if (rule.check === 'placeholder') {
      continue;
    } else {
      rulePassed = false;
      ruleDetail = `Unknown check type: ${rule.check} (mode: ${rule.mode || 'n/a'}) — must fail (check type not implemented)`;
    }
  } catch (err) {
    rulePassed = false;
    const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
    ruleDetail = `Error evaluating rule ${rule.id}: ${safeMsg}`;
  }

  if (!rulePassed) {
    allPassed = false;
    inspect.push(ruleDetail);
    advice.push(rule.failure_message);
  }
}

const outcome = allPassed ? 'passed' : 'failed';
const routing = resolveRouting(args.transitions, args.currentNode, outcome);

const result = buildGateResult({
  passed: allPassed,
  gate: definition.gate,
  currentNodeRef: args.currentNode,
  routing,
  inspect,
  advice,
  attemptNumber: args.attempt ?? 0,
});

writeGateAttempt(bundlePath, result, { strictTrace: result.check?.passed === true && result.check?.next != null });

emitGateResult(result);
