// @impl RUS-003, RUS-004: run-scoped-tmp — Unit test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  sanitizeStagingToken,
  stagingFile,
  scanHardcodedSystemTmpWrites,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/run-scoped-tmp.mjs';

describe('stagingFile / sanitizeStagingToken (RUS-003)', () => {
  it('resolves under the bundle root _tmp/', () => {
    const path = stagingFile('/tmp/rb-root', '08_haiguang-shensuan4-dcu', 'enrich');
    assert.equal(path, join('/tmp/rb-root', '_tmp', 'enrich-08_haiguang-shensuan4-dcu.json'));
  });

  it('rejects traversal and separator tokens', () => {
    for (const bad of ['../escape', 'a/b', 'a\\b', '..']) {
      assert.throws(() => stagingFile('/root', bad, 'enrich'), /separators or traversal/, `slug ${bad}`);
      assert.throws(() => stagingFile('/root', 'ok-slug', bad), /separators or traversal/, `kind ${bad}`);
    }
  });

  it('rejects empty and disallowed-character tokens', () => {
    assert.throws(() => stagingFile('/root', '', 'enrich'), /non-empty/);
    assert.throws(() => stagingFile('/root', 'ok', ''), /non-empty/);
    assert.throws(() => stagingFile('/root', 'bad space', 'enrich'), /must match/);
    assert.throws(() => stagingFile('/root', 'ok', 'bad;kind'), /must match/);
    assert.throws(() => sanitizeStagingToken(null, 'slug'), /non-empty/);
  });

  it('produces distinct stable paths across kind/slug combinations', () => {
    const root = '/rb';
    const a = stagingFile(root, 'topic-x', 'enrich');
    const b = stagingFile(root, 'topic-x', 'wave0-proj');
    const c = stagingFile(root, 'topic-y', 'enrich');
    assert.notEqual(a, b);
    assert.notEqual(a, c);
    assert.equal(stagingFile(root, 'topic-x', 'enrich'), a, 'repeated calls are idempotent');
  });
});

describe('scanHardcodedSystemTmpWrites (RUS-004)', () => {
  function fixtureWith(files) {
    const root = mkdtempSync(join(tmpdir(), 'rstmp-test-'));
    const scriptsDir = join(root, '_scripts');
    mkdirSync(scriptsDir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(scriptsDir, name), content);
    }
    return root;
  }

  it('reports a hardcoded /tmp write literal with file and line', () => {
    const root = fixtureWith({
      'process-all-seeds.mjs': [
        'import { writeFileSync } from "node:fs";',
        "const slug = '08_topic';",
        "writeFileSync('/tmp/enrich-' + slug + '.json', data);",
        '',
      ].join('\n'),
    });
    try {
      const hits = scanHardcodedSystemTmpWrites(root);
      assert.equal(hits.length, 1);
      assert.equal(hits[0].file, '_scripts/process-all-seeds.mjs');
      assert.equal(hits[0].literal, "'/tmp/enrich-'");
      assert.equal(hits[0].line, 3);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('excludes comment-only and line-comment references', () => {
    const root = fixtureWith({
      'notes.mjs': [
        '// never write to /tmp/enrich-*.json here',
        '/* explain: /tmp/wave0-fix-*.json is forbidden */',
        "const keep = 'write to _tmp instead';",
        "console.log('docs say avoid /tmp/'); // trailing comment /tmp/enrich-x.json",
        '',
      ].join('\n'),
    });
    try {
      const hits = scanHardcodedSystemTmpWrites(root);
      assert.equal(hits.length, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports multiple files and aggregates per-file hits', () => {
    const root = fixtureWith({
      'a.mjs': "const p1 = '/tmp/a-1.json';",
      'b.mjs': "const p2 = '/tmp/b-1.json';\nconst p3 = '/tmp/b-2.json';",
    });
    try {
      const hits = scanHardcodedSystemTmpWrites(root);
      assert.equal(hits.length, 3);
      assert.deepEqual(hits.map((h) => h.file), ['_scripts/a.mjs', '_scripts/b.mjs', '_scripts/b.mjs']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns empty for missing _scripts and for bundle-local staging only', () => {
    const emptyRoot = mkdtempSync(join(tmpdir(), 'rstmp-empty-'));
    try {
      assert.deepEqual(scanHardcodedSystemTmpWrites(emptyRoot), []);
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true });
    }
    const root = fixtureWith({
      'stager.mjs': "import { stagingFile } from 'DEEP_RESEARCH_HARNESS/engine/helpers/run-scoped-tmp.mjs';\nconst p = stagingFile('/rb', '08_topic', 'enrich');\nwriteFileSync(p, data);",
    });
    try {
      assert.deepEqual(scanHardcodedSystemTmpWrites(root), []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
