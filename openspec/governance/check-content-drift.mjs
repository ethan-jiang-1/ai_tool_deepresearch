#!/usr/bin/env node
// check-content-drift.mjs — deterministic content-drift guard for guidance/spec prose.
// Verifies that repository-relative path references, CLI tool/verb references,
// and the shared gate-summary surface match the current tree.
// @impl RET-006
// Usage: node check-content-drift.mjs [projectRoot]

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node openspec/governance/check-content-drift.mjs [projectRoot]');
  process.exit(2);
}

const rootArg = process.argv[2];
if (process.argv.length > 3) usage('At most one projectRoot positional argument is allowed.');
const ROOT = rootArg ? resolve(rootArg) : process.cwd();
const HARNESS = join(ROOT, 'DEEP_RESEARCH_HARNESS');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function relativeToRoot(file) {
  return file.slice(ROOT.length + 1).replace(/\\/g, '/');
}

// ── Scan surfaces ────────────────────────────────────────────────────────────
const surfaces = [
  ...(existsSync(join(ROOT, 'openspec/guidance')) ? walk(join(ROOT, 'openspec/guidance')) : []),
  ...(existsSync(join(ROOT, 'openspec/specs')) ? walk(join(ROOT, 'openspec/specs')).filter((p) => p.endsWith('spec.md')) : []),
  ...(existsSync(HARNESS) ? walk(HARNESS) : []),
  ...(existsSync(join(ROOT, 'CONTEXT.md')) ? [join(ROOT, 'CONTEXT.md')] : []),
];

// ── Reference classification ─────────────────────────────────────────────────
const BUNDLE_RUNTIME = /^(rb_|_work_units\/|_cache\/|_logs\/|final\/|reference\/|artifacts\/|dpt_)/;
const REPO_ROOTS = ['openspec/', 'docs/', 'tests/', 'experiments_playbook/', 'experiments_env/', 'DEEP_RESEARCH_HARNESS/'];
const HARNESS_ROOTS = ['command_playbook/', 'cli/', 'engine/', 'workflows/', 'schema/', 'rb_templates/', 'command_experiments_env/'];
const CAPABILITY_PATH = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SKIP_PREFIX = ['https://', 'http://', '#', '§', 'v0.', 'v1.'];

// Negative references: paths the contract deliberately requires to be ABSENT.
// Each entry: [file, ref, reason].
const PLACEMENT_TARGET_ALLOWLIST = [
  ['openspec/specs/workflow/workflow-directory-contract/spec.md', 'DEEP_RESEARCH_HARNESS/engine/gates/', 'normative future placement target: per-gate engine modules land here when they exist'],
  ['openspec/specs/workflow/workflow-directory-contract/spec.md', 'tests/engine/gates/', 'normative future placement target: per-gate engine tests land here when they exist'],
  ['DEEP_RESEARCH_HARNESS/README.md', 'engine/gates/', 'normative future placement target: documented as the per-gate engine target location'],
  ['DEEP_RESEARCH_HARNESS/command_playbook/setup-real-subagents.md', 'experiments_playbook/exp_subagent/', 'do-not-edit guard: per-experiment directory, not a claim of current existence'],
];

const NEGATIVE_ALLOWLIST = [
  ['openspec/specs/agent/agent-context-routing/spec.md', 'DEEP_RESEARCH_HARNESS/CONTEXT.md', 'required-absent: ACR-002 forbids a Harness-local CONTEXT.md'],
  ['openspec/specs/verification/experiment-shared-infra/spec.md', 'DEEP_RESEARCH_HARNESS/command_experiments_env/scripts/new-disposable-bundle.mjs', 'required-absent: the script lives at experiments_env/shared/, not in the Harness'],
  ['openspec/specs/governance/version-management/spec.md', 'DEEP_RESEARCH_HARNESS/CHANGELOG.md', 'required-absent: only the root CHANGELOG.md is retained'],
  ['CONTEXT.md', 'DEEP_RESEARCH_HARNESS/CONTEXT.md', 'required-absent: glossary is root-only'],
];

