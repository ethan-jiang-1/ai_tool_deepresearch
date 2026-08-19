import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { boundFinalWitness, proveNewerFinalAppend } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/handoff-helpers.mjs';
import { readFinalReportInventory } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs';

// POF-001 append-proof truth table. The witness is bound by a C5
// post_final_reentry event's previous_final; primary-scoped events bind the
// primary-series digest in final_inventory_sha256 with an explicit basis
// marker, legacy events bind the whole-tree digest on the same field.

function buildBundle(root, name, { nonPrimary = false, revision = false } = {}) {
  const bundle = join(root, `dpt_rb_${name}`);
  const finalRoot = join(bundle, 'final');
  mkdirSync(join(finalRoot, 'topics'), { recursive: true });
  writeFileSync(join(finalRoot, 'report.md'), '# Delivered Final\n');
  if (revision) writeFileSync(join(finalRoot, 'final_v1.md'), '# Newer revision\n');
  if (nonPrimary) writeFileSync(join(finalRoot, 'topics', 'alpha.md'), '# Topic Alpha\n');
  return bundle;
}

function legacyWitnessFor(inventory) {
  return {
    final_inventory_sha256: inventory.sha256,
  };
}

function primaryWitnessFor(inventory) {
  return {
    final_inventory_sha256: inventory.primary_sha256,
    final_inventory_basis: 'primary_series',
  };
}

describe('boundFinalWitness', () => {
  it('resolves the basis and digest the event bound', () => {
    assert.deepEqual(boundFinalWitness(primaryWitnessFor({ primary_sha256: 'a'.repeat(64) })), {
      basis: 'primary_series',
      digest: 'a'.repeat(64),
    });
    assert.deepEqual(boundFinalWitness(legacyWitnessFor({ sha256: 'b'.repeat(64) })), {
      basis: 'whole_tree',
      digest: 'b'.repeat(64),
    });
  });
});

describe('proveNewerFinalAppend', () => {
  it('primary basis: non-primary drift plus a newer revision is a proven immutable append', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-primary-'));
    try {
      const bound = buildBundle(root, 'bound');
      const boundInventory = readFinalReportInventory(bound);
      const witness = primaryWitnessFor(boundInventory);

      const delivered = buildBundle(root, 'delivered', { nonPrimary: true, revision: true });
      const inventory = readFinalReportInventory(delivered);
      const proof = proveNewerFinalAppend(inventory, witness);
      assert.equal(proof.matched, true);
      assert.equal(proof.basis, 'primary_series');
      assert.deepEqual(proof.removed_targets, ['final/final_v1.md']);
      assert.equal(proof.current_target, 'final/final_v1.md');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('primary basis: non-primary drift with zero appended revisions is delivery pending', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-pending-'));
    try {
      const bound = buildBundle(root, 'bound');
      const witness = primaryWitnessFor(readFinalReportInventory(bound));
      const drifted = buildBundle(root, 'drifted', { nonPrimary: true });
      const proof = proveNewerFinalAppend(readFinalReportInventory(drifted), witness);
      assert.equal(proof.matched, true);
      assert.deepEqual(proof.removed_targets, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('primary basis: primary content tampering blocks without any fallback', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-tamper-'));
    try {
      const bound = buildBundle(root, 'bound');
      const witness = primaryWitnessFor(readFinalReportInventory(bound));
      const tampered = buildBundle(root, 'tampered');
      writeFileSync(join(tampered, 'final', 'report.md'), '# Tampered Final\n');
      const proof = proveNewerFinalAppend(readFinalReportInventory(tampered), witness);
      assert.equal(proof.matched, false);
      assert.equal(proof.basis, 'primary_series');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('legacy basis: exact whole-tree proof still passes without non-primary drift', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-legacy-exact-'));
    try {
      const bound = buildBundle(root, 'bound');
      const witness = legacyWitnessFor(readFinalReportInventory(bound));
      const delivered = buildBundle(root, 'delivered', { revision: true });
      const proof = proveNewerFinalAppend(readFinalReportInventory(delivered), witness);
      assert.equal(proof.matched, true);
      assert.equal(proof.basis, 'whole_tree');
      assert.deepEqual(proof.removed_targets, ['final/final_v1.md']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('legacy basis: non-primary drift falls back to the structural primary-series proof', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-fallback-'));
    try {
      const bound = buildBundle(root, 'bound');
      const witness = legacyWitnessFor(readFinalReportInventory(bound));
      const delivered = buildBundle(root, 'delivered', { nonPrimary: true, revision: true });
      const proof = proveNewerFinalAppend(readFinalReportInventory(delivered), witness);
      assert.equal(proof.matched, true);
      assert.equal(proof.basis, 'legacy_structural_fallback');
      assert.deepEqual(proof.removed_targets, ['final/final_v1.md']);
      assert.equal(proof.current_target, 'final/final_v1.md');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('legacy basis: a retained series that is no longer structurally valid blocks the fallback', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-fallback-invalid-'));
    try {
      const bound = buildBundle(root, 'bound');
      const witness = legacyWitnessFor(readFinalReportInventory(bound));
      // Base removed while a revision remains: the retained series is an
      // orphan revision chain and cannot be accepted structurally.
      const broken = buildBundle(root, 'broken', { nonPrimary: true, revision: true });
      rmSync(join(broken, 'final', 'report.md'));
      const brokenInventory = readFinalReportInventory(broken);
      const proof = proveNewerFinalAppend(brokenInventory, witness);
      assert.equal(proof.matched, false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('legacy basis: exact whole-tree equality with zero removals is delivery pending through the fallback', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-fallback-zero-'));
    try {
      const bound = buildBundle(root, 'bound');
      const witness = legacyWitnessFor(readFinalReportInventory(bound));
      const drifted = buildBundle(root, 'drifted', { nonPrimary: true });
      const proof = proveNewerFinalAppend(readFinalReportInventory(drifted), witness);
      assert.equal(proof.matched, true);
      assert.equal(proof.basis, 'legacy_structural_fallback');
      assert.deepEqual(proof.removed_targets, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
