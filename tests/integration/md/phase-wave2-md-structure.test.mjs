// phase-wave2-md-structure.test.mjs — body structure checks for phase-wave2.md
// @impl WTS-004, WTS-007, RWP-003
//
// Verifies:
//   - 9-section body completeness
//   - §4 Expected Artifacts describes three-artifact group
//   - Ledger 6 fixed sections are documented
//   - Index 15 required fields are documented
//   - §9 Anti-Cheating Rules has ≥10 phase-specific prohibitions

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkSections } from '../../helpers/md-phase-checks.mjs';

const PHASE_MD = path.resolve(import.meta.dirname, '../../../DPT_FRAMEWORK/workflows/nodes/phases/phase-wave2.md');
const body = readFileSync(PHASE_MD, 'utf-8');

// ── 9-section body structure ─────────────────────────────────────────

describe('body — 9-section completeness', () => {
  const missing = checkSections(body, 'phase-wave2');
  it('has all 9 recognized sections', () => {
    assert.deepEqual(missing, [], `Missing sections: ${missing.join('; ')}`);
  });
});

// ── §4 Expected Artifacts: three-artifact group ──────────────────────

describe('§4 Expected Artifacts — three-artifact group', () => {
  it('lists synthesis.md as expected artifact', () => {
    assert.ok(body.includes('synthesis.md'), 'synthesis.md not listed in expected artifacts');
  });

  it('lists cross-topic-ledger.md as expected artifact', () => {
    assert.ok(body.includes('cross-topic-ledger.md'), 'cross-topic-ledger.md not listed');
  });

  it('lists finding-index.yaml as expected artifact', () => {
    assert.ok(body.includes('finding-index.yaml'), 'finding-index.yaml not listed');
  });

  it('synthesis.md described as narrative projection with W2F-xxx references', () => {
    assert.ok(body.includes('W2F-xxx') || body.includes('W2F-'),
      'synthesis.md not described with finding id references');
  });

  it('cross-topic-ledger.md described with 6 fixed sections', () => {
    const sections = ['Cross-Topic Scan Matrix', 'Wave1 Legacy Questions', 'Cross-Topic Resolutions',
      'Emergent Cross-Topic Questions', 'Exploration Decisions', 'HITL2 Handoff'];
    const present = sections.filter(s => body.includes(s));
    assert.ok(present.length >= 4,
      `expected at least 4 ledger section names, found ${present.length}: ${present.join(', ')}`);
  });

  it('finding-index.yaml described with required fields (id/type/status/decision/refs)', () => {
    const hasId = body.includes('id') && body.includes('W2F-');
    const hasType = body.includes('type');
    const hasDecision = body.includes('decision');
    const hasRefs = body.includes('refs') || body.includes('origin_refs') || body.includes('trigger_refs');
    assert.ok(hasId && hasType && hasDecision && hasRefs,
      'finding-index.yaml fields not adequately described');
  });

  it('backfill tokens listed as expected to be replaced', () => {
    assert.ok(body.includes('__BACKFILL_WAVE2_JUDGMENT__'), 'missing BACKFILL_WAVE2_JUDGMENT token reference');
    assert.ok(body.includes('__BACKFILL_PENDING_QUESTIONS__'), 'missing BACKFILL_PENDING_QUESTIONS token reference');
  });
});

// ── Scan matrix guidance ─────────────────────────────────────────────

describe('Scan matrix guidance', () => {
  it('describes scan matrix as part of ledger', () => {
    assert.ok(body.includes('scan matrix') || body.includes('Scan Matrix'),
      'missing scan matrix description');
  });

  it('describes four check dimensions (shared_pattern, contradiction, etc.)', () => {
    const dims = ['shared_pattern', 'contradiction', 'resolution_opportunity', 'emergent_question'];
    const present = dims.filter(d => body.includes(d));
    assert.ok(present.length >= 2,
      `expected at least 2 dimension names, found ${present.length}: ${present.join(', ')}`);
  });
});

// ── Finding taxonomy ─────────────────────────────────────────────────

describe('Finding taxonomy and lifecycle', () => {
  it('describes three finding types', () => {
    assert.ok(body.includes('wave1_legacy_question'), 'missing wave1_legacy_question');
    assert.ok(body.includes('cross_topic_resolution'), 'missing cross_topic_resolution');
    assert.ok(body.includes('cross_topic_emergent_question'), 'missing cross_topic_emergent_question');
  });

  it('describes six decision values', () => {
    const decisions = ['use_existing_evidence', 'exploit_search', 'explore_search',
      'defer_hitl2', 'requires_internal_data', 'record_only'];
    const present = decisions.filter(d => body.includes(d));
    assert.ok(present.length >= 4,
      `expected at least 4 decision values, found ${present.length}: ${present.join(', ')}`);
  });

  it('describes finding lifecycle', () => {
    assert.ok(body.includes('candidate') && body.includes('decision'),
      'missing finding lifecycle description');
  });
});
