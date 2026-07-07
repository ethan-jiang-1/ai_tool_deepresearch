import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  checkDelegatedBypassSuspected,
  checkWorkUnitLedgerExists,
  checkWorkUnitOutputCoverage,
  checkWorkUnitSubmissionPresence,
  detectDelegatedBypassSuspicion,
} from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers-provenance.mjs';
import {
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  tempWorkUnitBundle,
} from '../work-unit-test-helpers.mjs';

const dirs = [];

afterEach(() => {
  while (dirs.length > 0) cleanupWorkUnitBundle(dirs.pop());
});

function tempDir(prefix) {
  const dir = tempWorkUnitBundle(prefix);
  dirs.push(dir);
  return dir;
}

describe('work-unit provenance gate helpers', () => {
  it('accepts only submitted work-unit ledger rows for scoped ledger existence', () => {
    const dir = tempDir('wpg-ledger-');
    claimAndSubmitWorkUnit(dir, { phase: 'wave0', queueItemId: 'queue-a' });

    const result = checkWorkUnitLedgerExists(dir, {
      wave: 'wave0',
      kind: 'wave0_source_intake',
      role: 'reference',
    });

    assert.equal(result.passed, true);
    assert.equal(result.records.length, 1);
    assert.match(result.records[0].work_id, /^wu-w0-b000-src-i0001$/);
  });

  it('rejects work-unit-looking hand-written rows without submit/index fingerprints', () => {
    const dir = tempDir('wpg-handwritten-');
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), `${JSON.stringify({
      declared_at: '2026-07-06T00:00:00.000Z',
      work_id: 'wu-w0-b000-src-i0001',
      queue_item_id: 'queue-a',
      wave: 0,
      kind: 'wave0_source_intake',
      producer_rule: 'source_intake_fan_in',
      creation_reason: 'hand written',
      work_unit_ref: '_work_units/wave0/wu-w0-b000-src-i0001',
      result_ref: '_work_units/wave0/wu-w0-b000-src-i0001/result.json',
      runtime_receipt_ref: '_work_units/wave0/wu-w0-b000-src-i0001/runtime-receipt.jsonl',
      receipt_nonce: '1234567890123456',
      output_files: [],
      cache_trails: [],
      result_hash: 'not-engine-written',
      ledger_record_hash: 'not-engine-written',
    })}\n`);

    const result = checkWorkUnitLedgerExists(dir, { wave: 'wave0' });
    assert.equal(result.passed, false);
    assert.match(result.inspect.join('\n'), /invalid submitted work-unit declaration ledger/);
  });

  it('requires filesystem outputs to be covered by submitted work-unit rows', () => {
    const dir = tempDir('wpg-coverage-');
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'topic-a-orphan.md'), '# Orphan\n');

    const result = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave1',
      output_selectors: { glob: 'reference/*.md', roles: ['reference'] },
    });

    assert.equal(result.passed, false);
    assert.deepEqual(result.orphans, ['reference/topic-a-orphan.md']);
    assert.match(result.inspect.join('\n'), /lacks submitted work-unit coverage/);
  });

  it('passes output coverage and submission presence for a real submit', () => {
    const dir = tempDir('wpg-submitted-');
    claimAndSubmitWorkUnit(dir, {
      phase: 'wave1',
      queueItemId: 'queue-b',
      outputs: [{
        path: 'reference/topic-a-source.md',
        role: 'reference',
        source_url: 'https://example.com/research/article',
        source_slug: 's01_source',
        content: '# Source\n',
      }],
    });

    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave1',
      kind: 'wave1_topic_deepening',
      output_selectors: { glob: 'reference/*.md', roles: ['reference'] },
    });
    const presence = checkWorkUnitSubmissionPresence(dir, {
      wave: 'wave1',
      kind: 'wave1_topic_deepening',
    });

    assert.equal(coverage.passed, true);
    assert.equal(presence.passed, true);
  });

  it('reports delegated bypass suspicion for direct artifacts without submitted coverage', () => {
    const dir = tempDir('wpg-bypass-');
    mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-a'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave1', 'topic-a', 'evidence-summary.md'), '# Evidence\n');
    writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ bundle: 'wpg-bypass' }));

    const result = detectDelegatedBypassSuspicion(dir, 'wave1', 'wave1-complete');
    const check = checkDelegatedBypassSuspected(dir, { wave: 'wave1', gate: 'wave1-complete' });

    assert.equal(result.suspected, true);
    assert.equal(check.passed, false);
    assert.match(check.inspect.join('\n'), /delegated_bypass_suspected/);
  });

  it('does not require Wave2 work-unit rows for pure synthesis artifacts', () => {
    const dir = tempDir('wpg-wave2-pure-');
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave2', 'synthesis.md'), '# Synthesis\n');

    const result = detectDelegatedBypassSuspicion(dir, 'wave2', 'wave2-complete');
    assert.equal(result.suspected, false);
  });
});
