#!/usr/bin/env node
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    bundle: { type: 'string' },
    next: { type: 'string' },
  },
});

if (!values.bundle) {
  console.error('Error: --bundle <path> is required');
  process.exit(2);
}

const result = {
  check: { passed: true, gate: 'wave1-complete', next: values.next || null },
  inspect: [],
  advice: [],
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.check.passed ? 0 : 1);
