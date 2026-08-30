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

function markdownSection(text, heading, path) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`## ${escaped}\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\n## |$)`));
  assert.ok(match, `${path} must keep ## ${heading}`);
  return match[1];
}

function pointerBlockForRoute(relativePath, text) {
  if (relativePath === 'AGENTS.md' || relativePath === 'CLAUDE.md') {
    return markdownSection(text, 'Deep Research Routing', relativePath);
  }
  if (
    relativePath === 'DEEP_RESEARCH_HARNESS/AGENTS.md'
    || relativePath === 'DEEP_RESEARCH_HARNESS/CLAUDE.md'
  ) {
    const brief = markdownSection(text, '0. Execution Brief', relativePath);
    const row = brief.match(/\| 研究 \/ 续跑 \/ 报告 \|[^|\n]+\|/);
    const pointerPara = brief.match(/入口选择的完整规则只有一处 canonical 表述：[^\n]+/);
    assert.ok(row && pointerPara, `${relativePath} must keep the research pointer`);
    return `${row[0]}\n${pointerPara[0]}`;
  }
  if (relativePath === 'DEEP_RESEARCH_HARNESS/README.md') {
    const trigger = markdownSection(text, '触发规则（最高优先）', relativePath);
    const match = trigger.match(/\*\*本 Harness 就是项目的 Deep Research Harness。\*\*[^\n]+/);
    assert.ok(match, `${relativePath} must keep the selection-pointer paragraph`);
    return match[0];
  }
  if (relativePath === 'DEEP_RESEARCH_HARNESS/RUN.md') {
    return markdownSection(text, '1. Entry Selection Is Already Done', relativePath);
  }
  assert.fail(`no pointer extractor for ${relativePath}`);
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
      const block = pointerBlockForRoute(relativePath, text);
      assert.match(block, /continue-run-bundle\.md/, `${relativePath} pointer must name the playbook`);
      assert.match(block, /Entry Selection \(canonical\)/, `${relativePath} pointer must name the canonical heading`);
      assert.match(block, /unsupported_current_entry_contract/, `${relativePath} pointer must name the stop`);
      assert.doesNotMatch(
        block,
        /same-root `BUNDLE_ENTRY\.md` \+ `BUNDLE_MAP\.md` preflight/i,
        `${relativePath} pointer must not restate pair preflight`,
      );
      assert.doesNotMatch(
        block,
        /preflight 失败[，,]?不等于「没有 explicit candidate」/,
        `${relativePath} pointer must not restate the fallback essay`,
      );
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
