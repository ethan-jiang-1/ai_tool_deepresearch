// @impl CTS-004, STM-001, RRM-002, RRM-003, RRM-007
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

import { createTempDir } from '../../helpers/temp-dirs.mjs';
import {
  applyCanonicalTopicState,
  inspectCanonicalTopicState,
  recoverCanonicalTopicState,
  renderSeedProjectionCard,
  SEED_TOPIC_PROJECTION_CARD_LABEL,
  SEED_TOPIC_PROJECTION_SLOTS,
  TopicApplyPlanSchema,
} from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/canonical-topic-state.mjs';
import { evaluateSeedTopicProjectionReadiness, extractSeedFamilyEntries } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/return-map.mjs';
import { buildCanonicalTopicRegistryFact } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/topic-registry-fact.mjs';
import { loadWave2FindingIndexFact } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-depth-contracts.mjs';
import { claimAndSubmitWorkUnit, referenceContent } from '../../engine/work-unit-test-helpers.mjs';
import { writeGateAttempt } from '../../../DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers.mjs';

const dirs = [];
const REPO_ROOT = process.cwd();

after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function projectionSlot(slotId) {
  const slot = SEED_TOPIC_PROJECTION_SLOTS.find((candidate) => candidate.slotId === slotId);
  assert.ok(slot, `missing slot ${slotId}`);
  return slot;
}

function readPlan(bundle) {
  const frontmatter = readFileSync(join(bundle, 'rb_plan.md'), 'utf8').match(/^---\n([\s\S]*?)\n---/);
  return parseYaml(frontmatter[1]);
}

function seedPath(bundle, topic) {
  return join(bundle, 'seed_topics', `${topic.slug}.md`);
}

function seedBody(bundle, topic) {
  return readFileSync(seedPath(bundle, topic), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
}

function makeBundle(label) {
  const bundle = createTempDir(label);
  dirs.push(bundle);
  mkdirSync(join(bundle, 'seed_topics'));
  mkdirSync(join(bundle, '_work_units'));
  writeFileSync(join(bundle, 'rb_plan.md'), '---\nplan_basename: seed-projection-test\nderived_topic_count: 0\ntopic_registry_version: "2"\ntopic_registry: []\n---\n# Plan\n');
  writeFileSync(join(bundle, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: 0\n');
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
    current_mode: 'execution', state: 'in_progress', current_gate: 'hitl1_recorded', next_gate: 'setup_ready', current_node: 'phases/phase-hitl1.md',
  }));
  writeFileSync(join(bundle, 'rb_queue.json'), JSON.stringify({ active_window: [], refill_pool: [], delegated_in_flight: [] }));
  writeFileSync(join(bundle, 'rb_trace.jsonl'), '');
  const initial = applyCanonicalTopicState({
    bundlePath: bundle,
    input: {
      context: 'hitl1',
      actions: [{
        action: 'add_topic', title: 'Topic A', slug_stem: 'topic-a', must_answer: ['What changes?'], scope_role: 'primary', depends_on_topic_uids: [],
      }],
    },
  });
  assert.equal(initial.verdict, 'committed');
  return { bundle, topic: readPlan(bundle).topic_registry[0] };
}

function authorizeWave(bundle, wave) {
  const route = {
    wave0: {
      sourceGate: 'seed-topics-ready', sourceNode: 'phases/phase-seed-topics.md', targetNode: 'phases/phase-wave0.md',
      before: { current_gate: 'setup_ready', next_gate: 'seed_topics_ready' }, statusGate: 'seed_topics_ready',
    },
    wave1: {
      sourceGate: 'wave0-complete', sourceNode: 'phases/phase-wave0.md', targetNode: 'phases/phase-wave1.md',
      before: { current_gate: 'seed_topics_ready', next_gate: 'wave0_complete' }, statusGate: 'wave0_complete',
    },
    wave2: {
      sourceGate: 'wave1-complete', sourceNode: 'phases/phase-wave1.md', targetNode: 'phases/phase-wave2.md',
      before: { current_gate: 'wave0_complete', next_gate: 'wave1_complete' }, statusGate: 'wave1_complete',
    },
  }[wave];
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
    current_mode: 'execution', state: 'in_progress', current_node: route.sourceNode, ...route.before,
  }));
  writeGateAttempt(bundle, {
    check: { passed: true, gate: route.sourceGate, currentNodeRef: route.sourceNode, next: route.targetNode, failed_rule_ids: [] },
    routing: { kind: 'next', next: route.targetNode },
    inspect: [],
    advice: [],
  });
  const entered = spawnSync('node', ['DEEP_RESEARCH_HARNESS/cli/enter-phase.mjs', '--bundle', bundle, '--node', route.targetNode], {
    cwd: REPO_ROOT, encoding: 'utf8', timeout: 10000,
  });
  assert.equal(entered.status, 0, entered.stderr || entered.stdout);
  const advanced = spawnSync('node', ['DEEP_RESEARCH_HARNESS/cli/advance-status.mjs', '--bundle', bundle, '--to', route.statusGate], {
    cwd: REPO_ROOT, encoding: 'utf8', timeout: 10000,
  });
  assert.equal(advanced.status, 0, advanced.stderr || advanced.stdout);
}

