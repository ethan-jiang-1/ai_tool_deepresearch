// @impl CMI-002: check.mjs — Zod validation for bundle control files
// Usage: node check.mjs <bundleDir>
// Exit: 0 = PASS, 1 = FAIL

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  StatusSchema, QueueSchema, ProfileSchema,
  PlanSchema, TraceSchema,
} from '../schema/index.mjs';

function parseMdFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  return m ? JSON.parse(m[1]) : {};
}

function parseJsonl(raw) {
  if (raw.trim() === '') return [];
  return raw.trim().split('\n').map(JSON.parse);
}

const CONTROL_FILE_SCHEMAS = new Map([
  ['rb_status.json',  { schema: StatusSchema,  parse: JSON.parse }],
  ['rb_queue.json',   { schema: QueueSchema,   parse: JSON.parse }],
  ['rb_profile.yaml', { schema: ProfileSchema, parse: parseYaml }],
  ['rb_plan.md',      { schema: PlanSchema,    parse: parseMdFrontmatter }],
  ['rb_trace.jsonl',  { schema: TraceSchema,   parse: parseJsonl }],
]);

const bundleDir = process.argv[2];
if (!bundleDir) {
  console.error('Usage: node check.mjs <bundleDir>');
  process.exit(1);
}

let passed = 0, failed = 0;
for (const [file, spec] of CONTROL_FILE_SCHEMAS) {
  const filePath = join(bundleDir, file);
  if (!existsSync(filePath)) {
    console.log(`  ✗ ${file}: missing`);
    failed++;
    continue;
  }
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = spec.parse(raw);
  const result = spec.schema.safeParse(parsed);
  if (result.success) {
    console.log(`  ✓ ${file}`);
    passed++;
  } else {
    console.log(`  ✗ ${file}: ${result.error.issues.map(i => i.message).join(', ')}`);
    failed++;
  }
}
console.log(`Check: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
