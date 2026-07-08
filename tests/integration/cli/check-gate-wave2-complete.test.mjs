// gate-wave2-complete integration tests (RWG-003, RWG-006, RWG-008)
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setStatusWindow, witnessedHandoffEvents, writeTraceEvents } from './handoff-fixtures.mjs';
import {
  claimAndSubmitWorkUnit,
  referenceContent,
} from '../../engine/work-unit-test-helpers.mjs';

const REPO_ROOT = process.cwd();
const GATE_CLI = join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs');
const NEW_BUNDLE = join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const BUNDLES_DIR = join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

function track(dir) { createdDirs.push(dir); return dir; }
function unique(prefix) { return `rt_w2_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function runGate(bundlePath) {
  return spawnSync('node', [GATE_CLI, '--bundle', bundlePath, '--current-node', 'phases/phase-wave2.md'], { encoding: 'utf-8', timeout: 10000 });
}

function writeWave2Trace(dir, { completion = true } = {}) {
  const events = witnessedHandoffEvents({
    sourceGate: 'wave1-complete',
    phase: 'wave1',
    sourceNode: 'phases/phase-wave1.md',
    targetNode: 'phases/phase-wave2.md',
  });
  if (completion) events.push({ event: 'wave2_completion', ts: new Date().toISOString() });
  writeTraceEvents(dir, events);
}

/** Create a bundle with wave2-ready status and pre-existing wave1 artifacts. */
function createBundle(name) {
  const r = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], { encoding: 'utf-8', timeout: 10000 });
  const dir = track(r.stdout.trim());

  setStatusWindow(dir, 'wave1_complete', 'wave2_complete');

  // Create reference target files (Wave0 artifacts)
  mkdirSync(join(dir, 'reference', 'topic-a'), { recursive: true });
  writeFileSync(join(dir, 'reference/topic-a/source.yaml'), `- url: "https://example.com/ref"
  title: "Test Reference"
  retrieved_date: "2026-06-15"
  topic_tag: "topic-a"
`);

  // Create Wave1 evidence-summary and question-list target files
  mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-a'), { recursive: true });
  writeFileSync(join(dir, 'artifacts/wave1/topic-a/evidence-summary.md'), '# Topic A Evidence Summary\n\n## Source URLs\n\n- [Source A](https://example.com/a)\n\n## Key Findings\n\n1. **机制理解**: Finding A\n\n## Open Questions\n\n1. [开放] Question 1\n');
  writeFileSync(join(dir, 'artifacts/wave1/topic-a/question-list.md'), '# Topic A Question List\n\n## Topic Investigation Targets\n\n## Question Reconciliation\n\n## Emergent Question Protocol\n\n## Exploration / Exploitation Decision\n');

  // Create wave2 directory
  mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
  writeFileSync(join(dir, 'rb_profile.yaml'), `research_style_params:
  p0p1_independent_backing: 2
`);

  // Create seed_topics with backfill tokens pre-embedded
  mkdirSync(join(dir, 'seed_topics'), { recursive: true });
  writeFileSync(join(dir, 'seed_topics/topic-a.md'), `# Topic A\n\n## Wave2 Judgment\n__BACKFILL_WAVE2_JUDGMENT__\n\n## Pending Questions\n__BACKFILL_PENDING_QUESTIONS__\n`);

  // Create rb_plan.md with topic_registry (needed for {topic} expansion)
  writeFileSync(join(dir, 'rb_plan.md'), `---
plan_basename: test
derived_topic_count: 1
topic_registry:
  - slug: topic-a
    label: Topic A
---
# Plan
`);

  return dir;
}

const SYNTHESIS_WITH_VALID_LINKS = `# Cross-Topic Synthesis

## Pattern: AI Safety Across Topics

W2F-001: Based on the [Topic A evidence](../wave1/topic-a/evidence-summary.md), the key open question is how to measure alignment.

The [reference metadata](../../reference/topic-a/source.yaml) provides background on AI safety approaches.
`;

const SYNTHESIS_NO_LINKS = `# Cross-Topic Synthesis

## Pattern: AI Safety Across Topics

W2F-001: Based on the Topic A evidence, the key open question is how to measure alignment. No explicit links here.
`;

const SYNTHESIS_DEAD_LINKS = `# Cross-Topic Synthesis

See [nonexistent file](../wave1/topic-a/nope.md) and also [another dead link](../wave1/topic-b/missing.md) for more information.
`;

