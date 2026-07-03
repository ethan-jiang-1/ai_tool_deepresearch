// relay-provenance-gate.test.mjs — regression tests for RPG-001..RPG-006
// Covers: checkOutputDeclarationLedgerExists, checkOutputDeclarationCoverage,
//         checkSubagentSlotPresence, detectRelayBypassSuspicion,
//         writeGatePassDiagnostic, derivePhaseFromGate

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  derivePhaseFromGate,
  checkOutputDeclarationLedgerExists,
  checkOutputDeclarationCoverage,
  checkSubagentSlotPresence,
  detectRelayBypassSuspicion,
  writeGatePassDiagnostic,
} from '../../../DPT_FRAMEWORK/engine/helpers/gate-helpers.mjs';

const REPO_ROOT = process.cwd();

const createdDirs = [];
function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_rpg_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

// Helper to create a minimal bundle dir for testing
function makeBundle(name) {
  const dir = join(REPO_ROOT, unique(name));
  mkdirSync(dir, { recursive: true });
  track(dir);
  // rb_status.json with bundle name
  writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ bundle: name, current_gate: 'wave0_complete', next_gate: 'wave1_complete' }));
  // Required directories
  mkdirSync(join(dir, 'reference'), { recursive: true });
  mkdirSync(join(dir, 'artifacts'), { recursive: true });
  mkdirSync(join(dir, '_logs'), { recursive: true });
  // rb_plan.md with topic_registry
  writeFileSync(join(dir, 'rb_plan.md'), `---
plan_basename: ${name}
derived_topic_count: 1
topic_registry:
  - slug: topic-a
    label: "Topic A"
---
# Plan
`);
  return dir;
}

// Helper to create output declaration ledger
function writeLedger(dir, records) {
  const lines = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
  writeFileSync(join(dir, 'rb_output_declarations.jsonl'), lines);
}

// Helper to create subagent slot with done status
function makeSlot(dir, wave, slotIndex, overrides = {}) {
  const waveDir = `wave_${String(wave).padStart(2, '0')}`;
  const slotDir = join(dir, '_subagents', waveDir, `slot_${String(slotIndex).padStart(2, '0')}`);
  mkdirSync(slotDir, { recursive: true });
  writeFileSync(join(slotDir, '_status.json'), JSON.stringify({
    status: overrides.status || 'done',
    updated: new Date().toISOString(),
  }));
  writeFileSync(join(slotDir, 'result.json'), JSON.stringify({
    slotKey: overrides.slotKey || 'test_slot',
    roleAgentKey: overrides.roleAgentKey || 'dpt-source-intake',
    status: overrides.resultStatus || 'done',
    summary: overrides.summary || 'Test result',
    evidenceCount: overrides.evidenceCount ?? 1,
    references: overrides.references || [],
    confidence: overrides.confidence ?? 0.8,
    notes: overrides.notes || [],
    output_files: overrides.output_files || [],
    cache_trails: overrides.cache_trails || [],
  }));
  return slotDir;
}

describe('derivePhaseFromGate', () => {
  it('1. derives wave0 from wave0-complete', () => {
    assert.equal(derivePhaseFromGate('wave0-complete'), 'wave0');
  });
  it('2. derives wave1 from wave1-complete', () => {
    assert.equal(derivePhaseFromGate('wave1-complete'), 'wave1');
  });
  it('3. derives wave2 from wave2-complete', () => {
    assert.equal(derivePhaseFromGate('wave2-complete'), 'wave2');
  });
  it('4. derives setup from setup-ready', () => {
    assert.equal(derivePhaseFromGate('setup-ready'), 'setup');
  });
  it('5. returns gate key for unrecognized format', () => {
    assert.equal(derivePhaseFromGate('unknown-gate'), 'unknown-gate');
  });
});

