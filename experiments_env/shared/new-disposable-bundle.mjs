// @impl CMI-004: new-bundle.mjs — Create a disposable DPT run bundle at repo root
// @impl EXS-002: Canonical location experiments_env/shared/new-disposable-bundle.mjs
// Usage: node new-bundle.mjs <bundleName> [--nodes <dir>] [--force]
// Always creates the bundle at $REPO_ROOT/dpt_disp_<name>/
// Prints absolute bundle path to stdout for shell consumption.
//
// Control file defaults are validated against live Zod schemas.
// If schemas change, this tool breaks at generation time — no stale bundles.
// Exit: 0 = created/reused, 1 = FAIL

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomInt } from 'node:crypto';
import {
  StatusSchema,
  QueueSchema,
  ProfileSchema,
  PlanSchema,
  SLOT_NAMES,
} from '../../DPT_FRAMEWORK/schema/index.mjs';
import { parseMdFrontmatter } from '../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';
import { createTrace } from '../../DPT_FRAMEWORK/engine/trace.mjs';
import { logToRun } from '../../DPT_FRAMEWORK/engine/logger.mjs';

const G = '\x1b[32m', R = '\x1b[31m', B = '\x1b[0m';

// Parse args: supports --case <id>, --nodes <dir>, --nodes=<dir>, --target-dir <dir>
const args = process.argv.slice(2);
const bundleName = args[0];
let nodesDir = null;
let caseId = null;
let targetDir = null;
for (const a of args) {
  if (a === '--nodes') { nodesDir = args[args.indexOf(a) + 1]; }
  if (a.startsWith('--nodes=')) { nodesDir = a.slice('--nodes='.length); }
  if (a === '--case') { caseId = args[args.indexOf(a) + 1]; }
  if (a.startsWith('--case=')) { caseId = a.slice('--case='.length); }
  if (a === '--target-dir') { targetDir = args[args.indexOf(a) + 1]; }
  if (a.startsWith('--target-dir=')) { targetDir = a.slice('--target-dir='.length); }
}
const force = args.includes('--force');

if (!bundleName) {
  console.error('Usage: node new-bundle.mjs <bundleName> [--case <id>] [--nodes <dir>] [--target-dir <dir>] [--force]');
  console.error('  Example: node new-bundle.mjs wc_simple --case case-31 --nodes=experiments_env/prototype-workflow-chain/nodes-workflow-chain --force');
  process.exit(1);
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
const dirs = ['seed_topics', 'reference', 'artifacts/wave0', 'artifacts/wave1', 'artifacts/wave2', '_logs', '_cache', 'final'];
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
};
StatusSchema.parse(statusDefault);
writeFileSync(join(bundleDir, 'rb_status.json'), JSON.stringify(statusDefault, null, 2) + '\n');

const queueDefault = {
  queue_health: 'ready',
  stop_authorization_state: 'unauthorized_continue_required',
  ...Object.fromEntries(SLOT_NAMES.map(s => [s, null])),
  refill_pool: [],
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
  { tmpl: 'reference/_INDEX.md.tmpl', dest: 'reference/_INDEX.md' },
  { tmpl: 'reference/README.md.tmpl', dest: 'reference/README.md' },
  { tmpl: 'artifacts/README.md.tmpl',    dest: 'artifacts/README.md' },
];
for (const s of scaffoldTemplates) {
  const tmplPath = join(repoRoot, 'DPT_FRAMEWORK', 'rb_templates', s.tmpl);
  if (existsSync(tmplPath)) {
    let content = readFileSync(tmplPath, 'utf-8');
    content = content.replace(/\{\{name\}\}/g, basename);
    writeFileSync(join(bundleDir, s.dest), content);
  }
}

// ── Trace init + first log entry (same as production) ──
const trace = createTrace(join(bundleDir, 'rb_trace.jsonl'), { consoleEcho: false });
trace.traceInit(basename, { source: 'new-disposable-bundle' });
logToRun(bundleDir, 'info', 'run_start', { source: 'new-disposable-bundle' });

writeFileSync(join(bundleDir, 'START_FROM_HERE.md'), `# Start from here — ${basename}\n\n本目录是一个 Deep Research Disposable Experiment Bundle。\n`);

// ── Validate + inspect (same as production) ──
const validatePath = join(repoRoot, 'DPT_FRAMEWORK', 'cli', 'validate-bundle.mjs');
const inspectPath = join(repoRoot, 'DPT_FRAMEWORK', 'cli', 'inspect-bundle.mjs');
try {
  execSync(`node "${validatePath}" "${bundleDir}"`, { stdio: 'pipe' });
  process.stderr.write(`${G}✓ validate-bundle passed${B}\n`);
} catch (e) {
  process.stderr.write(`${R}⚠ validate-bundle failed (bundle may be incomplete)${B}\n`);
}
// inspect-bundle is informational only — don't fail on warnings
try {
  execSync(`node "${inspectPath}" "${bundleDir}"`, { stdio: 'pipe' });
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
