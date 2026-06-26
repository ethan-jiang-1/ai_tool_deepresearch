#!/usr/bin/env node
// check-gate-hitl1-recorded.mjs — evaluates gate-hitl1-recorded rules
// @impl GSK-001, GSK-002, GSK-004, PRG-005, PRG-007
// Usage: node check-gate-hitl1-recorded.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

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
import { ProfileSchema } from '../../schema/index.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error); }

// Load gate definition
const { definition, error: defError } = tryLoadGateDefinition('hitl1-recorded', args.currentNode || null);
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

// Helper: read and parse rb_profile.yaml (cached for this gate run)
let _profileCache = null;
function getProfile() {
  if (_profileCache) return _profileCache;
  const profilePath = join(bundlePath, 'rb_profile.yaml');
  if (!existsSync(profilePath)) return null;
  _profileCache = parseYaml(readFileSync(profilePath, 'utf-8'));
  return _profileCache;
}

// Helper: read rb_status.json (cached for this gate run)
let _statusCache = null;
function getStatus() {
  if (_statusCache) return _statusCache;
  const statusPath = join(bundlePath, 'rb_status.json');
  if (!existsSync(statusPath)) return null;
  _statusCache = JSON.parse(readFileSync(statusPath, 'utf-8'));
  return _statusCache;
}

// Helper: resolve JSON/YAML path like "human_decision_checkpoints/hitl1/status"
function resolvePath(obj, pathStr) {
  return pathStr.split('/').reduce((o, k) => o?.[k], obj);
}

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
    } else if (rule.check === 'schema_valid') {
      const [file, schemaName] = [rule.target, rule.schema];
      if (file === 'rb_profile.yaml' && schemaName === 'ProfileSchema') {
        const profile = getProfile();
        if (!profile) {
          rulePassed = false;
          ruleDetail = 'rb_profile.yaml not found for schema validation';
        } else {
          const parsed = ProfileSchema.safeParse(profile);
          if (!parsed.success) {
            rulePassed = false;
            const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
            ruleDetail = `ProfileSchema validation failed: ${issues}`;
          }
        }
      } else {
        ruleDetail = `Unknown schema target: ${file}/${schemaName} — must fail (check type not implemented)`;
      }
    } else if (rule.check === 'field_non_empty') {
      // rule.target format: "rb_profile.yaml#/path/to/field"
      const [, jsonPath] = rule.target.split('#/');
      const profile = getProfile();
      if (!profile) {
        rulePassed = false;
        ruleDetail = 'rb_profile.yaml not found';
      } else {
        const value = resolvePath(profile, jsonPath);
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
          rulePassed = false;
          ruleDetail = `${rule.target} is empty or missing`;
        }
      }
    } else if (rule.check === 'field_value') {
      const [, jsonPath] = rule.target.split('#/');
      const profile = getProfile();
      if (!profile) {
        rulePassed = false;
        ruleDetail = 'rb_profile.yaml not found';
      } else {
        const value = resolvePath(profile, jsonPath);
        if (rule.operator === 'equal') {
          if (value !== rule.value) {
            rulePassed = false;
            ruleDetail = `${rule.target}: expected "${rule.value}", got "${value}"`;
          }
        } else if (rule.operator === 'not_equal') {
          if (value === rule.value) {
            rulePassed = false;
            ruleDetail = `${rule.target} is still "${rule.value}" (should not be)`;
          }
        }
      }
    } else if (rule.check === 'status_value') {
      const [, jsonPath] = rule.target.split('#/');
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

writeGateAttempt(bundlePath, result);

emitGateResult(result);