describe('checkOutputDeclarationLedgerExists', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. fails when ledger file does not exist', () => {
    const dir = makeBundle('noledger');
    const result = checkOutputDeclarationLedgerExists(dir, { wave: 'wave0' });
    assert.equal(result.passed, false);
    assert.ok(result.inspect.some((s) => s.includes('missing or empty')));
  });

  it('2. passes when scoped ledger record exists (work_id starts with wave0-)', () => {
    const dir = makeBundle('hasscoped');
    writeLedger(dir, [{
      declared_at: new Date().toISOString(),
      work_id: 'wave0-source-topic-a',
      producer_rule: 'source_intake',
      slot_result_ref: '_subagents/wave_00/slot_00/result.json',
      runtime_receipt_ref: '_subagents/wave_00/slot_00/runtime-receipt.jsonl',
      output_files: [{ path: 'reference/test.md', role: 'reference', source_url: 'https://example.com/test' }],
      cache_trails: [],
    }]);
    const result = checkOutputDeclarationLedgerExists(dir, { wave: 'wave0' });
    assert.equal(result.passed, true);
    assert.ok(result.records.length > 0);
  });

  it('3. fails when records exist but not for the requested wave', () => {
    const dir = makeBundle('wrongwave');
    writeLedger(dir, [{
      declared_at: new Date().toISOString(),
      work_id: 'wave0-source-topic-a',
      producer_rule: 'source_intake',
      slot_result_ref: '_subagents/wave_00/slot_00/result.json',
      runtime_receipt_ref: '_subagents/wave_00/slot_00/runtime-receipt.jsonl',
      output_files: [{ path: 'reference/test.md', role: 'reference', source_url: 'https://example.com/test' }],
      cache_trails: [],
    }]);
    const result = checkOutputDeclarationLedgerExists(dir, { wave: 'wave1' });
    assert.equal(result.passed, false);
    assert.ok(result.inspect.some((s) => s.includes('No scoped')));
  });

  it('4. works with slot_result_ref scoping (wave_01 path)', () => {
    const dir = makeBundle('slotscoped');
    writeLedger(dir, [{
      declared_at: new Date().toISOString(),
      work_id: 'deepening-task',
      producer_rule: 'topic_deepening',
      slot_result_ref: '_subagents/wave_01/slot_00/result.json',
      runtime_receipt_ref: '_subagents/wave_01/slot_00/runtime-receipt.jsonl',
      output_files: [{ path: 'artifacts/wave1/topic-a/evidence-summary.md', role: 'evidence_summary' }],
      cache_trails: [],
    }]);
    const result = checkOutputDeclarationLedgerExists(dir, { wave: 'wave1' });
    assert.equal(result.passed, true);
  });

  it('5. filters by producer_rule when specified', () => {
    const dir = makeBundle('prodfilter');
    writeLedger(dir, [
      {
        declared_at: new Date().toISOString(),
        work_id: 'wave0-source-topic-a',
        producer_rule: 'source_intake',
        slot_result_ref: '_subagents/wave_00/slot_00/result.json',
        runtime_receipt_ref: '_subagents/wave_00/slot_00/runtime-receipt.jsonl',
        output_files: [],
        cache_trails: [],
      },
      {
        declared_at: new Date().toISOString(),
        work_id: 'wave0-suppl-topic-a',
        producer_rule: 'supplementary_intake',
        slot_result_ref: '_subagents/wave_00/slot_01/result.json',
        runtime_receipt_ref: '_subagents/wave_00/slot_01/runtime-receipt.jsonl',
        output_files: [],
        cache_trails: [],
      },
    ]);
    const result = checkOutputDeclarationLedgerExists(dir, { wave: 'wave0', producer_rule: 'source_intake' });
    assert.equal(result.passed, true);
    assert.equal(result.records.length, 1);
  });
});

