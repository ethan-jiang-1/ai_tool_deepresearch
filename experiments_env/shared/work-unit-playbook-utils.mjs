// Helpers for controlled work-unit playbooks.
//
// These utilities create fixture-backed work-unit inputs, but every delegated
// state transition goes through the production CLIs.

import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  WORK_UNIT_OUTPUT_LEDGER,
  loadWorkUnitIndex,
  workUnitIndexPath,
} from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..', '..');
const NODE = process.execPath;
const OPERATE_QUEUE = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/operate-queue.mjs');
const OPERATE_WORK_UNIT = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/operate-work-unit.mjs');

export function runJsonCli(args, { expectStatus = 0 } = {}) {
  const result = spawnSync(NODE, args, { cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== expectStatus) {
    throw new Error(`CLI status ${result.status}, expected ${expectStatus}: node ${args.join(' ')}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  }
  return result.stdout.trim() ? JSON.parse(result.stdout) : null;
}

export function writeMinimalPlan(bundleDir, {
  planBasename = path.basename(bundleDir),
  topics = [{ id: 't1', slug: 'topic-a', title: 'Topic A' }],
} = {}) {
  const canonicalTopics = topics.map((topic, index) => ({
    topic_uid: topic.topic_uid || `tp_${String(index + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    must_answer: topic.must_answer || [`What must be established for ${topic.title}?`],
    scope_role: topic.scope_role || 'primary',
    depends_on_topic_uids: topic.depends_on_topic_uids || [],
  }));
  const topicLines = canonicalTopics.map((topic) => `    ${JSON.stringify(topic)}`).join(',\n');
  writeFileSync(path.join(bundleDir, 'rb_plan.md'), [
    '---',
    '{',
    `  "plan_basename": "${planBasename}",`,
    '  "topic_registry_version": "2",',
    `  "derived_topic_count": ${canonicalTopics.length},`,
    '  "topic_registry": [',
    topicLines,
    '  ]',
    '}',
    '---',
    `# ${planBasename} Plan`,
    '',
  ].join('\n'));
  mkdirSync(path.join(bundleDir, 'seed_topics'), { recursive: true });
  for (const topic of canonicalTopics) {
    writeFileSync(path.join(bundleDir, 'seed_topics', `${topic.slug}.md`), [
      '---',
      JSON.stringify(topic, null, 2),
      '---',
      `# ${topic.title}`,
      '',
    ].join('\n'));
  }
}

export function writeMinimalStatus(bundleDir, {
  current_gate = 'wave0_complete',
  next_gate = 'wave1_complete',
  current_node = null,
  state = 'in_progress',
} = {}) {
  writeFileSync(path.join(bundleDir, 'rb_status.json'), `${JSON.stringify({
    bundle: path.basename(bundleDir),
    current_gate,
    next_gate,
    current_node,
    current_mode: 'execution',
    state,
  }, null, 2)}\n`);
}

export function appendTrace(bundleDir, event) {
  appendFileSync(path.join(bundleDir, 'rb_trace.jsonl'), `${JSON.stringify({
    ts: new Date().toISOString(),
    ...event,
  })}\n`);
}

export function readTrace(bundleDir) {
  const tracePath = path.join(bundleDir, 'rb_trace.jsonl');
  if (!existsSync(tracePath)) return [];
  return readFileSync(tracePath, 'utf-8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

export function writeWave0Handoff(bundleDir) {
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

export function writeWave1Handoff(bundleDir) {
  const sourceTs = new Date().toISOString();
  const sourceAttemptIndex = readTrace(bundleDir).length;
  appendTrace(bundleDir, {
    ts: sourceTs,
    event: 'gate_attempt',
    gate: 'wave0-complete',
    phase: 'wave0',
    passed: true,
    currentNodeRef: 'phases/phase-wave0.md',
    next: 'phases/phase-wave1.md',
  });
  appendTrace(bundleDir, {
    event: 'load_complete',
    entry: 'phases/phase-wave1.md',
    handoff_source_gate: 'wave0-complete',
    handoff_source_node: 'phases/phase-wave0.md',
    handoff_target_node: 'phases/phase-wave1.md',
    handoff_source_attempt_index: sourceAttemptIndex,
    handoff_source_attempt_ts: sourceTs,
  });
}

export function writeWave2Handoff(bundleDir) {
  const sourceTs = new Date().toISOString();
  const sourceAttemptIndex = readTrace(bundleDir).length;
  appendTrace(bundleDir, {
    ts: sourceTs,
    event: 'gate_attempt',
    gate: 'wave1-complete',
    phase: 'wave1',
    passed: true,
    currentNodeRef: 'phases/phase-wave1.md',
    next: 'phases/phase-wave2.md',
  });
  appendTrace(bundleDir, {
    event: 'load_complete',
    entry: 'phases/phase-wave2.md',
    handoff_source_gate: 'wave1-complete',
    handoff_source_node: 'phases/phase-wave1.md',
    handoff_target_node: 'phases/phase-wave2.md',
    handoff_source_attempt_index: sourceAttemptIndex,
    handoff_source_attempt_ts: sourceTs,
  });
}

export function writeWave0Scaffold(bundleDir, {
  planBasename = path.basename(bundleDir),
  topics = [{ id: 't1', slug: 'topic-a', title: 'Topic A' }],
  referenceRows = ['| 00-shared-topic-a.md | secondary | practitioner | Tier 2 | all | wave0_foundation | accepted | 2026-07-06 |'],
} = {}) {
  writeMinimalStatus(bundleDir, { current_gate: 'seed_topics_ready', next_gate: 'wave0_complete', current_node: 'phases/phase-wave0.md' });
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

export function writeWave1Scaffold(bundleDir, {
  planBasename = path.basename(bundleDir),
  topics = [{ id: 't1', slug: 'topic-a', title: 'Topic A' }],
} = {}) {
  writeMinimalStatus(bundleDir, { current_gate: 'wave0_complete', next_gate: 'wave1_complete', current_node: 'phases/phase-wave1.md' });
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
  mkdirSync(path.join(bundleDir, 'seed_topics'), { recursive: true });
  mkdirSync(path.join(bundleDir, 'artifacts', 'wave1'), { recursive: true });
  for (const topic of topics) mkdirSync(path.join(bundleDir, 'artifacts', 'wave1', topic.slug), { recursive: true });
  writeFileSync(path.join(bundleDir, 'reference/README.md'), '# Reference Evidence\n');
  writeFileSync(path.join(bundleDir, 'reference/_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...topics.map((topic) => `| 01-${topic.slug}-deepening.md | secondary | practitioner | Tier 2 | ${topic.slug} | wave1_topic | accepted | 2026-07-06 |`),
    '',
  ].join('\n'));
  writeWave1Handoff(bundleDir);
}

export function writeWave2Scaffold(bundleDir, {
  planBasename = path.basename(bundleDir),
  topics = [
    { id: 't1', slug: 'topic-a', title: 'Topic A' },
    { id: 't2', slug: 'topic-b', title: 'Topic B' },
  ],
  staleWave2Backfill = false,
} = {}) {
  writeMinimalStatus(bundleDir, { current_gate: 'wave1_complete', next_gate: 'wave2_complete', current_node: 'phases/phase-wave2.md' });
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
  mkdirSync(path.join(bundleDir, 'seed_topics'), { recursive: true });
  mkdirSync(path.join(bundleDir, 'artifacts', 'wave2'), { recursive: true });
  writeFileSync(path.join(bundleDir, 'reference/README.md'), '# Reference Evidence\n');
  writeFileSync(path.join(bundleDir, 'reference/_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...topics.map((topic) => `| 01-${topic.slug}-deepening.md | secondary | practitioner | Tier 2 | ${topic.slug} | wave1_topic | accepted | 2026-07-06 |`),
    '',
  ].join('\n'));
  for (const topic of topics) {
    writeWave1TopicArtifacts(bundleDir, {
      id: topic.id,
      topic_slug: topic.slug,
      title: topic.title,
      source_url: `https://research-source.test/${topic.slug}/deepening/article`,
    });
    if (staleWave2Backfill) {
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
        '__BACKFILL_WAVE2_JUDGMENT__',
        '',
        '## Pending Questions',
        '__BACKFILL_PENDING_QUESTIONS__',
        '',
      ].join('\n'));
    }
  }
  writeWave2Handoff(bundleDir);
}

function kindForPhase(phase) {
  if (phase === 'wave0') return 'wave0_source_intake';
  if (phase === 'wave1') return 'wave1_topic_deepening';
  if (phase === 'wave2') return 'wave2_targeted_evidence';
  throw new Error(`Unsupported work-unit phase: ${phase}`);
}

function producerRuleForKind(kind) {
  if (kind === 'wave0_source_intake') return 'source_intake_fan_in';
  if (kind === 'wave1_topic_deepening') return 'topic_deepening';
  if (kind === 'wave2_targeted_evidence') return 'targeted_evidence_search';
  return 'delegated_work';
}

function roleForKind(kind) {
  if (kind === 'wave0_source_intake') return 'dpt-source-intake';
  if (kind === 'wave1_topic_deepening') return 'dpt-evidence-extractor';
  if (kind === 'wave2_targeted_evidence') return 'dpt-topic-scout';
  return 'dpt-source-intake';
}

export function queueItemForWorkUnit({
  phase = 'wave0',
  queue_item_id = `wave0-source-topic-a`,
  title = `Delegated ${queue_item_id}`,
  topic_slug = 'topic-a',
  finding_id,
  kind = kindForPhase(phase),
  producer_rule = producerRuleForKind(kind),
  role_key = roleForKind(kind),
  timeout_ms = 600000,
  priority_class = 'P5_new_reference_intake',
} = {}) {
  return {
    queue_item_id,
    title,
    targets: {
      controller: 'main-agent',
      delegates: { to: 'sub-agent', role_key, timeout_ms },
    },
    kind,
    producer_rule,
    priority_class,
    action: `Fixture-backed controlled work-unit task for ${queue_item_id}.`,
    writes_to: ['reference/work-unit-fixture.md'],
    status_sync: [],
    completion_receipt: 'none',
    failure_route: 'queue repair work',
    required_receipts: ['none'],
    done_condition: 'submit succeeds through operate-work-unit',
    verification: { engine: ['work_unit_submit'], agent: [] },
    payload: finding_id ? { finding_id, wave: Number(phase.replace('wave', '')) } : { topic_slug, wave: Number(phase.replace('wave', '')) },
    lineage: finding_id ? { finding_id, phase } : { topic_slug, phase },
  };
}

export function enqueueWorkUnitTask(bundleDir, task, { fileName = `${task.queue_item_id}.json` } = {}) {
  const tmpDir = path.join(bundleDir, '_tmp', 'playbook-tasks');
  mkdirSync(tmpDir, { recursive: true });
  const taskPath = path.join(tmpDir, fileName);
  writeFileSync(taskPath, `${JSON.stringify(task, null, 2)}\n`);
  return runJsonCli([OPERATE_QUEUE, 'enqueue', bundleDir, '--task', taskPath]);
}

export function claimWorkUnitsViaCli(bundleDir, { phase = 'wave0', count = 1 } = {}) {
  const roles = { wave0: 'dpt-source-intake', wave1: 'dpt-evidence-extractor', wave2: 'dpt-topic-scout' };
  return runJsonCli([
    OPERATE_WORK_UNIT, 'claim', bundleDir, '--phase', phase, '--count', String(count),
    '--actor-outcome', 'available', '--actor-source', 'native_probe',
    '--actor-role-key', roles[phase], '--actor-reason', 'probe_succeeded',
    '--execution-actor', 'delegated_subagent',
  ]);
}

export function expireClaimedWorkUnit(bundleDir, workId, { ageMs = null } = {}) {
  const index = loadWorkUnitIndex(bundleDir);
  const record = index.work_units[workId];
  if (!record) throw new Error(`No work unit in index: ${workId}`);
  const claimedMs = Date.now() - (ageMs ?? (record.timeout_ms + 60000));
  const claimedAt = new Date(claimedMs).toISOString();
  const deadlineAt = new Date(claimedMs + record.timeout_ms).toISOString();
  record.claimed_at = claimedAt;
  record.deadline_at = deadlineAt;
  index.work_units[workId] = record;
  writeFileSync(workUnitIndexPath(bundleDir), `${JSON.stringify(index, null, 2)}\n`);

  const queueFile = path.join(bundleDir, 'rb_queue.json');
  if (existsSync(queueFile)) {
    const queue = JSON.parse(readFileSync(queueFile, 'utf-8'));
    const inFlight = queue.delegated_in_flight?.[record.queue_item_id];
    if (inFlight?.work_id === workId) {
      queue.delegated_in_flight[record.queue_item_id] = {
        ...inFlight,
        claimed_at: claimedAt,
        timeout_ms: record.timeout_ms,
        deadline_at: deadlineAt,
      };
      writeFileSync(queueFile, `${JSON.stringify(queue, null, 2)}\n`);
    }
  }

  const manifestFile = path.join(bundleDir, record.paths.manifest_ref);
  if (existsSync(manifestFile)) {
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf-8'));
    manifest.claimed_at = claimedAt;
    manifest.deadline_at = deadlineAt;
    writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  const beaconFile = path.join(bundleDir, record.paths.beacon_ref);
  if (existsSync(beaconFile)) {
    const beacon = JSON.parse(readFileSync(beaconFile, 'utf-8'));
    beacon.deadline_at = deadlineAt;
    writeFileSync(beaconFile, `${JSON.stringify(beacon, null, 2)}\n`);
  }

  return record;
}

export function closeWorkUnitViaCli(bundleDir, { command = 'timeout', work_id, reason = 'playbook-controlled-close' } = {}) {
  return runJsonCli([OPERATE_WORK_UNIT, command, bundleDir, '--work-id', work_id, '--reason', reason]);
}

export function closeWorkUnitViaCliLoose(bundleDir, {
  command = 'timeout',
  work_id,
  reason = 'playbook-controlled-close',
  force = false,
  expectStatus = force ? 0 : 1,
} = {}) {
  return runJsonCli([
    OPERATE_WORK_UNIT,
    command,
    bundleDir,
    '--work-id',
    work_id,
    '--reason',
    reason,
    ...(force ? ['--force'] : []),
  ], { expectStatus });
}

export function timeoutPreflightViaCli(bundleDir, { work_id, resultPath = null, expectStatus = 0 } = {}) {
  return runJsonCli([
    OPERATE_WORK_UNIT,
    'timeout-preflight',
    bundleDir,
    '--work-id',
    work_id,
    ...(resultPath ? ['--result', resultPath] : []),
  ], { expectStatus });
}

export function openWorkUnitBatchViaCli(bundleDir, { phase = 'wave0', reason = 'gate_failure_refill' } = {}) {
  return runJsonCli([OPERATE_WORK_UNIT, 'open-batch', bundleDir, '--phase', phase, '--reason', reason]);
}

export function inspectWorkUnitsViaCli(bundleDir, { expectStatus = 0 } = {}) {
  return runJsonCli([OPERATE_WORK_UNIT, 'inspect', bundleDir], { expectStatus });
}

export function referenceContent({
  source_url = 'https://research-source.test/research/article',
  topic_slug = 'topic-a',
  title = 'Fixture Source',
  key_facts = [
    'Fact one is specific and useful.',
    'Fact two is specific and useful.',
    'Fact three is specific and useful.',
    'Fact four is specific and useful.',
    'Fact five is specific and useful.',
  ],
  core_content,
} = {}) {
  const capture = core_content || `This controlled source covers ${topic_slug} with enough topic-specific detail for Engine reference checks while remaining explicit fixture-backed evidence. It is intentionally distinct across topics so count, cache, and provenance checks can validate recoverable submitted references.`;
  return [
    `# ${title}`,
    '',
    `- source_url: ${source_url}`,
    '- acceptance_status: accepted',
    '- source_type: primary',
    '- tier: Tier 2',
    '- trust_level: expert',
    `- related_topic: ${topic_slug}`,
    '- evidence_role: deepening_reference',
    '- why_it_matters: Controlled fixture for Engine boundary validation.',
    '- accessed_at: 2026-07-06',
    '',
    '## Key Facts',
    ...key_facts.map((fact) => `- ${fact}`),
    '',
    '## Core Content Capture',
    capture,
    '',
    '## Relevance To This Research',
    'Relevant controlled evidence.',
    '',
    '## Quotable Terms / Concepts',
    '- Controlled fixture',
    '',
    '## Risks And Limitations',
    'Fixture-backed; no Agent judgment or external fetch is proven.',
    '',
  ].join('\n');
}

export function wave1EvidenceSummaryContent({
  topic_slug = 'topic-a',
  title = 'Topic A',
  source_url = 'https://research-source.test/research/article',
} = {}) {
  return [
    `# Evidence Summary: ${title}`,
    '',
    '## Source URLs',
    `- [${title} Deepening Source](${source_url}) - retrieved 2026-07-06`,
    '',
    '## Key Findings',
    `1. **Mechanism**: ${title} has a controlled but topic-specific deepening finding.`,
    `2. **Trend**: ${topic_slug} shows a distinct trend in the controlled fixture evidence.`,
    '',
    '## Open Questions',
    `1. [partial] Which ${topic_slug} claims should Wave2 compare across topics?`,
    '',
  ].join('\n');
}

export function wave1QuestionListContent({
  topic_slug = 'topic-a',
  source_url = 'https://research-source.test/research/article',
} = {}) {
  return [
    `# Question List - Topic: ${topic_slug}`,
    '',
    'produced_at_ref_count: 1',
    'last_updated: 2026-07-06',
    '',
    '## Topic Investigation Targets',
    '',
    '| target_id | target_question | origin | status | backing_refs | next_action |',
    '| --- | --- | --- | --- | --- | --- |',
    `| ${topic_slug}-T01 | What should Wave2 compare for ${topic_slug}? | seed | partial | ${source_url} | wave2 |`,
    '',
    '## Question Reconciliation',
    '',
    `- [partial] ${topic_slug}: controlled deepening evidence narrows the question but keeps synthesis work open.`,
    '',
    '## Emergent Question Protocol',
    '',
    '- new_concept: checked; none; trigger_refs=none',
    '- contradiction: checked; none; trigger_refs=none',
    '- missing_information_gap: checked; none; trigger_refs=none',
    '- noise_pattern: checked; none; trigger_refs=none',
    '- result: no_new_questions_after_protocol',
    '',
    '## Exploration / Exploitation Decision',
    '',
    '- decision: continue',
    `- trigger_refs: ${source_url}`,
    `- unresolved_questions: ${topic_slug}-T01`,
    '- queue_consequence: wave2 cross-topic synthesis',
    '- next_action: wave2',
    '- last_updated_ref_count: 1',
    '',
  ].join('\n');
}

export function wave1SeedTopicContent({
  id = 't1',
  topic_slug = 'topic-a',
  title = 'Topic A',
  stale = false,
} = {}) {
  return [
    '---',
    `id: ${id}`,
    `slug: ${topic_slug}`,
    `title: ${title}`,
    '---',
    '',
    `# ${title}`,
    '',
    '## 本轮新增机制理解',
    stale ? '__BACKFILL_WAVE1_MECHANISMS__' : `1. ${title} controlled mechanism finding from submitted work-unit evidence.`,
    '',
    '## 本轮新增趋势与难点',
    stale ? '__BACKFILL_WAVE1_TRENDS__' : `- Trend: ${title} controlled trend. Difficulty: cross-topic validation remains for Wave2.`,
    '',
    '## 待验证问题',
    stale ? '__BACKFILL_PENDING_QUESTIONS__' : `1. [部分解答] Which ${topic_slug} claims should Wave2 compare?`,
    '',
  ].join('\n');
}

export function writeWave1TopicArtifacts(bundleDir, {
  id = 't1',
  topic_slug = 'topic-a',
  title = 'Topic A',
  source_url = `https://research-source.test/${topic_slug}/deepening/article`,
  staleBackfill = false,
} = {}) {
  const artifactDir = path.join(bundleDir, 'artifacts', 'wave1', topic_slug);
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(path.join(artifactDir, 'evidence-summary.md'), wave1EvidenceSummaryContent({ topic_slug, title, source_url }));
  writeFileSync(path.join(artifactDir, 'question-list.md'), wave1QuestionListContent({ topic_slug, source_url }));
  writeFileSync(path.join(bundleDir, 'seed_topics', `${topic_slug}.md`), wave1SeedTopicContent({ id, topic_slug, title, stale: staleBackfill }));
}

function inferTopicSlug({ record, outputPath, extraOutputFiles = [] } = {}) {
  const fromArtifact = extraOutputFiles
    .map((entry) => entry.path || '')
    .map((entryPath) => entryPath.match(/^artifacts\/wave1\/([^/]+)\//)?.[1])
    .find(Boolean);
  if (fromArtifact) return fromArtifact;
  const fromReference = String(outputPath || '').match(/^reference\/(?:[0-9]+-)?(.+?)-deepening\.md$/)?.[1];
  if (fromReference) return fromReference;
  const fromQueue = String(record?.queue_item_id || '').match(/(topic-[a-z0-9-]+)/)?.[1];
  return fromQueue || record?.queue_item_id || 'topic-a';
}

export function writeWave1DepthReview(bundleDir, {
  topic_slug = 'topic-a',
  work_unit_ref,
  result_ref,
  source_ref,
  source_url,
  cache_trails = [],
  wave0_source_urls = [`https://research-source.test/${topic_slug}/wave0/foundation`],
  is_new_vs_wave0 = true,
  decision = 'accept',
  supplementary_queue_item_ids = [],
} = {}) {
  const artifactDir = path.join(bundleDir, 'artifacts', 'wave1', topic_slug);
  mkdirSync(artifactDir, { recursive: true });
  const observed = is_new_vs_wave0 && !wave0_source_urls.includes(source_url) ? 1 : 0;
  writeFileSync(path.join(artifactDir, 'depth-review.yaml'), `${JSON.stringify({
    version: 'depth-review.v1',
    topic_slug,
    reviewed_work_unit_refs: [work_unit_ref],
    wave0_source_urls,
    source_claims: [{
      url: source_url,
      source_ref,
      acceptance_status: 'accepted',
      is_new_vs_wave0,
      cache_trail_refs: cache_trails,
    }],
    new_source_urls: observed > 0 ? [source_url] : [],
    new_source_floor: {
      required: 1,
      observed,
      source: 'ceil(wave1_per_topic_ref_floor * topic_unique_ratio)',
    },
    depth_dimensions: {
      mechanism: { status: 'covered', refs: [result_ref] },
      trend_or_difficulty: { status: 'covered', refs: [result_ref] },
      limitation_or_dispute: { status: 'covered', refs: [result_ref] },
    },
    profile_checks: {
      counterexample_search: { status: 'not_required', refs: [] },
      cross_verification: { status: 'not_required', refs: [] },
    },
    decision,
    supplementary_queue_item_ids,
  }, null, 2)}\n`);
}

export function sourceYamlContent({
  source_url = 'https://research-source.test/research/article',
  topic_slug = 'topic-a',
  title = 'Fixture Source',
} = {}) {
  return [
    `- url: "${source_url}"`,
    `  title: "${title}"`,
    '  retrieved_date: "2026-07-06"',
    `  topic_tag: "${topic_slug}"`,
    '',
  ].join('\n');
}

export function sourceYamlExtra(topicSlug, sourceUrl, title = 'Fixture Source') {
  return {
    path: `artifacts/wave0/${topicSlug}/source.yaml`,
    role: 'source_yaml',
    content: sourceYamlContent({ source_url: sourceUrl, topic_slug: topicSlug, title }),
  };
}

export function writeFixtureResultForWorkUnit(bundleDir, {
  work_id,
  output_path,
  role = 'reference',
  source_url = 'https://research-source.test/research/article',
  source_slug = 's01_source',
  output_content,
  extra_output_files = [],
  cache_trails,
  result_overrides = {},
  write_depth_review = true,
} = {}) {
  const record = loadWorkUnitIndex(bundleDir).work_units[work_id];
  if (!record) throw new Error(`No work unit in index: ${work_id}`);

  const outputPath = output_path || `reference/${record.work_id}.md`;
  mkdirSync(path.join(bundleDir, path.dirname(outputPath)), { recursive: true });
  writeFileSync(path.join(bundleDir, outputPath), output_content || referenceContent({ source_url, topic_slug: record.queue_item_id }));

  const outputFiles = [{ path: outputPath, role, source_url, source_slug }];
  for (const extra of extra_output_files) {
    mkdirSync(path.join(bundleDir, path.dirname(extra.path)), { recursive: true });
    const extraPath = path.join(bundleDir, extra.path);
    if (Object.prototype.hasOwnProperty.call(extra, 'content') || !existsSync(extraPath)) {
      writeFileSync(extraPath, extra.content || '');
    }
    const { content: _content, ...declaration } = extra;
    outputFiles.push(declaration);
  }

  const trailPaths = cache_trails || [`_cache/wave${record.wave}/primary/${record.queue_item_id}/${source_slug}`];
  for (const trailPath of trailPaths) {
    mkdirSync(path.join(bundleDir, trailPath), { recursive: true });
    writeFileSync(path.join(bundleDir, trailPath, 'websearch.json'), '[]\n');
    writeFileSync(path.join(bundleDir, trailPath, 'page.md'), `# Captured Page\n\nFetched content capture for ${source_url}. This body preserves the source text used by the work unit.\n`);
    writeFileSync(path.join(bundleDir, trailPath, 'meta.json'), `${JSON.stringify({ url: source_url })}\n`);
  }

  writeFileSync(path.join(bundleDir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: '2026-07-06T00:00:00.000Z',
  })}\n`);

  const isWave1Deepening = record.kind === 'wave1_topic_deepening';
  const topicSlug = inferTopicSlug({ record, outputPath, extraOutputFiles: extra_output_files });
  const wave1SourceClaims = isWave1Deepening
    ? {
        source_claims: [{
          url: source_url,
          source_ref: outputPath,
          acceptance_status: 'accepted',
          is_new_vs_wave0: true,
          cache_trail_refs: trailPaths,
        }],
        accepted_source_urls: [source_url],
      }
    : {};

  const resultPath = path.join(bundleDir, '_tmp', `${record.work_id}.result.json`);
  mkdirSync(path.dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    summary: 'fixture-backed controlled output',
    output_files: outputFiles,
    cache_trails: trailPaths,
    ...wave1SourceClaims,
    ...result_overrides,
  }, null, 2)}\n`);

  const hasWave1TopicOutputs = extra_output_files.some((entry) => entry.role === 'evidence_summary') &&
    extra_output_files.some((entry) => entry.role === 'question_list');
  if (isWave1Deepening && write_depth_review && hasWave1TopicOutputs) {
    writeWave1DepthReview(bundleDir, {
      topic_slug: topicSlug,
      work_unit_ref: record.paths.work_unit_dir,
      result_ref: record.paths.result_ref,
      source_ref: outputPath,
      source_url,
      cache_trails: trailPaths,
    });
  }
  return { record, resultPath, outputPath, cache_trails: trailPaths };
}

export function submitWorkUnitViaCli(bundleDir, { work_id, resultPath } = {}) {
  return runJsonCli([OPERATE_WORK_UNIT, 'submit', bundleDir, '--work-id', work_id, '--result', resultPath]);
}

export function claimAndSubmitFixtureWorkUnit(bundleDir, opts = {}) {
  const phase = opts.phase || 'wave0';
  const task = opts.task || queueItemForWorkUnit(opts);
  enqueueWorkUnitTask(bundleDir, task);
  const claim = claimWorkUnitsViaCli(bundleDir, { phase, count: opts.count || 1 });
  const workId = claim.claimed_work_ids?.at(-1);
  if (!workId) throw new Error(`claim produced no work_id for ${task.queue_item_id}`);
  const fixture = writeFixtureResultForWorkUnit(bundleDir, { ...opts, work_id: workId });
  const submit = submitWorkUnitViaCli(bundleDir, { work_id: workId, resultPath: fixture.resultPath });
  return { task, claim, ...fixture, submit };
}

export function readWorkUnitLedgerRows(bundleDir) {
  const ledgerPath = path.join(bundleDir, WORK_UNIT_OUTPUT_LEDGER);
  if (!existsSync(ledgerPath)) return [];
  return readFileSync(ledgerPath, 'utf-8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

export function recordPlaybookCheck(bundleDir, { gate, passed, detail, expected = true, extra = {} }) {
  const tracePath = path.join(bundleDir, 'rb_trace.jsonl');
  mkdirSync(path.dirname(tracePath), { recursive: true });
  writeFileSync(tracePath, `${JSON.stringify({
    ts: new Date().toISOString(),
    event: 'check',
    source: 'work-unit-playbook',
    gate,
    passed,
    expected,
    detail,
    ...extra,
  })}\n`, { flag: 'a' });
}

export function writeTraceVerdict(bundleDir, caseId, { mode = 'all' } = {}) {
  const checks = readTrace(bundleDir).filter((event) => event.event === 'check');
  let considered = checks;
  if (mode === 'last') {
    const byGate = new Map();
    for (const check of checks) byGate.set(check.gate || check.label || check.detail, check);
    considered = [...byGate.values()];
  }
  const failures = considered.filter((check) => check.passed !== (check.expected ?? true));
  const verdict = {
    case: caseId,
    status: checks.length > 0 && failures.length === 0 ? 'PASS' : 'FAIL',
    ok: checks.length > 0 && failures.length === 0,
    mode,
    check_count: checks.length,
    considered_count: considered.length,
    failures,
  };
  writeFileSync(path.join(bundleDir, `${caseId}-verdict.json`), `${JSON.stringify(verdict, null, 2)}\n`);
  return verdict;
}

export function recordNotRun(bundleDir, { gate, reason }) {
  recordPlaybookCheck(bundleDir, {
    gate,
    passed: false,
    expected: true,
    detail: `NOT RUN: ${reason}`,
    extra: { outcome: 'not_run' },
  });
}

export function validateBundleViaCli(bundleDir) {
  execFileSync(NODE, [path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/validate-bundle.mjs'), bundleDir], {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    stdio: 'pipe',
  });
}
