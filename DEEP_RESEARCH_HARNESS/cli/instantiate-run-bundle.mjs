#!/usr/bin/env node
// @impl CMI-004, CMI-008, CMI-009, FRE-003: instantiate-run-bundle.mjs — Create a production run bundle at repo root
// Usage: node instantiate-run-bundle.mjs <name>
// Creates dpt_rb_<name>/ from DEEP_RESEARCH_HARNESS/rb_templates/.
// Prints absolute bundle path to stdout for shell consumption.
// Exit: 0 = created, 1 = FAIL

import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  StatusSchema,
  QueueSchema,
  ProfileSchema,
  PlanSchema,
} from '../schema/index.mjs';
import { parseMdFrontmatter } from '../engine/helpers/gate-helpers.mjs';
import { siblingPreflight } from '../engine/helpers/instantiate-sibling-preflight.mjs';
import { createTrace } from '../engine/trace.mjs';
import { logToRun } from '../engine/logger.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', 'rb_templates');
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', B = '\x1b[0m';

const args = process.argv.slice(2);
if (hasStandaloneHelp(args)) {
  printUsage(0);
}

const parsedArgs = parseCreatorArgs(args);
const bundleName = parsedArgs.positionals[0];
const targetDir = parsedArgs.values['target-dir'] ?? null;
const forceRequested = parsedArgs.values.force === true;

if (parsedArgs.positionals.length !== 1 || !/^[a-z0-9][a-z0-9-]*$/.test(bundleName)) {
  failUsage('name must match ^[a-z0-9][a-z0-9-]*$');
}

if (targetDir === '') {
  failUsage('--target-dir requires a non-empty value');
}

if (forceRequested) {
  console.error(`${R}Error: production bundle overwrite is not allowed. Choose a new bundle name.${B}`);
  process.exit(1);
}

function printUsage(exitCode) {
  console.error('Usage: node instantiate-run-bundle.mjs <name> [--target-dir <dir>] [--acknowledge-existing-bundle <sibling-name>]');
  console.error('  Creates dpt_rb_<name>/ at <dir> (default: repo root) from DEEP_RESEARCH_HARNESS/rb_templates/');
  console.error('  --acknowledge-existing-bundle: required with explicit user consent when sibling preflight flags an existing bundle');
  process.exit(exitCode);
}

function failUsage(message) {
  console.error(`${R}Error: ${message}.${B}`);
  printUsage(1);
}

function hasStandaloneHelp(argv) {
  for (const arg of argv) {
    if (arg === '--') return false;
    if (arg === '--help') return true;
  }
  return false;
}

function parseCreatorArgs(argv) {
  rejectRepeatedOptions(argv, new Set(['target-dir', 'force', 'acknowledge-existing-bundle']));
  try {
    return parseArgs({
      args: argv,
      options: {
        'target-dir': { type: 'string' },
        force: { type: 'boolean' },
        'acknowledge-existing-bundle': { type: 'string' },
      },
      strict: true,
      allowPositionals: true,
    });
  } catch (error) {
    failUsage(error.message);
  }
}

function rejectRepeatedOptions(argv, supportedOptions) {
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') break;
    const match = arg.match(/^--([a-z-]+)(?:=.*)?$/);
    if (!match || !supportedOptions.has(match[1])) continue;
    if (seen.has(match[1])) failUsage(`option --${match[1]} may be supplied only once`);
    seen.add(match[1]);
    if ((match[1] === 'target-dir' || match[1] === 'acknowledge-existing-bundle') && arg === `--${match[1]}`) index += 1;
  }
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
const bundleDir = resolve(baseDir, `dpt_rb_${bundleName}`);

// ── Sibling preflight (CMI-010) ──
const preflight = siblingPreflight(baseDir, bundleName);
const ackValue = parsedArgs.values['acknowledge-existing-bundle'] ?? null;
if (preflight.flag) {
  if (ackValue !== null) {
    // Ack supplied: verify it's the flagged sibling's bare name
    const flaggedRawName = preflight.sibling.replace(/^dpt_rb_/, '');
    if (ackValue !== flaggedRawName) {
      console.error(`${R}Error: --acknowledge-existing-bundle ${ackValue} does not match flagged sibling (dpt_rb_${flaggedRawName}). Use the exact sibling bare name.${B}`);
      process.exit(1);
    }
    // User acknowledged — proceed
  } else {
    console.error(`${R}Error: ${preflight.reason}${B}`);
    console.error(`${Y}Use --acknowledge-existing-bundle <sibling-name> after obtaining explicit user consent to create this additional bundle.${B}`);
    process.exit(1);
  }
} else if (ackValue !== null) {
  // Ack supplied but no sibling was flagged — reject
  console.error(`${R}Error: --acknowledge-existing-bundle=${ackValue} was supplied but no sibling was flagged. Remove the flag to create the first bundle.${B}`);
  process.exit(1);
}

// Handle existing
if (existsSync(bundleDir)) {
  console.error(`${R}Error: ${bundleDir} already exists. Production bundles are never overwritten; choose a new bundle name.${B}`);
  process.exit(1);
}

// ── Create directory structure ──
const dirs = ['seed_topics', 'reference', 'artifacts/wave0', 'artifacts/wave1', 'artifacts/wave2', '_logs', '_cache', '_scripts', 'final', '_work_units'];
for (const d of dirs) {
  mkdirSync(join(bundleDir, d), { recursive: true });
}

// Handoff and authored navigation coordinates use physical canonical locations.
const currentRunBundleRoot = realpathSync(bundleDir);
const frameworkRoot = realpathSync(join(__dirname, '..'));
const frameworkRootRelative = relative(currentRunBundleRoot, frameworkRoot) || '.';
const repoCommandRootRelative = relative(currentRunBundleRoot, repoRoot) || '.';

// ── Template → control file mapping ──
const templates = [
  { tmpl: 'rb_status.json.tmpl',     dest: 'rb_status.json',     parse: (s) => JSON.parse(s),      schema: StatusSchema },
  { tmpl: 'rb_queue.json.tmpl',      dest: 'rb_queue.json',      parse: (s) => JSON.parse(s),      schema: QueueSchema },
  { tmpl: 'rb_profile.yaml.tmpl',    dest: 'rb_profile.yaml',    parse: null,                      schema: ProfileSchema },
  { tmpl: 'rb_plan.md.tmpl',         dest: 'rb_plan.md',         parse: null,                      schema: PlanSchema },
  { tmpl: 'rb_trace.jsonl',          dest: 'rb_trace.jsonl',     parse: null,                      schema: null },
  { tmpl: 'BUNDLE_MAP.md.tmpl',      dest: 'BUNDLE_MAP.md',      parse: null,                      schema: null },
  { tmpl: 'BUNDLE_ENTRY.md.tmpl',    dest: 'BUNDLE_ENTRY.md',    parse: null,                      schema: null },
  // Reference scaffolds — required by inspect-bundle; populated by the Agent across waves 0/1/2.
  { tmpl: 'reference/_INDEX.md.tmpl', dest: 'reference/_INDEX.md', parse: null,                     schema: null },
  { tmpl: 'reference/README.md.tmpl', dest: 'reference/README.md', parse: null,                     schema: null },
  // Artifacts scaffold — documents wave output structure for AI/coding agents.
  { tmpl: 'artifacts/README.md.tmpl', dest: 'artifacts/README.md', parse: null,                     schema: null },
  // Cache and logs scaffolds — explain structure conventions before any Agent writes into them.
  { tmpl: '_cache/README.md.tmpl', dest: '_cache/README.md', parse: null,                           schema: null },
  { tmpl: '_logs/README.md.tmpl', dest: '_logs/README.md', parse: null,                            schema: null },
  // Scripts scaffold — sanctioned home for run-scoped helper scripts (non-authority runtime area).
  { tmpl: '_scripts/README.md.tmpl', dest: '_scripts/README.md', parse: null,                      schema: null },
];

for (const t of templates) {
  const tmplPath = join(TEMPLATES_DIR, t.tmpl);
  if (!existsSync(tmplPath)) {
    console.error(`${R}Error: template missing: ${tmplPath}${B}`);
    process.exit(1);
  }

  let content = readFileSync(tmplPath, 'utf-8');
  content = content.replace(/\{\{name\}\}/g, bundleName);
  content = content.replace(/\{\{framework_root_relpath\}\}/g, frameworkRootRelative);
  content = content.replace(/\{\{repo_command_root_relpath\}\}/g, repoCommandRootRelative);

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
  execFileSync(process.execPath, [validatePath, bundleDir], { stdio: 'pipe' });
} catch {
  console.error(`${R}Error: validate-bundle failed${B}`);
  rmSync(bundleDir, { recursive: true, force: true });
  process.exit(1);
}

try {
  execFileSync(process.execPath, [inspectPath, bundleDir], { stdio: 'pipe' });
} catch {
  console.error(`${R}Error: inspect-bundle failed${B}`);
  rmSync(bundleDir, { recursive: true, force: true });
  process.exit(1);
}

// ── Report ──
console.error(`${G}Bundle ${currentRunBundleRoot} created.${B}`);
console.error('  ✓ 7 control files (plan, profile, status, queue, trace, BUNDLE_MAP, BUNDLE_ENTRY)');
console.error('  ✓ 10 data directories (seed_topics, reference, artifacts/wave0-2, _logs, _cache, _scripts, final, _work_units)');
console.error('  ✓ 6 scaffolds (reference/_INDEX.md, reference/README.md, artifacts/README.md, _cache/README.md, _logs/README.md, _scripts/README.md)');
console.error('  ✓ All files passed Zod validation');
console.error('  ✓ validate-bundle + inspect-bundle passed');

// Print the resolved current-run-bundle root for Agent/CLI handoff.
console.log(currentRunBundleRoot);
