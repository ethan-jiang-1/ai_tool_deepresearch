import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractConcreteReferenceRefs,
  isEvidenceBearingReturnMapEntry,
  isLimitationReturnMapEntry,
  validateReturnMapContent,
} from '../../../DPT_FRAMEWORK/engine/helpers/return-map.mjs';

const createdDirs = [];

function tempBundle() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'return-map-'));
  createdDirs.push(dir);
  mkdirSync(path.join(dir, 'reference'), { recursive: true });
  return dir;
}

function writeRef(dir, ref = 'reference/topic-a-source.md') {
  mkdirSync(path.dirname(path.join(dir, ref)), { recursive: true });
  writeFileSync(path.join(dir, ref), '# Reference\n\nEvidence.\n');
  return ref;
}

function entry({ refs = ['reference/topic-a-source.md'], relationship = 'supports', status = 'supported', nextHop = 'Read the reference file.' } = {}) {
  return [
    '- evidence_meaning: Source explains a concrete mechanism.',
    `  relationship: ${relationship}`,
    '  refs:',
    ...refs.map((ref) => `    - ${ref}`),
    `  status: ${status}`,
    `  next_hop: ${nextHop}`,
  ].join('\n');
}

describe('return-map diagnostics', () => {
  after(() => {
    for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
  });

  it('reports missing minimum fields as blocking when the finding is counted into inspect failure', () => {
    const result = validateReturnMapContent(
      '- https://example.com/source\n- reference/00-shared-source.md\n',
      'seed_topics/topic-a.md',
    );

    assert.equal(result.passed, false);
    assert.equal(result.diagnosticOnly, false);
    assert.equal(result.classification, 'blocking');
    assert.deepEqual(result.missingFields, ['evidence_meaning', 'relationship', 'refs', 'status', 'next_hop']);
    assert.match(result.inspect.join('\n'), /return_map_missing_fields/);
    assert.match(result.inspect.join('\n'), /Classification: blocking/);
  });

  it('accepts the canonical return-map fields', () => {
    const dir = tempBundle();
    writeRef(dir, 'reference/00-shared-aidlc-origin.md');
    const result = validateReturnMapContent(
      [
        '- evidence_meaning: AWS/Raja SP evidence refutes bottom-up origin.',
        '  relationship: refutes',
        '  refs:',
        '    - reference/00-shared-aidlc-origin.md',
        '    - artifacts/wave0/topic-a/source.yaml',
        '    - _cache/wave0/primary/topic-a/aidlc-origin/',
        '    - _work_units/wave0/wu-w0-b000-src-i0001/result.json',
        '  status: refuted',
        '  next_hop: Read provenance confirmation sources next.',
      ].join('\n'),
      'seed_topics/topic-a.md',
      { bundlePath: dir, requireConcreteReferenceNavigation: true },
    );

    assert.equal(result.passed, true, result.inspect.join('\n'));
    assert.equal(result.diagnosticOnly, true);
    assert.equal(result.classification, 'diagnostic-only');
  });

  it('requires evidence-bearing entries to include concrete existing reference files', () => {
    const dir = tempBundle();

    const internalOnly = validateReturnMapContent(
      entry({ refs: ['artifacts/wave1/topic-a/evidence-summary.md', '_cache/wave1/primary/topic-a/source', '_work_units/wave1/wu-w1-b000-deep-i0001'] }),
      'seed_topics/topic-a.md',
      { bundlePath: dir, requireConcreteReferenceNavigation: true },
    );
    assert.equal(internalOnly.passed, false);
    assert.match(internalOnly.inspect.join('\n'), /return_map_missing_concrete_reference/);
    assert.match(internalOnly.inspect.join('\n'), /found only internal provenance refs/);

    const glob = validateReturnMapContent(
      entry({ refs: ['reference/topic-a-*.md（8 个）'] }),
      'seed_topics/topic-a.md',
      { bundlePath: dir, requireConcreteReferenceNavigation: true },
    );
    assert.equal(glob.passed, false);
    assert.match(glob.inspect.join('\n'), /return_map_concrete_reference/);
    assert.match(glob.inspect.join('\n'), /glob\/count summaries/);

    const missing = validateReturnMapContent(
      entry({ refs: ['reference/topic-a-missing.md'] }),
      'seed_topics/topic-a.md',
      { bundlePath: dir, requireConcreteReferenceNavigation: true },
    );
    assert.equal(missing.passed, false);
    assert.match(missing.inspect.join('\n'), /does not exist under the active bundle root/);

    writeRef(dir);
    const concrete = validateReturnMapContent(
      entry(),
      'seed_topics/topic-a.md',
      { bundlePath: dir, requireConcreteReferenceNavigation: true },
    );
    assert.equal(concrete.passed, true, concrete.inspect.join('\n'));
  });

  it('allows explicit limitation entries to omit concrete reference files', () => {
    const result = validateReturnMapContent(
      entry({
        refs: ['none'],
        relationship: 'defers',
        status: 'deferred',
        nextHop: 'limitation: no materializable evidence; defer to HITL2.',
      }),
      'seed_topics/topic-a.md',
      { bundlePath: tempBundle(), requireConcreteReferenceNavigation: true },
    );

    assert.equal(result.passed, true, result.inspect.join('\n'));
    assert.equal(isLimitationReturnMapEntry(result.entries[0]), true);
    assert.equal(isEvidenceBearingReturnMapEntry(result.entries[0]), false);
  });

  it('extracts only flat concrete reference refs and rejects glob or count refs', () => {
    const dir = tempBundle();
    writeRef(dir);
    const extracted = extractConcreteReferenceRefs(
      [
        'reference/topic-a-source.md',
        'reference/topic-a-*.md (8 files)',
        'reference/nested/source.md',
      ].join('\n'),
      { bundlePath: dir },
    );

    assert.deepEqual(extracted.refs, ['reference/topic-a-source.md']);
    assert.deepEqual(extracted.rejectedRefs.map((ref) => ref.reason), ['glob_or_count_summary', 'not_concrete_reference_md']);
  });
});
