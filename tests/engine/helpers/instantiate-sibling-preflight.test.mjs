// @impl CMI-010: instantiate-sibling-preflight — Unit test
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { siblingPreflight } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/instantiate-sibling-preflight.mjs';

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'preflight-test-'));
  try { fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

function createStatus(dir, name, state, currentGate = 'readiness_passed') {
  const bundleDir = join(dir, `dpt_rb_${name}`);
  mkdirSync(bundleDir, { recursive: true });
  writeFileSync(join(bundleDir, 'rb_status.json'), JSON.stringify({
    bundle: name,
    current_mode: 'execution',
    state,
    current_gate: currentGate,
    next_gate: 'none',
    current_node: state === 'completed' && currentGate === 'readiness_passed'
      ? 'phases/phase-final.md' : 'phases/phase-wave1.md',
  }));
}

describe('instantiate-sibling-preflight', () => {
  it('flags name-similar sibling (x vs x-v2)', () => {
    withTempDir((dir) => {
      createStatus(dir, 'glm-5-3-deepseek-v4-domestic-chips', 'completed', 'readiness_passed');
      // x-v2 requested while x exists (nameSimilar even if x is Final)
      const result = siblingPreflight(dir, 'glm-5-3-deepseek-v4-domestic-chips-v2');
      assert.equal(result.flag, true);
      assert.ok(result.reason.includes('name-similar'));
    });
  });

  it('flags non-Final sibling (completed but different gate)', () => {
    withTempDir((dir) => {
      createStatus(dir, 'active-bundle', 'started', 'seed_topics_ready');
      // Different name but non-Final
      const result = siblingPreflight(dir, 'unrelated-new');
      assert.equal(result.flag, true);
      assert.ok(result.reason.includes('not in Final'));
    });
  });

  it('does not flag Final sibling with no name similarity', () => {
    withTempDir((dir) => {
      createStatus(dir, 'completed-bundle', 'completed', 'readiness_passed');
      const result = siblingPreflight(dir, 'unrelated-new');
      assert.equal(result.flag, false);
      assert.equal(result.sibling, null);
    });
  });

  it('flags missing/unreadable status as non-Final', () => {
    withTempDir((dir) => {
      const bundleDir = join(dir, 'dpt_rb_broken-bundle');
      mkdirSync(bundleDir, { recursive: true });
      writeFileSync(join(bundleDir, 'rb_status.json'), 'not valid json');
      // Name similarity not needed — non-Final alone triggers
      const result = siblingPreflight(dir, 'any-new');
      assert.equal(result.flag, true);
      assert.ok(result.state === 'unreadable_status');
    });
  });

  it('passes with no siblings (first bundle)', () => {
    withTempDir((dir) => {
      const result = siblingPreflight(dir, 'first-bundle');
      assert.equal(result.flag, false);
    });
  });

  it('acknowledge-existing-bundle matches flagged sibling', () => {
    withTempDir((dir) => {
      createStatus(dir, 'existing', 'started', 'seed_topics_ready');
      const result = siblingPreflight(dir, 'existing-v2');
      assert.equal(result.flag, true);
      // The bare name of the flagged sibling is 'existing'
      const flaggedBare = result.sibling.replace(/^dpt_rb_/, '');
      assert.equal(flaggedBare, 'existing');
      assert.ok(result.reason.includes('name-similar'));
    });
  });

  it('targetDir unreadable fails closed', () => {
    const result = siblingPreflight('/nonexistent/path/qwerty12345', 'test');
    assert.equal(result.flag, true);
    assert.equal(result.state, 'read_error');
  });
});