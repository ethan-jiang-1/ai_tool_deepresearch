// @impl INT-001
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(ROOT, 'tests', '.test-tmp');
const CHECK_REQS = join(ROOT, 'openspec/governance/check-project-reqs.mjs');
const CHECK_SPECS = join(ROOT, 'openspec/governance/check-project-specs.mjs');

describe('project governance checks', () => {
  it('accepts a complete nested live prefix target', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      const result = spawnSync('node', [CHECK_REQS, tmpDir], { encoding: 'utf-8' });
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('keeps the no-flag checker compatible with explicit plan mode', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      const defaultMode = runRequirementCheck(tmpDir);
      const explicitPlan = runRequirementCheck(tmpDir, '--mode', 'plan');
      const invalidScopedPlan = runRequirementCheck(tmpDir, '--mode', 'plan', '--change', 'demo-change');
      assert.equal(defaultMode.status, 0, defaultMode.stdout + defaultMode.stderr);
      assert.equal(explicitPlan.status, 0, explicitPlan.stdout + explicitPlan.stderr);
      assert.equal(invalidScopedPlan.status, 2, invalidScopedPlan.stdout + invalidScopedPlan.stderr);
      assert.match(invalidScopedPlan.stderr, /--change is only valid in archive mode/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects a flat live prefix target', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      writeFileSync(
        join(tmpDir, 'openspec/governance/req-registry.yaml'),
        'prefixes:\n  ABC: demo-capability\n\nABC-001: demo capability\n',
      );
      const result = spawnSync('node', [CHECK_REQS, tmpDir], { encoding: 'utf-8' });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /Invalid live prefix targets/);
      assert.match(result.stderr, /ABC: demo-capability is not a two-level canonical path/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('rejects a live prefix target without a main spec', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      writeFileSync(
        join(tmpDir, 'openspec/governance/req-registry.yaml'),
        'prefixes:\n  ABC: agent/missing-capability\n\nABC-001: demo capability\n',
      );
      const result = spawnSync('node', [CHECK_REQS, tmpDir], { encoding: 'utf-8' });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /ABC: agent\/missing-capability does not resolve/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('accepts documented sub-prefix and retired-prefix exceptions', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      writeFileSync(
        join(tmpDir, 'openspec/governance/req-registry.yaml'),
        [
          'prefixes:',
          '  ABC: agent/demo-capability',
          '  SOR: agent/demo-capability # sub-prefix of ABC',
          '  OLD: retired-capability # all entries deprecated; no spec directory',
          '',
          'ABC-001: demo capability',
          'OLD-001: retired capability [DEPRECATED]',
          '',
        ].join('\n'),
      );
      const result = spawnSync('node', [CHECK_REQS, tmpDir], { encoding: 'utf-8' });
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

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
        'prefixes:\n  ABC: agent/demo-capability\n\nABC-001: demo capability\nABC-002: other capability\n',
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
        'prefixes:\n  ABC: agent/demo-capability\n\nABC-001: demo capability\nZZZ-001: lost capability\n',
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

  it('accepts a same-change pending reservation in plan mode without writing live identity', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      writeNewCapabilityDelta(tmpDir, 'new-capability-change', 'governance/new-capability', 'NWC', ['NWC-001', 'NWC-002']);
      const reservationPath = writeReservation(tmpDir, 'new-capability-change', 'governance/new-capability', 'NWC', ['NWC-001', 'NWC-002']);
      const before = readFileSync(reservationPath, 'utf8');

      const result = runRequirementCheck(tmpDir, '--mode', 'plan');
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /consistent \(plan\)/);
      assert.equal(readFileSync(reservationPath, 'utf8'), before);
      assert.equal(exists(tmpDir, 'openspec/specs/governance/new-capability/spec.md'), false);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('requires a selected reservation to transition before archive and accepts it after sync', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      writeNewCapabilityDelta(tmpDir, 'new-capability-change', 'governance/new-capability', 'NWC', ['NWC-001', 'NWC-002']);
      writeReservation(tmpDir, 'new-capability-change', 'governance/new-capability', 'NWC', ['NWC-001', 'NWC-002']);

      const pending = runRequirementCheck(tmpDir, '--mode', 'archive', '--change', 'new-capability-change');
      assert.equal(pending.status, 1, pending.stdout + pending.stderr);
      assert.match(pending.stderr, /Invalid change-local requirement reservations/);
      assert.match(pending.stderr, /remains pending/);

      writeRegistry(tmpDir, {
        prefixes: {
          ABC: 'agent/demo-capability',
          NWC: 'governance/new-capability',
        },
        ids: {
          'ABC-001': 'demo capability',
          'NWC-001': 'new capability first requirement',
          'NWC-002': 'new capability second requirement',
        },
      });
      writeMainSpec(tmpDir, 'governance/new-capability', ['NWC-001', 'NWC-002']);

      const transitioned = runRequirementCheck(tmpDir, '--mode', 'archive', '--change', 'new-capability-change');
      assert.equal(transitioned.status, 0, transitioned.stdout + transitioned.stderr);
      assert.match(transitioned.stdout, /consistent \(archive\)/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('allows a selected transitioned reservation while another active reservation is pending', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      writeNewCapabilityDelta(tmpDir, 'selected-change', 'governance/selected-capability', 'SEL', ['SEL-001']);
      writeReservation(tmpDir, 'selected-change', 'governance/selected-capability', 'SEL', ['SEL-001']);
      writeNewCapabilityDelta(tmpDir, 'other-change', 'governance/other-capability', 'OTH', ['OTH-001']);
      writeReservation(tmpDir, 'other-change', 'governance/other-capability', 'OTH', ['OTH-001']);
      writeRegistry(tmpDir, {
        prefixes: {
          ABC: 'agent/demo-capability',
          SEL: 'governance/selected-capability',
        },
        ids: {
          'ABC-001': 'demo capability',
          'SEL-001': 'selected capability requirement',
        },
      });
      writeMainSpec(tmpDir, 'governance/selected-capability', ['SEL-001']);

      const result = runRequirementCheck(tmpDir, '--mode', 'archive', '--change', 'selected-change');
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('reports malformed, colliding, mismatched, and unowned pending identities at their direct boundary', () => {
    const tmpDir = mkdtempSync(join(TMP, 'dpt_rb_test_'));
    try {
      seedGovernanceFixture(tmpDir);
      writeNewCapabilityDelta(tmpDir, 'malformed-change', 'governance/malformed-capability', 'MAL', ['MAL-001']);
      writeFileSync(
        join(tmpDir, 'openspec/changes/malformed-change/requirement-reservation.yaml'),
        [
          'schema_version: requirement-reservation/v1',
          'change: malformed-change',
          'reservations:',
          '  - capability_path: governance/malformed-capability',
          '    prefix: MAL',
          '    requirements:',
          '      - MAL-001',
          '    unexpected: true',
          '',
        ].join('\n'),
      );
      const malformed = runRequirementCheck(tmpDir);
      assert.equal(malformed.status, 1, malformed.stdout + malformed.stderr);
      assert.match(malformed.stderr, /Invalid change-local requirement reservations/);
      assert.match(malformed.stderr, /unrecognized key/i);
      assert.doesNotMatch(malformed.stderr, /Unregistered IDs/);

      rmSync(join(tmpDir, 'openspec/changes/malformed-change'), { recursive: true, force: true });
      writeNewCapabilityDelta(tmpDir, 'collision-a', 'governance/collision-capability', 'COL', ['COL-001']);
      writeReservation(tmpDir, 'collision-a', 'governance/collision-capability', 'COL', ['COL-001']);
      writeNewCapabilityDelta(tmpDir, 'collision-b', 'governance/collision-capability', 'COL', ['COL-001']);
      writeReservation(tmpDir, 'collision-b', 'governance/collision-capability', 'COL', ['COL-001']);
      const collision = runRequirementCheck(tmpDir);
      assert.equal(collision.status, 1, collision.stdout + collision.stderr);
      assert.match(collision.stderr, /collides with another active reservation/);
      assert.doesNotMatch(collision.stderr, /Unregistered IDs/);

      rmSync(join(tmpDir, 'openspec/changes/collision-a'), { recursive: true, force: true });
      rmSync(join(tmpDir, 'openspec/changes/collision-b'), { recursive: true, force: true });
      writeNewCapabilityDelta(tmpDir, 'mismatch-change', 'governance/actual-capability', 'MIS', ['MIS-001']);
      writeReservation(tmpDir, 'mismatch-change', 'governance/expected-capability', 'MIS', ['MIS-001']);
      const mismatch = runRequirementCheck(tmpDir);
      assert.equal(mismatch.status, 1, mismatch.stdout + mismatch.stderr);
      assert.match(mismatch.stderr, /must be declared exactly once/);
      assert.doesNotMatch(mismatch.stderr, /Unregistered IDs/);

      rmSync(join(tmpDir, 'openspec/changes/mismatch-change'), { recursive: true, force: true });
      writeNewCapabilityDelta(tmpDir, 'duplicate-owner-change', 'governance/canonical-capability', 'DUP', ['DUP-001']);
      writeReservation(tmpDir, 'duplicate-owner-change', 'governance/canonical-capability', 'DUP', ['DUP-001']);
      writeNewCapabilityDelta(tmpDir, 'duplicate-owner-change', 'governance/other-capability', 'DUP', ['DUP-001']);
      const duplicateOwner = runRequirementCheck(tmpDir);
      assert.equal(duplicateOwner.status, 1, duplicateOwner.stdout + duplicateOwner.stderr);
      assert.match(duplicateOwner.stderr, /must be declared exactly once/);
      assert.doesNotMatch(duplicateOwner.stderr, /Unregistered IDs/);

      rmSync(join(tmpDir, 'openspec/changes/duplicate-owner-change'), { recursive: true, force: true });
      writeNewCapabilityDelta(tmpDir, 'owner-change', 'governance/owner-capability', 'OWN', ['OWN-001']);
      writeReservation(tmpDir, 'owner-change', 'governance/owner-capability', 'OWN', ['OWN-001']);
      writeNewCapabilityDelta(tmpDir, 'referencing-change', 'governance/referencing-capability', 'REF', [], 'This references OWN-001 from another active change.');
      const unowned = runRequirementCheck(tmpDir);
      assert.equal(unowned.status, 1, unowned.stdout + unowned.stderr);
      assert.match(unowned.stderr, /Unregistered IDs/);
      assert.match(unowned.stderr, /OWN-001/);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

function runRequirementCheck(tmpDir, ...args) {
  return spawnSync('node', [CHECK_REQS, tmpDir, ...args], { encoding: 'utf-8' });
}

function exists(root, relativePath) {
  try {
    return readFileSync(join(root, relativePath), 'utf8') !== undefined;
  } catch {
    return false;
  }
}

function writeNewCapabilityDelta(tmpDir, change, capabilityPath, prefix, ids, prose = '') {
  const target = join(tmpDir, 'openspec/changes', change, 'specs', ...capabilityPath.split('/'), 'spec.md');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, [
    '# Delta',
    ...(ids.length > 0 ? [`> req: ${ids.join(', ')}`] : []),
    '',
    '## ADDED Requirements',
    '',
    '### Requirement: Fixture behavior',
    `The ${prefix} fixture SHALL establish the requested identity.`,
    prose,
    '',
  ].filter(Boolean).join('\n'));
}

function writeReservation(tmpDir, change, capabilityPath, prefix, ids) {
  const target = join(tmpDir, 'openspec/changes', change, 'requirement-reservation.yaml');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, [
    'schema_version: requirement-reservation/v1',
    `change: ${change}`,
    'reservations:',
    `  - capability_path: ${capabilityPath}`,
    `    prefix: ${prefix}`,
    '    requirements:',
    ...ids.map((id) => `      - ${id}`),
    '',
  ].join('\n'));
  return target;
}

function writeRegistry(tmpDir, { prefixes, ids }) {
  writeFileSync(join(tmpDir, 'openspec/governance/req-registry.yaml'), [
    'prefixes:',
    ...Object.entries(prefixes).map(([prefix, path]) => `  ${prefix}: ${path}`),
    '',
    ...Object.entries(ids).map(([id, description]) => `${id}: ${description}`),
    '',
  ].join('\n'));
}

function writeMainSpec(tmpDir, capabilityPath, ids) {
  const target = join(tmpDir, 'openspec/specs', ...capabilityPath.split('/'), 'spec.md');
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, [
    '# Fixture Specification',
    `> req: ${ids.join(', ')}`,
    '',
    '## Purpose',
    '',
    'Define a synchronized fixture capability for requirement reservation checks.',
    '',
    '## Requirements',
    '',
    '### Requirement: Fixture behavior',
    '',
    'The fixture SHALL provide a canonical declaration.',
    '',
  ].join('\n'));
}

function seedGovernanceFixture(tmpDir, options = {}) {
  mkdirSync(join(tmpDir, 'openspec/governance'), { recursive: true });
  mkdirSync(join(tmpDir, 'openspec/specs/agent/demo-capability'), { recursive: true });
  mkdirSync(join(tmpDir, 'openspec/changes/demo-change/specs/agent/demo-capability'), { recursive: true });

  writeFileSync(
    join(tmpDir, 'openspec/governance/req-registry.yaml'),
    'prefixes:\n  ABC: agent/demo-capability\n\nABC-001: demo capability\n',
  );

  writeFileSync(
    join(tmpDir, 'openspec/specs/agent/demo-capability/spec.md'),
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
    join(tmpDir, 'openspec/changes/demo-change/specs/agent/demo-capability/spec.md'),
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
