// @impl DEW-014
// Static guard for Engine-owned timed_out terminalization paths.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const REPO_ROOT = join(import.meta.dirname, '../..');

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), 'utf-8');
}

describe('work-unit timeout terminalization static guard', () => {
  it('public timeout-capable lifecycle path imports and gates on timeout preflight', () => {
    const lifecycle = read('DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs');
    assert.match(lifecycle, /timeoutPreflightWorkUnit/);
    assert.match(lifecycle, /status === 'timed_out'[\s\S]*timeoutPreflightWorkUnit/);
    assert.match(lifecycle, /status === 'timed_out' && !force && !timeoutPreflight\.timeout_eligible/);
    assert.match(lifecycle, /work_unit_forced_timeout/);
    assert.match(lifecycle, /progress_sources/);
  });

  it('CLI timeout routes through closeWorkUnitAttempt and exposes explicit force only on timeout', () => {
    const cli = read('DPT_FRAMEWORK/cli/operate-work-unit.mjs');
    assert.match(cli, /timeout-preflight/);
    assert.match(cli, /timeoutPreflightWorkUnit/);
    assert.match(cli, /closeWorkUnitAttempt/);
    assert.match(cli, /force: command === 'timeout' \? Boolean\(values\.force\) : false/);
    assert.doesNotMatch(cli, /status:\s*['"]timed_out['"][\s\S]*writeJson/);
  });

  it('work-unit core exports preflight beside the guarded lifecycle API', () => {
    const core = read('DPT_FRAMEWORK/engine/work-unit-core.mjs');
    assert.match(core, /closeWorkUnitAttempt/);
    assert.match(core, /timeoutPreflightWorkUnit/);
    assert.match(core, /from '\.\/work-unit-timeout-preflight\.mjs'/);
  });
});
