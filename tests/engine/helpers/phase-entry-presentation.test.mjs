// @impl CPT-003, WNC-010, WNC-011
// The presentation helper is intentionally pure: it cannot create an entry
// witness and is tested without a runtime bundle or workflow loader.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractExecutionBrief,
  renderPhaseEntryPresentation,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/phase-entry-presentation.mjs';

const target = [
  '---',
  'phase: wave1',
  'stop: no',
  '---',
  '',
  '# Phase: Wave1',
  '',
  '## 0. Execution Brief',
  '',
  '- **Objective**: Do the next bounded research work.',
  '- **Path to pass**: Run the Wave1 gate after the work.',
  '',
  '## 1. Stage Goal',
  '',
  'The rest of the loaded phase is reference material.',
].join('\n');

describe('phase entry presentation', () => {
  it('extracts exactly one target action core through the next H2 without loading a dependency closure', () => {
    const result = extractExecutionBrief(target, { nodeRef: 'phases/phase-wave1.md' });
    assert.equal(result.ok, true);
    assert.equal(result.action_core, [
      '## 0. Execution Brief',
      '',
      '- **Objective**: Do the next bounded research work.',
      '- **Path to pass**: Run the Wave1 gate after the work.',
    ].join('\n'));
  });

  it('fails closed for missing or ambiguous action-core configuration before an entry witness exists', () => {
    for (const markdown of [
      target.replace('## 0. Execution Brief\n\n', ''),
      `${target}\n\n## 0. Execution Brief\n\nDuplicate.\n`,
    ]) {
      const result = extractExecutionBrief(markdown, { nodeRef: 'phases/phase-wave1.md' });
      assert.equal(result.ok, false);
      assert.match(result.reason_code, /execution_brief_(?:missing|ambiguous)/);
    }
  });

  it('places cue, exact status synchronization, action core, and target-excluding manifest before any full closure', () => {
    const actionCore = extractExecutionBrief(target, { nodeRef: 'phases/phase-wave1.md' }).action_core;
    const output = renderPhaseEntryPresentation({
      continuation: {
        interaction: 'do_not_initiate',
        next_action: 'execute_loaded_node',
        node_ref: 'phases/phase-wave1.md',
      },
      status_sync_command: 'node DEEP_RESEARCH_HARNESS/cli/advance-status.mjs --bundle /tmp/bundle --to wave0_complete',
      action_core: actionCore,
      load_plan: ['shared/shared-profile.md', 'phases/phase-wave1.md'],
      target_node: 'phases/phase-wave1.md',
    });

    assert.match(output, /^<!-- DPT_CONTINUATION_CUE_START -->/);
    assert.ok(output.indexOf('--to wave0_complete') < output.indexOf('## 0. Execution Brief'));
    assert.ok(output.indexOf('## 0. Execution Brief') < output.indexOf('shared/shared-profile.md'));
    assert.doesNotMatch(output, /DPT_LOADED_FILE_START/);
    assert.doesNotMatch(output, /phases\/phase-wave1\.md\n<!-- DPT_SHARED_FILE_MANIFEST_END/);
  });
});
