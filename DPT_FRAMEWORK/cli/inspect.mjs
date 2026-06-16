// @impl CMI-003: inspect.mjs — Directory structure validation
// Usage: node inspect.mjs <bundleDir>
// Exit: 0 = PASS, 1 = FAIL

import { existsSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED = [
  'START_FROM_HERE.md', 'rb_plan.md', 'rb_profile.yaml',
  'rb_status.json', 'rb_queue.json', 'rb_trace.jsonl',
  'seed_topics/', 'reference/', 'artifacts/wave1/', 'artifacts/wave2/',
  '_cache/', 'final/',
];

const bundleDir = process.argv[2];
if (!bundleDir) {
  console.error('Usage: node inspect.mjs <bundleDir>');
  process.exit(1);
}

const missing = REQUIRED.filter(f => !existsSync(join(bundleDir, f)));
if (missing.length > 0) {
  console.log(`Inspect: missing ${missing.join(', ')}`);
  process.exit(1);
}
console.log('Inspect: directory structure complete');