function authorizeWave2FixtureChain(bundle) {
  const routes = [
    ['seed-topics-ready', 'phases/phase-seed-topics.md', 'phases/phase-wave0.md'],
    ['wave0-complete', 'phases/phase-wave0.md', 'phases/phase-wave1.md'],
    ['wave1-complete', 'phases/phase-wave1.md', 'phases/phase-wave2.md'],
  ];
  const trace = routes.flatMap(([gate, source, target], index) => [
    { ts: `2026-07-27T00:00:0${index}Z`, event: 'gate_attempt', gate, passed: true, currentNodeRef: source, next: target },
    {
      ts: `2026-07-27T00:00:1${index}Z`, event: 'load_complete', entry: target,
      handoff_source_gate: gate, handoff_source_node: source, handoff_target_node: target, handoff_source_attempt_index: index * 2,
    },
  ]);
  writeFileSync(join(bundle, 'rb_trace.jsonl'), `${trace.map(JSON.stringify).join('\n')}\n`);
  writeFileSync(join(bundle, 'rb_status.json'), JSON.stringify({
    current_mode: 'execution', state: 'in_progress', current_node: 'phases/phase-wave2.md', current_gate: 'wave1_complete', next_gate: 'wave2_complete',
  }));
}

function submitCurrentWork(bundle, topic, phase, {
  preserveQueue = false,
  queueItemId = `${phase}-topic-a`,
  wave0Sources = null,
  referencePath = null,
} = {}) {
  const refPath = referencePath || (phase === 'wave0'
    ? 'reference/00-shared-topic-a.md'
    : 'reference/topic-a-deepening.md');
  const sourceUrl = `https://fixture.news-research.com/${phase}/topic-a`;
  const submittedWave0Sources = wave0Sources || [{
    url: sourceUrl,
    title: 'Current Wave0 source',
    retrieved_date: '2026-07-27',
    topic_tag: topic.slug,
  }];
  const output = phase === 'wave0'
    ? {
      path: `artifacts/wave0/${topic.slug}/source.yaml`,
      role: 'source_yaml',
      content: submittedWave0Sources.flatMap((source) => [
        `- url: ${source.url}`,
        `  title: ${source.title}`,
        `  retrieved_date: ${source.retrieved_date}`,
        `  topic_tag: ${source.topic_tag}`,
      ]).join('\n').concat('\n'),
    }
    : {
      path: refPath,
      role: 'reference',
      source_url: sourceUrl,
      source_slug: `${phase}-topic-a`,
      content: referenceContent({ related_topic_uid: topic.topic_uid }),
    };
  const submitted = claimAndSubmitWorkUnit(bundle, {
    phase,
    queueItemId,
    preserveQueue,
    queueItemOverrides: { payload: { topic_uid: topic.topic_uid, topic_slug: topic.slug } },
    outputs: [output],
    cacheTrails: [{
      path: `_cache/${phase}/primary/${phase}-topic-a/source`,
      url: phase === 'wave0'
        ? submittedWave0Sources.at(-1).url
        : sourceUrl,
    }],
  });
  assert.equal(submitted.submitted.ok, true);
  if (phase === 'wave0') {
    mkdirSync(join(bundle, 'reference'), { recursive: true });
    writeFileSync(join(bundle, refPath), referenceContent({ related_topic_uid: 'all' }));
  }
  return { workId: submitted.record.work_id, refPath };
}

