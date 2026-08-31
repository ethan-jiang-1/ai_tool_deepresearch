// spec-sync-locks.test.mjs
// Locks the delta/main sync of change
// repair-doc-and-governance-drift-and-machine-gaps (F-01, F-12~F-19):
// transition-table structure requirement uses node-ref keys and passed/rerun
// states; RET-006 is the finalizer-pointer version; GCO-009 and RET-007~010
// exist; run-entry/version-management carry their level-one titles; req headers
// and registry include the new IDs.
// @impl TRT-002, RET-006, RET-007, RET-008, RET-009, RET-010, GCO-008, GCO-009

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..', '..');

function read(rel) {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

describe('spec sync locks', () => {
  it('TRT-002: transition-table structure requirement is node-ref keyed with passed/rerun states', () => {
    const text = read('openspec/specs/engine/transition-table/spec.md');
    assert.ok(text.includes('`{ node_ref: { state: next_node } }`'), 'node-ref mapping missing');
    assert.ok(text.includes("当前编码的状态为 `'passed'` 与 `'rerun'`"), 'state enum statement missing');
    assert.ok(text.includes("`'failed'` 当前无编码 entry"), 'failed-state note missing');
    assert.ok(!text.includes("当前：`'passed'`、`'failed'`"), 'stale enum list still present');
  });

  it('RET-006: hard-gate requirement points at the finalizer CheckSchema instead of a hand-copied list', () => {
    const text = read('openspec/specs/governance/requirement-traceability/spec.md');
    assert.ok(
      text.includes('The complete hard-gate set,\nits member commands, and its ordering SHALL be defined by exactly one machine surface'),
      'CheckSchema pointer missing',
    );
    assert.ok(!text.includes('1. `node openspec/governance/check-project-reqs.mjs --mode archive'), 'hand-copied list still present');
  });

  it('RET-007~011 and GCO-009 requirements exist in main specs', () => {
    const ret = read('openspec/specs/governance/requirement-traceability/spec.md');
    for (const title of [
      '### Requirement: Aggregated read-only governance health entry',
      '### Requirement: Capability catalog declares current-accepted scope',
      '### Requirement: Main spec files carry a level-one title',
      '### Requirement: Requirement IDs in guidance prose resolve against the registry',
      '### Requirement: Requirement IDs in code implementation tags resolve against the registry',
    ]) {
      assert.ok(ret.includes(title), `${title} missing from requirement-traceability main spec`);
    }
    const gco = read('openspec/specs/governance/guidance-constitution/spec.md');
    assert.ok(gco.includes('### Requirement: Model documents do not present normative rules'), 'GCO-009 missing');
    assert.ok(gco.includes('root hard-rule surface agreement'), 'GCO-008 coverage extension missing');
  });

  it('level-one titles exist on previously untitled main specs', () => {
    assert.ok(read('openspec/specs/bundle/run-entry/spec.md').startsWith('# run-entry'), 'run-entry H1 missing');
    assert.ok(
      read('openspec/specs/governance/version-management/spec.md').startsWith('# version-management'),
      'version-management H1 missing',
    );
  });

  it('req headers and registry include the new IDs', () => {
    assert.ok(
      read('openspec/specs/governance/requirement-traceability/spec.md').includes('> req: RET-001, RET-002, RET-003, RET-004, RET-005, RET-006, RET-007, RET-008, RET-009, RET-010'),
      'RET req header not synced',
    );
    assert.ok(
      read('openspec/specs/governance/guidance-constitution/spec.md').includes('> req: GCO-001, GCO-002, GCO-003, GCO-004, GCO-005, GCO-006, GCO-007, GCO-008, GCO-009'),
      'GCO req header not synced',
    );
    const registry = read('openspec/governance/req-registry.yaml');
    for (const id of ['RET-007', 'RET-008', 'RET-009', 'RET-010', 'GCO-009']) {
      assert.ok(new RegExp(`^${id}: `, 'm').test(registry), `${id} missing from registry`);
    }
  });
});
