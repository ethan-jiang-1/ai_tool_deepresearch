#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    transitions: { type: 'string' },
  },
});

if (!values.bundle) {
  console.error('Error: --bundle <path> is required');
  process.exit(2);
}

const { askNext } = await import('../../engine/ask-next.mjs');
const transitionsPath = values.transitions
  || join(__dirname, '..', '..', 'workflows', 'transitions.chain.json');

const next = askNext(transitionsPath, 'wave1-complete', 'passed');

const result = {
  check: { passed: true, gate: 'wave1-complete', next },
  inspect: [],
  advice: [],
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.check.passed ? 0 : 1);