const REF_RE = /`([^`]+)`/g;

function classify(ref) {
  const trimmed = ref.trim();
  if (!trimmed || trimmed.includes(' ') || trimmed.includes('|')) return null;
  if (SKIP_PREFIX.some((p) => trimmed.startsWith(p))) return null;
  if (BUNDLE_RUNTIME.test(trimmed)) return null;
  if (/<.+>/.test(trimmed)) return null;
  if (trimmed.includes('*') || trimmed.includes('...') || trimmed.includes('{') || trimmed.includes('}')) return null;
  if (!trimmed.includes('/')) return null;
  // Strip #fragment anchor (e.g. queue-manager-core.mjs#StopAuthorizationState)
  const withoutAnchor = trimmed.split('#')[0];
  if (CAPABILITY_PATH.test(withoutAnchor)) return null; // domain/capability shape
  if (REPO_ROOTS.some((r) => withoutAnchor.startsWith(r))) {
    return { ref: withoutAnchor, candidate: join(ROOT, withoutAnchor), kind: 'repo' };
  }
  if (HARNESS_ROOTS.some((r) => withoutAnchor.startsWith(r))) {
    return { ref: withoutAnchor, candidate: join(HARNESS, withoutAnchor), kind: 'harness' };
  }
  return null;
}

// ── CLI verb references in COMMANDS.md ───────────────────────────────────────
const COMMANDS = join(HARNESS, 'COMMANDS.md');
const CLI_VERB_RE = /operate-[a-z-]+\.mjs ([a-z][a-z-]+)/g;

function checkCliVerbs(failures) {
  if (!existsSync(COMMANDS)) return;
  const text = readFileSync(COMMANDS, 'utf8');
  const seen = new Map();
  for (const m of text.matchAll(CLI_VERB_RE)) {
    const tool = m[0].split('.')[0] + '.mjs';
    const verb = m[1];
    if (!seen.has(tool)) seen.set(tool, new Set());
    seen.get(tool).add(verb);
  }
  for (const [tool, verbs] of seen) {
    const toolPath = join(HARNESS, 'cli', tool);
    if (!existsSync(toolPath)) {
      failures.push(`COMMANDS.md references unknown CLI tool ${tool}`);
      continue;
    }
    const source = readFileSync(toolPath, 'utf8');
    for (const verb of verbs) {
      if (!source.includes(`'${verb}'`) && !source.includes(`"${verb}"`) && !source.includes(` ${verb} `)) {
        failures.push(`COMMANDS.md documents verb ${verb} for ${tool}, but the tool source does not dispatch it`);
      }
    }
  }
}

// ── Gate summary coverage ────────────────────────────────────────────────────
const GATE_DEFS_DIR = join(HARNESS, 'schema/gate_definitions');
const GATE_SUMMARY = join(HARNESS, 'workflows/nodes/shared/shared-gate-rules.md');

function gateNamesFromDefinitions() {
  return readdirSync(GATE_DEFS_DIR)
    .filter((name) => name.startsWith('gate-') && name.endsWith('.definition.json'))
    .map((name) => name.slice('gate-'.length, -'.definition.json'.length));
}

function gateNamesFromSummary() {
  const text = readFileSync(GATE_SUMMARY, 'utf8');
  const rows = [];
  for (const line of text.split('\n')) {
    const m = line.match(/^\|\s*`([a-z0-9-]+)`/);
    if (m) rows.push(m[1]);
  }
  return rows;
}

function checkGateCoverage(failures) {
  if (!existsSync(GATE_DEFS_DIR) || !existsSync(GATE_SUMMARY)) return;
  const fromDefs = gateNamesFromDefinitions();
  const fromSummary = gateNamesFromSummary();
  for (const gate of fromDefs) {
    if (!fromSummary.includes(gate)) {
      failures.push(`shared-gate-rules.md has no summary row for gate definition ${gate}`);
    }
  }
  for (const gate of fromSummary) {
    if (!fromDefs.includes(gate)) {
      failures.push(`shared-gate-rules.md lists gate ${gate} with no gate definition file`);
    }
  }
}

// ── Prohibition-phrasing guard (machine-covered facts stay pointer-only) ─────
// Machine-covered prohibition phrasings must not appear as bare standalone
// prohibitions in phase prose outside the phase's anti-cheating section; the
// fact is enforced by the machine check named in the machine-checks catalog,
// and Agent-facing prose should point to the shared owner (shared-anti-cheating
// or shared-subagent-protocol) instead of restating the prohibition. A phase
// that already loads the shared owner in `requires` is allowed to restate in
// its own anti-cheating section (that duplication is governed by the
// consistency-validator `phase_local_anti_cheating_duplication` check).
// @impl RET-006, SHC-004
const PHASE_DIR = join(HARNESS, 'workflows/nodes/phases');
const SHARED_DIR = join(HARNESS, 'workflows/nodes/shared');
// Representative machine-covered prohibition phrasings (see
// _backlog/plans/machine-checks-catalog.md for the full catalog; the gate
// definition JSON remains the authoritative machine-check source).
const MACHINE_COVERED_PROHIBITIONS = [
  '禁止手写', // ledger rows, trace events, receipts, gate results
  'do not hand-write',
  '手写 ledger',
  '禁止直接编辑 `rb_status.json`',
  '禁止覆盖 immutable `_beacon.json`',
  'do not overwrite immutable `_beacon.json`',
  '禁止伪造 trace event',
  '禁止把 chat memory 当 runtime state',
  '禁止绕过 work-unit provenance',
];

function phaseFrontmatterRequires(phasePath) {
  try {
    const text = readFileSync(phasePath, 'utf8');
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return [];
    const requiresMatch = fmMatch[1].match(/requires:\s*\n((?:\s+- .+\n)+)/);
    if (!requiresMatch) return [];
    return requiresMatch[1]
      .split('\n')
      .map((line) => line.trim().replace(/^- /, '').replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function checkProhibitionPhrasing(failures) {
  if (!existsSync(PHASE_DIR)) return;
  const antiCheatingOwners = [
    'shared/shared-anti-cheating-rules',
    'shared/shared-anti-cheating-rules.md',
    'shared/shared-subagent-protocol',
    'shared/shared-subagent-protocol.md',
  ];
  for (const name of readdirSync(PHASE_DIR)) {
    if (!name.endsWith('.md')) continue;
    const phasePath = join(PHASE_DIR, name);
    const text = readFileSync(phasePath, 'utf8');
    const requires = phaseFrontmatterRequires(phasePath);
    const loadsSharedOwner = antiCheatingOwners.some((owner) => requires.includes(owner));
    // Only inspect prose outside the phase's own anti-cheating section; that
    // section's duplication is governed by the consistency-validator check.
    const sectionMatch = text.match(/^## 9\.[^\n]*\n([\s\S]*?)(?=\n## |$)/m);
    const sectionStart = sectionMatch ? text.indexOf(sectionMatch[0]) : -1;
    const body = sectionStart >= 0 ? text.slice(0, sectionStart) + text.slice(sectionStart + sectionMatch[0].length) : text;
    for (const phrasing of MACHINE_COVERED_PROHIBITIONS) {
      if (body.includes(phrasing) && !loadsSharedOwner) {
        failures.push(
          `${relativeToRoot(phasePath)}: machine-covered prohibition phrasing "${phrasing}" appears outside the anti-cheating section while the phase requires no shared anti-cheating owner; point to shared/shared-anti-cheating-rules.md instead`,
        );
      }
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
const failures = [];
let checked = 0;

for (const file of surfaces) {
  if (!existsSync(file)) continue;
  const rel = relativeToRoot(file);
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(REF_RE)) {
    const classified = classify(m[1]);
    if (!classified) continue;
    checked++;
    if (existsSync(classified.candidate)) continue;
    const allowlisted = NEGATIVE_ALLOWLIST.some(
      (entry) => entry[0] === rel && entry[1] === classified.ref,
    );
    if (allowlisted) continue;
    const placementTarget = PLACEMENT_TARGET_ALLOWLIST.some(
      (entry) => entry[0] === rel && entry[1] === classified.ref,
    );
    if (placementTarget) continue;
    failures.push(`${rel}: missing path reference: ${classified.ref}`);
  }
}

checkCliVerbs(failures);
checkGateCoverage(failures);
checkProhibitionPhrasing(failures);

if (failures.length > 0) {
  console.error(`check-content-drift: ${failures.length} drift finding(s) (${checked} path references checked):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`check-content-drift: clean (${checked} path references checked).`);
process.exit(0);
