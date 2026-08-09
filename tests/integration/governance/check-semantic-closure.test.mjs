// @impl SEF-004
import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { stringify as stringifyYaml } from 'yaml';

const REPO = process.cwd();
const CHECKER = join(REPO, 'openspec', 'governance', 'check-semantic-closure.mjs');
const roots = [];
const outsideRoots = [];

const CATALOG = {
  schema_version: 'semantic-fact-families/v1',
  families: [{
    id: 'work-unit.source-claim-provenance',
    bounded_question: 'Does a source claim have legal provenance?',
  }],
};

function write(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function closureRecord({ status = 'affected' } = {}) {
  if (status === 'not_applicable') {
    return {
      schema_version: 'semantic-closure/v1',
      change: 'example-change',
      status,
      reason: 'This change alters only repository governance mechanics.',
    };
  }
  return {
    schema_version: 'semantic-closure/v1',
    change: 'example-change',
    status,
    catalog_additions: [],
    affected: [{
      family: 'work-unit.source-claim-provenance',
      fact: 'Whether a submitted source reference has legal provenance.',
      authority: {
        resolver: 'DEEP_RESEARCH_HARNESS/engine/source-authority.mjs#resolveSourceAuthority',
      },
      established_by: ['DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs#submit'],
      consumers: ['DEEP_RESEARCH_HARNESS/engine/source-submit.mjs#validate'],
      overlap: [{
        coordinate: 'DEEP_RESEARCH_HARNESS/engine/source-legacy.mjs#read',
        relation: 'derived',
        detail: 'The legacy reader projects the resolver conclusion.',
      }],
      verification: {
        truth_table: 'tests/governance/source-authority.test.mjs',
        cross_surface: 'tests/integration/governance/source-authority.test.mjs',
      },
    }],
  };
}

function verificationPlan() {
  return {
    schema_version: 'verification-routing/v1',
    change: 'example-change',
    test_classes: {
      unit: { status: 'selected', rationale: 'Focused resolver proof.' },
      integration: { status: 'selected', rationale: 'Cross-surface proof.' },
      deterministic_e2e: { status: 'not_applicable', rationale: 'No workflow-scale proof.' },
      agent_flow_e2e: { status: 'not_applicable', rationale: 'No Agent behavior proof.' },
    },
    claims: [
      {
        id: 'source-authority-unit',
        statement: 'Exercise the source authority truth table.',
        test_class: 'unit',
        proof_subject: 'deterministic_contract',
        asset: { kind: 'node_test', path: 'tests/governance/source-authority.test.mjs' },
        execution_profile: {
          fixture: 'none', subject_execution: 'none', runtime: 'none', external_calls: 'none', verdict_judge: 'deterministic',
        },
        verdict_authority: 'node_test_exit',
      },
      {
        id: 'source-authority-integration',
        statement: 'Exercise the source authority consumer boundary.',
        test_class: 'integration',
        proof_subject: 'deterministic_contract',
        asset: { kind: 'node_test', path: 'tests/integration/governance/source-authority.test.mjs' },
        execution_profile: {
          fixture: 'none', subject_execution: 'none', runtime: 'none', external_calls: 'none', verdict_judge: 'deterministic',
        },
        verdict_authority: 'node_test_exit',
      },
    ],
  };
}

function writeRecord(root, record) {
  write(root, 'openspec/changes/example-change/semantic-closure.yaml', stringifyYaml(record));
}

function writeCatalog(root, catalog) {
  write(root, 'openspec/governance/semantic-fact-families.yaml', stringifyYaml(catalog));
}

function fixture(options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'semantic-closure-'));
  roots.push(root);
  writeCatalog(root, clone(options.catalog ?? CATALOG));
  writeRecord(root, closureRecord(options));
  write(root, 'openspec/changes/example-change/verification-plan.yaml', stringifyYaml(verificationPlan()));
  for (const path of [
    'DEEP_RESEARCH_HARNESS/engine/source-authority.mjs',
    'DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs',
    'DEEP_RESEARCH_HARNESS/engine/source-submit.mjs',
    'DEEP_RESEARCH_HARNESS/engine/source-legacy.mjs',
    'tests/governance/source-authority.test.mjs',
    'tests/integration/governance/source-authority.test.mjs',
  ]) {
    write(root, path, '// fixture asset\n');
  }
  return root;
}

function run(root, mode = 'plan') {
  return spawnSync(process.execPath, [CHECKER, '--change', 'example-change', '--mode', mode], {
    cwd: root,
    encoding: 'utf8',
    timeout: 10000,
  });
}

function recordPath(root) {
  return join(root, 'openspec/changes/example-change/semantic-closure.yaml');
}

function catalogPath(root) {
  return join(root, 'openspec/governance/semantic-fact-families.yaml');
}

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  for (const root of outsideRoots) rmSync(root, { recursive: true, force: true });
});

