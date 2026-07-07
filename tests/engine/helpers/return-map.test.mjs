import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateReturnMapContent } from '../../../DPT_FRAMEWORK/engine/helpers/return-map.mjs';

describe('return-map diagnostics', () => {
  it('reports missing minimum fields and remains diagnostic-only', () => {
    const result = validateReturnMapContent(
      '- https://example.com/source\n- reference/00-shared-source.md\n',
      'seed_topics/topic-a.md',
    );

    assert.equal(result.passed, false);
    assert.equal(result.diagnosticOnly, true);
    assert.deepEqual(result.missingFields, ['evidence_meaning', 'relationship', 'refs', 'status', 'next_hop']);
    assert.match(result.inspect.join('\n'), /return_map_missing_fields/);
    assert.match(result.inspect.join('\n'), /diagnostic-only/);
  });

  it('accepts the canonical return-map fields', () => {
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
    );

    assert.equal(result.passed, true, result.inspect.join('\n'));
    assert.equal(result.diagnosticOnly, true);
  });
});
