// @impl REA-001, REA-003
// Pure Subject argv construction; it never starts an Agent runtime.

import { buildSelectedResearchAccessAdapterInvocation } from '../../DPT_FRAMEWORK/host_tools/lib/research-access-adapter.mjs';

export function buildIterativeInteractionSubjectInvocation({
  subjectId,
  launcherPath,
  settingsPath,
  tools,
  sessionId,
  systemPrompt,
}) {
  const claudeArgs = [
    '--settings', settingsPath,
    '--setting-sources', '',
    '--bare',
    '--disable-slash-commands',
    '--no-chrome',
    '--tools', tools,
    '--model', 'opus',
    '--effort', 'low',
    '--session-id', sessionId,
    '--no-session-persistence',
  ];

  if (subjectId !== '115') claudeArgs.push('--dangerously-skip-permissions');

  claudeArgs.push(
    '--prompt-suggestions', 'false',
    '--system-prompt', systemPrompt,
    '-p',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--verbose',
  );

  if (subjectId === '115') return buildSelectedResearchAccessAdapterInvocation({ launcherPath, claudeArgs });
  return { claude_args: claudeArgs, adapter_invocation: null };
}
