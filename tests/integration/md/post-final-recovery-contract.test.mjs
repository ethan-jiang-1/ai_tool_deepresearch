import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) { return readFileSync(path, 'utf8'); }

describe('post-final recovery Agent-facing contract', () => {
  const commands = read('DEEP_RESEARCH_HARNESS/COMMANDS.md');
  const playbook = read('DEEP_RESEARCH_HARNESS/command_playbook/post-final-recovery.md');
  const finalPhase = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md');
  const rerunPhase = read('DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-rerun.md');
  const transitions = JSON.parse(read('DEEP_RESEARCH_HARNESS/workflows/transitions.chain.json'));

  it('keeps Final terminal, retains presentation refinement there, and exposes one audited evidence-expansion chain', () => {
    assert.equal(Object.hasOwn(transitions, 'phases/phase-final.md'), false);
    for (const marker of [
      'operate-post-final-recovery.mjs inspect',
      'operate-post-final-recovery.mjs apply',
      'operate-post-final-recovery.mjs recover',
      'enter-phase.mjs --bundle <bundle> --node phases/phase-rerun.md',
      'advance-status.mjs --bundle <bundle> --to hitl2_recorded',
      'check-reentry.mjs --bundle <bundle> --at hitl2_recorded',
      'operate-topic-state.mjs inspect',
    ]) assert.match(playbook, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(finalPhase, /remains the current node[\s>]+while a delivered report is discussed and refined/);
    assert.match(finalPhase, /clear presentation request: publish one immutable next version/);
    assert.match(finalPhase, /new evidence\/research: accepted C5 request and existing rerun path/);
    assert.match(playbook, /evidence-expanding\s+user\s+decision/);
    assert.doesNotMatch(finalPhase, /Final node 自身不处理修改、不重问同一决定/);
    assert.match(rerunPhase, /post_final_reentry.*不代表post-Final HITL2 gate曾运行/);
  });

  it('states the helper-oriented permission and threat boundary', () => {
    const corpus = `${commands}\n${playbook}\n${finalPhase}\n${rerunPhase}`;
    assert.match(corpus, /request metadata.*not verified identity|request metadata.*不是verified identity/i);
    assert.match(corpus, /host-required non-delegable approval|host policy/);
    assert.match(corpus, /Agent owns every remaining legal mechanical step|全部回到Agent执行/);
    assert.doesNotMatch(corpus, /request metadata (is|becomes) (a )?(permission|verified identity)/i);
    assert.doesNotMatch(corpus, /final\/addendum|_cache\/addendum/);
  });

  it('does not publish force-style permission flags or a human co-runner flow', () => {
    const commandLines = playbook.split('\n').filter((line) => line.trim().startsWith('node DEEP_RESEARCH_HARNESS/'));
    assert.doesNotMatch(commandLines.join('\n'), /--human-directed|--override|--force/);
    assert.doesNotMatch(playbook, /ask the user to run|用户运行.*命令/i);
    assert.match(commands, /不是verified identity、permission token、`--human-directed`、`--override` 或 `--force`/);
  });
});
