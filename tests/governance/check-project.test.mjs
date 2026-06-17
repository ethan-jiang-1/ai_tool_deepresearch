// @impl INT-001
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const CHECK_REQS = join(ROOT, 'openspec/governance/check-project-reqs.mjs');
const CHECK_SPECS = join(ROOT, 'openspec/governance/check-project-specs.mjs');

describe('project governance checks', () => {
  it('ignores requirement IDs inside fenced code blocks', () => {
    const tmpDir = mkdtempSync('dpt_rb_test_');
    try {
      seedGovernanceFixture(tmpDir);
      const result = spawnSync('node', [CHECK_REQS, tmpDir], { encoding: 'utf-8' });
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('requires req trace before the first second-level heading', () => {
    const tmpDir = mkdtempSync('dpt_rb_test_');
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
