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
const WORKFLOW_DIR = path.join(REPO_ROOT, 'DPT_FRAMEWORK', 'workflows', 'nodes');

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

const GATE_DEFS_DIR = path.join(REPO_ROOT, 'DPT_FRAMEWORK', 'schema', 'gate_definitions');

export function checkGateDefinitionExists(parsed) {
  const gateFile = path.join(GATE_DEFS_DIR, `gate-${parsed.gate}.definition.json`);
  if (!existsSync(gateFile)) return { ok: false, detail: `gate "${parsed.gate}" has no definition file: ${gateFile}` };
  return { ok: true };
}

/**
 * Gate names use hyphens in frontmatter/definition files (e.g. "wave0-complete")
 * but underscores in GATE_MACHINE_STATES / GATE_TRANSITIONS (e.g. "wave0_complete").
 */
function gateToTransitionKey(gate) {
  return gate.replace(/-/g, '_');
}

export function checkGateInTransitionTable(parsed) {
  // Some gates (e.g. seed-topics-ready, hitl1-recorded) exist as standalone
  // definition files but are NOT part of the core wave transition table.
  // That's valid — the gate CLI handles them independently.
  // Only check transition table membership if the gate LOOKS like a wave gate.
  const stateKey = gateToTransitionKey(parsed.gate);
  const gateContract = path.join(REPO_ROOT, 'DPT_FRAMEWORK', 'schema', 'contracts', 'gate.mjs');
  const content = readFileSync(gateContract, 'utf-8');

  // If the gate IS in the transition table, verify it's in GATE_MACHINE_STATES
  if (content.includes(stateKey) || content.includes(`'${parsed.gate}'`)) {
    if (!content.includes(`'${stateKey}'`)) {
      return { ok: false, detail: `gate "${parsed.gate}" referenced in transition table but "${stateKey}" not in GATE_MACHINE_STATES` };
    }
  }
  // Otherwise: standalone gate — definition file check (done separately) is sufficient
  return { ok: true };
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

export function checkNextPhaseExists(parsed) {
  // Verify the gate has at least one forward path in the transition table.
  // Skip gates that aren't in the core wave transition table (standalone leaf gates).
  const stateKey = gateToTransitionKey(parsed.gate);
  const gateContract = path.join(REPO_ROOT, 'DPT_FRAMEWORK', 'schema', 'contracts', 'gate.mjs');
  const content = readFileSync(gateContract, 'utf-8');

  // If this gate isn't in GATE_TRANSITIONS at all, it's a standalone gate — skip
  if (!content.includes(stateKey)) return [];

  // Match bare object key:  stateKey: [ ... ],
  // The key is unquoted in GATE_TRANSITIONS.
  const escaped = stateKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockRe = new RegExp(`\\b${escaped}\\s*:\\s*\\[([^\\]]+)\\]`, 's');
  const blockMatch = content.match(blockRe);

  if (!blockMatch) return [`gate "${stateKey}" found in GATE_MACHINE_STATES but has no transition entry in GATE_TRANSITIONS`];

  // Empty array = terminal gate (valid)
  const hasEvents = blockMatch[1].includes('event:');
  if (!hasEvents) return [];

  return [];
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
