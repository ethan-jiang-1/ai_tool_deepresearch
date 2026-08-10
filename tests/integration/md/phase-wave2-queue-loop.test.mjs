// phase-wave2-queue-loop.test.mjs — structural checks for phase-wave2.md
// @impl WTS-001, WTS-007
//
// Verifies:
//   - Frontmatter has max_gapfill_iterations and max_gapfill_subagents_per_round
//   - §3 has three-stage structure (§3.1 Filling, §3.2 Execution Loop, §3.3 Closeout+Gate)
//   - §3.1 contains synthesis task card template with producer_rule cross_topic_synthesis
//     and required_receipts covering three artifacts
//   - Wave2 backfill uses the canonical seed-projection packet/writer, not a queue card
//   - Task card priority_class values are from QueueWorkUnitSchema enums
//   - Task card required_receipts use only queue-engine-supported prefixes
//   - §3.2 contains finding triage loop protocol (classify → decision → spawn → JS feedback)

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

const PHASE_MD = path.resolve(import.meta.dirname, '../../../DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md');
const body = readFileSync(PHASE_MD, 'utf-8');

// ── frontmatter ──────────────────────────────────────────────────────

describe('frontmatter — parseable, identity, gate, stop, params', () => {
  const result = checkFrontmatterParsable(body, 'phase-wave2');
  const parsed = result.ok ? result.parsed : null;

  it('frontmatter is legal YAML', () => {
    assert.ok(result.ok, result.detail);
  });

  it('node_type=phase, id=phase-wave2, gate=wave2-complete declared', () => {
    const issues = [
      ...checkNodeIdentity(parsed, { node_type: 'phase', id: 'phase-wave2', gate: 'wave2-complete' }),
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

  it('no longer has max_gapfill_iterations (replaced by Q re-fill loop)', () => {
    assert.ok(parsed, 'frontmatter not parsed');
    assert.strictEqual(parsed.max_gapfill_iterations, undefined,
      'max_gapfill_iterations should be absent — gap-fill convergence is now handled by §3.3.2 Quality Re-Fill Loop (max 3 attempts + no-progress escalation)');
  });

  it('no longer has max_gapfill_subagents_per_round (replaced by Q re-fill loop)', () => {
    assert.ok(parsed, 'frontmatter not parsed');
    assert.strictEqual(parsed.max_gapfill_subagents_per_round, undefined,
      'max_gapfill_subagents_per_round should be absent — supplementary search is now managed through Queue task cards, not manual spawn limits');
  });
});

// ── §3 three-stage structure ─────────────────────────────────────────

describe('§3 Allowed Actions — three-stage queue-driven structure', () => {
  it('has §3.1 (Filling) section', () => {
    assert.ok(body.includes('§3.1') || body.includes('3.1'), 'missing §3.1 Filling section');
  });

  it('has §3.2 (Execution Loop) section', () => {
    assert.ok(body.includes('§3.2') || body.includes('3.2'), 'missing §3.2 Execution Loop section');
  });

  it('has §3.3 (Closeout + Gate) section', () => {
    assert.ok(body.includes('§3.3') || body.includes('3.3'), 'missing §3.3 Closeout+Gate section');
  });

  it('§3.1 references producer_rule cross_topic_synthesis', () => {
    assert.ok(body.includes('cross_topic_synthesis'), 'missing cross_topic_synthesis producer_rule');
  });

  it('uses the canonical seed-projection writer for Wave2 backfill rather than a retired queue rule', () => {
    assert.match(body, /wave_projection\/apply_seed_projection/);
    assert.match(body, /operate-topic-state\.md/);
    assert.match(body, /__BACKFILL_WAVE2_JUDGMENT__/);
    assert.doesNotMatch(body, /seed_topic_backfill_wave2/);
  });

  it('synthesis task card required_receipts covers three artifacts', () => {
    assert.ok(body.includes('synthesis.md') && body.includes('cross-topic-ledger.md') && body.includes('finding-index.yaml'),
      'missing three-artifact references in required_receipts');
  });

  it('queue task priority_class values remain within the active producer set', () => {
    assert.ok(body.includes('P2_close_open_loop'), 'missing P2_close_open_loop');
    assert.ok(body.includes('P1_state_or_gate_repair'), 'missing P1_state_or_gate_repair');
    assert.doesNotMatch(body, /P4_progressive_artifact_or_seed_backfill/);
  });

  it('required_receipts use file: prefix (engine-supported)', () => {
    const fileReceipts = body.match(/file:/g);
    assert.ok(fileReceipts && fileReceipts.length >= 4, 'expected at least 4 file: receipt references');
  });

  it('§3.2 contains finding triage loop protocol', () => {
    assert.ok(body.includes('finding triage') || body.includes('Finding Triage'),
      'missing finding triage loop protocol');
  });

  it('§3.2 references JS feedback checkpoints (L0/L1)', () => {
    assert.ok(body.includes('L0') && body.includes('L1'), 'missing L0/L1 feedback checkpoint references');
  });

  it('§3.2 references convergence criteria', () => {
    assert.ok(body.includes('收敛') || body.includes('convergence') || body.includes('converge'),
      'missing convergence criteria');
  });

  it('§3.2 references dpt-topic-scout sub-agent spawn', () => {
    assert.ok(body.includes('dpt-topic-scout'), 'missing dpt-topic-scout sub-agent reference');
  });
});

// ── §9 Anti-Cheating Rules ───────────────────────────────────────────

describe('Anti-Cheating Rules', () => {
  it('has at least 10 anti-cheating rules', () => {
    const antiSection = body.indexOf('Anti-Cheating');
    assert.ok(antiSection > 0, 'missing Anti-Cheating Rules section');
    const sectionBody = body.slice(antiSection);
    const rules = sectionBody.match(/禁止/g);
    assert.ok(rules && rules.length >= 10,
      `expected at least 10 anti-cheating rules, found ${rules ? rules.length : 0}`);
  });
});
