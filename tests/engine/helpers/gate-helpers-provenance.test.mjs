import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  createQueue,
  enqueue,
  makeItem,
  saveQueue,
} from '../../../DEEP_RESEARCH_HARNESS/engine/queue-manager.mjs';
import {
  claimWorkUnits,
  closeWorkUnitAttempt,
  lateSubmitWorkUnit,
  loadWorkUnitIndex,
  submitWorkUnit,
  supersedeWorkUnitAttempt,
} from '../../../DEEP_RESEARCH_HARNESS/engine/work-unit-core.mjs';
import {
  checkReferenceIndexCoverage,
  classifyReferenceAuthority,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-checks.mjs';
import {
  checkDelegatedBypassSuspected,
  checkSubmittedDeclarationRecovery,
  checkWorkUnitLedgerExists,
  checkWorkUnitOutputCoverage,
  checkWorkUnitSubmissionPresence,
  detectDelegatedBypassSuspicion,
  emitDelegatedBypassDiagnostic,
  scanDelegatedBypassSuspicion,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-provenance.mjs';
import {
  availableActorDecision,
  claimAndSubmitWorkUnit,
  cleanupWorkUnitBundle,
  referenceContent,
  tempWorkUnitBundle,
} from '../work-unit-test-helpers.mjs';

const dirs = [];

afterEach(() => {
  while (dirs.length > 0) cleanupWorkUnitBundle(dirs.pop());
});

function tempDir(prefix) {
  const dir = tempWorkUnitBundle(prefix);
  dirs.push(dir);
  return dir;
}

function delegatedWave0Item(id = 'queue-a') {
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake', timeout_ms: 600000 } },
    kind: 'wave0_source_intake',
    producer_rule: 'source_intake_fan_in',
    payload: {
      topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      topic_slug: 'topic-a',
      wave: 0,
    },
    required_receipts: ['file:artifacts/wave0/topic-a/source.yaml'],
    writes_to: ['artifacts/wave0/topic-a/source.yaml'],
  });
}

function seedWave0Queue(dir) {
  writeFileSync(join(dir, 'rb_plan.md'), `---
plan_basename: provenance-late
derived_topic_count: 1
topic_registry_version: "2"
topic_registry:
  - topic_uid: tp_123e4567-e89b-12d3-a456-426614174000
    id: "01"
    slug: topic-a
    title: Topic A
    must_answer: ["What matters?"]
    scope_role: primary
    depends_on_topic_uids: []
    previous_layouts: []
---
# Plan
`);
  mkdirSync(join(dir, 'seed_topics'), { recursive: true });
  writeFileSync(join(dir, 'seed_topics/topic-a.md'), `---
topic_uid: tp_123e4567-e89b-12d3-a456-426614174000
id: "01"
slug: topic-a
title: Topic A
must_answer: ["What matters?"]
scope_role: primary
depends_on_topic_uids: []
---
# Topic A
`);
  let queue = createQueue('wpg-late');
  queue = enqueue(queue, delegatedWave0Item());
  saveQueue(dir, queue);
}

function writeLateSubmitFixture(dir, record) {
  const sourcePath = 'artifacts/wave0/topic-a/source.yaml';
  mkdirSync(join(dir, 'artifacts/wave0/topic-a'), { recursive: true });
  writeFileSync(join(dir, sourcePath), '- url: https://fixture.news-research.com/source\n  title: Source\n  retrieved_date: 2026-07-20\n  topic_tag: topic-a\n');
  const cacheTrail = `_cache/wave0/primary/${record.queue_item_id}/s01_source`;
  mkdirSync(join(dir, cacheTrail), { recursive: true });
  writeFileSync(join(dir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(join(dir, cacheTrail, 'page.md'), '# Captured Page\n\nFetched content capture for https://fixture.news-research.com/source.\n');
  writeFileSync(join(dir, cacheTrail, 'meta.json'), '{"url":"https://fixture.news-research.com/source"}\n');
  writeFileSync(join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: '2026-07-10T00:00:00.000Z',
  })}\n`);
  const resultPath = join(dir, '_tmp', `${record.work_id}.result.json`);
  mkdirSync(join(dir, '_tmp'), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    summary: 'late done',
    output_files: [
      { path: sourcePath, role: 'source_yaml' },
    ],
    cache_trails: [cacheTrail],
  }, null, 2)}\n`);
  return resultPath;
}

