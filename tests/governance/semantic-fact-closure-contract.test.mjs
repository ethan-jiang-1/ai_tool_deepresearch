// @impl SEF-001, SEF-002
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parse as parseYaml } from 'yaml';
import {
  INITIAL_SEMANTIC_FACT_FAMILIES,
  parseSemanticClosureRecord,
  parseSemanticFactFamilies,
} from '../../openspec/governance/semantic-fact-closure-contract.mjs';

const REPO = process.cwd();

function affectedRecord() {
  return {
    schema_version: 'semantic-closure/v1',
    change: 'example-change',
    status: 'affected',
    catalog_additions: [],
    affected: [{
      family: 'work-unit.source-claim-provenance',
      fact: 'Whether a submitted source reference has legal provenance.',
      authority: {
        resolver: 'DEEP_RESEARCH_HARNESS/engine/source-authority.mjs#resolveSourceAuthority',
      },
      established_by: [
        'DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs#submit',
      ],
      consumers: [
        'DEEP_RESEARCH_HARNESS/engine/source-submit.mjs#validate',
      ],
      overlap: [{
        relation: 'none',
        detail: 'No legacy projection represents this conclusion.',
      }],
      verification: {
        truth_table: 'tests/governance/source-authority.test.mjs',
        cross_surface: 'tests/integration/governance/source-authority.test.mjs',
      },
    }],
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertInvalid(result, pattern) {
  assert.equal(result.ok, false, 'expected parse failure');
  assert.match(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'), pattern);
}

describe('semantic-fact-families/v1 contract', () => {
  it('strictly parses the exact initial thirteen bounded family pairs', () => {
    const catalog = parseYaml(readFileSync(
      `${REPO}/openspec/governance/semantic-fact-families.yaml`,
      'utf8',
    ));
    const parsed = parseSemanticFactFamilies(catalog);

    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.catalog.families, INITIAL_SEMANTIC_FACT_FAMILIES);
    assert.equal(parsed.catalog.families.length, 13);
    assert.deepEqual(
      parsed.catalog.families.find((family) => family.id === 'work-unit.assignment-output-obligation'),
      {
        id: 'work-unit.assignment-output-obligation',
        bounded_question: 'What direct-output declaration and required-output obligations does this work-unit assignment impose?',
      },
    );
  });

  it('rejects extra catalog fields, duplicate families, and free-form fallbacks', () => {
    const strict = {
      schema_version: 'semantic-fact-families/v1',
      families: [{ id: 'work-unit.example-authority', bounded_question: 'Which authority establishes the example conclusion?' }],
      extra: true,
    };
    assertInvalid(parseSemanticFactFamilies(strict), /Unrecognized key/);

    const duplicate = {
      schema_version: 'semantic-fact-families/v1',
      families: [
        { id: 'work-unit.example-authority', bounded_question: 'Which authority establishes the example conclusion?' },
        { id: 'work-unit.example-authority', bounded_question: 'Which authority establishes the replacement conclusion?' },
      ],
    };
    assertInvalid(parseSemanticFactFamilies(duplicate), /family IDs must be unique/);

    const fallback = {
      schema_version: 'semantic-fact-families/v1',
      families: [{ id: 'other', bounded_question: 'Anything else?' }],
    };
    assertInvalid(parseSemanticFactFamilies(fallback), /dotted semantic fact family ID/);
  });
});

describe('semantic-closure/v1 contract', () => {
  it('accepts both closed status branches and checks selected change identity', () => {
    const notApplicable = parseSemanticClosureRecord({
      schema_version: 'semantic-closure/v1',
      change: 'example-change',
      status: 'not_applicable',
      reason: 'This change only adjusts explanatory governance prose.',
    }, { expectedChange: 'example-change' });
    assert.equal(notApplicable.ok, true);

    const affected = parseSemanticClosureRecord(affectedRecord(), { expectedChange: 'example-change' });
    assert.equal(affected.ok, true);

    assertInvalid(parseSemanticClosureRecord(affectedRecord(), { expectedChange: 'other-change' }), /must equal selected change/);
  });

  it('rejects fields that cross the closed status branches', () => {
    const notApplicable = {
      schema_version: 'semantic-closure/v1',
      change: 'example-change',
      status: 'not_applicable',
      reason: 'Governance only.',
      affected: [],
    };
    assertInvalid(parseSemanticClosureRecord(notApplicable), /Unrecognized key/);

    const affected = affectedRecord();
    affected.reason = 'Not permitted on the affected branch.';
    assertInvalid(parseSemanticClosureRecord(affected), /Unrecognized key/);
  });

  it('allows a syntactically new family only with one matching catalog addition', () => {
    const record = affectedRecord();
    record.affected[0].family = 'work-unit.example-authority';
    record.catalog_additions = [{
      id: 'work-unit.example-authority',
      bounded_question: 'Which authority establishes the example conclusion?',
    }];
    assert.equal(parseSemanticClosureRecord(record).ok, true);

    record.catalog_additions = [{
      id: 'work-unit.unused-authority',
      bounded_question: 'Which authority establishes an unused conclusion?',
    }];
    assertInvalid(parseSemanticClosureRecord(record), /must be used by exactly one affected entry/);

    const duplicate = affectedRecord();
    duplicate.affected.push(clone(duplicate.affected[0]));
    assertInvalid(parseSemanticClosureRecord(duplicate), /must appear exactly once/);
  });

  it('rejects mixed, malformed, unsafe, and duplicated coordinate declarations', () => {
    const mixedOverlap = affectedRecord();
    mixedOverlap.affected[0].overlap.push({
      coordinate: 'DEEP_RESEARCH_HARNESS/engine/legacy-source.mjs#read',
      relation: 'derived',
      detail: 'This projection is derived from the resolver.',
    });
    assertInvalid(parseSemanticClosureRecord(mixedOverlap), /sole overlap entry/);

    const malformedNone = affectedRecord();
    malformedNone.affected[0].overlap = [{
      coordinate: 'DEEP_RESEARCH_HARNESS/engine/legacy-source.mjs',
      relation: 'none',
      detail: 'No overlap.',
    }];
    assertInvalid(parseSemanticClosureRecord(malformedNone), /Unrecognized key/);

    const unsafeResolver = affectedRecord();
    unsafeResolver.affected[0].authority.resolver = '../outside.mjs#resolve';
    assertInvalid(parseSemanticClosureRecord(unsafeResolver), /must not contain empty, dot, or traversal segments/);

    const duplicateEstablishedBy = affectedRecord();
    duplicateEstablishedBy.affected[0].established_by.push(
      'DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs#retry',
    );
    assertInvalid(parseSemanticClosureRecord(duplicateEstablishedBy), /established_by coordinates must be unique by file path/);

    const duplicateOverlap = affectedRecord();
    duplicateOverlap.affected[0].overlap = [
      {
        coordinate: 'DEEP_RESEARCH_HARNESS/engine/legacy-source.mjs#readOne',
        relation: 'derived',
        detail: 'First derived projection.',
      },
      {
        coordinate: 'DEEP_RESEARCH_HARNESS/engine/legacy-source.mjs#readTwo',
        relation: 'retired',
        detail: 'Duplicate file coordinate.',
      },
    ];
    assertInvalid(parseSemanticClosureRecord(duplicateOverlap), /real overlap coordinates must be unique by file path/);
  });

  it('requires distinct truth-table and cross-surface verification assets', () => {
    const record = affectedRecord();
    record.affected[0].verification.cross_surface = 'tests/governance/source-authority.test.mjs#integration';
    assertInvalid(parseSemanticClosureRecord(record), /must name distinct verification assets/);
  });
});
