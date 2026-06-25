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
import { mkdirSync, writeFileSync, existsSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomInt } from 'node:crypto';
import {
  StatusSchema,
  QueueSchema,
  ProfileSchema,
  PlanSchema,
} from '../../DPT_FRAMEWORK/schema/index.mjs';

const G = '\x1b[32m', R = '\x1b[31m', B = '\x1b[0m';

// Parse args: supports --case <id>, --nodes <dir>, --nodes=<dir>
const args = process.argv.slice(2);
const bundleName = args[0];
let nodesDir = null;
let caseId = null;
for (const a of args) {
  if (a === '--nodes') { nodesDir = args[args.indexOf(a) + 1]; }
  if (a.startsWith('--nodes=')) { nodesDir = a.slice('--nodes='.length); }
  if (a === '--case') { caseId = args[args.indexOf(a) + 1]; }
  if (a.startsWith('--case=')) { caseId = a.slice('--case='.length); }
}
const force = args.includes('--force');

if (!bundleName) {
  console.error('Usage: node new-bundle.mjs <bundleName> [--case <id>] [--nodes <dir>] [--force]');
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
const bundleDir = join(repoRoot, dirName);

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
const dirs = ['seed_topics', 'reference', 'artifacts/wave1', 'artifacts/wave2', '_cache', 'final'];
for (const d of dirs) {
  mkdirSync(join(bundleDir, d), { recursive: true });
}

// ── Generate + validate control files from live schemas ──
// If any of these fail, the schema has changed and this tool needs updating.
// Better to fail loudly than produce invalid bundles.

const statusDefault = {
  current_mode: 'execution',
  state: 'not_started',
  current_gate: 'setup_ready',
  next_gate: 'wave0_complete',
};
StatusSchema.parse(statusDefault);
writeFileSync(join(bundleDir, 'rb_status.json'), JSON.stringify(statusDefault, null, 2) + '\n');

const queueDefault = {
  queue_health: 'ready',
  stop_authorization_state: 'unauthorized_continue_required',
  slot_1_current: null,
  slot_2_next: null,
  slot_3_pending: null,
  slot_4_pending: null,
  slot_5_tail: null,
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
const planMd = `---\n${JSON.stringify(planDefault)}\n---\n\n# Deep Research Plan: ${basename}\n`;
writeFileSync(join(bundleDir, 'rb_plan.md'), planMd);

writeFileSync(join(bundleDir, 'START_FROM_HERE.md'), `# Start from here — ${basename}\n\n本目录是一个 Deep Research Runtime Bundle。\n`);
writeFileSync(join(bundleDir, 'rb_trace.jsonl'), '');

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
