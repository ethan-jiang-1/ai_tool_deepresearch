#!/usr/bin/env node
// check-gate-setup-ready.mjs — evaluates gate-setup-ready rules
// @impl GSK-001, GSK-002, GSK-004, PRG-006, PRG-007, FRE-003
// Usage: node check-gate-setup-ready.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, statSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  parseGateCliArgs,
  tryLoadGateDefinition,
  validateNodeGateBinding,
  resolveRouting,
  buildGateResult,
  emitGateResult,
  writeGateAttempt,
  readBundlePlan,
  stripMdFrontmatter,
  writePlanProgress,
} from '../../engine/helpers/gate-helpers.mjs';
import {
  ProfileSchema,
  StatusSchema,
  QueueSchema,
  PlanSchema,
} from '../../schema/index.mjs';

const args = parseGateCliArgs();
if (args.error) { emitGateResult(args.error, { bundlePath: args.bundle }); }

// Load gate definition
const { definition, error: defError } = tryLoadGateDefinition('setup-ready', args.currentNode || null);
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
let _profileCache = null;
function getProfile() {
  if (_profileCache) return _profileCache;
  const p = join(bundlePath, 'rb_profile.yaml');
  if (!existsSync(p)) return null;
  _profileCache = parseYaml(readFileSync(p, 'utf-8'));
  return _profileCache;
}

let _statusCache = null;
function getStatus() {
  if (_statusCache) return _statusCache;
  const p = join(bundlePath, 'rb_status.json');
  if (!existsSync(p)) return null;
  _statusCache = JSON.parse(readFileSync(p, 'utf-8'));
  return _statusCache;
}

let _planCache = null;
function getPlan() {
  if (_planCache) return _planCache;
  _planCache = readBundlePlan(bundlePath);
  return _planCache;
}

function resolvePath(obj, pathStr) {
  return pathStr.split('/').reduce((o, k) => o?.[k], obj);
}

