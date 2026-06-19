#!/usr/bin/env node
// @impl GSK-004
// check-gate-instantiation-complete.mjs — evaluates gate-instantiation-complete rules
// Usage: node check-gate-instantiation-complete.mjs --bundle <path> [--transitions <path>] [--non-interactive]

import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    transitions: { type: 'string' },
    'non-interactive': { type: 'boolean', default: false },
  },
});

if (!values.bundle) {
  console.error('Error: --bundle <path> is required');
  process.exit(2);
}

// Load gate definition
const defPath = join(__dirname, '..', '..', 'schema', 'gate_definitions', 'gate-instantiation-complete.definition.json');
const definition = JSON.parse(readFileSync(defPath, 'utf-8'));

// Load transition table query
const { askNext } = await import('../../engine/ask-next.mjs');
const transitionsPath = values.transitions
  || join(__dirname, '..', '..', 'workflows', 'transitions.chain.json');

// Non-interactive mode: auto-pass, but still query transition table for next
if (values['non-interactive']) {
  const next = askNext(transitionsPath, definition.gate, 'passed');
  const result = {
    check: { passed: true, gate: definition.gate, mode: 'non_interactive', next },
    inspect: [],
    advice: [],
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const bundlePath = values.bundle;

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

const state = allPassed ? 'passed' : 'failed';
const next = askNext(transitionsPath, definition.gate, state);

const result = {
  check: { passed: allPassed, gate: definition.gate, next },
  inspect,
  advice,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.check.passed ? 0 : 1);
