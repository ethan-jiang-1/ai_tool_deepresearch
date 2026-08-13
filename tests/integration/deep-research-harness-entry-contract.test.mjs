// @impl ACR-001, ACR-002, ACS-005, BUM-005, CMI-009, EXS-004, RUE-006, WDC-004
// Static and CLI-bound contract for Harness identity, bundle entry succession,
// and explicitly supplied current-run-bundle roots.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  after,
  describe,
  it,
} from 'node:test';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const HARNESS_ROOT = join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS');
const INSTANTIATE = join(HARNESS_ROOT, 'cli', 'instantiate-run-bundle.mjs');
const INSPECT = join(HARNESS_ROOT, 'cli', 'inspect-bundle.mjs');
const roots = new Set();

function alternateSourceRootEntries() {
  const canonicalRoot = realpathSync(HARNESS_ROOT);
  return readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter((entry) => entry.name !== 'DEEP_RESEARCH_HARNESS')
    .flatMap((entry) => {
      try {
        return realpathSync(join(REPO_ROOT, entry.name)) === canonicalRoot
          ? [entry.name]
          : [];
      } catch {
        return [];
      }
    });
}

function run(script, args) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 20000,
  });
}

function trackRoot(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.add(root);
  return root;
}

function uniqueName(label) {
  return `harness-entry-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

describe('Deep Research Harness entry contract', () => {
  after(() => {
    for (const root of roots) rmSync(root, { recursive: true, force: true });
  });

  it('keeps one physical Harness source tree and canonical static entry routes', () => {
    assert.equal(existsSync(HARNESS_ROOT), true, 'canonical Harness root must exist');
    assert.deepEqual(
      alternateSourceRootEntries(),
      [],
      'repository root must not expose another entry resolving to the Harness assets',
    );

    const adr = readFileSync(join(REPO_ROOT, 'docs', 'adr', '0002-name-the-reusable-surface-deep-research-harness.md'), 'utf8');
    assert.match(adr, /`DEEP_RESEARCH_HARNESS\/` as the physical source\s+root/);
    assert.match(adr, /\*\*run bundle\*\* remains/);

    const entryTemplate = readFileSync(join(HARNESS_ROOT, 'rb_templates', 'BUNDLE_ENTRY.md.tmpl'), 'utf8');
    assert.match(entryTemplate, /^# \{\{name\}\}$/m);
    assert.match(entryTemplate, /Deep Research Harness: `\{\{framework_root_relpath\}\}`/);
    assert.match(entryTemplate, /BUNDLE_MAP\.md/);
    assert.match(entryTemplate, /COMMANDS\.md/);
    assert.doesNotMatch(entryTemplate, /current_node|current_gate|node .*cli|gate authority/i);

    const routeFiles = [
      'AGENTS.md',
      'CLAUDE.md',
      'DEEP_RESEARCH_HARNESS/AGENTS.md',
      'DEEP_RESEARCH_HARNESS/CLAUDE.md',
      'DEEP_RESEARCH_HARNESS/README.md',
      'DEEP_RESEARCH_HARNESS/RUN.md',
    ];
    for (const relativePath of routeFiles) {
      const text = readFileSync(join(REPO_ROOT, relativePath), 'utf8');
      assert.match(text, /BUNDLE_ENTRY\.md/, `${relativePath} must name the current entry card`);
      assert.match(text, /BUNDLE_MAP\.md/, `${relativePath} must name the current map`);
      assert.match(text, /unsupported_current_entry_contract/, `${relativePath} must name incomplete-candidate rejection`);
      assert.match(text, /current run bundle root/i, `${relativePath} must name the explicit runtime coordinate`);
    }

    const continuation = readFileSync(join(HARNESS_ROOT, 'command_playbook', 'continue-run-bundle.md'), 'utf8');
    assert.match(continuation, /Verify the same root contains both `BUNDLE_ENTRY\.md` and `BUNDLE_MAP\.md`/);
    assert.match(continuation, /unsupported_current_entry_contract/);
    assert.doesNotMatch(continuation, /otherwise read legacy|legacy `RUN_BUNDLE\.md`|deprecated fallback/);
    assert.match(continuation, /Do not select a bundle by scanning, a bare filename, chat memory, chronology/i);
    assert.match(continuation, /report the selected Harness context as unavailable/i);
    assert.match(continuation, /stop\s+before executing any bundle-provided command/i);
    assert.match(continuation, /Do not rewrite the bundle/i);
    assert.match(continuation, /scan\s+for another bundle/i);
    assert.match(continuation, /create an alternate source path/i);
    assert.match(continuation, /infer a replacement\s+coordinate/i);
  });

  it('renders a new entry card and rejects incomplete current pairs', () => {
    const root = trackRoot('deep-research-harness-entry-');
    const target = join(root, 'bundles');
    const name = uniqueName('entry');
    const result = run(INSTANTIATE, [name, '--target-dir', target]);
    const bundle = join(target, `dpt_rb_${name}`);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), realpathSync(bundle));
    assert.equal(existsSync(join(bundle, 'BUNDLE_ENTRY.md')), true);
    assert.equal(existsSync(join(bundle, 'RUN_BUNDLE.md')), false);

    const entry = readFileSync(join(bundle, 'BUNDLE_ENTRY.md'), 'utf8');
    assert.match(entry, new RegExp(`^# ${name}$`, 'm'));
    assert.match(entry, /Deep Research Harness:/);
    assert.match(entry, /BUNDLE_MAP\.md/);
    assert.match(entry, /COMMANDS\.md/);
    assert.doesNotMatch(entry, /\{\{[^}]+\}\}/);

    const freshInspection = run(INSPECT, [bundle]);
    assert.equal(freshInspection.status, 0, freshInspection.stdout);
    assert.doesNotMatch(freshInspection.stdout, /RUN_BUNDLE\.md not found/);

    writeFileSync(join(bundle, 'RUN_BUNDLE.md'), '# Legacy entry\n');
    const bothInspection = run(INSPECT, [bundle]);
    assert.equal(bothInspection.status, 0, bothInspection.stdout);
    assert.doesNotMatch(bothInspection.stdout, /compatibility|deprecated/i);

    unlinkSync(join(bundle, 'BUNDLE_ENTRY.md'));
    const legacyInspection = run(INSPECT, [bundle]);
    assert.equal(legacyInspection.status, 1, legacyInspection.stdout);
    assert.match(legacyInspection.stdout, /unsupported_current_entry_contract/);
    assert.match(legacyInspection.stdout, /BUNDLE_ENTRY\.md/);

    unlinkSync(join(bundle, 'RUN_BUNDLE.md'));
    const mapOnlyInspection = run(INSPECT, [bundle]);
    assert.equal(mapOnlyInspection.status, 1, mapOnlyInspection.stdout);
    assert.match(mapOnlyInspection.stdout, /unsupported_current_entry_contract/);
    assert.match(mapOnlyInspection.stdout, /BUNDLE_ENTRY\.md/);
  });
});
