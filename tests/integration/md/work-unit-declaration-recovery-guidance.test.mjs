import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function read(relativePath) {
  return readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf-8');
}

describe('work-unit declaration recovery guidance', () => {
  const commands = read('DEEP_RESEARCH_HARNESS/COMMANDS.md');
  const protocol = read('DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md');
  const forensics = read('DEEP_RESEARCH_HARNESS/command_playbook/provenance-forensics-guide.md');

  it('documents one existing-owner command without a result argument', () => {
    for (const text of [commands, protocol, forensics]) {
      assert.match(text, /operate-work-unit\.mjs recover-declaration[^\n]+--work-id/);
      assert.match(text, /does not accept `--result`|accepts no `--result`|不接收`--result`/);
    }
  });

  it('keeps reconstruction facts non-authoritative and forbids manual ledger repair', () => {
    assert.match(protocol, /does not .*make reconstructable index\/result files count directly/i);
    assert.match(protocol, /Never hand-write `rb_output_declarations\.jsonl`/);
    assert.match(forensics, /Do not count filesystem presence/);
    assert.match(forensics, /does not .*turn reconstruction facts into coverage/i);
  });
});
