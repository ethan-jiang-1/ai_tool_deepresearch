// @impl CMI-003: inspect-bundle.mjs — Directory structure validation
// Usage: node inspect-bundle.mjs <bundleDir>
// Exit: 0 = PASS, 1 = FAIL

const G = '\x1b[32m', R = '\x1b[31m', B = '\x1b[0m';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED = [
  'START_FROM_HERE.md', 'rb_plan.md', 'rb_profile.yaml',
  'rb_status.json', 'rb_queue.json', 'rb_trace.jsonl',
  'seed_topics/', 'reference/_INDEX.md', 'reference/README.md',
  'artifacts/wave0/', 'artifacts/wave1/', 'artifacts/wave2/',
  '_cache/', 'final/',
];

const bundleDir = process.argv[2];
if (!bundleDir) {
  console.error('Usage: node inspect-bundle.mjs <bundleDir>');
  process.exit(1);
}

const missing = REQUIRED.filter(f => !existsSync(join(bundleDir, f)));
if (missing.length > 0) {
  console.log(`${R}Inspect bundle: missing ${missing.join(', ')}${B}`);
  process.exit(1);
}
console.log(`${G}Inspect bundle: directory structure complete${B}`);
