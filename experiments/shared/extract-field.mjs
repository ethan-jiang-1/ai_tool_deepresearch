#!/usr/bin/env node
// extract-field.mjs — extract a dot-path field from stdin JSON (streaming-safe)
//
// Usage:
//   echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed
//   echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs routing.kind
//   GATE_OUTPUT=$(node gate-cli.mjs ... || true)
//   PASSED=$(echo "$GATE_OUTPUT" | node experiments/shared/extract-field.mjs check.passed)
//   NEXT=$(echo "$GATE_OUTPUT"   | node experiments/shared/extract-field.mjs check.next)
//
// Reads all stdin chunks, accumulates, then JSON.parses once.  This avoids the
// single-chunk JSON.parse bug when gate output exceeds the pipe buffer (~16KB).

import { createInterface } from 'node:readline';

const fieldPath = process.argv[2];
if (!fieldPath) {
  console.error('Usage: extract-field.mjs <dot.path>');
  process.exit(2);
}

let raw = '';
const rl = createInterface({ input: process.stdin });

rl.on('line', (line) => { raw += line + '\n'; });

rl.on('close', () => {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('extract-field.mjs: stdin is not valid JSON');
    process.exit(3);
  }

  const value = fieldPath.split('.').reduce((obj, key) => {
    if (obj === null || obj === undefined) return undefined;
    return obj[key];
  }, parsed);

  if (value === undefined) {
    console.error(`extract-field.mjs: field "${fieldPath}" not found in JSON`);
    process.exit(1);
  }

  console.log(value);
});
