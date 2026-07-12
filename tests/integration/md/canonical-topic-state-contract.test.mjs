import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const helper = read('DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs');
const cli = read('DPT_FRAMEWORK/cli/operate-topic-state.mjs');
const commands = read('DPT_FRAMEWORK/COMMANDS.md');
const hitl1 = read('DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md');
const rerun = read('DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md');

describe('canonical topic-state scope', () => {
  it('keeps one helper, one CLI, one workspace and three operations', () => {
    assert.match(helper, /_diagnostics\/topic-state/); assert.match(cli, /inspect.*apply.*recover/s);
    assert.match(commands, /inspect → exact recover 或 retained apply/);
  });
  it('keeps Agent mechanical work and lifecycle authority explicit', () => {
    assert.match(hitl1, /普通 apply\/recover 命令由 Agent 执行/); assert.match(hitl1, /human-directed.*不创造 mutation permission/);
    assert.match(rerun, /route-bound HITL2 witness/); assert.match(rerun, /C3B missing boundary/);
  });
  it('does not add prohibited control systems', () => {
    for (const term of ['progress DB', 'event store', 'watcher', 'daemon', 'generic transaction']) assert.doesNotMatch(helper, new RegExp(term, 'i'));
  });
});
