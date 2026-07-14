import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  createQueue,
  enqueue,
  loadQueue,
  makeItem,
  saveQueue,
} from '../../DPT_FRAMEWORK/engine/queue-manager.mjs';
import {
  claimWorkUnits,
  loadWorkUnitIndex,
  submitWorkUnit,
} from '../../DPT_FRAMEWORK/engine/work-unit-core.mjs';

export function tempWorkUnitBundle(prefix = 'wu-helper-') {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function cleanupWorkUnitBundle(dir) {
  rmSync(dir, { recursive: true, force: true });
}

export function recursiveAuthoritySnapshot(targetPath, { excluded = new Set(['rb_trace.jsonl', '_logs']) } = {}) {
  if (!existsSync(targetPath)) return { type: 'missing' };
  const stats = statSync(targetPath);
  if (!stats.isDirectory()) return { type: 'file', content: readFileSync(targetPath, 'base64') };
  return {
    type: 'dir',
    entries: Object.fromEntries(readdirSync(targetPath).sort()
      .filter((name) => !excluded.has(name))
      .map((name) => [name, recursiveAuthoritySnapshot(path.join(targetPath, name), { excluded })])),
  };
}

export function referenceContent(overrides = {}) {
  const opts = {
    source_url: 'https://example.com/research/article',
    acceptance_status: 'accepted',
    source_type: 'primary',
    tier: 'Tier 2',
    trust_level: 'expert',
    related_topic: 'topic-a',
    evidence_role: 'deepening_reference',
    why_it_matters: 'Relevant source for this research.',
    accessed_at: '2026-07-06',
    coreContent: 'This source contains substantial context and details for the research question. The capture is intentionally longer than one hundred characters so Engine reference counting can treat it as a countable reference.',
    keyFacts: [
      'Fact one is concrete and relevant.',
      'Fact two adds supporting detail.',
      'Fact three describes another observed point.',
      'Fact four gives a useful comparison.',
      'Fact five closes the minimum countable set.',
    ],
    ...overrides,
  };
  return [
    `- source_url: ${opts.source_url}`,
    `- acceptance_status: ${opts.acceptance_status}`,
    `- source_type: ${opts.source_type}`,
    `- tier: ${opts.tier}`,
    `- trust_level: ${opts.trust_level}`,
    `- related_topic: ${opts.related_topic}`,
    `- evidence_role: ${opts.evidence_role}`,
    `- why_it_matters: ${opts.why_it_matters}`,
    `- accessed_at: ${opts.accessed_at}`,
    '',
    '## Key Facts',
    ...opts.keyFacts.map((fact) => `- ${fact}`),
    '',
    '## Core Content Capture',
    opts.coreContent,
    '',
    '## Relevance To This Research',
    'Relevant context.',
    '',
    '## Quotable Terms / Concepts',
    '- Term',
    '',
    '## Risks And Limitations',
    'Some limitations.',
  ].join('\n');
}

function kindForPhase(phase) {
  if (phase === 'wave0') return 'wave0_source_intake';
  if (phase === 'wave1') return 'wave1_topic_deepening';
  if (phase === 'wave2') return 'wave2_targeted_evidence';
  return 'wave0_source_intake';
}

function producerRuleForKind(kind) {
  if (kind === 'wave0_source_intake') return 'source_intake_fan_in';
  if (kind === 'wave1_topic_deepening') return 'deepening_intake';
  if (kind === 'wave2_targeted_evidence') return 'targeted_evidence_search';
  return 'delegated_work';
}

export function delegatedRoleForKind(kind) {
  if (kind === 'wave0_source_intake') return 'dpt-source-intake';
  if (kind === 'wave1_topic_deepening') return 'dpt-evidence-extractor';
  if (kind === 'wave2_targeted_evidence') return 'dpt-topic-scout';
  return 'dpt-source-intake';
}

export function availableActorDecision(kind = 'wave0_source_intake') {
  return {
    actorObservation: {
      outcome: 'available',
      source: 'native_probe',
      role_key: delegatedRoleForKind(kind),
      reason_code: 'probe_succeeded',
    },
    executionActorClass: 'delegated_subagent',
  };
}

export function delegatedQueueItem(id = 'queue-a', overrides = {}) {
  const phase = overrides.phase || 'wave0';
  const kind = overrides.kind || kindForPhase(phase);
  const producer_rule = overrides.producer_rule || producerRuleForKind(kind);
  return makeItem({
    queue_item_id: id,
    title: `Delegated ${id}`,
    targets: { controller: 'main-agent', delegates: { to: 'sub-agent', role_key: delegatedRoleForKind(kind), timeout_ms: 600000 } },
    kind,
    producer_rule,
    payload: { topic_slug: id },
    ...overrides,
    kind,
    producer_rule,
  });
}

export function seedDelegatedQueue(dir, items = [delegatedQueueItem('queue-a')]) {
  let queue = createQueue(path.basename(dir));
  for (const item of items) queue = enqueue(queue, item);
  saveQueue(dir, queue);
}

export function claimAndSubmitWorkUnit(dir, {
  phase = 'wave0',
  queueItemId = 'queue-a',
  kind = kindForPhase(phase),
  producer_rule = producerRuleForKind(kind),
  queueItemOverrides = {},
  outputs = [{
    path: 'reference/topic-a-source.md',
    role: 'reference',
    source_url: 'https://example.com/research/article',
    source_slug: 's01_source',
    content: referenceContent(),
  }],
  cacheTrails = [{
    path: `_cache/${phase}/primary/${queueItemId}/s01_source`,
    url: outputs.find((output) => output.source_url)?.source_url || 'https://example.com/research/article',
  }],
  resultOverrides = {},
  receiptOverrides = {},
  actorDecision = availableActorDecision(kind),
  preserveQueue = false,
} = {}) {
  const queueItem = delegatedQueueItem(queueItemId, {
    phase,
    kind,
    producer_rule,
    ...queueItemOverrides,
  });
  if (preserveQueue) saveQueue(dir, enqueue(loadQueue(dir), queueItem));
  else seedDelegatedQueue(dir, [queueItem]);
  const claim = claimWorkUnits(dir, { phase, count: 1, ...actorDecision });
  const workId = claim.claimed_work_ids?.[0];
  if (!workId) throw new Error(`test helper failed to claim a work unit for ${phase}`);
  const record = loadWorkUnitIndex(dir).work_units[workId];

  for (const output of outputs) {
    const outputPath = path.join(dir, output.path);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    if (Object.prototype.hasOwnProperty.call(output, 'content') || !existsSync(outputPath)) {
      writeFileSync(outputPath, output.content || '');
    }
  }

  for (const trail of cacheTrails) {
    mkdirSync(path.join(dir, trail.path), { recursive: true });
    writeFileSync(path.join(dir, trail.path, 'websearch.json'), '[]\n');
    writeFileSync(path.join(dir, trail.path, 'page.md'), trail.page_content || `# Captured Page\n\nFetched content capture for ${trail.url}. This body preserves the source text used by the work unit.\n`);
    writeFileSync(path.join(dir, trail.path, 'meta.json'), `${JSON.stringify({
      url: trail.url,
      ...(trail.meta || {}),
    })}\n`);
  }

  writeFileSync(path.join(dir, record.paths.runtime_receipt_ref), `${JSON.stringify({
    event: 'work_done',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    ts: '2026-07-06T00:00:00.000Z',
    ...receiptOverrides,
  })}\n`);

  const resultPath = path.join(dir, '_tmp', `${record.work_id}.result.json`);
  mkdirSync(path.dirname(resultPath), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify({
    schema_version: 'work-unit.result.v1',
    work_id: record.work_id,
    queue_item_id: record.queue_item_id,
    kind: record.kind,
    receipt_nonce: record.receipt_nonce,
    actor_contract_version: record.actor_contract_version,
    execution_actor_class: record.actor_execution.execution_actor_class,
    summary: 'done',
    output_files: outputs.map(({ content: _content, ...entry }) => entry),
    cache_trails: cacheTrails.map((trail) => trail.path),
    ...resultOverrides,
  }, null, 2)}\n`);

  const submitted = submitWorkUnit(dir, { work_id: record.work_id, resultPath });
  return { record, submitted, resultPath };
}
