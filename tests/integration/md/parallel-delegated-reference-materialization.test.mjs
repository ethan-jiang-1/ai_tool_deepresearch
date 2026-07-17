// @impl SNC-008, RWP-018

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const REPO_ROOT = join(import.meta.dirname, '../../..');

function read(relPath) {
  return readFileSync(join(REPO_ROOT, relPath), 'utf-8');
}

function around(text, pattern) {
  const index = text.search(pattern);
  if (index === -1) return '';
  return text.slice(Math.max(0, index - 240), Math.min(text.length, index + 520));
}

describe('parallel delegated phase execution guidance', () => {
  it('shared protocol teaches bounded top-up batch claiming and drain-before-gate order', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md');
    assert.match(text, /bounded top-up/i);
    assert.match(text, /--count <claim-count>/);
    assert.match(text, /accepted\/default cap/i);
    assert.match(text, /remaining free delegated in-flight capacity/i);
    assert.match(text, /reconstruct/i);
    assert.match(text, /claim batch[\s\S]*spawn[\s\S]*poll[\s\S]*submit[\s\S]*repair[\s\S]*terminalize[\s\S]*materialize[\s\S]*gate/i);
    assert.doesNotMatch(around(text, /Delegated Drain Loop|Phase-Agent Loop/i), /--count 1\b/);
  });

  it('silent execution treats notifications as hints and requires active poll-submit-repair-terminalize', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-silent-execution.md');
    assert.match(text, /active poll-submit-repair-terminalize loop/i);
    assert.match(text, /notifications? are hints only/i);
    assert.match(text, /operate-work-unit(?:\.mjs)? inspect/i);
    assert.match(text, /result[\s\S]*receipt[\s\S]*output[\s\S]*cache/i);
    assert.match(text, /reconstruct[\s\S]*in-flight[\s\S]*bundle truth/i);
    assert.match(text, /without waiting for.*user/i);
  });

  it('Wave0 and Wave1 phase docs claim independent work in bounded top-up batches', () => {
    for (const relPath of [
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md',
    ]) {
      const text = read(relPath);
      assert.match(text, /bounded top-up/i, relPath);
      assert.match(text, /--count <claim-count>/, relPath);
      assert.match(text, /accepted\/default cap/i, relPath);
      assert.match(text, /remaining free delegated in-flight capacity/i, relPath);
      assert.match(text, /reconstruct/i, relPath);
      assert.match(text, /poll[\s\S]*submit[\s\S]*terminalize/i, relPath);
      assert.doesNotMatch(around(text, /Delegated Drain Loop/i), /--count 1\b/, relPath);
    }
  });

  it('Wave phases route terminal timeout through timeout-preflight advice', () => {
    for (const relPath of [
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md',
    ]) {
      const text = read(relPath);
      assert.match(text, /timeout-preflight/i, relPath);
      assert.match(text, /structured stdout/i, relPath);
      assert.match(text, /non-zero/i, relPath);
      for (const branch of ['submit', 'repair', 'wait', 'inspect', 'block', 'timeout']) {
        assert.match(text, new RegExp(`\\b${branch}\\b`, 'i'), `${relPath} missing ${branch}`);
      }
      assert.match(text, /timeout --force --reason <reason>[\s\S]*exceptional|exceptional[\s\S]*timeout --force --reason <reason>/i, relPath);
      assert.match(text, /not.*drained|undrained|do not run.*gate/i, relPath);
    }
  });

  it('shared protocol keeps timeout-preflight before terminal timeout and force exceptional', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md');
    assert.match(text, /timeout-preflight/i);
    assert.match(text, /recommended_action/i);
    assert.match(text, /submit[\s\S]*repair[\s\S]*wait[\s\S]*inspect[\s\S]*block[\s\S]*timeout/i);
    assert.match(text, /Default `timeout` is valid only after timeout preflight reports `timeout_eligible: true`/);
    assert.match(text, /Force timeout is an audited escape hatch/i);
  });
});