function submitWave1SourceBacking(dir, {
  sourceUrl = 'https://fixture.news-research.com/research/topic-a-source',
  topic = 'topic-a',
} = {}) {
  const cacheTrail = `_cache/wave1/primary/${topic}/s01_source`;
  const evidencePath = `artifacts/wave1/${topic}/evidence-summary.md`;
  const questionPath = `artifacts/wave1/${topic}/question-list.md`;
  return claimAndSubmitWorkUnit(dir, {
    phase: 'wave1',
    queueItemId: topic,
    outputs: [
      {
        path: evidencePath,
        role: 'evidence_summary',
        content: `# Evidence\n\n[Source](${sourceUrl})\n\n## Key Findings\n\n- Supported finding.\n`,
      },
      {
        path: questionPath,
        role: 'question_list',
        content: '## Topic Investigation Targets\n\nTargets.\n\n## Question Reconciliation\n\nReconciled.\n\n## Emergent Question Protocol\n\nChecked.\n\n## Exploration / Exploitation Decision\n\nContinue.\n',
      },
    ],
    cacheTrails: [{ path: cacheTrail, url: sourceUrl }],
    resultOverrides: {
      source_claims: [{
        url: sourceUrl,
        acceptance_status: 'accepted',
        is_new_vs_wave0: true,
        source_ref: evidencePath,
        cache_trail_refs: [cacheTrail],
      }],
      accepted_source_urls: [sourceUrl],
    },
  });
}

function writeIndex(dir, rows) {
  mkdirSync(join(dir, 'reference'), { recursive: true });
  writeFileSync(join(dir, 'reference', '_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n') + '\n');
}

