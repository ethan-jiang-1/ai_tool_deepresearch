// work-unit-repair-vocabulary.test.mjs
// Unit contract for the engine-owned attempt-owned recovery vocabulary export.
// @impl CHI-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WORK_UNIT_REPAIR_KIND,
  WORK_UNIT_REPAIR_KINDS,
  REPAIR_KIND_CLI_VERB,
} from '../../DEEP_RESEARCH_HARNESS/engine/work-unit-repair-vocabulary.mjs';

describe('work-unit repair vocabulary export', () => {
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
