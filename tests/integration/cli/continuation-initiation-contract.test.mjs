// Canonical integration entry for the continuation-initiation verification claim.
// Inventory/wiring test: asserts the nine owned suites exist and are covered
// by the canonical discovery glob (tests/**/*.test.mjs) WITHOUT importing
// them, so each owned suite executes exactly once under canonical discovery.
// Previously this file re-executed all nine suites as an import-aggregator
// (~101.5s / 420 child-process launches — see
// _backlog/_done/_closed_plans/slow-test-suite-audit-and-remediation.md §"Research Progress").
// @impl SWE-001, SWE-006, CPT-001, CPT-003, DEW-003, GSK-006, CHI-001

import assert from 'node:assert/strict';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const OWNED_SUITES = [
  'tests/integration/cli/advance-status.test.mjs',
  'tests/integration/cli/enter-phase.test.mjs',
  'tests/integration/cli/check-gate-rerun-ready.test.mjs',
  'tests/integration/cli/check-gate-seed-topics-ready.test.mjs',
  'tests/integration/cli/check-gate-wave0-complete.test.mjs',
  'tests/integration/cli/check-gate-wave1-complete.test.mjs',
  'tests/integration/cli/check-gate-wave2-complete.test.mjs',
  'tests/integration/cli/operate-work-unit.test.mjs',
  'tests/integration/cli/transition-integrity.test.mjs',
];

// Mirrors the canonical discovery glob: find tests/ -name '*.test.mjs'
// -not -path '*/.test-*'
// find does not follow symlinked directories; skip them here too
// (tests/fixtures/DEEP_RESEARCH_HARNESS/* are symlinks into the harness).
function discoveredTestFiles(baseDir, prefix) {
  const out = [];
  for (const entry of readdirSync(baseDir)) {
    if (entry.startsWith('.test-')) continue; // disposable output dirs (as find)
    const full = path.join(baseDir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    const st = lstatSync(full);
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) out.push(...discoveredTestFiles(full, rel));
    else if (entry.endsWith('.test.mjs')) out.push(rel);
  }
  return out;
}

describe('continuation-initiation verification claim inventory', () => {
  it('owns nine canonically discovered suites without re-executing them', () => {
    const discovered = new Set(discoveredTestFiles(path.join(REPO_ROOT, 'tests'), 'tests'));
    for (const suite of OWNED_SUITES) {
      assert.ok(existsSync(path.join(REPO_ROOT, suite)), `owned suite missing: ${suite}`);
      assert.ok(discovered.has(suite), `owned suite not covered by canonical discovery: ${suite}`);
    }
  });
});