const SYNTHESIS_MIXED_LINKS = `# Cross-Topic Synthesis

W2F-001: One valid: [Topic A evidence](../wave1/topic-a/evidence-summary.md)
One dead: [missing file](../wave1/topic-a/nope.md)
`;

// Helper to create minimal passing ledger and index
function createMinLedger(dir) {
  writeFileSync(join(dir, 'artifacts/wave2/cross-topic-ledger.md'), `# Cross-Topic Ledger

## Cross-Topic Scan Matrix

| pair_id | topics | checked_dimensions | finding_ids | notes |
| P01 | topic-a + topic-a | shared_pattern | none | Minimal |

## Wave1 Legacy Questions

None imported.

## Cross-Topic Resolutions

None found.

## Emergent Cross-Topic Questions

None found.

## Exploration Decisions

None needed.

## HITL2 Handoff

None.
`);
}

function createMinIndex(dir) {
  writeFileSync(join(dir, 'artifacts/wave2/finding-index.yaml'), `version: "0.1"
source_layer: wave2_cross_topic
ledger: artifacts/wave2/cross-topic-ledger.md
synthesis: artifacts/wave2/synthesis.md
scan:
  topic_count: 1
  pair_count_expected: 0
  pair_count_checked: 0
findings: []
synthesis_eligibility:
  pure_synthesis_eligible: true
  scan_matrix_present: true
  scan_topic_pair_coverage: []
  unresolved_search_required_count: 0
  targeted_search_required_count: 0
  targeted_search_submitted_count: 0
  explicit_deferral_count: 0
  profile_params_read:
    - p0p1_independent_backing
  ineligibility_reasons: []
`);
}

function createMinBackfill(dir) {
  // Replace backfill tokens to make backfill checks pass
  writeFileSync(join(dir, 'seed_topics/topic-a.md'), `# Topic A

## Wave2 Judgment
Cross-topic judgment from wave2 ledger/index projection.

## Pending Questions
- [开放] Question 1 (no cross-topic findings)
`);
}

function configureActionAddRerun(dir) {
  writeFileSync(join(dir, 'rb_plan.md'), `---
plan_basename: test-rerun
derived_topic_count: 2
topic_registry:
  - slug: topic-a
    label: Topic A
  - slug: topic-b
    label: Topic B
---
# Plan
`);

  mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-b'), { recursive: true });
  writeFileSync(join(dir, 'artifacts/wave1/topic-b/evidence-summary.md'), '# Topic B Evidence Summary\n\n## Source URLs\n\n- [Source B](https://example.com/news/b)\n\n## Key Findings\n\n1. **机制理解**: Finding B\n\n## Open Questions\n\n1. [开放] Question B\n');
  writeFileSync(join(dir, 'artifacts/wave1/topic-b/question-list.md'), '# Topic B Question List\n\n## Topic Investigation Targets\n\n## Question Reconciliation\n\n## Emergent Question Protocol\n\n## Exploration / Exploitation Decision\n');

  writeFileSync(join(dir, 'seed_topics/topic-a.md'), `# Topic A

## Wave2 Judgment
Cross-topic judgment from wave2 ledger/index projection.

## Pending Questions
- [开放] Question 1
`);
  writeFileSync(join(dir, 'seed_topics/topic-b.md'), `# Topic B

## 本轮重跑方向
action: add

## Wave2 Judgment
Cross-topic judgment from wave2 ledger/index projection.

## Pending Questions
- [开放] Question B
`);
}

function createFullCoverageLedger(dir) {
  writeFileSync(join(dir, 'artifacts/wave2/cross-topic-ledger.md'), `# Cross-Topic Ledger

## Cross-Topic Scan Matrix

| pair_id | topics | checked_dimensions | finding_ids | notes |
| P01 | topic-a + topic-b | shared_pattern, contradiction, resolution_opportunity, emergent_question | W2F-001 | Full rerun add scan |

## Wave1 Legacy Questions

topic-a and topic-b reviewed.

## Cross-Topic Resolutions

W2F-001 covers topic-a and topic-b.

## Emergent Cross-Topic Questions

None found.

## Exploration Decisions

None needed.

## HITL2 Handoff

None.
`);
}

