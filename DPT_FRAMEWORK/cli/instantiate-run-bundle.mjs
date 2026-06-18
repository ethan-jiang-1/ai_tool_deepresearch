#!/usr/bin/env node
// @impl CMI-004: instantiate-run-bundle.mjs — Create a production DPT run bundle at repo root
// Usage: node instantiate-run-bundle.mjs <name> [--force]
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'rb_templates');
const G = '\x1b[32m', R = '\x1b[31m', B = '\x1b[0m';

const args = process.argv.slice(2);
const bundleName = args[0];
const force = args.includes('--force');

if (!bundleName) {
  console.error('Usage: node instantiate-run-bundle.mjs <name> [--force]');
  console.error('  Creates dpt_rb_<name>/ at repo root from DPT_FRAMEWORK/rb_templates/');
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

const bundleDir = join(repoRoot, `dpt_rb_${bundleName}`);

// Handle existing
if (existsSync(bundleDir)) {
  if (force) {
    rmSync(bundleDir, { recursive: true, force: true });
  } else {
    console.error(`${R}Error: ${bundleDir} already exists. Use --force to overwrite.${B}`);
    process.exit(1);
  }
}

// ── Create directory structure ──
const dirs = ['seed_topics', 'reference', 'artifacts/wave1', 'artifacts/wave2', '_cache', 'final'];
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
  { tmpl: 'START_FROM_HERE.md.tmpl', dest: 'START_FROM_HERE.md', parse: null,                      schema: null },
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
      // Plan is markdown with JSON frontmatter
      const m = content.match(/^---\n([\s\S]*?)\n---/);
      parsed = m ? JSON.parse(m[1]) : {};
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
console.error('  ✓ 6 control files (plan, profile, status, queue, trace, START_FROM_HERE)');
console.error('  ✓ 6 data directories (seed_topics, reference, artifacts, _cache, final)');
console.error('  ✓ All files passed Zod validation');
console.error('  ✓ validate-bundle + inspect-bundle passed');

// Print absolute path for shell consumption
console.log(bundleDir);
