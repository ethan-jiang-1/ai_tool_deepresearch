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

function buildBundle(root, name, { nonPrimary = false, revision = false, modern = false } = {}) {
  const bundle = join(root, `dpt_rb_${name}`);
  const finalRoot = join(bundle, 'final');
  mkdirSync(join(finalRoot, 'topics'), { recursive: true });
  writeFileSync(join(finalRoot, modern ? 'final.md' : 'report.md'), '# Delivered Final\n');
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

  // BUG-247: a primary-scoped witness whose bound byte state no longer
  // exists in any retained prefix (the base bytes were rewritten after
  // binding, mirroring an out-of-band legal reorganization of final/) can
  // never be proven byte-level. The proof falls back to the structural
  // primary-series check — mirroring the legacy whole-tree precedent — and
  // reports its own diagnostic basis instead of blocking forever.
  it('primary basis: unreachable bound bytes with a valid structure fall back structurally', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-primary-fallback-'));
    try {
      const bound = buildBundle(root, 'bound');
      const witness = primaryWitnessFor(readFinalReportInventory(bound));

      const delivered = buildBundle(root, 'delivered', { revision: true });
      writeFileSync(join(delivered, 'final', 'report.md'), '# Reorganized Final\n');
      const proof = proveNewerFinalAppend(readFinalReportInventory(delivered), witness);
      assert.equal(proof.matched, true);
      assert.equal(proof.basis, 'primary_series_structural_fallback');
      assert.deepEqual(proof.removed_targets, ['final/final_v1.md']);
      assert.equal(proof.current_target, 'final/final_v1.md');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('primary basis: unreachable bound bytes with zero appended revisions is delivery pending through the fallback', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-primary-fallback-zero-'));
    try {
      const bound = buildBundle(root, 'bound');
      const witness = primaryWitnessFor(readFinalReportInventory(bound));

      const drifted = buildBundle(root, 'drifted');
      writeFileSync(join(drifted, 'final', 'report.md'), '# Reorganized Final\n');
      const proof = proveNewerFinalAppend(readFinalReportInventory(drifted), witness);
      assert.equal(proof.matched, true);
      assert.equal(proof.basis, 'primary_series_structural_fallback');
      assert.deepEqual(proof.removed_targets, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('primary basis: a retained series that is no longer structurally valid blocks the fallback', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-primary-fallback-invalid-'));
    try {
      const bound = buildBundle(root, 'bound');
      const witness = primaryWitnessFor(readFinalReportInventory(bound));
      // Base removed while a revision remains: the retained series is an
      // orphan revision chain and cannot be accepted structurally.
      const broken = buildBundle(root, 'broken', { revision: true });
      rmSync(join(broken, 'final', 'report.md'));
      const proof = proveNewerFinalAppend(readFinalReportInventory(broken), witness);
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

  // BUG-246: the primary-series binding digest sorts retained primary entries
  // by path with localeCompare, while readSafeRecursiveInventory yields plain
  // byte order. For a modern series (final.md base + final_vN.md revisions)
  // the two orders are reversed, so an un-sorted retained rehash never matched
  // the bound digest. These cases prove the append proof rehashes through the
  // same canonical order the binding used.
  it('primary basis: modern series (final.md base) with one appended revision is a proven immutable append', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-modern-'));
    try {
      const bound = buildBundle(root, 'bound', { modern: true });
      const witness = primaryWitnessFor(readFinalReportInventory(bound));

      const delivered = buildBundle(root, 'delivered', { modern: true, revision: true });
      const proof = proveNewerFinalAppend(readFinalReportInventory(delivered), witness);
      assert.equal(proof.matched, true);
      assert.equal(proof.basis, 'primary_series');
      assert.deepEqual(proof.removed_targets, ['final/final_v1.md']);
      assert.equal(proof.current_target, 'final/final_v1.md');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('primary basis: modern series with two appended revisions removes only the newest', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-modern-v2-'));
    try {
      const bound = buildBundle(root, 'bound', { modern: true, revision: true });
      const witness = primaryWitnessFor(readFinalReportInventory(bound));

      const delivered = buildBundle(root, 'delivered', { modern: true, revision: true });
      writeFileSync(join(delivered, 'final', 'final_v2.md'), '# Rev2\n');
      const proof = proveNewerFinalAppend(readFinalReportInventory(delivered), witness);
      assert.equal(proof.matched, true);
      assert.equal(proof.basis, 'primary_series');
      assert.deepEqual(proof.removed_targets, ['final/final_v2.md']);
      assert.equal(proof.current_target, 'final/final_v2.md');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // BUG-247 boundary on a modern series: byte-level tampering that leaves
  // the series structurally valid no longer blocks the proof alone — the
  // exact bound-basis match still fails (the sort fix did not relax byte
  // checks), but the structural fallback accepts the retained series with
  // its own warned diagnostic basis. Blocking now requires a structurally
  // broken retained series.
  it('primary basis: modern series base tampering falls back structurally without an exact match', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-proof-modern-tamper-'));
    try {
      const bound = buildBundle(root, 'bound', { modern: true });
      const witness = primaryWitnessFor(readFinalReportInventory(bound));

      const tampered = buildBundle(root, 'tampered', { modern: true, revision: true });
      writeFileSync(join(tampered, 'final', 'final.md'), '# Tampered Final\n');
      const proof = proveNewerFinalAppend(readFinalReportInventory(tampered), witness);
      assert.equal(proof.matched, true);
      assert.equal(proof.basis, 'primary_series_structural_fallback');
      assert.deepEqual(proof.removed_targets, ['final/final_v1.md']);
      assert.equal(proof.current_target, 'final/final_v1.md');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