function createFullCoverageIndex(dir) {
  writeFileSync(join(dir, 'artifacts/wave2/finding-index.yaml'), `version: "0.1"
source_layer: wave2_cross_topic
ledger: artifacts/wave2/cross-topic-ledger.md
synthesis: artifacts/wave2/synthesis.md
scan:
  topics:
    - topic-a
    - topic-b
  topic_count: 2
  pair_count_expected: 1
  pair_count_checked: 1
findings:
  - id: W2F-001
    type: cross_topic_resolution
    priority: p1
    status: resolved
    decision: use_existing_evidence
    affected_topics: [topic-a, topic-b]
    origin_refs:
      - artifacts/wave1/topic-a/question-list.md
    trigger_refs:
      - artifacts/wave1/topic-b/evidence-summary.md
    search_required: false
    subagent_receipt_refs: []
    appears_in_synthesis: true
    hitl2_handoff: false
    confidence: high
    independent_backing_refs:
      - artifacts/wave1/topic-a/evidence-summary.md
      - artifacts/wave1/topic-b/evidence-summary.md
    gap_status: no_gap
synthesis_eligibility:
  pure_synthesis_eligible: true
  scan_matrix_present: true
  scan_topic_pair_coverage:
    - pair: [topic-a, topic-b]
      refs: [artifacts/wave2/cross-topic-ledger.md]
  unresolved_search_required_count: 0
  targeted_search_required_count: 0
  targeted_search_submitted_count: 0
  explicit_deferral_count: 0
  profile_params_read:
    - p0p1_independent_backing
  ineligibility_reasons: []
`);
}

function submitWave2CrossReference(dir) {
  return claimAndSubmitWorkUnit(dir, {
    phase: 'wave2',
    queueItemId: 'cross-market',
    outputs: [{
      path: 'reference/00-cross-market-shift.md',
      role: 'reference',
      source_url: 'https://example.com/research/market-shift',
      source_slug: 'market-shift',
      content: referenceContent({
        source_url: 'https://example.com/research/market-shift',
        related_topic: 'cross-topic',
        evidence_role: 'targeted_evidence',
      }),
    }],
    cacheTrails: [{
      path: '_cache/wave2/primary/cross-market/market-shift',
      url: 'https://example.com/research/market-shift',
    }],
  });
}

function writeIndexObject(dir, value) {
  writeFileSync(join(dir, 'artifacts/wave2/finding-index.yaml'), `${JSON.stringify(value, null, 2)}\n`);
}

function wave2Finding(overrides = {}) {
  return {
    id: 'W2F-001',
    type: 'cross_topic_emergent_question',
    priority: 'p1',
    status: 'open',
    decision: 'explore_search',
    affected_topics: ['topic-a', 'topic-b'],
    origin_refs: ['artifacts/wave1/topic-a/question-list.md'],
    trigger_refs: ['artifacts/wave1/topic-a/evidence-summary.md'],
    search_required: true,
    subagent_receipt_refs: [],
    appears_in_synthesis: true,
    hitl2_handoff: false,
    confidence: 'medium',
    independent_backing_refs: ['artifacts/wave1/topic-a/evidence-summary.md'],
    gap_status: 'needs_search',
    ...overrides,
  };
}

function writeWave2ContractIndex(dir, {
  scanMatrixPresent = true,
  pairCountChecked = 0,
  findings = [],
  eligibility = {},
} = {}) {
  const needsSearchCount = findings.filter((finding) => finding.gap_status === 'needs_search').length;
  const targetedRequiredCount = findings.filter((finding) => ['exploit_search', 'explore_search'].includes(finding.decision)).length;
  const targetedSubmittedCount = findings.filter((finding) => finding.gap_status === 'search_submitted').length;
  const explicitDeferralCount = findings.filter((finding) => ['defer_hitl2', 'requires_internal_data', 'record_only'].includes(finding.decision)).length;
  writeIndexObject(dir, {
    version: '0.1',
    source_layer: 'wave2_cross_topic',
    ledger: 'artifacts/wave2/cross-topic-ledger.md',
    synthesis: 'artifacts/wave2/synthesis.md',
    scan: {
      topic_count: 1,
      pair_count_expected: 0,
      pair_count_checked: pairCountChecked,
    },
    findings,
    synthesis_eligibility: {
      pure_synthesis_eligible: needsSearchCount === 0,
      scan_matrix_present: scanMatrixPresent,
      scan_topic_pair_coverage: pairCountChecked > 0 ? [{ pair: ['topic-a', 'topic-b'], refs: ['artifacts/wave2/cross-topic-ledger.md'] }] : [],
      unresolved_search_required_count: needsSearchCount,
      targeted_search_required_count: targetedRequiredCount,
      targeted_search_submitted_count: targetedSubmittedCount,
      explicit_deferral_count: explicitDeferralCount,
      profile_params_read: ['p0p1_independent_backing'],
      ineligibility_reasons: needsSearchCount > 0 ? ['unresolved_search_required'] : [],
      ...eligibility,
    },
  });
}

