// @impl ARP-004, RRD-008, POF-001

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  allocateFinalReportTarget,
  readFinalReportInventory,
  resolveFinalReportSeries,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/final-report-series.mjs';

function file(name) {
  return { name, kind: 'file', readable: true };
}

function resolve(...names) {
  return resolveFinalReportSeries(names.map(file));
}

describe('Final primary report series', () => {
  it('allocates the canonical base from an empty primary inventory and ignores a base feature', () => {
    const series = resolve();
    const allocation = allocateFinalReportTarget(series, { feature: 'executive_summary' });

    assert.equal(series.valid, true);
    assert.equal(series.classification, 'empty');
    assert.deepEqual(series.primary_entries, []);
    assert.equal(allocation.target, 'final/final.md');
    assert.equal(allocation.version, 0);
    assert.equal(allocation.feature, null);
  });

  it('derives one globally contiguous sequence across labelled and unlabelled revisions', () => {
    const series = resolve('final.md', 'final_v1.md', 'final_technical_deep_dive_v2.md');
    const allocation = allocateFinalReportTarget(series);

    assert.equal(series.valid, true);
    assert.equal(series.classification, 'modern');
    assert.deepEqual(series.primary_entries.map((entry) => [entry.target, entry.version, entry.feature]), [
      ['final/final.md', 0, null],
      ['final/final_v1.md', 1, null],
      ['final/final_technical_deep_dive_v2.md', 2, 'technical_deep_dive'],
    ]);
    assert.equal(series.latest.target, 'final/final_technical_deep_dive_v2.md');
    assert.equal(allocation.target, 'final/final_v3.md');
    assert.equal(allocateFinalReportTarget(series, { feature: 'reader_focus' }).target, 'final/final_reader_focus_v3.md');
  });

  it('keeps a single non-reserved Markdown report as read-only legacy version zero', () => {
    const series = resolve('historical-report.md', 'notes.txt');
    const allocation = allocateFinalReportTarget(series, { feature: 'technical' });

    assert.equal(series.valid, true);
    assert.equal(series.classification, 'legacy');
    assert.equal(series.base.target, 'final/historical-report.md');
    assert.equal(series.latest.version, 0);
    assert.equal(allocation.target, 'final/final_technical_v1.md');
    assert.equal(allocation.version, 1);
  });

  it('continues a single legacy version zero with globally contiguous canonical revisions', () => {
    const series = resolve('historical-report.md', 'final_v1.md', 'final_technical_deep_dive_v2.md');

    assert.equal(series.valid, true);
    assert.equal(series.classification, 'legacy');
    assert.deepEqual(series.primary_entries.map((entry) => [entry.target, entry.version]), [
      ['final/historical-report.md', 0],
      ['final/final_v1.md', 1],
      ['final/final_technical_deep_dive_v2.md', 2],
    ]);
    assert.equal(allocateFinalReportTarget(series).target, 'final/final_v3.md');
  });

  it('treats non-reserved Final files as supplementary once the modern base exists', () => {
    const series = resolveFinalReportSeries([
      file('final.md'),
      file('older-report.md'),
      file('final_v1.md'),
      file('readme.txt'),
      { name: 'nested', kind: 'directory', readable: false },
    ]);

    assert.equal(series.valid, true);
    assert.equal(series.classification, 'modern');
    assert.equal(series.entries.find((entry) => entry.name === 'older-report.md').classification, 'supplementary');
    assert.equal(series.entries.find((entry) => entry.name === 'nested').classification, 'supplementary');
    assert.equal(series.latest.target, 'final/final_v1.md');
    assert.equal(allocateFinalReportTarget(series).target, 'final/final_v2.md');
  });

  it('fails closed for unsafe direct-root entries and case-fold collisions', () => {
    const unsafe = resolveFinalReportSeries([
      file('final.md'),
      { name: 'report-link.md', kind: 'symlink', readable: false },
    ]);
    const collision = resolve('final.md', 'FINAL.MD');

    assert.equal(unsafe.valid, false);
    assert.equal(unsafe.blockers[0].code, 'unsafe_entry');
    assert.equal(collision.valid, false);
    assert.ok(collision.blockers.some((entry) => entry.code === 'case_fold_collision'));
    assert.ok(collision.blockers.some((entry) => entry.code === 'reserved_name_malformed'));
  });

  it('fails closed for ambiguous legacy candidates and malformed reserved names', () => {
    const ambiguous = resolve('report-a.md', 'report-b.md');
    const malformed = resolve('final_v01.md');

    assert.equal(ambiguous.valid, false);
    assert.deepEqual(ambiguous.blockers[0], {
      code: 'ambiguous_legacy_base',
      detail: 'More than one non-reserved root-level Markdown file could be legacy version zero.',
      entries: ['report-a.md', 'report-b.md'],
    });
    assert.equal(malformed.valid, false);
    assert.ok(malformed.blockers.some((entry) => entry.code === 'reserved_name_malformed'));
  });

  it('fails closed for orphan, duplicate, and gapped revisions without inferring history', () => {
    const orphan = resolve('final_v1.md');
    const duplicate = resolve('final.md', 'final_v1.md', 'final_label_v1.md');
    const gap = resolve('final.md', 'final_v2.md');

    assert.equal(orphan.valid, false);
    assert.ok(orphan.blockers.some((entry) => entry.code === 'orphan_revision'));
    assert.equal(duplicate.valid, false);
    assert.ok(duplicate.blockers.some((entry) => entry.code === 'duplicate_revision'));
    assert.equal(gap.valid, false);
    assert.ok(gap.blockers.some((entry) => entry.code === 'non_contiguous_revisions'));

    const blockedAllocation = allocateFinalReportTarget(gap);
    assert.equal(blockedAllocation.available, false);
    assert.equal(blockedAllocation.target, null);
    assert.ok(blockedAllocation.blockers.some((entry) => entry.code === 'non_contiguous_revisions'));
  });

  it('returns the primary classification and complete deterministic safe inventory together', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-final-inventory-'));
    const bundle = join(root, 'bundle');
    const finalRoot = join(bundle, 'final');
    try {
      mkdirSync(join(finalRoot, 'supplementary'), { recursive: true });
      writeFileSync(join(finalRoot, 'final.md'), '# Final\n');
      writeFileSync(join(finalRoot, 'supplementary', 'notes.md'), '# Notes\n');

      const inventory = readFinalReportInventory(bundle);
      assert.equal(inventory.primary_series.classification, 'modern');
      assert.deepEqual(inventory.entries.map((entry) => entry.path), [
        'final/final.md',
        'final/supplementary/notes.md',
      ]);
      assert.match(inventory.sha256, /^[0-9a-f]{64}$/);

      symlinkSync(join(finalRoot, 'final.md'), join(finalRoot, 'supplementary', 'unsafe-link.md'));
      assert.throws(() => readFinalReportInventory(bundle), /symlink/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('separates the primary-series witness digest from the whole-tree audit digest', () => {
    const root = mkdtempSync(join(tmpdir(), 'dpt-final-inventory-basis-'));
    const bundle = join(root, 'bundle');
    const finalRoot = join(bundle, 'final');
    try {
      mkdirSync(join(finalRoot, 'topics'), { recursive: true });
      writeFileSync(join(finalRoot, 'final.md'), '# Final base\n');
      writeFileSync(join(finalRoot, 'final_v1.md'), '# Final revision one\n');
      writeFileSync(join(finalRoot, 'topics', 'alpha.md'), '# Topic Alpha\n');

      const before = readFinalReportInventory(bundle);
      assert.equal(before.primary_series.classification, 'modern');
      assert.equal(before.primary_series.primary_entries.length, 2);
      assert.match(before.primary_sha256, /^[0-9a-f]{64}$/);
      assert.notEqual(before.primary_sha256, before.sha256);

      // A non-primary presentation update moves only the whole-tree digest.
      writeFileSync(join(finalRoot, 'topics', 'alpha.md'), '# Topic Alpha (updated)\n');
      const afterNonPrimary = readFinalReportInventory(bundle);
      assert.equal(afterNonPrimary.primary_sha256, before.primary_sha256);
      assert.notEqual(afterNonPrimary.sha256, before.sha256);

      // A primary-series content change moves both digests; the primary
      // witness detects it without any non-primary noise.
      writeFileSync(join(finalRoot, 'final_v1.md'), '# Final revision one (tampered)\n');
      const afterPrimary = readFinalReportInventory(bundle);
      assert.notEqual(afterPrimary.primary_sha256, before.primary_sha256);
      assert.notEqual(afterPrimary.sha256, afterNonPrimary.sha256);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
