// @impl CMI-004, BUM-003: new-bundle.mjs — Create a disposable DPT run bundle at repo root
// @impl EXS-002, EXS-003: Canonical location experiments_env/shared/new-disposable-bundle.mjs
// Usage: node new-bundle.mjs <bundleName> [--nodes <dir>] [--force]
// Always creates the bundle at $REPO_ROOT/dpt_disp_<name>/
// Prints absolute bundle path to stdout for shell consumption.
//
// Control file defaults are validated against live Zod schemas.
// If schemas change, this tool breaks at generation time — no stale bundles.
// Exit: 0 = created/reused, 1 = FAIL

import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { randomInt } from 'node:crypto';
import { parseArgs } from 'node:util';
import {
  StatusSchema,
  QueueSchema,
  ProfileSchema,
  PlanSchema,
} from '../../DPT_FRAMEWORK/schema/index.mjs';
import { parseMdFrontmatter } from '../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import { createTrace } from '../../DPT_FRAMEWORK/engine/trace.mjs';
import { logToRun } from '../../DPT_FRAMEWORK/engine/logger.mjs';

const G = '\x1b[32m', R = '\x1b[31m', B = '\x1b[0m';

const args = process.argv.slice(2);
if (hasStandaloneHelp(args)) {
  printUsage(0);
}

const parsedArgs = parseCreatorArgs(args);
const bundleName = parsedArgs.positionals[0];
const nodesDir = parsedArgs.values.nodes ?? null;
const caseId = parsedArgs.values.case ?? null;
const targetDir = parsedArgs.values['target-dir'] ?? null;
const force = parsedArgs.values.force === true;

if (parsedArgs.positionals.length !== 1 || !/^[a-z0-9][a-z0-9_-]*$/.test(bundleName)) {
  failUsage('name must match ^[a-z0-9][a-z0-9_-]*$');
}

if (caseId !== null && !/^case-[0-9]+$/.test(caseId)) {
  failUsage('--case must match ^case-[0-9]+$');
}

if ([nodesDir, targetDir].some((value) => value === '')) {
  failUsage('value-taking options require a non-empty value');
}