describe('check-gate-wave2-complete', () => {
  after(() => { for (const d of createdDirs) rmSync(d, { recursive: true, force: true }); });

  // ── Existing tests (updated for three-artifact expectations) ──────────

  it('1. happy path: all three artifacts present, valid links, backfill clean → pass', () => {
    const dir = createBundle(unique('happy'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    createMinLedger(dir);
    createMinIndex(dir);
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass, got inspect: ${JSON.stringify(output.inspect)}`);
  });

  it('2. fails when synthesis.md is missing', () => {
    const dir = createBundle(unique('nofile'));
    createMinLedger(dir);
    createMinIndex(dir);
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('synthesis.md')), `Expected missing file fail: ${JSON.stringify(output.inspect)}`);
  });

  it('3. fails when synthesis is empty', () => {
    const dir = createBundle(unique('empty'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), '---\n---\n');
    createMinLedger(dir);
    createMinIndex(dir);
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('empty') || m.includes('field_non_empty')), `Expected empty fail: ${JSON.stringify(output.inspect)}`);
  });

  it('4. fails when synthesis has no Markdown links', () => {
    const dir = createBundle(unique('nolinks'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_NO_LINKS);
    createMinLedger(dir);
    createMinIndex(dir);
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('Markdown links') || m.includes('No Markdown')), `Expected no links fail: ${JSON.stringify(output.inspect)}`);
  });

  it('5. fails when all link targets are missing', () => {
    const dir = createBundle(unique('dead'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_DEAD_LINKS);
    createMinLedger(dir);
    createMinIndex(dir);
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('0 valid') || m.includes('No valid') || m.includes('valid artifact')), `Expected all dead links fail: ${JSON.stringify(output.inspect)}`);
  });

  it('6. passes when at least one link target is valid (mixed valid/dead links)', () => {
    const dir = createBundle(unique('mixed'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_MIXED_LINKS);
    createMinLedger(dir);
    createMinIndex(dir);
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pass with mixed links (1 valid, 1 dead), got: ${JSON.stringify(output.inspect)}`);
    assert.ok(output.advice.some(m => m.includes('dead link') || m.includes('nope')), `Expected advice listing dead link: ${JSON.stringify(output.advice)}`);
  });

  it('7. fails on status drift', () => {
    const dir = createBundle(unique('drift'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    createMinLedger(dir);
    createMinIndex(dir);
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const statusPath = join(dir, 'rb_status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf-8'));
    status.next_gate = 'wave1_complete'; // wrong
    writeFileSync(statusPath, JSON.stringify(status));
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('next_gate')), `Expected status drift fail: ${JSON.stringify(output.inspect)}`);
  });

  // ── New tests: three-artifact gate rules ──────────────────────────────

  it('8. fails when ledger is missing', () => {
    const dir = createBundle(unique('noledger'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    createMinIndex(dir);
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('ledger')), `Expected missing ledger fail: ${JSON.stringify(output.inspect)}`);
  });

  it('9. fails when finding-index.yaml is unparseable', () => {
    const dir = createBundle(unique('badindex'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    createMinLedger(dir);
    writeFileSync(join(dir, 'artifacts/wave2/finding-index.yaml'), '{ this is not valid YAML: [[[');
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('YAML') || m.includes('parse')), `Expected YAML parse fail: ${JSON.stringify(output.inspect)}`);
  });

  it('10. fails when backfill token is residual', () => {
    const dir = createBundle(unique('token'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    createMinLedger(dir);
    createMinIndex(dir);
    // Don't call createMinBackfill — leave token unreplaced
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('BACKFILL') || m.includes('Forbidden')), `Expected backfill token fail: ${JSON.stringify(output.inspect)}`);
  });

  it('11. fails action:add rerun when synthesis uses delta-only mode', () => {
    const dir = createBundle(unique('adddelta'));
    configureActionAddRerun(dir);
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), `${SYNTHESIS_WITH_VALID_LINKS}

## Delta Synthesis (Rerun 1)

W2F-001: Delta-only addition for topic-b.
`);
    createFullCoverageLedger(dir);
    createFullCoverageIndex(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('Delta Synthesis')), `Expected delta-only fail: ${JSON.stringify(output.inspect)}`);
  });

  it('12. passes action:add rerun with full topic coverage and no delta synthesis', () => {
    const dir = createBundle(unique('addfull'));
    configureActionAddRerun(dir);
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), `# Cross-Topic Synthesis

W2F-001: Full scan integrates [Topic A](../wave1/topic-a/evidence-summary.md) and [Topic B](../wave1/topic-b/evidence-summary.md).
`);
    createFullCoverageLedger(dir);
    createFullCoverageIndex(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected full rerun pass, got inspect: ${JSON.stringify(output.inspect)}`);
  });

  it('13. fails when trace event (wave2_completion) is missing from rb_trace.jsonl', () => {
    const dir = createBundle(unique('notrace'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    createMinLedger(dir);
    createMinIndex(dir);
    createMinBackfill(dir);
    writeWave2Trace(dir, { completion: false });
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('trace') || m.includes('Trace event') || m.includes('wave2_completion')), `Expected trace event fail: ${JSON.stringify(output.inspect)}`);
  });

  it('14. fails when targeted cross-reference evidence exists without submitted work-unit coverage', () => {
    const dir = createBundle(unique('crossdirect'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    createMinLedger(dir);
    createMinIndex(dir);
    createMinBackfill(dir);
    writeFileSync(join(dir, 'reference/00-cross-market-shift.md'), referenceContent({
      source_url: 'https://example.com/research/market-shift',
      related_topic: 'cross-topic',
      evidence_role: 'targeted_evidence',
    }));
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('submitted work-unit') || m.includes('delegated_bypass_suspected')),
      `Expected work-unit provenance failure for direct cross reference: ${JSON.stringify(output.inspect)}`);
  });

  it('15. passes when targeted cross-reference evidence is covered by a submitted work unit', () => {
    const dir = createBundle(unique('crosswu'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    createMinLedger(dir);
    createMinIndex(dir);
    createMinBackfill(dir);
    submitWave2CrossReference(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected submitted cross-reference work-unit pass, got inspect: ${JSON.stringify(output.inspect)}`);
  });

  it('16. fails when synthesis exists but scan/triage projection is missing', () => {
    const dir = createBundle(unique('noscan'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    createMinLedger(dir);
    writeWave2ContractIndex(dir, { scanMatrixPresent: false });
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('scan_matrix_present') || m.includes('scan/triage')),
      `Expected missing scan/triage failure: ${JSON.stringify(output.inspect)}`);
  });

  it('17. fails when search-required finding has no receipt or explicit deferral', () => {
    const dir = createBundle(unique('searchrequired'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    createMinLedger(dir);
    writeWave2ContractIndex(dir, { findings: [wave2Finding()] });
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, false);
    assert.ok(output.inspect.some(m => m.includes('search_required') || m.includes('needs_search') || m.includes('delegated evidence search')),
      `Expected unresolved search-required failure: ${JSON.stringify(output.inspect)}`);
  });

  it('18. passes targeted evidence receipt when backed by submitted work-unit row', () => {
    const dir = createBundle(unique('targetreceipt'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    createMinLedger(dir);
    const { record, submitted } = submitWave2CrossReference(dir);
    assert.equal(submitted.ok, true);
    writeWave2ContractIndex(dir, {
      findings: [wave2Finding({
        status: 'resolved',
        subagent_receipt_refs: [record.paths.runtime_receipt_ref],
        gap_status: 'search_submitted',
      })],
    });
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected targeted receipt pass, got inspect: ${JSON.stringify(output.inspect)}`);
  });

  it('19. passes legal pure synthesis with zero delegated targeted rows', () => {
    const dir = createBundle(unique('pure'));
    writeFileSync(join(dir, 'artifacts/wave2/synthesis.md'), SYNTHESIS_WITH_VALID_LINKS);
    createMinLedger(dir);
    writeWave2ContractIndex(dir, { findings: [] });
    createMinBackfill(dir);
    writeWave2Trace(dir);
    const result = runGate(dir);
    const output = JSON.parse(result.stdout);
    assert.equal(output.check.passed, true, `Expected pure synthesis pass, got inspect: ${JSON.stringify(output.inspect)}`);
  });
});
