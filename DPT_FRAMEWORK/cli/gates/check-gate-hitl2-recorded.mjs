#!/usr/bin/env node
// check-gate-hitl2-recorded.mjs — evaluates gate-hitl2-recorded rules
// @impl GSK-001, GSK-002, GSK-004, CDG-003
// Usage: node check-gate-hitl2-recorded.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  stripMdFrontmatter,
} from '../../engine/helpers/gate-helpers.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

// Load gate definition
const { definition, error: defError } = tryLoadGateDefinition('hitl2-recorded', args.currentNode || null);
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

// ── Cached parsers (lazy) ──
let _statusCache = null;
function getStatus() {
  if (_statusCache) return _statusCache;
  const p = join(bundlePath, 'rb_status.json');
  if (!existsSync(p)) return null;
  _statusCache = JSON.parse(readFileSync(p, 'utf-8'));
  return _statusCache;
}

let _profileCache = null;
let _profileParseFailed = false;
function getProfile() {
  if (_profileCache !== null) return _profileCache;
  const profilePath = join(bundlePath, 'rb_profile.yaml');
  if (!existsSync(profilePath)) { _profileParseFailed = true; _profileCache = null; return null; }
  try {
    _profileCache = parseYaml(readFileSync(profilePath, 'utf-8'));
  } catch {
    _profileParseFailed = true;
    _profileCache = null;
  }
  return _profileCache;
}

// Helper: resolve JSON/YAML path like "human_decision_checkpoints/hitl2/status"
function resolvePath(obj, pathStr) {
  return pathStr.split('/').reduce((o, k) => o?.[k], obj);
}

// ── Rule evaluation ──
for (const rule of definition.rules) {
  if (rule.check === 'placeholder') continue;

  let rulePassed = true;
  let ruleDetail = null;

  try {
    if (rule.check === 'file_exists') {
      const targetPath = join(bundlePath, rule.target);
      if (!existsSync(targetPath)) {
        rulePassed = false;
        ruleDetail = `Missing file: ${rule.target}`;
      }
    } else if (rule.check === 'yaml_parse') {
      const profile = getProfile();
      if (_profileParseFailed) {
        rulePassed = false;
        // Re-parse to get the error message
        const profilePath = join(bundlePath, 'rb_profile.yaml');
        try {
          parseYaml(readFileSync(profilePath, 'utf-8'));
        } catch (err) {
          ruleDetail = `YAML parse error in rb_profile.yaml: ${err.message}`;
        }
      } else if (profile === null) {
        rulePassed = false;
        ruleDetail = 'rb_profile.yaml not found';
      }
    } else if (rule.check === 'field_non_empty') {
      const target = rule.target;
      if (target.endsWith('.md') || target.startsWith('artifacts/')) {
        // File content check (decision brief)
        const filePath = join(bundlePath, target);
        if (!existsSync(filePath)) {
          rulePassed = false;
          ruleDetail = `File not found: ${target}`;
        } else {
          const content = readFileSync(filePath, 'utf-8');
          const bodyContent = stripMdFrontmatter(content);
          if (bodyContent.length === 0) {
            rulePassed = false;
            ruleDetail = `${target} is empty (no content after frontmatter)`;
          }
        }
      } else {
        // YAML field path check
        const [, jsonPath] = target.split('#/');
        const profile = getProfile();
        if (_profileParseFailed || profile === null) {
          rulePassed = false;
          ruleDetail = `Cannot check ${target}: rb_profile.yaml not found or unparseable`;
        } else {
          const value = resolvePath(profile, jsonPath);
          if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
            rulePassed = false;
            ruleDetail = `${target} is empty or missing`;
          }
        }
      }
    } else if (rule.check === 'field_value') {
      const [, jsonPath] = rule.target.split('#/');
      const profile = getProfile();
      if (profile === null) {
        rulePassed = false;
        ruleDetail = 'rb_profile.yaml not found or unparseable';
      } else {
        const value = resolvePath(profile, jsonPath);
        if (rule.operator === 'equal') {
          if (value !== rule.value) {
            rulePassed = false;
            ruleDetail = `${rule.target}: expected "${rule.value}", got "${JSON.stringify(value)}"`;
          }
        } else if (rule.operator === 'not_equal') {
          if (value === rule.value) {
            rulePassed = false;
            ruleDetail = `${rule.target} is still "${rule.value}" (should not be)`;
          }
        } else if (rule.operator === 'in') {
          if (!rule.value.includes(value)) {
            rulePassed = false;
            ruleDetail = `${rule.target}: value "${value}" is not in accepted set: [${rule.value.join(', ')}]`;
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
          ruleDetail = `${rule.target}: expected "${rule.expected}", got "${JSON.stringify(value)}"`;
        }
      }
    } else {
      rulePassed = false;
      ruleDetail = `Unknown check type: ${rule.check} — must fail (check type not implemented)`;
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

let selectedDecision = null;
if (allPassed) {
  const profile = getProfile();
  selectedDecision = resolvePath(profile || {}, 'human_decision_checkpoints/hitl2/user_decision');
}

let outcome = 'failed';
let deterministicHandoff = false;
if (allPassed && selectedDecision === 'proceed_to_readiness') {
  outcome = 'passed';
  deterministicHandoff = true;
} else if (allPassed && selectedDecision === 'rerun') {
  outcome = 'rerun';
  deterministicHandoff = true;
}

const routing = resolveRouting(args.transitions, args.currentNode, outcome);

const result = buildGateResult({
  passed: allPassed,
  gate: definition.gate,
  currentNodeRef: args.currentNode,
  routing,
  inspect,
  advice,
  extraCheck: {
    hitl2_user_decision: selectedDecision,
    deterministic_handoff: deterministicHandoff,
  },
  attemptNumber: args.attempt ?? 0,
});

// Write gate attempt audit (logger + trace)
writeGateAttempt(bundlePath, result, { strictTrace: result.check?.passed === true && result.check?.next != null });

emitGateResult(result);
