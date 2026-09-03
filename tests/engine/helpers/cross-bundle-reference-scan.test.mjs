// @impl BUI-003: cross-bundle-reference-scan — Unit test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanFile, collectContentFiles, scanBundle } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/cross-bundle-reference-scan.mjs';

function scanTempFile(ownBundleName, fileName, content) {
  const tmp = mkdtempSync(join(tmpdir(), 'scan-test-'));
  try {
    const dir = join(tmp, 'seed_topics');
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, fileName);
    writeFileSync(filePath, content);
    return scanFile(filePath, ownBundleName);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

describe('cross-bundle-reference-scan', () => {
  it('scanFile finds cross-references', () => {
    const result = scanTempFile('my-bundle', 'evidence.md',
      'Some text referencing dpt_rb_other-bundle/final/final_v7.md and dpt_rb_another-bundle.');
    assert.ok(result.citedBundles.includes('other-bundle'));
    assert.ok(result.citedBundles.includes('another-bundle'));
  });

  it('scanFile excludes own bundle name', () => {
    const result = scanTempFile('my-bundle', 'plan.md',
      'My own bundle dpt_rb_my-bundle is the current bundle.');
    assert.equal(result.citedBundles.length, 0);
  });

  it('scanFile returns empty on no references', () => {
    const result = scanTempFile('my-bundle', 'readme.md', 'Plain text with no citations.');
    assert.equal(result.citedBundles.length, 0);
  });

  it('scanFile handles nonexistent file gracefully', () => {
    const result = scanFile('/nonexistent/file.md', 'my-bundle');
    assert.equal(result.citedBundles.length, 0);
  });

  it('collectContentFiles with injected fs returns expected paths', () => {
    const mockReaddirSync = (dir, _opts) => {
      if (dir.endsWith('seed_topics')) return [{ name: '01_topic.md', isFile: () => true, isDirectory: () => false }];
      if (dir.endsWith('reference')) return [{ name: 'ref.md', isFile: () => true, isDirectory: () => false }];
      if (dir.endsWith('artifacts')) return [{ name: 'wave0', isFile: () => false, isDirectory: () => true }];
      if (dir.endsWith('wave0')) return [{ name: 'source.yaml', isFile: () => true, isDirectory: () => false }];
      if (dir.endsWith('final')) return [{ name: 'final.md', isFile: () => true, isDirectory: () => false }];
      return [];
    };
    const mockStatSync = (p) => {
      if (p.endsWith('rb_plan.md')) return { isFile: () => true };
      throw new Error('ENOENT');
    };
    const files = collectContentFiles('/bundle', { readdirSync: mockReaddirSync, statSync: mockStatSync });
    assert.ok(files.length >= 2);
    assert.ok(files.some((f) => f.endsWith('rb_plan.md')));
    assert.ok(files.some((f) => f.endsWith('01_topic.md')));
  });

  it('scanBundle with no content files returns empty', () => {
    const results = scanBundle('/bundle', 'my-bundle', {
      readdirSync: () => [],
      statSync: () => { throw new Error('ENOENT'); },
    });
    assert.equal(results.length, 0);
  });

  it('scanBundle finds reference in real temp bundle', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'scan-bundle-'));
    try {
      // Create rb_plan.md with a cross-reference
      writeFileSync(join(tmp, 'rb_plan.md'),
        '# Plan\nCompare with dpt_rb_comparison-bundle.');
      // Create reference dir with a ref file
      mkdirSync(join(tmp, 'reference'));
      writeFileSync(join(tmp, 'reference', 'compare.md'),
        'Baseline is dpt_rb_comparison-bundle/final/final_v7.md');
      // Create final dir
      mkdirSync(join(tmp, 'final'));
      writeFileSync(join(tmp, 'final', 'report.md'),
        'Our findings differ from dpt_rb_comparison-bundle.');
      // Run scan
      const results = scanBundle(tmp, 'my-bundle');
      assert.equal(results.length, 3); // plan + reference/compare.md + final/report.md
      for (const r of results) {
        assert.ok(r.citedBundles.includes('comparison-bundle'));
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});