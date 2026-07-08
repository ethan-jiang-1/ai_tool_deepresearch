#!/usr/bin/env node
// Controlled work-unit playbook runner.
//
// Fixture-backed cases may write controlled output/receipt/cache files, but
// queue, work-unit, ledger, inspect, and gate state transitions use real CLIs.

import { spawnSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { TargetSpecSchema } from '../../DPT_FRAMEWORK/schema/contracts/queue.mjs';
import { auditFileObservability, FILE_CLASSIFICATIONS } from '../../DPT_FRAMEWORK/engine/helpers/file-observability.mjs';
import { checkCacheCoverage } from '../../DPT_FRAMEWORK/engine/helpers/gate-helpers-checks.mjs';
import { readOutputDeclarations, readSubmittedWorkUnitDeclarations } from '../../DPT_FRAMEWORK/engine/helpers/gate-helpers-readers.mjs';
import { countReferences } from '../../DPT_FRAMEWORK/engine/helpers/ref-count.mjs';
import { createTrace } from '../../DPT_FRAMEWORK/engine/trace.mjs';
import { loadWorkUnitIndex } from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';
import {
  claimAndSubmitFixtureWorkUnit,
  claimWorkUnitsViaCli,
  closeWorkUnitViaCli,
  enqueueWorkUnitTask,
  inspectWorkUnitsViaCli,
  openWorkUnitBatchViaCli,
  queueItemForWorkUnit,
  readWorkUnitLedgerRows,
  referenceContent,
  sourceYamlContent,
  submitWorkUnitViaCli,
  writeFixtureResultForWorkUnit,
  writeMinimalPlan,
  writeMinimalStatus,
  writeWave1Scaffold,
  writeWave1TopicArtifacts,
  writeWave2Scaffold,
} from './work-unit-playbook-utils.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');
const NEW_BUNDLE = path.join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const VALIDATE_BUNDLE = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/validate-bundle.mjs');
const OPERATE_QUEUE = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/operate-queue.mjs');
const OPERATE_WORK_UNIT = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/operate-work-unit.mjs');
const CHECK_REENTRY = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/check-reentry.mjs');
const VERIFY_BUNDLE_HEALTH = path.join(REPO_ROOT, 'experiments_env/shared/verify-bundle-health.mjs');
const ENTER_PHASE = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/enter-phase.mjs');
const ADVANCE_STATUS = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/advance-status.mjs');
const GATE_SETUP = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-setup-ready.mjs');
const GATE_SEED = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs');
const GATE_WAVE0 = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs');
const GATE_WAVE1 = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave1-complete.mjs');
const GATE_WAVE2 = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave2-complete.mjs');

function parseArgs(argv) {
  const opts = { cleanupPass: false, force: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--case') opts.caseId = argv[++i];
    else if (arg.startsWith('--case=')) opts.caseId = arg.slice('--case='.length);
    else if (arg === '--target-dir') opts.targetDir = argv[++i];
    else if (arg.startsWith('--target-dir=')) opts.targetDir = arg.slice('--target-dir='.length);
    else if (arg === '--real-result') opts.realResult = argv[++i];
    else if (arg.startsWith('--real-result=')) opts.realResult = arg.slice('--real-result='.length);
    else if (arg === '--cleanup-pass') opts.cleanupPass = true;
    else if (arg === '--no-force') opts.force = false;
    else if (!opts.caseId) opts.caseId = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!opts.caseId) throw new Error('Usage: node experiments_env/shared/run-fixture-backed-case.mjs --case case-401');
  return opts;
}

function runNode(args, { expectStatus = 0, parseJson = true } = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== expectStatus) {
    throw new Error(`node ${args.join(' ')} exited ${result.status}, expected ${expectStatus}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  if (!parseJson) return result.stdout;
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

function runNodeLoose(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
  let json = null;
  if (result.stdout.trim()) {
    try { json = JSON.parse(result.stdout); } catch { /* keep raw output */ }
  }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, json };
}

function newBundle(caseId, suffix, opts) {
  const args = [NEW_BUNDLE, suffix, '--case', caseId];
  if (opts.force) args.push('--force');
  if (opts.targetDir) args.push('--target-dir', opts.targetDir);
  const stdout = runNode(args, { parseJson: false });
  return stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function appendTrace(bundleDir, event) {
  appendFileSync(path.join(bundleDir, 'rb_trace.jsonl'), `${JSON.stringify({
    ts: new Date().toISOString(),
    ...event,
  })}\n`);
}

function recordCheck(bundleDir, source, gate, passed, detail, extra = {}) {
  appendTrace(bundleDir, {
    event: 'check',
    source,
    gate,
    passed,
    expected: true,
    detail,
    ...extra,
  });
}

function readTrace(bundleDir) {
  const tracePath = path.join(bundleDir, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return [];
  return readFileSync(tracePath, 'utf-8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function writeWave0Handoff(bundleDir) {
  const sourceTs = new Date().toISOString();
  const sourceAttemptIndex = readTrace(bundleDir).length;
  appendTrace(bundleDir, {
    ts: sourceTs,
    event: 'gate_attempt',
    gate: 'seed-topics-ready',
    phase: 'seed-topics',
    passed: true,
    currentNodeRef: 'phases/phase-seed-topics.md',
    next: 'phases/phase-wave0.md',
  });
  appendTrace(bundleDir, {
    event: 'load_complete',
    entry: 'phases/phase-wave0.md',
    handoff_source_gate: 'seed-topics-ready',
    handoff_source_node: 'phases/phase-seed-topics.md',
    handoff_target_node: 'phases/phase-wave0.md',
    handoff_source_attempt_index: sourceAttemptIndex,
    handoff_source_attempt_ts: sourceTs,
  });
}

function writeWave0Scaffold(bundleDir, {
  planBasename = path.basename(bundleDir),
  topics = [{ id: 't1', slug: 'topic-a', title: 'Topic A' }],
  referenceRows = ['| 00-shared-topic-a.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |'],
} = {}) {
  writeMinimalStatus(bundleDir, {
    current_gate: 'seed_topics_ready',
    next_gate: 'wave0_complete',
    current_node: 'phases/phase-wave0.md',
  });
  writeMinimalPlan(bundleDir, { planBasename, topics });
  writeFileSync(path.join(bundleDir, 'rb_profile.yaml'), [
    `plan_basename: ${planBasename}`,
    'research_profile: debug',
    'root_must_answer_set: []',
    'research_style_params:',
    '  user_visible: false',
    '  wave0_per_topic_source_floor: 1',
    '  wave0_shared_ref_total: 1',
    '  wave1_per_topic_ref_floor: 1',
    '  topic_unique_ratio: 0',
    '  counterexample_search: false',
    '  cross_verification: false',
    '  p0p1_independent_backing: 1',
    '  quality_min_tier: tier_4',
    '  quality_min_substance: none',
    '  wave2_cross_topic_depth: 0',
    '  wave2_emergent_search_rounds: 0',
    'human_decision_checkpoints:',
    '  hitl1:',
    '    status: not_started',
    '  hitl2:',
    '    status: not_started',
    '    answerability_class: not_assessed',
    '    user_decision: not_started',
    '    final_report_view: not_started',
    '',
  ].join('\n'));
  mkdirSync(path.join(bundleDir, 'reference'), { recursive: true });
  writeFileSync(path.join(bundleDir, 'reference/README.md'), '# Reference Evidence\n');
  writeFileSync(path.join(bundleDir, 'reference/_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...referenceRows,
    '',
  ].join('\n'));
  writeWave0Handoff(bundleDir);
  appendTrace(bundleDir, { event: 'wave0_completion', source: 'work-unit-playbook-fixture' });
}

function sourceYamlExtra(topicSlug, sourceUrl, title = 'Fixture Source') {
  return {
    path: `artifacts/wave0/${topicSlug}/source.yaml`,
    role: 'source_yaml',
    content: sourceYamlContent({ source_url: sourceUrl, topic_slug: topicSlug, title }),
  };
}

function wave0ReferenceContent({ source_url, topic_slug, title }) {
  const label = topic_slug.replace(/[-_]/g, ' ');
  const factSets = {
    'topic-a': [
      'Alpha alignment reviews compare model behavior under adversarial prompt pressure.',
      'Robustness evaluations track refusal drift across multilingual safety benchmarks.',
      'Governance teams publish audit trails for red-team findings and mitigation status.',
      'Capability thresholds trigger independent review before high-risk model release.',
      'Incident taxonomies separate jailbreak success, tool misuse, and data exposure.',
    ],
    'topic-b': [
      'Battery recycling plants recover nickel, manganese, and cobalt from black mass.',
      'Fast-charging corridors depend on transformer capacity and queue-aware pricing.',
      'Fleet operators model degradation using depth-of-discharge and thermal exposure.',
      'Grid planners compare depot charging demand against evening residential peaks.',
      'Supply contracts distinguish lithium carbonate, hydroxide, and recycled feedstock.',
    ],
    'topic-c': [
      'Satellite rainfall retrieval combines microwave sensors with geostationary imagery.',
      'Irrigation advisories use soil-moisture anomaly maps during monsoon variability.',
      'Crop-yield models ingest vegetation indices, planting calendars, and heat stress.',
      'Reservoir operators compare snowpack forecasts with downstream allocation rules.',
      'Drought dashboards separate meteorological, agricultural, and hydrological signals.',
    ],
    'topic-orphan': [
      'Orphan artifact markers exist only to prove gate rejection of direct files.',
      'Unsubmitted source YAML must not satisfy delegated coverage for any phase.',
      'Provenance diagnostics identify the uncovered path before repair is attempted.',
      'Cleanup work removes direct artifacts or resubmits through a claimed work unit.',
      'The gate treats this evidence as contamination rather than supplemental support.',
    ],
  };
  const keyFacts = factSets[topic_slug] || [
    `${label} includes a source-specific finding with non-template vocabulary.`,
    `${label} records a separate cache trail, reference file, and source YAML declaration.`,
    `${label} contributes one distinct foundation reference for the Wave0 gate.`,
    `${label} uses submitted work-unit provenance rather than direct filesystem authority.`,
    `${label} remains fixture-backed Engine evidence and avoids Agent behavior claims.`,
  ];
  return referenceContent({
    source_url,
    topic_slug,
    title,
    key_facts: keyFacts,
    core_content: `This controlled Wave0 reference is intentionally specific to ${label}. It preserves the experiment boundary: the semantic research content is fixture-backed, but queue claim, work-unit submit, ledger coverage, cache validation, and gate verdict all travel through real Engine surfaces.`,
  });
}

function submitWave0Fixture(bundleDir, {
  queueItemId = 'wave0-source-topic-a',
  topicSlug = 'topic-a',
  refPath = 'reference/00-shared-topic-a.md',
  sourceUrl = 'https://research-source.test/topic-a/article',
  sourceSlug = 'topic-a',
  title = 'Topic A Fixture Source',
  extraOutputFiles = [],
} = {}) {
  return claimAndSubmitFixtureWorkUnit(bundleDir, {
    phase: 'wave0',
    queue_item_id: queueItemId,
    topic_slug: topicSlug,
    output_path: refPath,
    source_url: sourceUrl,
    source_slug: sourceSlug,
    output_content: wave0ReferenceContent({ source_url: sourceUrl, topic_slug: topicSlug, title }),
    extra_output_files: [
      sourceYamlExtra(topicSlug, sourceUrl, title),
      ...extraOutputFiles,
    ],
  });
}

function submitClaimedWave0Fixture(bundleDir, {
  workId,
  topicSlug,
  refPath = `reference/00-shared-${topicSlug}.md`,
  sourceUrl = `https://research-source.test/${topicSlug}/article`,
  sourceSlug = topicSlug,
  title = `${topicSlug} Fixture Source`,
} = {}) {
  const fixture = writeFixtureResultForWorkUnit(bundleDir, {
    work_id: workId,
    output_path: refPath,
    source_url: sourceUrl,
    source_slug: sourceSlug,
    output_content: wave0ReferenceContent({ source_url: sourceUrl, topic_slug: topicSlug, title }),
    extra_output_files: [
      sourceYamlExtra(topicSlug, sourceUrl, title),
    ],
  });
  const submit = submitWorkUnitViaCli(bundleDir, { work_id: workId, resultPath: fixture.resultPath });
  return { ...fixture, submit };
}

function submitClaimedWave1Fixture(bundleDir, {
  workId,
  topicSlug = 'topic-a',
  topicId = 't1',
  title = 'Topic A',
  refPath = `reference/01-${topicSlug}-deepening.md`,
  sourceUrl = `https://research-source.test/${topicSlug}/deepening/article`,
  sourceSlug = `${topicSlug}-deepening`,
} = {}) {
  writeWave1TopicArtifacts(bundleDir, {
    id: topicId,
    topic_slug: topicSlug,
    title,
    source_url: sourceUrl,
  });
  const fixture = writeFixtureResultForWorkUnit(bundleDir, {
    work_id: workId,
    output_path: refPath,
    source_url: sourceUrl,
    source_slug: sourceSlug,
    output_content: referenceContent({
      source_url: sourceUrl,
      topic_slug: topicSlug,
      title: `${title} Deepening Reference`,
      key_facts: wave1KeyFacts(topicSlug, title),
      core_content: wave1CoreContent(topicSlug, title),
    }),
    extra_output_files: [
      { path: `artifacts/wave1/${topicSlug}/evidence-summary.md`, role: 'evidence_summary' },
      { path: `artifacts/wave1/${topicSlug}/question-list.md`, role: 'question_list' },
    ],
    cache_trails: [`_cache/wave1/primary/${topicSlug}/${sourceSlug}`],
  });
  const submit = submitWorkUnitViaCli(bundleDir, { work_id: workId, resultPath: fixture.resultPath });
  return { ...fixture, submit };
}

function wave1KeyFacts(topicSlug, title) {
  const facts = {
    'topic-a': [
      'Topic A deepening compares governance review boards, red-team evidence, and model-release thresholds.',
      'The controlled source notes that audit escalation depends on incident severity and mitigation status.',
      'Operational teams separate policy exceptions from systematic safety control failures.',
      'The strongest remaining uncertainty is whether evidence from internal audits transfers across domains.',
      'Wave2 should compare Topic A controls against unrelated process and accountability patterns.',
    ],
    'topic-b': [
      'Topic B deepening tracks procurement constraints, reporting cadence, and regional compliance variation.',
      'The controlled source emphasizes that policy adoption differs between centralized and federated operators.',
      'Implementation risk rises when evidence trails are split across vendors and internal review systems.',
      'The main open issue is whether reporting obligations create useful signals or paperwork noise.',
      'Wave2 should compare Topic B governance friction with Topic A safety-control escalation.',
    ],
    'topic-orphan': [
      'The orphan topic deliberately writes artifacts without a submitted work-unit ledger row.',
      'Its evidence summary is structurally valid but lacks Engine-accepted provenance.',
      'The gate should report missing submitted coverage rather than count the direct files.',
      'This case distinguishes artifact presence from delegated completion authority.',
      'Repair would require claiming and submitting a work unit for the same output scope.',
    ],
  };
  return facts[topicSlug] || [
    `${title} has topic-specific controlled evidence that should not collide with another fixture.`,
    `${title} records distinct mechanisms, trends, and unresolved synthesis questions.`,
    `${title} uses submitted ledger coverage for its reference and Wave1 artifacts.`,
    `${title} keeps fixture semantics explicit and does not claim real Agent search quality.`,
    `${title} contributes one countable reference for the Wave1 gate.`,
  ];
}

function wave1CoreContent(topicSlug, title) {
  if (topicSlug === 'topic-a') {
    return 'Topic A controlled content focuses on safety escalation mechanisms, audit routing, and model-release decisions. It deliberately uses vocabulary about red-team findings, mitigation status, and governance boards so it is not a near clone of other Wave1 fixtures.';
  }
  if (topicSlug === 'topic-b') {
    return 'Topic B controlled content focuses on procurement obligations, compliance reporting, vendor evidence trails, and regional policy variation. It deliberately uses governance-operations vocabulary so the fixture story stays distinct.';
  }
  return `${title} controlled content is fixture-backed Engine evidence. It is intentionally scoped to ${topicSlug}, with distinct wording and declared limitations so the playbook proves work-unit provenance rather than semantic research quality.`;
}

