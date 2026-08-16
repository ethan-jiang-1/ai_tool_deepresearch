// Static coverage for the root CHANGELOG version-bump CLI (VEM-001).
// @impl VEM-001

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const TOOL = join(REPO_ROOT, 'openspec/governance/bump-version.mjs');

const CHANGELOG_HEADER = '# Changelog\n\n';

function runTool(args, cwd) {
  return execFileSync(process.execPath, [TOOL, ...args], {
    cwd,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

describe('bump-version CLI (VEM-001)', () => {
  let dir;
  let fixturePath;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'bump-version-'));
    fixturePath = join(dir, 'CHANGELOG.md');
  });
  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function writeFixture(content) {
    writeFileSync(fixturePath, content);
  }
  function readFixture() {
    return readFileSync(fixturePath, 'utf-8');
  }
  // Every CLI invocation targets the temp fixture, never the real root CHANGELOG.
  function tool(args) {
    return runTool([...args, '--changelog', fixturePath], dir);
  }
  function reject(args) {
    let stderr = '';
    let code = 0;
    try {
      tool(args);
    } catch (error) {
      code = error.status;
      stderr = String(error.stderr);
    }
    assert.notEqual(code, 0, `expected non-zero exit for ${args.join(' ')}`);
    return stderr;
  }

  it('requires an explicit segment flag (no flag -> non-zero, no write)', () => {
    writeFixture(`${CHANGELOG_HEADER}## 0.2.0\n\n- entry\n`);
    const stderr = reject([]);
    assert.match(stderr, /--build|--minor|--major/);
    assert.equal(readFixture(), `${CHANGELOG_HEADER}## 0.2.0\n\n- entry\n`);
  });

  it('rejects a combined flag combination (non-zero, no write)', () => {
    writeFixture(`${CHANGELOG_HEADER}## 0.2.0\n\n- entry\n`);
    const stderr = reject(['--minor', '--major']);
    assert.match(stderr, /Conflicting bump flags/);
    assert.equal(readFixture(), `${CHANGELOG_HEADER}## 0.2.0\n\n- entry\n`);
  });

  it('rejects an unknown flag', () => {
    writeFixture(`${CHANGELOG_HEADER}## 0.2.0\n\n- entry\n`);
    const stderr = reject(['--bogus']);
    assert.ok(stderr.length > 0);
    assert.equal(readFixture(), `${CHANGELOG_HEADER}## 0.2.0\n\n- entry\n`);
  });

  it('rejects a changelog with no valid MAJOR.MINOR.BUILD heading', () => {
    writeFixture(`${CHANGELOG_HEADER}## Unreleased\n\n- entry\n`);
    const stderr = reject(['--build']);
    assert.match(stderr, /No valid MAJOR\.MINOR\.BUILD/);
    assert.equal(readFixture(), `${CHANGELOG_HEADER}## Unreleased\n\n- entry\n`);
  });

  it('--build bumps 0.2.0 -> 0.2.1 and preserves existing entries', () => {
    writeFixture(`${CHANGELOG_HEADER}## 0.2.0\n\n- 版本体系重置\n`);
    const out = tool(['--build']);
    assert.match(out, /0\.2\.0 -> 0\.2\.1/);
    const updated = readFixture();
    assert.match(updated, /## 0\.2\.1/);
    assert.match(updated, /## 0\.2\.0/);
    assert.match(updated, /- 版本体系重置/);
    // New heading is inserted after the title, before the previous latest entry.
    assert.ok(updated.indexOf('## 0.2.1') < updated.indexOf('## 0.2.0'));
  });

  it('--minor bumps 0.2.9 -> 0.3.0 (build reset to 0)', () => {
    writeFixture(`${CHANGELOG_HEADER}## 0.2.9\n\n- entry\n`);
    const out = tool(['--minor']);
    assert.match(out, /0\.2\.9 -> 0\.3\.0/);
    assert.match(readFixture(), /## 0\.3\.0/);
  });

  it('--major bumps 0.2.0 -> 1.0.0 (minor and build reset to 0)', () => {
    writeFixture(`${CHANGELOG_HEADER}## 0.2.0\n\n- entry\n`);
    const out = tool(['--major']);
    assert.match(out, /0\.2\.0 -> 1\.0\.0/);
    assert.match(readFixture(), /## 1\.0\.0/);
  });

  it('--dry-run reports the target without writing', () => {
    writeFixture(`${CHANGELOG_HEADER}## 0.2.0\n\n- entry\n`);
    const out = tool(['--dry-run', '--build']);
    assert.match(out, /0\.2\.0 -> 0\.2\.1/);
    assert.equal(readFixture(), `${CHANGELOG_HEADER}## 0.2.0\n\n- entry\n`);
  });

  it('--help exits 0', () => {
    const out = runTool(['--help'], dir);
    assert.match(out, /Usage:/);
  });
});
