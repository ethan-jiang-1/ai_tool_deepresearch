// @impl ARP-001, ARP-002, ARP-003

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(relativePath) {
  return readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf8');
}

describe('artifact persistence contract stays small and Agent-facing', () => {
  const helper = read('DPT_FRAMEWORK/engine/helpers/artifact-persistence.mjs');
  const cli = read('DPT_FRAMEWORK/cli/operate-artifact-persistence.mjs');
  const commands = read('DPT_FRAMEWORK/COMMANDS.md');
  const playbook = read('DPT_FRAMEWORK/command_playbook/persist-artifact.md');
  const subagent = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md');
  const antiCheating = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-anti-cheating-rules.md');

  it('exposes one workspace, two operations, supported roots, and excluded authority surfaces', () => {
    assert.match(helper, /ARTIFACT_PERSISTENCE_ROOT = '_diagnostics\/artifact-persistence'/);
    assert.match(helper, /ARTIFACT_PERSISTENCE_OPERATIONS = Object\.freeze\(\['persist', 'sweep'\]\)/);
    for (const root of ['reference', 'artifacts', 'final', '_cache']) assert.ok(helper.includes(`'${root}'`));
    for (const excluded of ['rb_status.json', 'rb_queue.json', 'rb_trace.jsonl', 'rb_output_declarations.jsonl', '_work_units']) {
      assert.ok(helper.includes(`'${excluded}'`), `missing excluded surface ${excluded}`);
    }
  });

  it('keeps the shortest crash recovery loop and staging retention visible', () => {
    for (const marker of ['retained staging', 'quiescent', 'retry persist', 'rerun sweep', 'There is no force overwrite']) {
      assert.ok(playbook.includes(marker), `playbook missing ${marker}`);
    }
    assert.match(commands, /two-operation mechanical durability command/);
    assert.match(antiCheating, /unknown-temp promotion/);
  });

  it('keeps persistence mechanical and submit authority unchanged', () => {
    assert.match(playbook, /does not create evidence provenance/);
    assert.match(playbook, /Persistence verdicts assign the next mechanical owner but do not create interaction authority/);
    assert.match(playbook, /do not message the user, wait for acknowledgement, or create a checkpoint/);
    assert.match(subagent, /operate-work-unit submit` remains the transaction owner/);
    assert.doesNotMatch(helper, /COMMANDS\.md|command_playbook|workflows\/nodes/);
    assert.doesNotMatch(cli, /rb_trace\.jsonl|log-event\.mjs|appendTrace/);
  });

  it('does not grow recovery controllers or destructive branches', () => {
    for (const source of [helper, cli]) {
      assert.doesNotMatch(source, /setTimeout|setInterval|watch\(|chokidar|pid|lease/i);
      assert.doesNotMatch(source, /quarantine|repair-all|discard|force overwrite/i);
      assert.doesNotMatch(source, /global journal|global index/i);
    }
  });
});
