// @impl WPG-001, WPG-002, RWP-001, RWP-014

import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  delegatedQueueItem,
  referenceContent,
} from '../../engine/work-unit-test-helpers.mjs';
import {
  enqueue,
  loadQueue,
  saveQueue,
} from '../../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import {
  claimWorkUnits,
  drySubmitWorkUnit,
  loadWorkUnitIndex,
  submitWorkUnit,
} from '../../../DPT_FRAMEWORK/engine/work-unit-core.mjs';
import {
  setStatusWindow,
  witnessedHandoffEvents,
  writeTraceEvents,
} from './handoff-fixtures.mjs';

const REPO_ROOT = process.cwd();
const NEW_BUNDLE = path.join(REPO_ROOT, 'experiments_env/shared/new-disposable-bundle.mjs');
const GATE_CLI = path.join(REPO_ROOT, 'DPT_FRAMEWORK/cli/gates/check-gate-wave0-complete.mjs');
const BUNDLES_DIR = path.join(REPO_ROOT, 'tests', '.test-bundles');
const createdDirs = [];

const HISTORICAL_TOPIC = Object.freeze({
  topic_uid: 'tp_123e4567-e89b-42d3-a456-426614174000',
  id: '01',
  slug: 'historical-topic',
  title: 'Historical Topic',
  must_answer: ['What historical fact is already covered?'],
  scope_role: 'supporting',
  depends_on_topic_uids: [],
  previous_layouts: [],
});

const TARGET_TOPIC = Object.freeze({
  topic_uid: 'tp_123e4567-e89b-42d3-a456-426614174001',
  id: '02',
  slug: 'added-topic',
  title: 'Added Topic',
  must_answer: ['What foundation evidence does the added Topic need?'],
  scope_role: 'primary',
  depends_on_topic_uids: [],
  previous_layouts: [],
});

const SHARED_URL = 'https://www.nist.gov/itl/ai-risk-management-framework';

function unique(label) {
  return `rt_rerun_wave0_${label}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function starterFromTask(task) {
  const match = task.match(/### Result JSON Starter[\s\S]*?```json\s+([\s\S]*?)\s+```/);
  assert.ok(match, 'generated task must expose one Result JSON Starter');
  return JSON.parse(match[1]);
}

function writePlan(bundleDir, name, topics) {
  const plan = {
    plan_basename: name,
    derived_topic_count: topics.length,
    topic_registry_version: '2',
    topic_registry: topics,
  };
  writeFileSync(path.join(bundleDir, 'rb_plan.md'), `---\n${JSON.stringify(plan, null, 2)}\n---\n# Research Plan\n`);
}

function writeProfile(bundleDir, name, rerunCount) {
  writeFileSync(path.join(bundleDir, 'rb_profile.yaml'), [
    `plan_basename: ${name}`,
    'research_profile: quick_scan',
    'root_must_answer_set: []',
    'research_style_params:',
    '  wave0_per_topic_source_floor: 1',
    '  wave0_shared_ref_total: 1',
    'human_decision_checkpoints:',
    '  hitl1:',
    '    status: accepted',
    '  hitl2:',
    '    status: accepted',
    '    answerability_class: answerable',
    '    user_decision: rerun',
    '    final_report_view: rerun',
    `    rerun_count: ${rerunCount}`,
    '    rationale: Add the approved Topic through the normal pipeline',
    '',
  ].join('\n'));
}

function writeReferenceScaffold(bundleDir) {
  writeFileSync(path.join(bundleDir, 'reference/_INDEX.md'), [
    '| ref_file | source_type | trust_level | tier | related_topic | source_layer | acceptance_status | date_landed |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    '| 00-shared-ai-rmf.md | primary | expert | Tier 2 | all | wave0_foundation | accepted | 2026-07-14 |',
    '',
  ].join('\n'));
  writeFileSync(path.join(bundleDir, 'reference/README.md'), '# Reference Evidence\n\nShared Wave0 foundation references.\n');
}