function submitSupersessionSuccessor(dir, predecessor) {
  claimWorkUnits(dir, { phase: 'wave0', count: 1, ...availableActorDecision('wave0_source_intake') });
  const successor = Object.values(loadWorkUnitIndex(dir).work_units)
    .find((record) => record.status === 'claimed' && record.work_id !== predecessor.work_id);
  assert.ok(successor, 'supersession successor should be claimed');

  const predecessorResult = JSON.parse(readFileSync(predecessor.resultPath, 'utf8'));
  const result = {
    ...predecessorResult,
    work_id: successor.work_id,
    queue_item_id: successor.queue_item_id,
    receipt_nonce: successor.receipt_nonce,
    actor_contract_version: successor.actor_contract_version,
    execution_actor_class: successor.actor_execution.execution_actor_class,
  };
  const resultPath = join(dir, '_tmp', `${successor.work_id}.result.json`);
  mkdirSync(join(dir, '_tmp'), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  writeFileSync(join(dir, successor.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: successor.work_id,
    queue_item_id: successor.queue_item_id,
    kind: successor.kind,
    receipt_nonce: successor.receipt_nonce,
    actor_contract_version: successor.actor_contract_version,
    execution_actor_class: successor.actor_execution.execution_actor_class,
    ts: '2026-08-09T00:00:00.000Z',
  })}\n`);
  const submitted = submitWorkUnit(dir, { work_id: successor.work_id, resultPath });
  assert.equal(submitted.ok, true, submitted.inspect?.join('\n'));
  return successor;
}

describe('work-unit provenance gate helpers', () => {
  it('accepts only submitted work-unit ledger rows for scoped source-output existence', () => {
    const dir = tempDir('wpg-ledger-');
    claimAndSubmitWorkUnit(dir, { phase: 'wave0', queueItemId: 'queue-a' });

    const result = checkWorkUnitLedgerExists(dir, {
      wave: 'wave0',
      kind: 'wave0_source_intake',
      role: 'source_yaml',
    });

    assert.equal(result.passed, true);
    assert.equal(result.records.length, 1);
    assert.match(result.records[0].work_id, /^wu-w0-b000-src-i0001$/);
  });

  it('counts a current source-only late-accepted row as submitted coverage after normal provenance checks pass', () => {
    const dir = tempDir('wpg-late-coverage-');
    seedWave0Queue(dir);
    claimWorkUnits(dir, { phase: 'wave0', count: 1, ...availableActorDecision('wave0_source_intake') });
    const record = loadWorkUnitIndex(dir).work_units['wu-w0-b000-src-i0001'];
    assert.equal(record.assignment_contract_version, 'work-unit.assignment.v3');
    closeWorkUnitAttempt(dir, {
      work_id: record.work_id,
      status: 'timed_out',
      reason: 'deadline-expired',
      nowMs: Date.parse(record.deadline_at) + 1,
    });
    const resultPath = writeLateSubmitFixture(dir, record);
    const accepted = lateSubmitWorkUnit(dir, {
      work_id: record.work_id,
      resultPath,
      reason: 'late result arrived before retry submitted',
    });
    assert.equal(accepted.ok, true);

    const result = checkWorkUnitLedgerExists(dir, {
      wave: 'wave0',
      kind: 'wave0_source_intake',
      role: 'source_yaml',
    });

    assert.equal(result.passed, true, result.inspect.join('; '));
    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].late_accept, true);
    assert.equal(result.records[0].terminal_status_before_accept, 'timed_out');
  });

  it('projects a submitted missing declaration as one exact Engine recovery root without granting coverage', () => {
    const dir = tempDir('wpg-declaration-gap-');
    const submitted = claimAndSubmitWorkUnit(dir, { phase: 'wave0', queueItemId: 'queue-a' });
    rmSync(join(dir, 'rb_output_declarations.jsonl'));

    const result = checkSubmittedDeclarationRecovery(dir, {
      id: 'wave0_work_unit_submission_presence',
      wave: 'wave0',
    });
    const coverage = checkWorkUnitLedgerExists(dir, { id: 'wave0_work_unit_ledger_exists', wave: 'wave0' });

    assert.equal(result.passed, false);
    assert.equal(result.gaps.length, 1);
    assert.equal(result.gaps[0].record.work_id, submitted.record.work_id);
    assert.equal(result.gaps[0].recovery.eligible, true);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].id, `submitted_declaration_missing:${submitted.record.work_id}`);
    assert.equal(result.findings[0].repair_kind, 'engine_operation');
    assert.match(result.findings[0].write_to, /operate-work-unit\.mjs recover-declaration/);
    assert.match(result.findings[0].write_to, new RegExp(submitted.record.work_id));
    assert.doesNotMatch(result.findings[0].write_to, /rb_output_declarations\.jsonl/);
    assert.equal(coverage.passed, false);
    assert.equal(coverage.records.length, 0);
  });

  it('rejects work-unit-looking hand-written rows without submit/index fingerprints', () => {
    const dir = tempDir('wpg-handwritten-');
    writeFileSync(join(dir, 'rb_output_declarations.jsonl'), `${JSON.stringify({
      declared_at: '2026-07-06T00:00:00.000Z',
      work_id: 'wu-w0-b000-src-i0001',
      queue_item_id: 'queue-a',
      wave: 0,
      kind: 'wave0_source_intake',
      producer_rule: 'source_intake_fan_in',
      creation_reason: 'hand written',
      work_unit_ref: '_work_units/wave0/wu-w0-b000-src-i0001',
      result_ref: '_work_units/wave0/wu-w0-b000-src-i0001/result.json',
      runtime_receipt_ref: '_work_units/wave0/wu-w0-b000-src-i0001/runtime-receipt.jsonl',
      receipt_nonce: '1234567890123456',
      output_files: [],
      cache_trails: [],
      result_hash: 'not-engine-written',
      ledger_record_hash: 'not-engine-written',
    })}\n`);

    const result = checkWorkUnitLedgerExists(dir, { wave: 'wave0' });
    assert.equal(result.passed, false);
    assert.match(result.inspect.join('\n'), /invalid submitted work-unit declaration ledger/);
  });

  it('requires filesystem outputs to be covered by submitted work-unit rows', () => {
    const dir = tempDir('wpg-coverage-');
    mkdirSync(join(dir, 'reference'), { recursive: true });
    writeFileSync(join(dir, 'reference', 'topic-a-orphan.md'), '# Orphan\n');

    const result = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave1',
      output_selectors: { glob: 'reference/*.md', roles: ['reference'] },
    });

    assert.equal(result.passed, false);
    assert.equal(result.orphans.length, 1);
    assert.match(result.orphans[0], /reference\/topic-a-orphan\.md/);
    assert.match(result.orphans[0], /projection_backing_drift/);
    assert.match(result.inspect.join('\n'), /lacks submitted work-unit coverage/);
  });

  it('accepts a Wave1 Phase-owned topic reference backed by submitted source claims', () => {
    const dir = tempDir('wpg-wave1-projection-');
    const sourceUrl = 'https://fixture.news-research.com/research/topic-a-source';
    submitWave1SourceBacking(dir, { sourceUrl, topic: 'topic-a' });
    writeIndex(dir, [
      '| reference/topic-a-source.md | primary | expert | Tier 2 | topic-a | wave1_topic | accepted | 2026-07-06 |',
    ]);
    writeFileSync(join(dir, 'reference', 'topic-a-source.md'), referenceContent({
      source_url: sourceUrl,
      related_topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      coreContent: 'This Phase-owned topic reference cites artifacts/wave1/topic-a/evidence-summary.md and _cache/wave1/primary/topic-a/s01_source as submitted backing for the source URL.',
    }));

    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave1',
      kind: 'wave1_topic_deepening',
      output_selectors: { glob: 'reference/topic-a*.md', roles: ['reference'] },
    });
    const presence = checkWorkUnitSubmissionPresence(dir, {
      wave: 'wave1',
      kind: 'wave1_topic_deepening',
      output_selectors: { glob: 'reference/topic-a*.md', roles: ['reference'] },
    });

    assert.equal(coverage.passed, true, coverage.inspect.join('; '));
    assert.equal(presence.passed, true, presence.inspect.join('; '));
  });

  it('rejects a Wave1 topic reference whose source URL has no submitted backing', () => {
    const dir = tempDir('wpg-wave1-unbacked-');
    writeIndex(dir, [
      '| reference/topic-a-source.md | primary | expert | Tier 2 | topic-a | wave1_topic | accepted | 2026-07-06 |',
    ]);
    writeFileSync(join(dir, 'reference', 'topic-a-source.md'), referenceContent({
      source_url: 'https://fixture.news-research.com/research/unsubmitted',
      related_topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
      coreContent: 'This reference names artifacts/wave1/topic-a/evidence-summary.md, but the URL is absent from submitted source claims, accepted URL surfaces, cache trails, and degraded capture backing.',
    }));

    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave1',
      kind: 'wave1_topic_deepening',
      output_selectors: { glob: 'reference/*.md', roles: ['reference'] },
    });

    assert.equal(coverage.passed, false);
    assert.match(coverage.inspect.join('\n'), /projection_backing_drift/);
    assert.match(coverage.advice.join('\n'), /supplement|repair|Submit delegated outputs|Phase-owned reference backing/i);
  });

  it('passes output coverage and submission presence for a real submit', () => {
    const dir = tempDir('wpg-submitted-');
    claimAndSubmitWorkUnit(dir, {
      phase: 'wave1',
      queueItemId: 'queue-b',
      outputs: [{
        path: 'reference/topic-a-source.md',
        role: 'reference',
        source_url: 'https://fixture.news-research.com/research/article',
        source_slug: 's01_source',
        content: '# Source\n',
      }],
    });

    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave1',
      kind: 'wave1_topic_deepening',
      output_selectors: { glob: 'reference/*.md', roles: ['reference'] },
    });
    const presence = checkWorkUnitSubmissionPresence(dir, {
      wave: 'wave1',
      kind: 'wave1_topic_deepening',
    });

    assert.equal(coverage.passed, true);
    assert.equal(presence.passed, true);
  });

  it('reports delegated bypass suspicion for direct artifacts without submitted coverage', () => {
    const dir = tempDir('wpg-bypass-');
    mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-a'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave1', 'topic-a', 'evidence-summary.md'), '# Evidence\n');
    writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ bundle: 'wpg-bypass' }));

    const result = detectDelegatedBypassSuspicion(dir, 'wave1', 'wave1-complete');
    const check = checkDelegatedBypassSuspected(dir, { wave: 'wave1', gate: 'wave1-complete' });

    assert.equal(result.suspected, true);
    assert.equal(check.passed, false);
    assert.match(check.inspect.join('\n'), /delegated_bypass_suspected/);
  });

  it('treats only an exact hash-valid superseded predecessor as historical bypass context', () => {
    const dir = tempDir('wpg-superseded-bypass-');
    const predecessor = claimAndSubmitWorkUnit(dir, { phase: 'wave0', queueItemId: 'queue-superseded' });
    writeFileSync(join(dir, 'artifacts/wave0/topic-a/source.yaml'), [
      '- url: https://fixture.news-research.com/research/article',
      '  title: Corrected source capture',
      '  retrieved_date: 2026-07-20',
      '  topic_tag: topic-a',
      '',
    ].join('\n'));
    const superseded = supersedeWorkUnitAttempt(dir, {
      work_id: predecessor.record.work_id,
      reason: 're-submit accepted source under a successor attempt',
    });
    assert.equal(superseded.ok, true, superseded.missing_fact);
    submitSupersessionSuccessor(dir, predecessor);

    const historical = scanDelegatedBypassSuspicion(dir, 'wave0');
    assert.equal(historical.suspected, false, historical.provenanceMissing?.join('; '));

    const ledgerPath = join(dir, 'rb_output_declarations.jsonl');
    const rows = readFileSync(ledgerPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    const predecessorRow = rows.find((row) => row.work_id === predecessor.record.work_id);
    predecessorRow.ledger_record_hash = '0'.repeat(64);
    writeFileSync(ledgerPath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);

    const drifted = scanDelegatedBypassSuspicion(dir, 'wave0');
    assert.equal(drifted.suspected, true);
    assert.match(drifted.provenanceMissing.join('\n'), /not submitted work-unit ledger rows/);
  });

  it('keeps bypass scanning pure and emits durable diagnostics only when asked', () => {
    const dir = tempDir('wpg-bypass-pure-');
    mkdirSync(join(dir, 'artifacts', 'wave1', 'topic-a'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave1', 'topic-a', 'evidence-summary.md'), '# Evidence\n');
    writeFileSync(join(dir, 'rb_status.json'), JSON.stringify({ bundle: 'wpg-bypass-pure' }));
    writeFileSync(join(dir, 'rb_trace.jsonl'), '');

    const beforeTrace = readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8');
    const result = scanDelegatedBypassSuspicion(dir, 'wave1');
    assert.equal(result.suspected, true);
    assert.equal(readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8'), beforeTrace);
    assert.equal(existsSync(join(dir, '_logs', 'run.log')), false);

    const emitted = emitDelegatedBypassDiagnostic(dir, 'wave1-complete', result);
    assert.equal(emitted.traceWritten, true);
    assert.equal(emitted.logWritten, true);
    assert.equal(readFileSync(join(dir, 'rb_trace.jsonl'), 'utf8').trim().split('\n').length, 1);
    assert.match(readFileSync(join(dir, '_logs', 'run.log'), 'utf8'), /delegated_bypass_suspected/);
  });

  it('does not require Wave2 work-unit rows for pure synthesis artifacts', () => {
    const dir = tempDir('wpg-wave2-pure-');
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave2', 'synthesis.md'), '# Synthesis\n');

    const result = detectDelegatedBypassSuspicion(dir, 'wave2', 'wave2-complete');
    assert.equal(result.suspected, false);
  });

  it('accepts an existing-backed Wave2 00-cross projection without a new Wave2 row', () => {
    const dir = tempDir('wpg-wave2-existing-backed-');
    const sourceUrl = 'https://fixture.news-research.com/research/prior-source';
    submitWave1SourceBacking(dir, { sourceUrl, topic: 'topic-a' });
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave2', 'finding-index.yaml'), [
      'version: "0.1"',
      'findings:',
      '  - id: W2F-001',
      '    decision: use_existing_evidence',
      '    search_required: false',
    ].join('\n'));
    writeFileSync(join(dir, 'artifacts', 'wave2', 'cross-topic-ledger.md'), '# Ledger\n\nW2F-001\n');
    writeIndex(dir, [
      '| reference/00-cross-w2f-001-topic-a.md | primary | expert | Tier 2 | cross-topic | wave2_cross | accepted | 2026-07-06 |',
    ]);
    writeFileSync(join(dir, 'reference', '00-cross-w2f-001-topic-a.md'), referenceContent({
      source_url: sourceUrl,
      related_topic_uid: 'all',
      evidence_role: 'cross_topic_projection',
      coreContent: 'W2F-001 is linked to artifacts/wave2/finding-index.yaml, artifacts/wave2/cross-topic-ledger.md, artifacts/wave1/topic-a/evidence-summary.md, and _cache/wave1/primary/topic-a/s01_source as prior submitted backing.',
    }));

    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave2',
      kind: 'wave2_targeted_evidence',
      output_selectors: { glob: 'reference/00-cross-*.md', roles: ['reference'] },
    });
    const presence = checkWorkUnitSubmissionPresence(dir, {
      wave: 'wave2',
      kind: 'wave2_targeted_evidence',
      output_selectors: { glob: 'reference/00-cross-*.md', roles: ['reference'] },
    });
    const bypass = detectDelegatedBypassSuspicion(dir, 'wave2', 'wave2-complete');

    assert.equal(coverage.passed, true, coverage.inspect.join('; '));
    assert.equal(presence.passed, true, presence.inspect.join('; '));
    assert.equal(bypass.suspected, false, bypass.provenanceMissing?.join('; '));
  });

  it('accepts a submitted Wave2 targeted-evidence row for a new 00-cross reference', () => {
    const dir = tempDir('wpg-wave2-targeted-');
    const sourceUrl = 'https://fixture.news-research.com/research/new-wave2-targeted-source';
    claimAndSubmitWorkUnit(dir, {
      phase: 'wave2',
      queueItemId: 'w2-targeted',
      outputs: [{
        path: 'reference/00-cross-w2f-004-new.md',
        role: 'reference',
        source_url: sourceUrl,
        source_slug: 's01_targeted',
        content: referenceContent({
          source_url: sourceUrl,
          related_topic_uid: 'all',
          evidence_role: 'cross_topic_projection',
          coreContent: 'W2F-004 targeted evidence was fetched by a Wave2 work unit and materialized as a submitted reference output.',
        }),
      }],
    });
    writeIndex(dir, [
      '| reference/00-cross-w2f-004-new.md | primary | expert | Tier 2 | cross-topic | wave2_cross | accepted | 2026-07-06 |',
    ]);

    const classification = classifyReferenceAuthority(dir, 'reference/00-cross-w2f-004-new.md');
    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave2',
      kind: 'wave2_targeted_evidence',
      output_selectors: { glob: 'reference/00-cross-*.md', roles: ['reference'] },
    });
    const presence = checkWorkUnitSubmissionPresence(dir, {
      wave: 'wave2',
      kind: 'wave2_targeted_evidence',
      output_selectors: { glob: 'reference/00-cross-*.md', roles: ['reference'] },
    });

    assert.equal(classification.passed, true, classification.reason);
    assert.equal(classification.authority, 'delegated_fetched_evidence');
    assert.equal(coverage.passed, true, coverage.inspect.join('; '));
    assert.equal(presence.passed, true, presence.inspect.join('; '));
  });

  it('rejects a Wave2 00-cross reference when source_layer and index coverage are the only authority', () => {
    const dir = tempDir('wpg-wave2-new-unsubmitted-');
    const priorUrl = 'https://fixture.news-research.com/research/prior-source';
    submitWave1SourceBacking(dir, { sourceUrl: priorUrl, topic: 'topic-a' });
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave2', 'finding-index.yaml'), 'findings:\n  - id: W2F-002\n    decision: use_existing_evidence\n    search_required: false\n');
    writeFileSync(join(dir, 'artifacts', 'wave2', 'cross-topic-ledger.md'), '# Ledger\n\nW2F-002\n');
    writeIndex(dir, [
      '| reference/00-cross-w2f-002-new.md | primary | expert | Tier 2 | cross-topic | wave2_cross | accepted | 2026-07-06 |',
    ]);
    writeFileSync(join(dir, 'reference', '00-cross-w2f-002-new.md'), referenceContent({
      source_url: 'https://fixture.news-research.com/research/new-wave2-source',
      related_topic_uid: 'all',
      evidence_role: 'cross_topic_projection',
      coreContent: 'W2F-002 cites artifacts/wave2/finding-index.yaml, artifacts/wave2/cross-topic-ledger.md, artifacts/wave1/topic-a/evidence-summary.md, and _cache/wave1/primary/topic-a/s01_source, but the metadata source_url is newly introduced.',
    }));

    const indexCoverage = checkReferenceIndexCoverage(dir, [{
      relPath: 'reference/00-cross-w2f-002-new.md',
      absPath: join(dir, 'reference', '00-cross-w2f-002-new.md'),
    }], { sourceLayer: 'wave2_cross' });
    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave2',
      kind: 'wave2_targeted_evidence',
      output_selectors: { glob: 'reference/00-cross-*.md', roles: ['reference'] },
    });
    const bypass = detectDelegatedBypassSuspicion(dir, 'wave2', 'wave2-complete');

    assert.equal(indexCoverage.passed, true, indexCoverage.inspect.join('; '));
    assert.equal(coverage.passed, false);
    assert.match(coverage.inspect.join('\n'), /source_url is not a prior accepted backing URL/);
    assert.equal(bypass.suspected, true);
  });

  it('rejects a Wave2 00-cross reference backed only by another unbacked reference', () => {
    const dir = tempDir('wpg-wave2-ref-chain-');
    const sourceUrl = 'https://fixture.news-research.com/research/prior-source';
    submitWave1SourceBacking(dir, { sourceUrl, topic: 'topic-a' });
    mkdirSync(join(dir, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(dir, 'artifacts', 'wave2', 'finding-index.yaml'), 'findings:\n  - id: W2F-003\n    decision: use_existing_evidence\n    search_required: false\n');
    writeFileSync(join(dir, 'artifacts', 'wave2', 'cross-topic-ledger.md'), '# Ledger\n\nW2F-003\n');
    writeIndex(dir, [
      '| reference/topic-b-unbacked.md | primary | expert | Tier 2 | topic-b | wave1_topic | accepted | 2026-07-06 |',
      '| reference/00-cross-w2f-003-chain.md | primary | expert | Tier 2 | cross-topic | wave2_cross | accepted | 2026-07-06 |',
    ]);
    writeFileSync(join(dir, 'reference', 'topic-b-unbacked.md'), referenceContent({
      source_url: 'https://fixture.news-research.com/research/unbacked-chain-source',
      related_topic_uid: 'tp_123e4567-e89b-12d3-a456-426614174000',
    }));
    writeFileSync(join(dir, 'reference', '00-cross-w2f-003-chain.md'), referenceContent({
      source_url: sourceUrl,
      related_topic_uid: 'all',
      evidence_role: 'cross_topic_projection',
      coreContent: 'W2F-003 cites artifacts/wave2/finding-index.yaml, artifacts/wave2/cross-topic-ledger.md, and reference/topic-b-unbacked.md, but no concrete prior-wave source/cache/work-unit backing ref appears in the body.',
    }));

    const coverage = checkWorkUnitOutputCoverage(dir, {
      wave: 'wave2',
      kind: 'wave2_targeted_evidence',
      output_selectors: { glob: 'reference/00-cross-*.md', roles: ['reference'] },
    });

    assert.equal(coverage.passed, false);
    assert.match(coverage.inspect.join('\n'), /locator refs do not resolve to submitted prior-wave backing/);
  });
});
