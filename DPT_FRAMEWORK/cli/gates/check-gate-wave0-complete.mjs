#!/usr/bin/env node
// check-gate-wave0-complete.mjs — evaluates gate-wave0-complete rules
// @impl GSK-001, GSK-002, GSK-004, RWG-004, RWG-007, FRE-003
// Usage: node check-gate-wave0-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, statSync, readFileSync, readdirSync, appendFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  parseGateCliArgs,
  tryLoadGateDefinition,
  validateNodeGateBinding,
  resolveRouting,
  buildGateResult,
  emitGateResult,
  readTraceEvents,
  readBundlePlan,
} from '../../engine/helpers/gate-helpers.mjs';
import {
  ReferenceMetadataArraySchema,
} from '../../schema/index.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error); }

// Load gate definition
const { definition, error: defError } = tryLoadGateDefinition('wave0-complete', args.currentNode || null);
if (defError) { emitGateResult(defError); }

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
 * Get topic keys from topic_registry. Returns [] if registry is empty or missing.
 */
function getTopicKeys() {
  const plan = getPlan();
  if (!plan || !Array.isArray(plan.topic_registry) || plan.topic_registry.length === 0) return [];
  return plan.topic_registry.map(t => t.slug);
}

/**
 * Expand {topic} placeholder in target string.
 * If target contains {topic}, return one entry per registry topic.
 * If not, return a single entry with topic=null.
 */
function expandTopicTarget(target) {
  const topics = getTopicKeys();
  if (target.includes('{topic}')) {
    if (topics.length === 0) return []; // empty registry → no expansions, rule fails below
    return topics.map(t => ({ topic: t, resolved: target.replace(/\{topic\}/g, t) }));
  }
  return [{ topic: null, resolved: target }];
}

/**
 * Read YAML array from a file. Returns parsed array or null if file missing/unparseable.
 */
function readYamlArray(filePath) {
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, 'utf-8');
  try {
    const parsed = parseYaml(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ── Rule evaluation ──
for (const rule of definition.rules) {
  if (rule.check === 'placeholder') continue;

  // Expand {topic} targets — each expansion is a sub-check; rule passes only if ALL pass
  const expansions = expandTopicTarget(rule.target);
  if (expansions.length === 0 && rule.target.includes('{topic}')) {
    // Empty topic_registry with {topic} placeholder → fail
    allPassed = false;
    inspect.push(`Empty topic_registry: cannot expand "{topic}" placeholder in rule ${rule.id}. Complete HITL1 to populate topic_registry.`);
    advice.push(rule.failure_message);
    continue;
  }

  for (const exp of expansions) {
    const resolvedTarget = exp.resolved;
    let rulePassed = true;
    let ruleDetail = null;

    try {
      if (rule.check === 'file_exists') {
        const targetPath = join(bundlePath, resolvedTarget);
        if (!existsSync(targetPath)) {
          rulePassed = false;
          ruleDetail = `Missing file: ${resolvedTarget}`;
          if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
        }
      } else if (rule.check === 'dir_exists') {
        const targetPath = join(bundlePath, resolvedTarget);
        if (!existsSync(targetPath) || !statSync(targetPath).isDirectory()) {
          rulePassed = false;
          ruleDetail = `Missing directory: ${resolvedTarget}`;
        }
      } else if (rule.check === 'schema_valid') {
        const filePath = join(bundlePath, resolvedTarget);
        const arr = readYamlArray(filePath);
        if (arr === null) {
          rulePassed = false;
          ruleDetail = `Cannot read or parse YAML array from ${resolvedTarget}`;
          if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
        } else {
          const parsed = ReferenceMetadataArraySchema.safeParse(arr);
          if (!parsed.success) {
            rulePassed = false;
            const issues = parsed.error.issues.map(i => `[${i.path.join('.')}] ${i.message}`).join('; ');
            ruleDetail = `Schema validation failed for ${resolvedTarget}: ${issues}`;
            if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
          }
        }
      } else if (rule.check === 'count_floor') {
        let count = 0;
        if (resolvedTarget.includes('*')) {
          // Glob mode: count files matching wildcard pattern
          const targetDir = join(bundlePath, dirname(resolvedTarget));
          const pattern = basename(resolvedTarget);
          if (existsSync(targetDir) && statSync(targetDir).isDirectory()) {
            const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '[^/]*') + '$');
            count = readdirSync(targetDir).filter(f => regex.test(f)).length;
          }
          if (count < rule.threshold) {
            rulePassed = false;
            ruleDetail = `Count floor not met for ${resolvedTarget}: ${count} files (threshold: ${rule.threshold})`;
            if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
          }
        } else {
          // YAML mode: count array entries
          const filePath = join(bundlePath, resolvedTarget);
          const arr = readYamlArray(filePath);
          count = arr ? arr.length : 0;
          if (count < rule.threshold) {
            rulePassed = false;
            ruleDetail = `Count floor not met for ${resolvedTarget}: ${count} entries (threshold: ${rule.threshold})`;
            if (exp.topic) ruleDetail += ` (topic: ${exp.topic})`;
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
        rulePassed = false;
      ruleDetail = `Unknown check type: ${rule.check} — must fail (check type not implemented)`;
      }
    } catch (err) {
      rulePassed = false;
      const safeMsg = (err.message || String(err)).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
      ruleDetail = `Error evaluating rule ${rule.id} (${resolvedTarget}): ${safeMsg}`;
    }

    if (!rulePassed) {
      allPassed = false;
      inspect.push(ruleDetail);
      advice.push(exp.topic ? rule.failure_message.replace(/\{topic\}/g, exp.topic) : rule.failure_message);
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
