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
  it('has at least one version entry in CHANGELOG.md', () => {
    const changelog = read('CHANGELOG.md');
    const latest = latestChangelogEntry(changelog);

    assert.ok(latest.version.match(/^v\d+\.\d+$/), `unexpected version format: ${latest.version}`);
    assert.ok(latest.body.trim().length > 0, 'latest changelog entry body must not be empty');
  });

  it('keeps RUN.md banner aligned to the latest changelog entry', () => {
    const latest = latestChangelogEntry(read('CHANGELOG.md'));
    const run = read('DPT_FRAMEWORK/RUN.md');

    assert.ok(run.includes(`DPT_FRAMEWORK ${latest.version}`),
      `RUN.md banner should include "DPT_FRAMEWORK ${latest.version}"`);
    assert.doesNotMatch(run, /v0\.5 work-unit path/);
  });

  it('does not retain a framework-local changelog authority', () => {
    assert.equal(existsSync(join(REPO_ROOT, 'DPT_FRAMEWORK/CHANGELOG.md')), false);
  });

  it('guides future behavior changes to update root changelog and RUN banner', () => {
    const config = read('openspec/config.yaml');
    assert.match(config, /更新 `CHANGELOG\.md`/);
    assert.match(config, /同步 `DPT_FRAMEWORK\/RUN\.md` 版本横幅/);
    assert.doesNotMatch(config, /DPT_FRAMEWORK\/CHANGELOG\.md/);
  });
});
