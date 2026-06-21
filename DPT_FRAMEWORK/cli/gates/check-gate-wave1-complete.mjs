#!/usr/bin/env node
// check-gate-wave1-complete.mjs — evaluates gate-wave1-complete rules
// @impl GSK-001, GSK-002, GSK-004, RWG-005, RWG-007
// Usage: node check-gate-wave1-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, statSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseGateCliArgs,
  loadGateDefinition,
  validateNodeGateBinding,
  resolveRouting,
  buildGateResult,
  emitGateResult,
  readTraceEvents,
} from '../../engine/helpers/gate-helpers.mjs';

const args = parseGateCliArgs();

// Load gate definition
const definition = loadGateDefinition('wave1-complete');

// Validate node/gate binding
const bindingError = validateNodeGateBinding(args.currentNode, definition.gate);
if (bindingError) {
  const result = {
    check: { passed: false, gate: definition.gate, currentNodeRef: args.currentNode, next: null },
    routing: { kind: 'invalid_input', next: null, detail: bindingError },
    inspect: [bindingError],
    advice: ['Verify --current-node matches the phase for this gate.'],
  };
  emitGateResult(result);
}

const bundlePath = args.bundle;
const inspect = [];
const advice = [];
let allPassed = true;

// ── Cached parsers (lazy) ──
let _planCache = null;
function getPlan() {
  if (_planCache) return _planCache;
  const p = join(bundlePath, 'rb_plan.md');
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, 'utf-8');
  const m = raw.match(/^---\n([\s\S]*?\n)---/);
  if (!m) return null;
  try { _planCache = JSON.parse(m[1]); } catch { return null; }
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
 * Get topic keys from topic_registry. Returns [] if registry is empty or missing.
 */
function getTopicKeys() {
  const plan = getPlan();
  if (!plan || !Array.isArray(plan.topic_registry) || plan.topic_registry.length === 0) return [];
  return plan.topic_registry.map(t => t.slug);
}

/**
 * Expand {topic} placeholder in target string.
 */
function expandTopicTarget(target) {
  const topics = getTopicKeys();
  if (target.includes('{topic}')) {
    if (topics.length === 0) return [];
    return topics.map(t => ({ topic: t, resolved: target.replace(/\{topic\}/g, t) }));
  }
  return [{ topic: null, resolved: target }];
}

// ── Rule evaluation ──
for (const rule of definition.rules) {
  if (rule.check === 'placeholder') continue;

  // Expand {topic} placeholder in target string (for file_exists, pattern_match, etc.)
  const targets = expandTopicTarget(rule.target);

  if (targets.length === 0) {
    allPassed = false;
    inspect.push(`Empty topic_registry: cannot expand "{topic}" placeholder in rule ${rule.id}.`);
    advice.push(rule.failure_message);
    continue;
  }

  for (const tgt of targets) {
    const resolvedTarget = tgt.resolved;
    let rulePassed = true;
    let ruleDetail = null;

    try {
      if (rule.check === 'file_exists') {
        const targetPath = join(bundlePath, resolvedTarget);
        if (!existsSync(targetPath)) {
          rulePassed = false;
          ruleDetail = `Missing file: ${resolvedTarget}`;
          if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
        }
      } else if (rule.check === 'dir_exists') {
        const targetPath = join(bundlePath, resolvedTarget);
        if (!existsSync(targetPath) || !statSync(targetPath).isDirectory()) {
          rulePassed = false;
          ruleDetail = `Missing directory: ${resolvedTarget}`;
        }
      } else if (rule.check === 'field_value') {
        // For status-like field value checks
        const [file, jsonPath] = rule.target.split('#/');
        if (file === 'rb_status.json') {
          const status = getStatus();
          if (!status) {
            rulePassed = false;
            ruleDetail = 'rb_status.json not found';
          } else {
            const value = jsonPath.split('/').reduce((obj, key) => obj?.[key], status);
            if (rule.operator === 'equal' && value !== rule.value) {
              rulePassed = false;
              ruleDetail = `${rule.target}: expected "${rule.value}", got "${value}"`;
            }
          }
        }
      } else if (rule.check === 'field_non_empty') {
        const [file, jsonPath] = rule.target.split('#/');
        if (file === 'rb_status.json') {
          const status = getStatus();
          if (!status) {
            rulePassed = false;
            ruleDetail = 'rb_status.json not found';
          } else {
            const value = jsonPath.split('/').reduce((obj, key) => obj?.[key], status);
            if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
              rulePassed = false;
              ruleDetail = `${rule.target} is empty or missing`;
            }
          }
        }
      } else if (rule.check === 'pattern_match') {
        // Determine what to match against
        let content;
        if (rule.target === 'basename') {
          // Legacy: match against bundle directory basename
          content = join(bundlePath, '..'); // Actually need the basename
          // Not applicable in wave1 — skip with warning
          ruleDetail = `pattern_match with target="basename" not supported in wave1 gate — skipped`;
        } else {
          // File content mode: target is a file path (relative to bundle root)
          const filePath = join(bundlePath, resolvedTarget);
          if (!existsSync(filePath)) {
            rulePassed = false;
            ruleDetail = `Cannot read file for pattern_match: ${resolvedTarget}`;
            if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
          } else {
            content = readFileSync(filePath, 'utf-8');
          }
        }

        if (content !== undefined && ruleDetail === null) {
          const re = new RegExp(rule.pattern, 'i');
          const matched = re.test(content);

          if (rule.negate) {
            // negate=true: find pattern → FAIL, not found → PASS
            if (matched) {
              rulePassed = false;
              ruleDetail = `Forbidden pattern "${rule.pattern}" found in ${resolvedTarget}`;
              if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
            }
          } else {
            // negate=false: find pattern → PASS, not found → FAIL
            if (!matched) {
              rulePassed = false;
              ruleDetail = `Required pattern "${rule.pattern}" not found in ${resolvedTarget}`;
              if (tgt.topic) ruleDetail += ` (topic: ${tgt.topic})`;
            }
          }
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
      } else if (rule.check === 'trace_event_present') {
        const events = readTraceEvents(bundlePath, rule.target);
        if (events.length === 0) {
          rulePassed = false;
          ruleDetail = `Trace event "${rule.target}" not found in rb_trace.jsonl`;
        }
      } else {
        ruleDetail = `Unknown check type: ${rule.check} — skipped`;
      }
    } catch (err) {
      rulePassed = false;
      const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
      ruleDetail = `Error evaluating rule ${rule.id} (${resolvedTarget}): ${safeMsg}`;
    }

    if (!rulePassed) {
      allPassed = false;
      inspect.push(ruleDetail);
      advice.push(tgt.topic ? rule.failure_message.replace(/\{topic\}/g, tgt.topic) : rule.failure_message);
    }
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
});

// Append runtime audit entry to rb_trace.jsonl (PRG-007)
try {
  const tracePath = join(bundlePath, 'rb_trace.jsonl');
  const traceEntry = JSON.stringify({
    ts: new Date().toISOString(),
    event: 'gate_attempt',
    gate: definition.gate,
    passed: allPassed,
    currentNodeRef: args.currentNode,
    next: result.check.next,
    inspect_count: inspect.length,
    advice_count: advice.length,
  });
  appendFileSync(tracePath, traceEntry + '\n');
} catch {
  // Trace write failure must not affect gate output
}

emitGateResult(result);
