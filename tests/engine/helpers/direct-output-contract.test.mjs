// @impl DEW-005, RWG-018

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, truncateSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

const FOUR_MIB = 4 * 1024 * 1024;
const VALID_SOURCE_YAML = [
  '- url: https://example.com/source',
  '  title: Example source',
  '  retrieved_date: 2026-07-20',
  '  topic_tag: topic-a',
  '',
].join('\n');
const VALID_EVIDENCE = '###   KEY FINDINGS   \n\n- One supported finding.\n';
const VALID_QUESTIONS = [
  '#### question reconciliation',
  '',
  '- Reconcile one question.',
  '',
  '# Exploration   /   Exploitation Decision',
  '',
  'Explore one unresolved branch.',
  '',
  '### TOPIC INVESTIGATION TARGETS',
  '',
  'Target one mechanism.',
  '',
  '## Emergent Question Protocol',
  '',
  'Record one emergent question.',
  '',
].join('\n');

function tempBundle() {
  return mkdtempSync(path.join(os.tmpdir(), 'direct-output-contract-'));
}

function writeTarget(bundleDir, target, content) {
  const absolute = path.join(bundleDir, target);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
  return absolute;
}

async function evaluate(input) {
  const { evaluateDirectOutputTarget } = await import(
    '../../../DEEP_RESEARCH_HARNESS/engine/helpers/direct-output-contract.mjs'
  );
  return evaluateDirectOutputTarget(input);
}

function assertSingleRoot(result, { rootClass, contractId, coordinate }) {
  assert.equal(result.passed, false);
  assert.equal(result.roots.length, 1);
  assert.equal(result.roots[0].root_class, rootClass);
  assert.equal(result.roots[0].contract_id, contractId);
  assert.equal(result.roots[0].coordinate, coordinate);
  assert.equal(typeof result.roots[0].code, 'string');
  assert.ok(result.roots[0].code.length > 0);
  assert.equal(Object.hasOwn(result.roots[0], 'repair_scope'), false);
  assert.equal(Object.hasOwn(result.roots[0], 'recommended_action'), false);
}

function assertNoSourceExposure(result) {
  for (const key of ['bytes', 'content', 'decoded', 'parsed', 'entries', 'array']) {
    assert.equal(Object.hasOwn(result, key), false, `direct result must not expose ${key}`);
  }
}