// ── Normalize bundle basename ──
function normalizeBundleBasename(dirName) {
  // Production: dpt_rb_<name> → <name>
  const prodMatch = dirName.match(/^dpt_rb_(.+)$/);
  if (prodMatch) return prodMatch[1];
  // Disposable: dpt_disp_<name>_<hex> → <name>
  // Strip optional case-NNN_ prefix (test infrastructure, not part of research basename)
  const dispMatch = dirName.match(/^dpt_disp_(.+)_[0-9a-f]+$/);
  if (dispMatch) return dispMatch[1].replace(/^case-\d+_/, '');
  return null; // illegal name
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
    } else if (rule.check === 'dir_exists') {
      const targetPath = join(bundlePath, rule.target);
      if (!existsSync(targetPath) || !statSync(targetPath).isDirectory()) {
        rulePassed = false;
        ruleDetail = `Missing directory: ${rule.target}`;
      }
    } else if (rule.check === 'schema_valid') {
      const target = rule.target;
      const schemaName = rule.schema;
      let parsed;
      if (target === 'rb_plan.md' && schemaName === 'PlanSchema') {
        const plan = getPlan();
        if (!plan) { rulePassed = false; ruleDetail = 'rb_plan.md not found or unparseable frontmatter'; }
        else parsed = PlanSchema.safeParse(plan);
      } else if (target === 'rb_profile.yaml' && schemaName === 'ProfileSchema') {
        const profile = getProfile();
        if (!profile) { rulePassed = false; ruleDetail = 'rb_profile.yaml not found'; }
        else parsed = ProfileSchema.safeParse(profile);
      } else if (target === 'rb_status.json' && schemaName === 'StatusSchema') {
        const status = getStatus();
        if (!status) { rulePassed = false; ruleDetail = 'rb_status.json not found'; }
        else parsed = StatusSchema.safeParse(status);
      } else if (target === 'rb_queue.json' && schemaName === 'QueueSchema') {
        const qPath = join(bundlePath, 'rb_queue.json');
        if (!existsSync(qPath)) { rulePassed = false; ruleDetail = 'rb_queue.json not found'; }
        else {
          const queue = JSON.parse(readFileSync(qPath, 'utf-8'));
          parsed = QueueSchema.safeParse(queue);
        }
      } else {
        ruleDetail = `Unknown schema target: ${target}/${schemaName} — must fail (check type not implemented)`;
      }
      if (parsed && !parsed.success) {
        rulePassed = false;
        const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
        ruleDetail = `${schemaName} validation failed for ${target}: ${issues}`;
      }
    } else if (rule.check === 'field_value') {
      const [, jsonPath] = rule.target.split('#/');
      const profile = getProfile();
      if (!profile) { rulePassed = false; ruleDetail = 'rb_profile.yaml not found'; }
      else {
        const value = resolvePath(profile, jsonPath);
        if (rule.operator === 'equal' && value !== rule.value) {
          rulePassed = false;
          ruleDetail = `${rule.target}: expected "${rule.value}", got "${value}"`;
        }
      }
    } else if (rule.check === 'field_non_empty') {
      const target = rule.target;
      if (target.includes('#/')) {
        // YAML field path variant (existing logic)
        const [, jsonPath] = target.split('#/');
        const profile = getProfile();
        if (!profile) { rulePassed = false; ruleDetail = 'rb_profile.yaml not found'; }
        else {
          const value = resolvePath(profile, jsonPath);
          if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
            rulePassed = false;
            ruleDetail = `${target} is empty or missing`;
          }
        }
      } else if (target.endsWith('.md')) {
        // File body variant: strip frontmatter, check remaining content non-empty
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
        // Unknown target format — fail closed
        rulePassed = false;
        ruleDetail = `Unknown field_non_empty target: ${target} — must contain '#/' (YAML path) or end with '.md' (file body)`;
      }
    } else if (rule.check === 'pattern_match') {
      const target = rule.target;
      const filePath = join(bundlePath, target);
      if (!existsSync(filePath)) {
        rulePassed = false;
        ruleDetail = `File not found for pattern_match: ${target}`;
      } else {
        const content = readFileSync(filePath, 'utf-8');
        const bodyContent = stripMdFrontmatter(content);
        const re = new RegExp(rule.pattern);
        const matched = re.test(bodyContent);
        if (rule.negate) {
          if (matched) {
            rulePassed = false;
            ruleDetail = `Forbidden pattern in ${target}: ${rule.failure_message}`;
          }
        } else {
          if (!matched) {
            rulePassed = false;
            ruleDetail = `Missing pattern in ${target}: ${rule.failure_message}`;
          }
        }
      }
    } else if (rule.check === 'status_value') {
      const [file, jsonPath] = rule.target.split('#/');
      const status = getStatus();
      if (!status) { rulePassed = false; ruleDetail = 'rb_status.json not found'; }
      else {
        const value = jsonPath.split('/').reduce((obj, key) => obj?.[key], status);
        if (value !== rule.expected) {
          rulePassed = false;
          ruleDetail = `${rule.target}: expected "${rule.expected}", got "${value}"`;
        }
      }
    } else if (rule.check === 'cross_field') {
      // basename consistency check
      const bundleName = basename(bundlePath);
      const normalized = normalizeBundleBasename(bundleName);
      if (normalized === null) {
        rulePassed = false;
        ruleDetail = `Bundle directory name "${bundleName}" does not match accepted naming pattern (dpt_rb_<name> or dpt_disp_<name>_<hex>). Re-instantiate with a legal name.`;
      } else {
        const plan = getPlan();
        const profile = getProfile();
        const planBasename = plan?.plan_basename;
        const profileBasename = profile?.plan_basename;
        if (normalized !== planBasename) {
          rulePassed = false;
          ruleDetail = `Basename mismatch: normalized bundle basename "${normalized}" != rb_plan.md plan_basename "${planBasename}"`;
        } else if (normalized !== profileBasename) {
          rulePassed = false;
          ruleDetail = `Basename mismatch: normalized bundle basename "${normalized}" != rb_profile.yaml plan_basename "${profileBasename}"`;
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

// Write Progress on gate pass (PHS-006)
if (allPassed) {
  writePlanProgress(bundlePath, definition.gate);
}

emitGateResult(result);
