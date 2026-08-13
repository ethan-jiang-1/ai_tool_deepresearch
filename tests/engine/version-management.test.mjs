// Static coverage for non-authoritative history and the absence of version choreography.
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

describe('framework version management', () => {
  it('keeps root CHANGELOG.md as non-authoritative human history', () => {
    const changelog = read('CHANGELOG.md');

    assert.match(changelog, /^# Changelog$/m);
    assert.match(changelog, /retained human change history/i);
    assert.match(changelog, /not a current Harness version/i);
    assert.match(changelog, /runtime compatibility[\s>]+selector/i);
    assert.match(changelog, /execution Source of Record/i);
  });

  it('does not project changelog history into RUN.md', () => {
    const run = read('DEEP_RESEARCH_HARNESS/RUN.md');

    assert.doesNotMatch(run, /^> \*\*DEEP_RESEARCH_HARNESS v\d+\.\d+\*\*$/m);
    assert.match(run, /^# RUN\.md — DEEP_RESEARCH_HARNESS 入口\n\n## 0\. 禁用内置捷径（最高优先）/);
  });

  it('does not retain a framework-local changelog authority', () => {
    assert.equal(existsSync(join(REPO_ROOT, 'DEEP_RESEARCH_HARNESS/CHANGELOG.md')), false);
  });

  it('does not force future behavior changes into version choreography', () => {
    const config = read('openspec/config.yaml');
    assert.doesNotMatch(config, /version bump/);
    assert.doesNotMatch(config, /target version/);
    assert.doesNotMatch(config, /同步 `DEEP_RESEARCH_HARNESS\/RUN\.md` 版本横幅/);
    assert.doesNotMatch(config, /DEEP_RESEARCH_HARNESS\/CHANGELOG\.md/);
  });
});
