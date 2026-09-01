#!/usr/bin/env node
// check-spec-enum-restatements.mjs — derived closed-vocabulary restatement guard.
//
// Derives the project's closed vocabularies from their single code-side exports
// (static import: no value inventory is kept here, GSK-011 derived-evidence
// posture) and verifies prose restatements in openspec/specs/** and
// openspec/guidance/** against them:
//   (i)  every backticked token in a restatement sentence that belongs to any
//        known closed set must belong to the dominant set of that sentence;
//   (ii) when a closure/defining cue is present (and the enumeration is not
//        hedged as an example), the enumerated members must EQUAL the code set.
//
// INVARIANT: every module imported below must remain definition-only (frozen
// arrays / zod enums, no import-time side effects). If one ever grows side
// effects, switch that set to fail-closed regex extraction of its
// `export const NAME = Object.freeze([...])` / `z.enum([...])` block and exit 1
// when unparseable — do not embed a value inventory here.
//
// The prose scan never infers a contract fact from prose: the code-derived set
// is the sole verdict authority; prose is drift evidence only.
//
// @impl RET-006
// Usage: node check-spec-enum-restatements.mjs [projectRoot]

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { WORK_UNIT_RECOVERY_ACTIONS } from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs';
// @impl FIO-008 — file-observability closed directive set joins the derived guard.
import { FILE_REPAIR_DIRECTIVES } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs';
import {
  GATE_BLOCKING_BASES,
  GATE_REPAIR_KINDS,
} from '../../DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs';
import {
  WorkUnitTimeoutRecommendedAction,
  WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS,
  WORK_UNIT_ATTEMPT_DISPOSITIONS,
} from '../../DEEP_RESEARCH_HARNESS/schema/contracts/work-unit.mjs';
import { StopAuthorizationState } from '../../DEEP_RESEARCH_HARNESS/schema/enums.mjs';
import { PHASE_STATUS_AUDIT_OUTCOMES } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs';

// Closed sets: id → { set, file, fixture pins (subset-only, never full-set) }
export const SETS = [
  { id: 'WORK_UNIT_RECOVERY_ACTIONS', values: WORK_UNIT_RECOVERY_ACTIONS, pins: ['wait', 'supersede'] },
  { id: 'GATE_BLOCKING_BASES', values: GATE_BLOCKING_BASES, pins: ['authority_integrity'] },
  { id: 'GATE_REPAIR_KINDS', values: GATE_REPAIR_KINDS, pins: ['agent_action', 'missing_contract'] },
  { id: 'WorkUnitTimeoutRecommendedAction', values: [...WorkUnitTimeoutRecommendedAction.options], pins: ['block'] },
  { id: 'StopAuthorizationState', values: [...StopAuthorizationState.options], pins: ['final_delivery'] },
  { id: 'PHASE_STATUS_AUDIT_OUTCOMES', values: PHASE_STATUS_AUDIT_OUTCOMES, pins: ['passed'] },
  { id: 'WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS', values: WORK_UNIT_CANDIDATE_PROJECTION_ACTIONS, pins: ['submit', 'return_to_actor'] },
  { id: 'WORK_UNIT_ATTEMPT_DISPOSITIONS', values: WORK_UNIT_ATTEMPT_DISPOSITIONS, pins: ['current', 'not_submitted'] },
  { id: 'FILE_REPAIR_DIRECTIVES', values: FILE_REPAIR_DIRECTIVES, pins: ['materialize_canonical_surface', 'current_entry_contract'] },
];

