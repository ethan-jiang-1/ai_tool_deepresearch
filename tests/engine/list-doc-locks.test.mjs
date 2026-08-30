// @impl CHF-004 (close-verification-landing-loop): the lock-discovery query
// core maps a governed document to the tests that reference it.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findDocLocks } from '../../scripts/list-doc-locks.mjs';

const FILES = [
  {
    path: 'tests/integration/md/canonical-harness-vocabulary-contract.test.mjs',
    content: [
      "const harnessDocs = Object.fromEntries([",
      "  ['agents', 'DEEP_RESEARCH_HARNESS/AGENTS.md'],",
      "    assert.match(contents, /Execution Brief/);",
      "].map(([name, path]) => [name, read(path)]));",
    ].join('\n'),
  },
  {
    path: 'tests/engine/static-regression.test.mjs',
    content: [
      "describe('routing', () => {",
      "  it('root files route', () => {",
      "    const text = readRepo('AGENTS.md');",
      "    assert.ok(text.includes('DEEP_RESEARCH_HARNESS/RUN.md'));",
      "  });",
      "});",
    ].join('\n'),
  },
  {
    path: 'tests/engine/unrelated.test.mjs',
    content: "it('unrelated', () => { assert.equal(1, 1); });",
  },
];

describe('list-doc-locks core', () => {
  it('reports full-path references with nearby assertion excerpts', () => {
    const locks = findDocLocks({ docPath: 'DEEP_RESEARCH_HARNESS/AGENTS.md', files: FILES });
    const byFile = new Map(locks.map((entry) => [entry.file, entry.hits]));
    assert.equal(byFile.get('tests/integration/md/canonical-harness-vocabulary-contract.test.mjs')[0].kind, 'exact');
    assert.match(byFile.get('tests/integration/md/canonical-harness-vocabulary-contract.test.mjs')[0].excerpt, /assert\.match/);
    // A bare-basename reference to a different AGENTS.md is surfaced as a
    // 'basename' candidate instead of being silently hidden.
    assert.equal(byFile.get('tests/engine/static-regression.test.mjs')[0].kind, 'basename');
  });

  it('classifies exact, containing, and basename references distinctly', () => {
    const locks = findDocLocks({ docPath: 'AGENTS.md', files: FILES });
    const byFile = new Map(locks.map((entry) => [entry.file, entry.hits]));
    // readRepo('AGENTS.md') is an exact literal reference.
    assert.equal(byFile.get('tests/engine/static-regression.test.mjs')[0].kind, 'exact');
    // The longer literal 'DEEP_RESEARCH_HARNESS/AGENTS.md' contains the query
    // and is reported as 'containing' rather than hidden.
    assert.equal(byFile.get('tests/integration/md/canonical-harness-vocabulary-contract.test.mjs')[0].kind, 'containing');
  });

  it('reports no references for an unreferenced document', () => {
    const locks = findDocLocks({ docPath: 'docs/adr/9999-unused.md', files: FILES });
    assert.deepEqual(locks, []);
  });

  it('rejects non-normalizable query paths without scanning', () => {
    assert.deepEqual(findDocLocks({ docPath: '../outside', files: FILES }), []);
    assert.deepEqual(findDocLocks({ docPath: '', files: FILES }), []);
  });
});
