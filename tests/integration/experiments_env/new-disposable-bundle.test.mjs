// @impl EXS-002, EXS-003: new-disposable-bundle.mjs integration test
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const CREATOR = join(REPO_ROOT, 'experiments_env', 'shared', 'new-disposable-bundle.mjs');
const copiedNodeSource = 'experiments_env/prototype-gate-loop/nodes-gate-loop';
const roots = new Set();

describe('new-disposable-bundle.mjs integration', () => {
  after(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  });

  it('returns standalone help before argv validation without creating a target', () => {
    const root = trackRoot('disposable-help-');
    const target = join(root, 'must-not-exist');
    const result = runCreator('--help', '--unknown', `--target-dir=${target}`);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /Usage:/);
    assert.equal(existsSync(target), false);
  });

  it('rejects malformed disposable argv before creating a supplied target', () => {
    const root = trackRoot('disposable-invalid-');
    const cases = [
      ['delimiter-help', ['--', '--help']],
      ['unsafe-name', ['bad name']],
      ['path-name', ['../escape']],
      ['noncanonical-case', ['valid_name', '--case', 'case-label']],
      ['unknown-option', ['valid_name', '--unknown']],
      ['repeated-case', ['valid_name', '--case', 'case-1', '--case=case-2']],
      ['missing-nodes-value', ['valid_name', '--nodes']],
      ['extra-positional', ['valid_name', 'extra']],
    ];

    for (const [label, args] of cases) {
      const target = join(root, label);
      const result = runCreator(...args, `--target-dir=${target}`);
      assert.notEqual(result.status, 0, `${label}: ${result.stdout}\n${result.stderr}`);
      assert.equal(existsSync(target), false, `${label} created its target`);
    }
    assert.deepEqual(readdirSync(root), []);
  });

  it('preserves case, nodes copy, and literal target-path validation behavior', () => {
    const root = trackRoot('disposable-literal-');
    const target = join(root, 'target with " quote');
    const result = runCreator(
      'literal_name', '--case=case-123', '--nodes', copiedNodeSource, `--target-dir=${target}`,
    );

    assert.equal(result.status, 0, result.stderr);
    const bundle = result.stdout.trim();
    assert.equal(dirname(bundle), target);
    assert.match(bundle, /dpt_disp_case-123_literal_name_[0-9a-f]$/);
    assert.ok(readdirSync(join(bundle, 'exp', 'nodes')).length > 0, 'node source should be copied');
    assert.match(result.stderr, /validate-bundle passed/);
    assert.doesNotMatch(result.stderr, /validate-bundle failed/);
  });

  it('uses --force to replace the selected random hex collision path', () => {
    const root = trackRoot('disposable-force-');
    const name = 'force-proof';
    const caseId = 'case-777';
    for (const hex of '0123456789abcdef') {
      const collision = join(root, `dpt_disp_${caseId}_${name}_${hex}`);
      mkdirSync(collision, { recursive: true });
      writeFileSync(join(collision, 'marker.txt'), hex);
    }

    const result = runCreator(name, '--case', caseId, '--force', `--target-dir=${root}`);
    assert.equal(result.status, 0, result.stderr);
    const bundle = result.stdout.trim();
    assert.equal(dirname(bundle), root);
    assert.equal(existsSync(join(bundle, 'marker.txt')), false, 'selected collision must be replaced');
    assert.equal(existsSync(join(bundle, 'rb_status.json')), true);
  });

  it('renders RUN_BUNDLE.md entry point for a non-sibling target directory (BUM-005, EXS-004)', () => {
    const root = trackRoot('disposable-continuation-');
    const target = join(root, 'external-runs');
    const result = runCreator('continuation_card', '--case=case-804', `--target-dir=${target}`);

    assert.equal(result.status, 0, result.stderr);
    const bundle = result.stdout.trim();
    const frameworkRelative = relative(bundle, join(REPO_ROOT, 'DPT_FRAMEWORK')) || '.';
    const repoRelative = relative(bundle, REPO_ROOT) || '.';

    // RUN_BUNDLE.md exists and has no unreplaced placeholders
    const runBundle = readFileSync(join(bundle, 'RUN_BUNDLE.md'), 'utf-8');
    assert.match(runBundle, /^# /);
    assert.match(runBundle, /BUNDLE_MAP\.md/);
    assert.match(runBundle, /COMMANDS\.md/);
    assert.doesNotMatch(runBundle, /\{\{[^}]+\}\}/);

    // BUNDLE_MAP.md is a pure passive map — no continuation section
    const map = readFileSync(join(bundle, 'BUNDLE_MAP.md'), 'utf-8');
    assert.doesNotMatch(map, /## Continue This Bundle/);
    assert.ok(map.includes(`framework_root: \`${frameworkRelative}\``));
    assert.ok(map.includes(`repo_command_root: \`${repoRelative}\``));
    assert.doesNotMatch(map, /\{\{[^}]+\}\}/);
    assert.equal(existsSync(join(bundle, 'AGENTS.md')), false);
    assert.equal(existsSync(join(bundle, 'CLAUDE.md')), false);
  });
});

function runCreator(...args) {
  return spawnSync(process.execPath, [CREATOR, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 10000,
  });
}

function trackRoot(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.add(root);
  return root;
}