describe('evaluateDirectOutputTarget path and reader policy', () => {
  it('rejects absolute, empty, dot, traversal, backslash, redundant, and placeholder targets lexically', async () => {
    const bundleDir = tempBundle();
    try {
      const invalidTargets = [
        '',
        '.',
        path.join(bundleDir, 'absolute.md'),
        '../escape.md',
        'artifacts/../escape.md',
        'artifacts\\wave1\\topic-a\\evidence-summary.md',
        'artifacts//wave1/topic-a/evidence-summary.md',
        'artifacts/./wave1/topic-a/evidence-summary.md',
        'artifacts/wave1/{topic}/evidence-summary.md',
        'artifacts/wave1/*/evidence-summary.md',
      ];
      for (const target of invalidTargets) {
        const result = await evaluate({
          bundleDir,
          target,
          contractId: 'wave1.evidence-summary.v1',
        });
        assertSingleRoot(result, {
          rootClass: 'contract_integrity',
          contractId: 'wave1.evidence-summary.v1',
          coordinate: target,
        });
      }
    } finally {
      rmSync(bundleDir, { recursive: true, force: true });
    }
  });

  it('rejects 4 MiB plus one and accepts bounded shorter content without exact-stat-length assumptions', async () => {
    const bundleDir = tempBundle();
    const target = 'artifacts/wave1/topic-a/evidence-summary.md';
    try {
      const absolute = writeTarget(bundleDir, target, Buffer.alloc(FOUR_MIB + 1, 0x61));
      const oversized = await evaluate({ bundleDir, target, contractId: 'wave1.evidence-summary.v1' });
      assertSingleRoot(oversized, {
        rootClass: 'contract_integrity',
        contractId: 'wave1.evidence-summary.v1',
        coordinate: target,
      });

      truncateSync(absolute, 0);
      writeFileSync(absolute, VALID_EVIDENCE);
      const shorter = await evaluate({ bundleDir, target, contractId: 'wave1.evidence-summary.v1' });
      assert.equal(shorter.passed, true);
      assert.ok(shorter.snapshot_meta.bytes_read < FOUR_MIB);
    } finally {
      rmSync(bundleDir, { recursive: true, force: true });
    }
  });

  it('rejects stable symlinks, realpath escape through a parent, directories, and Unix sockets', async () => {
    const bundleDir = tempBundle();
    const outsideDir = tempBundle();
    let server;
    try {
      writeTarget(bundleDir, 'real/evidence.md', VALID_EVIDENCE);
      symlinkSync(path.join(bundleDir, 'real/evidence.md'), path.join(bundleDir, 'linked.md'));
      const symlink = await evaluate({
        bundleDir,
        target: 'linked.md',
        contractId: 'wave1.evidence-summary.v1',
      });
      assertSingleRoot(symlink, {
        rootClass: 'contract_integrity',
        contractId: 'wave1.evidence-summary.v1',
        coordinate: 'linked.md',
      });

      writeTarget(outsideDir, 'evidence.md', VALID_EVIDENCE);
      symlinkSync(outsideDir, path.join(bundleDir, 'outside-parent'));
      const escape = await evaluate({
        bundleDir,
        target: 'outside-parent/evidence.md',
        contractId: 'wave1.evidence-summary.v1',
      });
      assertSingleRoot(escape, {
        rootClass: 'contract_integrity',
        contractId: 'wave1.evidence-summary.v1',
        coordinate: 'outside-parent/evidence.md',
      });

      mkdirSync(path.join(bundleDir, 'directory-target'));
      const directory = await evaluate({
        bundleDir,
        target: 'directory-target',
        contractId: 'wave1.evidence-summary.v1',
      });
      assertSingleRoot(directory, {
        rootClass: 'contract_integrity',
        contractId: 'wave1.evidence-summary.v1',
        coordinate: 'directory-target',
      });

      const socketPath = path.join(bundleDir, 'socket-target');
      server = net.createServer();
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(socketPath, resolve);
      });
      const socket = await evaluate({
        bundleDir,
        target: 'socket-target',
        contractId: 'wave1.evidence-summary.v1',
      });
      assertSingleRoot(socket, {
        rootClass: 'contract_integrity',
        contractId: 'wave1.evidence-summary.v1',
        coordinate: 'socket-target',
      });
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      rmSync(bundleDir, { recursive: true, force: true });
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it('uses fatal UTF-8 and owns exactly one leading BOM tolerance', async () => {
    const bundleDir = tempBundle();
    const target = 'artifacts/wave1/topic-a/evidence-summary.md';
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    try {
      writeTarget(bundleDir, target, Buffer.from([0xc3, 0x28]));
      const invalid = await evaluate({ bundleDir, target, contractId: 'wave1.evidence-summary.v1' });
      assertSingleRoot(invalid, {
        rootClass: 'contract_integrity',
        contractId: 'wave1.evidence-summary.v1',
        coordinate: target,
      });

      writeTarget(bundleDir, target, Buffer.concat([bom, Buffer.from(VALID_EVIDENCE)]));
      const oneBom = await evaluate({ bundleDir, target, contractId: 'wave1.evidence-summary.v1' });
      assert.equal(oneBom.passed, true);

      writeTarget(bundleDir, target, Buffer.concat([bom, bom, Buffer.from(VALID_EVIDENCE)]));
      const doubleBom = await evaluate({ bundleDir, target, contractId: 'wave1.evidence-summary.v1' });
      assertSingleRoot(doubleBom, {
        rootClass: 'contract_integrity',
        contractId: 'wave1.evidence-summary.v1',
        coordinate: target,
      });
    } finally {
      rmSync(bundleDir, { recursive: true, force: true });
    }
  });
});

describe('evaluateDirectOutputTarget direct facts', () => {
  it('exposes only validated Wave0 array cardinality and withholds it for invalid direct output', async () => {
    const bundleDir = tempBundle();
    const target = 'artifacts/wave0/topic-a/source.yaml';
    try {
      for (const [content, expectedLength] of [[VALID_SOURCE_YAML, 1], ['[]\n', 0]]) {
        writeTarget(bundleDir, target, content);
        const valid = await evaluate({ bundleDir, target, contractId: 'wave0.source-metadata-array.v1' });
        assert.equal(valid.passed, true);
        assert.equal(valid.snapshot_meta.validated_array_length, expectedLength);
        assert.equal(Number.isInteger(valid.snapshot_meta.validated_array_length), true);
        assert.ok(valid.snapshot_meta.validated_array_length >= 0);
        assertNoSourceExposure(valid);
      }
      for (const content of ['[unterminated\n', 'url: https://example.com\n', '- url: https://example.com\n']) {
        writeTarget(bundleDir, target, content);
        const invalid = await evaluate({ bundleDir, target, contractId: 'wave0.source-metadata-array.v1' });
        assertSingleRoot(invalid, {
          rootClass: 'semantic_content',
          contractId: 'wave0.source-metadata-array.v1',
          coordinate: target,
        });
        assert.equal(Object.hasOwn(invalid.snapshot_meta || {}, 'validated_array_length'), false);
        assertNoSourceExposure(invalid);
      }
    } finally {
      rmSync(bundleDir, { recursive: true, force: true });
    }
  });

  it('preserves tolerant Key Findings and question-section presentation without enforcing URL or order', async () => {
    const bundleDir = tempBundle();
    try {
      writeTarget(bundleDir, 'artifacts/wave1/topic-a/evidence-summary.md', VALID_EVIDENCE);
      writeTarget(bundleDir, 'artifacts/wave1/topic-a/question-list.md', VALID_QUESTIONS);
      const evidence = await evaluate({
        bundleDir,
        target: 'artifacts/wave1/topic-a/evidence-summary.md',
        contractId: 'wave1.evidence-summary.v1',
      });
      const questions = await evaluate({
        bundleDir,
        target: 'artifacts/wave1/topic-a/question-list.md',
        contractId: 'wave1.question-list.v1',
      });
      assert.equal(evidence.passed, true);
      assert.equal(questions.passed, true);
    } finally {
      rmSync(bundleDir, { recursive: true, force: true });
    }
  });

  it('reports one semantic root for a missing target or missing dependent sections', async () => {
    const bundleDir = tempBundle();
    try {
      const missing = await evaluate({
        bundleDir,
        target: 'artifacts/wave1/topic-a/evidence-summary.md',
        contractId: 'wave1.evidence-summary.v1',
      });
      assertSingleRoot(missing, {
        rootClass: 'semantic_content',
        contractId: 'wave1.evidence-summary.v1',
        coordinate: 'artifacts/wave1/topic-a/evidence-summary.md',
      });

      writeTarget(bundleDir, 'artifacts/wave1/topic-a/question-list.md', [
        '## Topic Investigation Targets',
        '',
        'One target.',
        '',
        '## Question Reconciliation',
        '',
        'One reconciliation.',
      ].join('\n'));
      const sections = await evaluate({
        bundleDir,
        target: 'artifacts/wave1/topic-a/question-list.md',
        contractId: 'wave1.question-list.v1',
      });
      assertSingleRoot(sections, {
        rootClass: 'semantic_content',
        contractId: 'wave1.question-list.v1',
        coordinate: 'artifacts/wave1/topic-a/question-list.md',
      });
      assert.match(sections.roots[0].observed, /emergent question protocol/i);
      assert.match(sections.roots[0].observed, /exploration.*exploitation decision/i);
    } finally {
      rmSync(bundleDir, { recursive: true, force: true });
    }
  });

  it('short-circuits dependent parsing after one integrity prerequisite root', async () => {
    const bundleDir = tempBundle();
    const target = 'artifacts/wave0/topic-a/source.yaml';
    try {
      writeTarget(bundleDir, target, Buffer.from([0xc3, 0x28]));
      const result = await evaluate({ bundleDir, target, contractId: 'wave0.source-metadata-array.v1' });
      assertSingleRoot(result, {
        rootClass: 'contract_integrity',
        contractId: 'wave0.source-metadata-array.v1',
        coordinate: target,
      });
      assert.doesNotMatch(result.roots[0].code, /yaml|schema|array/i);
    } finally {
      rmSync(bundleDir, { recursive: true, force: true });
    }
  });

  it('rejects unknown contracts without returning bytes, parser exceptions, or submit projections', async () => {
    const bundleDir = tempBundle();
    try {
      writeTarget(bundleDir, 'artifact.md', VALID_EVIDENCE);
      const result = await evaluate({ bundleDir, target: 'artifact.md', contractId: 'unknown.contract.v1' });
      assertSingleRoot(result, {
        rootClass: 'contract_integrity',
        contractId: 'unknown.contract.v1',
        coordinate: 'artifact.md',
      });
      assert.equal(Object.hasOwn(result, 'bytes'), false);
      assert.equal(Object.hasOwn(result, 'content'), false);
      assert.equal(Object.hasOwn(result, 'recommended_action'), false);
      assert.equal(Object.hasOwn(result, 'repair_scope'), false);
    } finally {
      rmSync(bundleDir, { recursive: true, force: true });
    }
  });
});
