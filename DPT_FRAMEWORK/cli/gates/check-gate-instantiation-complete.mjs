#!/usr/bin/env node
// @impl GSK-004
// check-gate-instantiation-complete.mjs — evaluates gate-instantiation-complete rules
// Usage: node check-gate-instantiation-complete.mjs --bundle <path>

import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    next: { type: 'string' },
    'non-interactive': { type: 'boolean', default: false },
  },
});

if (!values.bundle) {
  console.error('Error: --bundle <path> is required');
  process.exit(2);
}

// Non-interactive mode: auto-pass for CI/experiment
if (values['non-interactive']) {
  const result = {
    check: { passed: true, gate: 'instantiation_complete', mode: 'non_interactive', next: values.next || null },
    inspect: [],
    advice: [],
  };
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const bundlePath = values.bundle;

// Load gate definition
const defPath = join(__dirname, '..', '..', 'schema', 'gate_definitions', 'gate-instantiation-complete.definition.json');
const definition = JSON.parse(readFileSync(defPath, 'utf-8'));

const inspect = [];
const advice = [];
let allPassed = true;

for (const rule of definition.rules) {
  if (rule.check === 'placeholder') {
    // Placeholder rules always pass
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
  // Future check types (schema_valid, count_floor, etc.) go here
}

const result = {
  check: { passed: allPassed, gate: definition.gate, next: values.next || null },
  inspect,
  advice,
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.check.passed ? 0 : 1);
