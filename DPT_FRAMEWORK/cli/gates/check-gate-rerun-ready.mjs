#!/usr/bin/env node
// check-gate-rerun-ready.mjs — evaluates gate-rerun-ready rules
// @impl REI-003
// Usage: node check-gate-rerun-ready.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

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
} from '../../engine/helpers/gate-helpers.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

// Load gate definition
const { definition, error: defError } = tryLoadGateDefinition('rerun-ready', args.currentNode || null);
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

// Helper: resolve JSON/YAML path like "human_decision_checkpoints/hitl2/rationale"
function resolvePath(obj, pathStr) {
  return pathStr.split('/').reduce((o, k) => o?.[k], obj);
}

// ── Rule evaluation ──
for (const rule of definition.rules) {
  if (rule.check === 'placeholder') continue;

  let rulePassed = true;
  let ruleDetail = null;

  try {
    if (rule.check === 'field_non_empty') {
      const [, jsonPath] = rule.target.split('#/');
      const profile = getProfile();
      if (_profileParseFailed || profile === null) {
        rulePassed = false;
        ruleDetail = `Cannot check ${rule.target}: rb_profile.yaml not found or unparseable`;
      } else {
        const value = resolvePath(profile, jsonPath);
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          rulePassed = false;
          ruleDetail = `${rule.target} is empty or missing`;
        }
      }
    } else if (rule.check === 'rerun_count_limit') {
      const [, jsonPath] = rule.target.split('#/');
      const profile = getProfile();
      if (profile === null) {
        // No profile → count treated as 0 → pass
        rulePassed = true;
      } else {
        const value = resolvePath(profile, jsonPath);
        const count = value ?? 0;
        const max = rule.value;
        if (typeof count === 'number' && count >= max) {
          rulePassed = false;
          ruleDetail = `${rule.target}: rerun_count is ${count}, must be < ${max}`;
        }
      }
    } else if (rule.check === 'structural') {
      for (const target of rule.targets) {
        const targetPath = join(bundlePath, target);
        if (!existsSync(targetPath)) {
          rulePassed = false;
          if (ruleDetail) {
            ruleDetail += `; Missing directory: ${target}/`;
          } else {
            ruleDetail = `Missing directory: ${target}/`;
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

// Write gate attempt audit (logger + trace)
writeGateAttempt(bundlePath, result);

emitGateResult(result);
