#!/usr/bin/env node
// @impl CHI-001, RWG-018
// Integration lifecycle coverage for harden-phase-handoff-witnessing.
// Uses real disposable bundles and real framework CLIs. Fixture writes stage
// Agent-produced artifacts only; gate_attempt/load_complete/phase_transition
// evidence must be emitted by the production CLIs under test.

import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';

import {
  claimAndSubmitFixtureWorkUnit,
  readWorkUnitLedgerRows,
} from '../../../experiments_env/shared/work-unit-playbook-utils.mjs';
import {
  applyCanonicalTopicState,
  renderSeedProjectionAppendix,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { canonicalWave1ReferencePath } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave1-reference-convergence.mjs';

const REPO_ROOT = process.cwd();
const bundles = [];
const checks = [];
const healthReports = [];

function runNode(args, { input = null, allowFailure = false, timeout = 20000 } = {}) {
  const result = spawnSync('node', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    input,
    maxBuffer: 10 * 1024 * 1024,
    timeout,
    stdio: input === null ? ['ignore', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`node ${args.join(' ')} failed (${result.status})\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return result;
}

function parseJsonObject(text) {
  const trimmed = String(text || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw err;
  }
}

function tracePath(bundle) {
  return join(bundle, 'rb_trace.jsonl');
}

function traceEvents(bundle) {
  const raw = readFileSync(tracePath(bundle), 'utf8').trim();
  return raw ? raw.split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
}

function readStatus(bundle) {
  return JSON.parse(readFileSync(join(bundle, 'rb_status.json'), 'utf8'));
}

function assertCurrentNode(bundle, expected, context) {
  const status = readStatus(bundle);
  if (status.current_node !== expected) {
    throw new Error(`${context}: expected rb_status.current_node=${expected}, got ${status.current_node}`);
  }
}

function appendTrace(bundle, event) {
  appendFileSync(tracePath(bundle), JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n');
}

function submittedWorkUnitCovers(bundle, outputPath) {
  return readWorkUnitLedgerRows(bundle)
    .some((row) => row.output_files?.some((entry) => entry.path === outputPath));
}

function submitExistingFixtureWorkUnitOnce(bundle, {
  phase,
  queue_item_id,
  topic_slug = 'topic-a',
  title,
  output_path,
  role = 'reference',
  source_url,
  source_slug,
  extra_output_files = [],
}) {
  if (submittedWorkUnitCovers(bundle, output_path)) return null;
  const outputFile = join(bundle, output_path);
  const extraFiles = extra_output_files.map((entry) => ({
    ...entry,
    content: readFileSync(join(bundle, entry.path), 'utf8'),
  }));
  const result = claimAndSubmitFixtureWorkUnit(bundle, {
    phase,
    queue_item_id,
    topic_slug,
    title,
    output_path,
    role,
    source_url,
    source_slug,
    output_content: readFileSync(outputFile, 'utf8'),
    extra_output_files: extraFiles,
  });
  if (result.submit?.ok !== true) {
    throw new Error(`work-unit fixture submit failed for ${queue_item_id}: ${JSON.stringify(result.submit)}`);
  }
  return result;
}

function recordCheck(bundle, gate, passed, detail, expected = true) {
  const entry = {
    ts: new Date().toISOString(),
    event: 'check',
    source: 'playbook',
    gate,
    passed,
    expected,
    detail,
  };
  appendFileSync(tracePath(bundle), JSON.stringify(entry) + '\n');
  checks.push({ bundle, gate, passed, expected, detail });
  const ok = passed === expected;
  console.log(`${ok ? 'OK' : 'FAIL'} ${gate}: ${detail}`);
}

function expect(bundle, gate, condition, detail) {
  recordCheck(bundle, gate, Boolean(condition), detail, true);
  if (!condition) throw new Error(`E2E assertion failed: ${gate}: ${detail}`);
}

function expectBoundary(bundle, gate, condition, detail) {
  recordCheck(bundle, gate, Boolean(condition), detail, false);
  if (condition !== false) throw new Error(`Expected boundary rejection did not occur: ${gate}: ${detail}`);
}

function createBundle(label) {
  const name = `handoff_witnessing_${label}`;
  const result = runNode([
    'experiments_env/shared/new-disposable-bundle.mjs',
    name,
    '--case',
    'case-501',
    '--target-dir',
    'tests/.test-bundles',
    '--force',
  ]);
  const bundle = result.stdout.trim().split('\n').filter(Boolean).at(-1);
  bundles.push(bundle);
  return { bundle, name };
}

function setStatus(bundle, currentGate, nextGate) {
  const path = join(bundle, 'rb_status.json');
  const status = JSON.parse(readFileSync(path, 'utf8'));
  status.current_gate = currentGate;
  status.next_gate = nextGate;
  status.state = 'in_progress';
  writeFileSync(path, JSON.stringify(status, null, 2) + '\n');
}

function writeBasePlanAndProfile(bundle, planBasename, { hitl2Decision = 'not_started', rationale = '' } = {}) {
  writeFileSync(join(bundle, 'rb_plan.md'), `---
{
  "plan_basename": "${planBasename}",
  "topic_registry_version": "2",
  "derived_topic_count": 1,
  "topic_registry": [
    {
      "topic_uid": "tp_11111111-1111-4111-8111-111111111111",
      "id": "t1",
      "slug": "topic-a",
      "title": "Topic A",
      "must_answer": ["How does handoff witnessing prevent status laundering?"],
      "scope_role": "primary",
      "depends_on_topic_uids": []
    }
  ]
}
---
# Plan

## Goal Purpose
Prove phase handoff witnessing with a disposable bundle.

## Research Questions
- How does the handoff witness prevent status laundering?

## Scope
Use deterministic fixture artifacts to exercise real framework gates.
`);

  writeFileSync(join(bundle, 'rb_profile.yaml'), `plan_basename: ${planBasename}
research_profile: quick_factual
root_must_answer_set:
  - "How does handoff witnessing prevent status laundering?"
research_style_params:
  user_visible: false
  wave0_per_topic_source_floor: 1
  wave0_shared_ref_total: 1
  wave1_per_topic_ref_floor: 1
  topic_unique_ratio: 1
  counterexample_search: false
  cross_verification: false
  p0p1_independent_backing: 1
  quality_min_tier: tier_4
  quality_min_substance: none
  wave2_cross_topic_depth: 0
  wave2_emergent_search_rounds: 0
research_access:
  status: available
  probed_at: "2026-08-11T00:00:00.000Z"
  sample_observations:
    - { sample_id: gov_cn, source_group: china, outcome: content, retrieval_surface: native }
    - { sample_id: gitee, source_group: china, outcome: failed }
    - { sample_id: xinhuanet, source_group: china, outcome: failed }
    - { sample_id: cnki_catalog, source_group: china, outcome: failed }
    - { sample_id: wikipedia, source_group: overseas, outcome: failed }
    - { sample_id: github, source_group: overseas, outcome: failed }
    - { sample_id: iana, source_group: overseas, outcome: failed }
    - { sample_id: arxiv, source_group: overseas, outcome: failed }
    - { sample_id: rfc_editor, source_group: overseas, outcome: failed }
human_decision_checkpoints:
  hitl1:
    status: recorded
    recorded_at: "2026-07-05T00:00:00.000Z"
    research_profile: quick_factual
    root_must_answer_set:
      - "How does handoff witnessing prevent status laundering?"
    answerability_class: ready_substantive
  hitl2:
    status: ${hitl2Decision === 'not_started' ? 'not_started' : 'recorded'}
    answerability_class: not_assessed
    user_decision: ${hitl2Decision}
    final_report_view: profile_default
    rationale: "${rationale}"
    rerun_count: 1
    composition_handoff:
      contract_version: 1
      for_rerun_count: 1
      reader:
        description: "A reader reviewing the Final lifecycle boundary."
        familiarity: working
      intended_use: "Verify handoff witnessing and recovery behavior."
      primary_focus: "Lifecycle integrity and receipt-bound composition."
      content_priorities:
        foreground:
          - "Lifecycle evidence"
        compress:
          - "Background detail"
      delivery:
        language: en
        length: standard
        evidence_exposure: balanced
        appendix: as_needed
    recorded_at: "2026-07-05T00:00:00.000Z"
`);

  runNode([
    'DEEP_RESEARCH_HARNESS/cli/apply-research-style.mjs',
    '--bundle', bundle,
    '--style', 'quick_factual',
  ]);
  stageSeedTopic(bundle);
}

function runGate(bundle, gateKey, currentNode, { attempt } = {}) {
  const args = [
    'experiments_env/shared/run-gate-with-monitor.mjs',
    '--bundle',
    bundle,
    '--gate',
    gateKey,
    '--',
    'node',
    `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-${gateKey}.mjs`,
    '--bundle',
    bundle,
    '--current-node',
    currentNode,
  ];
  if (attempt !== undefined) args.push('--attempt', String(attempt));
  const result = runNode(args, { allowFailure: true, timeout: 30000 });
  let json;
  try {
    json = JSON.parse(result.stdout.trim());
  } catch (err) {
    throw new Error(`Gate ${gateKey} did not emit JSON: ${err.message}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  }
  return { status: result.status, json };
}

function enterPhase(bundle, nodeRef, { expectSuccess = true } = {}) {
  const result = runNode([
    'DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs',
    '--bundle',
    bundle,
    '--node',
    nodeRef,
  ], { allowFailure: !expectSuccess, timeout: 30000 });

  if (expectSuccess) {
    if (result.status !== 0) {
      throw new Error(`enter-phase ${nodeRef} failed\n${result.stdout}\n${result.stderr}`);
    }
    assertCurrentNode(bundle, nodeRef, `enter-phase ${nodeRef}`);
    return { status: result.status, stdout: result.stdout, json: null };
  }

  let json = null;
  try { json = JSON.parse(result.stdout.trim()); } catch { /* negative stdout may be non-json if CLI crashes */ }
  return { status: result.status, stdout: result.stdout, json };
}

function advanceStatus(bundle, gateEnum, { expectSuccess = true } = {}) {
  const priorCurrentNode = expectSuccess ? readStatus(bundle).current_node : undefined;
  const result = runNode([
    'DEEP_RESEARCH_HARNESS/cli/advance-status.mjs',
    '--bundle',
    bundle,
    '--to',
    gateEnum,
  ], { allowFailure: !expectSuccess, timeout: 20000 });
  let json;
  try {
    json = JSON.parse(result.stdout.trim());
  } catch (err) {
    throw new Error(`advance-status ${gateEnum} did not emit JSON: ${err.message}\n${result.stdout}\n${result.stderr}`);
  }
  if (expectSuccess) {
    assertCurrentNode(bundle, priorCurrentNode, `advance-status ${gateEnum}`);
  }
  return { status: result.status, json };
}

function assertLatestLoad(bundle, sourceGate, sourceNode, targetNode) {
  const events = traceEvents(bundle);
  const load = [...events].reverse().find(e => e.event === 'load_complete' && e.entry === targetNode);
  const attempt = events[load?.handoff_source_attempt_index];
  return Boolean(
    load &&
    load.handoff_source_gate === sourceGate &&
    load.handoff_source_node === sourceNode &&
    load.handoff_target_node === targetNode &&
    Number.isInteger(load.handoff_source_attempt_index) &&
    attempt?.event === 'gate_attempt' &&
    attempt?.gate === sourceGate &&
    attempt?.currentNodeRef === sourceNode &&
    attempt?.next === targetNode
  );
}

function stageSeedTopic(bundle) {
  writeFileSync(join(bundle, 'seed_topics/topic-a.md'), `---
topic_uid: tp_11111111-1111-4111-8111-111111111111
id: t1
slug: topic-a
title: Topic A
must_answer:
  - How does handoff witnessing prevent status laundering?
scope_role: primary
depends_on_topic_uids: []
---

# Topic A

## Background
This seed topic is deterministic fixture content for gate validation.

${renderSeedProjectionAppendix()}
`);
}

function wave0SourceYamlContent() {
  return `- url: "https://research.example.org/articles/handoff-witnessing-study-2026"
  title: "Handoff Witnessing Reference"
  retrieved_date: "2026-07-05"
  topic_tag: "topic-a"
`;
}

function ensureWave0Scaffold(bundle) {
  if (readWorkUnitLedgerRows(bundle).some((row) => row.queue_item_id === 'wave0-source-topic-a')) return;
  mkdirSync(join(bundle, 'artifacts/wave0/topic-a'), { recursive: true });
  writeFileSync(join(bundle, 'reference/_INDEX.md'),
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |\n' +
    '| --- | --- | --- | --- | --- | --- | --- | --- |\n' +
    '| 00-shared-handoff.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-05 |\n');
  writeFileSync(join(bundle, 'reference/README.md'), '# Reference Evidence\n');
  writeFileSync(join(bundle, 'reference/00-shared-handoff.md'),
    '- source_url: https://research.example.org/articles/handoff-witnessing-study-2026\n' +
    '- acceptance_status: accepted\n' +
    '- source_type: secondary\n' +
    '- tier: Tier 2\n' +
    '- evidence_role: foundation\n' +
    '- trust_level: practitioner\n' +
    '- why_it_matters: Establishes fixture evidence for handoff witnessing.\n' +
    '- accessed_at: 2026-07-05\n' +
    '- related_topic_uid: all\n\n' +
    '## Key Facts\n' +
    '- Handoff witnesses bind source gate attempts to target node loads.\n' +
    '- Status sync follows witnessed route-bound load completion.\n' +
    '- Downstream gates check source-gate status windows.\n' +
    '- Rerun branches require selected trace targets.\n' +
    '- Entry witnesses do not prove target work completion.\n\n' +
    '## Core Content Capture\n' +
    'This deterministic fixture is intentionally substantive enough for reference quality gates while avoiding any claim that a real Agent performed external research in this standard mechanism proof.\n\n' +
    '## Relevance To This Research\nRelevant to the handoff witnessing mechanism.\n\n' +
    '## Quotable Terms / Concepts\n- route-bound load witness\n\n' +
    '## Risks And Limitations\n- Fixture evidence only.\n');

  writeFileSync(join(bundle, 'artifacts/wave0/topic-a/source.yaml'), wave0SourceYamlContent());
  const submitted = submitExistingFixtureWorkUnitOnce(bundle, {
    phase: 'wave0',
    queue_item_id: 'wave0-source-topic-a',
    topic_slug: 'topic-a',
    title: 'Handoff witnessing Wave0 source intake',
    output_path: 'reference/00-shared-handoff.md',
    source_url: 'https://research.example.org/articles/handoff-witnessing-study-2026',
    source_slug: 'handoff-witnessing-study',
    extra_output_files: [
      { path: 'artifacts/wave0/topic-a/source.yaml', role: 'source_yaml' },
    ],
  });
  if (!submitted) return;
  const referencePath = 'reference/00-shared-handoff.md';
  writeFileSync(join(bundle, referencePath), `${readFileSync(join(bundle, referencePath), 'utf8').trimEnd()}\n\n## Submitted Backing\n- source_identity: ${submitted.record.work_id}/1\n- source_yaml_ref: artifacts/wave0/topic-a/source.yaml\n- cache_trail_ref: ${submitted.cache_trails[0]}\n- result_ref: ${submitted.record.paths.result_ref}\n- work_unit_ref: ${submitted.record.paths.work_unit_dir}\n\n## Navigation Return Map\n- evidence_meaning: Submitted Wave0 evidence supplies the handoff witnessing foundation.\n  relationship: supports\n  refs: artifacts/wave0/topic-a/source.yaml\n  status: supported\n  next_hop: Read the submitted source before Wave1 deepening.\n`);
  const projected = applyCanonicalTopicState({
    bundlePath: bundle,
    input: {
      context: 'wave_projection',
      action: 'apply_seed_projection',
      topic_uid: 'tp_11111111-1111-4111-8111-111111111111',
      wave: 'wave0',
      updates: [{
        slot_id: 'wave0_evidence',
        entries: [{
          source_identity: { kind: 'submitted_work', work_id: submitted.record.work_id },
          entry_id: `${submitted.record.work_id}/1`,
          evidence_meaning: 'Submitted Wave0 evidence supplies the handoff witnessing foundation.',
          relationship: 'supports',
          refs: [referencePath],
          status: 'supported',
          next_hop: 'Read the submitted source before Wave1 deepening.',
        }],
      }],
    },
  });
  if (!['committed', 'unchanged'].includes(projected.verdict)) {
    throw new Error(`wave0 projection fixture failed: ${JSON.stringify(projected)}`);
  }
}

function stageWave0ParseFailure(bundle) {
  ensureWave0Scaffold(bundle);
  writeFileSync(join(bundle, 'artifacts/wave0/topic-a/source.yaml'), ': definitely-not-yaml\n');
}

function stageWave0CountFailure(bundle) {
  ensureWave0Scaffold(bundle);
  writeFileSync(join(bundle, 'artifacts/wave0/topic-a/source.yaml'), '[]\n');
}

function stageWave0Pass(bundle) {
  ensureWave0Scaffold(bundle);
  writeFileSync(join(bundle, 'artifacts/wave0/topic-a/source.yaml'), wave0SourceYamlContent());
  appendTrace(bundle, { event: 'wave0_completion', source: 'playbook-fixture' });
}

function wave1ReferenceContent(sourceUrl) {
  return '- source_url: ' + sourceUrl + '\n' +
    '- acceptance_status: accepted\n' +
    '- source_type: secondary\n' +
    '- tier: Tier 2\n' +
    '- evidence_role: deepening_reference\n' +
    '- trust_level: practitioner\n' +
    '- why_it_matters: Deepening evidence.\n' +
    '- accessed_at: 2026-07-05\n' +
    '- related_topic_uid: tp_11111111-1111-4111-8111-111111111111\n\n' +
    '## Key Facts\n- Fact one.\n- Fact two.\n- Fact three.\n- Fact four.\n- Fact five.\n\n' +
    '## Core Content Capture\nThis section is long enough to satisfy the reference quality gate and describes how route-bound witnesses connect source gate outputs to target phase entry.\n' +
    '## Relevance To This Research\nRelevant.\n## Quotable Terms / Concepts\n- witness\n## Risks And Limitations\n- Fixture.\n';
}

function stageWave1Pass(bundle) {
  mkdirSync(join(bundle, 'artifacts/wave1/topic-a'), { recursive: true });
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/evidence-summary.md'), `# Evidence Summary: Topic A

## Source URLs
- [Deepening Source](https://research.example.org/articles/topic-a-deepening-analysis-2026) — retrieved 2026-07-05

## Key Findings
1. **机制理解**: Handoff witnessing requires source gate and target entry evidence.

## Open Questions
1. [开放] How can stale handoffs be detected?
`);
  writeFileSync(join(bundle, 'artifacts/wave1/topic-a/question-list.md'), `# Question List - Topic: Topic A

## Topic Investigation Targets

| target_id | target_question | origin | status | backing_refs | next_action |
| --- | --- | --- | --- | --- | --- |
| topic-a-T01 | How can stale handoffs be detected? | seed | 开放 | https://research.example.org/articles/topic-a-deepening-analysis-2026 | 移交 wave2 |

## Question Reconciliation

- [部分进展] Stale handoffs can be detected by latest trace target checks.

## Emergent Question Protocol

- result: no_new_questions_after_protocol

## Exploration / Exploitation Decision

- decision: continue
`);
  writeFileSync(join(bundle, 'seed_topics/topic-a.md'), `---
topic_uid: tp_11111111-1111-4111-8111-111111111111
id: t1
slug: topic-a
title: Topic A
must_answer:
  - How does handoff witnessing prevent status laundering?
scope_role: primary
depends_on_topic_uids: []
---

# Topic A

${renderSeedProjectionAppendix()}
`);
  const sourceRef = 'artifacts/wave1/topic-a/evidence-summary.md';
  const wave1Sources = Array.from({ length: 5 }, (_, index) => {
    const ordinal = index + 1;
    const sourceUrl = ordinal === 1
      ? 'https://research.example.org/articles/topic-a-deepening-analysis-2026'
      : `https://research.example.org/articles/topic-a-deepening-analysis-${ordinal}-2026`;
    return {
      sourceUrl,
      sourceSlug: `topic-a-deepening-analysis-${ordinal}`,
      outputPath: ordinal === 1
        ? 'reference/topic-a-deepening.md'
        : `reference/topic-a-deepening-${ordinal}.md`,
    };
  });
  const submissions = [];
  for (const source of wave1Sources) {
    writeFileSync(join(bundle, source.outputPath), wave1ReferenceContent(source.sourceUrl));
    const submitted = submitExistingFixtureWorkUnitOnce(bundle, {
      phase: 'wave1',
      queue_item_id: `wave1-deepening-topic-a-${source.sourceSlug}`,
      topic_slug: 'topic-a',
      title: 'Handoff witnessing Wave1 topic deepening',
      output_path: source.outputPath,
      source_url: source.sourceUrl,
      source_slug: source.sourceSlug,
      extra_output_files: [
        { path: sourceRef, role: 'evidence_summary' },
        { path: 'artifacts/wave1/topic-a/question-list.md', role: 'question_list' },
      ],
    });
    if (!submitted) throw new Error(`Wave1 fixture must submit ${source.outputPath}`);
    const canonical = canonicalWave1ReferencePath({ topicSlug: 'topic-a', sourceUrl: source.sourceUrl });
    if (!canonical.ok) throw new Error(`Wave1 canonical reference path failed: ${JSON.stringify(canonical)}`);
    const submittedBacking = `\n## Submitted Backing\n- source_ref: ${sourceRef}\n- cache_trail_ref: ${submitted.cache_trails[0]}\n- result_ref: ${submitted.record.paths.result_ref}\n- work_unit_ref: ${submitted.record.paths.work_unit_dir}\n`;
    writeFileSync(join(bundle, source.outputPath), `${readFileSync(join(bundle, source.outputPath), 'utf8').trimEnd()}${submittedBacking}`);
    const stagingPath = join(bundle, '_tmp', `${submitted.record.work_id}.wave1-reference.md`);
    mkdirSync(join(bundle, '_tmp'), { recursive: true });
    writeFileSync(stagingPath, `${readFileSync(join(bundle, source.outputPath), 'utf8').trimEnd()}${submittedBacking}`);
    const persisted = parseJsonObject(runNode([
      'DEEP_RESEARCH_HARNESS/cli/operate-artifact-persistence.mjs',
      'persist', '--bundle', bundle, '--source', stagingPath, '--target', canonical.path,
      '--expect-absent',
    ]).stdout);
    if (persisted.verdict !== 'committed') throw new Error(`Wave1 canonical reference persistence failed: ${JSON.stringify(persisted)}`);
    submissions.push({ submitted, canonicalPath: canonical.path });
  }
  const depthPath = join(bundle, 'artifacts/wave1/topic-a/depth-review.yaml');
  const depth = JSON.parse(readFileSync(depthPath, 'utf8'));
  depth.reviewed_work_unit_refs = submissions.map(({ submitted }) => submitted.record.paths.work_unit_dir);
  depth.carried_targets = [{
    target_id: 'handoff-integrity',
    target_text: 'How can stale handoffs be detected?',
  }];
  writeFileSync(depthPath, `${JSON.stringify(depth, null, 2)}\n`);
  const indexed = parseJsonObject(runNode([
    'DEEP_RESEARCH_HARNESS/cli/sync-reference-index.mjs', '--bundle', bundle,
  ]).stdout);
  if (!['committed', 'unchanged'].includes(indexed.verdict)) throw new Error(`Wave1 reference index sync failed: ${JSON.stringify(indexed)}`);
  const entries = submissions.map(({ submitted, canonicalPath }, index) => ({
    source_identity: { kind: 'submitted_work', work_id: submitted.record.work_id },
    entry_id: `${submitted.record.work_id}/${index + 1}`,
    evidence_meaning: 'Submitted Wave1 evidence supports handoff witnessing.',
    relationship: 'supports', refs: [canonicalPath], status: 'supported',
    next_hop: 'Read the submitted Wave1 reference before Wave2 synthesis.',
  }));
  const projected = applyCanonicalTopicState({
    bundlePath: bundle,
    input: {
      context: 'wave_projection',
      action: 'apply_seed_projection',
      topic_uid: 'tp_11111111-1111-4111-8111-111111111111',
      wave: 'wave1',
      updates: [
        { slot_id: 'wave1_mechanisms', entries },
        { slot_id: 'wave1_trends', entries },
        { slot_id: 'pending_questions', entries },
      ],
    },
  });
  if (!['committed', 'unchanged'].includes(projected.verdict)) throw new Error(`Wave1 projection fixture failed: ${JSON.stringify(projected)}`);
  appendTrace(bundle, { event: 'wave1_completion', source: 'playbook-fixture' });
}

function stageWave2Pass(bundle) {
  const receipt = traceEvents(bundle).filter((event) => event.event === 'gate_attempt' && event.gate === 'wave1-complete' && event.passed === true).at(-1)?.carried_target_receipt;
  if (!receipt?.targets?.[0]) throw new Error('Wave2 fixture requires the routed Wave1 carried-target receipt');
  const carried = receipt.targets[0];
  mkdirSync(join(bundle, 'artifacts/wave2'), { recursive: true });
  writeFileSync(join(bundle, 'artifacts/wave2/synthesis.md'), `# Cross-Topic Synthesis

W2F-001: Based on [Topic A evidence](../wave1/topic-a/evidence-summary.md), the handoff witness closes the laundering seam.
`);
  writeFileSync(join(bundle, 'artifacts/wave2/cross-topic-ledger.md'), `# Cross-Topic Ledger

## Cross-Topic Scan Matrix

| pair_id | topics | checked_dimensions | finding_ids | notes |
| P01 | topic-a | handoff_integrity | W2F-001 | Single-topic fixture |

## Wave1 Legacy Questions

Tracked in topic-a question-list.

## Cross-Topic Resolutions

W2F-001 resolves the status-laundering concern.

## Emergent Cross-Topic Questions

None.

## Exploration Decisions

None.

## HITL2 Handoff

Proceed to HITL2 review.
`);
  writeFileSync(join(bundle, 'artifacts/wave2/finding-index.yaml'), `version: "0.1"
source_layer: wave2_cross_topic
ledger: artifacts/wave2/cross-topic-ledger.md
synthesis: artifacts/wave2/synthesis.md
scan:
  topic_count: 1
  pair_count_expected: 0
  pair_count_checked: 0
findings:
  - id: W2F-001
    type: cross_topic_resolution
    priority: p2
    status: resolved
    decision: use_existing_evidence
    affected_topics: [topic-a]
    origin_refs:
      - artifacts/wave1/topic-a/evidence-summary.md
    trigger_refs:
      - artifacts/wave1/topic-a/question-list.md
    search_required: false
    subagent_receipt_refs: []
    appears_in_synthesis: true
    hitl2_handoff: false
    confidence: medium
    independent_backing_refs: []
    gap_status: no_gap
    wave1_target_bindings:
      - receipt_sha256: ${receipt.receipt_sha256}
        topic_uid: ${carried.topic_uid}
        intent_sha256: ${carried.intent_sha256}
        target_id: ${carried.target_id}
        target_revision: ${carried.target_revision}
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
  writeFileSync(join(bundle, 'seed_topics/topic-a.md'), `---
topic_uid: tp_11111111-1111-4111-8111-111111111111
id: t1
slug: topic-a
title: Topic A
must_answer:
  - How does handoff witnessing prevent status laundering?
scope_role: primary
depends_on_topic_uids: []
---

# Topic A

## Wave2 Judgment
W2F-001 confirms that route-bound handoff evidence prevents status laundering.

## Pending Questions
- [部分解答] How can stale handoffs be detected?
`);
  appendTrace(bundle, { event: 'wave2_completion', source: 'playbook-fixture' });
}

function stageHitl2(bundle, decision) {
  mkdirSync(join(bundle, 'artifacts/hitl2'), { recursive: true });
  writeFileSync(join(bundle, 'artifacts/hitl2/decision-brief.md'), `# Final Review Decision Brief

## Key Findings

The standard E2E fixture reached HITL2 with real gate attempts and witnessed handoffs.

## Open Questions

None for the mechanism proof.

## Recommended Actions

${decision === 'rerun' ? 'Rerun with an adjusted direction.' : 'Proceed to final delivery.'}
`);
  const profile = readFileSync(join(bundle, 'rb_profile.yaml'), 'utf8')
    .replace(/status: (not_started|recorded)\n    answerability_class:/, 'status: recorded\n    answerability_class:')
    .replace(/user_decision: .*/, `user_decision: ${decision}`)
    .replace(/rationale: ".*"/, `rationale: "${decision === 'rerun' ? 'Add an extra handoff-witnessing angle.' : 'Ready for delivery.'}"`);
  writeFileSync(join(bundle, 'rb_profile.yaml'), profile);
  appendTrace(bundle, { event: 'hitl2_recorded', source: 'playbook-fixture' });
}

function stageFinalArtifact(bundle) {
  writeFileSync(join(bundle, 'final/report.md'), '# Final Report\n\nDelivered from verified fixture state.\n');
}

function prepareThroughWave0Entry(label) {
  const { bundle, name } = createBundle(label);
  writeBasePlanAndProfile(bundle, name);

  const inst = runGate(bundle, 'instantiation-complete', 'phases/phase-instantiation.md');
  expect(bundle, `${label}:instantiation-pass`, inst.json.check.passed === true, 'real instantiation gate passed');
  enterPhase(bundle, inst.json.check.next);

  const hitl1Bootstrap = advanceStatus(bundle, 'hitl1_recorded');
  expect(bundle, `${label}:hitl1-bootstrap-status`, hitl1Bootstrap.json.status === 'ok', 'bootstrap status enables hitl1 gate');

  const hitl1 = runGate(bundle, 'hitl1-recorded', 'phases/phase-hitl1.md');
  expect(bundle, `${label}:hitl1-pass`, hitl1.json.check.passed === true, 'real hitl1 gate passed');
  enterPhase(bundle, hitl1.json.check.next);

  const setupBootstrap = advanceStatus(bundle, 'setup_ready');
  expect(bundle, `${label}:setup-bootstrap-status`, setupBootstrap.json.status === 'ok', 'bootstrap status enables setup gate');

  const setup = runGate(bundle, 'setup-ready', 'phases/phase-setup.md');
  expect(bundle, `${label}:setup-pass`, setup.json.check.passed === true, 'real setup gate passed');
  enterPhase(bundle, setup.json.check.next);
  const setupSync = advanceStatus(bundle, 'setup_ready');
  expect(bundle, `${label}:setup-source-sync`, setupSync.json.current_gate === 'setup_ready' && setupSync.json.next_gate === 'seed_topics_ready', 'setup source-gate sync established seed-topics window');

  stageSeedTopic(bundle);
  const seed = runGate(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md');
  expect(bundle, `${label}:seed-pass`, seed.json.check.passed === true, 'real seed-topics gate passed');
  enterPhase(bundle, seed.json.check.next);
  const seedSync = advanceStatus(bundle, 'seed_topics_ready');
  expect(bundle, `${label}:seed-source-sync`, seedSync.json.current_gate === 'seed_topics_ready' && seedSync.json.next_gate === 'wave0_complete', 'seed source-gate sync established wave0 window');

  return bundle;
}

function passWave0WithDiagnostics(bundle, label) {
  stageWave0ParseFailure(bundle);
  const attempt1 = runGate(bundle, 'wave0-complete', 'phases/phase-wave0.md', { attempt: 99 });
  expectBoundary(bundle, `${label}:wave0-attempt1-fail`, attempt1.json.check.passed, 'real wave0 attempt 1 fails');
  expect(bundle, `${label}:wave0-attempt1-engine-count`, attempt1.json.check.attempt_count === 1, 'attempt_count is Engine-derived and ignores --attempt hint');
  expect(bundle, `${label}:wave0-cascade-mask`, attempt1.json.check.masked_rule_ids?.includes('per_topic_count_floor:topic-a'), 'cascade mask recorded for downstream count rule');

  stageWave0CountFailure(bundle);
  const attempt2 = runGate(bundle, 'wave0-complete', 'phases/phase-wave0.md');
  expectBoundary(bundle, `${label}:wave0-attempt2-fail`, attempt2.json.check.passed, 'real wave0 attempt 2 still fails');
  expect(bundle, `${label}:wave0-delta-converging`, attempt2.json.check.newly_passing?.includes('per_topic_reference_schema_valid') && attempt2.json.check.regressed?.includes('per_topic_count_floor') && attempt2.json.check.failed_rule_ids?.includes('per_topic_count_floor'), 'delta diagnostics compare stable rule ids while the concrete topic remains in finding/hint coordinates');

  stageWave0Pass(bundle);
  const attempt3 = runGate(bundle, 'wave0-complete', 'phases/phase-wave0.md');
  expect(bundle, `${label}:wave0-pass-after-repair`, attempt3.json.check.passed === true && attempt3.json.check.next === 'phases/phase-wave1.md', 'real wave0 attempt 3 passes and emits wave1 target');
  expect(bundle, `${label}:wave0-pass-fatigue-advice`, attempt3.json.check.attempt_count === 3 && attempt3.json.advice.some(a => a.includes('enter-phase')), 'high-attempt pass emits the legal autonomous continuation advice');

  return attempt3;
}

function continueMainLifecycle() {
  const bundle = prepareThroughWave0Entry('main');
  const wave0 = passWave0WithDiagnostics(bundle, 'main');

  const noEntryStatus = advanceStatus(bundle, 'wave0_complete', { expectSuccess: false });
  expectBoundary(bundle, 'main:unwitnessed-status-fails', noEntryStatus.json.status === 'ok', 'source-gate status sync rejects missing wave1 load witness');

  const oldStyle = advanceStatus(bundle, 'wave1_complete', { expectSuccess: false });
  expectBoundary(bundle, 'main:old-style-next-gate-fails', oldStyle.json.status === 'ok', 'old-style next-gate status laundering is rejected');
  expect(bundle, 'main:old-style-advice-source-gate', oldStyle.json.advice?.some(a => a.includes('--to wave0_complete')), 'old-style rejection advises source-gate sync');

  const prematureWave1 = runGate(bundle, 'wave1-complete', 'phases/phase-wave1.md');
  expectBoundary(bundle, 'main:unwitnessed-gate-fails', prematureWave1.json.check.passed, 'wave1 gate rejects missing enter-phase witness');
  expect(bundle, 'main:unwitnessed-gate-advice', prematureWave1.json.advice.some(a => a.includes('enter-phase')), 'gate preflight advice names enter-phase remedy');

  enterPhase(bundle, wave0.json.check.next);
  expect(bundle, 'main:wave1-load-metadata', assertLatestLoad(bundle, 'wave0-complete', 'phases/phase-wave0.md', 'phases/phase-wave1.md'), 'enter-phase wrote route-bound wave1 load metadata');
  const wave0Sync = advanceStatus(bundle, 'wave0_complete');
  expect(bundle, 'main:wave0-source-sync', wave0Sync.json.current_gate === 'wave0_complete' && wave0Sync.json.next_gate === 'wave1_complete', 'wave0 source-gate sync succeeds after enter-phase');

  const entryNotWork = runGate(bundle, 'wave1-complete', 'phases/phase-wave1.md');
  expectBoundary(bundle, 'main:entry-not-work-completion', entryNotWork.json.check.passed, 'wave1 gate still fails normal content rules after entry witness');
  expect(bundle, 'main:entry-not-work-normal-rules', !entryNotWork.json.check.handoff_preflight && entryNotWork.json.inspect.some(m => m.includes('evidence-summary')), 'failure is normal target work rule, not handoff preflight');

  stageWave1Pass(bundle);
  const wave1 = runGate(bundle, 'wave1-complete', 'phases/phase-wave1.md');
  expect(bundle, 'main:wave1-pass', wave1.json.check.passed === true && wave1.json.check.next === 'phases/phase-wave2.md', 'real wave1 gate passes');
  enterPhase(bundle, wave1.json.check.next);
  const staleWave1 = enterPhase(bundle, 'phases/phase-wave1.md', { expectSuccess: false });
  expectBoundary(bundle, 'main:stale-historical-enter-fails', staleWave1.status === 0, 'older wave1 route is rejected after later wave1 pass targets wave2');
  const wave1Sync = advanceStatus(bundle, 'wave1_complete');
  expect(bundle, 'main:wave1-source-window', wave1Sync.json.current_gate === 'wave1_complete' && wave1Sync.json.next_gate === 'wave2_complete', 'wave2 accepts wave1 source-gate status window');

  stageWave2Pass(bundle);
  const wave2 = runGate(bundle, 'wave2-complete', 'phases/phase-wave2.md');
  expect(bundle, 'main:wave2-pass', wave2.json.check.passed === true && wave2.json.check.next === 'phases/phase-hitl2.md', 'real wave2 gate passes');
  enterPhase(bundle, wave2.json.check.next);
  const wave2Sync = advanceStatus(bundle, 'wave2_complete');
  expect(bundle, 'main:wave2-source-window', wave2Sync.json.current_gate === 'wave2_complete' && wave2Sync.json.next_gate === 'hitl2_recorded', 'hitl2 accepts wave2 source-gate status window');

  stageHitl2(bundle, 'proceed_to_readiness');
  const hitl2 = runGate(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md');
  expect(bundle, 'main:hitl2-proceed-target', hitl2.json.check.passed === true && hitl2.json.check.next === 'phases/phase-readiness.md', 'real HITL2 proceed gate emits readiness target');
  enterPhase(bundle, hitl2.json.check.next);
  const hitl2Sync = advanceStatus(bundle, 'hitl2_recorded');
  expect(bundle, 'main:hitl2-proceed-window', hitl2Sync.json.current_gate === 'hitl2_recorded' && hitl2Sync.json.next_gate === 'readiness_passed', 'readiness source-gate window established from selected HITL2 proceed target');

  const readiness = runGate(bundle, 'readiness-passed', 'phases/phase-readiness.md');
  expect(bundle, 'main:readiness-pass', readiness.json.check.passed === true && readiness.json.check.next === 'phases/phase-final.md', 'real readiness gate emits final target');
  enterPhase(bundle, readiness.json.check.next);
  const readinessSync = advanceStatus(bundle, 'readiness_passed');
  expect(bundle, 'main:readiness-final-status', readinessSync.json.current_gate === 'readiness_passed' && readinessSync.json.next_gate === 'none', 'readiness source-gate sync establishes terminal status');
  stageFinalArtifact(bundle);

  return bundle;
}

function runRerunBranch() {
  const bundle = prepareThroughWave0Entry('rerun');
  passWave0WithDiagnostics(bundle, 'rerun');
  enterPhase(bundle, 'phases/phase-wave1.md');
  advanceStatus(bundle, 'wave0_complete');
  stageWave1Pass(bundle);
  const wave1 = runGate(bundle, 'wave1-complete', 'phases/phase-wave1.md');
  expect(bundle, 'rerun:wave1-pass', wave1.json.check.passed === true, 'rerun branch wave1 passes');
  enterPhase(bundle, wave1.json.check.next);
  advanceStatus(bundle, 'wave1_complete');
  stageWave2Pass(bundle);
  const wave2 = runGate(bundle, 'wave2-complete', 'phases/phase-wave2.md');
  expect(bundle, 'rerun:wave2-pass', wave2.json.check.passed === true, 'rerun branch wave2 passes');
  enterPhase(bundle, wave2.json.check.next);
  advanceStatus(bundle, 'wave2_complete');

  stageHitl2(bundle, 'rerun');
  const hitl2 = runGate(bundle, 'hitl2-recorded', 'phases/phase-hitl2.md');
  expect(bundle, 'rerun:hitl2-rerun-target', hitl2.json.check.passed === true && hitl2.json.check.next === 'phases/phase-rerun.md', 'real HITL2 rerun gate emits rerun target');
  const hitl2Attempt = traceEvents(bundle).filter(e => e.event === 'gate_attempt' && e.gate === 'hitl2-recorded').at(-1);
  expect(bundle, 'rerun:hitl2-rerun-real-trace', hitl2Attempt?.next === 'phases/phase-rerun.md' && hitl2Attempt?.diagnostic_path, 'HITL2 rerun gate_attempt came from real gate CLI output');
  enterPhase(bundle, hitl2.json.check.next);
  const hitl2Sync = advanceStatus(bundle, 'hitl2_recorded');
  expect(bundle, 'rerun:incoming-status-window', hitl2Sync.json.current_gate === 'hitl2_recorded' && hitl2Sync.json.next_gate === 'rerun_ready', 'rerun gate keeps HITL2 to rerun status window before rerun-ready pass');

  const rerunReady = runGate(bundle, 'rerun-ready', 'phases/phase-rerun.md');
  expect(bundle, 'rerun:rerun-ready-pass', rerunReady.json.check.passed === true && rerunReady.json.check.next === 'phases/phase-seed-topics.md', 'real rerun-ready gate passes from incoming HITL2 window');
  enterPhase(bundle, rerunReady.json.check.next);
  const rerunSync = advanceStatus(bundle, 'rerun_ready');
  expect(bundle, 'rerun:rerun-source-window', rerunSync.json.current_gate === 'rerun_ready' && rerunSync.json.next_gate === 'seed_topics_ready', 'rerun source-gate sync targets seed-topics');
  const seed = runGate(bundle, 'seed-topics-ready', 'phases/phase-seed-topics.md');
  expect(bundle, 'rerun:seed-accepts-rerun-predecessor', seed.json.check.passed === true, 'seed-topics gate accepts rerun-ready as legal alternate predecessor');

  return bundle;
}

function runSupersededBranch() {
  const bundle = prepareThroughWave0Entry('supersede');
  passWave0WithDiagnostics(bundle, 'supersede');

  const failedAfterPass = runGate(bundle, 'wave0-complete', 'phases/phase-wave0.md');
  expectBoundary(bundle, 'supersede:newer-failed-attempt', failedAfterPass.json.check.passed, 'newer real wave0 failed attempt supersedes old pass');

  const enter = enterPhase(bundle, 'phases/phase-wave1.md', { expectSuccess: false });
  expectBoundary(bundle, 'supersede:enter-rejects-old-pass', enter.status === 0, 'enter-phase rejects old wave0 pass after newer failed attempt');
  const advance = advanceStatus(bundle, 'wave0_complete', { expectSuccess: false });
  expectBoundary(bundle, 'supersede:advance-rejects-old-pass', advance.json.status === 'ok', 'advance-status rejects old wave0 pass after newer failed attempt');

  return bundle;
}

function finalVerdict() {
  const failed = checks.filter(c => c.passed !== c.expected);
  console.log(`\nChecks: ${checks.length - failed.length} passed, ${failed.length} failed (${checks.length} total)`);
  if (failed.length > 0) {
    console.log('\x1b[31mVERDICT: FAIL\x1b[0m');
    for (const item of failed) {
      console.log(`- ${basename(item.bundle)} ${item.gate}: ${item.detail}`);
    }
    return false;
  }
  console.log('\x1b[32mVERDICT: PASS\x1b[0m');
  return true;
}

function runHealthChecks() {
  for (const bundle of bundles) {
    if (!existsSync(bundle)) continue;
    const result = runNode([
      'experiments_env/shared/verify-bundle-health.mjs',
      '--bundle',
      bundle,
      '--profile',
      'standard',
      '--json',
    ], { allowFailure: true, timeout: 30000 });

    let report = null;
    try {
      report = parseJsonObject(result.stdout);
    } catch {
      report = {
        status: 'issues',
        issues: [{
          section: 'health',
          detail: `verify-bundle-health did not emit parseable JSON (exit ${result.status}, stdout ${result.stdout.length} bytes, stderr ${result.stderr.length} bytes)`,
        }],
      };
    }

    const status = report.status === 'clean' && result.status === 0 ? 'clean' : 'issues';
    healthReports.push({
      bundle,
      status,
      exit_code: result.status,
      issues: report.issues || [],
    });
    console.log(`HEALTH ${status.toUpperCase()} ${basename(bundle)} (${report.issues?.length || 0} issue(s))`);
  }
}

function cleanupAfterTest(pass) {
  const healthIssue = healthReports.some(h => h.status !== 'clean');
  if (!pass || healthIssue) {
    console.log(`Preserved bundles for diagnosis:\n${bundles.join('\n')}`);
    return;
  }
  for (const bundle of bundles) {
    if (existsSync(bundle)) rmSync(bundle, { recursive: true, force: true });
  }
  console.log(`Cleaned ${bundles.length} disposable bundle(s).`);
}

describe('handoff witnessing lifecycle integration', { timeout: 180000 }, () => {
  it('prevents status laundering across normal, HITL2 rerun, and superseded-pass paths', () => {
    let pass = false;
    let thrown = null;
    try {
      continueMainLifecycle();
      runRerunBranch();
      runSupersededBranch();
      pass = finalVerdict();
    } catch (err) {
      thrown = err;
      finalVerdict();
    } finally {
      runHealthChecks();
      cleanupAfterTest(pass && !thrown);
    }
    if (thrown) throw thrown;
    if (!pass) throw new Error('handoff witnessing lifecycle checks failed');
  });
});