describe('check-semantic-closure.mjs', () => {
  let root;

  beforeEach(() => { root = fixture(); });

  it('accepts canonical selected-verification coordinates and remains read-only', () => {
    const before = {
      catalog: readFileSync(catalogPath(root), 'utf8'),
      record: readFileSync(recordPath(root), 'utf8'),
      plan: readFileSync(join(root, 'openspec/changes/example-change/verification-plan.yaml'), 'utf8'),
    };

    const plan = run(root, 'plan');
    assert.equal(plan.status, 0, plan.stderr);
    const assets = run(root, 'assets');
    assert.equal(assets.status, 0, assets.stderr);
    assert.match(plan.stdout, /Semantic closure plan valid/);
    assert.match(assets.stdout, /Semantic closure assets valid/);
    assert.equal(readFileSync(catalogPath(root), 'utf8'), before.catalog);
    assert.equal(readFileSync(recordPath(root), 'utf8'), before.record);
    assert.equal(readFileSync(join(root, 'openspec/changes/example-change/verification-plan.yaml'), 'utf8'), before.plan);
  });

  it('rejects a verification plan that names another selected change', () => {
    const plan = verificationPlan();
    plan.change = 'other-change';
    write(root, 'openspec/changes/example-change/verification-plan.yaml', stringifyYaml(plan));

    const result = run(root, 'plan');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /verification-plan change must equal selected change example-change/);
    assert.match(result.stderr, /owner: verification-routing plan/);
    assert.match(result.stderr, /--mode plan/);
  });

  it('separates a new catalog addition before Apply from its matching assets-mode write', () => {
    const record = closureRecord();
    const addition = {
      id: 'work-unit.example-authority',
      bounded_question: 'Which source authority conclusion is established for the example?',
    };
    record.affected[0].family = addition.id;
    record.catalog_additions = [addition];
    writeRecord(root, record);

    assert.equal(run(root, 'plan').status, 0);
    const missing = run(root, 'assets');
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /affected family is absent from the current catalog in assets mode/);

    const catalog = clone(CATALOG);
    catalog.families.push(addition);
    writeCatalog(root, catalog);
    const assets = run(root, 'assets');
    assert.equal(assets.status, 0, assets.stderr);

    const readded = run(root, 'plan');
    assert.equal(readded.status, 1);
    assert.match(readded.stderr, /same-change catalog addition must be absent from the current catalog in plan mode/);
  });

  it('rejects missing and mismatched catalog additions at their nearest root', () => {
    const missingRecord = closureRecord();
    missingRecord.affected[0].family = 'work-unit.example-authority';
    writeRecord(root, missingRecord);
    const missing = run(root, 'plan');
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /absent from the catalog and this record has no matching catalog addition/);
    assert.match(missing.stderr, /family: work-unit\.example-authority/);

    const mismatchRecord = closureRecord();
    const addition = {
      id: 'work-unit.example-authority',
      bounded_question: 'Which source authority conclusion is established for the example?',
    };
    mismatchRecord.affected[0].family = addition.id;
    mismatchRecord.catalog_additions = [addition];
    writeRecord(root, mismatchRecord);
    const catalog = clone(CATALOG);
    catalog.families.push({ ...addition, bounded_question: 'A different bounded question.' });
    writeCatalog(root, catalog);
    const mismatch = run(root, 'assets');
    assert.equal(mismatch.status, 1);
    assert.match(mismatch.stderr, /bounded_question does not match the current catalog/);
  });

  it('requires the catalog in both closure branches before any branch-specific exemption', () => {
    writeRecord(root, closureRecord({ status: 'not_applicable' }));
    rmSync(catalogPath(root));
    const missing = run(root, 'plan');
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /owner: semantic fact catalog/);
    assert.match(missing.stderr, /required YAML file is missing/);

    root = fixture();
    write(root, 'openspec/governance/semantic-fact-families.yaml', 'schema_version: wrong\nfamilies: []\n');
    const malformed = run(root, 'plan');
    assert.equal(malformed.status, 1);
    assert.match(malformed.stderr, /owner: semantic fact catalog/);
    assert.match(malformed.stderr, /semantic-fact-families\/v1/);
  });

  it('checks assets for missing, non-file, and symlink-escaping declared coordinates', () => {
    const resolver = join(root, 'DEEP_RESEARCH_HARNESS/engine/source-authority.mjs');
    rmSync(resolver);
    const missing = run(root, 'assets');
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /authority resolver is missing/);

    root = fixture();
    const nonFileResolver = join(root, 'DEEP_RESEARCH_HARNESS/engine/source-authority.mjs');
    rmSync(nonFileResolver);
    mkdirSync(nonFileResolver);
    const nonFile = run(root, 'assets');
    assert.equal(nonFile.status, 1);
    assert.match(nonFile.stderr, /authority resolver is not a regular file/);

    root = fixture();
    const outside = mkdtempSync(join(tmpdir(), 'semantic-closure-outside-'));
    outsideRoots.push(outside);
    const outsideFile = join(outside, 'escape.mjs');
    writeFileSync(outsideFile, '// outside\n');
    const escapedResolver = join(root, 'DEEP_RESEARCH_HARNESS/engine/source-authority.mjs');
    rmSync(escapedResolver);
    symlinkSync(outsideFile, escapedResolver);
    const escaped = run(root, 'assets');
    assert.equal(escaped.status, 1);
    assert.match(escaped.stderr, /authority resolver realpath escapes the repository root/);
  });

  it('reports record structure before a later missing catalog root', () => {
    const malformed = closureRecord();
    delete malformed.catalog_additions;
    writeRecord(root, malformed);
    rmSync(catalogPath(root));

    const result = run(root, 'plan');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /owner: semantic-closure record/);
    assert.match(result.stderr, /catalog_additions/);
    assert.doesNotMatch(result.stderr, /owner: semantic fact catalog/);
  });
});
