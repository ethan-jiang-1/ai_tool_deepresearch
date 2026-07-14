import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const helper = read('DPT_FRAMEWORK/engine/helpers/canonical-topic-state.mjs');
const resolver = read('DPT_FRAMEWORK/engine/helpers/topic-layout.mjs');
const cli = read('DPT_FRAMEWORK/cli/operate-topic-state.mjs');
const commands = read('DPT_FRAMEWORK/COMMANDS.md');
const hitl1 = read('DPT_FRAMEWORK/workflows/nodes/phases/phase-hitl1.md');
const rerun = read('DPT_FRAMEWORK/workflows/nodes/phases/phase-rerun.md');
const seedGate = read('DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs');
const workUnitSchema = read('DPT_FRAMEWORK/schema/contracts/work-unit.mjs');

describe('canonical topic-state scope', () => {
  it('keeps one helper, one CLI, one workspace and three operations', () => {
    assert.match(helper, /_diagnostics\/topic-state/); assert.match(cli, /inspect.*apply.*recover/s);
    assert.match(commands, /inspect → drain blocker或complete-target apply → exact recover/);
    assert.match(resolver, /resolveStructuredTopicBinding/);
  });
  it('keeps Agent mechanical work and lifecycle authority explicit', () => {
    assert.match(hitl1, /普通 apply\/recover 命令由 Agent 执行/); assert.match(hitl1, /human-directed.*不创造 mutation permission/);
    assert.match(rerun, /route-bound HITL2 witness/); assert.match(rerun, /用户决定title\/order\/remove语义/);
    assert.match(rerun, /不得用direct multi-file edit或`human-directed`绕过/);
  });
  it('keeps historical paths immutable and workspace recovery primary', () => {
    assert.match(commands, /Historical artifact\/reference\/output paths remain in place/);
    assert.match(seedGate, /topicState\.mode !== 'canonical' \|\| topicState\.passed !== true/);
    assert.match(helper, /for \(const \[slug, bytes\].*stage\('rb_plan\.md'.*cleanup_files/s);
  });
  it('does not add prohibited control systems or duplicate topic authority', () => {
    const implementation = `${helper}\n${resolver}\n${cli}`;
    for (const term of ['progress DB', 'event store', 'watcher', 'daemon', 'retired_topic', 'tombstone', 'link_rewriter', 'artifact_mover', 'force_layout']) assert.doesNotMatch(implementation, new RegExp(term, 'i'));
    const resultSchema = workUnitSchema.slice(workUnitSchema.indexOf('export const WorkUnitResultSchema'), workUnitSchema.indexOf('export const WorkUnitLedgerRecordSchema'));
    const ledgerSchema = workUnitSchema.slice(workUnitSchema.indexOf('export const WorkUnitLedgerRecordSchema'));
    for (const schema of [resultSchema, ledgerSchema]) {
      assert.doesNotMatch(schema, /\btopic_uid\s*:/);
      assert.doesNotMatch(schema, /\btopic_slug\s*:/);
    }
  });
});
