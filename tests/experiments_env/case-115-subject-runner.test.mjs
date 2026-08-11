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
    tools: subjectId === '115' ? 'Bash,WebFetch' : 'Bash,Read,WebFetch,WebSearch,Write',
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
      adapter_contract: 'DEEP_RESEARCH_HARNESS/host_tools/research-access-adapter.md',
      host_owner: 'selected Claude CLI host runtime',
      launcher_entry: 'DEEP_RESEARCH_HARNESS/host_tools/claude-deepseek.mjs',
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

  it('limits case 115 to an isolated direct-sample probe prompt and tool surface', () => {
    const runner = readFileSync(RUNNER, 'utf8');

    assert.match(runner, /tools: 'Bash,WebFetch'/);
    assert.match(runner, /surface: 'isolated_hitl1_capability_probe'/);
    assert.match(runner, /loadIsolatedHitl1CapabilityProbeSurface/);
    assert.match(runner, /does not provide a bundle path or any filesystem obligation/);
    assert.match(runner, /DPT_ISOLATED_HITL1_CAPABILITY_PROBE_GUIDE_START/);
    assert.doesNotMatch(runner, /case 115\. Work only in the exact bundle path/);
    assert.doesNotMatch(runner, /case-115.*write a.*research_access.*Gate/is);
  });

  it('rejects broader case-115 tool authority before launch', () => {
    assert.throws(() => buildIterativeInteractionSubjectInvocation({
      subjectId: '115',
      launcherPath: '/tmp/claude-deepseek.mjs',
      settingsPath: '/tmp/subject-settings.json',
      tools: 'Bash,Read,WebFetch,WebSearch,Write',
      sessionId: 'test-session',
      systemPrompt: 'test prompt',
    }), /requires isolated probe tools/);
  });

  it('does not alter legacy non-selected Subject invocation policy', () => {
    const invocation = build('204');

    assert.ok(invocation.claude_args.includes('--dangerously-skip-permissions'));
    assert.equal(invocation.adapter_invocation, null);
  });
});