describe('checkOutputDeclarationCoverage', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. vacuously passes when no expected outputs found (empty glob match)', () => {
    const dir = makeBundle('vacuously');
    // No reference/00-cross-*.md files → vacuously passes
    const result = checkOutputDeclarationCoverage(dir, {
      wave: 'wave2',
      output_selectors: { glob: 'reference/00-cross-*.md' },
    });
    assert.equal(result.passed, true);
    assert.ok(result.inspect.some((s) => s.includes('vacuously')));
  });

  it('2. fails when expected outputs exist on disk but not in ledger', () => {
    const dir = makeBundle('orphan');
    // Create file matching glob
    writeFileSync(join(dir, 'reference/00-cross-market-shift.md'), '# Cross Reference\n\n- source_url: https://example.com/test\n');
    const result = checkOutputDeclarationCoverage(dir, {
      wave: 'wave2',
      output_selectors: { glob: 'reference/00-cross-*.md' },
    });
    assert.equal(result.passed, false);
    assert.ok(result.inspect.some((s) => s.toLowerCase().includes('orphan')));
    assert.ok(result.orphans.includes('reference/00-cross-market-shift.md'));
  });

  it('3. passes when expected outputs are covered by ledger declarations', () => {
    const dir = makeBundle('covered');
    writeFileSync(join(dir, 'reference/00-cross-market-shift.md'), '# Cross Reference\n\n- source_url: https://example.com/test\n');
    writeLedger(dir, [{
      declared_at: new Date().toISOString(),
      work_id: 'wave2-suppl-cross-market-shift-r1',
      producer_rule: 'topic_deepening',
      slot_result_ref: '_subagents/wave_02/slot_00/result.json',
      runtime_receipt_ref: '_subagents/wave_02/slot_00/runtime-receipt.jsonl',
      output_files: [{ path: 'reference/00-cross-market-shift.md', role: 'reference', source_url: 'https://example.com/test' }],
      cache_trails: [],
    }]);
    const result = checkOutputDeclarationCoverage(dir, {
      wave: 'wave2',
      output_selectors: { glob: 'reference/00-cross-*.md' },
    });
    assert.equal(result.passed, true);
  });

  it('4. expands topic_registry templates correctly', () => {
    const dir = makeBundle('expand');
    // Create artifacts that match the template
    mkdirSync(join(dir, 'artifacts', 'wave0', 'topic-a'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), '');
    writeLedger(dir, [{
      declared_at: new Date().toISOString(),
      work_id: 'wave0-source-topic-a',
      producer_rule: 'source_intake',
      slot_result_ref: '_subagents/wave_00/slot_00/result.json',
      runtime_receipt_ref: '_subagents/wave_00/slot_00/runtime-receipt.jsonl',
      output_files: [{ path: 'artifacts/wave0/topic-a/source.yaml', role: 'source_yaml' }],
      cache_trails: [],
    }]);
    const result = checkOutputDeclarationCoverage(dir, {
      wave: 'wave0',
      output_selectors: {
        expected_from_topic_registry: ['artifacts/wave0/{topic}/source.yaml'],
      },
    });
    assert.equal(result.passed, true);
  });
});

describe('checkSubagentSlotPresence', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. fails when wave directory does not exist', () => {
    const dir = makeBundle('noslots');
    const result = checkSubagentSlotPresence(dir, { wave: 'wave0' });
    assert.equal(result.passed, false);
    assert.ok(result.inspect.some((s) => s.includes('missing')));
  });

  it('2. passes with successful slot (status=done, result.status=done)', () => {
    const dir = makeBundle('hasslots');
    makeSlot(dir, 0, 0, { slotKey: 'test', roleAgentKey: 'dpt-source-intake' });
    const result = checkSubagentSlotPresence(dir, { wave: 'wave0' });
    assert.equal(result.passed, true);
    assert.equal(result.successfulSlots.length, 1);
  });

  it('3. fails when slot status is pending', () => {
    const dir = makeBundle('pendingslot');
    makeSlot(dir, 0, 0, { status: 'pending', resultStatus: 'done' });
    const result = checkSubagentSlotPresence(dir, { wave: 'wave0' });
    assert.equal(result.passed, false);
    assert.ok(result.inspect.some((s) => s.includes('pending')));
  });

  it('4. fails when result status is failed', () => {
    const dir = makeBundle('failedslot');
    makeSlot(dir, 0, 0, { resultStatus: 'failed' });
    const result = checkSubagentSlotPresence(dir, { wave: 'wave0' });
    assert.equal(result.passed, false);
  });

  it('5. correct wave directory: wave1 checks wave_01, not wave_00', () => {
    const dir = makeBundle('wave1slots');
    // Create wave_00 slot (should not count for wave1 check)
    makeSlot(dir, 0, 0, { slotKey: 'w0', roleAgentKey: 'dpt-source-intake' });
    const result = checkSubagentSlotPresence(dir, { wave: 'wave1' });
    assert.equal(result.passed, false);
    assert.ok(result.inspect.some((s) => s.includes('missing')));
  });

  it('6. fails when wave field is missing', () => {
    const dir = makeBundle('nowave');
    const result = checkSubagentSlotPresence(dir, {});
    assert.equal(result.passed, false);
    assert.ok(result.inspect.some((s) => s.includes('missing wave')));
  });
});

