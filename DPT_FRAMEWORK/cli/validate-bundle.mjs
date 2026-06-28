// @impl CMI-002, FRE-003: validate-bundle.mjs — Zod validation for bundle control files
// Usage: node validate-bundle.mjs <bundleDir>
// Exit: 0 = PASS, 1 = FAIL

const G = '\x1b[32m', R = '\x1b[31m', B = '\x1b[0m';

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  StatusSchema, QueueSchema, ProfileSchema,
  PlanSchema, TraceSchema,
} from '../schema/index.mjs';
import { OutputDeclarationLedgerRecord } from '../engine/queue-manager.mjs';
import { parseMdFrontmatter } from '../engine/helpers/gate-helpers.mjs';

function parseJsonl(raw) {
  if (raw.trim() === '') return [];
  return raw.trim().split('\n').map(JSON.parse);
}

const CONTROL_FILE_SCHEMAS = new Map([
  ['rb_status.json',             { schema: StatusSchema,    parse: JSON.parse }],
  ['rb_queue.json',              { schema: QueueSchema,     parse: JSON.parse }],
  ['rb_profile.yaml',            { schema: ProfileSchema,   parse: parseYaml }],
  ['rb_plan.md',                 { schema: PlanSchema,      parse: parseMdFrontmatter }],
  ['rb_trace.jsonl',             { schema: TraceSchema,     parse: parseJsonl }],
  ['rb_output_declarations.jsonl', { schema: OutputDeclarationLedgerRecord, parse: parseJsonl, optional: true, perLine: true }],
]);

const bundleDir = process.argv[2];
if (!bundleDir) {
  console.error('Usage: node validate-bundle.mjs <bundleDir>');
  process.exit(1);
}

let passed = 0, failed = 0;
for (const [file, spec] of CONTROL_FILE_SCHEMAS) {
  const filePath = join(bundleDir, file);
  if (!existsSync(filePath)) {
    if (spec.optional) continue; // skip optional files
    console.log(`  ✗ ${file}: missing`);
    failed++;
    continue;
  }
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = spec.parse(raw);
  // perLine schemas validate each JSONL record individually (e.g. ledger)
  // Otherwise validate the whole parsed value (e.g. trace is z.array(TraceEntry))
  if (spec.perLine && Array.isArray(parsed)) {
    let lineOk = true;
    for (let i = 0; i < parsed.length; i++) {
      const lineResult = spec.schema.safeParse(parsed[i]);
      if (!lineResult.success) {
        console.log(`  ${R}✗${B} ${file}: line ${i + 1}: ${lineResult.error.issues.map(iss => iss.message).join(', ')}`);
        failed++;
        lineOk = false;
      }
    }
    if (lineOk && parsed.length > 0) {
      console.log(`  ${G}✓${B} ${file}`);
      passed++;
    } else if (parsed.length === 0) {
      console.log(`  ${G}✓${B} ${file} (empty)`);
      passed++;
    }
  } else {
    const result = spec.schema.safeParse(parsed);
    if (result.success) {
      console.log(`  ${G}✓${B} ${file}`);
      passed++;
    } else {
      console.log(`  ${R}✗${B} ${file}: ${result.error.issues.map(i => i.message).join(', ')}`);
      failed++;
    }
  }
}
console.log(`Validate: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