function createBundle(label, topics, { rerunCount = 0 } = {}) {
  const name = unique(label);
  const created = spawnSync('node', [NEW_BUNDLE, name, '--force', '--target-dir', BUNDLES_DIR], {
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(created.status, 0, created.stderr || created.stdout);
  const bundleDir = created.stdout.trim();
  createdDirs.push(bundleDir);
  setStatusWindow(bundleDir, 'seed_topics_ready', 'wave0_complete');
  writePlan(bundleDir, name, topics);
  writeProfile(bundleDir, name, rerunCount);
  writeReferenceScaffold(bundleDir);
  writeTraceEvents(bundleDir, [
    ...witnessedHandoffEvents({
      sourceGate: 'seed-topics-ready',
      phase: 'seed-topics',
      sourceNode: 'phases/phase-seed-topics.md',
      targetNode: 'phases/phase-wave0.md',
    }),
    { event: 'wave0_completion', ts: '2026-07-14T00:00:02.000Z' },
  ]);
  return { bundleDir, name };
}

function sourceYaml(topic, url) {
  return [
    `- url: "${url}"`,
    `  title: "Foundation evidence for ${topic.title}"`,
    '  retrieved_date: "2026-07-14"',
    `  topic_tag: "${topic.slug}"`,
    '',
  ].join('\n');
}

function enqueueTopic(bundleDir, topic) {
  const queueItem = delegatedQueueItem(`wave0-source-${topic.slug}`, {
    phase: 'wave0',
    priority_class: 'P5_new_reference_intake',
    action: `Collect Wave0 foundation evidence for ${topic.title}.`,
    writes_to: [`artifacts/wave0/${topic.slug}/source.yaml`],
    payload: {
      topic_uid: topic.topic_uid,
      topic_slug: topic.slug,
      topic_title: topic.title,
      wave: 0,
    },
    lineage: {
      topic_uid: topic.topic_uid,
      topic_slug: topic.slug,
      phase: 'wave0',
    },
  });
  const saved = saveQueue(bundleDir, enqueue(loadQueue(bundleDir), queueItem));
  return saved.active_window.find((item) => item.queue_item_id === queueItem.queue_item_id)
    || saved.refill_pool.find((item) => item.queue_item_id === queueItem.queue_item_id);
}

function executeTopic(bundleDir, topic, { includeSharedReference = false } = {}) {
  const demand = enqueueTopic(bundleDir, topic);
  const claim = claimWorkUnits(bundleDir, {
    phase: 'wave0',
    count: 1,
    actorObservation: {
      outcome: 'available',
      source: 'native_probe',
      role_key: 'dpt-source-intake',
      reason_code: 'probe_succeeded',
    },
    executionActorClass: 'delegated_subagent',
  });
  assert.equal(claim.ok, true);
  assert.equal(claim.claimed_count, 1);
  const promptRef = claim.prompt_refs[0];
  const record = loadWorkUnitIndex(bundleDir, { createIfMissing: false }).work_units[promptRef.work_id];
  const manifest = readJson(path.join(bundleDir, record.paths.manifest_ref));
  const resultSchema = readJson(path.join(bundleDir, record.paths.result_schema_ref));
  const starter = starterFromTask(readFileSync(path.join(bundleDir, record.paths.task_ref), 'utf8'));

  const sourcePath = `artifacts/wave0/${topic.slug}/source.yaml`;
  const topicUrl = `https://docs.example.org/${topic.slug}/foundation`;
  mkdirSync(path.join(bundleDir, path.dirname(sourcePath)), { recursive: true });
  writeFileSync(path.join(bundleDir, sourcePath), sourceYaml(topic, topicUrl));

  const outputFiles = [{ path: sourcePath, role: 'source_yaml' }];
  if (includeSharedReference) {
    const referencePath = 'reference/00-shared-ai-rmf.md';
    writeFileSync(path.join(bundleDir, referencePath), `${referenceContent({
      source_url: SHARED_URL,
      related_topic: 'all',
      evidence_role: 'foundation',
      accessed_at: '2026-07-14',
    })}\n`);
    outputFiles.push({
      path: referencePath,
      role: 'reference',
      source_url: SHARED_URL,
      source_slug: 'ai-rmf',
    });
  }

  const cacheUrl = includeSharedReference ? SHARED_URL : topicUrl;
  const cacheTrail = `_cache/wave0/primary/${topic.slug}/foundation`;
  mkdirSync(path.join(bundleDir, cacheTrail), { recursive: true });
  writeFileSync(path.join(bundleDir, cacheTrail, 'websearch.json'), '[]\n');
  writeFileSync(path.join(bundleDir, cacheTrail, 'page.md'), `# Captured Page\n\nFetched foundation content for ${topic.title}.\n`);
  writeFileSync(path.join(bundleDir, cacheTrail, 'meta.json'), `${JSON.stringify({ url: cacheUrl })}\n`);

  writeFileSync(path.join(bundleDir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    schema_version: 'work-unit.receipt-event.v1',
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: '2026-07-14T00:00:03.000Z',
  })}\n`);

  writeFileSync(promptRef.result_path, `${JSON.stringify({
    ...starter,
    summary: `Wave0 foundation complete for ${topic.slug}`,
    output_files: outputFiles,
    cache_trails: [cacheTrail],
  }, null, 2)}\n`);

  const drySubmit = drySubmitWorkUnit(bundleDir, { work_id: record.work_id, resultPath: promptRef.result_path });
  assert.equal(drySubmit.ok, true, JSON.stringify(drySubmit.violations));
  const submit = submitWorkUnit(bundleDir, { work_id: record.work_id, resultPath: promptRef.result_path });
  assert.equal(submit.ok, true, JSON.stringify(submit));

  return { demand, record, manifest, resultSchema, starter, drySubmit, submit };
}

function contractProjection(execution) {
  const schema = execution.resultSchema;
  return {
    demand: {
      kind: execution.demand.kind,
      producer_rule: execution.demand.producer_rule,
      priority_class: execution.demand.priority_class,
      delegated_role_key: execution.demand.targets.delegates.role_key,
      topic_uid: execution.demand.payload.topic_uid,
      topic_slug: execution.demand.payload.topic_slug,
      wave: execution.demand.payload.wave,
    },
    work_unit: {
      kind: execution.manifest.kind,
      producer_rule: execution.manifest.producer_rule,
      actor_contract_version: execution.manifest.actor_contract_version,
      execution_actor_class: execution.manifest.actor_execution.execution_actor_class,
      delegated_role_key: execution.manifest.actor_execution.delegated_role_key,
      policy_decision: execution.manifest.actor_execution.policy_decision,
      output_contract: execution.manifest.output_contract,
      cache_policy: execution.manifest.cache_policy,
    },
    result_contract: {
      schema_required: [...schema.required].sort(),
      schema_fields: Object.keys(schema.properties).sort(),
      output_roles: [...schema.properties.output_files.items.properties.role.enum].sort(),
      additional_properties: schema.additionalProperties,
      starter_fields: Object.keys(execution.starter).sort(),
      starter_schema_version: execution.starter.schema_version,
      starter_kind: execution.starter.kind,
      starter_actor_contract_version: execution.starter.actor_contract_version,
      starter_execution_actor_class: execution.starter.execution_actor_class,
    },
    submit_evaluator: {
      dry_run: execution.drySubmit.dry_run,
      dry_ok: execution.drySubmit.ok,
      expected_submit: execution.drySubmit.expected_submit,
      reason_codes: execution.drySubmit.reason_codes,
      submit_ok: execution.submit.ok,
      duplicate: execution.submit.duplicate,
      status: execution.submit.status,
    },
  };
}

function runGate(bundleDir) {
  const result = spawnSync('node', [
    GATE_CLI,
    '--bundle', bundleDir,
    '--current-node', 'phases/phase-wave0.md',
  ], { encoding: 'utf8', timeout: 10000 });
  assert.ok([0, 1].includes(result.status), result.stderr || result.stdout);
  return { status: result.status, output: JSON.parse(result.stdout) };
}

describe('rerun-added Topic follows the normal Wave0 producer', () => {
  after(() => {
    for (const dir of createdDirs) rmSync(dir, { recursive: true, force: true });
  });

  it('keeps bounded first-run/rerun-added contract parity and passes the normal Gate', () => {
    const fresh = createBundle('fresh', [TARGET_TOPIC]);
    const freshTarget = executeTopic(fresh.bundleDir, TARGET_TOPIC, { includeSharedReference: true });

    const rerun = createBundle('rerun', [HISTORICAL_TOPIC], { rerunCount: 1 });
    executeTopic(rerun.bundleDir, HISTORICAL_TOPIC, { includeSharedReference: true });
    writePlan(rerun.bundleDir, rerun.name, [HISTORICAL_TOPIC, TARGET_TOPIC]);
    const rerunTarget = executeTopic(rerun.bundleDir, TARGET_TOPIC);

    assert.deepEqual(contractProjection(rerunTarget), contractProjection(freshTarget));

    const freshGate = runGate(fresh.bundleDir);
    const rerunGate = runGate(rerun.bundleDir);
    assert.equal(freshGate.status, 0, freshGate.output.inspect.join('\n'));
    assert.equal(rerunGate.status, 0, rerunGate.output.inspect.join('\n'));
    assert.deepEqual(
      {
        passed: rerunGate.output.check.passed,
        failed_rule_ids: rerunGate.output.check.failed_rule_ids,
        masked_rule_ids: rerunGate.output.check.masked_rule_ids,
      },
      {
        passed: freshGate.output.check.passed,
        failed_rule_ids: freshGate.output.check.failed_rule_ids,
        masked_rule_ids: freshGate.output.check.masked_rule_ids,
      },
    );
  });

  it('does not treat a rerun-added orphan source.yaml as submitted coverage', () => {
    const rerun = createBundle('orphan', [HISTORICAL_TOPIC], { rerunCount: 1 });
    executeTopic(rerun.bundleDir, HISTORICAL_TOPIC, { includeSharedReference: true });
    writePlan(rerun.bundleDir, rerun.name, [HISTORICAL_TOPIC, TARGET_TOPIC]);

    const orphanPath = path.join(rerun.bundleDir, 'artifacts/wave0', TARGET_TOPIC.slug, 'source.yaml');
    mkdirSync(path.dirname(orphanPath), { recursive: true });
    writeFileSync(orphanPath, sourceYaml(TARGET_TOPIC, 'https://docs.example.org/added-topic/orphan'));

    const gate = runGate(rerun.bundleDir);
    assert.equal(gate.status, 1);
    assert.equal(gate.output.check.passed, false);
    assert.ok(gate.output.check.failed_rule_ids.includes('wave0_work_unit_output_coverage'));
    assert.equal(gate.output.check.failed_rule_ids.includes('wave0_work_unit_ledger_exists'), false);
    assert.match(gate.output.inspect.join('\n'), /artifacts\/wave0\/added-topic\/source\.yaml/);
  });

  it('has no rerun-only Wave0 contract or evaluator branch', () => {
    const normalOwners = [
      'DPT_FRAMEWORK/engine/work-unit-constants.mjs',
      'DPT_FRAMEWORK/engine/work-unit-lifecycle.mjs',
      'DPT_FRAMEWORK/engine/work-unit-envelope.mjs',
      'DPT_FRAMEWORK/engine/work-unit-submit.mjs',
      'DPT_FRAMEWORK/engine/helpers/wave-contract-evaluators.mjs',
      'DPT_FRAMEWORK/schema/gate_definitions/gate-wave0-complete.definition.json',
    ].map((file) => readFileSync(path.join(REPO_ROOT, file), 'utf8')).join('\n');

    assert.doesNotMatch(normalOwners, /rerun[-_ ]only|rerun[-_ ]specific|rerun[-_ ]separate/i);
  });
});
