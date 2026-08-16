// @impl ARP-001, ARP-002, ARP-003, ARP-004, CDP-006

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(relativePath) {
  return readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf8');
}

describe('artifact persistence contract stays small and Agent-facing', () => {
  const helper = read('DEEP_RESEARCH_HARNESS/engine/helpers/artifact-persistence.mjs');
  const cli = read('DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs');
  const commands = read('DEEP_RESEARCH_HARNESS/COMMANDS.md');
  const playbook = read('DEEP_RESEARCH_HARNESS/command_playbook/persist-artifact.md');
  const phaseFinal = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md');
  const subagent = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md');
  const antiCheating = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-anti-cheating-rules.md');

  it('exposes one workspace, four operations, supported roots, and excluded authority surfaces', () => {
    assert.match(helper, /ARTIFACT_PERSISTENCE_ROOT = '_diagnostics\/artifact-persistence'/);
    assert.match(helper, /ARTIFACT_PERSISTENCE_OPERATIONS = Object\.freeze\(\['persist', 'persist-final-report', 'publish-final-report', 'sweep'\]\)/);
    for (const root of ['reference', 'artifacts', 'final', '_cache']) assert.ok(helper.includes(`'${root}'`));
    for (const excluded of ['rb_status.json', 'rb_queue.json', 'rb_trace.jsonl', 'rb_output_declarations.jsonl', '_work_units']) {
      assert.ok(helper.includes(`'${excluded}'`), `missing excluded surface ${excluded}`);
    }
  });

  it('keeps the shortest crash recovery loop and staging retention visible', () => {
    for (const marker of ['retained staging', 'quiescent', 'retry persist', 'rerun sweep', 'There is no force overwrite']) {
      assert.ok(playbook.includes(marker), `playbook missing ${marker}`);
    }
    assert.match(commands, /publish-final-report --bundle --source \[--feature\]/);
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

  it('documents publisher-owned primary names, immutable appends, and retained recovery', () => {
    for (const source of [phaseFinal, playbook]) {
      assert.match(source, /Evidence Map/);
      assert.match(source, /publish-final-report/);
      assert.match(source, /retained staging/);
    }
    assert.match(playbook, /final\/final\.md/);
    assert.match(playbook, /next immutable global version/);
    assert.match(playbook, /callers must not supply a target, version, CAS, overwrite,\s*or force selector/);
    assert.match(playbook, /reserved `final\/final\*\.md` targets/);
    assert.match(playbook, /`sweep` preserves the exact\s+publication binding without reallocating/);
    assert.match(phaseFinal, /gate: null/);
    assert.doesNotMatch(phaseFinal, /`gate: none`/);
    assert.doesNotMatch(phaseFinal, /^next:/m);
    assert.match(phaseFinal, /MUST NOT overwrite, delete, rename, or renumber a committed primary/);
    assert.match(phaseFinal, /MUST NOT add a Final Gate, `next`, self-transition, satisfaction field/);
    assert.match(phaseFinal, /Final has `gate: null` and no outgoing Gate CLI/);
    assert.match(playbook, /Generic `persist`\s+intentionally rejects reserved `final\/final\*\.md` targets/);
    assert.match(commands, /commits no-clobber bytes without caller target\/version\/CAS\/overwrite input/);
  });

  it('does not grow recovery controllers or destructive branches', () => {
    for (const source of [helper, cli]) {
      assert.doesNotMatch(source, /setTimeout|setInterval|watch\(|chokidar|pid|lease/i);
      assert.doesNotMatch(source, /quarantine|repair-all|discard|force overwrite/i);
      assert.doesNotMatch(source, /global journal|global index/i);
    }
  });
});
