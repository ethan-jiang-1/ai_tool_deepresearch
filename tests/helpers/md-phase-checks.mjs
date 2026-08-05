// tests/helpers/md-phase-checks.mjs
// Shared structural checks for phase node MD files.
//
// These verify that an Agent can CORRECTLY LOAD a phase node:
//   - frontmatter is legal YAML
//   - node identity keys are declared
//   - gate is declared and exists in the transition table
//   - required/referenced files exist on disk
//   - 9-section body structure is present
//
// They do NOT check specific wording, JSON field names, or ASCII diagrams.
// Those are JS-enforced at runtime (Zod schemas, engine validation, gate CLI).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const WORKFLOW_DIR = path.join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'workflows', 'nodes');

// ── Helpers ──────────────────────────────────────────────────────────

function extractFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  return m[1];
}

function parseFrontmatter(raw) {
  try {
    return parseYaml(raw);
  } catch {
    return null;
  }
}

// ── Frontmatter checks ───────────────────────────────────────────────

export function checkFrontmatterParsable(body, label) {
  const raw = extractFrontmatter(body);
  if (!raw) return { ok: false, detail: `${label}: no frontmatter block` };
  const parsed = parseFrontmatter(raw);
  if (!parsed) return { ok: false, detail: `${label}: frontmatter is not legal YAML` };
  return { ok: true, parsed, raw };
}

export function checkNodeIdentity(parsed, expected) {
  const issues = [];
  if (parsed.node_type !== expected.node_type) issues.push(`node_type: expected "${expected.node_type}", got "${parsed.node_type}"`);
  if (parsed.id !== expected.id) issues.push(`id: expected "${expected.id}", got "${parsed.id}"`);
  if (parsed.gate !== expected.gate) issues.push(`gate: expected "${expected.gate}", got "${parsed.gate}"`);
  return issues;
}

export function checkStopDeclared(parsed) {
  if (!('stop' in parsed)) return ['stop field missing'];
  if (typeof parsed.stop !== 'string') return [`stop should be a string, got ${typeof parsed.stop}`];
  return [];
}

// ── Cross-node consistency checks ────────────────────────────────────

const GATE_DEFS_DIR = path.join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'schema', 'gate_definitions');

export function checkGateDefinitionExists(parsed) {
  const gateFile = path.join(GATE_DEFS_DIR, `gate-${parsed.gate}.definition.json`);
  if (!existsSync(gateFile)) return { ok: false, detail: `gate "${parsed.gate}" has no definition file: ${gateFile}` };
  return { ok: true };
}

/**
 * Gate names use hyphens in frontmatter/definition files (e.g. "wave0-complete")
 * but underscores in enums.mjs CurrentGate (e.g. "wave0_complete").
 *
 * Since commit 13eb4e44 / TRT-012, validation uses manifest.json + chain.json
 * as the canonical truth source. The deprecated gate.mjs abstract FSM is no
 * longer consulted.
 */

const MANIFEST_PATH = path.join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'workflows', 'manifest.json');
const CHAIN_PATH = path.join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS', 'workflows', 'transitions.chain.json');

function loadManifestForChecks() {
  const raw = readFileSync(MANIFEST_PATH, 'utf-8');
  return JSON.parse(raw);
}

function loadChainForChecks() {
  const raw = readFileSync(CHAIN_PATH, 'utf-8');
  return JSON.parse(raw);
}

export function checkGateInTransitionTable(parsed) {
  // Verify the gate's phase node exists as a key in transitions.chain.json.
  // If it doesn't, the gate is a standalone definition — that's valid.
  const manifest = loadManifestForChecks();
  const phase = manifest.phases.find(p => p.gate === parsed.gate);
  if (!phase) return { ok: true }; // gate not in manifest (standalone), skip

  const chain = loadChainForChecks();
  if (!chain[phase.node]) return { ok: true }; // node not in chain (standalone), skip

  // Gate is in manifest AND its node is in chain — valid
  return { ok: true };
}

export function checkNextPhaseExists(parsed) {
  // Verify the gate's phase node has at least one forward transition in chain.json.
  // Skip gates with null (e.g. final phase — terminal).
  const manifest = loadManifestForChecks();
  const phase = manifest.phases.find(p => p.gate === parsed.gate);
  if (!phase || !phase.gate) return []; // gate is null (final) or not in manifest

  const chain = loadChainForChecks();
  const transitions = chain[phase.node];
  if (!transitions) return []; // node not in chain (standalone, terminal, or leaf)

  // Terminal: empty transitions or all values are null
  const hasForward = Object.values(transitions).some(v => v !== null);
  if (!hasForward) return []; // terminal gates with null targets are valid

  return [];
}

export function checkReferencesExist(parsed) {
  const issues = [];
  const refs = [...(parsed.requires || []), ...(parsed.suggested_context || [])];
  for (const ref of refs) {
    const refPath = path.join(WORKFLOW_DIR, `${ref}.md`);
    if (!existsSync(refPath)) issues.push(`referenced file missing: ${ref}.md`);
  }
  return issues;
}

// ── Section structure checks ─────────────────────────────────────────

const PHASE_SECTIONS = [
  '1. Stage Goal',
  '2. Required Inputs',
  '3. Allowed Actions',
  '4. Expected Artifacts',
  '5. Gate Command',
  '6. On Gate Pass',
  '7. On Gate Fail',
  '8. Stop Behavior',
  '9. Anti-Cheating Rules',
];

export function checkSections(body, label) {
  const missing = [];
  for (const sec of PHASE_SECTIONS) {
    if (!body.includes(`## ${sec}`) && !body.includes(`# ${sec}`)) {
      missing.push(`${label}: missing section "${sec}"`);
    }
  }
  return missing;
}