function printUsage(exitCode) {
  console.error('Usage: node new-bundle.mjs <bundleName> [--case <id>] [--nodes <dir>] [--target-dir <dir>] [--force]');
  console.error('  Example: node new-bundle.mjs wc_simple --case case-31 --nodes=experiments_env/prototype-workflow-chain/nodes-workflow-chain --force');
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
  rejectRepeatedOptions(argv, new Set(['case', 'nodes', 'target-dir', 'force']));
  try {
    return parseArgs({
      args: argv,
      options: {
        case: { type: 'string' },
        nodes: { type: 'string' },
        'target-dir': { type: 'string' },
        force: { type: 'boolean' },
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
    if (['case', 'nodes', 'target-dir'].includes(match[1]) && arg === `--${match[1]}`) index += 1;
  }
}

// Always resolve repo root — never depend on CWD
let repoRoot;
try {
  repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
} catch {
  console.error(`${R}Error: must be run within a git repository${B}`);
  process.exit(1);
}

// Strip trailing underscores from bundleName for clean directory naming
const strippedName = bundleName.replace(/_+$/, '');

// Append random hex digit to prevent same-case collision on re-run
const hexSuffix = randomInt(0, 16).toString(16);
const dirName = caseId
  ? `dpt_disp_${caseId}_${strippedName}_${hexSuffix}`
  : `dpt_disp_${bundleName}_${hexSuffix}`;
const baseDir = targetDir ?? repoRoot;
mkdirSync(baseDir, { recursive: true });
const bundleDir = join(baseDir, dirName);
const frameworkRoot = join(repoRoot, 'DPT_FRAMEWORK');
const frameworkRootRelative = relative(bundleDir, frameworkRoot) || '.';
const repoCommandRootRelative = relative(bundleDir, repoRoot) || '.';

if (existsSync(bundleDir)) {
  if (force) {
    rmSync(bundleDir, { recursive: true, force: true });
  } else {
    if (nodesDir) {
      const targetNodes = join(bundleDir, 'exp', 'nodes');
      mkdirSync(targetNodes, { recursive: true });
      const srcNodes = join(repoRoot, nodesDir);
      if (existsSync(srcNodes)) {
        cpSync(srcNodes, targetNodes, { recursive: true, force: true });
      }
    }
    console.log(bundleDir);
    process.exit(0);
  }
}

// ── Create directory structure ──
const dirs = ['seed_topics', 'reference', 'artifacts/wave0', 'artifacts/wave1', 'artifacts/wave2', '_logs', '_cache', 'final', '_work_units'];
for (const d of dirs) {
  mkdirSync(join(bundleDir, d), { recursive: true });
}

// ── Generate + validate control files from live schemas ──
// If any of these fail, the schema has changed and this tool needs updating.
// Better to fail loudly than produce invalid bundles.

const statusDefault = {
  bundle: strippedName,
  current_mode: 'execution',
  state: 'not_started',
  current_gate: 'setup_ready',
  next_gate: 'seed_topics_ready',
  current_node: null,
};
StatusSchema.parse(statusDefault);
writeFileSync(join(bundleDir, 'rb_status.json'), JSON.stringify(statusDefault, null, 2) + '\n');

const queueDefault = {
  schema_version: 'queue.v2',
  bundle_name: null,
  queue_health: 'ready',
  stop_authorization_state: 'unauthorized_continue_required',
  active_window: [],
  refill_pool: [],
  delegated_in_flight: {},
  terminal_history: [],
};
QueueSchema.parse(queueDefault);
writeFileSync(join(bundleDir, 'rb_queue.json'), JSON.stringify(queueDefault, null, 2) + '\n');

const profileDefault = {
  plan_basename: caseId ? strippedName : bundleName,
  research_profile: 'not_selected',
  root_must_answer_set: [],
  human_decision_checkpoints: {
    hitl1: { status: 'not_started' },
    hitl2: {
      status: 'not_started',
      answerability_class: 'not_assessed',
      user_decision: 'not_started',
      final_report_view: 'not_started',
    },
  },
};
ProfileSchema.parse(profileDefault);

// Profile is YAML — write manually. Schema validated above; stay in sync there.
const yamlLines = [
  `plan_basename: ${caseId ? strippedName : bundleName}`,
  'research_profile: not_selected',
  'root_must_answer_set: []',
  'human_decision_checkpoints:',
  '  hitl1:',
  '    status: not_started',
  '  hitl2:',
  '    status: not_started',
  '    answerability_class: not_assessed',
  '    user_decision: not_started',
  '    final_report_view: not_started',
];
writeFileSync(join(bundleDir, 'rb_profile.yaml'), yamlLines.join('\n') + '\n');

const planDefault = {
  plan_basename: caseId ? strippedName : bundleName,
  derived_topic_count: 0,
  topic_registry: [],
};
PlanSchema.parse(planDefault);
const basename = caseId ? strippedName : bundleName;

// Generate rb_plan.md from template (single source of truth for plan structure).
// Template placeholders like (待填充…) become the FAIL triggers for setup-ready gate.
const planTmplPath = join(repoRoot, 'DPT_FRAMEWORK', 'rb_templates', 'rb_plan.md.tmpl');
const planTmpl = readFileSync(planTmplPath, 'utf-8');
const planMd = planTmpl.replace(/\{\{name\}\}/g, basename);

// Validate generated plan frontmatter against live PlanSchema
const planParsed = parseMdFrontmatter(planMd);
const planValidate = PlanSchema.safeParse(planParsed);
if (!planValidate.success) {
  const issues = planValidate.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ');
  console.error(`${R}PlanSchema validation failed for generated plan: ${issues}${B}`);
  process.exit(1);
}
writeFileSync(join(bundleDir, 'rb_plan.md'), planMd);

// ── Scaffold files (same templates as production) ──
// These are expected by inspect-bundle and by gates that check for artifact existence.
const scaffoldTemplates = [
  { tmpl: 'BUNDLE_MAP.md.tmpl', dest: 'BUNDLE_MAP.md' },
  { tmpl: 'reference/_INDEX.md.tmpl', dest: 'reference/_INDEX.md' },
  { tmpl: 'reference/README.md.tmpl', dest: 'reference/README.md' },
  { tmpl: 'artifacts/README.md.tmpl',    dest: 'artifacts/README.md' },
];
for (const s of scaffoldTemplates) {
  const tmplPath = join(repoRoot, 'DPT_FRAMEWORK', 'rb_templates', s.tmpl);
  if (existsSync(tmplPath)) {
    let content = readFileSync(tmplPath, 'utf-8');
    content = content.replace(/\{\{name\}\}/g, basename);
    content = content.replace(/\{\{framework_root_relpath\}\}/g, frameworkRootRelative);
    content = content.replace(/\{\{repo_command_root_relpath\}\}/g, repoCommandRootRelative);
    writeFileSync(join(bundleDir, s.dest), content);
  }
}

// ── Trace init + first log entry (same as production) ──
const trace = createTrace(join(bundleDir, 'rb_trace.jsonl'), { consoleEcho: false });
trace.traceInit(basename, { source: 'new-disposable-bundle' });
logToRun(bundleDir, 'info', 'run_start', { source: 'new-disposable-bundle' });

// ── Validate + inspect (same as production) ──
const validatePath = join(repoRoot, 'DPT_FRAMEWORK', 'cli', 'validate-bundle.mjs');
const inspectPath = join(repoRoot, 'DPT_FRAMEWORK', 'cli', 'inspect-bundle.mjs');
try {
  execFileSync(process.execPath, [validatePath, bundleDir], { stdio: 'pipe' });
  process.stderr.write(`${G}✓ validate-bundle passed${B}\n`);
} catch (e) {
  process.stderr.write(`${R}⚠ validate-bundle failed (bundle may be incomplete)${B}\n`);
}
// inspect-bundle is informational only — don't fail on warnings
try {
  execFileSync(process.execPath, [inspectPath, bundleDir], { stdio: 'pipe' });
} catch {
  // inspect-bundle exits 1 on warnings (missing optional files) — that's fine for a fresh disposable
}

// ── Copy node MD contents (not the directory itself) ──
if (nodesDir) {
  const targetNodes = join(bundleDir, 'exp', 'nodes');
  mkdirSync(targetNodes, { recursive: true });
  const srcNodes = join(repoRoot, nodesDir);
  if (existsSync(srcNodes)) {
    for (const f of readdirSync(srcNodes)) {
      cpSync(join(srcNodes, f), join(targetNodes, f), { recursive: true, force: true });
    }
  }
}

// Print absolute path for shell consumption
console.log(bundleDir);