function runWave0Gate(bundleDir, outputName = 'gate-wave0.json') {
  const result = runNodeLoose([GATE_WAVE0, '--bundle', bundleDir, '--current-node', 'phases/phase-wave0.md']);
  const outputPath = path.join(bundleDir, outputName);
  writeFileSync(outputPath, result.stdout || result.stderr || '');
  if (!result.json) {
    throw new Error(`wave0 gate did not emit JSON\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return { ...result, outputPath };
}

function runSetupGate(bundleDir, outputName = 'gate-setup.json') {
  const result = runNodeLoose([GATE_SETUP, '--bundle', bundleDir, '--current-node', 'phases/phase-setup.md']);
  const outputPath = path.join(bundleDir, outputName);
  writeFileSync(outputPath, result.stdout || result.stderr || '');
  if (!result.json) {
    throw new Error(`setup gate did not emit JSON\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return { ...result, outputPath };
}

function runSeedGate(bundleDir, outputName = 'gate-seed.json') {
  const result = runNodeLoose([GATE_SEED, '--bundle', bundleDir, '--current-node', 'phases/phase-seed-topics.md']);
  const outputPath = path.join(bundleDir, outputName);
  writeFileSync(outputPath, result.stdout || result.stderr || '');
  if (!result.json) {
    throw new Error(`seed gate did not emit JSON\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return { ...result, outputPath };
}

function runWave1Gate(bundleDir, outputName = 'gate-wave1.json') {
  const result = runNodeLoose([GATE_WAVE1, '--bundle', bundleDir, '--current-node', 'phases/phase-wave1.md']);
  const outputPath = path.join(bundleDir, outputName);
  writeFileSync(outputPath, result.stdout || result.stderr || '');
  if (!result.json) {
    throw new Error(`wave1 gate did not emit JSON\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return { ...result, outputPath };
}

function runWave2Gate(bundleDir, outputName = 'gate-wave2.json') {
  const result = runNodeLoose([GATE_WAVE2, '--bundle', bundleDir, '--current-node', 'phases/phase-wave2.md']);
  const outputPath = path.join(bundleDir, outputName);
  writeFileSync(outputPath, result.stdout || result.stderr || '');
  if (!result.json) {
    throw new Error(`wave2 gate did not emit JSON\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return { ...result, outputPath };
}

function writeVerdict(bundleDir, caseId, checks, { status = 'PASS', extra = {} } = {}) {
  const ok = status === 'PASS' && checks.every((check) => check.passed);
  const verdict = {
    case: caseId,
    status: status === 'PASS' ? (ok ? 'PASS' : 'FAIL') : status,
    ok,
    checks,
    ...extra,
  };
  writeJson(path.join(bundleDir, `${caseId}-verdict.json`), verdict);
  return verdict;
}

function maybeCleanup(bundleDir, opts, verdict) {
  if (opts.cleanupPass && verdict.ok) {
    rmSync(bundleDir, { recursive: true, force: true });
  }
}

function completeQueueItem(bundleDir, queueItemId, resultName, { receipt = 'none' } = {}) {
  const resultPath = path.join(bundleDir, `${resultName}.json`);
  writeJson(resultPath, { queue_item_id: queueItemId, receipt, summary: resultName });
  return runNodeLoose([OPERATE_QUEUE, 'complete', bundleDir, '--result', resultPath]);
}

function enterPhaseAndAdvance(bundleDir, nodeRef, sourceGateEnum, outputPrefix) {
  const enter = runNode([ENTER_PHASE, '--bundle', bundleDir, '--node', nodeRef], { parseJson: false });
  writeFileSync(path.join(bundleDir, `${outputPrefix}-enter.md`), enter);
  const advance = runNode([ADVANCE_STATUS, '--bundle', bundleDir, '--to', sourceGateEnum]);
  writeJson(path.join(bundleDir, `${outputPrefix}-advance.json`), advance);
  return { enter, advance };
}

function claimDrainProbe(bundleDir, phase, outputName) {
  const result = runNodeLoose([OPERATE_WORK_UNIT, 'claim', bundleDir, '--phase', phase, '--count', '1']);
  const outputPath = path.join(bundleDir, outputName);
  writeFileSync(outputPath, result.stdout || result.stderr || '');
  if (!result.json) {
    throw new Error(`claim drain probe did not emit JSON for ${phase}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return result;
}

function writeTaskFile(bundleDir, fileName, task) {
  const taskPath = path.join(bundleDir, fileName);
  writeJson(taskPath, task);
  return taskPath;
}

function enqueueViaQueueCli(bundleDir, task, fileName = `${task.queue_item_id}.json`) {
  const taskPath = writeTaskFile(bundleDir, fileName, task);
  return runNode([OPERATE_QUEUE, 'enqueue', bundleDir, '--task', taskPath]);
}

function writeReferenceIndex(bundleDir, rows = []) {
  mkdirSync(path.join(bundleDir, 'reference'), { recursive: true });
  writeFileSync(path.join(bundleDir, 'reference', 'README.md'), '# Reference Evidence\n');
  writeFileSync(path.join(bundleDir, 'reference', '_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n'));
}

function copyRecursiveSync(source, target) {
  const sourceStat = statSync(source);
  if (sourceStat.isDirectory()) {
    mkdirSync(target, { recursive: true });
    for (const entry of readdirSync(source)) copyRecursiveSync(path.join(source, entry), path.join(target, entry));
    return;
  }
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(source));
}

function runReentry(bundleDir, at = 'wave0_complete', outputName = 'check-reentry.json') {
  const result = runNodeLoose([CHECK_REENTRY, '--bundle', bundleDir, '--at', at]);
  const outputPath = path.join(bundleDir, outputName);
  writeFileSync(outputPath, result.stdout || result.stderr || '');
  if (!result.json) {
    throw new Error(`check-reentry did not emit JSON\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return { ...result, outputPath };
}

function runHealth(bundleDir, profile = 'standard', outputName = 'bundle-health.json') {
  const result = runNodeLoose([VERIFY_BUNDLE_HEALTH, '--bundle', bundleDir, '--profile', profile, '--json']);
  const outputPath = path.join(bundleDir, outputName);
  writeFileSync(outputPath, result.stdout || result.stderr || '');
  return { ...result, outputPath };
}

function case161(opts) {
  const bundleDir = newBundle('case-161', 'eex_submit_cache_trails', opts);
  writeWave0Scaffold(bundleDir, {
    planBasename: 'eex_submit_cache_trails',
    topics: [{ id: 't1', slug: 'topic-a', title: 'Topic A' }],
    referenceRows: ['| 00-shared-valid-cache.md | primary | expert | Tier 2 | topic-a | wave0_foundation | accepted | 2026-07-06 |'],
  });

  const valid = claimAndSubmitFixtureWorkUnit(bundleDir, {
    phase: 'wave0',
    queue_item_id: 'case161-valid-cache',
    topic_slug: 'topic-a',
    output_path: 'reference/00-shared-valid-cache.md',
    source_url: 'https://research-source.test/topic-a/valid-cache',
    source_slug: 'valid-cache',
    output_content: wave0ReferenceContent({
      source_url: 'https://research-source.test/topic-a/valid-cache',
      topic_slug: 'topic-a',
      title: 'Valid Cache Trail',
    }),
    extra_output_files: [
      sourceYamlExtra('topic-a', 'https://research-source.test/topic-a/valid-cache', 'Valid Cache Trail'),
    ],
    cache_trails: ['_cache/wave0/primary/topic-a/valid-cache'],
  });
  const validRows = readWorkUnitLedgerRows(bundleDir);

  const rejectedCases = [
    prepareRejectedSubmit(bundleDir, 'incomplete-cache-leaf', ({ cache_trails }) => {
      rmSync(path.join(bundleDir, cache_trails[0], 'page.md'), { force: true });
    }, { prefix: 'case161', topicSlug: 'topic-a' }),
    prepareRejectedSubmit(bundleDir, 'unsafe-cache-escape', ({ resultPath }) => {
      const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
      result.cache_trails = ['../outside-cache'];
      writeJson(resultPath, result);
    }, { prefix: 'case161', topicSlug: 'topic-a' }),
    prepareRejectedSubmit(bundleDir, 'unsafe-cache-parent', ({ resultPath, cache_trails }) => {
      const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
      result.cache_trails = [path.dirname(cache_trails[0])];
      writeJson(resultPath, result);
    }, { prefix: 'case161', topicSlug: 'topic-a' }),
  ];
  const rowsAfterRejects = readWorkUnitLedgerRows(bundleDir);
  const coverage = checkCacheCoverage(bundleDir);

  const checks = [
    {
      label: 'valid-cache-submit-ledger',
      passed: valid.submit.ok === true && validRows.length === 1 && validRows[0].cache_trails.includes('_cache/wave0/primary/topic-a/valid-cache'),
      detail: JSON.stringify({ work_id: valid.record.work_id, cache_trails: validRows[0]?.cache_trails || [] }),
    },
    ...rejectedCases.map(({ label, result }) => ({
      label,
      passed: result.status === 1 && result.json?.last_submit_rejection?.reason_code === 'missing_cache',
      detail: `status=${result.status}, reason=${result.json?.last_submit_rejection?.reason_code}, message=${result.json?.last_submit_rejection?.reason || result.stderr}`,
    })),
    {
      label: 'rejects-append-no-ledger',
      passed: rowsAfterRejects.length === 1,
      detail: `${rowsAfterRejects.length} submitted ledger row(s)`,
    },
    {
      label: 'cache-coverage-passes-valid-row',
      passed: coverage.passed === true,
      detail: JSON.stringify(coverage.inspect || []),
    },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-161', 'evidence-extraction-cache-submit', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-161', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function submitCase162Reference(bundleDir, {
  queueItemId,
  topicSlug,
  refPath,
  sourceUrl,
  sourceSlug,
  title,
  outputContent,
} = {}) {
  return claimAndSubmitFixtureWorkUnit(bundleDir, {
    phase: 'wave0',
    queue_item_id: queueItemId,
    topic_slug: topicSlug,
    output_path: refPath,
    source_url: sourceUrl,
    source_slug: sourceSlug,
    output_content: outputContent || wave0ReferenceContent({
      source_url: sourceUrl,
      topic_slug: topicSlug,
      title,
    }),
    extra_output_files: [
      sourceYamlExtra(topicSlug, sourceUrl, title),
    ],
    cache_trails: [`_cache/wave0/primary/${topicSlug}/${sourceSlug}`],
  });
}

function case162(opts) {
  const bundleDir = newBundle('case-162', 'eex_gate_reentry_cache', opts);
  writeWave0Scaffold(bundleDir, {
    planBasename: 'eex_gate_reentry_cache',
    topics: [
      { id: 't1', slug: 'topic-a', title: 'Topic A' },
      { id: 't2', slug: 'topic-b', title: 'Topic B' },
    ],
    referenceRows: [
      '| 00-shared-topic-a.md | primary | expert | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |',
      '| topic-a-ref-1.md | primary | expert | Tier 2 | topic-a | wave0_foundation | accepted | 2026-07-06 |',
      '| topic-a-ref-2.md | secondary | analyst | Tier 2 | topic-a | wave0_foundation | accepted | 2026-07-06 |',
      '| topic-b-ref-1.md | primary | expert | Tier 2 | topic-b | wave0_foundation | accepted | 2026-07-06 |',
      '| topic-b-orphan.md | primary | expert | Tier 1 | topic-b | wave0_foundation | accepted | 2026-07-06 |',
    ],
  });

  const submittedShared = submitCase162Reference(bundleDir, {
    queueItemId: 'case162-shared-topic-a',
    topicSlug: 'topic-a',
    refPath: 'reference/00-shared-topic-a.md',
    sourceUrl: 'https://research-source.test/topic-a/shared-overview',
    sourceSlug: 'shared-topic-a',
    title: 'Shared Topic A Overview',
    outputContent: referenceContent({
      source_url: 'https://research-source.test/topic-a/shared-overview',
      topic_slug: 'topic-a',
      title: 'Shared Topic A Overview',
      key_facts: [
        'Topic A shared overview describes policy baselines used by both topic-specific branches.',
        'The source separates shared regulatory context from topic-specific compliance economics.',
        'It records timeline anchors, public consultation phases, and oversight vocabulary.',
        'The overview is intentionally broad enough to satisfy the shared reference floor.',
        'The cache leaf maps directly through meta.json.url to the submitted shared reference.',
      ],
      core_content: 'The shared Topic A source provides general regulatory baseline evidence: policy timelines, consultation mechanisms, oversight vocabulary, and institutional context. It deliberately avoids the battery, satellite, or orphan vocabularies used elsewhere in this case so fixture coverage stays easy to inspect.',
    }),
  });
  const submittedA1 = submitCase162Reference(bundleDir, {
    queueItemId: 'case162-topic-a-1',
    topicSlug: 'topic-a',
    refPath: 'reference/topic-a-ref-1.md',
    sourceUrl: 'https://research-source.test/topic-a/primary',
    sourceSlug: 'topic-a-primary',
    title: 'Topic A Primary',
    outputContent: referenceContent({
      source_url: 'https://research-source.test/topic-a/primary',
      topic_slug: 'topic-a',
      title: 'Topic A Primary',
      key_facts: [
        'Primary Topic A evidence focuses on statutory review boards and publication deadlines.',
        'The source distinguishes mandatory audits from voluntary safety attestations.',
        'It names escalation triggers for incidents, model updates, and high-risk deployments.',
        'Compliance teams use this primary source to decide when evidence must be preserved.',
        'The cache trail is a complete leaf with websearch, page, and meta files.',
      ],
      core_content: 'Primary Topic A content emphasizes statute-facing obligations: audit boards, incident escalation, public notices, deployment thresholds, and evidence preservation. This text is intentionally different from the secondary market-analysis fixture so controlled evidence remains easy to inspect.',
    }),
  });
  const submittedA2 = submitCase162Reference(bundleDir, {
    queueItemId: 'case162-topic-a-2',
    topicSlug: 'topic-a',
    refPath: 'reference/topic-a-ref-2.md',
    sourceUrl: 'https://research-source.test/topic-a/secondary',
    sourceSlug: 'topic-a-secondary',
    title: 'Topic A Secondary',
    outputContent: referenceContent({
      source_url: 'https://research-source.test/topic-a/secondary',
      topic_slug: 'topic-a',
      title: 'Topic A Secondary',
      key_facts: [
        'Secondary Topic A evidence analyzes vendor reporting costs and procurement timelines.',
        'The article compares small-company implementation burdens with enterprise compliance offices.',
        'It highlights insurance pricing, legal-review bottlenecks, and third-party audit markets.',
        'Regional rollout differences affect training budgets and internal governance staffing.',
        'The cache trail later gets drifted by deleting meta.json to prove gate-time cache checks.',
      ],
      core_content: 'Secondary Topic A content is economic and operational: vendor cost models, insurance pricing, procurement timing, audit-market capacity, and staffing pressure. It shares the same topic but uses a separate evidence angle from the primary statutory source.',
    }),
  });

  writeFileSync(path.join(bundleDir, 'reference/topic-b-orphan.md'), wave0ReferenceContent({
    source_url: 'https://research-source.test/topic-b/orphan',
    topic_slug: 'topic-b',
    title: 'Topic B Orphan',
  }));
  mkdirSync(path.join(bundleDir, 'artifacts/wave0/topic-b'), { recursive: true });
  writeFileSync(path.join(bundleDir, 'artifacts/wave0/topic-b/source.yaml'), sourceYamlContent({
    source_url: 'https://research-source.test/topic-b/orphan',
    topic_slug: 'topic-b',
    title: 'Topic B Orphan',
  }));

  const gateWithOrphan = runWave0Gate(bundleDir, 'gate-with-orphan.json');
  const rawDeclarations = readOutputDeclarations(bundleDir);
  const foWithOrphan = auditFileObservability(bundleDir, {
    topicSlugs: ['topic-a', 'topic-b'],
    ledgerDeclarations: rawDeclarations,
    targetPhase: 'wave0',
  });
  writeJson(path.join(bundleDir, 'file-observability-with-orphan.json'), foWithOrphan);
  writeMinimalStatus(bundleDir, { current_gate: 'wave0_complete', next_gate: 'wave1_complete' });
  const reentryWithOrphan = runReentry(bundleDir, 'wave0_complete', 'reentry-with-orphan.json');

  rmSync(path.join(bundleDir, 'reference/topic-b-orphan.md'), { force: true });
  rmSync(path.join(bundleDir, 'artifacts/wave0/topic-b/source.yaml'), { force: true });
  const submittedB1 = submitCase162Reference(bundleDir, {
    queueItemId: 'case162-topic-b-1',
    topicSlug: 'topic-b',
    refPath: 'reference/topic-b-ref-1.md',
    sourceUrl: 'https://research-source.test/topic-b/primary',
    sourceSlug: 'topic-b-primary',
    title: 'Topic B Primary',
    outputContent: referenceContent({
      source_url: 'https://research-source.test/topic-b/primary',
      topic_slug: 'topic-b',
      title: 'Topic B Primary',
      key_facts: [
        'Topic B evidence covers agricultural sensor procurement and irrigation scheduling.',
        'The source connects rainfall anomaly maps with reservoir allocation decisions.',
        'It discusses satellite imagery, soil moisture readings, and crop-yield forecast windows.',
        'Regional water managers use the evidence to decide when advisories should be updated.',
        'This submitted repair row replaces the direct orphan artifact from the first scenario.',
      ],
      core_content: 'Topic B controlled content intentionally uses water-management and satellite-observation vocabulary. It is a submitted work-unit repair for the topic that originally had only a direct orphan artifact, proving orphan files do not help until work-unit submit creates ledger coverage.',
    }),
  });
  writeMinimalStatus(bundleDir, { current_gate: 'seed_topics_ready', next_gate: 'wave0_complete' });
  const gateClean = runWave0Gate(bundleDir, 'gate-clean-cache.json');
  const refCount = countReferences(bundleDir, { source: 'ledger', targetGlob: 'reference/topic-a*.md', topic: 'topic-a' });
  const coverageClean = checkCacheCoverage(bundleDir);

  rmSync(path.join(bundleDir, submittedA2.cache_trails[0], 'meta.json'), { force: true });
  writeMinimalStatus(bundleDir, { current_gate: 'wave0_complete', next_gate: 'wave1_complete' });
  const coverageDrift = checkCacheCoverage(bundleDir);
  const foDrift = auditFileObservability(bundleDir, {
    topicSlugs: ['topic-a', 'topic-b'],
    ledgerDeclarations: readOutputDeclarations(bundleDir),
    targetPhase: 'wave0',
  });
  writeJson(path.join(bundleDir, 'file-observability-cache-drift.json'), foDrift);
  const reentryDrift = runReentry(bundleDir, 'wave0_complete', 'reentry-cache-drift.json');
  const health = runHealth(bundleDir, 'heavy', 'health-cache-drift.json');

  const checks = [
    {
      label: 'orphan-reference-fails-gate',
      passed: gateWithOrphan.status === 1 && gateWithOrphan.json?.check?.passed === false && /orphan|coverage|bypass|topic-b/i.test(JSON.stringify(gateWithOrphan.json.inspect || [])),
      detail: JSON.stringify(gateWithOrphan.json?.inspect || []),
    },
    {
      label: 'file-observability-orphan-blocker',
      passed: foWithOrphan.findings.some((finding) => finding.path === 'artifacts/wave0/topic-b/source.yaml' && finding.classification === 'orphan_authority_blocking') &&
        foWithOrphan.findings.some((finding) => finding.path === 'reference/topic-b-orphan.md' && finding.classification === 'unplanned_needs_explanation'),
      detail: JSON.stringify(foWithOrphan.findings.filter((finding) => finding.path.includes('orphan'))),
    },
    {
      label: 'reentry-orphan-blocker',
      passed: reentryWithOrphan.status === 1 && JSON.stringify(reentryWithOrphan.json).includes('orphan'),
      detail: JSON.stringify(reentryWithOrphan.json?.blockers || reentryWithOrphan.json?.inspect || []),
    },
    {
      label: 'clean-submitted-gate-passes',
      passed: gateClean.status === 0 && gateClean.json?.check?.passed === true,
      detail: JSON.stringify(gateClean.json?.inspect || []),
    },
    {
      label: 'ledger-counts-only-submitted-topic-a',
      passed: refCount.count === 2 && refCount.uncountable.length === 0,
      detail: JSON.stringify(refCount),
    },
    {
      label: 'cache-coverage-clean-then-drift',
      passed: coverageClean.passed === true && coverageDrift.passed === false && /missing files: meta\.json/i.test(JSON.stringify(coverageDrift.inspect || [])),
      detail: JSON.stringify({ clean: coverageClean.inspect || [], drift: coverageDrift.inspect || [] }),
    },
    {
      label: 'file-observability-cache-gap',
      passed: foDrift.inspect.some((line) => line.includes('[cache_gap]') && line.includes('meta.json')),
      detail: JSON.stringify(foDrift.inspect),
    },
    {
      label: 'reentry-cache-gap',
      passed: JSON.stringify(reentryDrift.json?.inspect || []).includes('[cache_gap]') && JSON.stringify(reentryDrift.json).includes('meta.json'),
      detail: JSON.stringify(reentryDrift.json?.inspect || []),
    },
    {
      label: 'six-file-classifications',
      passed: FILE_CLASSIFICATIONS.length === 6,
      detail: FILE_CLASSIFICATIONS.join(', '),
    },
    {
      label: 'heavy-health-detects-cache-drift',
      passed: health.status === 1 && health.json?.cache_trails?.status === 'issues',
      detail: JSON.stringify(health.json?.cache_trails || health.stderr),
    },
  ];
  // Keep variables visibly used in evidence detail for audit.
  checks.push({
    label: 'submitted-work-unit-rows',
    passed: readSubmittedWorkUnitDeclarations(bundleDir).length === 4 && submittedShared.submit.ok === true && submittedA1.submit.ok === true && submittedA2.submit.ok === true && submittedB1.submit.ok === true,
    detail: JSON.stringify(readSubmittedWorkUnitDeclarations(bundleDir).map((row) => ({ work_id: row.work_id, queue_item_id: row.queue_item_id }))),
  });

  for (const check of checks) recordCheck(bundleDir, 'case-162', 'evidence-extraction-gate-reentry-cache', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-162', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function stageCase163Scaffold(bundleDir) {
  writeWave0Scaffold(bundleDir, {
    planBasename: 'eex_real_agent_rerun_add',
    topics: [
      { id: 't1', slug: 'ai-regulation', title: 'AI Regulation' },
      { id: 't2', slug: 'ai-safety-research', title: 'AI Safety Research' },
      { id: 't3', slug: 'economic-impact', title: 'Economic Impact of AI Safety' },
    ],
    referenceRows: [
      '| 00-shared-economic-impact.md | primary | expert | Tier 2 | economic-impact | wave0_foundation | accepted | 2026-07-06 |',
    ],
  });
  writeFileSync(path.join(bundleDir, 'rb_profile.yaml'), [
    'plan_basename: eex_real_agent_rerun_add',
    'research_profile: quick_factual',
    'root_must_answer_set:',
    '  - What are the economic implications of AI safety measures?',
    'research_style_params:',
    '  user_visible: false',
    '  wave0_per_topic_source_floor: 1',
    '  wave0_shared_ref_total: 1',
    '  wave1_per_topic_ref_floor: 1',
    '  quality_min_tier: tier_4',
    '  quality_min_substance: none',
    'human_decision_checkpoints:',
    '  hitl1:',
    '    status: recorded',
    '  hitl2:',
    '    status: recorded',
    '    user_decision: rerun',
    '    rerun_count: 1',
    '    rationale: Add economic impact analysis to topic coverage.',
    '',
  ].join('\n'));
  mkdirSync(path.join(bundleDir, 'seed_topics'), { recursive: true });
  writeFileSync(path.join(bundleDir, 'seed_topics/economic-impact.md'), [
    '---',
    'id: t3',
    'slug: economic-impact',
    'title: Economic Impact of AI Safety',
    '---',
    '',
    '# Economic Impact of AI Safety',
    '',
    '## 本轮重跑方向',
    '- action: add',
    '- new_search_dimensions: economic impact of AI safety regulation, compliance cost, market effects',
    '',
  ].join('\n'));
  const task = queueItemForWorkUnit({
    phase: 'wave0',
    queue_item_id: 'case163-economic-impact',
    topic_slug: 'economic-impact',
    title: 'Real Agent rerun action:add source intake for economic-impact',
  });
  enqueueWorkUnitTask(bundleDir, task, { fileName: 'economic-impact-real-agent.json' });
  const claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave0' });
  return { task, claim, workId: claim.claimed_work_ids[0] };
}

function case163(opts) {
  const bundleDir = newBundle('case-163', 'eex_real_agent_rerun_add', opts);
  const { workId } = stageCase163Scaffold(bundleDir);

  if (!opts.realResult) {
    const reason = {
      case: 'case-163',
      status: 'NOT_RUN',
      work_id: workId,
      unavailable_surface: 'No --real-result directory or result JSON was provided. This heavy case requires real Agent/sub-agent output with fetched cache leaves.',
      rerun_condition: 'Run the real sub-agent from the generated work-unit task, then pass either its result JSON or a directory containing result.json plus output/cache files via --real-result.',
      quality_metrics_required: ['cache_trail_coverage', 'grounding_spot_check', 'url_precision', 'countable_rate', 'gap_rate'],
    };
    writeJson(path.join(bundleDir, 'case-163-not-run.json'), reason);
    recordCheck(bundleDir, 'case-163', 'real-agent-rerun-cache-trail', false, reason.unavailable_surface, { outcome: 'not_run', work_id: workId });
    const verdict = writeVerdict(bundleDir, 'case-163', [], { status: 'NOT_RUN', extra: { bundle: bundleDir, reason } });
    return { bundleDir, verdict, exitCode: 2 };
  }

  const realResultPath = path.resolve(opts.realResult);
  let resultPath = realResultPath;
  if (statSync(realResultPath).isDirectory()) {
    for (const entry of readdirSync(realResultPath)) {
      if (entry === 'result.json') continue;
      copyRecursiveSync(path.join(realResultPath, entry), path.join(bundleDir, entry));
    }
    resultPath = path.join(realResultPath, 'result.json');
  }
  const submit = submitWorkUnitViaCli(bundleDir, { work_id: workId, resultPath });
  appendTrace(bundleDir, { event: 'wave0_completion', source: 'case-163-real-agent' });
  const gate = runWave0Gate(bundleDir, 'gate-real-agent.json');
  const health = runHealth(bundleDir, 'heavy', 'health-real-agent.json');
  const refCount = countReferences(bundleDir, { source: 'ledger' });
  const coverage = checkCacheCoverage(bundleDir);
  const fo = auditFileObservability(bundleDir, {
    topicSlugs: ['ai-regulation', 'ai-safety-research', 'economic-impact'],
    ledgerDeclarations: readOutputDeclarations(bundleDir),
    targetPhase: 'wave0',
  });
  writeJson(path.join(bundleDir, 'file-observability-real-agent.json'), fo);
  const submittedRows = readSubmittedWorkUnitDeclarations(bundleDir);
  const refOutputs = submittedRows.flatMap((row) => (row.output_files || []).filter((entry) => entry.role === 'reference'));
  const cacheTrailCoverage = {
    references: refOutputs.length,
    trails: submittedRows.reduce((sum, row) => sum + (row.cache_trails || []).length, 0),
    mapped: coverage.passed,
  };
  writeJson(path.join(bundleDir, 'case-163-quality-metrics.json'), {
    cache_trail_coverage: cacheTrailCoverage,
    countable_rate: refOutputs.length > 0 ? refCount.count / refOutputs.length : 0,
    gap_rate: fo.inspect.filter((line) => line.includes('[cache_gap]')).length,
    url_precision: refOutputs.map((entry) => ({ path: entry.path, source_url: entry.source_url })),
    grounding_spot_check: 'manual-review-required: compare sampled Key Facts with submitted cache page.md files',
  });

  const checks = [
    { label: 'real-submit', passed: submit.ok === true, detail: workId },
    { label: 'wave0-gate', passed: gate.status === 0 && gate.json?.check?.passed === true, detail: JSON.stringify(gate.json?.inspect || []) },
    { label: 'cache-coverage', passed: coverage.passed === true, detail: JSON.stringify(coverage.inspect || []) },
    { label: 'heavy-health', passed: health.status === 0 && health.json?.status === 'clean', detail: JSON.stringify(health.json?.cache_trails || health.stderr) },
    { label: 'countable-rate', passed: refOutputs.length > 0 && refCount.count === refOutputs.length, detail: JSON.stringify(refCount) },
    { label: 'no-cache-gap', passed: !fo.inspect.some((line) => line.includes('[cache_gap]')), detail: JSON.stringify(fo.inspect) },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-163', 'real-agent-rerun-cache-trail', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-163', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function case401(opts) {
  const bundleDir = newBundle('case-401', 'eb_full_work_unit', opts);
  writeWave0Scaffold(bundleDir, { planBasename: 'eb_full_work_unit' });
  const submitted = submitWave0Fixture(bundleDir);
  const rows = readWorkUnitLedgerRows(bundleDir);
  const validate = runNodeLoose([VALIDATE_BUNDLE, bundleDir]);
  const gate = runWave0Gate(bundleDir);
  const inspect = inspectWorkUnitsViaCli(bundleDir);

  const checks = [
    { label: 'work-unit-submit', passed: submitted.submit.ok === true, detail: submitted.record.work_id },
    { label: 'ledger-row', passed: rows.length === 1 && rows[0].work_id === submitted.record.work_id && rows[0].queue_item_id === submitted.record.queue_item_id, detail: `${rows.length} submitted row(s)` },
    { label: 'validate-bundle', passed: validate.status === 0, detail: validate.stderr || validate.stdout },
    { label: 'wave0-gate', passed: gate.status === 0 && gate.json?.check?.passed === true, detail: JSON.stringify(gate.json?.inspect || []) },
    { label: 'work-unit-inspect', passed: inspect.passed === true, detail: 'inspect passed' },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-401', 'full-boundary', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-401', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function prepareRejectedSubmit(bundleDir, label, mutate, { prefix = 'case402', topicSlug = 'topic-a' } = {}) {
  const queueItemId = `${prefix}-${label}`;
  const task = queueItemForWorkUnit({ queue_item_id: queueItemId, topic_slug: topicSlug });
  enqueueWorkUnitTask(bundleDir, task, { fileName: `${label}.json` });
  const claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave0' });
  const workId = claim.claimed_work_ids[0];
  const fixture = writeFixtureResultForWorkUnit(bundleDir, {
    work_id: workId,
    source_url: `https://research-source.test/${label}/article`,
    source_slug: label,
  });
  mutate(fixture);
  const result = runNodeLoose([OPERATE_WORK_UNIT, 'submit', bundleDir, '--work-id', workId, '--result', fixture.resultPath]);
  return { label, workId, result };
}

function case402(opts) {
  const bundleDir = newBundle('case-402', 'eb_reject_work_unit', opts);
  writeWave0Scaffold(bundleDir, { planBasename: 'eb_reject_work_unit' });
  const cases = [
    prepareRejectedSubmit(bundleDir, 'missing-receipt', ({ record }) => {
      rmSync(path.join(bundleDir, record.paths.runtime_receipt_ref), { force: true });
    }),
    prepareRejectedSubmit(bundleDir, 'missing-output', ({ outputPath }) => {
      rmSync(path.join(bundleDir, outputPath), { force: true });
    }),
    prepareRejectedSubmit(bundleDir, 'missing-cache', ({ cache_trails }) => {
      rmSync(path.join(bundleDir, cache_trails[0], 'meta.json'), { force: true });
    }),
    prepareRejectedSubmit(bundleDir, 'nonce-mismatch', ({ resultPath }) => {
      const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
      result.receipt_nonce = 'nonce-mismatch-0000';
      writeJson(resultPath, result);
    }),
    prepareRejectedSubmit(bundleDir, 'wrong-work-id', ({ resultPath }) => {
      const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
      result.work_id = 'wu-w0-b000-src-i9999';
      writeJson(resultPath, result);
    }),
  ];
  const expectedCodes = new Map([
    ['missing-receipt', 'missing_receipt'],
    ['missing-output', 'missing_output'],
    ['missing-cache', 'missing_cache'],
    ['nonce-mismatch', 'nonce_mismatch'],
    ['wrong-work-id', 'wrong_work_id'],
  ]);
  const ledgerRows = readWorkUnitLedgerRows(bundleDir);
  const checks = cases.map(({ label, result }) => {
    const code = result.json?.last_submit_rejection?.reason_code || result.stderr;
    return {
      label,
      passed: result.status === 1 && code === expectedCodes.get(label),
      detail: `status=${result.status}, reason=${code}`,
    };
  });
  checks.push({
    label: 'no-ledger-on-reject',
    passed: ledgerRows.length === 0,
    detail: `${ledgerRows.length} ledger row(s)`,
  });
  for (const check of checks) recordCheck(bundleDir, 'case-402', 'invalid-submit-boundary', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-402', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function resetCase403Scenario(bundleDir, name) {
  for (const relPath of ['rb_queue.json', 'rb_output_declarations.jsonl', '_work_units', 'reference', 'artifacts', '_cache']) {
    rmSync(path.join(bundleDir, relPath), { recursive: true, force: true });
  }
  writeWave0Scaffold(bundleDir, {
    planBasename: `eb_authority_${name}`,
    referenceRows: [
      '| 00-shared-a.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |',
      '| 00-shared-b.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |',
    ],
  });
}

function submitCase403Coverage(bundleDir, name, refs) {
  const [first, ...rest] = refs;
  const task = queueItemForWorkUnit({
    queue_item_id: `case403-${name}`,
    topic_slug: 'topic-a',
    title: `Gate authority scenario: ${name}`,
  });
  enqueueWorkUnitTask(bundleDir, task, { fileName: `${name}.json` });
  const claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave0' });
  const workId = claim.claimed_work_ids[0];
  const cacheTrails = refs.map((ref, index) => `_cache/wave0/primary/case403-${name}/${name}-${index + 1}`);
  const fixture = writeFixtureResultForWorkUnit(bundleDir, {
    work_id: workId,
    output_path: first.path,
    source_url: first.url,
    source_slug: `${name}-1`,
    output_content: first.content || referenceContent({
      source_url: first.url,
      topic_slug: 'topic-a',
      title: first.title || `${name} 1`,
    }),
    extra_output_files: rest.map((ref, index) => ({
      path: ref.path,
      role: 'reference',
      source_url: ref.url,
      source_slug: `${name}-${index + 2}`,
      content: ref.content || referenceContent({
        source_url: ref.url,
        topic_slug: 'topic-a',
        title: ref.title || `${name} ${index + 2}`,
      }),
    })).concat([sourceYamlExtra('topic-a', first.url, first.title || `${name} source`)]),
    cache_trails: cacheTrails,
  });
  for (const [index, ref] of refs.entries()) {
    writeFileSync(path.join(bundleDir, cacheTrails[index], 'meta.json'), `${JSON.stringify({ url: ref.url })}\n`);
  }
  const submit = submitWorkUnitViaCli(bundleDir, { work_id: workId, resultPath: fixture.resultPath });
  return { task, claim, ...fixture, submit };
}

function case403(opts) {
  const bundleDir = newBundle('case-403', 'eb_authority_work_unit', opts);
  const checks = [];

  resetCase403Scenario(bundleDir, 'missing-ledger');
  let gate = runWave0Gate(bundleDir, 'gate-missing-ledger.json');
  checks.push({
    label: 'missing-ledger-fails',
    passed: gate.status === 1 && gate.json?.check?.passed === false && JSON.stringify(gate.json.inspect || []).includes('No submitted work-unit ledger rows'),
    detail: JSON.stringify(gate.json.inspect || []),
  });

  resetCase403Scenario(bundleDir, 'clean');
  submitCase403Coverage(bundleDir, 'clean', [{
    path: 'reference/00-shared-a.md',
    url: 'https://research-source.test/clean/a',
    title: 'Clean A',
  }]);
  gate = runWave0Gate(bundleDir, 'gate-clean.json');
  checks.push({
    label: 'clean-pass',
    passed: gate.status === 0 && gate.json?.check?.passed === true,
    detail: JSON.stringify(gate.json.inspect || []),
  });

  resetCase403Scenario(bundleDir, 'root-url');
  submitCase403Coverage(bundleDir, 'root-url', [{
    path: 'reference/00-shared-a.md',
    url: 'https://research-source.test/',
    title: 'Recoverable Root URL Fixture',
  }]);
  gate = runWave0Gate(bundleDir, 'gate-root-url.json');
  checks.push({
    label: 'root-url-passes',
    passed: gate.status === 0 && gate.json?.check?.passed === true,
    detail: JSON.stringify(gate.json.inspect || []),
  });

  resetCase403Scenario(bundleDir, 'cache-drift');
  const drift = submitCase403Coverage(bundleDir, 'cache-drift', [{
    path: 'reference/00-shared-a.md',
    url: 'https://research-source.test/cache/drift',
    title: 'Cache Drift A',
  }]);
  const driftTrail = drift.cache_trails?.[0] || '_cache/wave0/primary/case403-cache-drift/cache-drift-1';
  rmSync(path.join(bundleDir, driftTrail, 'meta.json'), { force: true });
  gate = runWave0Gate(bundleDir, 'gate-cache-drift.json');
  checks.push({
    label: 'cache-drift-fails',
    passed: gate.status === 1 && JSON.stringify(gate.json.inspect || []).includes('cache_coverage'),
    detail: JSON.stringify(gate.json.inspect || []),
  });

  for (const check of checks) recordCheck(bundleDir, 'case-403', 'work-unit-authority', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-403', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function nonDelegatedTask(queueItemId) {
  return {
    queue_item_id: queueItemId,
    title: `Non-delegated ${queueItemId}`,
    targets: { controller: 'main-agent' },
    action: 'Controlled non-delegated queue task.',
    producer_rule: 'case404_non_delegated',
    lineage: {},
    priority_class: 'P5_new_reference_intake',
    required_receipts: ['none'],
    done_condition: 'operate-queue complete succeeds',
    verification: { engine: [], agent: [] },
    writes_to: [],
    status_sync: [],
    completion_receipt: 'none',
    failure_route: 'queue repair work',
    payload: {},
  };
}

function case404(opts) {
  const bundleDir = newBundle('case-404', 'eb_queue_work_unit', opts);
  writeMinimalStatus(bundleDir);
  writeMinimalPlan(bundleDir);

  enqueueViaQueueCli(bundleDir, nonDelegatedTask('case404-nondelegated'), 'case404-nondelegated.json');
  const claimNonDelegated = runNodeLoose([OPERATE_QUEUE, 'claim', bundleDir, '--actor', 'main-agent']);
  const completeNonDelegated = completeQueueItem(bundleDir, 'case404-nondelegated', 'case404-nondelegated-result');

  const delegatedActive = queueItemForWorkUnit({ queue_item_id: 'wave0-source-topic-a', topic_slug: 'topic-a' });
  enqueueViaQueueCli(bundleDir, delegatedActive, 'case404-delegated-active.json');
  const completeDelegatedActive = completeQueueItem(bundleDir, delegatedActive.queue_item_id, 'case404-delegated-active-result');

  const claimDelegated = claimWorkUnitsViaCli(bundleDir, { phase: 'wave0' });
  const completeDelegatedInFlight = completeQueueItem(bundleDir, delegatedActive.queue_item_id, 'case404-delegated-inflight-result');

  const controllerSubAgent = TargetSpecSchema.safeParse({ controller: 'sub-agent' });
  const delegatedTarget = TargetSpecSchema.safeParse({ controller: 'main-agent', delegates: { to: 'sub-agent', role_key: 'dpt-source-intake' } });

  const checks = [
    { label: 'non-delegated-claim', passed: claimNonDelegated.status === 0, detail: claimNonDelegated.stdout },
    { label: 'non-delegated-complete', passed: completeNonDelegated.status === 0, detail: completeNonDelegated.stdout },
    { label: 'delegated-active-complete-rejects', passed: completeDelegatedActive.status === 1 && JSON.stringify(completeDelegatedActive.json || {}).includes('operate-work-unit submit'), detail: completeDelegatedActive.stdout },
    { label: 'delegated-inflight-claim', passed: claimDelegated.claimed_count === 1, detail: JSON.stringify(claimDelegated.claimed_work_ids) },
    { label: 'delegated-inflight-complete-rejects', passed: completeDelegatedInFlight.status === 1 && JSON.stringify(completeDelegatedInFlight.json || {}).includes('operate-work-unit submit'), detail: completeDelegatedInFlight.stdout },
    { label: 'controller-sub-agent-rejected', passed: !controllerSubAgent.success && delegatedTarget.success, detail: 'TargetSpecSchema boundary' },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-404', 'queue-boundary', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-404', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function walkFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function case405(opts) {
  const bundleDir = newBundle('case-405', 'eb_trace_work_unit', opts);
  writeMinimalStatus(bundleDir);
  writeMinimalPlan(bundleDir);

  const trace = createTrace(path.join(bundleDir, 'rb_trace.jsonl'), { consoleEcho: false });
  trace.traceEntry('check', {
    source: 'case-405-api',
    gate: 'trace-api',
    passed: true,
    expected: true,
    detail: 'createTrace writes rb_trace.jsonl',
  });

  enqueueViaQueueCli(bundleDir, nonDelegatedTask('case405-queue'), 'case405-queue.json');
  runNode([OPERATE_QUEUE, 'claim', bundleDir, '--actor', 'main-agent']);
  completeQueueItem(bundleDir, 'case405-queue', 'case405-queue-result');

  const submitted = submitWave0Fixture(bundleDir, {
    queueItemId: 'wave0-source-topic-a',
    refPath: 'reference/00-shared-trace.md',
    sourceUrl: 'https://research-source.test/trace/article',
    sourceSlug: 'trace',
    title: 'Trace Fixture Source',
  });

  const events = readTrace(bundleDir);
  const badTraceFiles = walkFiles(bundleDir)
    .map((file) => path.relative(bundleDir, file))
    .filter((rel) => rel !== 'rb_trace.jsonl')
    .filter((rel) => /(^|\/)(trace|_trace)(?:[_.-].*)?\.jsonl$/i.test(rel) || /_trace_agq_cli|_trace_subagent|rbrb_trace/i.test(rel));

  const checks = [
    { label: 'trace-api', passed: events.some((e) => e.source === 'case-405-api'), detail: 'trace API event in rb_trace.jsonl' },
    { label: 'queue-trace', passed: events.some((e) => e.event === 'queue_completed' && e.queue_item_id === 'case405-queue'), detail: 'queue_completed event in rb_trace.jsonl' },
    { label: 'work-unit-claim-trace', passed: events.some((e) => e.event === 'work_unit_claimed' && e.work_id === submitted.record.work_id), detail: submitted.record.work_id },
    { label: 'work-unit-submit-trace', passed: events.some((e) => e.event === 'work_unit_submitted' && e.work_id === submitted.record.work_id), detail: submitted.record.work_id },
    { label: 'single-sink', passed: badTraceFiles.length === 0, detail: JSON.stringify(badTraceFiles) },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-405', 'trace-single-sink', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-405', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function case406(opts) {
  const bundleDir = newBundle('case-406', 'eb_real_work_unit', opts);
  writeWave0Scaffold(bundleDir, {
    planBasename: 'eb_real_work_unit',
    topics: [{ id: 't1', slug: 'agentic-coding-tools', title: 'Agentic coding tools' }],
    referenceRows: ['| 00-shared-agentic-coding-tools.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |'],
  });

  const task = queueItemForWorkUnit({
    queue_item_id: 'wave0-source-agentic-coding-tools',
    topic_slug: 'agentic-coding-tools',
    title: 'Real sub-agent source intake',
  });
  enqueueWorkUnitTask(bundleDir, task, { fileName: 'case406-real-task.json' });
  const claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave0' });
  const workId = claim.claimed_work_ids[0];
  writeJson(path.join(bundleDir, 'case-406-claim.json'), claim);

  if (!opts.realResult) {
    const reason = {
      case: 'case-406',
      status: 'NOT_RUN',
      work_id: workId,
      unavailable_surface: 'No --real-result was provided. This heavy case requires a real dpt-source-intake actor result produced with real WebSearch/WebFetch or an approved fetch chain.',
      rerun_condition: 'Run the real sub-agent from the generated work-unit task, then pass its result JSON with --real-result.',
    };
    writeJson(path.join(bundleDir, 'case-406-not-run.json'), reason);
    recordCheck(bundleDir, 'case-406', 'real-subagent-boundary', false, reason.unavailable_surface, { outcome: 'not_run', work_id: workId });
    const verdict = writeVerdict(bundleDir, 'case-406', [], { status: 'NOT_RUN', extra: { bundle: bundleDir, reason } });
    return { bundleDir, verdict, exitCode: 2 };
  }

  const submit = submitWorkUnitViaCli(bundleDir, { work_id: workId, resultPath: path.resolve(opts.realResult) });
  const gate = runWave0Gate(bundleDir);
  const events = readTrace(bundleDir);
  const checks = [
    { label: 'real-submit', passed: submit.ok === true, detail: workId },
    { label: 'wave0-gate', passed: gate.status === 0 && gate.json?.check?.passed === true, detail: JSON.stringify(gate.json?.inspect || []) },
    { label: 'work-unit-trace', passed: events.some((e) => e.event === 'work_unit_submitted' && e.work_id === workId), detail: workId },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-406', 'real-subagent-boundary', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-406', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function case211(opts) {
  const bundleDir = newBundle('case-211', 'w0_real_agent_work_unit', opts);
  writeWave0Scaffold(bundleDir, {
    planBasename: 'w0_real_agent_work_unit',
    topics: [{ id: 't1', slug: 'agentic-coding-tools', title: 'Agentic coding tools' }],
    referenceRows: ['| 00-shared-agentic-coding-tools.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |'],
  });

  const task = queueItemForWorkUnit({
    queue_item_id: 'wave0-source-agentic-coding-tools',
    topic_slug: 'agentic-coding-tools',
    title: 'Real Wave0 source intake',
  });
  enqueueWorkUnitTask(bundleDir, task, { fileName: 'case211-real-task.json' });
  const claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave0' });
  const workId = claim.claimed_work_ids[0];
  writeJson(path.join(bundleDir, 'case-211-claim.json'), claim);

  if (!opts.realResult) {
    const reason = {
      case: 'case-211',
      status: 'NOT_RUN',
      work_id: workId,
      unavailable_surface: 'No --real-result was provided. This heavy Wave0 case requires a real dpt-source-intake actor result produced with real WebSearch/WebFetch or an approved fetch chain.',
      rerun_condition: 'Run the real sub-agent from the generated work-unit task, then pass its result JSON with --real-result.',
    };
    writeJson(path.join(bundleDir, 'case-211-not-run.json'), reason);
    recordCheck(bundleDir, 'case-211', 'wave0-real-agent', false, reason.unavailable_surface, { outcome: 'not_run', work_id: workId });
    const verdict = writeVerdict(bundleDir, 'case-211', [], { status: 'NOT_RUN', extra: { bundle: bundleDir, reason } });
    return { bundleDir, verdict, exitCode: 2 };
  }

  const submit = submitWorkUnitViaCli(bundleDir, { work_id: workId, resultPath: path.resolve(opts.realResult) });
  const gate = runWave0Gate(bundleDir);
  const inspect = inspectWorkUnitsViaCli(bundleDir);
  const events = readTrace(bundleDir);
  const checks = [
    { label: 'real-submit', passed: submit.ok === true, detail: workId },
    { label: 'wave0-gate', passed: gate.status === 0 && gate.json?.check?.passed === true, detail: JSON.stringify(gate.json?.inspect || []) },
    { label: 'work-unit-inspect', passed: inspect.passed === true, detail: 'inspect passed' },
    { label: 'work-unit-trace', passed: events.some((e) => e.event === 'work_unit_submitted' && e.work_id === workId), detail: workId },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-211', 'wave0-real-agent', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-211', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function case212(opts) {
  const bundleDir = newBundle('case-212', 'w0_gate_refill_repair', opts);
  const topics = [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' },
  ];
  writeWave0Scaffold(bundleDir, {
    planBasename: 'w0_gate_refill_repair',
    topics,
    referenceRows: ['| 00-shared-topic-a.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |'],
  });

  submitWave0Fixture(bundleDir, {
    queueItemId: 'wave0-source-topic-a',
    topicSlug: 'topic-a',
    refPath: 'reference/00-shared-topic-a.md',
    sourceUrl: 'https://research-source.test/topic-a/refill/a',
    sourceSlug: 'topic-a',
    title: 'Topic A Fixture Source',
  });

  const failGate = runWave0Gate(bundleDir, 'gate-before-repair.json');
  const opened = openWorkUnitBatchViaCli(bundleDir, { phase: 'wave0', reason: 'gate_failure_refill' });
  const repairTask = queueItemForWorkUnit({
    queue_item_id: 'wave0-source-topic-b',
    topic_slug: 'topic-b',
    title: 'Repair Wave0 source intake for Topic B',
  });
  enqueueWorkUnitTask(bundleDir, repairTask, { fileName: 'case212-topic-b-repair.json' });
  const repairClaim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave0' });
  const repairWorkId = repairClaim.claimed_work_ids[0];
  const repairSubmit = submitClaimedWave0Fixture(bundleDir, {
    workId: repairWorkId,
    topicSlug: 'topic-b',
    refPath: 'reference/00-shared-topic-b.md',
    sourceUrl: 'https://research-source.test/topic-b/refill/b',
    sourceSlug: 'topic-b',
    title: 'Topic B Repair Fixture Source',
  });
  const passGate = runWave0Gate(bundleDir, 'gate-after-repair.json');
  const gateAttempts = readTrace(bundleDir).filter((event) => event.event === 'gate_attempt' && event.gate === 'wave0-complete');
  const repairRecord = loadWorkUnitIndex(bundleDir).work_units[repairWorkId];

  const checks = [
    {
      label: 'initial-gate-fails',
      passed: failGate.status === 1 && failGate.json?.check?.passed === false && JSON.stringify(failGate.json.inspect || []).includes('topic-b'),
      detail: JSON.stringify(failGate.json.inspect || []),
    },
    {
      label: 'repair-batch-opened',
      passed: opened.ok === true && opened.batch_id === 'b001' && opened.batch_reason === 'gate_failure_refill',
      detail: `${opened.batch_id}:${opened.batch_reason}`,
    },
    {
      label: 'repair-claim-uses-refill-batch',
      passed: repairWorkId?.includes('-b001-') && repairRecord?.attempt_index === 1,
      detail: repairWorkId,
    },
    {
      label: 'repair-submit',
      passed: repairSubmit.submit.ok === true,
      detail: repairWorkId,
    },
    {
      label: 'repaired-gate-passes',
      passed: passGate.status === 0 && passGate.json?.check?.passed === true,
      detail: JSON.stringify(passGate.json.inspect || []),
    },
    {
      label: 'gate-attempts-fail-then-pass',
      passed: gateAttempts.length >= 2 && gateAttempts.some((event) => event.passed === false) && gateAttempts.some((event) => event.passed === true),
      detail: `${gateAttempts.length} gate_attempt event(s)`,
    },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-212', 'wave0-gate-refill-repair', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-212', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function case213(opts) {
  const bundleDir = newBundle('case-213', 'w0_multi_work_unit', opts);
  const topics = [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' },
    { id: 't3', slug: 'topic-c', title: 'Topic C' },
  ];
  writeWave0Scaffold(bundleDir, {
    planBasename: 'w0_multi_work_unit',
    topics,
    referenceRows: topics.map((topic) => `| 00-shared-${topic.slug}.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |`),
  });

  for (const topic of topics) {
    enqueueWorkUnitTask(bundleDir, queueItemForWorkUnit({
      queue_item_id: `wave0-source-${topic.slug}`,
      topic_slug: topic.slug,
      title: `Wave0 source intake for ${topic.title}`,
    }), { fileName: `case213-${topic.slug}.json` });
  }
  const claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave0', count: 3 });
  const submissions = claim.claimed_work_ids.map((workId, index) => submitClaimedWave0Fixture(bundleDir, {
    workId,
    topicSlug: topics[index].slug,
    refPath: `reference/00-shared-${topics[index].slug}.md`,
    sourceUrl: `https://research-source.test/${topics[index].slug}/multi/${index + 1}`,
    sourceSlug: topics[index].slug,
    title: `${topics[index].title} Fixture Source`,
  }));
  const rowsAfterHappy = readWorkUnitLedgerRows(bundleDir);
  const happyGate = runWave0Gate(bundleDir, 'gate-multi-happy.json');

  const missingReceipt = prepareRejectedSubmit(bundleDir, 'missing-receipt', ({ record }) => {
    rmSync(path.join(bundleDir, record.paths.runtime_receipt_ref), { force: true });
  }, { prefix: 'case213', topicSlug: 'topic-a' });
  const invalidResult = prepareRejectedSubmit(bundleDir, 'invalid-result', ({ resultPath }) => {
    const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
    delete result.kind;
    writeJson(resultPath, result);
  }, { prefix: 'case213', topicSlug: 'topic-b' });
  const rejectedWorkIds = [missingReceipt.workId, invalidResult.workId];
  const rejectedRows = readWorkUnitLedgerRows(bundleDir).filter((row) => rejectedWorkIds.includes(row.work_id));

  const timeoutTask = queueItemForWorkUnit({
    queue_item_id: 'case213-timeout-retry',
    topic_slug: 'topic-c',
    title: 'Wave0 timeout retry proof',
  });
  enqueueWorkUnitTask(bundleDir, timeoutTask, { fileName: 'case213-timeout-retry.json' });
  const timeoutClaim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave0' });
  const firstTimeoutWorkId = timeoutClaim.claimed_work_ids[0];
  const timedOut = closeWorkUnitViaCli(bundleDir, { command: 'timeout', work_id: firstTimeoutWorkId, reason: 'playbook-timeout-retry' });
  const retryClaim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave0' });
  const retryWorkId = retryClaim.claimed_work_ids[0];
  const retryRecord = loadWorkUnitIndex(bundleDir).work_units[retryWorkId];

  const orphanTopic = { id: 't4', slug: 'topic-orphan', title: 'Topic Orphan' };
  const orphanBundleDir = newBundle('case-213', 'w0_orphan_output', opts);
  writeWave0Scaffold(orphanBundleDir, {
    planBasename: 'w0_orphan_output',
    topics: [orphanTopic],
    referenceRows: ['| 00-shared-topic-orphan.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |'],
  });
  mkdirSync(path.join(orphanBundleDir, 'artifacts/wave0/topic-orphan'), { recursive: true });
  writeFileSync(path.join(orphanBundleDir, 'artifacts/wave0/topic-orphan/source.yaml'), sourceYamlContent({
    source_url: 'https://research-source.test/topic-orphan/direct',
    topic_slug: 'topic-orphan',
    title: 'Orphan Direct Source',
  }));
  const orphanGate = runWave0Gate(orphanBundleDir, 'gate-orphan-output.json');

  const checks = [
    { label: 'multi-claim-count', passed: claim.claimed_count === 3 && claim.claimed_work_ids.length === 3, detail: JSON.stringify(claim.claimed_work_ids) },
    { label: 'multi-submit', passed: submissions.every((entry) => entry.submit.ok === true), detail: submissions.map((entry) => entry.record.work_id).join(', ') },
    { label: 'multi-ledger-rows', passed: rowsAfterHappy.length === 3, detail: `${rowsAfterHappy.length} row(s)` },
    { label: 'multi-gate-pass', passed: happyGate.status === 0 && happyGate.json?.check?.passed === true, detail: JSON.stringify(happyGate.json.inspect || []) },
    {
      label: 'missing-receipt-rejected',
      passed: missingReceipt.result.status === 1 && missingReceipt.result.json?.last_submit_rejection?.reason_code === 'missing_receipt',
      detail: JSON.stringify(missingReceipt.result.json?.last_submit_rejection || {}),
    },
    {
      label: 'invalid-result-rejected',
      passed: invalidResult.result.status === 1 && invalidResult.result.json?.last_submit_rejection?.reason_code === 'invalid_result',
      detail: JSON.stringify(invalidResult.result.json?.last_submit_rejection || {}),
    },
    { label: 'rejected-work-units-no-ledger', passed: rejectedRows.length === 0, detail: `${rejectedRows.length} rejected row(s)` },
    {
      label: 'timeout-retry-new-work-id',
      passed: timedOut.ok === true && timedOut.retry_requeued === true && retryWorkId !== firstTimeoutWorkId && retryRecord?.attempt_index === 2 && retryRecord?.batch_id === 'b000',
      detail: `${firstTimeoutWorkId} -> ${retryWorkId}`,
    },
    {
      label: 'orphan-output-gate-rejects',
      passed: orphanGate.status === 1 && orphanGate.json?.check?.passed === false && /coverage|bypass|topic-orphan/i.test(JSON.stringify(orphanGate.json.inspect || [])),
      detail: JSON.stringify(orphanGate.json.inspect || []),
    },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-213', 'wave0-multi-work-unit', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-213', checks, { extra: { bundle: bundleDir, orphan_bundle: orphanBundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  if (opts.cleanupPass && verdict.ok) {
    rmSync(orphanBundleDir, { recursive: true, force: true });
  }
  return { bundleDir, verdict };
}

function case221(opts) {
  const bundleDir = newBundle('case-221', 'w1_real_batch_work_unit', opts);
  const topics = [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' },
  ];
  writeWave1Scaffold(bundleDir, { planBasename: 'w1_real_batch_work_unit', topics });

  for (const topic of topics) {
    enqueueWorkUnitTask(bundleDir, queueItemForWorkUnit({
      phase: 'wave1',
      queue_item_id: `wave1-deepen-${topic.slug}`,
      topic_slug: topic.slug,
      title: `Real Wave1 deepening for ${topic.title}`,
    }), { fileName: `case221-${topic.slug}.json` });
  }
  const claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave1', count: 2 });
  writeJson(path.join(bundleDir, 'case-221-claim.json'), claim);

  if (!opts.realResult) {
    const reason = {
      case: 'case-221',
      status: 'NOT_RUN',
      claimed_work_ids: claim.claimed_work_ids,
      unavailable_surface: 'No --real-result directory was provided. This heavy Wave1 case requires real dpt-evidence-extractor results for both claimed work units.',
      rerun_condition: 'Run real sub-agents from the generated work-unit tasks, then pass a directory containing one result JSON per claimed work_id.',
    };
    writeJson(path.join(bundleDir, 'case-221-not-run.json'), reason);
    recordCheck(bundleDir, 'case-221', 'wave1-real-batch', false, reason.unavailable_surface, { outcome: 'not_run', claimed_work_ids: claim.claimed_work_ids });
    const verdict = writeVerdict(bundleDir, 'case-221', [], { status: 'NOT_RUN', extra: { bundle: bundleDir, reason } });
    return { bundleDir, verdict, exitCode: 2 };
  }

  const realDir = path.resolve(opts.realResult);
  const submits = claim.claimed_work_ids.map((workId) => {
    const resultPath = path.join(realDir, `${workId}.result.json`);
    return { workId, submit: submitWorkUnitViaCli(bundleDir, { work_id: workId, resultPath }) };
  });
  appendTrace(bundleDir, { event: 'wave1_completion', source: 'case-221-real-agent' });
  const gate = runWave1Gate(bundleDir);
  const inspect = inspectWorkUnitsViaCli(bundleDir);
  const checks = [
    { label: 'real-batch-claim', passed: claim.claimed_count === 2, detail: JSON.stringify(claim.claimed_work_ids) },
    { label: 'real-batch-submit', passed: submits.every((entry) => entry.submit.ok === true), detail: submits.map((entry) => entry.workId).join(', ') },
    { label: 'wave1-gate', passed: gate.status === 0 && gate.json?.check?.passed === true, detail: JSON.stringify(gate.json.inspect || []) },
    { label: 'work-unit-inspect', passed: inspect.passed === true, detail: 'inspect passed' },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-221', 'wave1-real-batch', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-221', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function case222(opts) {
  const bundleDir = newBundle('case-222', 'w1_gate_refill_repair', opts);
  const topics = [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' },
  ];
  writeWave1Scaffold(bundleDir, { planBasename: 'w1_gate_refill_repair', topics });

  enqueueWorkUnitTask(bundleDir, queueItemForWorkUnit({
    phase: 'wave1',
    queue_item_id: 'wave1-deepen-topic-a',
    topic_slug: 'topic-a',
    title: 'Wave1 deepening for Topic A',
  }), { fileName: 'case222-topic-a.json' });
  const claimA = claimWorkUnitsViaCli(bundleDir, { phase: 'wave1' });
  const submitA = submitClaimedWave1Fixture(bundleDir, {
    workId: claimA.claimed_work_ids[0],
    topicSlug: 'topic-a',
    topicId: 't1',
    title: 'Topic A',
  });

  const failGate = runWave1Gate(bundleDir, 'gate-before-repair.json');
  const opened = openWorkUnitBatchViaCli(bundleDir, { phase: 'wave1', reason: 'gate_failure_refill' });
  enqueueWorkUnitTask(bundleDir, queueItemForWorkUnit({
    phase: 'wave1',
    queue_item_id: 'wave1-deepen-topic-b',
    topic_slug: 'topic-b',
    title: 'Repair Wave1 deepening for Topic B',
  }), { fileName: 'case222-topic-b-repair.json' });
  const repairClaim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave1' });
  const repairWorkId = repairClaim.claimed_work_ids[0];
  const repairSubmit = submitClaimedWave1Fixture(bundleDir, {
    workId: repairWorkId,
    topicSlug: 'topic-b',
    topicId: 't2',
    title: 'Topic B',
  });
  appendTrace(bundleDir, { event: 'wave1_completion', source: 'case-222-repair' });
  const passGate = runWave1Gate(bundleDir, 'gate-after-repair.json');
  const gateAttempts = readTrace(bundleDir).filter((event) => event.event === 'gate_attempt' && event.gate === 'wave1-complete');
  const repairRecord = loadWorkUnitIndex(bundleDir).work_units[repairWorkId];

  const checks = [
    { label: 'initial-submit', passed: submitA.submit.ok === true, detail: claimA.claimed_work_ids[0] },
    {
      label: 'initial-gate-fails',
      passed: failGate.status === 1 && failGate.json?.check?.passed === false && JSON.stringify(failGate.json.inspect || []).includes('topic-b'),
      detail: JSON.stringify(failGate.json.inspect || []),
    },
    { label: 'repair-batch-opened', passed: opened.ok === true && opened.batch_id === 'b001', detail: `${opened.batch_id}:${opened.batch_reason}` },
    { label: 'repair-claim-uses-refill-batch', passed: repairWorkId?.includes('-b001-') && repairRecord?.batch_id === 'b001', detail: repairWorkId },
    { label: 'repair-submit', passed: repairSubmit.submit.ok === true, detail: repairWorkId },
    { label: 'repaired-gate-passes', passed: passGate.status === 0 && passGate.json?.check?.passed === true, detail: JSON.stringify(passGate.json.inspect || []) },
    {
      label: 'gate-attempts-fail-then-pass',
      passed: gateAttempts.length >= 2 && gateAttempts.some((event) => event.passed === false) && gateAttempts.some((event) => event.passed === true),
      detail: `${gateAttempts.length} gate_attempt event(s)`,
    },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-222', 'wave1-gate-refill-repair', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-222', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function case223(opts) {
  const bundleDir = newBundle('case-223', 'w1_real_failure_work_unit', opts);
  writeWave1Scaffold(bundleDir, {
    planBasename: 'w1_real_failure_work_unit',
    topics: [{ id: 'th', slug: 'hard-target', title: 'Hard Target' }],
  });
  enqueueWorkUnitTask(bundleDir, queueItemForWorkUnit({
    phase: 'wave1',
    queue_item_id: 'wave1-deepen-hard-target',
    topic_slug: 'hard-target',
    title: 'Real Wave1 hard-target degradation proof',
  }), { fileName: 'case223-hard-target.json' });
  const claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave1' });
  const workId = claim.claimed_work_ids[0];
  writeJson(path.join(bundleDir, 'case-223-claim.json'), claim);

  if (!opts.realResult) {
    const reason = {
      case: 'case-223',
      status: 'NOT_RUN',
      work_id: workId,
      unavailable_surface: 'No --real-result was provided. This heavy case requires a real dpt-evidence-extractor result showing honest degradation/access-limitation evidence.',
      rerun_condition: 'Run the real sub-agent from the generated work-unit task, then pass its result JSON with --real-result.',
    };
    writeJson(path.join(bundleDir, 'case-223-not-run.json'), reason);
    recordCheck(bundleDir, 'case-223', 'wave1-real-failure', false, reason.unavailable_surface, { outcome: 'not_run', work_id: workId });
    const verdict = writeVerdict(bundleDir, 'case-223', [], { status: 'NOT_RUN', extra: { bundle: bundleDir, reason } });
    return { bundleDir, verdict, exitCode: 2 };
  }

  const submit = submitWorkUnitViaCli(bundleDir, { work_id: workId, resultPath: path.resolve(opts.realResult) });
  appendTrace(bundleDir, { event: 'wave1_completion', source: 'case-223-real-agent' });
  const gate = runWave1Gate(bundleDir);
  const events = readTrace(bundleDir);
  const checks = [
    { label: 'real-submit', passed: submit.ok === true, detail: workId },
    { label: 'wave1-gate', passed: gate.status === 0 && gate.json?.check?.passed === true, detail: JSON.stringify(gate.json.inspect || []) },
    { label: 'work-unit-trace', passed: events.some((e) => e.event === 'work_unit_submitted' && e.work_id === workId), detail: workId },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-223', 'wave1-real-failure', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-223', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function case224(opts) {
  const bundleDir = newBundle('case-224', 'w1_happy_and_fail', opts);
  const topics = [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' },
  ];
  writeWave1Scaffold(bundleDir, { planBasename: 'w1_happy_and_fail', topics });

  for (const topic of topics) {
    enqueueWorkUnitTask(bundleDir, queueItemForWorkUnit({
      phase: 'wave1',
      queue_item_id: `wave1-deepen-${topic.slug}`,
      topic_slug: topic.slug,
      title: `Wave1 deepening for ${topic.title}`,
    }), { fileName: `case224-${topic.slug}.json` });
  }
  const claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave1', count: 2 });
  const reversedWorkIds = [...claim.claimed_work_ids].reverse();
  const submissions = reversedWorkIds.map((workId) => {
    const topic = workId === claim.claimed_work_ids[0] ? topics[0] : topics[1];
    return submitClaimedWave1Fixture(bundleDir, {
      workId,
      topicSlug: topic.slug,
      topicId: topic.id,
      title: topic.title,
    });
  });
  const rowsAfterHappy = readWorkUnitLedgerRows(bundleDir);
  appendTrace(bundleDir, { event: 'wave1_completion', source: 'case-224-happy' });
  const happyGate = runWave1Gate(bundleDir, 'gate-happy.json');

  enqueueWorkUnitTask(bundleDir, queueItemForWorkUnit({
    phase: 'wave1',
    queue_item_id: 'case224-invalid-submit',
    topic_slug: 'topic-a',
    title: 'Wave1 invalid submit proof',
  }), { fileName: 'case224-invalid-submit.json' });
  const invalidClaim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave1' });
  const invalidWorkId = invalidClaim.claimed_work_ids[0];
  const invalidFixture = writeFixtureResultForWorkUnit(bundleDir, {
    work_id: invalidWorkId,
    output_path: 'reference/case224-invalid-submit.md',
    source_url: 'https://research-source.test/topic-a/invalid',
    source_slug: 'invalid-submit',
    output_content: referenceContent({ source_url: 'https://research-source.test/topic-a/invalid', topic_slug: 'topic-a', title: 'Invalid Submit Probe' }),
    cache_trails: ['_cache/wave1/primary/topic-a/invalid-submit'],
  });
  rmSync(path.join(bundleDir, invalidFixture.record.paths.runtime_receipt_ref), { force: true });
  const invalidSubmit = runNodeLoose([OPERATE_WORK_UNIT, 'submit', bundleDir, '--work-id', invalidWorkId, '--result', invalidFixture.resultPath]);
  const rejectedRows = readWorkUnitLedgerRows(bundleDir).filter((row) => row.work_id === invalidWorkId);

  const orphanBundleDir = newBundle('case-224', 'w1_orphan_output', opts);
  writeWave1Scaffold(orphanBundleDir, {
    planBasename: 'w1_orphan_output',
    topics: [{ id: 'to', slug: 'topic-orphan', title: 'Topic Orphan' }],
  });
  writeWave1TopicArtifacts(orphanBundleDir, {
    id: 'to',
    topic_slug: 'topic-orphan',
    title: 'Topic Orphan',
    source_url: 'https://research-source.test/topic-orphan/direct',
  });
  appendTrace(orphanBundleDir, { event: 'wave1_completion', source: 'case-224-orphan' });
  const orphanGate = runWave1Gate(orphanBundleDir, 'gate-orphan.json');

  const shallowBundleDir = newBundle('case-224', 'w1_shallow_depth_review', opts);
  writeWave1Scaffold(shallowBundleDir, {
    planBasename: 'w1_shallow_depth_review',
    topics: [{ id: 'ts', slug: 'topic-shallow', title: 'Topic Shallow' }],
  });
  enqueueWorkUnitTask(shallowBundleDir, queueItemForWorkUnit({
    phase: 'wave1',
    queue_item_id: 'wave1-deepen-topic-shallow',
    topic_slug: 'topic-shallow',
    title: 'Shallow Wave1 fixture',
  }), { fileName: 'case224-shallow.json' });
  const shallowClaim = claimWorkUnitsViaCli(shallowBundleDir, { phase: 'wave1' });
  const shallow = submitClaimedWave1Fixture(shallowBundleDir, {
    workId: shallowClaim.claimed_work_ids[0],
    topicSlug: 'topic-shallow',
    topicId: 'ts',
    title: 'Topic Shallow',
    sourceUrl: 'https://research-source.test/topic-shallow/reused-wave0',
  });
  const shallowReviewPath = path.join(shallowBundleDir, 'artifacts/wave1/topic-shallow/depth-review.yaml');
  const shallowReview = JSON.parse(readFileSync(shallowReviewPath, 'utf8'));
  shallowReview.wave0_source_urls = ['https://research-source.test/topic-shallow/reused-wave0'];
  shallowReview.source_claims[0].is_new_vs_wave0 = false;
  shallowReview.new_source_urls = [];
  shallowReview.new_source_floor.observed = 0;
  shallowReview.decision = 'supplement_required';
  shallowReview.supplementary_queue_item_ids = ['wave1-deepen-topic-shallow-v2'];
  writeJson(shallowReviewPath, shallowReview);
  appendTrace(shallowBundleDir, { event: 'wave1_completion', source: 'case-224-shallow' });
  const shallowGate = runWave1Gate(shallowBundleDir, 'gate-shallow.json');

  const cacheThinBundleDir = newBundle('case-224', 'w1_cache_thin', opts);
  writeWave1Scaffold(cacheThinBundleDir, {
    planBasename: 'w1_cache_thin',
    topics: [{ id: 'tc', slug: 'topic-cache', title: 'Topic Cache' }],
  });
  enqueueWorkUnitTask(cacheThinBundleDir, queueItemForWorkUnit({
    phase: 'wave1',
    queue_item_id: 'wave1-deepen-topic-cache',
    topic_slug: 'topic-cache',
    title: 'Cache-thin Wave1 fixture',
  }), { fileName: 'case224-cache-thin.json' });
  const cacheClaim = claimWorkUnitsViaCli(cacheThinBundleDir, { phase: 'wave1' });
  const cacheThin = submitClaimedWave1Fixture(cacheThinBundleDir, {
    workId: cacheClaim.claimed_work_ids[0],
    topicSlug: 'topic-cache',
    topicId: 'tc',
    title: 'Topic Cache',
  });
  writeFileSync(path.join(cacheThinBundleDir, cacheThin.cache_trails[0], 'page.md'), '# Page\n');
  appendTrace(cacheThinBundleDir, { event: 'wave1_completion', source: 'case-224-cache-thin' });
  const cacheThinGate = runWave1Gate(cacheThinBundleDir, 'gate-cache-thin.json');

  const checks = [
    { label: 'multi-claim-count', passed: claim.claimed_count === 2 && claim.claimed_work_ids.length === 2, detail: JSON.stringify(claim.claimed_work_ids) },
    { label: 'out-of-order-submit', passed: submissions.every((entry) => entry.submit.ok === true) && submissions[0].record.work_id === claim.claimed_work_ids[1], detail: submissions.map((entry) => entry.record.work_id).join(', ') },
    { label: 'happy-ledger-rows', passed: rowsAfterHappy.length === 2, detail: `${rowsAfterHappy.length} row(s)` },
    { label: 'wave1-gate-pass', passed: happyGate.status === 0 && happyGate.json?.check?.passed === true, detail: JSON.stringify(happyGate.json.inspect || []) },
    {
      label: 'invalid-submit-rejected',
      passed: invalidSubmit.status === 1 && invalidSubmit.json?.last_submit_rejection?.reason_code === 'missing_receipt',
      detail: JSON.stringify(invalidSubmit.json?.last_submit_rejection || {}),
    },
    { label: 'invalid-submit-no-ledger', passed: rejectedRows.length === 0, detail: `${rejectedRows.length} rejected row(s)` },
    {
      label: 'orphan-output-gate-rejects',
      passed: orphanGate.status === 1 && orphanGate.json?.check?.passed === false && /coverage|bypass|topic-orphan/i.test(JSON.stringify(orphanGate.json.inspect || [])),
      detail: JSON.stringify(orphanGate.json.inspect || []),
    },
    {
      label: 'shallow-depth-review-gate-rejects',
      passed: shallow.submit.ok === true && shallowGate.status === 1 && shallowGate.json?.check?.passed === false && /source_novelty_floor|supplement_required/i.test(JSON.stringify(shallowGate.json.inspect || [])),
      detail: JSON.stringify(shallowGate.json.inspect || []),
    },
    {
      label: 'cache-thin-source-claim-gate-rejects',
      passed: cacheThin.submit.ok === true && cacheThinGate.status === 1 && cacheThinGate.json?.check?.passed === false && /source_claim_cache_mapping|placeholder-only|cache_coverage/i.test(JSON.stringify(cacheThinGate.json.inspect || [])),
      detail: JSON.stringify(cacheThinGate.json.inspect || []),
    },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-224', 'wave1-happy-and-fail', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-224', checks, {
    extra: { bundle: bundleDir, orphan_bundle: orphanBundleDir, shallow_bundle: shallowBundleDir, cache_thin_bundle: cacheThinBundleDir },
  });
  maybeCleanup(bundleDir, opts, verdict);
  if (opts.cleanupPass && verdict.ok) {
    rmSync(orphanBundleDir, { recursive: true, force: true });
    rmSync(shallowBundleDir, { recursive: true, force: true });
    rmSync(cacheThinBundleDir, { recursive: true, force: true });
  }
  return { bundleDir, verdict };
}

function wave2SynthesisTask() {
  return {
    ...nonDelegatedTask('wave2-synthesis'),
    title: 'Wave2 pure cross-topic synthesis',
    producer_rule: 'cross_topic_synthesis',
    priority_class: 'P2_close_open_loop',
    required_receipts: [
      'file:artifacts/wave2/synthesis.md',
      'file:artifacts/wave2/cross-topic-ledger.md',
      'file:artifacts/wave2/finding-index.yaml',
    ],
    writes_to: [
      'artifacts/wave2/synthesis.md',
      'artifacts/wave2/cross-topic-ledger.md',
      'artifacts/wave2/finding-index.yaml',
    ],
    completion_receipt: 'file:artifacts/wave2/synthesis.md',
    payload: { phase: 'wave2' },
  };
}

function wave2BackfillTask(topic) {
  return {
    ...nonDelegatedTask(`wave2-backfill-${topic.slug}`),
    title: `Wave2 seed backfill for ${topic.title}`,
    producer_rule: 'seed_topic_backfill_wave2',
    priority_class: 'P4_progressive_artifact_or_seed_backfill',
    required_receipts: [`file:seed_topics/${topic.slug}.md`],
    writes_to: [`seed_topics/${topic.slug}.md`],
    completion_receipt: `file:seed_topics/${topic.slug}.md`,
    lineage: { topic_slug: topic.slug, phase: 'wave2' },
    payload: { topic_slug: topic.slug, phase: 'wave2' },
  };
}

function writeSeedTopic(bundleDir, topic) {
  mkdirSync(path.join(bundleDir, 'seed_topics'), { recursive: true });
  writeFileSync(path.join(bundleDir, 'seed_topics', `${topic.slug}.md`), [
    '---',
    `id: ${topic.id}`,
    `slug: ${topic.slug}`,
    `title: ${topic.title}`,
    '---',
    '',
    `# ${topic.title}`,
    '',
    '## Key Dimensions',
    '- Controlled foundation dimension.',
    '',
    '## Known Premises',
    '- Fixture-backed seed topic for workflow-chain boundary proof.',
    '',
    '## Open Questions',
    '- Which evidence should the next wave deepen?',
    '',
  ].join('\n'));
}

function normalizedDisposableBasename(bundleDir) {
  const match = path.basename(bundleDir).match(/^dpt_disp_(.+)_[0-9a-f]$/);
  return match ? match[1].replace(/^case-\d+_/, '') : path.basename(bundleDir);
}

function writeFullChainSetupScaffold(bundleDir, topics) {
  const planBasename = normalizedDisposableBasename(bundleDir);
  writeMinimalStatus(bundleDir, { current_gate: 'setup_ready', next_gate: 'seed_topics_ready', state: 'in_progress' });
  writeMinimalPlan(bundleDir, { planBasename, topics });
  writeFileSync(path.join(bundleDir, 'rb_profile.yaml'), [
    `plan_basename: ${planBasename}`,
    'research_profile: debug',
    'root_must_answer_set: []',
    'research_style_params:',
    '  user_visible: false',
    '  wave0_per_topic_source_floor: 1',
    '  wave0_shared_ref_total: 1',
    '  wave1_per_topic_ref_floor: 1',
    '  topic_unique_ratio: 0',
    '  counterexample_search: false',
    '  cross_verification: false',
    '  p0p1_independent_backing: 1',
    '  quality_min_tier: tier_4',
    '  quality_min_substance: none',
    '  wave2_cross_topic_depth: 0',
    '  wave2_emergent_search_rounds: 0',
    'human_decision_checkpoints:',
    '  hitl1:',
    '    status: recorded',
    '  hitl2:',
    '    status: not_started',
    '    answerability_class: not_assessed',
    '    user_decision: not_started',
    '    final_report_view: not_started',
    '',
  ].join('\n'));
  mkdirSync(path.join(bundleDir, 'reference'), { recursive: true });
  writeFileSync(path.join(bundleDir, 'reference/README.md'), '# Reference Evidence\n');
}

function writeWave2Artifacts(bundleDir, {
  topics = [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' },
  ],
  searchRequired = false,
  directCrossRef = false,
  receiptRefs = [],
} = {}) {
  const [first, second = first] = topics;
  const expectedPairs = topics.length > 1 ? (topics.length * (topics.length - 1)) / 2 : 0;
  const gapStatus = searchRequired ? (receiptRefs.length > 0 ? 'search_submitted' : 'needs_search') : 'no_gap';
  const unresolvedSearchRequiredCount = gapStatus === 'needs_search' ? 1 : 0;
  const targetedSearchRequiredCount = searchRequired ? 1 : 0;
  const targetedSearchSubmittedCount = gapStatus === 'search_submitted' ? 1 : 0;
  mkdirSync(path.join(bundleDir, 'artifacts', 'wave2'), { recursive: true });
  mkdirSync(path.join(bundleDir, 'seed_topics'), { recursive: true });

  writeFileSync(path.join(bundleDir, 'artifacts/wave2/synthesis.md'), [
    '# Cross-Topic Synthesis',
    '',
    `W2F-001 compares [${first.title} evidence](../wave1/${first.slug}/evidence-summary.md) with [${second.title} questions](../wave1/${second.slug}/question-list.md).`,
    '',
    searchRequired
      ? 'The synthesis incorporates targeted Wave2 evidence only after the `wave2_targeted_evidence` work unit is submitted.'
      : 'The synthesis uses only existing Wave0/Wave1 evidence; no delegated Wave2 evidence row is required.',
    '',
  ].join('\n'));

  writeFileSync(path.join(bundleDir, 'artifacts/wave2/cross-topic-ledger.md'), [
    '# Cross-Topic Ledger',
    '',
    '## Cross-Topic Scan Matrix',
    '',
    '| pair_id | topics | checked_dimensions | finding_ids | notes |',
    '| --- | --- | --- | --- | --- |',
    `| P01 | ${first.slug} + ${second.slug} | shared_pattern, resolution_opportunity | W2F-001 | Controlled Wave2 comparison |`,
    '',
    '## Wave1 Legacy Questions',
    '',
    `- ${first.slug}: compare open question with ${second.slug}.`,
    '',
    '## Cross-Topic Resolutions',
    '',
    '- W2F-001: Existing evidence is enough for pure synthesis unless targeted search is explicitly selected.',
    '',
    '## Emergent Cross-Topic Questions',
    '',
    searchRequired
      ? '- W2F-001 requires targeted evidence search before cross-reference outputs can be authoritative.'
      : '- None requiring new search.',
    '',
    '## Exploration Decisions',
    '',
    searchRequired
      ? '| W2F-001 | explore_search | delegated targeted evidence must submit by work_id |'
      : '| W2F-001 | use_existing_evidence | no delegated row needed |',
    '',
    '## HITL2 Handoff',
    '',
    '- None.',
    '',
  ].join('\n'));

  const receiptLines = receiptRefs.map((ref) => `      - ${ref}`).join('\n') || '      []';
  writeFileSync(path.join(bundleDir, 'artifacts/wave2/finding-index.yaml'), [
    'version: "0.1"',
    'source_layer: wave2_cross_topic',
    'ledger: artifacts/wave2/cross-topic-ledger.md',
    'synthesis: artifacts/wave2/synthesis.md',
    'scan:',
    `  topics: [${topics.map((topic) => topic.slug).join(', ')}]`,
    `  topic_count: ${topics.length}`,
    `  pair_count_expected: ${expectedPairs}`,
    `  pair_count_checked: ${expectedPairs}`,
    'findings:',
    '  - id: W2F-001',
    searchRequired ? '    type: cross_topic_emergent_question' : '    type: cross_topic_resolution',
    '    priority: p1',
    searchRequired && receiptRefs.length === 0 ? '    status: open' : '    status: resolved',
    searchRequired ? '    decision: explore_search' : '    decision: use_existing_evidence',
    `    affected_topics: [${topics.map((topic) => topic.slug).join(', ')}]`,
    `    origin_refs: [artifacts/wave1/${first.slug}/question-list.md]`,
    `    trigger_refs: [artifacts/wave1/${second.slug}/evidence-summary.md]`,
    `    search_required: ${searchRequired ? 'true' : 'false'}`,
    receiptRefs.length > 0 ? '    subagent_receipt_refs:' : '    subagent_receipt_refs: []',
    ...(receiptRefs.length > 0 ? [receiptLines] : []),
    '    appears_in_synthesis: true',
    '    hitl2_handoff: false',
    searchRequired ? '    confidence: medium' : '    confidence: high',
    searchRequired && receiptRefs.length > 0
      ? '    independent_backing_refs: [reference/00-cross-market-shift.md]'
      : `    independent_backing_refs: [artifacts/wave1/${first.slug}/evidence-summary.md]`,
    `    gap_status: ${gapStatus}`,
    'synthesis_eligibility:',
    `  pure_synthesis_eligible: ${unresolvedSearchRequiredCount === 0 ? 'true' : 'false'}`,
    '  scan_matrix_present: true',
    '  scan_topic_pair_coverage:',
    `    - pair: [${topics.map((topic) => topic.slug).join(', ')}]`,
    '      refs: [artifacts/wave2/cross-topic-ledger.md]',
    `  unresolved_search_required_count: ${unresolvedSearchRequiredCount}`,
    `  targeted_search_required_count: ${targetedSearchRequiredCount}`,
    `  targeted_search_submitted_count: ${targetedSearchSubmittedCount}`,
    '  explicit_deferral_count: 0',
    '  profile_params_read: [p0p1_independent_backing]',
    `  ineligibility_reasons: ${unresolvedSearchRequiredCount > 0 ? '[unresolved_search_required]' : '[]'}`,
    '',
  ].join('\n'));

  for (const topic of topics) {
    writeFileSync(path.join(bundleDir, 'seed_topics', `${topic.slug}.md`), [
      '---',
      `id: ${topic.id}`,
      `slug: ${topic.slug}`,
      `title: ${topic.title}`,
      '---',
      '',
      `# ${topic.title}`,
      '',
      '## Wave2 Judgment',
      `Cross-topic judgment from W2F-001 for ${topic.slug}.`,
      '',
      '## Pending Questions',
      '- [resolved] Controlled Wave2 fixture has no pending question.',
      '',
    ].join('\n'));
  }

  if (directCrossRef) {
    writeFileSync(path.join(bundleDir, 'reference/00-cross-market-shift.md'), referenceContent({
      source_url: 'https://research-source.test/wave2/market-shift',
      topic_slug: 'cross-topic',
      title: 'Wave2 Targeted Cross Reference',
      key_facts: [
        'Targeted evidence compares the two Wave1 topics directly.',
        'The reference is a controlled fixture for provenance checks.',
        'It must be covered by a submitted Wave2 work-unit row.',
        'Direct filesystem presence is not gate authority.',
        'Cache trails bind this reference to the submitted result.',
      ],
      core_content: 'Controlled Wave2 targeted evidence content. The file is intentionally present before submit in negative scenarios so the gate can prove direct cross references are not authoritative without work-unit ledger coverage.',
    }));
  }
}

function submitWave2TargetedFixture(bundleDir, {
  queueItemId = 'wave2-targeted-W2F-001',
  findingId = 'W2F-001',
  outputPath = 'reference/00-cross-market-shift.md',
  sourceUrl = 'https://research-source.test/wave2/market-shift',
} = {}) {
  enqueueWorkUnitTask(bundleDir, queueItemForWorkUnit({
    phase: 'wave2',
    queue_item_id: queueItemId,
    finding_id: findingId,
    title: `Wave2 targeted evidence for ${findingId}`,
    priority_class: 'P1_state_or_gate_repair',
  }), { fileName: `${queueItemId}.json` });
  const claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave2' });
  const workId = claim.claimed_work_ids[0];
  const fixture = writeFixtureResultForWorkUnit(bundleDir, {
    work_id: workId,
    output_path: outputPath,
    source_url: sourceUrl,
    source_slug: 'market-shift',
    output_content: referenceContent({
      source_url: sourceUrl,
      topic_slug: 'cross-topic',
      title: 'Wave2 Targeted Cross Reference',
      key_facts: [
        'Submitted targeted evidence compares the two Wave1 topics directly.',
        'The work-unit result declares the cross-reference output path.',
        'The runtime receipt binds work_id, queue_item_id, kind, and nonce.',
        'The cache trail contains meta, page, and search files.',
        'The Wave2 gate can cross-check ledger, index, manifest, result, receipt, and cache.',
      ],
      core_content: 'Controlled Wave2 targeted evidence content submitted through operate-work-unit. This proves Engine provenance, not real search quality.',
    }),
    cache_trails: ['_cache/wave2/primary/W2F-001/market-shift'],
  });
  const submit = submitWorkUnitViaCli(bundleDir, { work_id: workId, resultPath: fixture.resultPath });
  return { claim, ...fixture, submit };
}

function completeWave2PureQueue(bundleDir, topics) {
  enqueueViaQueueCli(bundleDir, wave2SynthesisTask(), 'case231-wave2-synthesis.json');
  for (const topic of topics) enqueueViaQueueCli(bundleDir, wave2BackfillTask(topic), `case231-backfill-${topic.slug}.json`);

  const synthesisClaim = runNodeLoose([OPERATE_QUEUE, 'claim', bundleDir, '--actor', 'main-agent']);
  writeWave2Artifacts(bundleDir, { topics });
  const synthesisComplete = completeQueueItem(bundleDir, 'wave2-synthesis', 'case231-wave2-synthesis-result', {
    receipt: 'file:artifacts/wave2/synthesis.md',
  });
  const backfills = [];
  for (const topic of topics) {
    const claim = runNodeLoose([OPERATE_QUEUE, 'claim', bundleDir, '--actor', 'main-agent']);
    const complete = completeQueueItem(bundleDir, `wave2-backfill-${topic.slug}`, `case231-backfill-${topic.slug}-result`, {
      receipt: `file:seed_topics/${topic.slug}.md`,
    });
    backfills.push({ topic: topic.slug, claim, complete });
  }
  return { synthesisClaim, synthesisComplete, backfills };
}

function case151(opts) {
  const bundleDir = newBundle('case-151', 'waves_full_chain', opts);
  const topics = [{ id: 't1', slug: 'topic-a', title: 'Topic A' }];
  writeFullChainSetupScaffold(bundleDir, topics);

  const setupGate = runSetupGate(bundleDir, 'case-151-gate-setup.json');
  enterPhaseAndAdvance(bundleDir, 'phases/phase-seed-topics.md', 'setup_ready', 'case-151-seed');
  for (const topic of topics) writeSeedTopic(bundleDir, topic);
  const seedGate = runSeedGate(bundleDir, 'case-151-gate-seed.json');
  enterPhaseAndAdvance(bundleDir, 'phases/phase-wave0.md', 'seed_topics_ready', 'case-151-wave0');

  enqueueWorkUnitTask(bundleDir, queueItemForWorkUnit({
    phase: 'wave0',
    queue_item_id: 'wave0-source-topic-a',
    topic_slug: 'topic-a',
    title: 'Wave0 source intake for Topic A',
  }), { fileName: 'case151-wave0-topic-a.json' });
  const wave0Claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave0' });
  const wave0Submit = submitClaimedWave0Fixture(bundleDir, {
    workId: wave0Claim.claimed_work_ids[0],
    topicSlug: 'topic-a',
    refPath: 'reference/00-shared-topic-a.md',
    sourceUrl: 'https://research-source.test/topic-a/full-chain/wave0',
    sourceSlug: 'topic-a-wave0',
    title: 'Topic A Wave0 Source',
  });
  writeFileSync(path.join(bundleDir, 'reference/_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    '| 00-shared-topic-a.md | secondary | practitioner | Tier 2 | topic-a | wave0_foundation | accepted | 2026-07-06 |',
    '| 01-topic-a-deepening.md | secondary | practitioner | Tier 2 | topic-a | wave1_topic | accepted | 2026-07-06 |',
    '',
  ].join('\n'));
  appendTrace(bundleDir, { event: 'wave0_completion', source: 'case-151-after-drain' });
  const wave0Drain = claimDrainProbe(bundleDir, 'wave0', 'case-151-wave0-drain.json');
  const wave0Gate = wave0Drain.json.phase_drained === true
    ? runWave0Gate(bundleDir, 'case-151-gate-wave0.json')
    : { status: 99, json: null };
  if (wave0Gate.json?.check?.passed === true) {
    enterPhaseAndAdvance(bundleDir, 'phases/phase-wave1.md', 'wave0_complete', 'case-151-wave1');
  }

  enqueueWorkUnitTask(bundleDir, queueItemForWorkUnit({
    phase: 'wave1',
    queue_item_id: 'wave1-deepen-topic-a',
    topic_slug: 'topic-a',
    title: 'Wave1 deepening for Topic A',
  }), { fileName: 'case151-wave1-topic-a.json' });
  const wave1Claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave1' });
  const wave1Submit = submitClaimedWave1Fixture(bundleDir, {
    workId: wave1Claim.claimed_work_ids[0],
    topicSlug: 'topic-a',
    topicId: 't1',
    title: 'Topic A',
    sourceUrl: 'https://research-source.test/topic-a/full-chain/wave1',
    sourceSlug: 'topic-a-wave1',
  });
  appendTrace(bundleDir, { event: 'wave1_completion', source: 'case-151-after-drain' });
  const wave1Drain = claimDrainProbe(bundleDir, 'wave1', 'case-151-wave1-drain.json');
  const wave1Gate = wave1Drain.json.phase_drained === true
    ? runWave1Gate(bundleDir, 'case-151-gate-wave1.json')
    : { status: 99, json: null };
  if (wave1Gate.json?.check?.passed === true) {
    enterPhaseAndAdvance(bundleDir, 'phases/phase-wave2.md', 'wave1_complete', 'case-151-wave2');
  }

  completeWave2PureQueue(bundleDir, topics);
  appendTrace(bundleDir, { event: 'wave2_completion', source: 'case-151-pure-synthesis' });
  const wave2Drain = claimDrainProbe(bundleDir, 'wave2', 'case-151-wave2-drain.json');
  const wave2Gate = wave2Drain.json.phase_drained === true
    ? runWave2Gate(bundleDir, 'case-151-gate-wave2.json')
    : { status: 99, json: null };
  const rows = readWorkUnitLedgerRows(bundleDir);
  const gateAttempts = readTrace(bundleDir).filter((event) => event.event === 'gate_attempt');

  const checks = [
    { label: 'setup-gate-pass', passed: setupGate.status === 0 && setupGate.json?.check?.passed === true, detail: JSON.stringify(setupGate.json?.inspect || []) },
    { label: 'seed-gate-pass', passed: seedGate.status === 0 && seedGate.json?.check?.passed === true, detail: JSON.stringify(seedGate.json?.inspect || []) },
    { label: 'wave0-submit', passed: wave0Submit.submit.ok === true, detail: wave0Submit.record.work_id },
    { label: 'wave0-drained-before-gate', passed: wave0Drain.status === 1 && wave0Drain.json?.phase_drained === true, detail: JSON.stringify(wave0Drain.json) },
    { label: 'wave0-gate-pass', passed: wave0Gate.status === 0 && wave0Gate.json?.check?.passed === true, detail: JSON.stringify(wave0Gate.json?.inspect || []) },
    { label: 'wave1-submit', passed: wave1Submit.submit.ok === true, detail: wave1Submit.record.work_id },
    { label: 'wave1-drained-before-gate', passed: wave1Drain.status === 1 && wave1Drain.json?.phase_drained === true, detail: JSON.stringify(wave1Drain.json) },
    { label: 'wave1-gate-pass', passed: wave1Gate.status === 0 && wave1Gate.json?.check?.passed === true, detail: JSON.stringify(wave1Gate.json?.inspect || []) },
    { label: 'wave2-pure-no-ledger-required', passed: rows.filter((row) => row.wave === 2).length === 0, detail: `${rows.length} total row(s)` },
    { label: 'wave2-drained-before-gate', passed: wave2Drain.status === 1 && wave2Drain.json?.phase_drained === true, detail: JSON.stringify(wave2Drain.json) },
    { label: 'wave2-gate-pass', passed: wave2Gate.status === 0 && wave2Gate.json?.check?.passed === true, detail: JSON.stringify(wave2Gate.json?.inspect || []) },
    {
      label: 'ordered-gate-attempts',
      passed: ['setup-ready', 'seed-topics-ready', 'wave0-complete', 'wave1-complete', 'wave2-complete']
        .every((gate) => gateAttempts.some((event) => event.gate === gate && event.passed === true)),
      detail: gateAttempts.map((event) => `${event.gate}:${event.passed}`).join(', '),
    },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-151', 'waves-full-chain', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-151', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function case152(opts) {
  const bundleDir = newBundle('case-152', 'wave_repair_loop', opts);
  const topics = [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' },
  ];
  writeWave2Scaffold(bundleDir, { planBasename: 'wave_repair_loop', topics });
  writeWave2Artifacts(bundleDir, { topics, searchRequired: true, directCrossRef: true });
  appendTrace(bundleDir, { event: 'wave2_completion', source: 'case-152-before-repair' });
  const beforeDrain = claimDrainProbe(bundleDir, 'wave2', 'case-152-wave2-drain-before-gate.json');
  const failGate = beforeDrain.json.phase_drained === true
    ? runWave2Gate(bundleDir, 'case-152-gate-before-repair.json')
    : { status: 99, json: null };
  const opened = openWorkUnitBatchViaCli(bundleDir, { phase: 'wave2', reason: 'gate_failure_refill' });
  const submitted = submitWave2TargetedFixture(bundleDir);
  writeWave2Artifacts(bundleDir, {
    topics,
    searchRequired: true,
    directCrossRef: true,
    receiptRefs: [submitted.record.paths.runtime_receipt_ref],
  });
  const afterDrain = claimDrainProbe(bundleDir, 'wave2', 'case-152-wave2-drain-after-repair.json');
  const passGate = afterDrain.json.phase_drained === true
    ? runWave2Gate(bundleDir, 'case-152-gate-after-repair.json')
    : { status: 99, json: null };
  const repairRecord = loadWorkUnitIndex(bundleDir).work_units[submitted.record.work_id];
  const gateAttempts = readTrace(bundleDir).filter((event) => event.event === 'gate_attempt' && event.gate === 'wave2-complete');

  const checks = [
    { label: 'drained-before-initial-gate', passed: beforeDrain.status === 1 && beforeDrain.json?.phase_drained === true, detail: JSON.stringify(beforeDrain.json) },
    {
      label: 'initial-gate-fails',
      passed: failGate.status === 1 && failGate.json?.check?.passed === false && /work-unit|coverage|bypass/i.test(JSON.stringify(failGate.json?.inspect || [])),
      detail: JSON.stringify(failGate.json?.inspect || []),
    },
    { label: 'repair-batch-opened', passed: opened.ok === true && opened.batch_id === 'b001' && opened.batch_reason === 'gate_failure_refill', detail: `${opened.batch_id}:${opened.batch_reason}` },
    { label: 'repair-claim-uses-refill-batch', passed: repairRecord?.batch_id === 'b001' && submitted.record.work_id.includes('-b001-'), detail: submitted.record.work_id },
    { label: 'repair-submit', passed: submitted.submit.ok === true, detail: submitted.record.work_id },
    { label: 'drained-after-repair-before-gate', passed: afterDrain.status === 1 && afterDrain.json?.phase_drained === true, detail: JSON.stringify(afterDrain.json) },
    { label: 'repaired-gate-passes', passed: passGate.status === 0 && passGate.json?.check?.passed === true, detail: JSON.stringify(passGate.json?.inspect || []) },
    {
      label: 'gate-attempts-fail-then-pass',
      passed: gateAttempts.some((event) => event.passed === false) && gateAttempts.some((event) => event.passed === true),
      detail: `${gateAttempts.length} gate_attempt event(s)`,
    },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-152', 'wave-repair-loop', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-152', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function claimedWave0Fixture(bundleDir, {
  queueItemId,
  topicSlug = 'topic-a',
  sourceSlug = topicSlug,
  outputPath = `reference/${queueItemId}.md`,
  title = `${queueItemId} Fixture Source`,
} = {}) {
  enqueueWorkUnitTask(bundleDir, queueItemForWorkUnit({
    phase: 'wave0',
    queue_item_id: queueItemId,
    topic_slug: topicSlug,
    title,
  }), { fileName: `${queueItemId}.json` });
  const claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave0' });
  const workId = claim.claimed_work_ids[0];
  const sourceUrl = `https://research-source.test/${queueItemId}/article`;
  const fixture = writeFixtureResultForWorkUnit(bundleDir, {
    work_id: workId,
    output_path: outputPath,
    source_url: sourceUrl,
    source_slug: sourceSlug,
    output_content: referenceContent({
      source_url: sourceUrl,
      topic_slug: topicSlug,
      title,
    }),
    extra_output_files: [
      sourceYamlExtra(topicSlug, sourceUrl, title),
    ],
  });
  return { claim, workId, ...fixture };
}

function case153(opts) {
  const invalidBundle = newBundle('case-153', 'wft_invalid_submit', opts);
  writeWave0Scaffold(invalidBundle, { planBasename: 'wft_invalid_submit' });
  const invalidCases = [
    prepareRejectedSubmit(invalidBundle, 'missing-receipt', ({ record }) => {
      rmSync(path.join(invalidBundle, record.paths.runtime_receipt_ref), { force: true });
    }, { prefix: 'case153-invalid' }),
    prepareRejectedSubmit(invalidBundle, 'invalid-result', ({ resultPath }) => {
      const result = JSON.parse(readFileSync(resultPath, 'utf-8'));
      delete result.kind;
      writeJson(resultPath, result);
    }, { prefix: 'case153-invalid' }),
  ];
  const invalidRows = readWorkUnitLedgerRows(invalidBundle);

  const failBundle = newBundle('case-153', 'wft_fail_late', opts);
  writeWave0Scaffold(failBundle, { planBasename: 'wft_fail_late' });
  const failFixture = claimedWave0Fixture(failBundle, { queueItemId: 'case153-fail-late' });
  const failed = closeWorkUnitViaCli(failBundle, { command: 'fail', work_id: failFixture.workId, reason: 'sub-agent-error' });
  const lateSubmit = runNodeLoose([OPERATE_WORK_UNIT, 'submit', failBundle, '--work-id', failFixture.workId, '--result', failFixture.resultPath]);
  const failTrace = readFileSync(path.join(failBundle, 'rb_trace.jsonl'), 'utf-8');

  const timeoutBundle = newBundle('case-153', 'wft_timeout_retry', opts);
  writeWave0Scaffold(timeoutBundle, { planBasename: 'wft_timeout_retry' });
  const timeoutFixture = claimedWave0Fixture(timeoutBundle, { queueItemId: 'case153-timeout-retry' });
  const timedOut = closeWorkUnitViaCli(timeoutBundle, { command: 'timeout', work_id: timeoutFixture.workId, reason: 'deadline-expired' });
  const retryClaim = claimWorkUnitsViaCli(timeoutBundle, { phase: 'wave0' });
  const retryWorkId = retryClaim.claimed_work_ids[0];
  const retryRecord = loadWorkUnitIndex(timeoutBundle).work_units[retryWorkId];

  const abandonBundle = newBundle('case-153', 'wft_abandon', opts);
  writeWave0Scaffold(abandonBundle, { planBasename: 'wft_abandon' });
  const abandonFixture = claimedWave0Fixture(abandonBundle, { queueItemId: 'case153-abandon' });
  const abandoned = closeWorkUnitViaCli(abandonBundle, { command: 'abandon', work_id: abandonFixture.workId, reason: 'operator-cancelled' });
  const abandonDuplicate = closeWorkUnitViaCli(abandonBundle, { command: 'abandon', work_id: abandonFixture.workId, reason: 'operator-cancelled' });
  const abandonMismatch = runNodeLoose([OPERATE_WORK_UNIT, 'fail', abandonBundle, '--work-id', abandonFixture.workId, '--reason', 'operator-cancelled']);

  const duplicateBundle = newBundle('case-153', 'wft_duplicate_submit', opts);
  writeWave0Scaffold(duplicateBundle, { planBasename: 'wft_duplicate_submit' });
  const duplicateFixture = claimedWave0Fixture(duplicateBundle, { queueItemId: 'case153-duplicate' });
  const firstSubmit = submitWorkUnitViaCli(duplicateBundle, { work_id: duplicateFixture.workId, resultPath: duplicateFixture.resultPath });
  const duplicateSubmit = submitWorkUnitViaCli(duplicateBundle, { work_id: duplicateFixture.workId, resultPath: duplicateFixture.resultPath });
  const changedResult = JSON.parse(readFileSync(duplicateFixture.resultPath, 'utf-8'));
  changedResult.summary = 'changed duplicate content';
  writeJson(duplicateFixture.resultPath, changedResult);
  const duplicateMismatch = runNodeLoose([OPERATE_WORK_UNIT, 'submit', duplicateBundle, '--work-id', duplicateFixture.workId, '--result', duplicateFixture.resultPath]);
  const duplicateRows = readWorkUnitLedgerRows(duplicateBundle);

  const staleBundle = newBundle('case-153', 'wft_stale_binding', opts);
  writeWave0Scaffold(staleBundle, { planBasename: 'wft_stale_binding' });
  const staleFixture = claimedWave0Fixture(staleBundle, { queueItemId: 'case153-stale' });
  const staleManifestPath = path.join(staleBundle, staleFixture.record.paths.manifest_ref);
  const staleManifest = JSON.parse(readFileSync(staleManifestPath, 'utf-8'));
  staleManifest.queue_item.title = 'Changed after claim';
  writeJson(staleManifestPath, staleManifest);
  const staleSubmit = runNodeLoose([OPERATE_WORK_UNIT, 'submit', staleBundle, '--work-id', staleFixture.workId, '--result', staleFixture.resultPath]);
  const staleRows = readWorkUnitLedgerRows(staleBundle);

  const mixedBundle = newBundle('case-153', 'wft_mixed_provenance', opts);
  const mixedTopics = [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 'to', slug: 'topic-orphan', title: 'Topic Orphan' },
  ];
  writeWave1Scaffold(mixedBundle, { planBasename: 'wft_mixed_provenance', topics: mixedTopics });
  enqueueWorkUnitTask(mixedBundle, queueItemForWorkUnit({
    phase: 'wave1',
    queue_item_id: 'wave1-deepen-topic-a',
    topic_slug: 'topic-a',
    title: 'Wave1 submitted topic A',
  }), { fileName: 'case153-topic-a.json' });
  const mixedClaim = claimWorkUnitsViaCli(mixedBundle, { phase: 'wave1' });
  const mixedSubmit = submitClaimedWave1Fixture(mixedBundle, {
    workId: mixedClaim.claimed_work_ids[0],
    topicSlug: 'topic-a',
    topicId: 't1',
    title: 'Topic A',
  });
  writeWave1TopicArtifacts(mixedBundle, {
    id: 'to',
    topic_slug: 'topic-orphan',
    title: 'Topic Orphan',
    source_url: 'https://research-source.test/topic-orphan/direct',
  });
  writeFileSync(path.join(mixedBundle, 'reference/01-topic-orphan-direct.md'), referenceContent({
    source_url: 'https://research-source.test/topic-orphan/direct',
    topic_slug: 'topic-orphan',
    title: 'Direct Topic Orphan Reference',
  }));
  appendTrace(mixedBundle, { event: 'wave1_completion', source: 'case-153-mixed-provenance' });
  const mixedGate = runWave1Gate(mixedBundle, 'case-153-gate-mixed-provenance.json');

  const checks = [
    {
      label: 'invalid-submit-rejected',
      passed: invalidCases.every(({ result }) => result.status === 1 && ['missing_receipt', 'invalid_result'].includes(result.json?.last_submit_rejection?.reason_code)) && invalidRows.length === 0,
      detail: JSON.stringify(invalidCases.map(({ label, result }) => ({ label, reason: result.json?.last_submit_rejection?.reason_code }))),
    },
    {
      label: 'fail-closes-and-late-submit-rejected',
      passed: failed.ok === true && failed.status === 'failed' && lateSubmit.status === 1 && lateSubmit.json?.status === 'failed' && /work_unit_late_submit_rejected/.test(failTrace),
      detail: JSON.stringify({ failed, late: lateSubmit.json }),
    },
    {
      label: 'timeout-retry-new-work-id',
      passed: timedOut.ok === true && timedOut.retry_requeued === true && retryWorkId !== timeoutFixture.workId && retryRecord?.attempt_index === 2 && retryRecord?.batch_id === 'b000',
      detail: `${timeoutFixture.workId} -> ${retryWorkId}`,
    },
    {
      label: 'abandon-idempotent-and-mismatch-rejected',
      passed: abandoned.ok === true && abandoned.status === 'abandoned' && abandoned.retry_requeued === false && abandonDuplicate.duplicate === true && abandonMismatch.status === 1 && abandonMismatch.json?.ok === false,
      detail: JSON.stringify({ abandoned, duplicate: abandonDuplicate, mismatch: abandonMismatch.json }),
    },
    {
      label: 'duplicate-submit-idempotent-and-mismatch-rejected',
      passed: firstSubmit.ok === true && duplicateSubmit.duplicate === true && duplicateMismatch.status === 1 && duplicateMismatch.json?.reason_code === 'duplicate_content_mismatch' && duplicateRows.length === 1,
      detail: JSON.stringify({ duplicate: duplicateSubmit, mismatch: duplicateMismatch.json, rows: duplicateRows.length }),
    },
    {
      label: 'stale-binding-rejected-nonterminal',
      passed: staleSubmit.status === 1 && staleSubmit.json?.last_submit_rejection?.reason_code === 'stale_snapshot' && staleRows.length === 0,
      detail: JSON.stringify(staleSubmit.json?.last_submit_rejection || {}),
    },
    {
      label: 'mixed-provenance-no-pass',
      passed: mixedSubmit.submit.ok === true && mixedGate.status === 1 && mixedGate.json?.check?.passed === false && /coverage|bypass|topic-orphan/i.test(JSON.stringify(mixedGate.json.inspect || [])),
      detail: JSON.stringify(mixedGate.json?.inspect || []),
    },
  ];

  for (const check of checks) recordCheck(invalidBundle, 'case-153', 'wave-fault-tolerance', check.passed, check.detail, { label: check.label });
  const bundles = [invalidBundle, failBundle, timeoutBundle, abandonBundle, duplicateBundle, staleBundle, mixedBundle];
  const verdict = writeVerdict(invalidBundle, 'case-153', checks, { extra: { bundle: invalidBundle, bundles } });
  if (opts.cleanupPass && verdict.ok) {
    for (const bundle of bundles) rmSync(bundle, { recursive: true, force: true });
  }
  return { bundleDir: invalidBundle, verdict };
}

function case231(opts) {
  const bundleDir = newBundle('case-231', 'w2_pure_synthesis', opts);
  const topics = [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' },
  ];
  writeWave2Scaffold(bundleDir, { planBasename: 'w2_pure_synthesis', topics, staleWave2Backfill: true });
  const queueRun = completeWave2PureQueue(bundleDir, topics);
  appendTrace(bundleDir, { event: 'wave2_completion', source: 'case-231-pure-synthesis' });
  const gate = runWave2Gate(bundleDir, 'gate-pure-synthesis.json');
  const rows = readWorkUnitLedgerRows(bundleDir);

  const checks = [
    { label: 'non-delegated-synthesis-claim', passed: queueRun.synthesisClaim.status === 0, detail: queueRun.synthesisClaim.stdout },
    { label: 'non-delegated-synthesis-complete', passed: queueRun.synthesisComplete.status === 0, detail: queueRun.synthesisComplete.stdout },
    { label: 'backfill-complete', passed: queueRun.backfills.every((entry) => entry.complete.status === 0), detail: JSON.stringify(queueRun.backfills.map((entry) => entry.topic)) },
    { label: 'no-wave2-work-unit-rows', passed: rows.filter((row) => row.wave === 2).length === 0, detail: `${rows.length} total row(s)` },
    { label: 'wave2-gate-pure-pass', passed: gate.status === 0 && gate.json?.check?.passed === true, detail: JSON.stringify(gate.json.inspect || []) },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-231', 'wave2-pure-synthesis', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-231', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function case232(opts) {
  const bundleDir = newBundle('case-232', 'w2_real_finding_triage', opts);
  writeWave2Scaffold(bundleDir, { planBasename: 'w2_real_finding_triage' });
  const reason = {
    case: 'case-232',
    status: 'NOT_RUN',
    unavailable_surface: 'No real Phase Agent Wave2 finding-triage artifact set was provided. This case requires real Agent classification of resolution, record_only, and delegated-search findings.',
    rerun_condition: 'Run the Wave2 Phase Agent from the playbook, then rerun gate/check steps against its artifacts.',
  };
  writeJson(path.join(bundleDir, 'case-232-not-run.json'), reason);
  recordCheck(bundleDir, 'case-232', 'wave2-real-finding-triage', false, reason.unavailable_surface, { outcome: 'not_run' });
  const verdict = writeVerdict(bundleDir, 'case-232', [], { status: 'NOT_RUN', extra: { bundle: bundleDir, reason } });
  return { bundleDir, verdict, exitCode: 2 };
}

function case233(opts) {
  const bundleDir = newBundle('case-233', 'w2_gate_refill_repair', opts);
  const topics = [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' },
  ];
  writeWave2Scaffold(bundleDir, { planBasename: 'w2_gate_refill_repair', topics });
  writeWave2Artifacts(bundleDir, { topics, searchRequired: true, directCrossRef: true });
  appendTrace(bundleDir, { event: 'wave2_completion', source: 'case-233-before-repair' });
  const failGate = runWave2Gate(bundleDir, 'gate-before-repair.json');
  const opened = openWorkUnitBatchViaCli(bundleDir, { phase: 'wave2', reason: 'gate_failure_refill' });
  const submitted = submitWave2TargetedFixture(bundleDir);
  writeWave2Artifacts(bundleDir, {
    topics,
    searchRequired: true,
    directCrossRef: true,
    receiptRefs: [submitted.record.paths.runtime_receipt_ref],
  });
  const passGate = runWave2Gate(bundleDir, 'gate-after-repair.json');
  const repairRecord = loadWorkUnitIndex(bundleDir).work_units[submitted.record.work_id];
  const gateAttempts = readTrace(bundleDir).filter((event) => event.event === 'gate_attempt' && event.gate === 'wave2-complete');

  const checks = [
    {
      label: 'initial-gate-fails',
      passed: failGate.status === 1 && failGate.json?.check?.passed === false && /work-unit|coverage|bypass/i.test(JSON.stringify(failGate.json.inspect || [])),
      detail: JSON.stringify(failGate.json.inspect || []),
    },
    { label: 'repair-batch-opened', passed: opened.ok === true && opened.batch_id === 'b001', detail: `${opened.batch_id}:${opened.batch_reason}` },
    { label: 'repair-claim-uses-refill-batch', passed: repairRecord?.batch_id === 'b001' && submitted.record.work_id.includes('-b001-'), detail: submitted.record.work_id },
    { label: 'repair-submit', passed: submitted.submit.ok === true, detail: submitted.record.work_id },
    { label: 'repaired-gate-passes', passed: passGate.status === 0 && passGate.json?.check?.passed === true, detail: JSON.stringify(passGate.json.inspect || []) },
    {
      label: 'gate-attempts-fail-then-pass',
      passed: gateAttempts.some((event) => event.passed === false) && gateAttempts.some((event) => event.passed === true),
      detail: `${gateAttempts.length} gate_attempt event(s)`,
    },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-233', 'wave2-gate-refill-repair', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-233', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function case234(opts) {
  const bundleDir = newBundle('case-234', 'w2_real_targeted_search', opts);
  writeWave2Scaffold(bundleDir, { planBasename: 'w2_real_targeted_search' });
  writeWave2Artifacts(bundleDir, { searchRequired: true });
  enqueueWorkUnitTask(bundleDir, queueItemForWorkUnit({
    phase: 'wave2',
    queue_item_id: 'wave2-targeted-W2F-001',
    finding_id: 'W2F-001',
    title: 'Real Wave2 targeted evidence search',
    priority_class: 'P1_state_or_gate_repair',
  }), { fileName: 'case234-real-targeted-search.json' });
  const claim = claimWorkUnitsViaCli(bundleDir, { phase: 'wave2' });
  const workId = claim.claimed_work_ids[0];
  writeJson(path.join(bundleDir, 'case-234-claim.json'), claim);

  if (!opts.realResult) {
    const reason = {
      case: 'case-234',
      status: 'NOT_RUN',
      work_id: workId,
      unavailable_surface: 'No --real-result was provided. This heavy Wave2 case requires a real dpt-topic-scout result for targeted evidence search.',
      rerun_condition: 'Run the real sub-agent from the generated work-unit task, then pass its result JSON with --real-result.',
    };
    writeJson(path.join(bundleDir, 'case-234-not-run.json'), reason);
    recordCheck(bundleDir, 'case-234', 'wave2-real-targeted-search', false, reason.unavailable_surface, { outcome: 'not_run', work_id: workId });
    const verdict = writeVerdict(bundleDir, 'case-234', [], { status: 'NOT_RUN', extra: { bundle: bundleDir, reason } });
    return { bundleDir, verdict, exitCode: 2 };
  }

  const submit = submitWorkUnitViaCli(bundleDir, { work_id: workId, resultPath: path.resolve(opts.realResult) });
  appendTrace(bundleDir, { event: 'wave2_completion', source: 'case-234-real-agent' });
  const gate = runWave2Gate(bundleDir);
  const checks = [
    { label: 'real-submit', passed: submit.ok === true, detail: workId },
    { label: 'wave2-gate', passed: gate.status === 0 && gate.json?.check?.passed === true, detail: JSON.stringify(gate.json.inspect || []) },
  ];
  for (const check of checks) recordCheck(bundleDir, 'case-234', 'wave2-real-targeted-search', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(bundleDir, 'case-234', checks, { extra: { bundle: bundleDir } });
  maybeCleanup(bundleDir, opts, verdict);
  return { bundleDir, verdict };
}

function case235(opts) {
  const pureBundleDir = newBundle('case-235', 'w2_pure_gate_pass', opts);
  writeWave2Scaffold(pureBundleDir, { planBasename: 'w2_pure_gate_pass' });
  writeWave2Artifacts(pureBundleDir);
  appendTrace(pureBundleDir, { event: 'wave2_completion', source: 'case-235-pure' });
  const pureGate = runWave2Gate(pureBundleDir, 'gate-pure.json');

  const directBundleDir = newBundle('case-235', 'w2_direct_cross_ref', opts);
  writeWave2Scaffold(directBundleDir, { planBasename: 'w2_direct_cross_ref' });
  writeWave2Artifacts(directBundleDir, { searchRequired: true, directCrossRef: true });
  appendTrace(directBundleDir, { event: 'wave2_completion', source: 'case-235-direct' });
  const directGate = runWave2Gate(directBundleDir, 'gate-direct.json');

  const submittedBundleDir = newBundle('case-235', 'w2_submitted_cross_ref', opts);
  writeWave2Scaffold(submittedBundleDir, { planBasename: 'w2_submitted_cross_ref' });
  writeWave2Artifacts(submittedBundleDir, { searchRequired: true });
  const submitted = submitWave2TargetedFixture(submittedBundleDir);
  writeWave2Artifacts(submittedBundleDir, {
    searchRequired: true,
    directCrossRef: true,
    receiptRefs: [submitted.record.paths.runtime_receipt_ref],
  });
  appendTrace(submittedBundleDir, { event: 'wave2_completion', source: 'case-235-submitted' });
  const submittedGate = runWave2Gate(submittedBundleDir, 'gate-submitted.json');
  const submittedRows = readWorkUnitLedgerRows(submittedBundleDir).filter((row) => row.wave === 2);

  const checks = [
    {
      label: 'pure-synthesis-gate-passes-without-ledger',
      passed: pureGate.status === 0 && pureGate.json?.check?.passed === true && readWorkUnitLedgerRows(pureBundleDir).filter((row) => row.wave === 2).length === 0,
      detail: JSON.stringify(pureGate.json.inspect || []),
    },
    {
      label: 'direct-cross-ref-gate-fails',
      passed: directGate.status === 1 && directGate.json?.check?.passed === false && /work-unit|coverage|bypass/i.test(JSON.stringify(directGate.json.inspect || [])),
      detail: JSON.stringify(directGate.json.inspect || []),
    },
    {
      label: 'submitted-cross-ref-gate-passes',
      passed: submitted.submit.ok === true && submittedRows.length === 1 && submittedGate.status === 0 && submittedGate.json?.check?.passed === true,
      detail: JSON.stringify({ work_id: submitted.record.work_id, inspect: submittedGate.json.inspect || [] }),
    },
  ];
  for (const check of checks) recordCheck(pureBundleDir, 'case-235', 'wave2-happy-and-fail', check.passed, check.detail, { label: check.label });
  const verdict = writeVerdict(pureBundleDir, 'case-235', checks, {
    extra: { bundle: pureBundleDir, direct_bundle: directBundleDir, submitted_bundle: submittedBundleDir },
  });
  maybeCleanup(pureBundleDir, opts, verdict);
  if (opts.cleanupPass && verdict.ok) {
    rmSync(directBundleDir, { recursive: true, force: true });
    rmSync(submittedBundleDir, { recursive: true, force: true });
  }
  return { bundleDir: pureBundleDir, verdict };
}

const runners = {
  'case-151': case151,
  'case-152': case152,
  'case-153': case153,
  'case-161': case161,
  'case-162': case162,
  'case-163': case163,
  'case-211': case211,
  'case-212': case212,
  'case-213': case213,
  'case-221': case221,
  'case-222': case222,
  'case-223': case223,
  'case-224': case224,
  'case-231': case231,
  'case-232': case232,
  'case-233': case233,
  'case-234': case234,
  'case-235': case235,
  'case-401': case401,
  'case-402': case402,
  'case-403': case403,
  'case-404': case404,
  'case-405': case405,
  'case-406': case406,
};

try {
  const opts = parseArgs(process.argv.slice(2));
  const runner = runners[opts.caseId];
  if (!runner) throw new Error(`Unsupported case for this runner: ${opts.caseId}`);
  const result = runner(opts);
  console.log(JSON.stringify({
    case: opts.caseId,
    bundle: result.bundleDir,
    verdict: result.verdict.status,
    verdict_file: path.join(result.bundleDir, `${opts.caseId}-verdict.json`),
  }, null, 2));
  process.exit(result.exitCode || (result.verdict.ok ? 0 : 1));
} catch (error) {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
}
