// @impl REA-001, REA-003
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { buildIterativeInteractionSubjectInvocation } from '../../experiments_env/shared/iterative-interaction-subject-launch.mjs';

const RUNNER = 'experiments_env/shared/run-iterative-interaction-subject.mjs';

function build(subjectId) {
  return buildIterativeInteractionSubjectInvocation({
    subjectId,
    launcherPath: '/tmp/claude-deepseek.mjs',
    settingsPath: '/tmp/subject-settings.json',
    tools: 'Bash,Read,WebFetch,WebSearch,Write',
    sessionId: 'test-session',
    systemPrompt: 'test prompt',
  });
}

describe('case-115 Subject runner invocation', () => {
  it('uses the selected generic launcher argv without a permission bypass', () => {
    const invocation = build('115');

    assert.ok(!invocation.claude_args.some((argument) => argument.includes('skip-permissions') || argument.includes('bypassPermissions')));
    assert.deepEqual(invocation.adapter_invocation, {
      adapter_id: 'claude-deepseek-websearch-webfetch/v1',
      adapter_contract: 'DPT_FRAMEWORK/host_tools/research-access-adapter.md',
      host_owner: 'selected Claude CLI host runtime',
      launcher_entry: 'DPT_FRAMEWORK/host_tools/claude-deepseek.mjs',
      launcher_routing: 'deepseek_anthropic_compatible',
      permission_mode: 'generic_non_bypass',
      caller_supplied_permission_bypass: false,
    });
  });

  it('keeps the runtime runner bound to the pure selected-invocation builder', () => {
    const runner = readFileSync(RUNNER, 'utf8');

    assert.match(runner, /buildIterativeInteractionSubjectInvocation/);
    assert.match(runner, /adapter_invocation/);
    assert.match(runner, /codex-only-dpt-iterative-subject-deepseek-v2\.settings\.json/);
    assert.match(runner, /ENABLE_TOOL_SEARCH: 'true'/);
    assert.match(runner, /settings\?\.env\?\.ENABLE_TOOL_SEARCH !== 'true'/);
  });

  it('does not alter legacy non-selected Subject invocation policy', () => {
    const invocation = build('204');

    assert.ok(invocation.claude_args.includes('--dangerously-skip-permissions'));
    assert.equal(invocation.adapter_invocation, null);
  });
});
