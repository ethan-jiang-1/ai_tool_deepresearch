// run-bundle-archive-zone-contract.test.mjs
// Deterministic markdown contract for the dpt_archive/ run-bundle archive zone.
// Five guidance surfaces must describe the archive zone consistently:
//   1. DEEP_RESEARCH_HARNESS/README.md "目录性质" — live zone vs archive zone,
//      move-without-rename, revival = move back to repo root, archive ≠ dpt_disp_* disposable.
//   2. instantiate-run-bundle.md — new bundles are created in the repo-root live zone only.
//   3. start-research.md — same placement policy wording as (2).
//   4. continue-run-bundle.md — revival path note near Entry Selection (canonical),
//      with the canonical rule text itself untouched.
//   5. Root AGENTS.md Do-Not-Read — names dpt_archive/ explicitly while keeping
//      the "anywhere in the repository" wording.
// No delta spec exists for this change (skip_specs): this test owns the
// cross-surface consistency claim only; it does not restate entry-selection
// semantics or add authority.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const ROOT = process.cwd();
const read = (relativePath) => readFileSync(`${ROOT}/${relativePath}`, 'utf8');

const readme = read('DEEP_RESEARCH_HARNESS/README.md');
const instantiate = read('DEEP_RESEARCH_HARNESS/command_playbook/instantiate-run-bundle.md');
const start = read('DEEP_RESEARCH_HARNESS/command_playbook/start-research.md');
const continuation = read('DEEP_RESEARCH_HARNESS/command_playbook/continue-run-bundle.md');
const agents = read('AGENTS.md');

describe('run-bundle archive zone guidance contract', () => {
  it('README 目录性质 states live zone vs archive zone, move-without-rename, revival, and archive ≠ disposable', () => {
    const sectionStart = readme.indexOf('## 目录性质');
    assert.ok(sectionStart >= 0, 'README must keep the 目录性质 section');
    const sectionEnd = readme.indexOf('## ', sectionStart + 1);
    const section = readme.slice(sectionStart, sectionEnd === -1 ? readme.length : sectionEnd);
    assert.match(section, /dpt_archive\//);
    assert.match(section, /活区/);
    assert.match(section, /basename 不改名/);
    assert.match(section, /平移回 repo 根活区/);
    assert.match(section, /dpt_disp_\*/);
    assert.match(section, /不修、直接重建/);
    assert.match(section, /runtime truth root/);
  });

  it('instantiate-run-bundle.md places new bundles in the repo-root live zone', () => {
    assert.match(instantiate, /新 bundle 一律创建在 repo 根活区/);
    assert.match(instantiate, /`dpt_archive\/` = 归档区/);
    assert.match(instantiate, /不参与 sibling 预检视野/);
    // The existing sibling-preflight description must remain untouched.
    assert.match(instantiate, /创建前 sibling 预检/);
    assert.match(instantiate, /--acknowledge-existing-bundle <sibling-name>/);
  });

  it('start-research.md carries the same placement policy wording', () => {
    assert.match(start, /新 bundle 一律创建在 repo 根活区/);
    assert.match(start, /`dpt_archive\/` = 归档区/);
    assert.match(start, /不参与 sibling 预检视野/);
  });

  it('continue-run-bundle.md adds a revival-path note without rewriting the canonical rule', () => {
    // Canonical statement must remain the single one and keep its key clauses.
    assert.equal(
      continuation.match(/Entry Selection \(canonical\)/g)?.length,
      1,
      'Entry Selection (canonical) heading must remain unique',
    );
    assert.match(
      continuation,
      /This section is the single canonical statement of the complete entry-selection/,
    );
    assert.match(continuation, /`unsupported_current_entry_contract`/);
    assert.match(continuation, /stop without reading it as an operational entry/);
    // Revival path note exists near the canonical section and adds no new stop.
    const canonicalStart = continuation.indexOf('## Entry Selection (canonical)');
    const preconditions = continuation.indexOf('## Preconditions');
    const canonical = continuation.slice(canonicalStart, preconditions);
    assert.match(canonical, /dpt_archive\//);
    assert.match(canonical, /平移回 repo 根活区/);
    assert.match(canonical, /basename 不改名/);
    assert.equal(
      (canonical.match(/unsupported_current_entry_contract/g) ?? []).length,
      1,
      'the revival note must not redefine or duplicate the stop name',
    );
  });

  it('root AGENTS.md Do-Not-Read names dpt_archive/ while keeping the repository-wide wording', () => {
    const line = agents
      .split('\n')
      .find((l) => l.includes('dpt_archive/'));
    assert.ok(line, 'AGENTS.md must explicitly name dpt_archive/');
    assert.match(line, /Do-Not-Read|dpt_rb_\*\/|dpt_disp_\*\//);
    assert.match(line, /anywhere in the repository/);
    assert.match(line, /dpt_archive\/.*archive zone/);
  });

  it('negative: no guidance surface treats archived bundles as disposable or rewrites entry selection', () => {
    for (const [name, text] of Object.entries({ readme, instantiate, start, continuation })) {
      const archiveMentions = text.match(/dpt_archive\/[^\s。；）]*/g) ?? [];
      assert.ok(archiveMentions.length > 0, `${name} must mention dpt_archive/`);
    }
    // The archive-zone description must never claim direct continuation from
    // the archive location (revival always moves the bundle back first).
    assert.doesNotMatch(continuation, /dpt_archive\/[^）]*原地续跑/);
    assert.doesNotMatch(readme, /dpt_archive\/[^。]*disposable experiment bundle（不修、直接重建）[^。]*是同一概念/);
  });
});
