// work-unit-repair-vocabulary.test.mjs
// Unit contract for the engine-owned attempt-owned recovery vocabulary export.
// @impl CHI-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WORK_UNIT_RECOVERY_ACTION,
  WORK_UNIT_RECOVERY_ACTIONS,
  RECOVERY_ACTION_CLI_VERB,
  WORK_UNIT_REPAIR_KIND,
  WORK_UNIT_REPAIR_KINDS,
  REPAIR_KIND_CLI_VERB,
  WORK_UNIT_ATTEMPT_DISPOSITION,
  WORK_UNIT_ATTEMPT_DISPOSITIONS,
  WorkUnitAttemptDispositionSchema,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs';

describe('work-unit recovery vocabulary export', () => {
  it('exports WORK_UNIT_RECOVERY_ACTIONS and WORK_UNIT_RECOVERY_ACTION', () => {
    assert.equal(WORK_UNIT_RECOVERY_ACTIONS.length, 10);
    assert.deepEqual(WORK_UNIT_RECOVERY_ACTIONS, WORK_UNIT_REPAIR_KINDS);
    assert.deepEqual(RECOVERY_ACTION_CLI_VERB, REPAIR_KIND_CLI_VERB);
  });
  it('names exactly the ten attempt-owned recovery kinds', () => {
    assert.equal(WORK_UNIT_REPAIR_KINDS.length, 10);
    assert.deepEqual(
      [...WORK_UNIT_REPAIR_KINDS].sort(),
      [
        'author_exact_fallback_attempt',
        'claim_successor',
        'inspect_current_lineage_leaf',
        'missing_contract',
        'recover-declaration',
        'recover-transaction',
        'semantic_boundary',
        'supersede',
        'wait',
        'wait_for_delegated_candidate',
      ],
    );
  });

  it('keeps one canonical spelling per kind and no duplicates', () => {
    assert.equal(new Set(WORK_UNIT_REPAIR_KINDS).size, 10);
    for (const kind of WORK_UNIT_REPAIR_KINDS) {
      assert.match(kind, /^[a-z][a-z0-9_-]*$/);
    }
    assert.equal(Object.keys(WORK_UNIT_REPAIR_KIND).length, 10);
    assert.deepEqual([...Object.values(WORK_UNIT_REPAIR_KIND)].sort(), [...WORK_UNIT_REPAIR_KINDS].sort(), 'KIND map values must equal the KINDS array');
  });

  it('covers every kind with a CLI verb or an explicit null boundary', () => {
    assert.deepEqual(
      Object.keys(REPAIR_KIND_CLI_VERB).sort(),
      [...WORK_UNIT_REPAIR_KINDS].sort(),
    );
    for (const [kind, verb] of Object.entries(REPAIR_KIND_CLI_VERB)) {
      if (verb !== null) {
        assert.match(verb, /^[a-z][a-z0-9-]*$/);
      }
    }
    assert.equal(REPAIR_KIND_CLI_VERB.claim_successor, 'claim');
    assert.equal(REPAIR_KIND_CLI_VERB.inspect_current_lineage_leaf, 'inspect');
    assert.equal(REPAIR_KIND_CLI_VERB.semantic_boundary, null);
  });
});

describe('work-unit attempt disposition vocabulary (C2 lock)', () => {
  const DISPOSITIONS = ['current', 'historical', 'not_submitted', 'unresolved', 'unsupported_current_contract'];

  it('exports the exact five-value frozen set owned by the schema', () => {
    assert.equal(WORK_UNIT_ATTEMPT_DISPOSITIONS.length, 5);
    assert.deepEqual([...WORK_UNIT_ATTEMPT_DISPOSITIONS].sort(), DISPOSITIONS);
    assert.equal(Object.isFrozen(WORK_UNIT_ATTEMPT_DISPOSITIONS), true);
    assert.equal(new Set(WORK_UNIT_ATTEMPT_DISPOSITIONS).size, 5);
  });

  it('locks each value through WorkUnitAttemptDispositionSchema round-trip', () => {
    for (const value of WORK_UNIT_ATTEMPT_DISPOSITIONS) {
      assert.equal(WorkUnitAttemptDispositionSchema.parse(value), value);
    }
    assert.throws(() => WorkUnitAttemptDispositionSchema.parse('busy'), /invalid/);
    assert.throws(() => WorkUnitAttemptDispositionSchema.parse('suspect_transaction'), /invalid/);
  });

  it('keeps the ergonomic key map value-equal to the array', () => {
    assert.deepEqual([...Object.values(WORK_UNIT_ATTEMPT_DISPOSITION)].sort(), DISPOSITIONS);
    assert.equal(WORK_UNIT_ATTEMPT_DISPOSITION.current, 'current');
  });

  it('emission module carries no bare disposition string literals', () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'DEEP_RESEARCH_HARNESS', 'engine', 'work-unit-attempt-disposition.mjs'),
      'utf-8',
    );
    assert.equal((source.match(/disposition: '/g) || []).length, 0, 'bare disposition literals must use WORK_UNIT_ATTEMPT_DISPOSITION constants');
  });
});
