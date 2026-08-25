// @impl ACR-002, ACR-004
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const CHECKER = join(REPO_ROOT, 'openspec/governance/check-entry-chain.mjs');

function makeEntryDir(base) {
  mkdirSync(join(base, 'DEEP_RESEARCH_HARNESS'), { recursive: true });
  for (const dir of ['', 'DEEP_RESEARCH_HARNESS']) {
    const d = join(base, dir);
    writeFileSync(join(d, 'AGENTS.md'), '# AGENTS.md\n\nshared rules\n');
    symlinkSync('AGENTS.md', join(d, 'CLAUDE.md'));
  }
}

function runChecker(projectRoot) {
  const result = spawnSync(process.execPath, [CHECKER, projectRoot], { encoding: 'utf8' });
  return { status: result.status, stderr: result.stderr ?? '', stdout: result.stdout ?? '' };
}

describe('check-entry-chain contract', () => {
  let base;
  before(() => {
    base = mkdtempSync(join(tmpdir(), 'check-entry-chain-'));
    makeEntryDir(base);
  });
  after(() => {
    if (base && existsSync(base)) rmSync(base, { recursive: true, force: true });
  });

  it('passes when each CLAUDE.md is a symlink to the co-located AGENTS.md', () => {
    const result = runChecker(base);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /clean/);
  });

  it('fails (negative control) when a CLAUDE.md becomes a regular-file copy', () => {
    const claude = join(base, 'CLAUDE.md');
    unlinkSync(claude);
    writeFileSync(claude, '# CLAUDE.md\n\nshared rules\n'); // regular-file copy, not a symlink
    const result = runChecker(base);
    assert.notEqual(result.status, 0, 'checker should fail on a regular-file copy');
    assert.match(result.stderr, /CLAUDE\.md is not a symlink/);
    // restore the symlink shape (negative-control revert)
    unlinkSync(claude);
    symlinkSync('AGENTS.md', claude);
  });
});
