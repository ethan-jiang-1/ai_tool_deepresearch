import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CONTINUATION_CUE_END,
  CONTINUATION_CUE_START,
  continuationForClaimedWork,
  continuationForGateResult,
  continuationForLoadedNode,
  renderContinuationBlock,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/continuation-cue.mjs';

const STOP_NO = { stop: 'no', gate: 'wave1-complete' };
const STOP_YES = { stop: 'yes', gate: 'hitl2-recorded' };
const FINAL = { stop: 'no', gate: null };

function assertMinimalCue(cue, expected) {
  assert.deepEqual(cue, expected);
  assert.equal(Object.prototype.hasOwnProperty.call(cue, 'schema_version'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(cue, 'confidence'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(cue, 'retry_tree'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(cue, 'context_estimate'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(cue, 'route_choice'), false);
}

describe('continuation cue projection', () => {
  it('projects stop:no gate pass with non-null next to consume_check_next', () => {
    assertMinimalCue(
      continuationForGateResult({
        frontmatter: STOP_NO,
        passed: true,
        next: 'phases/phase-wave2.md',
        nodeRef: 'phases/phase-wave1.md',
        gate: 'wave1-complete',
      }),
      {
        interaction: 'do_not_initiate',
        next_action: 'consume_check_next',
        node_ref: 'phases/phase-wave1.md',
        gate: 'wave1-complete',
      },
    );
  });

  it('projects stop:no gate failure to repair_and_rerun_gate without reading rule verdicts', () => {
    assertMinimalCue(
      continuationForGateResult({
        frontmatter: STOP_NO,
        passed: false,
        next: null,
        nodeRef: 'phases/phase-wave1.md',
        gate: 'wave1-complete',
        failed_rule_ids: ['not-a-helper-input'],
      }),
      {
        interaction: 'do_not_initiate',
        next_action: 'repair_and_rerun_gate',
        node_ref: 'phases/phase-wave1.md',
        gate: 'wave1-complete',
      },
    );
  });

  it('does not project stop:yes gate failure as autonomous continuation', () => {
    assert.equal(
      continuationForGateResult({
        frontmatter: STOP_YES,
        passed: false,
        next: null,
        nodeRef: 'phases/phase-hitl2.md',
        gate: 'hitl2-recorded',
      }),
      null,
    );
  });

  it('does not project pass without a next node', () => {
    assert.equal(
      continuationForGateResult({
        frontmatter: STOP_NO,
        passed: true,
        next: null,
        nodeRef: 'phases/phase-wave1.md',
        gate: 'wave1-complete',
      }),
      null,
    );
  });

  it('projects loaded stop:no, stop:yes, and terminal final nodes', () => {
    assertMinimalCue(
      continuationForLoadedNode({
        frontmatter: STOP_NO,
        nodeRef: 'phases/phase-wave1.md',
      }),
      {
        interaction: 'do_not_initiate',
        next_action: 'execute_loaded_node',
        node_ref: 'phases/phase-wave1.md',
      },
    );

    assertMinimalCue(
      continuationForLoadedNode({
        frontmatter: STOP_YES,
        nodeRef: 'phases/phase-hitl2.md',
      }),
      {
        interaction: 'required',
        next_action: 'wait_for_user_in_loaded_node',
        node_ref: 'phases/phase-hitl2.md',
      },
    );

    assertMinimalCue(
      continuationForLoadedNode({
        frontmatter: FINAL,
        nodeRef: 'phases/phase-final.md',
      }),
      {
        interaction: 'terminal_delivery',
        next_action: 'deliver_final_artifacts',
        node_ref: 'phases/phase-final.md',
      },
    );
  });

  it('projects claimed work ids exactly and omits empty claims', () => {
    const workIds = ['wu-w0-b000-src-i0001', 'wu-w0-b000-src-i0002'];
    assertMinimalCue(
      continuationForClaimedWork({ claimedWorkIds: workIds }),
      {
        next_action: 'inspect_and_poll_claimed_work',
        work_ids: workIds,
      },
    );

    assert.equal(continuationForClaimedWork({ claimedWorkIds: [] }), null);
  });

  it('renders stable final Markdown marker block', () => {
    const block = renderContinuationBlock({
      interaction: 'do_not_initiate',
      next_action: 'execute_loaded_node',
      node_ref: 'phases/phase-wave1.md',
    });

    assert.equal(block, [
      CONTINUATION_CUE_START,
      'interaction: do_not_initiate',
      'next_action: execute_loaded_node',
      'node_ref: phases/phase-wave1.md',
      CONTINUATION_CUE_END,
    ].join('\n'));
  });
});
