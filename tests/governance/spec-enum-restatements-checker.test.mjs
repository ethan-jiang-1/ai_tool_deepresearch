// spec-enum-restatements-checker.test.mjs
// Self-test for the derived closed-vocabulary prose guard: detection logic on
// synthetic sentences (calibration) + live-tree zero-finding governance property.
// @impl RET-006
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifySentence, logicalLines, scanTree, SETS } from '../../openspec/governance/check-spec-enum-restatements.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('check-spec-enum-restatements: derivation', () => {
  it('derives all nine sets with fixture pins present and no empty set', () => {
    assert.equal(SETS.length, 9);
    for (const set of SETS) {
      assert.ok(Array.isArray(set.values) && set.values.length > 0, `${set.id} must be non-empty`);
      for (const pin of set.pins) {
        assert.ok(set.values.includes(pin), `${set.id} must contain fixture pin ${pin}`);
      }
    }
  });
});

describe('check-spec-enum-restatements: sentence calibration', () => {
  it('flags cross-vocabulary contamination (compound token from another set)', () => {
    const line = 'for example the gate-hint kinds `agent_action`, `engine_operation`, `user_decision`, `external_action`, `semantic_boundary`, and the topic-state/entry kinds';
    const findings = classifySentence(line);
    assert.ok(findings.some((f) => f.includes('`semantic_boundary`') && f.includes('GATE_REPAIR_KINDS')), JSON.stringify(findings));
  });

  it('flags unhedged closed-set completeness drift (5 of 10)', () => {
    const line = 'the recovery vocabulary SHALL use the CLI-verb spelling (`recover-transaction`, `recover-declaration`, `supersede`, `wait`, `missing_contract`)';
    const findings = classifySentence(line);
    assert.ok(findings.some((f) => f.includes('5 of 10') && f.includes('WORK_UNIT_RECOVERY_ACTIONS')), JSON.stringify(findings));
  });

  it('accepts hedged subset enumerations and full exact restatements', () => {
    assert.deepEqual(classifySentence('such as the gate-hint kinds `agent_action`, `engine_operation`, `user_decision`'), []);
    assert.deepEqual(classifySentence('the gate-hint kinds `agent_action`, `engine_operation`, `user_decision`, `external_action`, `missing_contract`'), []);
    assert.deepEqual(classifySentence('one of the closed disposition vocabulary `unsupported_current_contract`, `not_submitted`, `historical`, `unresolved`, `current`'), []);
    assert.deepEqual(classifySentence('the closed set `submit|repair_same_candidate|return_to_actor|fail_and_replace|inspect_contract`'), []);
  });

  it('ignores single-value mentions, field-name tokens, and common-word tokens', () => {
    assert.deepEqual(classifySentence('the disposition root is `current`'), []);
    assert.deepEqual(classifySentence('when `finding.source` is `definition`, `repair.kind`: `agent_action`, `engine_operation`, `user_decision`, `external_action`, or `missing_contract`'), []);
    assert.deepEqual(classifySentence('Producer-supplied `repair` and action-bearing `advice[]` for `user_decision`, `external_action`, or `missing_contract`'), []);
  });
});

describe('check-spec-enum-restatements: logical-line joining', () => {
  it('joins hard-wrapped bullet continuations into one logical line', () => {
    const lines = logicalLines('- the recovery vocabulary SHALL use the CLI-verb spelling (`recover-transaction`,\n  `recover-declaration`, `supersede`, `wait`, `missing_contract`) or a boundary');
    assert.equal(lines.length, 1);
    const findings = classifySentence(lines[0]);
    assert.ok(findings.some((f) => f.includes('5 of 10')), 'wrapped enumeration must still be detected');
  });
});

describe('check-spec-enum-restatements: live tree', () => {
  it('reports zero findings on the current repository (governance property)', () => {
    assert.deepEqual(scanTree(ROOT), []);
  });
});
