// @impl FDB-002 — self-contained final backing: Evidence Map backing may resolve
// to a materialized detail file inside the version-bound auxiliary directory
// matching the report's own version (e.g. final/final_v4/07-evidence-details.md
// referenced from final/final_v4.md). Unit-class deterministic contract tests.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { evaluateFinalDeliveryBacking } from '../../DEEP_RESEARCH_HARNESS/engine/helpers/final-delivery-backing.mjs';

const roots = [];

function createBundle() {
  const bundle = mkdtempSync(path.join(tmpdir(), 'dpt-selfback-'));
  roots.push(bundle);
  for (const d of ['final/final_v4', 'final/final_v3', 'reference', '_logs']) {
    mkdirSync(path.join(bundle, d), { recursive: true });
  }
  return bundle;
}

function mainReport(backingHref) {
  return `## Evidence Map\n\n| Finding ID | Declared Key Finding | Submitted Backing |\n| --- | --- | --- |\n| W2F-021 | test finding | [${backingHref}](${backingHref}) |\n`;
}

describe('self-contained final backing (FDB-002)', () => {
  it('accepts backing inside the same-version auxiliary directory', () => {
    const bundle = createBundle();
    writeFileSync(path.join(bundle, 'final/final_v4', '07-evidence-details.md'), '## Evidence Map\n\ndetail\n');
    const r = evaluateFinalDeliveryBacking({
      bundlePath: bundle,
      target: 'final/final_v4.md',
      markdown: mainReport('final_v4/07-evidence-details.md'),
    });
    assert.equal(r.check.passed, true, JSON.stringify(r.inspect));
  });

  it('rejects backing inside another version auxiliary directory', () => {
    const bundle = createBundle();
    writeFileSync(path.join(bundle, 'final/final_v3', '07-evidence-details.md'), '## Evidence Map\n\ndetail\n');
    const r = evaluateFinalDeliveryBacking({
      bundlePath: bundle,
      target: 'final/final_v4.md',
      markdown: mainReport('final_v3/07-evidence-details.md'),
    });
    assert.equal(r.check.passed, false);
    assert.equal(r.inspect[0].code, 'self_contained_backing_version_mismatch');
  });

  it('rejects a missing self-contained backing file', () => {
    const bundle = createBundle();
    const r = evaluateFinalDeliveryBacking({
      bundlePath: bundle,
      target: 'final/final_v4.md',
      markdown: mainReport('final_v4/07-evidence-details.md'),
    });
    assert.equal(r.check.passed, false);
    assert.equal(r.inspect[0].code, 'backing_file_missing');
  });

  it('still rejects non-auxiliary final paths as backing', () => {
    const bundle = createBundle();
    writeFileSync(path.join(bundle, 'final', 'other.md'), 'x');
    const r = evaluateFinalDeliveryBacking({
      bundlePath: bundle,
      target: 'final/final_v4.md',
      markdown: mainReport('final/other.md'),
    });
    assert.equal(r.check.passed, false);
    // Rejected either as a missing file or as a prohibited final output;
    // the point is a non-auxiliary final path is never accepted as backing.
    assert.ok(['backing_file_missing', 'final_output_not_backing'].includes(r.inspect[0].code), r.inspect[0].code);
  });

  it('accepts an auxiliary-target report backing within its own directory', () => {
    const bundle = createBundle();
    writeFileSync(path.join(bundle, 'final/final_v4', '07-evidence-details.md'), '## Evidence Map\n\ndetail\n');
    const r = evaluateFinalDeliveryBacking({
      bundlePath: bundle,
      target: 'final/final_v4/02-per-chip-evidence.md',
      markdown: mainReport('07-evidence-details.md'),
    });
    assert.equal(r.check.passed, true, JSON.stringify(r.inspect));
  });
  it('accepts backing inside a labelled same-version auxiliary directory', () => {
    const bundle = mkdtempSync(path.join(tmpdir(), 'dpt-selfback-lbl-'));
    roots.push(bundle);
    mkdirSync(path.join(bundle, 'final/final_technical_deep_dive_v2'), { recursive: true });
    writeFileSync(path.join(bundle, 'final/final_technical_deep_dive_v2', '07-evidence-details.md'), '## Evidence Map\n\ndetail\n');
    const r = evaluateFinalDeliveryBacking({
      bundlePath: bundle,
      target: 'final/final_technical_deep_dive_v2.md',
      markdown: mainReport('final_technical_deep_dive_v2/07-evidence-details.md'),
    });
    assert.equal(r.check.passed, true, JSON.stringify(r.inspect));
  });
});
