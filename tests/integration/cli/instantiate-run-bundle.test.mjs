// @impl CMI-004, CMI-008: instantiate-run-bundle.mjs integration test
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { parse as parseYaml } from 'yaml';

const REPO_ROOT = process.cwd();
const INSTANTIATE = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/instantiate-run-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdBundleDirs = new Set();

describe('instantiate-run-bundle.mjs integration', () => {
  after(() => {
    for (const dir of createdBundleDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates a fresh production bundle', () => {
    const name = uniqueName('fresh');
    const dir = trackBundle(name);

    const result = runInstantiate(name);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), dir);
    for (const entry of [
      'BUNDLE_MAP.md',
      'rb_plan.md',
      'rb_profile.yaml',
      'rb_status.json',
      'rb_queue.json',
      'rb_trace.jsonl',
      'seed_topics',
      'reference',
      'reference/_INDEX.md',
      'reference/README.md',
      'artifacts/README.md',
      'artifacts/wave0',
      'artifacts/wave1',
      'artifacts/wave2',
      '_cache',
      '_cache/README.md',
      '_logs/README.md',
      'final',
      '_work_units',
    ]) {
      assert.equal(existsSync(join(dir, entry)), true, `missing ${entry}`);
    }
    assert.equal(existsSync(join(dir, 'START_FROM_HERE.md')), false, 'fresh bundles must not generate START_FROM_HERE.md');
    const bundleMap = readFileSync(join(dir, 'BUNDLE_MAP.md'), 'utf-8');
    assert.ok(bundleMap.includes('passive bundle map'), 'BUNDLE_MAP.md should identify itself as passive');
    assert.ok(bundleMap.includes('Research Content Map'), 'BUNDLE_MAP.md should include Research Content Map');
    assert.ok(bundleMap.includes('Runtime Control Map'), 'BUNDLE_MAP.md should include Runtime Control Map');
    assert.ok(bundleMap.includes('Diagnostics Map'), 'BUNDLE_MAP.md should include Diagnostics Map');
    assert.ok(bundleMap.includes('Reentry Pointers'), 'BUNDLE_MAP.md should include Reentry Pointers');
    assert.match(result.stderr, /BUNDLE_MAP/);
    assert.doesNotMatch(result.stderr, /START_FROM_HERE/);
    // Verify README content is non-empty
    const cacheReadme = readFileSync(join(dir, '_cache/README.md'), 'utf-8');
    assert.ok(cacheReadme.includes('_cache/') && cacheReadme.includes('{wave}/{batch}/{scope}/{source_dir}'),
      '_cache/README.md should explain the four-level directory structure');
    assert.ok(cacheReadme.includes('websearch.json') && cacheReadme.includes('page.md') && cacheReadme.includes('meta.json'),
      '_cache/README.md should document the three-file-per-source convention');
    const logsReadme = readFileSync(join(dir, '_logs/README.md'), 'utf-8');
    assert.ok(logsReadme.includes('run.log') && logsReadme.includes('rb_trace.jsonl'),
      '_logs/README.md should explain the log and trace file inventory');
    const status = JSON.parse(readFileSync(join(dir, 'rb_status.json'), 'utf-8'));
    assert.equal(status.current_node, null);
    const profile = parseYaml(readFileSync(join(dir, 'rb_profile.yaml'), 'utf-8'));
    assert.deepEqual(profile.research_access, { status: 'unprobed' });
  });

  it('fails on name collision without overwriting existing content', () => {
    const name = uniqueName('collision');
    const dir = trackBundle(name);
    mkdirSync(dir, { recursive: true });
    const marker = join(dir, 'marker.txt');
    writeFileSync(marker, 'keep me');

    const result = runInstantiate(name);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /already exists/);
    assert.equal(readFileSync(marker, 'utf-8'), 'keep me');
    assert.equal(existsSync(join(dir, 'rb_status.json')), false);
  });

  it('rejects --force and does not overwrite existing content', () => {
    const name = uniqueName('force');
    const dir = trackBundle(name);
    mkdirSync(dir, { recursive: true });
    const marker = join(dir, 'marker.txt');
    writeFileSync(marker, 'keep me');

    const result = runInstantiate(name, '--force');

    assert.equal(result.status, 1);
    assert.match(result.stderr, /overwrite is not allowed/);
    assert.equal(readFileSync(marker, 'utf-8'), 'keep me');
    assert.equal(existsSync(join(dir, 'rb_status.json')), false);
  });

  it('stamps framework_version in rb_plan.md frontmatter (CMI-007)', () => {
    const name = uniqueName('fwver');
    const dir = trackBundle(name);
    const result = runInstantiate(name);
    assert.equal(result.status, 0, result.stderr);
    const fm = parseFrontmatter(readFileSync(join(dir, 'rb_plan.md'), 'utf-8'));
    assert.equal(typeof fm.framework_version, 'string');
    assert.ok(fm.framework_version.length > 0, 'framework_version must be non-empty');
    const changelog = readFileSync(join(REPO_ROOT, 'CHANGELOG.md'), 'utf-8');
    const match = changelog.match(/^##\s+(v?\d+\.\d+(?:\.\d+)?)\s*$/m);
    assert.ok(match, 'CHANGELOG must have a version heading');
    assert.equal(fm.framework_version, match[1]);
  });

  it('returns standalone help before argv validation without creating a target', () => {
    const root = mkdtempSync(join(tmpdir(), 'instantiate-help-'));
    const target = join(root, 'must-not-exist');
    try {
      const result = runRaw('--help', '--unknown', `--target-dir=${target}`);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stderr, /Usage:/);
      assert.equal(existsSync(target), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects malformed production argv before creating a supplied target', () => {
    const root = mkdtempSync(join(tmpdir(), 'instantiate-invalid-'));
    const cases = [
      ['delimiter-help', ['--', '--help']],
      ['unsafe-name', ['bad_name']],
      ['path-name', ['../escape']],
      ['unknown-option', ['valid-name', '--unknown']],
      ['repeated-target', ['valid-name', '--target-dir', 'one', '--target-dir=two']],
      ['missing-target-value', ['valid-name', '--target-dir']],
      ['extra-positional', ['valid-name', 'extra']],
      ['force', ['valid-name', '--force']],
    ];
    try {
      for (const [label, args] of cases) {
        const target = join(root, label);
        const result = runRaw(...args, `--target-dir=${target}`);
        assert.notEqual(result.status, 0, `${label}: ${result.stdout}\n${result.stderr}`);
        assert.equal(existsSync(target), false, `${label} created its target`);
      }
      assert.deepEqual(readdirSync(root), []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('creates a production bundle through literal argument-vector validation', () => {
    const root = mkdtempSync(join(tmpdir(), 'instantiate-literal-'));
    const target = join(root, 'target with " quote');
    const name = uniqueName('literal');
    try {
      const result = runRaw(name, `--target-dir=${target}`);
      const bundle = join(target, `dpt_rb_${name}`);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout.trim(), bundle);
      assert.equal(existsSync(join(bundle, 'rb_status.json')), true);
      assert.doesNotMatch(result.stderr, /validate-bundle failed|inspect-bundle failed/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('renders continuation navigation for a non-sibling target directory (BUM-005, CMI-009)', () => {
    const root = mkdtempSync(join(tmpdir(), 'instantiate-continuation-'));
    const target = join(root, 'external-runs');
    const name = uniqueName('continuation');
    try {
      const result = runRaw(name, `--target-dir=${target}`);
      const bundle = join(target, `dpt_rb_${name}`);
      const map = readFileSync(join(bundle, 'BUNDLE_MAP.md'), 'utf-8');
      const frameworkRelative = relative(bundle, join(REPO_ROOT, 'DPT_FRAMEWORK')) || '.';
      const repoRelative = relative(bundle, REPO_ROOT) || '.';

      assert.equal(result.status, 0, result.stderr);
      assert.match(map, /## Continue This Bundle/);
      assert.match(map, /continue-run-bundle\.md/);
      assert.ok(map.includes(`framework_root: \`${frameworkRelative}\``));
      assert.ok(map.includes(`repo_command_root: \`${repoRelative}\``));
      assert.match(map, /not.*runtime authority|不.*运行时权威/i);
      assert.doesNotMatch(map, /\{\{[^}]+\}\}/);
      assert.equal(existsSync(join(bundle, 'AGENTS.md')), false);
      assert.equal(existsSync(join(bundle, 'CLAUDE.md')), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function runInstantiate(...args) {
  return spawnSync('node', [INSTANTIATE, ...args, '--target-dir', BUNDLES_DIR], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 10000,
  });
}

function runRaw(...args) {
  return spawnSync('node', [INSTANTIATE, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 10000,
  });
}

function uniqueName(label) {
  return `test-inst-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function trackBundle(name) {
  const dir = join(BUNDLES_DIR, `dpt_rb_${name}`);
  createdBundleDirs.add(dir);
  rmSync(dir, { recursive: true, force: true }); // clean any leftover from previous aborted run
  return dir;
}

function parseFrontmatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---/);
  return parseYaml(match[1]);
}
