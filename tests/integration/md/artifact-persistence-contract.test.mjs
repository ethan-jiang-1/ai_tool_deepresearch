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
  const context = read('CONTEXT.md');
  const changelog = read('CHANGELOG.md');
  const run = read('DEEP_RESEARCH_HARNESS/RUN.md');
  const subagent = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md');
  const antiCheating = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-anti-cheating-rules.md');

  it('exposes one workspace, three operations, supported roots, and excluded authority surfaces', () => {
    assert.match(helper, /ARTIFACT_PERSISTENCE_ROOT = '_diagnostics\/artifact-persistence'/);
    assert.match(helper, /ARTIFACT_PERSISTENCE_OPERATIONS = Object\.freeze\(\['persist', 'persist-final-report', 'sweep'\]\)/);
    for (const root of ['reference', 'artifacts', 'final', '_cache']) assert.ok(helper.includes(`'${root}'`));
    for (const excluded of ['rb_status.json', 'rb_queue.json', 'rb_trace.jsonl', 'rb_output_declarations.jsonl', '_work_units']) {
      assert.ok(helper.includes(`'${excluded}'`), `missing excluded surface ${excluded}`);
    }
  });

  it('keeps the shortest crash recovery loop and staging retention visible', () => {
    for (const marker of ['retained staging', 'quiescent', 'retry persist', 'rerun sweep', 'There is no force overwrite']) {
      assert.ok(playbook.includes(marker), `playbook missing ${marker}`);
    }
    assert.match(commands, /three-operation durability command/);
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

  it('gives Final Markdown one admitted Evidence Map command without changing terminal semantics', () => {
    for (const source of [phaseFinal, playbook]) {
      assert.match(source, /Evidence Map/);
      assert.match(source, /persist-final-report/);
      assert.match(source, /retained staging/);
    }
    assert.match(phaseFinal, /gate: null/);
    assert.doesNotMatch(phaseFinal, /`gate: none`/);
    assert.doesNotMatch(phaseFinal, /^next:/m);
    assert.match(phaseFinal, /不创建 Final Gate、Final trace event/);
    assert.match(phaseFinal, /MUST NOT 写 `final_delivery` trace event/);
    assert.match(phaseFinal, /没有 gate CLI/);
    assert.match(playbook, /Generic `persist` intentionally rejects safe Final Markdown targets/);
    assert.match(commands, /three-operation durability command/);
  });

  it('keeps Final-backing vocabulary and current release scopes bounded', () => {
    for (const term of ['Final key-finding declaration', 'Final Evidence Map', 'Final backing']) {
      assert.match(context, new RegExp(`\\*\\*${term}\\*\\*`));
    }
    assert.match(changelog, /## v0\.70/);
    assert.match(changelog, /structural path\/provenance feedback only/);
    assert.match(changelog, /## v0\.71/);
    assert.match(changelog, /no aliases,\n  automatic repair, Queue edit path, or Actor-behavior proof/);
    assert.match(run, /DEEP_RESEARCH_HARNESS v0\.71/);
    assert.match(run, /Current Release: v0\.71/);
    assert.match(run, /non-persisted Engine feedback projections only/);
    assert.match(run, /structural path\/provenance admission only/);
  });

  it('does not grow recovery controllers or destructive branches', () => {
    for (const source of [helper, cli]) {
      assert.doesNotMatch(source, /setTimeout|setInterval|watch\(|chokidar|pid|lease/i);
      assert.doesNotMatch(source, /quarantine|repair-all|discard|force overwrite/i);
      assert.doesNotMatch(source, /global journal|global index/i);
    }
  });
});
