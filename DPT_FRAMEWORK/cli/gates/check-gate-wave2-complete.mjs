#!/usr/bin/env node
// check-gate-wave2-complete.mjs — evaluates gate-wave2-complete
// @impl GSK-001, GSK-002, GSK-004
// Usage: node check-gate-wave2-complete.mjs --bundle <path> --current-node <fileRef> [--transitions <path>]

import {
  parseGateCliArgs,
  validateNodeGateBinding,
  resolveRouting,
  buildGateResult,
  emitGateResult,
} from '../../engine/helpers/gate-helpers.mjs';

const args = parseGateCliArgs();
const GATE_KEY = 'wave2-complete';

// Validate node/gate binding
const bindingError = validateNodeGateBinding(args.currentNode, GATE_KEY);
if (bindingError) {
  const result = {
    check: { passed: false, gate: GATE_KEY, currentNodeRef: args.currentNode, next: null },
    routing: { kind: 'invalid_input', next: null, detail: bindingError },
    inspect: [bindingError],
    advice: ['Verify --current-node matches the phase for this gate.'],
  };
  emitGateResult(result);
}

const routing = resolveRouting(args.transitions, args.currentNode, 'passed');

const result = buildGateResult({
  passed: true,
  gate: GATE_KEY,
  currentNodeRef: args.currentNode,
  routing,
  inspect: [],
  advice: [],
});

emitGateResult(result);
