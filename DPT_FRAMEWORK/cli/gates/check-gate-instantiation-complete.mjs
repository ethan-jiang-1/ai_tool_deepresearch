#!/usr/bin/env node
// check-gate-instantiation-complete.mjs — evaluates gate-instantiation-complete rules
// @impl GSK-001, GSK-002, GSK-004
// Usage: node check-gate-instantiation-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import { existsSync } from 'node:fs';
import { join } from 'node:path';
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
  if (rule.check === 'placeholder') {
    continue;
  }

  if (rule.check === 'file_exists') {
    const targetPath = join(bundlePath, rule.target);
    if (!existsSync(targetPath)) {
      allPassed = false;
      inspect.push(`Missing control file: ${rule.target}`);
      advice.push(rule.failure_message);
      break; // Stop at first failure — let Playbook repair and rerun
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

emitGateResult(result);
