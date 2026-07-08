#!/usr/bin/env node
// @impl CMI-004, FRE-003: instantiate-run-bundle.mjs — Create a production DPT run bundle at repo root
// Usage: node instantiate-run-bundle.mjs <name>
// Creates dpt_rb_<name>/ from DPT_FRAMEWORK/rb_templates/.
// Prints absolute bundle path to stdout for shell consumption.
// Exit: 0 = created, 1 = FAIL

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  StatusSchema,
  QueueSchema,
  ProfileSchema,
  PlanSchema,
} from '../schema/index.mjs';
import { parseMdFrontmatter } from '../engine/helpers/gate-helpers.mjs';
import { createTrace } from '../engine/trace.mjs';
import { logToRun } from '../engine/logger.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'rb_templates');
const G = '\x1b[32m', R = '\x1b[31m', B = '\x1b[0m';

const args = process.argv.slice(2);
const bundleName = args[0];
const forceRequested = args.includes('--force');
let targetDir = null;
for (const a of args) {
  if (a === '--target-dir') { targetDir = args[args.indexOf(a) + 1]; }
  if (a.startsWith('--target-dir=')) { targetDir = a.slice('--target-dir='.length); }
}

if (!bundleName) {
  console.error('Usage: node instantiate-run-bundle.mjs <name> [--target-dir <dir>]');
  console.error('  Creates dpt_rb_<name>/ at <dir> (default: repo root) from DPT_FRAMEWORK/rb_templates/');
  process.exit(1);
}

if (forceRequested) {
  console.error(`${R}Error: production bundle overwrite is not allowed. Choose a new bundle name.${B}`);
  process.exit(1);
}

// Resolve repo root
let repoRoot;
try {
  repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
} catch {
  console.error(`${R}Error: must be run within a git repository${B}`);
  process.exit(1);
}

const baseDir = targetDir ?? repoRoot;
mkdirSync(baseDir, { recursive: true });
const bundleDir = join(baseDir, `dpt_rb_${bundleName}`);

// Handle existing
if (existsSync(bundleDir)) {
  console.error(`${R}Error: ${bundleDir} already exists. Production bundles are never overwritten; choose a new bundle name.${B}`);
  process.exit(1);
}

// ── Create directory structure ──
const dirs = ['seed_topics', 'reference', 'artifacts/wave0', 'artifacts/wave1', 'artifacts/wave2', '_logs', '_cache', 'final', '_work_units'];
for (const d of dirs) {
  mkdirSync(join(bundleDir, d), { recursive: true });
}

// ── Template → control file mapping ──
const templates = [
  { tmpl: 'rb_status.json.tmpl',     dest: 'rb_status.json',     parse: (s) => JSON.parse(s),      schema: StatusSchema },
  { tmpl: 'rb_queue.json.tmpl',      dest: 'rb_queue.json',      parse: (s) => JSON.parse(s),      schema: QueueSchema },
  { tmpl: 'rb_profile.yaml.tmpl',    dest: 'rb_profile.yaml',    parse: null,                      schema: ProfileSchema },
  { tmpl: 'rb_plan.md.tmpl',         dest: 'rb_plan.md',         parse: null,                      schema: PlanSchema },
  { tmpl: 'rb_trace.jsonl',          dest: 'rb_trace.jsonl',     parse: null,                      schema: null },
  { tmpl: 'BUNDLE_MAP.md.tmpl',      dest: 'BUNDLE_MAP.md',      parse: null,                      schema: null },
  // Reference scaffolds — required by inspect-bundle; populated by the Agent across waves 0/1/2.
  { tmpl: 'reference/_INDEX.md.tmpl', dest: 'reference/_INDEX.md', parse: null,                     schema: null },
  { tmpl: 'reference/README.md.tmpl', dest: 'reference/README.md', parse: null,                     schema: null },
  // Artifacts scaffold — documents wave output structure for AI/coding agents.
  { tmpl: 'artifacts/README.md.tmpl', dest: 'artifacts/README.md', parse: null,                     schema: null },
  // Cache and logs scaffolds — explain structure conventions before any Agent writes into them.
  { tmpl: '_cache/README.md.tmpl', dest: '_cache/README.md', parse: null,                           schema: null },
  { tmpl: '_logs/README.md.tmpl', dest: '_logs/README.md', parse: null,                            schema: null },
];

for (const t of templates) {
  const tmplPath = join(TEMPLATES_DIR, t.tmpl);
  if (!existsSync(tmplPath)) {
    console.error(`${R}Error: template missing: ${tmplPath}${B}`);
    process.exit(1);
  }

  let content = readFileSync(tmplPath, 'utf-8');
  content = content.replace(/\{\{name\}\}/g, bundleName);

  const destPath = join(bundleDir, t.dest);
  writeFileSync(destPath, content);

  // Validate against Zod schema if applicable
  if (t.schema) {
    let parsed;
    if (t.parse) {
      parsed = t.parse(content);
    } else if (t.dest.endsWith('.yaml')) {
      // Profile is YAML — parse with the yaml package
      const { parse: parseYaml } = await import('yaml');
      parsed = parseYaml(content);
    } else if (t.dest.endsWith('.md')) {
      // Plan is markdown with YAML frontmatter (FRE-003)
      parsed = parseMdFrontmatter(content);
    }

    const result = t.schema.safeParse(parsed);
    if (!result.success) {
      console.error(`${R}Error: ${t.dest} failed Zod validation:${B}`);
      console.error(result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n'));
      rmSync(bundleDir, { recursive: true, force: true });
      process.exit(1);
    }
  }
}

// ── Trace init + first log entry ──
// Write run_start trace event (TRW-004) and first _logs/run.log line (LOG-004).
// Must happen before validate-bundle so the trace file is populated.
const trace = createTrace(join(bundleDir, 'rb_trace.jsonl'), { consoleEcho: false });
trace.traceInit(bundleName, { source: 'instantiate-run-bundle' });
logToRun(bundleDir, 'info', 'run_start', { source: 'instantiate-run-bundle' });

// ── Validate + inspect ──
const validatePath = join(__dirname, 'validate-bundle.mjs');
const inspectPath = join(__dirname, 'inspect-bundle.mjs');

try {
  execSync(`node "${validatePath}" "${bundleDir}"`, { stdio: 'pipe' });
} catch {
  console.error(`${R}Error: validate-bundle failed${B}`);
  rmSync(bundleDir, { recursive: true, force: true });
  process.exit(1);
}

try {
  execSync(`node "${inspectPath}" "${bundleDir}"`, { stdio: 'pipe' });
} catch {
  console.error(`${R}Error: inspect-bundle failed${B}`);
  rmSync(bundleDir, { recursive: true, force: true });
  process.exit(1);
}

// ── Report ──
console.error(`${G}Bundle ${bundleDir} created.${B}`);
console.error('  ✓ 6 control files (plan, profile, status, queue, trace, BUNDLE_MAP)');
console.error('  ✓ 9 data directories (seed_topics, reference, artifacts/wave0-2, _logs, _cache, final, _work_units)');
console.error('  ✓ 5 scaffolds (reference/_INDEX.md, reference/README.md, artifacts/README.md, _cache/README.md, _logs/README.md)');
console.error('  ✓ All files passed Zod validation');
console.error('  ✓ validate-bundle + inspect-bundle passed');

// Print absolute path for shell consumption
console.log(bundleDir);
