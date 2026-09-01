#!/usr/bin/env node
// check-feedback-vocabulary-gate.mjs — reuse-first gate for Agent-facing closed
// feedback vocabularies.
//
// @impl RET-012
//
// Mechanical facts read (no semantic judgment):
//   1. Derivation — every known closed feedback vocabulary maps to ONE
//      code-derived frozen non-empty array export (single value owner).
//   2. Registration — every known vocabulary is registered in
//      check-spec-enum-restatements.mjs SETS with values deep-equal to the
//      code-derived export (no second owner, no drift).
//   3. Triage — root CONTEXT.md carries the field-name triage section; every
//      known field name appears as a triage row field with its owner pointer.
//   4. Growth — every field name introduced as a triage row in root CONTEXT.md
//      must be in the known table. A new closed feedback field name without its
//      export, SETS registration, and triage row fails here (RET-012 gate).
//
// The triage section is the section of root CONTEXT.md between the
// `字段名分诊` marker and the next table break where each row starts with the
// backticked field name (`| `field` |`). Value tokens elsewhere in CONTEXT.md
// are outside this gate's scope.
//
// Usage: node check-feedback-vocabulary-gate.mjs [projectRoot]

import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { GATE_REPAIR_KINDS } from '../../DEEP_RESEARCH_HARNESS/schema/contracts/gate-definition.mjs';
import { WORK_UNIT_RECOVERY_ACTIONS } from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs';
import { FILE_REPAIR_DIRECTIVES } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/file-observability.mjs';
import { SETS } from './check-spec-enum-restatements.mjs';

const CONTEXT_MARKER = '字段名分诊';

// Known closed feedback vocabularies. The array export is the sole value owner;
// `ownerPointer` must stay visible in the CONTEXT.md triage row.
export const FEEDBACK_VOCABULARIES = [
  {
    field: 'repair_kind',
    surface: 'gate/phase checkpoint feedback (hints[] / finding repair.kind)',
    setId: 'GATE_REPAIR_KINDS',
    exportName: 'GATE_REPAIR_KINDS',
    ownerPointer: 'GATE_REPAIR_KINDS',
    values: GATE_REPAIR_KINDS,
  },
  {
    field: 'recovery_action',
    surface: 'work-unit recovery feedback (next.recovery_action)',
    setId: 'WORK_UNIT_RECOVERY_ACTIONS',
    exportName: 'WORK_UNIT_RECOVERY_ACTIONS',
    ownerPointer: 'work-unit-repair-vocabulary.mjs',
    values: WORK_UNIT_RECOVERY_ACTIONS,
  },
  {
    field: 'repair_directive',
    surface: 'file-observability findings',
    setId: 'FILE_REPAIR_DIRECTIVES',
    exportName: 'FILE_REPAIR_DIRECTIVES',
    ownerPointer: 'FILE_REPAIR_DIRECTIVES',
    values: FILE_REPAIR_DIRECTIVES,
  },
];

/** Extract the triage section rows: backticked field names in the first cell. */
export function triageFieldNames(contextText) {
  const start = contextText.indexOf(CONTEXT_MARKER);
  if (start === -1) return null;
  const rest = contextText.slice(start);
  const fields = [];
  for (const line of rest.split('\n')) {
    const row = line.match(/^\|\s*`([a-z_]+)`/);
    if (row) fields.push(row[1]);
    else if (fields.length > 0 && !line.startsWith('|')) break;
  }
  return fields;
}

/**
 * Pure gate evaluation over direct facts.
 * @returns {{ findings: string[], knownFields: string[] }}
 */
export function evaluateGate({ contextText, sets, vocabularies = FEEDBACK_VOCABULARIES }) {
  const findings = [];
  const knownFields = vocabularies.map((v) => v.field);

  for (const vocabulary of vocabularies) {
    if (!Array.isArray(vocabulary.values) || vocabulary.values.length === 0) {
      findings.push(`${vocabulary.field}: code-derived export must be a non-empty array`);
    } else if (!Object.isFrozen(vocabulary.values)) {
      findings.push(`${vocabulary.field}: code-derived export must be frozen (single value owner)`);
    }
    const registered = sets.find((set) => set.id === vocabulary.setId);
    if (!registered) {
      findings.push(
        `${vocabulary.field}: not registered in check-spec-enum-restatements SETS as ${vocabulary.setId}`,
      );
    } else if (JSON.stringify(registered.values) !== JSON.stringify(vocabulary.values)) {
      findings.push(
        `${vocabulary.field}: SETS values drift from the code-derived export ${vocabulary.exportName}`,
      );
    }
  }

  const triageFields = triageFieldNames(contextText);
  if (triageFields === null) {
    findings.push(`root CONTEXT.md must carry the ${CONTEXT_MARKER} field-name triage section`);
  } else {
    for (const field of knownFields) {
      if (!triageFields.includes(field)) {
        findings.push(`root CONTEXT.md triage is missing the known field name \`${field}\``);
      }
    }
    for (const field of triageFields) {
      if (!knownFields.includes(field)) {
        findings.push(
          `root CONTEXT.md triage introduces unknown closed feedback field name \`${field}\`: ` +
            'a new vocabulary needs one code-derived frozen export, a check-spec-enum-restatements ' +
            'SETS registration, and this triage row in the same change (RET-012)',
        );
      }
    }
  }

  for (const vocabulary of vocabularies) {
    if (!contextText.includes(vocabulary.ownerPointer)) {
      findings.push(
        `root CONTEXT.md triage must keep the owner pointer ${vocabulary.ownerPointer} for \`${vocabulary.field}\``,
      );
    }
  }

  return { findings, knownFields };
}

function usage(message) {
  if (message) console.error(message);
  console.error('Usage: node check-feedback-vocabulary-gate.mjs [projectRoot]');
  process.exit(2);
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.length > 1) usage('At most one projectRoot positional argument is allowed.');
  const root = resolve(argv[0] ?? process.cwd());
  if (!existsSync(join(root, 'CONTEXT.md')) || !existsSync(join(root, 'openspec'))) {
    usage(`no openspec root or CONTEXT.md under ${root}`);
  }

  const contextText = readFileSync(join(root, 'CONTEXT.md'), 'utf-8');
  const { findings, knownFields } = evaluateGate({ contextText, sets: SETS });

  if (findings.length > 0) {
    console.error(`FAIL check-feedback-vocabulary-gate: ${findings.length} finding(s)`);
    for (const finding of findings) console.error(`  - ${finding}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `PASS check-feedback-vocabulary-gate — ${knownFields.length} closed feedback vocabularies are ` +
      `single-export derived, SETS-registered, and CONTEXT.md-triaged (${relative(root, join(root, 'CONTEXT.md'))}).`,
  );
}

const isDirectInvocation = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.url.replace('file://', ''));
if (isDirectInvocation || process.argv[1]?.endsWith('check-feedback-vocabulary-gate.mjs')) {
  await main();
}