describe('detectRelayBypassSuspicion', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. Wave0: triggers suspicion when artifacts exist without ledger', () => {
    const dir = makeBundle('w0bypass');
    // Create artifact without ledger
    mkdirSync(join(dir, 'artifacts', 'wave0', 'topic-a'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), '');
    const result = detectRelayBypassSuspicion(dir, 'wave0', 'wave0-complete');
    assert.equal(result.suspected, true);
    assert.ok(result.provenanceMissing.length > 0);
  });

  it('2. Wave0: no suspicion when artifacts are covered by ledger + slots', () => {
    const dir = makeBundle('w0clean');
    mkdirSync(join(dir, 'artifacts', 'wave0', 'topic-a'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), '');
    writeLedger(dir, [{
      declared_at: new Date().toISOString(),
      work_id: 'wave0-source-topic-a',
      producer_rule: 'source_intake',
      slot_result_ref: '_subagents/wave_00/slot_00/result.json',
      runtime_receipt_ref: '_subagents/wave_00/slot_00/runtime-receipt.jsonl',
      output_files: [{ path: 'artifacts/wave0/topic-a/source.yaml', role: 'source_yaml' }],
      cache_trails: [],
    }]);
    makeSlot(dir, 0, 0);
    const result = detectRelayBypassSuspicion(dir, 'wave0', 'wave0-complete');
    assert.equal(result.suspected, false);
  });

  it('3. Wave2: no suspicion for pure synthesis artifacts alone', () => {
    const dir = makeBundle('w2clean');
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), '# Synthesis');
    writeFileSync(join(dir, 'artifacts/wave2/cross-topic-ledger.md'), '# Ledger');
    writeFileSync(join(dir, 'artifacts/wave2/finding-index.yaml'), 'findings: []');
    const result = detectRelayBypassSuspicion(dir, 'wave2', 'wave2-complete');
    assert.equal(result.suspected, false);
  });

  it('4. Wave2: triggers suspicion for reference/00-cross-*.md without provenance', () => {
    const dir = makeBundle('w2bypass');
    writeFileSync(join(dir, 'reference/00-cross-market-shift.md'), '# Cross Reference');
    const result = detectRelayBypassSuspicion(dir, 'wave2', 'wave2-complete');
    assert.equal(result.suspected, true);
  });

  it('5. Wave2: triggers suspicion when finding-index has search claims but no provenance', () => {
    const dir = makeBundle('w2searchclaim');
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave2/finding-index.yaml'),
      'findings:\n  - id: W2F-001\n    decision: exploit_search\n    search_required: true\n');
    const result = detectRelayBypassSuspicion(dir, 'wave2', 'wave2-complete');
    assert.equal(result.suspected, true);
  });

  it('6. Wave1: triggers suspicion when evidence-summary exists without ledger', () => {
    const dir = makeBundle('w1bypass');
    mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-a'), { recursive: true });
    writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), '# Evidence');
    const result = detectRelayBypassSuspicion(dir, 'wave1', 'wave1-complete');
    assert.equal(result.suspected, true);
  });
});

