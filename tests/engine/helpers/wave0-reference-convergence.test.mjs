import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { selectBalancedCandidate } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave0-reference-convergence.mjs';

// Pure cross-topic balance truth table for the Wave0 shared-reference
// materialization selection (RWG-022). Candidates mirror the shape produced by
// collectSubmittedWave0ContributionProjection: work_id / topic_slug /
// source_ordinal / entry_id.

let workIdSeq = 0;

function candidate(topicSlug, ordinal) {
  workIdSeq += 1;
  const workId = `wu-w0-b000-src${String(workIdSeq).padStart(4, '0')}-i0001`;
  return {
    work_id: workId,
    topic_uid: `tp-${topicSlug}`,
    topic_slug: topicSlug,
    source_ordinal: ordinal,
    entry_id: `${workId}/${ordinal}`,
  };
}

describe('selectBalancedCandidate', () => {
  it('prefers the topic with the fewest projected identities over lexicographic order', () => {
    const candidates = [
      candidate('aaa-topic', 1),
      candidate('aaa-topic', 2),
      candidate('zzz-topic', 1),
    ];
    // aaa-topic already has one projected identity; zzz-topic has none, so the
    // lexicographically-last topic must be exposed first.
    const { selected } = selectBalancedCandidate(
      candidates,
      new Set([candidates[0].entry_id]),
      new Set(),
    );
    assert.equal(selected.topic_slug, 'zzz-topic');
    assert.equal(selected.source_ordinal, 1);
  });

  it('breaks min-count ties by lexicographic topic_slug then lowest source_ordinal', () => {
    const candidates = [
      candidate('beta-topic', 2),
      candidate('beta-topic', 1),
      candidate('alpha-topic', 3),
      candidate('alpha-topic', 1),
    ];
    const { selected } = selectBalancedCandidate(candidates, new Set(), new Set());
    assert.equal(selected.topic_slug, 'alpha-topic');
    assert.equal(selected.source_ordinal, 1);
  });

  it('uses entry_id as the final stable tiebreak inside one topic and ordinal', () => {
    const first = candidate('alpha-topic', 1);
    const second = candidate('alpha-topic', 1);
    const { selected } = selectBalancedCandidate([second, first], new Set(), new Set());
    assert.equal(selected.entry_id, first.entry_id);
  });

  it('excludes projected and deferred identities before balancing', () => {
    const candidates = [
      candidate('alpha-topic', 1),
      candidate('alpha-topic', 2),
      candidate('beta-topic', 1),
    ];
    const { selected, open } = selectBalancedCandidate(
      candidates,
      new Set(),
      new Set([candidates[0].entry_id]),
    );
    // alpha-topic's ordinal 1 is deferred, so its open count matches beta-topic;
    // the lexicographic tiebreak then picks alpha-topic's ordinal 2.
    assert.equal(selected.entry_id, candidates[1].entry_id);
    assert.equal(open.length, 2);
  });

  it('returns no selection when every candidate is projected or deferred', () => {
    const candidates = [candidate('alpha-topic', 1)];
    const projectedOnly = selectBalancedCandidate(candidates, new Set([candidates[0].entry_id]), new Set());
    assert.equal(projectedOnly.selected, null);
    assert.deepEqual(projectedOnly.open, []);
    const deferredOnly = selectBalancedCandidate(candidates, new Set(), new Set([candidates[0].entry_id]));
    assert.equal(deferredOnly.selected, null);
  });

  it('keeps round-robin balance: no topic advances to a second projection while another candidate-bearing topic has zero', () => {
    // Three topics, deliberately ordered so raw lexicographic order would
    // exhaust alpha-topic first. Simulate repeated materialize-and-rerun cycles
    // by feeding each selection back as a projected identity.
    const candidates = [
      candidate('alpha-topic', 1),
      candidate('alpha-topic', 2),
      candidate('alpha-topic', 3),
      candidate('mid-topic', 1),
      candidate('mid-topic', 2),
      candidate('zzz-topic', 1),
    ];
    const projected = new Set();
    const sequence = [];
    for (let step = 0; step < candidates.length; step += 1) {
      const { selected } = selectBalancedCandidate(candidates, projected, new Set());
      if (!selected) break;
      sequence.push(`${selected.topic_slug}#${selected.source_ordinal}`);
      projected.add(selected.entry_id);
    }
    assert.deepEqual(sequence, [
      'alpha-topic#1',
      'mid-topic#1',
      'zzz-topic#1',
      'alpha-topic#2',
      'mid-topic#2',
      'alpha-topic#3',
    ]);
    // Round-robin property: before any topic's second selection, every other
    // candidate-bearing topic has been selected once.
    const firstSeen = new Map();
    const countPerTopic = new Map();
    for (const step of sequence) {
      const topic = step.split('#')[0];
      countPerTopic.set(topic, (countPerTopic.get(topic) || 0) + 1);
      if (!firstSeen.has(topic)) {
        firstSeen.set(topic, true);
        for (const other of ['alpha-topic', 'mid-topic', 'zzz-topic']) {
          if (other !== topic && (countPerTopic.get(other) || 0) === 0) {
            const remainingCandidates = candidates.some((entry) => entry.topic_slug === other
              && !projected.has(entry.entry_id));
            if (remainingCandidates && countPerTopic.get(topic) > 1) {
              assert.fail(`${topic} advanced twice while ${other} had zero coverage`);
            }
          }
        }
      }
    }
  });
});
