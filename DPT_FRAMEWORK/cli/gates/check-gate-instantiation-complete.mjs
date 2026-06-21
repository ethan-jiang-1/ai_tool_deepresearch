#!/usr/bin/env node
// check-gate-instantiation-complete.mjs — evaluates gate-instantiation-complete rules
// @impl GSK-001, GSK-002, GSK-004, PRG-004, PRG-007
// Usage: node check-gate-instantiation-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync, statSync, readFileSync, appendFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  parseGateCliArgs,
  loadGateDefinition,
  validateNodeGateBinding,
  resolveRouting,
  buildGateResult,
  emitGateResult,
} from '../../engine/helpers/gate-helpers.mjs';

const args = parseGateCliArgs();

// Load gate definition
const definition = loadGateDefinition('instantiation-complete');

// Validate node/gate binding
const bindingError = validateNodeGateBinding(args.currentNode, definition.gate);
if (bindingError) {
  const result = {
    check: { passed: false, gate: definition.gate, currentNodeRef: args.currentNode, next: null },
    routing: { kind: 'invalid_input', next: null, detail: bindingError },
    inspect: [bindingError],
    advice: ['Verify --current-node matches the phase for this gate. Check manifest.json for correct node ↔ gate bindings.'],
  };
  emitGateResult(result);
}

const bundlePath = args.bundle;
const inspect = [];
const advice = [];
let allPassed = true;

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
    } else if (rule.check === 'pattern_match') {
      const bundleName = basename(bundlePath);
      const pattern = new RegExp(rule.pattern);
      if (!pattern.test(bundleName)) {
        rulePassed = false;
        ruleDetail = `Bundle name "${bundleName}" does not match pattern ${rule.pattern}`;
      }
    } else if (rule.check === 'status_value') {
      // rule.target is "rb_status.json#/field/path"
      const [file, jsonPath] = rule.target.split('#/');
      const statusPath = join(bundlePath, file);
      if (!existsSync(statusPath)) {
        rulePassed = false;
        ruleDetail = `Missing file for status check: ${file}`;
      } else {
        const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
        const value = jsonPath.split('/').reduce((obj, key) => obj?.[key], status);
        if (value !== rule.expected) {
          rulePassed = false;
          ruleDetail = `${rule.target}: expected "${rule.expected}", got "${value}"`;
        }
      }
    } else {
      // Unknown check type — skip with warning, don't fail
      ruleDetail = `Unknown check type: ${rule.check} — skipped`;
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