function submittedEntry(workId, refPath, overrides = {}) {
  return {
    source_identity: { kind: 'submitted_work', work_id: workId },
    entry_id: `${workId}/1`,
    evidence_meaning: 'The submitted authority changes this topic navigation.',
    relationship: 'supports',
    refs: [refPath],
    status: 'supported',
    next_hop: 'Read the concrete reference first.',
    ...overrides,
  };
}

function wave0Packet(topic, entry) {
  return {
    context: 'wave_projection', action: 'apply_seed_projection', topic_uid: topic.topic_uid, wave: 'wave0',
    updates: [{ slot_id: 'wave0_evidence', entries: [entry] }],
  };
}

function preparedWorkspaces(bundle) {
  const root = join(bundle, '_diagnostics', 'topic-state');
  if (!existsSync(root)) return [];
  return readdirSync(root).filter((entry) => existsSync(join(root, entry, 'prepared.json')));
}

describe('seed-topic projection materialization', () => {
  it('keeps the executable slot map and the pure template card contract aligned', () => {
    const template = readFileSync('DEEP_RESEARCH_HARNESS/workflows/nodes/templates/seed-topic-template.md', 'utf8');
    const markers = [...template.matchAll(/<!-- seed-topic-slot: ([a-z0-9_]+) \| owner: ([a-z0-9,]+) \| identity: ([a-z_]+) \| merge: ([a-z_]+) -->\n## (.+?)\n\n> \*\*([^*]+)\*\*/g)];
    assert.equal(markers.length, SEED_TOPIC_PROJECTION_SLOTS.length);
    assert.deepEqual(markers.map((match) => match[1]), SEED_TOPIC_PROJECTION_SLOTS.map((slot) => slot.slotId));
    for (const [index, match] of markers.entries()) {
      const slot = SEED_TOPIC_PROJECTION_SLOTS[index];
      assert.equal(match[2], slot.ownerWaves.join(','));
      assert.equal(match[3], slot.sourceIdentityKind);
      assert.equal(match[4], slot.mergeMode);
      assert.equal(match[5], slot.canonicalHeading);
      assert.equal(match[6], SEED_TOPIC_PROJECTION_CARD_LABEL);
      assert.ok(template.includes(slot.initialToken), `${slot.slotId} template token missing`);
      assert.ok(template.includes(renderSeedProjectionCard(slot)), `${slot.slotId} rendered card drift`);
    }
    assert.doesNotMatch(template, /context:\s*wave_projection/);
    assert.doesNotMatch(template, /## Projection Repair/);
    assert.doesNotMatch(template, /## Rerun Direction Input/);
  });

  it('rejects raw Markdown control fields and malformed packet identity shapes before any lifecycle write', () => {
    const invalid = TopicApplyPlanSchema.safeParse({
      context: 'wave_projection', action: 'apply_seed_projection', topic_uid: 'tp_test', wave: 'wave0', path: 'seed_topics/topic.md',
      updates: [{ slot_id: 'wave0_evidence', entries: [] }],
    });
    assert.equal(invalid.success, false);
    const wrongWave2 = TopicApplyPlanSchema.safeParse({
      context: 'wave_projection', action: 'apply_seed_projection', topic_uid: 'tp_test', wave: 'wave2',
      updates: [{
        slot_id: 'wave2_judgment',
        entries: [{
          source_identity: { kind: 'finding', finding_id: 'W2F-001' }, entry_id: 'W2F-002', evidence_meaning: 'meaning',
          relationship: 'defers', refs: ['none'], status: 'deferred', next_hop: 'limitation: no materializable evidence',
        }],
      }],
    });
    assert.equal(wrongWave2.success, false);
  });

  it('materializes a Wave0 packet atomically, preserves the card, consumes once, and upserts idempotently without staging the plan', () => {
    const { bundle, topic } = makeBundle('seed-projection-wave0');
    const { workId, refPath } = submitCurrentWork(bundle, topic, 'wave0');
    authorizeWave(bundle, 'wave0');
    const beforePlan = readFileSync(join(bundle, 'rb_plan.md'), 'utf8');
    const first = wave0Packet(topic, submittedEntry(workId, refPath));
    assert.equal(applyCanonicalTopicState({ bundlePath: bundle, input: first }).verdict, 'committed');
    const afterFirst = seedBody(bundle, topic);
    assert.match(afterFirst, new RegExp(SEED_TOPIC_PROJECTION_CARD_LABEL));
    assert.doesNotMatch(afterFirst, /__BACKFILL_WAVE0_EVIDENCE__/);
    assert.equal(readFileSync(join(bundle, 'rb_plan.md'), 'utf8'), beforePlan);

    const corrected = wave0Packet(topic, submittedEntry(workId, refPath, { evidence_meaning: 'Corrected navigation meaning.' }));
    assert.equal(applyCanonicalTopicState({ bundlePath: bundle, input: corrected }).verdict, 'committed');
    const afterCorrection = seedBody(bundle, topic);
    assert.equal((afterCorrection.match(new RegExp(`entry_id\\*\\*: ${workId}/1`, 'g')) || []).length, 1);
    assert.match(afterCorrection, /Corrected navigation meaning\./);
    const fact = buildCanonicalTopicRegistryFact(bundle);
    assert.equal(evaluateSeedTopicProjectionReadiness(bundle, { wave: 'wave0', topicRegistryFact: fact }).passed, true);
  });

  it('accepts a current Wave0 append entry beside a valid retained historical entry', () => {
    const { bundle, topic } = makeBundle('seed-projection-historical-wave0');
    const initialSource = {
      url: 'https://fixture.news-research.com/wave0/topic-a-initial',
      title: 'Initial Wave0 source',
      retrieved_date: '2026-07-27',
      topic_tag: topic.slug,
    };
    const appendedSource = {
      url: 'https://fixture.news-research.com/wave0/topic-a-appended',
      title: 'Appended Wave0 source',
      retrieved_date: '2026-07-28',
      topic_tag: topic.slug,
    };
    const initial = submitCurrentWork(bundle, topic, 'wave0', {
      wave0Sources: [initialSource],
      referencePath: 'reference/00-shared-topic-a-initial.md',
    });
    authorizeWave(bundle, 'wave0');
    assert.equal(applyCanonicalTopicState({ bundlePath: bundle, input: wave0Packet(topic, submittedEntry(initial.workId, initial.refPath)) }).verdict, 'committed');

    writeFileSync(join(bundle, 'rb_profile.yaml'), 'human_decision_checkpoints:\n  hitl2:\n    rerun_count: 1\n');
    const current = submitCurrentWork(bundle, topic, 'wave0', {
      preserveQueue: true,
      queueItemId: 'wave0-topic-a-rerun-1',
      wave0Sources: [initialSource, appendedSource],
      referencePath: 'reference/00-shared-topic-a-appended.md',
    });
    authorizeWave(bundle, 'wave0');
    assert.equal(applyCanonicalTopicState({
      bundlePath: bundle,
      input: wave0Packet(topic, submittedEntry(current.workId, current.refPath, {
        entry_id: `${current.workId}/2`,
      })),
    }).verdict, 'committed');

    const readiness = evaluateSeedTopicProjectionReadiness(bundle, {
      wave: 'wave0', topicRegistryFact: buildCanonicalTopicRegistryFact(bundle),
    });
    assert.equal(readiness.passed, true, JSON.stringify(readiness.findings));
    assert.equal(readiness.findings.some((finding) => finding.rule_id === 'seed_projection_entry_identity'), false);
  });

  it('rejects generic prose and a non-current submitted identity before workspace creation', () => {
    const { bundle, topic } = makeBundle('seed-projection-invalid');
    const { workId, refPath } = submitCurrentWork(bundle, topic, 'wave0');
    authorizeWave(bundle, 'wave0');
    const generic = applyCanonicalTopicState({
      bundlePath: bundle,
      input: wave0Packet(topic, submittedEntry(workId, refPath, { evidence_meaning: 'Wave0 submitted. See the output.' })),
    });
    assert.equal(generic.reason_code, 'projection_entry_generic_prose');
    assert.deepEqual(preparedWorkspaces(bundle), []);
    const wrong = applyCanonicalTopicState({
      bundlePath: bundle,
      input: wave0Packet(topic, submittedEntry('wu-w0-b001-source-i9999', refPath)),
    });
    assert.equal(wrong.reason_code, 'projection_source_identity_not_current');
    assert.deepEqual(preparedWorkspaces(bundle), []);
  });

  it('upgrades only a selected declared legacy heading and rejects missing or repeated writer targets', () => {
    const { bundle, topic } = makeBundle('seed-projection-legacy');
    const { workId, refPath } = submitCurrentWork(bundle, topic, 'wave0');
    authorizeWave(bundle, 'wave0');
    const wave0 = projectionSlot('wave0_evidence');
    const wave1 = projectionSlot('wave1_mechanisms');
    const raw = readFileSync(seedPath(bundle, topic), 'utf8');
    const legacyWave0 = `## 本轮新增证据 (retained suffix)\n\n${wave0.initialToken}`;
    const legacyWave1 = `## 本轮新增机制理解\n\n${wave1.initialToken}`;
    const replaced = raw
      .replace(`## ${wave0.canonicalHeading}\n\n${renderSeedProjectionCard(wave0)}\n\n${wave0.initialToken}`, legacyWave0)
      .replace(`## ${wave1.canonicalHeading}\n\n${renderSeedProjectionCard(wave1)}\n\n${wave1.initialToken}`, legacyWave1);
    writeFileSync(seedPath(bundle, topic), replaced);
    assert.equal(applyCanonicalTopicState({ bundlePath: bundle, input: wave0Packet(topic, submittedEntry(workId, refPath)) }).verdict, 'committed');
    const body = seedBody(bundle, topic);
    assert.match(body, new RegExp(`## ${wave0.canonicalHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(retained suffix\\)`));
    assert.match(body, new RegExp(renderSeedProjectionCard(wave0).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(body, /## 本轮新增机制理解/);

    const missing = makeBundle('seed-projection-missing');
    const missingWork = submitCurrentWork(missing.bundle, missing.topic, 'wave0');
    authorizeWave(missing.bundle, 'wave0');
    writeFileSync(seedPath(missing.bundle, missing.topic), readFileSync(seedPath(missing.bundle, missing.topic), 'utf8').replace(`## ${wave0.canonicalHeading}`, '## Unrecognized Section'));
    const missingResult = applyCanonicalTopicState({ bundlePath: missing.bundle, input: wave0Packet(missing.topic, submittedEntry(missingWork.workId, missingWork.refPath)) });
    assert.equal(missingResult.reason_code, 'seed_projection_layout_missing');

    const ambiguous = makeBundle('seed-projection-ambiguous');
    const ambiguousWork = submitCurrentWork(ambiguous.bundle, ambiguous.topic, 'wave0');
    authorizeWave(ambiguous.bundle, 'wave0');
    appendFileSync(seedPath(ambiguous.bundle, ambiguous.topic), `\n## ${wave0.canonicalHeading}\n\n${renderSeedProjectionCard(wave0)}\n\n${wave0.initialToken}\n`);
    const ambiguousResult = applyCanonicalTopicState({ bundlePath: ambiguous.bundle, input: wave0Packet(ambiguous.topic, submittedEntry(ambiguousWork.workId, ambiguousWork.refPath)) });
    assert.equal(ambiguousResult.reason_code, 'seed_projection_layout_ambiguous');
  });

  it('keeps Wave1 all-or-nothing and recovers a prepared one-seed projection transaction', () => {
    const { bundle, topic } = makeBundle('seed-projection-wave1');
    const { workId, refPath } = submitCurrentWork(bundle, topic, 'wave1');
    authorizeWave(bundle, 'wave1');
    const slots = ['wave1_mechanisms', 'wave1_trends', 'pending_questions'];
    const badPacket = {
      context: 'wave_projection', action: 'apply_seed_projection', topic_uid: topic.topic_uid, wave: 'wave1',
      updates: slots.map((slotId, index) => ({
        slot_id: slotId,
        entries: [submittedEntry(workId, refPath, {
          entry_id: `${workId}/${index + 1}`,
          ...(slotId === 'wave1_trends' ? { evidence_meaning: 'Wave1 submitted.' } : {}),
        })],
      })),
    };
    const before = seedBody(bundle, topic);
    const rejected = applyCanonicalTopicState({ bundlePath: bundle, input: badPacket });
    assert.equal(rejected.reason_code, 'projection_entry_generic_prose');
    assert.equal(seedBody(bundle, topic), before);

    const packet = {
      ...badPacket,
      updates: slots.map((slotId, index) => ({
        slot_id: slotId,
        entries: [submittedEntry(workId, refPath, { entry_id: `${workId}/${index + 1}`, evidence_meaning: `Wave1 ${slotId} navigation.` })],
      })),
    };
    assert.throws(() => applyCanonicalTopicState({ bundlePath: bundle, input: packet, crashAt: 'after_prepared' }), /simulated crash/);
    const blocked = inspectCanonicalTopicState({ bundlePath: bundle });
    assert.equal(blocked.blockers[0].reason_code, 'accepted_workspace');
    const manifestPath = join(bundle, '_diagnostics', 'topic-state', blocked.blockers[0].operation_id, 'prepared.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.deepEqual(manifest.files.map((file) => file.relative), [`seed_topics/${topic.slug}.md`]);
    assert.equal(recoverCanonicalTopicState({ bundlePath: bundle, operationId: blocked.blockers[0].operation_id }).verdict, 'committed');
    for (const slotId of slots) assert.doesNotMatch(seedBody(bundle, topic), new RegExp(projectionSlot(slotId).initialToken));
  });

  it('accepts a current Wave2 deferred W2F entry without demanding the pending-question token', () => {
    const { bundle, topic } = makeBundle('seed-projection-wave2');
    authorizeWave2FixtureChain(bundle);
    mkdirSync(join(bundle, 'artifacts', 'wave2'), { recursive: true });
    writeFileSync(join(bundle, 'artifacts', 'wave2', 'finding-index.yaml'), [
      'version: "0.1"',
      'findings:',
      '  - id: W2F-101',
      `    affected_topics: [${topic.slug}]`,
      '    created_in_rerun_count: 0',
    ].join('\n') + '\n');
    const packet = {
      context: 'wave_projection', action: 'apply_seed_projection', topic_uid: topic.topic_uid, wave: 'wave2',
      updates: [{
        slot_id: 'wave2_judgment',
        entries: [{
          source_identity: { kind: 'finding', finding_id: 'W2F-101' }, entry_id: 'W2F-101',
          evidence_meaning: 'The finding exposes an unresolved limitation.', relationship: 'defers', refs: ['none'], status: 'deferred',
          next_hop: 'limitation: no materializable evidence is available before HITL2.',
        }],
      }],
    };
    assert.equal(applyCanonicalTopicState({ bundlePath: bundle, input: packet }).verdict, 'committed');
    const body = seedBody(bundle, topic);
    assert.match(body, /__BACKFILL_PENDING_QUESTIONS__/);
    const fact = buildCanonicalTopicRegistryFact(bundle);
    const readiness = evaluateSeedTopicProjectionReadiness(bundle, {
      wave: 'wave2',
      topicRegistryFact: fact,
      findingIndexFact: loadWave2FindingIndexFact(bundle),
    });
    assert.equal(readiness.passed, true, JSON.stringify(readiness.findings));
  });

  it('retains repeated-heading read union while missing a demanded Wave1 slot yields one root layout finding', () => {
    const { bundle, topic } = makeBundle('seed-projection-reader');
    const { workId, refPath } = submitCurrentWork(bundle, topic, 'wave1');
    const wave1Mechanisms = projectionSlot('wave1_mechanisms');
    appendFileSync(seedPath(bundle, topic), `\n## ${wave1Mechanisms.canonicalHeading} (second)\n\n${renderSeedProjectionCard(wave1Mechanisms)}\n\n- **entry_id**: ${workId}/2\n  - **evidence_meaning**: second readable entry\n  - **relationship**: supports\n  - **refs**:\n    - ${refPath}\n  - **status**: supported\n  - **next_hop**: Read the reference.\n`);
    const repeated = extractSeedFamilyEntries(seedBody(bundle, topic), 'wave1');
    assert.equal(repeated.sections.filter((section) => section.slotId === 'wave1_mechanisms').length, 2);
    const fact = buildCanonicalTopicRegistryFact(bundle);
    const evaluation = evaluateSeedTopicProjectionReadiness(bundle, { wave: 'wave1', topicRegistryFact: fact });
    assert.equal(evaluation.findings.filter((finding) => finding.rule_id === 'return_map_target_family_unavailable').length, 0);
    assert.ok(evaluation.findings.some((finding) => finding.rule_id === 'seed_projection_token'));
  });
});
