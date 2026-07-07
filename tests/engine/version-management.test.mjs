// Static coverage for framework version-history authority and RUN.md banner.
// @impl RUE-001, VEM-001, VEM-002, VEM-003, VEM-004

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), 'utf-8');
}

function latestChangelogEntry(text) {
  const match = /^## (v\d+\.\d+)\n/m.exec(text);
  assert.ok(match, 'CHANGELOG.md must contain at least one version entry');
  const rest = text.slice(match.index + match[0].length);
  const nextHeaderIndex = rest.search(/^## v\d+\.\d+/m);
  const body = (nextHeaderIndex === -1 ? rest : rest.slice(0, nextHeaderIndex)).trim();
  return { version: match[1], body };
}

describe('framework version management', () => {
  it('uses repo-root CHANGELOG.md as the latest version authority', () => {
    const changelog = read('CHANGELOG.md');
    const latest = latestChangelogEntry(changelog);

    assert.equal(latest.version, 'v0.6');
    assert.match(latest.body, /current_node/);
    assert.match(latest.body, /queue postconditions/);
    assert.match(latest.body, /topic slugs/);

    const nonemptyLines = latest.body.split(/\r?\n/).filter((line) => line.trim());
    assert.ok(nonemptyLines.length <= 2, 'latest changelog entry should stay concise');
  });

  it('keeps RUN.md banner aligned to the latest changelog entry', () => {
    const latest = latestChangelogEntry(read('CHANGELOG.md'));
    const run = read('DPT_FRAMEWORK/RUN.md');

    assert.match(run, /^# RUN\.md[^\n]*\n\n> \*\*DPT_FRAMEWORK v0\.6\*\*/);
    assert.ok(run.includes(`DPT_FRAMEWORK ${latest.version}`));
    assert.doesNotMatch(run, /v0\.5 work-unit path/);
  });

  it('does not retain a framework-local changelog authority', () => {
    assert.equal(existsSync(join(REPO_ROOT, 'DPT_FRAMEWORK/CHANGELOG.md')), false);
  });

  it('uses the proposal-declared version target for this change', () => {
    const proposal = read('openspec/changes/stabilize-runtime-position-and-queue/proposal.md');
    assert.match(proposal, /target framework version `v0\.6`/);
    assert.match(proposal, /proposal-declared `v0\.6`/);
  });

  it('guides future behavior changes to update root changelog and RUN banner', () => {
    const config = read('openspec/config.yaml');
    assert.match(config, /更新 `CHANGELOG\.md`/);
    assert.match(config, /同步 `DPT_FRAMEWORK\/RUN\.md` 版本横幅/);
    assert.doesNotMatch(config, /DPT_FRAMEWORK\/CHANGELOG\.md/);
  });
});
