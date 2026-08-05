// @impl CPT-003, WNC-010, WNC-011
// Pure action-core extraction and bounded entry presentation.

import { renderContinuationBlock } from './continuation-cue.mjs';

const ACTION_CORE_HEADING = '## 0. Execution Brief';

export function extractExecutionBrief(markdown, { nodeRef = null } = {}) {
  if (typeof markdown !== 'string') {
    return {
      ok: false,
      reason_code: 'execution_brief_invalid_source',
      reason: `target node ${nodeRef || '(unknown)'} is not readable Markdown`,
    };
  }
  const lines = markdown.split('\n');
  const starts = lines.reduce((matches, line, index) => {
    if (line.trimEnd() === ACTION_CORE_HEADING) matches.push(index);
    return matches;
  }, []);
  if (starts.length === 0) {
    return {
      ok: false,
      reason_code: 'execution_brief_missing',
      reason: `target node ${nodeRef || '(unknown)'} has no ${ACTION_CORE_HEADING} section`,
    };
  }
  if (starts.length !== 1) {
    return {
      ok: false,
      reason_code: 'execution_brief_ambiguous',
      reason: `target node ${nodeRef || '(unknown)'} has multiple ${ACTION_CORE_HEADING} sections`,
    };
  }
  const start = starts[0];
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return { ok: true, action_core: lines.slice(start, end).join('\n').trimEnd() };
}

export function renderPhaseEntryPresentation({
  continuation,
  status_sync_command,
  action_core,
  load_plan,
  target_node,
} = {}) {
  const manifest = (Array.isArray(load_plan) ? load_plan : []).filter((fileRef) => fileRef !== target_node);
  const sections = [
    renderContinuationBlock(continuation),
    [
      '<!-- DPT_SOURCE_GATE_STATUS_SYNC_START -->',
      status_sync_command,
      '<!-- DPT_SOURCE_GATE_STATUS_SYNC_END -->',
    ].join('\n'),
    String(action_core || '').trimEnd(),
    [
      '<!-- DPT_SHARED_FILE_MANIFEST_START -->',
      ...manifest.map((fileRef) => `- ${fileRef}`),
      '<!-- DPT_SHARED_FILE_MANIFEST_END -->',
    ].join('\n'),
  ];
  return sections.filter(Boolean).join('\n\n');
}
