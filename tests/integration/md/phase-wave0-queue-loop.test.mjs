// phase-wave0.test.mjs — structural + cross-node consistency for phase-wave0.md
// @impl AGQ-007, RWP-001
//
// Verifies the Agent can correctly LOAD this phase node:
//   - Frontmatter is legal YAML with required identity keys
//   - Gate declaration is valid (definition exists, in transition table)
//   - Referenced files exist on disk
//   - Next phase file exists (chain continuity)
//   - 9-section body structure is present
//
// Does NOT check specific wording, JSON field names, or ASCII diagrams.
// Those are JS-enforced at runtime (Zod schemas, engine validation, gate CLI).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkFrontmatterParsable,
  checkNodeIdentity,
  checkStopDeclared,
  checkGateDefinitionExists,
  checkGateInTransitionTable,
  checkReferencesExist,
  checkNextPhaseExists,
  checkSections,
} from '../../helpers/md-phase-checks.mjs';

const PHASE_MD = path.resolve(import.meta.dirname, '../../../DPT_FRAMEWORK/workflows/nodes/phases/phase-wave0.md');
const body = readFileSync(PHASE_MD, 'utf-8');

// ── frontmatter: structural ──────────────────────────────────────────

describe('frontmatter — parseable, identity, gate, stop', () => {
  const result = checkFrontmatterParsable(body, 'phase-wave0');
  const parsed = result.ok ? result.parsed : null;

  it('frontmatter is legal YAML', () => {
    assert.ok(result.ok, result.detail);
  });

  it('node_type=phase, id, gate, stop declared', () => {
    const issues = [
      ...checkNodeIdentity(parsed, { node_type: 'phase', id: 'phase-wave0', gate: 'wave0-complete' }),
      ...checkStopDeclared(parsed),
    ];
    assert.deepEqual(issues, [], issues.join('; '));
  });

  it('gate definition file exists', () => {
    const r = checkGateDefinitionExists(parsed);
    assert.ok(r.ok, r.detail);
  });

  it('gate is in transition table', () => {
    const r = checkGateInTransitionTable(parsed);
    assert.ok(r.ok, r.detail);
  });

  it('requires + suggested_context files exist', () => {
    const issues = checkReferencesExist(parsed);
    assert.deepEqual(issues, [], issues.join('; '));
  });

  it('next phase file exists (chain continuity)', () => {
    const issues = checkNextPhaseExists(parsed);
    assert.deepEqual(issues, [], issues.join('; '));
  });
});

// ── body: section structure ──────────────────────────────────────────

describe('body — 9-section structure', () => {
  it('all 9 required sections present', () => {
    const missing = checkSections(body, 'phase-wave0');
    assert.deepEqual(missing, [], missing.join('\n'));
  });
});