describe('Sub-agent observable progress guidance', () => {
  it('active sub-agent roles emit batch-level progress and keep it diagnostic-only', () => {
    for (const relPath of [
      'DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-source-intake.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-evidence-extractor.md',
      'DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-topic-scout.md',
    ]) {
      const text = read(relPath);
      for (const eventName of [
        'search_batch_started',
        'search_batch_done',
        'fetch_batch_started',
        'fetch_batch_done',
        'cache_written',
        'result_draft_written',
        'work_done',
      ]) {
        assert.match(text, new RegExp(eventName), `${relPath} missing ${eventName}`);
      }
      assert.match(text, /work_id[\s\S]*queue_item_id[\s\S]*kind[\s\S]*receipt_nonce/i, relPath);
      assert.match(text, /Progress is diagnostic only/i, relPath);
      assert.match(text, /Progress never replaces `operate-work-unit submit`/i, relPath);
      assert.doesNotMatch(text, /\bpython\b|\.py\b/i, relPath);
    }
  });

  it('shared protocol describes progress receipts as timeout-preflight diagnostics only', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-subagent-protocol.md');
    assert.match(text, /batch-level progress/i);
    assert.match(text, /timeout preflight distinguish no progress from slow progress/i);
    assert.match(text, /do not append ledger rows, satisfy source claims, count gate coverage, or replace formal `operate-work-unit submit`/i);
    assert.doesNotMatch(text, /\bpython\b|\.py\b/i);
  });
});

describe('Phase-owned reference materialization guidance', () => {
  it('anti-cheating and reference template distinguish projections from delegated authority', () => {
    const anti = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-anti-cheating-rules.md');
    assert.match(anti, /Phase-owned consumer reference projection/i);
    assert.match(anti, /submitted source claims/i);
    assert.match(anti, /filesystem-only/i);
    assert.match(anti, /unsubmitted/i);
    assert.match(anti, /source_layer.*not.*authority/i);
    assert.match(anti, /script|template/i);

    const template = read('DPT_FRAMEWORK/workflows/nodes/shared/shared-reference-template.md');
    assert.match(template, /Phase-owned materialization/i);
    assert.match(template, /submitted source claims/i);
    assert.match(template, /body refs/i);
    assert.match(template, /source_layer.*not.*authority/i);
    assert.match(template, /00-cross[\s\S]*primary prior accepted backing source URL/i);
  });

  it('Wave1 assigns topic reference materialization to the Phase Agent after submit', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/phases/phase-wave1.md');
    assert.match(text, /Phase Agent materializes/i);
    assert.match(text, /reference\/\{topic\.slug\}-<source-slug>\.md/i);
    assert.match(text, /submitted source_claims\[\]/i);
    assert.match(text, /accepted_source_urls\[\]/i);
    assert.match(text, /cache trails/i);
    assert.match(text, /depth-review\.yaml[\s\S]*submitted work-unit/i);
    assert.match(text, /backfill[\s\S]*submitted source claims/i);
  });

  it('Wave2 splits existing-backed 00-cross projections from new targeted evidence', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md');
    assert.match(text, /existing-backed/i);
    assert.match(text, /reference\/00-cross-\*\.md/i);
    assert.match(text, /W2F-xxx/i);
    assert.match(text, /primary prior accepted backing source URL/i);
    assert.match(text, /non-consumer|deferred|limitation/i);
    assert.match(text, /wave2_targeted_evidence/i);
    assert.match(text, /new external evidence[\s\S]*submitted/i);
  });
});

describe('Sub-agent role contracts return source substrate', () => {
  it('dpt-evidence-extractor returns source backing, not canonical topic reference presentation', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-evidence-extractor.md');
    assert.match(text, /source_claims\[\]/);
    assert.match(text, /accepted_source_urls\[\]/);
    assert.match(text, /cache_trails\[\]/);
    assert.match(text, /evidence-summary\.md/);
    assert.match(text, /question-list\.md/);
    assert.match(text, /Phase Agent materializes/i);
    assert.match(text, /canonical topic reference Markdown/i);
    assert.doesNotMatch(around(text, /^- \*\*Produces\*\*/m), /topic rich reference files/i);
  });

  it('dpt-topic-scout returns bounded targeted evidence and leaves authority files to the Phase Agent', () => {
    const text = read('DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-topic-scout.md');
    assert.match(text, /source_urls/i);
    assert.match(text, /cache_trails\[\]/);
    assert.match(text, /fills_gap/i);
    assert.match(text, /confidence/i);
    assert.match(text, /bounded targeted evidence/i);
    assert.match(text, /Phase Agent.*finding-index\.yaml/i);
    assert.match(text, /Phase Agent.*reference\/00-cross/i);
    assert.match(text, /does not.*cross-topic-ledger\.md/i);
  });
});
