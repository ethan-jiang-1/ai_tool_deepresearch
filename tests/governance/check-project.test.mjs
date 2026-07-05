// @impl INT-001
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '..', '.test-tmp');
const CHECK_REQS = join(ROOT, 'openspec/governance/check-project-reqs.mjs');
const CHECK_SPECS = join(ROOT, 'openspec/governance/check-project-specs.mjs');

describe('project governance checks', () => {
  it('ignores requirement IDs inside fenced code blocks', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      const result = spawnSync('node', [CHECK_REQS, tmpDir], { encoding: 'utf-8' });
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('prose cross-references do not count as declarations (no false duplicate)', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      // Second spec file declares its own id but cross-references ABC-001 in prose,
      // mirroring the GSK-002/WNC-009 false-positive pattern.
      mkdirSync(join(tmpDir, 'openspec/specs/other-capability'), { recursive: true });
      writeFileSync(
        join(tmpDir, 'openspec/governance/req-registry.yaml'),
        'ABC-001: demo capability\nABC-002: other capability\n',
      );
      writeFileSync(
        join(tmpDir, 'openspec/specs/other-capability/spec.md'),
        [
          '# Other Specification',
          '> req: ABC-002',
          '',
          '## Requirements',
          '',
          '### Requirement: Other',
          'The write-side complement is defined per ABC-001 (see demo-capability).',
          'This mirrors the BUG-018 double defense.',
        ].join('\n'),
      );

      const result = spawnSync('node', [CHECK_REQS, tmpDir], { encoding: 'utf-8' });
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('still detects a true duplicate: same id declared in two spec files', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      mkdirSync(join(tmpDir, 'openspec/specs/other-capability'), { recursive: true });
      writeFileSync(
        join(tmpDir, 'openspec/specs/other-capability/spec.md'),
        [
          '# Other Specification',
          '> req: ABC-001',
          '',
          '## Requirements',
          '',
          '### Requirement: Other',
          'The system SHALL do something else.',
        ].join('\n'),
      );

      const result = spawnSync('node', [CHECK_REQS, tmpDir], { encoding: 'utf-8' });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /Duplicate IDs/);
      assert.match(result.stderr, /ABC-001/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('bug IDs (BUG-\\d+) in prose do not enter the unregistered check', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir, {
        specContent: [
          '# Demo Specification',
          '> req: ABC-001',
          '',
          '## Requirements',
          '',
          '### Requirement: Demo',
          'This is the write-side prevention for BUG-018.',
        ].join('\n'),
      });

      const result = spawnSync('node', [CHECK_REQS, tmpDir], { encoding: 'utf-8' });
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('still detects an unregistered prose reference (typo detection)', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir, {
        specContent: [
          '# Demo Specification',
          '> req: ABC-001',
          '',
          '## Requirements',
          '',
          '### Requirement: Demo',
          'This complements XYZ-999 which does not exist.',
        ].join('\n'),
      });

      const result = spawnSync('node', [CHECK_REQS, tmpDir], { encoding: 'utf-8' });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /Unregistered IDs/);
      assert.match(result.stderr, /XYZ-999/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('still detects an orphan: registered id absent from specs and deltas', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      writeFileSync(
        join(tmpDir, 'openspec/governance/req-registry.yaml'),
        'ABC-001: demo capability\nZZZ-001: lost capability\n',
      );

      const result = spawnSync('node', [CHECK_REQS, tmpDir], { encoding: 'utf-8' });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /Orphan IDs/);
      assert.match(result.stderr, /ZZZ-001/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('requires req trace before the first second-level heading', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir, {
        specContent: [
          '# Demo Specification',
          '',
          '## Purpose',
          '',
          'Text before the trace.',
          '',
          '> req: ABC-001',
          '',
          '## Requirements',
          '',
          '### Requirement: Demo',
          'The system SHALL do something.',
        ].join('\n'),
      });

      const result = spawnSync('node', [CHECK_SPECS, tmpDir], { encoding: 'utf-8' });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /Missing > req: header/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

function seedGovernanceFixture(tmpDir, options = {}) {
  mkdirSync(join(tmpDir, 'openspec/governance'), { recursive: true });
  mkdirSync(join(tmpDir, 'openspec/specs/demo-capability'), { recursive: true });
  mkdirSync(join(tmpDir, 'openspec/changes/demo-change/specs/demo-capability'), { recursive: true });

  writeFileSync(
    join(tmpDir, 'openspec/governance/req-registry.yaml'),
    'ABC-001: demo capability\n',
  );

  writeFileSync(
    join(tmpDir, 'openspec/specs/demo-capability/spec.md'),
    options.specContent ?? [
      '# Demo Specification',
      '> req: ABC-001',
      '',
      '## Purpose',
      '',
      '```md',
      '> req: ABC-777',
      'ABC-999 appears in code blocks only.',
      '```',
      '',
      '## Requirements',
      '',
      '### Requirement: Demo',
      'The system SHALL do something.',
    ].join('\n'),
  );

  writeFileSync(
    join(tmpDir, 'openspec/changes/demo-change/specs/demo-capability/spec.md'),
    [
      '# Demo Delta',
      '',
      '## ADDED Requirements',
      '',
      '### Requirement: Delta',
      'The system SHALL do something else.',
    ].join('\n'),
  );
}
