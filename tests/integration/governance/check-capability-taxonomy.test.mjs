// @impl RET-003, RET-006
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(ROOT, 'tests', '.test-tmp');
const CHECK = join(ROOT, 'openspec/governance/check-capability-taxonomy.mjs');

function write(root, path, content) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function catalogRow({
  path = 'agent/demo-capability',
  related = 'none',
  agentOwnership = 'Select candidates and record rationale.',
  engineOwnership = 'Validate declared structural facts.',
} = {}) {
  return `| ${path} | Demo navigation purpose. | demo | Demo boundary. | ${related} | ${agentOwnership} | ${engineOwnership} |`;
}

function seed(root, options = {}) {
  const mainPath = options.mainPath ?? 'agent/demo-capability';
  const deltaPath = options.deltaPath ?? 'governance/demo-governance';
  write(root, `openspec/specs/${mainPath}/spec.md`, '# Demo\n');
  write(root, `openspec/changes/demo-change/specs/${deltaPath}/spec.md`, '# Demo delta\n');
  if (options.catalog !== false) {
    write(root, 'openspec/specs/README.md', [
      '# Capability Catalog',
      '',
      'Main specs remain the behavior authority.',
      '',
      '| Capability path | Purpose | Keywords | Boundaries / neighbors | Related entries | Agent/Markdown owns | Engine/Node owns |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      options.row ?? catalogRow({ path: mainPath }),
      '',
    ].join('\n'));
  }
}

function run(root) {
  return spawnSync(process.execPath, [CHECK, root], { encoding: 'utf8' });
}

function withFixture(callback) {
  const root = mkdtempSync(join(TMP, 'taxonomy-'));
  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('capability taxonomy governance check', () => {
  it('accepts a complete nested catalog', () => withFixture((root) => {
    seed(root);
    const result = run(root);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }));

  it('accepts complete catalog inventory split across domain tables', () => withFixture((root) => {
    seed(root);
    write(root, 'openspec/specs/engine/second-capability/spec.md', '# Second demo\n');
    write(root, 'openspec/specs/README.md', [
      '# Capability Catalog',
      '',
      '## Agent',
      '',
      '| Capability path | Purpose | Keywords | Boundaries / neighbors | Related entries | Agent/Markdown owns | Engine/Node owns |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      catalogRow({ path: 'agent/demo-capability', related: 'capability:engine/second-capability' }),
      '',
      '## Engine',
      '',
      '| Capability path | Purpose | Keywords | Boundaries / neighbors | Related entries | Agent/Markdown owns | Engine/Node owns |',
      '| --- | --- | --- | --- | --- | --- | --- |',
      catalogRow({ path: 'engine/second-capability', related: 'capability:agent/demo-capability' }),
      '',
    ].join('\n'));
    const result = run(root);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }));

  it('rejects a flat main-spec path', () => withFixture((root) => {
    seed(root, { mainPath: 'demo-capability', row: catalogRow() });
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /main spec path demo-capability must be exactly domain\/capability/);
  }));

  it('rejects an over-deep active delta path', () => withFixture((root) => {
    seed(root, { deltaPath: 'governance/nested/demo-governance' });
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /active delta path demo-change\/ governance\/nested\/demo-governance must be exactly domain\/capability/);
  }));

  it('rejects an unapproved domain', () => withFixture((root) => {
    seed(root, { mainPath: 'other/demo-capability', row: catalogRow({ path: 'other/demo-capability' }) });
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /uses unapproved domain other/);
  }));

  it('rejects a missing catalog', () => withFixture((root) => {
    seed(root, { catalog: false });
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /catalog is missing/);
  }));

  it('rejects catalog inventory drift', () => withFixture((root) => {
    seed(root, { row: catalogRow({ path: 'engine/not-a-main-spec' }) });
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /catalog is missing a row for main spec agent\/demo-capability/);
    assert.match(result.stderr, /catalog has a row for missing main spec engine\/not-a-main-spec/);
  }));

  it('rejects an unresolved project-local relation', () => withFixture((root) => {
    seed(root, { row: catalogRow({ related: 'execution-surface:missing/local.md' }) });
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /unresolved execution-surface missing\/local.md/);
  }));

  it('rejects a missing control-boundary field', () => withFixture((root) => {
    seed(root, { row: catalogRow({ agentOwnership: '' }) });
    const result = run(root);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /must declare both Agent\/Markdown and Engine\/Node ownership/);
  }));
});
