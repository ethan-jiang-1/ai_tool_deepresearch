// feedback-vocabulary-gate.test.mjs
// Self-test for the RET-012 reuse-first gate: live-tree PASS property plus
// synthetic fail paths (unknown new field name, missing registration, missing
// triage row, drifted SETS values).
// @impl RET-012
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { evaluateGate, FEEDBACK_VOCABULARIES, triageFieldNames } from '../../openspec/governance/check-feedback-vocabulary-gate.mjs';
import { SETS } from '../../openspec/governance/check-spec-enum-restatements.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function liveContext() {
  return readFileSync(join(ROOT, 'CONTEXT.md'), 'utf-8');
}

describe('check-feedback-vocabulary-gate', () => {
  it('passes on the live tree: all known vocabularies derived, registered, and triaged', () => {
    const { findings, knownFields } = evaluateGate({ contextText: liveContext(), sets: SETS });
    assert.deepEqual(findings, [], JSON.stringify(findings));
    assert.deepEqual(knownFields, ['repair_kind', 'recovery_action', 'repair_directive']);
  });

  it('extracts exactly the triage row field names from the live CONTEXT.md', () => {
    const fields = triageFieldNames(liveContext());
    assert.ok(fields, 'triage section must exist');
    assert.deepEqual(fields, ['repair_kind', 'recovery_action', 'repair_directive']);
  });

  it('fails a new closed feedback field name without its export/registration/row', () => {
    const contextText = liveContext().replace(
      '| `repair_directive` |',
      '| `repair_directive` |\n| `repair_hint` | gate hints | Who | `X` |',
    );
    const { findings } = evaluateGate({ contextText, sets: SETS });
    assert.ok(
      findings.some((f) => f.includes('unknown closed feedback field name `repair_hint`')),
      JSON.stringify(findings),
    );
  });

  it('fails when a known vocabulary loses its SETS registration', () => {
    const sets = SETS.filter((set) => set.id !== 'FILE_REPAIR_DIRECTIVES');
    const { findings } = evaluateGate({ contextText: liveContext(), sets });
    assert.ok(
      findings.some((f) => f.includes('repair_directive') && f.includes('SETS')),
      JSON.stringify(findings),
    );
  });

  it('fails when SETS values drift from the code-derived export', () => {
    const sets = SETS.map((set) =>
      set.id === 'FILE_REPAIR_DIRECTIVES'
        ? { ...set, values: [...set.values.slice(0, 5)] }
        : set,
    );
    const { findings } = evaluateGate({ contextText: liveContext(), sets });
    assert.ok(
      findings.some((f) => f.includes('SETS values drift')),
      JSON.stringify(findings),
    );
  });

  it('fails when the triage section is removed', () => {
    const contextText = liveContext().replace('字段名分诊', '字段名诊断历史');
    const { findings } = evaluateGate({ contextText, sets: SETS });
    assert.ok(
      findings.some((f) => f.includes('field-name triage section')),
      JSON.stringify(findings),
    );
  });

  it('keeps every known export frozen and non-empty', () => {
    for (const vocabulary of FEEDBACK_VOCABULARIES) {
      assert.ok(Array.isArray(vocabulary.values) && vocabulary.values.length > 0, vocabulary.field);
      assert.ok(Object.isFrozen(vocabulary.values), `${vocabulary.field} export must be frozen`);
    }
  });
});