const CUE_RE = /closed (disposition |recovery |gate-hint )?vocabulary|the [a-z-]+ (kinds|vocabulary|values|set)|exactly one of|one of the closed|CLI-verb spelling|CLI 动词拼写/;
const HEDGE_RE = /for example|such as|including|e\.g\.|例如/;
const BACKTICK_RE = /`([^`]+)`/g;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function memberRegex(value) {
  return new RegExp(`(?<![A-Za-z0-9_-])${escapeRegExp(value)}(?![A-Za-z0-9_-])`);
}

/** Split one backticked token into candidate members (pipe-joined sets count per part). */
function tokenParts(token) {
  return token.split('|').map((part) => part.trim()).filter(Boolean);
}

/** Split a logical line into sentences (prose rule evaluation is per sentence). */
export function sentences(line) {
  return line.split(/(?<=[.;])\s+/).map((part) => part.trim()).filter(Boolean);
}

/** Classify one logical line; returns findings (strings) for it. */
export function classifyLine(line, sets = SETS) {
  return sentences(line).flatMap((sentence) => classifySentence(sentence, sets));
}

/** Classify one sentence; returns findings (strings) for it. */
export function classifySentence(sentence, sets = SETS) {
  const findings = [];
  const matches = [...sentence.matchAll(BACKTICK_RE)];
  if (matches.length === 0) return findings;

  const tokens = matches.flatMap((m) => tokenParts(m[1]));
  // per set: which tokens (distinct, in order) are members
  const perSet = sets.map((set) => {
    const members = tokens.filter((token) => set.values.some((value) => memberRegex(value).test(token)));
    return { set, members };
  });
  const active = perSet.filter((entry) => entry.members.length > 0);
  if (active.length === 0) return findings;

  // dominant set: most distinct member hits; ties resolved by SETS order
  const dominant = active.reduce((best, entry) => (entry.members.length > best.members.length ? entry : best), active[0]);
  if (dominant.members.length < 2) return findings; // incidental single-value mention

  // exact membership: a backticked token is a set member iff it equals a value
  const isMember = (token, set) => set.values.includes(token);
  const memberSetCount = (token) => sets.filter((set) => isMember(token, set)).length;
  const isKnownToken = (token) => sets.some((set) => isMember(token, set));

  // Rule (i): any listed COMPOUND token (contains `_` or `-`) that belongs to
  // exactly one known set which is not the dominant set. Two exemptions are
  // calibrated against the live tree: (a) tokens shared by 2+ sets (e.g.
  // `wait`, `missing_contract`) are surface-ambiguous by design; (b) single
  // common words (`repair`, `current`, `inspect`) are too ambiguous as
  // cross-set signals — compound vocabulary tokens are the drift signature.
  for (const token of tokens) {
    if (!isKnownToken(token)) continue;
    if (memberSetCount(token) > 1) continue;
    if (!/[_-]/.test(token)) continue;
    if (!isMember(token, dominant.set)) {
      findings.push(`${sentence.trim().slice(0, 120)} → token \`${token}\` is not in ${dominant.set.id}`);
    }
  }

  // Rule (ii): closure cue + no hedge → enumerated members must equal the code set
  if (CUE_RE.test(sentence) && !HEDGE_RE.test(sentence)) {
    const missing = dominant.set.values.filter((value) => !dominant.members.includes(value));
    if (missing.length > 0) {
      findings.push(
        `${sentence.trim().slice(0, 120)} → restates ${dominant.members.length} of ${dominant.set.values.length} ${dominant.set.id}` +
          `; missing: ${missing.join(', ')}`,
      );
    }
  }
  return findings;
}

/** Join hard-wrapped list-item continuation lines into logical lines. */
export function logicalLines(text) {
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\t/g, '  ');
    if (/^(#{1,6} |[-*] |\d+\. |>|$|\|)/.test(line) || out.length === 0) {
      out.push(line);
    } else {
      out[out.length - 1] += ` ${line.trim()}`;
    }
  }
  return out;
}

export function scanTree(root, sets = SETS) {
  const findings = [];
  const surfaces = ['openspec/specs', 'openspec/guidance'];
  for (const surface of surfaces) {
    const dir = join(root, surface);
    if (!existsSync(dir)) continue;
    const files = walk(dir).filter((file) => file.endsWith('.md'));
    for (const file of files) {
      const text = readFileSync(file, 'utf-8');
      for (const line of logicalLines(text)) {
        for (const finding of classifyLine(line, sets)) {
          findings.push(`${relative(root, file)}: ${finding}`);
        }
      }
    }
  }
  return findings;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function failClosedDerive(sets = SETS) {
  for (const set of sets) {
    if (!Array.isArray(set.values) || set.values.length === 0) {
      console.error(`FAIL check-spec-enum-restatements: derived set ${set.id} is empty`);
      return false;
    }
    for (const pin of set.pins) {
      if (!set.values.includes(pin)) {
        console.error(`FAIL check-spec-enum-restatements: derived set ${set.id} lost fixture member \`${pin}\``);
        return false;
      }
    }
  }
  return true;
}

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node check-spec-enum-restatements.mjs [projectRoot]');
  process.exit(2);
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length > 1) usage('At most one projectRoot positional argument is allowed.');
  const root = resolve(argv[0] ?? process.cwd());
  if (!existsSync(join(root, 'openspec'))) usage(`no openspec root under ${root}`);

  if (!failClosedDerive()) {
    process.exitCode = 1;
    return;
  }
  const findings = scanTree(root);
  if (findings.length > 0) {
    console.error(`FAIL check-spec-enum-restatements: ${findings.length} restatement drift finding(s)`);
    for (const finding of findings) console.error(`  - ${finding}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS check-spec-enum-restatements — closed-vocabulary prose restatements consistent with code-derived sets (${SETS.length} sets derived).`);
}

const isDirectInvocation = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.url.replace('file://', ''));
if (isDirectInvocation || process.argv[1]?.endsWith('check-spec-enum-restatements.mjs')) {
  await main();
}