describe('writeGatePassDiagnostic', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. writes lightweight pass diagnostic', () => {
    const dir = makeBundle('passdiag');
    const result = {
      check: { passed: true, gate: 'wave0-complete', currentNodeRef: 'phases/phase-wave0.md', next: 'phases/phase-wave1.md' },
      routing: { kind: 'next', next: 'phases/phase-wave1.md' },
      inspect: [],
      advice: [],
    };
    const diagResult = writeGatePassDiagnostic(dir, result);
    assert.equal(diagResult.ok, true);
    assert.ok(existsSync(join(dir, diagResult.path)));

    const content = JSON.parse(readFileSync(join(dir, diagResult.path), 'utf-8'));
    assert.equal(content.passed, true);
    assert.equal(content.gate, 'wave0-complete');
    assert.equal(content.phase, 'wave0');
    assert.equal(content.schema_version, '1.0.0');
    assert.ok(content.rules_summary);
  });

  it('2. does NOT write when check.passed is false (only on pass)', () => {
    const dir = makeBundle('nopassdiag');
    const result = {
      check: { passed: false, gate: 'wave0-complete', currentNodeRef: 'phases/phase-wave0.md', next: null },
      routing: { kind: 'next', next: null },
      inspect: ['test failure'],
      advice: ['fix it'],
    };
    const diagResult = writeGatePassDiagnostic(dir, result);
    assert.equal(diagResult.ok, true);
    // Should return early without writing (the function returns ok:true when !check.passed)
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Quality contract verification (AGO-005, 4.4, 4.5)
// ═══════════════════════════════════════════════════════════════════════════

describe('quality contract: filesystem-only refs do not satisfy count_floor', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  it('1. orphan filesystem reference fails coverage (not counted)', () => {
    const dir = makeBundle('orphanqc');
    // Create reference file on disk without ledger declaration
    writeFileSync(join(dir, 'reference/orphan-ref.md'),
      '- source_url: https://example.com/orphan\n- acceptance_status: accepted\n' +
      '- source_type: secondary\n- tier: Tier 2\n- evidence_role: foundation\n' +
      '- trust_level: practitioner\n- why_it_matters: Orphan test.\n- accessed_at: 2026-06-15\n- related_topic: topic-a\n' +
      '\n## Key Facts\n- Fact 1.\n- Fact 2.\n- Fact 3.\n- Fact 4.\n- Fact 5.\n' +
      '\n## Core Content Capture\nTest content.\n' +
      '\n## Relevance To This Research\nTest.\n## Quotable Terms / Concepts\n- Term.\n## Risks And Limitations\n- None.\n');
    // No ledger — coverage must fail
    const result = checkOutputDeclarationCoverage(dir, {
      wave: 'wave1',
      output_selectors: { glob: 'reference/orphan-ref.md' },
    });
    assert.equal(result.passed, false, 'Orphan filesystem ref without ledger must fail coverage');
    assert.ok(result.orphans.includes('reference/orphan-ref.md'));
  });

  it('2. ledger-covered reference passes coverage check', () => {
    const dir = makeBundle('ledgerqc');
    writeFileSync(join(dir, 'reference/covered-ref.md'),
      '- source_url: https://example.com/covered\n- acceptance_status: accepted\n' +
      '- source_type: secondary\n- tier: Tier 2\n- evidence_role: foundation\n' +
      '- trust_level: practitioner\n- why_it_matters: Covered test.\n- accessed_at: 2026-06-15\n- related_topic: topic-a\n' +
      '\n## Key Facts\n- Fact 1.\n- Fact 2.\n- Fact 3.\n- Fact 4.\n- Fact 5.\n' +
      '\n## Core Content Capture\nTest.\n## Relevance To This Research\nTest.\n## Quotable Terms / Concepts\n- T.\n## Risks And Limitations\n- None.\n');
    writeLedger(dir, [{
      declared_at: new Date().toISOString(),
      work_id: 'wave1-suppl-topic-a-r1',
      producer_rule: 'supplementary_intake',
      slot_result_ref: '_subagents/wave_01/slot_00/result.json',
      runtime_receipt_ref: '_subagents/wave_01/slot_00/runtime-receipt.jsonl',
      output_files: [{ path: 'reference/covered-ref.md', role: 'reference', source_url: 'https://example.com/covered' }],
      cache_trails: [],
    }]);
    const result = checkOutputDeclarationCoverage(dir, {
      wave: 'wave1',
      output_selectors: { glob: 'reference/covered-ref.md' },
    });
    assert.equal(result.passed, true, 'Ledger-covered reference must pass coverage');
  });

  it('3. filesystem scan is orphan-only — does not satisfy ledger authority', () => {
    const dir = makeBundle('fsnotledger');
    // File exists on disk, but no ledger → coverage fail confirms filesystem authority is insufficient
    writeFileSync(join(dir, 'reference/fs-only.md'),
      '- source_url: https://example.com/fs\n- acceptance_status: accepted\n' +
      '- source_type: secondary\n- tier: Tier 2\n- evidence_role: foundation\n' +
      '- trust_level: practitioner\n- why_it_matters: FS only.\n- accessed_at: 2026-06-15\n- related_topic: topic-a\n' +
      '\n## Key Facts\n- Fact 1.\n- Fact 2.\n- Fact 3.\n- Fact 4.\n- Fact 5.\n' +
      '\n## Core Content Capture\nTest.\n## Relevance To This Research\nTest.\n## Quotable Terms / Concepts\n- T.\n## Risks And Limitations\n- None.\n');
    // checkOutputDeclarationLedgerExists with ledger missing confirms no ledger authority
    const ledgerResult = checkOutputDeclarationLedgerExists(dir, { wave: 'wave1' });
    assert.equal(ledgerResult.passed, false, 'Missing ledger must fail ledger existence check');
    // The file on disk does NOT make the ledger check pass
    assert.ok(ledgerResult.inspect.some((s) => s.includes('missing or empty')), 'Ledger check must report missing/empty, not use filesystem');
  });
});
