// @impl RWE-001, RWP-001, EXO-003, EXO-004

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const CASE = 'experiments_playbook/exp_wfn_wave0/case-211-heavy-wave0-happy-path.md';

function readCase() {
  return readFileSync(CASE, 'utf8');
}

function assertBefore(text, earlier, later) {
  const earlierIndex = text.indexOf(earlier);
  const laterIndex = text.indexOf(later);
  assert.notEqual(earlierIndex, -1, `missing expected text: ${earlier}`);
  assert.notEqual(laterIndex, -1, `missing expected text: ${later}`);
  assert.ok(earlierIndex < laterIndex, `expected '${earlier}' before '${later}'`);
}

describe('case-211 Wave0 fixture contract', () => {
  it('uses a legal fixture-bound predecessor instead of synthetic Wave0 handoff evidence', () => {
    const playbook = readCase();

    assert.match(playbook, /schema: command-experiment\/v2/);
    assert.match(playbook, /case: case-211-heavy-wave0-happy-path/);
    assert.match(playbook, /proof_subject: agent_behavior/);
    assert.match(playbook, /fixture: setup_only/);
    assert.match(playbook, /syntheticWave0Trace: false/);
    assert.match(playbook, /current_gate: 'setup_ready'/);
    assert.match(playbook, /--gate setup-ready/);
    assert.match(playbook, /enter-phase\.mjs --bundle "\$B" --node "\$NEXT"/);
    assert.match(playbook, /advance-status\.mjs --bundle "\$B" --to setup_ready/);
    assert.match(playbook, /--gate seed-topics-ready/);
    assert.match(playbook, /advance-status\.mjs --bundle "\$B" --to seed_topics_ready/);
    assert.match(playbook, /does not prove HITL1 or Seed Agent behavior/);
    assert.doesNotMatch(playbook, /writeWave0Handoff/);
    assert.doesNotMatch(playbook, /appendTrace\([^\n]*wave0_completion/);

    assertBefore(playbook, '--gate setup-ready', '--gate seed-topics-ready');
    assertBefore(playbook, '--gate seed-topics-ready', 'advance-status.mjs --bundle "$B" --to seed_topics_ready');
    assertBefore(playbook, 'advance-status.mjs --bundle "$B" --to seed_topics_ready', 'operate-work-unit.mjs claim "$B" --phase wave0');
  });

  it('assigns the conditional shared reference and source/cache trail to the real actor', () => {
    const playbook = readCase();

    assert.match(playbook, /reference\/00-shared-agentic-coding-tools\.md/);
    assert.match(playbook, /artifacts\/wave0\/agentic-coding-tools\/source\.yaml/);
    assert.match(playbook, /task_brief:/);
    assert.match(playbook, /real HTTP\(S\) source_url/);
    assert.match(playbook, /Declare cache_trails\[\]/);
    assert.match(playbook, /No Phase-authored reference, source YAML, cache trail, receipt, or ledger row/);
    assert.match(playbook, /reference_output/);
    assert.match(playbook, /source_output/);
  });

  it('keeps submit, projection, inspect, completion, and monitored Gate in the legal order', () => {
    const playbook = readCase();

    assert.match(playbook, /operate-work-unit\.mjs dry-submit "\$B" --work-id "\$WORK_ID" --result "\$REAL_RESULT"/);
    assert.match(playbook, /operate-work-unit\.mjs submit "\$B" --work-id "\$WORK_ID" --result "\$REAL_RESULT"/);
    assert.match(playbook, /operate-work-unit\.mjs inspect "\$B" --eligible-rows --phase wave0/);
    assert.match(playbook, /case-211-wave0-pre-projection-inspect\.json/);
    assert.match(playbook, /operate-topic-state\.mjs schema --context wave_projection/);
    assert.match(playbook, /operate-topic-state\.mjs apply --bundle "\$B" --input "\$B\/case-211-wave0-projection\.json"/);
    assert.match(playbook, /inspect-wave0-output\.mjs --bundle "\$B"/);
    assert.match(playbook, /log-event\.mjs --bundle "\$B" --event wave0_completion/);
    assert.match(playbook, /run-gate-with-monitor\.mjs --bundle "\$B" --gate wave0-complete/);
    assert.match(playbook, /case-211-wave0-gate-monitor\.path/);
    assert.match(playbook, /monitor\.parsed_json/);
    assert.match(playbook, /const subjectBound = Boolean\(/);
    assert.doesNotMatch(playbook, /^node DPT_FRAMEWORK\/cli\/gates\/check-gate-wave0-complete\.mjs/m);

    assertBefore(playbook, 'operate-work-unit.mjs dry-submit "$B"', 'operate-work-unit.mjs submit "$B"');
    assertBefore(playbook, 'operate-work-unit.mjs submit "$B"', 'operate-work-unit.mjs inspect "$B" --eligible-rows --phase wave0');
    assertBefore(playbook, 'operate-work-unit.mjs inspect "$B" --eligible-rows --phase wave0', 'case-211-wave0-pre-projection-inspect.json');
    assertBefore(playbook, 'case-211-wave0-pre-projection-inspect.json', 'operate-topic-state.mjs schema --context wave_projection');
    assertBefore(playbook, 'operate-topic-state.mjs schema --context wave_projection', 'operate-topic-state.mjs apply --bundle "$B"');
    assertBefore(playbook, 'operate-topic-state.mjs apply --bundle "$B"', 'node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --bundle "$B" > "$B/case-211-wave0-inspect.json"');
    assertBefore(playbook, 'node DPT_FRAMEWORK/cli/inspect-wave0-output.mjs --bundle "$B" > "$B/case-211-wave0-inspect.json"', 'log-event.mjs --bundle "$B" --event wave0_completion');
    assertBefore(playbook, 'log-event.mjs --bundle "$B" --event wave0_completion', 'run-gate-with-monitor.mjs --bundle "$B" --gate wave0-complete');
  });
});
