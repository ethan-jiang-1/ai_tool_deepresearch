// check-all.test.mjs
// Locks RET-007: the aggregated read-only governance health entry.
// @impl RET-007

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, lstatSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');
const GOVERNANCE = join(REPO_ROOT, 'openspec', 'governance');

function run(args) {
  return spawnSync(process.execPath, [join(GOVERNANCE, 'check-all.mjs'), ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 120000,
  });
}

describe('check-all aggregation entry (RET-007)', () => {
  it('aggregates every current check-*.mjs except itself', () => {
    const scripts = readdirSync(GOVERNANCE)
      .filter((n) => n.startsWith('check-') && n.endsWith('.mjs') && n !== 'check-all.mjs')
      .sort();
    const result = run([]);
    assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stdout}\n${result.stderr}`);
    for (const script of scripts) {
      assert.ok(
        result.stdout.includes(script),
        `missing result line for ${script}`,
      );
    }
    assert.ok(!result.stdout.includes('check-all.mjs'), 'aggregation entry must not run itself');
  });

  it('forwards --change to the change-requiring checks', () => {
    const result = run(['--change', 'cleanup-engine-surface-and-disambiguate-repair-kinds']);
    assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${result.stdout}`);
    assert.ok(!result.stdout.includes('SKIPPED(requires --change)'), 'change-requiring checks were skipped despite --change');
  });

  it('is strictly read-only: no archive transition side effects', () => {
    const before = snapshot(join(REPO_ROOT, 'openspec', 'changes'));
    const result = run([]);
    const after = snapshot(join(REPO_ROOT, 'openspec', 'changes'));
    assert.equal(result.status, 0);
    assert.deepEqual(before, after, 'openspec/changes tree changed during check-all run');
  });
});

function snapshot(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let s;
    try {
      s = lstatSync(p);
    } catch {
      out.push(p.replace(REPO_ROOT + '/', ''));
      continue;
    }
    if (s.isDirectory() && !s.isSymbolicLink()) snapshot(p, out);
    else out.push(p.replace(REPO_ROOT + '/', ''));
  }
  return out.sort();
}
